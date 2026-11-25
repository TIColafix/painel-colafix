/* Painel Colafix · 95-diretor.js (25/11/2026) — login dos diretores.
   Pedido: "preciso criar um login para os diretores parecido com o do marcelo porém sem mexer"; "o quadro precisa ser
   informativo e responder perguntas com base no que sabe do painel"; "pode fazer isso e algo mais interessante; pode dar
   os dados também com nomes mesmo".
   - Cargo pronto `diretor` ("Diretor (só acompanha)"): os mesmos módulos do gestor + Agendamentos, só ver
     (ACS_SO_VER no painel e soVer() no firestore.rules). Usa o menu do gestor (gxSolo), sem Cadastros.
   - Só ver de verdade: some cada botão que grava nas telas do gestor (DR_ESCONDE), o clique é barrado (DR_BLOQ) e, por
     último, o banco deste login recusa set/update/delete/add (drTrava) — nada muda sozinho quando o diretor abre o painel
     (nem o "visto" dos pedidos de peça, nem o resumo do chatbot).
   - Início próprio (`vDrInicio` no lugar do Início do gestor): termômetro da fábrica (6 áreas), o que está acontecendo em
     frases, "Pergunte ao painel" (perguntas por palavra-chave, respondidas com o que o painel já carregou), blocos por
     pergunta (hoje, mês, o que trava, entregas, pessoas com nomes, segurança, em andamento, destaques da semana) e o
     resumo da semana em PDF.
   - A administradora vê como diretor com ?diretor=1.
   Prefixo `dr`. */
"use strict";
S.dr=S.dr||{q:'',r:null,hist:[]};
const DR_MODS=['gestor','producao','silos','manut','telas','analise','agend'];
try{ const gi=typeof EQ_PRONTO_ORD!=='undefined'?EQ_PRONTO_ORD.indexOf('gestor'):-1;
  registrarPerfil('diretor',{nome:'Diretor (só acompanha)',mods:DR_MODS,soVer:true,pos:gi>=0?gi+1:1,
    desc:'Vê tudo o que o gestor vê (produção, manutenção, pessoas com nomes, entregas e valores), com um Início que responde perguntas. Não muda nada no painel.'}); }catch(e){ console.warn('[diretor] cargo',e); }

function drSolo(){ try{ const A=S.acs; if(!A||!A.pronto) return false; if(A.dono) return /[?&]diretor=1/.test(location.search);
  const d=A.doc; return !!(d&&d.ativo!==false&&d.perfil==='diretor'); }catch(e){ return false; } }
try{ const _g=gxSolo; gxSolo=function(){ return drSolo()||_g.apply(this,arguments); }; }catch(e){ console.warn('[diretor] gxSolo',e); }
try{ const _s=soVer; soVer=function(){ return drSolo()||_s.apply(this,arguments); }; }catch(e){ console.warn('[diretor] soVer',e); }
try{ const _a=apiPodeGravar; apiPodeGravar=function(){ return !drSolo()&&_a.apply(this,arguments); }; }catch(e){}

/* ---------- só ver: banco ---------- */
let _drAv=0;
function drAvisa(){ const n=Date.now(); if(n-_drAv<4000) return; _drAv=n; try{ toast('Seu acesso é só para ver. Nada foi alterado.'); }catch(e){} }
const drLivre=p=>{ p=String(p||''); return p==='perfis/'+S.uid||p.startsWith('melhorias/')||p.startsWith('erros/'); };
function drTrava(db){ if(!db||db.__dr) return; db.__dr=true;
  const nao=()=>{ drAvisa(); const e=new Error('Seu acesso é só para ver.'); e.code='permission-denied'; return Promise.reject(e); };
  const doc=r=>!r||!r.set||drLivre(r.path)?r:Object.assign({},r,{set:nao,update:nao,delete:nao,acquire:async()=>({acquired:false,erro:'so-ver'})});
  const _d=db.doc.bind(db), _c=db.collection.bind(db);
  db.doc=p=>doc(_d(p));
  db.collection=p=>{ const q=_c(p); return Object.assign({},q,{add:d=>drLivre(p+'/x')?q.add(d):nao(),doc:id=>doc(q.doc(id))}); }; }

/* ---------- só ver: botões ---------- */
const DR_BLOQ=['gx-ac-del','gx-ac-ed','gx-ac-nova','gx-ac-salvar','gx-cad-add','gx-cad-x','gx-cal-add','gx-cal-mv','gx-cal-salvar','gx-novaos','gx-par-acao','gx-seg-salvar',
  'gx-t-del','gx-t-ed','gx-t-novo','gx-t-salvar','gch-canc','gch-canc-f','gch-feito','gch-feito-nao','gch-feito-ok','gch-nova','gch-salvar','cq-terminar','tf-reab','tf-reab-ok',
  'gce-abrir','gce-mais','gce-pr','gce-salvar','he-add','he-ok','he-x','pp-gerar','pp-imp-ok','ppe-add','ppe-apagar','ppe-ed','ppe-novo','ppe-salvar','ppe-op','ppg-add','ppg-tira',
  'ppo-ok','ppo-pb','ppk-ok','ppk-pb','ppk-tudo','cqk-ok','cqk-pb','cqk-tudo','cqk-fim','gpc-canc','gpc-ok','gpc-st','gpx-comp','gpx-ed','gpx-novo','gpx-psalva','gpx-psalvac',
  'gpx-resp','gpx-rok','gpx-pronta','gpx-todos','gpx-um','gpx-pmais','gpx-ptira','gpx-purg','mx-eq-conf','mx-eq-ed','mx-eq-prev','mt-novo',
  'qd-add','qd-addrh','qd-addtxt','qd-arnova','qd-arok','qd-ared','qd-arsob','qd-ardes','qd-arcol','qd-arrec','qd-ced','qd-cnok','qd-cx','qd-cesq','qd-cdir','qd-meta','qd-metaok',
  'qd-vsalva','qd-vvolta','qd-vx','qd-tira','qd-sobe','qd-desce','qd-hab','qd-mv','qd-st','qd-crec','qd-crectodos','qd-col','qd-lvpor','qd-lvall','qdo-rec',
  'mi-novo','mi-salvar','mi-imp','mi-tira','mi-mais','mi-ina','mi-inatodos','mi-at','mi-atvtodos','mi-rep','mi-rok','mi-trab','mi-trok','mi-caded','mi-cadok','mi-iok','mi-inc','mi-ofc','mi-ofdesf','mi-offora',
  'gx-t-sel'];
/* não somem (são a própria lista), só não fazem nada: abrir a pessoa no quadro */
const DR_SO_BLOQ=['qd-sel','qd-pn'];
const DR_ATTR=['[data-gxac-ok]','[data-gxac-st]','[data-gxpar-c]','[data-ppg-mv]','[data-pp-data]','[data-ppk-obs]','#qd-espm','#qd-espa','#qd-obs','#qd-cn','#qd-habn','#qd-vnome'];
const drSel=a=>`[data-act="${a}"]`;
try{ document.head.insertAdjacentHTML('beforeend','<style id="dr-ro">'+DR_BLOQ.map(a=>'body.dir-ro '+drSel(a)).join(',')+'{display:none!important}'
  +'body.dir-ro .gx-modal [data-act$="-salvar"],body.dir-ro [data-act="gx-ac-nova"],body.dir-ro .he-form,body.dir-ro #gxs-res [data-g="Fazer"]{display:none!important}</style>'); }catch(e){}
function drBloqueado(t){ if(!t||!t.closest) return null; const b=t.closest('[data-act]'); if(b&&(DR_BLOQ.includes(b.dataset.act)||DR_SO_BLOQ.includes(b.dataset.act))) return b;
  return t.closest(DR_ATTR.join(',')); }
['click','change','input'].forEach(tp=>window.addEventListener(tp,ev=>{ if(!document.body.classList.contains('dir-ro')) return; const b=drBloqueado(ev.target); if(!b) return;
  if(tp==='input'&&!/^(INPUT|SELECT|TEXTAREA)$/.test(b.tagName)) return;
  ev.preventDefault(); ev.stopImmediatePropagation(); if(tp==='click') drAvisa(); },true));
window.addEventListener('dragstart',ev=>{ if(document.body.classList.contains('dir-ro')&&ev.target&&ev.target.closest&&ev.target.closest('[draggable="true"]')){ ev.preventDefault(); ev.stopImmediatePropagation(); } },true);

/* ---------- ganchos: Início, menu, avisos, busca ---------- */
function drGanchos(){ const on=drSolo(); document.body.classList.toggle('dir-ro',on); if(!on) return;
  if(S.db) drTrava(S.db);
  const ex=S.extViews&&S.extViews.gxinicio; if(ex&&!ex.__dr){ const f=function(){ return drSolo()?vDrInicio():ex.apply(this,arguments); }; f.__dr=true; S.extViews.gxinicio=f; }
  try{ if(typeof GXG!=='undefined'){ const i=GXG.findIndex(g=>g.id==='g-cad'); if(i>=0) GXG.splice(i,1); } }catch(e){}
  try{ if(typeof CRUMB!=='undefined') CRUMB.gxinicio='Início da diretoria'; }catch(e){} }
setInterval(drGanchos,500);
try{ const _al=gxAlertas; gxAlertas=function(){ const xs=_al.apply(this,arguments); if(!drSolo()) return xs;
  const tr=s=>String(s||'').replace(/esperando você/gi,'esperando o gestor').replace(/\bde você\b/gi,'do gestor').replace(/\bvocê\b/gi,'o gestor');
  return xs.map(a=>Object.assign({},a,{t:tr(a.t),d:tr(a.d)})); }; }catch(e){}
try{ const _gi=gxsItens; gxsItens=function(q){ let r=_gi.apply(this,arguments); if(!drSolo()) return r;
  r=r.filter(x=>x.g!=='Fazer'||/pdf|relat/i.test(x.t)).map(x=>x.g==='Precisa de você'?Object.assign({},x,{g:'Pede atenção'}):x);
  if(String(q||'').trim().length>=3){ let a=null; try{ a=drResponder(q); }catch(e){} if(a&&!a.naoEntendi) r.unshift({g:'Resposta do painel',t:a.t+(a.v?': '+drTxt(a.v):''),s:drTxt(a.s).slice(0,110),run:()=>{ drPergunta(q); go('gxinicio'); }}); }
  return r; }; }catch(e){}
try{ const _n=gxnNav; gxnNav=function(){ const r=_n.apply(this,arguments); try{ if(drSolo()){ const nl=$('#navlist'); if(nl&&!nl.querySelector('.dr-nv')) nl.insertAdjacentHTML('afterbegin','<div class="dr-nv">Diretoria · só acompanha</div>'); } }catch(e){} return r; }; }catch(e){}

