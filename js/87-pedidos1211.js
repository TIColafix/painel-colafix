/* 87 · Pedidos de ajuste de 12/11 (Programação):
   1) Os avisos "Ensacado para apontar" e "Antecipados para descontar" viraram uma faixa fina que abre (details).
      Ensacado: o aviso aparece quando o almox marca o rancho da ordem como ENTREGUE na linha (rdb.ent ou entrega em parte),
      não mais a cada apontamento. "Apontei" grava ordens/{id}.ensAp {em,por,porNome}.
      Antecipados: somados por produto e linha (10 + 10 paletes de AC3 na L1 = 20 paletes na L1; 10 na L2 à parte).
   2) Mudar a data da ordem direto na linha da Programação (calendário pequeno, sem abrir a ordem).
   Prefixo `p12`. */
const ENS2_DESDE='2026-11-12';
S.p12=S.p12||{ensAb:false,atcAb:false};
function p12EntEm(o){ const r=o&&o.rdb; if(!r) return ''; if(r.ent&&r.ent.em) return r.ent.em; const ps=(r.entp||[]).map(x=>x&&x.em).filter(Boolean).sort(); return ps.pop()||''; }
/* substitui a do js/53: ordem com ensacado cujo rancho já foi entregue na linha e ainda não foi apontado */
function ensPend(){ const lim=new Date(Date.now()-30*864e5).toISOString(), ap=new Set((S.entregas||[]).filter(e=>e.ensAp).map(e=>e.ordem));
  return (S.ordens||[]).filter(o=>o&&o.ensaca&&!o.ensAp&&!ap.has(o._id)&&!['cancelada','excluida','ignorada'].includes(o.status)).map(o=>{ const em=p12EntEm(o); return em?{o,ult:em,parc:!(o.rdb&&o.rdb.ent),qtd:+o.total||0,es:[]}:null; })
    .filter(x=>x&&String(x.ult)>=ENS2_DESDE&&String(x.ult)>=lim).sort((a,b)=>String(a.ult).localeCompare(String(b.ult))); }
async function ensApontei(oid){ const x=ensPend().find(y=>y.o._id===oid); if(!x) return; const ap={em:new Date().toISOString(),por:S.uid||null,porNome:(S.nomes&&S.nomes[S.uid])||''};
  if(await ordUpd(oid,{ensAp:ap,hist:histAdd(x.o,'Ensacado '+x.o.ensaca+' apontado no sistema')},'Ensacado '+x.o.ensaca+' marcado como apontado.')) x.o.ensAp=ap; render(); }
function p12Quando(t){ const d=t?hojeStr(new Date(t)):''; return (d===hojeStr()?'hoje':dm(d))+' às '+hora(t); }
function ensCard(){ if(!ensPode()) return ''; const xs=ensPend(); if(!xs.length) return '';
  return `<details class="card p12-f p12-ens ens-c" data-p12="ensAb" ${S.p12.ensAb?'open':''}><summary><span class="p12-dot"></span><b>${xs.length===1?'1 ensacado para apontar':xs.length+' ensacados para apontar'}</b><span class="p12-s">o almox entregou na linha · ${xs.slice(0,4).map(x=>esc(x.o.ensaca)).join(', ')}${xs.length>4?'…':''}</span><span class="p12-v">ver</span></summary>
    ${xs.map(x=>`<div class="p12-r"><span class="p12-i"><b>Ensacado ${esc(x.o.ensaca)}</b> <small>ordem ${esc(x.o.num)} · ${esc(x.o.linha||'')} · ${esc(nomeCurto(x.o))} · ${x.parc?'entregue em parte':'entregue'} ${p12Quando(x.ult)}</small></span><button class="lnk" data-act="ens-ok" data-id="${esc(x.o._id)}">Apontei</button></div>`).join('')}</details>`; }
/* antecipados somados por produto e linha */
function p12AtcGrupos(){ const g={}; atcLista().forEach(e=>{ const o=ordById(e.ordem); const cod=o?codigoDe(o):String(e.num||''), ln=e.linha||(o&&o.linha)||''; const k=cod+'|'+ln;
    const x=g[k]=g[k]||{cod,ln,o,q:0,ids:[],nums:new Set(),ini:'',n:0}; x.q+=(+e.qtd||0); x.ids.push(e._id); x.n++; x.nums.add(String(e.num||(o&&o.num)||'')); if(!x.ini||String(e.em)<x.ini) x.ini=e.em; if(!x.o&&o) x.o=o; });
  return Object.values(g).sort((a,b)=>String(a.ini).localeCompare(String(b.ini))); }
