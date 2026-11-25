/* Teste do módulo Agendamentos (modulos/agendamentos.js). Precisa do leitor de PDF de verdade: npm i --no-save pdfjs-dist@3.11.174
   O PDF é gerado aqui no formato do "Mapa de Itens" do Focco, com dados inventados (o repositório é público).
   AGEND_PDF=<arquivo> testa também a leitura de um PDF de verdade, só localmente (não suba o arquivo). */
if(require('fs').existsSync(__dirname+'/node_modules/jspdf/dist/jspdf.umd.min.js')) process.env.JSPDF_REAL='1'; /* PDF do dia de verdade (npm i --no-save jspdf@2.5.1) */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[];
const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,220):'')); };
const PDFJS=__dirname+'/node_modules/pdfjs-dist/build/';
if(!fs.existsSync(PDFJS+'pdf.min.js')){ console.log('FALHOU falta o leitor de PDF: rode npm i --no-save pdfjs-dist@3.11.174'); process.exit(1); }

/* PDF simples com texto posicionado (x, y em pontos), como o "Microsoft Print to PDF" do Focco */
function pdf(linhas){ const cont=linhas.map(([x,y,t])=>`BT /F1 7 Tf ${x} ${y} Td (${String(t).replace(/[()\\]/g,'\\$&')}) Tj ET`).join('\n');
  const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(cont,'latin1')} >>\nstream\n${cont}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  let s='%PDF-1.4\n'; const off=[]; objs.forEach((o,i)=>{ off.push(Buffer.byteLength(s,'latin1')); s+=`${i+1} 0 obj\n${o}\nendobj\n`; });
  const x=Buffer.byteLength(s,'latin1'); s+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(s,'latin1'); }
function mapa(ped,itens,emp){ const L=[[480,770,'Focco3i RPDV0206_MIT'],[480,760,'Data: 24/11/2026 14:51:08'],[250,745,'Mapa de Itens'],[17,720,'Empresa.........: '+(emp||'1 - EMPRESA TESTE INDUSTRIA LTDA')],
    [17,710,'Pedido..........: '+(ped||'Todos')],[17,700,'Cliente.........: Todos'],[17,690,'Data de Entrega.: Todos'],
    [91,600,'Descrição'],[253,600,'Un.'],[296,600,'Quantidade'],[336,600,'Qtd. Atendida'],[378,600,'Qtd. Cancelada'],[430,600,'Qtd. Pendent'],[490,600,'Saldo Est.'],[551,600,'Valor Total'],[20,592,'Item']];
  let y=575, tot=0; itens.forEach(i=>{ const pend=i[7]?(+i[3].replace(/\./g,'').replace(',','.')-(+i[6].replace(',','.'))-(+i[7].replace(',','.'))).toFixed(3).replace('.',','):i[3]; L.push([19,y,i[0]],[90,y,i[1]],[252,y,i[2]],[307,y,i[3]],[360,y,i[6]||'0,000'],[407,y,i[7]||'0,000'],[447,y,pend],[498,y,i[4]],[556,y,i[5]]); tot+=+i[5].replace(/\./g,'').replace(',','.'); y-=12; });
  L.push([422,y-6,'Total'],[555,y-6,tot.toLocaleString('pt-BR',{minimumFractionDigits:2})]); return pdf(L); }
const ITENS=[['ZZ0001','ARGAMASSA TESTE AC3 20 KG','SC','1.200,000','300,000','15.000,000'],['ZZ0002','REJUNTE TESTE BRANCO 1 KG','CX','20,000','45,000','1.200,500'],['ZZ0003','PRIMER TESTE 3,6 LT','BD','10,000','0,000','385,360']];

