/* Pedidos de 12/11: mudar a data da ordem direto na linha da Programação, sem abrir a ordem. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
  await p.evaluate(()=>__T.go('programacao')); await H.dorme(1200);
  const n=await p.evaluate(()=>document.querySelectorAll('[data-p12dt]').length); ok('Cada ordem aberta tem o campo de data na linha', n>=2, n);
  await p.click('.p12-dt[title] input[data-p12dt]'); await H.dorme(300);
  ok('Tocar no campo de data não abre a ordem', !(await p.$('.orow.aberta')));
  const id=await p.evaluate(()=>document.querySelector('[data-p12dt]').dataset.p12dt);
  await p.evaluate(id=>{ const i=document.querySelector(`[data-p12dt="${id}"]`); i.value='2026-12-03'; i.dispatchEvent(new Event('change',{bubbles:true})); },id); await H.dorme(1200);
  const o=await p.evaluate(id=>JSON.parse(localStorage.getItem('__srv')).docs['ordens/'+id],id);
  ok('Mudar a data grava a data nova e o histórico', o.data==='2026-12-03'&&/na Programação/.test((o.hist||[]).at(-1).o), JSON.stringify({data:o.data,h:(o.hist||[]).at(-1)}));
  ok('Continua sem abrir a ordem', !(await p.$('.orow.aberta')));
  const f=res.filter(r=>!r.ok); console.log(f.length?'FALHOU ('+f.length+')':'PASSOU tudo ('+res.length+')'); await B.browser.close(); process.exit(f.length?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
