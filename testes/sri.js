/* Confere as bibliotecas de fora (CDN) contra os códigos de conferência do js/sri.js. Precisa de internet.
   node testes/sri.js          → baixa cada endereço do mapa (com e sem ?sri=1) e compara o sha384; sai com 1 se algum não bater
   node testes/sri.js --novo   → também mostra o mapa certo para colar no js/sri.js
   Também acusa endereço de CDN usado no código que não está no mapa (fica sem conferência). */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const RAIZ = path.join(__dirname, '..');
const W = {}; vm.runInNewContext(fs.readFileSync(path.join(RAIZ, 'js/sri.js'), 'utf8'), { window: W, Node: function () {}, Element: function () {} });
const M = W.PAINEL_SRI.mapa;
const usados = new Set();
const varre = d => fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name);
  if (e.isDirectory()) { if (!/node_modules|testes|\.git/.test(e.name)) varre(p); return; }
  if (!/\.(js|html)$/.test(e.name)) return; (fs.readFileSync(path.join(RAIZ, p), 'utf8').match(/https:\/\/(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|www\.gstatic\.com\/firebasejs)\/[^'"`\s)]+\.js\b/g) || []).forEach(u => usados.add(u)); });
varre('.');
(async () => {
  let ruim = 0; const novo = {};
  for (const u of Object.keys(M)) {
    let h1 = '', h2 = '', st = '';
    try { const r = await fetch(u); st = r.status + ' ' + (r.headers.get('access-control-allow-origin') || 'SEM CORS'); const b = Buffer.from(await r.arrayBuffer()); h1 = 'sha384-' + crypto.createHash('sha384').update(b).digest('base64'); } catch (e) { st = 'erro ' + e.message; }
    try { const r = await fetch(u + '?sri=1'); const b = Buffer.from(await r.arrayBuffer()); h2 = 'sha384-' + crypto.createHash('sha384').update(b).digest('base64'); } catch (e) {}
    const ok = h1 === M[u] && h2 === M[u] && /\*|https?:/.test(st);
    if (!ok) ruim++; novo[u] = h1 || M[u];
    console.log((ok ? 'PASSOU ' : 'FALHOU ') + u + ' — ' + st + (h1 !== M[u] ? ' · baixado ' + h1 : '') + (h2 !== h1 ? ' · com ?sri=1 ' + h2 : ''));
  }
  [...usados].filter(u => !M[u] && !/pdf\.worker/.test(u)).forEach(u => { console.log('AVISO sem conferência: ' + u); });
  if (process.argv.includes('--novo')) console.log('\n' + Object.entries(novo).map(([u, h]) => `    '${u}': '${h}'`).join(',\n'));
  console.log(ruim ? 'FALHOU ' + ruim + ' de ' + Object.keys(M).length : 'PASSOU tudo (' + Object.keys(M).length + ')');
  process.exit(ruim ? 1 : 0);
})();