/* ---------- números ---------- */
const drN=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const drTxt=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const drR=v=>'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});
const drP=x=>(Math.floor((+x||0)*100+1e-6)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const drPal=x=>(+x||0)>0?drP(x):'—';
const drCor=p=>p==null?'neu':p>=95?'ok':p>=80?'warn':'crit';
const DR_SEM=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
function drDiaCurto(d){ const h=hojeStr(); if(d===h) return 'hoje'; if(d===addDias(h,-1)) return 'ontem'; if(d===addDias(h,1)) return 'amanhã'; return DR_SEM[new Date(d+'T12:00:00').getDay()]+', '+dm(d); }
function drMesAnt(cp){ const y=+cp.slice(0,4), m=+cp.slice(5,7); return m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0'); }
function drFr(){ const ag=new Date(), ini=horaMin(GX_TURNO_PADRAO.ini), fim=horaMin(GX_TURNO_PADRAO.fim), mn=ag.getHours()*60+ag.getMinutes(); return Math.max(0,Math.min(1,(mn-ini)/(fim-ini))); }
function drDia(d){ try{ return gxDados(d); }catch(e){ return null; } }
function drMes(cp){ try{ return gxMesDados(cp); }catch(e){ return null; } }
/* último dia de trabalho antes de hoje (com meta ou produção) */
function drUltimoDia(){ const h=hojeStr(); for(let i=1;i<=10;i++){ const d=addDias(h,-i), D=drDia(d); if(D&&(D.tot.t>0||D.tot.mT>0)) return {d,D}; } return null; }
/* últimos 7 dias corridos com produção ou meta */
function drSemana(){ const h=hojeStr(), out=[]; for(let i=6;i>=0;i--){ const d=addDias(h,-i), D=drDia(d); if(D&&(D.tot.t>0||D.tot.mT>0)) out.push({d,D}); } return out; }
function drParadas(dias){ const t0=new Date(addDias(hojeStr(),-(dias-1))+'T00:00:00').getTime(), ag=Date.now(), mot={}, lin={}; let tot=0, n=0;
  (S.paradas||[]).forEach(p=>{ if(!p.inicio||p.anulada||gxSetup(p)) return; const a=Math.max(t0,new Date(p.inicio).getTime()), b=Math.min(ag,p.fim?new Date(p.fim).getTime():ag); if(b<=a) return;
    let m=0; try{ m=gxParMin(p,a,b); }catch(e){} if(m<1) return; n++; tot+=m; const k=p.motivo||'Sem motivo'; mot[k]=(mot[k]||0)+m; lin[p.linha||'?']=(lin[p.linha||'?']||0)+m; });
  const ord=o=>Object.entries(o).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v); return {tot,n,mot:ord(mot),lin:ord(lin)}; }
function drChamados(){ const ab=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido&&!manFechada(c)&&(+c.numero||0)<900000), ag=Date.now();
  const corr=ab.filter(c=>!c.prevId), par=corr.filter(c=>c.impacto==='parou'&&!c.liberadoEm), semT=corr.filter(c=>!(c.exec&&c.exec.tecnico)&&!c.tarefa);
  const tar=corr.filter(c=>c.tarefa), venc=tar.filter(c=>c.prazo&&c.prazo<hojeStr());
  let prevAtr=[]; try{ prevAtr=mxPrevStatus().filter(x=>x.st==='atrasada'); }catch(e){}
  const velhos=corr.slice().sort((a,b)=>String(a.criado||'').localeCompare(String(b.criado||''))).slice(0,4);
  return {ab,corr,par,semT,tar,venc,prevAtr,velhos,ha:c=>ltvMin(ag-new Date(c.criado).getTime())}; }
function drPessoas(){ try{ gxpAssina(); }catch(e){} let D=null, R=null; try{ D=gxpDoc(hojeStr()); R=D?gxpResumo(D):null; }catch(e){}
  if(!D||!R) return null; const lim=R.lim||480;
  const falt=(D.f||[]).filter(x=>x&&!['Sumiu','Afastado','Folga'].includes(x.m)).map(x=>({n:x.n||'',s:x.s||'',e:x.e||'',m:x.m==='Férias'?'Férias':'Sem registro'})).sort((a,b)=>a.n.localeCompare(b.n,'pt'));
  const atr=(D.p||[]).filter(x=>{ try{ return (gxpM(x.c)||0)>lim; }catch(e){ return false; } }).map(x=>({n:x.n||'',c:x.c||'',s:x.s||''})).sort((a,b)=>String(b.c).localeCompare(String(a.c)));
  /* quem mais faltou nos dias que o painel tem (até 14) */
  const cont={}; ((S.gxPres&&S.gxPres.docs)||[]).filter(x=>x&&x.dia&&x.dia<hojeStr()).forEach(x=>(x.f||[]).forEach(y=>{ if(!y||['Sumiu','Afastado','Folga','Férias'].includes(y.m)) return; cont[y.n]=(cont[y.n]||0)+1; }));
  const mais=Object.entries(cont).filter(([,v])=>v>=2).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>({n,v}));
  const nDias=((S.gxPres&&S.gxPres.docs)||[]).filter(x=>x&&x.dia&&x.dia<hojeStr()).length;
  return {D,R,falt,nFalta:falt.filter(x=>x.m!=='Férias').length,nFer:falt.filter(x=>x.m==='Férias').length,atr,mais,nDias,pc:R.esper?Math.round(R.vieram/R.esper*100):null}; }
function drHoraExtra(){ const cp=hojeStr().slice(0,7); let xs=[]; try{ xs=window.HoraExtra.doMes(cp); }catch(e){ return null; }
  const por={}; let tot=0; xs.forEach(x=>{ const h=+x.horas||0, ns=x.nomes||[]; ns.forEach(n=>{ por[n]=(por[n]||0)+h; tot+=h; }); });
  return {tot,n:xs.length,pessoas:Object.keys(por).length,top:Object.entries(por).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>({n,v}))}; }
function drSeg(){ const h=hojeStr(), xs=Object.values(S.gxSeg||{}).filter(s=>s&&s.data), hoje=(S.gxSeg||{})[h]||null, cp=h.slice(0,7);
  const ult=xs.filter(s=>+s.ocorr>0).map(s=>s.data).sort().pop()||'', dias=ult?Math.round((new Date(h+'T12:00:00')-new Date(ult+'T12:00:00'))/864e5):null;
  const mes=xs.filter(s=>s.data.slice(0,7)===cp); return {hoje,ult,dias,ocMes:mes.reduce((a,s)=>a+(+s.ocorr||0),0),regMes:mes.length,desvMes:mes.reduce((a,s)=>a+(+s.desvios||0),0),primeiro:xs.map(s=>s.data).sort()[0]||''}; }
function drAgend(){ const A=window.Painel&&window.Painel.agendResumo; if(!A) return null; try{ const r=A.resumo(); return r&&r.lido?r:null; }catch(e){ console.warn('[diretor] agendamentos',e); return null; } }
function drPecas(){ const xs=(S.pedpecas||[]).filter(p=>!p.removido&&!['chegou','nao'].includes(p.status)); return {n:xs.length,comp:xs.filter(p=>['comprar','comprado'].includes(p.status)).length,novos:xs.filter(p=>!p.status||p.status==='enviado').length,urg:xs.filter(p=>p.urg==='hoje').length}; }
function drAcoes(){ const h=hojeStr(), ab=(S.gxAcoes||[]).filter(a=>!a.removido&&a.st!=='ok'); return {ab,atr:ab.filter(a=>a.prazo&&a.prazo<h).sort((a,b)=>String(a.prazo).localeCompare(String(b.prazo))),ok30:(S.gxAcoes||[]).filter(a=>a.st==='ok'&&String(a.okEm||a.em||'')>=addDias(h,-30)).length}; }
function drComercial(){ try{ const C=window.Painel&&window.Painel.comercial; if(!C) return null; const cp=hojeStr().slice(0,7); const X=C.calc(cp); if(!X) return null; return C.frases(cp); }catch(e){ return null; } }

/* ---------- tudo junto (o Início e o PDF usam) ---------- */
function drTudo(){ const h=hojeStr(), cp=h.slice(0,7), D=drDia(h), M=drMes(cp), fr=drFr();
  const esp=D&&D.tot.mT?D.tot.mT*fr:0, pcAg=esp>0?Math.round(D.tot.t/esp*100):null, pcDia=D&&D.tot.mT?Math.round(D.tot.t/D.tot.mT*100):null;
  const proj=D&&fr>.15&&fr<1?D.tot.t/fr:null;
  let mes=null; if(M){ const ate=M.ate.length||1, pc=M.tot.mAte?Math.round(M.tot.t/M.tot.mAte*100):null, projM=M.tot.t+(M.tot.t/ate)*M.rem;
    const Ma=drMes(drMesAnt(cp)); let ant=null; if(Ma){ const lim=h.slice(8,10); const t=Ma.porDia.filter(x=>!x.fut&&x.d.slice(8,10)<=lim).reduce((a,x)=>a+(x.t||0),0); if(t>0) ant={t,pc:Math.round((M.tot.t-t)/t*100),cp:Ma.cp}; }
    mes={M,pc,projM,falta:Math.max(0,M.tot.mMes-M.tot.t),porDia:M.rem?Math.max(0,M.tot.mMes-M.tot.t)/M.rem:0,ant}; }
  return {h,cp,D,fr,esp,pcAg,pcDia,proj,mes,ult:drUltimoDia(),sem:drSemana(),par1:drParadas(1),par7:drParadas(7),ch:drChamados(),pes:drPessoas(),he:drHoraExtra(),seg:drSeg(),ag:drAgend(),pec:drPecas(),ac:drAcoes(),com:drComercial()}; }

/* termômetro: uma linha por área, com a cor e o porquê */
function drTermo(T){ const out=[], D=T.D;
  if(D&&D.tot.mT) out.push({k:'Produção hoje',c:T.fr<.05?'neu':drCor(T.pcAg),v:T.fr<.05?gxT(D.tot.mT)+' t':(T.pcAg==null?'—':T.pcAg+'%'),s:T.fr<.05?'meta do dia; o turno ainda não começou':gxT(D.tot.t)+' t de '+gxT(T.esp)+' t esperadas até agora',go:'gxprod'});
  else out.push({k:'Produção hoje',c:'neu',v:D?gxT(D.tot.t)+' t':'—',s:'sem meta da Curva S para hoje',go:'gxprod'});
  if(T.mes) out.push({k:'Mês',c:drCor(T.mes.pc),v:T.mes.pc==null?gxT(T.mes.M.tot.t)+' t':T.mes.pc+'%',s:gxT(T.mes.M.tot.t)+' t de '+gxT(T.mes.M.tot.mAte)+' t esperadas até hoje',go:'gxdia'});
  else out.push({k:'Mês',c:'neu',v:'—',s:'previsão do mês ainda não importada',go:'gxdia'});
  const C=T.ch; out.push({k:'Manutenção',c:C.par.length?'crit':C.semT.length||C.prevAtr.length?'warn':'ok',v:String(C.corr.length),s:C.par.length?C.par.length+(C.par.length>1?' máquinas paradas':' máquina parada')+' agora':C.semT.length?C.semT.length+' sem técnico':C.prevAtr.length?C.prevAtr.length+' preventiva'+(C.prevAtr.length>1?'s':'')+' atrasada'+(C.prevAtr.length>1?'s':''):'chamados abertos, todos atendidos',go:'gxch'});
  const G=T.ag; if(G){ const sm=G.semMaterial.length, prox2=G.semMaterial.filter(x=>x.data<=addDias(T.h,1)).length;
    out.push({k:'Entregas',c:G.atrasados.n||prox2?'crit':sm?'warn':'ok',v:String(G.dias.reduce((a,d)=>a+d.n,0)),s:G.atrasados.n?G.atrasados.n+' pedido'+(G.atrasados.n>1?'s':'')+' com a data vencida':sm?sm+' pedido'+(sm>1?'s':'')+' sem material':'pedidos agendados, todos com material',go:'agendamentos'}); }
  const P=T.pes; if(P) out.push({k:'Pessoas',c:P.pc==null?'neu':P.pc>=95?'ok':P.pc>=88?'warn':'crit',v:P.R.vieram+' / '+P.R.esper,s:(P.nFalta?P.nFalta+(P.nFalta>1?' faltaram':' faltou'):'ninguém faltou')+(P.nFer?' · '+P.nFer+' de férias':'')+(P.atr.length?' · '+P.atr.length+' chegaram depois':''),go:'gxpres'});
  else out.push({k:'Pessoas',c:'neu',v:'—',s:'presença de hoje ainda não chegou do RH',go:'gxpres'});
  const Sg=T.seg; out.push({k:'Segurança',c:Sg.hoje&&+Sg.hoje.ocorr?'crit':Sg.hoje?'ok':'warn',v:Sg.dias!=null?Sg.dias+(Sg.dias===1?' dia':' dias'):Sg.primeiro?'0 ocorrências':'—',s:Sg.dias!=null?'sem ocorrência'+(Sg.hoje?'':' · hoje ainda não preenchido'):Sg.primeiro?'desde '+dm(Sg.primeiro)+(Sg.hoje?'':' · hoje ainda não preenchido'):'segurança ainda não preenchida',go:'gxseg'});
  return out; }

