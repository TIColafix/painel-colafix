/* Diário de bordo da expedição (27/11/2026). Pedidos da Iasmyn: "me mostre como seria" o diário de bordo da planilha
   (ORDEM, MOTORISTA, CLIENTE, PLACA, CHEGADA, TIPO CARREGA/PIT/DESISTENTE, MIX, FATURADO, CARREGADO, FINALIZADO, VEÍCULO);
   "tem que ser adequado para deixar na TV e no monitor"; "layout parecido com o diário"; "a portaria tem que pôr os pedidos e
   escolher o representante numa listagem"; melhorias 2 (alerta de demora), 4 (motorista que já veio), 5 (relatório do mês),
   6 (desistente com motivo) e 7 (não compareceu); "uma aba na TV separando o diário de bordo e um igual com agendados" com os
   próximos dias e no diário "marcar se tá agendado ou se veio antecipado"; aba do faturamento para as solicitações que chegam
   por email (em avaliação, liberado, recebido; confirmar o dia até meio-dia, carregar em 2 dias úteis); "um link para
   substituir o email para o representante" que "pode reagendar e cancelar"; "pode já implantar".
   - Módulo `bordo` (telas `bordo` Diário de bordo, `bordosol` Solicitações, `bordotv` TV, `bordorel` Relatório do mês).
   - Portaria: a tela `bdport` "Caminhões" fica no módulo da portaria (modulos/carros.js chama Painel.bordoPort), então o
     porteiro que já tem a portaria ganha sem mexer no cargo.
   - Cargo pronto "TV do diário de bordo" (`tvbordo`, só ver): entra direto na TV em tela inteira.
   - Dados: bordo/<id> (um caminhão no dia) · bordosol/<id> (solicitação de agendamento) · bordofalta/<agId>_<dia>
     (não compareceu) · bordorep/<token> (link do representante, lido sem login pela página rep.html) · config/bordo.
   - Liga com os Agendamentos (agendamentos/<id>): chegada marca `chegou` e o nº do diário, Faturado marca `fat`,
     Finalizado marca o pedido como carregado; solicitação liberada cria/atualiza o agendamento (data e horário).
   Prefixo `bd`. */
