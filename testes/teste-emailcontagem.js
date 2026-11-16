/* E-mail da contagem do dia (js/86). Dados inventados. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const hoje=(()=>{ const d=new Date(), p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); })();
(async()=>{ const {d}=H.seed(); const D=d.docs;
  D['itens/90001']={codigo:'90001',descricao:'CIMENTO TESTE 50 KG',ativo:true,linhas:[],palete:40,almox:{locais:['a3'],grupos:['COLAFIX']}};
  D['itens/90002']={codigo:'90002',descricao:'CIMENTO TESTE 25KG',ativo:true,linhas:[],palete:60};
  D['pcpbase/itens']={em:new Date().toISOString(),atual:{},l:{'90001':{a3:650,a30:0,d:'CIMENTO TESTE 50 KG'},'90002':{a3:100,a30:23,d:'CIMENTO TESTE 25KG'}}};
  D['pcpbase/vendas']={ate:hoje,diario:{},mensal:{}};
  D['conferencias/C-1']={numero:'C-1',em:new Date().toISOString(),dia:hoje,por:'uX',porNome:'Carla',local:'Almox 3',itens:{'90001':{almox3:654,saldoSistema3:650,almox30:0}}};
  const B=await H.abrir({viewport:{width:1366,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept()); p.on('pageerror',e=>console.log('PERR',e.message));
  const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')));
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
  await p.evaluate(()=>__T.go('anlinvd')); await H.dorme(1500);
  let t=await H.txt(p,'#view')||'';
  ok('Cartão "E-mail da contagem do dia" na tela de divergências, pedindo itens e destinatários', /E-MAIL DA CONTAGEM DO DIA/i.test(t)&&/Escolha os itens/.test(t), t.slice(0,200));
  await p.fill('#iem-para','pcp@exemplo.com; comercial@exemplo.com'); await p.click('[data-act="iem-salva"]'); await H.dorme(800);
  for(const c of ['90001','cimento teste 25']){ await p.fill('#iem-add',c); await p.press('#iem-add','Enter'); await H.dorme(900); }
  let b=await srv(); const cfg=b.docs['config/geral'].invEmail||{};
  ok('Itens e destinatários ficam guardados em config/geral.invEmail', JSON.stringify(cfg.itens)==='["90001","90002"]'&&/pcp@exemplo.com/.test(cfg.para), JSON.stringify(cfg));
  let L=await p.evaluate(()=>Painel.emailContagem.linhas());
  ok('Físico do 1º item vem da contagem de hoje (654) e o sistema do Focco (650)', L[0].fis===654&&L[0].sis===650&&L[0].fonte==='contagem'&&/Não encontrei a causa/.test(L[0].obs), JSON.stringify(L[0]));
  ok('2º item sem contagem: físico em branco, sistema = Almox 3 + 30 (123)', L[1].fis==null&&L[1].sis===123, JSON.stringify(L[1]));
  await p.fill('[data-iem="pal"][data-c="90002"]','2'); await p.fill('[data-iem="av"][data-c="90002"]','11'); await H.dorme(1200);
  L=await p.evaluate(()=>Painel.emailContagem.linhas());
  ok('Paletes × múltiplo + avulsos: 2 × 60 + 11 = 131', L[1].fis===131&&L[1].fonte==='digitado', JSON.stringify(L[1]));
  const tx=await p.evaluate(()=>Painel.emailContagem.texto());
  ok('Texto igual ao e-mail de sempre', /Segue a contagem na data de hoje:/.test(tx)&&/Hoje temos em estoque CIMENTO TESTE 50 KG \(90001\)\nFísico = 654 sacos\nSistema = 650 sacos\n Obs: Não encontrei a causa da divergência/.test(tx), tx);
  const u=await p.evaluate(()=>Painel.emailContagem.owa());
  ok('"Abrir no Outlook" leva para, assunto e o texto', /outlook\.office\.com\/mail\/deeplink\/compose\?to=pcp%40exemplo\.com/.test(u)&&/subject=Contagem/.test(u)&&/body=/.test(u), u.slice(0,160));
  await p.evaluate(()=>{ window.open=()=>({}); }); await p.click('[data-act="iem-owa"]'); await H.dorme(1000); b=await srv();
  const ult=(b.docs['config/geral'].invEmail||{}).ult||{};
  ok('Depois de abrir no Outlook fica marcado "mandado hoje"', ult.dia===hoje&&/mandado hoje/.test(await H.txt(p,'#view')||''), JSON.stringify(ult));
  if(process.env.SHOT){ await p.evaluate(()=>document.querySelector('.iem').scrollIntoView()); await H.dorme(400); await (await p.$('.iem')).screenshot({path:process.env.SHOT}); }
  const fal=res.filter(r=>!r.ok).length; console.log(fal?`FALHOU ${fal} de ${res.length}`:`PASSOU ${res.length}`); await B.browser.close(); process.exit(fal?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