/* o que está acontecendo, em frases */
function drFrases(T){ const f=[], D=T.D, b=s=>'<b>'+esc(s)+'</b>';
  if(D&&D.tot.mT&&T.fr>=.05){ f.push(`Até agora a fábrica fez ${b(gxT(D.tot.t)+' t')}, ${b((T.pcAg||0)+'%')} do esperado para esta hora (meta do dia: ${esc(gxT(D.tot.mT))} t).${T.proj!=null?` No ritmo atual, fecha o dia perto de ${b(gxT(T.proj)+' t')}.`:''}`); }
  else if(D&&D.tot.t>0) f.push(`Hoje já foram ${b(gxT(D.tot.t)+' t')} (${esc(gxN(D.tot.sc))} sacos).`);
  const lp=linhasOrd().map(l=>({l,a:gxLinhaAgora(l)})).filter(x=>x.a.c==='crit');
  if(lp.length) f.push(lp.map(x=>`A ${b(x.l)} está ${esc(x.a.st.toLowerCase())}: ${esc(x.a.t||'motivo a definir')}.`).join(' '));
  else if(T.par1.tot>=10) f.push(`Hoje foram ${b(gxDur(T.par1.tot))} de paradas${T.par1.mot[0]?`; o motivo que mais pesou foi ${b(T.par1.mot[0].k)} (${esc(gxDur(T.par1.mot[0].v))})`:''}.`);
  if(T.ult){ const U=T.ult.D.tot, pc=U.mT?Math.round(U.t/U.mT*100):null; f.push(`${esc(drDiaCurto(T.ult.d).replace(/^./,c=>c.toUpperCase()))}: ${b(gxT(U.t)+' t')}${pc!=null?`, ${b(pc+'%')} da meta`:''}.`); }
  if(T.mes){ const X=T.mes; f.push(`No mês: ${b(gxT(X.M.tot.t)+' t')} de ${esc(gxT(X.M.tot.mMes))} t previstas${X.pc!=null?` (${b(X.pc+'%')} do esperado até hoje)`:''}.${X.M.rem&&X.falta>0?` Para fechar a meta faltam ${esc(gxT(X.falta))} t em ${X.M.rem} dia${X.M.rem>1?'s':''} út${X.M.rem>1?'eis':'il'}: ${b(gxT(X.porDia)+' t por dia')}.`:''}${X.ant?` Contra o mesmo período de ${esc(gxMesTxt(X.ant.cp).split(' ')[0])}: ${b((X.ant.pc>=0?'+':'')+X.ant.pc+'%')}.`:''}`); }
  const G=T.ag; if(G){ const n=G.dias.reduce((a,d)=>a+d.n,0), pal=G.dias.reduce((a,d)=>a+d.pal,0), val=G.dias.reduce((a,d)=>a+d.val,0);
    if(n) f.push(`Nos próximos dias estão agendados ${b(n+' pedido'+(n>1?'s':''))} (${pal>0?esc(drP(pal))+' paletes, ':''}${esc(drR(val))}). ${G.semMaterial.length?`${b(G.semMaterial.length+(G.semMaterial.length>1?' estão sem material':' está sem material'))}: ${esc([...new Set(G.semMaterial.flatMap(x=>x.itens.map(i=>i.desc||i.cod)))].slice(0,3).join(', '))}.`:'Todos têm material.'}${G.faturado.n?` ${G.faturado.n} já ${G.faturado.n>1?'foram faturados':'foi faturado'} e ainda não ${G.faturado.n>1?'carregaram':'carregou'}.`:''}`); }
  const P=T.pes; if(P){ const fs=P.falt.filter(x=>x.m!=='Férias'); f.push(`Hoje vieram ${b(P.R.vieram+' de '+P.R.esper)} pessoas.${fs.length?` Faltaram: ${esc(fs.slice(0,4).map(x=>x.n.split(' ').slice(0,2).join(' ')).join(', '))}${fs.length>4?' e mais '+(fs.length-4):''}.`:''}${P.nFer?` ${P.nFer} de férias.`:''}`); }
  const C=T.ch; if(C.corr.length||C.prevAtr.length) f.push(`Manutenção: ${b(C.corr.length+' chamado'+(C.corr.length!==1?'s':'')+' aberto'+(C.corr.length!==1?'s':''))}${C.semT.length?`, ${C.semT.length} sem técnico`:''}${C.prevAtr.length?`; ${C.prevAtr.length} preventiva${C.prevAtr.length>1?'s':''} atrasada${C.prevAtr.length>1?'s':''}`:''}.`);
  if(T.com&&T.com.f3) f.push(esc(T.com.f3));
  return f; }

/* ---------- Pergunte ao painel ---------- */
const DR_SUG=['Quanto produzimos ontem?','Como está a linha 1?','Paradas da semana','Quem faltou hoje?','Cargas de amanhã','Chamados abertos','Hora extra do mês','Comparar com o mês passado'];
function drDataDe(n){ const m=n.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/); if(!m) return null; const h=hojeStr(); let y=m[3]?+m[3]:+h.slice(0,4); if(y<100) y+=2000;
  const d=y+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0'); return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:null; }
function drPer(n){ const dt=drDataDe(n); if(dt) return {k:'dia',d:dt}; if(/anteontem/.test(n)) return {k:'dia',d:addDias(hojeStr(),-2)}; if(/ontem/.test(n)) return {k:'ontem'};
  if(/mes passado|mes anterior|ultimo mes/.test(n)) return {k:'mesant'}; if(/semana/.test(n)) return {k:'semana'}; if(/\bano\b/.test(n)) return {k:'ano'}; if(/\bmes\b/.test(n)) return {k:'mes'}; if(/amanha/.test(n)) return {k:'amanha'}; return {k:'hoje'}; }
function drAns(t,v,s,o){ return Object.assign({t,v:v||'',s:s||''},o||{}); }
function drProducao(per){ const h=hojeStr();
  if(per.k==='hoje'){ const D=drDia(h); if(!D) return null; const T={D,fr:drFr()}; const esp=D.tot.mT*T.fr, pc=esp>0?Math.round(D.tot.t/esp*100):null;
    return drAns('Produção de hoje',gxT(D.tot.t)+' t',D.tot.mT?`${pc!=null?pc+'% do esperado para esta hora; ':''}meta do dia ${gxT(D.tot.mT)} t (${gxN(D.tot.sc)} sacos feitos).`:`${gxN(D.tot.sc)} sacos. Sem meta da Curva S para hoje.`,{c:drCor(pc),rows:D.lin.map(x=>[x.l,gxT(x.t)+' t',x.mT?Math.round(x.t/x.mT*100)+'% da meta do dia':'—']),go:'gxprod',goTxt:'Abrir produção agora'}); }
  if(per.k==='ontem'||per.k==='dia'){ const U=per.k==='ontem'?drUltimoDia():{d:per.d,D:drDia(per.d)}; if(!U||!U.D) return drAns('Produção','—','Não achei produção nesse dia.',{c:'neu'});
    const T=U.D.tot, pc=T.mT?Math.round(T.t/T.mT*100):null; return drAns('Produção de '+drDiaCurto(U.d),gxT(T.t)+' t',(pc!=null?pc+'% da meta ('+gxT(T.mT)+' t). ':'')+gxN(T.sc)+' sacos; paradas: '+gxDur(T.par)+'.',{c:drCor(pc),rows:U.D.lin.map(x=>[x.l,gxT(x.t)+' t',x.mT?Math.round(x.t/x.mT*100)+'% da meta':'—',x.par?'parada '+gxDur(x.par):'']),go:'gxdia',goTxt:'Abrir relatório do dia',dia:U.d}); }
  if(per.k==='semana'){ const W=drSemana(); if(!W.length) return null; const t=W.reduce((a,x)=>a+x.D.tot.t,0), m=W.reduce((a,x)=>a+x.D.tot.mT,0), pc=m?Math.round(t/m*100):null;
    return drAns('Produção dos últimos 7 dias',gxT(t)+' t',(pc!=null?pc+'% da meta ('+gxT(m)+' t) · ':'')+W.length+' dias com produção.',{c:drCor(pc),rows:W.map(x=>[drDiaCurto(x.d),gxT(x.D.tot.t)+' t',x.D.tot.mT?Math.round(x.D.tot.t/x.D.tot.mT*100)+'%':'—']),go:'gxdia',goTxt:'Abrir relatórios'}); }
  if(per.k==='mes'||per.k==='mesant'||per.k==='ano'){ const cp=per.k==='mesant'?drMesAnt(h.slice(0,7)):h.slice(0,7), M=drMes(cp);
    if(!M) return drAns('Produção de '+gxMesTxt(cp),'…','Ainda carregando os lançamentos desse mês. Pergunte de novo em alguns segundos.',{c:'neu',go:'gxmes',goTxt:'Abrir relatório do mês'});
    const pc=M.tot.mAte?Math.round(M.tot.t/M.tot.mAte*100):null; const T=drTudo().mes;
    return drAns('Produção de '+gxMesTxt(cp),gxT(M.tot.t)+' t',(per.k==='ano'?'O ano mês a mês está em Produção › Produção do ano. ':'')+(pc!=null?pc+'% do esperado até '+(cp===h.slice(0,7)?'hoje':'o fim do mês')+' ('+gxT(M.tot.mAte)+' t); ':'')+'meta do mês '+gxT(M.tot.mMes)+' t.'+(cp===h.slice(0,7)&&T&&T.ant?' Contra o mesmo período de '+gxMesTxt(T.ant.cp).split(' ')[0]+': '+(T.ant.pc>=0?'+':'')+T.ant.pc+'% ('+gxT(T.ant.t)+' t).':''),
      {c:drCor(pc),rows:M.ls.map(x=>[x.l,gxT(x.t)+' t',x.mAte?Math.round(x.t/x.mAte*100)+'% do esperado':'—',x.mMes?'meta '+gxT(x.mMes)+' t':'']),go:per.k==='ano'?'prodano':'gxmes',goTxt:per.k==='ano'?'Abrir produção do ano':'Abrir relatório do mês'}); }
  return null; }
function drLinha(l,per){ const a=gxLinhaAgora(l), D=drDia(per.k==='dia'?per.d:hojeStr()), x=D&&D.lin.find(y=>y.l===l);
  const o=a.o; return drAns(l,a.st,(a.t||'')+(a.s?' · '+a.s:'')+(x?` Hoje: ${gxT(x.t)} t${x.mT?' de '+gxT(x.mT)+' t da meta ('+Math.round(x.t/x.mT*100)+'%)':''}${x.par?', parada '+gxDur(x.par):''}.`:''),
    {c:a.c==='ok'?'ok':a.c==='crit'?'crit':'neu',rows:(S.ordens||[]).filter(y=>y.linha===l&&!['cancelada','excluida','vinculada'].includes(y.status)&&dataEf(y)===hojeStr()).map(y=>['OP '+y.num,String(y.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,''),gxN(entregueDe(y))+' de '+gxN(+y.total||0)]),go:'gxprod',goTxt:'Abrir produção agora'}); }
function drRespParadas(per){ const dias=per.k==='semana'?7:per.k==='mes'?+hojeStr().slice(8,10):per.k==='ontem'?2:1, P=drParadas(dias), rot=dias===1?'de hoje':dias===2?'de ontem e hoje':dias===7?'dos últimos 7 dias':'do mês';
  const ab=(S.paradas||[]).filter(p=>!p.fim&&!p.anulada&&!gxSetup(p));
  return drAns('Paradas '+rot,gxDur(P.tot),P.n+' parada'+(P.n!==1?'s':'')+' (setup não conta).'+(ab.length?' Paradas agora: '+ab.map(p=>p.linha+' ('+(p.motivo||'a definir')+')').join(', ')+'.':''),{c:ab.length?'crit':P.tot>120?'warn':'ok',rows:P.mot.slice(0,6).map(m=>[m.k,gxDur(m.v),P.tot?Math.round(m.v/P.tot*100)+'%':'']),rows2:P.lin.slice(0,6).map(m=>[m.k,gxDur(m.v)]),go:'gxpar',goTxt:'Abrir paradas'}); }
