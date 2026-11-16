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
S.qd={dados:null,sub:false,sel:null,q:'',add:null,ed:null,salv:0,drag:null,rasc:'',fil:'',busca:'',emp:'',vin:'',hab:'',painel:'',metaEd:null,cmp:null,cad:null,lido:false};
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
    if(d&&Array.isArray(d.cols)&&!(S.qd.salv&&Date.now()-S.qd.salv<2500)) S.qd.dados={cols:d.cols,em:d.em,porNome:d.porNome,hist:d.hist||[],versoes:d.versoes||[]}; S.qd.lido=true; rerenderSeguro(); });
  inscrever('qdcad',()=>S.db.collection('presenca').doc('cadastro'),snap=>{ S.qd.cad=snap&&snap.exists?((snap.data()||{}).cad||[]):[]; rerenderSeguro(); }); }
let _qdT=null;
function qdGrava(){ const D=qdD(); S.qd.dados=D; S.qd.salv=Date.now(); clearTimeout(_qdT);
  _qdT=setTimeout(async()=>{ try{ await S.db.collection('gxquadro').doc('atual').set({cols:D.cols,hist:(D.hist||[]).slice(-300),versoes:D.versoes||[],em:new Date().toISOString(),por:(S.user&&S.user.uid)||'',porNome:(typeof gxEu==='function'?gxEu():'')||''}); S.qd.salv=Date.now(); D.em=new Date().toISOString(); D.porNome=(typeof gxEu==='function'?gxEu():'')||''; const el=document.getElementById('qd-salvo'); if(el) el.textContent='Salvo agora'; }
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
  if(I.faltas) inf.push(`<b class="w">${I.faltas} falta${I.faltas>1?'s':''} em ${I.dias} dias</b>`);
  const venc=p.st==='esp'&&p.espAte&&p.espAte<h;
  const tag=p.st==='esp'?`<em class="qd-tag esp ${venc?'venc':''}">Em espera${p.espMot?' · '+esc(p.espMot):''}${p.espAte?(venc?' · venceu ':' · até ')+dm(p.espAte):''}</em>`:p.st==='nef'?'<em class="qd-tag nef">Não efetivo</em>':'';
  const dot=I.hoje?`<i class="qd-dot ${I.hoje}" title="${({veio:'Veio hoje',faltou:'Não veio hoje (sem registro no Face ID)',ferias:'De férias'})[I.hoje]}"></i>`:'';
  return `<div class="qd-p ${p.st?'st-'+p.st:'st-sem'} ${S.qd.sel===p.id?'sel':''}" draggable="true" data-qdp="${esc(p.id)}" data-qdc="${esc(c.id)}" data-b="${esc(qdK([p.n,p.obs,habs.join(' '),I.e,I.s,I.fn,p.espMot].join(' ')))}" data-e="${esc(qdK(I.e))}" data-vi="${esc(I.v)}" data-h="|${esc(habs.map(qdK).join('|'))}|">
    <span class="qd-n">${i+1}</span><button class="qd-nm" data-act="qd-sel" data-v="${esc(p.id)}" title="Mover, marcar ou anotar">${dot}${esc(p.n)}${p.obs?`<small>${esc(p.obs)}</small>`:''}${inf.length?`<span class="qd-inf">${inf.join('<i> · </i>')}</span>`:''}${tag}${habs.length?`<span class="qd-hbs">${habs.slice(0,3).map(x=>`<em class="qd-hb">${esc(x)}</em>`).join('')}${habs.length>3?`<em class="qd-hb">+${habs.length-3}</em>`:''}</span>`:''}</button>
    <span class="qd-sts">${Object.entries(QD_ST).map(([k,v])=>`<button class="qd-st ${v.c} ${p.st===k?'on':''}" data-act="qd-st" data-v="${esc(p.id)}" data-st="${k}" title="${v.t}" aria-label="${v.t}" aria-pressed="${p.st===k}">${v.i}</button>`).join('')}</span></div>`; }
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
  const cols=D.cols.map((c,ci)=>{ const cnt=Object.entries(QD_ST).map(([q,v])=>{ const n=c.ps.filter(p=>p.st===q).length; return n?`<i class="qd-ci ${v.c}">${n} ${q==='fica'?'fica':q==='sai'?'sai':v.t.toLowerCase()}</i>`:''; }).join('');
    const M=qdMetaDe(c), mc=M.meta?(M.df<0?`<i class="qd-ci crit qd-mt">faltam ${-M.df}</i>`:M.df>0?`<i class="qd-ci warn qd-mt">sobra${M.df>1?'m':''} ${M.df}</i>`:'<i class="qd-ci ok qd-mt">completo</i>'):'';
    return `<section class="qd-c" data-qdcol="${esc(c.id)}"><header>${S.qd.ed===c.id?`<input class="txt qd-cn" id="qd-cn" maxlength="40" value="${esc(c.nome)}"><button class="btn" data-act="qd-cnok">OK</button>`
      :`<button class="qd-ct" data-act="qd-ced" data-v="${esc(c.id)}" title="Renomear">${esc(c.nome)}</button><span class="qd-cc" title="${M.meta?'pessoas (sem contar quem sai) / quantas a coluna precisa':'pessoas'}">${M.meta?M.at+'/'+M.meta:c.ps.length}</span>${cnt||mc?`<div class="qd-cst">${mc}${cnt}</div>`:''}`}</header>
      <div class="qd-ps" data-qdcol="${esc(c.id)}">${c.ps.map((p,i)=>qdCard(c,p,i)).join('')||'<div class="qd-vz">Arraste alguém para cá</div>'}</div>
      <footer><button class="lnk" data-act="qd-add" data-v="${esc(c.id)}">+ Pôr pessoa</button>
        ${S.qd.metaEd===c.id?`<span class="qd-me"><input class="txt" id="qd-meta" inputmode="numeric" maxlength="3" value="${M.meta||''}" placeholder="nº"><button class="btn" data-act="qd-metaok" data-v="${esc(c.id)}">OK</button></span>`
          :`<button class="lnk" data-act="qd-meta" data-v="${esc(c.id)}" title="Quantas pessoas esta coluna precisa">${M.meta?'precisa de '+M.meta:'quantos precisa?'}</button>`}<span style="flex:1"></span>
        <button class="lnk" data-act="qd-cesq" data-v="${esc(c.id)}" ${ci===0?'disabled':''} title="Mudar a coluna para a esquerda" aria-label="Mudar a coluna para a esquerda">‹</button><button class="lnk" data-act="qd-cdir" data-v="${esc(c.id)}" ${ci===D.cols.length-1?'disabled':''} title="Mudar a coluna para a direita" aria-label="Mudar a coluna para a direita">›</button>
        <button class="lnk t-crit" data-act="qd-cx" data-v="${esc(c.id)}">${S.qd.cx===c.id?(c.ps.length?'Tem pessoas: tire antes':'Toque de novo'):'Apagar'}</button></footer></section>`; }).join('');
  const quando=D.em?`Salvo ${dm(D.em.slice(0,10))} às ${hora(D.em)}${D.porNome?' por '+esc(D.porNome):''}`:'Ainda não salvo';
  const emps=[...new Set(D.cols.flatMap(c=>c.ps.map(p=>qdInfo(p.n).e)).filter(Boolean).map(e=>e.toUpperCase()))].sort();
  const vv=qdEspVenc();
  const sel=(id,ops,v,ph)=>`<select class="txt" id="${id}"><option value="">${ph}</option>${ops.map(o=>`<option value="${esc(o[0])}" ${v===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
  return `${banner()}${gxCab('VISÃO DO GESTOR','Quadro de pessoas',`<button class="btn sec" data-act="qd-pn" data-v="hist">Histórico</button><button class="btn sec" data-act="qd-pn" data-v="ver">Versões</button><button class="btn sec" data-act="qd-xls">Excel</button><button class="btn sec" data-act="qd-imp" data-v="dist">Imprimir só a distribuição</button><button class="btn" data-act="qd-imp" data-v="dec">Imprimir com as decisões</button>`)}
    <div class="sub" style="margin:-6px 0 12px">Arraste os nomes entre as colunas, como no quadro branco. Marque quem fica (✓), está em dúvida (?), está em espera (◷), não é efetivo (NE) ou sai (✕). Toque num número para destacar só aquelas pessoas; bolinha verde = veio hoje, vermelha = não veio. Só você e a administradora veem este quadro. · <span id="qd-salvo">${quando}</span></div>
    <div class="qd-ks">${k(t.n,'no quadro','','')}${Object.entries(QD_ST).map(([q,v])=>k(t[q],v.pl,v.c,q)).join('')}${k(t.sem,'sem marcar','','sem')}${mk}<span style="flex:1"></span><button class="btn sec" data-act="qd-col">+ Nova coluna</button></div>
    ${vv.length?`<div class="qd-av">◷ <b>${vv.length} ${vv.length>1?'pessoas':'pessoa'} em espera com o prazo vencido:</b> ${vv.map(x=>`<button class="lnk" data-act="qd-sel" data-v="${esc(x.p.id)}">${esc(x.p.n)}</button> <small>(${x.p.espMot?esc(x.p.espMot)+', ':''}venceu ${dm(x.p.espAte)})</small>`).join(' · ')}</div>`:''}
    <div class="qd-fb"><input class="txt" id="qd-busca" type="search" autocomplete="off" placeholder="Procurar nome, habilidade, setor…" value="${esc(S.qd.busca)}">
      ${sel('qd-femp',emps.map(e=>[qdK(e),qdCap(e)]),S.qd.emp,'Todas as empresas')}${sel('qd-fvin',[['CLT','CLT'],['PJ','PJ']],S.qd.vin,'CLT e PJ')}${sel('qd-fhab',qdHabTodas().map(h=>[qdK(h),h]),S.qd.hab,'Todas as habilidades')}
      <span class="sub" id="qd-fcont"></span><button class="lnk" data-act="qd-flimpa">limpar</button></div>
    ${S.qd.fil?`<div class="qd-filav">Mostrando em destaque: <b>${esc(S.qd.fil==='sem'?'Sem marcar':(QD_ST[S.qd.fil]||{}).t||'')}</b> · <button class="lnk" data-act="qd-fil" data-v="">ver todos</button></div>`:''}
    ${qdSelPainel()}${qdAddPainel()}${qdHistPainel()}${qdVerPainel()}
    <div class="qd-g ${S.qd.fil?'fil fil-'+esc(S.qd.fil):''}">${cols}</div>`; }
/* filtros sem redesenhar (busca, empresa, vínculo, habilidade) */
function qdFiltra(){ if(S.view!=='gxqd') return; const q=qdK(S.qd.busca), ws=q?q.split(' '):[], e=S.qd.emp, v=S.qd.vin, h=S.qd.hab; let n=0, tot=0;
  document.querySelectorAll('.qd-g .qd-p').forEach(x=>{ tot++; const b=x.dataset.b||''; const ok=(!ws.length||ws.every(w=>b.split(' ').some(y=>y.startsWith(w))))&&(!e||x.dataset.e===e)&&(!v||x.dataset.vi===v)&&(!h||(x.dataset.h||'').includes('|'+h+'|'));
    x.classList.toggle('qd-oc',!ok); if(ok) n++; });
  const ct=document.getElementById('qd-fcont'); if(ct) ct.textContent=(ws.length||e||v||h)?n+' de '+tot+' pessoas':''; }
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
    <div class="g">${D.cols.map(box).join('')}</div>${dec?'<div class="r">Documento interno da gestão.</div>':''}
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`); w.document.close(); }
/* ---------- ações ---------- */
function qdAcha(id){ for(const c of qdD().cols){ const i=c.ps.findIndex(p=>p.id===id); if(i>=0) return {c,i,p:c.ps[i]}; } return null; }
function qdMove(pid,cid,pos){ const D=qdD(), a=qdAcha(pid), to=D.cols.find(c=>c.id===cid); if(!a||!to) return; if(a.c.id!==to.id) qdLog(a.p.n+': '+a.c.nome+' → '+to.nome); a.c.ps.splice(a.i,1); if(pos==null||pos>to.ps.length) pos=to.ps.length; to.ps.splice(pos,0,a.p); qdGrava(); }
function qdLeObs(){ const i=document.getElementById('qd-obs'); if(i&&S.qd.sel){ const a=qdAcha(S.qd.sel); if(a&&(a.p.obs||'')!==i.value.trim()){ a.p.obs=i.value.trim().slice(0,60); qdGrava(); } } }
function qdPor(n,cid){ const D=qdD(), col=D.cols.find(c=>c.id===cid); n=String(n||'').trim().replace(/\s+/g,' '); if(!col||!n) return;
  const ja=qdOnde(n); if(ja){ toast(n+' já está em '+ja+'. Arraste o nome para mudar de coluna.'); return; }
  col.ps.push({id:qdId(),n,obs:'',st:''}); qdLog(n+' entrou em '+col.nome); S.qd.q=''; qdGrava(); toast(n+' entrou em '+col.nome); }
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
  if(a==='qd-tira'){ const x=qdAcha(S.qd.sel); if(!x) return; if(S.qd.tira!==x.p.id){ S.qd.tira=x.p.id; render(); return; } x.c.ps.splice(x.i,1); qdLog(x.p.n+' saiu do quadro (estava em '+x.c.nome+')'); S.qd.sel=null; S.qd.tira=null; qdGrava(); render(); return; }
  if(a==='qd-add'){ qdLeObs(); S.qd.add=v; S.qd.sel=null; S.qd.q=''; render(); setTimeout(()=>{ const i=document.getElementById('qd-q'); if(i) i.focus(); },50); return; }
  if(a==='qd-addrh'){ qdPor(v,S.qd.add); render(); return; }
  if(a==='qd-addtxt'){ const i=document.getElementById('qd-q'); qdPor(i?i.value:S.qd.q,S.qd.add); render(); setTimeout(()=>{ const j=document.getElementById('qd-q'); if(j) j.focus(); },50); return; }
  if(a==='qd-col'){ D.cols.push({id:qdId(),nome:'Nova coluna',ps:[]}); S.qd.ed=D.cols[D.cols.length-1].id; qdGrava(); render(); setTimeout(()=>{ const i=document.getElementById('qd-cn'); if(i){ i.focus(); i.select(); } },50); return; }
  if(a==='qd-ced'){ S.qd.ed=v; render(); setTimeout(()=>{ const i=document.getElementById('qd-cn'); if(i){ i.focus(); i.select(); } },50); return; }
  if(a==='qd-cnok'){ const i=document.getElementById('qd-cn'), c=D.cols.find(x=>x.id===S.qd.ed); if(i&&c&&i.value.trim()){ const nv=i.value.trim().slice(0,40); if(nv!==c.nome&&c.nome!=='Nova coluna') qdLog('Coluna "'+c.nome+'" virou "'+nv+'"'); else if(c.nome==='Nova coluna') qdLog('Nova coluna "'+nv+'"'); c.nome=nv; qdGrava(); } S.qd.ed=null; render(); return; }
  if(a==='qd-cesq'||a==='qd-cdir'){ const i=D.cols.findIndex(c=>c.id===v), j=i+(a==='qd-cesq'?-1:1); if(i>=0&&j>=0&&j<D.cols.length){ const [c]=D.cols.splice(i,1); D.cols.splice(j,0,c); qdGrava(); } render(); return; }
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
document.addEventListener('dragend',()=>{ S.qd.drag=null; document.querySelectorAll('.qd-p.drag,.qd-ps.over').forEach(x=>x.classList.remove('drag','over')); document.querySelectorAll('.qd-ins').forEach(x=>x.remove()); });
function qdPos(lista,y){ const cs=[...lista.querySelectorAll('.qd-p:not(.drag)')]; for(let i=0;i<cs.length;i++){ const r=cs[i].getBoundingClientRect(); if(y<r.top+r.height/2) return i; } return cs.length; }
document.addEventListener('dragover',e=>{ if(!S.qd.drag) return; const l=e.target.closest&&e.target.closest('.qd-c'); if(!l) return; e.preventDefault(); const ps=l.querySelector('.qd-ps');
  document.querySelectorAll('.qd-ps.over').forEach(x=>{ if(x!==ps) x.classList.remove('over'); }); ps.classList.add('over');
  document.querySelectorAll('.qd-ins').forEach(x=>x.remove()); const i=qdPos(ps,e.clientY), cs=[...ps.querySelectorAll('.qd-p:not(.drag)')], ln=document.createElement('div'); ln.className='qd-ins';
  if(cs[i]) ps.insertBefore(ln,cs[i]); else ps.appendChild(ln); });
document.addEventListener('drop',e=>{ if(!S.qd.drag) return; const l=e.target.closest&&e.target.closest('.qd-c'); if(!l) return; e.preventDefault(); const ps=l.querySelector('.qd-ps'), pos=qdPos(ps,e.clientY), id=S.qd.drag;
  S.qd.drag=null; qdMove(id,ps.dataset.qdcol,pos); render(); });
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
.qd-g.fil .qd-p{opacity:.28}.qd-g.fil-fica .st-fica,.qd-g.fil-duv .st-duv,.qd-g.fil-esp .st-esp,.qd-g.fil-nef .st-nef,.qd-g.fil-sai .st-sai,.qd-g.fil-sem .st-sem{opacity:1}
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