(async()=>{ const {d}=seedManut(); const h=new Date(), ymd=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const ontem=ymd(new Date(h.getTime()-864e5)), amanha=ymd(new Date(h.getTime()+864e5));
  const proxU=d=>{ let x=new Date(d+'T12:00:00'); do{ x=new Date(x.getTime()+864e5); }while(x.getDay()===0||x.getDay()===6); return ymd(x); };
  d.docs['agendamentos/p800001']={pedido:'800001',cliente:'Cliente Atrasado',data:ontem,status:'agendado',aberto:true,itens:[],total:10};
  d.docs['agendamentos/p800003']={pedido:'800003',carga:'sem carga',data:'',status:'aguardando',aberto:true,itens:[],total:1};
  d.docs['agendamentos/p800002']={pedido:'800002',cliente:'Cliente Antigo',data:ontem,status:'carregado',aberto:false,fechadoEm:new Date(h.getTime()-864e5).toISOString(),itens:[],total:5};
  d.users['fatura@painel-colafix.app']={uid:'uFAT',pass:'fat123',nome:'Faturamento Teste'}; d.docs['perfis/uFAT']={nome:'Faturamento Teste',usuario:'fatura'}; d.docs['acessos/uFAT']={perfil:'producao',mods:['inicio'],soVerMods:['agend'],locais:[],ativo:true};
  d.docs['itens/ZZ0001']={codigo:'ZZ0001',palete:96,desc:'Argamassa teste'}; /* Ajustes › Itens: 96 sacos por palete */
  fs.mkdirSync('/tmp/agend',{recursive:true});
  fs.writeFileSync('/tmp/agend/p500a.pdf',mapa('900010',[['ZZ0001','ARGAMASSA TESTE AC3 20 KG','SC','500,000','2.000,000','6.250,000']]));
  fs.writeFileSync('/tmp/agend/p500b.pdf',mapa('900011',[['ZZ0001','ARGAMASSA TESTE AC3 20 KG','SC','500,000','0,000','6.250,000']],'9 - OUTRA FILIAL LTDA')); /* empresa 9 sem saldo: precisa transferir */
  fs.writeFileSync('/tmp/agend/146001.pdf',mapa('900001',ITENS));
  fs.writeFileSync('/tmp/agend/146001b.pdf',mapa('900001',ITENS.map(i=>i[0]==='ZZ0001'?[...i.slice(0,4),'1.500,000',i[5]]:i)));
  fs.writeFileSync('/tmp/agend/varios.pdf',mapa('900030,900031,900032',ITENS.slice(0,2).concat([['ZZ0009','ARGAMASSA CANCELADA AC2','SC','90,000','581,000','1.208,160','0,000','90,000']])));
  fs.writeFileSync('/tmp/agend/sem-numero.pdf',mapa('',ITENS.slice(1)));
  fs.writeFileSync('/tmp/agend/outro1.pdf',mapa('900002',ITENS.slice(0,1))); fs.writeFileSync('/tmp/agend/outro2.pdf',mapa('900003',ITENS.slice(2)));
  const abre=async(u,s,vp)=>{ const B=await H.abrir(vp?{viewport:vp}:{});
    await B.page.route('**/pdf.js/3.11.174/**',r=>{ const f=r.request().url().includes('worker')?'pdf.worker.min.js':'pdf.min.js'; r.fulfill({contentType:'text/javascript',body:fs.readFileSync(PDFJS+f,'utf8')}); });
    B.page.on('dialog',g=>g.accept(g.type()==='prompt'?'cliente desistiu':undefined));
    await H.preparar(B.page,d); await B.page.goto(H.BASE); await H.entrar(B.page,u,s); await H.dorme(2600); return B; };
  const banco=(p,id)=>p.evaluate(id=>{ const b=JSON.parse(localStorage.getItem('__srv')||'{}'); return (b.docs||{})['agendamentos/'+id]||null; },id);
  const tela=p=>p.evaluate(()=>document.getElementById('view').innerText);
  const jan=p=>p.evaluate(()=>{ const j=document.querySelector('dialog.ag-jan'); return j?j.innerText:''; });

  let B=await abre('iasmyn','senha123'); let p=B.page;
  const cal=async d=>{ await p.evaluate(()=>__T.go('agcal')); await H.dorme(400); if(d){ await p.click('.ag-cd[data-v="'+d+'"]'); await H.dorme(300); } };
  const lst=async aba=>{ await p.evaluate(a=>{ if(a) window.__agend.aba=a; window.__agend.dia=''; __T.go('agendamentos'); },aba||''); await H.dorme(400); };
  const painelDia=async()=>p.evaluate(()=>{ document.querySelectorAll('details.ag-dpe').forEach(x=>x.open=true); const x=document.querySelector('.ag-dp'); return x?x.innerText:''; });
  const nav=await p.evaluate(()=>document.getElementById('navlist').innerText);
  await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(600);
  let t=await tela(p);
  ok('Agendamentos aparece no menu da administradora e abre a tela', /Agendamentos/.test(nav)&&/Agendamentos de pedidos/.test(t)&&/Importar PDF/.test(t), t.replace(/\n/g,' | ').slice(0,160));
  ok('Números do topo: 1 com a data já passada, 1 esperando data; "sem carga" digitado vira Sem carga', /1 com a data passada/.test(t)&&/1 esperando data/.test(t)&&await p.evaluate(()=>{ const x=window.__agend.abertos.find(y=>y._id==='p800003'); return x&&x.carga===''&&x.semCarga===true; })&&/Calendário/.test(t), t.replace(/\n/g,' | ').slice(0,260));

  /* importar um PDF */
  await p.setInputFiles('#ag-file','/tmp/agend/146001.pdf'); await p.waitForSelector('dialog.ag-jan',{timeout:15000}); await H.dorme(400);
  let j=await jan(p), doc=await banco(p,'p900001');
  ok('Lê o PDF do Focco: pedido, 3 itens, unidade, pendente e saldo', doc&&doc.pedido==='900001'&&doc.itens.length===3&&doc.itens[0].cod==='ZZ0001'&&doc.itens[0].un==='SC'&&doc.itens[0].pend===1200&&doc.itens[0].saldo===300&&doc.itens[1].saldo===45&&Math.abs(doc.total-16585.86)<0.01, JSON.stringify(doc&&doc.itens&&doc.itens[0]));
  ok('Já fica salvo como "Esperando data" e a janela abre com o pedido (com a empresa do PDF)', doc&&doc.status==='aguardando'&&doc.aberto===true&&/Pedido 900001/.test(j)&&doc.empresa&&doc.empresa.cod==='1'&&/Empresa 1 \(Empresa\)/.test(j));
  const pp1=await p.evaluate(()=>[...document.querySelectorAll('dialog.ag-jan .ag-pp')].map(i=>i.value));
  ok('Por palete vem de Ajustes › Itens (96) e calcula os paletes do item (1.200 ÷ 96 = 12,50)', pp1[0]==='96'&&pp1[1]===''&&/12,50/.test(j)&&/Sem palete \(ficam na unidade\)/.test(j), JSON.stringify(pp1));
  await p.fill('dialog.ag-jan .ag-pp[data-k="1"]','40'); await H.dorme(150); j=await jan(p);
  ok('Digitar o palete de um item sem cadastro atualiza o total na hora (12,50 + 0,50)', /13,00 paletes/.test(j)&&/1\.200 SC · 20 CX · 10 BD/.test(j), (j.match(/Total a carregar[^\n]*\n?[^\n]*/)||[''])[0]);
  ok('A janela mostra o que falta no estoque (falta 900 do ZZ0001 e o ZZ0003 sem saldo)', /Falta 900/.test(j)&&/Falta 10/.test(j)&&/Tem/.test(j)&&/2 sem estoque suficiente/.test(j), j.replace(/\n/g,' | ').slice(0,400));

  /* preencher e agendar para amanhã pelo atalho */
  await p.fill('#ag-cli','Construtora Exemplo'); await p.fill('#ag-carga','5521'); await p.fill('#ag-transp','Transp. Teste · ABC1D23'); await p.fill('#ag-obs','pediu para cedo');
  await p.click('dialog.ag-jan [data-act="ag-dt"]:nth-child(2)'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(700);
  doc=await banco(p,'p900001'); t=await tela(p);
  ok('Salvar com data: vira Agendado, com cliente, carga, transportadora e observação', doc.status==='agendado'&&doc.data===amanha&&doc.cliente==='Construtora Exemplo'&&doc.carga==='5521'&&/ABC1D23/.test(doc.transp)&&doc.obs==='pediu para cedo', JSON.stringify({s:doc.status,d:doc.data,a:amanha}));
  ok('Aba Agendados agrupa por dia (Amanhã e "Já passou")', /Amanhã/.test(t)&&/Já passou/.test(t)&&/Construtora Exemplo/.test(t)&&/Carga 5521/.test(t), t.replace(/\n/g,' | ').slice(0,300));
  const cfg1=await p.evaluate(()=>{ const b=JSON.parse(localStorage.getItem('__srv')||'{}'); return (b.docs||{})['config/agendamentos']||null; });
  ok('Guarda a transportadora e o palete digitado para os próximos pedidos', cfg1&&(cfg1.transps||[]).some(t=>/ABC1D23/.test(t))&&cfg1.pp&&cfg1.pp.ZZ0002===40&&doc.itens[1].pp===40&&!doc.itens[0].pp, JSON.stringify(cfg1));
  ok('Histórico guarda o que mudou', (doc.hist||[]).some(e=>/Agendado para/.test(e.t))&&(doc.hist||[]).some(e=>/Importado do PDF/.test(e.t)));

  /* busca filtra sem redesenhar */
  await p.fill('#ag-q','exemplo 5521'); await H.dorme(200);
  const vis=await p.evaluate(()=>[...document.querySelectorAll('#ag-corpo .ag-ln')].filter(l=>l.style.display!=='none').map(l=>l.dataset.v));
  ok('Busca: todas as palavras, sem redesenhar', vis.length===1&&vis[0]==='p900001', JSON.stringify(vis));
  await p.fill('#ag-q',''); await p.dispatchEvent('#ag-q','input');

  /* reimportar o mesmo pedido: troca os itens e mantém o resto */
  await p.setInputFiles('#ag-file','/tmp/agend/146001b.pdf'); await p.waitForSelector('dialog.ag-jan',{timeout:15000}); await H.dorme(400);
  doc=await banco(p,'p900001'); j=await jan(p);
  ok('Reimportar o PDF atualiza o saldo e mantém cliente, carga e data', doc.itens[0].saldo===1500&&doc.cliente==='Construtora Exemplo'&&doc.data===amanha&&doc.status==='agendado'&&/Falta 10/.test(j)&&!/Falta 900/.test(j));
  await p.keyboard.press('Escape'); await H.dorme(200);

  /* PDF sem número do pedido: pergunta */
  await p.setInputFiles('#ag-file','/tmp/agend/sem-numero.pdf'); await p.waitForSelector('dialog.ag-jan #ag-ped',{timeout:15000});
  await p.fill('#ag-ped','900009'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600); doc=await banco(p,'p900009');
  ok('PDF sem número: pede o pedido e salva com os itens', doc&&doc.itens.length===2&&doc.status==='aguardando');

  /* vários PDFs de uma vez */
  await p.setInputFiles('#ag-file',['/tmp/agend/outro1.pdf','/tmp/agend/outro2.pdf']); await H.dorme(2500);
  const d2=await banco(p,'p900002'), d3=await banco(p,'p900003'); await p.evaluate(()=>{ window.__agend.aba='aguardando'; __T.go('agendamentos'); }); await H.dorme(300); t=await tela(p);
  ok('Vários PDFs de uma vez entram em "Esperando data"', d2&&d3&&d2.status==='aguardando'&&/900002/.test(t)&&/900003/.test(t)&&!(await jan(p)));

  /* PDF com vários pedidos no filtro do Focco */
  await p.setInputFiles('#ag-file','/tmp/agend/varios.pdf'); await p.waitForSelector('dialog.ag-jan',{timeout:15000}); await H.dorme(300); j=await jan(p);
  doc=await banco(p,'p900030_900031_900032'); await p.keyboard.press('Escape'); await H.dorme(200);
  const lv=await p.evaluate(()=>{ const l=document.querySelector('.ag-ln[data-v="p900030_900031_900032"]'); return l?{pd:l.querySelector('.ag-pd').innerText,sub:l.querySelector('.ag-sub').innerText,larg:l.querySelector('.ag-pd').scrollWidth<=l.querySelector('.ag-pd').clientWidth+1}:null; });
  ok('PDF com vários pedidos: um agendamento com a lista, número curto (+2) e a lista embaixo, sem sobrepor', doc&&doc.pedidos.join()==='900030,900031,900032'&&doc.itens.length===3&&doc.itens[2].pend===0&&doc.itens[2].canc===90&&/Cancelado 90/.test(j)&&/de 90 · cancelado 90/.test(j)&&!/Atendido/.test(j)&&/1\.200 SC/.test(j)&&/3 pedidos: 900030, 900031, 900032/.test(j)&&lv&&/900030 \+2/.test(lv.pd)&&/carga com 3 pedidos: 900030, 900031, 900032/.test(lv.sub)&&lv.larg, JSON.stringify(lv));
  ok('Já entra marcado como uma carga ("Estes 3 pedidos são uma carga")', doc.ehCarga===true&&/✓ Estes 3 pedidos são uma carga/.test(j));
  await p.click('.ag-ln[data-v="p900030_900031_900032"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-dt"]:nth-child(4)'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600);
  let dv=await p.evaluate(()=>document.getElementById('ag-corpo').innerText);
  ok('No dia aparece como "Carga com 3 pedidos" mesmo sem número', /Carga com 3 pedidos sem número ainda/.test(dv)&&/carga com 3 pedidos: 900030, 900031, 900032/.test(dv), dv.replace(/\n/g,' | ').slice(0,400));
  await p.click('.ag-ln[data-v="p900030_900031_900032"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('[data-act="ag-ehcarga"]'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600);
  doc=await banco(p,'p900030_900031_900032'); dv=await p.evaluate(()=>document.getElementById('ag-corpo').innerText);
  ok('Desmarcar "são uma carga" volta para Sem carga', doc.ehCarga===false&&!/Carga com 3 pedidos/.test(dv));
  await p.click('.ag-ln[data-v="p900030_900031_900032"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-apagar"]'); await H.dorme(500);
  await p.evaluate(()=>{ window.__agend.aba='aguardando'; __T.go('agendamentos'); }); await H.dorme(300);

  /* avisos no Meu dia */
  await p.evaluate(()=>__T.go('meudia')); await H.dorme(500); t=await tela(p);
  ok('Meu dia avisa a data já passada e os pedidos esperando data', /com a data já passada/.test(t)&&/esperando data/.test(t)&&/800001/.test(t), t.replace(/\n/g,' | ').slice(0,300));

  /* exemplo da Iasmyn: 500 + 500 na mesma carga = 1.000 SC = 10,41 paletes de 96 */
  const mais2=ymd(new Date(h.getTime()+2*864e5));
  await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(400);
  for(const [f,sc] of [['/tmp/agend/p500a.pdf',0],['/tmp/agend/p500b.pdf',1]]){ await p.setInputFiles('#ag-file',f); await p.waitForSelector('dialog.ag-jan',{timeout:15000}); await H.dorme(300);
    if(sc){ const lst=await p.evaluate(()=>[...document.querySelectorAll('#ag-tl option')].map(o=>o.value)); ok('A transportadora já usada aparece na lista ao digitar', lst.some(t=>/ABC1D23/.test(t)), JSON.stringify(lst)); }
    await p.fill('#ag-carga','7000'); await p.fill('#ag-transp','Gabriel Teste'); await p.click('dialog.ag-jan [data-act="ag-dt"]:nth-child(3)'); await H.dorme(150);
    if(sc){ const dp=await p.evaluate(()=>document.getElementById('ag-diap').innerText); ok('Ao escolher o dia, mostra o que já tem nele e como fica com este pedido', /já tem 1 pedido \(5,20 paletes\)/i.test(dp)&&/Com este pedido fica 10,41 paletes/.test(dp), dp); }
    await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600); }
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(400);
  const dia=await p.evaluate(d=>{ const x=[...document.querySelectorAll('.ag-dia')].find(e=>e.innerText.includes(d)); return x?x.innerText:''; },mais2.slice(8,10)+'/'+mais2.slice(5,7)+'/'+mais2.slice(0,4));
  ok('Dia com 2 pedidos na mesma carga: 1.000 SC · 10,41 paletes (no dia e na carga)', /10,41 paletes/.test(dia)&&/Carga 7000/.test(dia)&&/Gabriel Teste · 2 pedidos/.test(dia), dia.replace(/\n/g,' | ').slice(0,300));
  const lv2=await p.evaluate(()=>document.querySelector('.ag-ln[data-v="p900011"] .ag-sub').innerText);
  ok('Cada pedido mostra a empresa', /Empresa 9 \(Outra\)/.test(lv2), lv2);
  await p.selectOption('#ag-emp','Empresa 9 (Outra)'); await H.dorme(300);
  const fe=await p.evaluate(()=>({ids:[...document.querySelectorAll('#ag-corpo .ag-ln')].map(l=>l.dataset.v),chip:(document.querySelector('[data-act="ag-aba"][data-v="agendado"]')||{}).innerText}));
  await cal(); fe.cal=await p.evaluate(()=>(document.querySelector('.ag-calg')||{}).innerText||''); await lst('agendado');
  ok('Filtro de empresa: só os pedidos da Empresa 9 na lista, nas abas e no calendário', fe.ids.join()==='p900011'&&/Agendados\s*1/.test(fe.chip)&&/5,20/.test(fe.cal)&&!/10,41/.test(fe.cal), JSON.stringify(fe).slice(0,300));
  await p.selectOption('#ag-emp',''); await H.dorme(300);
  await cal(); const fx=await p.evaluate(()=>(document.querySelector('.ag-calg')||{}).innerText||''); await lst('agendado');
  ok('Aba Calendário mostra os paletes pendentes de cada dia', /10,41/.test(fx), fx.replace(/\n/g,' ').slice(0,200));
  /* sem carga por enquanto */
  await p.click('.ag-ln[data-v="p900010"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-semcarga"]');
  const dis=await p.evaluate(()=>document.getElementById('ag-carga').disabled); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600);
  doc=await banco(p,'p900010'); const dia2=await p.evaluate(()=>document.getElementById('ag-corpo').innerText);
  ok('"Sem carga por enquanto" apaga a carga, trava o campo e o pedido vai para o bloco "Sem carga"', dis&&doc.semCarga===true&&doc.carga===''&&/Sem carga/.test(dia2)&&/Carga 7000/.test(dia2)&&/Gabriel Teste/.test(dia2));
  await p.click('.ag-ln[data-v="p900010"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.fill('#ag-carga','7001').catch(()=>{});
  const dis2=await p.evaluate(()=>document.getElementById('ag-carga').disabled); await p.click('dialog.ag-jan [data-act="ag-semcarga"]'); await p.fill('#ag-carga','7001'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600);
  doc=await banco(p,'p900010'); ok('Tirar o "Sem carga" e digitar a carga volta ao normal', dis2&&doc.carga==='7001'&&doc.semCarga===false);
  /* marcar pedidos e montar a carga (carga 1111, ordem 3 no diário de bordo) */
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(300);
  await p.click('.ag-ck[data-v="p900010"]'); await H.dorme(200); await p.click('.ag-ck[data-v="p900011"]'); await H.dorme(200);
  const mk=await p.evaluate(()=>{ const x=document.querySelector('.ag-mk'); return x?x.innerText:''; });
  ok('Marcar 2 pedidos mostra a barra com o total (paletes por item: 10,41, não 5,20 + 5,20)', /2 pedidos marcados/.test(mk)&&/1\.000 SC · 10,41 paletes/.test(mk), mk.replace(/\n/g,' '));
  await p.click('[data-act="ag-montar"]'); await p.waitForSelector('dialog.ag-jan #ag-diario'); let jc=await jan(p);
  ok('Janela "Montar carga" lista os pedidos e os paletes por item', /Montar carga · 2 pedidos/.test(jc)&&/ZZ0001/.test(jc)&&/10,41/.test(jc)&&/900010/.test(jc)&&/900011/.test(jc), jc.replace(/\n/g,' | ').slice(0,300));
  await p.fill('#ag-carga','1111'); await p.fill('#ag-diario','3'); await p.click('[data-act="ag-cgsalvar"]'); await H.dorme(800);
  const c1=await banco(p,'p900010'), c2=await banco(p,'p900011'); const dia3=await p.evaluate(()=>document.getElementById('ag-corpo').innerText); await cal(mais2); const tot3=await painelDia(); await lst('agendado');
  ok('Salvar a carga grava carga e diário de bordo em todos os marcados', c1.carga==='1111'&&c2.carga==='1111'&&c1.diario==='3'&&c2.diario==='3'&&c1.data===mais2&&!c1.semCarga&&/Carga 1111/.test(dia3)&&/diário nº 3/i.test(dia3)&&!(await p.$('.ag-mk')), dia3.replace(/\n/g,' | ').slice(0,300));
  ok('Calendário: tocar no dia mostra os itens somados (ZZ0001: 1.000 sacos = 10,41 paletes), pendente, total, empresas e valor', /ZZ0001/.test(tot3)&&/10,41 pal\./.test(tot3)&&/1\.000 sacos/.test(tot3)&&/Pendente\s*10,41 paletes/.test(tot3)&&/Total do dia 10,41 paletes/.test(tot3)&&/Empresa 1 \(Empresa\)\s*pendente 5,20 paletes/.test(tot3)&&/Empresa 9 \(Outra\)\s*pendente 5,20 paletes/.test(tot3)&&/Valor R\$ 12\.500,00/.test(tot3), tot3.replace(/\n/g,' | ').slice(0,500));
  await p.click('.ag-ln[data-v="p900010"] .ag-mid'); await p.waitForSelector('dialog.ag-jan #ag-diario'); await p.fill('#ag-diario','4'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(800);
  ok('Mudar o diário de bordo num pedido muda nos outros da mesma carga', (await banco(p,'p900011')).diario==='4');
  await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(300);
  ok('As linhas não mostram mais paletes por pedido', !(await p.$('.ag-ln .ag-pa')));
  ok('Pedido importado antes da empresa mostra "sem empresa"', /sem empresa/.test(await p.evaluate(()=>{ const l=document.querySelector('.ag-ln[data-v="p800001"] .ag-sub'); return l?l.innerText:''; })));
  await p.click('.ag-ln[data-v="p800001"] .ag-mid'); await p.waitForSelector('dialog.ag-jan #ag-empsel'); await p.selectOption('#ag-empsel','1'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600);
  let e1=await banco(p,'p800001');
  ok('Vincular a empresa à mão: escolhe da lista das empresas que já vieram nos PDFs', e1.empresa&&e1.empresa.cod==='1'&&/EMPRESA TESTE/.test(e1.empresa.nome)&&(e1.hist||[]).some(h=>/Empresa: Empresa 1 \(Empresa\) \(à mão\)/.test(h.t))&&/Empresa 1 \(Empresa\)/.test(await p.evaluate(()=>document.querySelector('.ag-ln[data-v="p800001"] .ag-sub').innerText)), JSON.stringify(e1.empresa));
  await p.click('[data-act="ag-aba"][data-v="aguardando"]'); await H.dorme(300);
  await p.click('.ag-ln[data-v="p800003"] .ag-mid'); await p.waitForSelector('dialog.ag-jan #ag-empsel'); await p.selectOption('#ag-empsel','__outra'); await p.fill('#ag-empnova','7 - nova empresa ltda'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600);
  e1=await banco(p,'p800003');
  ok('"Outra…": digita código e nome de uma empresa nova', e1.empresa&&e1.empresa.cod==='7'&&e1.empresa.nome==='NOVA EMPRESA LTDA', JSON.stringify(e1.empresa));
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(300);
  await cal(mais2); const te=await painelDia();
  ok('Calendário: transferências entre empresas (ZZ0001: Empresa 9 pede 500, saldo 0, transferir 500)', /Por empresa e transferências \(1\)/.test(te)&&/ZZ0001\s*Empresa 9 \(Outra\)\s*500\s*0\s*500/.test(te), te.replace(/\n/g,' | ').slice(-300));
  await p.click('[data-act="ag-trf"]'); await H.dorme(600); const te2=await painelDia(); const cfgT=await p.evaluate(()=>{ const b=JSON.parse(localStorage.getItem('__srv')||'{}'); return ((b.docs||{})['config/agendamentos']||{}).trfFeito||{}; });
  ok('"Transferido" tira a linha da lista de transferir e fica como feita', /transferências \(feitas\)/.test(te2)&&/Já transferido: ZZ0001 500 para Empresa 9 \(Outra\)/.test(te2)&&!/\bTransferido\b/.test(te2.replace('Já transferido',''))&&Object.keys(cfgT).some(k=>/\|ZZ0001\|Empresa 9/.test(k)), te2.replace(/\n/g,' | ').slice(-300));
  await p.click('[data-act="ag-trfdesf"]'); await H.dorme(600);
  ok('"desfazer" volta a transferência para a lista', /transferências \(1\)/.test(await painelDia()));
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('[data-act="ag-pdfdia"]')]); const arq='/tmp/agend/dia.pdf'; await dl.saveAs(arq);
  let txtPdf=''; if(process.env.JSPDF_REAL){ const pj=require('./node_modules/pdfjs-dist/legacy/build/pdf.js'); const dpdf=await pj.getDocument({data:new Uint8Array(fs.readFileSync(arq))}).promise; for(let k=1;k<=dpdf.numPages;k++){ const tc=await (await dpdf.getPage(k)).getTextContent(); txtPdf+=tc.items.map(i=>i.str).join(' ')+'\n'; } }
  ok('PDF do dia: baixa o arquivo com o total, por empresa, a transferência e os pedidos', dl.suggestedFilename()==='carregamentos-'+mais2+'.pdf'&&(!process.env.JSPDF_REAL||(/Carregamentos/.test(txtPdf)&&/10,41/.test(txtPdf)&&/Transferir entre empresas/.test(txtPdf)&&/Empresa 9 \(Outra\)/.test(txtPdf)&&/500 SC/.test(txtPdf)&&/900010/.test(txtPdf)&&/Por empresa/.test(txtPdf))), dl.suggestedFilename()+' '+txtPdf.replace(/\s+/g,' ').slice(0,300));
  await p.click('.ag-cd[data-v="'+ymd(new Date(h.getTime()+864e5))+'"]'); await H.dorme(300);
  const tam=await painelDia();
  ok('Amanhã: paletes dos itens com palete e balde na unidade; total do dia "13,00 paletes · 10 baldes", pendente e valor', /12,50 pal\./.test(tam)&&/10 baldes/.test(tam)&&/Total do dia 13,00 paletes · 10 baldes/.test(tam)&&/Pendente\s*13,00 paletes · 10 baldes/.test(tam)&&/Valor R\$/.test(tam)&&/Cargas do dia/.test(tam), tam.replace(/\n/g,' | ').slice(0,400));
  await p.fill('#ag-tq','primer'); await H.dorme(150);
  const vis2=await p.evaluate(()=>[...document.querySelectorAll('.ag-tl>tr')].filter(l=>l.style.display!=='none').map(l=>l.querySelector('td b').innerText));
  ok('Busca nos itens do dia (primer → só o ZZ0003), sem redesenhar', vis2.length===1&&vis2[0]==='ZZ0003', JSON.stringify(vis2));
  await p.fill('#ag-tq',''); await p.dispatchEvent('#ag-tq','input'); await lst('agendado');


  /* ====== 25/11: planejamento, rotina, relatórios ====== */
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(400);
  let dmais2=await p.evaluate(d=>{ const x=document.getElementById('ag-d-'+d); return x?x.innerText:''; },mais2);
  ok('Estoque somado entre os pedidos: saldo total 2.000, antes vão 1.200 (amanhã), então no dia +2 faltam 200 de ZZ0001', /Falta material: ZZ0001 200/.test(dmais2), dmais2.replace(/\n/g,' | ').slice(0,200));
  /* só as cargas do diário: o plano conta só esses pedidos (os 1.000 de ZZ0001 do diário cabem nos 2.000) */
  await p.click('[data-act="ag-sodiario"]'); await H.dorme(400);
  const sd=await p.evaluate(()=>({ids:[...document.querySelectorAll('#ag-corpo .ag-ln')].map(l=>l.dataset.v).sort(),fx:(document.querySelector('.ag-fdx')||{}).innerText||'',limpa:!!document.querySelector('[data-act="ag-limpar"]'),txt:document.getElementById('ag-corpo').innerText}));
  ok('Filtro "Só do diário de bordo": só as cargas com nº do diário e se tem material para elas', sd.ids.join()==='p900010,p900011'&&/Cargas do diário de bordo/.test(sd.fx)&&/Tem material para todos os pedidos do diário/.test(sd.fx)&&!/Falta material/.test(sd.txt)&&sd.limpa, JSON.stringify(sd).slice(0,300));
  await p.fill('#ag-q','zzz'); await p.dispatchEvent('#ag-q','input'); await p.click('[data-act="ag-limpar"]'); await H.dorme(400);
  const lp=await p.evaluate(()=>({sd:window.__agend.soDiario,q:window.__agend.q,input:document.getElementById('ag-q').value,limpa:!!document.querySelector('[data-act="ag-limpar"]'),n:document.querySelectorAll('#ag-corpo .ag-ln').length}));
  ok('"Limpar filtros" desliga o diário, a busca e a empresa e some quando não há filtro', !lp.sd&&!lp.q&&!lp.input&&!lp.limpa&&lp.n>2, JSON.stringify(lp));
  await cal(mais2); ok('Calendário marca o dia com falta de material e o item mostra "falta 200"', await p.evaluate(d=>document.querySelector('.ag-cd[data-v="'+d+'"]').classList.contains('fal'),mais2)&&/falta 200/.test(await painelDia())); await lst('agendado');
  /* produção programada cobre a falta */
  await p.evaluate(d=>window.Painel.db().collection('ordens').doc('oAG1').set({num:'9901',produto:'ZZ0001',linha:'Linha 2',data:d,total:300,status:'aberta',turno:'Dia todo'}),ymd(new Date(h.getTime()+864e5))); await H.dorme(1500);
  await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(400);
  dmais2=await p.evaluate(d=>{ const x=document.getElementById('ag-d-'+d); return x?x.innerText:''; },mais2); await cal(mais2); const lado2=await painelDia(); await lst('agendado');
  ok('Produção programada de 300 amanhã cobre a falta do dia +2', !/Falta material/.test(dmais2)&&/com a produção/.test(lado2)&&!/falta 200/.test(lado2), lado2.replace(/\n/g,' | ').slice(0,300));
  /* limite de paletes por dia (Ajustes) */
  await p.click('[data-act="ag-ajustes"]'); await p.waitForSelector('dialog.ag-jan #ag-lim'); await p.fill('#ag-lim','10'); await p.click('[data-act="ag-ajsalvar"]'); await H.dorme(600);
  const cfgL=await p.evaluate(()=>{ const b=JSON.parse(localStorage.getItem('__srv')||'{}'); return (b.docs||{})['config/agendamentos']||{}; });
  const deDez=/de 10/.test(await p.evaluate(d=>document.getElementById('ag-d-'+d).innerText,mais2)); await cal(); const over=await p.evaluate(d=>document.querySelector('.ag-cd[data-v="'+d+'"]').classList.contains('over'),mais2); await lst('agendado');
  ok('Limite de paletes por dia: salvo nos Ajustes e o dia com 10,41 fica laranja', cfgL.limiteDia===10&&over&&deDez);
  /* veículo: carga 1111 (10,41 pal., 20 t) num toco (10 pal., 6 t) não cabe */
  await p.click('#ag-d-'+mais2+' .ag-cc [data-act="ag-cgedit"]'); await p.waitForSelector('dialog.ag-jan #ag-veic'); await p.selectOption('#ag-veic','TOCO'); await p.fill('#ag-placa','abc1d23'); await p.fill('#ag-hora','Manhã'); await p.click('[data-act="ag-cgsalvar"]'); await H.dorme(800);
  const cc=await p.evaluate(d=>{ const c=document.querySelector('#ag-d-'+d+' .ag-cc'); return c?c.innerText:''; },mais2); const c10=await banco(p,'p900010');
  ok('Veículo, placa e horário na carga; avisa que não cabe no toco e mostra o peso', c10.veiculo==='TOCO'&&c10.placa==='ABC1D23'&&c10.hora==='Manhã'&&/passa de 10 paletes e do peso \(6,0 t\) do toco/.test(cc)&&/20,0 t/.test(cc)&&/Toco/.test(cc)&&/ABC1D23/.test(cc), cc.replace(/\n/g,' | ').slice(0,300));
  /* situação: separado / chegou */
  await p.click('#ag-d-'+mais2+' .ag-cc [data-act="ag-etapa"][data-v^="sep|"]'); await H.dorme(500); await p.click('#ag-d-'+mais2+' .ag-cc [data-act="ag-etapa"][data-v^="chegou|"]'); await H.dorme(500);
  const c10b=await banco(p,'p900010'), c11b=await banco(p,'p900011');
  ok('Situação da carga: "Separado" e "Caminhão chegou" marcam a hora em todos os pedidos da carga', !!c10b.sep&&!!c11b.sep&&!!c10b.chegou&&!!c11b.chegou&&/✓ Separado \d\d:\d\d/.test(await p.evaluate(d=>document.querySelector('#ag-d-'+d+' .ag-cc').innerText,mais2)));
  /* ordem de carregamento: segunda carga no mesmo dia e troca a ordem */
  await p.evaluate(async d=>{ await window.Painel.db().collection('agendamentos').doc('p900050').set({pedido:'900050',pedidos:['900050'],carga:'2222',data:d,status:'agendado',aberto:true,itens:[{cod:'ZZ0002',desc:'REJUNTE',un:'CX',qtd:5,pend:5,saldo:50,valor:10}],total:10}); },mais2); await H.dorme(1200);
  await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(300);
  let ordem=await p.evaluate(d=>[...document.querySelectorAll('#ag-d-'+d+' .ag-cc')].map(c=>c.querySelector('.ag-cct b').innerText),mais2);
  await p.click('#ag-d-'+mais2+' .ag-cc:nth-of-type(1) [data-act="ag-ord"][data-v$="|1"]').catch(async()=>{ await p.click('#ag-d-'+mais2+' .ag-cc [data-act="ag-ord"][data-v$="|1"]'); }); await H.dorme(800);
  const ordem2=await p.evaluate(d=>[...document.querySelectorAll('#ag-d-'+d+' .ag-cc')].map(c=>c.querySelector('.ag-cct b').innerText),mais2), o50=await banco(p,'p900050');
  ok('Ordem de carregamento: ▼ troca as cargas e numera 1º, 2º', ordem.join()==='Carga 1111,Carga 2222'&&ordem2.join()==='Carga 2222,Carga 1111'&&o50.ordemDia===1, JSON.stringify([ordem,ordem2]));
  /* TV da expedição (hoje) e PDF de separação */
  const [dls]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('#ag-d-'+mais2+' .ag-cc [data-act="ag-pdfsep"]')]);
  ok('PDF de separação da carga', /^separacao-carga-/.test(dls.suggestedFilename()), dls.suggestedFilename());
  await cal(); const [dlw]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('[data-act="ag-pdfsem"]')]);
  ok('PDF da semana', /^carregamentos-semana-\d{4}-\d\d-\d\d\.pdf$/.test(dlw.suggestedFilename()), dlw.suggestedFilename());
  const [dlc]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('[data-act="ag-csv"]')]); const csvp='/tmp/agend/a.csv'; await dlc.saveAs(csvp); const csv=fs.readFileSync(csvp,'utf8');
  ok('Planilha (CSV com ;) com um item por linha, carga, veículo e paletes', /^\ufeffData;Situação;Ordem;Carga/.test(csv)&&/Reagendado de/.test(csv)&&/1111;/.test(csv)&&/Toco/.test(csv)&&/ZZ0001;ARGAMASSA TESTE AC3 20 KG;500;SC;5,21/.test(csv), csv.split('\n').slice(0,3).join(' // ').slice(0,300));
  await lst('agendado');
  /* entrega parcial */
  await p.click('[data-act="ag-aba"][data-v="aguardando"]'); await H.dorme(300); await p.click('.ag-ln[data-v="p900009"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('[data-act="ag-dividir"]'); await p.waitForSelector('dialog.ag-jan .ag-dvq');
  await p.fill('.ag-dvq[data-k="0"]','5'); await p.click('[data-act="ag-dvsalvar"]'); await H.dorme(800);
  const pa=await banco(p,'p900009'), pr=await banco(p,'p900009-r2');
  ok('Entrega parcial: 5 de 20 CX vão agora; o resto (15) vira outro agendamento esperando data', pa.itens.find(i=>i.cod==='ZZ0002').pend===5&&pr&&pr.status==='aguardando'&&pr.itens.length===1&&pr.itens[0].pend===15&&pr.parcial.de==='p900009'&&/entrega parcial/.test(await p.evaluate(()=>document.getElementById('ag-corpo').innerText)), JSON.stringify(pr&&pr.itens));
  /* colar texto do Focco + pedido repetido */
  await p.click('[data-act="ag-colar"]'); await p.waitForSelector('#ag-txt');
  await p.fill('#ag-txt','Empresa.........: 9 - OUTRA FILIAL LTDA\nPedido..........: 900010,900040\nItem Descrição Un. Quantidade Qtd. Atendida Qtd. Cancelada Qtd. Pendent Saldo Est. Valor Total\nZZ0002 REJUNTE TESTE BRANCO 1 KG CX 8,000 0,000 0,000 8,000 45,000 480,000\nZZ0003 PRIMER TESTE 3,6 LT BD 2,000 0,000 0,000 2,000 0,000 77,070');
  await p.click('[data-act="ag-colarok"]'); await H.dorme(900); const col=await banco(p,'p900010_900040'); await p.keyboard.press('Escape'); await H.dorme(300);
  const rep=await p.evaluate(()=>{ const l=document.querySelector('.ag-ln[data-v="p900010_900040"] .ag-sub'); return l?l.innerText:''; });
  ok('Colar texto do Focco: lê empresa, pedidos e itens com unidade', col&&col.empresa.cod==='9'&&col.itens.length===2&&col.itens[0].un==='CX'&&col.itens[0].pend===8&&col.itens[1].un==='BD', JSON.stringify(col&&col.itens));
  ok('Pedido repetido: 900010 também está em outro agendamento', /pedido repetido/.test(rep), rep);
  /* motivo do atraso ao passar para o próximo dia útil */
  await p.click('[data-act="ag-aba"][data-v="agendado"]'); await H.dorme(300);
  await p.click('#ag-d-'+ontem+' [data-act="ag-adiar"]'); await p.waitForSelector('dialog.ag-jan #ag-motivo'); await p.selectOption('#ag-motivo','Transportadora não veio'); await p.click('[data-act="ag-motok"]'); await H.dorme(800);
  const at=await banco(p,'p800001');
  ok('Data passada: "Passar para o próximo dia útil" pede o motivo e guarda', at.data>=ymd(new Date())&&at.atrasos&&at.atrasos[0].motivo==='Transportadora não veio'&&at.atrasos[0].de===ontem, JSON.stringify(at.atrasos));
  /* atalhos de data pulam domingo e sábado */
  await p.click('.ag-ln[data-v="p800001"] .ag-mid'); await p.waitForSelector('dialog.ag-jan');
  const ats=await p.evaluate(()=>[...document.querySelectorAll('dialog.ag-jan .ag-atb[data-v]')].map(b=>b.dataset.v).filter(Boolean).map(d=>new Date(d+'T12:00:00').getDay()));
  ok('Atalhos de data só com dias de expedição (sem sábado e domingo)', ats.length===4&&ats.every(w=>w>=1&&w<=5), JSON.stringify(ats)); await p.keyboard.press('Escape'); await H.dorme(200);
  /* reagendar (ajuste 25/11) */
  const alvo=proxU(mais2);
  await p.click('.ag-cc[data-ids="p900050"] [data-act="ag-reag"]'); await p.waitForSelector('dialog.ag-jan #ag-motivo');
  await p.fill('dialog.ag-jan #ag-data',alvo); await p.selectOption('#ag-motivo','Cliente pediu para mudar'); await p.click('[data-act="ag-reagok"]'); await H.dorme(900);
  const r50=await banco(p,'p900050'); await lst('agendado'); const lr=await p.evaluate(()=>{ const l=document.querySelector('.ag-ln[data-v="p900050"] .ag-sub'); return l?l.innerText:''; });
  ok('Reagendar: nova data, motivo e "reagendado · era <data>" no pedido', r50.data===alvo&&r50.reag&&r50.reag[0].de===mais2&&r50.reag[0].para===alvo&&r50.reag[0].motivo==='Cliente pediu para mudar'&&new RegExp('reagendado · era '+mais2.slice(8,10)+'/'+mais2.slice(5,7)).test(lr)&&(r50.hist||[]).some(e=>/Reagendado de/.test(e.t)), JSON.stringify(r50.reag)+' '+lr);
  await p.click('.ag-ln[data-v="p900050"] .ag-mid'); await p.waitForSelector('dialog.ag-jan #ag-data'); await p.fill('dialog.ag-jan #ag-data',mais2); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(800);
  const r50b=await banco(p,'p900050');
  ok('Mudar a data na janela de um pedido agendado também conta como reagendamento (2x)', r50b.data===mais2&&r50b.reag.length===2&&/reagendado 2x/.test(await p.evaluate(()=>document.querySelector('.ag-ln[data-v="p900050"] .ag-sub').innerText)), JSON.stringify(r50b.reag));
  /* do calendário para a lista */
  await cal(mais2); await p.click('[data-act="ag-verdia"]'); await H.dorme(500);
  ok('"Ver na lista" do calendário abre a lista só com aquele dia, destacado', await p.evaluate(d=>{ const s=document.getElementById('ag-d-'+d); return !!s&&s.classList.contains('ag-pisca')&&window.__agend.dia===d&&__T.S().view==='agendamentos'; },mais2));
  await lst('agendado');
  /* atalho de teclado */
  await p.evaluate(()=>document.activeElement&&document.activeElement.blur()); await p.keyboard.press('/'); await H.dorme(150);
  ok('Atalho "/" vai para a busca', await p.evaluate(()=>document.activeElement&&document.activeElement.id==='ag-q'));
  /* a TV saiu; a aba Calendário entrou no lugar, com ← → */
  const nav3=await p.evaluate(()=>document.getElementById('view').innerText.slice(0,400)+' '+document.body.innerText.includes('Expedição (TV)'));
  await cal(mais2); await p.evaluate(()=>document.activeElement&&document.activeElement.blur()); await p.keyboard.press('ArrowRight'); await H.dorme(300);
  ok('A tela da TV saiu e a aba Calendário muda de dia com → ', !/true$/.test(nav3)&&await p.evaluate(()=>window.__agend.cal)===ymd(new Date(new Date(mais2+'T12:00:00').getTime()+864e5)));
  await lst('agendado');

  /* carregou, cancelar e reabrir */
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(400);
  await p.click('.ag-cc[data-ids="p900001"] [data-act="ag-cgcarregou"]'); await H.dorme(600); doc=await banco(p,'p900001');
  await cal(amanha); const cpx=await painelDia(); const okc=await p.evaluate(d=>document.querySelector('.ag-cd[data-v="'+d+'"]').classList.contains('ok'),amanha); await lst('agendado');
  ok('Calendário: depois do "Carregou", o dia mostra tudo carregado (pendente zera)', /Pendente\s*Tudo carregado/.test(cpx)&&/Carregado\s*13,00 paletes · 10 baldes/.test(cpx)&&/1 carregado/.test(cpx)&&okc, cpx.replace(/\n/g,' | ').slice(0,300));
  ok('"Carregou" no cartão da carga fecha o pedido com a hora, sem abrir a janela', doc.status==='carregado'&&doc.aberto===false&&!!doc.fechadoEm&&doc.carregadoDia===ymd(new Date())&&/T/.test(doc.carregadoEm)&&(doc.hist||[]).some(e=>/Carregado às \d\d:\d\d/.test(e.t))&&!(await jan(p)));
  await p.click('[data-act="ag-aba"][data-v="carregado"]'); await H.dorme(300); t=await tela(p);
  ok('Aparece em Carregados (com os antigos)', /900001/.test(t)&&/800002/.test(t));
  await p.click('[data-act="ag-aba"][data-v="indic"]'); await H.dorme(1200); const ind=await tela(p);
  ok('Indicadores do mês: carregados, no dia combinado e motivos dos atrasos', /Carregados\s*1/.test(ind)&&/No dia combinado/.test(ind)&&/Motivos dos atrasos/.test(ind)&&/Transportadora não veio/.test(ind)&&/Cliente pediu para mudar/.test(ind)&&/Reagendamentos\s*3/.test(ind), ind.replace(/\n/g,' | ').slice(250,1100));
  await p.click('[data-act="ag-aba"][data-v="carregado"]'); await H.dorme(300);
  await p.click('.ag-ln[data-v="p900001"] [data-act="ag-reabrir"]'); await H.dorme(500); doc=await banco(p,'p900001');
  ok('Reabrir volta para Agendado com a mesma data', doc.status==='agendado'&&doc.aberto===true&&doc.data===amanha);
  await p.evaluate(()=>window.__agend&&0); await p.click('[data-act="ag-aba"][data-v="aguardando"]'); await H.dorme(300);
  await p.click('.ag-ln[data-v="p900002"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-cancelar"]'); await H.dorme(600); doc=await banco(p,'p900002');
  ok('Cancelar pede o motivo e guarda no histórico', doc.status==='cancelado'&&doc.aberto===false&&(doc.hist||[]).some(e=>/cliente desistiu/.test(e.t)));
  await p.click('.ag-ln[data-v="p900003"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-apagar"]'); await H.dorme(600);
  ok('Apagar tira o pedido do banco', !(await banco(p,'p900003')));
  const erros1=B.erros.filter(x=>!/404/.test(x)); ok('Sem erro na tela', !erros1.length, erros1.join(' | ')); await B.browser.close();

  /* celular */
  B=await abre('iasmyn','senha123',{width:390,height:800}); p=B.page; await p.evaluate(()=>{ __T.go('agendamentos'); }); await H.dorme(600);
  const lado=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  ok('No celular não tem rolagem para o lado', !lado); await B.browser.close();

  /* faturamento: módulo em "só ver" */
  B=await abre('fatura','fat123'); p=B.page; await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(500);
  const fv=await p.evaluate(()=>({tela:document.getElementById('view').innerText.slice(0,200),imp:!!document.getElementById('ag-file'),ck:document.querySelectorAll('.ag-ck').length,ord:document.querySelectorAll('[data-act="ag-ord"]').length}));
  ok('Faturamento com o módulo em "só ver": vê os agendamentos sem importar, marcar nem mudar', /Agendamentos de pedidos/.test(fv.tela)&&!fv.imp&&fv.ck===0&&fv.ord===0, JSON.stringify(fv)); await B.browser.close();
  /* celular: janela em abas */
  B=await abre('iasmyn','senha123',{width:390,height:800}); p=B.page; await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(500);
  await p.click('.ag-ln .ag-mid'); await p.waitForSelector('dialog.ag-jan .ag-tabs'); await p.click('dialog.ag-jan [data-act="ag-tab"][data-v="itens"]'); await H.dorme(200);
  const ab=await p.evaluate(()=>{ const j=document.querySelector('dialog.ag-jan'); const vis=s=>{ const e=j.querySelector(s); return !!e&&e.offsetParent!==null; }; return {tabs:vis('.ag-tabs'),itens:vis('.ag-sec[data-tab="itens"]'),dados:vis('.ag-sec[data-tab="dados"]')}; });
  ok('Celular: a janela do pedido em abas (Dados, Itens, Histórico)', ab.tabs&&ab.itens&&!ab.dados, JSON.stringify(ab)); await B.browser.close();

  /* quem não tem o módulo */
  B=await abre('operador','ope123'); p=B.page; const nav2=await p.evaluate(()=>document.getElementById('navlist').innerText); await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(300);
  ok('Quem não tem o módulo não vê', !/Agendamentos/.test(nav2)&&await p.evaluate(()=>__T.S().view)!=='agendamentos'); await B.browser.close();

  /* PDF de verdade (só local) */
  if(process.env.AGEND_PDF){ B=await abre('iasmyn','senha123'); p=B.page; await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(400);
    await p.setInputFiles('#ag-file',process.env.AGEND_PDF); await p.waitForSelector('dialog.ag-jan',{timeout:15000}); await H.dorme(400);
    const r=await p.evaluate(()=>{ const x=window.__agend.abertos[0]; return x&&{pedido:x.pedido,n:x.itens.length,total:x.total,soma:Math.round(x.itens.reduce((s,i)=>s+i.valor,0)*100)/100,un:x.itens.map(i=>i.un).join(',')}; });
    ok('PDF de verdade: lê pedido e itens, soma dos itens = total do PDF', r&&r.pedido&&r.n>0&&Math.abs(r.total-r.soma)<0.05&&!/,,|^,|,$/.test(r.un), JSON.stringify(r)); await B.browser.close(); }

  const f=res.filter(x=>!x.ok).length; console.log(f?f+' FALHOU':'tudo PASSOU'); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