function drRespChamados(){ const C=drChamados(), pt=[]; if(C.par.length) pt.push(C.par.length+' com máquina parada'); if(C.semT.length) pt.push(C.semT.length+' sem técnico'); if(C.tar.length) pt.push(C.tar.length+' tarefa'+(C.tar.length>1?'s':'')+' do gestor'+(C.venc.length?' ('+C.venc.length+' com prazo vencido)':'')); if(C.prevAtr.length) pt.push(C.prevAtr.length+' preventiva'+(C.prevAtr.length>1?'s':'')+' atrasada'+(C.prevAtr.length>1?'s':''));
  return drAns('Chamados de manutenção',String(C.corr.length)+' aberto'+(C.corr.length!==1?'s':''),pt.length?pt.join('; ')+'.':'Nenhum com máquina parada ou sem técnico.',
  {c:C.par.length?'crit':C.semT.length?'warn':'ok',rows:C.corr.slice().sort((a,b)=>(a.impacto==='parou'?0:1)-(b.impacto==='parou'?0:1)||String(a.criado).localeCompare(String(b.criado))).slice(0,8).map(c=>['OS '+manNum(c.numero)+' · '+(c.linha||c.local||''),String(c.defeito||'').slice(0,60),'há '+C.ha(c)+(c.exec&&c.exec.tecnico?' · '+c.exec.tecnico:' · sem técnico')]),go:'gxch',goTxt:'Abrir chamados'}); }
function drRespPrev(){ let xs=[]; try{ xs=mxPrevStatus(); }catch(e){} const at=xs.filter(x=>x.st==='atrasada'), sem=xs.filter(x=>['hoje','semana','aberta'].includes(x.st));
  return drAns('Preventivas',at.length+' atrasada'+(at.length!==1?'s':''),sem.length+' para esta semana (ou com OS aberta).',{c:at.length?'warn':'ok',rows:at.concat(sem).slice(0,8).map(x=>[(x.p.prox?dm(x.p.prox):'—')+' · '+(x.p.tarefa||''),(x.e&&x.e.nome)||'',x.st==='atrasada'?'Atrasada':x.st==='aberta'?'OS aberta':x.st==='hoje'?'Hoje':'Esta semana']),go:'gxcal',goTxt:'Abrir preventivas'}); }
function drRespPessoas(k){ const P=drPessoas(); if(!P) return drAns('Pessoas','—','A presença de hoje ainda não chegou do RH (Face ID).',{c:'neu',go:'gxpres',goTxt:'Abrir quem está hoje'});
  if(k==='falta') return drAns('Quem faltou hoje',String(P.nFalta),(P.nFalta?'':'Ninguém faltou. ')+'Vieram '+P.R.vieram+' de '+P.R.esper+'.'+(P.nFer?' '+P.nFer+' de férias.':''),{c:P.nFalta>3?'warn':'ok',rows:P.falt.map(x=>[x.n,x.s,x.m]),go:'gxpres',goTxt:'Abrir quem está hoje'});
  if(k==='atraso') return drAns('Chegaram depois do horário',String(P.atr.length),'Horário de entrada: '+(P.D.lim||'—')+'.',{c:P.atr.length?'warn':'ok',rows:P.atr.map(x=>[x.n,x.s,'chegou '+x.c]),go:'gxpres',goTxt:'Abrir quem está hoje'});
  if(k==='mais') return drAns('Quem mais faltou',P.mais.length?P.mais[0].n.split(' ')[0]:'—','Nos últimos '+P.nDias+' dias que o painel tem (sem férias, folga e afastamento).',{c:'neu',rows:P.mais.map(x=>[x.n,x.v+' falta'+(x.v>1?'s':'')]),go:'gxpres',goTxt:'Abrir quem está hoje'});
  return drAns('Presença de hoje',P.R.vieram+' de '+P.R.esper,(P.pc!=null?P.pc+'% vieram; ':'')+P.R.na+' na empresa agora; '+P.nFalta+' faltaram'+(P.nFer?', '+P.nFer+' de férias':'')+'; '+P.atr.length+' chegaram depois do horário.',{c:P.pc==null?'neu':P.pc>=95?'ok':P.pc>=88?'warn':'crit',rows:P.falt.slice(0,10).map(x=>[x.n,x.s,x.m]),go:'gxpres',goTxt:'Abrir quem está hoje'}); }
function drRespPessoa(nome){ const docs=((S.gxPres&&S.gxPres.docs)||[]).slice().sort((a,b)=>b.dia.localeCompare(a.dia)), k=drN(nome); let hoje=null; const hist=[];
  docs.forEach(D=>{ const v=(D.p||[]).find(x=>drN(x.n)===k), f=(D.f||[]).find(x=>drN(x.n)===k); if(D.dia===hojeStr()) hoje={v,f}; if(v) hist.push([drDiaCurto(D.dia),'veio · chegou '+(v.c||'—')+(v.sa?' · já saiu':'')]); else if(f) hist.push([drDiaCurto(D.dia),f.m==='Férias'?'férias':f.m==='Folga'?'folga':f.m==='Afastado'?'afastado':'faltou']); });
  const fal=hist.filter(x=>x[1]==='faltou').length; let he=0; try{ he=window.HoraExtra.horasDe(nome,hojeStr().slice(0,7))||0; }catch(e){}
  const st=hoje&&hoje.v?'Veio hoje':hoje&&hoje.f?(hoje.f.m==='Férias'?'Férias':hoje.f.m==='Folga'?'Folga':hoje.f.m==='Afastado'?'Afastado':'Faltou hoje'):'—';
  return drAns(nome,st,(hoje&&hoje.v?'Chegou '+(hoje.v.c||'—')+(hoje.v.sa?', já saiu':', está na empresa')+'. ':'')+(hoje&&(hoje.v||hoje.f)&&(hoje.v||hoje.f).s?'Setor: '+(hoje.v||hoje.f).s+'. ':'')+fal+' falta'+(fal!==1?'s':'')+' nos últimos '+hist.length+' dias'+(he?'; '+gxN(he,1)+' h de hora extra no mês':'')+'.',{c:hoje&&hoje.v?'ok':'warn',rows:hist.slice(0,10),go:'gxpres',goTxt:'Abrir quem está hoje'}); }
function drNomeNa(q){ const ws=drN(q).split(/[^a-z]+/).filter(w=>w.length>=3&&!DR_PARADA.includes(w)); if(!ws.length) return null; const docs=(S.gxPres&&S.gxPres.docs)||[], nomes=new Set();
  docs.forEach(D=>(D.p||[]).concat(D.f||[]).forEach(x=>x&&x.n&&nomes.add(x.n)));
  const ach=[...nomes].filter(n=>{ const p=drN(n).split(/\s+/); return ws.every(w=>p.some(x=>x===w||(w.length>=4&&x.startsWith(w)))); });
  return ach.length===1?ach[0]:ach.length>1&&ach.length<=8?ach:null; }
const DR_PARADA=['quem','que','qual','quais','como','esta','estao','quanto','quantos','quantas','tem','hoje','ontem','semana','mes','veio','faltou','chegou','sobre','fulano','para','pra','dos','das','com','uma','uns','foi','foram','esta','tudo','todos','pessoa','pessoas','me','fala','mostra','ver'];
function drRespHE(){ const H=drHoraExtra(); if(!H) return null; return drAns('Hora extra de '+gxMesTxt(hojeStr().slice(0,7)),gxN(H.tot,1)+' h',H.n+' autorizaç'+(H.n!==1?'ões':'ão')+' para '+H.pessoas+' pessoa'+(H.pessoas!==1?'s':'')+'.',{c:'neu',rows:H.top.map(x=>[x.n,gxN(x.v,1)+' h']),go:'gxhe',goTxt:'Abrir hora extra'}); }
function drRespAgend(per,n){ const G=drAgend(); if(!G) return drAns('Entregas','—','Os agendamentos ainda não carregaram.',{c:'neu',go:'agendamentos',goTxt:'Abrir agendamentos'});
  if(/sem material|falta material|faltando material/.test(n)) return drAns('Pedidos sem material',String(G.semMaterial.length),G.semMaterial.length?'Agendados sem estoque suficiente (contando a produção programada).':'Todos os pedidos agendados têm material.',{c:G.semMaterial.length?'warn':'ok',rows:G.semMaterial.map(x=>[x.ped+' · '+x.cliente,drDiaCurto(x.data),x.itens.map(i=>i.cod+' falta '+gxN(i.falta)+' '+String(i.un).toLowerCase()).join('; ')]),go:'agendamentos',goTxt:'Abrir agendamentos'});
  if(/faturad/.test(n)) return drAns('Faturado, falta carregar',String(G.faturado.n),G.faturado.n?drR(G.faturado.val)+(G.faturado.pal>0?' · '+drP(G.faturado.pal)+' paletes':'')+'.':'Nenhum pedido faturado esperando carregar.',{c:G.faturado.n?'warn':'ok',rows:G.faturado.lista.map(x=>[x.ped+' · '+x.cliente,drDiaCurto(x.data),drR(x.val)]),go:'agendamentos',goTxt:'Abrir agendamentos'});
  if(/esperando|sem data|aguardando/.test(n)) return drAns('Esperando data',String(G.esperando.n),drR(G.esperando.val)+(G.esperando.podem?' · '+G.esperando.podem+' já têm material para agendar':'')+'.',{c:'neu',rows:G.esperando.lista.slice(0,10).map(x=>[x.ped+' · '+x.cliente,x.emp,drR(x.val)]),go:'agendamentos',goTxt:'Abrir agendamentos'});
  const alvo=per.k==='amanha'?addDias(hojeStr(),1):per.k==='dia'?per.d:per.k==='hoje'&&!/semana|proxim/.test(n)?hojeStr():null;
  if(alvo){ const d=G.dias.find(x=>x.d===alvo); return drAns('Cargas de '+drDiaCurto(alvo),d?d.n+' pedido'+(d.n!==1?'s':''):'Nada agendado',d?(d.pal>0?drP(d.pal)+' paletes · ':'')+drR(d.val)+(d.kg?' · '+gxN(d.kg/1000,1)+' t':'')+(d.semMat?' · '+d.semMat+' sem material':'')+(d.fat?' · '+d.fat+' faturado'+(d.fat>1?'s':''):'')+'.':'',{c:d&&d.semMat?'warn':'ok',go:'agcal',goTxt:'Abrir calendário de cargas'}); }
  const n2=G.dias.reduce((a,d)=>a+d.n,0); return drAns('Entregas dos próximos dias',n2+' pedido'+(n2!==1?'s':''),drR(G.dias.reduce((a,d)=>a+d.val,0))+(G.atrasados.n?' · '+G.atrasados.n+' com data vencida':'')+(G.semMaterial.length?' · '+G.semMaterial.length+' sem material':'')+'.',{c:G.atrasados.n?'crit':G.semMaterial.length?'warn':'ok',rows:G.dias.map(d=>[drDiaCurto(d.d),d.n+' pedido'+(d.n!==1?'s':''),d.pal>0?drP(d.pal)+' pal.':'',drR(d.val)]),go:'agcal',goTxt:'Abrir calendário de cargas'}); }
function drRespNumero(num){ const out=[], A=window.Painel&&window.Painel.agendResumo;
  try{ (A?A.pedido(num):[]).forEach(x=>out.push(drAns('Pedido '+x.ped,x.st,(x.cliente||'')+(x.data?' · '+drDiaCurto(x.data):'')+(x.carga?' · carga '+x.carga:'')+(x.transp?' · '+x.transp:'')+' · '+drR(x.val)+(x.fat?' · faturado':'')+(x.reag?' · '+x.reag:'')+(x.falta&&x.falta.length?' · falta material: '+x.falta.join(', '):'')+'.',{c:x.falta&&x.falta.length?'warn':'ok',rows:x.itens.map(i=>[i.cod,i.desc,gxN(i.q)+' '+String(i.un).toLowerCase()]),go:'agendamentos',goTxt:'Abrir agendamentos'}))); }catch(e){}
  (S.chamados||[]).filter(c=>String(c.numero)===String(+num)).forEach(c=>out.push(drAns('OS '+manNum(c.numero),c.status||'Aberta',(c.linha||c.local||'')+' · '+String(c.defeito||'')+(c.exec&&c.exec.tecnico?' · técnico: '+c.exec.tecnico:'')+(c.criado?' · aberta '+drDiaCurto(gxDiaLocal(c.criado))+' '+hora(c.criado):'')+'.',{c:manFechada(c)?'ok':c.impacto==='parou'?'crit':'warn',go:'gxch',goTxt:'Abrir chamados'})));
  (S.ordens||[]).filter(o=>String(o.num)===String(num)).forEach(o=>{ const f=entregueDe(o), t=+o.total||0; out.push(drAns('Ordem '+o.num,o.status==='concluida'||f>=t?'Concluída':'Em aberto',String(o.produto||'')+' · '+(o.linha||'')+' · '+gxN(f)+' de '+gxN(t)+' feitos'+(o.data?' · data '+dm(o.data):'')+'.',{c:f>=t?'ok':'neu',go:'gxprod',goTxt:'Abrir produção'})); });
  return out.length?Object.assign(out[0],{mais:out.slice(1)}):null; }
