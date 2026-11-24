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
   Avisos no Meu dia: carregar hoje, data que já passou e pedidos esperando data. Prefixo `ag`.
   24/11 (2ª): "Sem carga por enquanto" (semCarga), transportadoras guardadas (config/agendamentos.transps, lista ao digitar),
   quantidade total e PALETES por pedido, por carga e por dia (ppDe: Ajustes › Itens ou o digitado; config/agendamentos.pp).
   24/11 (3ª): layout novo (semana em paletes, alertas, lista em colunas, janela com resumo à direita); paletes somados ITEM A ITEM
   (soma(): quantidade de cada código no grupo ÷ palete do item); "Montar carga": marcar pedidos (A.sel) e dar carga, ORDEM NO
   DIÁRIO DE BORDO (campo `diario`, o nº do caminhão no diário da portaria), transportadora e data de uma vez (janCarga/salvarCarga).
   24/11 (4ª): visual leve (sem caixas, botões discretos, aviso só quando falta estoque, por item recolhido); PDF com vários pedidos
   no filtro do Focco ("146474,146475,…") = um agendamento com `pedidos[]` (id p<n1>_<n2>…), mostrado como "146474 +6".
   24/11 (7ª): bloco do lado com CALENDÁRIO do mês (A.cal/A.mes) e, embaixo, os itens do dia escolhido: em paletes os que têm
   palete, na unidade (fardos, caixas, baldes) os que não têm; TOTAL DO DIA (paletes + unidades), VALOR (do pendente) e, com mais
   de uma, por EMPRESA (empresa do cabeçalho do PDF, `empresa:{cod,nome}`, mostrada em cada pedido). */