function p12Qtd(x){ const pp=x.o?paleteDe(x.o):0, u=x.o?uA(x.o):''; if(pp>0){ const p=Math.round(x.q/pp*10)/10; return `<b class="num">${p.toLocaleString('pt-BR')} palete${p===1?'':'s'}</b> <small>(${fq(x.q)} ${esc(u)})</small>`; } return `<b class="num">${fq(x.q)} ${esc(u)}</b>`; }
function atcCard(){ const gs=p12AtcGrupos(); if(!gs.length) return ''; const agora=new Date().toISOString(), venc=gs.filter(x=>String(x.ini)<=agora).length;
  const res=gs.slice(0,3).map(x=>`${esc(x.cod)} ${esc(String(x.ln).replace(/^Linha\s*/i,'L'))}`).join(', ')+(gs.length>3?'…':'');
  return `<details class="card p12-f p12-atc atc-card" data-p12="atcAb" ${S.p12.atcAb?'open':''} aria-label="Apontamentos antecipados para descontar"><summary><span class="p12-dot"></span><b>Antecipados para descontar</b><span class="p12-s">${res}${venc?` · a folha já chegou em ${venc}`:''}</span><span class="p12-v">ver</span></summary>
    ${gs.map(x=>`<div class="p12-r"><span class="p12-i">${p12Qtd(x)} <b>${esc(x.cod)}</b> na <b>${esc(x.ln||'—')}</b> <small>${esc(x.o?nomeCurto(x.o):'')} · ${x.n} apontamento${x.n>1?'s':''} · ordem ${esc([...x.nums].filter(Boolean).join(', '))} · desde a folha de ${atcQuando({em:x.ini})}</small></span><button class="lnk" data-act="atc-ok" data-ids="${esc(x.ids.join(','))}">Já descontei</button></div>`).join('')}</details>`; }
document.addEventListener('toggle',ev=>{ const d=ev.target; if(d&&d.dataset&&d.dataset.p12) S.p12[d.dataset.p12]=d.open; },true);
/* 2) data da ordem na linha */
function p12PodeData(){ try{ if(typeof soVer==='function'&&soVer()) return false; if(!viewOk('programacao')) return false; return typeof acxPode!=='function'||acxPode('programar'); }catch(e){ return false; } }
{ const _or=ordRow; ordRow=function(o){ const h=_or.apply(this,arguments); try{ if(!o||o.status!=='aberta'||!p12PodeData()) return h; const k='<span class="ofp">', i=h.indexOf(k); if(i<0) return h;
    const inp=`<label class="p12-dt" title="Mudar a data da ordem">${ic('calendario',14,2.2)}<input type="date" data-p12dt="${esc(o._id)}" value="${esc(o.data||dataEf(o)||'')}" aria-label="Mudar a data da ordem ${esc(o.num)}"></label>`;
    return h.slice(0,i+k.length)+inp+h.slice(i+k.length); }catch(e){ return h; } }; }
document.addEventListener('click',ev=>{ const l=ev.target.closest&&ev.target.closest('.p12-dt'); if(!l) return; ev.stopPropagation(); const i=l.querySelector('input'); if(i&&ev.target!==i){ try{ i.showPicker(); }catch(e){ i.focus(); } } },true);
['pointerdown','mousedown','dragstart'].forEach(t=>document.addEventListener(t,ev=>{ if(ev.target.closest&&ev.target.closest('.p12-dt')) ev.stopPropagation(); },true));
document.addEventListener('change',async ev=>{ const el=ev.target; if(!el||!el.dataset||!el.dataset.p12dt) return; ev.stopPropagation(); const o=ordById(el.dataset.p12dt), nd=el.value; if(!o||!nd||nd===o.data) return;
  const u={data:nd,hist:histAdd(o,'Data '+(o.data?dm(o.data):'—')+' → '+dm(nd)+' (na Programação)')}; if(o.continuaEm&&o.continuaEm<=nd) u.continuaEm=null; if(o.ate&&o.ate<=nd) u.ate=null;
  el.disabled=true; if(await ordUpd(o._id,u,'Ordem '+o.num+' passou para '+dmTxt(nd)+'.')){ Object.assign(o,u); } el.blur(); render(); },true);
document.head.insertAdjacentHTML('beforeend',`<style id="p12-css">
details.p12-f{padding:0;margin-bottom:10px;border:1px solid var(--line);box-shadow:none;background:var(--surface)}
details.p12-f>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 14px;font-size:13.5px;min-width:0}
details.p12-f>summary::-webkit-details-marker{display:none}
.p12-dot{width:8px;height:8px;border-radius:50%;background:var(--warn,#C99A2E);flex-shrink:0}
.p12-s{color:var(--muted);flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.p12-v{color:var(--teal-strong);font-size:12.5px;flex-shrink:0}details.p12-f[open] .p12-v{visibility:hidden}
.p12-r{display:flex;align-items:center;gap:12px;padding:8px 14px;border-top:1px solid var(--line);font-size:13.5px}
.p12-i{flex:1;min-width:0}.p12-i small{color:var(--muted);display:block;font-size:12px;margin-top:1px}
.p12-dt{display:inline-flex;align-items:center;gap:4px;position:relative;border:1px solid var(--line);border-radius:8px;padding:3px 6px;color:var(--muted);cursor:pointer;background:var(--surface);vertical-align:middle}
.p12-dt:hover{color:var(--teal-strong);border-color:var(--teal)}
.p12-dt input{border:0;background:transparent;font:inherit;font-size:12px;color:inherit;width:112px;padding:0;cursor:pointer}
</style>`);
