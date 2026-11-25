process.env.DATA = process.env.DATA || '2026-11-17'; /* roda sempre como se fosse terça, 17/11/2026 */
/* Login dos diretores (js/95-diretor.js, 25/11/2026): cargo "Diretor (só acompanha)" com o menu do gestor, Início próprio
   (termômetro, frases, Pergunte ao painel, blocos), só ver de verdade (botões somem, banco recusa) e resumo da semana em PDF.
   Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 const AGORA=new Date(); AGORA.setHours(15,0,0,0); const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
 const hs=iso(AGORA), cp=hs.slice(0,7), am=iso(new Date(AGORA.getTime()+864e5)), ago=m=>new Date(AGORA.getTime()-m*60000).toISOString();
 d.users['diretor@painel-colafix.app']={uid:'uDIR',pass:'dir123',nome:'Roberto Diretor'}; D['perfis/uDIR']={nome:'Roberto Diretor',usuario:'diretor'};
 D['acessos/uDIR']={perfil:'diretor',mods:['gestor','producao','silos','manut','telas','analise','agend'],locais:[],ativo:true};
 D['ordens/5001'].data=hs; D['ordens/5001'].produto='IT100 - ARGAMASSA AC1 20KG'; D['ordens/5001'].total=1000; D['ordens/5002'].data=hs; D['ordens/5002'].produto='IT200 - ARGAMASSA AC2 25KG';
 D['pcpbase/prev']={mes:{[cp]:{IT100:21000,IT200:10500}}}; D['pcpbase/itens']={l:{IT100:{d:'ARGAMASSA AC1 20KG',ln:['Linha 1'],a3:500,a30:100},IT200:{d:'ARGAMASSA AC2 25KG',ln:['Linha 2'],a3:50,a30:0}}};
 D['entregas/e1']={ordem:'5001',num:'5001',linha:'Linha 1',qtd:300,em:ago(90),por:'x'}; D['entregas/e2']={ordem:'5001',num:'5001',linha:'Linha 1',qtd:200,em:ago(30),por:'x'};
 D['entregas/e3']={ordem:'5002',num:'5002',linha:'Linha 2',qtd:400,em:ago(200),por:'x'};
 D['paradas/p1']={linha:'Linha 2',motivo:'Falta de cimento',inicio:ago(45)}; D['paradas/p2']={linha:'Linha 1',motivo:'Outros',inicio:ago(120),fim:ago(90)};
 D['chamados/os-00001']={numero:1,linha:'Linha 2',defeito:'Compressor desarmou',impacto:'parou',nome:'Ana',status:'Aberta',criado:ago(40)};
 D['presenca/'+hs]={dia:hs,lim:'07:30',alm:['11:30','13:00'],p:[{n:'Joana Prado Lima',s:'Linha 1',e:'Colafix',c:'07:20',a:1,g:[]},{n:'Carlos Bento',s:'Linha 2',e:'Colafix',c:'08:10',g:[]}],
   f:[{n:'Marta Quintela',s:'Expedição',e:'Colafix',m:'Sem registro'},{n:'Paulo Férias',s:'Linha 1',e:'Colafix',m:'Férias'}],fonte:{em:ago(5)}};
 D['gxacoes/a1']={t:'Trocar o rolamento da ensacadeira',quem:'Marcelo',prazo:'2026-11-10',st:'aberta',em:ago(9000)};
 D['gxseg/'+hs]={data:hs,ocorr:0,pessoas:40,epi:100};
 D['agendamentos/p777001']={pedido:'777001',cliente:'Construtora Alfa',status:'agendado',aberto:true,data:am,carga:'901',transp:'Transportes Exemplo',itens:[{cod:'IT100',desc:'ARGAMASSA AC1 20KG',un:'SC',qtd:960,pend:960,saldo:0,valor:9600}],total:9600,criadoEm:ago(900)};
 D['agendamentos/p777002']={pedido:'777002',cliente:'Loja Beta',status:'aguardando',aberto:true,itens:[{cod:'IT200',desc:'ARGAMASSA AC2 25KG',un:'SC',qtd:500,pend:500,saldo:0,valor:5500}],total:5500,criadoEm:ago(800)};
 D['pedpecas/b']={t:'Rolamento 6205',qtd:'2',itens:[{t:'Rolamento 6205',qtd:'2',un:'pç'}],porNome:'CARLOS ROCHA',em:ago(80),status:'enviado',urg:'semana',hist:[]};
 D['horaextra/h1']={dia:hs,nomes:['Joana Prado Lima','Carlos Bento'],ini:'17:30',fim:'19:30',horas:2,mot:'Pedido urgente',porNome:'Marcelo',em:ago(60)};
 const B=await H.abrir({viewport:{width:1440,height:900}}); await B.ctx.clock.setFixedTime(AGORA); const p=B.page; const erros=[]; p.on('pageerror',e=>erros.push(e.message));
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'diretor','dir123'); await H.dorme(2500);
 for(let i=0;i<40&&!(await p.evaluate(()=>!!(window.__T&&__T.S()._chamLido&&__T.S().ordens.length&&document.querySelector('.dr'))));i++) await H.dorme(250); await H.dorme(1500);
 await p.evaluate(()=>{ __T.S().view='gxinicio'; }); await H.dorme(200);
 const e=await p.evaluate(()=>({v:__T.S().view,dr:!!document.querySelector('.dr'),termo:[...document.querySelectorAll('.dr-t')].map(x=>x.innerText.replace(/\n/g,' ')),fr:(document.querySelector('.dr-fr')||{}).innerText||'',
   nav:(document.querySelector('#navlist')||{}).innerText||'',ro:document.body.classList.contains('dir-ro'),sv:document.body.classList.contains('so-ver')}));
 ok('Diretor entra no Início da diretoria com o termômetro de 6 áreas', e.dr&&e.termo.length===6&&/Produção hoje/.test(e.termo[0])&&e.termo.some(t=>/Entregas/.test(t))&&e.termo.some(t=>/Pessoas\s*2 \/ 4/.test(t)), JSON.stringify(e.termo));
 ok('"O que está acontecendo" responde em frases (produção, linha parada, entregas, pessoas)', /Até agora a fábrica fez/.test(e.fr)&&/Linha 2 está parada/.test(e.fr)&&/agendados 1 pedido/.test(e.fr)&&/Faltaram: Marta Quintela/.test(e.fr), e.fr.replace(/\n/g,' | '));
 ok('Menu do gestor sem Cadastros, com "Diretoria · só acompanha"; login só ver', /Diretoria · só acompanha/.test(e.nav)&&/Produção/.test(e.nav)&&!/Cadastros/.test(e.nav)&&e.ro&&e.sv, e.nav.replace(/\n/g,'|'));
 if(process.env.SHOT){ await p.screenshot({path:'/home/claude/scripts/dr-desk.png',fullPage:true}); }
 const blocos=await p.evaluate(()=>[...document.querySelectorAll('.dr-b h2')].map(x=>x.innerText));
 ok('Blocos: hoje, mês, o que trava, entregas, pessoas, segurança, em andamento, destaques', ['Hoje, linha por linha','O que está travando','Entregas e cargas','Pessoas hoje','Segurança','Em andamento','Destaques da semana'].every(t=>blocos.includes(t))&&blocos.some(t=>/^Mês de/.test(t)), blocos.join(' | '));
 const pes=await p.evaluate(()=>(document.getElementById('dr-pessoas')||{}).innerText||''), ent=await p.evaluate(()=>(document.getElementById('dr-entregas')||{}).innerText||'');
 ok('Pessoas com nomes (faltou, chegou depois) e hora extra do mês', /Marta Quintela/.test(pes)&&/Carlos Bento/.test(pes)&&/Hora extra do mês · 4,0 h/.test(pes), pes.replace(/\n/g,' | ').slice(0,300));
 ok('Entregas com valor e esperando data', /R\$\s*9\.600/.test(ent)&&/1 esperando data/.test(ent), ent.replace(/\n/g,' | ').slice(0,300));
 const pergunta=async q=>{ await p.fill('#dr-q',q); await p.click('.dr-qf .btn'); await H.dorme(300); return p.evaluate(()=>(document.querySelector('#dr-resp .dr-ans')||{}).innerText||''); };
 let r=await pergunta('quanto produzimos hoje?'); ok('Pergunta "quanto produzimos hoje?" responde com as toneladas e as linhas', /Produção de hoje/.test(r)&&/\d+,\d t/.test(r)&&/Linha 1/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('quem faltou hoje'); ok('"quem faltou hoje" lista os nomes', /Quem faltou hoje\s*1/.test(r)&&/Marta Quintela/.test(r)&&/Paulo Férias/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('como está a linha 2?'); ok('"como está a linha 2?" mostra a situação da linha', /Linha 2/.test(r)&&/Parada/.test(r)&&/Falta de cimento/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('pedido 777001'); ok('"pedido 777001" acha o pedido nos agendamentos', /Pedido 777001/.test(r)&&/Construtora Alfa/.test(r)&&/Agendado/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('joana prado'); ok('Nome de uma pessoa: veio hoje, chegada e hora extra', /Joana Prado Lima/.test(r)&&/Veio hoje/.test(r)&&/07:20/.test(r)&&/hora extra/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('cargas de amanhã'); ok('"cargas de amanhã" responde pedidos, paletes e valor', /Cargas de amanhã/.test(r)&&/1 pedido/.test(r)&&/R\$/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('paradas da semana'); ok('"paradas da semana" mostra o tempo e os motivos', /Paradas dos últimos 7 dias/.test(r)&&/Falta de cimento/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('estoque de IT100'); ok('"estoque de IT100" mostra estoque, agendado e sobra', /IT100/.test(r)&&/600/.test(r)&&/Agendado: 960/.test(r)&&/falta 360/.test(r), r.replace(/\n/g,' | '));
 r=await pergunta('blablabla xyz'); ok('Pergunta que não entende sugere perguntas', /Não entendi/.test(r)&&/Quem faltou hoje\?/.test(r), r.replace(/\n/g,' | ').slice(0,200));
 await p.click('.dr-chip[data-v="Chamados abertos"]'); await H.dorme(300); r=await p.evaluate(()=>(document.querySelector('#dr-resp .dr-ans')||{}).innerText||'');
 ok('Sugestão "Chamados abertos" responde com a OS e "sem técnico"', /Chamados de manutenção/.test(r)&&/OS 0*1/.test(r)&&/máquina parada/.test(r), r.replace(/\n/g,' | '));
 ok('Histórico das perguntas', await p.evaluate(()=>document.querySelectorAll('#dr-hist .dr-hq').length>=3));
 /* só ver */
 const gr=await p.evaluate(async()=>{ try{ await __T.S().db.doc('gxacoes/teste').set({t:'x'}); return 'gravou'; }catch(e){ return e.code||e.message; } });
 const srv=await p.evaluate(()=>!!JSON.parse(localStorage.getItem('__srv')).docs['gxacoes/teste']);
 ok('O banco deste login recusa gravar (permission-denied) e nada vai para o servidor', gr==='permission-denied'&&!srv, gr);
 await p.evaluate(()=>__T.go('gxacoes')); await H.dorme(500);
 const ac=await p.evaluate(()=>{ const b=document.querySelector('[data-act="gx-ac-nova"]'); return {tem:!!document.querySelector('.content')&&/Trocar o rolamento/.test(document.body.innerText),vis:!!(b&&b.offsetParent)}; });
 ok('Plano de ação: vê as ações, sem o botão "Nova ação"', ac.tem&&!ac.vis, JSON.stringify(ac));
 await p.evaluate(()=>__T.go('gxch')); await H.dorme(500);
 ok('Chamados: sem "Nova tarefa"', await p.evaluate(()=>{ const b=document.querySelector('[data-act="gch-nova"]'); return !(b&&b.offsetParent); }));
 await p.evaluate(()=>__T.go('gxpec')); await H.dorme(800);
 const pc=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('__srv')).docs['pedpecas/b']; return {st:d.status,tela:/Rolamento 6205/.test(document.body.innerText),novo:!!([...document.querySelectorAll('[data-act="gpx-novo"]')].find(b=>b.offsetParent))}; });
 ok('Pedidos de peça: abrir a tela não marca "visto" e não tem "+ Novo pedido"', pc.st==='enviado'&&pc.tela&&!pc.novo, JSON.stringify(pc));
 /* busca da lateral responde */
 await p.evaluate(()=>__T.go('gxinicio')); await H.dorme(400);
 await p.fill('#gxs-q','quem faltou hoje'); await H.dorme(500);
 const bs=await p.evaluate(()=>(document.getElementById('gxs-res')||{}).innerText||'');
 ok('A busca da lateral também responde ("Resposta do painel") e não oferece ações de gravar', /Resposta do painel/i.test(bs)&&/Quem faltou hoje: 1/.test(bs)&&!/Nova tarefa|Autorizar hora extra/.test(bs), bs.replace(/\n/g,' | ').slice(0,300));
 await p.fill('#gxs-q',''); await p.keyboard.press('Escape');
 /* PDF */
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:15000}).catch(()=>null),p.click('[data-act="dr-pdf"]')]);
 ok('"Resumo da semana (PDF)" baixa Resumo-semana-AAAA-MM-DD.pdf', !!dl&&/^Resumo-semana-\d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename()), dl&&dl.suggestedFilename());
 if(dl&&process.env.JSPDF_REAL){ const f='/tmp/resumo-semana.pdf'; await dl.saveAs(f); console.log('PDF salvo em '+f); }
 /* o resumo do chatbot não é gravado por este login */
 await H.dorme(21000);
 ok('Este login não grava o resumo do chatbot (api/resumo)', await p.evaluate(()=>!JSON.parse(localStorage.getItem('__srv')).docs['api/resumo']));
 /* celular */
 await p.setViewportSize({width:390,height:844}); await H.dorme(700);
 if(process.env.SHOT){ await p.evaluate(()=>{ __T.go('gxinicio'); window.scrollTo(0,0); }); await H.dorme(600); await p.screenshot({path:'/home/claude/scripts/dr-cel.png',fullPage:true}); }
 const lg=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,termo:getComputedStyle(document.querySelector('.dr-termo')).gridTemplateColumns.split(' ').length}));
 ok('No celular: termômetro em 2 colunas e nada passa da largura', lg.sw<=392&&lg.termo===2, JSON.stringify(lg));
 ok('Sem erro de script na página', !erros.length, erros.join(' | '));
 await B.browser.close();
 const f=res.filter(x=>!x.ok); console.log(f.length?f.length+' FALHOU':'tudo PASSOU'); process.exit(f.length?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