(function(){ const P=window.Painel; if(!P) return;
  if(P.icone) P.icone('agendar','<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>');
  if(P.icone) P.icone('caminhao2','<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>');
  const COL='agendamentos', PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const A={abertos:[],fechados:[],cfg:{transps:[],pp:{}},lido:{a:false,f:false},aba:'aguardando',dia:'',cal:'',mes:'',sel:new Set(),pi:{},q:'',lendo:'',jan:null,ed:null};
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
  /* vários pedidos no mesmo PDF (24/11: o Focco filtrado por "146474,146475,…" soma os itens de todos): um agendamento com a lista */
  const pedList=x=>(x.pedidos&&x.pedidos.length?x.pedidos:String(x.pedido||'').split(/[\s,;|]+/)).filter(Boolean);
  const pedCurto=x=>{ const l=pedList(x); return l.length>1?l[0]+' +'+(l.length-1):(l[0]||x.pedido||''); };
  const pedTodos=x=>pedList(x).join(', ');
  /* PDF com vários pedidos = uma carga (24/11: "eu já coloquei porque são uma carga, posso só flegar que é uma carga?").
     Começa marcado; desmarcar grava ehCarga:false. Sem número de carga, o dia mostra "Carga com N pedidos". */
  const ehCarga=x=>pedList(x).length>1&&x.ehCarga!==false;
  /* "sem carga" digitado no campo da carga (versão antiga) = Sem carga por enquanto */
  const normaliza=x=>{ if(/^\s*sem\s*carga\s*$/i.test(x.carga||'')){ x.carga=''; x.semCarga=true; } return x; };
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
        if(k==='pedido'&&!/^tod/i.test(v)){ const ps=v.split(/[\s,;|]+/).filter(x=>/^[0-9A-Za-z-]+$/.test(x)); R.pedidos=[...new Set(ps)]; R.pedido=R.pedidos.join(', '); }
        if(k==='empresa'){ const me=v.match(/^(\d+)\s*-\s*(.+)$/); if(me) R.empresa={cod:me[1],nome:me[2].trim()}; }
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
    P.inscrever('agend-abertos',()=>P.db().collection(COL).where('aberto','==',true).limit(600),s=>{ A.abertos=s.docs.map(d=>normaliza(Object.assign({_id:d.id},d.data()))); A.lido.a=true; P.rerender(); });
    P.db().doc('config/agendamentos').get().then(g=>{ if(g.exists) A.cfg=Object.assign({transps:[],pp:{}},g.data()); P.rerender(); }).catch(()=>{});
    /* o tamanho do palete vem de Ajustes › Itens: quem não tem a Produção não recebe os itens; aí lê uma vez */
    setTimeout(()=>{ if((P.S.itens||[]).length) return; P.db().collection('itens').limit(1000).get().then(q=>{ if((P.S.itens||[]).length) return; P.S.itens=q.docs.map(d=>Object.assign({_id:d.id},d.data())); P.rerender(); }).catch(()=>{}); },5000);
    P.inscrever('agend-fechados',()=>P.db().collection(COL).orderBy('fechadoEm','desc').limit(80),s=>{ A.fechados=s.docs.map(d=>normaliza(Object.assign({_id:d.id},d.data()))).filter(x=>!x.aberto); A.lido.f=true; P.rerender(); }); }
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
  async function salvarLido(R,arquivo){ const ps=R.pedidos&&R.pedidos.length?R.pedidos:[R.pedido], id=docId(ps.join('_')), x=deId(id);
    const o={...(R.empresa?{empresa:R.empresa}:{}),pedido:R.pedido,pedidos:ps,...(ps.length>1&&!x?{ehCarga:true}:{}),itens:R.itens,total:R.total,relData:R.relData,arquivo};
    if(!x){ Object.assign(o,{cliente:R.cliente||'',carga:'',transp:'',obs:'',data:'',status:'aguardando',aberto:true}); return grava(id,o,'Importado do PDF do Focco'); }
    if(R.cliente&&!x.cliente) o.cliente=R.cliente;
    return grava(id,o,'Itens atualizados pelo PDF do Focco'+(R.relData?' ('+br(R.relData.slice(0,10))+')':'')); }
  /* PDF sem número de pedido: abre a janela para digitar o número */
  function abrirNovo(R,arquivo){ A.ed={novo:true,R,arquivo}; janela({pedido:'',cliente:R.cliente||'',carga:'',transp:'',obs:'',data:'',status:'aguardando',itens:R.itens,total:R.total,relData:R.relData}); }

  /* ---------- paletes (24/11, pedido: "o mais importante é ter a quantidade total e em paletes agendados";
     ex.: 500 + 500 na mesma carga para amanhã = 1.000 SC = 10,41 paletes de 96) ----------
     Tamanho do palete, nesta ordem: o digitado na janela (item.pp) · Ajustes › Itens (itens/{cod}.palete, config/geral.paleteProd,
     o palete da linha do item em config/geral.paletes, a mesma conta do paleteDe da produção) · o que já foi digitado antes para o
     item em outro pedido (config/agendamentos.pp). Paletes com 2 casas, sem arredondar para cima (1.000 ÷ 96 = 10,41). */
  function ppCad(cod){ const S=P.S, c=String(cod||'').toUpperCase(), it=(S.itens||[]).find(i=>String(i.codigo||i._id).toUpperCase()===c);
    if(it&&+it.palete>0) return +it.palete; const pp=(S.cfg||{}).paleteProd||{}; if(+pp[c]>0) return +pp[c];
    const pl=(S.cfg||{}).paletes||{}, l=((it&&it.linhas)||[]).find(x=>+pl[x]>0); return l?+pl[l]:0; }
  const ppDe=i=>+i.pp>0?+i.pp:(ppCad(i.cod)||+(A.cfg.pp||{})[String(i.cod).toUpperCase()]||0);
  const qtdDe=i=>Math.max(0,+i.pend||0);
  const fP=x=>fN(Math.floor(x*100+1e-6)/100,2);
  /* soma de vários pedidos: {un:{SC:1000}, pal, semPal:[códigos], n} */
  /* soma de vários pedidos, ITEM A ITEM (pedido de 24/11: "a somatória dos paletes por dia tem que ser por item"):
     junta a quantidade de cada código em todos os pedidos e divide pelo palete daquele item; o total = soma dos itens.
     {un:{SC:1000}, it:[{cod,desc,un,q,pp,pal}], pal, semPal:[códigos], n, val} */
  function soma(xs){ const r={un:{},it:[],pal:0,semPal:[],n:xs.length,val:0}, m=new Map();
    xs.forEach(x=>{ r.val+=+x.total||0; (x.itens||[]).forEach(i=>{ const q=qtdDe(i); if(!(q>0)) return; const c=String(i.cod).toUpperCase();
      const u=i.un||'un'; r.un[u]=(r.un[u]||0)+q; const o=m.get(c)||{cod:i.cod,desc:i.desc,un:u,q:0,pp:0}; o.q+=q; o.v=(o.v||0)+(+i.qtd>0?(+i.valor||0)*q/(+i.qtd):(+i.valor||0)); if(!o.pp) o.pp=ppDe(i); m.set(c,o); }); });
    r.it=[...m.values()].map(o=>Object.assign(o,{pal:o.pp>0?o.q/o.pp:null})).sort((a,b)=>(b.pal||0)-(a.pal||0)||b.q-a.q);
    r.vp=0; r.it.forEach(o=>{ r.vp+=o.v||0; if(o.pal!=null) r.pal+=o.pal; else r.semPal.push(o.cod); }); return r; }
  const unTxt=r=>Object.keys(r.un).sort((a,b)=>r.un[b]-r.un[a]).map(u=>fN(r.un[u])+' '+u).join(' · ')||'0';
  const palTxt=r=>!(r.pal>0)&&r.semPal.length?'palete ?':fP(r.pal)+' palete'+(Math.floor(r.pal*100+1e-6)===100?'':'s');
  const semPalTxt=r=>r.semPal.length?r.semPal.length+' ite'+(r.semPal.length>1?'ns':'m')+' sem palete cadastrado':'';
  const cargaTxt=x=>x.carga?'Carga '+x.carga:x.semCarga?'Sem carga':'';
  /* empresa do pedido (cabeçalho do PDF do Focco: "Empresa: 1 - COLFIX INDUSTRIA E COMERCIO LTDA") */
  const empCurto=e=>{ const w=String(e&&e.nome||'').trim().split(/\s+/)[0]||''; return w?w[0].toUpperCase()+w.slice(1).toLowerCase():''; };
  const empTxt=x=>x.empresa&&x.empresa.cod?'Empresa '+x.empresa.cod+(empCurto(x.empresa)?' ('+empCurto(x.empresa)+')':''):'';
  const diarioTxt=x=>x.diario?'Diário nº '+x.diario:'';
  /* tabela "paletes por item" de um grupo (dia, carga ou pedidos marcados) */
  function porItem(r,o){ o=o||{}; if(!r.it.length) return '';
    return `<div class="pc-rola"><table class="ag-pit"><thead><tr><th>Item</th><th class="dir">Quantidade</th><th class="dir">Por palete</th><th class="dir">Paletes</th></tr></thead><tbody>${r.it.map(i=>`<tr><td><b>${esc(i.cod)}</b> <span>${esc(i.desc||'')}</span></td><td class="dir">${fN(i.q)} ${esc(i.un)}</td><td class="dir">${i.pp>0?fN(i.pp):'<em>sem palete</em>'}</td><td class="dir"><b>${i.pal!=null?fP(i.pal):'—'}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="dir">${esc(unTxt(r))}</td><td></td><td class="dir"><b>${!(r.pal>0)&&r.semPal.length?'—':esc(fP(r.pal))}</b></td></tr></tfoot></table></div>`; }

  /* ---------- janela do pedido (layout 24/11, 3ª: formulário à esquerda, resumo com paletes à direita, itens embaixo) ---------- */
  function estoqueSelo(i){ const f=falta(i); return (+i.pend||0)<=0?U().selo('Atendido','ok'):f>0?U().selo('Falta '+fN(f),(+i.saldo||0)>0?'warn':'crit'):U().selo('Tem','ok'); }
  function itensTab(x){ const its=x.itens||[];
    if(!its.length) return '<div class="empty">Sem itens.</div>';
    return `<div class="pc-rola ag-itw"><table class="pc-tab ag-it"><thead><tr><th>Produto</th><th class="dir">Pendente</th><th class="dir">Saldo est.</th><th>Estoque</th><th class="dir">Por palete</th><th class="dir">Paletes</th></tr></thead><tbody>${its.map((i,k)=>{ const pp=ppDe(i), cad=ppCad(i.cod);
      return `<tr><td><div class="ag-prod"><b>${esc(i.cod)}</b><span>${esc(i.desc)}</span></div></td><td class="dir ag-nq">${fN(i.pend)} <small>${esc(i.un||'')}</small></td><td class="dir ag-nq">${fN(i.saldo)}</td><td>${estoqueSelo(i)}</td>
        <td class="dir"><input class="txt ag-pp${pp>0?'':' vz'}" type="number" min="0" step="1" inputmode="numeric" data-k="${k}" value="${pp>0?pp:''}" placeholder="—" aria-label="${esc(i.un||'')} por palete de ${esc(i.cod)}" title="${cad?'Ajustes › Itens: '+cad+' por palete':'Sem palete em Ajustes › Itens: digite quantos '+esc(i.un||'')+' vão num palete'}"${pode()?'':' disabled'}></td>
        <td class="dir ag-pl" data-k="${k}">${pp>0&&qtdDe(i)>0?fP(qtdDe(i)/pp):'—'}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="ag-dica">Saldo em estoque do momento em que o PDF foi tirado${x.relData?' ('+esc(br(x.relData.slice(0,10))+(x.relData.length>10?' às '+x.relData.slice(11):''))+')':''}. "Por palete" vem de Ajustes › Itens; o que você digitar fica guardado para os próximos pedidos.</p>`; }
  /* resumo à direita: paletes, quantidade, estoque */
  function totpHtml(x){ const r=soma([x]), ss=semSaldo(x), n=(x.itens||[]).length;
    return `<div class="ag-rl">Total a carregar</div><div class="ag-pbig">${esc(palTxt(r))}</div><div class="ag-run">${esc(unTxt(r))}</div>
      ${fora(r).length?`<div class="ag-rw">Sem palete (ficam na unidade): ${esc(foraTxt(r))}</div>`:''}
      <div class="ag-rs"><span>${n} ite${n>1?'ns':'m'} · ${esc(fR(x.total))}</span>${ss.length?`<b class="ag-f">${ss.length} sem estoque suficiente</b>`:'<b class="ag-okt">todos com estoque</b>'}</div>`; }
  function itensJan(x){ const its=(x.itens||[]).map(i=>Object.assign({},i)); if(!A.jan) return its;
    A.jan.el.querySelectorAll('.ag-pp').forEach(inp=>{ const i=its[+inp.dataset.k]; if(!i) return; const v=Math.round(+String(inp.value).replace(',','.')||0);
      if(v>0&&v!==ppCad(i.cod)) i.pp=v; else delete i.pp; }); return its; }
  function transps(){ const s=new Set((A.cfg.transps||[]).filter(Boolean)); todos().forEach(x=>{ if(x.transp) s.add(x.transp); }); return [...s].sort((a,b)=>a.localeCompare(b,'pt-BR')); }
  const atl=d=>{ const h=hoje(); return d===h?'Hoje':d===addD(h,1)?'Amanhã':semana(d)[0].toUpperCase()+semana(d).slice(1); };
  function janela(x){ const u=U(); if(A.jan) A.jan.fechar(); const novo=!!(A.ed&&A.ed.novo), h=hoje(); A.ed.x=x;
    const dts=[h,addD(h,1),addD(h,2),addD(h,3)], sc=!!x.semCarga&&!x.carga, tl=transps();
    const form=`<div class="pc-form ag-fm">
        ${novo?u.campo({r:'Número do pedido',id:'ag-ped',v:'',obr:1,col:12,im:'numeric',dica:'O PDF não trouxe o número.'}):''}
        ${u.campo({r:'Cliente',id:'ag-cli',v:x.cliente||'',col:12,ph:'Nome do cliente'})}
        <label class="pc-campo pc-c6 ag-cg"><span>Carga do sistema</span><input id="ag-carga" type="text" value="${esc(x.carga||'')}" placeholder="${sc?'Sem carga por enquanto':'Nº da carga no Focco'}"${sc?' disabled':''}>
          <button type="button" class="ag-sc${sc?' on':''}" data-act="ag-semcarga" aria-pressed="${sc}">${sc?'✓ ':''}Sem carga por enquanto</button>${pedList(x).length>1?`<button type="button" class="ag-sc ag-ec${ehCarga(x)?' on':''}" data-act="ag-ehcarga" aria-pressed="${ehCarga(x)}">${ehCarga(x)?'✓ ':''}Estes ${pedList(x).length} pedidos são uma carga</button>`:''}</label>
        ${u.campo({r:'Ordem no diário de bordo',id:'ag-diario',v:x.diario||'',col:6,im:'numeric',ph:'Nº do caminhão no diário',dica:'Vale para todos os pedidos da mesma carga.'})}
        <label class="pc-campo pc-c12"><span>Transportadora</span><input id="ag-transp" type="text" list="ag-tl" value="${esc(x.transp||'')}" placeholder="Escolha ou digite" autocomplete="off">
          <datalist id="ag-tl">${tl.map(t=>`<option value="${esc(t)}">`).join('')}</datalist><em>${tl.length?'As já usadas aparecem ao digitar.':'Fica guardada para os próximos.'}</em></label>
        <div class="pc-c12 ag-dtw"><span class="ag-lb">Agendar para</span>
          <div class="ag-dtl"><input id="ag-data" class="txt" type="date" value="${esc(x.data||'')}" aria-label="Data do agendamento">
            <div class="ag-atl" role="group" aria-label="Atalhos de data">${dts.map(d=>`<button type="button" class="ag-atb${x.data===d?' on':''}" data-act="ag-dt" data-v="${d}"><b>${esc(atl(d))}</b><small>${esc(brC(d))}</small></button>`).join('')}<button type="button" class="ag-atb sd${!x.data?' on':''}" data-act="ag-dt" data-v=""><b>Sem data</b><small>esperar</small></button></div></div></div>
        ${u.campo({r:'Observação',id:'ag-obs',tipo:'area',v:x.obs||'',col:12,ph:'Ex.: cliente pediu para antes, entrega parcial, falta produzir o AC3…'})}
      </div>`;
    const corpo=`<div class="ag-jg">${form}<aside class="ag-res"><div id="ag-totp">${totpHtml(x)}</div><div class="ag-diap" id="ag-diap">${diaHtml(x.data||'',x)}</div></aside></div>
      <h3 class="ag-h3">Itens do pedido</h3>${itensTab(x)}
      ${!novo&&(x.hist||[]).length?`<details class="ag-hist"><summary>Histórico (${x.hist.length})</summary>${u.tempo(x.hist.slice().reverse().map(e=>({t:e.t,q:new Date(e.em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+(e.por?' · '+e.por:'')})))}</details>`:''}`;
    const fechado=x.status==='carregado'||x.status==='cancelado';
    const rod=`${!novo?(fechado?u.bt('Reabrir','ag-reabrir',{sec:1,dv:x._id}):u.bt('Cancelar pedido','ag-cancelar',{sec:1,dv:x._id}))+u.bt('Apagar','ag-apagar',{sec:1,dv:x._id,cls:'ag-apg'}):''}<span style="flex:1"></span>
      ${!novo&&x.status==='agendado'?u.bt('Carregou','ag-carregou',{sec:1,dv:x._id}):''}${u.bt('Salvar','ag-salvar',{dv:x._id||''})}`;
    const sub=novo?[empTxt(x),A.ed.arquivo||''].filter(Boolean).join(' · '):[empTxt(x),STN[x.status]||'',x.data?'para '+br(x.data)+' ('+semana(x.data)+')':'',cargaTxt(x),x.transp||''].filter(Boolean).join(' · ');
    A.jan=u.janela({tit:novo?'Pedido novo':(pedList(x).length>1?pedList(x).length+' pedidos: '+pedTodos(x):'Pedido '+x.pedido)+(x.cliente?' · '+x.cliente:''),sub,corpo,rodape:rod,larga:true,foco:novo,aoFechar:()=>{ A.jan=null; A.ed=null; }});
    A.jan.el.classList.add('ag-jan'); }
  /* o dia escolhido: o que já está nele + este pedido */
  function diaHtml(d,x){ if(!d) return `<div class="ag-rl">Dia do carregamento</div><p class="ag-dv">Sem data: o pedido fica em "Esperando data".</p>`;
    const outros=A.abertos.filter(y=>y.status==='agendado'&&y.data===d&&y._id!==x._id);
    const r0=soma(outros), r=soma(outros.concat([Object.assign({},x,{itens:itensJan(x)})]));
    return `<div class="ag-rl">${esc(atl(d))} · ${esc(brC(d))} (${esc(semana(d))})</div>
      <p class="ag-dv">${outros.length?`Já tem ${outros.length} pedido${outros.length>1?'s':''} (${esc(palTxt(r0))}).`:'Nenhum outro pedido neste dia.'}</p>
      <p class="ag-dv">Com este pedido fica <b>${esc(unTxt(r))} · ${esc(palTxt(r))}</b></p>`; }
  function janAtualiza(){ if(A.jan&&A.ed&&A.ed.carga){ const dv=val('#ag-data'); A.jan.el.querySelectorAll('.ag-atb').forEach(b=>b.classList.toggle('on',(b.dataset.v||'')===dv)); return; } if(!A.jan||!A.ed||!A.ed.x) return; const x=Object.assign({},A.ed.x,{itens:itensJan(A.ed.x)});
    A.jan.el.querySelectorAll('.ag-pl').forEach(td=>{ const i=x.itens[+td.dataset.k]; if(!i) return; const pp=ppDe(i); td.textContent=pp>0&&qtdDe(i)>0?fP(qtdDe(i)/pp):'—'; });
    A.jan.el.querySelectorAll('.ag-pp').forEach(i=>i.classList.toggle('vz',!(+i.value>0)));
    const t=A.jan.el.querySelector('#ag-totp'); if(t) t.innerHTML=totpHtml(x);
    const dv=val('#ag-data'); A.jan.el.querySelectorAll('.ag-atb').forEach(b=>b.classList.toggle('on',(b.dataset.v||'')===dv));
    const dp=A.jan.el.querySelector('#ag-diap'); if(dp) dp.innerHTML=diaHtml(dv,A.ed.x); }
  function editar(id){ const x=deId(id); if(!x) return; A.ed={id}; janela(x); }
  const val=s=>{ const e=A.jan&&A.jan.el.querySelector(s); return e?String(e.value||'').trim():''; };
  async function salvarCfg(o){ try{ await P.db().doc('config/agendamentos').set(o,{merge:true}); Object.keys(o).forEach(k=>{ A.cfg[k]=typeof o[k]==='object'&&!Array.isArray(o[k])?Object.assign({},A.cfg[k]||{},o[k]):o[k]; }); }catch(e){ console.warn('[agend] config',e); } }
  async function salvar(id){ const novo=!!(A.ed&&A.ed.novo), base=A.ed&&A.ed.x;
    const scBt=A.jan&&A.jan.el.querySelector('[data-act="ag-semcarga"]'), sc=!!(scBt&&scBt.classList.contains('on'));
    const ecBt=A.jan&&A.jan.el.querySelector('[data-act="ag-ehcarga"]');
    const o={...(ecBt?{ehCarga:ecBt.classList.contains('on')}:{}),cliente:val('#ag-cli'),carga:sc?'':val('#ag-carga'),semCarga:sc,diario:val('#ag-diario'),transp:val('#ag-transp'),obs:val('#ag-obs'),data:val('#ag-data')};
    const its=base?itensJan(base):null;
    let x; if(novo){ const ped=val('#ag-ped').replace(/\s+/g,''); if(!ped){ P.toast('Digite o número do pedido.'); return; } id=docId(ped); x=deId(id);
      Object.assign(o,{...(A.ed.R.empresa?{empresa:A.ed.R.empresa}:{}),itens:its||A.ed.R.itens,total:A.ed.R.total,relData:A.ed.R.relData,arquivo:A.ed.arquivo}); if(!x) o.pedido=ped; }
    else { x=deId(id); if(its) o.itens=its; }
    if(o.carga) o.semCarga=false;
    const st=x&&(x.status==='carregado'||x.status==='cancelado')?x.status:(o.data?'agendado':'aguardando');
    o.status=st; o.aberto=st==='aguardando'||st==='agendado';
    const mud=[]; if(!x) mud.push('Criado à mão (PDF sem número)');
    else { if((x.data||'')!==o.data) mud.push(o.data?(x.data?'Data mudou de '+br(x.data)+' para '+br(o.data):'Agendado para '+br(o.data)):'Data tirada (voltou a esperar data)');
      [['cliente','Cliente'],['carga','Carga'],['diario','Diário de bordo'],['transp','Transportadora'],['obs','Observação']].forEach(([k,r])=>{ if((x[k]||'')!==o[k]) mud.push(r+(o[k]?': '+o[k].slice(0,60):' apagado')); });
      if(!!x.semCarga!==sc&&sc) mud.push('Sem carga por enquanto'); }
    try{ await grava(id,o,mud.join(' · ')||null);
      /* mesma carga = mesmo caminhão: o nº do diário de bordo vale para os outros pedidos abertos da carga */
      if(o.carga&&o.diario) for(const y of A.abertos.filter(y=>y._id!==id&&y.carga===o.carga&&(y.diario||'')!==o.diario)) await grava(y._id,{diario:o.diario},'Diário de bordo nº '+o.diario+' (pela carga '+o.carga+')');
      /* guarda a transportadora nova e o "por palete" digitado (vale para os próximos pedidos) */
      const cfg={}; if(o.transp&&!(A.cfg.transps||[]).includes(o.transp)) cfg.transps=(A.cfg.transps||[]).concat([o.transp]).sort((a,b)=>a.localeCompare(b,'pt-BR')).slice(-300);
      const pp={}; (o.itens||[]).forEach(i=>{ if(+i.pp>0&&+(A.cfg.pp||{})[String(i.cod).toUpperCase()]!==+i.pp) pp[String(i.cod).toUpperCase()]=+i.pp; }); if(Object.keys(pp).length) cfg.pp=pp;
      if(Object.keys(cfg).length) salvarCfg(cfg);
      if(A.jan) A.jan.fechar(); const r=soma([deId(id)||o]);
      P.toast(o.data&&st==='agendado'?'Agendado para '+br(o.data)+' ('+semana(o.data)+') · '+palTxt(r)+'.':'Salvo.'); if(st==='agendado') A.aba='agendado'; else if(st==='aguardando') A.aba='aguardando'; P.rerender(); }
    catch(e){ P.erro(e); } }
  async function mudaStatus(id,st,txt){ const x=deId(id); if(!x) return;
    const o={status:st,aberto:st==='aguardando'||st==='agendado'}; if(!o.aberto) o.fechadoEm=new Date().toISOString(); if(st==='carregado') o.carregadoEm=hoje();
    try{ await grava(id,o,txt); if(A.jan) A.jan.fechar(); P.toast('Pedido '+x.pedido+': '+(STN[st]||st).toLowerCase()+'.'); P.rerender(); }catch(e){ P.erro(e); } }

  /* ---------- tela (layout 24/11, 3ª: semana em paletes no topo, alertas ao lado, lista em colunas, cargas dentro do dia) ---------- */
  function filtra(xs){ const ps=norm(A.q).split(/\s+/).filter(Boolean); if(!ps.length) return xs;
    return xs.filter(x=>{ const t=norm([x.pedido,x.cliente,x.carga,x.diario,x.transp,x.obs,empTxt(x),x.empresa&&x.empresa.nome,(x.itens||[]).map(i=>i.cod+' '+i.desc).join(' ')].join(' ')); return ps.every(p=>t.includes(p)); }); }
  function linha(x,o){ o=o||{}; const ss=semSaldo(x), h=hoje(), atras=x.status==='agendado'&&x.data&&x.data<h, r=soma([x]), n=(x.itens||[]).length;
    const sub=[empTxt(x)?`<span class="ag-emp" title="${esc(x.empresa.nome||'')}">${esc(empTxt(x))}</span>`:'',pedList(x).length>1?`<span class="ag-pls">${ehCarga(x)?'carga com '+pedList(x).length+' pedidos: ':'pedidos '}${esc(pedTodos(x))}</span>`:'',o.st?`<span class="ag-stx ${STT[x.status]}">${esc(STN[x.status])}${x.data?' '+esc(brC(x.data)):''}</span>`:'',!o.semCarga&&cargaTxt(x)?esc(cargaTxt(x)):'',!o.semCarga&&x.diario?esc(diarioTxt(x)):'',!o.semCarga&&x.transp?esc(x.transp):'',n+' ite'+(n>1?'ns':'m'),esc(fR(x.total)),ss.length?`<span class="ag-wn${ss.length===n?' c':''}">falta estoque em ${ss.length} ite${ss.length>1?'ns':'m'}</span>`:''].filter(Boolean).join(' · ');
    return `<div class="ag-ln${atras?' atr':''}${A.sel.has(x._id)?' sel':''}" data-act="ag-abrir" data-v="${esc(x._id)}" data-b="${esc(norm([x.pedido,x.cliente,x.carga,x.transp,x.obs,cargaTxt(x),diarioTxt(x),empTxt(x),x.empresa&&x.empresa.nome].join(' ')))}">
      <div class="ag-pd">${o.ck&&pode()?`<input type="checkbox" class="ag-ck" data-act="ag-sel" data-v="${esc(x._id)}" aria-label="Marcar o pedido ${esc(x.pedido)}"${A.sel.has(x._id)?' checked':''}>`:''}<b title="${esc(pedTodos(x))}">${esc(pedCurto(x))}</b></div>
      <div class="ag-mid"><div class="ag-cl">${x.cliente?esc(x.cliente):'<i>sem cliente</i>'}</div><div class="ag-sub">${sub}</div>${x.obs?`<div class="ag-obs">${esc(x.obs)}</div>`:''}</div>
      <div class="ag-qt">${esc(unTxt(r))}</div>
      <div class="ag-ac">${o.bt?`<button type="button" class="ag-bt${o.bt[2]?' sec':''}" data-act="${o.bt[1]}" data-v="${esc(x._id)}">${esc(o.bt[0])}</button>`:''}</div></div>`; }
  const UNN={SC:['saco','sacos'],FD:['fardo','fardos'],CX:['caixa','caixas'],BD:['balde','baldes'],UN:['unidade','unidades'],PC:['peça','peças'],GL:['galão','galões'],LT:['litro','litros'],KG:['kg','kg'],PT:['pote','potes'],RL:['rolo','rolos']};
  const unN=(u,q)=>{ const n=UNN[String(u||'').toUpperCase()]; return n?(Math.abs(q-1)<1e-9?n[0]:n[1]):String(u||'').toLowerCase(); };
  const qtdUn=(q,u)=>fN(q)+' '+unN(u,q);
  /* o que não vai em palete (sem palete cadastrado), somado por unidade: "10 fardos · 40 caixas" */
  function fora(r){ const m={}; r.it.filter(i=>i.pal==null).forEach(i=>{ m[i.un]=(m[i.un]||0)+i.q; }); return Object.keys(m).map(u=>[u,m[u]]); }
  const foraTxt=r=>fora(r).map(([u,q])=>qtdUn(q,u)).join(' · ');
  /* total do dia: "10,41 paletes · 10 fardos" */
  const totDia=r=>[r.pal>0?fP(r.pal)+' palete'+(Math.floor(r.pal*100+1e-6)===100?'':'s'):'',foraTxt(r)].filter(Boolean).join(' · ')||'—';
  const totLin=r=>`<b class="ag-tp">${esc(totDia(r))}</b>`;
  /* dia: título leve com o total; paletes por item recolhido; um grupo por carga */
  function grupoDia(d,xs){ const h=hoje(), r=soma(xs);
    const nome=d<h?'Já passou':d===h?'Hoje':d===addD(h,1)?'Amanhã':semana(d)[0].toUpperCase()+semana(d).slice(1);
    const g=new Map(); xs.forEach(x=>{ const k=x.carga?'c:'+x.carga:ehCarga(x)?'r:'+x._id:'sem'; (g.get(k)||g.set(k,[]).get(k)).push(x); });
    const ks=[...g.keys()].sort((a,b)=>a==='sem'?1:b==='sem'?-1:a.localeCompare(b,'pt-BR',{numeric:true}));
    const blocos=ks.map(k=>{ const ys=g.get(k), rc=soma(ys), tr=[...new Set(ys.map(y=>y.transp).filter(Boolean))].join(' / ');
      const dr=[...new Set(ys.map(y=>y.diario).filter(Boolean))].join(' / ');
      return `<div class="ag-cgb${k==='sem'?' sem':''}"><div class="ag-cgh"><span class="ag-cgt"><b>${k==='sem'?'Sem carga':k[0]==='r'?'Carga com '+pedList(ys[0]).length+' pedidos':'Carga '+esc(k.slice(2))}</b>${k[0]==='r'?' <span class="ag-sn">sem número ainda</span>':''}${dr?` <span class="ag-dnum">diário nº ${esc(dr)}</span>`:''}${tr?' · '+esc(tr):''}${ys.length>1?' · '+ys.length+' pedidos':''}</span><span class="ag-cgs">${ks.length>1?totLin(rc):''}${pode()?`<button type="button" class="lnk ag-cge" data-act="ag-cgedit" data-v="${esc(ys.map(y=>y._id).join(','))}">${k==='sem'?'Montar carga':k[0]==='r'?'Dar o número':'Editar'}</button>`:''}</span></div>
        ${ys.map(x=>linha(x,{bt:['Carregou','ag-carregou'],semCarga:true,ck:true})).join('')}</div>`; }).join('');
    return `<section class="ag-dia${d<h?' atr':d===h?' hj':''}"><header class="ag-dh"><h3>${esc(nome)} <span>${esc(br(d))}</span></h3><div class="ag-dt2">${xs.length} pedido${xs.length>1?'s':''} · ${r.pal>0?esc(unTxt(r))+' · ':''}${totLin(r)} · ${esc(fR(r.vp))}</div></header>
      ${d<h?'<p class="ag-atx">Marque "Carregou" ou mude a data.</p>':''}
      ${blocos}</section>`; }
  /* quadro geral "Paletes por item": todos os agendados de hoje em diante (e os atrasados), item a item, por dia e no total */
  /* ---------- bloco do lado (24/11, 7ª: "um calendário, com embaixo a quantidade de itens: em paletes os que são em paletes e em
     fardos os que são em fardos; aperto no de amanhã e vejo 960 AC3 = 10 paletes" + "e quanto vai dar o dia") ---------- */
  function diaPadrao(agd){ const h=hoje(), ds=[...new Set(agd.map(x=>x.data).filter(Boolean))].sort(); return ds.includes(h)?h:(ds.find(d=>d>h)||h); }
  function ladoHtml(agd){ const h=hoje(); if(!A.cal) A.cal=diaPadrao(agd); if(!A.mes) A.mes=A.cal.slice(0,7);
    const g={}; agd.forEach(x=>{ if(x.data) (g[x.data]=g[x.data]||[]).push(x); });
    const [Y,M]=A.mes.split('-').map(Number), ini=new Date(Y,M-1,1,12), nd=new Date(Y,M,0).getDate(), pad=ini.getDay();
    const nm0=ini.toLocaleDateString('pt-BR',{month:'long'}), nomeMes=nm0[0].toUpperCase()+nm0.slice(1)+' '+Y;
    const cel=[]; for(let k=0;k<pad;k++) cel.push('<span class="ag-cd vz" aria-hidden="true"></span>');
    for(let dd=1;dd<=nd;dd++){ const d=A.mes+'-'+String(dd).padStart(2,'0'), xs=g[d]||[], r=xs.length?soma(xs):null;
      const v=r?(r.pal>0?fP(r.pal):fora(r).length?fN(fora(r)[0][1])+' '+String(fora(r)[0][0]).toLowerCase():'•'):'';
      cel.push(`<button type="button" class="ag-cd${d===h?' hj':''}${d===A.cal?' on':''}${xs.length?' tem':''}${xs.length&&d<h?' atr':''}" data-act="ag-cal" data-v="${d}" aria-pressed="${d===A.cal}" aria-label="${esc(br(d))}${xs.length?': '+esc(totDia(r)):''}"><b>${dd}</b>${v?`<small>${esc(v)}</small>`:''}</button>`); }
    const d=A.cal, xs=g[d]||[], r=soma(xs), nc=new Set(xs.map(x=>x.carga?'c'+x.carga:ehCarga(x)?'r'+x._id:'s'+x._id)).size;
    const its=r.it.map(i=>`<li><div class="ag-ti"><b>${esc(i.cod)}</b><span>${esc(i.desc||'')}</span><span class="ag-tvl">${esc(fR(i.v))}</span></div><div class="ag-tv">${i.pal!=null?`<b>${fP(i.pal)} <small>pal.</small></b><span>${esc(qtdUn(i.q,i.un))}</span>`:`<b>${esc(qtdUn(i.q,i.un))}</b><span>${i.un==='SC'?'sem palete cadastrado':'&nbsp;'}</span>`}</div></li>`).join('');
    const tit=d<h?'Já passou':d===h?'Hoje':d===addD(h,1)?'Amanhã':semana(d)[0].toUpperCase()+semana(d).slice(1);
    return `<aside class="ag-side" aria-label="Calendário de carregamentos">
      <div class="ag-cal"><div class="ag-ch"><button type="button" class="ag-mv" data-act="ag-mes" data-v="-1" aria-label="Mês anterior">‹</button><b>${esc(nomeMes)}</b><button type="button" class="ag-mv" data-act="ag-mes" data-v="1" aria-label="Próximo mês">›</button></div>
        <div class="ag-cg7">${['D','S','T','Q','Q','S','S'].map(x=>`<span class="ag-cw">${x}</span>`).join('')}${cel.join('')}</div></div>
      <div class="ag-tot2"><div class="ag-th"><h3>${esc(tit)} <span>${esc(br(d))}</span></h3><p>${xs.length?`${xs.length} pedido${xs.length>1?'s':''}${nc?' · '+nc+' carga'+(nc>1?'s':''):''}`:'Nada agendado neste dia.'}</p></div>
        ${xs.length?`<ul class="ag-tl">${its}</ul>
        <div class="ag-tf"><span>Total do dia</span><b>${esc(r.pal>0?fP(r.pal)+' paletes':foraTxt(r))}</b>${r.pal>0&&fora(r).length?`<em>+ ${esc(foraTxt(r))}</em>`:''}${r.pal>0?`<small>${esc(unTxt(r))}</small>`:''}${(()=>{ const es=[...new Set(xs.map(x=>empTxt(x)||'Sem empresa'))]; if(es.length<2) return ''; return `<div class="ag-tfe">${es.map(e=>{ const re=soma(xs.filter(x=>(empTxt(x)||'Sem empresa')===e)); return `<div><span>${esc(e)}</span><b>${esc(totDia(re))}</b></div>`; }).join('')}</div>`; })()}<div class="ag-tfv"><span>Valor</span><b>${esc(fR(r.vp))}</b></div></div>
        ${A.aba==='agendado'&&A.dia===d?'':`<button type="button" class="lnk ag-vd" data-act="ag-dia" data-v="${d}">Ver os pedidos deste dia</button>`}`:''}</div></aside>`; }
  const ic=(n,t)=>{ try{ return U().ic(n,t); }catch(e){ return ''; } };
  function vTela(){ const u=U(); if(!u) return '<section class="card"><div class="empty">Carregando…</div></section>';
    const h=hoje(), ag=A.abertos.filter(x=>x.status!=='agendado'), agd=A.abertos.filter(x=>x.status==='agendado');
    const atr=agd.filter(x=>x.data<h);
    const car=A.fechados.filter(x=>x.status==='carregado'), can=A.fechados.filter(x=>x.status==='cancelado');
    const head=`<div class="head ag-head"><div><div class="eyebrow">AGENDAMENTOS</div><h1>Agendamentos de pedidos</h1><div class="sub">Importe o PDF do Focco (ou arraste para esta tela), confira o estoque e escolha a data.</div>
        ${ag.length||atr.length?`<div class="ag-alt">${ag.length?`<button type="button" class="ag-al1 warn" data-act="ag-aba" data-v="aguardando">${ag.length} esperando data</button>`:''}${atr.length?`<button type="button" class="ag-al1 crit" data-act="ag-aba" data-v="agendado">${atr.length} com a data passada</button>`:''}</div>`:''}</div>
      <div class="ag-acts">${pode()?`<label class="btn ag-imp">${ic('agendar',16)}Importar PDF<input type="file" id="ag-file" accept=".pdf,application/pdf" multiple hidden></label>`:''}</div></div>
      ${A.lendo?`<div class="ag-lendo" id="ag-drop"><span class="ag-spin"></span>${esc(A.lendo)}</div>`:`<div class="ag-drop" id="ag-drop" aria-hidden="true"><div><b>Solte o PDF do Focco aqui</b><span>Pode ser mais de um</span></div></div>`}`;
    const barra=`<div class="ag-bar">${u.chips([['aguardando','Esperando data',ag.length,A.aba==='aguardando'],['agendado','Agendados',agd.length,A.aba==='agendado'],['carregado','Carregados',car.length,A.aba==='carregado'],['cancelado','Cancelados',can.length,A.aba==='cancelado']],'ag-aba')}
      <input type="search" id="ag-q" class="txt ag-q" aria-label="Buscar agendamento" autocomplete="off" placeholder="Buscar pedido, cliente, carga, item…" value="${esc(A.q)}"></div>`;
    let corpo='';
    if(!A.lido.a) corpo='<div class="empty">Carregando…</div>';
    else if(A.aba==='aguardando'){ const xs=filtra(ag).sort((a,b)=>String(a.criadoEm||'').localeCompare(String(b.criadoEm||'')));
      corpo=xs.length?'<div class="ag-grp">'+xs.map(x=>linha(x,{bt:['Agendar','ag-abrir'],ck:true})).join('')+'</div>':u.vazio({tom:A.q?'':'ok',tit:A.q?'Nada com essa busca':'Nenhum pedido esperando data',txt:A.q?'':'Quando o faturamento mandar um pedido, importe o PDF do Focco.'}); }
    else if(A.aba==='agendado'){ let xs=filtra(agd); if(A.dia) xs=xs.filter(x=>x.data===A.dia); const g={}; xs.forEach(x=>(g[x.data]=g[x.data]||[]).push(x));
      const ds=Object.keys(g).sort();
      corpo=(A.dia?`<div class="ag-fil">Mostrando só <b>${esc(atl(A.dia))} · ${esc(br(A.dia))}</b> <button type="button" class="lnk" data-act="ag-dia" data-v="">Ver todos os dias</button></div>`:'')
        +(ds.length?ds.map(d=>grupoDia(d,g[d])).join(''):u.vazio({tit:A.q?'Nada com essa busca':A.dia?'Nada agendado neste dia':'Nenhum pedido agendado'})); }
    else { const xs=filtra(A.aba==='carregado'?car:can);
      corpo=xs.length?'<div class="ag-grp">'+xs.map(x=>linha(x,{st:true,bt:['Reabrir','ag-reabrir',1]})).join('')+'</div>':u.vazio({tit:A.q?'Nada com essa busca':'Nenhum pedido '+(A.aba==='carregado'?'carregado':'cancelado')+' ainda'});
      if(xs.length) corpo+=`<p class="ag-dica">Mostrando os últimos ${A.fechados.length>=80?'80 ':''}pedidos fechados.</p>`; }
    [...A.sel].forEach(id=>{ const x=deId(id); if(!x||!x.aberto) A.sel.delete(id); });
    const ms=[...A.sel].map(deId).filter(Boolean), rm=soma(ms);
    const marc=ms.length&&(A.aba==='aguardando'||A.aba==='agendado')?`<div class="ag-mk" role="region" aria-label="Pedidos marcados"><span><b>${ms.length} pedido${ms.length>1?'s':''} marcado${ms.length>1?'s':''}</b> · ${esc(ms.map(pedCurto).join(', '))}</span><span class="ag-mkt">${esc(unTxt(rm))} · <b>${esc(totDia(rm))}</b></span>
      <span class="ag-mkb"><button type="button" class="lnk" data-act="ag-selnada">Desmarcar</button><button type="button" class="btn" data-act="ag-montar">Montar carga</button></span></div>`:'';
    const dicaM=pode()&&(A.aba==='aguardando'||A.aba==='agendado')&&!ms.length&&A.abertos.length>1?`<p class="ag-dm">Marque os pedidos do mesmo caminhão para montar a carga.</p>`:'';
    return head+`<div class="ag-lay"><div class="ag-main">${u.cartao({cls:'ag-lista',corpo:barra+dicaM+`<div id="ag-corpo">${corpo}</div>`+marc})}</div>${ladoHtml(agd)}</div>`; }

  /* ---------- montar carga: vários pedidos no mesmo caminhão (carga do sistema + ordem no diário de bordo) ---------- */
  function janCarga(ids){ const u=U(); if(A.jan) A.jan.fechar(); const xs=ids.map(deId).filter(Boolean); if(!xs.length) return; const h=hoje();
    const um=k=>{ const v=[...new Set(xs.map(x=>x[k]||''))]; return v.length===1?v[0]:''; };
    const c0={carga:um('carga'),diario:um('diario'),transp:um('transp'),data:um('data'),semCarga:xs.every(x=>x.semCarga&&!x.carga)};
    const dts=[h,addD(h,1),addD(h,2),addD(h,3)], tl=transps(), r=soma(xs), sc=c0.semCarga;
    A.ed={carga:ids};
    const corpo=`<div class="ag-jg"><div class="pc-form ag-fm">
        <label class="pc-campo pc-c6 ag-cg"><span>Carga do sistema</span><input id="ag-carga" type="text" value="${esc(c0.carga)}" placeholder="${sc?'Sem carga por enquanto':'Nº da carga no Focco'}"${sc?' disabled':''}>
          <button type="button" class="ag-sc${sc?' on':''}" data-act="ag-semcarga" aria-pressed="${sc}">${sc?'✓ ':''}Sem carga por enquanto</button></label>
        ${u.campo({r:'Ordem no diário de bordo',id:'ag-diario',v:c0.diario,col:6,im:'numeric',ph:'Nº do caminhão no diário'})}
        <label class="pc-campo pc-c12"><span>Transportadora</span><input id="ag-transp" type="text" list="ag-tl" value="${esc(c0.transp)}" placeholder="Escolha ou digite" autocomplete="off"><datalist id="ag-tl">${tl.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></label>
        <div class="pc-c12 ag-dtw"><span class="ag-lb">Agendar para</span><div class="ag-dtl"><input id="ag-data" class="txt" type="date" value="${esc(c0.data)}" aria-label="Data do carregamento">
          <div class="ag-atl" role="group" aria-label="Atalhos de data">${dts.map(d=>`<button type="button" class="ag-atb${c0.data===d?' on':''}" data-act="ag-dt" data-v="${d}"><b>${esc(atl(d))}</b><small>${esc(brC(d))}</small></button>`).join('')}<button type="button" class="ag-atb sd${!c0.data?' on':''}" data-act="ag-dt" data-v=""><b>Sem data</b><small>esperar</small></button></div></div></div>
      </div><aside class="ag-res"><div id="ag-totp"><div class="ag-rl">Total da carga</div><div class="ag-pbig">${esc(palTxt(r))}</div><div class="ag-run">${esc(unTxt(r))}</div>${r.semPal.length?`<div class="ag-rw">${esc(semPalTxt(r))} — fora da conta</div>`:''}<div class="ag-rs"><span>${xs.length} pedidos · ${esc(fR(r.val))}</span></div></div></aside></div>
      <h3 class="ag-h3">Pedidos desta carga</h3><div class="ag-cpl">${xs.map(x=>{ const rx=soma([x]); return `<div><b title="${esc(pedTodos(x))}">${esc(pedCurto(x))}</b><span>${esc(x.cliente||'sem cliente')}</span><span>${esc(unTxt(rx))}</span><b class="ag-q1">${esc(palTxt(rx))}</b></div>`; }).join('')}</div>
      <h3 class="ag-h3">Paletes por item</h3>${porItem(r)}`;
    A.jan=u.janela({tit:'Montar carga · '+xs.length+' pedido'+(xs.length>1?'s':''),sub:xs.map(pedTodos).join(', '),corpo,rodape:`<span style="flex:1"></span>${u.bt('Salvar carga','ag-cgsalvar')}`,larga:true,aoFechar:()=>{ A.jan=null; A.ed=null; }});
    A.jan.el.classList.add('ag-jan'); }
  async function salvarCarga(){ const ids=(A.ed&&A.ed.carga)||[]; const scBt=A.jan&&A.jan.el.querySelector('[data-act="ag-semcarga"]'), sc=!!(scBt&&scBt.classList.contains('on'));
    const c={carga:sc?'':val('#ag-carga'),semCarga:sc&&!val('#ag-carga'),diario:val('#ag-diario'),transp:val('#ag-transp'),data:val('#ag-data')};
    const st=c.data?'agendado':'aguardando', peds=ids.map(deId).filter(Boolean).map(x=>x.pedido).join(', ');
    try{ for(const id of ids){ const x=deId(id); if(!x) continue; const fech=x.status==='carregado'||x.status==='cancelado';
        const o=Object.assign({},c,fech?{}:{status:st,aberto:true}); const mud=[];
        if((x.carga||'')!==c.carga) mud.push(c.carga?'Carga '+c.carga:'Sem carga'); if((x.diario||'')!==c.diario&&c.diario) mud.push('Diário de bordo nº '+c.diario);
        if((x.data||'')!==c.data) mud.push(c.data?'Agendado para '+br(c.data):'Data tirada'); if((x.transp||'')!==c.transp&&c.transp) mud.push('Transportadora: '+c.transp);
        await grava(id,o,mud.length?mud.join(' · ')+' (carga montada com '+peds+')':null); }
      if(c.transp&&!(A.cfg.transps||[]).includes(c.transp)) salvarCfg({transps:(A.cfg.transps||[]).concat([c.transp]).sort((a,b)=>a.localeCompare(b,'pt-BR')).slice(-300)});
      const r=soma(ids.map(deId).filter(Boolean)); A.sel.clear(); if(A.jan) A.jan.fechar(); if(c.data) A.aba='agendado';
      P.toast((c.carga?'Carga '+c.carga:'Carga')+(c.diario?' · diário nº '+c.diario:'')+' · '+ids.length+' pedidos · '+palTxt(r)+(c.data?' · '+br(c.data):'')+'.'); P.rerender(); }
    catch(e){ P.erro(e); } }

  /* ---------- avisos no Meu dia ---------- */
  if(P.registrarAviso) P.registrarAviso(()=>{ if(!A.lido.a) return []; const h=hoje(), out=[];
    const atr=A.abertos.filter(x=>x.status==='agendado'&&x.data&&x.data<h), hj=A.abertos.filter(x=>x.status==='agendado'&&x.data===h), ag=A.abertos.filter(x=>x.status==='aguardando');
    if(atr.length) out.push({nivel:'crit',rotulo:'Agendamento',titulo:atr.length+' pedido'+(atr.length>1?'s':'')+' com a data já passada',texto:'Sem marcar "Carregou": '+atr.slice(0,4).map(x=>x.pedido+(x.cliente?' ('+x.cliente+')':'')).join(', ')+(atr.length>4?'…':''),go:'agendamentos'});
    if(hj.length) out.push({nivel:'warn',rotulo:'Agendamento',titulo:hj.length+' pedido'+(hj.length>1?'s':'')+' para carregar hoje · '+palTxt(soma(hj)),texto:unTxt(soma(hj))+' · '+hj.slice(0,4).map(x=>x.pedido+(x.cliente?' ('+x.cliente+')':'')).join(', ')+(hj.length>4?'…':''),go:'agendamentos'});
    if(ag.length) out.push({nivel:'warn',rotulo:'Agendamento',titulo:ag.length+' pedido'+(ag.length>1?'s':'')+' esperando data',texto:'Confira o estoque e escolha quando agendar.',go:'agendamentos'});
    return out; });

  /* ---------- ações ---------- */
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-act^="ag-"]'); if(!b) return; const act=b.dataset.act, v=b.dataset.v||'';
    if(act==='ag-aba'){ A.aba=v; A.dia=''; P.rerender(); return; }
    if(act==='ag-sel'){ if(b.checked) A.sel.add(v); else A.sel.delete(v); P.render(); return; } /* render: o rerender espera o campo em foco sair */
    if(act==='ag-selnada'){ A.sel.clear(); P.render(); return; }
    if(act==='ag-montar'){ janCarga([...A.sel]); return; }
    if(act==='ag-cgedit'){ janCarga(v.split(',').filter(Boolean)); return; }
    if(act==='ag-cgsalvar'){ salvarCarga(); return; }
    if(act==='ag-cal'){ A.cal=v; P.rerender(); return; }
    if(act==='ag-mes'){ const [y,m]=(A.mes||hoje().slice(0,7)).split('-').map(Number), x=new Date(y,m-1+(+v),1,12); A.mes=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'); P.rerender(); return; }
    if(act==='ag-dia'){ A.dia=v&&A.dia!==v?v:''; if(v){ A.cal=v; A.mes=v.slice(0,7); } A.aba='agendado'; P.rerender(); return; }
    if(act==='ag-abrir'){ editar(v); return; } /* closest() pega o botão antes da linha: Carregou/Reabrir não abrem a janela */
    if(act==='ag-dt'){ const i=A.jan&&A.jan.el.querySelector('#ag-data'); if(i){ i.value=v; janAtualiza(); } return; }
    if(act==='ag-salvar'){ salvar(v); return; }
    if(act==='ag-ehcarga'){ const on=!b.classList.contains('on'); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); b.textContent=(on?'✓ ':'')+b.textContent.replace(/^✓ /,''); return; }
    if(act==='ag-semcarga'){ const on=!b.classList.contains('on'), i=A.jan&&A.jan.el.querySelector('#ag-carga'); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); b.textContent=(on?'✓ ':'')+'Sem carga por enquanto';
      if(i){ if(on) i.value=''; i.disabled=on; i.placeholder=on?'Sem carga por enquanto':'Nº da carga no Focco'; if(!on) i.focus(); } return; }
    if(act==='ag-carregou'){ const x=deId(v); if(x&&confirm('Marcar o pedido '+x.pedido+' como carregado?')) mudaStatus(v,'carregado','Carregado'); return; }
    if(act==='ag-cancelar'){ const x=deId(v); if(!x) return; const m=prompt('Cancelar o pedido '+x.pedido+'? Escreva o motivo (opcional):',''); if(m===null) return; mudaStatus(v,'cancelado','Cancelado'+(m.trim()?': '+m.trim():'')); return; }
    if(act==='ag-reabrir'){ const x=deId(v); if(!x) return; mudaStatus(v,x.data?'agendado':'aguardando','Reaberto'); return; }
    if(act==='ag-apagar'){ const x=deId(v); if(!x||!confirm('Apagar o pedido '+x.pedido+' dos agendamentos? Não dá para desfazer.')) return;
      P.db().collection(COL).doc(v).delete().then(()=>{ A.abertos=A.abertos.filter(y=>y._id!==v); A.fechados=A.fechados.filter(y=>y._id!==v); if(A.jan) A.jan.fechar(); P.toast('Pedido apagado.'); P.rerender(); }).catch(er=>P.erro(er)); return; }
  });
  document.addEventListener('toggle',e=>{ const d=e.target; if(d&&d.classList&&d.classList.contains('ag-pid')) A.pi[d.dataset.d]=d.open; },true);
  document.addEventListener('change',e=>{ if(e.target&&e.target.id==='ag-file'){ const fs=e.target.files; importar(fs); e.target.value=''; } });
  /* busca filtra sem redesenhar (o campo não perde o foco) e guarda o texto para o próximo desenho */
  document.addEventListener('input',e=>{ if(e.target&&(e.target.classList.contains('ag-pp')||e.target.id==='ag-data')&&e.target.closest('dialog.ag-jan')) janAtualiza(); });
  document.addEventListener('change',e=>{ if(e.target&&e.target.id==='ag-data'&&e.target.closest('dialog.ag-jan')) janAtualiza(); });
  document.addEventListener('input',e=>{ if(!e.target||e.target.id!=='ag-q') return; A.q=e.target.value;
    const ps=norm(A.q).split(/\s+/).filter(Boolean); document.querySelectorAll('#ag-corpo .ag-ln').forEach(l=>{ const t=l.dataset.b||''; l.style.display=ps.every(p=>t.includes(p))?'':'none'; });
    document.querySelectorAll('#ag-corpo .ag-dia').forEach(d=>{ d.style.display=[...d.querySelectorAll('.ag-ln')].some(l=>l.style.display!=='none')?'':'none'; }); });
  /* arrastar o PDF para a tela */
  const naTela=()=>P.S.view==='agendamentos';
  let arrT=0; const arrOff=()=>{ document.body.classList.remove('ag-arr'); };
  document.addEventListener('dragover',e=>{ if(!naTela()||!pode()) return; if(!(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files'))) return; e.preventDefault(); document.body.classList.add('ag-arr'); clearTimeout(arrT); arrT=setTimeout(arrOff,400); });
  document.addEventListener('drop',e=>{ if(!naTela()||!pode()) return; e.preventDefault(); arrOff(); importar(e.dataTransfer&&e.dataTransfer.files); });

  document.head.insertAdjacentHTML('beforeend',`<style>
  /* visual leve (24/11, 4ª: "muito grotesco, deixar mais leve"): sem caixas pesadas, poucas cores, o destaque é a semana em paletes */
  .ag-head{align-items:flex-end}.ag-acts{display:flex;gap:8px}.ag-imp{cursor:pointer;display:inline-flex;align-items:center;gap:8px}
  .ag-alt{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px}
  .ag-al1{all:unset;cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
  .ag-al1::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}.ag-al1:hover{text-decoration:underline}
  .ag-al1.warn{color:var(--warn)}.ag-al1.crit{color:var(--crit)}.ag-al1:focus-visible{outline:2px solid var(--teal);outline-offset:3px;border-radius:4px}
  .ag-drop{display:none}
  body.ag-arr .ag-drop{display:grid;place-items:center;position:fixed;inset:0;z-index:60;background:color-mix(in srgb,var(--ground) 85%,transparent)}
  body.ag-arr .ag-drop>div{display:flex;flex-direction:column;align-items:center;gap:4px;padding:36px 56px;border:2px dashed var(--teal);border-radius:18px;background:var(--surface);color:var(--teal-strong);pointer-events:none}
  .ag-drop b{font-size:18px;font-weight:600}.ag-drop span{color:var(--muted);font-size:14px}
  .ag-lendo{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:14px;color:var(--teal-strong)}
  .ag-spin{width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:agsp .8s linear infinite}@keyframes agsp{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){.ag-spin{animation:none}}
  /* semana */
  .ag-sem{margin:22px 0 18px}
  .ag-st{font-size:14px;font-weight:600;margin:0 0 8px}.ag-st span{font-weight:400;color:var(--muted);margin-left:6px}
  .ag-fx{display:grid;grid-template-columns:repeat(7,minmax(84px,1fr));gap:2px;overflow-x:auto;background:var(--surface);border-radius:14px;padding:6px}
  .ag-fxd{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:3px;padding:10px 12px 9px;border-radius:10px;min-width:0}
  .ag-fxd:hover{background:color-mix(in srgb,var(--teal) 6%,transparent)}.ag-fxd:focus-visible{outline:2px solid var(--teal);outline-offset:-2px}
  .ag-fxd small{font-size:12px;color:var(--muted);text-transform:capitalize;white-space:nowrap}
  .ag-fxd b{font-size:24px;line-height:1.1;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
  .ag-fxd em{font-size:11px;font-style:normal;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ag-fxd.vz b{color:color-mix(in srgb,var(--muted) 55%,transparent);font-weight:400}
  .ag-fxd.hj small{color:var(--teal-strong);font-weight:600}
  .ag-fxd.on{background:color-mix(in srgb,var(--teal) 11%,transparent)}
  .ag-bar1{display:block;height:3px;border-radius:2px;background:color-mix(in srgb,var(--muted) 14%,transparent);overflow:hidden}.ag-bar1>i{display:block;height:100%;border-radius:2px;background:var(--teal)}
  /* lista + bloco do lado */
  .ag-lay{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start;margin-top:18px}
  .ag-main{min-width:0}
  .ag-side{position:sticky;top:76px;display:flex;flex-direction:column;gap:14px}
  .ag-cal,.ag-tot2{background:var(--surface);border-radius:16px;padding:14px}
  .ag-ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.ag-ch b{font-size:14px;font-weight:600}
  .ag-mv{all:unset;cursor:pointer;width:30px;height:30px;display:grid;place-items:center;border-radius:8px;font-size:18px;color:var(--muted)}.ag-mv:hover{background:color-mix(in srgb,var(--teal) 8%,transparent)}.ag-mv:focus-visible{outline:2px solid var(--teal)}
  .ag-cg7{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
  .ag-cw{font-size:11px;color:var(--muted);text-align:center;padding:2px 0 4px}
  .ag-cd{all:unset;box-sizing:border-box;cursor:pointer;min-height:44px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:5px 1px 3px;gap:1px}
  .ag-cd.vz{cursor:default}.ag-cd b{font-size:13px;font-weight:500;color:var(--muted)}
  .ag-cd small{font-size:10.5px;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:-.02em}
  .ag-cd.tem b{color:inherit}.ag-cd.tem{background:color-mix(in srgb,var(--teal) 7%,transparent)}
  .ag-cd.atr small,.ag-cd.atr b{color:var(--crit)}.ag-cd.atr{background:color-mix(in srgb,var(--crit) 8%,transparent)}
  .ag-cd.hj b{color:var(--teal-strong);font-weight:700;text-decoration:underline;text-underline-offset:3px}
  .ag-cd:not(.vz):hover{background:color-mix(in srgb,var(--teal) 12%,transparent)}.ag-cd:focus-visible{outline:2px solid var(--teal);outline-offset:-1px}
  .ag-cd.on,.ag-cd.on:hover{background:var(--teal-strong)}.ag-cd.on b,.ag-cd.on small{color:#fff}
  .ag-th h3{margin:0;font-size:16px;font-weight:600}.ag-th h3 span{font-weight:400;font-size:13px;color:var(--muted);margin-left:4px}.ag-th p{margin:2px 0 0;font-size:13px;color:var(--muted)}
  .ag-tl{list-style:none;margin:12px 0 0;padding:0}
  .ag-tl li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent)}
  .ag-ti{min-width:0;display:flex;flex-direction:column}.ag-ti b{font-size:13px;font-weight:600}.ag-ti span{font-size:12px;color:var(--muted);line-height:1.3}
  .ag-tv{text-align:right;white-space:nowrap;display:flex;flex-direction:column}.ag-tv b{font-size:16px;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums}.ag-tv b small{font-size:11px;font-weight:500;color:var(--muted)}
  .ag-tv span{font-size:12px;color:var(--muted)}
  .ag-tf{display:flex;flex-direction:column;gap:1px;margin-top:6px;padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--teal) 9%,transparent)}
  .ag-tf span{font-size:12.5px;color:var(--muted)}.ag-tf b{font-size:24px;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums;line-height:1.2}
  .ag-tf em{font-style:normal;font-size:15px;font-weight:600;color:var(--teal-strong)}.ag-tf small{font-size:12px;color:var(--muted);margin-top:2px}
  .ag-vd{margin-top:10px;font-size:13px}.ag-emp{color:var(--text,inherit);font-weight:600}
  .ag-tfe{margin-top:8px;display:flex;flex-direction:column;gap:3px}.ag-tfe div{display:flex;justify-content:space-between;gap:10px;font-size:13px}.ag-tfe span{color:var(--muted)}.ag-tfe b{font-size:13.5px;font-weight:600;color:var(--teal-strong);line-height:1.4}.ag-tvl{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
  .ag-tfv{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;padding-top:8px;border-top:1px solid color-mix(in srgb,var(--teal) 25%,transparent)}.ag-tfv span{font-size:12.5px;color:var(--muted)}.ag-tfv b{font-size:17px;font-weight:600;color:inherit;font-variant-numeric:tabular-nums}
  @media (max-width:1180px){.ag-lay{grid-template-columns:minmax(0,1fr) 300px}}
  @media (max-width:980px){.ag-lay{grid-template-columns:1fr}.ag-side{position:static;order:-1}}
  /* lista */
  .ag-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.ag-q{flex:1;min-width:200px;max-width:320px;margin-left:auto;height:38px}
  .ag-dm{margin:4px 2px 4px;font-size:12px;color:var(--muted)}
  .ag-fil{margin:8px 0;font-size:13px;color:var(--muted)}.ag-fil b{color:var(--teal-strong);font-weight:600}
  .ag-ln{display:grid;grid-template-columns:118px minmax(0,1fr) 120px 104px;gap:14px;align-items:center;padding:11px 10px;border-radius:10px;cursor:pointer}
  .ag-ln+.ag-ln{box-shadow:0 -1px 0 color-mix(in srgb,var(--line) 70%,transparent)}
  .ag-ln:hover{background:color-mix(in srgb,var(--teal) 4%,transparent)}.ag-ln.sel{background:color-mix(in srgb,var(--teal) 8%,transparent)}
  .ag-ln.atr .ag-pd b{color:var(--crit)}
  .ag-pd{display:flex;gap:10px;align-items:center;min-width:0}.ag-pd b{white-space:nowrap;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
  .ag-ck{width:18px;height:18px;accent-color:var(--teal-strong);cursor:pointer;flex:none;opacity:.55}.ag-ck:checked,.ag-ln:hover .ag-ck,.ag-ck:focus-visible{opacity:1}
  .ag-cl{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ag-cl i{color:var(--muted);font-weight:400}
  .ag-sub{color:var(--muted);font-size:12.5px;margin-top:1px;overflow-wrap:anywhere}.ag-pls{color:var(--text,inherit)}
  .ag-wn{color:var(--warn);font-weight:600}.ag-wn.c{color:var(--crit)}
  .ag-stx{font-weight:600}.ag-stx.ok{color:var(--ok)}.ag-stx.crit{color:var(--crit)}
  .ag-obs{font-size:12.5px;margin-top:3px;color:var(--muted);font-style:italic}
  .ag-qt{text-align:right;font-size:13.5px;color:var(--muted);font-variant-numeric:tabular-nums}
  .ag-pa{text-align:right;white-space:nowrap}.ag-pa b{font-size:16px;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums}.ag-pa small{font-size:11px;color:var(--muted)}
  .ag-ac{text-align:right}
  .ag-bt{all:unset;box-sizing:border-box;cursor:pointer;font-size:13px;font-weight:600;color:var(--teal-strong);padding:7px 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--teal) 35%,transparent);white-space:nowrap}
  .ag-bt:hover{background:color-mix(in srgb,var(--teal) 9%,transparent)}.ag-bt:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
  .ag-bt.sec{border-color:var(--line);color:var(--muted)}
  .ag-dia{margin-top:22px}
  .ag-dh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;padding:0 10px 8px;border-bottom:1px solid var(--line)}
  .ag-dh h3{margin:0;font-size:16px;font-weight:600}.ag-dh h3 span{font-weight:400;color:var(--muted);font-size:13px;margin-left:4px}
  .ag-dia.hj .ag-dh h3{color:var(--teal-strong)}.ag-dia.atr .ag-dh h3{color:var(--crit)}
  .ag-dt2{font-size:13px;color:var(--muted)}.ag-tp{color:var(--teal-strong);font-weight:600}
  .ag-atx{margin:6px 10px 0;font-size:12px;color:var(--crit)}
  .ag-sp{font-size:12px;color:var(--warn)}
  .ag-pid{margin:8px 10px 2px}.ag-pih{font-size:12.5px;color:var(--muted);font-weight:500}
  .ag-qi{margin:0 0 20px}
  .ag-qit{width:100%;border-collapse:collapse;font-size:13px;background:var(--surface);border-radius:14px;overflow:hidden}
  .ag-qit th{font-size:12px;font-weight:500;color:var(--muted);text-align:left;padding:10px 12px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
  .ag-qit th small{display:block;font-weight:400}.ag-qit th.atr{color:var(--crit)}
  .ag-qit td{padding:8px 12px;border-bottom:1px solid color-mix(in srgb,var(--line) 55%,transparent);vertical-align:top}
  .ag-qit td:first-child,.ag-qit th:first-child{min-width:200px;width:42%}.ag-qit th.dir,.ag-qit td.dir{min-width:84px}.ag-qit td:first-child b{font-weight:600;margin-right:6px}.ag-qit td:first-child span{color:var(--muted)}
  .ag-qit .dir{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .ag-qit td.dir b{display:block;font-weight:600;color:var(--teal-strong)}.ag-qit td.dir small{display:block;font-size:11px;color:var(--muted)}
  .ag-qtt{background:color-mix(in srgb,var(--teal) 6%,transparent)}.ag-qit td.ag-qtt b{font-size:15px}
  .ag-qit tfoot td{border-bottom:0;font-weight:600}.ag-qit tfoot td.dir b{color:var(--teal-strong)}
  .ag-cgb{margin-top:10px}
  .ag-cgh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;padding:4px 10px;font-size:12.5px;color:var(--muted)}
  .ag-cgt b{color:var(--text,inherit);font-weight:600}.ag-cgb.sem .ag-cgt b{font-weight:500;color:var(--muted)}
  .ag-dnum{color:var(--teal-strong);font-weight:600}
  .ag-cgs{display:flex;gap:10px;align-items:baseline}.ag-cge{font-size:12.5px}
  .ag-dica{color:var(--muted);font-size:12px;margin:8px 4px 0}
  .ag-pit{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
  .ag-pit th{font-size:12px;font-weight:500;color:var(--muted);text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)}
  .ag-pit td{padding:5px 8px;border-bottom:1px solid color-mix(in srgb,var(--line) 55%,transparent)}.ag-pit td span{color:var(--muted)}
  .ag-pit .dir{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.ag-pit td b{font-weight:600}.ag-pit td:last-child b{color:var(--teal-strong)}
  .ag-pit em{color:var(--warn);font-style:normal}.ag-pit tfoot td{border-bottom:0;font-weight:600;padding-top:7px}
  /* marcados */
  .ag-mk{position:sticky;bottom:12px;z-index:5;display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:16px;padding:10px 12px 10px 16px;border-radius:14px;background:var(--surface);border:1px solid color-mix(in srgb,var(--teal) 35%,transparent);box-shadow:0 10px 28px -16px rgba(10,30,40,.45)}
  .ag-mk>span:first-child{flex:1;min-width:200px;font-size:13.5px}.ag-mk>span:first-child b{font-weight:600}.ag-mkt{font-size:13.5px;color:var(--muted)}.ag-mkt b{color:var(--teal-strong);font-weight:600}
  .ag-mkb{display:flex;gap:14px;align-items:center}
  /* janela */
  dialog.pc-jan.ag-jan{max-width:1000px}
  .ag-jg{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(240px,1fr);gap:28px;align-items:start}
  .ag-fm{gap:14px}
  .ag-sc{align-self:flex-start;margin-top:6px;border:0;background:transparent;padding:2px 0;font-size:12.5px;cursor:pointer;color:var(--teal-strong);text-decoration:underline;text-underline-offset:2px}
  .ag-sc.on{text-decoration:none;font-weight:600}.ag-ec{display:block}.ag-sn{font-weight:400;color:var(--muted)}
  .ag-dtw{display:flex;flex-direction:column;gap:6px}.ag-lb{font-size:13px;font-weight:600}
  .ag-dtl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ag-dtl>input{width:160px}
  .ag-atl{display:flex;gap:4px;flex-wrap:wrap}
  .ag-atb{display:inline-flex;gap:5px;align-items:baseline;padding:6px 10px;border-radius:8px;border:1px solid transparent;background:transparent;cursor:pointer;color:inherit;font:inherit}
  .ag-atb b{font-size:13px;font-weight:500}.ag-atb small{font-size:12px;color:var(--muted)}.ag-atb:hover{background:color-mix(in srgb,var(--teal) 7%,transparent)}
  .ag-atb.on{border-color:color-mix(in srgb,var(--teal) 45%,transparent);background:color-mix(in srgb,var(--teal) 9%,transparent)}.ag-atb.on b{color:var(--teal-strong);font-weight:600}
  .ag-res{position:sticky;top:0;display:flex;flex-direction:column;gap:18px;padding-left:22px;border-left:1px solid var(--line)}
  .ag-rl{font-size:12.5px;color:var(--muted)}
  .ag-pbig{font-size:30px;font-weight:600;line-height:1.15;color:var(--teal-strong);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
  .ag-run{font-size:14px;margin-top:2px}
  .ag-rw{margin-top:6px;font-size:12px;color:var(--warn)}
  .ag-rs{display:flex;flex-direction:column;gap:2px;margin-top:10px;font-size:13px;color:var(--muted)}
  .ag-f{color:var(--crit);font-weight:600}.ag-okt{color:var(--ok);font-weight:600}
  .ag-dv{margin:4px 0 0;font-size:13px;color:var(--muted)}.ag-dv b{color:var(--teal-strong);font-weight:600}
  .ag-jan .pc-jb>*{flex-shrink:0}.ag-jan .ag-h3{margin:8px 0 0;font-size:14px;font-weight:600}
  .ag-it td,.ag-it th{font-size:13px;padding-top:7px;padding-bottom:7px}
  .ag-prod{display:flex;flex-direction:column;min-width:220px}.ag-prod b{font-size:12px;color:var(--muted);font-weight:500}.ag-prod span{line-height:1.3}
  .ag-nq{white-space:nowrap;font-variant-numeric:tabular-nums}.ag-nq small{color:var(--muted)}
  .ag-pp{width:66px;height:30px;text-align:right;padding:3px 8px}.ag-pp.vz{border-color:color-mix(in srgb,var(--warn) 60%,transparent)}
  .ag-it .ag-pl{font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums}
  .ag-cpl{display:flex;flex-direction:column}.ag-cpl>div{display:grid;grid-template-columns:90px minmax(0,1fr) auto 100px;gap:12px;padding:8px 2px;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent);font-size:13px;align-items:center}
  .ag-cpl>div:first-child{border-top:0}.ag-cpl>div>b{font-weight:600}.ag-cpl>div>b:last-child{text-align:right}.ag-q1{color:var(--teal-strong)}
  .ag-hist summary{cursor:pointer;color:var(--muted);font-size:13px}.ag-apg{color:var(--crit)}
  @media (max-width:1100px){.ag-ln{grid-template-columns:104px minmax(0,1fr) 110px 96px;gap:10px}}
  @media (max-width:900px){.ag-jg{grid-template-columns:1fr}.ag-res{position:static;padding-left:0;border-left:0;border-top:1px solid var(--line);padding-top:14px}}
  @media (max-width:760px){.ag-ln{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"pd mid ac" ". qt qt";row-gap:4px}
    .ag-pd{grid-area:pd}.ag-mid{grid-area:mid}.ag-qt{grid-area:qt;text-align:left}.ag-ac{grid-area:ac}
    .ag-cl{white-space:normal;overflow-wrap:anywhere}.ag-q{max-width:none;margin-left:0}.ag-fx{grid-template-columns:repeat(7,92px)}
    .ag-pit th:nth-child(3),.ag-pit td:nth-child(3){display:none}.ag-pit td span{display:block;font-size:12px}
    .ag-cpl>div{grid-template-columns:70px minmax(0,1fr) 90px}.ag-cpl>div>span:nth-of-type(2){display:none}}
  </style>`);

  P.registrarModulo({ id:'agend', nome:'Agendamentos', ic:'agendar',
    telas:{ agendamentos:{ nome:'Agendamentos', mob:'Agendar', render:vTela } },
    iniciar:carregar });
})();
