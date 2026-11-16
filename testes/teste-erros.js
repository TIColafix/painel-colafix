/* Revisão de 16/11/2026: erro de programa vai para erros/{id} e a administradora vê em Ajustes; redesenhos em rajada viram um;
   senha da trava com repetições (a antiga, sem repetições, continua valendo). */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed();
  let B=await H.abrir(); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'joao','joao123'); await H.dorme(2500);
  /* erro de programa de verdade, solto (como um botão que quebra) */
  await p.evaluate(()=>{ setTimeout(()=>{ null.quebrou(); },0); setTimeout(()=>{ null.quebrou(); },10); }); await H.dorme(600);
  await p.evaluate(()=>Promise.reject(new Error('promessa que ninguém tratou'))).catch(()=>{}); await p.evaluate(()=>{ Promise.reject(new Error('promessa que ninguém tratou')); }); await H.dorme(800);
  let S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs; let es=Object.entries(S).filter(([k])=>k.startsWith('erros/')).map(([,v])=>v);
  ok('Erro solto vai para erros/ com tela, quem e onde', es.some(e=>/null/.test(e.msg)&&e.uid==='uJOAO'&&e.tela&&e.onde), JSON.stringify(es).slice(0,300));
  ok('A mesma mensagem não se repete', es.filter(e=>/null/.test(e.msg)).length===1, es.length);
  ok('Promessa sem tratamento também é registrada', es.some(e=>/ninguém tratou/.test(e.msg)));
  /* rajada: 20 pedidos de redesenho seguidos viram 1 */
  const n=await p.evaluate(async()=>{ let k=0; const v=document.getElementById('view'); const ob=new MutationObserver(()=>k++); ob.observe(v,{childList:true}); for(let i=0;i<20;i++) window.PainelRev.rerender(); await new Promise(r=>setTimeout(r,200)); ob.disconnect(); return k; });
  ok('Pedidos de redesenho em rajada viram poucos redesenhos', n<=2, n);
  await B.browser.close();
  /* administradora vê */
  B=await H.abrir(); p=B.page; await H.preparar(p,{users:d.users,docs:S}); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
  await p.evaluate(()=>__T.go('ajustes')); await H.dorme(800); await p.click('[data-act="aj-grupo"][data-v="dados"]'); await H.dorme(400);
  ok('Ajustes tem o quadro "Erros do painel"', await p.evaluate(()=>!!document.getElementById('rev-card')));
  await p.click('[data-act="rev-ver"]'); await H.dorme(800);
  const tx=await p.evaluate(()=>document.getElementById('rev-card').innerText);
  ok('"Ver os erros" lista o erro com quem e a tela', /null/.test(tx)&&/João/.test(tx), tx.slice(0,200));
  await p.click('[data-act="rev-x"]'); await H.dorme(600);
  S=JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv'))).docs;
  ok('Apagar tira do banco', Object.keys(S).filter(k=>k.startsWith('erros/')).length===es.length-1);

  await B.browser.close();
  const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU '+f+' de '+res.length:'PASSOU tudo ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.log('ERRO '+(e&&e.stack||e)); process.exit(1); });
