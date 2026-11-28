/* Diário de bordo · pedidos de 28/11/2026 (faturamento). Dados inventados.
   1. Caminhão que não carregou ontem passa para hoje como nº 1, com as etapas já feitas e "Ficou de 27/11".
   2. "Chamar motorista" (faturamento) → TV dos motoristas: ENTRADA LIBERADA (faixa); portaria dá "Entrou" → CARREGANDO.
   3. TV dos motoristas sem a hora: coluna Pedido com "Pedido OK" / "Aguardando representante" (o faturamento marca).
   Roda num sábado 28/11/2026 09:30 (DATA pode trocar). SHOT=1 salva as telas em /tmp. */
process.env.DATA=process.env.DATA||'2026-11-28T09:30';
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
const SHOT=!!process.env.SHOT, shot=async(p,n)=>{ if(SHOT) await p.screenshot({path:'/tmp/bdch-'+n+'.png',fullPage:false}); };
(async()=>{ const {d}=H.seed(); const D=d.docs; const HJ='2026-11-28', ONT='2026-11-27';
 d.users['portaria@painel-colafix.app']={uid:'uPORT',pass:'por123',nome:'Seu Zé Porteiro'}; D['perfis/uPORT']={nome:'Seu Zé Porteiro',usuario:'portaria'}; D['acessos/uPORT']={perfil:'portaria',mods:['portaria'],locais:[],ativo:true};
 d.users['juliana@painel-colafix.app']={uid:'uFAT',pass:'fat123',nome:'Juliana Faturamento'}; D['perfis/uFAT']={nome:'Juliana Faturamento',usuario:'juliana'}; D['acessos/uFAT']={perfil:'outro',mods:['bordo'],locais:[],ativo:true};
 d.users['tvexp@painel-colafix.app']={uid:'uTV',pass:'tv1234',nome:'TV Expedição'}; D['perfis/uTV']={nome:'TV Expedição',usuario:'tvexp'}; D['acessos/uTV']={perfil:'tvbordo',mods:['bordo'],locais:[],ativo:true};
 D['config/bordo']={reps:[],lim:{mix:60,fat:30,carr:60,fim:30}};
 const base={veic:'TRUCK',tipo:'carrega',peds:[],repId:'',repNome:'',agIds:[],agKind:'sem',agData:null,al:{},des:null,etPor:{}};
 /* ontem: um ficou no pátio (mix feito), um finalizou, um desistiu */
 D['bordo/b-ont1']=Object.assign({},base,{dia:ONT,ord:4,placa:'IXA1B22',mot:'Pedro Ramos',cli:'Casa Forte',cheg:'2026-11-27T19:10:00.000Z',et:{mix:'2026-11-27T19:40:00.000Z'}});
 D['bordo/b-ont2']=Object.assign({},base,{dia:ONT,ord:3,placa:'IXA9Z99',mot:'Ana Lima',cli:'Obra Boa',cheg:'2026-11-27T15:00:00.000Z',et:{mix:'2026-11-27T15:20:00.000Z',fat:'2026-11-27T15:20:00.000Z',carr:'2026-11-27T16:00:00.000Z',fim:'2026-11-27T16:00:00.000Z'}});
 D['bordo/b-ont3']=Object.assign({},base,{dia:ONT,ord:5,placa:'IXA7C77',mot:'Rui Dias',cli:'Lar Novo',cheg:'2026-11-27T18:00:00.000Z',et:{},des:{em:'2026-11-27T19:00:00.000Z',motivo:'Outro',obs:'',por:'x'}});
 /* hoje: dois chegaram */
 D['bordo/b-hj1']=Object.assign({},base,{dia:HJ,ord:1,placa:'ABC1D23',mot:'MARCELO',cli:'COLAFIX',cheg:'2026-11-28T10:00:00.000Z',et:{}});
 D['bordo/b-hj2']=Object.assign({},base,{dia:HJ,ord:2,placa:'DEF4G56',mot:'Joao Pedro',cli:'Revest Sul',cheg:'2026-11-28T11:00:00.000Z',et:{}});
 const srv=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 const erros=[];
 /* ---------- escritório ---------- */
 const B=await H.abrir({viewport:{width:1440,height:950}}); const pb=B.page; pb.on('pageerror',e=>erros.push('escritorio: '+e.message));
 await H.preparar(pb,d); await pb.goto(H.BASE); await H.entrar(pb,'juliana','fat123'); await H.dorme(2600);
 await pb.evaluate(()=>__T.go('bordo')); await H.dorme(2500);
 let s=await srv(pb);
 ok('Ficou de ontem: passa para hoje, guarda o dia de origem e as etapas', s['bordo/b-ont1'].dia===HJ&&(s['bordo/b-ont1'].ficouDe||[]).join()===ONT&&!!(s['bordo/b-ont1'].et||{}).mix, JSON.stringify(s['bordo/b-ont1']).slice(0,300));
 ok('Ficou de ontem é o nº 1 e os de hoje andam uma posição', s['bordo/b-ont1'].ord===1&&s['bordo/b-hj1'].ord===2&&s['bordo/b-hj2'].ord===3, [s['bordo/b-ont1'].ord,s['bordo/b-hj1'].ord,s['bordo/b-hj2'].ord].join());
 ok('Finalizado e desistente de ontem continuam em ontem', s['bordo/b-ont2'].dia===ONT&&s['bordo/b-ont3'].dia===ONT);
 const tb=await pb.evaluate(()=>[...document.querySelectorAll('.bd-tab tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ')));
 ok('Diário mostra "Ficou de 27/11" na primeira linha', /Pedro Ramos/.test(tb[0]||'')&&/Ficou de 27\/11/.test(tb[0]||''), JSON.stringify(tb).slice(0,300));
 await pb.click('[data-act="bd-cham"][data-v="b-hj1"]'); await H.dorme(500);
 await pb.click('[data-act="bd-ped"][data-v="b-hj1|ok"]'); await H.dorme(500);
 await pb.click('[data-act="bd-ped"][data-v="b-hj2|rep"]'); await H.dorme(500);
 s=await srv(pb);
 ok('Chamar motorista grava o chamado', !!(s['bordo/b-hj1'].cham||{}).em&&!s['bordo/b-hj1'].entrou);
 ok('Situação do pedido: OK e Aguardando representante', s['bordo/b-hj1'].pedSt==='ok'&&s['bordo/b-hj2'].pedSt==='rep');
 ok('Botão mostra "Chamado HH:MM"', await pb.evaluate(()=>/Chamado \d\d:\d\d/.test((document.querySelector('[data-act="bd-cham"][data-v="b-hj1"]')||{}).textContent||'')));
 ok('Depois de chamar, o Diário mostra "Entrou · carregando" (escritório também pode marcar)', await pb.evaluate(()=>!!document.querySelector('[data-act="bd-entrou"][data-v="b-hj1"]')));
 await shot(pb,'escritorio');
 /* ---------- TV dos motoristas ---------- */
 const T=await H.abrir({viewport:{width:1920,height:1080}}); const pt=T.page; pt.on('pageerror',e=>erros.push('tv: '+e.message));
 await H.preparar(pt,{users:d.users,docs:await srv(pb)}); await pt.goto(H.BASE+'?tv=motoristas'); await H.entrar(pt,'tvexp','tv1234'); await H.dorme(3000);
 await pt.evaluate(()=>{ if(window.__T&&__T.S().view!=='bordomot') __T.go('bordomot'); }); await H.dorme(1200);
 const tv=await pt.evaluate(()=>({th:[...document.querySelectorAll('.mt-tab thead th')].map(t=>t.textContent),rows:[...document.querySelectorAll('.mt-tab tbody tr')].map(r=>r.className+'='+r.innerText.replace(/\s+/g,' ')),faixa:[...document.querySelectorAll('.mt-cham')].map(x=>x.innerText.replace(/\s+/g,' '))}));
 ok('TV dos motoristas sem a coluna Hora, com Pedido', !tv.th.includes('Hora')&&tv.th.includes('Pedido'), tv.th.join('|'));
 ok('Chamado: ENTRADA LIBERADA na linha e na faixa', tv.rows.some(r=>/ABC1D23/.test(r)&&/ENTRADA LIBERADA/.test(r)&&/Pedido OK/.test(r))&&tv.faixa.some(f=>/ABC1D23/.test(f)&&/ENTRADA LIBERADA/.test(f)), JSON.stringify(tv).slice(0,500));
 ok('Não chamado: AGUARDANDO e Aguardando representante', tv.rows.some(r=>/DEF4G56/.test(r)&&/AGUARDANDO/.test(r)&&/Aguardando representante/.test(r)));
 ok('Ficou de ontem aparece em 1º na TV', /IXA1B22/.test(tv.rows[0]||''), tv.rows[0]);
 await shot(pt,'tv-chamado');
 /* ---------- portaria: Entrou ---------- */
 const A=await H.abrir({viewport:{width:390,height:844}}); const pa=A.page; pa.on('pageerror',e=>erros.push('portaria: '+e.message));
 await H.preparar(pa,{users:d.users,docs:await srv(pb)}); await pa.goto(H.BASE); await H.entrar(pa,'portaria','por123'); await H.dorme(2600);
 await pa.click('.cv-sw button[data-go="bdport"]'); await H.dorme(900);
 const p0=await pa.evaluate(()=>document.body.innerText);
 ok('Portaria: bloco "Chamados para entrar" com o Marcelo', /Chamados para entrar/.test(p0)&&/Chamado às \d\d:\d\d · entrada liberada/.test(p0), p0.slice(0,300));
 await pa.click('[data-act="bd-entrou"][data-v="b-hj1"]'); await H.dorme(600);
 s=await srv(pa);
 ok('Entrou grava a entrada', !!(s['bordo/b-hj1'].entrou||{}).em);
 await shot(pa,'portaria');
 await H.preparar(pt,{users:d.users,docs:s}); await pt.reload(); await H.dorme(3000); await pt.evaluate(()=>{ if(__T.S().view!=='bordomot') __T.go('bordomot'); }); await H.dorme(1200);
 ok('Depois de entrar: CARREGANDO na TV', await pt.evaluate(()=>[...document.querySelectorAll('.mt-tab tbody tr')].some(r=>/ABC1D23/.test(r.innerText)&&/CARREGANDO/.test(r.innerText))));
 ok('Sem erros de programa', !erros.length, erros.join(' | '));
 for(const x of [A,B,T]) await x.browser.close();
 const f=res.filter(r=>!r.ok).length; console.log(f?`\n${f} FALHOU de ${res.length}`:`\nTODOS PASSARAM (${res.length})`); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
