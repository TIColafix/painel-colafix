/* Teste do módulo Agendamentos (modulos/agendamentos.js). Precisa do leitor de PDF de verdade: npm i --no-save pdfjs-dist@3.11.174
   O PDF é gerado aqui no formato do "Mapa de Itens" do Focco, com dados inventados (o repositório é público).
   AGEND_PDF=<arquivo> testa também a leitura de um PDF de verdade, só localmente (não suba o arquivo). */
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
function mapa(ped,itens){ const L=[[480,770,'Focco3i RPDV0206_MIT'],[480,760,'Data: 24/11/2026 14:51:08'],[250,745,'Mapa de Itens'],[17,720,'Empresa.........: 1 - EMPRESA TESTE'],
    [17,710,'Pedido..........: '+(ped||'Todos')],[17,700,'Cliente.........: Todos'],[17,690,'Data de Entrega.: Todos'],
    [91,600,'Descrição'],[253,600,'Un.'],[296,600,'Quantidade'],[336,600,'Qtd. Atendida'],[378,600,'Qtd. Cancelada'],[430,600,'Qtd. Pendent'],[490,600,'Saldo Est.'],[551,600,'Valor Total'],[20,592,'Item']];
  let y=575, tot=0; itens.forEach(i=>{ L.push([19,y,i[0]],[90,y,i[1]],[252,y,i[2]],[307,y,i[3]],[360,y,'0,000'],[407,y,'0,000'],[447,y,i[3]],[498,y,i[4]],[556,y,i[5]]); tot+=+i[5].replace(/\./g,'').replace(',','.'); y-=12; });
  L.push([422,y-6,'Total'],[555,y-6,tot.toLocaleString('pt-BR',{minimumFractionDigits:2})]); return pdf(L); }
const ITENS=[['ZZ0001','ARGAMASSA TESTE AC3 20 KG','SC','1.200,000','300,000','15.000,000'],['ZZ0002','REJUNTE TESTE BRANCO 1 KG','CX','20,000','45,000','1.200,500'],['ZZ0003','PRIMER TESTE 3,6 LT','BD','10,000','0,000','385,360']];

