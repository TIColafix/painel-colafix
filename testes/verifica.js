/* Verificação rápida antes de publicar (roda no GitHub Actions a cada commit e aqui com `node verifica.js`).
   Não abre navegador: só confere que o código compila.
   1. junta as partes de js/ exatamente como o js/carregar.js faz e confere a sintaxe do bloco inteiro;
   2. confere cada arquivo solto (módulos, inventário, config, login, service worker) e os <script> das páginas sem login;
   3. confere que toda parte listada em PARTES existe e que nenhuma parte js/NN-*.js ficou de fora;
   4. acusa função declarada duas vezes no bloco (a última substitui a primeira sem avisar).
   Sai com código 1 se algo falhar. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RAIZ = path.join(__dirname, '..');
const erros = [], avisos = [];
const ler = p => fs.readFileSync(path.join(RAIZ, p), 'utf8');
function compila(nome, src) {
  try { new vm.Script(src, { filename: nome }); return true; }
  catch (e) { const l = (e.stack || '').split('\n').slice(0, 3).join(' | '); erros.push(nome + ': ' + e.message + ' — ' + l); return false; }
}

/* 1. bloco das partes */
const car = ler('js/carregar.js');
const m = car.match(/var\s+PARTES\s*=\s*(\[[^\]]*\])/);
if (!m) erros.push('js/carregar.js: não achei a lista PARTES');
const PARTES = m ? JSON.parse(m[1].replace(/'/g, '"')) : [];
const faltam = PARTES.filter(n => !fs.existsSync(path.join(RAIZ, 'js', n + '.js')));
faltam.forEach(n => erros.push('PARTES cita js/' + n + '.js, que não existe'));
const soltas = fs.readdirSync(path.join(RAIZ, 'js')).filter(f => /^\d\d-.*\.js$/.test(f) && f !== '00-qrcode.js' && !PARTES.includes(f.replace(/\.js$/, '')));
soltas.forEach(f => avisos.push('js/' + f + ' não está em PARTES (não é carregado)'));
let bloco = '';
if (!faltam.length && PARTES.length) {
  const tx = PARTES.map(n => ler('js/' + n + '.js'));
  bloco = '(function(){"use strict";\n' + tx.join('\n') + '\n})();';
  if (compila('bloco js/01..' + PARTES[PARTES.length - 1], bloco)) {
    /* compila cada parte sozinha só para dizer onde está o erro? não: as partes não são válidas sozinhas
       (uma pode abrir um bloco que outra fecha). O bloco inteiro é o que vale. */
  } else {
    /* achar a parte culpada: junta até cada uma e vê a primeira que quebra a sintaxe "sozinha" */
    for (let i = 0; i < PARTES.length; i++) {
      try { new vm.Script('(function(){"use strict";\n' + tx[i] + '\n})();'); }
      catch (e) { erros.push('  provável culpada: js/' + PARTES[i] + '.js — ' + e.message); break; }
    }
  }
  /* 4. funções repetidas no nível de cima das partes */
  const conta = {};
  tx.forEach((t, i) => { (t.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*\(/gm) || []).forEach(s => { const n = s.replace(/^(?:async\s+)?function\s*\*?\s*/, '').replace(/\s*\($/, ''); (conta[n] = conta[n] || []).push(PARTES[i]); }); });
  Object.entries(conta).filter(([, v]) => v.length > 1).forEach(([n, v]) => erros.push('função ' + n + ' declarada ' + v.length + ' vezes (' + v.join(', ') + '): a última apaga as outras'));
}

/* 2. arquivos soltos */
const soltos = ['config.js', 'painel-firebase.js', 'treino.js', 'sw.js', 'js/carregar.js', 'js/abertura.js', 'js/sri.js', 'js/00-qrcode.js'];
fs.readdirSync(path.join(RAIZ, 'modulos')).filter(f => f.endsWith('.js')).forEach(f => soltos.push('modulos/' + f));
if (fs.existsSync(path.join(RAIZ, 'inventario/js'))) fs.readdirSync(path.join(RAIZ, 'inventario/js')).filter(f => f.endsWith('.js')).forEach(f => soltos.push('inventario/js/' + f));
soltos.filter(p => fs.existsSync(path.join(RAIZ, p))).forEach(p => compila(p, ler(p)));
/* <script> sem src dentro das páginas */
const paginas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'));
['modulos', 'inventario'].forEach(d => { if (fs.existsSync(path.join(RAIZ, d))) fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.html')).forEach(f => paginas.push(d + '/' + f)); });
paginas.forEach(p => {
  const h = ler(p); const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi; let x, k = 0;
  while ((x = re.exec(h))) { k++; if (/type=["']?(module|application\/json|text\/template)/i.test(x[1])) continue; if (x[2].trim()) compila(p + ' <script> nº ' + k, x[2]); }
});

/* 5. o JSON dos módulos e do manifesto */
['manifest.webmanifest', 'modulos/rh-epi-padrao.json'].filter(p => fs.existsSync(path.join(RAIZ, p))).forEach(p => { try { JSON.parse(ler(p)); } catch (e) { erros.push(p + ': JSON inválido — ' + e.message); } });

avisos.forEach(a => console.log('AVISO ' + a));
if (erros.length) { erros.forEach(e => console.log('FALHOU ' + e)); process.exit(1); }
console.log('PASSOU sintaxe: ' + PARTES.length + ' partes (' + (bloco.length / 1e6).toFixed(2) + ' MB) e ' + soltos.length + ' arquivos soltos e ' + paginas.length + ' páginas');
