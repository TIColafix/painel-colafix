/* Quadro de pessoas em áreas (17/11/2026): Produção · Apoio · Fixcol, arrastar setor entre áreas, vagas tracejadas,
   "Sem setor no quadro" (arrastar e tocar) e Total da fábrica. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const ok=(n,c,d)=>{ console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); if(!c) ok.f=(ok.f||0)+1; else ok.p=(ok.p||0)+1; };
(async()=>{ const {d}=seedManut(); const D=d.docs; const hoje=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao'],locais:[],ativo:true};
 D['presenca/'+hoje]={dia:hoje,exp:true,p:[{n:'ANA TESTE PRIMEIRA',s:'Linha 1',e:'COLAFIX'},{n:'WAGNER TESTE LIVRE',s:'Expedição',e:'COLAFIX'}],f:[{n:'XENIA TESTE SOLTA',s:'',e:'NEXUS',m:'Sem registro'}],em:new Date().toISOString()};
 D['gxquadro/atual']={cols:[{id:'c1',nome:'Linha 1',meta:3,ps:[{id:'p1',n:'ANA TESTE PRIMEIRA',st:'fica'}]},{id:'c2',nome:'Almoxarifado',meta:1,ps:[{id:'p2',n:'BETO TESTE',st:'sai'},{id:'p3',n:'CAIO TESTE',st:'esp'}]},{id:'c3',nome:'Rejunte',ps:[]}],hist:[],versoes:[]};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:1500}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3000);
 await p.click('#navlist [data-go="gxpres"]'); await H.dorme(700); await p.evaluate(()=>document.querySelector('.gxg-tabs [data-go="gxqd"]').click()); await H.dorme(1500);
 let s=await p.evaluate(()=>[...document.querySelectorAll('.qd-ar')].map(a=>a.querySelector('.qd-art').innerText+':'+[...a.querySelectorAll('.qd-ct')].map(x=>x.innerText).join(',')).join(' | '));
 ok('Setores agrupados por área (Produção · Apoio · Fixcol)', /Produção:Linha 1/i.test(s)&&/Apoio:Almoxarifado/i.test(s)&&/Fixcol:Rejunte/i.test(s), s);
 s=await p.evaluate(()=>document.querySelectorAll('.qd-c[data-qdcol="c1"] .qd-vg').length); ok('Vagas tracejadas pela meta (1 de 3 → 2 vagas)', s===2, s);
 s=await p.evaluate(()=>document.querySelector('.qd-tot').innerText.replace(/\s+/g,' ')); ok('Total da fábrica: 2 de 4, faltam 2, saem 1, em espera 1', /2 de 4 pela meta/.test(s)&&/Faltam 2/.test(s)&&/Saem 1/.test(s)&&/Em espera 1/.test(s), s);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-lv')].map(x=>x.dataset.qdlv).join(',')); ok('Sem setor no quadro lista quem do RH não está em coluna', s==='WAGNER TESTE LIVRE,XENIA TESTE SOLTA', s);
 await p.dragAndDrop('.qd-lv[data-qdlv="WAGNER TESTE LIVRE"]','.qd-c[data-qdcol="c1"] .qd-ps'); await H.dorme(600);
 s=await p.evaluate(()=>({c1:[...document.querySelectorAll('.qd-c[data-qdcol="c1"] .qd-nm')].map(x=>x.innerText.toUpperCase()).join(' '),lv:[...document.querySelectorAll('.qd-lv')].map(x=>x.dataset.qdlv).join(',')}));
 ok('Arrastar da lista põe a pessoa no setor e tira da lista', /WAGNER/.test(s.c1)&&s.lv==='XENIA TESTE SOLTA', JSON.stringify(s));
 await p.click('.qd-lv[data-qdlv="XENIA TESTE SOLTA"]'); await H.dorme(300); await p.click('[data-act="qd-lvpor"][data-v="c1"]'); await H.dorme(500);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-c[data-qdcol="c1"] .qd-nm')].map(x=>x.innerText.split('\n')[0].toUpperCase().trim()).join(',')); ok('Tocar no nome e em "Pôr … aqui" também põe', /XENIA/.test(s), s);
 await p.dragAndDrop('.qd-c[data-qdcol="c3"] header','.qd-c[data-qdcol="c1"]',{targetPosition:{x:240,y:30}}); await H.dorme(600);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-ar')].map(a=>[...a.querySelectorAll('.qd-ct')].map(x=>x.innerText).join(',')).join(' | '));
 ok('Arrastar o setor pelo cabeçalho muda de área e de lugar', /^Linha 1,Rejunte \| Almoxarifado \| $/i.test(s), s);
 await p.click('[data-act="qd-arrec"][data-v="apo"]'); await H.dorme(300); s=await p.evaluate(()=>!document.querySelector('.qd-ar[data-qdar="apo"] .qd-c')); ok('Recolher a área', s);
 await H.dorme(1200); s=await p.evaluate(async()=>{ const x=(await Painel.db().collection('gxquadro').doc('atual').get()).data(); return {ar:(x.areas||[]).map(a=>a.id).join(','),rej:x.cols.find(c=>c.id==='c3').area,h:(x.hist||[]).map(h=>h.t).join(' | ')}; });
 ok('Gravado: áreas, área do setor e o histórico', s.ar==='pro,apo,fix'&&s.rej==='pro'&&/Rejunte.*Fixcol → Produção/.test(s.h), JSON.stringify(s));
 if(process.env.SHOT){ await p.click('[data-act="qd-arrec"][data-v="apo"]'); await H.dorme(400); await p.screenshot({path:'/tmp/sh/qdareas.png',fullPage:false}); }
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(ok.f?'FALHOU '+ok.f:'PASSOU tudo ('+ok.p+')'); await B.browser.close(); process.exit(ok.f?1:0);
})().catch(e=>{ console.log('FALHOU erro '+e.stack); process.exit(1); });
