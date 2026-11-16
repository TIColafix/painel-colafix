/* Menu lateral (16/11): não é refeito a cada dado que chega, abre com o menu salvo e recolhe só com os ícones. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; await H.preparar(p,d);
  await p.addInitScript(()=>{ window.__nv=0; const ob=()=>{ const nl=document.getElementById('navlist'); if(!nl){ requestAnimationFrame(ob); return; } new MutationObserver(()=>window.__nv++).observe(nl,{childList:true}); }; ob(); });
  await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(5000);
  const nv=await p.evaluate(()=>window.__nv); ok('Ao abrir, o menu é desenhado poucas vezes (antes eram dezenas)', nv<=4, nv);
  await p.evaluate(()=>__T.go('programacao')); await H.dorme(800);
  ok('Trocar de tela atualiza o item aberto do menu', await p.evaluate(()=>!!document.querySelector('#navlist [aria-current="page"]')));
  ok('Os itens do menu têm o nome ao passar o mouse', await p.evaluate(()=>[...document.querySelectorAll('#navlist .navbtn')].every(b=>b.title)));
  ok('Botão "Recolher menu" no pé da lateral', /Recolher menu/.test(await p.evaluate(()=>(document.getElementById('side-min')||{}).textContent||'')));
  await p.click('#side-min'); await H.dorme(400);
  const w=await p.evaluate(()=>document.querySelector('.side').getBoundingClientRect().width);
  ok('Recolhida: lateral só com os ícones (até 80 px) e lembrada no aparelho', w<=80&&await p.evaluate(()=>localStorage.getItem('colafix.sideMin')==='1'), w);
  await p.reload(); await H.dorme(250);
  const c=await p.evaluate(()=>({n:document.getElementById('navlist').children.length,min:document.body.classList.contains('side-min')}));
  ok('Ao abrir de novo: continua recolhida e o menu já aparece (salvo no aparelho)', c.min&&c.n>0, JSON.stringify(c));
  await H.dorme(3500); await p.click('#side-min'); await H.dorme(400);
  ok('"Abrir menu" volta a lateral inteira', await p.evaluate(()=>document.querySelector('.side').getBoundingClientRect().width)>200&&await p.evaluate(()=>localStorage.getItem('colafix.sideMin')===null));
  const f=res.filter(r=>!r.ok); console.log(f.length?'FALHOU ('+f.length+')':'PASSOU tudo ('+res.length+')'); await B.browser.close(); process.exit(f.length?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