function drRespMaterial(q){ const A=window.Painel&&window.Painel.agendResumo, B=(S.anl&&S.anl.base&&S.anl.base.itens&&S.anl.base.itens.l)||null, ws=drN(q).replace(/[?!.,]/g,' ').split(/\s+/).filter(w=>w.length>=2&&!['estoque','saldo','de','do','da','quanto','tem','temos','qual','material','item','esta','como','no','na'].includes(w));
  let xs=[]; try{ xs=A&&ws.length?A.material(ws.join(' ')):[]; }catch(e){}
  let bs=[]; if(B&&ws.length) bs=Object.keys(B).filter(c=>{ const t=drN(c+' '+(B[c].d||'')); return ws.every(w=>t.includes(w)); }).slice(0,8).map(c=>({c,d:B[c].d||'',q:(+B[c].a3||0)+(+B[c].a30||0)}));
  if(!xs.length&&!bs.length) return null;
  const rows=xs.length?xs.map(o=>[o.cod+' · '+o.desc,o.estoque!=null?'estoque '+gxN(o.estoque):'—','agendado '+gxN(o.ag)+(o.pp>0?' ('+drP(o.ag/o.pp)+' pal.)':''),o.sobra!=null?(o.sobra<0?'falta '+gxN(-o.sobra):'sobra '+gxN(o.sobra)):'']):bs.map(b=>[b.c,b.d,'estoque '+gxN(b.q)]);
  const f=xs[0]; return drAns(f?f.cod+' · '+f.desc:bs[0].c+' · '+bs[0].d,f?(f.estoque!=null?gxN(f.estoque)+' '+String(f.un).toLowerCase():'—'):gxN(bs[0].q),f?'Agendado: '+gxN(f.ag)+' em '+f.ped+' pedido'+(f.ped!==1?'s':'')+(f.es?'; esperando data: '+gxN(f.es):'')+(f.sobra!=null?'; '+(f.sobra<0?'falta '+gxN(-f.sobra):'sobra '+gxN(f.sobra))+' depois dos agendados':'')+'.':'Estoque das duas empresas (Almox 3 + 30).',{c:f&&f.sobra!=null&&f.sobra<0?'crit':'ok',rows,go:'agendamentos',goTxt:'Abrir agendamentos'}); }
function drRespSilos(){ let X=null; try{ X=apiSilos(); }catch(e){} if(!X) return drAns('Silos','—','Os silos ainda não carregaram.',{c:'neu',go:'silos',goTxt:'Abrir silos'});
  const t=X.silos.reduce((a,s)=>a+(s.toneladas||0),0); return drAns('Silos',gxT(t)+' t',X.silos.length+' silos.',{c:'neu',rows:X.silos.map(s=>[s.silo,s.material,s.toneladas!=null?gxT(s.toneladas)+' t':'—',s.ocupacao!=null?s.ocupacao+'%':'']),go:'silos',goTxt:'Abrir silos'}); }
function drRespAcoes(){ const A=drAcoes(); return drAns('Plano de ação',A.ab.length+' aberta'+(A.ab.length!==1?'s':''),(A.atr.length?A.atr.length+' com prazo vencido. ':'Nenhuma com prazo vencido. ')+A.ok30+' concluída'+(A.ok30!==1?'s':'')+' nos últimos 30 dias.',{c:A.atr.length?'warn':'ok',rows:A.ab.slice().sort((a,b)=>String(a.prazo||'9').localeCompare(String(b.prazo||'9'))).slice(0,10).map(a=>[a.t||'',a.quem||'',a.prazo?(a.prazo<hojeStr()?'venceu ':'até ')+dm(a.prazo):'sem prazo']),go:'gxacoes',goTxt:'Abrir plano de ação'}); }
function drRespSeg(){ const G=drSeg(); return drAns('Segurança',G.dias!=null?G.dias+' dia'+(G.dias!==1?'s':'')+' sem ocorrência':'Sem ocorrências registradas',G.ocMes+' ocorrência'+(G.ocMes!==1?'s':'')+' no mês'+(G.desvMes?', '+G.desvMes+' desvio'+(G.desvMes!==1?'s':''):'')+'; '+G.regMes+' dia'+(G.regMes!==1?'s':'')+' preenchido'+(G.regMes!==1?'s':'')+(G.hoje?'':'; hoje ainda não preenchido')+'.',{c:G.hoje&&+G.hoje.ocorr?'crit':'ok',go:'gxseg',goTxt:'Abrir segurança'}); }
function drRespPecas(){ const P=drPecas(); const xs=(S.pedpecas||[]).filter(p=>!p.removido&&!['chegou','nao'].includes(p.status)).slice(0,8);
  return drAns('Pedidos de peça',P.n+' em aberto',P.comp+' no compras; '+P.novos+' novo'+(P.novos!==1?'s':'')+' sem resposta'+(P.urg?'; '+P.urg+' urgente'+(P.urg!==1?'s':''):'')+'.',{c:P.urg?'warn':'neu',rows:xs.map(p=>[(typeof ppcItens==='function'?ppcItens(p).map(i=>i.t).join(' · '):p.t||'').slice(0,60),p.porNome||'',(({enviado:'Novo',visto:'Visto',comprar:'Vai comprar',comprado:'Comprado'})[p.status||'enviado'])||p.status||'']),go:'gxpec',goTxt:'Abrir pedidos de peça'}); }
function drRespComercial(){ const F=drComercial(); if(!F) return drAns('Produção × Comercial','—','Os dados do comercial deste mês ainda não carregaram.',{c:'neu',go:'anlcom',goTxt:'Abrir Produção × Comercial'});
  return drAns('Produção × Comercial',gxMesTxt(hojeStr().slice(0,7)),F.f3,{c:'neu',rows:[[F.f1],[F.f2],[F.f4]],go:'anlcom',goTxt:'Abrir Produção × Comercial'}); }
function drResponder(q){ const n=drN(q).trim(); if(!n) return null; const has=(...ws)=>ws.some(w=>n.includes(w)), per=drPer(n);
  const num=(n.match(/\b\d{4,7}\b/)||[])[0]; if(num&&!drDataDe(n)){ const r=drRespNumero(num); if(r) return r; }
  const lm=n.match(/linha\s*(\d+)/); if(lm){ const l=linhasOrd().find(x=>drN(x).replace(/\s+/g,'')==='linha'+lm[1]); if(l) return drLinha(l,per); }
  for(const l of linhasOrd()){ const k=drN(l); if(!/^linha\s*\d/.test(k)&&k.length>3&&n.includes(k)) return drLinha(l,per); }
  if(has('material','estoque')&&has('sem material','falta material','faltando material')) return drRespAgend(per,n);
  if(has('parad','parou')) return drRespParadas(per);
  if(has('preventiv')) return drRespPrev();
  if(has('chamad','manuten','maquina','quebr','conserto',' os ')) return drRespChamados();
  if(has('hora extra','horas extras','hora-extra')) return drRespHE();
  if(has('mais faltou','mais falta','faltam muito','faltou mais')) return drRespPessoas('mais');
  if(has('faltou','faltaram','faltas','quem falt','ausen')) return drRespPessoas('falta');
  if(has('chegou atrasad','chegaram atrasad','atrasou','chegou tarde','chegaram tarde','depois do horario')) return drRespPessoas('atraso');
  if(has('ordens atrasad','ordem atrasad','ops atrasad')){ let at=[]; try{ at=repAtrasadas(); }catch(e){} return drAns('Ordens atrasadas',String(at.length),gxN(at.reduce((a,o)=>a+Math.max(0,(+o.total||0)-entregueDe(o)),0))+' sacos com a data vencida.',{c:at.length?'warn':'ok',rows:at.slice(0,10).map(o=>['OP '+o.num+' · '+(o.linha||''),String(o.produto||'').slice(0,50),'falta '+gxN(Math.max(0,(+o.total||0)-entregueDe(o)))]),go:'gxprod',goTxt:'Abrir produção'}); }
  if(has('presen','vieram','quantas pessoas','quantos vieram','quantos funcion','pessoas hoje','gente hoje')) return drRespPessoas('');
  if(has('carga','carreg','entreg','agend','faturad','esperando data','pedidos')) return drRespAgend(per,n);
  if(has('cliente')){ const A=window.Painel&&window.Painel.agendResumo, c=n.replace(/.*cliente\s*/,''); const xs=A?A.cliente(c):[]; if(xs.length) return drAns('Pedidos de '+xs[0].cliente,xs.length+' em aberto',drR(xs.reduce((a,x)=>a+x.val,0))+'.',{c:'neu',rows:xs.map(x=>[x.ped,x.st,x.data?drDiaCurto(x.data):'',drR(x.val)]),go:'agendamentos',goTxt:'Abrir agendamentos'}); }
  if(has('silo','cimento')) return drRespSilos();
  if(has('plano de acao','plano','acoes','acao')) return drRespAcoes();
  if(has('segur','acidente','ocorrenc','epi')) return drRespSeg();
  if(has('peca','compras')) return drRespPecas();
  if(has('comercial','venda','vendeu','previsao','faturamento')) return drRespComercial();
  if(has('compar')) return drProducao({k:'mes'});
  if(has('estoque','saldo')){ const r=drRespMaterial(q); if(r) return r; }
  if(has('produ','fez','fizemos','fizeram','tonelad','saco','meta','rendeu','rendimento','como estamos','como esta a fabrica','resumo')) return drProducao(per)||drAns('Produção','—','Os lançamentos ainda não carregaram.',{c:'neu'});
  const nm=drNomeNa(q); if(typeof nm==='string') return drRespPessoa(nm); if(Array.isArray(nm)) return drAns('Achei mais de uma pessoa',String(nm.length),'Toque no nome para ver.',{c:'neu',pessoas:nm});
  if(/[a-z]{1,4}\d{2,}/.test(n)||has('argamassa','rejunte','fixcol','ac1','ac2','ac3')){ const r=drRespMaterial(q); if(r) return r; }
  if(per.k!=='hoje') return drProducao(per);
  return drAns('Não entendi a pergunta','','Tente uma destas, ou escreva com outras palavras: produção, linha 2, paradas, chamados, quem faltou, um nome, cargas de amanhã, pedido 146459, estoque de AC3, hora extra, segurança, plano de ação.',{naoEntendi:true,c:'neu'}); }
function drPergunta(q){ q=String(q||'').trim(); S.dr.q=q; let r=null; try{ r=drResponder(q); }catch(e){ console.warn('[diretor] pergunta',e); r=drAns('Não consegui responder','','Algum dado ainda está carregando. Tente de novo em alguns segundos.',{c:'neu',naoEntendi:true}); }
  S.dr.r=r; if(q&&r) S.dr.hist=[{q,t:r.t,v:r.v}].concat(S.dr.hist.filter(x=>x.q!==q)).slice(0,5);
  const el=document.getElementById('dr-resp'); if(el){ el.innerHTML=drRespHtml(); const h=document.getElementById('dr-hist'); if(h) h.innerHTML=drHistHtml(); } }