(async()=>{ const {d}=seedManut(); const h=new Date(), ymd=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const ontem=ymd(new Date(h.getTime()-864e5)), amanha=ymd(new Date(h.getTime()+864e5));
  d.docs['agendamentos/p800001']={pedido:'800001',cliente:'Cliente Atrasado',data:ontem,status:'agendado',aberto:true,itens:[],total:10};
  d.docs['agendamentos/p800002']={pedido:'800002',cliente:'Cliente Antigo',data:ontem,status:'carregado',aberto:false,fechadoEm:new Date(h.getTime()-864e5).toISOString(),itens:[],total:5};
  fs.mkdirSync('/tmp/agend',{recursive:true});
  fs.writeFileSync('/tmp/agend/146001.pdf',mapa('900001',ITENS));
  fs.writeFileSync('/tmp/agend/146001b.pdf',mapa('900001',ITENS.map(i=>i[0]==='ZZ0001'?[...i.slice(0,4),'1.500,000',i[5]]:i)));
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
  ok('Agendamentos aparece no menu da administradora e abre a tela', /Agendamentos/.test(nav)&&/Agendamentos de pedidos/.test(t)&&/Importar PDF do Focco/.test(t), t.replace(/\n/g,' | ').slice(0,160));
  ok('Números do topo: 1 com a data já passada, 0 esperando data', /Data já passou\s*1/.test(t)&&/Esperando data\s*0/.test(t), t.replace(/\n/g,' | ').slice(0,260));

  /* importar um PDF */
  await p.setInputFiles('#ag-file','/tmp/agend/146001.pdf'); await p.waitForSelector('dialog.ag-jan',{timeout:15000}); await H.dorme(400);
  let j=await jan(p), doc=await banco(p,'p900001');
  ok('Lê o PDF do Focco: pedido, 3 itens, unidade, pendente e saldo', doc&&doc.pedido==='900001'&&doc.itens.length===3&&doc.itens[0].cod==='ZZ0001'&&doc.itens[0].un==='SC'&&doc.itens[0].pend===1200&&doc.itens[0].saldo===300&&doc.itens[1].saldo===45&&Math.abs(doc.total-16585.86)<0.01, JSON.stringify(doc&&doc.itens&&doc.itens[0]));
  ok('Já fica salvo como "Esperando data" e a janela abre com o pedido', doc&&doc.status==='aguardando'&&doc.aberto===true&&/Pedido 900001/.test(j));
  ok('A janela mostra o que falta no estoque (falta 900 do ZZ0001 e o ZZ0003 sem saldo)', /Falta 900/.test(j)&&/Falta 10/.test(j)&&/Tem/.test(j)&&/2 sem estoque suficiente/.test(j), j.replace(/\n/g,' | ').slice(0,400));

  /* preencher e agendar para amanhã pelo atalho */
  await p.fill('#ag-cli','Construtora Exemplo'); await p.fill('#ag-carga','5521'); await p.fill('#ag-transp','Transp. Teste · ABC1D23'); await p.fill('#ag-obs','pediu para cedo');
  await p.click('dialog.ag-jan [data-act="ag-dt"]:nth-child(2)'); await p.click('dialog.ag-jan [data-act="ag-salvar"]'); await H.dorme(700);
  doc=await banco(p,'p900001'); t=await tela(p);
  ok('Salvar com data: vira Agendado, com cliente, carga, transportadora e observação', doc.status==='agendado'&&doc.data===amanha&&doc.cliente==='Construtora Exemplo'&&doc.carga==='5521'&&/ABC1D23/.test(doc.transp)&&doc.obs==='pediu para cedo', JSON.stringify({s:doc.status,d:doc.data,a:amanha}));
  ok('Aba Agendados agrupa por dia (Amanhã e "Já passou")', /Amanhã · /.test(t)&&/Já passou · /.test(t)&&/Construtora Exemplo/.test(t)&&/Carga 5521/.test(t), t.replace(/\n/g,' | ').slice(0,300));
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

  /* avisos no Meu dia */
  await p.evaluate(()=>__T.go('meudia')); await H.dorme(500); t=await tela(p);
  ok('Meu dia avisa a data já passada e os pedidos esperando data', /com a data já passada/.test(t)&&/esperando data/.test(t)&&/800001/.test(t), t.replace(/\n/g,' | ').slice(0,300));

  /* carregou, cancelar e reabrir */
  await p.evaluate(()=>{ window.__agend.aba='agendado'; __T.go('agendamentos'); }); await H.dorme(400);
  await p.click('.ag-ln[data-v="p900001"] [data-act="ag-carregou"]'); await H.dorme(600); doc=await banco(p,'p900001');
  ok('"Carregou" fecha o pedido sem abrir a janela', doc.status==='carregado'&&doc.aberto===false&&!!doc.fechadoEm&&!(await jan(p)));
  await p.click('[data-act="ag-aba"][data-v="carregado"]'); await H.dorme(300); t=await tela(p);
  ok('Aparece em Carregados (com os antigos)', /900001/.test(t)&&/800002/.test(t));
  await p.click('.ag-ln[data-v="p900001"] [data-act="ag-reabrir"]'); await H.dorme(500); doc=await banco(p,'p900001');
  ok('Reabrir volta para Agendado com a mesma data', doc.status==='agendado'&&doc.aberto===true&&doc.data===amanha);
  await p.evaluate(()=>window.__agend&&0); await p.click('[data-act="ag-aba"][data-v="aguardando"]'); await H.dorme(300);
  await p.click('.ag-ln[data-v="p900002"]'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-cancelar"]'); await H.dorme(600); doc=await banco(p,'p900002');
  ok('Cancelar pede o motivo e guarda no histórico', doc.status==='cancelado'&&doc.aberto===false&&(doc.hist||[]).some(e=>/cliente desistiu/.test(e.t)));
  await p.click('.ag-ln[data-v="p900003"]'); await p.waitForSelector('dialog.ag-jan'); await p.click('dialog.ag-jan [data-act="ag-apagar"]'); await H.dorme(600);
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
