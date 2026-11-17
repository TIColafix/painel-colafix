/* Quadro de pessoas do Marcelo (js/65): colunas por linha/setor, pessoas do RH ou digitadas, arrastar, fica/dúvida/sai, imprimir. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const hoje=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise'],locais:[],ativo:true};
 D['presenca/'+hoje]={dia:hoje,exp:true,p:[{n:'ANA TESTE PRIMEIRA',s:'Linha 1',e:'COLAFIX',c:'07:20'},{n:'BETO TESTE SEGUNDO',s:'Expedição',e:'COLAFIX',c:'07:25'},{n:'Lucas De Teste Narciso',s:'',e:'Zenith',c:'07:30'}],f:[{n:'CAIO TESTE TERCEIRO',s:'Rejunte',e:'ZENITH',m:'Sem registro'},{n:'Lucas De Teste Narcizo',s:'EXPEDIÇÃO',e:'Zenith',m:'Sem registro'}],em:new Date().toISOString()};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:1500}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(4000);
 await p.click('#navlist [data-go="gxpres"]'); await H.dorme(900);
 let s=await p.evaluate(()=>[...document.querySelectorAll('.gxg-tabs .gxg-tb')].map(b=>b.innerText.replace(/\d+$/,'').trim()).join('|'));
 ok('Pessoas tem a aba Quadro de pessoas', /Quadro de pessoas/.test(s), s);
 await p.evaluate(()=>document.querySelector('.gxg-tabs [data-go="gxqd"]').click()); await H.dorme(900);
 s=await p.evaluate(()=>({v:__T.S().view,cols:[...document.querySelectorAll('.qd-ct')].map(b=>b.innerText)}));
 ok('Abre com as linhas e os setores como colunas', s.v==='gxqd'&&s.cols.length>=8&&/LINHA 1/i.test(s.cols[0])&&s.cols.some(c=>/Expedi/i.test(c)), JSON.stringify(s));
 const col=i=>p.evaluate(i=>document.querySelectorAll('.qd-c')[i].dataset.qdcol,i);
 const c0=await col(0), c1=await col(1);
 await p.click(`[data-act="qd-add"][data-v="${c0}"]`); await H.dorme(500);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-rp')].map(b=>b.dataset.v));
 ok('Lista do RH vem da presença (inclusive quem não veio)', s.length===4&&s.includes('CAIO TESTE TERCEIRO'), JSON.stringify(s));
 const lu=await p.evaluate(()=>[...document.querySelectorAll('.qd-rp')].filter(b=>/Narci/i.test(b.dataset.v)).map(b=>b.innerText.replace(/\n/g,' ')));
 ok('Mesma pessoa com grafia diferente aparece uma vez só (com o setor)', lu.length===1&&/EXPEDI/i.test(lu[0]), JSON.stringify(lu));
 await p.fill('#qd-q','ana'); await H.dorme(200); await p.press('#qd-q','Enter'); await H.dorme(500);
 await p.fill('#qd-q','ZECA DIGITADO'); await p.click('[data-act="qd-addtxt"]'); await H.dorme(500);
 await p.click('[data-act="qd-fecha"]'); await H.dorme(400);
 s=await p.evaluate(c=>[...document.querySelectorAll(`.qd-c[data-qdcol="${c}"] .qd-nm`)].map(b=>b.innerText.split('\n')[0].toUpperCase()),c0);
 ok('Pôr do RH (Enter com 1 resultado) e digitado', JSON.stringify(s)===JSON.stringify(['ANA TESTE PRIMEIRA','ZECA DIGITADO']), JSON.stringify(s));
 await p.click(`[data-act="qd-add"][data-v="${c1}"]`); await H.dorme(300); await p.fill('#qd-q','ana'); await p.press('#qd-q','Enter'); await H.dorme(400);
 s=await p.evaluate(()=>document.querySelector('#toast')&&document.querySelector('#toast').innerText);
 ok('Não deixa a mesma pessoa em duas colunas', /já está em/i.test(s||''), s); await p.click('[data-act="qd-fecha"]'); await H.dorme(300);
 // marcar
 const pid=await p.evaluate(c=>document.querySelector(`.qd-c[data-qdcol="${c}"] .qd-p`).dataset.qdp,c0);
 await p.click(`.qd-p[data-qdp="${pid}"] [data-st="sai"]`); await H.dorme(400);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-k')].map(k=>k.innerText.replace(/\n/g,' ')).join(' | '));
 ok('Marcar "Sai" conta nos números', /1 saem/.test(s)&&/2 no quadro/.test(s), s);
 // arrastar para a coluna 2
 await p.dragAndDrop(`.qd-p[data-qdp="${pid}"]`,`.qd-c[data-qdcol="${c1}"] .qd-ps`); await H.dorme(600);
 s=await p.evaluate(([a,b])=>({a:[...document.querySelectorAll(`.qd-c[data-qdcol="${a}"] .qd-nm`)].map(x=>x.innerText.split('\n')[0].toUpperCase()),b:[...document.querySelectorAll(`.qd-c[data-qdcol="${b}"] .qd-nm`)].map(x=>x.innerText.split('\n')[0].toUpperCase())}),[c0,c1]);
 ok('Arrastar leva a pessoa para outra coluna', s.b.join()==='ANA TESTE PRIMEIRA'&&s.a.join()==='ZECA DIGITADO', JSON.stringify(s));
 // observação pelo painel
 await p.click(`.qd-p[data-qdp="${pid}"] .qd-nm`); await H.dorme(400); await p.fill('#qd-obs','Empilhadeira'); await p.press('#qd-obs','Enter'); await H.dorme(500);
 s=await p.evaluate(id=>document.querySelector(`.qd-p[data-qdp="${id}"] .qd-nm`).innerText,pid);
 ok('Observação aparece embaixo do nome', /Empilhadeira/.test(s), s);
 await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/gxquadro.png'});
 // nova coluna
 await p.click('[data-act="qd-fecha"]').catch(()=>{}); await H.dorme(200);
 await p.click('[data-act="qd-col"]'); await H.dorme(400); await p.fill('#qd-cn','Manutenção predial'); await p.press('#qd-cn','Enter'); await H.dorme(400);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-ct')].map(b=>b.innerText).pop());
 ok('Criar e nomear coluna', /Manutenção predial/i.test(s), s);
 await H.dorme(1200);
 s=await p.evaluate(()=>window.__mockDocs?null:null); const salvo=await p.evaluate(async()=>{ const x=await Painel.db().collection('gxquadro').doc('atual').get(); return x.exists?x.data():null; });
 ok('Quadro salvo em gxquadro/atual', !!salvo&&salvo.cols.some(c=>c.ps.some(x=>x.n==='ANA TESTE PRIMEIRA'&&x.st==='sai'&&x.obs==='Empilhadeira')), JSON.stringify(salvo&&salvo.cols.slice(0,2)));
 // situações novas (16/11): em espera e não efetivo
 { const ids=await p.evaluate(()=>[...document.querySelectorAll('.qd-p')].slice(0,2).map(e=>e.dataset.qdp));
   await p.click(`.qd-p[data-qdp="${ids[0]}"] [data-act="qd-st"][data-st="esp"]`); await H.dorme(400);
   await p.click(`.qd-p[data-qdp="${ids[1]}"] [data-act="qd-st"][data-st="nef"]`); await H.dorme(400);
   const r=await p.evaluate(ids=>({t:window.Painel.quadro.tot(),tag:(document.querySelector(`.qd-p[data-qdp="${ids[0]}"] .qd-tag`)||{}).textContent,k:[...document.querySelectorAll('.qd-k')].map(e=>e.innerText.replace(/\s+/g,' ')).join('|')}),ids);
   ok('Marca "Em espera" e "Não efetivo" (selo no cartão e nos números)', r.t.esp===1&&r.t.nef===1&&r.tag==='Em espera'&&/em espera/.test(r.k)&&/não efetivos/.test(r.k), JSON.stringify(r));
   await p.click('.qd-k[data-v="esp"]'); await H.dorme(300);
   const f=await p.evaluate(ids=>({g:document.querySelector('.qd-areas').className,op:[...document.querySelectorAll('.qd-p')].map(e=>getComputedStyle(e).opacity)}),ids);
   ok('Tocar no número destaca só quem está em espera', /fil-esp/.test(f.g)&&f.op.filter(o=>o==='1').length===1, JSON.stringify(f));
   await p.click('.qd-k[data-v="esp"]'); await H.dorme(300);
   ok('Tocar de novo volta a mostrar todos', !(await p.evaluate(()=>/fil/.test(document.querySelector('.qd-areas').className))));
   await H.dorme(800); }
 // imprimir
 for(const [v,dec] of [['dist',false],['dec',true]]){ const [pop]=await Promise.all([p.waitForEvent('popup'),p.evaluate(()=>document.querySelector(".qd-impm").open=true).then(()=>p.click(`[data-act="qd-imp"][data-v="${v}"]`))]); await pop.waitForLoadState(); await H.dorme(300);
   const t=await pop.evaluate(()=>document.body.innerText); ok('Imprimir '+(dec?'com as decisões':'só a distribuição'), /ANA TESTE PRIMEIRA/.test(t)&&(dec?/◷ em espera/.test(t)&&/NE não efetivo/.test(t):!/✕ sai|fica|dúvida/.test(t)), t.slice(0,200)); await pop.close(); }
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
