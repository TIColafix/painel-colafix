/* Quadro de pessoas (js/65), 2ª leva: dados da pessoa (presenca/cadastro), quem veio hoje, meta por coluna, motivo/data da espera,
   habilidades, busca e filtros, histórico, versões (guardar, comparar, voltar) e Excel. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const ok=(n,c,d)=>{ console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); if(!c) ok.f=(ok.f||0)+1; else ok.p=(ok.p||0)+1; };
(async()=>{ const {d}=seedManut(); const D=d.docs; const loc=x=>new Date(x-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10); const hoje=loc(Date.now()), ontem=loc(Date.now()-864e5), longe=loc(Date.now()-400*864e5), exp=loc(Date.now()+5*864e5);
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao'],locais:[],ativo:true};
 D['presenca/'+hoje]={dia:hoje,exp:true,p:[{n:'ANA TESTE PRIMEIRA',s:'Linha 1',e:'COLAFIX',c:'07:20'}],f:[{n:'BETO TESTE SEGUNDO',s:'Linha 1',e:'ZENITH',m:'Sem registro'}],em:new Date().toISOString()};
 D['presenca/'+ontem]={dia:ontem,exp:true,p:[],f:[{n:'BETO TESTE SEGUNDO',s:'Linha 1',e:'ZENITH',m:'Sem registro'},{n:'ANA TESTE PRIMEIRA',s:'Linha 1',e:'COLAFIX',m:'Férias'}]};
 D['presenca/cadastro']={cad:[{n:'ANA TESTE PRIMEIRA',e:'COLAFIX',v:'CLT',adm:longe,fn:'Operadora',s:'Linha 1',exp:null},{n:'BETO TESTE SEGUNDO',e:'ZENITH',v:'PJ',adm:hoje,fn:'Auxiliar',s:'Linha 1',exp:{fim:exp,et:1}}],em:new Date().toISOString()};
 D['gxquadro/atual']={cols:[{id:'c1',nome:'Linha 1',meta:3,ps:[{id:'p1',n:'ANA TESTE PRIMEIRA',st:'fica'},{id:'p2',n:'BETO TESTE SEGUNDO',st:'esp',espMot:'Exame admissional',espAte:ontem}]},{id:'c2',nome:'Expedição',ps:[{id:'p3',n:'Zeca Digitado',st:''}]}],hist:[],versoes:[]};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:1500}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3500);
 await p.evaluate(()=>__T.go?__T.go('gxqd'):go('gxqd')).catch(()=>{}); await H.dorme(400);
 await p.evaluate(()=>{ try{ go('gxqd'); }catch(e){ document.querySelector('[data-go="gxqd"]').click(); } }).catch(async()=>{ await p.click('#navlist [data-go="gxpres"]'); await H.dorme(600); await p.evaluate(()=>document.querySelector('.gxg-tabs [data-go="gxqd"]').click()); });
 await H.dorme(1500);
 const card=id=>p.evaluate(id=>{ const e=document.querySelector(`.qd-p[data-qdp="${id}"]`); return e?e.innerText.replace(/\s+/g,' '):null; },id);
 let s=await card('p1'); ok('Cartão mostra vínculo e tempo de casa', /CLT/.test(s||'')&&/1 ano/.test(s||''), s);
 s=await card('p2'); ok('Cartão do PJ: empresa, experiência e faltas', /PJ · Zenith/.test(s||'')&&/experiência até/.test(s||'')&&/2 faltas em 2 dias/.test(s||''), s);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-p')].map(e=>{ const d=e.querySelector('.qd-dot'); return d?d.className.split(' ').pop():''; }).join(','));
 ok('Bolinha de hoje: veio / não veio / digitado sem bolinha', s==='veio,faltou,', s);
 s=await p.evaluate(()=>({cc:document.querySelector('.qd-c[data-qdcol="c1"] .qd-cc').innerText,mt:document.querySelector('.qd-c[data-qdcol="c1"] .qd-mt').innerText,k:document.querySelector('.qd-tot').innerText.replace(/\s+/g,' ')}));
 ok('Meta da coluna: 2/3 e faltam 1', s.cc==='2/3'&&/faltam 1/.test(s.mt)&&/Faltam 1/.test(s.k), JSON.stringify(s));
 s=await p.evaluate(()=>({av:(document.querySelector('.qd-av')||{}).innerText||'',tag:(document.querySelector('.qd-p[data-qdp="p2"] .qd-tag')||{}).className||''}));
 ok('Espera vencida: aviso no alto e selo vermelho', /prazo vencido/.test(s.av)&&/BETO/.test(s.av)&&/venc/.test(s.tag), JSON.stringify(s));
 s=await p.evaluate(()=>JSON.stringify(Painel.quadro.alertas().filter(x=>/espera/.test(x.t)))).catch(e=>'erro '+e.message);
 ok('Sino do gestor avisa a espera vencida', /prazo vencido/.test(s)&&/gxqd/.test(s), s);
 // meta: editar
 await p.click('.qd-c[data-qdcol="c2"] [data-act="qd-meta"]'); await H.dorme(300); await p.fill('#qd-meta','2'); await p.press('#qd-meta','Enter'); await H.dorme(500);
 s=await p.evaluate(()=>document.querySelector('.qd-c[data-qdcol="c2"] .qd-cc').innerText); ok('Definir quantos a coluna precisa', s==='1/2', s);
 // habilidades
 await p.click('.qd-p[data-qdp="p3"] .qd-nm'); await H.dorme(400); await p.click('[data-act="qd-hab"][data-v="Empilhadeira"]'); await H.dorme(400);
 await p.fill('#qd-habn','Solda'); await p.press('#qd-habn','Enter'); await H.dorme(500);
 s=await card('p3'); ok('Habilidades aparecem no cartão', /Empilhadeira/.test(s||'')&&/Solda/.test(s||''), s);
 // motivo da espera pelo painel
 await p.click('.qd-p[data-qdp="p2"] .qd-nm'); await H.dorme(400);
 s=await p.evaluate(()=>!!document.getElementById('qd-espm')&&document.querySelector('.qd-dl')&&document.querySelector('.qd-dl').innerText);
 ok('Painel da pessoa mostra dados do RH e os campos da espera', /Admissão/.test(s||'')&&/Experiência/.test(s||''), s);
 await p.fill('#qd-espa',exp); await p.dispatchEvent('#qd-espa','change'); await H.dorme(500);
 s=await p.evaluate(()=>!document.querySelector('.qd-av')); ok('Nova data tira o aviso de espera vencida', s);
 await p.click('[data-act="qd-fecha"]'); await H.dorme(300);
 // filtros sem redesenhar
 const vis=()=>p.evaluate(()=>[...document.querySelectorAll('.qd-p')].filter(e=>!e.classList.contains('qd-oc')).map(e=>e.dataset.qdp).join(','));
 await p.fill('#qd-busca','solda'); await H.dorme(300); s=await vis(); ok('Busca por habilidade', s==='p3', s);
 await p.fill('#qd-busca',''); await H.dorme(200); await p.selectOption('#qd-fvin','PJ'); await H.dorme(300); s=await vis(); ok('Filtro por vínculo (PJ)', s==='p2', s);
 await p.selectOption('#qd-fvin',''); await p.selectOption('#qd-femp','COLAFIX'); await H.dorme(300); s=await vis(); ok('Filtro por empresa', s==='p1', s);
 await p.click('[data-act="qd-flimpa"]'); await H.dorme(400); s=await vis(); ok('Limpar mostra todos', s==='p1,p2,p3', s);
 // histórico
 await p.click('.qd-p[data-qdp="p3"] [data-st="sai"]'); await H.dorme(400);
 await p.click('[data-act="qd-pn"][data-v="hist"]'); await H.dorme(400);
 s=await p.evaluate(()=>(document.querySelector('.qd-hl')||{}).innerText||''); ok('Histórico guarda as mudanças', /Zeca Digitado: sem marcar → Sai/.test(s)&&/Solda/.test(s)&&/Expedição: precisa de 2/.test(s), s.slice(0,300));
 // versões
 await p.click("[data-act=\"qd-fecha\"]"); await H.dorme(300); await p.click('[data-act="qd-pn"][data-v="ver"]'); await H.dorme(300); await p.fill('#qd-vnome','Plano teste'); await p.click('[data-act="qd-vsalva"]'); await H.dorme(800);
 s=await p.evaluate(()=>[...document.querySelectorAll('.qd-vi b')].map(e=>e.innerText).join('|')); ok('Guardar versão', s==='Plano teste', s);
 const vid=await p.evaluate(()=>document.querySelector('[data-act="qd-vcmp"]').dataset.v);
 await p.click('[data-act="qd-fecha"]'); await H.dorme(200);
 await p.dragAndDrop('.qd-p[data-qdp="p1"]','.qd-c[data-qdcol="c2"] .qd-ps'); await H.dorme(600);
 await p.click('[data-act="qd-pn"][data-v="ver"]'); await H.dorme(300); await p.click(`[data-act="qd-vcmp"][data-v="${vid}"]`); await H.dorme(800);
 s=await p.evaluate(()=>(document.querySelector('.qd-cmp')||{}).innerText||''); ok('Comparar mostra quem mudou de coluna', /Mudaram de coluna/.test(s)&&/ANA TESTE PRIMEIRA/.test(s)&&/Linha 1 → Expedição/.test(s), s);
 await p.click(`[data-act="qd-vvolta"][data-v="${vid}"]`); await H.dorme(300); await p.click(`[data-act="qd-vvolta"][data-v="${vid}"]`); await H.dorme(1200);
 s=await p.evaluate(()=>({c1:[...document.querySelectorAll('.qd-c[data-qdcol="c1"] .qd-p')].map(e=>e.dataset.qdp).join(','),v:[...document.querySelectorAll('.qd-vi b')].map(e=>e.innerText)}));
 ok('Voltar para a versão (e guarda a de antes)', s.c1==='p1,p2'&&s.v.length===2&&s.v.some(x=>/Antes de voltar/.test(x)), JSON.stringify(s));
 await H.dorme(1200); s=await p.evaluate(async()=>{ const x=await Painel.db().collection('gxquadro').doc('atual').get(); const v=x.data(); return {n:(v.versoes||[]).length,h:(v.hist||[]).length,meta:v.cols.find(c=>c.id==='c2').meta,hab:v.cols.flatMap(c=>c.ps).find(p=>p.id==='p3').hab}; });
 ok('Gravado no banco (versões, histórico, meta e habilidades)', s.n===2&&s.h>=5&&s.meta===2&&JSON.stringify(s.hab)==='["Empilhadeira","Solda"]', JSON.stringify(s));
 // Excel
 s=await p.evaluate(async()=>{ let cap=null; for(let i=0;i<20&&!window.PainelXls;i++) await new Promise(r=>setTimeout(r,250)); if(!window.PainelXls) return 'sem PainelXls'; const g=window.PainelXls.gerar; window.PainelXls.gerar=(a,abas)=>{ cap={a,abas:abas.map(x=>({n:x.nome,l:x.linhas.length,c:x.cab}))}; return Promise.resolve(); }; document.querySelector('[data-act="qd-xls"]').click(); await new Promise(r=>setTimeout(r,300)); window.PainelXls.gerar=g; return cap; });
 ok('Excel com Quadro, Por coluna e Histórico', s&&s.abas&&s.abas.map(x=>x.n).join('|')==='Quadro|Por coluna|Histórico'&&s.abas[0].l===3&&s.abas[0].c.includes('Habilidades'), JSON.stringify(s).slice(0,300));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(ok.f?'FALHOU '+ok.f:'PASSOU tudo ('+ok.p+')'); await B.browser.close(); process.exit(ok.f?1:0);
})().catch(e=>{ console.log('FALHOU erro '+e.stack); process.exit(1); });
