/* Agendamentos (24/11/2026, pedido da Iasmyn: "o faturamento me passa os pedidos e eu confiro se tem como agendar e pra quando").
   Tela `agendamentos` do módulo `agend`. Quem vê: a administradora (e quem receber o módulo em Equipe e cargos).
   Entrada: o PDF "Mapa de Itens" do Focco (RPDV0206_MIT, filtrado por um pedido). O painel lê o número do pedido e, por item,
   código, descrição, unidade, quantidade, atendida, cancelada, pendente, saldo em estoque e valor. Pode arrastar vários PDFs.
   A data quem decide é a Iasmyn: o painel só mostra o saldo que veio no PDF (tem / falta) para ajudar na conferência.
   Dados em agendamentos/{p<pedido>} {pedido, cliente, carga (carga do sistema), transp, obs, data (AAAA-MM-DD ou ''),
     status 'aguardando'|'agendado'|'carregado'|'cancelado', aberto, itens[{cod,desc,un,qtd,atend,canc,pend,saldo,valor}],
     total, relData (data/hora do relatório), arquivo, criadoEm/Por, alteradoEm/Por, fechadoEm, hist[{em,por,t}]}.
   Leituras: os abertos (aberto==true) + os 80 últimos fechados. Regra do banco: a geral (não precisa publicar nada).
   Reimportar o PDF de um pedido que já existe troca só os itens (cliente, carga, data e observação ficam).
   Avisos no Meu dia: carregar hoje, data que já passou e pedidos esperando data. Prefixo `ag`. */
