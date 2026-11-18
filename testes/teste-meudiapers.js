/* Pedido de 18/11: Meu dia personalizável como o Outlook (js/93). */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const SH=process.env.SHOT;
(async()=>{ const {d}=H.seed(); const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; const erros=[]; p.on('pageerror',e=>erros.push(e.message)); p.on('dialog',x=>x.accept());
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3500);
  await p.evaluate(()=>__T.go('meudia')); await H.dorme(1500);
  ok('Botão "Personalizar" no alto do Meu dia', await p.$('[data-act="mdp-abre"]')!=null);
  await p.click('[data-act="mdp-abre"]'); await H.dorme(500);
  let t=await H.txt(p,'#mdp-gav')||'';
  ok('A gaveta lista os blocos, os cartões da rotina e a aparência', /Blocos de cima/i.test(t)&&/Avisos/.test(t)&&/Rotina do dia/.test(t)&&/Medição dos silos/.test(t)&&/Hoje nas linhas/.test(t)&&/Paradas agora/i.test(t)&&/Duas colunas/.test(t), t.replace(/\n/g,' | ').slice(0,300));
  if(SH) await p.screenshot({path:SH+'-gaveta.png'});
  // esconder Avisos
  await p.click('#mdp-gav input[data-mdp-oc="avisos"]'); await H.dorme(700);
  ok('Desmarcar "Avisos" esconde o bloco e grava no perfil', await p.evaluate(()=>document.querySelector('#view section.md-av').hidden)&&((await srv())['perfis/uDONA']||{}).meuDia&&(await srv())['perfis/uDONA'].meuDia.oc.avisos===true, JSON.stringify(((await srv())['perfis/uDONA']||{}).meuDia));
  // esconder um cartão da rotina
  await p.click('#mdp-gav input[data-mdp-rot="folhas de producao"]'); await H.dorme(600);
  ok('Esconder o cartão "Folhas de produção" da rotina', await p.evaluate(()=>[...document.querySelectorAll('.rotina > .rot')].filter(r=>!r.hidden).map(r=>r.querySelector('b').textContent).join('|')).then(s=>!/Folhas/.test(s)&&/Apontamento/.test(s)));
  // mudar a ordem: rotina para cima
  await p.click('#mdp-gav [data-act="mdp-mv"][data-k="rotina"][data-d="-1"]'); await H.dorme(600);
  const ord=await p.evaluate(()=>[...document.getElementById('view').children].map(e=>e.className.split(' ').find(c=>/^(md-av|md3|rotina|md-grid)$/.test(c))).filter(Boolean).join(','));
  ok('Subir a Rotina: ela vem antes do "O que mais importa"', ord.indexOf('rotina')<ord.indexOf('md3'), ord);
  // lado: Paradas para cima
  const ladoAntes=await p.evaluate(()=>(window.Painel.meuDia.blocos()||[]).filter(b=>b.reg==='lado').map(b=>b.k));
  const kp=ladoAntes.find(k=>/paradas/.test(k));
  await p.click(`#mdp-gav [data-act="mdp-mv"][data-k="${kp}"][data-d="-1"]`); await H.dorme(600);
  const lado=await p.evaluate(()=>[...document.querySelector('.md-grid > div').children].map(s=>(s.querySelector('.label')||{}).textContent||'').map(t=>t.trim()));
  ok('Quadro do lado sobe ("Paradas agora" antes do que estava em cima dele)', lado.indexOf('PARADAS AGORA')<ladoAntes.indexOf(kp), JSON.stringify(lado));
  // aparência
  await p.click('#mdp-gav [data-act="mdp-set"][data-k="cols"][data-v="1"]'); await H.dorme(400);
  await p.click('#mdp-gav [data-act="mdp-set"][data-k="comp"][data-v="true"]'); await H.dorme(400);
  ok('Uma coluna e compacto', await p.evaluate(()=>document.querySelector('.md-grid').classList.contains('mdp-uma')&&document.getElementById('view').classList.contains('mdp-comp')));
  await p.click('[data-act="mdp-fecha"].btn'); await H.dorme(300);
  if(SH) await p.screenshot({path:SH+'-depois.png',fullPage:true});
  // continua depois de recarregar
  await p.evaluate(()=>__T.go('programacao')); await H.dorme(600); await p.reload(); await H.dorme(4500); await p.evaluate(()=>__T.go('meudia')); await H.dorme(2000);
  const st=await p.evaluate(()=>({av:document.querySelector('#view section.md-av')&&document.querySelector('#view section.md-av').hidden,uma:document.querySelector('.md-grid').classList.contains('mdp-uma')}));
  ok('Depois de recarregar a escolha continua (vem do perfil)', st.av===true&&st.uma===true, JSON.stringify(st));
  // padrão
  await p.click('[data-act="mdp-abre"]'); await H.dorme(400); await p.click('[data-act="mdp-pad"]'); await H.dorme(800);
  ok('"Voltar ao padrão" mostra tudo de novo', await p.evaluate(()=>!document.querySelector('#view section.md-av').hidden&&!document.querySelector('.md-grid').classList.contains('mdp-uma')&&[...document.querySelectorAll('.rotina > .rot')].every(r=>!r.hidden)));
  // visual do painel
  await p.click('[data-act="mdp-fecha"].btn'); await H.dorme(300); await p.click('[data-act="mdp-abre"]'); await H.dorme(400);
  t=await H.txt(p,'#mdp-gav')||'';
  ok('Gaveta tem o "Visual do painel" (cor, fundo, tema, letra, tamanho)', /Visual do painel/i.test(t)&&/Tamanho do texto/.test(t)&&/Fundo/.test(t), t.slice(0,200));
  const nav0=await p.evaluate(()=>getComputedStyle(document.querySelector('.side')).backgroundColor);
  await p.click('[data-act="vis-cor"][data-v="vinho"]'); await H.dorme(500);
  await p.click('[data-act="vis-fundo"][data-v="areia"]'); await H.dorme(400);
  await p.click('[data-act="vis-tam"][data-v="maior"]'); await H.dorme(400);
  const vs=await p.evaluate(()=>({nav:getComputedStyle(document.querySelector('.side')).backgroundColor,fundo:getComputedStyle(document.documentElement).getPropertyValue('--ground').trim(),zoom:getComputedStyle(document.getElementById('view')).zoom}));
  ok('Cor vinho muda a barra lateral, fundo areia e texto maior', vs.nav!==nav0&&vs.nav==='rgb(91, 29, 42)'&&vs.fundo.toUpperCase()==='#F4EFE6'&&String(vs.zoom)==='1.1', JSON.stringify(vs));
  ok('Visual gravado no perfil', JSON.stringify(((await srv())['perfis/uDONA']||{}).visual)==='{"cor":"vinho","fundo":"areia","tam":"maior"}', JSON.stringify(((await srv())['perfis/uDONA']||{}).visual));
  if(SH){ await p.click('[data-act="mdp-fecha"].btn'); await H.dorme(300); await p.screenshot({path:SH+'-vinho.png'}); await p.click('[data-act="mdp-abre"]'); await H.dorme(300); }
  await p.click('[data-act="vis-tema"][data-v="dark"]'); await H.dorme(500);
  const dk=await p.evaluate(()=>({th:document.documentElement.dataset.theme,nav:getComputedStyle(document.querySelector('.side')).backgroundColor}));
  ok('Tema escuro continua com a cor escolhida (vinho escuro)', dk.th==='dark'&&dk.nav==='rgb(63, 20, 29)', JSON.stringify(dk));
  if(SH){ await p.screenshot({path:SH+'-escuro.png'}); }
  await p.click('[data-act="vis-tema"][data-v="auto"]'); await p.click('[data-act="vis-cor"][data-v="padrao"]'); await p.click('[data-act="vis-fundo"][data-v="padrao"]'); await p.click('[data-act="vis-tam"][data-v="normal"]'); await H.dorme(500);
  ok('Voltar à cor padrão', await p.evaluate(()=>getComputedStyle(document.querySelector('.side')).backgroundColor)===nav0);
  ok('Sem erros na página', !erros.length, erros.join(' | '));
  const f=res.filter(r=>!r.ok).length; console.log(f?`FALHOU ${f} de ${res.length}`:`PASSOU ${res.length}`); await B.browser.close(); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
