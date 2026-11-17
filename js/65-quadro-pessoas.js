/* Painel Colafix · 65-quadro-pessoas.js (27/10) — "Quadro de pessoas" do Marcelo (o quadro branco onde ele aloca
   os funcionários por linha/setor para decidir quem fica e quem sai).
   Visão do gestor › Pessoas › Quadro de pessoas (tela gxqd).
   - Colunas = linhas/setores (dá para criar, renomear, mudar de lugar e apagar). Começa com as linhas do painel + setores comuns.
   - Pessoas: escolhidas da lista do RH (presença do Face ID publicada pelo RH: cadastro ativo, sem CPF) ou digitadas.
   - Arrastar o nome de uma coluna para outra (ou para outra posição na mesma coluna); no celular, tocar no nome e escolher.
   - Cada pessoa: Fica (verde) · Em dúvida (âmbar) · Em espera (azul) · Não efetivo (roxo) · Sai (vermelho), e uma observação curta (ex.: "Empilhadeira").
   - Os números do alto filtram: tocar destaca só quem está naquela situação (S.qd.fil).
   - Imprimir/PDF: "Só a distribuição" (para o mural, sem as decisões) ou "Com as decisões".
   Dados: gxquadro/atual {cols:[{id,nome,ps:[{id,n,obs,st}]}], em, por, porNome} — coleção protegida no firestore.rules
   (só a dona e quem tem a Visão do gestor; publicar as regras). */
"use strict";
S.qd={dados:null,sub:false,sel:null,q:'',add:null,ed:null,salv:0,drag:null,rasc:'',fil:'',busca:'',emp:'',vin:'',hab:'',painel:'',metaEd:null,cmp:null,cad:null,lido:false,cdrag:null,ldrag:null,lvSel:null,lvq:'',arEd:null,arx:null};
/* situações (16/11/2026, pedido do Marcelo: "em espera" e "não efetivo"). i = símbolo do botão; pl = como aparece nos números e na impressão */
const QD_ST={fica:{t:'Fica',c:'ok',i:'✓',pl:'ficam'},duv:{t:'Em dúvida',c:'warn',i:'?',pl:'em dúvida'},esp:{t:'Em espera',c:'esp',i:'◷',pl:'em espera'},nef:{t:'Não efetivo',c:'nef',i:'NE',pl:'não efetivos'},sai:{t:'Sai',c:'crit',i:'✕',pl:'saem'}};
const QD_PADRAO=['Rejunte','Fixcol','Área líquida','Almoxarifado','Expedição','Argamassa geral','Premix','Cargas rejunte'];
function qdId(){ return Math.random().toString(36).slice(2,9); }
function qdPode(){ try{ return !!(S.acs&&S.acs.dono)||viewOk('gxqd'); }catch(e){ return false; } }
function qdIni(){ let ls=[]; try{ ls=linhasOrd().filter(l=>/^linha\s*\d/i.test(l)); }catch(e){} if(!ls.length) ls=['Linha 1','Linha 2','Linha 3'];
  const nomes=[...ls]; QD_PADRAO.forEach(n=>{ if(!nomes.some(x=>qdK(x)===qdK(n))) nomes.push(n); });
  return {cols:nomes.map(n=>({id:qdId(),nome:n,ps:[]}))}; }
function qdK(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); }
function qdD(){ if(!S.qd.dados) S.qd.dados=qdIni(); return S.qd.dados; }
function qdAssina(){ if(S.qd.sub||!S.db||!qdPode()) return; S.qd.sub=true;
  inscrever('gxquadro',()=>S.db.collection('gxquadro').doc('atual'),snap=>{ const d=snap&&snap.exists?snap.data():null;
    if(d&&Array.isArray(d.cols)&&!(S.qd.salv&&Date.now()-S.qd.salv<2500)) S.qd.dados={cols:d.cols,areas:d.areas||null,em:d.em,porNome:d.porNome,hist:d.hist||[],versoes:d.versoes||[]}; S.qd.lido=true; rerenderSeguro(); });
  inscrever('qdcad',()=>S.db.collection('presenca').doc('cadastro'),snap=>{ S.qd.cad=snap&&snap.exists?((snap.data()||{}).cad||[]):[]; rerenderSeguro(); }); }
let _qdT=null;
function qdGrava(){ const D=qdD(); S.qd.dados=D; S.qd.salv=Date.now(); clearTimeout(_qdT);
  _qdT=setTimeout(async()=>{ try{ await S.db.collection('gxquadro').doc('atual').set({cols:D.cols,areas:qdAreas(),hist:(D.hist||[]).slice(-300),versoes:D.versoes||[],em:new Date().toISOString(),por:(S.user&&S.user.uid)||'',porNome:(typeof gxEu==='function'?gxEu():'')||''}); S.qd.salv=Date.now(); D.em=new Date().toISOString(); D.porNome=(typeof gxEu==='function'?gxEu():'')||''; const el=document.getElementById('qd-salvo'); if(el) el.textContent='Salvo agora'; }
    catch(e){ toast('Não deu para salvar o quadro: '+(e&&e.message||e)); } },500); }
function qdLev(a,b){ if(Math.abs(a.length-b.length)>2) return 9; let v=[...Array(b.length+1).keys()]; for(let i=1;i<=a.length;i++){ const w=[i]; for(let j=1;j<=b.length;j++) w[j]=Math.min(v[j]+1,w[j-1]+1,v[j-1]+(a[i-1]===b[j-1]?0:1)); v=w; } return v[b.length]; }
/* mesma pessoa com grafia diferente (NARCISO/NARCIZO, nome do Face ID × cadastro) */
function qdMesma(x,y){ const a=qdK(x), b=qdK(y); if(!a||!b) return false; if(a===b) return true;
  const pa=a.split(' '), pb=b.split(' '); if(pa[0]!==pb[0]) return false;
  if(pa.length>1&&pb.length>1&&pa[pa.length-1]===pb[pb.length-1]) return true;
  return a.length>=10&&qdLev(a,b)<=2; }
function qdPessoasRH(){ const ds=((S.gxPres&&S.gxPres.docs)||[]).slice().sort((a,b)=>String(b.dia).localeCompare(String(a.dia))); const L=[];
  for(const d of ds){ (d.p||[]).concat(d.f||[]).forEach(p=>{ if(!p||!p.n) return; const x=L.find(o=>qdMesma(o.n,p.n));
      if(!x){ L.push({n:p.n,s:p.s||'',e:p.e||''}); return; }
      if(!x.s&&p.s) x.s=p.s; if(!x.e&&p.e) x.e=p.e; if(p.n.split(/\s+/).length>x.n.split(/\s+/).length) x.n=p.n; }); }
  return L.sort((a,b)=>a.n.localeCompare(b.n,'pt-BR')); }
function qdOnde(n){ for(const c of qdD().cols){ if(c.ps.some(p=>qdMesma(p.n,n))) return c.nome; } return null; }
function qdTot(){ const t={n:0,fica:0,duv:0,esp:0,nef:0,sai:0,sem:0}; qdD().cols.forEach(c=>c.ps.forEach(p=>{ t.n++; if(p.st&&t[p.st]!=null) t[p.st]++; else t.sem++; })); return t; }
function qdAddPainel(){ const cid=S.qd.add; if(!cid) return ''; const col=qdD().cols.find(c=>c.id===cid); if(!col){ S.qd.add=null; return ''; }
  const rh=qdPessoasRH(), q=qdK(S.qd.q);
  const lis=rh.filter(p=>!q||q.split(' ').every(w=>qdK(p.n).split(' ').some(x=>x.startsWith(w)))).slice(0,80);
  return `<div class="qd-sp card"><div class="qd-sph"><div><div class="eyebrow">PÔR NA COLUNA</div><h3>${esc(col.nome)}</h3></div><button class="btn sec" data-act="qd-fecha">Fechar</button></div>
    <label><span>Procurar no RH ou digitar o nome</span><input class="txt" id="qd-q" autocomplete="off" placeholder="Nome" value="${esc(S.qd.q)}"></label>
    <div><button class="btn" id="qd-addtxt-b" data-act="qd-addtxt" ${String(S.qd.q||'').trim().length>1?'':'hidden'}>+ Pôr "<span>${esc(String(S.qd.q||'').trim())}</span>" do jeito que digitei</button></div>
    <div class="qd-rh">${rh.length?(lis.length?lis.map(p=>{ const on=qdOnde(p.n); return `<button class="qd-rp ${on?'ja':''}" data-act="qd-addrh" data-v="${esc(p.n)}"><b>${esc(p.n)}</b><small>${esc([p.s,p.e].filter(Boolean).join(' · '))}${on?` · já está em ${esc(on)}`:''}</small></button>`; }).join(''):'<div class="sub">Ninguém com esse nome no RH. Use o botão acima para pôr do jeito que digitou.</div>')
      :'<div class="sub">A lista do RH aparece quando o RH já publicou a presença do Face ID. Por enquanto, digite o nome.</div>'}</div></div>`; }
/* ===== 17/11/2026 · Quadro de pessoas: informações da pessoa, presença de hoje, metas por coluna, espera com motivo e prazo,
   habilidades, busca e filtros, histórico, versões e Excel (pedido do Marcelo: "faz tudo menos o 9").
   Dados da pessoa vêm de presenca/cadastro (publicado pelo painel do RH, sem CPF) e de presenca/{dia} (Face ID). ===== */
const QD_ESP=['Exame admissional','Documentos','Treinamento','Integração','Aprovação da vaga','Volta de afastamento','Outro'];
const QD_HAB=['Empilhadeira','Operador de máquina','Ensacadeira','Paleteira','Conferente','Líder','Carregamento'];
function qdCap(s){ return String(s||'').toLowerCase().replace(/(^|\s)\S/g,x=>x.toUpperCase()); }
function qdCadDe(n){ return (S.qd.cad||[]).find(c=>qdMesma(c.n,n))||null; }
function qdInfo(n){ const cad=qdCadDe(n), rh=(S.qd._rh||[]).find(p=>qdMesma(p.n,n))||null, h=hojeStr(), ds=(S.gxPres&&S.gxPres.docs)||[];
  const dh=ds.find(x=>x.dia===h); let hoje='';
  if(dh){ if((dh.p||[]).some(x=>qdMesma(x.n,n))) hoje='veio'; else { const f=(dh.f||[]).find(x=>qdMesma(x.n,n)); if(f) hoje=/f[ée]rias/i.test(f.m||'')?'ferias':f.m==='Sem registro'?'faltou':''; } }
  let faltas=0, dias=0; ds.forEach(d=>{ if(d.exp===false) return; dias++; if((d.f||[]).some(x=>qdMesma(x.n,n)&&x.m==='Sem registro')) faltas++; });
  const e=(cad&&cad.e)||(rh&&rh.e)||'', v=(cad&&cad.v)||(e?(qdK(e)==='COLAFIX'?'CLT':'PJ'):'');
  return {cad,e,v,s:(cad&&cad.s)||(rh&&rh.s)||'',fn:(cad&&cad.fn)||'',hoje,faltas,dias}; }
function qdCasa(adm){ if(!adm) return ''; const a=new Date(adm+'T12:00'), b=new Date(hojeStr()+'T12:00'); let m=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth()); if(b.getDate()<a.getDate()) m--;
  if(m<1){ const d=Math.round((b-a)/864e5); return d<=0?'entrou hoje':d+(d===1?' dia':' dias')+' de casa'; }
  const y=Math.floor(m/12), r=m%12; return (y?y+(y===1?' ano':' anos'):'')+(y&&r?' e ':'')+(r?r+(r===1?' mês':' meses'):'')+' de casa'; }
function qdHabTodas(){ const s=new Set(QD_HAB); qdD().cols.forEach(c=>c.ps.forEach(p=>(p.hab||[]).forEach(h=>s.add(h)))); return [...s]; }
function qdLog(t){ const D=qdD(); D.hist=(D.hist||[]); D.hist.push({em:new Date().toISOString(),por:(typeof gxEu==='function'?gxEu():'')||'',t:String(t).slice(0,160)}); if(D.hist.length>300) D.hist=D.hist.slice(-300); }
function qdMetaDe(c){ const at=c.ps.filter(p=>p.st!=='sai').length, meta=+c.meta||0; return {at,meta,df:meta?at-meta:0}; }
function qdEspVenc(){ const h=hojeStr(), out=[]; qdD().cols.forEach(c=>c.ps.forEach(p=>{ if(p.st==='esp'&&p.espAte&&p.espAte<h) out.push({p,c}); })); return out; }
function qdCard(c,p,i){ const st=QD_ST[p.st], I=qdInfo(p.n), h=hojeStr(), habs=p.hab||[];
  const inf=[]; if(I.v) inf.push(esc(I.v==='PJ'&&I.e?'PJ · '+qdCap(I.e):I.v));
  if(I.cad&&I.cad.adm) inf.push(esc(qdCasa(I.cad.adm)));
  if(I.cad&&I.cad.exp&&I.cad.exp.fim){ const f=I.cad.exp.fim; inf.push(`<b class="${f<h?'c':f<=addDias(h,15)?'w':''}">${f<h?'experiência venceu '+dm(f):'experiência até '+dm(f)}</b>`); }
  if(I.cad&&I.cad.pz){ const f=I.cad.pz; inf.push(`<b class="${f<h?'c':f<=addDias(h,15)?'w':''}">contrato até ${dm(f)}</b>`); }
  if(I.faltas) inf.push(`<b class="w">${I.faltas} falta${I.faltas>1?'s':''} em ${I.dias} dia${I.dias>1?'s':''}</b>`);
  const venc=p.st==='esp'&&p.espAte&&p.espAte<h;
  const tag=p.st==='esp'?`<em class="qd-tag esp ${venc?'venc':''}">Em espera${p.espMot?' · '+esc(p.espMot):''}${p.espAte?(venc?' · venceu ':' · até ')+dm(p.espAte):''}</em>`:p.st==='nef'?'<em class="qd-tag nef">Não efetivo</em>':'';
  const ht=({veio:'Veio hoje',faltou:'Não veio hoje (sem registro no Face ID)',ferias:'De férias'})[I.hoje]||'Sem informação de hoje';
  const av=`<span class="qd-pav${I.hoje?' qd-dot '+I.hoje:''}" title="${ht}" aria-hidden="true">${esc(qdIniN(p.n).toUpperCase())}</span>`;
  return `<div class="qd-p ${p.st?'st-'+p.st:'st-sem'} ${S.qd.sel===p.id?'sel':''}" draggable="true" data-qdp="${esc(p.id)}" data-qdc="${esc(c.id)}" data-b="${esc(qdK([p.n,p.obs,habs.join(' '),I.e,I.s,I.fn,p.espMot].join(' ')))}" data-e="${esc(qdK(I.e))}" data-vi="${esc(I.v)}" data-h="|${esc(habs.map(qdK).join('|'))}|">
    <div class="qd-pr">${av}<button class="qd-nm" data-act="qd-sel" data-v="${esc(p.id)}" title="${esc(p.n)} · ${ht} · toque para mover, marcar ou anotar"><span class="qd-nmt">${esc(qdNomeV(p.n))}</span>${p.obs?`<small>${esc(p.obs)}</small>`:''}${inf.length?`<span class="qd-inf">${inf.join('<i> · </i>')}</span>`:''}${tag}${habs.length?`<span class="qd-hbs">${habs.slice(0,3).map(x=>`<em class="qd-hb">${esc(x)}</em>`).join('')}${habs.length>3?`<em class="qd-hb">+${habs.length-3}</em>`:''}</span>`:''}</button></div>
    <span class="qd-sts">${Object.entries(QD_ST).map(([k,v])=>`<button class="qd-st ${v.c} ${p.st===k?'on':''}" data-act="qd-st" data-v="${esc(p.id)}" data-st="${k}" title="${v.t}" aria-label="${v.t}" aria-pressed="${p.st===k}">${v.i}<span class="qd-stl">${QD_STC[k]||''}</span></button>`).join('')}</span></div>`; }