(function(){ const P=window.Painel; if(!P) return;
  if(P.icone) P.icone('agendar','<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>');
  const COL='agendamentos', PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const A={abertos:[],fechados:[],lido:{a:false,f:false},aba:'aguardando',q:'',lendo:'',jan:null,ed:null};
  window.__agend=A;
  const esc=P.esc, U=()=>P.ui, hoje=()=>P.hojeStr();
  const eu=()=>(P.S.nomes||{})[P.S.uid]||P.nomeDe(P.S.uid)||'';
  const pode=()=>!P.soVer();
  const br=d=>d&&/^\d{4}-\d\d-\d\d/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'';
  const brC=d=>d?d.slice(8,10)+'/'+d.slice(5,7):'';
  const SEM=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  const semana=d=>SEM[new Date(d+'T12:00:00').getDay()];
  const addD=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return P.hojeStr(x); };
  const fN=(n,c)=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:c||0,maximumFractionDigits:c==null?3:c});
  const fR=n=>'R$ '+fN(n,2);
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const docId=ped=>'p'+String(ped).replace(/[^0-9A-Za-z_-]/g,'');
  const todos=()=>{ const m=new Map(); A.fechados.concat(A.abertos).forEach(x=>m.set(x._id,x)); return [...m.values()]; };
  const deId=id=>todos().find(x=>x._id===id);
  const STN={aguardando:'Esperando data',agendado:'Agendado',carregado:'Carregado',cancelado:'Cancelado'};
  const STT={aguardando:'warn',agendado:'info',carregado:'ok',cancelado:'crit'};

  /* ---------- número do Focco: "1.248,000" → 1248 ---------- */
  function num(t){ t=String(t==null?'':t).trim(); if(!t) return 0; const neg=/^-/.test(t)||/-$/.test(t); t=t.replace(/[^\d.,]/g,'');
    const x=Number(t.includes(',')?t.replace(/\./g,'').replace(',','.'):t); return Number.isFinite(x)?(neg?-x:x):0; }
  const ehNum=s=>/^-?[\d.]*\d,\d+-?$/.test(String(s).trim())||/^-?\d+-?$/.test(String(s).trim());

  /* ---------- leitura do PDF ---------- */
  async function pdfLib(){
    if(!window.pdfjsLib) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src=PDFJS+'pdf.min.js'; s.onload=ok; s.onerror=()=>er(new Error('Não consegui carregar o leitor de PDF. Confira a internet e tente de novo.')); document.head.appendChild(s); });
    if(!window.pdfjsLib) throw new Error('O leitor de PDF não carregou. Recarregue a página e tente de novo.');
    try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'; }catch(e){}
    return window.pdfjsLib; }
  /* linhas do PDF: cada linha = lista de pedaços {x, t}, de cima para baixo */
  async function pdfLinhas(buf){ const lib=await pdfLib(); const doc=await lib.getDocument({data:new Uint8Array(buf)}).promise, out=[];
    for(let p=1;p<=doc.numPages;p++){ const tc=await (await doc.getPage(p)).getTextContent(), g=new Map();
      tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return; const y=Math.round(it.transform[5]/2)*2; (g.get(y)||g.set(y,[]).get(y)).push({x:it.transform[4],t:it.str.trim()}); });
      [...g.keys()].sort((a,b)=>b-a).forEach(y=>out.push(g.get(y).sort((a,b)=>a.x-b.x))); }
    return out; }
  /* "Mapa de Itens" do Focco → {pedido, cliente, relData, itens, total}. Também é usado pelo teste (window.agLerMapa). */
  function lerMapa(linhas){ const R={pedido:'',cliente:'',relData:'',itens:[],total:0,mapa:false}; let xUn=null, xQt=null;
    for(const L of linhas){ const txt=L.map(p=>p.t).join(' '), m0=txt.match(/^(\S[^:]*?)\.{2,}\s*:\s*(.*)$/);
      if(/Mapa de Itens/i.test(txt)) R.mapa=true;
      if(m0){ const k=norm(m0[1]).trim(), v=m0[2].trim();
        if(k==='pedido'&&!/^tod/i.test(v)) R.pedido=v.split(/\s|\|/)[0];
        if(k==='cliente'&&!/^tod/i.test(v)) R.cliente=v.replace(/^\d+\s*-\s*/,'').trim();
        continue; }
      const md=txt.match(/Data:\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?/); if(md&&!R.relData){ R.relData=md[3]+'-'+md[2]+'-'+md[1]+(md[4]?' '+md[4]:''); continue; }
      const hu=L.find(p=>/^Un\.?$/i.test(p.t)), hq=L.find(p=>/^Quantidade$/i.test(p.t)); if(hu){ xUn=hu.x; xQt=hq?hq.x:null; continue; }
      if(/^Total$/i.test(L[0].t)||(L.length<=3&&L.some(p=>/^Total$/i.test(p.t)))){ const v=L.filter(p=>ehNum(p.t)).pop(); if(v) R.total=num(v.t); continue; }
      /* linha de item: código + descrição + (unidade) + 6 números no fim */
      let fim=L.length; while(fim>0&&ehNum(L[fim-1].t)) fim--; const ns=L.slice(fim);
      if(ns.length<6||fim<2||!/^[A-Z0-9][A-Z0-9.\-\/]{1,24}$/i.test(L[0].t)) continue;
      const v=ns.slice(-6).map(p=>num(p.t)); let meio=L.slice(1,fim), un='';
      if(xUn!=null){ const lim=xUn-8; un=meio.filter(p=>p.x>=lim&&(xQt==null||p.x<xQt-40)).map(p=>p.t).join(' '); meio=meio.filter(p=>p.x<lim); }
      if(!un&&meio.length>1&&/^[A-Z]{1,4}$/.test(meio[meio.length-1].t)) un=meio.pop().t;
      let desc=meio.map(p=>p.t).join(' ').trim();
      if(!un){ const mu=desc.match(/^(.*\S)\s+([A-Z]{2})$/); if(mu&&/^(SC|CX|BD|FD|UN|PC|GL|LT|KG|BL|PT|SA|TB|RL|MT|M2|M3)$/.test(mu[2])){ desc=mu[1]; un=mu[2]; } }
      R.itens.push({cod:L[0].t,desc,un,qtd:v[0],atend:v[1],canc:v[2],pend:v[3],saldo:v[4],valor:v[5]}); }
    if(!R.total) R.total=Math.round(R.itens.reduce((s,i)=>s+i.valor,0)*100)/100;
    return R; }
  window.agLerMapa=lerMapa;
  const falta=i=>Math.max(0,(+i.pend||0)-Math.max(0,+i.saldo||0));
  const semSaldo=x=>(x.itens||[]).filter(i=>falta(i)>0);

  /* ---------- banco ---------- */
  function carregar(){ if(!P.db()) return;
    P.inscrever('agend-abertos',()=>P.db().collection(COL).where('aberto','==',true).limit(600),s=>{ A.abertos=s.docs.map(d=>Object.assign({_id:d.id},d.data())); A.lido.a=true; P.rerender(); });
    P.inscrever('agend-fechados',()=>P.db().collection(COL).orderBy('fechadoEm','desc').limit(80),s=>{ A.fechados=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.aberto); A.lido.f=true; P.rerender(); }); }
  function local(id,o){ const x=deId(id); const n=Object.assign({},x||{_id:id},o); A.abertos=A.abertos.filter(y=>y._id!==id); A.fechados=A.fechados.filter(y=>y._id!==id); (n.aberto?A.abertos:A.fechados).unshift(n); return n; }
  async function grava(id,o,hist){ if(!pode()) throw new Error('Seu acesso é só para ver.'); const em=new Date().toISOString(), x=deId(id);
    o=Object.assign({},o,{alteradoEm:em,alteradoPor:P.S.uid,alteradoPorNome:eu()});
    if(!x){ o.criadoEm=em; o.criadoPor=P.S.uid; o.criadoPorNome=eu(); }
    if(hist) o.hist=((x&&x.hist)||[]).concat([{em,por:eu(),t:hist}]).slice(-40);
    await P.db().collection(COL).doc(id).set(o,{merge:true}); return local(id,o); }

  /* ---------- importar ---------- */
  async function importar(files){ files=[...(files||[])].filter(f=>/\.pdf$/i.test(f.name)||f.type==='application/pdf');
    if(!files.length){ P.toast('Escolha o PDF "Mapa de Itens" do Focco.'); return; }
    if(!pode()){ P.toast('Seu acesso é só para ver.'); return; }
    const ok=[], ruins=[]; let ult=null;
    for(const f of files){ A.lendo='Lendo '+f.name+'…'; P.rerender();
      try{ const R=lerMapa(await pdfLinhas(await f.arrayBuffer()));
        if(!R.itens.length){ ruins.push(f.name+': não achei os itens (é o "Mapa de Itens" do Focco?)'); continue; }
        if(!R.pedido){ if(files.length===1){ A.lendo=''; P.rerender(); abrirNovo(R,f.name); return; } ruins.push(f.name+': o PDF não tem o número do pedido (filtre um pedido só no Focco)'); continue; }
        ult=await salvarLido(R,f.name); ok.push(R.pedido); }
      catch(e){ console.warn('[agend] PDF',e); ruins.push(f.name+': '+((e&&e.message)||'não consegui ler')); } }
    A.lendo=''; P.rerender();
    if(ruins.length) P.toast(ruins.join(' · '));
    if(ok.length===1&&ult&&!ruins.length) editar(ult._id);
    else if(ok.length) P.toast(ok.length+' pedido'+(ok.length>1?'s':'')+' importado'+(ok.length>1?'s':'')+': '+ok.join(', ')+(ruins.length?' · '+ruins.length+' com problema':'')); }
  async function salvarLido(R,arquivo){ const id=docId(R.pedido), x=deId(id);
    const o={pedido:R.pedido,itens:R.itens,total:R.total,relData:R.relData,arquivo};
    if(!x){ Object.assign(o,{cliente:R.cliente||'',carga:'',transp:'',obs:'',data:'',status:'aguardando',aberto:true}); return grava(id,o,'Importado do PDF do Focco'); }
    if(R.cliente&&!x.cliente) o.cliente=R.cliente;
    return grava(id,o,'Itens atualizados pelo PDF do Focco'+(R.relData?' ('+br(R.relData.slice(0,10))+')':'')); }
  /* PDF sem número de pedido: abre a janela para digitar o número */
  function abrirNovo(R,arquivo){ A.ed={novo:true,R,arquivo}; janela({pedido:'',cliente:R.cliente||'',carga:'',transp:'',obs:'',data:'',status:'aguardando',itens:R.itens,total:R.total,relData:R.relData}); }

  /* ---------- janela do pedido ---------- */
  function itensTab(x){ const its=x.itens||[];
    if(!its.length) return '<div class="empty">Sem itens.</div>';
    return `<div class="pc-rola"><table class="pc-tab ag-it"><thead><tr><th>Item</th><th>Descrição</th><th>Un.</th><th class="dir">Pendente</th><th class="dir">Saldo est.</th><th>Estoque</th></tr></thead><tbody>${its.map(i=>{ const f=falta(i);
      return `<tr><td class="m-esc"><b>${esc(i.cod)}</b></td><td>${esc(i.desc)}</td><td>${esc(i.un||'')}</td><td class="dir">${fN(i.pend)}</td><td class="dir">${fN(i.saldo)}</td><td>${(+i.pend||0)<=0?U().selo('Atendido','ok'):f>0?U().selo('Falta '+fN(f),(+i.saldo||0)>0?'warn':'crit'):U().selo('Tem','ok')}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="ag-tot"><span>${its.length} ite${its.length>1?'ns':'m'}${semSaldo(x).length?` · <b class="ag-f">${semSaldo(x).length} sem estoque suficiente</b>`:' · <b class="ag-okt">todos com estoque</b>'}</span><b>${fR(x.total)}</b></div>
      <p class="ag-dica">Saldo em estoque do momento em que o PDF foi tirado${x.relData?' ('+esc(br(x.relData.slice(0,10))+(x.relData.length>10?' às '+x.relData.slice(11):''))+')':''}.</p>`; }
  function janela(x){ const u=U(); if(A.jan) A.jan.fechar(); const novo=!!(A.ed&&A.ed.novo), h=hoje();
    const atalhos=[[h,'Hoje'],[addD(h,1),'Amanhã'],[addD(h,2),semana(addD(h,2))],[addD(h,3),semana(addD(h,3))]];
    const corpo=`<div class="pc-form">
        ${novo?u.campo({r:'Número do pedido',id:'ag-ped',v:'',obr:1,col:4,im:'numeric',dica:'O PDF não trouxe o número.'}):''}
        ${u.campo({r:'Cliente',id:'ag-cli',v:x.cliente||'',col:novo?8:12,ph:'Nome do cliente'})}
        ${u.campo({r:'Carga do sistema',id:'ag-carga',v:x.carga||'',col:4,ph:'Nº da carga no Focco'})}
        ${u.campo({r:'Transportadora',id:'ag-transp',v:x.transp||'',col:8,ph:'Quem vai buscar / placa'})}
        ${u.campo({r:'Agendar para',id:'ag-data',tipo:'date',v:x.data||'',col:4,dica:'Deixe vazio se ainda não tem data.'})}
        <div class="pc-c8 ag-atl"><span>Atalhos</span><div>${atalhos.map(a=>`<button type="button" class="btn sec ag-atb" data-act="ag-dt" data-v="${a[0]}">${esc(a[1][0].toUpperCase()+a[1].slice(1))} ${brC(a[0])}</button>`).join('')}<button type="button" class="btn sec ag-atb" data-act="ag-dt" data-v="">Sem data</button></div></div>
        ${u.campo({r:'Observação',id:'ag-obs',tipo:'area',v:x.obs||'',col:12,ph:'Ex.: cliente pediu para antes, entrega parcial, falta produzir o AC3…'})}
      </div>
      <h3 class="ag-h3">Itens do pedido</h3>${itensTab(x)}
      ${!novo&&(x.hist||[]).length?`<details class="ag-hist"><summary>Histórico (${x.hist.length})</summary>${u.tempo(x.hist.slice().reverse().map(e=>({t:e.t,q:new Date(e.em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+(e.por?' · '+e.por:'')})))}</details>`:''}`;
    const fechado=x.status==='carregado'||x.status==='cancelado';
    const rod=`${!novo?(fechado?u.bt('Reabrir','ag-reabrir',{sec:1,dv:x._id}):u.bt('Cancelar pedido','ag-cancelar',{sec:1,dv:x._id}))+u.bt('Apagar','ag-apagar',{sec:1,dv:x._id,cls:'ag-apg'}):''}<span style="flex:1"></span>
      ${!novo&&x.status==='agendado'?u.bt('Carregou','ag-carregou',{sec:1,dv:x._id}):''}${u.bt('Salvar','ag-salvar',{dv:x._id||''})}`;
    A.jan=u.janela({tit:novo?'Pedido novo':'Pedido '+x.pedido,sub:novo?(A.ed.arquivo||''):[STN[x.status]||'',x.data?'para '+br(x.data)+' ('+semana(x.data)+')':''].filter(Boolean).join(' · '),corpo,rodape:rod,larga:true,foco:novo,aoFechar:()=>{ A.jan=null; A.ed=null; }});
    A.jan.el.classList.add('ag-jan'); }
  function editar(id){ const x=deId(id); if(!x) return; A.ed={id}; janela(x); }
  const val=s=>{ const e=A.jan&&A.jan.el.querySelector(s); return e?String(e.value||'').trim():''; };
  async function salvar(id){ const novo=!!(A.ed&&A.ed.novo);
    const o={cliente:val('#ag-cli'),carga:val('#ag-carga'),transp:val('#ag-transp'),obs:val('#ag-obs'),data:val('#ag-data')};
    let x; if(novo){ const ped=val('#ag-ped').replace(/\s+/g,''); if(!ped){ P.toast('Digite o número do pedido.'); return; } id=docId(ped); x=deId(id);
      if(!x){ Object.assign(o,{pedido:ped,itens:A.ed.R.itens,total:A.ed.R.total,relData:A.ed.R.relData,arquivo:A.ed.arquivo}); }
      else Object.assign(o,{itens:A.ed.R.itens,total:A.ed.R.total,relData:A.ed.R.relData,arquivo:A.ed.arquivo}); }
    else x=deId(id);
    const st=x&&(x.status==='carregado'||x.status==='cancelado')?x.status:(o.data?'agendado':'aguardando');
    o.status=st; o.aberto=st==='aguardando'||st==='agendado';
    const mud=[]; if(!x) mud.push('Criado à mão (PDF sem número)');
    else { if((x.data||'')!==o.data) mud.push(o.data?(x.data?'Data mudou de '+br(x.data)+' para '+br(o.data):'Agendado para '+br(o.data)):'Data tirada (voltou a esperar data)');
      [['cliente','Cliente'],['carga','Carga'],['transp','Transportadora'],['obs','Observação']].forEach(([k,r])=>{ if((x[k]||'')!==o[k]) mud.push(r+(o[k]?': '+o[k].slice(0,60):' apagado')); }); }
    try{ await grava(id,o,mud.join(' · ')||null); if(A.jan) A.jan.fechar(); P.toast(o.data&&st==='agendado'?'Agendado para '+br(o.data)+' ('+semana(o.data)+').':'Salvo.'); if(st==='agendado') A.aba='agendado'; else if(st==='aguardando') A.aba='aguardando'; P.rerender(); }
    catch(e){ P.erro(e); } }
  async function mudaStatus(id,st,txt){ const x=deId(id); if(!x) return;
    const o={status:st,aberto:st==='aguardando'||st==='agendado'}; if(!o.aberto) o.fechadoEm=new Date().toISOString(); if(st==='carregado') o.carregadoEm=hoje();
    try{ await grava(id,o,txt); if(A.jan) A.jan.fechar(); P.toast('Pedido '+x.pedido+': '+(STN[st]||st).toLowerCase()+'.'); P.rerender(); }catch(e){ P.erro(e); } }

  /* ---------- tela ---------- */
  function filtra(xs){ const ps=norm(A.q).split(/\s+/).filter(Boolean); if(!ps.length) return xs;
    return xs.filter(x=>{ const t=norm([x.pedido,x.cliente,x.carga,x.transp,x.obs,(x.itens||[]).map(i=>i.cod+' '+i.desc).join(' ')].join(' ')); return ps.every(p=>t.includes(p)); }); }
  function linha(x,o){ o=o||{}; const ss=semSaldo(x), h=hoje(), atras=x.status==='agendado'&&x.data&&x.data<h;
    return `<div class="ag-ln${atras?' atr':''}" data-act="ag-abrir" data-v="${esc(x._id)}" data-b="${esc(norm([x.pedido,x.cliente,x.carga,x.transp,x.obs].join(' ')))}">
      <div class="ag-pd"><small>Pedido</small><b>${esc(x.pedido)}</b></div>
      <div class="ag-mid"><div class="ag-cl">${x.cliente?esc(x.cliente):'<i>sem cliente</i>'}</div>
        <div class="ag-sub">${[x.carga?'Carga '+esc(x.carga):'',x.transp?esc(x.transp):'',(x.itens||[]).length+' ite'+((x.itens||[]).length>1?'ns':'m'),fR(x.total)].filter(Boolean).join(' · ')}</div>
        ${x.obs?`<div class="ag-obs">${esc(x.obs)}</div>`:''}</div>
      <div class="ag-dir">${o.data&&x.data?`<span class="ag-dt">${esc(brC(x.data))}</span>`:''}${ss.length?U().selo(ss.length+' sem estoque',ss.length===(x.itens||[]).length?'crit':'warn'):U().selo('Tem estoque','ok')}${o.st?U().selo(STN[x.status],STT[x.status]):''}
        ${o.bt?`<button type="button" class="btn${o.bt[2]?' sec':''} ag-bt" data-act="${o.bt[1]}" data-v="${esc(x._id)}">${esc(o.bt[0])}</button>`:''}</div></div>`; }
  function grupoDia(d,xs){ const h=hoje(); const rot=d<h?'Já passou · '+br(d):d===h?'Hoje · '+br(d):d===addD(h,1)?'Amanhã · '+br(d):semana(d)[0].toUpperCase()+semana(d).slice(1)+' · '+br(d);
    return `<div class="ag-dia${d<h?' atr':d===h?' hj':''}"><div class="ag-dh"><b>${esc(rot)}</b><span>${xs.length} pedido${xs.length>1?'s':''} · ${fR(xs.reduce((s,x)=>s+(+x.total||0),0))}</span></div>${xs.map(x=>linha(x,{bt:['Carregou','ag-carregou']})).join('')}</div>`; }
  function vTela(){ const u=U(); if(!u) return '<section class="card"><div class="empty">Carregando…</div></section>';
    const h=hoje(), ag=A.abertos.filter(x=>x.status!=='agendado'), agd=A.abertos.filter(x=>x.status==='agendado');
    const atr=agd.filter(x=>x.data<h), hj=agd.filter(x=>x.data===h);
    const car=A.fechados.filter(x=>x.status==='carregado'), can=A.fechados.filter(x=>x.status==='cancelado');
    const head=`<div class="head"><div><div class="eyebrow">AGENDAMENTOS</div><h1>Agendamentos de pedidos</h1><div class="sub">Importe o PDF "Mapa de Itens" do Focco, confira o estoque e escolha a data.</div></div>
      <div class="ag-acts">${pode()?`<label class="btn ag-imp">${u.ic('agendar',16)}Importar PDF do Focco<input type="file" id="ag-file" accept=".pdf,application/pdf" multiple hidden></label>`:''}</div></div>`;
    const nums=u.nums([{r:'Esperando data',v:ag.length,tom:ag.length?'warn':'',act:'ag-aba',dv:'aguardando'},{r:'Carregar hoje',v:hj.length,tom:hj.length?'info':'',act:'ag-aba',dv:'agendado'},
      {r:'Data já passou',v:atr.length,tom:atr.length?'crit':'',act:'ag-aba',dv:'agendado',s:atr.length?'sem marcar "Carregou"':''},{r:'Agendados',v:agd.length,act:'ag-aba',dv:'agendado'}]);
    const drop=pode()?`<div class="ag-drop" id="ag-drop">${A.lendo?`<b>${esc(A.lendo)}</b>`:'Arraste aqui o PDF do Focco (pode ser mais de um) ou use o botão <b>Importar PDF do Focco</b>.'}</div>`:'';
    const barra=`<div class="ag-bar">${u.chips([['aguardando','Esperando data',ag.length,A.aba==='aguardando'],['agendado','Agendados',agd.length,A.aba==='agendado'],['carregado','Carregados',car.length,A.aba==='carregado'],['cancelado','Cancelados',can.length,A.aba==='cancelado']],'ag-aba')}
      <input type="search" id="ag-q" class="txt ag-q" aria-label="Buscar agendamento" autocomplete="off" placeholder="Buscar pedido, cliente, carga, item…" value="${esc(A.q)}"></div>`;
    let corpo='';
    if(!A.lido.a) corpo='<div class="empty">Carregando…</div>';
    else if(A.aba==='aguardando'){ const xs=filtra(ag).sort((a,b)=>String(a.criadoEm||'').localeCompare(String(b.criadoEm||'')));
      corpo=xs.length?xs.map(x=>linha(x,{bt:['Agendar','ag-abrir']})).join(''):u.vazio({tom:A.q?'':'ok',tit:A.q?'Nada com essa busca':'Nenhum pedido esperando data',txt:A.q?'':'Quando o faturamento mandar um pedido, importe o PDF do Focco.'}); }
    else if(A.aba==='agendado'){ const xs=filtra(agd), g={}; xs.forEach(x=>(g[x.data]=g[x.data]||[]).push(x));
      const ds=Object.keys(g).sort(); corpo=ds.length?ds.map(d=>grupoDia(d,g[d])).join(''):u.vazio({tit:A.q?'Nada com essa busca':'Nenhum pedido agendado'}); }
    else { const xs=filtra(A.aba==='carregado'?car:can);
      corpo=xs.length?xs.map(x=>linha(x,{data:true,st:true,bt:['Reabrir','ag-reabrir',1]})).join(''):u.vazio({tit:A.q?'Nada com essa busca':'Nenhum pedido '+(A.aba==='carregado'?'carregado':'cancelado')+' ainda'});
      if(xs.length) corpo+=`<p class="ag-dica">Mostrando os últimos ${A.fechados.length>=80?'80 ':''}pedidos fechados.</p>`; }
    return head+nums+drop+u.cartao({cls:'ag-lista',corpo:barra+`<div id="ag-corpo">${corpo}</div>`}); }

  /* ---------- avisos no Meu dia ---------- */
  if(P.registrarAviso) P.registrarAviso(()=>{ if(!A.lido.a) return []; const h=hoje(), out=[];
    const atr=A.abertos.filter(x=>x.status==='agendado'&&x.data&&x.data<h), hj=A.abertos.filter(x=>x.status==='agendado'&&x.data===h), ag=A.abertos.filter(x=>x.status==='aguardando');
    if(atr.length) out.push({nivel:'crit',rotulo:'Agendamento',titulo:atr.length+' pedido'+(atr.length>1?'s':'')+' com a data já passada',texto:'Sem marcar "Carregou": '+atr.slice(0,4).map(x=>x.pedido+(x.cliente?' ('+x.cliente+')':'')).join(', ')+(atr.length>4?'…':''),go:'agendamentos'});
    if(hj.length) out.push({nivel:'warn',rotulo:'Agendamento',titulo:hj.length+' pedido'+(hj.length>1?'s':'')+' para carregar hoje',texto:hj.slice(0,4).map(x=>x.pedido+(x.cliente?' ('+x.cliente+')':'')).join(', ')+(hj.length>4?'…':''),go:'agendamentos'});
    if(ag.length) out.push({nivel:'warn',rotulo:'Agendamento',titulo:ag.length+' pedido'+(ag.length>1?'s':'')+' esperando data',texto:'Confira o estoque e escolha quando agendar.',go:'agendamentos'});
    return out; });

  /* ---------- ações ---------- */
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-act^="ag-"]'); if(!b) return; const act=b.dataset.act, v=b.dataset.v||'';
    if(act==='ag-aba'){ A.aba=v; P.rerender(); return; }
    if(act==='ag-abrir'){ editar(v); return; } /* closest() pega o botão antes da linha: Carregou/Reabrir não abrem a janela */
    if(act==='ag-dt'){ const i=A.jan&&A.jan.el.querySelector('#ag-data'); if(i){ i.value=v; } return; }
    if(act==='ag-salvar'){ salvar(v); return; }
    if(act==='ag-carregou'){ const x=deId(v); if(x&&confirm('Marcar o pedido '+x.pedido+' como carregado?')) mudaStatus(v,'carregado','Carregado'); return; }
    if(act==='ag-cancelar'){ const x=deId(v); if(!x) return; const m=prompt('Cancelar o pedido '+x.pedido+'? Escreva o motivo (opcional):',''); if(m===null) return; mudaStatus(v,'cancelado','Cancelado'+(m.trim()?': '+m.trim():'')); return; }
    if(act==='ag-reabrir'){ const x=deId(v); if(!x) return; mudaStatus(v,x.data?'agendado':'aguardando','Reaberto'); return; }
    if(act==='ag-apagar'){ const x=deId(v); if(!x||!confirm('Apagar o pedido '+x.pedido+' dos agendamentos? Não dá para desfazer.')) return;
      P.db().collection(COL).doc(v).delete().then(()=>{ A.abertos=A.abertos.filter(y=>y._id!==v); A.fechados=A.fechados.filter(y=>y._id!==v); if(A.jan) A.jan.fechar(); P.toast('Pedido apagado.'); P.rerender(); }).catch(er=>P.erro(er)); return; }
  });
  document.addEventListener('change',e=>{ if(e.target&&e.target.id==='ag-file'){ const fs=e.target.files; importar(fs); e.target.value=''; } });
  /* busca filtra sem redesenhar (o campo não perde o foco) e guarda o texto para o próximo desenho */
  document.addEventListener('input',e=>{ if(!e.target||e.target.id!=='ag-q') return; A.q=e.target.value;
    const ps=norm(A.q).split(/\s+/).filter(Boolean); document.querySelectorAll('#ag-corpo .ag-ln').forEach(l=>{ const t=l.dataset.b||''; l.style.display=ps.every(p=>t.includes(p))?'':'none'; });
    document.querySelectorAll('#ag-corpo .ag-dia').forEach(d=>{ d.style.display=[...d.querySelectorAll('.ag-ln')].some(l=>l.style.display!=='none')?'':'none'; }); });
  /* arrastar o PDF para a tela */
  const naTela=()=>P.S.view==='agendamentos';
  document.addEventListener('dragover',e=>{ if(!naTela()||!pode()) return; e.preventDefault(); const d=document.getElementById('ag-drop'); if(d) d.classList.add('on'); });
  document.addEventListener('dragleave',e=>{ if(!naTela()) return; if(!e.relatedTarget){ const d=document.getElementById('ag-drop'); if(d) d.classList.remove('on'); } });
  document.addEventListener('drop',e=>{ if(!naTela()||!pode()) return; e.preventDefault(); const d=document.getElementById('ag-drop'); if(d) d.classList.remove('on'); importar(e.dataTransfer&&e.dataTransfer.files); });

  document.head.insertAdjacentHTML('beforeend',`<style>
  .ag-acts{display:flex;gap:8px;flex-wrap:wrap}.ag-imp{cursor:pointer;display:inline-flex;align-items:center;gap:6px}
  .ag-drop{margin:14px 0;padding:16px;border:2px dashed var(--line);border-radius:12px;text-align:center;color:var(--muted);font-size:14px}
  .ag-drop.on{border-color:var(--teal);background:color-mix(in srgb,var(--teal) 8%,transparent);color:var(--teal-strong)}
  .ag-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.ag-q{flex:1;min-width:200px;max-width:380px;margin-left:auto;height:38px}
  .ag-ln{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 6px;border-top:1px solid var(--line);cursor:pointer}
  .ag-ln:first-child{border-top:0}.ag-ln:hover{background:color-mix(in srgb,var(--teal) 5%,transparent)}
  .ag-ln.atr{box-shadow:inset 4px 0 0 var(--crit)}
  .ag-pd small{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.ag-pd b{font-size:18px}
  .ag-cl{font-weight:600}.ag-cl i{color:var(--muted);font-weight:400}.ag-sub{color:var(--muted);font-size:13px;margin-top:2px}
  .ag-obs{font-size:13px;margin-top:4px;padding:4px 8px;border-radius:6px;background:color-mix(in srgb,var(--warn) 10%,transparent);display:inline-block}
  .ag-dir{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.ag-dt{font-weight:700}.ag-bt{white-space:nowrap}
  .ag-dia{margin-top:14px}.ag-dia:first-child{margin-top:0}
  .ag-dh{display:flex;justify-content:space-between;gap:10px;align-items:baseline;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--muted) 10%,transparent)}
  .ag-dh span{color:var(--muted);font-size:13px}.ag-dia.hj .ag-dh{background:color-mix(in srgb,var(--teal) 14%,transparent)}.ag-dia.atr .ag-dh{background:color-mix(in srgb,var(--crit) 14%,transparent);color:var(--crit)}
  .ag-jan .pc-jb>*{flex-shrink:0}.ag-jan .ag-h3{margin:18px 0 8px;font-size:15px}.ag-it td,.ag-it th{font-size:13px}
  .ag-tot{display:flex;justify-content:space-between;gap:10px;padding:8px 4px;border-top:1px solid var(--line);margin-top:4px}.ag-f{color:var(--crit)}.ag-okt{color:var(--ok)}
  .ag-dica{color:var(--muted);font-size:12px;margin:6px 4px 0}
  .ag-atl{display:flex;flex-direction:column;gap:6px}.ag-atl>span{font-size:13px;font-weight:600}.ag-atl>div{display:flex;gap:6px;flex-wrap:wrap}.ag-atb{padding:6px 10px;font-size:13px;min-height:0}
  .ag-hist{margin-top:14px}.ag-hist summary{cursor:pointer;color:var(--muted);font-size:13px}.ag-apg{color:var(--crit)}
  @media (max-width:640px){.ag-ln{grid-template-columns:1fr;gap:6px}.ag-dir{justify-content:flex-start}.ag-q{max-width:none;margin-left:0}}
  </style>`);

  P.registrarModulo({ id:'agend', nome:'Agendamentos', ic:'agendar',
    telas:{ agendamentos:{ nome:'Agendamentos', mob:'Agendar', render:vTela } },
    iniciar:carregar });
})();