function drRespHtml(){ const r=S.dr.r; if(!r) return `<p class="dr-dica">Escreva do seu jeito, por exemplo "quanto fizemos ontem?", "como está a linha 2?", "pedido 146459", "estoque de AC3" ou o nome de alguém.</p>`;
  const tb=(rs,cls)=>rs&&rs.length?`<table class="dr-rt ${cls||''}"><tbody>${rs.map(x=>`<tr>${x.map((c,i)=>`<td${i&&i===x.length-1&&x.length>1?' class="dir"':''}>${esc(c==null?'':String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'';
  return `<article class="dr-ans ${r.c||'neu'}" aria-live="polite"><p class="dr-aq">${esc(S.dr.q)}</p><h3>${esc(r.t)}</h3>${r.v?`<p class="dr-av">${esc(r.v)}</p>`:''}<p class="dr-as">${esc(r.s)}</p>
    ${r.pessoas?`<div class="dr-chips">${r.pessoas.map(n=>`<button type="button" class="dr-chip" data-act="dr-pq" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>`:''}
    ${tb(r.rows)}${r.rows2&&r.rows2.length?'<h4>Por linha</h4>'+tb(r.rows2):''}
    ${(r.mais||[]).map(m=>`<div class="dr-amais"><b>${esc(m.t)}: ${esc(m.v)}</b><span>${esc(m.s)}</span></div>`).join('')}
    ${r.naoEntendi?`<div class="dr-chips">${DR_SUG.map(s=>`<button type="button" class="dr-chip" data-act="dr-pq" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>`:''}
    ${r.go?`<button type="button" class="lnk dr-ago" data-go="${esc(r.go)}">${esc(r.goTxt||'Abrir')}</button>`:''}</article>`; }
function drHistHtml(){ const xs=S.dr.hist.slice(1); return xs.length?`<span>Perguntou antes:</span>${xs.map(x=>`<button type="button" class="dr-hq" data-act="dr-pq" data-v="${esc(x.q)}">${esc(x.q)}</button>`).join('')}`:''; }

/* ---------- Início da diretoria ---------- */
function drBarra(v,m){ const p=m>0?Math.max(0,Math.min(100,v/m*100)):0; return `<span class="dr-bar"><i style="width:${p.toFixed(0)}%"></i></span>`; }
function drMesGraf(M){ if(!M) return ''; const ds=M.porDia, mx=Math.max(1,...ds.map(x=>Math.max(x.t||0,x.m||0)),...ds.filter(x=>x.fut).map(()=>0)); const meta=M.R&&M.R.n?M.tot.mMes/M.R.n:0, mx2=Math.max(mx,meta);
  return `<div class="dr-mg" role="img" aria-label="Produção por dia útil do mês contra a meta do dia">${ds.map(x=>{ const h=x.fut?0:(x.t||0)/mx2*86, pc=x.m?(x.t||0)/x.m*100:null;
    return `<div class="dr-mgc${x.fut?' fut':''}" title="${esc(dm(x.d))}: ${x.fut?'ainda não chegou':esc(gxT(x.t||0))+' t'+(x.m?' de '+esc(gxT(x.m))+' t':'')}"><i class="${pc==null?'':pc>=95?'ok':pc>=80?'warn':'crit'}" style="height:${h.toFixed(1)}%"></i><small>${esc(x.d.slice(8,10))}</small></div>`; }).join('')}
    ${meta?`<span class="dr-mgm" style="bottom:calc(18px + ${(meta/mx2*.86).toFixed(4)} * (100% - 18px))"></span>`:''}</div>`; }
function drBloco(id,tit,sub,corpo,go,goTxt){ return `<section class="card dr-b" id="dr-${id}"><header class="dr-bh"><h2>${tit}</h2>${sub?`<span>${sub}</span>`:''}</header>${corpo}${go?`<div class="dr-bf"><button type="button" class="lnk" data-go="${go}">${goTxt||'Ver mais'}</button></div>`:''}</section>`; }
function drLista(rs,vazio){ return rs.length?`<ul class="dr-ls">${rs.map(r=>`<li><div><b>${r[0]}</b>${r[1]?`<span>${r[1]}</span>`:''}</div>${r[2]!=null?`<em class="${r[3]||''}">${r[2]}</em>`:''}</li>`).join('')}</ul>`:`<p class="dr-ok">${vazio}</p>`; }
function vDrInicio(){ const T=drTudo(), ag=new Date(), nome=gxEu().split(' ')[0], sau=ag.getHours()<12?'Bom dia':ag.getHours()<18?'Boa tarde':'Boa noite', e=esc;
  const termo=drTermo(T), fr=drFrases(T), D=T.D, C=T.ch, G=T.ag, P=T.pes, X=T.mes;
  /* hoje, linha por linha */
  const hoje=D&&D.lin.length?`<div class="dr-lin">${linhasOrd().map(l=>{ const x=D.lin.find(y=>y.l===l), a=gxLinhaAgora(l); if(!x&&a.c==='neu') return '';
      return `<div class="dr-li"><div class="dr-lih"><b>${e(l)}</b><span class="dr-pill ${a.c==='ok'?'ok':a.c==='crit'?'crit':a.c==='info'?'info':'neu'}">${e(a.st)}</span></div>${x?drBarra(x.t,x.mT):''}<small>${x?e(gxT(x.t))+' t'+(x.mT?' de '+e(gxT(x.mT))+' t · '+Math.round(x.t/x.mT*100)+'%':''):''}${x&&x.par?' · parada '+e(gxDur(x.par)):''}</small></div>`; }).join('')}</div>`:'<p class="dr-ok">Nenhuma produção lançada hoje ainda.</p>';
  const mes=X?`${drMesGraf(X.M)}<div class="dr-nums"><div><b>${e(gxT(X.M.tot.t))} t</b><span>feito</span></div><div><b>${e(gxT(X.M.tot.mAte))} t</b><span>esperado até hoje</span></div><div><b>${e(gxT(X.M.tot.mMes))} t</b><span>meta do mês</span></div><div><b class="${X.projM>=X.M.tot.mMes?'ok':'warn'}">${e(gxT(X.projM))} t</b><span>no ritmo, fecha em</span></div></div>
      ${X.ant?`<p class="dr-p">Contra o mesmo período de ${e(gxMesTxt(X.ant.cp).split(' ')[0])}: <b class="${X.ant.pc>=0?'ok':'crit'}">${X.ant.pc>=0?'+':''}${X.ant.pc}%</b> (${e(gxT(X.ant.t))} t).</p>`:''}`:'<p class="dr-ok">A previsão do mês ainda não foi importada na Curva S.</p>';
  const mxp=Math.max(1,...T.par7.mot.map(m=>m.v));
  const trava=`${T.par7.mot.length?`<h4>Motivos de parada · 7 dias · ${e(gxDur(T.par7.tot))}</h4><div class="dr-hb">${T.par7.mot.slice(0,5).map(m=>`<div><span>${e(m.k)}</span>${drBarra(m.v,mxp)}<b>${e(gxDur(m.v))}</b></div>`).join('')}</div>`:'<p class="dr-ok">Nenhuma parada nos últimos 7 dias.</p>'}
     <h4>Agora</h4>${drLista([].concat(C.par.map(c=>[e(c.linha||'')+' · máquina parada',e(String(c.defeito||'').slice(0,70))+' · OS '+e(manNum(c.numero)),'há '+e(C.ha(c)),'crit'])).concat(C.semT.filter(c=>c.impacto!=='parou').slice(0,3).map(c=>['OS '+e(manNum(c.numero))+' sem técnico',e((c.linha||'')+' · '+String(c.defeito||'').slice(0,60)),'há '+e(C.ha(c)),'warn'])).concat(C.prevAtr.length?[[C.prevAtr.length+' preventiva'+(C.prevAtr.length>1?'s':'')+' atrasada'+(C.prevAtr.length>1?'s':''),e(C.prevAtr.slice(0,3).map(x=>x.p.tarefa).join(' · ')),'',''+'warn']]:[]),'Nenhuma máquina parada e nenhum chamado esperando técnico.')}`;
  const entregas=G?`<table class="dr-tb"><thead><tr><th>Dia</th><th class="dir">Pedidos</th><th class="dir">Paletes</th><th class="dir">Valor</th><th>Situação</th></tr></thead><tbody>${G.dias.map(d=>`<tr><td>${e(drDiaCurto(d.d))}</td><td class="dir">${d.n}</td><td class="dir">${e(drPal(d.pal))}</td><td class="dir">${e(drR(d.val))}</td><td>${d.semMat?`<span class="dr-pill warn">${d.semMat} sem material</span>`:'<span class="dr-pill ok">com material</span>'}${d.fat?` <span class="dr-pill info">${d.fat} faturado${d.fat>1?'s':''}</span>`:''}</td></tr>`).join('')||'<tr><td colspan="5">Nada agendado.</td></tr>'}</tbody></table>
      ${drLista([].concat(G.atrasados.n?[[G.atrasados.n+' com a data vencida',e(G.atrasados.lista.slice(0,3).map(x=>x.cliente).join(', ')),e(drR(G.atrasados.val)),'crit']]:[]).concat(G.semMaterial.slice(0,4).map(x=>[e(x.ped)+' · '+e(x.cliente),'falta '+e(x.itens.map(i=>(i.desc||i.cod)).join(', ')).slice(0,90),e(drDiaCurto(x.data)),'warn'])).concat(G.faturado.n?[[G.faturado.n+' faturado'+(G.faturado.n>1?'s':'')+', falta carregar',e(G.faturado.lista.slice(0,3).map(x=>x.cliente).join(', ')),e(drR(G.faturado.val)),'info']]:[]).concat(G.esperando.n?[[G.esperando.n+' esperando data',G.esperando.podem?G.esperando.podem+' já têm material para agendar':'',e(drR(G.esperando.val)),'']]:[]),'Tudo agendado tem material.')}`:'<p class="dr-ok">Os agendamentos ainda não carregaram.</p>';
  const H=T.he, pessoas=P?`<div class="dr-nums"><div><b>${P.R.vieram} / ${P.R.esper}</b><span>vieram${P.pc!=null?' · '+P.pc+'%':''}</span></div><div><b>${P.R.na}</b><span>na empresa agora</span></div><div><b class="${P.nFalta?'warn':''}">${P.nFalta}</b><span>faltaram${P.nFer?' · '+P.nFer+' de férias':''}</span></div><div><b class="${P.atr.length?'warn':''}">${P.atr.length}</b><span>chegaram depois</span></div></div>
      ${P.falt.length?`<h4>Não vieram hoje</h4><div class="dr-nomes">${P.falt.map(x=>`<button type="button" class="dr-nome" data-act="dr-pq" data-v="${e(x.n)}">${e(x.n)}<small>${e([x.s,x.m==='Férias'?'férias':''].filter(Boolean).join(' · '))}</small></button>`).join('')}</div>`:''}
      ${P.atr.length?`<h4>Chegaram depois do horário (${e(P.D.lim||'')})</h4><div class="dr-nomes">${P.atr.slice(0,12).map(x=>`<button type="button" class="dr-nome" data-act="dr-pq" data-v="${e(x.n)}">${e(x.n)}<small>${e(x.c)}</small></button>`).join('')}</div>`:''}
      ${P.mais.length?`<h4>Mais faltas nos últimos ${P.nDias} dias</h4>${drLista(P.mais.map(x=>[e(x.n),'',x.v+' faltas','warn']),'')}`:''}`:'<p class="dr-ok">A presença de hoje ainda não chegou do RH (Face ID).</p>';
  const he=H&&H.n?`<h4>Hora extra do mês · ${e(gxN(H.tot,1))} h</h4>${drLista(H.top.map(x=>[e(x.n),'',e(gxN(x.v,1))+' h','']),'')}`:'';
  const Sg=T.seg, sl=Object.values(S.gxSeg||{}).filter(x=>x&&x.data).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,6), seg=`<div class="dr-big ${Sg.hoje&&+Sg.hoje.ocorr?'crit':'ok'}">${Sg.dias!=null?`<b>${Sg.dias}</b><span>dia${Sg.dias!==1?'s':''} sem ocorrência${Sg.ult?' (a última foi em '+e(dm(Sg.ult))+')':''}</span>`:Sg.primeiro?`<b>0</b><span>ocorrências desde ${e(dm(Sg.primeiro))}, quando a segurança começou a ser preenchida</span>`:'<span>A segurança ainda não foi preenchida pelo gestor.</span>'}</div>
      <p class="dr-p">${Sg.ocMes} ocorrência${Sg.ocMes!==1?'s':''} e ${Sg.desvMes} desvio${Sg.desvMes!==1?'s':''} no mês · ${Sg.regMes} dia${Sg.regMes!==1?'s':''} preenchido${Sg.regMes!==1?'s':''}${Sg.hoje?'':' · <b class="warn">hoje ainda não preenchido</b>'}.</p>
      ${sl.length?`<table class="dr-tb"><thead><tr><th>Dia</th><th class="dir">Pessoas</th><th class="dir">EPI</th><th class="dir">Ocorrências</th></tr></thead><tbody>${sl.map(x=>`<tr><td>${e(drDiaCurto(x.data))}</td><td class="dir">${x.pessoas!=null&&x.pessoas!==''?e(String(x.pessoas)):'—'}</td><td class="dir">${x.epi!=null&&x.epi!==''?e(String(x.epi))+'%':'—'}</td><td class="dir">${+x.ocorr?`<b class="warn">${+x.ocorr}</b>`:'0'}</td></tr>`).join('')}</tbody></table>`:''}`;
  const A=T.ac, Pc=T.pec, anda=`${drLista(A.atr.slice(0,5).map(a=>[e(a.t||''),e(a.quem||'sem responsável'),'venceu '+e(dm(a.prazo)),'warn']),A.ab.length?'Nenhuma ação do plano com prazo vencido.':'Nenhuma ação aberta no plano.')}
      <div class="dr-nums sm"><div><b>${A.ab.length}</b><span>ações abertas</span></div><div><b>${A.ok30}</b><span>concluídas em 30 dias</span></div><div><b class="${C.venc.length?'warn':''}">${C.tar.length}</b><span>tarefas da manutenção${C.venc.length?' · '+C.venc.length+' vencidas':''}</span></div><div><b>${Pc.n}</b><span>peças em aberto · ${Pc.comp} no compras</span></div></div>`;
  /* destaques da semana */
  const W=T.sem, melhor=W.filter(x=>x.d!==T.h&&x.D.tot.t>0).slice().sort((a,b)=>b.D.tot.t-a.D.tot.t)[0], lpc={}; W.forEach(x=>x.D.lin.forEach(y=>{ const o=lpc[y.l]=lpc[y.l]||{t:0,m:0}; o.t+=y.t; o.m+=y.mT; }));
  const lr=Object.entries(lpc).filter(([,o])=>o.m>0).map(([l,o])=>({l,pc:Math.round(o.t/o.m*100)})).sort((a,b)=>b.pc-a.pc), pl=T.par7.lin[0];
  const dest=drLista([].concat(melhor?[['Melhor dia: '+e(drDiaCurto(melhor.d)),e(gxT(melhor.D.tot.t))+' t'+(melhor.D.tot.mT?' · '+Math.round(melhor.D.tot.t/melhor.D.tot.mT*100)+'% da meta':''),'','ok']]:[]).concat(lr[0]?[['Linha que mais bateu a meta: '+e(lr[0].l),lr[0].pc+'% da meta na semana','','ok']]:[]).concat(lr.length>1&&lr[lr.length-1].pc<95?[['Mais longe da meta: '+e(lr[lr.length-1].l),lr[lr.length-1].pc+'% da meta na semana','','warn']]:[]).concat(pl?[['Mais tempo parada: '+e(pl.k),e(gxDur(pl.v))+' em 7 dias'+(T.par7.mot[0]?' · motivo que mais pesou na fábrica: '+e(T.par7.mot[0].k):''),'','warn']]:[]),'Ainda sem dados suficientes da semana.');
  return `${banner()}<div class="dr">
    <header class="dr-head"><div><p class="dr-ey">${e(gxDiaTxt(T.h))} · atualizado às ${e(String(ag.getHours()).padStart(2,'0')+':'+String(ag.getMinutes()).padStart(2,'0'))}</p><h1>${sau}${nome?', '+e(nome):''}</h1></div>
      <div class="dr-hb2"><button type="button" class="btn sec" data-act="dr-pdf">${ic('baixar',18,2)}Resumo da semana (PDF)</button></div></header>
    <section class="dr-termo" aria-label="Termômetro da fábrica">${termo.map(t=>`<button type="button" class="dr-t ${t.c}" data-go="${e(t.go)}"><span class="dr-tk"><i></i>${e(t.k)}</span><b>${e(t.v)}</b><small>${e(t.s)}</small></button>`).join('')}</section>
    <div class="dr-top">
      <section class="card dr-fr"><h2>O que está acontecendo</h2>${fr.length?fr.map(x=>`<p>${x}</p>`).join(''):'<p>Os números do dia ainda estão carregando.</p>'}</section>
      <section class="card dr-ask"><h2><label for="dr-q">Pergunte ao painel</label></h2>
        <form class="dr-qf" data-dr-form="1"><input id="dr-q" type="search" autocomplete="off" placeholder="Ex.: quanto fizemos ontem?" value="${e(S.dr.q)}"><button type="submit" class="btn">Perguntar</button></form>
        <div class="dr-chips">${DR_SUG.map(s=>`<button type="button" class="dr-chip" data-act="dr-pq" data-v="${e(s)}">${e(s)}</button>`).join('')}</div>
        <div id="dr-resp">${drRespHtml()}</div><div class="dr-hist" id="dr-hist">${drHistHtml()}</div></section>
    </div>
    <div class="dr-grid">
      ${drBloco('hoje','Hoje, linha por linha',D&&D.tot.mT?e(gxT(D.tot.t))+' t de '+e(gxT(D.tot.mT))+' t'+(T.proj!=null?' · no ritmo, fecha em '+e(gxT(T.proj))+' t':''):'',hoje,'gxprod','Abrir produção agora')}
      ${drBloco('mes','Mês de '+e(gxMesTxt(T.cp).split(' ')[0]),X&&X.pc!=null?X.pc+'% do esperado até hoje':'',mes,'gxmes','Abrir relatório do mês')}
      ${drBloco('trava','O que está travando','',trava,'gxpar','Abrir paradas')}
      ${drBloco('entregas','Entregas e cargas',G?e(drR(G.dias.reduce((a,d)=>a+d.val,0)))+' agendados':'',entregas,'agcal','Abrir calendário de cargas')}
      ${drBloco('pessoas','Pessoas hoje',P?e(P.D.dia===T.h?gxpFonte(P.D):''):'',pessoas+he,'gxpres','Abrir quem está hoje')}
      ${drBloco('seg','Segurança','',seg,'gxseg','Abrir segurança')}
      ${drBloco('anda','Em andamento','plano de ação, manutenção e compras',anda,'gxacoes','Abrir plano de ação')}
      ${drBloco('dest','Destaques da semana','últimos 7 dias',dest,'gxdia','Abrir relatórios')}
    </div></div>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="dr-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='dr-pq'){ ev.preventDefault(); const q=b.dataset.v||''; const i=document.getElementById('dr-q'); if(i) i.value=q; drPergunta(q); const r=document.getElementById('dr-resp'); if(r&&r.scrollIntoView) r.scrollIntoView({block:'nearest',behavior:'smooth'}); }
  if(a==='dr-pdf'){ ev.preventDefault(); drPdf(); } });
document.addEventListener('submit',ev=>{ const f=ev.target; if(!f||!f.dataset||!f.dataset.drForm) return; ev.preventDefault(); const i=document.getElementById('dr-q'); drPergunta(i?i.value:''); });
document.addEventListener('input',ev=>{ if(ev.target&&ev.target.id==='dr-q') S.dr.q=ev.target.value; });

/* ---------- resumo da semana em PDF ---------- */
async function drPdf(){ const PP=window.Painel&&window.Painel.pdf; if(!PP||!PP.novo){ toast('O gerador de PDF ainda não carregou. Tente de novo.'); return; }
  try{ if(!(window.jspdf&&window.jspdf.jsPDF)&&PP.carregar) await PP.carregar(); }catch(e){}
  if(!(window.jspdf&&window.jspdf.jsPDF)){ toast('O gerador de PDF não carregou. Confira a internet e tente de novo.'); return; }
  toast('Montando o resumo da semana…');
  try{ const T=drTudo(), W=T.sem, img=await PP.imgs(), ini=W.length?W[0].d:T.h, Q=PP.novo('Resumo da semana',dm(ini)+' a '+dm(T.h)+'/'+T.h.slice(0,4)+' · Colafix',img); Q.capa();
    const t=W.reduce((a,x)=>a+x.D.tot.t,0), m=W.reduce((a,x)=>a+x.D.tot.mT,0), pc=m?Math.round(t/m*100):null;
    (Q.cabe&&Q.cabe(34)),Q.secao('Números da semana');
    Q.kpis([{t:'Produção',v:gxT(t)+' t',s:pc!=null?pc+'% da meta ('+gxT(m)+' t)':'sem meta',c:pc==null?'pet':pc>=95?'ok':pc>=80?'warn':'crit'},{t:'Paradas',v:gxDur(T.par7.tot),s:T.par7.n+' paradas (setup não conta)'},{t:'Chamados abertos',v:String(T.ch.corr.length),s:T.ch.semT.length+' sem técnico'},{t:'Mês',v:T.mes?gxT(T.mes.M.tot.t)+' t':'—',s:T.mes&&T.mes.pc!=null?T.mes.pc+'% do esperado':''}],4);
    (Q.cabe&&Q.cabe(34)),Q.secao('O que está acontecendo'); drFrases(T).forEach(f=>Q.texto(drTxt(f),{fs:9,c:'ink'}));
    (Q.cabe&&Q.cabe(34)),Q.secao('Produção por dia');
    if(W.length){ const rows=W.map(x=>[drDiaCurto(x.d),gxT(x.D.tot.t)+' t',x.D.tot.mT?gxT(x.D.tot.mT)+' t':'—',x.D.tot.mT?Math.round(x.D.tot.t/x.D.tot.mT*100)+'%':'—',gxDur(x.D.tot.par)]); const tr=['Total',gxT(t)+' t',m?gxT(m)+' t':'—',pc!=null?pc+'%':'—',gxDur(T.par7.tot)]; tr._tot=1; rows.push(tr);
      Q.tabela([{t:'Dia',w:40},{t:'Produzido',w:30,al:'r'},{t:'Meta',w:30,al:'r'},{t:'% da meta',w:24,al:'r'},{t:'Paradas',w:30,al:'r'}],rows); } else Q.vazio('Sem produção lançada na semana.');
    const lpc={}; W.forEach(x=>x.D.lin.forEach(y=>{ const o=lpc[y.l]=lpc[y.l]||{t:0,m:0,par:0}; o.t+=y.t; o.m+=y.mT; o.par+=y.par; }));
    if(Object.keys(lpc).length){ (Q.cabe&&Q.cabe(34)),Q.secao('Por linha'); Q.tabela([{t:'Linha',w:40},{t:'Produzido',w:30,al:'r'},{t:'Meta',w:30,al:'r'},{t:'% da meta',w:24,al:'r'},{t:'Paradas',w:30,al:'r'}],Object.entries(lpc).map(([l,o])=>[l,gxT(o.t)+' t',o.m?gxT(o.m)+' t':'—',o.m?Math.round(o.t/o.m*100)+'%':'—',gxDur(o.par)])); }
    if(T.par7.mot.length){ (Q.cabe&&Q.cabe(34)),Q.secao('Paradas por motivo','últimos 7 dias'); Q.hbar(T.par7.mot.slice(0,8).map(x=>({l:x.k,v:x.v,txt:gxDur(x.v),c:'crit'}))); }
    const G=T.ag; if(G){ (Q.cabe&&Q.cabe(34)),Q.secao('Entregas dos próximos dias'); Q.tabela([{t:'Dia',w:40},{t:'Pedidos',w:20,al:'r'},{t:'Paletes',w:24,al:'r'},{t:'Valor',w:34,al:'r'},{t:'Sem material',w:28,al:'r'}],G.dias.length?G.dias.map(d=>[drDiaCurto(d.d),String(d.n),drPal(d.pal),drR(d.val),d.semMat?String(d.semMat):'—']):[['Nada agendado','','','','']]);
      if(G.semMaterial.length){ Q.texto('Sem material: '+G.semMaterial.map(x=>x.ped+' ('+x.cliente+', '+drDiaCurto(x.data)+')').join('; ')+'.',{fs:8.5,c:'crit'}); } }
    const P=T.pes; if(P){ (Q.cabe&&Q.cabe(34)),Q.secao('Pessoas hoje'); Q.kpis([{t:'Vieram',v:P.R.vieram+' / '+P.R.esper,s:P.pc!=null?P.pc+'%':''},{t:'Faltaram',v:String(P.nFalta),s:P.nFer?P.nFer+' de férias':''},{t:'Chegaram depois',v:String(P.atr.length)},{t:'Hora extra do mês',v:T.he?gxN(T.he.tot,1)+' h':'—'}],4);
      if(P.falt.length) Q.tabela([{t:'Não veio',w:70},{t:'Setor',w:50},{t:'Motivo',w:34}],P.falt.map(x=>[x.n,x.s,x.m])); }
    (Q.cabe&&Q.cabe(34)),Q.secao('Segurança e plano de ação'); const Sg=T.seg; Q.texto((Sg.dias!=null?Sg.dias+' dias sem ocorrência. ':Sg.primeiro?'Nenhuma ocorrência desde '+dm(Sg.primeiro)+'. ':'Segurança ainda não preenchida. ')+Sg.ocMes+' ocorrência(s) no mês. Plano de ação: '+T.ac.ab.length+' abertas, '+T.ac.atr.length+' com prazo vencido.',{fs:9,c:'ink'});
    if(T.ac.atr.length) Q.tabela([{t:'Ação',w:90},{t:'Responsável',w:40},{t:'Prazo',w:24,al:'r'}],T.ac.atr.slice(0,12).map(a=>[a.t||'',a.quem||'',dm(a.prazo)]));
    Q.fim('Resumo-semana-'+T.h+'.pdf'); }catch(e){ console.warn('[diretor] pdf',e); toast('Não deu para gerar o PDF: '+((e&&e.message)||e)); } }

try{ document.head.insertAdjacentHTML('beforeend',`<style id="dr-css">
.dr{display:flex;flex-direction:column;gap:16px}
.dr-head{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;justify-content:space-between}.dr-head h1{margin:2px 0 0;font-size:clamp(26px,3.4vw,34px);line-height:1.1}
.dr-ey{margin:0;color:var(--muted);font-size:14px}.dr-hb2{display:flex;gap:8px;flex-wrap:wrap}
.dr-termo{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
.dr-t{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:2px;padding:12px 14px 13px;border-radius:14px;background:var(--surface,#fff);border:1px solid var(--line);border-top:5px solid var(--line);min-height:112px}
.dr-t:focus-visible{outline:3px solid var(--teal);outline-offset:2px}.dr-t:hover{border-color:var(--teal)}
.dr-t.ok{border-top-color:var(--ok)}.dr-t.warn{border-top-color:var(--warn)}.dr-t.crit{border-top-color:var(--crit)}
.dr-tk{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);font-weight:600}.dr-tk i{width:9px;height:9px;border-radius:50%;background:var(--line)}
.dr-t.ok .dr-tk i{background:var(--ok)}.dr-t.warn .dr-tk i{background:var(--warn)}.dr-t.crit .dr-tk i{background:var(--crit)}
.dr-t b{font-size:clamp(22px,2.4vw,28px);line-height:1.15;font-variant-numeric:tabular-nums}.dr-t small{font-size:13px;color:var(--muted);line-height:1.35}
.dr-top{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}
.dr-fr h2,.dr-ask h2,.dr-bh h2{margin:0;font-size:17px}.dr-fr p{margin:10px 0 0;font-size:16px;line-height:1.6}.dr-fr b{font-variant-numeric:tabular-nums}
.dr-ask{border:2px solid color-mix(in srgb,var(--teal) 45%,var(--line))}.dr-qf{display:flex;gap:8px;margin:10px 0 8px}.dr-qf input{flex:1;font-size:16px;min-height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface,#fff);color:inherit}
.dr-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.dr-chip{font:inherit;font-size:13.5px;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:transparent;color:inherit;cursor:pointer;min-height:36px}.dr-chip:hover{border-color:var(--teal);color:var(--teal)}
.dr-dica{color:var(--muted);margin:8px 0 0;font-size:14px}
.dr-ans{margin-top:10px;padding:14px 16px;border-radius:12px;background:color-mix(in srgb,var(--teal) 6%,transparent);border-left:5px solid var(--line)}
.dr-ans.ok{border-left-color:var(--ok)}.dr-ans.warn{border-left-color:var(--warn)}.dr-ans.crit{border-left-color:var(--crit)}
.dr-aq{margin:0;color:var(--muted);font-size:13px}.dr-ans h3{margin:2px 0 0;font-size:15px}.dr-av{margin:2px 0;font-size:clamp(24px,3vw,30px);font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums}.dr-as{margin:4px 0 0;line-height:1.5}
.dr-ans h4{margin:12px 0 2px;font-size:13px;color:var(--muted)}
.dr-rt{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px}.dr-rt td{padding:6px 8px 6px 0;border-top:1px solid var(--line);vertical-align:top}.dr-rt td.dir{text-align:right;white-space:nowrap}
.dr-amais{margin-top:10px;display:flex;flex-direction:column}.dr-amais span{color:var(--muted);font-size:14px}.dr-ago{margin-top:10px}
.dr-hist{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font-size:13px;color:var(--muted)}.dr-hq{font:inherit;font-size:13px;border:0;background:none;color:var(--teal);cursor:pointer;text-decoration:underline;padding:4px}
.dr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.dr-b{display:flex;flex-direction:column;gap:6px}.dr-bh{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px}.dr-bh span{color:var(--muted);font-size:13.5px}
.dr-b h4{margin:12px 0 4px;font-size:13.5px;color:var(--muted);font-weight:600}.dr-bf{margin-top:auto;padding-top:8px}
.dr-bar{display:block;height:8px;border-radius:999px;background:color-mix(in srgb,var(--line) 70%,transparent);overflow:hidden}.dr-bar i{display:block;height:100%;border-radius:999px;background:var(--teal)}
.dr-lin{display:flex;flex-direction:column;gap:12px;margin-top:6px}.dr-li small{color:var(--muted);font-size:13px;display:block;margin-top:4px}.dr-lih{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px}
.dr-pill{font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;white-space:nowrap;background:color-mix(in srgb,var(--line) 60%,transparent)}
.dr-pill.ok{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok-ink,var(--ok))}.dr-pill.warn{background:color-mix(in srgb,var(--warn) 22%,transparent);color:var(--warn-ink,var(--warn))}
.dr-pill.crit{background:color-mix(in srgb,var(--crit) 18%,transparent);color:var(--crit-ink,var(--crit))}.dr-pill.info{background:color-mix(in srgb,var(--teal) 15%,transparent);color:var(--teal)}
.dr-mg{position:relative;display:flex;align-items:flex-end;gap:3px;height:150px;padding-bottom:18px;margin-top:8px}
.dr-mgc{flex:1;height:100%;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}.dr-mgc i{display:block;width:100%;max-width:22px;border-radius:4px 4px 0 0;background:var(--teal);min-height:1px}
.dr-mgc i.ok{background:var(--ok)}.dr-mgc i.warn{background:var(--warn)}.dr-mgc i.crit{background:var(--crit)}.dr-mgc.fut i{background:transparent}
.dr-mgc small{position:absolute;bottom:-18px;font-size:10.5px;color:var(--muted)}.dr-mgm{position:absolute;left:0;right:0;border-top:2px dashed var(--ink);opacity:.45;pointer-events:none}
.dr-nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}.dr-nums div{display:flex;flex-direction:column}.dr-nums b{font-size:20px;font-variant-numeric:tabular-nums;line-height:1.2}.dr-nums span{font-size:12.5px;color:var(--muted)}
.dr-nums.sm b{font-size:18px}.dr-nums b.ok,.dr-p b.ok{color:var(--ok-ink,var(--ok))}.dr-nums b.warn,.dr-p b.warn{color:var(--warn-ink,var(--warn))}.dr-p b.crit{color:var(--crit-ink,var(--crit))}
.dr-p{margin:8px 0 0;line-height:1.5}
.dr-hb{display:flex;flex-direction:column;gap:7px}.dr-hb div{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:10px;align-items:center;font-size:14px}.dr-hb b{font-variant-numeric:tabular-nums;white-space:nowrap}.dr-hb .dr-bar i{background:var(--crit)}
.dr-ls{list-style:none;margin:0;padding:0}.dr-ls li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--line)}.dr-ls li:first-child{border-top:0}
.dr-ls li div{display:flex;flex-direction:column;min-width:0}.dr-ls li span{font-size:13px;color:var(--muted)}.dr-ls em{font-style:normal;font-size:13px;white-space:nowrap;color:var(--muted)}
.dr-ls em.crit{color:var(--crit-ink,var(--crit));font-weight:600}.dr-ls em.warn{color:var(--warn-ink,var(--warn));font-weight:600}.dr-ls em.info{color:var(--teal);font-weight:600}
.dr-ok{color:var(--muted);margin:6px 0}
.dr-tb{width:100%;border-collapse:collapse;font-size:14px;margin:6px 0 4px}.dr-tb th{font-size:12px;color:var(--muted);text-align:left;font-weight:600;padding:4px 6px;border-bottom:1px solid var(--line)}.dr-tb td{padding:7px 6px;border-bottom:1px solid var(--line)}.dr-tb .dir{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.dr-nomes{display:flex;flex-wrap:wrap;gap:6px}.dr-nome{font:inherit;font-size:13.5px;text-align:left;display:flex;flex-direction:column;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;cursor:pointer}.dr-nome small{font-size:11.5px;color:var(--muted)}.dr-nome:hover{border-color:var(--teal)}
.dr-big{display:flex;align-items:baseline;gap:10px;margin-top:4px}.dr-big b{font-size:44px;line-height:1;font-variant-numeric:tabular-nums}.dr-big.ok b{color:var(--ok-ink,var(--ok))}.dr-big.crit b{color:var(--crit-ink,var(--crit))}.dr-big span{color:var(--muted)}
.dr-nv{margin:4px 12px 10px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;background:color-mix(in srgb,var(--teal) 14%,transparent);color:inherit}
@media(max-width:1300px){.dr-termo{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1000px){.dr-top,.dr-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:600px){.dr-termo{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dr-t{min-height:96px;padding:10px 12px}.dr-nums{grid-template-columns:repeat(2,minmax(0,1fr))}.dr-qf{flex-direction:column}.dr-qf .btn{width:100%}
  .dr-tb th:nth-child(4),.dr-tb td:nth-child(4){display:none}.dr-hb div{grid-template-columns:minmax(0,1fr) auto}.dr-hb .dr-bar{grid-column:1/-1;grid-row:2}.dr-hb b{grid-row:1;grid-column:2}}
@media(max-width:600px){.dr-rt tr{display:flex;flex-direction:column;padding:7px 0;border-top:1px solid var(--line)}.dr-rt td{border:0;padding:1px 0}.dr-rt td.dir{text-align:left;white-space:normal}.dr-rt td:first-child{font-weight:600}
  .dr-mgc:nth-child(even) small{display:none}.dr-ans{overflow-wrap:anywhere}}
@media(prefers-reduced-motion:no-preference){.dr-ans{animation:drIn .25s ease-out}@keyframes drIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}}
</style>`); }catch(e){}
try{ window.Painel=window.Painel||{}; window.Painel.diretor={ solo:()=>drSolo(), responder:q=>drResponder(q), tudo:()=>drTudo(), pdf:()=>drPdf() }; }catch(e){}