const QD_STC={fica:'Fica',duv:'Dúvida',esp:'Espera',nef:'',sai:'Sai'};
const QD_MIN=new Set(['de','da','do','das','dos','e']);
function qdNomeV(n){ return String(n||'').toLowerCase().split(/\s+/).filter(Boolean).map((w,i)=>i&&QD_MIN.has(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
function qdPessoaInfo(p){ const I=qdInfo(p.n), h=hojeStr(), L=[];
  if(I.v) L.push(['Vínculo',I.v+(I.e?' · '+qdCap(I.e):'')]); if(I.fn) L.push(['Função',I.fn]); if(I.s) L.push(['Setor no RH',I.s]);
  if(I.cad&&I.cad.adm) L.push(['Admissão',dm(I.cad.adm)+'/'+I.cad.adm.slice(0,4)+' · '+qdCasa(I.cad.adm)]);
  if(I.cad&&I.cad.exp&&I.cad.exp.fim) L.push(['Experiência',(I.cad.exp.et===2?'2ª etapa':'1ª etapa')+(I.cad.exp.fim<h?' venceu em ':' até ')+dm(I.cad.exp.fim)]);
  if(I.cad&&I.cad.pz) L.push(['Contrato até',dm(I.cad.pz)]);
  if(I.dias) L.push(['Faltas',I.faltas?I.faltas+' sem registro no Face ID nos últimos '+I.dias+' dias':'nenhuma nos últimos '+I.dias+' dias']);
  if(I.hoje) L.push(['Hoje',({veio:'veio',faltou:'não veio (sem registro)',ferias:'de férias'})[I.hoje]]);
  if(!L.length) return `<div class="sub" style="margin:0">${S.qd.cad?'Não achei esta pessoa no cadastro do RH (nome digitado à mão?).':'As informações do RH aparecem quando o painel do RH estiver aberto em algum computador.'}</div>`;
  return `<dl class="qd-dl">${L.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`; }
function qdSelPainel(){ const id=S.qd.sel; if(!id) return ''; let col=null,p=null; qdD().cols.forEach(c=>c.ps.forEach(x=>{ if(x.id===id){ col=c; p=x; } })); if(!p){ S.qd.sel=null; return ''; }
  const habs=p.hab||[];
  return `<div class="qd-sp card"><div class="qd-sph"><div><div class="eyebrow">${esc(col.nome)}</div><h3>${esc(p.n)}</h3></div><button class="btn sec" data-act="qd-fecha">Fechar</button></div>
    ${qdPessoaInfo(p)}
    <label><span>Situação</span><div class="seg qd-seg">${Object.entries(QD_ST).map(([k,v])=>`<button aria-pressed="${p.st===k}" data-act="qd-st" data-v="${esc(p.id)}" data-st="${k}">${v.t}</button>`).join('')}<button aria-pressed="${!p.st}" data-act="qd-st" data-v="${esc(p.id)}" data-st="">Sem marcar</button></div></label>
    ${p.st==='esp'?`<div class="qd-esp"><label><span>Esperando o quê?</span><input class="txt" id="qd-espm" list="qd-espl" maxlength="60" placeholder="Ex.: exame admissional" value="${esc(p.espMot||'')}"><datalist id="qd-espl">${QD_ESP.map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>
      <label><span>Até quando</span><input class="txt" type="date" id="qd-espa" value="${esc(p.espAte||'')}"></label></div>`:''}
    <label><span>Habilidades</span><div class="qd-habs">${qdHabTodas().map(hb=>`<button class="qd-hbb ${habs.includes(hb)?'on':''}" data-act="qd-hab" data-v="${esc(hb)}" aria-pressed="${habs.includes(hb)}">${esc(hb)}</button>`).join('')}</div>
      <input class="txt" id="qd-habn" maxlength="30" placeholder="Outra habilidade e Enter" style="margin-top:6px"></label>
    <label><span>Observação</span><input class="txt" id="qd-obs" maxlength="60" placeholder="Ex.: Empilhadeira, Faturamento, Conferente" value="${esc(p.obs||'')}"></label>
    <label><span>Mover para</span><div class="qd-mv">${qdD().cols.map(c=>`<button class="btn sec ${c.id===col.id?'on':''}" data-act="qd-mv" data-v="${esc(c.id)}" ${c.id===col.id?'disabled':''}>${esc(c.nome)}</button>`).join('')}</div></label>
    <div class="qd-spa"><button class="lnk" data-act="qd-sobe">↑ Subir</button><button class="lnk" data-act="qd-desce">↓ Descer</button><span style="flex:1"></span><button class="lnk t-crit" data-act="qd-tira">${S.qd.tira===p.id?'Toque de novo para tirar do quadro':'Tirar do quadro'}</button></div></div>`; }
function qdHistPainel(){ if(S.qd.painel!=='hist') return ''; const H=(qdD().hist||[]).slice().reverse().slice(0,150);
  return `<div class="qd-sp card"><div class="qd-sph"><div><div class="eyebrow">QUADRO DE PESSOAS</div><h3>Histórico de mudanças</h3></div><button class="btn sec" data-act="qd-fecha">Fechar</button></div>
    ${H.length?`<div class="qd-hl">${H.map(x=>`<div><small>${dm(String(x.em||'').slice(0,10))} ${x.em?hora(x.em):''}${x.por?' · '+esc(x.por):''}</small>${esc(x.t)}</div>`).join('')}</div>`:'<div class="sub">Nenhuma mudança registrada ainda. A partir de agora, cada mudança fica guardada aqui (as últimas 300).</div>'}</div>`; }
function qdDiff(antes,agora){ const m=cols=>{ const r={}; (cols||[]).forEach(c=>(c.ps||[]).forEach(p=>{ r[qdK(p.n)]={n:p.n,c:c.nome,st:p.st||''}; })); return r; }; const a=m(antes), b=m(agora), o={ent:[],sai:[],mov:[],st:[]};
  Object.keys(b).forEach(k=>{ if(!a[k]) o.ent.push(b[k]); else { if(a[k].c!==b[k].c) o.mov.push({n:b[k].n,de:a[k].c,para:b[k].c}); if(a[k].st!==b[k].st) o.st.push({n:b[k].n,de:a[k].st,para:b[k].st}); } });
  Object.keys(a).forEach(k=>{ if(!b[k]) o.sai.push(a[k]); }); return o; }
const qdStT=s=>s&&QD_ST[s]?QD_ST[s].t:'sem marcar';
function qdCmpHtml(C){ if(C.carregando) return '<div class="sub">Carregando a versão…</div>'; const d=C.diff; if(!d) return '';
  const blk=(t,xs,f)=>xs.length?`<div class="qd-cmb"><b>${t} (${xs.length})</b>${xs.map(f).join('')}</div>`:'';
  const nada=!d.ent.length&&!d.sai.length&&!d.mov.length&&!d.st.length;
  return `<div class="qd-cmp"><div class="qd-cmt">De "${esc(C.nome)}" para agora <button class="lnk" data-act="qd-vcmpx">fechar</button></div>${nada?'<div class="sub">Nada mudou.</div>':''}
    ${blk('Entraram no quadro',d.ent,x=>`<div>${esc(x.n)} <small>em ${esc(x.c)}</small></div>`)}${blk('Saíram do quadro',d.sai,x=>`<div>${esc(x.n)} <small>estava em ${esc(x.c)}</small></div>`)}
    ${blk('Mudaram de coluna',d.mov,x=>`<div>${esc(x.n)} <small>${esc(x.de)} → ${esc(x.para)}</small></div>`)}${blk('Mudaram de situação',d.st,x=>`<div>${esc(x.n)} <small>${esc(qdStT(x.de))} → ${esc(qdStT(x.para))}</small></div>`)}</div>`; }
function qdVerPainel(){ if(S.qd.painel!=='ver') return ''; const V=(qdD().versoes||[]).slice().reverse();
  return `<div class="qd-sp card"><div class="qd-sph"><div><div class="eyebrow">QUADRO DE PESSOAS</div><h3>Versões guardadas</h3></div><button class="btn sec" data-act="qd-fecha">Fechar</button></div>
    <label><span>Guardar o quadro de agora como uma versão</span><div style="display:flex;gap:6px"><input class="txt" id="qd-vnome" maxlength="50" placeholder="Ex.: Plano de dezembro"><button class="btn" data-act="qd-vsalva">Guardar</button></div></label>
    <div class="sub" style="margin:0">Serve para montar outro cenário sem perder o de agora, ou ver o que mudou desde uma data.</div>
    ${S.qd.cmp?qdCmpHtml(S.qd.cmp):''}
    ${V.length?V.map(v=>`<div class="qd-vi"><div><b>${esc(v.nome)}</b><small>${dm(String(v.em).slice(0,10))} ${hora(v.em)}${v.porNome?' · '+esc(v.porNome):''} · ${v.n} pessoas</small></div>
      <div class="qd-via"><button class="lnk" data-act="qd-vcmp" data-v="${esc(v.id)}">Comparar com agora</button><button class="lnk" data-act="qd-vvolta" data-v="${esc(v.id)}">${S.qd.vconf===v.id?'Toque de novo para voltar':'Voltar para esta'}</button><button class="lnk t-crit" data-act="qd-vx" data-v="${esc(v.id)}">${S.qd.vxconf===v.id?'Toque de novo para apagar':'Apagar'}</button></div></div>`).join('')
      :'<div class="sub">Nenhuma versão guardada ainda.</div>'}</div>`; }
function vGxQuadro(){ qdAssina(); try{ if(typeof gxpAssina==='function') gxpAssina(); }catch(e){} const D=qdD(), t=qdTot(); S.qd._rh=qdPessoasRH();
  const k=(v,l,c,f)=>`<button class="qd-k ${c||''} ${S.qd.fil===f?'on':''}" data-act="qd-fil" data-v="${f}" aria-pressed="${S.qd.fil===f}" title="${f?'Mostrar em destaque só quem está assim (toque de novo para ver todos)':'Ver todos'}"><b>${v}</b><span>${l}</span></button>`;
  let mFal=0, mSob=0, mTem=false; D.cols.forEach(c=>{ const M=qdMetaDe(c); if(M.meta){ mTem=true; if(M.df<0) mFal-=M.df; else mSob+=M.df; } });
  const mk=mTem?`<div class="qd-k ${mFal?'crit':'ok'}" title="Soma das colunas com meta (quantas pessoas cada uma precisa). Quem está marcado Sai não conta."><b>${mFal||'✓'}</b><span>${mFal?'faltam pelas metas':'metas completas'}${mSob?' · sobram '+mSob:''}</span></div>`:'';
  const colH=(c,ci,nA)=>{ const cnt=Object.entries(QD_ST).map(([q,v])=>{ const n=c.ps.filter(p=>p.st===q).length; return n?`<i class="qd-ci ${v.c}">${n} ${q==='fica'?'fica':q==='sai'?'sai':v.t.toLowerCase()}</i>`:''; }).join('');
    const M=qdMetaDe(c), mc=M.meta?(M.df<0?`<i class="qd-ci crit qd-mt">faltam ${-M.df}</i>`:M.df>0?`<i class="qd-ci warn qd-mt">sobra${M.df>1?'m':''} ${M.df}</i>`:'<i class="qd-ci ok qd-mt">completo</i>'):'';
    const vgs=Math.max(0,(M.meta||0)-M.at);
    const qa=(qdAreas().find(a=>a.id===qdAreaDe(c))||{}).cor||'#1F5F7A', pct=M.meta?Math.min(100,Math.round(M.at/M.meta*100)):0, bc=M.meta?(M.df<0?'crit':M.df>0?'warn':'ok'):'';
    const rec=!!qdCrec()[c.id];
    return `<section class="qd-c ${S.qd.lvSel?'lvalvo':''} ${rec?'crec':''}" data-qdcol="${esc(c.id)}" data-cn="${esc(qdK(c.nome))}" style="--qa:${esc(qa)}"><header draggable="true" data-qdcd="${esc(c.id)}" title="Arraste para mudar o setor de lugar ou de área">${S.qd.ed===c.id?`<input class="txt qd-cn" id="qd-cn" maxlength="40" value="${esc(c.nome)}"><button class="btn" data-act="qd-cnok">OK</button>`
      :`<span class="qd-alc" aria-hidden="true">⋮⋮</span><button class="qd-ct" data-act="qd-ced" data-v="${esc(c.id)}" title="Renomear">${esc(c.nome)}</button><span class="qd-cc" title="${M.meta?'pessoas (sem contar quem sai) / quantas a coluna precisa':'pessoas'}">${M.meta?M.at+'/'+M.meta:c.ps.length}</span><button class="qd-crb" data-act="qd-crec" data-v="${esc(c.id)}" title="${rec?'Abrir o setor':'Recolher o setor (fica só o nome)'}" aria-label="${rec?'Abrir o setor':'Recolher o setor'}" aria-expanded="${!rec}">${rec?'▸':'▾'}</button>${M.meta?`<div class="qd-cbar ${bc}"><i style="width:${pct}%"></i></div>`:''}${cnt||mc?`<div class="qd-cst">${mc}${cnt}</div>`:''}`}</header>
      ${S.qd.lvSel?`<button class="btn qd-lvpor" data-act="qd-lvpor" data-v="${esc(c.id)}">Pôr ${esc(qdNomeV(String(S.qd.lvSel).split(' ')[0]))} aqui</button>`:''}${rec?qdRecBody(c):`<div class="qd-ps" data-qdcol="${esc(c.id)}">${c.ps.map((p,i)=>qdCard(c,p,i)).join('')}${Array.from({length:vgs},()=>'<div class="qd-vg">Vaga aberta · arraste alguém</div>').join('')}${!c.ps.length&&!vgs?'<div class="qd-vz">Arraste alguém para cá</div>':''}</div>`}
      ${rec?'':`<footer><button class="lnk" data-act="qd-add" data-v="${esc(c.id)}">+ Pôr pessoa</button>
        ${S.qd.metaEd===c.id?`<span class="qd-me"><input class="txt" id="qd-meta" inputmode="numeric" maxlength="3" value="${M.meta||''}" placeholder="nº"><button class="btn" data-act="qd-metaok" data-v="${esc(c.id)}">OK</button></span>`
          :`<button class="lnk" data-act="qd-meta" data-v="${esc(c.id)}" title="Quantas pessoas esta coluna precisa">${M.meta?'precisa de '+M.meta:'quantos precisa?'}</button>`}<span style="flex:1"></span>
        <button class="lnk" data-act="qd-cesq" data-v="${esc(c.id)}" ${ci===0?'disabled':''} title="Mudar a coluna para a esquerda" aria-label="Mudar a coluna para a esquerda">‹</button><button class="lnk" data-act="qd-cdir" data-v="${esc(c.id)}" ${ci===nA-1?'disabled':''} title="Mudar a coluna para a direita" aria-label="Mudar a coluna para a direita">›</button>
        <button class="lnk t-crit" data-act="qd-cx" data-v="${esc(c.id)}">${S.qd.cx===c.id?(c.ps.length?'Tem pessoas: tire antes':'Toque de novo'):'Apagar'}</button></footer>`}</section>`; };
  const AR=qdAreas(), recol=qdRecol();
  const cols=AR.map((ar,ai)=>{ const cs=D.cols.filter(c=>qdAreaDe(c)===ar.id), tA=qdTotArea(cs), fech=recol[ar.id];
    return `<section class="qd-ar ${fech?'fech':''}" data-qdar="${esc(ar.id)}"><div class="qd-arh"><span class="qd-arpin" style="background:${esc(ar.cor||'#1F5F7A')}"></span>
      ${S.qd.arEd===ar.id?`<input class="txt qd-arn" id="qd-arn" maxlength="30" value="${esc(ar.nome)}"><button class="btn" data-act="qd-arok">OK</button>`:`<button class="qd-art" data-act="qd-ared" data-v="${esc(ar.id)}" title="Renomear a área">${esc(ar.nome)}</button>`}
      <span class="qd-ars">${tA.at}${tA.meta?' de '+tA.meta:''} ${tA.at===1?'pessoa':'pessoas'} · ${cs.length} ${cs.length===1?'setor':'setores'}${tA.meta&&tA.at<tA.meta?` · <b class="c">faltam ${tA.meta-tA.at}</b>`:tA.meta&&tA.at>tA.meta?` · <b class="w">sobram ${tA.at-tA.meta}</b>`:''}</span>
      <span style="flex:1"></span><button class="lnk" data-act="qd-arcol" data-v="${esc(ar.id)}">+ setor</button>
      <button class="lnk" data-act="qd-arsob" data-v="${esc(ar.id)}" ${ai===0?'disabled':''} aria-label="Subir a área">↑</button><button class="lnk" data-act="qd-ardes" data-v="${esc(ar.id)}" ${ai===AR.length-1?'disabled':''} aria-label="Descer a área">↓</button>
      <button class="lnk t-crit" data-act="qd-arx" data-v="${esc(ar.id)}">${S.qd.arx===ar.id?(cs.length?'Tem setores: mova antes':'Toque de novo'):'apagar'}</button>
      <button class="lnk" data-act="qd-arrec" data-v="${esc(ar.id)}">${fech?'abrir':'recolher'}</button></div>
      ${fech?'':`<div class="qd-g">${cs.map((c,i)=>colH(c,i,cs.length)).join('')||'<div class="qd-arvz">Arraste um setor para cá</div>'}</div>`}</section>`; }).join('');
  const quando=D.em?`Salvo ${dm(D.em.slice(0,10))} às ${hora(D.em)}${D.porNome?' por '+esc(D.porNome):''}`:'Ainda não salvo';
  const emps=[...new Set(D.cols.flatMap(c=>c.ps.map(p=>qdInfo(p.n).e)).filter(Boolean).map(e=>e.toUpperCase()))].sort();
  const vv=qdEspVenc();
  const sel=(id,ops,v,ph)=>`<select class="txt" id="${id}"><option value="">${ph}</option>${ops.map(o=>`<option value="${esc(o[0])}" ${v===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
  return `${banner()}${gxCab('VISÃO DO GESTOR','Quadro de pessoas',`<div class="seg qd-vis" role="group" aria-label="Como ver"><button data-act="qd-vis" data-v="col" aria-pressed="${S.qd.vis!=='org'}">Quadro</button><button data-act="qd-vis" data-v="org" aria-pressed="${S.qd.vis==='org'}">Organograma</button></div><button class="btn sec" data-act="qd-pn" data-v="hist">Histórico</button><button class="btn sec" data-act="qd-pn" data-v="ver">Versões</button><button class="btn sec" data-act="qd-xls">Excel</button><details class="qd-impm"><summary class="btn">Imprimir</summary><div class="qd-impl"><button data-act="qd-imp" data-v="dist"><b>Só a distribuição</b><small>Para o mural: quem está em cada setor</small></button><button data-act="qd-imp" data-v="dec"><b>Com as decisões</b><small>Fica, dúvida, espera, não efetivo e sai</small></button></div></details>`)}
    <div class="qd-lg"><span>Arraste as pessoas entre os setores.</span><span class="qd-lgi"><i class="qd-lgs ok">✓</i>fica</span><span class="qd-lgi"><i class="qd-lgs warn">?</i>dúvida</span><span class="qd-lgi"><i class="qd-lgs esp">◷</i>espera</span><span class="qd-lgi"><i class="qd-lgs nef">NE</i>não efetivo</span><span class="qd-lgi"><i class="qd-lgs crit">✕</i>sai</span><span class="qd-lgi"><i class="qd-lgd veio"></i>veio hoje</span><span class="qd-lgi"><i class="qd-lgd faltou"></i>não veio</span><span class="qd-lgi"><i class="qd-lgd ferias"></i>férias</span><span style="flex:1"></span><span class="qd-lgv">Só você e a administradora veem · <span id="qd-salvo">${quando}</span></span></div>
    <div class="qd-ks">${k(t.n,'no quadro','','')}${Object.entries(QD_ST).map(([q,v])=>k(t[q],v.pl,v.c,q)).join('')}${k(t.sem,'sem marcar','','sem')}<span style="flex:1"></span><button class="btn sec" data-act="qd-arnova">+ Nova área</button><button class="btn sec" data-act="qd-col">+ Novo setor</button></div>
    ${vv.length?`<div class="qd-av">◷ <b>${vv.length} ${vv.length>1?'pessoas':'pessoa'} em espera com o prazo vencido:</b> ${vv.map(x=>`<button class="lnk" data-act="qd-sel" data-v="${esc(x.p.id)}">${esc(x.p.n)}</button> <small>(${x.p.espMot?esc(x.p.espMot)+', ':''}venceu ${dm(x.p.espAte)})</small>`).join(' · ')}</div>`:''}
    <div class="qd-fb"><input class="txt" id="qd-busca" type="search" autocomplete="off" placeholder="Procurar setor, nome ou habilidade…" value="${esc(S.qd.busca)}">
      ${sel('qd-femp',emps.map(e=>[qdK(e),qdCap(e)]),S.qd.emp,'Todas as empresas')}${sel('qd-fvin',[['CLT','CLT'],['PJ','PJ']],S.qd.vin,'CLT e PJ')}${sel('qd-fhab',qdHabTodas().map(h=>[qdK(h),h]),S.qd.hab,'Todas as habilidades')}
      <span class="sub" id="qd-fcont"></span><button class="lnk" data-act="qd-flimpa">limpar</button>${S.qd.vis==='org'?'':`<button class="lnk qd-crt" data-act="qd-crectodos" data-v="${D.cols.length&&D.cols.every(c=>qdCrec()[c.id])?'abrir':'fechar'}">${D.cols.length&&D.cols.every(c=>qdCrec()[c.id])?'▾ Abrir todos os setores':'▸ Recolher todos os setores'}</button>`}</div>
    ${S.qd.fil?`<div class="qd-filav">Mostrando em destaque: <b>${esc(S.qd.fil==='sem'?'Sem marcar':(QD_ST[S.qd.fil]||{}).t||'')}</b> · <button class="lnk" data-act="qd-fil" data-v="">ver todos</button></div>`:''}
    ${qdSelPainel()}${qdAddPainel()}${qdHistPainel()}${qdVerPainel()}
    <div class="qd-lay"><aside class="qd-lado">${qdTotalHtml()}${qdLivresHtml()}</aside>${S.qd.vis==='org'?`<div class="qd-areas qdo-w ${S.qd.fil?'fil fil-'+esc(S.qd.fil):''}">${qdOrgHtml()}</div>`:`<div class="qd-areas ${S.qd.fil?'fil fil-'+esc(S.qd.fil):''}">${cols}</div>`}</div>${qdOrgPainel()}`; }
/* filtros sem redesenhar (busca, empresa, vínculo, habilidade) */
function qdFiltra(){ if(S.view!=='gxqd') return; const q=qdK(S.qd.busca), ws=q?q.split(' '):[], e=S.qd.emp, v=S.qd.vin, h=S.qd.hab, liga=ws.length||e||v||h; let n=0, tot=0, ns=0;
  const bate=b=>ws.every(w=>String(b||'').split(' ').some(y=>y.startsWith(w)));
  document.querySelectorAll('.qd-g .qd-c').forEach(col=>{ const porNome=ws.length&&bate(col.dataset.cn); let vis=0;
    col.querySelectorAll('.qd-p,.qd-pk').forEach(x=>{ tot++; const ok=(porNome||!ws.length||bate(x.dataset.b))&&(!e||x.dataset.e===e)&&(!v||x.dataset.vi===v)&&(!h||(x.dataset.h||'').includes('|'+h+'|'));
      x.classList.toggle('qd-oc',!ok); if(ok){ n++; vis++; } });
    const some=!!liga&&!porNome&&!vis; col.classList.toggle('qd-ocol',some); col.classList.toggle('qd-achou',!!porNome); if(!some) ns++; });
  document.querySelectorAll('.qd-areas:not(.qdo-w) .qd-ar').forEach(ar=>{ const cs=ar.querySelectorAll('.qd-c'); ar.classList.toggle('qd-ocol',!!liga&&cs.length>0&&[...cs].every(c=>c.classList.contains('qd-ocol'))); });
  document.querySelectorAll('.qdo-n[data-qdon]').forEach(x=>{ const ok=!liga||((!ws.length||bate(x.dataset.cn)||bate(x.dataset.b))&&(!e||(x.dataset.e||'').includes('|'+e+'|'))&&(!v||(x.dataset.vi||'').includes('|'+v+'|'))&&(!h||(x.dataset.h||'').includes('|'+h+'|')));
    x.classList.toggle('qdo-dim',!ok); x.classList.toggle('qdo-hit',!!liga&&ok); if(ok&&liga) ns++; });
  const ct=document.getElementById('qd-fcont'); if(ct) ct.textContent=liga?(S.qd.vis==='org'?ns+' setores':n+' de '+tot+' pessoas · '+ns+(ns===1?' setor':' setores')):''; }
setTimeout(()=>{ try{ depoisDoRender(qdFiltra,'quadro de pessoas: filtros'); }catch(e){ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ qdFiltra(); }catch(er){} return x; }; } },0);
/* versões: gxquadro/v-<id> {tipo:'versao', nome, cols, em, por, porNome}; a lista fica no próprio quadro (D.versoes) */
async function qdVerSalva(nome,auto){ const D=qdD(), id=qdId(), em=new Date().toISOString(), porNome=(typeof gxEu==='function'?gxEu():'')||'';
  nome=String(nome||'').trim()||('Quadro de '+new Date().toLocaleDateString('pt-BR'));
  await S.db.collection('gxquadro').doc('v-'+id).set({tipo:'versao',nome,cols:JSON.parse(JSON.stringify(D.cols)),em,por:(S.user&&S.user.uid)||'',porNome});
  D.versoes=(D.versoes||[]).concat([{id,nome,em,porNome,n:qdTot().n}]).slice(-40); if(!auto) qdLog('Guardou a versão "'+nome+'"'); qdGrava(); return id; }
async function qdVerLe(id){ const g=await S.db.collection('gxquadro').doc('v-'+id).get(); return g&&g.exists?g.data():null; }
/* Excel */
function qdXls(){ if(!window.PainelXls){ toast('O gerador de Excel ainda está carregando. Tente de novo em alguns segundos.'); return; } const D=qdD(), t=qdTot(), lin=[];
  D.cols.forEach(c=>c.ps.forEach((p,i)=>{ const I=qdInfo(p.n); lin.push([c.nome,i+1,p.n,qdStT(p.st).replace(/^s/,'S'),p.obs||'',(p.hab||[]).join(', '),I.v,qdCap(I.e),I.cad&&I.cad.adm?qdCasa(I.cad.adm):'',
    I.cad&&I.cad.exp&&I.cad.exp.fim?'experiência até '+dm(I.cad.exp.fim):I.cad&&I.cad.pz?'contrato até '+dm(I.cad.pz):'',({veio:'Veio',faltou:'Não veio',ferias:'Férias'})[I.hoje]||'',I.dias?I.faltas:'',p.st==='esp'?p.espMot||'':'',p.st==='esp'&&p.espAte?p.espAte:'']); }));
  const por=D.cols.map(c=>{ const M=qdMetaDe(c), n=q=>c.ps.filter(p=>(p.st||'')===q).length; return [c.nome,c.ps.length,M.meta||'',M.meta?M.df:'',n('fica'),n('duv'),n('esp'),n('nef'),n('sai'),n('')]; });
  por.push(['Total',t.n,'','',t.fica,t.duv,t.esp,t.nef,t.sai,t.sem]);
  const hi=(D.hist||[]).slice().reverse().map(x=>[String(x.em||'').slice(0,10),x.em?hora(x.em):'',x.por||'',x.t]);
  return window.PainelXls.gerar('Quadro de pessoas '+hojeStr()+'.xlsx',[
    {nome:'Quadro',cab:['Coluna','Nº','Nome','Situação','Observação','Habilidades','Vínculo','Empresa','Tempo de casa','Experiência / contrato','Hoje','Faltas (dias sem registro)','Em espera: motivo','Em espera: até'],linhas:lin,tipos:['txt','int','txt','txt','txt','txt','txt','txt','txt','txt','txt','int','txt','data']},
    {nome:'Por coluna',cab:['Coluna','Pessoas','Precisa','Falta (−) / sobra (+)','Fica','Em dúvida','Em espera','Não efetivo','Sai','Sem marcar'],linhas:por,tipos:['txt','int','int','int','int','int','int','int','int','int']},
    {nome:'Histórico',cab:['Dia','Hora','Quem','O que mudou'],linhas:hi.length?hi:[['','','','Nenhuma mudança registrada']],tipos:['data','hora','txt','txt']}],
    {tit:'Quadro de pessoas',sub:t.n+' pessoas · '+D.cols.length+' colunas',filtros:'Documento interno da gestão'}); }

/* ---------- impressão (janela própria, A4 deitada) ---------- */
function qdImprimir(dec){ const D=qdD(), t=qdTot(), w=window.open('','_blank'); if(!w){ toast('O navegador bloqueou a janela de impressão. Libere pop-ups para o painel.'); return; }
  let logo=''; try{ logo=(document.querySelector('.brand img')||{}).src||''; }catch(e){}
  const mk=p=>!dec||!p.st||!QD_ST[p.st]?'':`<b class="${p.st}">${QD_ST[p.st].i} ${QD_ST[p.st].t.toLowerCase()}${p.st==='esp'&&(p.espMot||p.espAte)?' ('+[p.espMot,p.espAte?'até '+dm(p.espAte):''].filter(Boolean).map(esc).join(', ')+')':''}</b>`;
  const box=c=>`<div class="b"><h2>${esc(c.nome)} <small>${c.ps.length}${c.meta?' de '+c.meta:''}</small></h2><ol>${c.ps.map(p=>`<li class="${dec&&p.st==='sai'?'x':''}"><span>${esc(p.n)}${p.obs?` <i>– ${esc(p.obs)}</i>`:''}</span>${mk(p)}</li>`).join('')||'<li class="v">—</li>'}</ol></div>`;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Quadro de pessoas</title><style>
    @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font:11pt Arial,Helvetica,sans-serif;color:#143F54;margin:0}
    .t{display:flex;align-items:center;gap:14px;border-bottom:2px solid #143F54;padding-bottom:6px;margin-bottom:8px}.t img{height:34px}.t h1{font-size:17pt;margin:0}.t p{margin:2px 0 0;color:#5E6E77;font-size:9pt}
    .g{columns:4;column-gap:8mm}.b{break-inside:avoid;margin:0 0 6mm;border-top:3px solid #143F54;padding-top:3px}h2{font-size:12pt;margin:0 0 3px;text-transform:uppercase}h2 small{color:#5E6E77;font-weight:400}
    ol{margin:0;padding-left:20px}li{padding:2px 0;border-bottom:1px solid #E3E8EC;display:flex;justify-content:space-between;gap:6px}li i{color:#5E6E77;font-style:normal;font-size:9pt}li.v{list-style:none;color:#aaa}
    li.x span{text-decoration:line-through;color:#8a8a8a}b{font-size:8.5pt;white-space:nowrap}.fica{color:#2F6E4F}.sai{color:#B5473F}.duv{color:#A86A16}.esp{color:#2B6A87}.nef{color:#6B4E9B}
    .r{margin-top:4mm;font-size:9pt;color:#5E6E77}</style></head><body>
    <div class="t">${logo?`<img src="${logo}" alt="Colafix">`:''}<div><h1>Quadro de pessoas${dec?' · decisões':''}</h1><p>${t.n} pessoas · ${D.cols.length} setores${dec?Object.entries(QD_ST).map(([q,v])=>` · ${v.pl} ${t[q]}`).join(''):''} · ${new Date().toLocaleDateString('pt-BR')}</p></div></div>
    <div class="g">${qdAreas().map(ar=>D.cols.filter(c=>qdAreaDe(c)===ar.id).map(box).join('')).join('')}</div>${dec?'<div class="r">Documento interno da gestão.</div>':''}
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`); w.document.close(); }
/* ---------- ações ---------- */
function qdAcha(id){ for(const c of qdD().cols){ const i=c.ps.findIndex(p=>p.id===id); if(i>=0) return {c,i,p:c.ps[i]}; } return null; }
function qdMove(pid,cid,pos){ const D=qdD(), a=qdAcha(pid), to=D.cols.find(c=>c.id===cid); if(!a||!to) return; if(a.c.id!==to.id) qdLog(a.p.n+': '+a.c.nome+' → '+to.nome); a.c.ps.splice(a.i,1); if(pos==null||pos>to.ps.length) pos=to.ps.length; to.ps.splice(pos,0,a.p); qdGrava(); }
function qdLeObs(){ const i=document.getElementById('qd-obs'); if(i&&S.qd.sel){ const a=qdAcha(S.qd.sel); if(a&&(a.p.obs||'')!==i.value.trim()){ a.p.obs=i.value.trim().slice(0,60); qdGrava(); } } }
function qdPor(n,cid,pos){ const D=qdD(), col=D.cols.find(c=>c.id===cid); n=String(n||'').trim().replace(/\s+/g,' '); if(!col||!n) return;
  const ja=qdOnde(n); if(ja){ toast(n+' já está em '+ja+'. Arraste o nome para mudar de coluna.'); return; }
  const np={id:qdId(),n,obs:'',st:''}; if(pos==null||pos>col.ps.length) col.ps.push(np); else col.ps.splice(pos,0,np); qdLog(n+' entrou em '+col.nome); S.qd.q=''; qdGrava(); toast(n+' entrou em '+col.nome); }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-act^="qd-"]'); if(!b||S.view!=='gxqd') return; const a=b.dataset.act, v=b.dataset.v, D=qdD();
  if(a!=='qd-tira') S.qd.tira=null; if(a!=='qd-cx') S.qd.cx=null;
  if(a==='qd-sel'){ qdLeObs(); S.qd.sel=S.qd.sel===v?null:v; S.qd.add=null; S.qd.painel=''; S.qd.cmp=null; render(); return; }
  if(a==='qd-fecha'){ qdLeObs(); S.qd.sel=null; S.qd.add=null; S.qd.q=''; S.qd.painel=''; S.qd.cmp=null; S.qd.vconf=null; S.qd.vxconf=null; render(); return; }
  if(a!=='qd-vvolta') S.qd.vconf=null; if(a!=='qd-vx') S.qd.vxconf=null;
  if(a==='qd-pn'){ qdLeObs(); S.qd.painel=S.qd.painel===v?'':v; S.qd.sel=null; S.qd.add=null; S.qd.cmp=null; render(); return; }
  if(a==='qd-hab'){ const x=qdAcha(S.qd.sel); if(!x) return; const hs=x.p.hab||[]; if(hs.includes(v)){ x.p.hab=hs.filter(y=>y!==v); qdLog(x.p.n+': tirou a habilidade '+v); } else { x.p.hab=hs.concat([v]); qdLog(x.p.n+': habilidade '+v); } qdGrava(); render(); return; }
  if(a==='qd-meta'){ S.qd.metaEd=v; render(); setTimeout(()=>{ const i=document.getElementById('qd-meta'); if(i){ i.focus(); i.select(); } },50); return; }
  if(a==='qd-metaok'){ const i=document.getElementById('qd-meta'), c=D.cols.find(x=>x.id===v); if(c&&i){ const n=Math.max(0,Math.min(999,parseInt(i.value,10)||0)), ant=+c.meta||0; if(n!==ant){ if(n) c.meta=n; else delete c.meta; qdLog(c.nome+': '+(n?'precisa de '+n+' pessoas':'sem meta')); qdGrava(); } } S.qd.metaEd=null; render(); return; }
  if(a==='qd-flimpa'){ S.qd.busca=''; S.qd.emp=''; S.qd.vin=''; S.qd.hab=''; render(); return; }
  if(a==='qd-xls'){ Promise.resolve(qdXls()).catch(er=>toast('Não deu para gerar o Excel: '+((er&&er.message)||er))); return; }
  if(a==='qd-vsalva'){ const i=document.getElementById('qd-vnome'); b.disabled=true; qdVerSalva(i?i.value:'').then(()=>{ toast('Versão guardada.'); render(); }).catch(er=>{ b.disabled=false; toast('Não deu para guardar: '+((er&&er.message)||er)); }); return; }
  if(a==='qd-vcmpx'){ S.qd.cmp=null; render(); return; }
  if(a==='qd-vcmp'){ const it=(D.versoes||[]).find(x=>x.id===v); S.qd.cmp={id:v,nome:it?it.nome:'',carregando:true}; render(); qdVerLe(v).then(d=>{ if(!S.qd.cmp||S.qd.cmp.id!==v) return; S.qd.cmp={id:v,nome:it?it.nome:'',diff:d?qdDiff(d.cols,D.cols):null}; if(!d) toast('Não achei essa versão.'); render(); }).catch(er=>{ S.qd.cmp=null; toast('Não deu para ler a versão: '+((er&&er.message)||er)); render(); }); return; }
  if(a==='qd-vvolta'){ if(S.qd.vconf!==v){ S.qd.vconf=v; render(); return; } S.qd.vconf=null; const it=(D.versoes||[]).find(x=>x.id===v);
    qdVerLe(v).then(async d=>{ if(!d||!Array.isArray(d.cols)){ toast('Não achei essa versão.'); return; } await qdVerSalva('Antes de voltar para "'+(it?it.nome:'')+'" ('+new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+')',true);
      D.cols=JSON.parse(JSON.stringify(d.cols)); qdLog('Voltou para a versão "'+(it?it.nome:'')+'" (o quadro de antes ficou guardado como versão)'); qdGrava(); S.qd.cmp=null; toast('Quadro voltou para "'+(it?it.nome:'')+'". O de antes ficou guardado nas versões.'); render(); }).catch(er=>toast('Não deu para voltar: '+((er&&er.message)||er))); return; }
  if(a==='qd-vx'){ if(S.qd.vxconf!==v){ S.qd.vxconf=v; render(); return; } S.qd.vxconf=null; const it=(D.versoes||[]).find(x=>x.id===v);
    S.db.collection('gxquadro').doc('v-'+v).delete().catch(()=>{}); D.versoes=(D.versoes||[]).filter(x=>x.id!==v); if(S.qd.cmp&&S.qd.cmp.id===v) S.qd.cmp=null; qdLog('Apagou a versão "'+(it?it.nome:'')+'"'); qdGrava(); render(); return; }
  if(a==='qd-fil'){ S.qd.fil=S.qd.fil===v?'':(v||''); render(); return; }
  if(a==='qd-st'){ const x=qdAcha(v); if(x){ const st=b.dataset.st||''; const ant=x.p.st||''; x.p.st=x.p.st===st&&b.closest('.qd-p')?'':st; if((x.p.st||'')!==ant) qdLog(x.p.n+': '+qdStT(ant)+' → '+qdStT(x.p.st)); qdGrava(); render(); } return; }
  if(a==='qd-mv'){ qdLeObs(); qdMove(S.qd.sel,v); render(); return; }
  if(a==='qd-sobe'||a==='qd-desce'){ const x=qdAcha(S.qd.sel); if(x){ const j=x.i+(a==='qd-sobe'?-1:1); if(j>=0&&j<x.c.ps.length){ x.c.ps.splice(x.i,1); x.c.ps.splice(j,0,x.p); qdGrava(); } render(); } return; }
  if(qdAcaoArea(a,v,b)) return;
  if(a==='qd-tira'){ const x=qdAcha(S.qd.sel); if(!x) return; if(S.qd.tira!==x.p.id){ S.qd.tira=x.p.id; render(); return; } x.c.ps.splice(x.i,1); qdLog(x.p.n+' saiu do quadro (estava em '+x.c.nome+')'); S.qd.sel=null; S.qd.tira=null; qdGrava(); render(); return; }
  if(a==='qd-add'){ qdLeObs(); S.qd.add=v; S.qd.sel=null; S.qd.q=''; render(); setTimeout(()=>{ const i=document.getElementById('qd-q'); if(i) i.focus(); },50); return; }
  if(a==='qd-addrh'){ qdPor(v,S.qd.add); render(); return; }
  if(a==='qd-addtxt'){ const i=document.getElementById('qd-q'); qdPor(i?i.value:S.qd.q,S.qd.add); render(); setTimeout(()=>{ const j=document.getElementById('qd-q'); if(j) j.focus(); },50); return; }
  if(a==='qd-col'){ const AR=qdAreas(); D.cols.push({id:qdId(),nome:'Nova coluna',ps:[],area:(AR[AR.length-1]||{}).id}); S.qd.ed=D.cols[D.cols.length-1].id; qdGrava(); render(); setTimeout(()=>{ const i=document.getElementById('qd-cn'); if(i){ i.focus(); i.select(); } },50); return; }
  if(a==='qd-ced'){ S.qd.ed=v; render(); setTimeout(()=>{ const i=document.getElementById('qd-cn'); if(i){ i.focus(); i.select(); } },50); return; }
  if(a==='qd-cnok'){ const i=document.getElementById('qd-cn'), c=D.cols.find(x=>x.id===S.qd.ed); if(i&&c&&i.value.trim()){ const nv=i.value.trim().slice(0,40); if(nv!==c.nome&&c.nome!=='Nova coluna') qdLog('Coluna "'+c.nome+'" virou "'+nv+'"'); else if(c.nome==='Nova coluna') qdLog('Nova coluna "'+nv+'"'); c.nome=nv; qdGrava(); } S.qd.ed=null; render(); return; }
  if(a==='qd-cesq'||a==='qd-cdir'){ const c=D.cols.find(x=>x.id===v); if(!c) return; const mesma=D.cols.filter(x=>qdAreaDe(x)===qdAreaDe(c)), k=mesma.indexOf(c), o=mesma[k+(a==='qd-cesq'?-1:1)];
    if(o){ const i=D.cols.indexOf(c), j=D.cols.indexOf(o); D.cols[i]=o; D.cols[j]=c; qdGrava(); } render(); return; }
  if(a==='qd-cx'){ const c=D.cols.find(x=>x.id===v); if(!c) return; if(c.ps.length){ S.qd.cx=v; render(); return; } if(S.qd.cx!==v){ S.qd.cx=v; render(); return; } qdLog('Apagou a coluna "'+c.nome+'"'); D.cols=D.cols.filter(x=>x.id!==v); S.qd.cx=null; qdGrava(); render(); return; }
  if(a==='qd-imp'){ qdImprimir(v==='dec'); return; }
});
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='qd-q'){ S.qd.q=e.target.value; const bt=document.getElementById('qd-addtxt-b'); if(bt){ const t=e.target.value.trim(); bt.hidden=t.length<2; bt.querySelector('span').textContent=t; } const box=document.querySelector('.qd-rh'); if(!box) return; const q=qdK(e.target.value);
  box.querySelectorAll('.qd-rp').forEach(x=>{ const n=qdK(x.dataset.v); x.style.display=!q||q.split(' ').every(w=>n.split(' ').some(y=>y.startsWith(w)))?'':'none'; }); } });
document.addEventListener('keydown',e=>{ if(S.view!=='gxqd') return; const id=e.target&&e.target.id;
  if(id==='qd-q'&&e.key==='Enter'){ e.preventDefault(); const vis=[...document.querySelectorAll('.qd-rp')].filter(x=>x.style.display!=='none'); if(vis.length===1) qdPor(vis[0].dataset.v,S.qd.add); else qdPor(e.target.value,S.qd.add); render(); setTimeout(()=>{ const j=document.getElementById('qd-q'); if(j) j.focus(); },50); }
  else if(id==='qd-cn'&&e.key==='Enter'){ e.preventDefault(); const b=document.querySelector('[data-act="qd-cnok"]'); if(b) b.click(); }
  else if(id==='qd-obs'&&e.key==='Enter'){ e.preventDefault(); qdLeObs(); render(); }
  else if(e.key==='Escape'&&(S.qd.sel||S.qd.add||S.qd.ed||S.qd.painel||S.qd.metaEd)){ qdLeObs(); S.qd.sel=null; S.qd.add=null; S.qd.ed=null; S.qd.painel=''; S.qd.metaEd=null; S.qd.cmp=null; render(); } });
document.addEventListener('change',e=>{ const t=e.target; if(!t) return; if(t.id==='qd-obs') qdLeObs();
  if(t.id==='qd-femp'||t.id==='qd-fvin'||t.id==='qd-fhab'){ S.qd[{'qd-femp':'emp','qd-fvin':'vin','qd-fhab':'hab'}[t.id]]=t.value; qdFiltra(); }
  if((t.id==='qd-espm'||t.id==='qd-espa')&&S.qd.sel){ const x=qdAcha(S.qd.sel); if(!x) return; const k=t.id==='qd-espm'?'espMot':'espAte', nv=String(t.value||'').trim().slice(0,60);
    if((x.p[k]||'')!==nv){ if(nv) x.p[k]=nv; else delete x.p[k]; qdLog(x.p.n+': em espera '+(k==='espMot'?'— '+(nv||'sem motivo'):'até '+(nv?dm(nv):'sem data'))); qdGrava(); render(); } } });
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='qd-busca'){ S.qd.busca=e.target.value; qdFiltra(); } });
document.addEventListener('keydown',e=>{ if(S.view!=='gxqd'||!e.target) return; const id=e.target.id;
  if(id==='qd-habn'&&e.key==='Enter'){ e.preventDefault(); const v=e.target.value.trim().slice(0,30), x=qdAcha(S.qd.sel); if(!v||!x) return; const ja=qdHabTodas().find(h=>qdK(h)===qdK(v))||v;
    if(!(x.p.hab||[]).includes(ja)){ x.p.hab=(x.p.hab||[]).concat([ja]); qdLog(x.p.n+': habilidade '+ja); qdGrava(); } render(); setTimeout(()=>{ const i=document.getElementById('qd-habn'); if(i) i.focus(); },50); }
  else if(id==='qd-meta'&&e.key==='Enter'){ e.preventDefault(); const b=document.querySelector('[data-act="qd-metaok"]'); if(b) b.click(); }
  else if(id==='qd-vnome'&&e.key==='Enter'){ e.preventDefault(); const b=document.querySelector('[data-act="qd-vsalva"]'); if(b) b.click(); } });
/* arrastar (computador) */
document.addEventListener('dragstart',e=>{ const p=e.target.closest&&e.target.closest('.qd-p'); if(!p) return; S.qd.drag=p.dataset.qdp; p.classList.add('drag'); try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',p.dataset.qdp); }catch(x){} });
document.addEventListener('dragend',()=>{ S.qd.drag=null; S.qd.ldrag=null; S.qd.cdrag=null; document.querySelectorAll('.qd-p.drag,.qd-ps.over,.qd-c.cdrag,.qd-c.cinsl,.qd-c.cinsr,.qd-ar.over,.qd-lv.drag').forEach(x=>x.classList.remove('drag','over','cdrag','cinsl','cinsr')); document.querySelectorAll('.qd-ins').forEach(x=>x.remove()); });
function qdPos(lista,y){ const cs=[...lista.querySelectorAll('.qd-p:not(.drag)')]; for(let i=0;i<cs.length;i++){ const r=cs[i].getBoundingClientRect(); if(y<r.top+r.height/2) return i; } return cs.length; }
document.addEventListener('dragover',e=>{ if(!S.qd.drag&&!S.qd.ldrag) return; const l=e.target.closest&&e.target.closest('.qd-c'); if(!l) return; e.preventDefault(); const ps=l.querySelector('.qd-ps');
  document.querySelectorAll('.qd-ps.over').forEach(x=>{ if(x!==ps) x.classList.remove('over'); }); ps.classList.add('over');
  document.querySelectorAll('.qd-ins').forEach(x=>x.remove()); const i=qdPos(ps,e.clientY), cs=[...ps.querySelectorAll('.qd-p:not(.drag)')], ln=document.createElement('div'); ln.className='qd-ins';
  if(cs[i]) ps.insertBefore(ln,cs[i]); else ps.appendChild(ln); });
document.addEventListener('drop',e=>{ if(!S.qd.drag&&!S.qd.ldrag) return; const l=e.target.closest&&e.target.closest('.qd-c'); if(!l) return; e.preventDefault(); const ps=l.querySelector('.qd-ps'), pos=qdPos(ps,e.clientY), id=S.qd.drag, ln=S.qd.ldrag;
  S.qd.drag=null; S.qd.ldrag=null; if(ln) qdPor(ln,ps.dataset.qdcol,pos); else qdMove(id,ps.dataset.qdcol,pos); render(); });
/* ---------- registro ---------- */
Object.assign(VIEWS,{gxqd:{nome:'Quadro de pessoas',ic:'equipe',mob:'Quadro'}}); CRUMB.gxqd='Quadro de pessoas';
S.extViews=S.extViews||{}; S.extViews.gxqd=vGxQuadro;
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxqd')){ const i=M.views.indexOf('gxhe'); M.views.splice(i>=0?i+1:M.views.length,0,'gxqd'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxqd')){ const i=GXN_TELAS.indexOf('gxhe'); GXN_TELAS.splice(i>=0?i+1:GXN_TELAS.length,0,'gxqd'); }
try{ const g=GXG.find(x=>x.id==='g-pes'); if(g&&!g.tabs.some(t=>t[0]==='gxqd')){ const i=g.tabs.findIndex(t=>t[0]==='gxhe'); g.tabs.splice(i>=0?i+1:g.tabs.length,0,['gxqd','Quadro de pessoas']);
  const f=S.extViews.gxqd; S.extViews.gxqd=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas('gxqd')+h; }catch(e){ return h; } }; } }catch(e){}
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Quadro de pessoas (quem fica e quem sai)','quadro pessoas alocar fica sai cortes distribuição setores','gxqd',()=>go('gxqd')]); }catch(e){}
window.Painel=window.Painel||{}; window.Painel.quadro={dados:()=>qdD(),tot:qdTot,alertas:()=>gxAlertas()};
document.head.insertAdjacentHTML('beforeend',`<style id="qd-css">
.qd-ks{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}
.qd-k{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 14px;min-width:96px}.qd-k b{display:block;font-size:22px}.qd-k span{font-size:12px;color:var(--muted)}
.qd-k{font:inherit;color:inherit;text-align:left;cursor:pointer}.qd-k:hover{border-color:var(--teal)}.qd-k.on{outline:2px solid var(--teal);border-color:var(--teal)}
.qd-k.ok b{color:var(--ok)}.qd-k.warn b{color:var(--warn)}.qd-k.crit b{color:var(--crit)}.qd-k.esp b{color:var(--pc-info,var(--teal))}.qd-k.nef b{color:var(--qd-nef)}
:root{--qd-nef:#6B4E9B}:root[data-theme="dark"]{--qd-nef:#B79BE0}
.qd-filav{margin:-4px 0 10px;font-size:13px;color:var(--muted)}
.qd-areas.fil .qd-p{opacity:.28}.qd-areas.fil-fica .st-fica,.qd-areas.fil-duv .st-duv,.qd-areas.fil-esp .st-esp,.qd-areas.fil-nef .st-nef,.qd-areas.fil-sai .st-sai,.qd-areas.fil-sem .st-sem{opacity:1}
.qd-c header{flex-wrap:wrap}.qd-cst{flex-basis:100%;display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11.5px}.qd-ci{font-style:normal}.qd-ci.ok{color:var(--ok)}.qd-ci.warn{color:var(--warn)}.qd-ci.crit{color:var(--crit)}.qd-ci.esp{color:var(--pc-info,var(--teal))}.qd-ci.nef{color:var(--qd-nef)}
.qd-tag{display:inline-block;margin-top:2px;font-style:normal;font-size:10.5px;font-weight:600;padding:1px 6px;border-radius:999px}.qd-tag.esp{background:var(--pc-info-bg,var(--teal-tint));color:var(--pc-info,var(--teal))}.qd-tag.nef{background:color-mix(in srgb,var(--qd-nef) 14%,transparent);color:var(--qd-nef)}
.qd-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;align-items:start}
.qd-c{background:var(--surface);border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;min-height:120px}
.qd-c header{display:flex;align-items:center;gap:6px;padding:10px 12px 6px;border-bottom:2px solid var(--teal-strong,#143F54)}
.qd-ct{background:none;border:0;padding:0;font:inherit;font-weight:700;font-size:15px;color:var(--ink,#143F54);text-transform:uppercase;cursor:pointer;text-align:left;flex:1}
.qd-cc{font-size:12px;color:var(--muted);white-space:nowrap}.qd-cc i{font-style:normal}.qd-cn{flex:1;min-width:0}
.qd-ps{padding:6px;display:flex;flex-direction:column;gap:4px;flex:1;min-height:52px;border-radius:8px;transition:background .15s}
.qd-ps.over{background:color-mix(in srgb,var(--teal) 10%,transparent)}
.qd-vz{color:var(--muted);font-size:12px;text-align:center;padding:12px 4px;border:1px dashed var(--line);border-radius:8px}
.qd-p{display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:8px;border:1px solid var(--line);background:var(--ground);cursor:grab;border-left:4px solid transparent}
.qd-p.drag{opacity:.4}.qd-p.sel{outline:2px solid var(--teal)}
.qd-p.st-fica{border-left-color:var(--ok)}.qd-p.st-duv{border-left-color:var(--warn)}.qd-p.st-sai{border-left-color:var(--crit)}.qd-p.st-esp{border-left-color:var(--pc-info,var(--teal))}.qd-p.st-nef{border-left-color:var(--qd-nef)}
.qd-p.st-sai .qd-nm{text-decoration:line-through;color:var(--muted)}
.qd-n{font-size:12px;color:var(--muted);width:16px;text-align:right}
.qd-nm{flex:1;min-width:0;background:none;border:0;padding:2px 0;font:inherit;text-align:left;cursor:pointer;color:inherit;font-weight:500}
.qd-nm small{display:block;color:var(--muted);font-size:11px;font-weight:400}
.qd-sts{display:flex;gap:2px;flex:none}.qd-st{width:22px;height:24px;border-radius:6px;border:1px solid var(--line);background:var(--surface);cursor:pointer;font-size:12px;line-height:1;color:var(--muted);padding:0}
.qd-st.ok.on{background:var(--ok);border-color:var(--ok);color:#fff}.qd-st.warn.on{background:var(--warn);border-color:var(--warn);color:#fff}.qd-st.crit.on{background:var(--crit);border-color:var(--crit);color:#fff}.qd-st.esp.on{background:var(--pc-info,var(--teal));border-color:var(--pc-info,var(--teal));color:#fff}.qd-st.nef{font-size:9.5px;font-weight:700}.qd-st.nef.on{background:var(--qd-nef);border-color:var(--qd-nef);color:#fff}
.qd-ins{height:3px;background:var(--teal);border-radius:2px}
.qd-inf{display:block;font-size:11px;color:var(--muted);font-weight:400;margin-top:1px;line-height:1.35}.qd-inf i{font-style:normal;opacity:.6}.qd-inf b{font-weight:500}.qd-inf b.w{color:var(--warn-ink,var(--warn))}.qd-inf b.c{color:var(--crit)}
.qd-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 6px 1px 0;vertical-align:middle;background:var(--line)}.qd-dot.veio{background:var(--ok)}.qd-dot.faltou{background:var(--crit)}.qd-dot.ferias{background:var(--pc-info,var(--teal))}
.qd-tag.venc{background:var(--crit-tint,#F6E8E6);color:var(--crit)}
.qd-hbs{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px}.qd-hb{font-style:normal;font-size:10.5px;padding:1px 6px;border-radius:999px;border:1px solid var(--line);color:var(--ink-2,var(--muted));background:var(--surface)}
.qd-p.qd-oc{display:none}
.qd-fb{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}.qd-fb #qd-busca{flex:1 1 220px;min-width:180px}.qd-fb select{width:auto;min-width:150px}
.qd-av{background:var(--crit-tint,#F6E8E6);border:1px solid color-mix(in srgb,var(--crit) 35%,transparent);border-radius:10px;padding:8px 12px;margin:0 0 12px;font-size:13px}.qd-av small{color:var(--muted)}
.qd-me{display:inline-flex;gap:4px;align-items:center}.qd-me input{width:56px;height:30px;padding:0 8px}.qd-me .btn{height:30px;padding:0 10px}
.qd-mt{font-weight:600}
.qd-dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:0;font-size:13px;background:var(--ground);border-radius:10px;padding:10px 12px}.qd-dl dt{color:var(--muted)}.qd-dl dd{margin:0}
.qd-seg{flex-wrap:wrap}.qd-esp{display:grid;grid-template-columns:1fr 150px;gap:8px}
.qd-habs{display:flex;flex-wrap:wrap;gap:5px}.qd-hbb{font:inherit;font-size:12.5px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.qd-hbb.on{background:var(--teal-strong,#143F54);border-color:var(--teal-strong,#143F54);color:#fff}
.qd-hl{display:flex;flex-direction:column;gap:6px;overflow:auto}.qd-hl>div{font-size:13px;border-bottom:1px solid var(--line);padding-bottom:6px}.qd-hl small{display:block;color:var(--muted);font-size:11px}
.qd-vi{border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:4px}.qd-vi small{display:block;color:var(--muted);font-size:11.5px}.qd-via{display:flex;flex-wrap:wrap;gap:12px;font-size:13px}
.qd-cmp{background:var(--ground);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:13px}.qd-cmt{font-weight:600;display:flex;justify-content:space-between;gap:8px}.qd-cmb>b{display:block;font-size:12px;color:var(--muted);margin-bottom:2px}.qd-cmb small{color:var(--muted)}
.qd-c footer{display:flex;align-items:center;gap:8px;padding:6px 10px 8px;border-top:1px solid var(--line);font-size:13px}
.qd-sp{position:fixed;top:72px;right:16px;bottom:16px;width:min(400px,calc(100vw - 32px));z-index:60;display:flex;flex-direction:column;gap:12px;overflow:auto;box-shadow:0 12px 40px rgba(20,63,84,.22)}.qd-sph{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.qd-sph h3{margin:2px 0 0}
.qd-sp label>span{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}
.qd-mv{display:flex;flex-wrap:wrap;gap:6px}.qd-mv .on{opacity:.5}.qd-spa{display:flex;gap:14px;align-items:center}
.qd-rh{display:grid;gap:6px;overflow:auto;flex:1;align-content:start}
.qd-rp{text-align:left;background:var(--ground);border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer;font:inherit;color:inherit}
.qd-rp small{display:block;color:var(--muted);font-size:11px}.qd-rp.ja{opacity:.55}
@media (max-width:700px){.qd-g{grid-template-columns:1fr}.qd-p{cursor:default}}
</style>`);

/* sino do gestor: espera com prazo vencido */
if(typeof gxAlertas==='function'){ const _gaQd=gxAlertas; gxAlertas=function(){ const out=_gaQd.apply(this,arguments)||[];
  try{ if(qdPode()){ qdAssina(); if(S.qd.lido){ const vs=qdEspVenc(); if(vs.length) out.push({c:'warn',t:vs.length+(vs.length>1?' pessoas':' pessoa')+' em espera com o prazo vencido',d:vs.slice(0,3).map(x=>x.p.n+(x.p.espMot?' ('+x.p.espMot+')':'')).join(' · '),go:'gxqd'}); } } }catch(e){} return out; }; }

/* ===== 17/11/2026 · Quadro de pessoas em áreas (escolha da usuária no protótipo "Quadro de pessoas · opções de layout":
   A = colunas por área, com o "Sem setor no quadro" da B e o "Total da fábrica" da C).
   - D.areas [{id,nome,cor}]; cada coluna tem c.area. Sem áreas gravadas, monta Produção · Apoio · Fixcol pelo nome do setor.
   - Arrastar o setor pela alça (cabeçalho) para outro lugar ou outra área; a área muda de ordem com ↑ ↓; recolher fica no aparelho.
   - Vaga = lugar tracejado na coluna (meta − pessoas que não saem).
   - Sem setor no quadro = pessoas do RH (presença e cadastro publicados pelo RH, sem CPF) que não estão em nenhuma coluna;
     arrastar para a coluna, ou tocar no nome e depois em "Pôr … aqui". */
const QD_AREAS=[{id:'pro',nome:'Produção',cor:'#1F5F7A'},{id:'apo',nome:'Apoio',cor:'#B07A1A'},{id:'fix',nome:'Fixcol',cor:'#6B4E9B'}];
const QD_ACORES=['#1F5F7A','#B07A1A','#6B4E9B','#2F6E4F','#B5473F','#2B6A87'];
function qdAreaPadrao(nome){ const k=qdK(nome); if(/^LINHA|PREMIX|ARGAMASSA/.test(k)) return 'pro'; if(/ALMOX|EXPEDI|CARGA|ADM|MANUT|PORTARIA|LIMPEZA/.test(k)) return 'apo'; if(/REJUNTE|FIXCOL|LIQUID/.test(k)) return 'fix'; return 'pro'; }
function qdAreas(){ const D=qdD(); if(!Array.isArray(D.areas)||!D.areas.length) D.areas=QD_AREAS.map(a=>Object.assign({},a));
  D.cols.forEach(c=>{ if(!c.area||!D.areas.some(a=>a.id===c.area)) c.area=qdAreaPadrao(c.nome); if(!D.areas.some(a=>a.id===c.area)) c.area=D.areas[0].id; }); return D.areas; }
function qdAreaDe(c){ return c.area||qdAreaPadrao(c.nome); }
function qdTotArea(cs){ let at=0, meta=0; cs.forEach(c=>{ const M=qdMetaDe(c); at+=M.at; meta+=M.meta||0; }); return {at,meta}; }
function qdRecol(){ try{ return JSON.parse(localStorage.getItem('colafix.qd.recol')||'{}')||{}; }catch(e){ return {}; } }
function qdTotalHtml(){ const D=qdD(), t=qdTot(); let at=0, meta=0, falta=0, sobra=0; D.cols.forEach(c=>{ const M=qdMetaDe(c); at+=M.at; if(M.meta){ meta+=M.meta; if(M.df<0) falta-=M.df; else sobra+=M.df; } });
  const pc=meta?Math.min(100,Math.round(at/meta*100)):0;
  return `<section class="qd-tot"><div class="qd-tote">TOTAL DA FÁBRICA</div><div class="qd-totn"><b>${at}</b><span>${meta?'de '+meta+' pela meta':at===1?'pessoa':'pessoas'}</span></div>
    ${meta?`<div class="qd-totb"><i style="width:${pc}%"></i></div>`:'<div class="qd-totsm">Ponha "quantos precisa" em cada setor para ver as vagas.</div>'}
    <div class="qd-totg"><span>Faltam <b>${falta}</b></span><span>Sobram <b>${sobra}</b></span><span>Saem <b>${t.sai}</b></span><span>Em espera <b>${t.esp}</b></span></div></section>`; }
function qdLivres(){ const L=(S.qd._rh||qdPessoasRH()).map(p=>({n:p.n,s:p.s,e:p.e}));
  (S.qd.cad||[]).forEach(c=>{ if(c&&c.n&&!L.some(x=>qdMesma(x.n,c.n))) L.push({n:c.n,s:c.s||'',e:c.e||''}); });
  return L.filter(p=>!qdOnde(p.n)).sort((a,b)=>a.n.localeCompare(b.n,'pt-BR')); }
function qdIniN(n){ const w=String(n).split(/\s+/).filter(Boolean); return ((w[0]||'')[0]||'')+(w.length>1?w[w.length-1][0]:''); }
function qdLivresHtml(){ const L=qdLivres(), tem=(S.qd._rh||[]).length||(S.qd.cad||[]).length;
  return `<section class="qd-lv0"><div class="qd-lvh"><b>Sem setor no quadro</b><span class="qd-lvc">${L.length}</span></div>
    <div class="sub" style="margin:0">Pessoas do RH que ainda não estão em nenhum setor. Arraste para uma coluna ou toque no nome.</div>
    ${S.qd.lvSel?`<div class="qd-lvsel">Escolha o setor para <b>${esc(qdNomeV(S.qd.lvSel))}</b> · <button class="lnk" data-act="qd-lvx">cancelar</button></div>`:''}
    ${L.length>6?`<input class="txt" id="qd-lvq" type="search" autocomplete="off" placeholder="Procurar" value="${esc(S.qd.lvq)}">`:''}
    <div class="qd-lvl">${L.map(p=>`<div role="button" tabindex="0" class="qd-lv ${S.qd.lvSel===p.n?'on':''}" draggable="true" data-qdlv="${esc(p.n)}" data-act="qd-lvsel" data-v="${esc(p.n)}" data-b="${esc(qdK([p.n,p.s,p.e].join(' ')))}"><span class="qd-lvi">${esc(qdIniN(p.n).toUpperCase())}</span><span class="qd-lvt"><b>${esc(qdNomeV(p.n))}</b><small>${esc([qdInfo(p.n).v,p.s,qdCap(p.e)].filter(Boolean).join(' · '))}</small></span></div>`).join('')
      ||`<div class="sub" style="margin:0">${tem?'Todo mundo do RH já está no quadro.':'A lista aparece quando o RH publicar a presença do Face ID.'}</div>`}</div></section>`; }
function qdLvFiltra(){ const q=qdK(S.qd.lvq), ws=q?q.split(' '):[]; document.querySelectorAll('.qd-lv').forEach(x=>{ const b=x.dataset.b||''; x.style.display=!ws.length||ws.every(w=>b.split(' ').some(y=>y.startsWith(w)))?'':'none'; }); }
setTimeout(()=>{ try{ depoisDoRender(()=>{ if(S.view==='gxqd') qdLvFiltra(); },'quadro: sem setor'); }catch(e){} },0);
function qdAcaoArea(a,v,b){ const D=qdD(), AR=qdAreas(); if(a!=='qd-arx') S.qd.arx=null;
  if(a==='qd-lvsel'){ S.qd.lvSel=S.qd.lvSel===v?null:v; render(); return true; }
  if(a==='qd-lvx'){ S.qd.lvSel=null; render(); return true; }
  if(a==='qd-lvpor'){ const n=S.qd.lvSel; S.qd.lvSel=null; if(n) qdPor(n,v); render(); return true; }
  if(a==='qd-arrec'){ const r=qdRecol(); if(r[v]) delete r[v]; else r[v]=1; try{ localStorage.setItem('colafix.qd.recol',JSON.stringify(r)); }catch(e){} render(); return true; }
  if(a==='qd-arnova'){ const id='a'+qdId(); AR.push({id,nome:'Nova área',cor:QD_ACORES[AR.length%QD_ACORES.length]}); S.qd.arEd=id; qdLog('Nova área'); qdGrava(); render(); setTimeout(()=>{ const i=document.getElementById('qd-arn'); if(i){ i.focus(); i.select(); } },50); return true; }
  if(a==='qd-ared'){ S.qd.arEd=v; render(); setTimeout(()=>{ const i=document.getElementById('qd-arn'); if(i){ i.focus(); i.select(); } },50); return true; }
  if(a==='qd-arok'){ const i=document.getElementById('qd-arn'), ar=AR.find(x=>x.id===S.qd.arEd); if(i&&ar&&i.value.trim()){ const nv=i.value.trim().slice(0,30); if(nv!==ar.nome){ qdLog('Área "'+ar.nome+'" virou "'+nv+'"'); ar.nome=nv; qdGrava(); } } S.qd.arEd=null; render(); return true; }
  if(a==='qd-arsob'||a==='qd-ardes'){ const i=AR.findIndex(x=>x.id===v), j=i+(a==='qd-arsob'?-1:1); if(i>=0&&j>=0&&j<AR.length){ const [x]=AR.splice(i,1); AR.splice(j,0,x); qdGrava(); } render(); return true; }
  if(a==='qd-arx'){ const ar=AR.find(x=>x.id===v); if(!ar) return true; const n=D.cols.filter(c=>qdAreaDe(c)===v).length; if(n||AR.length<2||S.qd.arx!==v){ S.qd.arx=v; render(); return true; } D.areas=AR.filter(x=>x.id!==v); S.qd.arx=null; qdLog('Apagou a área "'+ar.nome+'"'); qdGrava(); render(); return true; }
  if(a==='qd-arcol'){ D.cols.push({id:qdId(),nome:'Nova coluna',ps:[],area:v}); S.qd.ed=D.cols[D.cols.length-1].id; qdGrava(); render(); setTimeout(()=>{ const i=document.getElementById('qd-cn'); if(i){ i.focus(); i.select(); } },50); return true; }
  return false; }
/* mover setor (arrastar o cabeçalho) */
function qdMoveCol(cid,alvo,depois,area){ const D=qdD(), c=D.cols.find(x=>x.id===cid); if(!c) return; qdAreas(); const de=qdAreaDe(c);
  D.cols.splice(D.cols.indexOf(c),1);
  const o=alvo&&D.cols.find(x=>x.id===alvo);
  if(o){ c.area=qdAreaDe(o); D.cols.splice(D.cols.indexOf(o)+(depois?1:0),0,c); }
  else { c.area=area||de; const ult=D.cols.map(x=>qdAreaDe(x)).lastIndexOf(c.area); D.cols.splice(ult>=0?ult+1:D.cols.length,0,c); }
  if(c.area!==de){ const AR=qdAreas(), n=id=>(AR.find(x=>x.id===id)||{}).nome||id; qdLog('Setor "'+c.nome+'": '+n(de)+' → '+n(c.area)); }
  qdGrava(); }
document.addEventListener('dragstart',e=>{ if(S.view!=='gxqd'||!e.target.closest) return;
  const h=e.target.closest('[data-qdcd]'); if(h&&!e.target.closest('.qd-p')){ S.qd.cdrag=h.dataset.qdcd; const c=h.closest('.qd-c'); if(c) c.classList.add('cdrag'); try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain','col:'+S.qd.cdrag); }catch(x){} return; }
  const l=e.target.closest('.qd-lv'); if(l){ S.qd.ldrag=l.dataset.qdlv; l.classList.add('drag'); try{ e.dataTransfer.effectAllowed='copyMove'; e.dataTransfer.setData('text/plain',S.qd.ldrag); }catch(x){} } });
function qdLimpaCol(){ document.querySelectorAll('.qd-c.cinsl,.qd-c.cinsr,.qd-ar.over').forEach(x=>x.classList.remove('cinsl','cinsr','over')); }
document.addEventListener('dragover',e=>{ if(!S.qd.cdrag||!e.target.closest) return; const c=e.target.closest('.qd-c'), ar=e.target.closest('.qd-ar'); if(!c&&!ar) return; e.preventDefault(); qdLimpaCol();
  if(c&&c.dataset.qdcol!==S.qd.cdrag){ const r=c.getBoundingClientRect(); c.classList.add(e.clientX>r.left+r.width/2?'cinsr':'cinsl'); } else if(!c&&ar) ar.classList.add('over'); });
document.addEventListener('drop',e=>{ if(!S.qd.cdrag||!e.target.closest) return; const c=e.target.closest('.qd-c'), ar=e.target.closest('.qd-ar'); if(!c&&!ar) return; e.preventDefault(); const id=S.qd.cdrag; S.qd.cdrag=null; qdLimpaCol();
  if(c){ if(c.dataset.qdcol!==id){ const r=c.getBoundingClientRect(); qdMoveCol(id,c.dataset.qdcol,e.clientX>r.left+r.width/2); } } else qdMoveCol(id,null,false,ar.dataset.qdar); render(); });
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='qd-lvq'){ S.qd.lvq=e.target.value; qdLvFiltra(); } });
document.addEventListener('keydown',e=>{ if(S.view==='gxqd'&&e.target&&e.target.classList&&e.target.classList.contains('qd-lv')&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); e.target.click(); return; }
  if(S.view==='gxqd'&&e.target&&e.target.id==='qd-arn'&&e.key==='Enter'){ e.preventDefault(); const b=document.querySelector('[data-act="qd-arok"]'); if(b) b.click(); } });
window.Painel.quadro.areas=()=>qdAreas(); window.Painel.quadro.livres=()=>qdLivres(); window.Painel.quadro.moveCol=qdMoveCol;
document.head.insertAdjacentHTML('beforeend',`<style id="qd-css2">
.qd-lay{display:grid;grid-template-columns:270px minmax(0,1fr);gap:16px;align-items:start}
.qd-lado{position:sticky;top:76px;display:flex;flex-direction:column;gap:12px;max-height:calc(100vh - 96px)}
.qd-tot{background:#143F54;color:#fff;border-radius:16px;padding:16px}.qd-tote{font-size:11.5px;letter-spacing:.08em;opacity:.75;font-weight:600}
.qd-totn{display:flex;align-items:baseline;gap:8px;margin-top:6px}.qd-totn b{font-size:40px;font-weight:300;line-height:1}.qd-totn span{opacity:.8;font-size:14px}
.qd-totb{height:8px;border-radius:6px;background:rgba(255,255,255,.2);margin-top:10px;overflow:hidden}.qd-totb i{display:block;height:8px;background:#8FD3B0}
.qd-totsm{font-size:12px;opacity:.75;margin-top:8px}
.qd-totg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;font-size:13px}.qd-totg b{font-size:18px;font-weight:500}
.qd-lv0{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden}
.qd-lvh{display:flex;align-items:center;gap:8px}.qd-lvc{font-size:12px;background:var(--ground);border-radius:999px;padding:1px 8px;color:var(--muted)}
.qd-lvl{display:flex;flex-direction:column;gap:6px;overflow:auto;min-height:0;max-height:52vh}
.qd-lv{display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:12px;background:var(--ground);border:1px solid transparent;font:inherit;color:inherit;text-align:left;cursor:grab;flex:none}
.qd-lv:hover{border-color:var(--line)}.qd-lv.on{border-color:var(--teal);outline:2px solid var(--teal)}.qd-lv.drag{opacity:.4}
.qd-lvi{width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,var(--teal) 16%,var(--surface));color:var(--teal-strong,#143F54);font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.qd-lvt{min-width:0}.qd-lvt b{display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qd-lvt small{display:block;font-size:11px;color:var(--muted)}
.qd-lvsel{font-size:13px;background:color-mix(in srgb,var(--teal) 10%,transparent);border-radius:10px;padding:8px 10px}
.qd-lvpor{margin:6px 6px 0}
.qd-areas{display:flex;flex-direction:column;gap:18px;min-width:0}
.qd-ar{border-radius:16px}.qd-ar.over{outline:2px dashed var(--teal);outline-offset:4px}
.qd-arh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 2px 8px}
.qd-arpin{width:12px;height:12px;border-radius:4px;flex:none}
.qd-art{background:none;border:0;padding:0;font:inherit;font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:inherit;cursor:pointer}
.qd-arn{width:200px}.qd-ars{font-size:12.5px;color:var(--muted)}.qd-ars b.c{color:var(--crit)}.qd-ars b.w{color:var(--warn)}
.qd-arvz{color:var(--muted);font-size:13px;border:1.5px dashed var(--line);border-radius:12px;padding:18px;text-align:center;grid-column:1/-1}
.qd-ar.fech .qd-arh{margin-bottom:0;opacity:.8}
.qd-c header[draggable="true"]{cursor:grab}.qd-alc{color:var(--muted);font-size:13px;letter-spacing:-2px;flex:none}
.qd-c.cdrag{opacity:.4}.qd-c.cinsl{box-shadow:-4px 0 0 0 var(--teal)}.qd-c.cinsr{box-shadow:4px 0 0 0 var(--teal)}
.qd-vg{border:1.5px dashed color-mix(in srgb,var(--muted) 45%,transparent);border-radius:8px;padding:8px;font-size:12px;color:var(--muted);text-align:center}
@media (max-width:1100px){.qd-lay{grid-template-columns:1fr}.qd-lado{position:static;max-height:none}.qd-lvl{max-height:240px}}
</style>`);
/* Visual do quadro (17/11/2026, "melhorar o visual para o usuário"): cartões com iniciais e nome numa linha, faixa de situação embaixo,
   setor com a cor da área e barra da meta, legenda curta e "Imprimir" num menu. Só aparência. */
document.head.insertAdjacentHTML('beforeend',`<style id="qd-css3">
.qd-lg{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:-4px 0 16px;font-size:12.5px;color:var(--muted)}
.qd-lgi{display:inline-flex;align-items:center;gap:5px}.qd-lgs{font-style:normal;font-size:10px;font-weight:700;min-width:18px;height:18px;padding:0 3px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;color:#fff;background:var(--muted)}
.qd-lgs.ok{background:var(--ok)}.qd-lgs.warn{background:var(--warn)}.qd-lgs.esp{background:var(--pc-info,var(--teal))}.qd-lgs.nef{background:var(--qd-nef)}.qd-lgs.crit{background:var(--crit)}
.qd-lgd{width:9px;height:9px;border-radius:50%;display:inline-block}.qd-lgd.veio{background:var(--ok)}.qd-lgd.faltou{background:var(--crit)}.qd-lgd.ferias{background:var(--pc-info,var(--teal))}
.qd-lgv{font-size:12px}
.qd-impm{position:relative}.qd-impm>summary{list-style:none;cursor:pointer}.qd-impm>summary::-webkit-details-marker{display:none}.qd-impm>summary::after{content:"▾";margin-left:6px;font-size:11px}
.qd-impl{position:absolute;right:0;top:calc(100% + 6px);z-index:40;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(20,63,84,.18);padding:6px;min-width:260px;display:flex;flex-direction:column}
.qd-impl button{font:inherit;color:inherit;background:none;border:0;border-radius:8px;padding:9px 10px;text-align:left;cursor:pointer}.qd-impl button:hover{background:var(--ground)}.qd-impl b{display:block;font-size:14px;font-weight:600}.qd-impl small{display:block;font-size:12px;color:var(--muted)}
.qd-k{border-radius:14px;padding:10px 16px;min-width:104px;box-shadow:0 1px 2px rgba(16,40,52,.04)}.qd-k b{font-size:26px;font-weight:300;line-height:1.1}
.qd-g{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.qd-c{background:color-mix(in srgb,var(--ground) 70%,var(--surface));border:1px solid var(--line);border-top:3px solid var(--qa,var(--teal));border-radius:14px;overflow:hidden}
.qd-c header{border-bottom:0;padding:12px 12px 8px;background:var(--surface);gap:6px 8px}
.qd-ct{text-transform:none;font-size:15.5px;font-weight:650;letter-spacing:-.01em}
.qd-cc{font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;background:var(--ground);color:var(--ink,inherit)}
.qd-cbar{flex-basis:100%;height:5px;border-radius:5px;background:var(--line);overflow:hidden}.qd-cbar i{display:block;height:100%;border-radius:5px;background:var(--ok)}.qd-cbar.crit i{background:var(--crit)}.qd-cbar.warn i{background:var(--warn)}
.qd-ps{padding:8px;gap:7px}
.qd-p{flex-direction:column;align-items:stretch;gap:8px;padding:9px 10px 8px;background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:12px;box-shadow:0 1px 2px rgba(16,40,52,.05)}
.qd-p:hover{box-shadow:0 3px 10px rgba(16,40,52,.10)}
.qd-pr{display:flex;align-items:flex-start;gap:9px;min-width:0}
.qd-pav{flex:none;width:32px;height:32px;border-radius:50%;background:var(--ground);color:var(--ink,inherit);font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 2px var(--line);margin:0;vertical-align:top}
.qd-pav.qd-dot{width:32px;height:32px;margin:0;background:var(--ground)}.qd-pav.veio{box-shadow:inset 0 0 0 2.5px var(--ok)}.qd-pav.faltou{box-shadow:inset 0 0 0 2.5px var(--crit);color:var(--crit)}.qd-pav.ferias{box-shadow:inset 0 0 0 2.5px var(--pc-info,var(--teal))}
.qd-nm{padding:0}.qd-nmt{display:block;font-size:14px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qd-nm small{font-size:11.5px;margin-top:1px}.qd-inf{font-size:11.5px;margin-top:2px}
.qd-sts{display:flex;gap:3px;background:var(--ground);border-radius:9px;padding:3px}
.qd-st{flex:1;width:auto;height:26px;border:0;border-radius:7px;background:transparent;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.qd-st:hover{background:var(--surface)}.qd-stl{font-size:11px;font-weight:500}
.qd-st.on .qd-stl{font-weight:600}
@container qdc (max-width:270px){.qd-stl{display:none}}
.qd-ps{container:qdc/inline-size}
.qd-p.st-sai{opacity:.72}.qd-p.st-sai .qd-nmt{text-decoration:line-through}
.qd-vg{border-radius:12px;padding:12px 8px;background:transparent}
.qd-c footer{background:var(--surface);font-size:12.5px;gap:10px}
.qd-ar{margin-bottom:22px}.qd-arh{padding-bottom:8px;border-bottom:1px solid var(--line);margin-bottom:12px}.qd-arpin{width:12px;height:12px;border-radius:4px}
.qd-art{font-size:15px;letter-spacing:.02em;text-transform:none;font-weight:700}
</style>`);
/* menu Imprimir: fecha ao escolher ou ao tocar fora */
document.addEventListener('click',e=>{ document.querySelectorAll('details.qd-impm[open]').forEach(d=>{ if(!d.contains(e.target)||e.target.closest('.qd-impl button')) setTimeout(()=>{ d.open=false; },0); }); });
/* ===== 17/11/2026 · Setores que recolhem, busca por setor e organograma (pedido: "pesquisar por setor, o setor poder fechar e abrir
   para ter mais espaço, tratar os setores como cards e poder ligar eles como organograma").
   - Recolher: cada setor (▾/▸ no cabeçalho) fica só com o nome, a contagem e as iniciais; lembrado no aparelho (colafix.qd.crec).
     Dá para soltar pessoas num setor recolhido (entram no fim).
   - Busca de cima acha o nome do setor (mostra o setor inteiro) e esconde os setores e áreas sem nada.
   - Organograma (Quadro | Organograma, lembrado em colafix.qd.vis): Colafix → áreas → setores; c.pai = setor de cima,
     c.resp = responsável (nome). Ligar: arrastar um cartão para cima de outro, ou "Fica abaixo de" no painel do setor.
     Soltar numa área = direto na área. Cada ramo recolhe (colafix.qd.orec). Imprimir › Organograma. */
S.qd.vis=(()=>{ try{ return localStorage.getItem('colafix.qd.vis')==='org'?'org':'col'; }catch(e){ return 'col'; } })();
S.qd.osel=null; S.qd.odrag=null;
function qdLS(k){ try{ return JSON.parse(localStorage.getItem(k)||'{}')||{}; }catch(e){ return {}; } }
function qdLSg(k,o){ try{ localStorage.setItem(k,JSON.stringify(o)); }catch(e){} }
function qdCrec(){ return qdLS('colafix.qd.crec'); }
function qdPkAttrs(p){ const I=qdInfo(p.n), habs=p.hab||[];
  return `data-b="${esc(qdK([p.n,p.obs,habs.join(' '),I.e,I.s,I.fn,p.espMot].join(' ')))}" data-e="${esc(qdK(I.e))}" data-vi="${esc(I.v)}" data-h="|${esc(habs.map(qdK).join('|'))}|"`; }
function qdRecBody(c){ return `<div class="qd-ps qd-psrec" data-qdcol="${esc(c.id)}">${c.ps.map(p=>{ const I=qdInfo(p.n), st=QD_ST[p.st];
    return `<button class="qd-pk ${p.st?'st-'+p.st:'st-sem'} ${I.hoje||''}" data-act="qd-sel" data-v="${esc(p.id)}" ${qdPkAttrs(p)} title="${esc(qdNomeV(p.n)+(st?' · '+st.t:''))}">${esc(qdIniN(p.n).toUpperCase())}</button>`; }).join('')||'<span class="qd-pk0">vazio · solte alguém aqui</span>'}</div>`; }
/* árvore */
function qdOrgPai(c){ const D=qdD(); let p=c.pai&&D.cols.find(x=>x.id===c.pai&&x.id!==c.id); const vis=new Set([c.id]);
  for(let x=p;x;x=x.pai&&D.cols.find(y=>y.id===x.pai)){ if(vis.has(x.id)) return null; vis.add(x.id); } return p||null; }
function qdOrgFilhos(id){ return qdD().cols.filter(c=>{ const p=qdOrgPai(c); return id?p&&p.id===id:!p; }); }
function qdOrgDesc(id){ const out=new Set(), f=x=>qdOrgFilhos(x).forEach(c=>{ if(!out.has(c.id)){ out.add(c.id); f(c.id); } }); f(id); return out; }
function qdOrgSoma(id){ let at=0, meta=0, n=0; const f=c=>{ const M=qdMetaDe(c); at+=M.at; meta+=M.meta||0; n++; qdOrgFilhos(c.id).forEach(f); }; const c=qdD().cols.find(x=>x.id===id); if(c) f(c); return {at,meta,n}; }
function qdOrgNo(c){ const D=qdD(), M=qdMetaDe(c), kids=qdOrgFilhos(c.id), rec=!!qdLS('colafix.qd.orec')[c.id], AR=qdAreas(), ar=AR.find(a=>a.id===qdAreaDe(c))||{};
  const pc=M.meta?Math.min(100,Math.round(M.at/M.meta*100)):0, bc=M.meta?(M.df<0?'crit':M.df>0?'warn':'ok'):'';
  const es=[...new Set(c.ps.map(p=>qdK(qdInfo(p.n).e)).filter(Boolean))], vs=[...new Set(c.ps.map(p=>qdInfo(p.n).v).filter(Boolean))], hs=[...new Set(c.ps.flatMap(p=>(p.hab||[]).map(qdK)))];
  const avs=c.ps.slice(0,7).map(p=>{ const I=qdInfo(p.n); return `<i class="qdo-av ${I.hoje||''} ${p.st?'st-'+p.st:''}" title="${esc(qdNomeV(p.n))}">${esc(qdIniN(p.n).toUpperCase())}</i>`; }).join('')+(c.ps.length>7?`<i class="qdo-av mais">+${c.ps.length-7}</i>`:'');
  const sai=c.ps.filter(p=>p.st==='sai').length, esp=c.ps.filter(p=>p.st==='esp').length, duv=c.ps.filter(p=>p.st==='duv').length;
  const sub=rec&&kids.length?qdOrgSoma(c.id):null;
  return `<li><div class="qdo-n ${S.qd.osel===c.id?'sel':''}" role="button" tabindex="0" draggable="true" data-qdon="${esc(c.id)}" data-act="qdo-sel" data-v="${esc(c.id)}" data-cn="${esc(qdK(c.nome))}" data-b="${esc(qdK(c.ps.map(p=>p.n+' '+(p.hab||[]).join(' ')).join(' ')+' '+(c.resp||'')))}" data-e="|${esc(es.join('|'))}|" data-vi="|${esc(vs.join('|'))}|" data-h="|${esc(hs.join('|'))}|" style="--qa:${esc(ar.cor||'#1F5F7A')}">
    <div class="qdo-nh"><b>${esc(c.nome)}</b><span class="qd-cc">${M.meta?M.at+'/'+M.meta:c.ps.length}</span></div>
    <div class="qdo-r">${c.resp?`<span class="qdo-rl">Responsável</span> ${esc(qdNomeV(c.resp))}`:'<span class="qdo-rl">sem responsável</span>'}</div>
    ${M.meta?`<div class="qd-cbar ${bc}"><i style="width:${pc}%"></i></div><div class="qdo-m ${bc}">${M.df<0?'faltam '+(-M.df):M.df>0?'sobra'+(M.df>1?'m ':' ')+M.df:'completo'}</div>`:''}
    <div class="qdo-avs">${avs||'<span class="qdo-vz">ninguém ainda</span>'}</div>
    ${sai||esp||duv?`<div class="qdo-st">${sai?`<span class="crit">${sai} sai</span>`:''}${esp?`<span class="esp">${esp} em espera</span>`:''}${duv?`<span class="warn">${duv} em dúvida</span>`:''}</div>`:''}
    ${kids.length?`<button class="qdo-rb" data-act="qdo-rec" data-v="${esc(c.id)}" title="${rec?'Mostrar os setores de baixo':'Recolher os setores de baixo'}">${rec?`+ ${kids.length} ${kids.length>1?'setores':'setor'} · ${sub.at} pessoas`:'−'}</button>`:''}
  </div>${kids.length&&!rec?`<ul>${kids.map(qdOrgNo).join('')}</ul>`:''}</li>`; }
function qdOrgHtml(){ const D=qdD(), AR=qdAreas(), t=qdTotArea(D.cols);
  const ars=AR.map(ar=>{ const rs=qdOrgFilhos(null).filter(c=>qdAreaDe(c)===ar.id); const tA=qdTotArea(D.cols.filter(c=>qdAreaDe(c)===ar.id));
    return `<li><div class="qdo-n qdo-ar" data-qdoa="${esc(ar.id)}" style="--qa:${esc(ar.cor||'#1F5F7A')}"><div class="qdo-nh"><b>${esc(ar.nome)}</b><span class="qd-cc">${tA.at}${tA.meta?'/'+tA.meta:''}</span></div><div class="qdo-r"><span class="qdo-rl">${rs.length?'área':'sem setor direto'}</span></div></div>${rs.length?`<ul>${rs.map(qdOrgNo).join('')}</ul>`:''}</li>`; }).join('');
  const z=qdOz();
  return `<div class="qdo-bar"><span class="qdo-dica">Arraste um setor para cima de outro para ligar (fica embaixo dele). Solte numa área para tirar a ligação. Toque no setor para escolher o responsável.</span>
      <span class="qdo-zm" role="group" aria-label="Tamanho"><button data-act="qdo-z" data-v="-" aria-label="Diminuir">−</button><button data-act="qdo-z" data-v="1" title="Tamanho normal">${Math.round(z*100)}%</button><button data-act="qdo-z" data-v="+" aria-label="Aumentar">+</button><button data-act="qdo-z" data-v="fit">Caber na tela</button></span></div>
    <div class="qdo"><ul class="qdo-t" style="zoom:${z}"><li><div class="qdo-n qdo-top" data-qdoa=""><div class="qdo-nh"><b>Colafix</b><span class="qd-cc">${t.at}${t.meta?'/'+t.meta:''}</span></div><div class="qdo-r"><span class="qdo-rl">${D.cols.length} setores</span></div></div><ul>${ars}</ul></li></ul></div>`; }
function qdOrgPainel(){ if(S.qd.vis!=='org'||!S.qd.osel) return ''; const D=qdD(), c=D.cols.find(x=>x.id===S.qd.osel); if(!c){ S.qd.osel=null; return ''; }
  const AR=qdAreas(), ds=qdOrgDesc(c.id), pai=qdOrgPai(c), M=qdMetaDe(c), outros=D.cols.flatMap(x=>x.id===c.id?[]:x.ps.map(p=>p.n));
  return `<div class="qd-sp card qdo-sp"><div class="qd-sph"><div><div class="eyebrow">SETOR NO ORGANOGRAMA</div><h3>${esc(c.nome)}</h3></div><button class="btn sec" data-act="qdo-fecha">Fechar</button></div>
    <label><span>Fica abaixo de</span><select class="txt" id="qdo-pai"><option value="">Ninguém (direto na área)</option>${D.cols.filter(x=>x.id!==c.id&&!ds.has(x.id)).map(x=>`<option value="${esc(x.id)}" ${pai&&pai.id===x.id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>
    ${pai?'':`<label><span>Área</span><select class="txt" id="qdo-area">${AR.map(a=>`<option value="${esc(a.id)}" ${qdAreaDe(c)===a.id?'selected':''}>${esc(a.nome)}</option>`).join('')}</select></label>`}
    <label><span>Responsável</span><select class="txt" id="qdo-resp"><option value="">Sem responsável</option>${c.ps.length?`<optgroup label="Neste setor">${c.ps.map(p=>`<option value="${esc(p.n)}" ${c.resp===p.n?'selected':''}>${esc(qdNomeV(p.n))}</option>`).join('')}</optgroup>`:''}${outros.length?`<optgroup label="De outro setor">${outros.map(n=>`<option value="${esc(n)}" ${c.resp===n?'selected':''}>${esc(qdNomeV(n))}</option>`).join('')}</optgroup>`:''}${c.resp&&!c.ps.some(p=>p.n===c.resp)&&!outros.includes(c.resp)?`<option value="${esc(c.resp)}" selected>${esc(qdNomeV(c.resp))}</option>`:''}</select></label>
    <div class="qd-dl" style="display:block"><b>${c.ps.length} ${c.ps.length===1?'pessoa':'pessoas'}</b>${M.meta?` · precisa de ${M.meta}`:''}${ds.size?` · ${ds.size} ${ds.size>1?'setores':'setor'} abaixo`:''}
      <div class="qdo-pl">${c.ps.map(p=>`<span>${esc(qdNomeV(p.n))}${p.st&&QD_ST[p.st]?` <small>${esc(QD_ST[p.st].t.toLowerCase())}</small>`:''}</span>`).join('')||'<span class="sub">Ninguém neste setor.</span>'}</div></div>
    <div class="qd-spa"><button class="btn sec" data-act="qdo-ver" data-v="${esc(c.id)}">Ver no quadro</button></div></div>`; }
/* ações */
function qdOrgLiga(id,paiId,area){ const D=qdD(), c=D.cols.find(x=>x.id===id); if(!c) return false; const AR=qdAreas(), nA=a=>(AR.find(x=>x.id===a)||{}).nome||a;
  if(paiId){ if(paiId===id||qdOrgDesc(id).has(paiId)){ toast('Não dá: '+(D.cols.find(x=>x.id===paiId)||{}).nome+' está abaixo de '+c.nome+'.'); return false; }
    const p=D.cols.find(x=>x.id===paiId); if(!p) return false; if(c.pai===paiId) return false; c.pai=paiId; qdLog('Setor "'+c.nome+'" agora fica abaixo de "'+p.nome+'"'); }
  else { const tinha=c.pai&&qdOrgPai(c); delete c.pai; if(area&&area!==qdAreaDe(c)){ qdLog('Setor "'+c.nome+'": '+nA(qdAreaDe(c))+' → '+nA(area)); c.area=area; } else if(tinha) qdLog('Setor "'+c.nome+'" não fica mais abaixo de "'+tinha.nome+'"'); else if(!area) return false; }
  qdGrava(); return true; }
document.addEventListener('click',e=>{ if(S.view!=='gxqd'||!e.target.closest) return; const b=e.target.closest('[data-act^="qd-crec"],[data-act="qd-vis"],[data-act^="qdo-"]'); if(!b) return; const a=b.dataset.act, v=b.dataset.v, D=qdD();
  if(a==='qd-crec'){ const r=qdCrec(); if(r[v]) delete r[v]; else r[v]=1; qdLSg('colafix.qd.crec',r); render(); return; }
  if(a==='qd-crectodos'){ const r={}; if(v==='fechar') D.cols.forEach(c=>{ r[c.id]=1; }); qdLSg('colafix.qd.crec',r); render(); return; }
  if(a==='qd-vis'){ S.qd.vis=v==='org'?'org':'col'; try{ localStorage.setItem('colafix.qd.vis',S.qd.vis); }catch(er){} S.qd.osel=null; S.qd.sel=null; render(); return; }
  if(a==='qdo-sel'){ S.qd.osel=S.qd.osel===v?null:v; S.qd.sel=null; S.qd.painel=''; render(); return; }
  if(a==='qdo-fecha'){ S.qd.osel=null; render(); return; }
  if(a==='qdo-rec'){ e.stopPropagation(); const r=qdLS('colafix.qd.orec'); if(r[v]) delete r[v]; else r[v]=1; qdLSg('colafix.qd.orec',r); render(); return; }
  if(a==='qdo-ver'){ S.qd.vis='col'; try{ localStorage.setItem('colafix.qd.vis','col'); }catch(er){} S.qd.osel=null; const r=qdCrec(); if(r[v]){ delete r[v]; qdLSg('colafix.qd.crec',r); }
    const rr=qdRecol(), c=D.cols.find(x=>x.id===v); if(c&&rr[qdAreaDe(c)]){ delete rr[qdAreaDe(c)]; qdLSg('colafix.qd.recol',rr); }
    render(); setTimeout(()=>{ const el=document.querySelector(`.qd-c[data-qdcol="${CSS.escape(v)}"]`); if(el){ el.scrollIntoView({block:'center',behavior:'smooth'}); el.classList.add('qd-flash'); setTimeout(()=>el.classList.remove('qd-flash'),1600); } },80); return; }
  if(a==='qdo-imp'){ const dt=b.closest('details'); if(dt) dt.open=false; qdOrgImprimir(); return; }
},true);
document.addEventListener('change',e=>{ const t=e.target; if(!t||S.view!=='gxqd'||!S.qd.osel) return; const D=qdD(), c=D.cols.find(x=>x.id===S.qd.osel); if(!c) return;
  if(t.id==='qdo-pai'){ qdOrgLiga(c.id,t.value||null,null); render(); }
  else if(t.id==='qdo-area'){ qdOrgLiga(c.id,null,t.value); render(); }
  else if(t.id==='qdo-resp'){ const nv=t.value||''; if((c.resp||'')!==nv){ if(nv) c.resp=nv; else delete c.resp; qdLog('Setor "'+c.nome+'": responsável '+(nv?qdNomeV(nv):'nenhum')); qdGrava(); } render(); } });
document.addEventListener('keydown',e=>{ if(S.view!=='gxqd') return; if(e.key==='Escape'&&S.qd.osel){ S.qd.osel=null; render(); return; }
  if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.matches&&e.target.matches('.qdo-n[data-qdon]')){ e.preventDefault(); e.target.click(); } });
/* arrastar no organograma: setor em cima de setor (liga), em cima de área/Colafix (desliga); pessoa da lista "Sem setor" em cima do setor */
function qdoLimpa(){ document.querySelectorAll('.qdo-n.over,.qdo-n.nao,.qdo-n.drag').forEach(x=>x.classList.remove('over','nao','drag')); }
document.addEventListener('dragstart',e=>{ if(S.view!=='gxqd'||S.qd.vis!=='org'||!e.target.closest) return; const n=e.target.closest('.qdo-n[data-qdon]'); if(!n) return;
  S.qd.odrag=n.dataset.qdon; n.classList.add('drag'); try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain','org:'+S.qd.odrag); }catch(x){} });
document.addEventListener('dragend',()=>{ S.qd.odrag=null; qdoLimpa(); });
document.addEventListener('dragover',e=>{ if(S.view!=='gxqd'||S.qd.vis!=='org'||!e.target.closest) return; if(!S.qd.odrag&&!S.qd.ldrag) return; const n=e.target.closest('.qdo-n'); if(!n) return;
  if(S.qd.ldrag&&!n.dataset.qdon) return; e.preventDefault(); document.querySelectorAll('.qdo-n.over,.qdo-n.nao').forEach(x=>{ if(x!==n) x.classList.remove('over','nao'); });
  const ruim=S.qd.odrag&&n.dataset.qdon&&(n.dataset.qdon===S.qd.odrag||qdOrgDesc(S.qd.odrag).has(n.dataset.qdon)); n.classList.add(ruim?'nao':'over'); });
document.addEventListener('drop',e=>{ if(S.view!=='gxqd'||S.qd.vis!=='org'||!e.target.closest) return; const n=e.target.closest('.qdo-n'); if(!n||(!S.qd.odrag&&!S.qd.ldrag)) return; e.preventDefault();
  const id=S.qd.odrag, ln=S.qd.ldrag; S.qd.odrag=null; S.qd.ldrag=null; qdoLimpa();
  if(ln){ if(n.dataset.qdon) qdPor(ln,n.dataset.qdon); render(); return; }
  if(n.dataset.qdon){ if(n.dataset.qdon!==id) qdOrgLiga(id,n.dataset.qdon,null); } else qdOrgLiga(id,null,n.dataset.qdoa||null); render(); });
/* imprimir o organograma (A4 deitada, reduz para caber) */
function qdOrgImprimir(){ const w=window.open('','_blank'); if(!w){ toast('O navegador bloqueou a janela de impressão. Libere pop-ups para o painel.'); return; }
  let logo=''; try{ logo=(document.querySelector('.brand img')||{}).src||''; }catch(e){} const css=(document.getElementById('qd-org-css')||{}).textContent||'', t=qdTotArea(qdD().cols);
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Organograma</title><style>
    :root{--surface:#fff;--line:#C9D3DA;--muted:#5E6E77;--ground:#F2F4F6;--ok:#2F6E4F;--warn:#A86A16;--crit:#B5473F;--teal:#1F5F7A;--pc-info:#2B6A87;--qd-nef:#6B4E9B}
    @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font:10pt Arial,Helvetica,sans-serif;color:#143F54;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .t{display:flex;align-items:center;gap:14px;border-bottom:2px solid #143F54;padding-bottom:6px;margin-bottom:10px}.t img{height:32px}.t h1{font-size:16pt;margin:0}.t p{margin:2px 0 0;color:#5E6E77;font-size:9pt}
    ${css}.qdo{overflow:visible!important;padding:0!important}.qdo-rb,.qdo-dica{display:none!important}.qdo-n{box-shadow:none!important;cursor:default}</style></head><body>
    <div class="t">${logo?`<img src="${logo}" alt="Colafix">`:''}<div><h1>Organograma</h1><p>${t.at} pessoas · ${qdD().cols.length} setores · ${new Date().toLocaleDateString('pt-BR')}</p></div></div>
    <div id="o">${qdOrgHtml()}</div>
    <script>window.onload=()=>{ const o=document.querySelector('.qdo-t'), W=1060; if(o&&o.scrollWidth>W) document.getElementById('o').style.zoom=(W/o.scrollWidth).toFixed(3); setTimeout(()=>window.print(),350); }<\/script></body></html>`); w.document.close(); }
/* menu Imprimir ganha "Organograma" */
setTimeout(()=>{ try{ depoisDoRender(()=>{ if(S.view!=='gxqd') return; const l=document.querySelector('.qd-impl'); if(l&&!l.querySelector('[data-act="qdo-imp"]')) l.insertAdjacentHTML('beforeend','<button data-act="qdo-imp"><b>Organograma</b><small>Os setores ligados, com o responsável e as pessoas</small></button>'); },'quadro: organograma no imprimir'); }catch(e){} },0);
/* soltar pessoa num setor recolhido: entra no fim */
document.addEventListener('drop',e=>{ const ps=e.target&&e.target.closest&&e.target.closest('.qd-psrec'); if(ps&&(S.qd.drag||S.qd.ldrag)) S.qd._fimRec=true; },true);
{ const _qm=qdMove, _qp=qdPor; qdMove=function(pid,cid,pos){ if(S.qd._fimRec){ S.qd._fimRec=false; pos=null; } return _qm(pid,cid,pos); }; qdPor=function(n,cid,pos){ if(S.qd._fimRec){ S.qd._fimRec=false; pos=null; } return _qp(n,cid,pos); }; }
window.Painel.quadro.org={liga:qdOrgLiga,filhos:qdOrgFilhos,pai:qdOrgPai};
document.head.insertAdjacentHTML('beforeend',`<style id="qd-org-css">
.qd-vis{flex:none}
.qd-crb{border:0;background:none;color:var(--muted);font-size:13px;width:26px;height:26px;border-radius:7px;cursor:pointer;flex:none;padding:0}.qd-crb:hover{background:var(--ground);color:inherit}
.qd-c.crec{min-height:0}.qd-c.crec header{padding-bottom:10px}
.qd-psrec{flex-direction:row!important;flex-wrap:wrap;gap:5px!important;padding:6px 10px 10px!important;min-height:0!important}.qd-psrec .qd-ins{display:none}
.qd-pk{width:30px;height:30px;border-radius:50%;border:0;background:var(--surface);box-shadow:inset 0 0 0 2px var(--line);font:inherit;font-size:10.5px;font-weight:700;color:var(--ink,inherit);cursor:pointer;padding:0}
.qd-pk.veio{box-shadow:inset 0 0 0 2.5px var(--ok)}.qd-pk.faltou{box-shadow:inset 0 0 0 2.5px var(--crit);color:var(--crit)}.qd-pk.ferias{box-shadow:inset 0 0 0 2.5px var(--pc-info,var(--teal))}
.qd-pk.st-sai{opacity:.45;text-decoration:line-through}.qd-pk.qd-oc{display:none}.qd-pk0{font-size:12px;color:var(--muted)}
.qd-c.qd-ocol,.qd-ar.qd-ocol{display:none}.qd-c.qd-achou{outline:2px solid var(--teal);outline-offset:1px}
.qd-c.qd-flash{animation:qdFlash 1.6s}@keyframes qdFlash{0%,60%{box-shadow:0 0 0 4px color-mix(in srgb,var(--teal) 45%,transparent)}100%{box-shadow:none}}
.qdo-w{min-width:0}
.qdo-dica{font-size:12.5px;color:var(--muted);margin:0 0 8px}
.qdo{overflow:auto;padding:8px 4px 20px;background:var(--surface);border:1px solid var(--line);border-radius:16px}
.qdo ul{padding-top:22px;position:relative;display:flex;justify-content:center;margin:0;padding-left:0}.qdo>.qdo-t{width:max-content;margin:0 auto}
.qdo li{list-style:none;position:relative;padding:22px 7px 0;display:flex;flex-direction:column;align-items:center}
.qdo li::before,.qdo li::after{content:'';position:absolute;top:0;right:50%;width:50%;height:22px;border-top:2px solid var(--line)}
.qdo li::after{right:auto;left:50%;border-left:2px solid var(--line)}
.qdo li:only-child::before,.qdo li:only-child::after{display:none}.qdo li:only-child{padding-top:0}
.qdo li:first-child::before,.qdo li:last-child::after{border:0 none}
.qdo li:last-child::before{border-right:2px solid var(--line);border-radius:0 8px 0 0}.qdo li:first-child::after{border-radius:8px 0 0 0}
.qdo ul ul::before{content:'';position:absolute;top:0;left:50%;height:22px;border-left:2px solid var(--line)}
.qdo>.qdo-t{padding-top:6px}.qdo>.qdo-t>li{padding-top:0}.qdo>.qdo-t>li::before,.qdo>.qdo-t>li::after{display:none}
.qdo-n{position:relative;width:200px;background:var(--surface);border:1px solid var(--line);border-top:4px solid var(--qa,var(--teal));border-radius:12px;padding:9px 10px 9px;text-align:left;box-shadow:0 1px 2px rgba(16,40,52,.06),0 3px 10px rgba(16,40,52,.06);cursor:pointer;display:flex;flex-direction:column;gap:5px}
.qdo-n[data-qdon]{cursor:grab}.qdo-n:hover{box-shadow:0 4px 14px rgba(16,40,52,.14)}.qdo-n.sel{outline:2px solid var(--teal);outline-offset:1px}
.qdo-n.drag{opacity:.4}.qdo-n.over{outline:3px dashed var(--teal);outline-offset:2px;background:color-mix(in srgb,var(--teal) 8%,var(--surface))}.qdo-n.nao{outline:3px dashed var(--crit);outline-offset:2px}
.qdo-top{background:#143F54;color:#fff;border:0;border-top:0;width:180px;align-items:center;text-align:center}.qdo-top .qd-cc{background:rgba(255,255,255,.15);color:#fff}.qdo-top .qdo-rl{color:rgba(255,255,255,.75)}.qdo-top .qdo-nh{justify-content:center}
.qdo-ar{background:color-mix(in srgb,var(--qa) 10%,var(--surface));border-color:color-mix(in srgb,var(--qa) 35%,var(--line));width:170px}
.qdo-nh{display:flex;align-items:center;gap:6px;justify-content:space-between}.qdo-nh b{font-size:14px;font-weight:650;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qdo-r{font-size:12px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qdo-rl{color:var(--muted);font-size:11px}
.qdo-m{font-size:11px;font-weight:600;margin-top:-2px}.qdo-m.ok{color:var(--ok)}.qdo-m.warn{color:var(--warn)}.qdo-m.crit{color:var(--crit)}
.qdo-avs{display:flex;flex-wrap:wrap;gap:3px}.qdo-av{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--ground);font-size:8.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1.5px var(--line)}
.qdo-av.veio{box-shadow:inset 0 0 0 2px var(--ok)}.qdo-av.faltou{box-shadow:inset 0 0 0 2px var(--crit);color:var(--crit)}.qdo-av.ferias{box-shadow:inset 0 0 0 2px var(--pc-info,var(--teal))}.qdo-av.st-sai{opacity:.45}.qdo-av.mais{background:transparent;box-shadow:none;color:var(--muted);width:auto;padding:0 2px}
.qdo-vz{font-size:11px;color:var(--muted)}
.qdo-st{display:flex;flex-wrap:wrap;gap:2px 8px;font-size:11px}.qdo-st .crit{color:var(--crit)}.qdo-st .esp{color:var(--pc-info,var(--teal))}.qdo-st .warn{color:var(--warn)}
.qdo-rb{position:absolute;left:50%;bottom:-12px;transform:translateX(-50%);z-index:2;border:1px solid var(--line);background:var(--surface);border-radius:999px;font:inherit;font-size:11px;padding:1px 9px;min-width:24px;height:22px;cursor:pointer;color:var(--muted);white-space:nowrap}.qdo-rb:hover{color:inherit;border-color:var(--teal)}
.qdo-n.qdo-dim{opacity:.3}.qdo-n.qdo-hit{outline:2px solid var(--teal);outline-offset:1px}
.qdo-pl{display:flex;flex-direction:column;gap:3px;margin-top:6px;max-height:40vh;overflow:auto}.qdo-pl small{color:var(--muted)}
</style>`);
/* zoom e rolagem do organograma (a rolagem não volta ao começo quando a tela é redesenhada) */
function qdOz(){ try{ const z=parseFloat(localStorage.getItem('colafix.qd.oz')); return z>=0.3&&z<=1.5?z:1; }catch(e){ return 1; } }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-act="qdo-z"]'); if(!b||S.view!=='gxqd') return; let z=qdOz(); const v=b.dataset.v;
  if(v==='+') z=Math.min(1.5,z+0.1); else if(v==='-') z=Math.max(0.3,z-0.1); else if(v==='1') z=1;
  else if(v==='fit'){ const o=document.querySelector('.qdo'), t=o&&o.querySelector('.qdo-t'); if(t){ const w=t.scrollWidth*(parseFloat(t.style.zoom)||1); z=Math.max(0.3,Math.min(1,(o.clientWidth-16)/(w/(parseFloat(t.style.zoom)||1)))); } }
  z=Math.round(z*100)/100; try{ localStorage.setItem('colafix.qd.oz',String(z)); }catch(er){} S.qd.osx=null; render(); },true);
document.addEventListener('scroll',e=>{ const o=e.target; if(o&&o.classList&&o.classList.contains('qdo')) S.qd.osx=[o.scrollLeft,o.scrollTop]; },true);
setTimeout(()=>{ try{ depoisDoRender(()=>{ if(S.view!=='gxqd'||S.qd.vis!=='org') return; const o=document.querySelector('.qdo'); if(!o) return;
  if(S.qd.osx){ o.scrollLeft=S.qd.osx[0]; o.scrollTop=S.qd.osx[1]; } else { o.scrollLeft=Math.max(0,(o.scrollWidth-o.clientWidth)/2); S.qd.osx=[o.scrollLeft,0]; } },'quadro: rolagem do organograma'); }catch(e){} },0);
document.head.insertAdjacentHTML('beforeend',`<style id="qd-org-css2">
.qdo-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 8px}.qdo-bar .qdo-dica{margin:0;flex:1 1 300px}
.qdo-zm{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)}.qdo-zm button{font:inherit;font-size:12.5px;border:0;background:none;padding:5px 10px;cursor:pointer;color:inherit}.qdo-zm button+button{border-left:1px solid var(--line)}.qdo-zm button:hover{background:var(--ground)}
.qdo{max-height:calc(100vh - 150px)}.qdo-n{width:190px}
</style>`);