(function(){ const P=window.Painel; if(!P) return;
  if(P.icone){ P.icone('caminhao','<path d="M2.5 6.5h11v9.5h-11z"/><path d="M13.5 9.5h4l3 3.2V16h-7z"/><circle cx="6.5" cy="17.2" r="1.7"/><circle cx="17" cy="17.2" r="1.7"/>'); }
  const esc=P.esc, S=P.S, hoje=()=>P.hojeStr();
  const B={cfg:{},lido:{},ent:[],diaLive:'',dia:'',outro:null,ag:[],sol:[],falta:[],f:null,ov:null,filt:'todos',tv:{aba:'diario',troca:Date.now(),fixo:0,cheia:false},
    solAba:'quadro',nova:null,libF:{},edRep:null,rel:{mes:'',d:null,lendo:false},port:{feito:null},_fcri:{},_scri:{}};
  window.__bordo=B; B.sinc=()=>sincroniza();
  const ETAPAS=[['mix','Mix'],['fat','Faturado'],['carr','Carregado'],['fim','Finalizado']], ETN=Object.fromEntries(ETAPAS);
  const LIM_PAD={mix:60,fat:30,carr:60,fim:30};
  const VEICS=[['CAMIONETE','Camionete'],['HR','HR'],['TOCO','Toco'],['TRUCK','Truck'],['BITRUCK','Bitruck'],['CARRETA','Carreta'],['CARRETA_GRANELEIRA','Carreta graneleira'],['CARRETA_SIDER','Carreta sider']];
  const PAR={fat:'mix',fim:'carr'}; /* 27/11 (faturamento): Mix e Carregado se marcam sozinhos; Faturado preenche o Mix e Finalizado o Carregado se estiverem vazios */ const juntos=()=>{ try{ return !(B.cfg&&B.cfg.juntos===false); }catch(e){ return true; } };
  const MOTIVOS=['Demora no pátio','Falta de material','Documento / nota com problema','Veículo não serve para a carga','Cliente cancelou','Outro'];
  const SOL_ST=[['recebido','Recebido','Chegou e ninguém olhou ainda'],['avaliacao','Em avaliação','Conferindo saldo, crédito e veículo'],['liberado','Agendamento liberado','Dia e horário confirmados: já está nos Agendamentos e na TV']];
  const veicN=k=>(VEICS.find(v=>v[0]===k)||[k,k||''])[1];
  const DS=['dom','seg','ter','qua','qui','sex','sáb'], DSL=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const addD=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return P.hojeStr(x); };
  const br=d=>d?d.slice(8,10)+'/'+d.slice(5,7):'';
  const dsem=d=>DS[new Date(d+'T12:00:00').getDay()];
  const hm=iso=>{ if(!iso) return ''; const d=new Date(iso); return isNaN(d)?'':String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };
  const diaDe=iso=>iso?P.hojeStr(new Date(iso)):'';
  const minDe=(a,b)=>Math.max(0,Math.round(((b?new Date(b):new Date())-new Date(a))/60000));
  const dur=m=>{ if(m==null||isNaN(m)) return '—'; m=Math.round(m); if(m<60) return m+' min'; const h=Math.floor(m/60); return h+'h'+String(m%60).padStart(2,'0'); };
  const util=d=>{ const w=new Date(d+'T12:00:00').getDay(); if(w===0||w===6) return false; try{ if(P.feriadoDe&&P.feriadoDe(d)) return false; }catch(e){} return true; };
  const proxUtil=(d,n)=>{ let x=d,k=0; while(k<(n||1)){ x=addD(x,1); if(util(x)) k++; } return x; };
  const eu=()=>(S.nomes||{})[S.uid]||P.nomeDe(S.uid)||'';
  const novoId=p=>(p||'')+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const pode=()=>!P.soVer();
  const adm=()=>P.dono()||((P.viewOk('bordosol')||P.viewOk('agsol'))&&!P.soVer());
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const plN=p=>String(p||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const pedLimpo=s=>(String(s||'').match(/\d{4,8}/g)||[]);
  const pedsDe=x=>(x.pedidos&&x.pedidos.length?x.pedidos:String(x.pedido||'').split(/[\s,;|]+/)).map(p=>String(p).replace(/\D/g,'')).filter(Boolean);
  const docs=s=>s.docs.map(d=>Object.assign({_id:d.id},d.data()));
  const lim=k=>{ const v=+((B.cfg.lim||{})[k]); return v>0?v:LIM_PAD[k]; };
  const ini=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  /* ---------- prazos das solicitações: confirmar o dia até 12:00 (depois do meio-dia → 12:00 do próximo dia útil);
     carregar em até 2 dias úteis depois que o pedido chegou ---------- */
  function prazos(rec){ const t=new Date(rec), d=P.hojeStr(t), cd=util(d)&&t.getHours()<12?d:proxUtil(d,1); return {conf:new Date(cd+'T12:00:00').toISOString(),carr:proxUtil(d,2)}; }

  /* ---------- banco ---------- */
  const U={};
  function ouvir(k,mk,cb){ if(U[k]){ try{ U[k](); }catch(e){} } let t=0; const vai=()=>{ try{ U[k]=mk().onSnapshot(s=>{ t=0; cb(s); },e=>{ console.warn('[bordo]',k,e&&e.code); if(++t<7) setTimeout(vai,3000*t); }); }catch(e){ console.warn('[bordo]',k,e); } }; vai(); }
  let iniBase=false, iniEsc=false;
  function iniciarBase(){ if(iniBase||!P.db()) return; iniBase=true;
    ouvir('cfg',()=>P.db().doc('config/bordo'),g=>{ B.cfg=g&&g.exists?g.data()||{}:{}; B.lido.cfg=true; P.rerender(); });
    ouvirDia(); setInterval(tique,30000); }
  function ouvirDia(){ B.diaLive=hoje(); if(!B.dia) B.dia=B.diaLive; ouvir('dia',()=>P.db().collection('bordo').where('dia','==',B.diaLive).limit(300),s=>{ B.ent=docs(s); B.lido.dia=true; P.rerender(); }); }
  function iniciar(){ iniciarBase(); if(iniEsc||!P.db()) return; iniEsc=true;
    ouvir('ag',()=>P.db().collection('agendamentos').where('aberto','==',true).limit(600),s=>{ B.ag=docs(s); B.lido.ag=true; P.rerender(); });
    ouvir('sol',()=>P.db().collection('bordosol').where('aberto','==',true).limit(300),s=>{ B.sol=docs(s); B.lido.sol=true; P.rerender(); });
    ouvir('falta',()=>P.db().collection('bordofalta').where('dia','>=',addD(hoje(),-40)).limit(400),s=>{ B.falta=docs(s); B.lido.falta=true; P.rerender(); });
    setTimeout(()=>sincroniza(),3500); }
  const escritorio=()=>iniEsc&&P.viewOk('bordo')&&pode();
  function tique(){ if(hoje()!==B.diaLive){ const era=B.diaLive; ouvirDia(); if(B.dia===era) B.dia=B.diaLive; }
    if(escritorio()) sincroniza(); const v=S.view; if(v==='bordo'||v==='bordotv'||v==='bdport'||v==='bordomot'||v==='bdmot') P.rerender(); }
  const entDe=id=>B.ent.find(e=>e._id===id)||((B.outro||[]).find(e=>e._id===id));
  const solDe=id=>B.sol.find(s=>s._id===id);
  const agDe=id=>B.ag.find(a=>a._id===id);
  const reps=()=>(B.cfg.reps||[]).filter(r=>!r.removido).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt'));
  const repsAt=()=>reps().filter(r=>r.ativo!==false);
  const repDe=id=>reps().find(r=>r.id===id);
  const linkBase=()=>{ let b=(window.claude&&window.claude.link)||(location.origin+location.pathname.replace(/[^/]*$/,'')); if(!/\/$/.test(b)) b+='/'; return b; };
  const linkRep=r=>linkBase()+'rep.html?t='+encodeURIComponent(r.tok);

  /* avisos no celular pelo ntfy.sh (mesmo jeito dos carros): chega com o app fechado */
  window.__bdNtfy=[];
  async function ntfy(topic,title,message,pri){ if(!topic) return; window.__bdNtfy.push({topic,title,message});
    try{ await fetch('https://ntfy.sh/',{method:'POST',body:JSON.stringify({topic,title,message,priority:pri||4,tags:['truck']})}); }catch(e){ console.warn('[bordo] ntfy',e&&e.message); } }
  const avisaRep=(repId,title,msg)=>{ const r=repDe(repId); if(r&&r.topico) ntfy(r.topico,title,msg,4); };

  /* ---------- agendamentos ligados aos pedidos ---------- */
  async function agsDosPeds(peds){ peds=(peds||[]).map(String); if(!peds.length) return [];
    if(B.lido.ag) return B.ag.filter(x=>pedsDe(x).some(p=>peds.includes(p)));
    const out=new Map();
    for(const p of peds.slice(0,10)){ try{ const [a,b]=await Promise.all([P.db().collection('agendamentos').where('pedido','==',p).limit(5).get(),P.db().collection('agendamentos').where('pedidos','array-contains',p).limit(5).get()]);
      a.docs.concat(b.docs).forEach(d=>{ const x=Object.assign({_id:d.id},d.data()); if(x.aberto) out.set(x._id,x); }); }catch(e){ console.warn('[bordo] agendamento',e&&e.code); } }
    return [...out.values()]; }
  function classAg(ags,dia){ const ag=ags.filter(x=>x.status==='agendado'&&x.data); if(!ag.length) return {k:'sem'}; const d=ag.map(x=>x.data).sort()[0];
    return d===dia?{k:'agendado',d}:d>dia?{k:'antecipado',d}:{k:'atrasado',d}; }
  const agTxt=e=>e.agKind==='agendado'?'Agendado':e.agKind==='antecipado'?'Antecipado · era '+br(e.agData):e.agKind==='atrasado'?'Atrasado · era '+br(e.agData):'Sem agenda';
  async function gravaAg(x,o,t){ const em=new Date().toISOString(); o=Object.assign({},o,{alteradoEm:em,alteradoPor:S.uid,alteradoPorNome:eu()}); if(t) o.hist=(x.hist||[]).concat([{em,por:eu(),t}]).slice(-40);
    await P.db().collection('agendamentos').doc(x._id).set(o,{merge:true}); Object.assign(x,o); }
  const solDosPeds=peds=>B.sol.find(s=>(s.peds||[]).some(p=>peds.includes(String(p))));

  /* ---------- estado de um caminhão ---------- */
  function estado(e){ if(e.removido) return {k:'rem'}; if(e.des) return {k:'des'}; const et=e.et||{}; if(et.fim) return {k:'fim'}; let prev=e.cheg;
    for(const [k] of ETAPAS){ if(et[k]){ prev=et[k]; continue; } const m=minDe(prev); return {k:'pend',etapa:k,min:m,atr:m>lim(k),desde:prev}; } return {k:'fim'}; }
  const patioMin=e=>{ const fim=(e.et||{}).fim||(e.des&&e.des.em); return e.cheg?minDe(e.cheg,fim||null):null; };
  const ordena=xs=>xs.slice().sort((a,b)=>(+a.ord||0)-(+b.ord||0)||String(a.cheg).localeCompare(String(b.cheg)));
  const vivos=xs=>xs.filter(e=>!e.removido);

  /* ---------- ações ---------- */
  function novoForm(o){ return Object.assign({placa:'',mot:'',peds:[],repId:'',veic:'',tipo:'carrega',cli:'',info:null,prev:null,err:null,edit:null,hora:'',ets:{},obs:''},o||{}); }
  /* 27/11/2026 · hora digitada (lançar depois os caminhões que já vieram): HH:MM do dia do registro → ISO */
  const ETID={mix:'bd-f-et-mix',fat:'bd-f-et-fat',carr:'bd-f-et-carr',fim:'bd-f-saida'};
  const hmOk=t=>/^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t||'').trim());
  const isoDe=(dia,t)=>{ const [h,m]=String(t).trim().split(':').map(Number); const d=new Date(dia+'T00:00:00'); d.setHours(h,m,0,0); return d.toISOString(); };
  async function renumera(dia){ try{ const xs=vivos(B.ent).filter(e=>e.dia===dia).sort((a,b)=>String(a.cheg).localeCompare(String(b.cheg))); let n=0;
    for(const e of xs){ n++; if(+e.ord!==n){ e.ord=n; await P.db().collection('bordo').doc(e._id).update({ord:n}); } } }catch(e){ console.warn('[bordo] ordem',e); } }
  function addPeds(txt){ const F=B.f; if(!F) return; const n=pedLimpo(txt).filter(p=>!F.peds.includes(p)); if(!n.length) return false; F.peds=F.peds.concat(n).slice(0,20); olhaAg(); return true; }
  let _agT=0;
  async function olhaAg(){ const F=B.f; if(!F) return; const my=++_agT; if(!F.peds.length){ F.info=null; rr(); return; }
    const ags=await agsDosPeds(F.peds); if(my!==_agT||B.f!==F) return;
    if(!ags.length){ F.info={t:'warn',x:'Nenhum agendamento aberto com '+(F.peds.length>1?'esses pedidos':'esse pedido')+'. Vai entrar como "sem agenda".'}; rr(); return; }
    const c=classAg(ags,hoje()), a=ags[0], peso=pesoAg(ags); if(!F.cli&&a.cliente) F.cli=a.cliente;
    const sol=solDosPeds(F.peds); if(!F.repId){ const rid=(sol&&sol.repId)||(reps().find(r=>norm(r.nome)===norm(a.rep||''))||{}).id; if(rid) F.repId=rid; }
    F.info={t:c.k==='agendado'?'ok':c.k==='sem'?'warn':'info',x:(c.k==='agendado'?'✓ Agendado para hoje':c.k==='antecipado'?'Veio antes: agendado para '+dsem(c.d)+' '+br(c.d):c.k==='atrasado'?'Veio depois do dia: era '+br(c.d):'Agendamento sem data')+(a.carga?' · carga '+a.carga:'')+' · '+(a.cliente||'cliente?')+(peso?' · '+fT(peso):'')};
    rr(); }
  let _plT=0;
  async function olhaPlaca(){ const F=B.f; if(!F||F.edit) return; const pl=plN(F.placa); if(pl.length<7) return; const my=++_plT;
    try{ const q=await P.db().collection('bordo').where('placa','==',pl).limit(40).get(); if(my!==_plT||B.f!==F) return;
      const xs=docs(q).filter(e=>!e.removido&&e.dia!==hoje()).sort((a,b)=>String(b.cheg).localeCompare(String(a.cheg))); const u=xs[0]; if(!u){ F.prev=null; rr(); return; }
      if(!F.mot) F.mot=u.mot||''; if(!F.veic) F.veic=u.veic||''; if(!F.repId&&u.repId&&repDe(u.repId)&&repDe(u.repId).ativo!==false) F.repId=u.repId; F.prev={dia:u.dia,mot:u.mot}; rr(); }
    catch(e){ console.warn('[bordo] placa',e&&e.code); } }
  async function salvarChegada(){ const F=B.f; if(!F) return; const inp=document.getElementById('bd-f-ped'); if(inp&&inp.value.trim()){ addPeds(inp.value); inp.value=''; }
    const pl=plN(F.placa); F.err=null;
    if(pl.length<7) F.err={id:'bd-f-placa',t:'Digite a placa completa (ex.: ABC1D23).'};
    else if(String(F.mot||'').trim().length<3) F.err={id:'bd-f-mot',t:'Escreva o nome do motorista.'};
    else if(!F.veic) F.err={id:'bd-f-veic',t:'Escolha o veículo.'};
    const eOld=F.edit?entDe(F.edit):null, diaR=eOld?eOld.dia:hoje(), agoraMs=Date.now()+60000;
    let chegMan=null;
    if(!F.err&&String(F.hora||'').trim()){ if(!hmOk(F.hora)) F.err={id:'bd-f-hora',t:'Hora da chegada inválida. Use 07:30.'}; else { chegMan=isoDe(diaR,F.hora); if(new Date(chegMan).getTime()>agoraMs) F.err={id:'bd-f-hora',t:'A hora da chegada não pode ser depois de agora.'}; } }
    const etMan={}; if(!F.err&&F.edit){ const ch=chegMan||(eOld&&eOld.cheg); for(const [k,n] of ETAPAS){ const v=String((F.ets||{})[k]||'').trim(); if(!v){ etMan[k]=null; continue; }
        if(!hmOk(v)){ F.err={id:ETID[k],t:'Hora do '+n.toLowerCase()+' inválida. Use 16:45.'}; break; } const iso=isoDe(diaR,v);
        if(new Date(iso).getTime()>agoraMs){ F.err={id:ETID[k],t:n+': a hora não pode ser depois de agora.'}; break; }
        if(ch&&iso.slice(0,16)<String(ch).slice(0,16)){ F.err={id:ETID[k],t:(k==='fim'?'A saída':n)+' tem que ser depois da chegada.'}; break; } etMan[k]=iso; } }
    if(F.err){ P.render(); return; }
    if(!pode()){ P.toast('Seu acesso é só para ver.'); return; }
    if(F.salvando) return; F.salvando=true; P.render();
    try{ const agora=new Date().toISOString(), r=repDe(F.repId);
      if(F.edit){ const e=entDe(F.edit); const ags=await agsDosPeds(F.peds); const c=classAg(ags,e.dia);
        const up={placa:pl,mot:F.mot.trim(),peds:F.peds,repId:F.repId||'',repNome:r?r.nome:'',veic:F.veic,tipo:F.tipo,cli:F.cli||(ags[0]&&ags[0].cliente)||'',agIds:ags.map(x=>x._id),agKind:c.k,agData:c.d||null,obs:String(F.obs||'').trim().slice(0,300),editEm:agora,editPor:eu()};
        const mudouH=chegMan&&chegMan.slice(0,16)!==String(e.cheg||'').slice(0,16); if(mudouH) up.cheg=chegMan;
        { const et0=e.et||{}, et=Object.assign({},et0), por=Object.assign({},e.etPor||{}); let mud=false;
          for(const [k] of ETAPAS){ const nv=etMan[k]; if(String(nv||'').slice(0,16)===String(et0[k]||'').slice(0,16)) continue; mud=true; et[k]=nv; por[k]=nv?(por[k]||eu()):null; }
          if(juntos()){ if(et.fat&&!et.mix&&!(F.ets||{}).mix){ et.mix=et.fat; por.mix=por.mix||eu(); } if(et.fim&&!et.carr&&!(F.ets||{}).carr){ et.carr=et.fim; por.carr=por.carr||eu(); } }
          if(mud){ up.et=et; up.etPor=por; } }
        await P.db().collection('bordo').doc(F.edit).update(up); Object.assign(e,up); if(mudouH) await renumera(e.dia);
        B.f=null; B.ov=null; P.toast('Corrigido.'); P.render(); return; }
      const ags=await agsDosPeds(F.peds), c=classAg(ags,hoje()), ord=Math.max(0,...vivos(B.ent).map(e=>+e.ord||0))+1, id='b'+hoje().replace(/-/g,'')+'-'+novoId();
      const d={dia:hoje(),ord,placa:pl,mot:F.mot.trim().replace(/\s+/g,' '),veic:F.veic,tipo:F.tipo||'carrega',peds:F.peds,cli:F.cli||(ags[0]&&ags[0].cliente)||'',repId:F.repId||'',repNome:r?r.nome:'',
        agIds:ags.map(x=>x._id),agKind:c.k,agData:c.d||null,carga:(ags.find(x=>x.carga)||{}).carga||'',cheg:chegMan||agora,horaDigitada:!!chegMan,obs:String(F.obs||'').trim().slice(0,300),et:{},etPor:{},al:{},des:null,por:S.uid,porN:eu(),criado:agora};
      await P.db().collection('bordo').doc(id).set(d); B.ent=B.ent.filter(e=>e._id!==id).concat([Object.assign({_id:id},d)]);
      if(chegMan&&vivos(B.ent).some(e=>e._id!==id&&e.dia===d.dia&&String(e.cheg)>chegMan)){ await renumera(d.dia); d.ord=(entDe(id)||d).ord; }
      for(const x of ags){ const o={chegou:agora}; if(!x.diario) o.diario=String(ord); if(!x.placa) o.placa=pl; try{ await gravaAg(x,o,'Caminhão chegou às '+hm(d.cheg)+' (diário de bordo nº '+ord+', '+pl+')'); }catch(e){ console.warn('[bordo] agendamento',e); } }
      B.port.feito=Object.assign({_id:id},d); B.f=null; B.ov=null; P.toast('Chegada registrada · nº '+ord+'.');
      if(S.view==='bdport') setTimeout(()=>{ if(B.port.feito&&B.port.feito._id===id){ B.port.feito=null; P.render(); } },7000);
    }catch(e){ P.erro(e); }
    finally{ if(B.f) B.f.salvando=false; P.render(); } }
  async function marcar(id,k){ const e=entDe(id); if(!e||e.des||e.removido) return; if(!pode()) return P.toast('Seu acesso é só para ver.');
    const et=Object.assign({},e.et||{}), por=Object.assign({},e.etPor||{}), on=!et[k];
    if(!on&&!confirm('Desmarcar "'+ETN[k]+'"'+(PAR[k]&&juntos()&&(e.et||{})[PAR[k]]===(e.et||{})[k]?' e "'+ETN[PAR[k]]+'"':'')+' de '+e.mot+'?')) return;
    const agora=new Date().toISOString(), velho=et[k]; et[k]=on?agora:null; por[k]=on?eu():null;
    /* 27/11/2026 · como no programa antigo: Mix e Faturado saem juntos, Carregado e Finalizado também (um toque marca os dois) */
    const pk=PAR[k], mk=[k]; if(pk&&juntos()){ if(on&&!et[pk]){ et[pk]=agora; por[pk]=eu(); mk.push(pk); } else if(!on&&et[pk]&&et[pk]===velho){ et[pk]=null; por[pk]=null; mk.push(pk); } }
    const nomeMk=mk.length>1?ETAPAS.filter(([x])=>mk.includes(x)).map(([,n])=>n).join(' e '):ETN[k];
    try{ await P.db().collection('bordo').doc(id).update({et,etPor:por}); e.et=et; e.etPor=por;
      for(const k of mk.filter(x=>on&&(x==='fat'||x==='fim'))){ const ags=(e.agIds||[]).map(agDe).filter(Boolean); const lst=ags.length?ags:await agsDosPeds(e.peds||[]);
        for(const x of lst){ try{ if(k==='fat'&&!x.fat) await gravaAg(x,{fat:agora},'Faturado às '+hm(agora)+' (diário de bordo)');
          if(k==='fim'&&x.aberto) await gravaAg(x,{status:'carregado',aberto:false,fechadoEm:agora,carregadoEm:agora,carregadoDia:hoje()},'Carregado às '+hm(agora)+' (diário de bordo nº '+e.ord+')'); }catch(er){ console.warn('[bordo] agendamento',er); } } }
      P.toast(on?nomeMk+' às '+hm(agora)+' · '+e.mot:nomeMk+(mk.length>1?' desmarcados.':' desmarcado.')); if(escritorio()) sincroniza(); }
    catch(er){ P.erro(er); } P.render(); }
  async function desistir(id){ const e=entDe(id), D=B.ov&&B.ov.des; if(!e||!D) return; if(!D.motivo){ D.err='Escolha o motivo.'; P.render(); return; }
    try{ const des={em:new Date().toISOString(),motivo:D.motivo,obs:String(D.obs||'').trim().slice(0,200),por:eu()}; await P.db().collection('bordo').doc(id).update({des}); e.des=des; B.ov=null; P.toast(e.mot+' marcado como desistente.'); }
    catch(er){ P.erro(er); } P.render(); }
  async function apagarEnt(id){ const e=entDe(id); if(!e) return; if(!confirm('Apagar o registro de '+e.mot+' ('+e.placa+')? Use só para lançamento errado.')) return;
    try{ await P.db().collection('bordo').doc(id).update({removido:true,removidoEm:new Date().toISOString(),removidoPor:eu()}); e.removido=true; B.ov=null; B.f=null; P.toast('Registro apagado.'); }catch(er){ P.erro(er); } P.render(); }

  /* ---------- sincronização (computadores do escritório): solicitações ↔ caminhões, alertas de demora, não compareceu ---------- */
  let _sinc=false;
  async function sincroniza(){ if(_sinc||!escritorio()||!B.lido.dia) return; _sinc=true;
    try{ const h=hoje(), vs=vivos(B.ent);
      if(B.lido.sol) for(const s of B.sol.filter(s=>s.st==='liberado')){ const e=vs.find(x=>(x.peds||[]).some(p=>(s.peds||[]).includes(p))); if(!e) continue;
        if(!s.chegou&&!B._scri[s._id+'c']){ B._scri[s._id+'c']=1; await P.db().collection('bordosol').doc(s._id).update({chegou:e.cheg,diario:e.ord}); avisaRep(s.repId,'Caminhão chegou','Pedido '+(s.peds||[]).join(', ')+' · '+(s.cli||'')+': caminhão '+e.placa+' no pátio desde '+hm(e.cheg)+'.'); }
        if((e.et||{}).fim&&!s.carregado&&!B._scri[s._id+'f']){ B._scri[s._id+'f']=1; await P.db().collection('bordosol').doc(s._id).update({carregado:e.et.fim,aberto:false}); avisaRep(s.repId,'Carregado','Pedido '+(s.peds||[]).join(', ')+' · '+(s.cli||'')+' carregado às '+hm(e.et.fim)+'.'); }
        if(e.des&&!s.desistiu&&!B._scri[s._id+'d']){ B._scri[s._id+'d']=1; await P.db().collection('bordosol').doc(s._id).update({desistiu:e.des.em,desMotivo:e.des.motivo}); } }
      const tops=B.cfg.tops||{};
      for(const e of vs){ const st=estado(e); if(st.k!=='pend'||!st.atr) continue; const k=st.etapa; if((e.al||{})[k]||!tops[k]) continue;
        const al=Object.assign({},e.al||{},{[k]:new Date().toISOString()}); e.al=al; await P.db().collection('bordo').doc(e._id).update({al});
        ntfy(tops[k],'Atraso no '+ETN[k].toLowerCase(),'Nº '+e.ord+' · '+e.mot+' ('+e.placa+')'+(e.cli?' · '+e.cli:'')+': esperando '+ETN[k].toLowerCase()+' há '+dur(st.min)+' (combinado '+lim(k)+' min).',5); }
      if(B.lido.ag&&B.lido.falta){
        for(const x of B.ag){ if(x.status!=='agendado'||!x.data||x.data>=h||x.chegou||x.carregadoEm) continue; const fid=x._id+'_'+x.data; if(B.falta.some(f=>f._id===fid)||B._fcri[fid]) continue; B._fcri[fid]=1;
          await P.db().collection('bordofalta').doc(fid).set({agId:x._id,dia:x.data,hora:x.hora||'',cli:x.cliente||'',peds:pedsDe(x),rep:x.rep||'',carga:x.carga||'',acao:null,em:new Date().toISOString()}); }
        for(const f of B.falta){ if(f.acao) continue; const x=agDe(f.agId); if(x&&x.status==='agendado'&&x.data===f.dia&&!x.chegou) continue;
          await P.db().collection('bordofalta').doc(f._id).update({acao:x&&x.chegou?'veio':'resolvido',acaoEm:new Date().toISOString()}); f.acao='resolvido'; } }
    }catch(e){ console.warn('[bordo] sincroniza',e); } finally{ _sinc=false; } }

  /* ---------- peso (kg da descrição, como nos Agendamentos) ---------- */
  function kgItem(i){ const m=String(i.desc||'').match(/(\d+(?:[.,]\d+)?)\s*(?:X\s*(\d+(?:[.,]\d+)?)\s*)?KG/i); if(!m) return 0; return (+m[1].replace(',','.'))*(m[2]?+m[2].replace(',','.'):1); }
  const qtdIt=i=>i.pend!=null?Math.max(0,+i.pend||0):Math.max(0,+i.qtd||0);
  const pesoAg=xs=>(Array.isArray(xs)?xs:[xs]).reduce((t,x)=>t+(x.itens||[]).reduce((s,i)=>s+qtdIt(i)*kgItem(i),0),0);
  const fT=kg=>kg>=1000?(kg/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' t':Math.round(kg).toLocaleString('pt-BR')+' kg';
  function faltaAg(x){ try{ if(!P.agendResumo||!P.agendResumo.lido||!P.agendResumo.lido()) return null; const r=P.agendResumo.pedido(pedsDe(x)[0])||[]; const y=r.find(o=>o.id===x._id)||r[0]; return y?(y.falta||[]):null; }catch(e){ return null; } }

  /* ---------- formulário de chegada (portaria e escritório) ---------- */
  function formChegada(cel){ const F=B.f, er=F.err||{}, eB=id=>er.id===id?`<p class="bd-err" id="${id}-e" role="alert">${esc(er.t)}</p>`:'';
    const rs=repsAt(), rsel=repDe(F.repId);
    return `<div class="bd-form${cel?' cel':''}">
      ${F.prev?`<p class="bd-prev"><b>Já esteve aqui em ${esc(br(F.prev.dia))}.</b> Motorista, veículo e representante vieram da última vez. Confira e mude se precisar.</p>`:''}
      <div class="bd-f2"><label class="bd-lb">Placa<input id="bd-f-placa" class="bd-in bd-plin" maxlength="8" autocomplete="off" autocapitalize="characters" value="${esc(F.placa)}" placeholder="ABC1D23"${er.id==='bd-f-placa'?' aria-invalid="true"':''}></label>
        <label class="bd-lb">Motorista<input id="bd-f-mot" class="bd-in" maxlength="60" autocomplete="off" value="${esc(F.mot)}" placeholder="Nome do motorista"${er.id==='bd-f-mot'?' aria-invalid="true"':''}></label></div>${eB('bd-f-placa')}${eB('bd-f-mot')}
      <div class="bd-f2"><label class="bd-lb">Chegou às<input id="bd-f-hora" class="bd-in" inputmode="numeric" maxlength="5" autocomplete="off" value="${esc(F.hora||'')}" placeholder="agora (${esc(hm(new Date().toISOString()))})"${er.id==='bd-f-hora'?' aria-invalid="true"':''}></label>
        ${F.edit?'<p class="bd-hint" style="align-self:end">Corrija as horas abaixo. Campo vazio = etapa não marcada.</p>':'<p class="bd-hint" style="align-self:end">Deixe vazio para usar a hora de agora. Para lançar um caminhão que já veio, digite a hora em que ele chegou.</p>'}</div>${eB('bd-f-hora')}
      ${F.edit?`<div class="bd-f4">${ETAPAS.map(([k,n])=>`<label class="bd-lb">${k==='fim'?'Finalizado (saiu)':n}<input id="${ETID[k]}" class="bd-in" inputmode="numeric" maxlength="5" autocomplete="off" value="${esc((F.ets||{})[k]||'')}" placeholder="—"${er.id===ETID[k]?' aria-invalid="true"':''}></label>`).join('')}</div>${ETAPAS.map(([k])=>eB(ETID[k])).join('')}`:''}
      <label class="bd-lb">Cliente <small>(opcional)</small><input id="bd-f-cli" class="bd-in" maxlength="80" autocomplete="off" value="${esc(F.cli||'')}" placeholder="Nome do cliente (vem sozinho do pedido agendado)"></label>
      <label class="bd-lb">Observação <small>(opcional)</small><textarea id="bd-f-obs" class="bd-in" rows="2" maxlength="300" placeholder="Ex.: veio sem lona, motorista vai almoçar, carga parcial, chegou com outro caminhão">${esc(F.obs||'')}</textarea></label>
      <div class="bd-lb">Pedidos<div class="bd-chips" id="bd-f-chips">${F.peds.map((p,i)=>`<span class="bd-chip">${esc(p)}<button type="button" data-act="bd-f-px" data-v="${i}" aria-label="Tirar o pedido ${esc(p)}">×</button></span>`).join('')}<input id="bd-f-ped" inputmode="numeric" autocomplete="off" placeholder="${F.peds.length?'mais pedidos…':'Digite ou cole os pedidos'}"></div>
        ${F.info?`<p class="bd-info ${F.info.t}">${esc(F.info.x)}</p>`:'<p class="bd-hint">Enter ou vírgula separa os pedidos. Pode colar vários de uma vez.</p>'}</div>
      <div class="bd-lb">Representante
        ${rsel&&!F.repAbre?`<div class="bd-repsel"><span class="bd-rdot on" aria-hidden="true"></span><span class="bd-rst"><b>${esc(rsel.nome)}</b><small>${esc([rsel.reg,rsel.ct&&rsel.ct!==rsel.nome?'Contato: '+rsel.ct:''].filter(Boolean).join(' · '))}</small></span><button type="button" class="bd-b0 sm" data-act="bd-f-reptroca">Trocar</button></div>`
        :rs.length?`<div class="bd-replst"><input id="bd-f-repq" class="bd-repq" autocomplete="off" placeholder="Buscar representante" aria-label="Buscar representante">
          <div class="bd-reps" role="radiogroup" aria-label="Representante">${rs.map(r=>`<button type="button" class="bd-rep" role="radio" aria-checked="${r.id===F.repId}" data-act="bd-f-rep" data-v="${esc(r.id)}" data-b="${esc(norm(r.nome+' '+(r.reg||'')+' '+(r.ct||'')))}"><span class="bd-rdot" aria-hidden="true"></span><span class="bd-rn">${esc(r.nome)}</span><small>${esc(r.reg||'')}</small></button>`).join('')}</div></div>`
          :'<p class="bd-hint">Nenhum representante cadastrado (Agendamentos › Solicitações dos representantes › Representantes).</p>'}${rsel?'':''}</div>
      <fieldset class="bd-fs"><legend>Veículo</legend><div class="bd-seg">${VEICS.map(([k,n])=>`<button type="button" data-act="bd-f-veic" data-v="${k}" aria-pressed="${F.veic===k}">${esc(n)}</button>`).join('')}</div>${eB('bd-f-veic')}</fieldset>
      <fieldset class="bd-fs"><legend>Tipo</legend><div class="bd-seg two"><button type="button" data-act="bd-f-tipo" data-v="carrega" aria-pressed="${F.tipo==='carrega'}">Carrega</button><button type="button" data-act="bd-f-tipo" data-v="pit" aria-pressed="${F.tipo==='pit'}">PIT</button></div></fieldset>
      <div class="bd-facts">${F.edit?`<button type="button" class="bd-b0" data-act="bd-apaga" data-v="${esc(F.edit)}">Apagar registro</button>`:''}<button type="button" class="bd-b1 ok" data-act="bd-f-ok"${F.salvando?' disabled':''}>${F.salvando?'Gravando…':F.edit?'Salvar correção':'Registrar chegada · '+(hmOk(F.hora)?String(F.hora).trim().padStart(5,'0'):hm(new Date().toISOString()))}</button></div></div>`; }

  /* ---------- telas: Diário de bordo (escritório) ---------- */
  function linhasDia(){ return B.dia===B.diaLive?B.ent:(B.outro||[]); }
  async function lerOutro(d){ B.outro=null; P.render(); try{ const q=await P.db().collection('bordo').where('dia','==',d).limit(300).get(); if(B.dia===d){ B.outro=docs(q); P.render(); } }catch(e){ P.erro(e); } }
  function kpis(xs){ const vs=vivos(xs), pat=vs.filter(e=>estado(e).k==='pend'), fim=vs.filter(e=>estado(e).k==='fim'), des=vs.filter(e=>e.des);
    const tms=fim.map(patioMin).filter(n=>n!=null), med=tms.length?tms.reduce((a,b)=>a+b,0)/tms.length:null;
    const et={}; ETAPAS.forEach(([k])=>et[k]=[]); vs.forEach(e=>{ let prev=e.cheg; ETAPAS.forEach(([k])=>{ const t=(e.et||{})[k]; if(t&&prev){ et[k].push(minDe(prev,t)); prev=t; } }); });
    const lenta=ETAPAS.map(([k,n])=>({k,n,m:et[k].length?et[k].reduce((a,b)=>a+b,0)/et[k].length:null})).filter(o=>o.m!=null).sort((a,b)=>b.m-a.m)[0];
    const espera=pat.map(e=>({e,s:estado(e)})).sort((a,b)=>b.s.min-a.s.min)[0];
    return {n:vs.length,pat,fim,des,med,lenta,espera}; }
  function celEtapa(e,k,st){ const t=(e.et||{})[k], po=(e.etPor||{})[k];
    if(e.des) return `<td class="bd-et"><span class="bd-ex">—</span></td>`;
    if(t) return `<td class="bd-et"><button type="button" class="bd-ok" data-act="bd-et" data-v="${esc(e._id)}|${k}" title="${esc(ETN[k]+' por '+(po||'?')+' · tocar para desmarcar')}">${esc(hm(t))}</button></td>`;
    const ag=st.k==='pend'&&st.etapa===k;
    return `<td class="bd-et"><button type="button" class="${ag?(st.atr?'bd-atr':'bd-esp'):'bd-nx'}" data-act="bd-et" data-v="${esc(e._id)}|${k}" title="Marcar ${esc(ETN[k])} agora">${ag?(st.atr?'⚠ ':'')+esc(dur(st.min)):'marcar'}</button></td>`; }
  function vDiario(){ iniciar(); if(!B.lido.dia) return '<section class="card"><div class="empty">Carregando o diário de bordo…</div></section>';
    const d=B.dia, xs=linhasDia(), live=d===B.diaLive; if(!live&&!B.outro) return topoDia(d)+'<section class="card"><div class="empty">Carregando o dia '+esc(br(d))+'…</div></section>';
    const K=kpis(xs), vs=ordena(vivos(xs)), f=B.filt;
    const rows=vs.filter(e=>{ const s=estado(e).k; return f==='todos'||(f==='patio'&&s==='pend')||(f==='fim'&&s==='fim')||(f==='des'&&s==='des'); });
    const kp=`<section class="bd-kpis" aria-label="Resumo do dia">
      <div><span>No pátio agora</span><b>${K.pat.length}</b><small>${K.espera?esc(K.espera.e.mot.split(' ')[0])+' esperando '+esc(ETN[K.espera.s.etapa].toLowerCase())+' há '+esc(dur(K.espera.s.min)):'ninguém esperando'}</small></div>
      <div><span>Finalizados</span><b class="ok">${K.fim.length}</b><small>de ${K.n} chegada${K.n===1?'':'s'}</small></div>
      <div><span>Desistentes</span><b class="mut">${K.des.length}</b><small>${K.des.length?esc(K.des.map(e=>e.des.motivo).slice(0,2).join(', ')):'nenhum'}</small></div>
      <div><span>Tempo médio no pátio</span><b>${esc(dur(K.med))}</b><small>da chegada ao finalizado</small></div>
      <div><span>Etapa mais lenta</span><b class="warn">${K.lenta?esc(K.lenta.n):'—'}</b><small>${K.lenta?esc(dur(K.lenta.m))+' em média':'sem etapas marcadas'}</small></div></section>`;
    const ch=(k,n,c)=>`<button type="button" class="bd-fc" data-act="bd-filt" data-v="${k}" aria-pressed="${f===k}">${n} <b>${c}</b></button>`;
    const linha=e=>{ const st=estado(e), pm=patioMin(e), cls=st.k==='fim'?'fim':st.k==='des'?'des':st.atr?'atr':'';
      return `<tr class="${cls}" data-b="${esc(norm([e.mot,e.cli,e.placa,e.repNome,(e.peds||[]).join(' '),e.obs||'',(e.dem||{}).motivo||'',(e.dem||{}).obs||''].join(' ')))}">
        <td class="bd-ord">${e.ord}</td>
        <td><b class="bd-nm">${esc(e.mot)}</b><small>${esc(e.cli||'—')}${e.repNome?' · '+esc(e.repNome):''}</small>${e.obs?`<small class="bd-obs" title="${esc(e.obs)}">Obs.: ${esc(e.obs)}</small>`:''}${e.dem?`<small class="bd-dem" title="${esc(e.dem.obs||'')}">Demora: ${esc(e.dem.motivo)}${e.dem.obs?' · '+esc(e.dem.obs):''}</small>`:''}</td>
        <td>${placaMini(e.placa)}<small>${esc(veicN(e.veic))}</small></td>
        <td class="bd-num">${esc(hm(e.cheg))}</td>
        <td><span class="bd-ag ${e.agKind||'sem'}">${esc(agTxt(e))}</span>${(e.peds||[]).length?`<small>${esc((e.peds||[]).join(', '))}</small>`:''}</td>
        <td><span class="bd-tp ${e.des?'des':e.tipo}">${e.des?'Desistente':e.tipo==='pit'?'PIT':'Carrega'}</span>${e.des?`<small>${esc(e.des.motivo)}</small>`:''}</td>
        ${ETAPAS.map(([k])=>celEtapa(e,k,st)).join('')}
        <td class="bd-num bd-pt${st.atr?' atr':''}">${e.des?'saiu '+esc(hm(e.des.em)):esc(dur(pm))}</td>
        <td class="bd-acts">${pode()&&st.k!=='des'?`<button type="button" class="bd-lk${st.atr&&!e.dem?' bd-lkw':''}" data-act="bd-dem" data-v="${esc(e._id)}">${e.dem?'Demora ✓':st.atr?'⚠ Motivo da demora':'Demora'}</button>`:''}${pode()&&st.k==='pend'?`<button type="button" class="bd-lk" data-act="bd-des" data-v="${esc(e._id)}">Desistiu</button>`:''}${pode()?`<button type="button" class="bd-lk" data-act="bd-ed" data-v="${esc(e._id)}">Corrigir</button>`:''}</td></tr>`; };
    const tab=vs.length?`<div class="bd-tw"><table class="bd-tab"><thead><tr><th>#</th><th>Motorista · cliente</th><th>Placa · veículo</th><th>Chegada</th><th>Agenda</th><th>Tipo</th>${ETAPAS.map(([,n])=>`<th>${n}</th>`).join('')}<th class="r">No pátio</th><th><span class="sr">Ações</span></th></tr></thead><tbody>${rows.map(linha).join('')||'<tr><td colspan="13" class="bd-vz">Nada neste filtro.</td></tr>'}</tbody></table></div>
      <p class="bd-leg">Toque na etapa para marcar a hora${juntos()?' (Faturado preenche o Mix se estiver vazio; Finalizado preenche o Carregado). Para mudar uma hora, use Corrigir':''}. Laranja: esperando agora, com o tempo · vermelho: passou do tempo combinado (${ETAPAS.map(([k,n])=>n.toLowerCase()+' '+lim(k)+' min').join(', ')}) · verde: finalizado · cinza: desistente.</p>`
      :`<div class="bd-vz2"><b>${live?'Nenhum caminhão chegou ainda hoje.':'Nenhum caminhão neste dia.'}</b><span>${live?'A portaria registra a chegada pelo celular, ou use "+ Registrar chegada".':''}</span></div>`;
    return topoDia(d)+(B.imp&&live?impHtml():'')+kp+`<section class="card bd-card"><div class="bd-bar"><h2>Fila ${live?'de hoje':'do dia'}</h2>${ch('todos','Todos',vs.length)}${ch('patio','No pátio',K.pat.length)}${ch('fim','Finalizados',K.fim.length)}${ch('des','Desistentes',K.des.length)}
      <label class="bd-busca"><span class="sr">Buscar</span><input id="bd-q" type="search" placeholder="Motorista, cliente, placa ou pedido" value="${esc(B.q||'')}"></label></div>${tab}</section>`+ovHtml(); }
  /* 27/11/2026 · trazer as linhas do dia do programa antigo (Diario de Bordo 1.0.14): colar o texto (copiado da tela ou de uma planilha)
     com ORDEM, MOTORISTA, HISTORICO, PLACA, CHEGADA, TIPO, MIX, FATURADO, CARREGADO, FINALIZADO, VEICULO — separado por tab, ";" ou "|".
     Só no dia de hoje; quem já está no painel (mesma placa e mesma hora de chegada) não repete. Desistente vira desistente. */
  function impLer(txt){ const out=[], VK=VEICS.map(v=>v[0]);
    String(txt||'').split(/\r?\n/).forEach(l=>{ if(!l.trim()) return; const c=l.split(/\t|;|\|/).map(x=>x.trim()); if(c.length<5) return; if(/^ordem$/i.test(c[0])||(/^motorista$/i.test(c[1]||'')&&!/\d/.test(c[0]))) return;
      const t=x=>{ const m=String(x||'').match(/^(\d{1,2}):(\d{2})/); return m?String(+m[1]).padStart(2,'0')+':'+m[2]:''; };
      const tipoT=String(c[5]||'').toUpperCase(), vRaw=String(c[10]||'').toUpperCase().replace(/\s+/g,'_'), veic=VK.includes(vRaw)?vRaw:(VK.find(k=>vRaw.startsWith(k))||'');
      const o={ord:+c[0]||0,mot:c[1]||'',cli:c[2]||'',placa:plN(c[3]||''),cheg:t(c[4]),tipo:/PIT/.test(tipoT)?'pit':'carrega',des:/DESIST/.test(tipoT),et:{mix:t(c[6]),fat:t(c[7]),carr:t(c[8]),fim:t(c[9])},veic,veicTxt:c[10]||''};
      if(o.mot&&o.cheg) out.push(o); }); return out; }
  function impHtml(){ const I=B.imp, L=I.lst, ja=o=>vivos(B.ent).some(e=>e.placa===o.placa&&hm(e.cheg)===o.cheg);
    return `<section class="card bd-nova"><h2>Trazer do programa antigo</h2><p class="bd-sub">Cole as linhas de hoje (Ordem, Motorista, Histórico, Placa, Chegada, Tipo, Mix, Faturado, Carregado, Finalizado, Veículo), uma por linha, separadas por tab ou ponto e vírgula. Quem já está no painel não repete.</p>
      <textarea id="bd-imp-txt" class="bd-in" rows="7" style="width:100%;font:inherit;font-size:13px">${esc(I.txt||'')}</textarea>
      <div class="bd-libb"><button type="button" class="bd-b0" data-act="bd-impver">Conferir</button><button type="button" class="bd-lk" data-act="bd-impx">Cancelar</button></div>
      ${L?(L.length?`<div class="bd-tw"><table class="bd-tab"><thead><tr><th>#</th><th>Motorista · cliente</th><th>Placa</th><th>Chegada</th><th>Tipo</th>${ETAPAS.map(([,n])=>`<th>${n}</th>`).join('')}<th>Veículo</th></tr></thead><tbody>${L.map(o=>`<tr${ja(o)?' style="opacity:.45"':''}><td>${o.ord||''}</td><td><b>${esc(o.mot)}</b><small>${esc(o.cli)}${ja(o)?' · já está no painel':''}</small></td><td>${esc(o.placa)}</td><td>${esc(o.cheg)}</td><td>${o.des?'Desistente':o.tipo==='pit'?'PIT':'Carrega'}</td>${ETAPAS.map(([k])=>`<td>${esc(o.et[k]||'')}</td>`).join('')}<td>${o.veic?esc(veicN(o.veic)):`<span class="bd-err">${esc(o.veicTxt||'?')}</span>`}</td></tr>`).join('')}</tbody></table></div>
        <div class="bd-libb"><button type="button" class="bd-b1" data-act="bd-impok"${I.salv?' disabled':''}>${I.salv?'Gravando…':'Trazer '+L.filter(o=>!ja(o)).length+' caminhões'}</button></div>`:'<p class="bd-err" role="alert">Não achei nenhuma linha. Confira se cada linha tem as colunas separadas por tab ou ponto e vírgula.</p>'):''}</section>`; }
  async function impGrava(){ const I=B.imp; if(!I||!I.lst||I.salv) return; if(!pode()) return P.toast('Seu acesso é só para ver.'); const dia=B.diaLive, agMs=Date.now()+60000;
    const ja=o=>vivos(B.ent).some(e=>e.placa===o.placa&&hm(e.cheg)===o.cheg); const xs=I.lst.filter(o=>!ja(o)&&new Date(isoDe(dia,o.cheg)).getTime()<=agMs); if(!xs.length){ P.toast('Nada novo para trazer.'); return; }
    I.salv=true; P.render(); let n=0;
    try{ for(const o of xs){ const cheg=isoDe(dia,o.cheg), et={}, por={}; ETAPAS.forEach(([k])=>{ if(o.et[k]){ et[k]=isoDe(dia,o.et[k]); por[k]='programa antigo'; } });
        const id='b'+dia.replace(/-/g,'')+'-'+novoId(); const des=o.des?{em:et.fat||et.mix||cheg,motivo:'Outro',obs:'Registrado no programa antigo',por:eu()}:null;
        const d={dia,ord:o.ord||99,placa:o.placa,mot:o.mot,veic:o.veic||'',tipo:o.tipo,peds:[],cli:o.cli,repId:'',repNome:'',agIds:[],agKind:'sem',agData:null,carga:'',cheg,horaDigitada:true,obs:'',et,etPor:por,al:{},des,por:S.uid,porN:eu(),criado:new Date().toISOString(),origem:'programa antigo'};
        await P.db().collection('bordo').doc(id).set(d); B.ent=B.ent.filter(e=>e._id!==id).concat([Object.assign({_id:id},d)]); n++; }
      await renumera(dia); B.imp=null; P.toast(n+' caminhões trazidos do programa antigo.'); }
    catch(e){ I.salv=false; P.erro(e); } P.render(); }
  function topoDia(d){ const live=d===B.diaLive, dt=new Date(d+'T12:00:00');
    return `<header class="bd-top"><div><p class="bd-eb"><button type="button" class="bd-dn" data-act="bd-dia" data-v="-1" aria-label="Dia anterior">‹</button>${esc(DSL[dt.getDay()])}, ${esc(br(d))}${live?' · hoje':''}<button type="button" class="bd-dn" data-act="bd-dia" data-v="1" aria-label="Próximo dia"${live?' disabled':''}>›</button>${live?'':'<button type="button" class="bd-lk" data-act="bd-dia" data-v="0">Voltar para hoje</button>'}</p><h1>Diário de bordo</h1></div>
      <div class="bd-ta">${adm()&&live&&!B.imp?'<button type="button" class="btn sec" data-act="bd-imp">Trazer do programa antigo</button>':''}<button type="button" class="btn sec" data-act="bd-csv">Planilha do dia</button>${P.viewOk('bordotv')?`<a class="btn sec" href="${esc(tvUrl())}" target="_blank" rel="noopener" title="Abre numa aba nova: arraste para o monitor e aperte F11">TV ↗</a>`:''}${pode()&&live?'<button type="button" class="btn" data-act="bd-nova">+ Registrar chegada</button>':''}</div></header>`; }
  function placaMini(p){ p=plN(p); return `<span class="bd-pl" aria-label="Placa ${esc(p)}">${esc(p)}</span>`; }
  function ovHtml(){ const O=B.ov; if(!O) return '';
    if(O.f&&B.f) return `<div class="bd-ov" role="dialog" aria-modal="true" aria-label="${B.f.edit?'Corrigir registro':'Registrar chegada'}"><div class="bd-ovb"><div class="bd-ovh"><h2>${B.f.edit?'Corrigir registro':'Registrar chegada'}</h2><button type="button" class="bd-x" data-act="bd-ovx" aria-label="Fechar">×</button></div>${formChegada(false)}</div></div>`;
    if(O.dem){ const e=entDe(O.dem.id); if(!e) return ''; return `<div class="bd-ov" role="dialog" aria-modal="true" aria-label="Motivo da demora"><div class="bd-ovb sm">${demHtml(e)}</div></div>`; }
    if(O.des){ const e=entDe(O.des.id); if(!e) return ''; return `<div class="bd-ov" role="dialog" aria-modal="true" aria-label="Marcar desistente"><div class="bd-ovb sm">${desHtml(e)}</div></div>`; }
    if(O.email) return `<div class="bd-ov" role="dialog" aria-modal="true" aria-label="Colar email"><div class="bd-ovb"><div class="bd-ovh"><h2>Colar o email do representante</h2><button type="button" class="bd-x" data-act="bd-ovx" aria-label="Fechar">×</button></div>
      <p class="bd-hint">Copie o email inteiro no Outlook (Ctrl+A, Ctrl+C) e cole aqui. O painel acha os pedidos, o representante, o cliente e a hora do email.</p><textarea id="bd-em-tx" class="bd-ta2" rows="10" placeholder="Cole o email aqui"></textarea><div class="bd-facts"><button type="button" class="bd-b1" data-act="bd-em-ok">Ler o email</button></div></div></div>`;
    return ''; }
  /* 27/11/2026 · motivo da demora (a expedição marca e pode colar uma observação) */
  const DEMS=['Aguardando produção','Falta de material','Aguardando liberação financeira','Aguardando nota fiscal','Fila de carregamento','Falta de pessoal','Veículo inadequado','Ajuste no pedido / carga parcial','Problema no sistema','Outro'];
  function demHtml(e){ const D=B.ov.dem, st=estado(e);
    return `<div class="bd-ovh"><div><h2>Motivo da demora</h2><p class="bd-sub">Nº ${e.ord} · ${esc(e.mot)} · ${esc(e.placa)} · chegou ${esc(hm(e.cheg))} · ${esc(dur(patioMin(e)))} no pátio${st.k==='pend'&&st.etapa?' · esperando '+esc(ETN[st.etapa].toLowerCase()):''}</p></div><button type="button" class="bd-x" data-act="bd-ovx" aria-label="Fechar">×</button></div>
      <fieldset class="bd-fs"><legend>Por que está demorando?</legend><div class="bd-mots" role="radiogroup">${DEMS.map(m=>`<button type="button" class="bd-rep" role="radio" aria-checked="${D.motivo===m}" data-act="bd-demm" data-v="${esc(m)}"><span class="bd-rdot" aria-hidden="true"></span><span class="bd-rn">${esc(m)}</span></button>`).join('')}</div></fieldset>
      <label class="bd-lb">Observação <small>(pode colar um texto)</small><textarea id="bd-dem-obs" class="bd-in" rows="4" maxlength="600" placeholder="Ex.: aguardando o lote 5012 da Linha 1; financeiro liberou às 14h">${esc(D.obs||'')}</textarea></label>
      ${D.err?`<p class="bd-err" role="alert">${esc(D.err)}</p>`:''}
      <div class="bd-facts">${e.dem?`<button type="button" class="bd-lk" data-act="bd-demx" data-v="${esc(e._id)}">Apagar o motivo</button>`:''}<button type="button" class="bd-b0" data-act="bd-ovx">Voltar</button><button type="button" class="bd-b1" data-act="bd-demok" data-v="${esc(e._id)}">Salvar</button></div>`; }
  function desHtml(e){ const D=B.ov.des;
    return `<div class="bd-ovh"><div><h2>Marcar como desistente</h2><p class="bd-sub">${esc(e.mot)} · ${esc(e.placa)} · chegou ${esc(hm(e.cheg))} · ${esc(dur(patioMin(e)))} no pátio</p></div><button type="button" class="bd-x" data-act="bd-ovx" aria-label="Fechar">×</button></div>
      <fieldset class="bd-fs"><legend>Por que ele foi embora?</legend><div class="bd-mots" role="radiogroup">${MOTIVOS.map(m=>`<button type="button" class="bd-rep" role="radio" aria-checked="${D.motivo===m}" data-act="bd-dmot" data-v="${esc(m)}"><span class="bd-rdot" aria-hidden="true"></span><span class="bd-rn">${esc(m)}</span></button>`).join('')}</div></fieldset>
      <label class="bd-lb">Observação <small>opcional</small><input id="bd-dobs" class="bd-in" maxlength="200" value="${esc(D.obs||'')}" placeholder="Ex.: esperou o mix e não liberou"></label>${D.err?`<p class="bd-err" role="alert">${esc(D.err)}</p>`:''}
      <div class="bd-facts"><button type="button" class="bd-b0" data-act="bd-ovx">Voltar</button><button type="button" class="bd-b1 mut" data-act="bd-dok" data-v="${esc(e._id)}">Marcar desistente</button></div>`; }
  function csvDia(){ const xs=ordena(vivos(linhasDia())); if(!xs.length) return P.toast('Nada neste dia.');
    const L=[['Ordem','Motorista','Cliente','Representante','Pedidos','Placa','Veículo','Chegada','Agenda','Tipo','Mix','Faturado','Carregado','Finalizado','No pátio (min)','Desistente','Motivo','Observação','Motivo da demora','Obs. da demora']].concat(xs.map(e=>[e.ord,e.mot,e.cli,e.repNome,(e.peds||[]).join(' '),e.placa,veicN(e.veic),hm(e.cheg),agTxt(e),e.tipo==='pit'?'PIT':'Carrega'].concat(ETAPAS.map(([k])=>hm((e.et||{})[k]))).concat([patioMin(e),e.des?hm(e.des.em):'',e.des?e.des.motivo:'',e.obs||'',(e.dem||{}).motivo||'',(e.dem||{}).obs||''])));
    baixar('diario-de-bordo-'+B.dia+'.csv',L); }
  function baixar(nome,L){ const t='﻿'+L.map(r=>r.map(c=>{ c=c==null?'':String(c); return /[;"\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c; }).join(';')).join('\r\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'})); a.download=nome; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); }

  /* ---------- tela da TV (aba Diário de bordo + aba Agendados, trocam sozinhas) ---------- */
  const tvSolo=()=>{ try{ const A=S.acs; if(!A||!A.pronto||S.view!=='bordotv') return false; if(B.tv.cheia) return true; if(/[?&]tv=bordo\b/.test(location.search)) return true; return (A.doc||{}).perfil==='tvbordo'; }catch(e){ return false; } };
  const segTV=()=>Math.max(10,+B.cfg.tvSeg||30);
  function vTV(){ iniciar(); Promise.resolve().then(tvCabe); setTimeout(tvCabe,400); const so=tvSolo(); try{ document.body.classList.toggle('bd-tvon',so); }catch(e){}
    const ab=B.tv.aba, ag=new Date(), rel=String(ag.getHours()).padStart(2,'0')+':'+String(ag.getMinutes()).padStart(2,'0');
    const corpo=ab==='agend'?tvAgend():tvDiario();
    return `<div class="bd-tv${so?' so':''}"><header class="bd-tvh"><div class="bd-tvlogo"><img src="icons/logo-colafix-escuro.png" alt="Colafix"></div>
      <nav class="bd-tvt" aria-label="Telas da TV"><button type="button" data-act="bd-tvaba" data-v="diario" aria-pressed="${ab==='diario'}">Diário de bordo</button><button type="button" data-act="bd-tvaba" data-v="agend" aria-pressed="${ab==='agend'}">Agendados</button></nav>
      <span class="bd-tvd">${esc(br(B.diaLive))}</span><div class="bd-tvk">${corpo.k}</div><div class="bd-tvc" data-rtv-clk>${rel}</div>${document.fullscreenElement?'':`<button type="button" class="bd-tvfs" data-act="bd-tvcheia" title="Ocupa a tela toda (ou aperte F11). Esc para sair.">⛶ Tela cheia</button>`}</header>
      <div class="bd-tvb">${corpo.h}</div><footer class="bd-tvf">${corpo.f}<span class="r">Troca de aba sozinha a cada ${segTV()} s · atualiza sozinho</span></footer></div>`; }
  /* 27/11/2026 · TV dos motoristas ("uma tela para deixar lá com os freteiros"): só a fila de hoje, letra grande, sem cliente nem
     representante. Cada caminhão: nº, placa, primeiro nome, em que etapa está (Mix · Faturado · Carregado · Liberado) e há quanto tempo
     espera. Quem mudou de etapa nos últimos 3 minutos pisca em amarelo. Liberado fica 20 minutos com "pode sair" e some.
     Abre por ?tv=motoristas (login da TV do diário ou qualquer login com o diário). */
  const MTV=()=>S.view==='bordomot'||S.view==='bdmot';
  const MT_ST=[['mix','Aguardando o mix'],['fat','Aguardando o faturamento'],['carr','Aguardando o carregamento'],['fim','Carregado · aguarde a liberação']];
  function vMot(){ iniciar(); const so=/[?&]tv=motoristas\b/.test(location.search)||B.tv.cheia||((S.acs&&S.acs.doc||{}).perfil==='tvbordo'); try{ document.body.classList.toggle('bd-tvon',so); }catch(e){}
    Promise.resolve().then(mtCabe); setTimeout(mtCabe,400);
    const ag=Date.now(), rel=String(new Date().getHours()).padStart(2,'0')+':'+String(new Date().getMinutes()).padStart(2,'0');
    const xs=ordena(vivos(B.ent)).filter(e=>{ const st=estado(e); if(st.k==='des'||st.k==='rem') return false; if(st.k==='fim') return ag-new Date(e.et.fim).getTime()<20*60000; return true; });
    const nome=n=>{ const w=String(n||'').trim().split(/\s+/)[0]||''; return w.charAt(0)+w.slice(1).toLowerCase(); };
    const ult=e=>{ const ts=[e.cheg].concat(ETAPAS.map(([k])=>(e.et||{})[k])).filter(Boolean).sort(); return ts[ts.length-1]; };
    const linha=e=>{ const st=estado(e), et=e.et||{}, novo=ag-new Date(ult(e)).getTime()<180000&&!!Object.values(et).some(Boolean);
      const prox=(MT_ST.find(([k])=>!et[k])||[''])[0], txt=st.k==='fim'?'✓ LIBERADO · PODE SAIR':(MT_ST.find(([k])=>!et[k])||[0,''])[1], cls=st.k==='fim'?'lib':'s-'+prox, demora=st.k==='pend'&&st.atr;
      const passos=ETAPAS.map(([k,n])=>`<span class="mt-p${et[k]?' ok':st.k==='pend'&&st.etapa===k?' ag':''}">${et[k]?'✓ ':''}${k==='fim'?'Liberado':n}</span>`).join('');
      return `<tr class="${st.k==='fim'?'fim':''}${novo?' novo':''}"><td class="mt-n">${e.ord}</td><td class="mt-pl"><span class="mt-plc">${esc(plN(e.placa))}</span></td><td class="mt-nm">${esc(nome(e.mot))}</td>
        <td class="mt-st"><b class="mt-bd ${cls}">${esc(txt)}</b>${novo&&st.k!=='fim'?'<i class="mt-novo">AGORA</i>':''}<span class="mt-ps">${passos}</span></td><td class="mt-t${demora?' dem':''}">${st.k==='fim'?'saiu '+esc(hm(et.fim)):'chegou '+esc(hm(e.cheg))+'<small>há '+esc(dur(minDe(e.cheg)))+'</small>'}</td></tr>`; };
    const cham=xs.filter(e=>estado(e).k==='fim'&&ag-new Date(e.et.fim).getTime()<180000);
    const corpo=xs.length?`<table class="mt-tab"><colgroup><col style="width:6%"><col style="width:16%"><col style="width:16%"><col style="width:46%"><col style="width:16%"></colgroup><thead><tr><th>Nº</th><th>Placa</th><th>Motorista</th><th>Situação</th><th>Hora</th></tr></thead><tbody>${xs.map(linha).join('')}</tbody></table><p class="bd-tvmais" hidden></p>`
      :'<p class="mt-vz">Nenhum caminhão na fila agora.</p>';
    return `<div class="bd-tv mt${so?' so':''}"><header class="bd-tvh"><div class="bd-tvlogo"><img src="icons/logo-colafix-escuro.png" alt="Colafix"></div><h1 class="mt-h">Fila de carregamento</h1>
      <span class="bd-tvd">${esc(br(B.diaLive))}</span><div class="bd-tvk"><span>Na fila <b>${xs.filter(e=>estado(e).k==='pend').length}</b></span></div><div class="bd-tvc">${rel}</div>${document.fullscreenElement?'':`<button type="button" class="bd-tvfs" data-act="bd-tvcheia">⛶ Tela cheia</button>`}</header>
      ${cham.length?`<div class="mt-cham" role="status"><span class="mt-chi">📣</span>${cham.map(e=>`<span class="mt-chx"><span class="mt-plc">${esc(plN(e.placa))}</span> ${esc(nome(e.mot))} · <b>PODE SAIR</b></span>`).join('')}</div>`:''}
      <div class="bd-tvb">${corpo}</div><footer class="bd-tvf"><span>Acompanhe pela sua placa. A ordem é a da chegada. Quando aparecer <b>Liberado</b>, pode sair.</span><span class="r">Atualiza sozinho</span></footer></div>`; }
  P.bordoMot=vMot; P.bordoSol=vSol;
  function mtCabe(){ try{ if(!MTV()) return; tvCabeTopo(); const tb=document.querySelector('.bd-tvb .mt-tab'); if(!tb) return; const ft=document.querySelector('.bd-tvf');
      const alt=()=>window.innerHeight-tb.getBoundingClientRect().top-(ft?ft.offsetHeight:0)-14; tb.querySelectorAll('tbody tr.tvx').forEach(r=>{ r.classList.remove('tvx'); r.hidden=false; });
      let fs=1.9; tb.style.fontSize=fs+'em'; while(tb.offsetHeight>alt()&&fs>0.45){ fs=Math.round((fs-0.05)*100)/100; tb.style.fontSize=fs+'em'; }
      const cand=[...tb.querySelectorAll('tbody tr.fim')]; while(tb.offsetHeight>alt()&&cand.length){ const r=cand.shift(); r.hidden=true; r.classList.add('tvx'); } }catch(e){ console.warn('[bordo] tv motoristas',e); } }

  setInterval(()=>{ if(MTV()) P.rerender(); },30000);
  /* 27/11/2026 · "tem que sempre caber na tela": na TV a tabela diminui a letra até caber na altura (largura fixa, texto longo vira "…");
     se nem com a letra mínima couber, esconde os finalizados mais antigos e avisa quantos. */
  function tvCabeTopo(){ const hd=document.querySelector('.bd-tvh'), k=document.querySelector('.bd-tvh .bd-tvk'); if(!hd||!k) return; [...k.children].forEach(c=>c.hidden=false);
    let f=1.15; k.style.fontSize=f+'em'; while((k.scrollWidth>k.clientWidth+1||hd.scrollWidth>hd.clientWidth+1)&&f>0.8){ f=Math.round((f-0.05)*100)/100; k.style.fontSize=f+'em'; }
    const cs=[...k.children]; while((k.scrollWidth>k.clientWidth+1||hd.scrollWidth>hd.clientWidth+1)&&cs.length>1){ cs.pop().hidden=true; } }
  function tvCabe(){ try{ if(S.view!=='bordotv') return; tvCabeTopo(); const tb=document.querySelector('.bd-tvb .bd-tvtab'); if(!tb) return; const box=document.querySelector('.bd-tv'); const ft=document.querySelector('.bd-tvf');
      const so=box&&box.classList.contains('so'); const alt=()=>{ const top=tb.getBoundingClientRect().top; const fh=ft?ft.offsetHeight:0; return (so?window.innerHeight:Math.max(window.innerHeight,600))-top-fh-14; };
      tb.querySelectorAll('tbody tr.tvx').forEach(r=>{ r.classList.remove('tvx'); r.hidden=false; }); const note=document.querySelector('.bd-tvb .bd-tvmais'); if(note){ note.hidden=true; note.textContent=''; }
      let fs=1.15; tb.style.fontSize=fs+'em'; const MIN=0.62; let lim=alt(); if(note&&tb.offsetHeight>lim) lim-=note.offsetHeight||30;
      while(tb.offsetHeight>alt()&&fs>MIN){ fs=Math.round((fs-0.03)*100)/100; tb.style.fontSize=fs+'em'; }
      if(tb.offsetHeight>alt()){ const cand=[...tb.querySelectorAll('tbody tr.fim, tbody tr.des')]; let n=0; const lim2=()=>alt()-(note?Math.max(28,note.offsetHeight):0);
        while(tb.offsetHeight>lim2()&&cand.length){ const r=cand.shift(); r.hidden=true; r.classList.add('tvx'); n++; }
        if(n&&note){ note.hidden=false; note.textContent=n+' finalizado'+(n>1?'s':'')+' escondido'+(n>1?'s':'')+' para caber na tela'; } } }catch(e){ console.warn('[bordo] tv',e); } }
  /* 27/11 21h ("fica se tremendo"): o ajuste roda antes da tela ser pintada (microtarefa) e só refaz no resize se o tamanho mudou de verdade */
  let _tvTam=''; window.addEventListener('resize',()=>{ const t=innerWidth+'x'+innerHeight; if(t===_tvTam) return; _tvTam=t; clearTimeout(tvCabe._t); tvCabe._t=setTimeout(()=>{ tvCabe(); mtCabe(); },150); });
  document.addEventListener('fullscreenchange',()=>setTimeout(tvCabe,200));
  const lg=(c,t)=>`<span><i style="background:${c}"></i>${t}</span>`;
  function tvDiario(){ if(!B.lido.dia) return {k:'',h:'<p class="bd-tvvz">Carregando…</p>',f:''};
    const K=kpis(B.ent), vs=ordena(vivos(B.ent)), MAX=999; let rows=vs, esc_=0;
    if(vs.length>MAX){ const pat=vs.filter(e=>estado(e).k==='pend'), out=vs.filter(e=>estado(e).k!=='pend'); const cabe=Math.max(0,MAX-pat.length); rows=ordena(pat.concat(out.slice(-cabe))); esc_=vs.length-rows.length; }
    const k=`<span>No pátio <b>${K.pat.length}</b></span><span>Finalizados <b>${K.fim.length}</b></span><span>Desistentes <b>${K.des.length}</b></span><span>Média no pátio <b>${esc(dur(K.med))}</b></span>`;
    if(!vs.length) return {k,h:'<p class="bd-tvvz">Nenhum caminhão chegou ainda hoje.</p>',f:''};
    const cel=(e,kk,st)=>{ const t=(e.et||{})[kk]; if(e.des) return '<td></td>'; if(t) return `<td>${esc(hm(t))}</td>`; if(st.k==='pend'&&st.etapa===kk) return `<td class="${st.atr?'atr':'pend'}">${st.atr?'⚠ ':''}${esc(dur(st.min))}</td>`; return '<td class="nx"></td>'; };
    const linha=e=>{ const st=estado(e), cls=st.k==='fim'?'fim':st.k==='des'?'des':st.atr?'al':'';
      return `<tr class="${cls}"><td class="b">${e.ord}</td><td class="l b">${esc(e.mot)}</td><td class="l">${esc(e.cli||'')}</td><td class="l">${esc(e.repNome||'')}</td><td class="b pl">${esc(e.placa)}</td><td>${esc(hm(e.cheg))}</td><td class="ag ${e.agKind||'sem'}">${esc(e.agKind==='antecipado'?'Antecipado · '+br(e.agData):e.agKind==='atrasado'?'Atrasado · '+br(e.agData):e.agKind==='agendado'?'Agendado':'Sem agenda')}</td><td class="b">${e.des?'Desistente · '+esc(e.des.motivo):e.tipo==='pit'?'PIT':'Carrega'}</td>${ETAPAS.map(([kk])=>cel(e,kk,st)).join('')}<td class="l">${esc(veicN(e.veic))}</td></tr>`; };
    const cg='<colgroup><col style="width:4%"><col style="width:15%"><col style="width:15%"><col style="width:9%"><col style="width:7.5%"><col style="width:5.5%"><col style="width:9%"><col style="width:8%"><col style="width:5%"><col style="width:5.5%"><col style="width:6%"><col style="width:5.5%"><col style="width:5%"></colgroup>';
    const h=`<table class="bd-tvtab fixa">${cg}<thead><tr><th>Nº</th><th class="l">Motorista</th><th class="l">Cliente</th><th class="l">Representante</th><th>Placa</th><th>Chegada</th><th>Agenda</th><th>Tipo</th>${ETAPAS.map(([,n])=>`<th>${n}</th>`).join('')}<th class="l">Veículo</th></tr></thead><tbody>${rows.map(linha).join('')}</tbody></table><p class="bd-tvmais" hidden></p>`;
    return {k,h,f:lg('#c9ecd6','Finalizado')+lg('#e64640','Etapa pendente (tempo esperando)')+lg('#8f1d19','Atrasado: passou do tempo combinado')+lg('#d5dadd','Desistente')+lg('#efe7fb','Veio antes do dia agendado')}; }
  function tvAgend(){ if(!B.lido.ag) return {k:'',h:'<p class="bd-tvvz">Carregando os agendamentos…</p>',f:''};
    const h0=B.diaLive, dias=[h0,proxUtil(h0,1),proxUtil(h0,2)], vs=vivos(B.ent), agora=new Date();
    const entDoAg=x=>vs.find(e=>(e.agIds||[]).includes(x._id)||(e.peds||[]).some(p=>pedsDe(x).includes(p)));
    const repDoAg=x=>{ const s=B.sol.find(s=>(s.lib||{}).agId===x._id)||solDosPeds(pedsDe(x)); return (s&&s.repNome)||x.rep||''; };
    const sit=(x,d)=>{ const e=entDoAg(x); if(e){ const st=estado(e); if(st.k==='fim') return ['Finalizado '+hm(e.et.fim),'ok','fim']; if(st.k==='des') return ['Desistiu '+hm(e.des.em),'mut','des']; return ['No pátio'+(x.fat||(e.et||{}).fat?' · faturado':' · chegou '+hm(e.cheg)),x.fat||(e.et||{}).fat?'fat':'ok',x.fat||(e.et||{}).fat?'fatr':'fim']; }
      if(x.chegou) return ['No pátio · chegou '+hm(x.chegou),'ok','fim'];
      if(d===h0){ const m=String(x.hora||'').match(/^(\d{1,2}):(\d{2})/); if(m){ const t=new Date(h0+'T'+m[1].padStart(2,'0')+':'+m[2]+':00'); if(agora>t) return ['Não chegou · '+dur(minDe(t.toISOString()))+' atrasado','atr','']; } return ['Aguardando chegada','mut','']; }
      return ['Agendado','mut','']; };
    let n=0, hoje_=0, cheg=0, kg=0, esc_=0, prox=0; const blocos=[];
    dias.forEach((d,i)=>{ let xs=B.ag.filter(x=>x.status==='agendado'&&x.data===d).sort((a,b)=>String(a.hora||'99').localeCompare(String(b.hora||'99'))||(+a.ordemDia||0)-(+b.ordemDia||0));
      if(i===0){ hoje_=xs.length; xs.forEach(x=>{ kg+=pesoAg(x); if(entDoAg(x)||x.chegou) cheg++; }); const fimHj=vs.filter(e=>(e.et||{}).fim&&(e.agIds||[]).length).length; esc_=fimHj; hoje_+=fimHj; cheg+=fimHj; }
      else prox+=xs.length;
      blocos.push({d,i,xs}); n+=xs.length; });
    const k=`<span>Agendados hoje <b>${hoje_}</b></span><span>Já chegaram <b>${cheg}</b></span><span>Faltam chegar <b>${Math.max(0,hoje_-cheg)}</b></span><span>Peso do dia <b>${esc(fT(kg))}</b></span><span>Próximos dias <b>${prox}</b></span>`;
    const linha=(x,d)=>{ const s=sit(x,d), fa=faltaAg(x), peso=pesoAg(x);
      return `<tr class="${s[2]}"><td class="b">${esc(x.carga||'—')}</td><td class="l b">${esc(x.cliente||'')}</td><td class="l">${esc(repDoAg(x))}</td><td class="l">${esc(pedsDe(x).join(' · '))}</td><td>${peso?esc(fT(peso)):'—'}</td><td class="l">${esc(veicN(x.veiculo)||'')}</td><td>${esc(x.hora||'—')}</td><td class="${fa&&fa.length?'atr':'okt'}">${fa==null?'—':fa.length?'falta '+fa.length+' ite'+(fa.length>1?'ns':'m'):'✓ ok'}</td><td class="st ${s[1]}">${esc(s[0])}</td></tr>`; };
    const nomeDia=(d,i)=>(i===0?'Hoje · ':'')+DSL[new Date(d+'T12:00:00').getDay()]+', '+br(d)+(i===0&&esc_?' · '+esc_+' finalizado'+(esc_>1?'s':'')+' escondido'+(esc_>1?'s':''):'');
    const h=`<table class="bd-tvtab ag fixa"><colgroup><col style="width:8%"><col style="width:18%"><col style="width:12%"><col style="width:12%"><col style="width:7%"><col style="width:9%"><col style="width:8%"><col style="width:12%"><col style="width:14%"></colgroup><thead><tr><th>Carga</th><th class="l">Cliente</th><th class="l">Representante</th><th class="l">Pedidos</th><th>Peso</th><th class="l">Veículo</th><th>Horário</th><th>Material</th><th>Situação</th></tr></thead><tbody>${blocos.map(b=>`<tr class="dia"><td colspan="9" class="l">${esc(nomeDia(b.d,b.i))}</td></tr>`+(b.xs.length?b.xs.map(x=>linha(x,b.d)).join(''):'<tr><td colspan="9" class="l mut">Nenhuma carga agendada.</td></tr>')).join('')}</tbody></table>`;
    return {k,h,f:lg('#c9ecd6','Já chegou')+lg('#fdecd6','Faturado, falta carregar')+lg('#e64640','Falta material no saldo')+lg('#8f1d19','Passou do horário e não chegou')}; }

  /* ---------- tela: Solicitações (faturamento) ---------- */
  function vSol(){ iniciar(); const ab=B.solAba;
    const tabs=`<nav class="bd-tabs" aria-label="Solicitações">${[['quadro','Quadro'],['reps','Representantes'],['ajustes','Ajustes']].filter(([k])=>k==='quadro'||adm()).map(([k,n])=>`<button type="button" data-act="bd-saba" data-v="${k}" aria-pressed="${ab===k}">${n}</button>`).join('')}</nav>`;
    if(!B.lido.cfg||!B.lido.sol) return '<section class="card"><div class="empty">Carregando…</div></section>';
    const corpo=ab==='reps'&&adm()?vReps():ab==='ajustes'&&adm()?vAjustes():vQuadro();
    return corpo.replace('<!--tabs-->',tabs)+ovHtml(); }
  function cartao(s){ const ag=Date.now(), conf=s.prazoConf?new Date(s.prazoConf).getTime():0, h=hoje(), lib=s.st==='liberado', pend=!lib;
    const atr=pend&&conf&&ag>conf, vh=pend&&conf&&!atr&&diaDe(s.prazoConf)===h;
    const p1=lib?`<span class="bd-pi ok">${esc(dsem(s.lib.dia)+' '+br(s.lib.dia)+(s.lib.hora?' · '+s.lib.hora:''))}</span>`:atr?`<span class="bd-pi crit">Atrasado · era até ${esc(hm(s.prazoConf))} de ${esc(br(diaDe(s.prazoConf)))}</span>`:vh?`<span class="bd-pi warn">Confirmar em ${esc(dur(minDe(new Date().toISOString(),s.prazoConf)))}</span>`:`<span class="bd-pi">Confirmar até ${esc(dsem(diaDe(s.prazoConf))+' '+br(diaDe(s.prazoConf)))} 12:00</span>`;
    const p2=lib?(s.carregado?`<span class="bd-pi ok">Carregado ${esc(hm(s.carregado))}</span>`:s.chegou?`<span class="bd-pi info">Chegou ${esc(hm(s.chegou))}</span>`:s.lib.noPrazo===false?'<span class="bd-pi">Confirmado fora do prazo</span>':'<span class="bd-pi">Confirmado no prazo</span>'):`<span class="bd-pi">Carregar até ${esc(dsem(s.prazoCarr)+' '+br(s.prazoCarr))}</span>`;
    const F=B.libF[s._id], ac=s.acao&&!s.acao.feito?s.acao:null;
    const acts=!pode()?'':F?formLib(s,F):s.st==='recebido'?`<button type="button" class="bd-b1 sm" data-act="bd-s-av" data-v="${esc(s._id)}">Avaliar</button><button type="button" class="bd-lk" data-act="bd-s-canc" data-v="${esc(s._id)}">Cancelar</button>`
      :s.st==='avaliacao'?`${avalHtml(s)}<button type="button" class="bd-lk" data-act="bd-s-lib" data-v="${esc(s._id)}">Marcar o dia aqui</button><button type="button" class="bd-lk" data-act="bd-s-volta" data-v="${esc(s._id)}">Voltar</button><button type="button" class="bd-lk" data-act="bd-s-canc" data-v="${esc(s._id)}">Cancelar</button>`
      :`<button type="button" class="bd-b0 sm" data-act="bd-s-copia" data-v="${esc(s._id)}">Copiar resposta</button><button type="button" class="bd-lk" data-act="bd-s-lib" data-v="${esc(s._id)}">Mudar dia</button><button type="button" class="bd-lk" data-act="bd-s-canc" data-v="${esc(s._id)}">Cancelar</button>`;
    return `<article class="bd-cd${atr?' atr':vh?' hoje':''}" id="bd-cd-${esc(s._id)}"><div class="bd-cdh"><b>${esc(s.cli||'Cliente não informado')}</b><small>${esc(s.repNome||'sem representante')}</small></div>
      <div class="bd-cdp">${esc((s.peds||[]).join(' · '))}</div><div class="bd-cdi">${s.origem==='link'?'Pelo link do representante':s.origem==='email'?'Email':'Pelo painel'} · ${esc(br(diaDe(s.recebido))+' '+hm(s.recebido))}${s.quer&&s.quer.dia?' · pediu '+esc(dsem(s.quer.dia)+' '+br(s.quer.dia))+(s.quer.turno?' '+esc(s.quer.turno):''):''}${s.veic?' · '+esc(veicN(s.veic)):''}</div>
      ${s.obs?`<div class="bd-cdo">“${esc(s.obs)}”</div>`:''}<div class="bd-pis">${p1}${p2}</div>
      ${ac?`<div class="bd-acao"><b>${ac.tipo==='cancelar'?'O representante pediu para cancelar':'O representante pediu para reagendar'+(ac.dia?' para '+esc(dsem(ac.dia)+' '+br(ac.dia))+(ac.turno?' ('+esc(ac.turno)+')':''):'')}</b>${ac.motivo?`<span>${esc(ac.motivo)}</span>`:''}${pode()?`<div><button type="button" class="bd-b1 sm" data-act="bd-s-aok" data-v="${esc(s._id)}">${ac.tipo==='cancelar'?'Cancelar o agendamento':'Mudar o dia'}</button><button type="button" class="bd-lk" data-act="bd-s-ano" data-v="${esc(s._id)}">Recusar</button></div>`:''}</div>`:''}
      <div class="bd-cda">${acts}</div></article>`; }
  /* 27/11/2026 (faturamento): a solicitação fica dentro do módulo Agendamentos. Avaliar leva ao Agendamentos para importar o PDF
     do pedido e escolher o dia lá; com o dia escolhido, volta aqui (ou na faixa do Agendamentos) para Confirmar ao representante. */
  const agsLocal=peds=>{ const ps=(peds||[]).map(p=>String(p).replace(/\D/g,'')).filter(Boolean); return (B.ag||[]).filter(x=>x.status!=='cancelado'&&pedsDe(x).some(p=>ps.includes(p))); };
  function avalInfo(s){ const ags=agsLocal(s.peds), comItens=ags.filter(x=>(x.itens||[]).length), comDia=ags.find(x=>x.data&&x.status==='agendado');
    if(!ags.length) return {k:'imp',t:'Falta importar o pedido no Agendamentos (PDF do Focco)'};
    if(!comDia) return {k:'dia',t:'Pedido importado. Escolha o dia no Agendamentos'+(comItens.length?'':' (sem itens: importe o PDF para ter o saldo)')};
    return {k:'ok',t:'Dia escolhido no Agendamentos: '+dsem(comDia.data)+' '+br(comDia.data)+(comDia.hora?' às '+comDia.hora:''),dia:comDia.data,hora:comDia.hora||'',veic:comDia.veiculo||''}; }
  function avalHtml(s,curto){ const I=avalInfo(s), ir=P.viewOk('agendamentos')&&S.view!=='agendamentos';
    return `<div class="bd-avl ${I.k}"><span>${I.k==='ok'?'✓ ':''}${esc(I.t)}</span><div>${I.k==='ok'&&pode()?`<button type="button" class="bd-b1 sm ok" data-act="bd-s-conf" data-v="${esc(s._id)}">Confirmar ao representante</button>`:''}${ir&&!curto?`<button type="button" class="bd-b0 sm" data-act="bd-s-irag" data-v="${esc(s._id)}">${I.k==='imp'?'Importar o pedido':'Abrir no Agendamentos'}</button>`:''}</div></div>`; }
  /* faixa no alto do Agendamentos com as solicitações em avaliação */
  function faixaAval(){ try{ if(!B.lido.sol) return ''; const xs=(B.sol||[]).filter(s=>s.st==='avaliacao'&&s.aberto!==false); if(!xs.length) return '';
      return `<section class="card bd-fx"><div class="bd-fxh"><b>Solicitações em avaliação · ${xs.length}</b><button type="button" class="bd-lk" data-go="agsol">Ver todas as solicitações</button></div>${xs.map(s=>`<div class="bd-fxi${B.avalFoco===s._id?' foco':''}"><div><b>${esc(s.cli||'Cliente não informado')}</b> · pedido${(s.peds||[]).length>1?'s':''} ${esc((s.peds||[]).join(', '))}<small>${esc(s.repNome||'sem representante')}${s.quer&&s.quer.dia?' · pediu '+esc(dsem(s.quer.dia)+' '+br(s.quer.dia))+(s.quer.turno?' '+esc(s.quer.turno):''):''}${s.prazoConf?' · confirmar até '+esc(hm(s.prazoConf))+' de '+esc(br(diaDe(s.prazoConf))):''}</small></div>${avalHtml(s,true)}</div>`).join('')}</section>`; }catch(e){ return ''; } }
  { const t=setInterval(()=>{ try{ const f=S.extViews&&S.extViews.agendamentos; if(typeof f!=='function') return; clearInterval(t); if(f._bdfx) return;
      const w=function(){ const h=f.apply(this,arguments); try{ if(P.viewOk('agsol')){ iniciar(); const fx=faixaAval(); if(!fx) return h; const i=h.indexOf('ag-head'), j=i>=0?h.indexOf('<section',i):-1; return j>=0?h.slice(0,j)+fx+h.slice(j):fx+h; } }catch(e){} return h; }; w._bdfx=1; S.extViews.agendamentos=w; }catch(e){ clearInterval(t); } },500); }
  function formLib(s,F){ const d0=F.dia||'';
    return `<div class="bd-lib"><label class="bd-lb">Dia<input type="date" id="bd-l-dia-${esc(s._id)}" class="bd-in" value="${esc(d0)}" min="${esc(hoje())}"></label><label class="bd-lb">Horário<input type="time" id="bd-l-hora-${esc(s._id)}" class="bd-in" value="${esc(F.hora||'')}"></label>
      <label class="bd-lb">Veículo<select id="bd-l-veic-${esc(s._id)}" class="bd-in"><option value="">—</option>${VEICS.map(([k,n])=>`<option value="${k}"${(F.veic||s.veic)===k?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
      ${F.err?`<p class="bd-err" role="alert">${esc(F.err)}</p>`:''}<div class="bd-libb"><button type="button" class="bd-b1 sm ok" data-act="bd-s-libok" data-v="${esc(s._id)}">Confirmar</button><button type="button" class="bd-lk" data-act="bd-s-libx" data-v="${esc(s._id)}">Cancelar</button></div></div>`; }
  function vQuadro(){ const h=hoje(), ag=Date.now(), N=B.nova||(B.nova={peds:[],cli:'',repId:'',rec:'',origem:'painel'});
    const abertas=B.sol.filter(s=>s.st!=='cancelado'&&s.aberto!==false);
    const pend=abertas.filter(s=>s.st!=='liberado'), atr=pend.filter(s=>s.prazoConf&&ag>new Date(s.prazoConf).getTime()), vh=pend.filter(s=>s.prazoConf&&ag<=new Date(s.prazoConf).getTime()&&diaDe(s.prazoConf)===h);
    const recIso=N.rec?new Date(N.rec).toISOString():new Date().toISOString(), pz=prazos(recIso);
    const nova=pode()?`<section class="card bd-nova" aria-label="Nova solicitação"><div class="bd-nh"><h2>Nova solicitação</h2><button type="button" class="bd-lk" data-act="bd-email">Colar email do Outlook</button></div>
      <div class="bd-ng"><div class="bd-lb">Pedidos<div class="bd-chips" id="bd-n-chips">${N.peds.map((p,i)=>`<span class="bd-chip">${esc(p)}<button type="button" data-act="bd-n-px" data-v="${i}" aria-label="Tirar ${esc(p)}">×</button></span>`).join('')}<input id="bd-n-ped" inputmode="numeric" autocomplete="off" placeholder="${N.peds.length?'mais…':'Cole os pedidos do email'}"></div></div>
        <label class="bd-lb">Cliente<input id="bd-n-cli" class="bd-in" maxlength="80" value="${esc(N.cli)}" placeholder="Nome do cliente"></label>
        <label class="bd-lb">Representante<select id="bd-n-rep" class="bd-in"><option value="">Escolha…</option>${repsAt().map(r=>`<option value="${esc(r.id)}"${N.repId===r.id?' selected':''}>${esc(r.nome)}${r.reg?' · '+esc(r.reg):''}</option>`).join('')}</select></label>
        <label class="bd-lb">Recebido às<input id="bd-n-rec" type="datetime-local" class="bd-in" value="${esc(N.rec||'')}"></label>
        <div class="bd-lb">Prazos<span class="bd-pz">Confirmar até <b>${esc(diaDe(pz.conf)===h?'hoje':dsem(diaDe(pz.conf))+' '+br(diaDe(pz.conf)))} 12:00</b><br>Carregar até <b>${esc(dsem(pz.carr)+' '+br(pz.carr))}</b></span></div>
        <button type="button" class="bd-b1" data-act="bd-n-ok">Adicionar</button></div>${N.err?`<p class="bd-err" role="alert">${esc(N.err)}</p>`:''}</section>`:'';
    const fs=B.falta.filter(f=>!f.acao).sort((a,b)=>String(a.dia).localeCompare(String(b.dia)));
    const nFalta=cli=>B.falta.filter(f=>norm(f.cli)===norm(cli)&&String(f.dia).slice(0,7)===h.slice(0,7)&&f.acao!=='veio'&&f.acao!=='resolvido').length;
    const faltas=fs.length?`<section class="card bd-falta" aria-label="Não compareceram"><div class="bd-nh"><h2>Não compareceram · ${fs.length}</h2><span class="bd-sub">Passou o dia agendado e o caminhão não chegou. Reagende ou cancele.</span></div>
      ${fs.map(f=>{ const n=nFalta(f.cli), F=B.libF['f:'+f._id]||{}; return `<div class="bd-fl"><span><b>${esc(f.cli||'Cliente?')}</b><small>${f.carga?'Carga '+esc(f.carga)+' · ':''}${esc((f.peds||[]).join(', '))}${f.rep?' · '+esc(f.rep):''}</small></span>
        <span>Era <b>${esc(dsem(f.dia)+' '+br(f.dia))}${f.hora?' · '+esc(f.hora):''}</b></span><span class="${n>=2?'bd-crit':'bd-sub'}">${n}ª falta do cliente no mês</span>
        ${pode()?`<span class="bd-flf"><input type="date" id="bd-fd-${esc(f._id)}" class="bd-in sm" value="${esc(F.dia||proxUtil(h,1))}" min="${esc(h)}" aria-label="Novo dia"><input type="time" id="bd-fh-${esc(f._id)}" class="bd-in sm" value="${esc(F.hora||f.hora||'')}" aria-label="Novo horário"></span>
        <span class="bd-fla"><button type="button" class="bd-b1 sm" data-act="bd-f-reag" data-v="${esc(f._id)}">Reagendar</button><button type="button" class="bd-b0 sm" data-act="bd-f-canc" data-v="${esc(f._id)}">Cancelar</button></span>`:''}</div>`; }).join('')}</section>`:'';
    const col=([k,n,dd])=>{ const xs=abertas.filter(s=>s.st===k).sort((a,b)=>k==='liberado'?String(a.lib&&a.lib.dia).localeCompare(String(b.lib&&b.lib.dia))||String(a.lib&&a.lib.hora).localeCompare(String(b.lib&&b.lib.hora)):String(a.prazoConf).localeCompare(String(b.prazoConf)));
      return `<section class="bd-col ${k}"><div class="bd-colh"><i aria-hidden="true"></i><h2>${n}</h2><span>${xs.length}</span></div><p class="bd-sub">${dd}</p>${xs.map(cartao).join('')||'<p class="bd-colvz">Nada aqui.</p>'}</section>`; };
    return `<header class="bd-top"><div><p class="bd-eb">${esc(DSL[new Date().getDay()])}, ${esc(br(h))} · confirmar o dia até 12:00 · carregar em até 2 dias úteis</p><h1>Solicitações de agendamento</h1></div>
      <div class="bd-ta"><span class="bd-kp crit"><b>${atr.length}</b> atrasada${atr.length===1?'':'s'}</span><span class="bd-kp warn"><b>${vh.length}</b> vence${vh.length===1?'':'m'} hoje às 12:00</span></div></header><!--tabs-->${nova}${faltas}<div class="bd-cols">${SOL_ST.map(col).join('')}</div>`; }
  /* 27/11/2026 · colar a lista do comercial (Região / REPRESENTANTE ou VENDEDOR / Contato / Telefone / E-mail).
     O mesmo nome em duas regiões vira um cadastro só, com as regiões juntas. Quem já está cadastrado (mesmo nome) é atualizado. */
  function lerLista(txt){ const ls=String(txt||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()); const out=[]; let cur=null, cab='', pend=null;
    const LB=[[/^regi[aã]o\s*:?\s*(.*)$/i,'reg'],[/^(representante|vendedora?)\s*:?\s*(.*)$/i,'nome'],[/^contato\s*:?\s*(.*)$/i,'ct'],[/^telefone\s*:?\s*(.*)$/i,'tel'],[/^e-?mail\s*:?\s*(.*)$/i,'em']];
    const fecha=()=>{ if(cur&&cur.nome) out.push(cur); cur=null; };
    for(const l of ls){ if(!l) continue; let hit=null, val='';
      for(const [re,k] of LB){ const m=l.match(re); if(m){ hit=k; val=(k==='nome'?m[2]:m[1])||''; if(k==='nome') cur&&(cur.tipo=/^vend/i.test(m[1])?'vendedor':'representante'); break; } }
      if(hit){ if(hit==='reg'){ fecha(); cur={reg:'',nome:'',ct:'',tel:'',em:''}; }
        if(hit==='nome'){ if(cur&&cur.nome) fecha(); if(!cur) cur={reg:'',nome:'',ct:'',tel:'',em:''}; if(!cur.reg&&cab) cur.reg=cab; cur.tipo=/^vend/i.test(l)?'vendedor':'representante'; }
        pend=null; if(val) cur[hit]=val; else pend=hit; continue; }
      if(pend&&cur){ cur[pend]=l; pend=null; continue; }
      cab=l; }
    fecha();
    const tit=x=>x&&x===x.toUpperCase()&&/[A-Z]/.test(x)&&x.length>4?x.toLowerCase().replace(/(^|\s|-|\/)(\p{L})/gu,(a,b,c)=>b+c.toUpperCase()).replace(/\b(Ltda|Rs|Sc)\b/gi,w=>w.toUpperCase()).replace(/ (D[aeo]s?|E) /g,w=>w.toLowerCase()):x;
    const lst=[]; out.forEach(o=>{ o.nome=tit(o.nome.replace(/\s+/g,' ').trim()).slice(0,60); o.reg=tit(o.reg).slice(0,120); o.ct=tit(o.ct).slice(0,60); o.em=(o.em.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)||[''])[0].toLowerCase(); o.tel=o.tel.replace(/[–—]/g,'-').slice(0,40);
      const j=lst.find(x=>norm(x.nome)===norm(o.nome)); if(j){ if(o.reg&&!norm(j.reg).includes(norm(o.reg))) j.reg=(j.reg?j.reg+' · ':'')+o.reg; ['ct','tel','em'].forEach(k=>{ if(!j[k]&&o[k]) j[k]=o[k]; }); } else lst.push(o); });
    return lst.filter(o=>o.nome.length>=3); }
  function colarHtml(){ const C=B.colar, L=C.lst;
    return `<section class="card bd-nova"><h2>Colar lista de representantes</h2><p class="bd-sub">Cole a lista do comercial do jeito que está (Região, Representante ou Vendedor, Contato, Telefone, E-mail). Confira antes de cadastrar.</p>
      <textarea id="bd-r-txt" class="bd-in" rows="8" style="width:100%;font:inherit" placeholder="Região: Serra Gaúcha&#10;REPRESENTANTE: ...&#10;Contato: ...&#10;Telefone: ...&#10;E-mail: ...">${esc(C.txt||'')}</textarea>
      <div class="bd-libb"><button type="button" class="bd-b0" data-act="bd-r-colver">Conferir</button><button type="button" class="bd-lk" data-act="bd-r-colx">Cancelar</button></div>
      ${L?(L.length?`<p class="bd-sub"><b>${L.length} cadastro${L.length>1?'s':''}</b>${L.filter(o=>reps().some(r=>norm(r.nome)===norm(o.nome))).length?' · os que já existem serão atualizados':''}</p>
        <div class="bd-tw"><table class="bd-tab"><thead><tr><th>Nome</th><th>Região</th><th>Contato</th><th>Telefone</th><th>E-mail</th></tr></thead><tbody>${L.map(o=>`<tr><td><b>${esc(o.nome)}</b>${reps().some(r=>norm(r.nome)===norm(o.nome))?' <small>(já existe)</small>':''}</td><td>${esc(o.reg)}</td><td>${esc(o.ct)}</td><td>${esc(o.tel)}</td><td>${esc(o.em)}</td></tr>`).join('')}</tbody></table></div>
        <div class="bd-libb"><button type="button" class="bd-b1" data-act="bd-r-colok">Cadastrar ${L.length}</button></div>`:'<p class="bd-err" role="alert">Não achei nenhum representante. Confira se a lista tem "Região:" e "REPRESENTANTE:" (ou "VENDEDOR:").</p>'):''}</section>`; }
  async function importaReps(){ const L=B.colar&&B.colar.lst; if(!L||!L.length) return; if(!pode()) return P.toast('Seu acesso é só para ver.');
    const lst=(B.cfg.reps||[]).slice(); const mexe=[];
    L.forEach(o=>{ let r=lst.find(x=>!x.removido&&norm(x.nome)===norm(o.nome));
      if(r) Object.assign(r,{reg:o.reg||r.reg||'',ct:o.ct||r.ct||'',tel:o.tel||r.tel||'',em:o.em||r.em||'',tipo:o.tipo||r.tipo||''});
      else { r={id:novoId('r'),nome:o.nome,reg:o.reg,tel:o.tel,ct:o.ct,em:o.em,tipo:o.tipo||'representante',tok:novoTok(),topico:'colafix-rep-'+Math.random().toString(36).slice(2,10),ativo:true,criado:new Date().toISOString()}; lst.push(r); }
      mexe.push(r); });
    try{ await P.db().doc('config/bordo').set({reps:lst},{merge:true});
      for(const r of mexe) await P.db().collection('bordorep').doc(r.tok).set({repId:r.id,nome:r.nome,reg:r.reg||'',ativo:r.ativo!==false,topico:r.topico||''});
      B.cfg.reps=lst; B.colar=null; P.toast(mexe.length+' representantes cadastrados. Agora é só mandar o link de cada um.'); }catch(e){ P.erro(e); } P.render(); }
  function vReps(){ const E=B.edRep, rs=reps();
    const form=E?`<section class="card bd-nova"><h2>${E.id?'Editar representante':'Novo representante'}</h2><div class="bd-ng r"><label class="bd-lb">Nome<input id="bd-r-no" class="bd-in" maxlength="60" value="${esc(E.nome||'')}"></label><label class="bd-lb">Região<input id="bd-r-rg" class="bd-in" maxlength="120" value="${esc(E.reg||'')}" placeholder="Ex.: Serra Gaúcha"></label><label class="bd-lb">Contato<input id="bd-r-ct" class="bd-in" maxlength="60" value="${esc(E.ct||'')}" placeholder="Quem atende"></label><label class="bd-lb">E-mail<input id="bd-r-em" class="bd-in" type="email" maxlength="80" value="${esc(E.em||'')}"></label><label class="bd-lb">Telefone (WhatsApp)<input id="bd-r-tel" class="bd-in" inputmode="tel" maxlength="20" value="${esc(E.tel||'')}" placeholder="(51) 99999-0000"></label>
      <div class="bd-libb"><button type="button" class="bd-b1" data-act="bd-r-salva">Salvar</button><button type="button" class="bd-lk" data-act="bd-r-x">Cancelar</button></div></div>${E.err?`<p class="bd-err" role="alert">${esc(E.err)}</p>`:''}</section>`:B.colar?colarHtml():`<div class="bd-libb"><button type="button" class="btn" data-act="bd-r-novo">+ Novo representante</button><button type="button" class="btn sec" data-act="bd-r-colar">Colar lista de representantes</button></div>`;
    const linha=r=>`<li class="bd-rl${r.ativo===false?' off':''}"><span class="bd-av" aria-hidden="true">${esc(ini(r.nome))}</span><span class="bd-rlt"><b>${esc(r.nome)}</b><small>${esc([r.reg,r.ct&&r.ct!==r.nome?'Contato: '+r.ct:'',r.tel,r.em].filter(Boolean).join(' · '))}${r.ativo===false?' · link desligado':''}</small><small class="bd-tp2">Avisos: app ntfy, tópico <button type="button" class="bd-lk" data-act="bd-r-tp" data-v="${esc(r.topico||'')}">${esc(r.topico||'')}</button></small></span>
      <span class="bd-rla">${r.ativo!==false?`<button type="button" class="bd-b0 sm" data-act="bd-r-link" data-v="${esc(r.id)}">Copiar link</button><a class="bd-b0 sm" target="_blank" rel="noopener" href="https://wa.me/${esc(String(r.tel||'').split('/')[0].replace(/\D/g,'').replace(/^(?!55)(\d{10,11})$/,'55$1'))}?text=${encodeURIComponent('Olá '+r.nome.split(' ')[0]+'! Este é o seu link para pedir agendamento de carregamento na Colafix: '+linkRep(r)+' (salve na tela inicial do celular).')}">WhatsApp</a>`:''}
        <button type="button" class="bd-lk" data-act="bd-r-ed" data-v="${esc(r.id)}">Editar</button><button type="button" class="bd-lk" data-act="bd-r-at" data-v="${esc(r.id)}">${r.ativo===false?'Ligar link':'Desligar link'}</button><button type="button" class="bd-lk" data-act="bd-r-novolink" data-v="${esc(r.id)}">Trocar link</button></span></li>`;
    return `<header class="bd-top"><div><p class="bd-eb">Solicitações</p><h1>Representantes</h1></div></header><!--tabs-->
      <p class="bd-sub" style="margin:0 0 12px">Cada representante recebe um link só dele (sem senha) para pedir agendamento, acompanhar, reagendar e cancelar. Desligar o link bloqueia na hora; "Trocar link" invalida o antigo.</p>${form}
      <section class="card"><ul class="bd-rls">${rs.map(linha).join('')||'<li class="bd-sub">Nenhum representante ainda.</li>'}</ul></section>`; }
  function vAjustes(){ const L=B.cfg.lim||{}, T=B.cfg.tops||{};
    return `<header class="bd-top"><div><p class="bd-eb">Solicitações · diário de bordo</p><h1>Ajustes</h1></div></header><!--tabs-->
      <section class="card"><h2>Tempo máximo de cada etapa</h2><p class="bd-sub">Passou desse tempo esperando a etapa, a linha fica vermelha na TV e no diário, e quem cuida da etapa recebe o aviso (se tiver tópico).</p>
      <div class="bd-ajg">${ETAPAS.map(([k,n])=>`<label class="bd-lb">${n} (minutos)<input id="bd-a-l-${k}" class="bd-in" type="number" min="5" max="600" value="${esc(String(L[k]||LIM_PAD[k]))}"></label><label class="bd-lb">Aviso do ${n.toLowerCase()} (tópico do ntfy)<input id="bd-a-t-${k}" class="bd-in" maxlength="60" value="${esc(T[k]||'')}" placeholder="ex.: colafix-${k}"></label>`).join('')}</div>
      <label class="bd-ck" style="display:flex;gap:8px;align-items:center;margin:0 0 12px"><input type="checkbox" id="bd-a-jt" ${juntos()?'checked':''}> Marcar Faturado preenche o Mix vazio, e Finalizado preenche o Carregado vazio</label>
      <label class="bd-lb" style="max-width:260px">TV: trocar de aba a cada (segundos)<input id="bd-a-tv" class="bd-in" type="number" min="10" max="600" value="${esc(String(B.cfg.tvSeg||30))}"></label>
      ${pode()?'<div class="bd-libb"><button type="button" class="bd-b1" data-act="bd-a-salva">Salvar ajustes</button></div>':''}<p class="bd-hint">Para receber o aviso: instale o app ntfy no celular, toque em + e assine o tópico escrito aqui.</p></section>`; }

  /* ---------- solicitações: ações ---------- */
  function lerEmail(tx){ const o={peds:[],rep:'',cli:'',rec:''}; tx=String(tx||'');
    const corpo=tx.replace(/(?:Enviado|Data|Date|Sent)\s*:[^\n]*/gi,' ').replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,' ').replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g,' ');
    o.peds=[...new Set((corpo.match(/\b\d{6}\b/g)||[]))].slice(0,20);
    const n=norm(tx); const r=repsAt().map(r=>({r,s:norm(r.nome).split(/\s+/)})).find(({s})=>s.length&&n.includes(s.join(' ')))||repsAt().map(r=>({r,s:norm(r.nome).split(/\s+/)})).find(({s})=>s.length>1&&n.includes(s[0])&&n.includes(s[s.length-1]));
    if(r) o.rep=r.r.id;
    const mc=tx.match(/cliente\s*[:\-]\s*([^\n\r]{2,80})/i); if(mc) o.cli=mc[1].trim().replace(/\s+/g,' ');
    const MS={janeiro:1,fevereiro:2,'março':3,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
    let m=tx.match(/(?:Enviado|Data|Date|Sent)\s*:[^\n]*?(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})[^\d]{1,6}(\d{1,2}):(\d{2})/i);
    if(m&&MS[norm(m[2])]) o.rec=m[3]+'-'+String(MS[norm(m[2])]).padStart(2,'0')+'-'+m[1].padStart(2,'0')+'T'+m[4].padStart(2,'0')+':'+m[5];
    else { m=tx.match(/(?:Enviado|Data|Date|Sent)\s*:[^\n]*?(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/i); if(m) o.rec=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0')+'T'+m[4].padStart(2,'0')+':'+m[5]; }
    return o; }
  async function novaSol(){ const N=B.nova; if(!N) return; const inp=document.getElementById('bd-n-ped'); if(inp&&inp.value.trim()){ N.peds=[...new Set(N.peds.concat(pedLimpo(inp.value)))]; inp.value=''; }
    N.cli=String((document.getElementById('bd-n-cli')||{}).value||N.cli||'').trim(); N.repId=(document.getElementById('bd-n-rep')||{}).value||N.repId; N.rec=(document.getElementById('bd-n-rec')||{}).value||N.rec;
    N.err=!N.peds.length?'Coloque pelo menos um pedido.':!N.repId?'Escolha o representante.':''; if(N.err){ P.render(); return; }
    const dup=B.sol.find(s=>s.st!=='cancelado'&&(s.peds||[]).some(p=>N.peds.includes(p))); if(dup&&!confirm('O pedido '+(dup.peds||[]).filter(p=>N.peds.includes(p)).join(', ')+' já está numa solicitação ('+(SOL_ST.find(x=>x[0]===dup.st)||[])[1]+'). Adicionar mesmo assim?')) return;
    const r=repDe(N.repId), rec=N.rec?new Date(N.rec).toISOString():new Date().toISOString(), pz=prazos(rec), id=novoId('s');
    const d={peds:N.peds,cli:N.cli,repId:N.repId,repNome:r?r.nome:'',tok:(r&&r.tok)||'',origem:N.origem||'painel',recebido:rec,prazoConf:pz.conf,prazoCarr:pz.carr,quer:null,veic:'',obs:'',st:'recebido',aberto:true,acao:null,hist:[{em:new Date().toISOString(),por:eu(),t:'Solicitação registrada ('+(N.origem==='email'?'email':'painel')+')'}],criadoPor:eu()};
    try{ await P.db().collection('bordosol').doc(id).set(d); B.sol=B.sol.filter(s=>s._id!==id).concat([Object.assign({_id:id},d)]); B.nova=null; P.toast('Solicitação adicionada em Recebido.'); }catch(e){ P.erro(e); } P.render(); }
  async function solMuda(id,o,t){ const s=solDe(id); if(!s) return; const em=new Date().toISOString(); o=Object.assign({},o,{alterado:em}); if(t) o.hist=(s.hist||[]).concat([{em,por:eu(),t}]).slice(-40);
    await P.db().collection('bordosol').doc(id).update(o); Object.assign(s,o); }
  async function liberar(id,pre){ const s=solDe(id); if(pre) B.libF[id]=Object.assign({},pre); const F=B.libF[id]; if(!s||!F) return; const v=x=>(document.getElementById('bd-l-'+x+'-'+id)||{}).value||'';
    if(!pre){ F.dia=v('dia'); F.hora=v('hora'); F.veic=v('veic'); } if(!F.dia){ F.err='Escolha o dia.'; P.render(); return; } if(F.dia<hoje()){ F.err='O dia já passou.'; P.render(); return; }
    try{ const agora=new Date().toISOString(), ags=await agsDosPeds(s.peds||[]); let agId;
      if(ags.length){ for(const x of ags){ const o={data:F.dia,status:'agendado',aberto:true}; if(F.hora) o.hora=F.hora; if(F.veic&&!x.veiculo) o.veiculo=F.veic; if(s.repNome) o.rep=s.repNome;
          if(x.data&&x.data!==F.dia) o.reag=(x.reag||[]).concat([{de:x.data,para:F.dia,motivo:'Solicitação do representante',em:agora}]).slice(-20);
          await gravaAg(x,o,'Agendado pela solicitação para '+br(F.dia)+(F.hora?' às '+F.hora:'')+(s.repNome?' ('+s.repNome+')':'')); } agId=ags[0]._id; }
      else { let aid='p'+(s.peds||[]).join('_'); const g=await P.db().collection('agendamentos').doc(aid).get(); if(g.exists) aid+='-s'+Date.now().toString(36).slice(-4);
        const ps=(s.peds||[]).map(String), d={pedido:ps[0],status:'agendado',aberto:true,data:F.dia,hora:F.hora||'',veiculo:F.veic||'',cliente:s.cli||'',rep:s.repNome||'',itens:[],total:0,origem:'solicitacao',solId:id,
          criadoEm:agora,criadoPor:S.uid,criadoPorNome:eu(),alteradoEm:agora,alteradoPor:S.uid,alteradoPorNome:eu(),hist:[{em:agora,por:eu(),t:'Criado pela solicitação de agendamento'+(s.repNome?' ('+s.repNome+')':'')+' para '+br(F.dia)+(F.hora?' às '+F.hora:'')+'. Sem itens: importe o Mapa de Itens do Focco para ter o saldo.'}]};
        if(ps.length>1) d.pedidos=ps; await P.db().collection('agendamentos').doc(aid).set(d); B.ag=B.ag.concat([Object.assign({_id:aid},d)]); agId=aid; }
      const noPrazo=!s.prazoConf||agora<=s.prazoConf, era=s.lib&&s.lib.dia;
      await solMuda(id,{st:'liberado',lib:{dia:F.dia,hora:F.hora||'',veic:F.veic||'',agId,em:agora,por:eu(),noPrazo:era?(s.lib.noPrazo!==false):noPrazo}},(era?'Dia mudado de '+br(era)+' para ':'Liberado para ')+br(F.dia)+(F.hora?' às '+F.hora:''));
      delete B.libF[id];
      avisaRep(s.repId,era?'Agendamento mudou':'Agendamento liberado','Pedido '+(s.peds||[]).join(', ')+(s.cli?' · '+s.cli:'')+': '+DSL[new Date(F.dia+'T12:00:00').getDay()]+', '+br(F.dia)+(F.hora?' às '+F.hora:'')+'.');
      P.toast('Liberado para '+br(F.dia)+(F.hora?' às '+F.hora:'')+'. Já está nos Agendamentos.'); }
    catch(e){ P.erro(e); } P.render(); }
  async function cancelarSol(id,motivo,doRep){ const s=solDe(id); if(!s) return;
    try{ const agora=new Date().toISOString();
      if(s.st==='liberado'&&s.lib&&s.lib.agId){ const x=agDe(s.lib.agId); if(x&&x.aberto&&x.origem==='solicitacao'&&x.solId===id) await gravaAg(x,{status:'cancelado',aberto:false,fechadoEm:agora},'Cancelado pela solicitação'+(motivo?': '+motivo:''));
        else if(x&&x.aberto) P.toast('O agendamento do pedido continua nos Agendamentos: cancele lá se precisar.'); }
      await solMuda(id,{st:'cancelado',aberto:false,acao:s.acao?Object.assign({},s.acao,{feito:'aceito',em2:agora}):null},'Cancelado'+(doRep?' a pedido do representante':'')+(motivo?': '+motivo:''));
      avisaRep(s.repId,'Agendamento cancelado','Pedido '+(s.peds||[]).join(', ')+(s.cli?' · '+s.cli:'')+' cancelado'+(motivo?': '+motivo:'')+'.'); P.toast('Solicitação cancelada.'); }
    catch(e){ P.erro(e); } P.render(); }
  async function reagFalta(fid,cancela){ const f=B.falta.find(x=>x._id===fid); if(!f) return; const x=agDe(f.agId); const agora=new Date().toISOString();
    try{ if(cancela){ if(!confirm('Cancelar o agendamento de '+(f.cli||'')+' ('+(f.peds||[]).join(', ')+')?')) return; if(x) await gravaAg(x,{status:'cancelado',aberto:false,fechadoEm:agora},'Cancelado: não compareceu em '+br(f.dia));
        await P.db().collection('bordofalta').doc(fid).update({acao:'cancelado',acaoEm:agora,acaoPor:eu()}); f.acao='cancelado'; P.toast('Agendamento cancelado.'); P.render(); return; }
      const d=(document.getElementById('bd-fd-'+fid)||{}).value, hh=(document.getElementById('bd-fh-'+fid)||{}).value||'';
      if(!d||d<hoje()) return P.toast('Escolha um dia de hoje em diante.');
      if(x) await gravaAg(x,{data:d,hora:hh||x.hora||'',reag:(x.reag||[]).concat([{de:f.dia,para:d,motivo:'Não compareceu',em:agora}]).slice(-20),atrasos:(x.atrasos||[]).concat([{de:f.dia,para:d,motivo:'Não compareceu',em:agora}]).slice(-20)},'Reagendado para '+br(d)+(hh?' às '+hh:'')+': não compareceu em '+br(f.dia));
      await P.db().collection('bordofalta').doc(fid).update({acao:'reagendado',para:d,acaoEm:agora,acaoPor:eu()}); f.acao='reagendado';
      const s=B.sol.find(s=>(s.lib||{}).agId===f.agId); if(s){ await solMuda(s._id,{lib:Object.assign({},s.lib,{dia:d,hora:hh||s.lib.hora})},'Reagendado para '+br(d)+': não compareceu'); avisaRep(s.repId,'Reagendado','Pedido '+(s.peds||[]).join(', ')+': o caminhão não veio em '+br(f.dia)+'. Novo dia: '+br(d)+(hh?' às '+hh:'')+'.'); }
      P.toast('Reagendado para '+br(d)+'.'); }
    catch(e){ P.erro(e); } P.render(); }
  function respostaEmail(s){ const L=s.lib||{}; return 'Olá '+String(s.repNome||'').split(' ')[0]+',\n\nO pedido '+(s.peds||[]).join(', ')+(s.cli?' ('+s.cli+')':'')+' está agendado para '+DSL[new Date(L.dia+'T12:00:00').getDay()]+', '+br(L.dia)+(L.hora?' às '+L.hora:'')+(L.veic?' · '+veicN(L.veic):'')+'.\n\nColafix · Faturamento'; }
  async function copiar(t){ try{ await navigator.clipboard.writeText(t); }catch(e){ const a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); try{ document.execCommand('copy'); }catch(x){} a.remove(); } window.__bdCopiado=t; }
  async function salvaRep(){ const E=B.edRep; if(!E) return; const v=id=>String((document.getElementById(id)||{}).value||'').trim(); E.nome=v('bd-r-no').replace(/\s+/g,' '); E.reg=v('bd-r-rg'); E.tel=v('bd-r-tel'); E.ct=v('bd-r-ct'); E.em=v('bd-r-em');
    if(E.nome.length<3){ E.err='Escreva o nome.'; P.render(); return; } if(reps().some(r=>r.id!==E.id&&norm(r.nome)===norm(E.nome))){ E.err='Já existe um representante com esse nome.'; P.render(); return; }
    const lst=(B.cfg.reps||[]).slice(); let r=E.id?lst.find(x=>x.id===E.id):null;
    if(r) Object.assign(r,{nome:E.nome,reg:E.reg,tel:E.tel,ct:E.ct||'',em:E.em||''}); else { r={id:novoId('r'),nome:E.nome,reg:E.reg,tel:E.tel,ct:E.ct||'',em:E.em||'',tok:novoTok(),topico:'colafix-rep-'+Math.random().toString(36).slice(2,10),ativo:true,criado:new Date().toISOString()}; lst.push(r); }
    try{ await P.db().doc('config/bordo').set({reps:lst},{merge:true}); await P.db().collection('bordorep').doc(r.tok).set({repId:r.id,nome:r.nome,reg:r.reg||'',ativo:r.ativo!==false,topico:r.topico||''});
      B.cfg.reps=lst; B.edRep=null; P.toast(E.id?'Salvo.':'Representante cadastrado. Copie o link e mande para ele.'); }catch(e){ P.erro(e); } P.render(); }
  const novoTok=()=>{ const a=new Uint8Array(18); (window.crypto||{}).getRandomValues?crypto.getRandomValues(a):a.forEach((_,i)=>a[i]=Math.random()*256|0); return Array.from(a,b=>('0'+b.toString(16)).slice(-2)).join(''); };
  async function repAtiva(id,novoLink){ const lst=(B.cfg.reps||[]).slice(), r=lst.find(x=>x.id===id); if(!r) return;
    try{ if(novoLink){ if(!confirm('Trocar o link de '+r.nome+'? O link antigo para de funcionar.')) return; try{ await P.db().collection('bordorep').doc(r.tok).delete(); }catch(e){} r.tok=novoTok(); }
      else r.ativo=r.ativo===false;
      await P.db().doc('config/bordo').set({reps:lst},{merge:true}); await P.db().collection('bordorep').doc(r.tok).set({repId:r.id,nome:r.nome,reg:r.reg||'',ativo:r.ativo!==false,topico:r.topico||''});
      B.cfg.reps=lst; P.toast(novoLink?'Link novo criado. Mande para '+r.nome+'.':r.ativo===false?'Link de '+r.nome+' desligado.':'Link de '+r.nome+' ligado.'); }catch(e){ P.erro(e); } P.render(); }
  async function salvaAjustes(){ const lim_={}, tops={}; ETAPAS.forEach(([k])=>{ const n=+((document.getElementById('bd-a-l-'+k)||{}).value); lim_[k]=n>=5?Math.round(n):LIM_PAD[k]; tops[k]=String((document.getElementById('bd-a-t-'+k)||{}).value||'').trim().replace(/[^A-Za-z0-9_-]/g,''); });
    const tv=Math.max(10,+((document.getElementById('bd-a-tv')||{}).value)||30);
    const jt=!!(document.getElementById('bd-a-jt')||{checked:true}).checked;
    try{ await P.db().doc('config/bordo').set({lim:lim_,tops,tvSeg:tv,juntos:jt},{merge:true}); Object.assign(B.cfg,{lim:lim_,tops,tvSeg:tv,juntos:jt}); P.toast('Ajustes salvos.'); }catch(e){ P.erro(e); } P.render(); }

  /* ---------- tela: Relatório do mês ---------- */
  async function lerMes(m){ B.rel.lendo=true; B.rel.d=null; P.render(); const a=m+'-01', z=m+'-31';
    try{ const [q1,q2,q3]=await Promise.all([P.db().collection('bordo').where('dia','>=',a).where('dia','<=',z).limit(3000).get(),P.db().collection('bordofalta').where('dia','>=',a).where('dia','<=',z).limit(1000).get(),P.db().collection('bordosol').where('recebido','>=',a).where('recebido','<=',z+'T23:59').limit(2000).get()]);
      if(B.rel.mes===m) B.rel.d={ent:vivos(docs(q1)),falta:docs(q2),sol:docs(q3)}; }catch(e){ P.erro(e); } B.rel.lendo=false; P.render(); }
  function relDados(R){ const xs=R.ent, fim=xs.filter(e=>(e.et||{}).fim&&!e.des), des=xs.filter(e=>e.des), media=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
    const et={}; ETAPAS.forEach(([k])=>et[k]=[]); xs.forEach(e=>{ let prev=e.cheg; ETAPAS.forEach(([k])=>{ const t=(e.et||{})[k]; if(t&&prev){ et[k].push(minDe(prev,t)); prev=t; } }); });
    const mot={}; des.forEach(e=>mot[e.des.motivo]=(mot[e.des.motivo]||0)+1);
    const hrs={}; for(let h=5;h<=19;h++) hrs[h]=0; const dias=new Set(xs.map(e=>e.dia)); xs.forEach(e=>{ const h=new Date(e.cheg).getHours(); if(hrs[h]!=null) hrs[h]++; });
    const grp=(f)=>{ const m={}; xs.forEach(e=>{ const k=f(e)||'—'; const o=m[k]||(m[k]={n:'',c:0,t:[],d:0,f:0}); o.n=k; o.c++; if(e.des) o.d++; else if((e.et||{}).fim) o.t.push(patioMin(e)); }); return m; };
    const rp=grp(e=>e.repNome), cl=grp(e=>e.cli); R.falta.filter(f=>f.acao!=='veio'&&f.acao!=='resolvido').forEach(f=>{ const k=f.cli||'—'; (cl[k]||(cl[k]={n:k,c:0,t:[],d:0,f:0})).f++; });
    const agk={agendado:0,antecipado:0,atrasado:0,sem:0}; xs.forEach(e=>agk[e.agKind||'sem']=(agk[e.agKind||'sem']||0)+1);
    const sl=R.sol.filter(s=>s.st==='liberado'||s.lib), noPz=sl.filter(s=>s.lib&&s.lib.noPrazo!==false).length;
    return {n:xs.length,fim:fim.length,des:des.length,med:media(fim.map(patioMin).filter(n=>n!=null)),et:ETAPAS.map(([k,n])=>({k,n,m:media(et[k])})),mot,hrs,nd:Math.max(1,[...dias].filter(util).length||dias.size),
      reps:Object.values(rp).map(o=>Object.assign(o,{m:media(o.t)})).sort((a,b)=>b.c-a.c),clis:Object.values(cl).map(o=>Object.assign(o,{m:media(o.t)})).sort((a,b)=>(b.f-a.f)||((b.m||0)-(a.m||0))).slice(0,12),
      faltas:R.falta.filter(f=>f.acao!=='veio'&&f.acao!=='resolvido').length,reag:R.falta.filter(f=>f.acao==='reagendado').length,agk,sol:R.sol.length,lib:sl.length,noPz,atrasos:xs.filter(e=>Object.keys(e.al||{}).length).length}; }
  function vRel(){ iniciar(); const m=B.rel.mes||(B.rel.mes=hoje().slice(0,7)); if(!B.rel.d&&!B.rel.lendo){ lerMes(m); }
    const [y,mm]=m.split('-').map(Number), nome=MESES[mm-1]+' de '+y;
    const topo=`<header class="bd-top bd-np"><div><p class="bd-eb">Diário de bordo · relatório</p><h1>${esc(nome[0].toUpperCase()+nome.slice(1))}</h1></div><div class="bd-ta"><button type="button" class="btn sec" data-act="bd-rmes" data-v="-1">‹ Mês anterior</button>${m<hoje().slice(0,7)?'<button type="button" class="btn sec" data-act="bd-rmes" data-v="1">Próximo ›</button>':''}<button type="button" class="btn sec" data-act="bd-rcsv">Planilha</button><button type="button" class="btn" data-act="bd-rprint">Imprimir / PDF</button></div></header>`;
    if(!B.rel.d) return topo+'<section class="card"><div class="empty">Lendo o mês…</div></section>';
    const D=relDados(B.rel.d); if(!D.n&&!D.sol) return topo+'<section class="card"><div class="empty">Nenhum registro no diário de bordo neste mês.</div></section>';
    const mx=Math.max(1,...D.et.map(o=>o.m||0)), mxm=Math.max(1,...Object.values(D.mot)), mxh=Math.max(1,...Object.values(D.hrs)), lenta=D.et.filter(o=>o.m!=null).sort((a,b)=>b.m-a.m)[0], tot=D.et.reduce((s,o)=>s+(o.m||0),0);
    const kp=(l,v,s,c)=>`<div><span>${l}</span><b>${v}</b><small class="${c||''}">${s}</small></div>`;
    const bar=(n,w,t,c)=>`<div class="bd-rb"><span>${esc(n)}</span><span class="bd-rbt"><i style="width:${Math.max(2,w)}%;${c?'background:'+c:''}"></i></span><b>${t}</b></div>`;
    const tab=(tit,rows,cab)=>`<section class="card"><h2>${tit}</h2><table class="bd-rt"><thead><tr>${cab.map((c,i)=>`<th${i?' class="r"':''}>${c}</th>`).join('')}</tr></thead><tbody>${rows||'<tr><td colspan="5" class="bd-sub">—</td></tr>'}</tbody></table></section>`;
    return topo+`<section class="bd-kpis">${kp('Chegadas',D.n,(D.n/D.nd).toLocaleString('pt-BR',{maximumFractionDigits:1})+' por dia útil')}${kp('Finalizados',D.fim,D.n?Math.round(D.fim/D.n*100)+'% das chegadas':'','ok')}${kp('Desistentes',D.des,D.n?(D.des/D.n*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'% das chegadas':'')}${kp('Tempo médio no pátio',esc(dur(D.med)),'da chegada ao finalizado')}${kp('Não compareceram',D.faltas,D.reag+' reagendado'+(D.reag===1?'':'s'))}</section>
      <section class="bd-kpis">${kp('Vieram no dia agendado',D.agk.agendado,D.agk.antecipado+' antecipado'+(D.agk.antecipado===1?'':'s')+' · '+D.agk.atrasado+' depois do dia')}${kp('Sem agenda',D.agk.sem,'chegaram sem agendamento')}${kp('Alertas de atraso',D.atrasos,'caminhões que passaram do tempo')}${kp('Solicitações',D.sol,D.lib+' liberada'+(D.lib===1?'':'s'))}${kp('Confirmadas no prazo',D.lib?Math.round(D.noPz/D.lib*100)+'%':'—','até 12:00 do dia certo')}</section>
      <div class="bd-r2"><section class="card"><h2>Onde o caminhão espera</h2><p class="bd-sub">Tempo médio entre uma etapa e a seguinte</p>${D.et.map(o=>bar(o.k==='mix'?'Chegada → Mix':o.k==='fat'?'Mix → Faturado':o.k==='carr'?'Faturado → Carregado':'Carregado → Finalizado',(o.m||0)/mx*100,esc(dur(o.m)),lenta&&o.k===lenta.k?'#e9a24a':'')).join('')}
        ${lenta&&tot?`<p class="bd-nota">A espera ${lenta.k==='mix'?'pelo mix':'pelo '+esc(lenta.n.toLowerCase())} é ${Math.round(lenta.m/tot*100)}% do tempo no pátio.</p>`:''}</section>
        <section class="card"><h2>Por que desistiram</h2><p class="bd-sub">${D.des} desistência${D.des===1?'':'s'} no mês</p>${Object.entries(D.mot).sort((a,b)=>b[1]-a[1]).map(([k,n])=>bar(k,n/mxm*100,n,'#6b7a83')).join('')||'<p class="bd-sub">Nenhuma.</p>'}</section></div>
      ${(()=>{ const dm={}; (B.rel.d.ent||[]).forEach(e=>{ if(e.dem&&e.dem.motivo) dm[e.dem.motivo]=(dm[e.dem.motivo]||0)+1; }); const es=Object.entries(dm).sort((a,b)=>b[1]-a[1]); const mx=es.length?es[0][1]:1;
        return `<section class="card"><h2>Motivos de demora</h2><p class="bd-sub">${es.reduce((t,x)=>t+x[1],0)} caminhão(ões) com motivo marcado pela expedição</p>${es.map(([k,n])=>bar(k,n/mx*100,n,'#93413f')).join('')||'<p class="bd-sub">Nenhum motivo marcado neste mês.</p>'}</section>`; })()}
      <section class="card"><h2>Horário das chegadas</h2><p class="bd-sub">Média de caminhões chegando por hora, nos dias com movimento</p><div class="bd-hrs">${Object.entries(D.hrs).map(([h,n])=>`<div><b>${(n/D.nd).toLocaleString('pt-BR',{maximumFractionDigits:1})}</b><i style="height:${n/mxh*100}%"${n/mxh>=.7?' class="pk"':''}></i><span>${String(h).padStart(2,'0')}h</span></div>`).join('')}</div></section>
      <div class="bd-r2">${tab('Por representante',D.reps.map(o=>`<tr><td><b>${esc(o.n)}</b></td><td class="r">${o.c}</td><td class="r">${esc(dur(o.m))}</td><td class="r">${o.d}</td></tr>`).join(''),['Representante','Cargas','Tempo médio','Desistências'])}
        ${tab('Clientes: espera e faltas',D.clis.map(o=>`<tr><td><b>${esc(o.n)}</b></td><td class="r">${o.c}</td><td class="r">${esc(dur(o.m))}</td><td class="r">${o.d}</td><td class="r${o.f>=2?' bd-crit':''}">${o.f}</td></tr>`).join(''),['Cliente','Cargas','Tempo médio','Desistências','Faltas'])}</div>`; }

  /* ---------- portaria (celular): Caminhões ---------- */
  const portSolo=()=>{ try{ const A=S.acs; if(!A||!A.pronto||S.view!=='bdport') return false; if(A.dono) return /[?&]portaria=1/.test(location.search); return (A.doc||{}).perfil==='portaria'; }catch(e){ return false; } };
  function vPort(){ iniciarBase(); const so=portSolo(); try{ document.body.classList.toggle('cv-solo',so); }catch(e){}
    const corpo=portCorpo(); if(!so) return corpo;
    const bar=P.cvBar?P.cvBar('Portaria'):''; return `<div class="cv-app">${bar}<main class="cv-appc">${corpo}</main></div>`; }
  function portCorpo(){ if(!B.lido.dia||!B.lido.cfg) return '<section class="card"><div class="empty">Carregando…</div></section>';
    const Fd=B.port.feito;
    if(Fd) return `<section class="bd-pf" role="status"><span class="bd-pfok" aria-hidden="true">✓</span><h1>Chegada registrada</h1><p class="bd-pfn">Nº <b>${Fd.ord}</b> no diário de bordo</p>${placaMini(Fd.placa)}<dl><div><dt>Motorista</dt><dd>${esc(Fd.mot)}</dd></div><div><dt>Hora</dt><dd>${esc(hm(Fd.cheg))}</dd></div><div><dt>Agenda</dt><dd>${esc(agTxt(Fd))}</dd></div>${Fd.cli?`<div><dt>Cliente</dt><dd>${esc(Fd.cli)}</dd></div>`:''}</dl><button type="button" class="bd-b1" data-act="bd-p-ok">Voltar</button><p class="bd-hint">Volta sozinho em alguns segundos</p></section>`;
    if(B.f) return `<section class="bd-pcard"><div class="bd-ph"><button type="button" class="bd-lk" data-act="bd-p-x">‹ Caminhões</button><h1>${B.f.edit?'Corrigir registro':'Registrar chegada'}</h1></div>${formChegada(true)}</section>`;
    if(B.ov&&B.ov.des){ const e=entDe(B.ov.des.id); if(e) return `<section class="bd-pcard">${desHtml(e)}</section>`; }
    const vs=ordena(vivos(B.ent)), pat=vs.filter(e=>estado(e).k==='pend'), out=vs.filter(e=>estado(e).k!=='pend');
    const card=e=>{ const st=estado(e); return `<li class="bd-pi2 ${st.k==='fim'?'fim':st.k==='des'?'des':st.atr?'atr':''}"><span class="bd-po">${e.ord}</span><span class="bd-pt2"><b>${esc(e.mot)}</b><small>${esc(e.placa)} · ${esc(veicN(e.veic))}${e.cli?' · '+esc(e.cli):''}</small>${e.obs?`<small class="bd-obs">Obs.: ${esc(e.obs)}</small>`:''}
      <small>${st.k==='pend'?'Chegou '+esc(hm(e.cheg))+' · esperando '+esc(ETN[st.etapa].toLowerCase())+' há '+esc(dur(st.min)):st.k==='fim'?'Finalizado '+esc(hm(e.et.fim)):'Desistiu '+esc(hm(e.des.em))+' · '+esc(e.des.motivo)}</small></span>
      ${pode()?`<span class="bd-pa">${st.k==='pend'?`<button type="button" class="bd-b0 sm" data-act="bd-et" data-v="${esc(e._id)}|fim">Saiu</button><button type="button" class="bd-lk" data-act="bd-des" data-v="${esc(e._id)}">Desistiu</button>`:''}<button type="button" class="bd-lk" data-act="bd-ed" data-v="${esc(e._id)}">Corrigir</button></span>`:''}</li>`; };
    return `<div class="bd-ptl"><section class="bd-phero"><div><p class="bd-eb">${esc(DSL[new Date().getDay()])}, ${esc(br(hoje()))}</p><h1>Caminhões</h1></div><div class="bd-pcnt"><div><b>${pat.length}</b><span>no pátio</span></div><div><b>${out.filter(e=>!e.des).length}</b><span>saíram</span></div></div>
      ${pode()?'<button type="button" class="bd-pbig" data-act="bd-nova"><span aria-hidden="true">+</span>Registrar chegada</button>':''}</section>
      <div class="bd-psec"><h2>No pátio <span>${pat.length}</span></h2>${pat.length?`<ul class="bd-pl2">${pat.map(card).join('')}</ul>`:'<p class="bd-hint">Nenhum caminhão no pátio.</p>'}</div>
      ${out.length?`<div class="bd-psec"><h2>Já saíram hoje <span>${out.length}</span></h2><ul class="bd-pl2">${out.slice().reverse().map(card).join('')}</ul></div>`:''}</div>`; }
  P.bordoPort=vPort;

  /* ---------- redesenhar sem perder o campo em que a pessoa está digitando ---------- */
  function rr(){ const a=document.activeElement, id=a&&a.id, s=a&&a.selectionStart; P.render(); if(id){ const n=document.getElementById(id); if(n){ n.focus(); try{ if(s!=null) n.setSelectionRange(s,s); }catch(e){} } } }

  /* ---------- avisos no Meu dia ---------- */
  P.registrarAviso(()=>{ if(!iniEsc||!P.viewOk('bordo')) return []; const xs=[], ag=Date.now();
    const atr=vivos(B.ent).filter(e=>{ const s=estado(e); return s.k==='pend'&&s.atr; }); if(atr.length) xs.push({nivel:'warn',rotulo:'Diário de bordo',titulo:atr.length+(atr.length>1?' caminhões passaram do tempo combinado':' caminhão passou do tempo combinado'),texto:atr.slice(0,3).map(e=>'nº '+e.ord+' '+e.mot+' ('+ETN[estado(e).etapa].toLowerCase()+')').join(', '),go:'bordo'});
    const pend=B.sol.filter(s=>s.aberto!==false&&s.st!=='liberado'&&s.st!=='cancelado'&&s.prazoConf), at=pend.filter(s=>ag>new Date(s.prazoConf).getTime()), vh=pend.filter(s=>ag<=new Date(s.prazoConf).getTime()&&diaDe(s.prazoConf)===hoje());
    if(at.length) xs.push({nivel:'crit',rotulo:'Solicitações',titulo:at.length+(at.length>1?' solicitações passaram do prazo de confirmação':' solicitação passou do prazo de confirmação'),texto:at.slice(0,3).map(s=>(s.cli||(s.peds||[]).join(','))+' ('+s.repNome+')').join(', '),go:(P.viewOk('agsol')?'agsol':'bordosol')});
    if(vh.length) xs.push({nivel:'warn',rotulo:'Solicitações',titulo:vh.length+(vh.length>1?' solicitações vencem hoje às 12:00':' solicitação vence hoje às 12:00'),texto:vh.slice(0,3).map(s=>(s.cli||(s.peds||[]).join(','))).join(', '),go:(P.viewOk('agsol')?'agsol':'bordosol')});
    const ac=B.sol.filter(s=>s.acao&&!s.acao.feito); if(ac.length) xs.push({nivel:'warn',rotulo:'Solicitações',titulo:ac.length+(ac.length>1?' pedidos de representantes para reagendar ou cancelar':' pedido de representante para reagendar ou cancelar'),texto:ac.slice(0,3).map(s=>s.repNome+': '+(s.acao.tipo==='cancelar'?'cancelar':'reagendar')).join(', '),go:(P.viewOk('agsol')?'agsol':'bordosol')});
    const fs=B.falta.filter(f=>!f.acao); if(fs.length) xs.push({nivel:'warn',rotulo:'Agendamentos',titulo:fs.length+(fs.length>1?' cargas não compareceram':' carga não compareceu'),texto:fs.slice(0,3).map(f=>f.cli+' ('+br(f.dia)+')').join(', '),go:(P.viewOk('agsol')?'agsol':'bordosol')});
    return xs; });

  /* ---------- eventos ---------- */
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.id) return; const F=B.f;
    if(F&&t.id==='bd-f-placa'){ const v=t.value.toUpperCase().replace(/[^A-Z0-9-]/g,''); if(t.value!==v) t.value=v; F.placa=v; if(F.err&&F.err.id==='bd-f-placa'){ F.err=null; } clearTimeout(olhaPlaca._t); olhaPlaca._t=setTimeout(olhaPlaca,450); return; }
    if(F&&t.id==='bd-f-mot'){ F.mot=t.value; return; }
    if(F&&t.id==='bd-f-cli'){ F.cli=t.value; return; }
    if(F&&t.id==='bd-f-obs'){ F.obs=t.value; return; }
    const etK=Object.keys(ETID).find(k=>ETID[k]===t.id);
    if(F&&(t.id==='bd-f-hora'||etK)){ let dg=t.value.replace(/\D/g,'').slice(0,4); if(dg.length>=3) dg=dg.slice(0,dg.length-2)+':'+dg.slice(-2); if(t.value!==dg) t.value=dg; if(etK){ F.ets=F.ets||{}; F.ets[etK]=dg; } else F.hora=dg; if(F.err&&(F.err.id===t.id)) F.err=null;
      if(t.id==='bd-f-hora'){ const b=document.querySelector('[data-act="bd-f-ok"]'); if(b&&!F.edit&&!F.salvando) b.textContent='Registrar chegada · '+(hmOk(dg)?dg.padStart(5,'0'):hm(new Date().toISOString())); } return; }
    if(F&&t.id==='bd-f-ped'){ if(/[\s,;]/.test(t.value)&&pedLimpo(t.value).length){ if(addPeds(t.value)){ t.value=''; rr(); } } return; }
    if(t.id==='bd-f-repq'){ const q=norm(t.value); document.querySelectorAll('.bd-reps .bd-rep').forEach(b=>{ b.hidden=!!q&&!b.dataset.b.includes(q); }); return; }
    if(t.id==='bd-dobs'&&B.ov&&B.ov.des){ B.ov.des.obs=t.value; return; }
    if(t.id==='bd-q'){ B.q=t.value; const q=norm(t.value); document.querySelectorAll('.bd-tab tbody tr[data-b]').forEach(r=>{ r.hidden=!!q&&!r.dataset.b.includes(q); }); return; }
    if(t.id==='bd-n-ped'&&B.nova){ if(/[\s,;]/.test(t.value)&&pedLimpo(t.value).length){ B.nova.peds=[...new Set(B.nova.peds.concat(pedLimpo(t.value)))]; t.value=''; rr(); } return; }
    if(t.id==='bd-n-cli'&&B.nova){ B.nova.cli=t.value; return; }
    if(t.id==='bd-n-rec'&&B.nova){ B.nova.rec=t.value; return; } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.id) return;
    if(t.id==='bd-n-rep'&&B.nova){ B.nova.repId=t.value; return; } if(t.id==='bd-n-rec'&&B.nova){ B.nova.rec=t.value; rr(); return; }
    if(t.id==='bd-f-ped'&&B.f){ if(addPeds(t.value)){ t.value=''; rr(); } return; }
    if(t.id==='bd-n-ped'&&B.nova){ const n=pedLimpo(t.value); if(n.length){ B.nova.peds=[...new Set(B.nova.peds.concat(n))]; t.value=''; rr(); } return; } });
  document.addEventListener('paste',ev=>{ const t=ev.target; if(!t||(t.id!=='bd-f-ped'&&t.id!=='bd-n-ped')) return; const tx=(ev.clipboardData||window.clipboardData).getData('text'); if(!pedLimpo(tx).length) return; ev.preventDefault();
    if(t.id==='bd-f-ped'){ addPeds(tx); } else { B.nova.peds=[...new Set(B.nova.peds.concat(pedLimpo(tx)))]; } rr(); });
  document.addEventListener('keydown',ev=>{ const t=ev.target; if(!t||!t.id) return;
    if(ev.key==='Enter'&&(t.id==='bd-f-ped'||t.id==='bd-n-ped')){ ev.preventDefault(); if(t.value.trim()){ if(t.id==='bd-f-ped') addPeds(t.value); else B.nova.peds=[...new Set(B.nova.peds.concat(pedLimpo(t.value)))]; t.value=''; rr(); } return; }
    if(ev.key==='Backspace'&&!t.value&&t.id==='bd-f-ped'&&B.f&&B.f.peds.length){ B.f.peds.pop(); olhaAg(); rr(); return; }
    if(ev.key==='Escape'&&B.ov){ B.ov=null; if(S.view!=='bdport') B.f=null; P.render(); } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="bd-"]'); if(!b) return; const a=b.dataset.act, v=b.dataset.v; if(b.tagName!=='A') ev.preventDefault();
    if(a==='bd-nova'){ if(!pode()) return P.toast('Seu acesso é só para ver.'); B.f=novoForm(); B.port.feito=null; if(S.view!=='bdport') B.ov={f:1}; P.render(); setTimeout(()=>{ const i=document.getElementById('bd-f-placa'); i&&i.focus(); },60); return; }
    if(a==='bd-ed'){ const e=entDe(v); if(!e) return; B.f=novoForm({placa:e.placa,mot:e.mot,peds:(e.peds||[]).slice(),repId:e.repId||'',veic:e.veic||'',tipo:e.tipo||'carrega',cli:e.cli||'',edit:e._id,obs:e.obs||'',hora:hm(e.cheg),ets:Object.fromEntries(ETAPAS.map(([k])=>[k,hm((e.et||{})[k])]))}); B.ov={f:1}; P.render(); return; }
    if(a==='bd-dem'){ const e=entDe(v); if(!e) return; B.ov={dem:{id:v,motivo:(e.dem||{}).motivo||'',obs:(e.dem||{}).obs||''}}; P.render(); return; }
    if(a==='bd-demm'&&B.ov&&B.ov.dem){ const t=document.getElementById('bd-dem-obs'); if(t) B.ov.dem.obs=t.value; B.ov.dem.motivo=v; B.ov.dem.err=null; P.render(); return; }
    if((a==='bd-demok'||a==='bd-demx')&&B.ov&&B.ov.dem){ const e=entDe(v); if(!e) return; const D=B.ov.dem, t=document.getElementById('bd-dem-obs'); if(t) D.obs=t.value;
      if(a==='bd-demok'&&!D.motivo){ D.err='Escolha o motivo.'; P.render(); return; }
      const st=estado(e), dem=a==='bd-demx'?null:{motivo:D.motivo,obs:String(D.obs||'').trim().slice(0,600),etapa:st.k==='pend'?(st.etapa||''):'',por:eu(),em:new Date().toISOString()};
      try{ await P.db().collection('bordo').doc(v).update({dem}); e.dem=dem; B.ov=null; P.toast(dem?'Motivo da demora salvo: '+dem.motivo+'.':'Motivo apagado.'); }catch(er){ P.erro(er); } P.render(); return; }
    if(a==='bd-ovx'||a==='bd-p-x'){ B.ov=null; B.f=null; P.render(); return; }
    if(a==='bd-f-px'&&B.f){ B.f.peds.splice(+v,1); olhaAg(); rr(); return; }
    if(a==='bd-f-rep'&&B.f){ B.f.repId=B.f.repId===v?'':v; B.f.repAbre=false; rr(); return; }
    if(a==='bd-f-reptroca'&&B.f){ B.f.repAbre=true; rr(); setTimeout(()=>{ const q=document.getElementById('bd-f-repq'); if(q) q.focus(); const on=document.querySelector('.bd-rep[aria-checked="true"]'); if(on) on.scrollIntoView({block:'nearest'}); },30); return; }
    if(a==='bd-f-veic'&&B.f){ B.f.veic=v; if(B.f.err&&B.f.err.id==='bd-f-veic') B.f.err=null; rr(); return; }
    if(a==='bd-f-tipo'&&B.f){ B.f.tipo=v; rr(); return; }
    if(a==='bd-f-ok') return salvarChegada();
    if(a==='bd-apaga') return apagarEnt(v);
    if(a==='bd-p-ok'){ B.port.feito=null; P.render(); return; }
    if(a==='bd-et'){ const [id,k]=String(v).split('|'); return marcar(id,k); }
    if(a==='bd-des'){ if(!pode()) return; B.ov={des:{id:v,motivo:'',obs:''}}; P.render(); return; }
    if(a==='bd-dmot'&&B.ov&&B.ov.des){ B.ov.des.motivo=v; B.ov.des.err=''; rr(); return; }
    if(a==='bd-dok') return desistir(v);
    if(a==='bd-filt'){ B.filt=v; P.render(); return; }
    if(a==='bd-dia'){ const n=+v; B.dia=n===0?B.diaLive:addD(B.dia,n); if(B.dia>B.diaLive) B.dia=B.diaLive; if(B.dia!==B.diaLive) lerOutro(B.dia); else B.outro=null; P.render(); return; }
    if(a==='bd-csv') return csvDia();
    if(a==='bd-tvaba'){ B.tv.aba=v; B.tv.troca=Date.now(); B.tv.fixo=Date.now(); P.render(); return; }
    if(a==='bd-tvcheia'){ B.tv.cheia=true; try{ document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().then(()=>P.render()).catch(()=>{}); }catch(e){} P.render(); return; }
    if(a==='bd-saba'){ B.solAba=v; P.render(); return; }
    if(a==='bd-email'){ B.ov={email:1}; P.render(); setTimeout(()=>{ const t=document.getElementById('bd-em-tx'); t&&t.focus(); },60); return; }
    if(a==='bd-em-ok'){ const o=lerEmail((document.getElementById('bd-em-tx')||{}).value); const N=B.nova||(B.nova={peds:[],cli:'',repId:'',rec:'',origem:'painel'}); N.peds=[...new Set(N.peds.concat(o.peds))]; if(o.cli) N.cli=o.cli; if(o.rep) N.repId=o.rep; if(o.rec) N.rec=o.rec; N.origem='email'; B.ov=null;
      P.toast(o.peds.length?'Achei '+o.peds.length+' pedido'+(o.peds.length>1?'s':'')+(o.rep?', o representante':'')+(o.rec?' e a hora do email':'')+'. Confira e clique em Adicionar.':'Não achei número de pedido no texto.'); P.render(); return; }
    if(a==='bd-n-px'&&B.nova){ B.nova.peds.splice(+v,1); rr(); return; }
    if(a==='bd-n-ok') return novaSol();
    if(!pode()&&/^bd-(s-|f-reag|f-canc|r-|a-)/.test(a)&&a!=='bd-r-tp'){ P.toast('Seu acesso é só para ver.'); return; }
    if(a==='bd-s-av'){ try{ await solMuda(v,{st:'avaliacao'},'Em avaliação'); }catch(e){ P.erro(e); } B.avalFoco=v; if(P.viewOk('agendamentos')){ P.go('agendamentos'); P.toast('Importe o PDF do pedido e escolha o dia. Depois confirme na faixa do alto.'); } else P.render(); return; }
    if(a==='bd-s-irag'){ B.avalFoco=v; P.go('agendamentos'); return; }
    if(a==='bd-s-conf'){ const s=solDe(v); if(!s) return; const I=avalInfo(s); if(I.k!=='ok') return P.toast(I.t); return liberar(v,{dia:I.dia,hora:I.hora,veic:I.veic}); }
    if(a==='bd-s-volta'){ try{ await solMuda(v,{st:'recebido'},'Voltou para Recebido'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='bd-s-lib'){ const s=solDe(v); if(!s) return; B.libF[v]={dia:(s.lib&&s.lib.dia)||(s.quer&&s.quer.dia&&s.quer.dia>=hoje()?s.quer.dia:'')||s.prazoCarr||'',hora:(s.lib&&s.lib.hora)||(s.quer&&s.quer.turno==='tarde'?'13:30':s.quer&&s.quer.turno==='manhã'?'08:00':''),veic:(s.lib&&s.lib.veic)||s.veic||''}; P.render(); return; }
    if(a==='bd-s-libx'){ delete B.libF[v]; P.render(); return; }
    if(a==='bd-s-libok') return liberar(v);
    if(a==='bd-s-canc'){ const s=solDe(v); if(!s) return; const m=prompt('Cancelar a solicitação de '+(s.cli||(s.peds||[]).join(', '))+'? Motivo (opcional):',''); if(m===null) return; return cancelarSol(v,m.trim()); }
    if(a==='bd-s-copia'){ const s=solDe(v); if(!s) return; await copiar(respostaEmail(s)); P.toast('Resposta copiada: cole no email para o representante.'); return; }
    if(a==='bd-s-aok'){ const s=solDe(v); if(!s||!s.acao) return; if(s.acao.tipo==='cancelar') return cancelarSol(v,s.acao.motivo||'',true);
      if(s.st==='liberado'){ B.libF[v]={dia:s.acao.dia||'',hora:s.acao.turno==='tarde'?'13:30':s.acao.turno==='manhã'?'08:00':(s.lib&&s.lib.hora)||'',veic:(s.lib&&s.lib.veic)||''}; await solMuda(v,{acao:Object.assign({},s.acao,{feito:'aceito',em2:new Date().toISOString()})},'Pedido de reagendamento aceito'); P.render(); return; }
      try{ await solMuda(v,{quer:{dia:s.acao.dia||'',turno:s.acao.turno||''},acao:Object.assign({},s.acao,{feito:'aceito',em2:new Date().toISOString()})},'Novo dia pedido pelo representante: '+br(s.acao.dia)); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='bd-s-ano'){ const s=solDe(v); if(!s||!s.acao) return; try{ await solMuda(v,{acao:Object.assign({},s.acao,{feito:'recusado',em2:new Date().toISOString()})},'Pedido do representante recusado'); avisaRep(s.repId,'Pedido não aceito','O faturamento não conseguiu '+(s.acao.tipo==='cancelar'?'cancelar':'mudar o dia d')+'o pedido '+(s.peds||[]).join(', ')+'. Fale com o faturamento.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='bd-f-reag') return reagFalta(v,false); if(a==='bd-f-canc') return reagFalta(v,true);
    if(a==='bd-imp'){ B.imp={txt:'',lst:null}; P.render(); setTimeout(()=>{ const t=document.getElementById('bd-imp-txt'); if(t) t.focus(); },50); return; }
    if(a==='bd-impx'){ B.imp=null; P.render(); return; }
    if(a==='bd-impver'){ const t=document.getElementById('bd-imp-txt'); B.imp={txt:t?t.value:'',lst:impLer(t?t.value:'')}; P.render(); return; }
    if(a==='bd-impok') return impGrava();
    if(a==='bd-r-novo'){ B.edRep={}; P.render(); return; } if(a==='bd-r-x'){ B.edRep=null; P.render(); return; }
    if(a==='bd-r-ed'){ const r=repDe(v); if(r){ B.edRep={id:r.id,nome:r.nome,reg:r.reg,tel:r.tel,ct:r.ct||'',em:r.em||''}; B.colar=null; P.render(); } return; }
    if(a==='bd-r-colar'){ B.colar={txt:'',lst:null}; B.edRep=null; P.render(); setTimeout(()=>{ const t=document.getElementById('bd-r-txt'); if(t) t.focus(); },50); return; }
    if(a==='bd-r-colx'){ B.colar=null; P.render(); return; }
    if(a==='bd-r-colver'){ const t=document.getElementById('bd-r-txt'); B.colar={txt:t?t.value:'',lst:lerLista(t?t.value:'')}; P.render(); return; }
    if(a==='bd-r-colok') return importaReps();
    if(a==='bd-r-salva') return salvaRep();
    if(a==='bd-r-at') return repAtiva(v,false); if(a==='bd-r-novolink') return repAtiva(v,true);
    if(a==='bd-r-link'){ const r=repDe(v); if(!r) return; await copiar(linkRep(r)); P.toast('Link de '+r.nome+' copiado.'); return; }
    if(a==='bd-r-tp'){ await copiar(v); P.toast('Tópico copiado: '+v+'. No celular do representante: app ntfy › + › cole.'); return; }
    if(a==='bd-a-salva') return salvaAjustes();
    if(a==='bd-rmes'){ const [y,m]=B.rel.mes.split('-').map(Number), d=new Date(y,m-1+(+v),1); B.rel.mes=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); B.rel.d=null; P.render(); return; }
    if(a==='bd-rprint'){ window.print(); return; }
    if(a==='bd-rcsv'){ const R=B.rel.d; if(!R) return; baixar('diario-de-bordo-'+B.rel.mes+'.csv',[['Dia','Ordem','Motorista','Cliente','Representante','Pedidos','Placa','Veículo','Chegada','Agenda','Tipo','Mix','Faturado','Carregado','Finalizado','No pátio (min)','Desistente','Motivo','Observação','Motivo da demora','Obs. da demora']].concat(ordena(R.ent).sort((a,b)=>String(a.dia).localeCompare(String(b.dia))).map(e=>[br(e.dia),e.ord,e.mot,e.cli,e.repNome,(e.peds||[]).join(' '),e.placa,veicN(e.veic),hm(e.cheg),agTxt(e),e.tipo==='pit'?'PIT':'Carrega'].concat(ETAPAS.map(([k])=>hm((e.et||{})[k]))).concat([patioMin(e),e.des?hm(e.des.em):'',e.des?e.des.motivo:'',e.obs||'',(e.dem||{}).motivo||'',(e.dem||{}).obs||''])))); return; } });
  /* TV: troca de aba sozinha (tocar numa aba segura ela por 2 min) */
  setInterval(()=>{ if(MTV()) return; if(S.view!=='bordotv'){ if(document.body.classList.contains('bd-tvon')) document.body.classList.remove('bd-tvon'); B.tv.cheia=false; return; }
    const ag=Date.now(); if(ag-B.tv.fixo<120000) return; if(ag-B.tv.troca>=segTV()*1000){ B.tv.aba=B.tv.aba==='diario'?'agend':'diario'; B.tv.troca=ag; P.render(); } },1000);
  /* 27/11/2026: o navegador só deixa ocupar a tela toda depois de um clique: na TV sozinha, o primeiro clique em qualquer lugar já põe em tela cheia */
  document.addEventListener('click',ev=>{ try{ if((S.view!=='bordotv'&&!MTV())||document.fullscreenElement||!document.body.classList.contains('bd-tvon')) return; if(ev.target.closest&&ev.target.closest('[data-act="bd-tvcheia"]')) return;
    document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().then(()=>P.render()).catch(()=>{}); }catch(e){} },true);
  document.addEventListener('fullscreenchange',()=>{ try{ if(S.view==='bordotv') P.render(); }catch(e){} });
  document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement&&B.tv.cheia){ B.tv.cheia=false; P.render(); } });

  /* 27/11/2026 (pedido do faturamento): as telas do diário ficam na lateral, embaixo de "Diário de bordo" (como o RH),
     e a TV abre numa aba nova (?tv=bordo) para levar ao monitor. No celular continuam as abas de baixo. */
  const comSide=f=>function(){ const h=f.apply(this,arguments); try{ window.__bdSide&&window.__bdSide(); }catch(e){} return h; };
  function tvUrl(){ return location.pathname+'?tv=bordo'; }
  const BD_SIDE=[['bordo','Diário de bordo'],['bordotv','TV do diário'],['bordomot','TV dos motoristas'],['bordorel','Relatório do mês']];
  /* 27/11 21h ("o diário fica se tremendo"): não tira e põe de novo a lista quando nada mudou, e não desliga a classe que esconde
     as abas de cima enquanto o painel ainda está redesenhando a lateral (era isso que fazia as abas aparecerem e sumirem a cada atualização). */
  function bdSide(){ try{ const nl=document.getElementById('navlist'); if(!nl) return; const old=nl.querySelector('.bd-side');
      const b=nl.querySelector('[data-mod="bordo"]')||nl.querySelector('.navbtn[data-go="bordo"]'); const vs=BD_SIDE.filter(([v])=>P.viewOk(v));
      const tv=document.body.classList.contains('bd-tvon'), quer=!!b&&vs.length>1&&!tv;
      if(quer){ if(!document.body.classList.contains('bd-side-on')) document.body.classList.add('bd-side-on'); }
      else if((tv||nl.children.length>0)&&document.body.classList.contains('bd-side-on')) document.body.classList.remove('bd-side-on');
      if(!b||vs.length<2){ if(old) old.remove(); return; }
      const h=vs.map(([v,n])=>v==='bordomot'?`<a class="navbtn gxg-si" href="${esc(location.pathname+'?tv=motoristas')}" target="_blank" rel="noopener" title="Abre numa aba nova: para a tela da sala dos motoristas"><span>${esc(n)} ↗</span></a>`:v==='bordotv'?`<a class="navbtn gxg-si" href="${esc(tvUrl())}" target="_blank" rel="noopener" title="Abre numa aba nova"><span>${esc(n)} ↗</span></a>`
        :`<button class="navbtn gxg-si" data-go="${v}"${S.view===v?' aria-current="page"':''}><span>${esc(n)}</span></button>`).join('');
      if(old&&old.previousElementSibling===b&&old.__h===h) return; if(old) old.remove();
      b.insertAdjacentHTML('afterend',`<div class="gxg-sub bd-side">${h}</div>`); const nv=b.nextElementSibling; if(nv) nv.__h=h; }catch(e){ console.warn('[bordo] lateral',e); } }
  /* a lateral é refeita pelo painel a cada desenho: observa o #navlist e põe as telas de novo (sem laço: só quando falta) */
  { let _bs=0; const bsAgenda=()=>{ if(_bs) return; _bs=setTimeout(()=>{ _bs=0; const nl=document.getElementById('navlist'); if(!nl) return; const sub=nl.querySelector('.bd-side');
      const ok=sub&&[...sub.querySelectorAll('[data-go]')].every(x=>(x.getAttribute('aria-current')==='page')===(x.dataset.go===S.view)); if(!ok||!nl.querySelector('[data-mod="bordo"]')!==!sub) bdSide(); },0); };
    const liga=()=>{ const nl=document.getElementById('navlist'); if(!nl||!window.MutationObserver){ setTimeout(liga,500); return; } new MutationObserver(bsAgenda).observe(nl,{childList:true}); bsAgenda(); };
    liga(); window.__bdSide=bsAgenda; }
  P.registrarModulo({ id:'bordo', nome:'Diário de bordo', ic:'caminhao', telas:{ bordo:{nome:'Diário de bordo',mob:'Diário',render:comSide(vDiario)}, bordosol:{nome:'Solicitações de agendamento',mob:'Solicitações',render:comSide(vSol),menu:false}, bordotv:{nome:'TV do diário',mob:'TV',render:comSide(vTV)}, bordorel:{nome:'Relatório do mês',mob:'Relatório',render:comSide(vRel)}, bordomot:{nome:'TV dos motoristas',mob:'Motoristas',render:comSide(vMot),menu:false} }, iniciar });
  P.registrarPerfil('faturamento',{ nome:'Faturamento e expedição', mods:['bordo','agend'], pos:5, desc:'Para o pessoal do faturamento/expedição: diário de bordo (registrar chegada, marcar Mix/Faturado e Carregado/Finalizado, desistentes), solicitações dos representantes, agendamentos, TV e relatório do mês.' });
  P.registrarPerfil('tvbordo',{ nome:'TV do diário de bordo', mods:['bordo'], soVer:true, pos:5, desc:'Para a TV ou o monitor da expedição: mostra o diário de bordo e os agendados em tela inteira, trocando de aba sozinho. Só acompanha, não grava nada.' });
  { let foi=false; const t=setInterval(()=>{ try{ const A=S.acs; if(!A||!A.pronto) return; clearInterval(t); const d=A.doc||{};
      if(!foi&&/[?&]tv=motoristas\b/.test(location.search)){ const v=P.viewOk('bordomot')?'bordomot':P.viewOk('bdmot')?'bdmot':''; if(v){ foi=true; P.go(v); return; } }
      if(!foi&&((!A.dono&&d.perfil==='tvbordo')||/[?&]tv=bordo\b/.test(location.search))&&P.viewOk('bordotv')){ foi=true; P.go('bordotv'); } }catch(e){ clearInterval(t); } },400); }

  document.head.insertAdjacentHTML('beforeend',`<style id="bd-css">
  .bd-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:16px}.bd-top h1{margin:2px 0 0;font-size:clamp(24px,3vw,32px);line-height:1.1}
  .bd-eb{margin:0;font-size:14px;color:var(--muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}.bd-dn{width:30px;height:30px;border-radius:8px;border:1px solid var(--line);background:var(--surface);font:inherit;font-size:18px;line-height:1;cursor:pointer;color:inherit}.bd-dn:disabled{opacity:.35;cursor:default}
  .bd-ta{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .bd-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 14px}.bd-kpis>div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;min-width:0}
  .bd-kpis span{display:block;font-size:13px;color:var(--muted)}.bd-kpis b{display:block;font-size:28px;line-height:1.15;font-variant-numeric:tabular-nums}.bd-kpis b.ok{color:var(--ok)}.bd-kpis b.mut{color:var(--muted)}.bd-kpis b.warn{color:#a0560f}.bd-kpis small{display:block;font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bd-card{padding:14px 16px 8px}.bd-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}.bd-bar h2{margin:0 10px 0 0;font-size:18px}
  .bd-fc{font:inherit;font-size:13.5px;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.bd-fc[aria-pressed=true]{background:var(--teal-strong,#163c52);border-color:transparent;color:#fff;font-weight:700}
  .bd-busca{margin-left:auto}.bd-busca input{font:inherit;font-size:14px;min-height:38px;width:min(280px,60vw);padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:inherit}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .bd-tw{overflow-x:auto}.bd-tab{width:100%;min-width:1080px;border-collapse:collapse;font-size:14px}.bd-tab th{text-align:left;font-size:12px;color:var(--muted);padding:8px;font-weight:700;white-space:nowrap}.bd-tab th.r{text-align:right}
  .bd-tab td{padding:9px 8px;border-top:1px solid var(--line);vertical-align:middle}.bd-tab td small{display:block;font-size:12px;color:var(--muted);margin-top:2px}.bd-nm{display:block}
  .bd-tab tr.fim td{background:color-mix(in srgb,var(--ok) 9%,transparent)}.bd-tab tr.des td{opacity:.55}.bd-tab tr.atr td:first-child{box-shadow:inset 4px 0 0 #c0392b}
  .bd-ord{font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}.bd-num{font-variant-numeric:tabular-nums;white-space:nowrap}.bd-pt{text-align:right;font-weight:700}.bd-pt.atr{color:#b0391f}
  .bd-pl{display:inline-block;border:1.5px solid #111;border-top:5px solid #1f3d99;border-radius:5px;font-weight:700;font-size:13px;letter-spacing:.5px;padding:1px 6px;background:#fff;color:#111;white-space:nowrap}
  .bd-ag{font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap;background:color-mix(in srgb,var(--teal) 14%,transparent);color:var(--teal-strong,#163c52)}.bd-ag.antecipado{background:#efe7fb;color:#5b3a99}.bd-ag.sem{background:#fff4e5;color:#8a4a08}.bd-ag.atrasado{background:#fbe9e8;color:#8f1d19}
  .bd-tp{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:#e3ecf1;color:#163c52;white-space:nowrap}.bd-tp.pit{background:#efe7fb;color:#5b3a99}.bd-tp.des{background:#eceff1;color:#6b7a83}
  .bd-et button{font:inherit;font-size:13px;min-width:64px;min-height:32px;padding:0 8px;border-radius:8px;cursor:pointer;font-variant-numeric:tabular-nums}
  .bd-ok{border:0;background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok);font-weight:700}.bd-esp{border:1.5px solid #e9a24a;background:#fdecd6;color:#8a4a08;font-weight:700}.bd-atr{border:0;background:#c0392b;color:#fff;font-weight:700}.bd-nx{border:1.5px dashed var(--line);background:transparent;color:var(--muted)}.bd-ex{color:var(--muted)}
  .bd-acts{text-align:right;width:1%}.bd-acts .bd-lk{display:block;margin-left:auto;padding:2px 4px;white-space:nowrap}.bd-lk{font:inherit;font-size:13px;background:none;border:0;color:var(--teal-strong,#163c52);text-decoration:underline;text-underline-offset:2px;cursor:pointer;padding:4px 6px}
  .bd-leg{font-size:12.5px;color:var(--muted);margin:10px 0 6px}.bd-vz{text-align:center;color:var(--muted);padding:18px}.bd-vz2{display:flex;flex-direction:column;align-items:center;gap:4px;padding:32px 10px;color:var(--muted)}.bd-vz2 b{color:inherit;font-size:16px}
  .bd-ov{position:fixed;inset:0;z-index:300;background:rgba(15,43,59,.5);display:flex;align-items:flex-start;justify-content:center;padding:5vh 12px;overflow:auto}.bd-ovb{background:var(--surface);color:inherit;border-radius:18px;padding:18px 20px;width:min(640px,100%);box-shadow:0 20px 50px rgba(0,0,0,.25)}.bd-ovb.sm{width:min(460px,100%)}
  .bd-ovh{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}.bd-ovh h2{margin:0;font-size:20px}.bd-x{font:inherit;font-size:24px;line-height:1;width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;cursor:pointer}
  .bd-sub{font-size:13px;color:var(--muted);margin:2px 0 0}.bd-hint{font-size:12.5px;color:var(--muted);margin:4px 0 0}.bd-err{color:#b0391f;font-size:13.5px;font-weight:700;margin:4px 0 0}
  .bd-form{display:flex;flex-direction:column;gap:12px}.bd-f2{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:10px}.bd-lb{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700;color:var(--muted)}.bd-lb small{font-weight:400}
  .bd-in{font:inherit;font-size:16px;font-weight:500;color:inherit;min-height:46px;padding:0 12px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);box-sizing:border-box;min-width:0;width:100%}.bd-in[aria-invalid=true]{border-color:#c0392b}.bd-in.sm{min-height:38px;font-size:14px}
  .bd-plin{text-transform:uppercase;letter-spacing:1.5px;font-weight:700;border:2px solid #111;border-top:8px solid #1f3d99;background:#fff;color:#111;text-align:center;font-size:20px}
  .bd-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:46px;border:1.5px solid var(--teal-strong,#163c52);border-radius:12px;padding:6px 8px;background:var(--surface);box-sizing:border-box}.bd-chips input{flex:1;min-width:120px;font:inherit;font-size:15px;border:0;outline:0;height:32px;background:transparent;color:inherit}
  .bd-chip{display:inline-flex;align-items:center;gap:6px;background:#e3ecf1;color:#163c52;font-weight:700;font-size:15px;padding:4px 4px 4px 10px;border-radius:8px}.bd-chip button{width:24px;height:24px;border-radius:50%;border:0;background:#c4d4dd;color:#163c52;font-size:15px;line-height:1;cursor:pointer}
  .bd-info{font-size:13px;font-weight:500;margin:2px 0 0}.bd-info.ok{color:var(--ok)}.bd-info.warn{color:#8a4a08}.bd-info.info{color:#5b3a99}
  .bd-prev{margin:0;background:#fff7e6;border:1px solid #f0d28f;border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.35;color:#5a4208}
  .bd-replst{border:1.5px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}.bd-repq{font:inherit;font-size:15px;width:100%;box-sizing:border-box;border:0;border-bottom:1px solid var(--line);padding:0 12px;height:42px;background:transparent;color:inherit;outline:0}
  .bd-reps{max-height:220px;overflow:auto}.bd-rep{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 12px;border:0;border-bottom:1px solid color-mix(in srgb,var(--line) 60%,transparent);background:transparent;font:inherit;font-size:15px;color:inherit;text-align:left;cursor:pointer}
  .bd-rep[hidden]{display:none}.bd-rep .bd-rn{flex:1}.bd-rep small{font-size:12px;color:var(--muted)}.bd-rdot{width:16px;height:16px;border-radius:50%;border:1.5px solid #9fb1bb;box-sizing:border-box;flex-shrink:0}
  .bd-rep[aria-checked=true]{background:#e3ecf1;color:#163c52;font-weight:700}.bd-rep[aria-checked=true] .bd-rdot{border:5px solid #163c52}
  .bd-mots{display:flex;flex-direction:column;gap:8px}.bd-mots .bd-rep{border:1.5px solid var(--line);border-radius:12px;min-height:48px}.bd-mots .bd-rep[aria-checked=true]{border-color:#163c52}
  .bd-fs{border:0;padding:0;margin:0}.bd-fs legend{font-size:13px;font-weight:700;color:var(--muted);margin-bottom:6px;padding:0}
  .bd-seg{display:flex;flex-wrap:wrap;gap:6px}.bd-seg button{font:inherit;font-size:14px;min-height:40px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.bd-seg button[aria-pressed=true]{background:#163c52;border-color:#163c52;color:#fff;font-weight:700}
  .bd-seg.two{display:grid;grid-template-columns:1fr 1fr}.bd-seg.two button{border-radius:12px;min-height:46px;font-weight:700}
  .bd-facts{display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:4px;flex-wrap:wrap}
  .bd-b1{font:inherit;font-weight:700;font-size:16px;min-height:50px;padding:0 20px;border-radius:12px;border:0;background:#163c52;color:#fff;cursor:pointer}.bd-b1.ok{background:#17694a}.bd-b1.mut{background:#6b7a83}.bd-b1:disabled{opacity:.6}
  .bd-b0{font:inherit;font-weight:700;font-size:15px;min-height:46px;padding:0 16px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
  .bd-b1.sm,.bd-b0.sm{min-height:36px;font-size:13.5px;padding:0 12px;border-radius:9px}
  .bd-ta2{font:inherit;font-size:14px;width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);color:inherit;margin:8px 0}
  /* solicitações */
  .bd-tabs{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}.bd-tabs button{font:inherit;font-size:14px;min-height:38px;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.bd-tabs button[aria-pressed=true]{background:#163c52;border-color:#163c52;color:#fff;font-weight:700}
  .bd-kp{border-radius:12px;padding:8px 14px;font-size:14px}.bd-kp b{font-size:20px;margin-right:2px}.bd-kp.crit{background:#fbe9e8;color:#8f1d19}.bd-kp.warn{background:#fff4e5;color:#7a4a06}
  .bd-nova{padding:14px 16px}.bd-nova h2{margin:0;font-size:17px}.bd-nh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}
  .bd-ng{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,1.25fr) minmax(0,1fr) auto;gap:12px;align-items:end}.bd-ng.r{grid-template-columns:repeat(3,minmax(0,1fr)) auto;margin-top:10px}
  .bd-pz{font-size:13.5px;font-weight:500;color:inherit;line-height:1.35}
  .bd-falta{border:1.5px solid #c0392b;padding:14px 16px}.bd-falta h2{margin:0;font-size:17px;color:#8f1d19}
  .bd-fl{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) auto auto;gap:12px;align-items:center;font-size:14px;padding:10px 12px;background:#fbf3f2;border-radius:12px;margin-top:8px;color:#1d2b33}.bd-fl small{display:block;font-size:12.5px;color:#5d6e77}
  .bd-flf,.bd-fla{display:flex;gap:6px;align-items:center}.bd-crit{color:#8f1d19;font-weight:700;font-size:12.5px}
  .bd-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}
  .bd-col{background:color-mix(in srgb,var(--line) 45%,var(--ground,#eef2f4));border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;min-width:0}
  .bd-colh{display:flex;align-items:center;gap:8px;padding:2px 4px}.bd-colh i{width:10px;height:10px;border-radius:50%;background:#9fb1bb}.bd-col.avaliacao .bd-colh i{background:#e9a24a}.bd-col.liberado .bd-colh i{background:#17694a}
  .bd-colh h2{margin:0;font-size:16px}.bd-colh span{margin-left:auto;font-weight:700;color:var(--muted)}.bd-col>.bd-sub{margin:0 4px}.bd-colvz{color:var(--muted);font-size:13px;text-align:center;padding:14px 0}
  .bd-cd{background:var(--surface);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;border:1px solid var(--line)}.bd-cd.atr{border:1.5px solid #c0392b;box-shadow:inset 4px 0 0 #c0392b}.bd-cd.hoje{box-shadow:inset 4px 0 0 #e9a24a}
  .bd-cdh{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.bd-cdh b{font-size:15.5px}.bd-cdh small{font-size:12.5px;color:var(--muted);white-space:nowrap}
  .bd-cdp{font-size:13.5px;font-weight:700;color:var(--teal-strong,#163c52);font-variant-numeric:tabular-nums}.bd-cdi,.bd-cdo{font-size:12.5px;color:var(--muted)}.bd-cdo{font-style:italic}
  .bd-pis{display:flex;flex-wrap:wrap;gap:6px}.bd-pi{font-size:12.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:color-mix(in srgb,var(--line) 70%,transparent)}.bd-pi.crit{background:#fbe9e8;color:#8f1d19}.bd-pi.warn{background:#fff4e5;color:#7a4a06}.bd-pi.ok{background:#e3f1ea;color:#17694a}.bd-pi.info{background:#efe7fb;color:#5b3a99}
  .bd-cda{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:2px}.bd-acao{background:#fff4e5;border-radius:10px;padding:8px 10px;font-size:13px;color:#5a4208;display:flex;flex-direction:column;gap:4px}.bd-acao div{display:flex;gap:6px;align-items:center}
  .bd-lib{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}.bd-lib .bd-lb:nth-child(3){grid-column:1/-1}.bd-libb{display:flex;gap:8px;align-items:center;grid-column:1/-1}.bd-lib .bd-err{grid-column:1/-1}
  .bd-rls{list-style:none;margin:0;padding:0}.bd-rl{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid var(--line);flex-wrap:wrap}.bd-rl:first-child{border-top:0}.bd-rl.off{opacity:.6}
  .bd-av{width:40px;height:40px;border-radius:50%;background:#e3ecf1;color:#163c52;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
  .bd-rlt{flex:1;min-width:200px}.bd-rlt b{display:block}.bd-rlt small{display:block;font-size:12.5px;color:var(--muted)}.bd-rla{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.bd-tp2 .bd-lk{font-size:12.5px;padding:0}
  .bd-ajg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0 14px;max-width:760px}
  /* relatório */
  .bd-r2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.bd-r2>.card{margin:0 0 14px}
  .bd-rb{display:grid;grid-template-columns:170px 1fr 70px;align-items:center;gap:12px;margin:10px 0}.bd-rb span{font-size:14px}.bd-rbt{height:20px;background:color-mix(in srgb,var(--line) 70%,transparent);border-radius:6px;overflow:hidden}.bd-rbt i{display:block;height:100%;background:#163c52;border-radius:6px}.bd-rb b{text-align:right;font-variant-numeric:tabular-nums}
  .bd-nota{font-size:13.5px;background:#fff4e5;color:#7a4a06;border-radius:10px;padding:10px 12px;margin:8px 0 0}
  .bd-hrs{display:flex;align-items:flex-end;gap:8px;height:150px;margin-top:8px}.bd-hrs div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px}.bd-hrs i{width:100%;background:#9fb8c6;border-radius:6px 6px 0 0;min-height:2px}.bd-hrs i.pk{background:#163c52}.bd-hrs b{font-size:12px}.bd-hrs span{font-size:12px;color:var(--muted)}
  .bd-rt{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}.bd-rt th{font-size:12px;color:var(--muted);text-align:left;padding:8px}.bd-rt th.r,.bd-rt td.r{text-align:right}.bd-rt td{padding:8px;border-top:1px solid var(--line)}
  @media print{.side,header.top,.bottomnav,.mob-top,nav.tabs,.crumbs,.bd-np .bd-ta,.bd-tabs{display:none!important}.main{margin:0!important}.card,.bd-kpis>div{break-inside:avoid}}
  /* portaria (celular) */
  .bd-phero{background:var(--teal-strong,#163c52);color:#fff;border-radius:18px;padding:16px;margin:0 0 14px;display:flex;flex-direction:column;gap:12px}.bd-phero h1{margin:2px 0 0;font-size:26px;color:#fff}.bd-phero .bd-eb{color:rgba(255,255,255,.75)}
  .bd-pcnt{display:flex;gap:10px}.bd-pcnt div{flex:1;background:rgba(255,255,255,.1);border-radius:12px;padding:8px 10px}.bd-pcnt b{display:block;font-size:26px}.bd-pcnt span{font-size:13px;opacity:.8}
  .bd-pbig{font:inherit;font-size:19px;font-weight:700;min-height:62px;border-radius:14px;border:0;background:#fff;color:#163c52;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}.bd-pbig span{font-size:28px;line-height:1}
  .bd-psec h2{font-size:16px;margin:4px 0 8px;display:flex;gap:6px;align-items:center}.bd-psec h2 span{font-size:13px;background:var(--line);border-radius:999px;padding:1px 8px}
  .bd-pl2{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:8px}.bd-pi2{display:flex;gap:10px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px;flex-wrap:wrap}
  .bd-pi2.atr{box-shadow:inset 4px 0 0 #c0392b}.bd-pi2.fim{background:color-mix(in srgb,var(--ok) 9%,var(--surface))}.bd-pi2.des{opacity:.6}
  .bd-po{width:38px;height:38px;border-radius:10px;background:#e3ecf1;color:#163c52;font-weight:700;font-size:17px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}.bd-pt2{flex:1;min-width:170px}.bd-pt2 b{display:block;font-size:16px}.bd-pt2 small{display:block;font-size:12.5px;color:var(--muted)}.bd-pa{display:flex;gap:4px;align-items:center}
  .bd-pcard{background:var(--surface);border-radius:18px;padding:14px 16px;border:1px solid var(--line)}.bd-ph{display:flex;flex-direction:column;align-items:flex-start;gap:2px;margin-bottom:10px}.bd-ph h1{margin:0;font-size:22px}.bd-ph .bd-lk{padding:4px 0}
  .bd-form.cel .bd-f2{grid-template-columns:1fr 1fr}.bd-form.cel .bd-facts{position:sticky;bottom:0;background:var(--surface);padding:10px 0 4px}.bd-form.cel .bd-facts .bd-b1{flex:1;min-height:56px;font-size:18px}
  .bd-pf{background:var(--surface);border-radius:18px;padding:24px 18px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid var(--line)}.bd-pfok{width:72px;height:72px;border-radius:50%;background:#e3f1ea;color:#17694a;font-size:40px;display:flex;align-items:center;justify-content:center}
  .bd-pf h1{margin:0;font-size:24px}.bd-pfn{margin:0;font-size:16px}.bd-pfn b{font-size:22px}.bd-pf dl{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin:6px 0;text-align:left;width:100%}.bd-pf dt{font-size:12px;color:var(--muted)}.bd-pf dd{margin:0;font-weight:700}.bd-pf .bd-b1{width:100%}
  /* TV */
  @media (min-width:901px){body.bd-side-on nav.tabs[aria-label="Diário de bordo"]{display:none}}
  body.bd-tvon .side,body.bd-tvon header.top,body.bd-tvon .bottomnav,body.bd-tvon nav.tabs,body.bd-tvon .mob-top,body.bd-tvon .crumbs{display:none!important}body.bd-tvon .content{padding:0!important;max-width:none!important}body.bd-tvon .main{margin:0!important}
  .bd-tv{font-size:clamp(9px,.9vw,22px);background:#fff;color:#1d2b33;display:flex;flex-direction:column;border-radius:14px;overflow:hidden;border:1px solid var(--line)}.bd-tv.so{border-radius:0;border:0;min-height:100vh;font-size:1vw}
  .bd-tvh{display:flex;align-items:center;gap:1.2em;background:#163c52;color:#fff;padding:1.4em 1.4em 0;flex-wrap:nowrap;min-width:0}.bd-tvlogo img{height:2.4em;display:block;margin-bottom:.8em;white-space:nowrap;flex:none}
  .bd-tvt{display:flex;gap:.4em;align-self:flex-end}.bd-tvt button{white-space:nowrap;flex:none;font:inherit;font-size:1.5em;padding:.45em 1.1em;border:0;border-radius:.4em .4em 0 0;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}.bd-tvt button[aria-pressed=true]{background:#fff;color:#163c52;font-weight:700}
  .bd-tvd{font-size:1.2em;opacity:.75;margin-bottom:.8em}.bd-tvk{display:flex;gap:1.1em;margin-left:auto;font-size:1.15em;flex-wrap:nowrap;white-space:nowrap;margin-bottom:.8em;min-width:0;overflow:hidden}.bd-tvh>*{flex-shrink:0}.bd-tvh>.bd-tvk{flex-shrink:1}.bd-tvc{font-size:2.4em;font-weight:700;font-variant-numeric:tabular-nums;margin-bottom:.3em}
  .bd-tvfs{font:inherit;font-size:1em;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;border-radius:.4em;padding:.4em .8em;cursor:pointer;margin-bottom:.8em}
  .bd-tvb{flex:1;padding:1em 1.4em 0}.bd-tvvz{font-size:2em;color:#5d6e77;text-align:center;padding:3em 0}
  .bd-tvtab{width:100%;border-collapse:collapse;font-size:1.15em;font-variant-numeric:tabular-nums}.bd-tvtab.fixa{table-layout:fixed}.bd-tvtab.fixa th,.bd-tvtab.fixa td{overflow:hidden;text-overflow:ellipsis}.bd-tvtab.fixa thead th{white-space:normal;line-height:1.1}.bd-tvtab th,.bd-tvtab td{border:1px solid #c9d4da;padding:.42em .6em;text-align:center;white-space:nowrap}.bd-tvtab .l{text-align:left}.bd-tvtab .b{font-weight:700}
  .bd-tvtab thead tr{background:#163c52;color:#fff;font-size:.85em}.bd-tvtab tr.fim{background:#c9ecd6}.bd-tvtab tr.des{background:#d5dadd;color:#6b7a83}.bd-tvtab tr.al{background:#fbe9e8;box-shadow:inset .5em 0 0 #8f1d19}
  .bd-tvtab td.pend{background:#e64640;color:#fff;font-weight:700}.bd-tvtab td.atr{background:#8f1d19;color:#fff;font-weight:700}.bd-tvtab td.nx{color:#9fb1bb}.bd-tvtab .pl{letter-spacing:.05em}
  .bd-tvtab td.ag.antecipado{background:#efe7fb;color:#5b3a99;font-weight:700}.bd-tvtab td.ag.sem{color:#8a4a08;font-weight:700}.bd-tvtab td.ag.atrasado{color:#8f1d19;font-weight:700}
  .bd-tvtab tr.dia td{background:#e3ecf1;color:#163c52;font-weight:700;font-size:1.05em}.bd-tvtab tr.fatr{background:#fdecd6}.bd-tvtab td.okt{color:#17694a;font-weight:700}.bd-tvtab td.st.ok{color:#17694a;font-weight:700}.bd-tvtab td.st.fat{color:#8a4a08;font-weight:700}.bd-tvtab td.st.mut,.bd-tvtab td.mut{color:#5d6e77}.bd-tvtab td.st.atr{background:#8f1d19;color:#fff}
  .bd-tvmais{font-size:1em;color:#5d6e77;margin:.5em 0 0}
  .bd-tvf{display:flex;gap:2em;align-items:center;padding:.7em 1.4em;font-size:1.05em;color:#5d6e77;flex-wrap:wrap}.bd-tvf i{display:inline-block;width:1em;height:1em;vertical-align:-.15em;margin-right:.4em;border:1px solid rgba(0,0,0,.08)}.bd-tvf .r{margin-left:auto}
  @media (max-width:900px){.bd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.bd-cols,.bd-r2,.bd-ng,.bd-ng.r,.bd-ajg{grid-template-columns:minmax(0,1fr)}.bd-fl{grid-template-columns:1fr}.bd-busca{margin-left:0;width:100%}.bd-busca input{width:100%}.bd-rb{grid-template-columns:120px 1fr 56px}}
  @media (max-width:520px){.bd-f2{grid-template-columns:1fr}.bd-form.cel .bd-f2{grid-template-columns:1fr}}
  
  @media (min-width:1000px){.bd-ptl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 22px;align-items:start}.bd-ptl>.bd-phero{grid-column:1/-1;flex-direction:row;align-items:center;flex-wrap:wrap}.bd-ptl>.bd-phero>*{flex:1 1 auto}.bd-ptl>.bd-phero .bd-pbig{flex:0 0 320px}
    .cv-appc .bd-pcard,.cv-appc .bd-pf{max-width:820px;margin-left:auto;margin-right:auto}}

  .bd-f4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}@media (max-width:560px){.bd-f4{grid-template-columns:1fr 1fr}}

  .bd-repsel{display:flex;align-items:center;gap:12px;border:2px solid var(--teal-strong,#163c52);border-radius:12px;padding:10px 12px;background:var(--teal-tint,#eaf3f6)}.bd-rst{flex:1;min-width:0}.bd-rst b{display:block}.bd-rst small{color:var(--muted);font-size:12px}.bd-repsel .bd-rdot{flex:none;width:16px;height:16px;border-radius:50%;border:5px solid var(--teal-strong,#163c52);background:#fff}

  .bd-obs{display:block;color:#8a5a12!important;font-style:italic;max-width:340px;white-space:normal}

  .bd-tv.mt .mt-h{font-size:2em;margin:0 0 .35em;white-space:nowrap}
  .mt-tab{width:100%;border-collapse:collapse;table-layout:fixed;font-size:1.9em;font-variant-numeric:tabular-nums}.mt-tab th{background:#163c52;color:#fff;font-size:.5em;font-weight:600;padding:.5em;text-align:left}
  .mt-tab td{border-bottom:2px solid #dde4e8;padding:.35em .5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle}.mt-n{font-weight:800;text-align:center;color:#163c52}
  .mt-plc{display:inline-block;border:.08em solid #1d2b33;border-top:.28em solid #2647a5;border-radius:.18em;padding:0 .3em;font-weight:800;letter-spacing:.06em;background:#fff}
  .mt-nm{font-weight:700}.mt-st b{display:block;font-size:.85em}.mt-ps{display:flex;gap:.35em;margin-top:.15em}.mt-p{font-size:.42em;padding:.2em .6em;border-radius:1em;background:#eef2f4;color:#7a8a93;font-weight:700}
  .mt-p.ok{background:#c9ecd6;color:#17694a}.mt-p.ag{background:#163c52;color:#fff}.mt-t{font-size:.7em;color:#33464f}.mt-t small{display:block;font-size:.75em;color:#7a8a93}
  .mt-tab tr.fim{background:#c9ecd6}.mt-tab tr.fim .mt-st b{color:#17694a}
  @keyframes mtpisca{0%,100%{background:#fff3c4}50%{background:#ffe27a}}.mt-tab tr.novo{animation:mtpisca 1.6s ease-in-out infinite}
  @media (prefers-reduced-motion:reduce){.mt-tab tr.novo{animation:none;background:#fff3c4}}
  .mt-vz{font-size:2.4em;text-align:center;color:#5d6e77;margin:3em 0}

  /* 27/11/2026 · "mais visual, tem que chamar atenção, pode ficar piscando" */
  .mt-st b.mt-bd{display:inline-block}.mt-p{font-size:.5em!important}
  .mt-bd{display:inline-block;padding:.08em .5em;border-radius:.3em;font-size:.82em!important;color:#fff}
  .mt-bd.s-mix{background:#5a6b75}.mt-bd.s-fat{background:#c77a12}.mt-bd.s-carr{background:#1f5f99}.mt-bd.s-fim{background:#6b4e9b}
  .mt-bd.lib{background:#12804f;animation:mtlib 1.2s linear infinite}
  @keyframes mtlib{0%,49%{background:#12804f;color:#fff}50%,100%{background:#ffd400;color:#1d2b33}}
  .mt-tab tr.fim{background:#bdf0cf!important;animation:mtfim 1.2s ease-in-out infinite}@keyframes mtfim{0%,100%{background:#bdf0cf}50%{background:#7fe0a3}}
  .mt-novo{display:inline-block;margin-left:.4em;font-style:normal;font-size:.42em;font-weight:800;background:#ffd400;color:#1d2b33;padding:.2em .6em;border-radius:1em;vertical-align:middle;animation:mtnv .8s steps(2,end) infinite}@keyframes mtnv{50%{opacity:.15}}
  .mt-tab tr.novo{animation:mtpisca2 .9s ease-in-out infinite}@keyframes mtpisca2{0%,100%{background:#fff3c4}50%{background:#ffd84d}}
  .mt-t.dem{color:#b3261e;font-weight:800}.mt-t.dem small{color:#b3261e;animation:mtnv 1s steps(2,end) infinite}
  .mt-cham{display:flex;align-items:center;gap:1em;flex-wrap:wrap;margin:.6em 1.4em 0;padding:.5em 1em;border-radius:.5em;font-size:2.1em;font-weight:800;color:#fff;background:#12804f;animation:mtcham 1s steps(2,end) infinite}
  @keyframes mtcham{0%{background:#12804f}50%{background:#0a5c38}}.mt-chx{white-space:nowrap}.mt-cham .mt-plc{color:#1d2b33;font-size:.85em}.mt-chi{font-size:1em}
  .bd-tvtab td.atr{animation:tvatr 1s steps(2,end) infinite}@keyframes tvatr{50%{background:#e64640}}
  .bd-tvtab td.pend{animation:tvpend 2s ease-in-out infinite}@keyframes tvpend{50%{background:#f07a75}}

  .bd-avl{flex-basis:100%;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:600;margin-bottom:6px;background:#fdf1dc;color:#7a4b06}.bd-avl.dia{background:#e8f0f8;color:#1f4f7a}.bd-avl.ok{background:#dcf3e5;color:#17694a}.bd-avl>div{display:flex;gap:6px;flex-wrap:wrap}
  .bd-fx{margin-bottom:14px;border:2px solid #e7b04a}.bd-fxh{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.bd-fxi{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}.bd-fxi small{display:block;color:var(--muted);font-size:12px}.bd-fxi.foco{background:#fffbe6;margin:0 -10px;padding:8px 10px;border-radius:8px}.bd-fxi .bd-avl{margin:0}
  @media (max-width:760px){.bd-fxi{grid-template-columns:1fr}}

  html:has(body.bd-tvon),body.bd-tvon{overflow:hidden}

  .bd-dem{display:block;color:#93413f!important;font-weight:600;max-width:360px;white-space:normal}.bd-lkw{color:#b3261e!important;font-weight:700}
</style>`);
})();
