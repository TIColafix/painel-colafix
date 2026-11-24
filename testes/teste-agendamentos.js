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
  d.docs['agendamentos/p800001']={pedido:'800001',cliente:'Cliente Atrasado',data:ontem,status:'agendado',aberto:true,itens:[],total:10};
  d.docs['agendamentos/p800003']={pedido:'800003',carga:'sem carga',data:'',status:'aguardando',aberto:true,itens:[],total:1};
  d.docs['agendamentos/p800002']={pedido:'800002',cliente:'Cliente Antigo',data:ontem,status:'carregado',aberto:false,fechadoEm:new Date(h.getTime()-864e5).toISOString(),itens:[],total:5};
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
  const nav=await p.evaluate(()=>document.getElementById('navlist').innerText);
  await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(600);
  let t=await tela(p);
  ok('Agendamentos aparece no menu da administradora e abre a tela', /Agendamentos/.test(nav)&&/Agendamentos de pedidos/.test(t)&&/Importar PDF/.test(t), t.replace(/\n/g,' | ').slice(0,160));
  ok('Números do topo: 1 com a data já passada, 1 esperando data; "sem carga" digitado vira Sem carga', /1 com a data passada/.test(t)&&/1 esperando data/.test(t)&&await p.evaluate(()=>{ const x=window.__agend.abertos.find(y=>y._id==='p800003'); return x&&x.carga===''&&x.semCarga===true; })&&/Nada agendado neste dia|Total do dia/.test(t), t.replace(/\n/g,' | ').slice(0,260));

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
    if(sc){ const dp=await p.evaluate(()=>document.getElementById('ag-diap').innerText); ok('Ao escolher o dia, mostra o que já tem nele e como fica com este pedido', /já tem 1 pedido \(5,20 paletes\)/i.test(dp)&&/1\.000 SC · 10,41 paletes/.test(dp), dp); }
    await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600); }
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(400);
  const dia=await p.evaluate(d=>{ const x=[...document.querySelectorAll('.ag-dia')].find(e=>e.innerText.includes(d)); return x?x.innerText:''; },mais2.slice(8,10)+'/'+mais2.slice(5,7)+'/'+mais2.slice(0,4));
  ok('Dia com 2 pedidos na mesma carga: 1.000 SC · 10,41 paletes (no dia e na carga)', /10,41 paletes/.test(dia)&&/1\.000 SC/.test(dia)&&/Carga 7000 · Gabriel Teste · 2 pedidos/.test(dia), dia.replace(/\n/g,' | ').slice(0,300));
  const fx=await p.evaluate(()=>{ const x=document.querySelector('.ag-cal'); return x?x.innerText:''; });
  const lv2=await p.evaluate(()=>document.querySelector('.ag-ln[data-v="p900011"] .ag-sub').innerText);
  ok('Cada pedido mostra a empresa', /Empresa 9 \(Outra\)/.test(lv2), lv2);
  await p.selectOption('#ag-emp','Empresa 9 (Outra)'); await H.dorme(300);
  const fe=await p.evaluate(()=>({ids:[...document.querySelectorAll('#ag-corpo .ag-ln')].map(l=>l.dataset.v),chip:(document.querySelector('[data-act="ag-aba"][data-v="agendado"]')||{}).innerText,cal:(document.querySelector('.ag-cal')||{}).innerText||''}));
  ok('Filtro de empresa: só os pedidos da Empresa 9 na lista, nas abas e no calendário', fe.ids.join()==='p900011'&&/Agendados\s*1/.test(fe.chip)&&/5,20/.test(fe.cal)&&!/10,41/.test(fe.cal), JSON.stringify(fe).slice(0,300));
  await p.selectOption('#ag-emp',''); await H.dorme(300);
  ok('Calendário do lado mostra os paletes do dia', /10,41/.test(fx), fx.replace(/\n/g,' ').slice(0,200));
  /* sem carga por enquanto */
  await p.click('.ag-ln[data-v="p900010"] .ag-mid'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-semcarga"]');
  const dis=await p.evaluate(()=>document.getElementById('ag-carga').disabled); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(600);
  doc=await banco(p,'p900010'); const dia2=await p.evaluate(()=>document.getElementById('ag-corpo').innerText);
  ok('"Sem carga por enquanto" apaga a carga, trava o campo e o pedido vai para o bloco "Sem carga"', dis&&doc.semCarga===true&&doc.carga===''&&/Sem carga/.test(dia2)&&/Carga 7000 · Gabriel Teste/.test(dia2));
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
  const c1=await banco(p,'p900010'), c2=await banco(p,'p900011'); await p.click('.ag-cd[data-v="'+mais2+'"]'); await H.dorme(250); const tot3=await p.evaluate(()=>document.querySelector('.ag-tot2').innerText); const dia3=await p.evaluate(()=>document.getElementById('ag-corpo').innerText);
  ok('Salvar a carga grava carga e diário de bordo em todos os marcados', c1.carga==='1111'&&c2.carga==='1111'&&c1.diario==='3'&&c2.diario==='3'&&c1.data===mais2&&!c1.semCarga&&/Carga 1111/.test(dia3)&&/diário nº 3/i.test(dia3)&&!(await p.$('.ag-mk')), dia3.replace(/\n/g,' | ').slice(0,300));
  ok('Tocar no dia do calendário: itens do dia somados (ZZ0001: 1.000 sacos = 10,41 paletes) e o total do dia', /ZZ0001/.test(tot3)&&/10,41/.test(tot3)&&/1\.000 sacos/.test(tot3)&&/Total do dia\s*10,41 paletes/.test(tot3)&&/Empresa 1 \(Empresa\)\s*5,20 paletes/.test(tot3)&&/Empresa 9 \(Outra\)\s*5,20 paletes/.test(tot3)&&/Valor\s*R\$ 12\.500,00/.test(tot3), tot3.replace(/\n/g,' | '));
  await p.click('.ag-ln[data-v="p900010"] .ag-mid'); await p.waitForSelector('dialog.ag-jan #ag-diario'); await p.fill('#ag-diario','4'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(800);
  ok('Mudar o diário de bordo num pedido muda nos outros da mesma carga', (await banco(p,'p900011')).diario==='4');
  await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(300);
  ok('As linhas não mostram mais paletes por pedido', !(await p.$('.ag-ln .ag-pa')));
  ok('Pedido importado antes da empresa mostra "sem empresa"', /sem empresa/.test(await p.evaluate(()=>{ const l=document.querySelector('.ag-ln[data-v="p800001"] .ag-sub'); return l?l.innerText:''; })));
  await p.click('.ag-cd[data-v="'+mais2+'"]'); await H.dorme(250);
  const te=await p.evaluate(()=>{ const l=[...document.querySelectorAll('.ag-tl>li')].find(x=>x.innerText.includes('ZZ0001')); return l?l.innerText:''; });
  ok('Por empresa no item: Empresa 1 tem saldo, Empresa 9 precisa transferir 500', /Empresa 1 \(Empresa\)[^]*500 sacos · saldo 2\.000[^]*tem/.test(te)&&/Empresa 9 \(Outra\)[^]*500 sacos · saldo 0[^]*transferir 500/.test(te), te.replace(/\n/g,' | '));
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.click('[data-act="ag-pdfdia"]')]); const arq='/tmp/agend/dia.pdf'; await dl.saveAs(arq);
  let txtPdf=''; if(process.env.JSPDF_REAL){ const pj=require('./node_modules/pdfjs-dist/legacy/build/pdf.js'); const dpdf=await pj.getDocument({data:new Uint8Array(fs.readFileSync(arq))}).promise; for(let k=1;k<=dpdf.numPages;k++){ const tc=await (await dpdf.getPage(k)).getTextContent(); txtPdf+=tc.items.map(i=>i.str).join(' ')+'\n'; } }
  ok('PDF do dia: baixa o arquivo com o total, por empresa, a transferência e os pedidos', dl.suggestedFilename()==='carregamentos-'+mais2+'.pdf'&&(!process.env.JSPDF_REAL||(/Carregamentos/.test(txtPdf)&&/10,41/.test(txtPdf)&&/Transferir entre empresas/.test(txtPdf)&&/Empresa 9 \(Outra\)/.test(txtPdf)&&/500 SC/.test(txtPdf)&&/900010/.test(txtPdf)&&/Por empresa/.test(txtPdf))), dl.suggestedFilename()+' '+txtPdf.replace(/\s+/g,' ').slice(0,300));
  await p.click('.ag-cd[data-v="'+ymd(new Date(h.getTime()+864e5))+'"]'); await H.dorme(250);
  const tam=await p.evaluate(()=>document.querySelector('.ag-tot2').innerText);
  ok('Amanhã: paletes dos itens com palete e balde na unidade; total do dia "13,00 paletes + 10 baldes" e o valor', /12,50/.test(tam)&&/10 baldes/.test(tam)&&/Total do dia\s*13,00 paletes/.test(tam)&&/\+ 10 baldes/.test(tam)&&/Valor/.test(tam)&&/Empresa 1 \(Empresa\)\s*1\.200 sacos · saldo 1\.500/.test(tam), tam.replace(/\n/g,' | '));
  await p.fill('#ag-tq','primer'); await H.dorme(150);
  const vis2=await p.evaluate(()=>[...document.querySelectorAll('.ag-tl>li')].filter(l=>l.style.display!=='none').map(l=>l.innerText.split('\n')[0]));
  ok('Busca nos itens do dia (primer → só o ZZ0003), sem redesenhar', vis2.length===1&&vis2[0]==='ZZ0003', JSON.stringify(vis2));
  await p.fill('#ag-tq',''); await p.dispatchEvent('#ag-tq','input');

  /* carregou, cancelar e reabrir */
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(400);
  await p.click('.ag-ln[data-v="p900001"] [data-act="ag-carregou"]'); await H.dorme(600); doc=await banco(p,'p900001');
  ok('"Carregou" fecha o pedido sem abrir a janela', doc.status==='carregado'&&doc.aberto===false&&!!doc.fechadoEm&&!(await jan(p)));
  await p.click('[data-act="ag-aba"][data-v="carregado"]'); await H.dorme(300); t=await tela(p);
  ok('Aparece em Carregados (com os antigos)', /900001/.test(t)&&/800002/.test(t));
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

  /* quem não tem o módulo */
  B=await abre('operador','ope123'); p=B.page; const nav2=await p.evaluate(()=>document.getElementById('navlist').innerText); await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(300);
  ok('Quem não tem o módulo não vê', !/Agendamentos/.test(nav2)&&await p.evaluate(()=>__T.S().view)!=='agendamentos'); await B.browser.close();

  /* PDF de verdade (só local) */
  if(process.env.AGEND_PDF){ B=await abre('iasmyn','senha123'); p=B.page; await p.evaluate(()=>__T.go('agendamentos')); await H.dorme(400);
    await p.setInputFiles('#ag-file',process.env.AGEND_PDF); await p.waitForSelector('dialog.ag-jan',{timeout:15000}); await H.dorme(400);
    const r=await p.evaluate(()=>{ const x=window.__agend.abertos[0]; return x&&{pedido:x.pedido,n:x.itens.length,total:x.total,soma:Math.round(x.itens.reduce((s,i)=>s+i.valor,0)*100)/100,un:x.itens.map(i=>i.un).join(',')}; });
    ok('PDF de verdade: lê pedido e itens, soma dos itens = total do PDF', r&&r.pedido&&r.n>0&&Math.abs(r.total-r.soma)<0.05&&!/,,|^,|,$/.test(r.un), JSON.stringify(r)); await B.browser.close(); }

  const f=res.filter(x=>!x.ok).length; console.log(f?f+' FALHOU':'tudo PASSOU'); process.exit(f?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
