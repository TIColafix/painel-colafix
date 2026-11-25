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
   de uma, por EMPRESA (empresa do cabeçalho do PDF, `empresa:{cod,nome}`, mostrada em cada pedido).
   24/11 (8ª): busca nos itens do dia (#ag-tq, sem redesenhar); em cada item, a quantidade de CADA EMPRESA com o saldo daquela empresa
   no PDF mais recente e "transferir N" quando falta (item.trf); "Baixar PDF do dia" (pdfDia, Painel.pdf: total, itens, por empresa,
   transferências, pedidos e cargas).
   25/11 ("pode fazer tudo"): PLANO de estoque (saldo total = base do PCP pcpbase/itens ou soma dos PDFs, consumido em ordem de data/ordem/
   carga; produção = S.ordens abertas antes do dia), limite de paletes/dia, veículo (capacidade pal/kg) e peso pela descrição, dias úteis
   (feriados do painel, sábado opcional), Ajustes do módulo (config/agendamentos), situação separado/chegou/carregou com hora, motivo do
   atraso, ordem de carregamento, horário, placa, telefone da transportadora, arrastar para o calendário, entrega parcial (id -r2),
   colar texto, pedido repetido, diferença ao reimportar, PDF de separação, PDF da semana, planilha CSV, aba Indicadores (query por
   carregadoEm), só ver por módulo (soVerMods), carga em cartão, calendário com intensidade, abas no celular, atalhos.
   25/11 (ajustes da Iasmyn): "Reagendar" + reag[] ("reagendado · era 24/11", Indicadores, planilha); a TV saiu e o bloco do lado virou a
   aba CALENDÁRIO (agcal: calendário grande + painel do dia com carregado × pendente por item e por carga). A lista ocupa a largura toda. */
(function(){ const P=window.Painel; if(!P) return;
  if(P.icone) P.icone('agendar','<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>');
  if(P.icone) P.icone('caminhao2','<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>');
  const COL='agendamentos', PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const A={abertos:[],fechados:[],cfg:{transps:[],pp:{}},lido:{a:false,f:false},aba:'aguardando',emp:'',dia:'',cal:'',mes:'',sel:new Set(),pi:{},q:'',lendo:'',jan:null,ed:null};
  window.__agend=A;
  const esc=P.esc, U=()=>P.ui, hoje=()=>P.hojeStr();
  const eu=()=>(P.S.nomes||{})[P.S.uid]||P.nomeDe(P.S.uid)||'';
  /* só ver: perfil só leitura OU o módulo em "só ver" para a pessoa (Equipe e cargos › soVerMods; ex.: o faturamento) */
  const pode=()=>{ if(P.soVer()) return false; const d=P.S.acs&&P.S.acs.doc; return !(d&&!(P.S.acs&&P.S.acs.dono)&&(d.soVerMods||[]).includes('agend')); };
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
  /* a conta usa a PENDENTE do Focco (o que falta carregar: quantidade − atendida − cancelada; confirmado com a Iasmyn em 24/11) */
  const falta=i=>Math.max(0,(+i.pend||0)-Math.max(0,+i.saldo||0));
  const semSaldo=x=>(x.itens||[]).filter(i=>falta(i)>0);

  /* ---------- banco ---------- */
  function carregar(){ if(!P.db()) return;
    P.inscrever('agend-abertos',()=>P.db().collection(COL).where('aberto','==',true).limit(600),s=>{ A.abertos=s.docs.map(d=>normaliza(Object.assign({_id:d.id},d.data()))); A.lido.a=true; P.rerender(); });
    /* base do PCP ao vivo: a importação de saldo nova atualiza o plano e dispara o aviso da análise */
    P.inscrever('agend-base',()=>P.db().doc('pcpbase/itens'),g=>{ A.base=g&&g.exists?g.data():null; A._pl=null; P.rerender(); });
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
  /* reimportar: o que mudou nos itens (pendente e saldo) — vai para o histórico e para o aviso */
  function difItens(velhos,novos){ const m={}, out=[]; (velhos||[]).forEach(i=>{ m[String(i.cod).toUpperCase()]=i; });
    (novos||[]).forEach(i=>{ const v=m[String(i.cod).toUpperCase()]; if(!v){ out.push(i.cod+' entrou ('+fN(i.pend)+')'); return; } delete m[String(i.cod).toUpperCase()]; if(+v.pend!==+i.pend) out.push(i.cod+': '+fN(v.pend)+' → '+fN(i.pend)); });
    Object.values(m).forEach(i=>out.push(i.cod+' saiu')); return out; }
  async function salvarLido(R,arquivo){ const ps=R.pedidos&&R.pedidos.length?R.pedidos:[R.pedido], id=docId(ps.join('_')), x=deId(id);
    /* o mesmo pedido em outro agendamento aberto (ex.: sozinho e dentro de uma carga de vários) */
    const dup=A.abertos.filter(y=>y._id!==id&&!(y.parcial&&y.parcial.de===id)&&pedList(y).some(p=>ps.includes(p)));
    if(dup.length) setTimeout(()=>P.toast('Atenção: '+ps.filter(p=>dup.some(y=>pedList(y).includes(p))).join(', ')+' também está em '+dup.map(pedCurto).join(', ')+'.'),900);
    const o={...(R.empresa?{empresa:R.empresa}:{}),pedido:R.pedido,pedidos:ps,...(ps.length>1&&!x?{ehCarga:true}:{}),itens:R.itens,total:R.total,relData:R.relData,arquivo};
    if(!x){ Object.assign(o,{cliente:R.cliente||'',carga:'',transp:'',obs:'',data:'',status:'aguardando',aberto:true}); return grava(id,o,'Importado do PDF do Focco'); }
    if(R.cliente&&!x.cliente) o.cliente=R.cliente;
    const dif=difItens(x.itens,R.itens); if(dif.length) setTimeout(()=>P.toast('Pedido '+pedCurto(x)+': '+dif.slice(0,4).join(' · ')+(dif.length>4?'…':'')),600);
    return grava(id,o,'Itens atualizados pelo PDF do Focco'+(R.relData?' ('+br(R.relData.slice(0,10))+')':'')+(dif.length?': '+dif.join(' · '):': sem mudança nas quantidades')); }
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
  function soma(xs){ const r={un:{},it:[],pal:0,semPal:[],n:xs.length,val:0,kg:0,semKg:0}, m=new Map();
    xs.forEach(x=>{ r.val+=+x.total||0; (x.itens||[]).forEach(i=>{ const q=qtdDe(i); if(!(q>0)) return; const c=String(i.cod).toUpperCase();
      const u=i.un||'un'; r.un[u]=(r.un[u]||0)+q; const o=m.get(c)||{cod:i.cod,desc:i.desc,un:u,q:0,pp:0,kg:0}; o.q+=q; const ku=kgUn(i.desc); o.kg+=q*ku; r.kg=(r.kg||0)+q*ku; if(!ku) r.semKg=(r.semKg||0)+1; o.v=(o.v||0)+(+i.qtd>0?(+i.valor||0)*q/(+i.qtd):(+i.valor||0)); if(!o.pp) o.pp=ppDe(i);
      /* empresa: quanto o pedido pede e o saldo daquela empresa no PDF mais recente (para saber o que transferir) */
      const ek=empTxt(x)||'Sem empresa', e=(o.emp=o.emp||{})[ek]||(o.emp[ek]={q:0,saldo:null,rel:''}); e.q+=q;
      if(e.saldo==null||String(x.relData||'')>=e.rel){ e.saldo=+i.saldo||0; e.rel=String(x.relData||''); } m.set(c,o); }); });
    r.it=[...m.values()].map(o=>Object.assign(o,{pal:o.pp>0?o.q/o.pp:null,trf:Object.entries(o.emp||{}).map(([k,e])=>({emp:k,q:e.q,saldo:e.saldo,falta:Math.max(0,e.q-Math.max(0,e.saldo||0))}))})).sort((a,b)=>(b.pal||0)-(a.pal||0)||b.q-a.q);
    r.vp=0; r.it.forEach(o=>{ r.vp+=o.v||0; if(o.pal!=null) r.pal+=o.pal; else r.semPal.push(o.cod); }); return r; }
  const unTxt=r=>Object.keys(r.un).sort((a,b)=>r.un[b]-r.un[a]).map(u=>fN(r.un[u])+' '+u).join(' · ')||'0';
  const palTxt=r=>!(r.pal>0)&&r.semPal.length?'palete ?':fP(r.pal)+' palete'+(Math.floor(r.pal*100+1e-6)===100?'':'s');
  const semPalTxt=r=>r.semPal.length?r.semPal.length+' ite'+(r.semPal.length>1?'ns':'m')+' sem palete cadastrado':'';
  const cargaTxt=x=>x.carga?'Carga '+x.carga:x.semCarga?'Sem carga':'';
  /* empresa do pedido (cabeçalho do PDF do Focco: "Empresa: 1 - COLFIX INDUSTRIA E COMERCIO LTDA") */
  const empCurto=e=>{ const w=String(e&&e.nome||'').trim().split(/\s+/)[0]||''; return w?w[0].toUpperCase()+w.slice(1).toLowerCase():''; };
  const empTxt=x=>x.empresa&&x.empresa.cod?'Empresa '+x.empresa.cod+(empCurto(x.empresa)?' ('+empCurto(x.empresa)+')':''):'';
  /* filtro de empresa (24/11: "um filtro de empresa pra mim entrar nos pedidos"): vale para a lista, as abas, o calendário e o PDF */
  const empK=x=>empTxt(x)||'Sem empresa';
  /* vincular empresa à mão (24/11: "os que estão sem empresa posso vincular?"): lista das empresas que já vieram nos PDFs */
  function empConhecidas(){ const m=new Map(); todos().forEach(x=>{ if(x.empresa&&x.empresa.cod&&!m.has(String(x.empresa.cod))) m.set(String(x.empresa.cod),x.empresa); });
    (A.cfg.empresas||[]).forEach(e=>{ if(e&&e.cod&&!m.has(String(e.cod))) m.set(String(e.cod),e); });
    return [...m.values()].sort((a,b)=>String(a.cod).localeCompare(String(b.cod),'pt-BR',{numeric:true})); }
  function empCampo(atual,manter){ const ls=empConhecidas(), cod=atual&&atual.cod?String(atual.cod):(manter?'__manter':'');
    return `<label class="pc-campo pc-c6"><span>Empresa</span><select id="ag-empsel">${manter?'<option value="__manter" selected>Manter a de cada pedido</option>':''}<option value=""${!manter&&!cod?' selected':''}>Sem empresa</option>${ls.map(e=>`<option value="${esc(e.cod)}"${cod===String(e.cod)?' selected':''}>${esc(empTxt({empresa:e}))}</option>`).join('')}<option value="__outra">Outra…</option></select>
      <input id="ag-empnova" type="text" placeholder="Código - nome (ex.: 9 - FIXCOL INDUSTRIA)" hidden autocomplete="off"><em>${atual&&atual.cod?'':'Vem do PDF do Focco; aqui dá para escolher à mão.'}</em></label>`; }
  /* lê o campo: undefined = não mexer; null = sem empresa; {cod,nome} */
  function empLida(){ const sel=A.jan&&A.jan.el.querySelector('#ag-empsel'); if(!sel) return undefined; const v=sel.value;
    if(v==='__manter') return undefined; if(!v) return null;
    if(v==='__outra'){ const t=val('#ag-empnova'), m=t.match(/^\s*(\d+)\s*[-–]?\s*(.*)$/); if(!m){ P.toast('Digite a empresa como "código - nome", ex.: 9 - FIXCOL.'); return false; } return {cod:m[1],nome:(m[2]||'').trim().toUpperCase()}; }
    return empConhecidas().find(e=>String(e.cod)===v)||{cod:v,nome:''}; }
  /* filtros da tela: empresa e "só as cargas do diário de bordo" (25/11, ajuste: "filtro somente as cargas do diário, inclusive para
     saber se vai ter material para os pedidos do diário") — com o do diário ligado, o plano de estoque também conta só esses pedidos */
  /* CLASSIFICAÇÃO = tipo de produto (25/11, ajuste "filtro de classificação"; a Iasmyn escolheu "tipo de produto"): pela descrição do
     Focco — ARGAMASSA + CINZA/BRANCA/…, REJUNTE, PRIMER… (1ª palavra; argamassa leva a 2ª). Com o filtro, o pedido entra se tiver o tipo
     e as quantidades/paletes contam SÓ os itens daquele tipo (cópia do pedido com os itens filtrados; gravar usa sempre o original). */
  const tc=t=>String(t||'').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
  function classeDe(i){ const w=String(i&&i.desc||'').toUpperCase().replace(/[^A-ZÀ-Ú0-9 ]/g,' ').trim().split(/\s+/); if(!w[0]) return String(i&&i.cod||'').replace(/\d+.*$/,'')||'Outros';
    if(/^ARGAMASS/.test(w[0])&&w[1]&&!/^\d/.test(w[1])&&!/^AC\d/.test(w[1])) return tc(w[0]+' '+w[1]); return tc(w[0]); }
  const classesOpc=()=>{ const m={}; todos().forEach(x=>(x.itens||[]).forEach(i=>{ const c=classeDe(i); m[c]=(m[c]||0)+1; })); return Object.keys(m).sort((a,b)=>a.localeCompare(b,'pt-BR')); };
  /* DIAS (25/11, ajuste "filtro de dias"): hoje, amanhã, esta semana, próximos 7 dias ou de/até */
  function perDias(){ const t=A.per&&A.per.t, h=hoje(); if(!t) return null; if(t==='hoje') return [h,h]; if(t==='amanha'){ const d=addD(h,1); return [d,d]; }
    if(t==='semana'){ const w=new Date(h+'T12:00:00').getDay(), seg=addD(h,-(w===0?6:w-1)); return [seg,addD(seg,6)]; } if(t==='prox7') return [h,addD(h,6)];
    if(t==='datas') return [A.per.de||'0000-00-00',A.per.ate||'9999-12-31']; return null; }
  const naPer=x=>{ const r=perDias(); if(!r) return true; return !!x.data&&x.data>=r[0]&&x.data<=r[1]; };
  const fE=xs=>{ if(A.emp) xs=xs.filter(x=>empK(x)===A.emp); if(A.soDiario) xs=xs.filter(x=>String(x.diario||'').trim()); if(A.soFat) xs=xs.filter(x=>x.fat&&x.aberto);
    if(A.cls) xs=xs.filter(x=>(x.itens||[]).some(i=>classeDe(i)===A.cls)).map(x=>Object.assign({},x,{itens:(x.itens||[]).filter(i=>classeDe(i)===A.cls),_cls:A.cls})); return xs; };
  const temFiltro=()=>!!(A.emp||A.soDiario||A.soFat||A.cls||A.per||A.q||A.dia||A.tq);
  /* COPIAR os números dos pedidos (25/11, ajuste "copiar os pedidos"): "169992,169988,170028" — o formato do filtro do Focco */
  async function copiar(xs,oque){ const ns=[...new Set(xs.flatMap(x=>pedList(x)))]; if(!ns.length){ P.toast('Nenhum pedido para copiar.'); return; } const t=ns.join(',');
    let ok=false; try{ if(navigator.clipboard&&window.isSecureContext){ await navigator.clipboard.writeText(t); ok=true; } }catch(e){}
    if(!ok){ try{ const a=document.createElement('textarea'); a.value=t; a.setAttribute('readonly',''); a.style.cssText='position:fixed;left:-9999px;top:0'; document.body.appendChild(a); a.select(); ok=document.execCommand('copy'); a.remove(); }catch(e){} }
    window.__agendCopiado=t; P.toast(ok?(ns.length+' pedido'+(ns.length>1?'s':'')+' copiado'+(ns.length>1?'s':'')+(oque?' ('+oque+')':'')+': '+(t.length>60?t.slice(0,60)+'…':t)):'Não deu para copiar automaticamente: '+t); }
  const empOpcoes=()=>[...new Set(todos().map(empK))].sort((a,b)=>a==='Sem empresa'?1:b==='Sem empresa'?-1:a.localeCompare(b,'pt-BR',{numeric:true}));
  const diarioTxt=x=>x.diario?'Diário nº '+x.diario:'';
  /* tabela "paletes por item" de um grupo (dia, carga ou pedidos marcados) */
  function porItem(r,o){ o=o||{}; if(!r.it.length) return '';
    return `<div class="pc-rola"><table class="ag-pit"><thead><tr><th>Item</th><th class="dir">Quantidade</th><th class="dir">Por palete</th><th class="dir">Paletes</th></tr></thead><tbody>${r.it.map(i=>`<tr><td><b>${esc(i.cod)}</b> <span>${esc(i.desc||'')}</span></td><td class="dir">${fN(i.q)} ${esc(i.un)}</td><td class="dir">${i.pp>0?fN(i.pp):'<em>sem palete</em>'}</td><td class="dir"><b>${i.pal!=null?fP(i.pal):'—'}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="dir">${esc(unTxt(r))}</td><td></td><td class="dir"><b>${!(r.pal>0)&&r.semPal.length?'—':esc(fP(r.pal))}</b></td></tr></tfoot></table></div>`; }

  /* ---------- janela do pedido (25/11: estoque pelo plano + produção, veículo, placa, horário, motivo do atraso, abas no celular) ---------- */
  /* pendente 0: cancelado (Qtd. Cancelada) ou já atendido — não confundir (24/11: AC0003 com 90 cancelados aparecia "Atendido") */
  function estoqueSelo(i,x,pl){ if((+i.pend||0)<=0) return (+i.canc||0)>0&&(+i.canc||0)>=(+i.atend||0)?U().selo('Cancelado '+fN(i.canc),'crit'):U().selo('Atendido','ok');
    const r=pl&&x?faltaPl(pl,x,i):null;
    if(r){ if(r.falta>0) return U().selo('Falta '+fN(r.falta),r.disp>0?'warn':'crit'); if(r.faltaSemProd>0) return U().selo('Com a produção','info'); return U().selo('Tem','ok'); }
    const f=falta(i); return f>0?U().selo('Falta '+fN(f),(+i.saldo||0)>0?'warn':'crit'):U().selo('Tem','ok'); }
  function itensTab(x,pl){ const its=x.itens||[];
    if(!its.length) return '<div class="empty">Sem itens.</div>';
    return `<div class="pc-rola ag-itw"><table class="pc-tab ag-it"><thead><tr><th>Produto</th><th class="dir">Pendente</th><th class="dir">Saldo</th><th>Estoque</th><th class="dir">Por palete</th><th class="dir">Paletes</th></tr></thead><tbody>${its.map((i,k)=>{ const pp=ppDe(i), cad=ppCad(i.cod), st=saldoTotal(i.cod), r=pl?faltaPl(pl,x,i):null, pr=(r&&r.faltaSemProd>0)||falta(i)>0?prodDe(i.cod):[];
      return `<tr><td><div class="ag-prod"><b>${esc(i.cod)}</b><span>${esc(i.desc)}</span></div></td><td class="dir ag-nq">${fN(i.pend)} <small>${esc(i.un||'')}</small>${(+i.canc||0)>0||(+i.atend||0)>0?`<small class="ag-qx">de ${fN(i.qtd)}${(+i.atend||0)>0?' · atendido '+fN(i.atend):''}${(+i.canc||0)>0?' · cancelado '+fN(i.canc):''}</small>`:''}</td>
        <td class="dir ag-nq">${fN(i.saldo)}${st.fonte==='base'&&Math.round(st.q)!==Math.round(+i.saldo||0)?`<small class="ag-qx" title="Saldo das empresas na base do PCP de ${esc(br(st.em.slice(0,10)))}">base ${fN(st.q)}</small>`:''}</td>
        <td>${estoqueSelo(i,x,pl)}${r&&r.falta>0&&r.falta>falta(i)?'<small class="ag-qx">com os pedidos antes deste</small>':''}${pr.length?`<small class="ag-qx ag-prq">Produção: ${esc(prodTxt(pr))}</small>`:''}</td>
        <td class="dir"><input class="txt ag-pp${pp>0?'':' vz'}" type="number" min="0" step="1" inputmode="numeric" data-k="${k}" value="${pp>0?pp:''}" placeholder="—" aria-label="${esc(i.un||'')} por palete de ${esc(i.cod)}" title="${cad?'Ajustes › Itens: '+cad+' por palete':'Sem palete em Ajustes › Itens: digite quantos '+esc(i.un||'')+' vão num palete'}"${pode()?'':' disabled'}></td>
        <td class="dir ag-pl" data-k="${k}">${pp>0&&qtdDe(i)>0?fP(qtdDe(i)/pp):'—'}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="ag-dica">Saldo do PDF${x.relData?' de '+esc(br(x.relData.slice(0,10))+(x.relData.length>10?' às '+x.relData.slice(11):'')):''}${baseEm()?' · base do PCP de '+esc(br(baseEm().slice(0,10))+' '+baseEm().slice(11)):''}. Agendado, o estoque conta os pedidos que carregam antes e a produção programada até o dia. "Por palete" vem de Ajustes › Itens.</p>`; }
  /* resumo à direita: paletes, quantidade, peso, estoque */
  function totpHtml(x){ const r=soma([x]), n=(x.itens||[]).length, ss=faltasDe(x);
    return `<div class="ag-rl">Total a carregar</div><div class="ag-pbig">${esc(palTxt(r))}</div><div class="ag-run">${esc(unTxt(r))}${r.kg?' · '+esc(fKg(r.kg)):''}</div>
      ${fora(r).length?`<div class="ag-rw">Sem palete (ficam na unidade): ${esc(foraTxt(r))}</div>`:''}
      <div class="ag-rs"><span>${n} ite${n>1?'ns':'m'} · ${esc(fR(x.total))}</span>${ss.length?`<b class="ag-f">${ss.length} sem estoque suficiente</b>`:'<b class="ag-okt">todos com estoque</b>'}</div>`; }
  function itensJan(x){ const its=(x.itens||[]).map(i=>Object.assign({},i)); if(!A.jan) return its;
    A.jan.el.querySelectorAll('.ag-pp').forEach(inp=>{ const i=its[+inp.dataset.k]; if(!i) return; const v=Math.round(+String(inp.value).replace(',','.')||0);
      if(v>0&&v!==ppCad(i.cod)) i.pp=v; else delete i.pp; }); return its; }
  function transps(){ const s=new Set((A.cfg.transps||[]).filter(Boolean)); todos().forEach(x=>{ if(x.transp) s.add(x.transp); }); return [...s].sort((a,b)=>a.localeCompare(b,'pt-BR')); }
  const atl=d=>{ const h=hoje(); return d===h?'Hoje':d===addD(h,1)?'Amanhã':semana(d)[0].toUpperCase()+semana(d).slice(1); };
  /* atalhos de data: os próximos dias úteis de expedição */
  function atalhos(){ const h=hoje(), ds=[]; let d=diaUtil(h)?h:proxUtil(h,0); while(ds.length<4){ ds.push(d); d=proxUtil(d,1); } return ds; }
  const MOTIVOS=['Falta de material','Produção atrasou','Transportadora não veio','Cliente pediu para mudar','Caminhão sem espaço','Outro'];
  /* campos da carga (iguais na janela do pedido e em "Montar carga") */
  function camposCarga(c,o){ const u=U(), sc=!!c.semCarga&&!c.carga, tl=transps(), tel=(A.cfg.tels||{})[c.transp||'']||'', vs=veics(), h=hoje();
    return `<label class="pc-campo pc-c6 ag-cg"><span>Carga do sistema</span><input id="ag-carga" type="text" value="${esc(c.carga||'')}" placeholder="${sc?'Sem carga por enquanto':'Nº da carga no Focco'}"${sc?' disabled':''}>
        <button type="button" class="ag-sc${sc?' on':''}" data-act="ag-semcarga" aria-pressed="${sc}">${sc?'✓ ':''}Sem carga por enquanto</button>${o.ehc||''}</label>
      ${u.campo({r:'Ordem no diário de bordo',id:'ag-diario',v:c.diario||'',col:6,im:'numeric',ph:'Nº do caminhão no diário',dica:o.carga?'':'Vale para todos os pedidos da mesma carga.'})}
      <label class="pc-campo pc-c6"><span>Transportadora</span><input id="ag-transp" type="text" list="ag-tl" value="${esc(c.transp||'')}" placeholder="Escolha ou digite" autocomplete="off">
        <datalist id="ag-tl">${tl.map(t=>`<option value="${esc(t)}">`).join('')}</datalist><em id="ag-teltx">${tel?'Telefone: '+esc(tel):tl.length?'As já usadas aparecem ao digitar.':'Fica guardada para os próximos.'}</em></label>
      ${u.campo({r:'Placa',id:'ag-placa',v:c.placa||'',col:3,ph:'ABC1D23'})}
      <label class="pc-campo pc-c3"><span>Veículo</span><select id="ag-veic"><option value="">—</option>${vs.map(v=>`<option value="${esc(v.k)}"${c.veiculo===v.k?' selected':''}>${esc(v.nome)} (${fN(v.pal)} pal.)</option>`).join('')}</select></label>
      <div class="pc-c12 ag-dtw"><span class="ag-lb">Agendar para</span>
        <div class="ag-dtl"><input id="ag-data" class="txt" type="date" value="${esc(c.data||'')}" aria-label="Data do carregamento">
          <div class="ag-atl" role="group" aria-label="Atalhos de data">${atalhos().map(d=>`<button type="button" class="ag-atb${c.data===d?' on':''}" data-act="ag-dt" data-v="${d}"><b>${esc(atl(d))}</b><small>${esc(brC(d))}</small></button>`).join('')}<button type="button" class="ag-atb sd${!c.data?' on':''}" data-act="ag-dt" data-v=""><b>Sem data</b><small>esperar</small></button></div>
          <input id="ag-hora" class="txt ag-hr" type="text" list="ag-hl" value="${esc(c.hora||'')}" placeholder="Horário" aria-label="Horário (manhã, tarde ou hora)"><datalist id="ag-hl"><option value="Manhã"><option value="Tarde"><option value="07:30"><option value="13:30"></datalist></div>
        ${o.atrasado?`<label class="ag-mot"><span>A data já passou: por que vai mudar?</span><select id="ag-motivo"><option value="">Escolha o motivo</option>${MOTIVOS.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label>`:o.agendado?`<label class="ag-mot op"><span>Se mudar a data (reagendar), o motivo</span><select id="ag-motivo"><option value="">Sem motivo</option>${MOTIVOS.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label>`:''}</div>`; }
  function lerCarga(){ const scBt=A.jan&&A.jan.el.querySelector('[data-act="ag-semcarga"]'), sc=!!(scBt&&scBt.classList.contains('on'));
    return {carga:sc?'':val('#ag-carga'),semCarga:sc&&!val('#ag-carga'),diario:val('#ag-diario'),transp:val('#ag-transp'),placa:val('#ag-placa').toUpperCase(),veiculo:val('#ag-veic'),hora:val('#ag-hora'),data:val('#ag-data')}; }
  function janela(x){ const u=U(); if(A.jan) A.jan.fechar(); const novo=!!(A.ed&&A.ed.novo), h=hoje(); A.ed.x=x;
    const atrasado=!novo&&x.status==='agendado'&&x.data&&x.data<h, pl=plano();
    const ehc=pedList(x).length>1?`<button type="button" class="ag-sc ag-ec${ehCarga(x)?' on':''}" data-act="ag-ehcarga" aria-pressed="${ehCarga(x)}">${ehCarga(x)?'✓ ':''}Estes ${pedList(x).length} pedidos são uma carga</button>`:'';
    const form=`<div class="pc-form ag-fm">
        ${novo?u.campo({r:'Número do pedido',id:'ag-ped',v:'',obr:1,col:12,im:'numeric',dica:'O PDF não trouxe o número.'}):''}
        ${u.campo({r:'Cliente',id:'ag-cli',v:x.cliente||'',col:6,ph:'Nome do cliente'})}
        ${empCampo(x.empresa,false)}
        ${camposCarga(x,{ehc,atrasado,agendado:!novo&&x.status==='agendado'})}
        ${u.campo({r:'Observação',id:'ag-obs',tipo:'area',v:x.obs||'',col:12,ph:'Ex.: cliente pediu para antes, entrega parcial, falta produzir o AC3…'})}
      </div>`;
    const temH=!novo&&(x.hist||[]).length;
    const corpo=`<div class="ag-tabs" role="tablist"><button type="button" class="on" data-act="ag-tab" data-v="dados">Dados</button><button type="button" data-act="ag-tab" data-v="itens">Itens (${(x.itens||[]).length})</button>${temH?'<button type="button" data-act="ag-tab" data-v="hist">Histórico</button>':''}</div>
      <section class="ag-sec on" data-tab="dados"><div class="ag-jg">${form}<aside class="ag-res"><div id="ag-totp">${totpHtml(x)}</div><div class="ag-diap" id="ag-diap">${diaHtml(x.data||'',x)}</div></aside></div></section>
      <section class="ag-sec" data-tab="itens"><h3 class="ag-h3">Itens do pedido</h3>${itensTab(x,x.status==='agendado'?pl:null)}</section>
      ${temH?`<section class="ag-sec" data-tab="hist"><details class="ag-hist"><summary>Histórico (${x.hist.length})</summary>${u.tempo(x.hist.slice().reverse().map(e=>({t:e.t,q:new Date(e.em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+(e.por?' · '+e.por:'')})))}</details></section>`:''}`;
    const fechado=x.status==='carregado'||x.status==='cancelado';
    const rod=`${!novo?(fechado?u.bt('Reabrir','ag-reabrir',{sec:1,dv:x._id}):u.bt('Cancelar pedido','ag-cancelar',{sec:1,dv:x._id}))+u.bt('Apagar','ag-apagar',{sec:1,dv:x._id,cls:'ag-apg'})+(!fechado&&(x.itens||[]).some(i=>qtdDe(i)>1)?u.bt('Dividir','ag-dividir',{sec:1,dv:x._id,cls:'ag-dvb'}):''):''}<span style="flex:1"></span>
      ${!novo?u.bt('Copiar nº','ag-copiarids',{sec:1,dv:x._id}):''}${!novo&&x.aberto&&pode()?u.bt(x.fat?'✓ Faturado':'Faturado','ag-etapa',{sec:1,dv:'fat|'+x._id}):''}${!novo&&x.status==='agendado'&&pode()?u.bt('Reagendar','ag-reag',{sec:1,dv:x._id}):''}${!novo&&x.status==='agendado'?u.bt('Carregou','ag-carregou',{sec:1,dv:x._id}):''}${pode()?u.bt('Salvar','ag-salvar',{dv:x._id||''}):''}`;
    const sub=novo?[empTxt(x),A.ed.arquivo||''].filter(Boolean).join(' · '):[empTxt(x),STN[x.status]||'',x.data?'para '+br(x.data)+' ('+semana(x.data)+')':'',cargaTxt(x),x.transp||'',x.parcial&&x.parcial.de?'parte de uma entrega parcial':''].filter(Boolean).join(' · ');
    A.jan=u.janela({tit:novo?'Pedido novo':(pedList(x).length>1?pedList(x).length+' pedidos: '+pedTodos(x):'Pedido '+x.pedido)+(x.cliente?' · '+x.cliente:''),sub,corpo,rodape:rod,larga:true,foco:novo,aoFechar:()=>{ A.jan=null; A.ed=null; }});
    A.jan.el.classList.add('ag-jan'); }
  /* o dia escolhido: o que já está nele + este pedido, a capacidade e o que vai faltar (com os pedidos antes e a produção) */
  function diaHtml(d,x){ if(!d) return `<div class="ag-rl">Dia do carregamento</div><p class="ag-dv">Sem data: o pedido fica em "Esperando data".</p>`;
    const outros=A.abertos.filter(y=>y.status==='agendado'&&y.data===d&&y._id!==x._id), xi=Object.assign({},x,{itens:itensJan(x),data:d,status:'agendado'});
    const r0=soma(outros), r=soma(outros.concat([xi])), lim=limiteDia(), pl=plano(xi), fer=feriado(d);
    const fal=(xi.itens||[]).map(i=>({i,f:faltaPl(pl,xi,i)})).filter(o=>o.f&&o.f.falta>0);
    return `<div class="ag-rl">${esc(atl(d))} · ${esc(brC(d))} (${esc(semana(d))})</div>
      ${!diaUtil(d)?`<p class="ag-dv ag-f">${fer?'Feriado: '+esc(fer.nome||'feriado'):'Dia sem expedição'}.</p>`:''}
      <p class="ag-dv">${outros.length?`Já tem ${outros.length} pedido${outros.length>1?'s':''} (${esc(palTxt(r0))}).`:'Nenhum outro pedido neste dia.'}</p>
      <p class="ag-dv">Com este pedido fica <b>${esc(totDia(r))}</b>${r.kg?' · '+esc(fKg(r.kg)):''}</p>
      ${lim&&r.pal>lim?`<p class="ag-dv ag-wn">Passa do limite de ${fN(lim)} paletes por dia.</p>`:''}
      ${fal.length?`<p class="ag-dv ag-f">Vai faltar: ${fal.map(o=>esc(o.i.cod)+' '+fN(o.f.falta)).join(' · ')}</p>`:''}`; }
  function janAtualiza(){ if(A.jan&&A.ed&&A.ed.carga){ const dv=val('#ag-data'); A.jan.el.querySelectorAll('.ag-atb').forEach(b=>b.classList.toggle('on',(b.dataset.v||'')===dv)); return; } if(!A.jan||!A.ed||!A.ed.x) return; const x=Object.assign({},A.ed.x,{itens:itensJan(A.ed.x)});
    A.jan.el.querySelectorAll('.ag-pl').forEach(td=>{ const i=x.itens[+td.dataset.k]; if(!i) return; const pp=ppDe(i); td.textContent=pp>0&&qtdDe(i)>0?fP(qtdDe(i)/pp):'—'; });
    A.jan.el.querySelectorAll('.ag-pp').forEach(i=>i.classList.toggle('vz',!(+i.value>0)));
    const t=A.jan.el.querySelector('#ag-totp'); if(t) t.innerHTML=totpHtml(x);
    const dv=val('#ag-data'); A.jan.el.querySelectorAll('.ag-atb').forEach(b=>b.classList.toggle('on',(b.dataset.v||'')===dv));
    const dp=A.jan.el.querySelector('#ag-diap'); if(dp) dp.innerHTML=diaHtml(dv,A.ed.x); }
  function editar(id){ const x=deId(id); if(!x) return; A.ed={id}; janela(x); }
  const val=s=>{ const e=A.jan&&A.jan.el.querySelector(s); return e?String(e.value||'').trim():''; };
  async function salvarCfg(o){ try{ await P.db().doc('config/agendamentos').set(o,{merge:true}); Object.keys(o).forEach(k=>{ A.cfg[k]=typeof o[k]==='object'&&!Array.isArray(o[k])?Object.assign({},A.cfg[k]||{},o[k]):o[k]; }); }catch(e){ console.warn('[agend] config',e); } }
  /* campos que valem para a carga inteira (mesmo caminhão) */
  const CAMPOS_CARGA=[['diario','Diário de bordo'],['transp','Transportadora'],['placa','Placa'],['veiculo','Veículo'],['hora','Horário']];
  async function salvar(id){ const novo=!!(A.ed&&A.ed.novo), base=A.ed&&A.ed.x;
    const ecBt=A.jan&&A.jan.el.querySelector('[data-act="ag-ehcarga"]'); const emp=empLida(); if(emp===false) return;
    const c=lerCarga(); const sc=c.semCarga||(!c.carga&&!!(A.jan.el.querySelector('[data-act="ag-semcarga"].on')));
    const o=Object.assign({...(ecBt?{ehCarga:ecBt.classList.contains('on')}:{}),cliente:val('#ag-cli'),obs:val('#ag-obs')},c,{semCarga:sc});
    const its=base?itensJan(base):null;
    let x; if(novo){ const ped=val('#ag-ped').replace(/\s+/g,''); if(!ped){ P.toast('Digite o número do pedido.'); return; } id=docId(ped); x=deId(id);
      Object.assign(o,{...(A.ed.R.empresa?{empresa:A.ed.R.empresa}:{}),itens:its||A.ed.R.itens,total:A.ed.R.total,relData:A.ed.R.relData,arquivo:A.ed.arquivo}); if(!x) o.pedido=ped; }
    else { x=deId(id); if(its) o.itens=its; }
    if(o.carga) o.semCarga=false; if(emp!==undefined) o.empresa=emp;
    /* data que já passou mudando: pede o motivo (vai para os indicadores) */
    const atrasado=x&&x.status==='agendado'&&x.data&&x.data<hoje()&&(x.data||'')!==o.data;
    if(atrasado&&o.data){ const m=val('#ag-motivo'); if(!m){ P.toast('Escolha o motivo do atraso.'); const s=A.jan.el.querySelector('#ag-motivo'); if(s) s.focus(); return; } }
    const rg=x?reagDe(x,o.data,val('#ag-motivo')):null; if(rg) Object.assign(o,rg);
    const st=x&&(x.status==='carregado'||x.status==='cancelado')?x.status:(o.data?'agendado':'aguardando');
    o.status=st; o.aberto=st==='aguardando'||st==='agendado';
    const mud=[]; if(!x) mud.push('Criado à mão (PDF sem número)');
    else { if((x.data||'')!==o.data) mud.push(o.data?(x.data?(rg?'Reagendado de ':'Data mudou de ')+br(x.data)+' para '+br(o.data):'Agendado para '+br(o.data)):'Data tirada (voltou a esperar data)');
      if(rg&&rg.reag[rg.reag.length-1].motivo) mud.push('Motivo: '+rg.reag[rg.reag.length-1].motivo);
      if(emp!==undefined&&empTxt({empresa:emp})!==empTxt(x)) mud.push(emp?'Empresa: '+empTxt({empresa:emp})+' (à mão)':'Empresa tirada');
      [['cliente','Cliente'],['carga','Carga']].concat(CAMPOS_CARGA,[['obs','Observação']]).forEach(([k,r])=>{ if((x[k]||'')!==(o[k]||'')) mud.push(r+(o[k]?': '+String(k==='veiculo'?(veicDe(o[k])||{}).nome||o[k]:o[k]).slice(0,60):' apagado')); });
      if(!!x.semCarga!==sc&&sc) mud.push('Sem carga por enquanto'); }
    try{ await grava(id,o,mud.join(' · ')||null);
      /* mesma carga = mesmo caminhão: diário, transportadora, placa, veículo e horário valem para os outros pedidos abertos da carga */
      if(o.carga){ for(const y of A.abertos.filter(y=>y._id!==id&&y.carga===o.carga)){ const up={}, tx=[]; CAMPOS_CARGA.forEach(([k,r])=>{ if(o[k]&&(y[k]||'')!==o[k]){ up[k]=o[k]; tx.push(r+': '+(k==='veiculo'?(veicDe(o[k])||{}).nome||o[k]:o[k])); } }); if(tx.length) await grava(y._id,up,tx.join(' · ')+' (pela carga '+o.carga+')'); } }
      const cfg={}; if(o.transp&&!(A.cfg.transps||[]).includes(o.transp)) cfg.transps=(A.cfg.transps||[]).concat([o.transp]).sort((a,b)=>a.localeCompare(b,'pt-BR')).slice(-300);
      const pp={}; (o.itens||[]).forEach(i=>{ if(+i.pp>0&&+(A.cfg.pp||{})[String(i.cod).toUpperCase()]!==+i.pp) pp[String(i.cod).toUpperCase()]=+i.pp; }); if(Object.keys(pp).length) cfg.pp=pp;
      if(Object.keys(cfg).length) salvarCfg(cfg);
      if(A.jan) A.jan.fechar(); const r=soma([deId(id)||o]);
      P.toast(o.data&&st==='agendado'?'Agendado para '+br(o.data)+' ('+semana(o.data)+') · '+palTxt(r)+'.':'Salvo.'); if(st==='agendado') A.aba='agendado'; else if(st==='aguardando') A.aba='aguardando'; P.rerender(); }
    catch(e){ P.erro(e); } }
  async function mudaStatus(id,st,txt){ const x=deId(id); if(!x) return; const agora=new Date();
    const o={status:st,aberto:st==='aguardando'||st==='agendado'}; if(!o.aberto) o.fechadoEm=agora.toISOString(); if(st==='carregado'){ o.carregadoEm=agora.toISOString(); o.carregadoDia=hoje(); }
    try{ await grava(id,o,txt+(st==='carregado'?' às '+agora.toTimeString().slice(0,5):'')); if(A.jan) A.jan.fechar(); P.toast('Pedido '+x.pedido+': '+(STN[st]||st).toLowerCase()+'.'); P.rerender(); }catch(e){ P.erro(e); } }
  /* situação na expedição de um grupo (carga): separado / chegou / carregou, com a hora */
  async function etapa(ids,k){ const xs=ids.map(deId).filter(Boolean); if(!xs.length) return; const agora=new Date(), hhmm=agora.toTimeString().slice(0,5);
    if(k==='carregou'){ if(!confirm('Marcar '+(xs.length>1?'os '+xs.length+' pedidos desta carga':'o pedido '+xs[0].pedido)+' como carregado?')) return;
      for(const x of xs) await grava(x._id,{status:'carregado',aberto:false,fechadoEm:agora.toISOString(),carregadoEm:agora.toISOString(),carregadoDia:hoje()},'Carregado às '+hhmm);
      P.toast((xs.length>1?xs.length+' pedidos carregados':'Pedido '+xs[0].pedido+' carregado')+' às '+hhmm+'.'); P.rerender(); return; }
    const liga=!xs.every(x=>x[k]); const nome=k==='sep'?'Separado':k==='fat'?'Faturado':'Caminhão chegou';
    for(const x of xs) await grava(x._id,{[k]:liga?agora.toISOString():null},liga?nome+' às '+hhmm:nome+' desmarcado');
    if(k==='fat') P.toast(liga?(xs.length>1?xs.length+' pedidos faturados':'Pedido '+xs[0].pedido+' faturado')+' às '+hhmm+', falta carregar.':'Faturado desmarcado.');
    if(A.jan&&A.jan.el.querySelector('[data-act="ag-etapa"]')) A.jan.fechar();
    P.rerender(); }
  /* entrega parcial: o que vai agora fica neste agendamento; o resto vira outro, esperando data */
  function janDividir(id){ const u=U(), x=deId(id); if(!x) return; if(A.jan) A.jan.fechar(); A.ed={dividir:id};
    const its=(x.itens||[]).map((i,k)=>({i,k})).filter(o=>qtdDe(o.i)>0);
    const corpo=`<p class="ag-dica">Digite quanto vai <b>agora</b> em cada item. O que sobrar vira outro agendamento do mesmo pedido, em "Esperando data".</p>
      <table class="ag-pit ag-dvt"><thead><tr><th>Item</th><th class="dir">Pendente</th><th class="dir">Vai agora</th></tr></thead><tbody>${its.map(o=>`<tr><td><b>${esc(o.i.cod)}</b> <span>${esc(o.i.desc||'')}</span></td><td class="dir">${esc(qtdUn(qtdDe(o.i),o.i.un))}</td><td class="dir"><input class="txt ag-dvq" type="number" min="0" max="${qtdDe(o.i)}" step="1" data-k="${o.k}" value="${qtdDe(o.i)}"></td></tr>`).join('')}</tbody></table>`;
    A.jan=u.janela({tit:'Dividir o pedido '+pedCurto(x),sub:'Entrega parcial',corpo,rodape:`<span style="flex:1"></span>${u.bt('Dividir','ag-dvsalvar',{dv:id})}`,aoFechar:()=>{ A.jan=null; A.ed=null; }}); A.jan.el.classList.add('ag-jan'); }
  async function salvarDividir(id){ const x=deId(id); if(!x) return; const q={}; A.jan.el.querySelectorAll('.ag-dvq').forEach(i=>{ q[+i.dataset.k]=Math.max(0,+i.value||0); });
    const agora=[], resto=[]; let mudou=false;
    (x.itens||[]).forEach((i,k)=>{ const p=qtdDe(i); if(!(k in q)){ agora.push(i); return; } const a=Math.min(p,q[k]); if(a<p) mudou=true;
      const fr=+i.qtd>0?(+i.valor||0)/(+i.qtd):0;
      if(a>0) agora.push(Object.assign({},i,{pend:a})); if(p-a>0) resto.push(Object.assign({},i,{pend:p-a,qtd:p-a,atend:0,canc:0,valor:Math.round(fr*(p-a)*100)/100})); });
    if(!mudou||!resto.length){ P.toast('Nada para dividir: tudo vai agora.'); return; }
    let n=2; while(deId(x._id+'-r'+n)) n++; const nid=x._id+'-r'+n, tot=Math.round(resto.reduce((s,i)=>s+(+i.valor||0),0)*100)/100;
    try{ await grava(nid,{pedido:x.pedido,pedidos:pedList(x),empresa:x.empresa||null,cliente:x.cliente||'',itens:resto,total:tot,relData:x.relData||'',arquivo:x.arquivo||'',carga:'',transp:'',obs:'',data:'',status:'aguardando',aberto:true,parcial:{de:x._id}},'Resto da entrega parcial do pedido '+pedCurto(x));
      await grava(x._id,{itens:agora,parcial:Object.assign({},x.parcial||{},{resto:nid})},'Entrega parcial: o resto ('+resto.map(i=>i.cod+' '+fN(i.pend)).join(', ')+') foi para outro agendamento');
      A.jan.fechar(); P.toast('Pedido dividido: o resto está em "Esperando data".'); P.rerender(); }catch(e){ P.erro(e); } }
  /* mover para outro dia (arrastar no calendário ou "passar para o próximo dia útil"), pedindo o motivo se a data já passou */
  function janMotivo(tit,cb){ const u=U(); if(A.jan) A.jan.fechar(); A.ed={motivo:true,cb};
    A.jan=u.janela({tit,corpo:`<label class="pc-campo"><span>Motivo</span><select id="ag-motivo"><option value="">Escolha o motivo</option>${MOTIVOS.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label>`,rodape:`<span style="flex:1"></span>${u.bt('Confirmar','ag-motok')}`,aoFechar:()=>{ A.jan=null; A.ed=null; }}); A.jan.el.classList.add('ag-jan'); }
  /* reagendamento (25/11, ajuste "incluir possibilidade de reagendado"): toda mudança de data de um pedido JÁ agendado fica em
     reag[{de,para,motivo,em}] — aparece como "reagendado · era 24/11" e conta nos Indicadores. Data que já passou exige o motivo
     (também vai para atrasos[], como antes). */
  function reagDe(x,para,motivo){ if(!(x&&x.status==='agendado'&&x.data&&para&&para!==x.data)) return null; const em=new Date().toISOString(), m=motivo&&motivo!=='-'?motivo:'';
    const o={reag:(x.reag||[]).concat([{de:x.data,para,motivo:m,em}]).slice(-20)}; if(x.data<hoje()&&m) o.atrasos=(x.atrasos||[]).concat([{de:x.data,para,motivo:m,em}]).slice(-20); return o; }
  async function moverPara(ids,d,como,motivoDado){ const xs=ids.map(deId).filter(x=>x&&x.aberto); if(!xs.length||!d) return; const h=hoje();
    const atr=xs.filter(x=>x.status==='agendado'&&x.data&&x.data<h&&x.data!==d);
    const vai=async motivo=>{ for(const x of xs){ if(x.data===d&&x.status==='agendado') continue; const o=Object.assign({data:d,status:'agendado',aberto:true},reagDe(x,d,motivo)||{});
        await grava(x._id,o,(x.data?(x.status==='agendado'?'Reagendado de ':'Data mudou de ')+br(x.data)+' para '+br(d):'Agendado para '+br(d))+' ('+como+')'+(motivo&&motivo!=='-'?' · Motivo: '+motivo:'')); }
      P.toast(xs.length+' pedido'+(xs.length>1?'s':'')+' reagendado'+(xs.length>1?'s':'')+' para '+br(d)+' ('+semana(d)+').'); A.cal=d; A.mes=d.slice(0,7); P.rerender(); };
    if(atr.length&&!(motivoDado&&motivoDado!=='-')) janMotivo('A data já passou: por que vai para '+brC(d)+'?',m=>vai(m)); else await vai(motivoDado||''); }
  /* janela Reagendar: nova data (atalhos dos dias úteis) + motivo (obrigatório se a data já passou) */
  function janReagendar(ids){ const u=U(); if(A.jan) A.jan.fechar(); const xs=ids.map(deId).filter(Boolean); if(!xs.length) return; const h=hoje(), atr=xs.some(x=>x.data&&x.data<h);
    A.ed={reag:ids}; const d0=xs[0].data||'';
    const corpo=`<p class="ag-dica">${xs.length>1?xs.length+' pedidos · ':''}${esc(xs.map(pedCurto).join(', '))}${d0?' · hoje está para <b>'+esc(br(d0))+'</b>':''}</p>
      <div class="ag-dtl"><input id="ag-data" class="txt" type="date" value="" aria-label="Nova data">
        <div class="ag-atl" role="group" aria-label="Atalhos de data">${atalhos().filter(d=>d!==d0).map(d=>`<button type="button" class="ag-atb" data-act="ag-dt" data-v="${d}"><b>${esc(atl(d))}</b><small>${esc(brC(d))}</small></button>`).join('')}</div></div>
      <label class="pc-campo ag-mt"><span>Motivo${atr?' (a data já passou)':' (opcional)'}</span><select id="ag-motivo"><option value="">${atr?'Escolha o motivo':'Sem motivo'}</option>${MOTIVOS.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label>`;
    A.jan=u.janela({tit:'Reagendar',corpo,rodape:`<span style="flex:1"></span>${u.bt('Reagendar','ag-reagok')}`,aoFechar:()=>{ A.jan=null; A.ed=null; }}); A.jan.el.classList.add('ag-jan'); }
  const reagTxt=x=>{ const r=x.reag||[]; if(!r.length) return ''; return 'reagendado'+(r.length>1?' '+r.length+'x':'')+' · era '+brC(r[0].de); };
  const reagTit=x=>(x.reag||[]).map(e=>brC(e.de)+' → '+brC(e.para)+(e.motivo?' ('+e.motivo+')':'')).join(' · ');

  /* ---------- tela: lista em colunas, um cartão por carga dentro do dia ---------- */
  /* busca por material (25/11, ajuste: "a pesquisa pelo material tem que funcionar pra eu saber o quanto já tenho comprometido"):
     soma o item em todos os pedidos em aberto (com os filtros de empresa/diário/faturado), por dia, contra o estoque */
  function compDados(q,xs){ const ps=norm(q).split(/\s+/).filter(Boolean); if(!ps.length||norm(q).replace(/\s/g,'').length<2) return [];
    const m={}; xs.forEach(x=>(x.itens||[]).forEach(i=>{ const q=qtdDe(i); if(!(q>0)) return; const t=norm(i.cod+' '+(i.desc||'')); if(!ps.every(p=>t.includes(p))) return;
      const c=String(i.cod).toUpperCase(), o=m[c]||(m[c]={cod:c,desc:i.desc||'',un:i.un||'',pp:ppDe(i),ag:0,es:0,fat:0,dias:{},ids:new Set()});
      o.ids.add(x._id); if(x.status==='agendado'){ o.ag+=q; if(x.data) o.dias[x.data]=(o.dias[x.data]||0)+q; if(x.fat) o.fat+=q; } else o.es+=q; }));
    return Object.values(m).sort((a,b)=>(b.ag+b.es)-(a.ag+a.es)); }
  function comp(){ const its=compDados(A.q,fE(A.abertos)); if(!its.length) return '';
    const h=hoje(), vv=(q,o)=>o.pp>0?`<b>${esc(fP(q/o.pp))} pal.</b><small>${esc(qtdUn(q,o.un))}</small>`:`<b>${esc(qtdUn(q,o.un))}</b>`;
    const lin=o=>{ const sd=saldoTotal(o.cod), so=sd.q-o.ag, so2=so-o.es, ds=Object.keys(o.dias).sort();
      return `<tr><td><b>${esc(o.cod)}</b><span>${esc(o.desc)}</span><button type="button" class="lnk" data-act="ag-copiarids" data-v="${esc([...o.ids].join(','))}">Copiar pedidos (${o.ids.size})</button></td>
        <td class="dir">${o.ag>0?vv(o.ag,o):'—'}</td>
        <td><div class="ag-cpdias">${ds.map(d=>`<span class="${d<h?'atr':''}">${esc(d===h?'Hoje':d===addD(h,1)?'Amanhã':brC(d))} <b>${esc(o.pp>0?fP(o.dias[d]/o.pp)+' pal.':fN(o.dias[d])+' '+String(o.un).toLowerCase())}</b></span>`).join('')||'—'}</div></td>
        <td class="dir">${o.fat>0?vv(o.fat,o):'—'}</td><td class="dir">${o.es>0?vv(o.es,o):'—'}</td>
        <td class="dir">${sd.fonte?vv(sd.q,o):'<small>sem saldo</small>'}</td>
        <td class="dir">${sd.fonte?`<span class="${so<0?'ag-wn c':'ag-okt'}">${so<0?'falta ':''}${vv(Math.abs(so),o)}</span>${o.es>0?`<small class="${so2<0?'ag-wn':''}">${so2<0?'falta '+esc(o.pp>0?fP(-so2/o.pp)+' pal.':qtdUn(-so2,o.un)):'sobra '+esc(o.pp>0?fP(so2/o.pp)+' pal.':qtdUn(so2,o.un))} com esperando data</small>`:''}`:'—'}</td></tr>`; };
    const em=its.map(o=>saldoTotal(o.cod)).find(x=>x.fonte);
    return `<section class="ag-comp" aria-label="Material comprometido"><header><h3>Comprometido em agendamentos</h3><small>${its.length} ite${its.length>1?'ns':'m'} com "${esc(A.q.trim())}" nos pedidos em aberto${temFiltro()&&(A.emp||A.soDiario||A.soFat)?' (com os filtros)':''}${em&&em.em?' · estoque de '+esc(br(em.em.slice(0,10)))+(em.em.length>10?' '+esc(em.em.slice(11,16)):''):''}</small></header>
      <div class="ag-cpw"><table class="ag-cpt"><thead><tr><th>Material</th><th class="dir">Agendado</th><th>Por dia</th><th class="dir">Faturado</th><th class="dir">Esperando data</th><th class="dir">Estoque</th><th class="dir">Sobra</th></tr></thead><tbody>${its.slice(0,8).map(lin).join('')}</tbody></table></div>
      ${its.length>8?`<p class="ag-dica">Mostrando 8 de ${its.length}. Digite mais do nome ou o código para achar o item.</p>`:''}</section>`; }
  function filtra(xs){ const ps=norm(A.q).split(/\s+/).filter(Boolean); if(!ps.length) return xs;
    return xs.filter(x=>{ const t=norm([x.pedido,x.cliente,x.carga,x.diario,x.transp,x.placa,x.obs,empTxt(x),x.empresa&&x.empresa.nome,(x.itens||[]).map(i=>i.cod+' '+i.desc).join(' ')].join(' ')); return ps.every(p=>t.includes(p)); }); }
  /* o mesmo número de pedido em outro agendamento aberto */
  function dupDe(x){ const ps=pedList(x); return A.abertos.filter(y=>y._id!==x._id&&!(x.parcial&&(x.parcial.de===y._id||x.parcial.resto===y._id))&&!(y.parcial&&(y.parcial.de===x._id||y.parcial.resto===x._id))&&pedList(y).some(p=>ps.includes(p))); }
  function linha(x,o){ o=o||{}; const ss=faltasDe(x), h=hoje(), atras=x.status==='agendado'&&x.data&&x.data<h, r=soma([x]), n=(x.itens||[]).length, dup=x.aberto?dupDe(x):[];
    const sub=[empTxt(x)?`<span class="ag-emp" title="${esc(x.empresa.nome||'')}">${esc(empTxt(x))}</span>`:`<span class="ag-semp" title="Importado antes de o painel ler a empresa: importe o PDF de novo">sem empresa</span>`,pedList(x).length>1?`<span class="ag-pls">${ehCarga(x)?'carga com '+pedList(x).length+' pedidos: ':'pedidos '}${esc(pedTodos(x))}</span>`:'',x.parcial&&(x.parcial.de||x.parcial.resto)?'<span class="ag-stx info">entrega parcial</span>':'',x.fat&&x.aberto?`<span class="ag-fat" title="Faturado em ${esc(new Date(x.fat).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}))}">faturado ${esc(hm(x.fat))} · falta carregar</span>`:'',reagTxt(x)?`<span class="ag-rg" title="${esc(reagTit(x))}">${esc(reagTxt(x))}</span>`:'',dup.length?`<span class="ag-wn" title="Também em: ${esc(dup.map(pedCurto).join(', '))}">pedido repetido</span>`:'',o.st?`<span class="ag-stx ${STT[x.status]}">${esc(STN[x.status])}${x.data?' '+esc(brC(x.data)):''}${x.carregadoEm&&String(x.carregadoEm).length>10?' às '+esc(new Date(x.carregadoEm).toTimeString().slice(0,5)):''}</span>`:'',!o.semCarga&&cargaTxt(x)?esc(cargaTxt(x)):'',!o.semCarga&&x.diario?esc(diarioTxt(x)):'',!o.semCarga&&x.transp?esc(x.transp):'',n+' ite'+(n>1?'ns':'m'),esc(fR(x.total)),ss.length?`<span class="ag-wn${ss.length===n?' c':''}">falta estoque em ${ss.length} ite${ss.length>1?'ns':'m'}</span>`:''].filter(Boolean).join(' · ');
    return `<div class="ag-ln${atras?' atr':''}${A.sel.has(x._id)?' sel':''}"data-act="ag-abrir" data-v="${esc(x._id)}" data-b="${esc(norm([x.pedido,x.cliente,x.carga,x.transp,x.placa,x.obs,cargaTxt(x),diarioTxt(x),empTxt(x),x.empresa&&x.empresa.nome,(x.itens||[]).map(i=>i.cod+' '+(i.desc||'')).join(' ')].join(' ')))}">
      <div class="ag-pd">${o.ck&&pode()?`<input type="checkbox" class="ag-ck" data-act="ag-sel" data-v="${esc(x._id)}" aria-label="Marcar o pedido ${esc(x.pedido)}"${A.sel.has(x._id)?' checked':''}>`:''}<b title="${esc(pedTodos(x))}">${esc(pedCurto(x))}</b></div>
      <div class="ag-mid"><div class="ag-cl">${x.cliente?esc(x.cliente):'<i>sem cliente</i>'}</div><div class="ag-sub">${sub}</div>${x.obs?`<div class="ag-obs">${esc(x.obs)}</div>`:''}</div>
      <div class="ag-qt">${esc(unTxt(r))}</div>
      <div class="ag-ac">${o.bt&&(pode()||o.bt[1]==='ag-abrir')?`<button type="button" class="ag-bt${o.bt[2]?' sec':''}" data-act="${o.bt[1]}" data-v="${esc(x._id)}">${esc(pode()?o.bt[0]:'Ver')}</button>`:''}</div></div>`; }
  const UNN={SC:['saco','sacos'],FD:['fardo','fardos'],CX:['caixa','caixas'],BD:['balde','baldes'],UN:['unidade','unidades'],PC:['peça','peças'],GL:['galão','galões'],LT:['litro','litros'],KG:['kg','kg'],PT:['pote','potes'],RL:['rolo','rolos']};
  const unN=(u,q)=>{ const n=UNN[String(u||'').toUpperCase()]; return n?(Math.abs(q-1)<1e-9?n[0]:n[1]):String(u||'').toLowerCase(); };
  const qtdUn=(q,u)=>fN(q)+' '+unN(u,q);
  /* o que não vai em palete (sem palete cadastrado), somado por unidade: "10 fardos · 40 caixas" */
  function fora(r){ const m={}; r.it.filter(i=>i.pal==null).forEach(i=>{ m[i.un]=(m[i.un]||0)+i.q; }); return Object.keys(m).map(u=>[u,m[u]]); }
  const foraTxt=r=>fora(r).map(([u,q])=>qtdUn(q,u)).join(' · ');
  /* total do dia: "10,41 paletes · 10 fardos" */
  const totDia=r=>[r.pal>0?fP(r.pal)+' palete'+(Math.floor(r.pal*100+1e-6)===100?'':'s'):'',foraTxt(r)].filter(Boolean).join(' · ')||'—';
  const totLin=r=>`<b class="ag-tp">${esc(totDia(r))}</b>`;
  const hm=iso=>iso?new Date(iso).toTimeString().slice(0,5):'';
  /* grupos do dia: uma carga (nº ou "são uma carga") = um cartão; pedidos sem carga ficam juntos no fim. Ordem = ordem de carregamento */
  function gruposDia(xs){ const g=new Map(); xs.forEach(x=>{ const k=x.carga?'c:'+x.carga:ehCarga(x)?'r:'+x._id:'sem'; (g.get(k)||g.set(k,[]).get(k)).push(x); });
    const ord=k=>{ const ys=g.get(k), m=Math.min(...ys.map(y=>+y.ordemDia>0?+y.ordemDia:99)); return m; };
    return [...g.keys()].sort((a,b)=>a==='sem'?1:b==='sem'?-1:(ord(a)-ord(b))||a.localeCompare(b,'pt-BR',{numeric:true})).map(k=>({k,ys:g.get(k)})); }
  function cartaoCarga(k,ys,pos,n,d){ const h=hoje(), cap=capCarga(ys), r=cap.r, ids=ys.map(y=>y._id).join(','), tr=[...new Set(ys.map(y=>y.transp).filter(Boolean))].join(' / '), dr=[...new Set(ys.map(y=>y.diario).filter(Boolean))].join(' / ');
    const pl=[...new Set(ys.map(y=>y.placa).filter(Boolean))].join(' / '), hr=[...new Set(ys.map(y=>y.hora).filter(Boolean))].join(' / '), tel=tr&&(A.cfg.tels||{})[tr];
    const sep=ys.every(y=>y.sep), che=ys.every(y=>y.chegou), fat=ys.every(y=>y.fat), atr=d<h, nome=k[0]==='r'?'Carga com '+pedList(ys[0]).length+' pedidos':'Carga '+k.slice(2);
    const pct=cap.v?Math.min(100,Math.round(r.pal/cap.v.pal*100)):0;
    return `<article class="ag-cc${atr?' atr':''}${fat?' fat':''}${cap.palOver||cap.kgOver?' over':''}" data-ids="${esc(ids)}">
      <header class="ag-cch">
        <div class="ag-cco">${pode()?`<button type="button" class="ag-ob" data-act="ag-ord" data-v="${esc(ids)}|-1" aria-label="Carregar antes"${pos===0?' disabled':''}>▲</button>`:''}<b class="ag-ord" title="Ordem de carregamento">${pos+1}º</b>${pode()?`<button type="button" class="ag-ob" data-act="ag-ord" data-v="${esc(ids)}|1" aria-label="Carregar depois"${pos>=n-1?' disabled':''}>▼</button>`:''}</div>
        <div class="ag-cct"><div><b>${esc(nome)}</b>${k[0]==='r'?' <span class="ag-sn">sem número ainda</span>':''}${dr?` <span class="ag-dnum">diário nº ${esc(dr)}</span>`:''}</div>
          <small>${[tr?esc(tr)+(tel?' · '+esc(tel):''):'',pl?esc(pl):'',cap.v?esc(cap.v.nome):'',hr?esc(hr):'',ys.length>1?ys.length+' pedidos':''].filter(Boolean).join(' · ')||'Sem transportadora'}</small></div>
        <div class="ag-ccs"><b class="ag-tp">${esc(totDia(r))}</b><small>${r.kg?esc(fKg(r.kg)):''}${cap.v?' de '+fN(cap.v.pal)+' pal. / '+esc(fKg(cap.v.kg)):''}</small>${cap.v?`<i class="ag-cap"><i style="width:${pct}%"></i></i>`:''}${cap.palOver||cap.kgOver?`<span class="ag-wn">${esc(capTxt(cap))}</span>`:''}</div>
      </header>
      <div class="ag-cce">${pode()?`<button type="button" class="ag-et${sep?' on':''}" data-act="ag-etapa" data-v="sep|${esc(ids)}">${sep?'✓ Separado '+hm(ys[0].sep):'Separado'}</button><button type="button" class="ag-et${che?' on':''}" data-act="ag-etapa" data-v="chegou|${esc(ids)}">${che?'✓ Chegou '+hm(ys[0].chegou):'Caminhão chegou'}</button><button type="button" class="ag-et fat${fat?' on':''}" data-act="ag-etapa" data-v="fat|${esc(ids)}" title="Nota emitida, mas ainda não carregou">${fat?'✓ Faturado '+hm(ys[0].fat):'Faturado'}</button><button type="button" class="ag-et fim" data-act="ag-cgcarregou" data-v="${esc(ids)}">Carregou</button>`:`<span class="ag-stx">${sep?'Separado '+hm(ys[0].sep):'Não separado'}${che?' · chegou '+hm(ys[0].chegou):''}${fat?' · faturado '+hm(ys[0].fat):''}</span>`}
        <span class="ag-cesp"></span>${pode()?`<button type="button" class="lnk" data-act="ag-reag" data-v="${esc(ids)}">Reagendar</button>`:''}${atr&&pode()?`<button type="button" class="lnk" data-act="ag-adiar" data-v="${esc(ids)}">Passar para ${esc(brC(diaUtil(h)?h:proxUtil(h,0)))}</button>`:''}<button type="button" class="lnk" data-act="ag-copiarids" data-v="${esc(ids)}">Copiar pedidos</button><button type="button" class="lnk" data-act="ag-pdfsep" data-v="${esc(ids)}">PDF de separação</button>${pode()?`<button type="button" class="lnk" data-act="ag-cgedit" data-v="${esc(ids)}">${k[0]==='r'?'Dar o número':'Editar carga'}</button>`:''}</div>
      ${ys.map(x=>linha(x,{semCarga:true,ck:true})).join('')}</article>`; }
  /* dia: título com paletes (só), avisos de limite e de falta; cartões das cargas */
  function grupoDia(d,xs){ const h=hoje(), r=soma(xs), lim=limiteDia(), fal=diaFaltas(d), gs=gruposDia(xs), cargas=gs.filter(g=>g.k!=='sem'), sem=gs.find(g=>g.k==='sem');
    const nome=d<h?'Já passou':d===h?'Hoje':d===addD(h,1)?'Amanhã':semana(d)[0].toUpperCase()+semana(d).slice(1);
    return `<section class="ag-dia${d<h?' atr':d===h?' hj':''}" id="ag-d-${d}"><header class="ag-dh"><h3>${esc(nome)} <span>${esc(br(d))}</span></h3>
        <div class="ag-dt2"><button type="button" class="lnk ag-cpd" data-act="ag-copiarids" data-v="${esc(xs.map(x=>x._id).join(','))}" title="Copiar os números dos pedidos do dia">Copiar</button> ${(()=>{ const ok=fE(A.fechados).filter(y=>y.status==='carregado'&&y.data===d); return ok.length?`<span class="ag-okt">${ok.length} já carregado${ok.length>1?'s':''}</span> · pendente `:''; })()}${xs.length} pedido${xs.length>1?'s':''} · ${totLin(r)}${lim?` <span class="${r.pal>lim?'ag-wn':'ag-lm'}">de ${fN(lim)}</span>`:''}</div></header>
      ${d<h?`<p class="ag-atx">Marque "Carregou" ou mude a data.${pode()?` <button type="button" class="lnk" data-act="ag-adiar" data-v="${esc(xs.map(x=>x._id).join(','))}">Passar tudo para ${esc(brC(diaUtil(h)?h:proxUtil(h,0)))}</button>`:''}</p>`:''}
      ${fal.length?`<p class="ag-fdia">Falta material: ${fal.map(o=>`<b>${esc(o.cod)}</b> ${esc(fN(o.falta))}`).join(' · ')}</p>`:''}
      ${cargas.map((g,i)=>cartaoCarga(g.k,g.ys,i,cargas.length,d)).join('')}
      ${sem?`<div class="ag-cgb sem"><div class="ag-cgh"><span class="ag-cgt"><b>Sem carga</b>${sem.ys.length>1?' · '+sem.ys.length+' pedidos':''}</span><span class="ag-cgs">${pode()?`<button type="button" class="lnk ag-cge" data-act="ag-cgedit" data-v="${esc(sem.ys.map(y=>y._id).join(','))}">Montar carga</button>`:''}</span></div>${sem.ys.map(x=>linha(x,{bt:['Carregou','ag-carregou'],semCarga:true,ck:true})).join('')}</div>`:''}</section>`; }

  /* ---------- PLANEJAMENTO (25/11, "pode fazer tudo"): estoque somado entre os pedidos, produção programada, saldo atualizado,
     limite de paletes por dia, veículo/capacidade, peso e dias úteis ----------
     Saldo para "falta material" = TOTAL das empresas: a base do PCP (pcpbase/itens.l[cód].a3+a30, "Saldo das duas empresas") quando é
     mais nova que o PDF; senão a soma do saldo mais recente de cada empresa nos PDFs. Os pedidos agendados consomem esse saldo em ordem
     (data, ordem de carregamento, carga, pedido). Produção programada = ordens abertas do painel (S.ordens: produto, data, total, linha)
     com data ANTES do dia do carregamento. As transferências entre empresas continuam pelo saldo de cada empresa no PDF. */
  const VEIC_PAD=[{k:'CAMIONETE',nome:'Camionete',pal:2,kg:700},{k:'HR',nome:'HR',pal:4,kg:1500},{k:'TOCO',nome:'Toco',pal:10,kg:6000},
    {k:'TRUCK',nome:'Truck',pal:14,kg:12000},{k:'BITRUCK',nome:'Bitruck',pal:18,kg:18000},{k:'CARRETA',nome:'Carreta',pal:28,kg:27000},{k:'CARRETA_GRANELEIRA',nome:'Carreta graneleira',pal:28,kg:30000}];
  const veics=()=>Array.isArray(A.cfg.veics)&&A.cfg.veics.length?A.cfg.veics:VEIC_PAD;
  const veicDe=k=>veics().find(v=>v.k===k)||null;
  /* peso por unidade, pela descrição do Focco: "20 KG", "20X1 KG" (fardo de 20 de 1 kg), "25KG" */
  function kgUn(desc){ const d=String(desc||'').toUpperCase().replace(/,/g,'.'); let m=d.match(/(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?)\s*KG/); if(m) return (+m[1])*(+m[2]);
    m=d.match(/(\d+(?:\.\d+)?)\s*KG/); return m?+m[1]:0; }
  const fKg=kg=>kg>=1000?fN(kg/1000,1)+' t':fN(kg)+' kg';
  /* dias úteis de expedição: sem domingo, sem sábado (a não ser que os Ajustes liguem) e sem feriado do painel */
  function feriado(d){ try{ return P.feriadoDe?P.feriadoDe(d):null; }catch(e){ return null; } }
  function diaUtil(d){ const w=new Date(d+'T12:00:00').getDay(); if(w===0) return false; if(w===6&&!A.cfg.sabado) return false; return !feriado(d); }
  function proxUtil(d,n){ let x=d, k=0; n=n==null?1:n; if(n===0){ while(!diaUtil(x)) x=addD(x,1); return x; } while(k<n){ x=addD(x,1); if(diaUtil(x)) k++; } return x; }
  /* base do PCP */
  function baseItens(){ const B=(P.S.anl&&P.S.anl.base&&P.S.anl.base.itens&&P.S.anl.base.itens.l)?P.S.anl.base.itens:A.base; return B&&B.l?B:null; }
  const t16=s=>String(s||'').replace('T',' ').slice(0,16);
  function baseEm(){ const B=baseItens(); return B?t16((B.atual||{}).SALDO||B.em||''):''; }
  /* saldo total (todas as empresas) de um item: {q, fonte:'base'|'pdf'|'', em} */
  function saldoTotal(cod){ const c=String(cod).toUpperCase(), B=baseItens(), pe={}; let rel='';
    todos().forEach(x=>(x.itens||[]).forEach(i=>{ if(String(i.cod).toUpperCase()!==c) return; const k=empK(x), r=t16(x.relData);
      if(!pe[k]||r>=pe[k].rel) pe[k]={q:+i.saldo||0,rel:r}; if(r>rel) rel=r; }));
    const bx=B&&B.l[c], bem=baseEm();
    if(bx&&A.cfg.usarBase!==false&&(!rel||bem>=rel)) return {q:(+bx.a3||0)+(+bx.a30||0),fonte:'base',em:bem};
    const ks=Object.keys(pe); if(ks.length) return {q:ks.reduce((s,k)=>s+pe[k].q,0),fonte:'pdf',em:rel};
    if(bx) return {q:(+bx.a3||0)+(+bx.a30||0),fonte:'base',em:bem}; return {q:0,fonte:'',em:''}; }
  /* produção programada do item: ordens abertas a partir de hoje */
  function prodDe(cod){ const c=String(cod).toUpperCase(), h=hoje();
    return (P.S.ordens||[]).filter(o=>o&&o.status==='aberta'&&String(o.produto||'').toUpperCase()===c&&String(o.data||'')>=h)
      .map(o=>({data:String(o.data).slice(0,10),q:+o.total||0,linha:o.linha||'',num:o.num||''})).sort((a,b)=>a.data.localeCompare(b.data)); }
  const prodTxt=ps=>ps.slice(0,3).map(p=>fN(p.q)+' em '+brC(p.data)+(p.linha?' ('+String(p.linha).replace(/^linha\s*/i,'L')+')':'')).join(' · ');
  const ordK=x=>[x.data||'9999',String(+x.ordemDia>0?x.ordemDia:99).padStart(3,'0'),x.carga||'~',pedList(x)[0]||''].join('|');
  /* plano: consome o saldo total em ordem. extra = pedido simulado (ex.: a data escolhida na janela) */
  function plano(extra){ const key=extra?null:A.abertos.map(x=>x._id+x.data+x.status+(x.ordemDia||'')+(x.alteradoEm||'')).join()+'|'+(P.S.ordens||[]).length+'|'+baseEm()+'|'+(A.cfg.usarBase!==false)+'|'+(A.soDiario?1:0);
    if(key&&A._pl&&A._pl.k===key) return A._pl.v;
    let xs=A.abertos.filter(x=>x.status==='agendado'&&x.data&&(!A.soDiario||String(x.diario||'').trim())); if(extra){ xs=xs.filter(x=>x._id!==extra._id); if(extra.data) xs.push(extra); }
    xs=xs.slice().sort((a,b)=>ordK(a).localeCompare(ordK(b)));
    const usado={}, s0={}, pr={}, porPI={}, porDia={};
    xs.forEach(x=>(x.itens||[]).forEach(i=>{ const q=qtdDe(i); if(!(q>0)) return; const c=String(i.cod).toUpperCase();
      if(!s0[c]){ s0[c]=saldoTotal(c); pr[c]=prodDe(c); }
      const prodAte=pr[c].filter(p=>p.data<x.data).reduce((s,p)=>s+p.q,0), u=usado[c]||0;
      const disp=s0[c].q+prodAte-u, f=Math.max(0,q-Math.max(0,disp)), fs=Math.max(0,q-Math.max(0,s0[c].q-u));
      usado[c]=u+q; porPI[x._id+'|'+c]={falta:f,faltaSemProd:fs,disp,prodAte};
      const D=(porDia[x.data]=porDia[x.data]||{}), o=D[c]||(D[c]={cod:i.cod,desc:i.desc,un:i.un,pede:0,falta:0,faltaSemProd:0,prodAte});
      o.pede+=q; o.falta+=f; o.faltaSemProd+=fs; o.prodAte=prodAte; }));
    const v={porPI,porDia,s0,pr}; if(key) A._pl={k:key,v}; return v; }
  const faltaPl=(pl,x,i)=>{ const r=pl.porPI[x._id+'|'+String(i.cod).toUpperCase()]; return r||null; };
  /* itens que faltam: agendado = pelo plano (com os pedidos antes dele e a produção); sem data = pelo saldo do PDF */
  function faltasDe(x){ if(x.status==='agendado'&&x.data){ const pl=plano(); return (x.itens||[]).filter(i=>{ const r=faltaPl(pl,x,i); return r&&r.falta>0; }); } return semSaldo(x); }
  const diaFaltas=d=>{ const D=plano().porDia[d]||{}; return Object.values(D).filter(o=>o.falta>0); };
  const diaCobertos=d=>{ const D=plano().porDia[d]||{}; return Object.values(D).filter(o=>o.falta<=0&&o.faltaSemProd>0); };
  const limiteDia=()=>+A.cfg.limiteDia>0?+A.cfg.limiteDia:0;
  /* capacidade da carga: veículo comum aos pedidos do grupo */
  function capCarga(ys){ const vk=[...new Set(ys.map(y=>y.veiculo).filter(Boolean))]; const v=vk.length===1?veicDe(vk[0]):null; const r=soma(ys);
    return {v,r,palOver:v&&r.pal>v.pal,kgOver:v&&r.kg>v.kg}; }

  /* "passa de 10 paletes e do peso (6 t) do toco" */
  const capTxt=c=>!c||!c.v?'':'passa '+[c.palOver?'de '+fN(c.v.pal)+' paletes':'',c.kgOver?'do peso ('+fKg(c.v.kg)+')':''].filter(Boolean).join(' e ')+' do '+c.v.nome.toLowerCase();
  /* faixa "só do diário": quantas cargas e se tem material para elas (pelo plano, contando só os pedidos do diário) */
  function faixaDiario(){ if(!A.soDiario) return ''; const h=hoje(), xs=fE(A.abertos).filter(x=>x.status==='agendado'&&x.data), r=soma(xs);
    const ds=[...new Set(xs.map(x=>x.data))].sort(), fal=[]; ds.forEach(d=>diaFaltas(d).forEach(o=>fal.push({d,o})));
    const nc=new Set(xs.map(x=>x.carga?'c'+x.carga:ehCarga(x)?'r'+x._id:'s'+x._id)).size;
    return `<div class="ag-fdx${fal.length?' c':''}"><b>Cargas do diário de bordo</b><span>${xs.length?`${nc} carga${nc>1?'s':''} · ${xs.length} pedido${xs.length>1?'s':''} · ${esc(totDia(r))}`:'Nenhum pedido agendado tem nº do diário.'}</span>
      ${xs.length?(fal.length?`<span class="ag-f">Falta material: ${fal.map(f=>esc(f.o.cod)+' '+esc(fN(f.o.falta))+' ('+esc(f.d===h?'hoje':brC(f.d))+')').join(' · ')}</span>`:'<span class="ag-okt">Tem material para todos os pedidos do diário.</span>'):''}</div>`; }
  /* ---------- ANÁLISE COM O SALDO NOVO (25/11: "quando eu importar o saldo, ele faz uma análise do que tenho que fazer nos agendamentos
     atualizado?") ----------
     A base do PCP (pcpbase/itens) é acompanhada ao vivo; quando a data do saldo muda (importação nova), aparece o aviso "Saldo novo
     importado" com a análise: o que PRODUZIR (falta depois da produção programada, a partir de que dia), as CARGAS SEM MATERIAL por dia,
     os pedidos ESPERANDO DATA que já têm material para agendar e o que MUDOU desde a última análise vista (guardada neste navegador). */
  const LS_AN='ag-analise-'+((P.S&&P.S.uid)||'x');
  function lsLer(){ try{ return JSON.parse(localStorage.getItem(LS_AN)||'null'); }catch(e){ return null; } }
  function lsGravar(o){ try{ localStorage.setItem(LS_AN,JSON.stringify(o)); }catch(e){} }
  function analise(){ const pl=plano(), h=hoje(), ag=A.abertos.filter(x=>x.status==='agendado'&&x.data&&(!A.soDiario||String(x.diario||'').trim()));
    const prod={}, cargas=[], faltas={};
    ag.slice().sort((a,b)=>ordK(a).localeCompare(ordK(b))).forEach(x=>{ const fs=(x.itens||[]).map(i=>({i,r:faltaPl(pl,x,i)})).filter(o=>o.r&&qtdDe(o.i)>0);
      fs.forEach(o=>{ const c=String(o.i.cod).toUpperCase(); faltas[x._id+'|'+c]=o.r.falta; if(o.r.falta>0||o.r.faltaSemProd>0){ const p=prod[c]||(prod[c]={cod:o.i.cod,desc:o.i.desc,un:o.i.un,falta:0,cobre:0,dia:x.data,pp:ppDe(o.i)}); p.falta+=o.r.falta; p.cobre+=Math.max(0,o.r.faltaSemProd-o.r.falta); if(x.data<p.dia) p.dia=x.data; } });
      const f=fs.filter(o=>o.r.falta>0); if(f.length) cargas.push({x,f}); });
    /* esperando data: dá para agendar se o que sobra do saldo (depois de todos os agendados e com a produção programada) cobre o pedido */
    const sobra={}; Object.keys(pl.s0).forEach(c=>{ const usado=ag.reduce((s,x)=>s+(x.itens||[]).filter(i=>String(i.cod).toUpperCase()===c).reduce((t,i)=>t+qtdDe(i),0),0); sobra[c]=pl.s0[c].q+(pl.pr[c]||[]).reduce((s,p)=>s+p.q,0)-usado; });
    const pode=[], naoPode=[];
    A.abertos.filter(x=>x.status==='aguardando'&&(!A.soDiario||String(x.diario||'').trim())).sort((a,b)=>String(a.criadoEm||'').localeCompare(String(b.criadoEm||''))).forEach(x=>{
      const its=(x.itens||[]).filter(i=>qtdDe(i)>0); if(!its.length) return; const fal=[];
      its.forEach(i=>{ const c=String(i.cod).toUpperCase(); if(!(c in sobra)){ const st=saldoTotal(c); sobra[c]=st.q+prodDe(c).reduce((s,p)=>s+p.q,0); } if(qtdDe(i)>sobra[c]) fal.push({i,f:qtdDe(i)-Math.max(0,sobra[c])}); });
      if(!fal.length){ its.forEach(i=>{ sobra[String(i.cod).toUpperCase()]-=qtdDe(i); }); pode.push(x); } else naoPode.push({x,fal}); });
    const prodL=Object.values(prod).sort((a,b)=>a.dia.localeCompare(b.dia)||b.falta-a.falta);
    /* o que mudou desde a última análise vista */
    const ult=lsLer(), mud={ok:[],falta:[]}; if(ult&&ult.faltas){ ag.forEach(x=>(x.itens||[]).forEach(i=>{ const k=x._id+'|'+String(i.cod).toUpperCase(); if(!(k in faltas)||!(k in ult.faltas)) return; if(ult.faltas[k]>0&&faltas[k]<=0) mud.ok.push({x,i}); else if(ult.faltas[k]<=0&&faltas[k]>0) mud.falta.push({x,i,f:faltas[k]}); })); }
    return {em:baseEm(),prodL,cargas,pode,naoPode,mud,ult,faltas,nAg:ag.length,okAg:ag.filter(x=>!cargas.some(c=>c.x._id===x._id)).length}; }
  const novoSaldo=()=>{ const em=baseEm(), u=lsLer(); return !!em&&!!A.lido.a&&(!u||u.em!==em)&&A.abertos.length>0; };
  function janAnalise(){ const u=U(), a=analise(); if(A.jan) A.jan.fechar(); A.ed={analise:true};
    const pedL=x=>`<button type="button" class="lnk" data-act="ag-abrir" data-v="${esc(x._id)}">${esc(pedCurto(x))}</button>${x.cliente?' '+esc(x.cliente):''}`;
    const sec=(t,n,h)=>`<section class="ag-ans"><h3 class="ag-h3">${esc(t)}${n!=null?` <span class="ag-ann">${n}</span>`:''}</h3>${h}</section>`;
    const corpo=`<p class="ag-dica">Saldo da base do PCP ${a.em?'de <b>'+esc(br(a.em.slice(0,10))+' às '+a.em.slice(11))+'</b>':'(não carregado)'}${A.soDiario?' · só as cargas do diário de bordo':''}. O estoque é consumido pelos agendados em ordem de data e soma a produção programada.</p>
      ${u.nums([{r:'Agendados com material',v:a.okAg+' de '+a.nAg,tom:a.okAg<a.nAg?'warn':'ok'},{r:'Itens para produzir',v:a.prodL.filter(p=>p.falta>0).length,tom:a.prodL.some(p=>p.falta>0)?'crit':'ok'},{r:'Podem ser agendados',v:a.pode.length,tom:a.pode.length?'info':'',s:'esperando data, com material'}])}
      ${sec('Produzir',a.prodL.filter(p=>p.falta>0).length,a.prodL.length?`<table class="ag-pit"><thead><tr><th>Item</th><th class="dir">Falta</th><th class="dir">A partir de</th><th class="dir">Produção programada</th></tr></thead><tbody>${a.prodL.map(p=>`<tr${p.falta>0?'':' class="ag-anok"'}><td><b>${esc(p.cod)}</b> <span>${esc(p.desc||'')}</span></td><td class="dir">${p.falta>0?`<b class="ag-f">${esc(qtdUn(p.falta,p.un))}</b>${p.pp>0?'<small> = '+esc(fP(p.falta/p.pp))+' pal.</small>':''}`:'<span class="ag-okt">coberto</span>'}</td><td class="dir">${esc(atl(p.dia))} ${esc(brC(p.dia))}</td><td class="dir">${esc(prodTxt(prodDe(p.cod))||'—')}</td></tr>`).join('')}</tbody></table>`:'<p class="ag-okt">Nada para produzir: o saldo cobre todos os agendados.</p>')}
      ${sec('Cargas sem material',a.cargas.length,a.cargas.length?`<ul class="ag-anl">${a.cargas.map(c=>`<li><span class="ag-and">${esc(atl(c.x.data))} ${esc(brC(c.x.data))}</span><span>${c.x.carga?'Carga '+esc(c.x.carga)+' · ':''}${pedL(c.x)}</span><span class="ag-f">falta ${c.f.map(o=>esc(o.i.cod)+' '+esc(fN(o.r.falta))).join(' · ')}</span>${pode()?`<button type="button" class="lnk" data-act="ag-reag" data-v="${esc(c.x._id)}">Reagendar</button>`:''}</li>`).join('')}</ul>`:'<p class="ag-okt">Todas as cargas agendadas têm material.</p>')}
      ${sec('Já dá para agendar',a.pode.length,a.pode.length?`<ul class="ag-anl">${a.pode.map(x=>`<li><span>${pedL(x)}</span><span>${esc(totDia(soma([x])))}</span>${pode()?`<button type="button" class="ag-bt sec" data-act="ag-abrir" data-v="${esc(x._id)}">Agendar</button>`:''}</li>`).join('')}</ul>${a.naoPode.length?`<p class="ag-dica">Ainda sem material: ${a.naoPode.map(o=>esc(pedCurto(o.x))+' ('+o.fal.map(f=>esc(f.i.cod)+' '+esc(fN(f.f))).join(', ')+')').join(' · ')}</p>`:''}`:(a.naoPode.length?`<p class="ag-dica">Nenhum pedido esperando data tem material completo ainda: ${a.naoPode.map(o=>esc(pedCurto(o.x))).join(', ')}.</p>`:'<p class="ag-dica">Nenhum pedido esperando data.</p>'))}
      ${a.ult&&a.ult.em?sec('O que mudou desde a análise de '+br(String(a.ult.em).slice(0,10))+' '+String(a.ult.em).slice(11),null,(a.mud.ok.length||a.mud.falta.length)?`${a.mud.ok.length?`<p class="ag-okt">Agora tem material: ${a.mud.ok.map(o=>esc(pedCurto(o.x))+' '+esc(o.i.cod)).join(' · ')}</p>`:''}${a.mud.falta.length?`<p class="ag-f">Passou a faltar: ${a.mud.falta.map(o=>esc(pedCurto(o.x))+' '+esc(o.i.cod)+' '+esc(fN(o.f))).join(' · ')}</p>`:''}`:'<p class="ag-dica">Nada mudou nos agendados.</p>'):''}`;
    A.jan=u.janela({tit:'Análise dos agendamentos',sub:a.em?'Saldo de '+br(a.em.slice(0,10))+' '+a.em.slice(11):'',corpo,rodape:`<span style="flex:1"></span>${u.bt('Entendi','ag-anok')}`,larga:true,aoFechar:()=>{ A.jan=null; A.ed=null; lsGravar({em:a.em,faltas:a.faltas,vistoEm:new Date().toISOString()}); P.rerender(); }});
    A.jan.el.classList.add('ag-jan'); }
  /* aviso no topo da tela quando chegou saldo novo */
  function faixaSaldo(){ if(!novoSaldo()) return ''; const a=analise(), nP=a.prodL.filter(p=>p.falta>0).length;
    return `<div class="ag-sn2" role="status"><div><b>Saldo novo importado</b> (${esc(br(a.em.slice(0,10))+' '+a.em.slice(11))}): ${a.cargas.length?`<span class="ag-f">${a.cargas.length} carga${a.cargas.length>1?'s':''} sem material</span>`:'<span class="ag-okt">todas as cargas com material</span>'} · ${nP?nP+' ite'+(nP>1?'ns':'m')+' para produzir':'nada para produzir'} · ${a.pode.length} pedido${a.pode.length===1?'':'s'} já pode${a.pode.length===1?'':'m'} ser agendado${a.pode.length===1?'':'s'}</div><button type="button" class="btn" data-act="ag-analise">Ver análise</button></div>`; }

  /* ---------- ajustes do módulo (limite por dia, sábado, saldo da base, veículos, telefones das transportadoras) ---------- */
  function janAjustes(){ const u=U(); if(A.jan) A.jan.fechar(); A.ed={ajustes:true};
    const vs=veics(), tels=A.cfg.tels||{}, tl=transps();
    const corpo=`<div class="pc-form">
      ${u.campo({r:'Limite de paletes por dia',id:'ag-lim',tipo:'number',v:A.cfg.limiteDia||'',col:6,ph:'Ex.: 80',dica:'O calendário fica laranja quando o dia passa do limite. Vazio = sem limite.'})}
      <div class="pc-c6 ag-ajc"><label class="ag-chk"><input type="checkbox" id="ag-sab"${A.cfg.sabado?' checked':''}> Tem expedição aos sábados</label>
        <label class="ag-chk"><input type="checkbox" id="ag-base"${A.cfg.usarBase!==false?' checked':''}> Usar o saldo da base do PCP quando for mais novo que o PDF</label>
        <small>Base do PCP: ${baseEm()?esc(br(baseEm().slice(0,10))+' '+baseEm().slice(11)):'não carregada'}</small></div></div>
      <h3 class="ag-h3">Veículos</h3><p class="ag-dica">Quantos paletes e quantos quilos cada veículo leva. O painel avisa quando a carga passa.</p>
      <table class="ag-pit ag-vt"><thead><tr><th>Veículo</th><th class="dir">Paletes</th><th class="dir">Peso (kg)</th></tr></thead><tbody>${vs.map((v,k)=>`<tr><td><input class="txt" data-vk="${k}" data-f="nome" value="${esc(v.nome)}"></td><td class="dir"><input class="txt" type="number" min="0" data-vk="${k}" data-f="pal" value="${esc(v.pal)}"></td><td class="dir"><input class="txt" type="number" min="0" data-vk="${k}" data-f="kg" value="${esc(v.kg)}"></td></tr>`).join('')}</tbody></table>
      <h3 class="ag-h3">Telefone das transportadoras</h3>${tl.length?`<table class="ag-pit"><tbody>${tl.map(t=>`<tr><td>${esc(t)}</td><td class="dir"><input class="txt ag-tel" data-t="${esc(t)}" value="${esc(tels[t]||'')}" placeholder="(51) 9…"></td></tr>`).join('')}</tbody></table>`:'<p class="ag-dica">As transportadoras aparecem aqui depois do primeiro pedido salvo com elas.</p>'}`;
    A.jan=u.janela({tit:'Ajustes do Agendamento',corpo,rodape:`<span style="flex:1"></span>${u.bt('Salvar ajustes','ag-ajsalvar')}`,larga:true,aoFechar:()=>{ A.jan=null; A.ed=null; }}); A.jan.el.classList.add('ag-jan'); }
  async function salvarAjustes(){ const el=A.jan.el, vs=veics().map(v=>Object.assign({},v));
    el.querySelectorAll('[data-vk]').forEach(i=>{ const v=vs[+i.dataset.vk]; if(!v) return; v[i.dataset.f]=i.dataset.f==='nome'?i.value.trim()||v.nome:Math.max(0,+i.value||0); });
    const tels=Object.assign({},A.cfg.tels||{}); el.querySelectorAll('.ag-tel').forEach(i=>{ const t=i.dataset.t, v=i.value.trim(); if(v) tels[t]=v; else delete tels[t]; });
    const o={limiteDia:Math.max(0,+val('#ag-lim')||0),sabado:el.querySelector('#ag-sab').checked,usarBase:el.querySelector('#ag-base').checked,veics:vs,tels};
    if(!pode()){ P.toast('Seu acesso é só para ver.'); return; }
    await salvarCfg(o); A.cfg.tels=tels; A.cfg.veics=vs; A._pl=null; A.jan.fechar(); P.toast('Ajustes salvos.'); P.rerender(); }

  /* ---------- aba CALENDÁRIO (25/11, ajuste: "a TV da expedição não está sendo útil, pode tirar; o calendário lateral com os itens e
     total pode ficar no lugar com layout mais organizado; preciso saber quando tá pendente de carregar conforme vou marcando carregado") ----------
     Tela `agcal`: calendário grande do mês (paletes PENDENTES por dia + barra do que já foi carregado) e o painel do dia: carregado × pendente,
     itens (total / carregado / pendente), cargas do dia com a situação e "Carregou", empresas e transferências, ações.
     Os carregados do mês vêm de uma leitura por data (where data no mês), juntados com os abertos/fechados que já estão na tela. */
  function diaPadrao(agd){ const h=hoje(), ds=[...new Set(agd.map(x=>x.data).filter(Boolean))].sort(); return ds.includes(h)?h:(ds.find(d=>d>h)||h); }
  function lerMes(mes){ A.mesDocs=A.mesDocs||{}; if(A.mesDocs[mes]||(A.mesLendo||{})[mes]) return; (A.mesLendo=A.mesLendo||{})[mes]=true;
    P.db().collection(COL).where('data','>=',mes+'-01').where('data','<=',mes+'-31').limit(1500).get()
      .then(q=>{ A.mesDocs[mes]=q.docs.map(d=>normaliza(Object.assign({_id:d.id},d.data()))); }).catch(e=>{ console.warn('[agend] mês',e); A.mesDocs[mes]=[]; })
      .then(()=>{ A.mesLendo[mes]=false; P.rerender(); }); }
  /* pedidos do mês (agendados + carregados), com o que está na tela por cima (mais novo) */
  function doMes(mes){ const m=new Map(); (A.mesDocs&&A.mesDocs[mes]||[]).forEach(x=>m.set(x._id,x)); A.fechados.concat(A.abertos).forEach(x=>{ if(String(x.data||'').slice(0,7)===mes) m.set(x._id,x); else if(m.has(x._id)) m.delete(x._id); });
    return fE([...m.values()]).filter(x=>x.status==='agendado'||x.status==='carregado'); }
  /* carregado × pendente de um grupo, item a item */
  function cxp(xs){ const tot=soma(xs), car=soma(xs.filter(x=>x.status==='carregado')), pen=soma(xs.filter(x=>x.status==='agendado'));
    const it=tot.it.map(i=>{ const c=car.it.find(o=>o.cod===i.cod), p=pen.it.find(o=>o.cod===i.cod); return Object.assign({},i,{cq:c?c.q:0,pq:p?p.q:0,cpal:c&&c.pal!=null?c.pal:null,ppal:p&&p.pal!=null?p.pal:null}); });
    return {tot,car,pen,it,ncar:xs.filter(x=>x.status==='carregado').length,n:xs.length}; }
  const vq=(pal,q,un)=>pal!=null?fP(pal)+' pal.':qtdUn(q,un);
  function vCal(){ const u=U(); if(!u) return '<section class="card"><div class="empty">Carregando…</div></section>';
    const h=hoje(), agd=fE(A.abertos).filter(x=>x.status==='agendado'); if(!A.cal) A.cal=diaPadrao(agd); if(!A.mes) A.mes=A.cal.slice(0,7); lerMes(A.mes);
    const xsM=doMes(A.mes), g={}; xsM.forEach(x=>{ if(x.data) (g[x.data]=g[x.data]||[]).push(x); });
    const [Y,M]=A.mes.split('-').map(Number), ini=new Date(Y,M-1,1,12), nd=new Date(Y,M,0).getDate(), pad=ini.getDay(), lim=limiteDia();
    const nm0=ini.toLocaleDateString('pt-BR',{month:'long'}), nomeMes=nm0[0].toUpperCase()+nm0.slice(1)+' '+Y;
    const cs={}; let mx=lim||1; Object.keys(g).forEach(d=>{ cs[d]=cxp(g[d]); if(!lim) mx=Math.max(mx,cs[d].tot.pal); });
    const eo=empOpcoes(); if(A.emp&&!eo.includes(A.emp)) A.emp='';
    const cel=['D','S','T','Q','Q','S','S'].map(x=>`<span class="ag-cw">${x}</span>`); for(let k=0;k<pad;k++) cel.push('<span class="ag-cd vz" aria-hidden="true"></span>');
    for(let dd=1;dd<=nd;dd++){ const d=A.mes+'-'+String(dd).padStart(2,'0'), c=cs[d], fer=feriado(d), util=diaUtil(d);
      const pend=c?c.pen:null, feito=c&&c.n&&c.ncar===c.n, pct=c&&c.tot.pal>0?Math.round(c.car.pal/c.tot.pal*100):(c&&c.n?Math.round(c.ncar/c.n*100):0);
      const over=c&&lim&&c.tot.pal>lim, fal=c&&c.pen.n&&diaFaltas(d).length, al=c?Math.round(8+26*Math.min(1,c.tot.pal/mx)):0;
      const v=!c?'':feito?'✓':(pend.pal>0?fP(pend.pal):fora(pend).length?fN(fora(pend)[0][1])+' '+String(fora(pend)[0][0]).toLowerCase():'•');
      cel.push(`<button type="button" class="ag-cd${d===h?' hj':''}${d===A.cal?' on':''}${c?' tem':''}${c&&d<h&&!feito?' atr':''}${feito?' ok':''}${over?' over':''}${fal?' fal':''}${!util?' nu':''}"${c&&!over&&!feito&&!(d<h)?` style="--ag-al:${al}%"`:''} data-act="ag-cal" data-v="${d}" aria-pressed="${d===A.cal}" title="${esc([fer?'Feriado: '+(fer.nome||''):'',!util&&!fer?'Sem expedição':'',c?c.ncar+' de '+c.n+' pedidos carregados':'',over?'Passa do limite de '+fN(lim)+' paletes':'',fal?'Falta material':''].filter(Boolean).join(' · '))}" aria-label="${esc(br(d))}${c?': pendente '+esc(totDia(pend)):''}">
        <b>${dd}</b>${v?`<small>${esc(v)}</small>`:fer?'<small class="fer">feriado</small>':''}${c&&!feito&&c.ncar?`<i class="ag-cbar"><i style="width:${pct}%"></i></i>`:''}</button>`); }
    /* painel do dia */
    const d=A.cal, xs=g[d]||[], c=cxp(xs), D=plano().porDia[d]||{}, fer=feriado(d), r=c.tot;
    const tit=d<h?'Já passou':d===h?'Hoje':d===addD(h,1)?'Amanhã':semana(d)[0].toUpperCase()+semana(d).slice(1);
    const pctP=r.pal>0?Math.min(100,Math.round(c.car.pal/r.pal*100)):(c.n?Math.round(c.ncar/c.n*100):0);
    const nota=i=>{ const o=D[String(i.cod).toUpperCase()]; if(!o||!(i.pq>0)) return ''; if(o.falta>0) return `<small class="ag-tfl c">falta ${esc(fN(o.falta))}</small>`; if(o.faltaSemProd>0) return '<small class="ag-tfl">com a produção</small>'; return ''; };
    const itens=c.it.map(i=>`<tr data-b="${esc(norm(i.cod+' '+(i.desc||'')))}"${i.pq>0?'':' class="feito"'}><td><b>${esc(i.cod)}</b><span>${esc(i.desc||'')}</span>${nota(i)}</td><td class="dir">${esc(vq(i.pal,i.q,i.un))}${i.pal!=null?`<small>${esc(qtdUn(i.q,i.un))}</small>`:''}</td><td class="dir ag-cq">${i.cq>0?esc(vq(i.cpal,i.cq,i.un)):'—'}</td><td class="dir ag-pq">${i.pq>0?`<b>${esc(vq(i.ppal,i.pq,i.un))}</b>${i.ppal!=null?`<small>${esc(qtdUn(i.pq,i.un))}</small>`:''}`:'<span class="ag-okt">✓</span>'}</td></tr>`).join('');
    /* transferências (25/11, ajuste: "os itens que já foram carregados têm que sair da parte de transferir"): só o que ainda falta carregar,
       e o botão "Transferido" tira a linha (config/agendamentos.trfFeito["dia|cód|empresa"]) */
    const empr=[...new Set(xs.filter(x=>x.status==='agendado').map(empK))], tf=A.cfg.trfFeito||{}, trf=[], trfOk=[];
    soma(xs.filter(x=>x.status==='agendado')).it.forEach(i=>i.trf.filter(t=>t.falta>0).forEach(t=>{ const k=d+'|'+i.cod+'|'+t.emp, f=tf[k]; if(f&&+f.q>=t.falta) trfOk.push({i,t,f}); else trf.push({i,t,k}); }));
    const gs=gruposDia(xs.filter(x=>x.status==='agendado')), carrs=xs.filter(x=>x.status==='carregado');
    const cargaL=(k,ys,i)=>{ const x0=ys[0], rr=soma(ys), sep=ys.every(y=>y.sep), che=ys.every(y=>y.chegou), fat=ys.every(y=>y.fat), ids=ys.map(y=>y._id).join(',');
      const nome=k==='sem'?'Pedido '+pedCurto(x0):k[0]==='r'?'Carga com '+pedList(x0).length+' pedidos':'Carga '+k.slice(2);
      return `<div class="ag-dc"><b class="ag-dco">${i+1}º</b><div class="ag-dcn"><b>${esc(nome)}</b><small>${esc([[...new Set(ys.map(y=>y.transp).filter(Boolean))].join(' / '),x0.placa||'',(veicDe(x0.veiculo)||{}).nome||'',x0.hora||'',ys.length>1&&k!=='sem'?ys.length+' pedidos':''].filter(Boolean).join(' · ')||(x0.cliente||''))}</small></div>
        <span class="ag-dcp">${esc(totDia(rr))}</span><span class="ag-stx ${che?'info':sep?'ok':'warn'}">${che?'Chegou '+hm(x0.chegou):sep?'Separado '+hm(x0.sep):'Pendente'}</span>${fat?`<span class="ag-fat">Faturado ${esc(hm(x0.fat))}</span>`:''}${pode()?`<button type="button" class="ag-bt" data-act="ag-cgcarregou" data-v="${esc(ids)}">Carregou</button>`:''}</div>`; };
    const lista=[]; gs.forEach(gq=>{ if(gq.k==='sem') gq.ys.forEach(y=>lista.push({k:'sem',ys:[y]})); else lista.push(gq); });
    const painel=`<section class="ag-dp" aria-label="Dia ${esc(br(d))}">
      <header class="ag-dph"><div><h2>${esc(tit)} <span>${esc(br(d))}</span></h2><p>${fer?'Feriado: '+esc(fer.nome||'')+' · ':!diaUtil(d)?'Sem expedição · ':''}${c.n?`${c.n} pedido${c.n>1?'s':''} · ${c.ncar} carregado${c.ncar===1?'':'s'}`:'Nada agendado neste dia.'}</p></div>
        ${c.n?`<div class="ag-dpa"><button type="button" class="ag-bt" data-act="ag-pdfdia" data-v="${d}">PDF do dia</button><button type="button" class="ag-bt sec" data-act="ag-verdia" data-v="${d}">Ver na lista</button></div>`:''}</header>
      ${c.n?`<div class="ag-prog"><div class="ag-pgl"><div><span>Pendente</span><b>${esc(c.pen.n?totDia(c.pen):'Tudo carregado')}</b></div><div class="dir"><span>Carregado</span><b class="ag-okt">${esc(c.ncar?totDia(c.car):'—')}</b></div></div>
        <i class="ag-pgb" role="progressbar" aria-valuenow="${pctP}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pctP}%"></i></i>
        <div class="ag-pgk"><span>Total do dia <b>${esc(totDia(r))}</b></span>${r.kg?`<span>Peso <b>${esc(fKg(r.kg))}</b></span>`:''}<span>Valor <b>${esc(fR(r.vp))}</b></span>${lim?`<span class="${r.pal>lim?'ag-wn':''}">Limite <b>${fN(lim)}</b></span>`:''}</div></div>
      <h3 class="ag-h3">Cargas do dia</h3><div class="ag-dcs">${lista.map((gq,i)=>cargaL(gq.k,gq.ys,i)).join('')||'<p class="ag-dica">Todas as cargas do dia já foram carregadas.</p>'}${carrs.length?`<p class="ag-dcok">Já carregados: ${carrs.map(x=>esc(pedCurto(x))+(x.carregadoEm&&String(x.carregadoEm).length>10?' ('+hm(x.carregadoEm)+')':'')).join(', ')}</p>`:''}</div>
      <div class="ag-h3r"><h3 class="ag-h3">Itens do dia</h3>${c.it.length>=3?`<input type="search" id="ag-tq" class="txt ag-tq" placeholder="Buscar item…" aria-label="Buscar item do dia" autocomplete="off" value="${esc(A.tq||'')}">`:''}</div>
      <div class="pc-rola"><table class="ag-pit ag-dit"><thead><tr><th>Item</th><th class="dir">Total</th><th class="dir">Carregado</th><th class="dir">Pendente</th></tr></thead><tbody class="ag-tl">${itens}</tbody>
        <tfoot><tr><td>Total</td><td class="dir">${esc(totDia(r))}</td><td class="dir">${esc(c.ncar?totDia(c.car):'—')}</td><td class="dir"><b>${esc(c.pen.n?totDia(c.pen):'✓')}</b></td></tr></tfoot></table></div><p class="ag-tqv" hidden>Nenhum item com essa busca.</p>
      ${empr.length>1||trf.length||trfOk.length?`<details class="ag-dpe"${A.dpe?' open':''}><summary>Por empresa${trf.length?' e transferências ('+trf.length+')':trfOk.length?' e transferências (feitas)':''}</summary>
        ${empr.length>1?`<table class="ag-pit"><tbody>${empr.map(e=>{ const ce=cxp(xs.filter(x=>empK(x)===e)); return `<tr><td>${esc(e)}</td><td class="dir">pendente <b>${esc(ce.pen.n?totDia(ce.pen):'✓')}</b></td><td class="dir">total ${esc(totDia(ce.tot))}</td></tr>`; }).join('')}</tbody></table>`:''}
        ${trf.length?`<table class="ag-pit"><thead><tr><th>Transferir</th><th>Para</th><th class="dir">Pedido</th><th class="dir">Saldo</th><th class="dir">Transferir</th><th></th></tr></thead><tbody>${trf.map(o=>`<tr><td><b>${esc(o.i.cod)}</b></td><td>${esc(o.t.emp)}</td><td class="dir">${esc(fN(o.t.q))}</td><td class="dir">${esc(fN(o.t.saldo||0))}</td><td class="dir ag-f">${esc(fN(o.t.falta))}</td><td class="dir">${pode()?`<button type="button" class="ag-bt sec ag-trb" data-act="ag-trf" data-v="${esc(o.k)}|${o.t.falta}">Transferido</button>`:''}</td></tr>`).join('')}</tbody></table>`:''}
        ${trfOk.length?`<p class="ag-dcok">Já transferido: ${trfOk.map(o=>esc(o.i.cod)+' '+esc(fN(o.f.q))+' para '+esc(o.t.emp)+(o.f.em?' ('+esc(hm(o.f.em))+')':'')).join(' · ')}${pode()?` <button type="button" class="lnk" data-act="ag-trfdesf" data-v="${esc(d)}">desfazer</button>`:''}</p>`:''}</details>`:''}`:''}
    </section>`;
    const head=`<div class="head ag-head"><div><div class="eyebrow">AGENDAMENTOS</div><h1>Calendário de carregamentos</h1><div class="sub">Toque num dia para ver os itens, o que já foi carregado e o que ainda está pendente.</div></div>
      <div class="ag-acts">${(()=>{ const cl=classesOpc(); return cl.length>1||A.cls?`<select id="ag-cls" class="txt ag-fs${A.cls?' on':''}" aria-label="Tipo de produto"><option value="">Todos os produtos</option>${cl.map(c=>`<option value="${esc(c)}"${A.cls===c?' selected':''}>${esc(c)}</option>`).join('')}</select>`:''; })()}<button type="button" class="ag-fdb${A.soDiario?' on':''}" data-act="ag-sodiario" aria-pressed="${!!A.soDiario}">${A.soDiario?'✓ ':''}Só do diário de bordo</button>${A.emp||A.soDiario||A.cls||A.tq?'<button type="button" class="lnk ag-limpa" data-act="ag-limpar">Limpar filtros</button>':''}${eo.length>1||A.emp?`<select id="ag-emp" class="txt ag-esel${A.emp?' on':''}" aria-label="Filtrar por empresa"><option value="">Todas as empresas</option>${eo.map(e=>`<option value="${esc(e)}"${A.emp===e?' selected':''}>${esc(e)}</option>`).join('')}</select>`:''}<button type="button" class="btn sec" data-act="ag-pdfsem" data-v="${d}">PDF da semana</button><button type="button" class="btn sec" data-act="ag-csv">Planilha</button></div></div>`;
    if(A.tq) setTimeout(tqFiltra,0);
    return head+faixaSaldo()+faixaDiario()+`<div class="ag-cl2"><section class="ag-cal ag-calg" aria-label="Calendário"><div class="ag-ch"><button type="button" class="ag-mv" data-act="ag-mes" data-v="-1" aria-label="Mês anterior">‹</button><b>${esc(nomeMes)}</b><button type="button" class="ag-mv" data-act="ag-mes" data-v="1" aria-label="Próximo mês">›</button></div>
      <div class="ag-cg7">${cel.join('')}</div>
      <div class="ag-leg"><span><i class="l1"></i>paletes pendentes</span><span><i class="l4"></i>carregado</span>${lim?`<span><i class="l2"></i>passa de ${fN(lim)}</span>`:''}<span><i class="l3"></i>falta material</span><span>← → mudam o dia</span></div></section>${painel}</div>`; }

  /* ---------- PDF do dia (24/11: "precisamos da quantidade de cada empresa para poder transferir e um PDF") ---------- */
  async function pdfDia(d){ const PP=window.Painel&&window.Painel.pdf; if(!PP||!PP.novo){ P.toast('O gerador de PDF ainda não carregou. Tente de novo.'); return; }
    try{ if(!(window.jspdf&&window.jspdf.jsPDF)&&PP.carregar) await PP.carregar(); }catch(e){}
    if(!(window.jspdf&&window.jspdf.jsPDF)){ P.toast('O gerador de PDF não carregou. Confira a internet e tente de novo.'); return; }
    const xs=fE(A.abertos).filter(x=>x.status==='agendado'&&x.data===d); if(!xs.length){ P.toast('Nada agendado neste dia.'); return; }
    const r=soma(xs), es=[...new Set(xs.map(x=>empTxt(x)||'Sem empresa'))].sort(), h=hoje();
    const nome=d===h?'Hoje':d===addD(h,1)?'Amanhã':semana(d)[0].toUpperCase()+semana(d).slice(1);
    try{ const img=await PP.imgs(), Q=PP.novo('Carregamentos · '+br(d),nome+' · '+xs.length+' pedido'+(xs.length>1?'s':'')+(A.emp?' · só '+A.emp:''),img); Q.capa();
      Q.secao('Total do dia');
      Q.kpis([{t:'Paletes',v:r.pal>0?fP(r.pal):'—',s:r.semPal.length?'+ '+foraTxt(r):unTxt(r),c:'pet'},{t:'Quantidade',v:unTxt(r)},{t:'Valor',v:fR(r.vp)},{t:'Pedidos',v:String(xs.length),s:es.join(' · ')}],4);
      const cols=[{t:'Item',w:16},{t:'Descrição',w:44},{t:'Quantidade',w:20,al:'r'},{t:'Paletes',w:13,al:'r'}].concat(es.length>1?es.map(e=>({t:e,w:22,al:'r'})):[]);
      const rows=r.it.map(i=>[i.cod,i.desc||'',qtdUn(i.q,i.un),i.pal!=null?fP(i.pal):'—'].concat(es.length>1?es.map(e=>{ const t=i.trf.find(z=>z.emp===e); return t?fN(t.q)+' '+i.un:''; }):[]));
      const tr=['Total','',unTxt(r),r.pal>0?fP(r.pal):'—'].concat(es.length>1?es.map(e=>totDia(soma(xs.filter(x=>(empTxt(x)||'Sem empresa')===e)))):[]); tr._tot=1; rows.push(tr);
      Q.secao('Itens do dia','soma de todos os pedidos'); Q.tabela(cols,rows);
      if(es.length>1){ Q.secao('Por empresa'); const re=es.map(e=>{ const ys=xs.filter(x=>(empTxt(x)||'Sem empresa')===e), z=soma(ys); return [e,String(ys.length),unTxt(z),totDia(z),fR(z.vp)]; });
        Q.tabela([{t:'Empresa',w:30},{t:'Pedidos',w:10,al:'r'},{t:'Quantidade',w:30,al:'r'},{t:'Paletes / unidades',w:30,al:'r'},{t:'Valor',w:20,al:'r'}],re); }
      const trf=[], tfd=A.cfg.trfFeito||{}; r.it.forEach(i=>i.trf.filter(t=>t.falta>0&&!(tfd[d+'|'+i.cod+'|'+t.emp]&&+tfd[d+'|'+i.cod+'|'+t.emp].q>=t.falta)).forEach(t=>trf.push([i.cod,i.desc||'',t.emp,qtdUn(t.q,i.un),t.saldo!=null?fN(t.saldo):'—',fN(t.falta)+' '+i.un])));
      Q.secao('Transferir entre empresas','pedido da empresa maior que o saldo dela no PDF do Focco');
      if(trf.length){ const c=[{t:'Item',w:14},{t:'Descrição',w:40},{t:'Empresa',w:24},{t:'Pedido',w:18,al:'r'},{t:'Saldo',w:12,al:'r'},{t:'Transferir',w:18,al:'r'}]; trf.forEach(t=>{ t._cor=[null,null,null,null,null,'crit']; }); Q.tabela(c,trf); }
      else Q.vazio('Nenhuma transferência: cada empresa tem saldo para os próprios pedidos.');
      Q.secao('Pedidos e cargas');
      const ord=xs.slice().sort((a,b)=>String(a.carga||'~').localeCompare(String(b.carga||'~'),'pt-BR',{numeric:true}));
      Q.tabela([{t:'Carga',w:16},{t:'Diário',w:9},{t:'Pedido(s)',w:26},{t:'Empresa',w:20},{t:'Cliente',w:30},{t:'Transportadora',w:24},{t:'Quantidade',w:22,al:'r'}],
        ord.map(x=>[x.carga||(ehCarga(x)?'(sem número)':'—'),x.diario||'',pedTodos(x),empTxt(x),x.cliente||'',x.transp||'',unTxt(soma([x]))]));
      Q.fim('carregamentos-'+d+(A.emp?'-'+norm(A.emp).replace(/[^a-z0-9]+/g,'-').replace(/-+$/,''):'')+'.pdf'); P.toast('PDF do dia '+br(d)+' baixado.'); }
    catch(e){ console.warn('[agend] pdf',e); P.toast('Não foi possível gerar o PDF ('+((e&&e.message)||'erro')+').'); } }
  /* ---------- PDF de separação (por carga), PDF da semana e planilha ---------- */
  async function pdfPronto(){ const PP=window.Painel&&window.Painel.pdf; if(!PP||!PP.novo){ P.toast('O gerador de PDF ainda não carregou. Tente de novo.'); return null; }
    try{ if(!(window.jspdf&&window.jspdf.jsPDF)&&PP.carregar) await PP.carregar(); }catch(e){}
    if(!(window.jspdf&&window.jspdf.jsPDF)){ P.toast('O gerador de PDF não carregou. Confira a internet e tente de novo.'); return null; } return PP; }
  async function pdfSep(ids){ const PP=await pdfPronto(); if(!PP) return; const xs=ids.map(deId).filter(Boolean); if(!xs.length) return;
    const r=soma(xs), cap=capCarga(xs), x0=xs[0], k=x0.carga?'Carga '+x0.carga:ehCarga(x0)?'Carga com '+pedList(x0).length+' pedidos':'Pedido '+pedCurto(x0);
    try{ const img=await PP.imgs(), Q=PP.novo('Separação · '+k,[x0.data?br(x0.data):'sem data',x0.diario?'diário nº '+x0.diario:'',x0.transp||'',x0.placa||'',cap.v?cap.v.nome:'',x0.hora||''].filter(Boolean).join(' · '),img); Q.capa();
      Q.kpis([{t:'Paletes',v:r.pal>0?fP(r.pal):'—',s:fora(r).length?'+ '+foraTxt(r):'',c:'pet'},{t:'Quantidade',v:unTxt(r)},{t:'Peso',v:r.kg?fKg(r.kg):'—',s:cap.v?'veículo: '+fKg(cap.v.kg):''},{t:'Pedidos',v:String(xs.length)}],4);
      Q.secao('Itens para separar');
      Q.tabela([{t:'Item',w:16},{t:'Descrição',w:52},{t:'Quantidade',w:24,al:'r'},{t:'Paletes',w:14,al:'r'},{t:'Conferido',w:16}],r.it.map(i=>[i.cod,i.desc||'',qtdUn(i.q,i.un),i.pal!=null?fP(i.pal):'—','[   ]']));
      Q.secao('Pedidos');
      Q.tabela([{t:'Pedido(s)',w:30},{t:'Empresa',w:24},{t:'Cliente',w:44},{t:'Quantidade',w:24,al:'r'}],xs.map(x=>[pedTodos(x),empTxt(x),x.cliente||'',unTxt(soma([x]))]));
      Q.vazio('Separado por: ____________________    Conferido por: ____________________    Hora: ________');
      Q.fim('separacao-'+norm(k).replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'')+'.pdf'); P.toast('PDF de separação baixado.'); }
    catch(e){ console.warn('[agend] pdf sep',e); P.toast('Não foi possível gerar o PDF ('+((e&&e.message)||'erro')+').'); } }
  function semanaDe(d){ const w=new Date(d+'T12:00:00').getDay(), seg=addD(d,-(w===0?6:w-1)); return [0,1,2,3,4,5].map(k=>addD(seg,k)); }
  async function pdfSemana(d){ const PP=await pdfPronto(); if(!PP) return; const ds=semanaDe(d), ab=fE(A.abertos).filter(x=>x.status==='agendado'&&ds.includes(x.data));
    if(!ab.length){ P.toast('Nada agendado nesta semana.'); return; }
    const por={}; ds.forEach(x=>{ por[x]=soma(ab.filter(y=>y.data===x)); }); const tot=soma(ab);
    try{ const img=await PP.imgs(), Q=PP.novo('Carregamentos da semana','de '+br(ds[0])+' a '+br(ds[5])+(A.emp?' · só '+A.emp:''),img); Q.capa();
      Q.kpis([{t:'Paletes',v:tot.pal>0?fP(tot.pal):'—',s:fora(tot).length?'+ '+foraTxt(tot):'',c:'pet'},{t:'Pedidos',v:String(ab.length)},{t:'Peso',v:tot.kg?fKg(tot.kg):'—'},{t:'Valor',v:fR(tot.vp)}],4);
      Q.secao('Por dia');
      Q.tabela([{t:'Dia',w:30},{t:'Pedidos',w:14,al:'r'},{t:'Paletes / unidades',w:46,al:'r'},{t:'Peso',w:20,al:'r'},{t:'Valor',w:26,al:'r'}],ds.map(x=>{ const n=ab.filter(y=>y.data===x).length; return [semana(x)[0].toUpperCase()+semana(x).slice(1)+' '+brC(x),String(n),n?totDia(por[x]):'—',n&&por[x].kg?fKg(por[x].kg):'',n?fR(por[x].vp):'']; }));
      Q.secao('Itens por dia','paletes (ou unidade, quando o item não tem palete)');
      const cols=[{t:'Item',w:16},{t:'Descrição',w:40}].concat(ds.map(x=>({t:semana(x).slice(0,3)+' '+brC(x),w:14,al:'r'})),[{t:'Total',w:16,al:'r'}]);
      const celV=(r,cod)=>{ const i=r.it.find(o=>o.cod===cod); return i?(i.pal!=null?fP(i.pal):fN(i.q)+' '+i.un):''; };
      Q.tabela(cols,tot.it.map(i=>[i.cod,i.desc||''].concat(ds.map(x=>celV(por[x],i.cod)),[i.pal!=null?fP(i.pal):fN(i.q)+' '+i.un])));
      Q.fim('carregamentos-semana-'+ds[0]+'.pdf'); P.toast('PDF da semana baixado.'); }
    catch(e){ console.warn('[agend] pdf semana',e); P.toast('Não foi possível gerar o PDF ('+((e&&e.message)||'erro')+').'); } }
  /* planilha (CSV com ; para o Excel em português): um item por linha, dos pedidos abertos (respeita o filtro de empresa) */
  function planilha(){ const xs=fE(A.abertos).slice().sort((a,b)=>ordK(a).localeCompare(ordK(b))); if(!xs.length){ P.toast('Nada para exportar.'); return; }
    const q=v=>{ const t=String(v==null?'':v); return /[;"\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t; }, n=v=>String(Math.round((+v||0)*100)/100).replace('.',',');
    const L=[['Data','Situação','Faturado','Ordem','Carga','Diário','Transportadora','Placa','Veículo','Horário','Pedido(s)','Reagendado de','Empresa','Cliente','Item','Descrição','Pendente','Un','Paletes','Peso kg','Valor'].join(';')];
    xs.forEach(x=>(x.itens||[]).filter(i=>qtdDe(i)>0).forEach(i=>{ const pp=ppDe(i), q2=qtdDe(i);
      L.push([x.data?br(x.data):'',STN[x.status]||x.status,x.fat?new Date(x.fat).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'',x.ordemDia||'',x.carga||(ehCarga(x)?'(sem número)':''),x.diario||'',x.transp||'',x.placa||'',(veicDe(x.veiculo)||{}).nome||'',x.hora||'',pedTodos(x),(x.reag&&x.reag.length?br(x.reag[0].de):''),empTxt(x),x.cliente||'',i.cod,i.desc||'',n(q2),i.un||'',pp>0?n(q2/pp):'',n(q2*kgUn(i.desc)),n(+i.qtd>0?(+i.valor||0)*q2/(+i.qtd):(+i.valor||0))].map(q).join(';')); }));
    const blob=new Blob(['﻿'+L.join('\r\n')],{type:'text/csv;charset=utf-8'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='agendamentos-'+hoje()+(A.emp?'-'+norm(A.emp).replace(/[^a-z0-9]+/g,'-').replace(/-+$/,''):'')+'.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
    P.toast('Planilha baixada ('+(L.length-1)+' linhas). Abre no Excel.'); }

  /* ---------- indicadores do mês (carregados no prazo, atrasos e motivos, por empresa e transportadora) ---------- */
  async function lerIndic(mes){ A.ind=Object.assign(A.ind||{},{mes,lendo:true}); P.rerender();
    try{ const q=await P.db().collection(COL).where('carregadoEm','>=',mes+'-01').where('carregadoEm','<=',mes+'-31').limit(2000).get();
      A.ind={mes,lendo:false,xs:q.docs.map(d=>normaliza(Object.assign({_id:d.id},d.data()))).filter(x=>x.status==='carregado')}; }
    catch(e){ console.warn('[agend] indicadores',e); A.ind={mes,lendo:false,xs:[],erro:(e&&e.message)||'erro'}; } P.rerender(); }
  function vIndic(){ const u=U(), h=hoje(); if(!A.ind||!A.ind.mes){ lerIndic(h.slice(0,7)); return '<div class="empty">Carregando…</div>'; }
    const I=A.ind; if(I.lendo) return '<div class="empty">Carregando o mês…</div>';
    const [Y,M]=I.mes.split('-').map(Number), nm=new Date(Y,M-1,1,12).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const xs=fE(I.xs||[]), dia=x=>x.carregadoDia||String(x.carregadoEm||'').slice(0,10), noPrazo=xs.filter(x=>!x.data||dia(x)<=x.data), atr=xs.filter(x=>x.data&&dia(x)>x.data);
    const dias=atr.map(x=>Math.round((new Date(dia(x)+'T12:00:00')-new Date(x.data+'T12:00:00'))/864e5)), r=soma(xs);
    const mot={}, vistos=new Set(); let nReag=0; const mp=new Map(); fE(((A.mesDocs&&A.mesDocs[I.mes])||[]).concat(I.xs||[],todos())).forEach(x=>mp.set(x._id,x)); /* o que está na tela (mais novo) por último */
    [...mp.values()].forEach(x=>{ (x.reag||[]).concat(x.atrasos||[]).forEach(a=>{ if(String(a.em||'').slice(0,7)!==I.mes) return; const k=x._id+a.em; if(vistos.has(k)) return; vistos.add(k); if((x.reag||[]).includes(a)) nReag++; if(a.motivo) mot[a.motivo]=(mot[a.motivo]||0)+1; }); });
    const grp=f=>{ const m={}; xs.forEach(x=>{ const k=f(x)||'—'; (m[k]=m[k]||[]).push(x); }); return Object.entries(m).map(([k,ys])=>({k,n:ys.length,r:soma(ys)})).sort((a,b)=>b.r.pal-a.r.pal||b.n-a.n); };
    const pdia={}; xs.forEach(x=>{ const d=dia(x); pdia[d]=(pdia[d]||0)+soma([x]).pal; }); const mxd=Math.max(1,...Object.values(pdia));
    const nd=new Date(Y,M,0).getDate(), barras=[...Array(nd)].map((_,k)=>{ const d=I.mes+'-'+String(k+1).padStart(2,'0'), v=pdia[d]||0; return `<span class="ag-ib" title="${esc(br(d))}: ${esc(fP(v))} paletes"><i style="height:${v?Math.max(4,Math.round(v/mxd*100)):0}%"></i><small>${k+1}</small></span>`; }).join('');
    const tab=(tit,ls)=>ls.length?`<div class="ag-it2"><h3 class="ag-h3">${esc(tit)}</h3><table class="ag-pit"><tbody>${ls.map(o=>`<tr><td>${esc(o.k)}</td><td class="dir">${o.n} pedido${o.n>1?'s':''}</td><td class="dir"><b>${esc(totDia(o.r))}</b></td></tr>`).join('')}</tbody></table></div>`:'';
    return `<div class="ag-ind"><div class="ag-ich"><button type="button" class="ag-mv" data-act="ag-imes" data-v="-1" aria-label="Mês anterior">‹</button><b>${esc(nm[0].toUpperCase()+nm.slice(1))}</b><button type="button" class="ag-mv" data-act="ag-imes" data-v="1" aria-label="Próximo mês">›</button></div>
      ${I.erro?`<p class="ag-f">Não foi possível ler o mês (${esc(I.erro)}).</p>`:''}
      ${u.nums([{r:'Carregados',v:xs.length,s:totDia(r)},{r:'No dia combinado',v:xs.length?Math.round(noPrazo.length/xs.length*100)+'%':'—',tom:xs.length&&noPrazo.length/xs.length<0.9?'warn':'ok',s:noPrazo.length+' pedido'+(noPrazo.length===1?'':'s')},{r:'Atrasados',v:atr.length,tom:atr.length?'crit':'',s:atr.length?'em média '+fN(dias.reduce((a,b)=>a+b,0)/atr.length,1)+' dia(s)':''},{r:'Reagendamentos',v:nReag,tom:nReag?'warn':'',s:'mudanças de data no mês'},{r:'Valor carregado',v:fR(r.vp)}])}
      <div class="ag-ibs" aria-label="Paletes carregados por dia">${barras}</div>
      <div class="ag-ig">${Object.keys(mot).length?`<div class="ag-it2"><h3 class="ag-h3">Motivos dos atrasos e reagendamentos</h3><table class="ag-pit"><tbody>${Object.entries(mot).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<tr><td>${esc(k)}</td><td class="dir"><b>${n}</b></td></tr>`).join('')}</tbody></table></div>`:''}
        ${tab('Por empresa',grp(empK))}${tab('Por transportadora',grp(x=>x.transp))}</div>
      ${!xs.length?u.vazio({tit:'Nenhum pedido carregado neste mês',txt:'Os indicadores contam os pedidos marcados como "Carregou".'}):''}</div>`; }

  const ic=(n,t)=>{ try{ return U().ic(n,t); }catch(e){ return ''; } };
  /* estado vazio que ensina o caminho */
  const vazioPassos=()=>`<div class="ag-vz"><h3>Comece pelo PDF do Focco</h3><ol><li><b>Importe</b> o "Mapa de Itens" do pedido (ou arraste o PDF para esta tela).</li><li><b>Escolha a data</b> na janela do pedido: o painel mostra o estoque e os paletes do dia.</li><li><b>Monte a carga</b> marcando os pedidos do mesmo caminhão.</li></ol>${pode()?`<label class="btn ag-imp">${ic('agendar',16)}Importar PDF<input type="file" class="ag-file2" accept=".pdf,application/pdf" multiple hidden></label>`:''}</div>`;
  function vTela(){ const u=U(); if(!u) return '<section class="card"><div class="empty">Carregando…</div></section>';
    const h=hoje(), ab=fE(A.abertos), ag=ab.filter(x=>x.status!=='agendado'), agd=ab.filter(x=>x.status==='agendado');
    const atr=agd.filter(x=>x.data<h), velhos=ag.filter(x=>x.criadoEm&&(Date.now()-new Date(x.criadoEm).getTime())>3*864e5);
    const car=fE(A.fechados).filter(x=>x.status==='carregado'), can=fE(A.fechados).filter(x=>x.status==='cancelado');
    const eo=empOpcoes(); if(A.emp&&!eo.includes(A.emp)) A.emp='';
    const head=`<div class="head ag-head"><div><div class="eyebrow">AGENDAMENTOS</div><h1>Agendamentos de pedidos</h1><div class="sub">Importe o PDF do Focco (ou arraste para esta tela), confira o estoque e escolha a data.</div>
        ${ag.length||atr.length?`<div class="ag-alt">${ag.length?`<button type="button" class="ag-al1 warn" data-act="ag-aba" data-v="aguardando">${ag.length} esperando data${velhos.length?' ('+velhos.length+' há mais de 3 dias)':''}</button>`:''}${atr.length?`<button type="button" class="ag-al1 crit" data-act="ag-aba" data-v="agendado">${atr.length} com a data passada</button>`:''}</div>`:''}</div>
      <div class="ag-acts">${pode()?`<button type="button" class="btn sec" data-act="ag-colar">Colar texto</button><label class="btn ag-imp">${ic('agendar',16)}Importar PDF<input type="file" id="ag-file" accept=".pdf,application/pdf" multiple hidden></label><button type="button" class="btn sec" data-act="ag-analise" title="O que produzir, cargas sem material e o que já dá para agendar, com o saldo mais novo">Análise</button><button type="button" class="btn sec" data-act="ag-ajustes" title="Limite de paletes por dia, veículos, sábado, telefones">Ajustes</button>`:''}</div></div>
      ${A.lendo?`<div class="ag-lendo" id="ag-drop"><span class="ag-spin"></span>${esc(A.lendo)}</div>`:`<div class="ag-drop" id="ag-drop" aria-hidden="true"><div><b>Solte o PDF do Focco aqui</b><span>Pode ser mais de um</span></div></div>`}`;
    /* barra (25/11, "melhorar o layout"): linha 1 = abas + busca; linha 2 = filtros (empresa, produto, dias, diário) + limpar + copiar */
    const cl=classesOpc(), pr=A.per||{}, visiveis=()=>{ if(A.aba==='aguardando') return filtra(ag); if(A.aba==='agendado') return filtra(agd).filter(naPer).filter(x=>!A.dia||x.data===A.dia); if(A.aba==='carregado') return filtra(car).filter(naPer); if(A.aba==='cancelado') return filtra(can).filter(naPer); return []; };
    A._vis=visiveis;
    const barra=`<div class="ag-bar"><div class="ag-br1">${u.chips([['aguardando','Esperando data',ag.length,A.aba==='aguardando'],['agendado','Agendados',agd.length,A.aba==='agendado'],['carregado','Carregados',car.length,A.aba==='carregado'],['cancelado','Cancelados',can.length,A.aba==='cancelado'],['indic','Indicadores',null,A.aba==='indic']],'ag-aba')}
        ${A.aba==='indic'?'':`<input type="search" id="ag-q" class="txt ag-q" aria-label="Buscar agendamento" autocomplete="off" placeholder="Buscar pedido, cliente, carga, item…  ( / )" value="${esc(A.q)}">`}</div>
      <div class="ag-br2" role="group" aria-label="Filtros"><span class="ag-brl">Filtros</span>
        ${eo.length>1||A.emp?`<select id="ag-emp" class="txt ag-fs${A.emp?' on':''}" aria-label="Empresa"><option value="">Todas as empresas</option>${eo.map(e=>`<option value="${esc(e)}"${A.emp===e?' selected':''}>${esc(e)}</option>`).join('')}</select>`:''}
        ${cl.length>1||A.cls?`<select id="ag-cls" class="txt ag-fs${A.cls?' on':''}" aria-label="Tipo de produto"><option value="">Todos os produtos</option>${cl.map(c=>`<option value="${esc(c)}"${A.cls===c?' selected':''}>${esc(c)}</option>`).join('')}</select>`:''}
        ${A.aba==='aguardando'||A.aba==='indic'?'':`<select id="ag-per" class="txt ag-fs${A.per?' on':''}" aria-label="Dias"><option value="">Todos os dias</option>${[['hoje','Hoje'],['amanha','Amanhã'],['semana','Esta semana'],['prox7','Próximos 7 dias'],['datas','Escolher datas…']].map(([v,t])=>`<option value="${v}"${pr.t===v?' selected':''}>${t}</option>`).join('')}</select>${pr.t==='datas'?`<span class="ag-fdt"><input type="date" id="ag-pde" class="txt" value="${esc(pr.de||'')}" aria-label="De"><span>até</span><input type="date" id="ag-pate" class="txt" value="${esc(pr.ate||'')}" aria-label="Até"></span>`:''}`}
        <button type="button" class="ag-fdb${A.soDiario?' on':''}" data-act="ag-sodiario" aria-pressed="${!!A.soDiario}">${A.soDiario?'✓ ':''}Só do diário</button>
        ${A.aba==='carregado'||A.aba==='cancelado'||A.aba==='indic'?'':`<button type="button" class="ag-fdb${A.soFat?' on':''}" data-act="ag-sofat" aria-pressed="${!!A.soFat}" title="Pedidos já faturados que ainda não carregaram">${A.soFat?'✓ ':''}Faturado, falta carregar${(()=>{ const n=A.abertos.filter(x=>x.fat).length; return n?' ('+n+')':''; })()}</button>`}
        ${temFiltro()?'<button type="button" class="lnk ag-limpa" data-act="ag-limpar">Limpar filtros</button>':''}
        <span class="ag-cesp"></span>${A.aba==='indic'?'':`<button type="button" class="ag-bt sec ag-cpb" data-act="ag-copiar" title="Copia os números dos pedidos da lista (com os filtros), separados por vírgula, para colar no Focco">Copiar pedidos</button>`}</div></div>`;
    let corpo='';
    if(!A.lido.a) corpo='<div class="empty">Carregando…</div>';
    else if(A.aba==='indic') corpo=vIndic();
    else if(!todos().length) corpo=vazioPassos();
    else if(A.aba==='aguardando'){ const xs=filtra(ag).sort((a,b)=>String(a.criadoEm||'').localeCompare(String(b.criadoEm||'')));
      corpo=xs.length?'<div class="ag-grp">'+xs.map(x=>linha(x,{bt:['Agendar','ag-abrir'],ck:true})).join('')+'</div>':u.vazio({tom:A.q?'':'ok',tit:A.q?'Nada com essa busca':'Nenhum pedido esperando data',txt:A.q?'':'Quando o faturamento mandar um pedido, importe o PDF do Focco.'}); }
    else if(A.aba==='agendado'){ let xs=filtra(agd).filter(naPer); if(A.dia) xs=xs.filter(x=>x.data===A.dia); const g={}; xs.forEach(x=>(g[x.data]=g[x.data]||[]).push(x));
      const ds=Object.keys(g).sort();
      corpo=(A.dia?`<div class="ag-fil">Mostrando só <b>${esc(atl(A.dia))} · ${esc(br(A.dia))}</b> <button type="button" class="lnk" data-act="ag-dia" data-v="">Ver todos os dias</button></div>`:'')
        +(ds.length?ds.map(d=>grupoDia(d,g[d])).join(''):u.vazio({tit:A.q?'Nada com essa busca':A.dia?'Nada agendado neste dia':'Nenhum pedido agendado'}))
        +(ds.length?'<p class="ag-dica">Os itens, o total e o que falta carregar de cada dia estão na aba Calendário.</p>':''); }
    else { const xs=filtra(A.aba==='carregado'?car:can).filter(naPer);
      corpo=xs.length?'<div class="ag-grp">'+xs.map(x=>linha(x,{st:true,bt:['Reabrir','ag-reabrir',1]})).join('')+'</div>':u.vazio({tit:A.q?'Nada com essa busca':'Nenhum pedido '+(A.aba==='carregado'?'carregado':'cancelado')+' ainda'});
      if(xs.length) corpo+=`<p class="ag-dica">Mostrando os últimos ${A.fechados.length>=80?'80 ':''}pedidos fechados. Os do mês inteiro estão em Indicadores.</p>`; }
    [...A.sel].forEach(id=>{ const x=deId(id); if(!x||!x.aberto) A.sel.delete(id); });
    const ms=[...A.sel].map(deId).filter(Boolean), rm=soma(ms);
    const marc=ms.length&&(A.aba==='aguardando'||A.aba==='agendado')?`<div class="ag-mk" role="region" aria-label="Pedidos marcados"><span><b>${ms.length} pedido${ms.length>1?'s':''} marcado${ms.length>1?'s':''}</b> · ${esc(ms.map(pedCurto).join(', '))}</span><span class="ag-mkt">${esc(unTxt(rm))} · <b>${esc(totDia(rm))}</b>${rm.kg?' · '+esc(fKg(rm.kg)):''}</span>
      <span class="ag-mkb"><button type="button" class="lnk" data-act="ag-selnada">Desmarcar</button><button type="button" class="ag-bt sec" data-act="ag-copiarsel">Copiar pedidos</button><button type="button" class="btn" data-act="ag-montar">Montar carga</button></span></div>`:'';
    const dicaM=pode()&&(A.aba==='aguardando'||A.aba==='agendado')&&!ms.length&&A.abertos.length>1?`<p class="ag-dm">Marque os pedidos do mesmo caminhão para montar a carga.</p>`:'';
    if(A.tq) setTimeout(tqFiltra,0);
    if(A.rolar){ const d=A.rolar; A.rolar=''; setTimeout(()=>{ const s=document.getElementById('ag-d-'+d); if(s){ s.scrollIntoView({behavior:'smooth',block:'start'}); s.classList.add('ag-pisca'); setTimeout(()=>s.classList.remove('ag-pisca'),1600); } },60); }
    return head+faixaSaldo()+`<div class="ag-main ag-full">${u.cartao({cls:'ag-lista',corpo:barra+faixaDiario()+(A.aba==='indic'?'':`<div id="ag-comp">${comp()}</div>`)+dicaM+`<div id="ag-corpo">${corpo}</div>`+marc})}</div>`; }

  /* ---------- montar carga: vários pedidos no mesmo caminhão ---------- */
  function janCarga(ids){ const u=U(); if(A.jan) A.jan.fechar(); const xs=ids.map(deId).filter(Boolean); if(!xs.length) return;
    const um=k=>{ const v=[...new Set(xs.map(x=>x[k]||''))]; return v.length===1?v[0]:''; };
    const c0={carga:um('carga'),diario:um('diario'),transp:um('transp'),placa:um('placa'),veiculo:um('veiculo'),hora:um('hora'),data:um('data'),semCarga:xs.every(x=>x.semCarga&&!x.carga)};
    const r=soma(xs), cap=capCarga(xs), atrasado=xs.some(x=>x.status==='agendado'&&x.data&&x.data<hoje());
    A.ed={carga:ids};
    const corpo=`<div class="ag-jg"><div class="pc-form ag-fm">${empCampo(null,true)}${camposCarga(c0,{carga:true,atrasado,agendado:xs.some(x=>x.status==='agendado')})}</div>
      <aside class="ag-res"><div id="ag-totp"><div class="ag-rl">Total da carga</div><div class="ag-pbig">${esc(palTxt(r))}</div><div class="ag-run">${esc(unTxt(r))}${r.kg?' · '+esc(fKg(r.kg)):''}</div>${fora(r).length?`<div class="ag-rw">Sem palete (ficam na unidade): ${esc(foraTxt(r))}</div>`:''}<div class="ag-rs"><span>${xs.length} pedidos · ${esc(fR(r.val))}</span>${cap.palOver||cap.kgOver?`<b class="ag-f">${esc(capTxt(cap).replace(/^p/,'P'))}</b>`:''}</div></div></aside></div>
      <h3 class="ag-h3">Pedidos desta carga</h3><div class="ag-cpl">${xs.map(x=>{ const rx=soma([x]); return `<div><b title="${esc(pedTodos(x))}">${esc(pedCurto(x))}</b><span>${esc(x.cliente||'sem cliente')}</span><span>${esc(unTxt(rx))}</span><b class="ag-q1">${esc(palTxt(rx))}</b></div>`; }).join('')}</div>
      <h3 class="ag-h3">Paletes por item</h3>${porItem(r)}`;
    A.jan=u.janela({tit:'Montar carga · '+xs.length+' pedido'+(xs.length>1?'s':''),sub:xs.map(pedTodos).join(', '),corpo,rodape:`<span style="flex:1"></span>${u.bt('Salvar carga','ag-cgsalvar')}`,larga:true,aoFechar:()=>{ A.jan=null; A.ed=null; }});
    A.jan.el.classList.add('ag-jan'); }
  async function salvarCarga(){ const ids=(A.ed&&A.ed.carga)||[]; const emp=empLida(); if(emp===false) return;
    const c=Object.assign({...(emp!==undefined?{empresa:emp}:{})},lerCarga()), h=hoje();
    const atr=ids.map(deId).filter(x=>x&&x.status==='agendado'&&x.data&&x.data<h&&x.data!==c.data); let motivo='';
    if(atr.length){ motivo=val('#ag-motivo'); if(!motivo){ P.toast('Escolha o motivo do atraso.'); return; } }
    const st=c.data?'agendado':'aguardando', peds=ids.map(deId).filter(Boolean).map(x=>x.pedido).join(', ');
    try{ for(const id of ids){ const x=deId(id); if(!x) continue; const fech=x.status==='carregado'||x.status==='cancelado';
        const o=Object.assign({},c,fech?{}:{status:st,aberto:true}); const mud=[];
        const rg=reagDe(x,c.data,motivo||val('#ag-motivo')); if(rg){ Object.assign(o,rg); mud.push('Reagendado de '+br(x.data)+(rg.reag[rg.reag.length-1].motivo?' · Motivo: '+rg.reag[rg.reag.length-1].motivo:'')); }
        if((x.carga||'')!==c.carga) mud.push(c.carga?'Carga '+c.carga:'Sem carga');
        if(emp!==undefined&&empTxt({empresa:emp})!==empTxt(x)) mud.push(emp?'Empresa: '+empTxt({empresa:emp})+' (à mão)':'Empresa tirada'); if((x.data||'')!==c.data) mud.push(c.data?'Agendado para '+br(c.data):'Data tirada');
        CAMPOS_CARGA.forEach(([k,r])=>{ if((x[k]||'')!==(c[k]||'')&&c[k]) mud.push(r+': '+(k==='veiculo'?(veicDe(c[k])||{}).nome||c[k]:c[k])); });
        await grava(id,o,mud.length?mud.join(' · ')+' (carga montada com '+peds+')':null); }
      if(c.transp&&!(A.cfg.transps||[]).includes(c.transp)) salvarCfg({transps:(A.cfg.transps||[]).concat([c.transp]).sort((a,b)=>a.localeCompare(b,'pt-BR')).slice(-300)});
      const r=soma(ids.map(deId).filter(Boolean)); A.sel.clear(); if(A.jan) A.jan.fechar(); if(c.data) A.aba='agendado';
      P.toast((c.carga?'Carga '+c.carga:'Carga')+(c.diario?' · diário nº '+c.diario:'')+' · '+ids.length+' pedidos · '+palTxt(r)+(c.data?' · '+br(c.data):'')+'.'); P.rerender(); }
    catch(e){ P.erro(e); } }
  /* ordem de carregamento do dia: troca a carga com a vizinha e renumera 1, 2, 3… */
  async function mudaOrdem(ids,dir){ const x0=deId(ids[0]); if(!x0||!x0.data) return; const gs=gruposDia(fE(A.abertos).filter(x=>x.status==='agendado'&&x.data===x0.data)).filter(g=>g.k!=='sem');
    const i=gs.findIndex(g=>g.ys.some(y=>y._id===ids[0])), j=i+dir; if(i<0||j<0||j>=gs.length) return; const t=gs[i]; gs[i]=gs[j]; gs[j]=t;
    for(let k=0;k<gs.length;k++) for(const y of gs[k].ys) if(+y.ordemDia!==k+1) await grava(y._id,{ordemDia:k+1},null);
    P.rerender(); }
  /* colar o texto do "Mapa de Itens" (copiado do PDF ou da tela do Focco) */
  function janColar(){ const u=U(); if(A.jan) A.jan.fechar(); A.ed={colar:true};
    A.jan=u.janela({tit:'Colar texto do Focco',sub:'Copie o "Mapa de Itens" (Ctrl+A, Ctrl+C no PDF) e cole aqui',corpo:`<textarea id="ag-txt" class="txt ag-txt" rows="12" placeholder="Empresa.........: 9 - FIXCOL…&#10;Pedido..........: 169992&#10;AC0005  ARGAMASSA CINZA AC3 EMB PAPEL 20 KG  SC  576,000  0,000  0,000  576,000  702,000  9.918,070"></textarea><p class="ag-dica" id="ag-txtv"></p>`,rodape:`<span style="flex:1"></span>${u.bt('Ler e salvar','ag-colarok')}`,larga:true,foco:true,aoFechar:()=>{ A.jan=null; A.ed=null; }}); A.jan.el.classList.add('ag-jan'); }
  /* texto → as mesmas "linhas" do PDF (pedaços com x), sem o cabeçalho das colunas */
  function linhasTexto(t){ return String(t||'').split(/\r?\n/).map(l=>l.replace(/ /g,' ').trim()).filter(l=>l&&!(/Descri/i.test(l)&&/\bUn\.?\b/i.test(l)))
    .map(l=>/^\S[^:]*?\.{2,}\s*:/.test(l)?[{x:0,t:l}]:l.split(/\s+/).map((t,k)=>({x:k*10,t}))); }
  async function salvarColado(){ const R=lerMapa(linhasTexto(val('#ag-txt'))), v=A.jan&&A.jan.el.querySelector('#ag-txtv');
    if(!R.itens.length){ if(v) v.textContent='Não achei os itens no texto. Copie o "Mapa de Itens" inteiro, com a linha "Pedido....: número".'; return; }
    if(!R.pedido){ A.jan.fechar(); abrirNovo(R,'texto colado'); return; }
    try{ const x=await salvarLido(R,'texto colado'); A.jan.fechar(); editar(x._id); }catch(e){ P.erro(e); } }

  /* ---------- avisos no Meu dia ---------- */
  if(P.registrarAviso) P.registrarAviso(()=>{ if(!A.lido.a) return []; const h=hoje(), out=[];
    const atr=A.abertos.filter(x=>x.status==='agendado'&&x.data&&x.data<h), hj=A.abertos.filter(x=>x.status==='agendado'&&x.data===h), ag=A.abertos.filter(x=>x.status==='aguardando');
    if(atr.length) out.push({nivel:'crit',rotulo:'Agendamento',titulo:atr.length+' pedido'+(atr.length>1?'s':'')+' com a data já passada',texto:'Sem marcar "Carregou": '+atr.slice(0,4).map(x=>x.pedido+(x.cliente?' ('+x.cliente+')':'')).join(', ')+(atr.length>4?'…':''),go:'agendamentos'});
    if(hj.length) out.push({nivel:'warn',rotulo:'Agendamento',titulo:hj.length+' pedido'+(hj.length>1?'s':'')+' para carregar hoje · '+palTxt(soma(hj)),texto:unTxt(soma(hj))+' · '+hj.slice(0,4).map(x=>x.pedido+(x.cliente?' ('+x.cliente+')':'')).join(', ')+(hj.length>4?'…':''),go:'agendamentos'});
    const velhos=ag.filter(x=>x.criadoEm&&(Date.now()-new Date(x.criadoEm).getTime())>3*864e5);
    if(ag.length) out.push({nivel:velhos.length?'crit':'warn',rotulo:'Agendamento',titulo:ag.length+' pedido'+(ag.length>1?'s':'')+' esperando data'+(velhos.length?' ('+velhos.length+' há mais de 3 dias)':''),texto:velhos.length?'Mais antigos: '+velhos.slice(0,4).map(x=>pedCurto(x)+(x.cliente?' ('+x.cliente+')':'')).join(', '):'Confira o estoque e escolha quando agendar.',go:'agendamentos'});
    const prox=[h,proxUtil(h,1)].filter((d,k,a)=>a.indexOf(d)===k), fal=prox.map(d=>({d,f:diaFaltas(d)})).filter(o=>o.f.length);
    if(fal.length) out.push({nivel:'crit',rotulo:'Agendamento',titulo:'Falta material para carregar '+fal.map(o=>o.d===h?'hoje':brC(o.d)).join(' e '),texto:fal.map(o=>o.f.slice(0,3).map(i=>i.cod+' '+fN(i.falta)).join(', ')).join(' · '),go:'agendamentos'});
    if(novoSaldo()){ const an=analise(); out.push({nivel:an.cargas.length?'crit':'info',rotulo:'Agendamento',titulo:'Saldo novo: veja a análise dos agendamentos',texto:(an.cargas.length?an.cargas.length+' carga(s) sem material · ':'Todas as cargas com material · ')+an.pode.length+' pedido(s) já podem ser agendados',go:'agendamentos'}); }
    const lim=limiteDia(); if(lim){ const ov=prox.filter(d=>soma(A.abertos.filter(x=>x.status==='agendado'&&x.data===d)).pal>lim); if(ov.length) out.push({nivel:'warn',rotulo:'Agendamento',titulo:'Passa do limite de '+fN(lim)+' paletes: '+ov.map(d=>d===h?'hoje':brC(d)).join(' e '),texto:'Mude a data de algum pedido ou aumente o limite nos Ajustes.',go:'agendamentos'}); }
    return out; });

  /* ---------- ações ---------- */
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-act^="ag-"]'); if(!b) return; const act=b.dataset.act, v=b.dataset.v||'';
    if(act==='ag-aba'){ A.aba=v; A.dia=''; P.rerender(); return; }
    if(act==='ag-sel'){ if(b.checked) A.sel.add(v); else A.sel.delete(v); P.render(); return; } /* render: o rerender espera o campo em foco sair */
    if(act==='ag-selnada'){ A.sel.clear(); P.render(); return; }
    if(act==='ag-montar'){ janCarga([...A.sel]); return; }
    if(act==='ag-cgedit'){ janCarga(v.split(',').filter(Boolean)); return; }
    if(act==='ag-cgsalvar'){ salvarCarga(); return; }
    if(act==='ag-pdfdia'){ pdfDia(v); return; }
    if(act==='ag-sofat'){ A.soFat=!A.soFat; P.render(); return; }
    if(act==='ag-sodiario'){ A.soDiario=!A.soDiario; A._pl=null; P.render(); return; }
    if(act==='ag-analise'){ janAnalise(); return; }
    if(act==='ag-anok'){ if(A.jan) A.jan.fechar(); return; }
    if(act==='ag-limpar'){ A.emp=''; A.soDiario=false; A.soFat=false; A.cls=''; A.per=null; A.q=''; A.dia=''; A.tq=''; A._pl=null; P.render(); return; }
    if(act==='ag-copiar'){ copiar(A._vis?A._vis():[],'da lista'); return; }
    if(act==='ag-copiarsel'){ copiar([...A.sel].map(deId).filter(Boolean),'marcados'); return; }
    if(act==='ag-copiarids'){ copiar(v.split(',').map(deId).filter(Boolean)); return; }
    if(act==='ag-trf'){ const i=v.lastIndexOf('|'), k=v.slice(0,i), q=+v.slice(i+1); salvarCfg({trfFeito:{[k]:{q,em:new Date().toISOString(),por:eu()}}}).then(()=>{ P.toast('Transferência marcada como feita.'); P.rerender(); }); return; }
    if(act==='ag-trfdesf'){ const tf=Object.assign({},A.cfg.trfFeito||{}); Object.keys(tf).forEach(k=>{ if(k.startsWith(v+'|')) tf[k]=null; }); P.db().doc('config/agendamentos').set({trfFeito:tf},{merge:true}).then(()=>{ Object.keys(tf).forEach(k=>{ if(tf[k]===null) delete tf[k]; }); A.cfg.trfFeito=tf; P.rerender(); }).catch(e=>P.erro(e)); return; }
    if(act==='ag-cal'){ A.cal=v; A.mes=v.slice(0,7); A.tq=''; P.rerender(); return; }
    if(act==='ag-verdia'){ A.dia=v; A.aba='agendado'; A.rolar=v; P.go('agendamentos'); return; }
    if(act==='ag-reag'){ if(A.ed&&A.ed.analise&&A.jan) A.jan.fechar(); janReagendar(v.split(',').filter(Boolean)); return; }
    if(act==='ag-reagok'){ const d=val('#ag-data'), m=val('#ag-motivo'), ids=(A.ed&&A.ed.reag)||[]; if(!d){ P.toast('Escolha a nova data.'); return; } const h=hoje(); if(!m&&ids.some(id=>{ const x=deId(id); return x&&x.data&&x.data<h; })){ P.toast('A data já passou: escolha o motivo.'); return; } A.jan.fechar(); moverPara(ids,d,'reagendou',m||'-'); return; }
    if(act==='ag-etapa'){ const [k,ids]=v.split('|'); etapa(ids.split(',').filter(Boolean),k); return; }
    if(act==='ag-cgcarregou'){ etapa(v.split(',').filter(Boolean),'carregou'); return; }
    if(act==='ag-ord'){ const [ids,dir]=v.split('|'); mudaOrdem(ids.split(',').filter(Boolean),+dir); return; }
    if(act==='ag-adiar'){ const h=hoje(); moverPara(v.split(',').filter(Boolean),diaUtil(h)?h:proxUtil(h,0),'passou para o próximo dia útil'); return; }
    if(act==='ag-motok'){ const m=val('#ag-motivo'); if(!m){ P.toast('Escolha o motivo.'); return; } const cb=A.ed&&A.ed.cb; A.jan.fechar(); if(cb) cb(m); return; }
    if(act==='ag-dividir'){ janDividir(v); return; }
    if(act==='ag-dvsalvar'){ salvarDividir(v); return; }
    if(act==='ag-pdfsep'){ pdfSep(v.split(',').filter(Boolean)); return; }
    if(act==='ag-pdfsem'){ pdfSemana(v); return; }
    if(act==='ag-csv'){ planilha(); return; }
    if(act==='ag-imes'){ const [y,m]=((A.ind&&A.ind.mes)||hoje().slice(0,7)).split('-').map(Number), x=new Date(y,m-1+(+v),1,12); lerIndic(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')); return; }
    if(act==='ag-ajustes'){ janAjustes(); return; }
    if(act==='ag-ajsalvar'){ salvarAjustes(); return; }
    if(act==='ag-colar'){ janColar(); return; }
    if(act==='ag-colarok'){ salvarColado(); return; }
    if(act==='ag-tab'){ const j=A.jan&&A.jan.el; if(!j) return; j.querySelectorAll('.ag-tabs button').forEach(x=>x.classList.toggle('on',x===b)); j.querySelectorAll('.ag-sec').forEach(x=>x.classList.toggle('on',x.dataset.tab===v)); return; }
    if(act==='ag-mes'){ const [y,m]=(A.mes||hoje().slice(0,7)).split('-').map(Number), x=new Date(y,m-1+(+v),1,12); A.mes=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'); P.rerender(); return; }
    if(act==='ag-dia'){ A.dia=v&&A.dia!==v?v:''; if(v){ A.cal=v; A.mes=v.slice(0,7); } A.aba='agendado'; P.rerender(); return; }
    if(act==='ag-abrir'){ if(A.ed&&A.ed.analise&&A.jan) A.jan.fechar(); editar(v); return; } /* closest() pega o botão antes da linha: Carregou/Reabrir não abrem a janela */
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
  document.addEventListener('toggle',e=>{ const d=e.target; if(d&&d.classList&&d.classList.contains('ag-dpe')) A.dpe=d.open; },true);
  document.addEventListener('change',e=>{ if(e.target&&e.target.id==='ag-empsel'){ const n=A.jan&&A.jan.el.querySelector('#ag-empnova'); if(n){ n.hidden=e.target.value!=='__outra'; if(!n.hidden) n.focus(); } } });
  document.addEventListener('change',e=>{ const t=e.target; if(!t) return;
    if(t.id==='ag-cls'){ A.cls=t.value; A.cal=''; P.render(); }
    else if(t.id==='ag-per'){ A.per=t.value?Object.assign({},A.per||{},{t:t.value}):null; if(t.value&&t.value!=='datas') A.dia=''; P.render(); }
    else if(t.id==='ag-pde'||t.id==='ag-pate'){ A.per=Object.assign({t:'datas'},A.per||{},{[t.id==='ag-pde'?'de':'ate']:t.value}); P.render(); } });
  document.addEventListener('change',e=>{ if(e.target&&e.target.id==='ag-emp'){ A.emp=e.target.value; A.cal=''; P.render(); } });
  document.addEventListener('change',e=>{ if(e.target&&(e.target.id==='ag-file'||e.target.classList.contains('ag-file2'))){ const fs=e.target.files; importar(fs); e.target.value=''; } });
  /* telefone da transportadora aparece ao escolher */
  document.addEventListener('input',e=>{ if(e.target&&e.target.id==='ag-transp'){ const t=A.jan&&A.jan.el.querySelector('#ag-teltx'), tel=(A.cfg.tels||{})[e.target.value.trim()]; if(t&&tel) t.textContent='Telefone: '+tel; } });
  /* busca filtra sem redesenhar (o campo não perde o foco) e guarda o texto para o próximo desenho */
  document.addEventListener('input',e=>{ if(e.target&&(e.target.classList.contains('ag-pp')||e.target.id==='ag-data')&&e.target.closest('dialog.ag-jan')) janAtualiza(); });
  document.addEventListener('change',e=>{ if(e.target&&e.target.id==='ag-data'&&e.target.closest('dialog.ag-jan')) janAtualiza(); });
  /* busca dos itens do dia: filtra na tela, sem redesenhar */
  const tqFiltra=()=>{ const ps=norm(A.tq).split(/\s+/).filter(Boolean); let n=0; document.querySelectorAll('.ag-tl>li,.ag-tl>tr').forEach(l=>{ const ok=ps.every(p=>(l.dataset.b||'').includes(p)); l.style.display=ok?'':'none'; if(ok) n++; }); const v=document.querySelector('.ag-tqv'); if(v) v.hidden=!!n; };
  document.addEventListener('input',e=>{ if(e.target&&e.target.id==='ag-tq'){ A.tq=e.target.value; tqFiltra(); } });
  document.addEventListener('input',e=>{ if(!e.target||e.target.id!=='ag-q') return; A.q=e.target.value;
    const ps=norm(A.q).split(/\s+/).filter(Boolean); document.querySelectorAll('#ag-corpo .ag-ln').forEach(l=>{ const t=l.dataset.b||''; l.style.display=ps.every(p=>t.includes(p))?'':'none'; });
    document.querySelectorAll('#ag-corpo .ag-dia').forEach(d=>{ d.style.display=[...d.querySelectorAll('.ag-ln')].some(l=>l.style.display!=='none')?'':'none'; });
    clearTimeout(A._cpT); A._cpT=setTimeout(()=>{ const c=document.getElementById('ag-comp'); if(c) c.innerHTML=comp(); },180); });
  /* arrastar o PDF para a tela */
  const naTela=()=>P.S.view==='agendamentos';
  const naCal=()=>P.S.view==='agcal';
  let arrT=0; const arrOff=()=>{ document.body.classList.remove('ag-arr'); };
  document.addEventListener('dragover',e=>{ if(!naTela()||!pode()) return; if(!(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files'))) return; e.preventDefault(); document.body.classList.add('ag-arr'); clearTimeout(arrT); arrT=setTimeout(arrOff,400); });
  document.addEventListener('drop',e=>{ if(!naTela()||!pode()) return; const fl=e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
    if(!fl) return; e.preventDefault(); arrOff(); importar(e.dataTransfer.files); });
  /* atalhos de teclado: / busca · n importa PDF · ← → muda o dia do calendário */
  document.addEventListener('keydown',e=>{ if(!(naTela()||naCal())||e.ctrlKey||e.metaKey||e.altKey) return; const t=e.target, tag=(t&&t.tagName)||''; if(/INPUT|TEXTAREA|SELECT/.test(tag)||(t&&t.isContentEditable)||document.querySelector('dialog[open]')) return;
    if(e.key==='/'){ const q=document.getElementById('ag-q'); if(q){ e.preventDefault(); q.focus(); } }
    else if((e.key==='n'||e.key==='N')&&pode()){ const f=document.getElementById('ag-file'); if(f){ e.preventDefault(); f.click(); } }
    else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&A.cal&&naCal()){ e.preventDefault(); A.cal=addD(A.cal,e.key==='ArrowLeft'?-1:1); A.mes=A.cal.slice(0,7); A.tq=''; P.rerender(); } });

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
  .ag-tl li{display:flex;padding:9px 0;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent)}
  .ag-ti{min-width:0;display:flex;flex-direction:column}.ag-ti b{font-size:13px;font-weight:600}.ag-ti span{font-size:12px;color:var(--muted);line-height:1.3}
  .ag-tv{text-align:right;white-space:nowrap;display:flex;flex-direction:column}.ag-tv b{font-size:16px;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums}.ag-tv b small{font-size:11px;font-weight:500;color:var(--muted)}
  .ag-tv span{font-size:12px;color:var(--muted)}
  .ag-tf{display:flex;flex-direction:column;gap:1px;margin-top:6px;padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--teal) 9%,transparent)}
  .ag-tf span{font-size:12.5px;color:var(--muted)}.ag-tf b{font-size:24px;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums;line-height:1.2}
  .ag-tf em{font-style:normal;font-size:15px;font-weight:600;color:var(--teal-strong)}.ag-tf small{font-size:12px;color:var(--muted);margin-top:2px}
  .ag-vd{font-size:13px}.ag-tb{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}
  .ag-tq{width:100%;height:36px;margin-top:12px}.ag-tqv{font-size:13px;color:var(--muted);margin:10px 0 0}
  .ag-tl li{flex-direction:column;gap:4px}.ag-li{display:flex;justify-content:space-between;gap:12px}
  .ag-te{display:flex;flex-direction:column;gap:2px;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--muted) 7%,transparent)}
  .ag-te div{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:8px;font-size:12px;align-items:baseline;padding:2px 0}.ag-te span:first-child{grid-column:1/-1;color:var(--muted)}
  .ag-te span{font-variant-numeric:tabular-nums}.ag-te b{color:var(--crit);font-weight:600;white-space:nowrap}.ag-te i{color:var(--ok);font-style:normal}.ag-emp{color:var(--text,inherit);font-weight:600}.ag-semp{color:var(--warn)}
  .ag-tfe{margin-top:8px;display:flex;flex-direction:column;gap:3px}.ag-tfe div{display:flex;justify-content:space-between;gap:10px;font-size:13px}.ag-tfe span{color:var(--muted)}.ag-tfe b{font-size:13.5px;font-weight:600;color:var(--teal-strong);line-height:1.4}.ag-tvl{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
  .ag-tfv{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;padding-top:8px;border-top:1px solid color-mix(in srgb,var(--teal) 25%,transparent)}.ag-tfv span{font-size:12.5px;color:var(--muted)}.ag-tfv b{font-size:17px;font-weight:600;color:inherit;font-variant-numeric:tabular-nums}
  @media (max-width:1180px){.ag-lay{grid-template-columns:minmax(0,1fr) 300px}}
  @media (max-width:980px){.ag-lay{grid-template-columns:1fr}.ag-side{position:static;order:-1}}
  /* lista */
  .ag-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.ag-q{flex:1;min-width:200px;max-width:320px;height:38px;margin-left:auto}.ag-esel+.ag-q{margin-left:0}.ag-esel{height:38px;margin-left:auto;max-width:220px;padding:0 10px}.ag-esel.on{border-color:var(--teal);color:var(--teal-strong);font-weight:600}
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
  .ag-nq{white-space:nowrap;font-variant-numeric:tabular-nums}.ag-qx{display:block;font-size:11px;color:var(--muted)}.ag-nq small{color:var(--muted)}
  .ag-pp{width:66px;height:30px;text-align:right;padding:3px 8px}.ag-pp.vz{border-color:color-mix(in srgb,var(--warn) 60%,transparent)}
  .ag-it .ag-pl{font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums}
  .ag-cpl{display:flex;flex-direction:column}.ag-cpl>div{display:grid;grid-template-columns:90px minmax(0,1fr) auto 100px;gap:12px;padding:8px 2px;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent);font-size:13px;align-items:center}
  .ag-cpl>div:first-child{border-top:0}.ag-cpl>div>b{font-weight:600}.ag-cpl>div>b:last-child{text-align:right}.ag-q1{color:var(--teal-strong)}
  .ag-hist summary{cursor:pointer;color:var(--muted);font-size:13px}.ag-apg{color:var(--crit)}
  @media (max-width:1100px){.ag-ln{grid-template-columns:104px minmax(0,1fr) 110px 96px;gap:10px}}
  @media (max-width:900px){.ag-jg{grid-template-columns:1fr}.ag-res{position:static;padding-left:0;border-left:0;border-top:1px solid var(--line);padding-top:14px}}
  @media (max-width:760px){.ag-ln{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"pd mid ac" ". qt qt";row-gap:4px}
    .ag-pd{grid-area:pd}.ag-mid{grid-area:mid}.ag-qt{grid-area:qt;text-align:left}.ag-ac{grid-area:ac}
    .ag-cl{white-space:normal;overflow-wrap:anywhere}.ag-q{max-width:none;margin-left:0}.ag-esel{margin-left:0;max-width:none;flex:1 1 100%}.ag-fx{grid-template-columns:repeat(7,92px)}
    .ag-pit th:nth-child(3),.ag-pit td:nth-child(3){display:none}.ag-pit td span{display:block;font-size:12px}
    .ag-cpl>div{grid-template-columns:70px minmax(0,1fr) 90px}.ag-cpl>div>span:nth-of-type(2){display:none}}
  /* 25/11: cartão da carga, situação, capacidade */
  .ag-cc{margin-top:12px;border:1px solid var(--line);border-radius:14px;background:var(--surface);overflow:hidden}
  .ag-cc.atr{border-color:color-mix(in srgb,var(--crit) 40%,transparent)}.ag-cc.over{border-color:color-mix(in srgb,var(--warn) 60%,transparent)}
  .ag-cch{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;background:color-mix(in srgb,var(--teal) 5%,transparent)}
  .ag-cco{display:flex;flex-direction:column;align-items:center;gap:0;min-width:34px}.ag-ord{font-size:15px;font-weight:700;color:var(--teal-strong);line-height:1.2}
  .ag-ob{all:unset;cursor:pointer;font-size:10px;line-height:1;color:var(--muted);padding:2px 6px;border-radius:5px}.ag-ob:hover{background:color-mix(in srgb,var(--teal) 12%,transparent)}.ag-ob:disabled{opacity:.25;cursor:default}.ag-ob:focus-visible{outline:2px solid var(--teal)}
  .ag-cct{min-width:0}.ag-cct b{font-weight:600}.ag-cct small{display:block;color:var(--muted);font-size:12.5px;margin-top:1px}
  .ag-ccs{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:2px}.ag-ccs small{font-size:12px;color:var(--muted)}
  .ag-cap{display:block;width:120px;height:4px;border-radius:2px;background:color-mix(in srgb,var(--muted) 15%,transparent);overflow:hidden}.ag-cap>i{display:block;height:100%;background:var(--teal)}.ag-cc.over .ag-cap>i{background:var(--warn)}
  .ag-cce{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent);font-size:12.5px}.ag-cce .lnk{font-size:12.5px}.ag-cesp{flex:1}
  .ag-et{all:unset;box-sizing:border-box;cursor:pointer;padding:5px 10px;border-radius:999px;border:1px solid var(--line);font-size:12.5px;color:var(--muted)}.ag-et:hover{border-color:var(--teal)}.ag-et:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
  .ag-et.on{border-color:color-mix(in srgb,var(--ok) 50%,transparent);background:color-mix(in srgb,var(--ok) 10%,transparent);color:var(--ok);font-weight:600}
  .ag-et.fim{border-color:color-mix(in srgb,var(--teal) 45%,transparent);color:var(--teal-strong);font-weight:600}
  .ag-cc .ag-ln{margin:0 4px}.ag-cc .ag-ln:last-child{margin-bottom:4px}
  .ag-lm{color:var(--muted)}.ag-fdia{margin:6px 10px 0;font-size:12.5px;color:var(--crit)}.ag-fdia b{font-weight:600}
  .ag-dia.ag-pisca .ag-dh{animation:agpisca 1.6s ease}@keyframes agpisca{0%,60%{background:color-mix(in srgb,var(--teal) 16%,transparent)}100%{background:transparent}}
  @media (prefers-reduced-motion:reduce){.ag-dia.ag-pisca .ag-dh{animation:none}}
  /* calendário: intensidade, limite, falta, feriado, alvo do arrastar */
  .ag-cd.tem{background:color-mix(in srgb,var(--teal) var(--ag-al,10%),transparent)}
  .ag-cd.over{background:color-mix(in srgb,var(--warn) 26%,transparent)}.ag-cd.over small{color:var(--warn)}
  .ag-cd{position:relative}.ag-cd.fal::after{content:"";position:absolute;top:4px;right:5px;width:6px;height:6px;border-radius:50%;background:var(--crit)}
  .ag-cd.nu:not(.tem) b{opacity:.45}.ag-cd small.fer{color:var(--muted);font-weight:500}
    .ag-leg{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--muted)}.ag-leg span{display:inline-flex;align-items:center;gap:5px}.ag-leg i{width:10px;height:10px;border-radius:3px;display:inline-block}
  .ag-leg .l1{background:color-mix(in srgb,var(--teal) 40%,transparent)}.ag-leg .l2{background:color-mix(in srgb,var(--warn) 30%,transparent)}.ag-leg .l3{background:var(--crit);border-radius:50%;width:7px;height:7px}
  .ag-tfl{font-size:12px;color:var(--warn);font-weight:500}.ag-tfl.c{color:var(--crit)}
  .ag-tb{flex-wrap:wrap;justify-content:flex-start}.ag-tb .ag-bt{padding:6px 10px;font-size:12.5px}
  /* janela: produção, horário, motivo, abas no celular */
  .ag-prq{color:var(--teal-strong)!important}
  .ag-hr{width:130px}.ag-mot{display:flex;flex-direction:column;gap:4px;margin-top:8px;font-size:13px;color:var(--crit)}.ag-mot select{max-width:320px}
  .ag-tabs{display:none}.ag-sec{display:block}
  .ag-chk{display:flex;gap:8px;align-items:center;font-size:13.5px;margin-bottom:6px;cursor:pointer}.ag-chk input{width:18px;height:18px;accent-color:var(--teal-strong)}.ag-ajc small{color:var(--muted);font-size:12px}
  .ag-vt input{height:32px}.ag-vt td.dir input{width:90px;text-align:right}.ag-dvq{width:96px;height:32px;text-align:right}
  .ag-txt{width:100%;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;min-height:220px}
  /* estado vazio */
  .ag-vz{padding:28px 10px;max-width:520px}.ag-vz h3{margin:0 0 10px;font-size:17px;font-weight:600}.ag-vz ol{margin:0 0 16px;padding-left:20px;color:var(--muted);line-height:1.7}.ag-vz ol b{color:var(--text,inherit);font-weight:600}
  /* indicadores */
  .ag-ich{display:flex;align-items:center;gap:6px;margin:4px 0 12px}.ag-ich b{font-size:15px;font-weight:600;min-width:150px;text-align:center}
  .ag-ibs{display:flex;align-items:flex-end;gap:2px;height:110px;margin:16px 0 6px;padding:0 2px}.ag-ib{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px}
  .ag-ib i{display:block;width:100%;max-width:18px;background:color-mix(in srgb,var(--teal) 55%,transparent);border-radius:3px 3px 0 0}.ag-ib small{font-size:9px;color:var(--muted)}
  .ag-ig{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:10px}
  /* TV da expedição */
  .ag-xp{max-width:1400px}.ag-xph{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:18px;text-align:left}.ag-xpc{text-align:left;min-width:0}.ag-xpr{display:flex;gap:12px;align-items:center}.ag-xpk{font-size:34px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--teal-strong)}
  .ag-xpl{display:grid;grid-template-columns:60px minmax(0,1fr) auto 190px;gap:18px;align-items:center;padding:16px 18px;margin-bottom:10px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}
  .ag-xpl.atr{border-color:color-mix(in srgb,var(--crit) 50%,transparent)}.ag-xpo{font-size:26px;color:var(--teal-strong)}
  .ag-xpc b{display:block;font-size:20px;font-weight:600}.ag-xpc span{font-size:15px;color:var(--muted)}.ag-xpp{font-size:20px;font-weight:600;color:var(--teal-strong);text-align:right}
  .ag-xps{text-align:center;padding:10px 12px;border-radius:12px;font-weight:600;font-size:16px}.ag-xps.warn{background:color-mix(in srgb,var(--warn) 14%,transparent);color:var(--warn)}.ag-xps.ok{background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok)}.ag-xps.info{background:color-mix(in srgb,var(--teal) 16%,transparent);color:var(--teal-strong)}
  .ag-xpa{font-size:16px;font-weight:500;color:var(--muted);margin:22px 0 0}.ag-xpe{font-size:18px;padding:40px}
  body.tv .ag-xpc b{font-size:26px}body.tv .ag-xpc span{font-size:18px}body.tv .ag-xpp{font-size:26px}body.tv .ag-xps{font-size:20px}
  @media (max-width:760px){.ag-cch{grid-template-columns:auto minmax(0,1fr)}.ag-ccs{grid-column:1/-1;align-items:flex-start;text-align:left}
    .ag-jan .ag-tabs{display:flex;gap:4px;margin:-4px 0 12px;position:sticky;top:0;z-index:2;background:var(--surface);padding:4px 0}.ag-jan .ag-tabs button{all:unset;cursor:pointer;flex:1;text-align:center;padding:8px;border-radius:8px;font-size:13.5px;color:var(--muted)}.ag-jan .ag-tabs button.on{background:color-mix(in srgb,var(--teal) 12%,transparent);color:var(--teal-strong);font-weight:600}
    .ag-jan .ag-sec{display:none}.ag-jan .ag-sec.on{display:block}
    .ag-xpl{grid-template-columns:40px minmax(0,1fr);gap:8px}.ag-xpp,.ag-xps{grid-column:2}.ag-xpp{text-align:left}}
  /* 25/11 (ajuste): aba Calendário — calendário grande à esquerda, painel do dia (carregado × pendente) à direita */
  .ag-full{margin-top:18px}
  .ag-cl2{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(380px,1fr);gap:20px;align-items:start;margin-top:18px}
  .ag-calg{padding:18px;border-radius:18px;position:sticky;top:76px}
  .ag-calg .ag-ch b{font-size:16px}.ag-calg .ag-cg7{gap:4px}
  .ag-calg .ag-cd{min-height:70px;padding:7px 3px 6px;border-radius:12px;gap:3px}.ag-calg .ag-cd b{font-size:14px}.ag-calg .ag-cd small{font-size:13px;font-weight:700}
  .ag-cd.ok{background:color-mix(in srgb,var(--ok) 14%,transparent)}.ag-cd.ok small{color:var(--ok)}
  .ag-cbar{display:block;width:70%;height:3px;border-radius:2px;background:color-mix(in srgb,var(--muted) 18%,transparent);overflow:hidden;margin-top:auto}.ag-cbar>i{display:block;height:100%;background:var(--ok)}
  .ag-cd.on .ag-cbar{background:rgba(255,255,255,.3)}.ag-cd.on .ag-cbar>i{background:#fff}
  .ag-leg .l4{background:color-mix(in srgb,var(--ok) 30%,transparent)}
  .ag-dp{background:var(--surface);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:14px}
  .ag-dph{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.ag-dph h2{margin:0;font-size:20px;font-weight:600}.ag-dph h2 span{font-size:14px;font-weight:400;color:var(--muted);margin-left:4px}.ag-dph p{margin:2px 0 0;font-size:13px;color:var(--muted)}
  .ag-dpa{display:flex;gap:6px;flex-wrap:wrap}
  .ag-prog{padding:14px 16px;border-radius:14px;background:color-mix(in srgb,var(--teal) 7%,transparent)}
  .ag-pgl{display:flex;justify-content:space-between;gap:12px}.ag-pgl span{display:block;font-size:12.5px;color:var(--muted)}.ag-pgl b{font-size:22px;font-weight:600;color:var(--teal-strong);font-variant-numeric:tabular-nums;line-height:1.25}.ag-pgl .dir{text-align:right}.ag-pgl .dir b{font-size:17px}
  .ag-pgb{display:block;height:8px;border-radius:4px;background:color-mix(in srgb,var(--muted) 16%,transparent);overflow:hidden;margin:10px 0}.ag-pgb>i{display:block;height:100%;border-radius:4px;background:var(--ok)}
  .ag-pgk{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}.ag-pgk b{color:var(--text,inherit);font-weight:600}
  .ag-dcs{display:flex;flex-direction:column}
  .ag-dc{display:grid;grid-template-columns:30px minmax(0,1fr) auto auto;grid-template-areas:"o n n n" "o p s b";column-gap:10px;row-gap:4px;align-items:center;padding:10px 2px;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent)}.ag-dc:first-child{border-top:0}.ag-dc>.ag-dco{grid-area:o;align-self:start;padding-top:2px}.ag-dc>.ag-dcn{grid-area:n}.ag-dc>.ag-dcp{grid-area:p}.ag-dc>.ag-stx{grid-area:s;justify-self:end}.ag-dc>.ag-bt{grid-area:b}
  .ag-dco{color:var(--teal-strong)}.ag-dcn b{font-weight:600;font-size:14px}.ag-dcn small{display:block;font-size:12px;color:var(--muted)}.ag-dcp{font-weight:600;color:var(--teal-strong);font-size:13.5px;white-space:nowrap}
  .ag-dcok{margin:8px 0 0;font-size:12.5px;color:var(--ok)}
  .ag-h3r{display:flex;justify-content:space-between;align-items:center;gap:10px}.ag-h3r .ag-tq{margin:0;max-width:200px}
  .ag-dit{table-layout:fixed;width:100%}.ag-dit th:first-child{width:40%}.ag-dit td{vertical-align:top}.ag-dit td:first-child b{font-weight:600;display:block}.ag-dit td:first-child span{color:var(--muted);display:block;font-size:12px;line-height:1.3}.ag-dit .dir{white-space:normal}.ag-dit td small{display:block;font-size:11px;color:var(--muted)}
  .ag-dit tr.feito td{opacity:.55}.ag-dit .ag-cq{color:var(--ok)}.ag-dit .ag-pq b{color:var(--teal-strong);font-weight:700}
  .ag-dpe summary{cursor:pointer;font-size:13px;color:var(--teal-strong);font-weight:500}.ag-dpe .ag-pit{margin-top:8px}
  /* 25/11 (ajustes): filtro do diário, limpar filtros, transferido */
  .ag-fdb{all:unset;box-sizing:border-box;cursor:pointer;height:38px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px;border:1px solid var(--line);font-size:13.5px;color:var(--muted);white-space:nowrap}
  .ag-fdb:hover{border-color:var(--teal)}.ag-fdb.on{border-color:var(--teal);background:color-mix(in srgb,var(--teal) 12%,transparent);color:var(--teal-strong);font-weight:600}.ag-fdb:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
  .ag-limpa{font-size:13px;white-space:nowrap}
  .ag-fdx{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline;padding:10px 14px;margin:6px 0 10px;border-radius:12px;background:color-mix(in srgb,var(--ok) 9%,transparent);font-size:13.5px}.ag-fdx.c{background:color-mix(in srgb,var(--crit) 8%,transparent)}.ag-fdx b{font-weight:600}
  .ag-head+.ag-fdx{margin-top:16px}.ag-trb{padding:4px 10px;font-size:12px}
  /* análise com o saldo novo */
  .ag-sn2{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin:16px 0 0;padding:12px 16px;border-radius:14px;background:color-mix(in srgb,var(--teal) 10%,transparent);border:1px solid color-mix(in srgb,var(--teal) 30%,transparent);font-size:14px}.ag-sn2 b{font-weight:600}
  .ag-ans{margin-top:14px}.ag-ann{font-size:12px;font-weight:600;color:var(--muted);background:color-mix(in srgb,var(--muted) 12%,transparent);padding:1px 8px;border-radius:999px;margin-left:4px}
  .ag-anl{list-style:none;margin:6px 0 0;padding:0}.ag-anl li{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent);font-size:13.5px}.ag-anl li:first-child{border-top:0}
  .ag-anl li>span:last-of-type{margin-left:auto}.ag-and{font-weight:600;min-width:90px}.ag-anok td{opacity:.6}
  /* reagendado */
  .ag-fat{color:#1d5f8a;font-weight:600;background:color-mix(in srgb,#2b7bb9 13%,transparent);padding:0 6px;border-radius:5px;white-space:nowrap}.ag-dc .ag-fat{font-size:12px;padding:2px 8px;border-radius:999px}
  .ag-et.fat.on{border-color:color-mix(in srgb,#2b7bb9 50%,transparent);background:color-mix(in srgb,#2b7bb9 11%,transparent);color:#1d5f8a}.ag-cc.fat{box-shadow:inset 3px 0 0 #2b7bb9}
  [data-theme=dark] .ag-fat,[data-theme=dark] .ag-et.fat.on{color:#8cc4ea}
  .ag-comp{margin:4px 0 14px;border:1px solid color-mix(in srgb,var(--teal) 30%,var(--line));border-radius:12px;background:color-mix(in srgb,var(--teal) 4%,transparent);padding:12px 14px}
  .ag-comp header{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin-bottom:8px}.ag-comp h3{margin:0;font-size:15px}.ag-comp header small{color:var(--muted)}
  .ag-cpw{overflow-x:auto}.ag-cpt{width:100%;border-collapse:collapse;font-size:13.5px}.ag-cpt th{font-size:12px;font-weight:600;color:var(--muted);text-align:left;padding:4px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
  .ag-cpt td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.ag-cpt tr:last-child td{border-bottom:0}.ag-cpt .dir{text-align:right;white-space:nowrap}
  .ag-cpt td>span{display:block;color:var(--muted);font-size:12.5px}.ag-cpt td small{display:block;color:var(--muted);font-size:12px}.ag-cpt td .lnk{font-size:12px;margin-top:2px}
  .ag-cpdias{display:flex;flex-wrap:wrap;gap:4px}.ag-cpdias span{font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);white-space:nowrap}.ag-cpdias span.atr{border-color:color-mix(in srgb,var(--crit) 45%,transparent);color:var(--crit)}
  @media(max-width:760px){.ag-cpt thead{display:none}.ag-cpt tr{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;padding:8px 0;border-bottom:1px solid var(--line)}.ag-cpt td{border:0;padding:2px 0}.ag-cpt td:first-child,.ag-cpt td:nth-child(3){grid-column:1/-1}.ag-cpt .dir{text-align:left}
    .ag-cpt td:nth-child(2)::before{content:'Agendado'}.ag-cpt td:nth-child(4)::before{content:'Faturado'}.ag-cpt td:nth-child(5)::before{content:'Esperando data'}.ag-cpt td:nth-child(6)::before{content:'Estoque'}.ag-cpt td:nth-child(7)::before{content:'Sobra'}.ag-cpt td::before{display:block;font-size:11.5px;color:var(--muted)}}
  .ag-rg{color:#8a5a00;font-weight:600;background:color-mix(in srgb,var(--warn) 14%,transparent);padding:0 6px;border-radius:5px}
  .ag-mot.op{color:var(--muted)}.ag-mt{margin-top:12px}
  @media (max-width:1100px){.ag-cl2{grid-template-columns:1fr}.ag-calg{position:static}}
  @media (max-width:760px){.ag-calg{padding:12px}.ag-calg .ag-cd{min-height:52px}.ag-calg .ag-cd small{font-size:11px}.ag-dc{grid-template-columns:26px minmax(0,1fr) auto;grid-template-areas:"o n n" "o p b" "o s b"}.ag-dc>.ag-stx{justify-self:start}.ag-dit th:first-child{width:36%}}
  /* 25/11 (ajustes, 3ª): barra em duas linhas, filtros compactos, cabeçalho do dia fixo, "Sem carga" com moldura */
  .ag-acts{flex-wrap:wrap;justify-content:flex-end}
  .ag-bar{display:block;margin-bottom:10px}
  .ag-br1{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ag-br1 .ag-q{flex:1;min-width:220px;max-width:340px;margin-left:auto;height:38px}
  .ag-br2{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid color-mix(in srgb,var(--line) 70%,transparent)}
  .ag-brl{font-size:12px;color:var(--muted);margin-right:2px}
  .ag-fs{height:34px;padding:0 30px 0 12px;font-size:13px;max-width:210px;border-radius:999px}.ag-fs.on{border-color:var(--teal);color:var(--teal-strong);font-weight:600;background-color:color-mix(in srgb,var(--teal) 7%,var(--surface))}
  .ag-br2 .ag-fdb{height:34px;font-size:13px}
  .ag-fdt{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;color:var(--muted)}.ag-fdt input{height:34px;width:150px;padding:0 8px}
  .ag-cpb{padding:7px 12px}
  .ag-dm{margin:8px 2px 0}
  .ag-dia{margin-top:26px}.ag-dia:first-child{margin-top:14px}
  .ag-dh{position:sticky;top:64px;z-index:3;background:var(--surface);padding-top:8px}
  .ag-dh h3{font-size:17px}.ag-cpd{font-size:12.5px;margin-right:4px}
  .ag-cgb.sem{margin-top:12px;border:1px dashed var(--line);border-radius:14px;padding:4px 4px 6px}.ag-cgb.sem .ag-cgh{padding:8px 10px 4px}
  .ag-grp{margin-top:6px}
  @media (max-width:760px){.ag-head .ag-acts{width:100%;flex-wrap:wrap}.ag-head .ag-acts>*{flex:1 1 auto;justify-content:center}.ag-br1 .ag-q{max-width:none;margin-left:0}.ag-fs{max-width:none;flex:1 1 140px}.ag-dh{top:56px}.ag-cpb{flex:1 1 100%}}
  </style>`);

  /* ---------- resumo para o Início do diretor (js/95, 25/11): só leitura, nada grava ---------- */
  const infoDe=x=>({id:x._id,ped:pedList(x).join(', '),cliente:x.cliente||'',data:x.data||'',st:STN[x.status]||x.status||'',val:+x.total||0,carga:x.carga||'',diario:x.diario||'',transp:x.transp||'',fat:x.fat||null,emp:empTxt(x),reag:reagTxt(x),pal:soma([x]).pal});
  function resumoDir(){ const h=hoje(), sd=A.soDiario; let an=null; A.soDiario=false; try{ an=analise(); }catch(e){} finally{ A.soDiario=sd; }
    const ag=A.abertos.filter(x=>x.status==='agendado'&&x.data), es=A.abertos.filter(x=>x.status==='aguardando'), atr=ag.filter(x=>x.data<h), fat=ag.filter(x=>x.fat);
    const ds=[...new Set(ag.map(x=>x.data))].filter(d=>d>=h).sort().slice(0,6);
    const car=A.fechados.filter(x=>x.status==='carregado'&&(x.carregadoDia||P.hojeStr(new Date(x.carregadoEm||x.fechadoEm||0)))===h);
    return { lido:!!A.lido.a, hoje:h,
      dias:ds.map(d=>{ const xs=ag.filter(x=>x.data===d), r=soma(xs); return {d,n:xs.length,ped:xs.reduce((t,x)=>t+pedList(x).length,0),pal:r.pal,val:r.val,kg:r.kg||0,semMat:xs.filter(x=>{ try{ return faltasDe(x).length>0; }catch(e){ return false; } }).length,fat:xs.filter(x=>x.fat).length}; }),
      atrasados:{n:atr.length,val:soma(atr).val,lista:atr.map(infoDe)},
      faturado:{n:fat.length,val:soma(fat).val,pal:soma(fat).pal,lista:fat.map(infoDe)},
      esperando:{n:es.length,val:soma(es).val,podem:an?an.pode.length:0,lista:es.map(infoDe)},
      carregadosHoje:{n:car.length,val:soma(car).val},
      semMaterial:an?an.cargas.map(c=>Object.assign(infoDe(c.x),{itens:c.f.map(o=>({cod:o.i.cod,desc:o.i.desc||'',un:o.i.un||'',falta:o.r.falta}))})):[],
      produzir:an?an.prodL.slice(0,10).map(p=>({cod:p.cod,desc:p.desc||'',un:p.un||'',falta:p.falta,dia:p.dia,pal:p.pp>0?p.falta/p.pp:null})):[] }; }
  function pedidoDir(n){ n=String(n||'').replace(/\D/g,''); if(!n) return []; return A.abertos.concat(A.fechados).filter(x=>pedList(x).some(p=>String(p).replace(/\D/g,'')===n)).map(x=>Object.assign(infoDe(x),{itens:(x.itens||[]).filter(i=>qtdDe(i)>0).map(i=>({cod:i.cod,desc:i.desc||'',q:qtdDe(i),un:i.un||''})),falta:(()=>{ try{ return x.aberto?faltasDe(x).map(i=>i.cod):[]; }catch(e){ return []; } })()})); }
  function clienteDir(q){ const ps=norm(q).split(/\s+/).filter(w=>w.length>1); if(!ps.length) return []; return A.abertos.filter(x=>{ const t=norm(x.cliente); return ps.every(p=>t.includes(p)); }).map(infoDe); }
  function materialDir(q){ return compDados(q,A.abertos).slice(0,6).map(o=>{ const sd=saldoTotal(o.cod); return {cod:o.cod,desc:o.desc,un:o.un,pp:o.pp,ag:o.ag,es:o.es,fat:o.fat,dias:o.dias,ped:o.ids.size,estoque:sd.fonte?sd.q:null,sobra:sd.fonte?sd.q-o.ag:null}; }); }
  P.agendResumo={ resumo:resumoDir, pedido:pedidoDir, cliente:clienteDir, material:materialDir, lido:()=>!!A.lido.a };
  P.registrarModulo({ id:'agend', nome:'Agendamentos', ic:'agendar',
    telas:{ agendamentos:{ nome:'Agendamentos', mob:'Agendar', render:vTela }, agcal:{ nome:'Calendário', mob:'Calendário', render:vCal } },
    iniciar:carregar });
})();
