/* Fichas de produção do premix (18/11): observação na janela de Apontar e histórico em lista. Dados inventados. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs, hj=(x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10))(new Date()), agora=new Date().toISOString();
 D['pmxfichas/f1']={numProv:'PMX-0101',num:'',material:'PMX01 PREMIX AC3',qtd:10,data:hj,status:'aberta',aponts:[],itens:[],alteradoEm:agora,criadoEm:agora};
 for(let i=0;i<3;i++) D['pmxfichas/h'+i]={numProv:'PMX-020'+i,num:'5550'+i,material:'PMX02 PREMIX REJUNTE '+i,qtd:5,data:hj,status:'encerrada',feitaEm:agora,feitaPor:'uDONA',aponts:[{id:'a'+i,qtd:5,em:agora}],itens:[],obs:i===1?'Faltou areia fina no começo':'',alteradoEm:agora,criadoEm:agora};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; const erros=[]; p.on('pageerror',e=>erros.push(e.message)); p.on('dialog',x=>x.accept());
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3500);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 await p.evaluate(()=>{ __T.S().pmx.ed=null; __T.go('pmxfichas'); }); await H.dorme(1200);
 // histórico em lista
 await p.evaluate(()=>{ const d=document.querySelector('details.pmx-hist'); if(d) d.open=true; }); await H.dorme(300);
 const hl=await p.evaluate(()=>{ const t=document.querySelector('details.pmx-hist table.pmx-hl'); return t?{n:t.querySelectorAll('tbody tr').length,txt:t.innerText,cards:document.querySelectorAll('details.pmx-hist .pmx-fc').length}:null; });
 ok('Histórico em lista (tabela, sem cartões)', hl&&hl.n===3&&hl.cards===0, JSON.stringify(hl&&{n:hl.n,cards:hl.cards}));
 ok('Lista mostra nº, material, produzido, situação e a observação', hl&&/55501/.test(hl.txt)&&/REJUNTE 1/.test(hl.txt)&&/Faltou areia fina/.test(hl.txt)&&/de 5/.test(hl.txt), hl&&hl.txt.slice(0,300));
 ok('Cada linha tem PDF', await p.evaluate(()=>document.querySelectorAll('details.pmx-hist .pmx-hl [data-act="pmx-pdf"]').length===3));
 // observação na janela de apontar: só a observação
 await p.click('.pmx-fc[data-id="f1"] [data-act="pmx-apontar"]'); await H.dorme(500);
 ok('Janela de Apontar tem o campo Observação', await p.$('#pmx-ap-o')!=null);
 await p.fill('#pmx-ap-o','Máquina parou 20 min'); await p.click('[data-act="pmx-ap-ok"]'); await H.dorme(700);
 let s=await srv(); ok('Salvar só a observação (sem quantidade) grava na ficha', s['pmxfichas/f1'].obs==='Máquina parou 20 min'&&!(s['pmxfichas/f1'].aponts||[]).length, JSON.stringify(s['pmxfichas/f1'].obs));
 ok('O cartão mostra a observação', /Obs\.: Máquina parou 20 min/.test(await p.evaluate(()=>document.querySelector('.pmx-fc[data-id="f1"]').innerText)));
 // apontamento + observação nova
 await p.click('.pmx-fc[data-id="f1"] [data-act="pmx-apontar"]'); await H.dorme(500);
 ok('A janela já vem com a observação da ficha', await p.inputValue('#pmx-ap-o')==='Máquina parou 20 min');
 await p.fill('#pmx-ap-q','4'); await p.fill('#pmx-ap-o','Máquina parou 20 min; troca de turno'); await p.click('[data-act="pmx-ap-ok"]'); await H.dorme(700);
 s=await srv(); const f1=s['pmxfichas/f1'];
 ok('Apontamento e observação juntos', (f1.aponts||[]).length===1&&f1.aponts[0].qtd===4&&f1.obs==='Máquina parou 20 min; troca de turno', JSON.stringify({a:f1.aponts,o:f1.obs}));
 ok('Histórico da ficha registra a observação', JSON.stringify(f1.hist||[]).includes('troca de turno'));
 // celular: lista sem rolar para o lado
 await p.setViewportSize({width:390,height:844}); await H.dorme(600);
 const lado=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 ok('No celular a página não rola para o lado', lado<=2, lado);
 ok('Sem erros na página', !erros.length, erros.join(' | '));
 const f=res.filter(r=>!r.ok).length; console.log(f?`FALHOU ${f} de ${res.length}`:`PASSOU ${res.length}`); await B.browser.close(); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
