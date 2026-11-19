/* 94 · Pedidos de ajuste de 18/11 (8)
   1. Fichas de produção do premix: busca dentro de cada bloco (1 Em produção · 2 PCP · 3 Histórico), filtra sem redesenhar.
   2. Receitas de premix: só a administradora cria, edita, importa e desativa (os outros só veem).
   3/4/5/6. Análise PCP: na lateral da administradora, "Importar dados" (Base de dados) logo abaixo da Análise PCP (js/56);
      Previsto × Realizado vai para Relatórios; Previsão mensal entra em Produzir; Carga das linhas sai do menu.
   7. Antecipados para descontar: busca e filtro por linha dentro do quadro.
   8. Antecipados: "Só uma parte" — diz quanto já descontou; fica só o resto para descontar (`entregas.descQtd`, `descParc[]`).
   Prefixo `p18`. */
"use strict";
S.p18=S.p18||{};
/* ---------- 3/4/5/6: Análise ---------- */
try{ if(typeof ADM_REL!=='undefined'&&!ADM_REL.includes('anlrit')){ const i=ADM_REL.indexOf('indicadores'); ADM_REL.splice(i>=0?i+1:ADM_REL.length,0,'anlrit'); } }catch(e){}
try{ const G=NAV_GRP.analise||[]; const pr=G.find(g=>g.k==='prod'), me=G.find(g=>g.k==='mes');
  if(me) me.v=me.v.filter(v=>v!=='anlmes'); if(pr&&!pr.v.includes('anlmes')) pr.v.push('anlmes');
  TELA_SEM_MENU.anllin=1;
  const M=MODS.find(m=>m.id==='analise'); if(M&&M.views.includes('anlmes')){ M.views=M.views.filter(v=>v!=='anlmes'); const i=M.views.indexOf('anlest'); M.views.splice(i+1,0,'anlmes'); }
}catch(e){ console.warn('[18/11] análise',e); }
{ const _ng=navGrupos; navGrupos=function(m){ const gs=_ng.apply(this,arguments); try{
    if(m&&m.id==='analise'){
      const adm=typeof sbPerfil==='function'&&sbPerfil()==='adm';
      if(adm&&(S.view==='anlbase'||(typeof ADM_REL!=='undefined'&&ADM_REL.includes(S.view)))) return null;
      if(!gs) return gs;
      const tira=v=>TELA_SEM_MENU[v]||(adm&&(v==='anlbase'||(typeof ADM_REL!=='undefined'&&ADM_REL.includes(v))));
      const r=gs.map(g=>Object.assign({},g,{v:g.v.filter(v=>!tira(v))})).filter(g=>g.v.length); return r.length>1?r:null; }
  }catch(e){} return gs; }; }

/* ---------- 1: busca em cada bloco das Fichas ---------- */
S.pmx.qb=S.pmx.qb||{};
function p18QbAplica(k){ const P=S.pmx, q=(P.qb||{})[k]||''; const box=k==1?document.getElementById('pmx-b1'):k==2?document.getElementById('pmx-pend'):document.querySelector('details.pmx-hist'); if(!box) return;
  const els=[...box.querySelectorAll('article.pmx-fc[data-id], tbody tr[data-id]')]; let n=0;
  els.forEach(el=>{ const f=P.fichas.find(x=>x._id===el.dataset.id); const ok=!f||pmxBate(f,q); el.hidden=!ok; if(ok) n++; });
  const c=box.querySelector('[data-pmxqbn="'+k+'"]'); if(c) c.textContent=q?(n+' de '+els.length):'';
  let v=box.querySelector('.p18-vz'); if(q&&!n&&els.length){ if(!v){ v=document.createElement('div'); v.className='empty p18-vz'; (els[0].closest('.pmx-fg,.dbtw')||box).insertAdjacentElement('afterend',v); } v.textContent='Nenhuma ficha com "'+q+'" neste bloco.'; } else if(v) v.remove(); }
depoisDoRender(()=>{ if(S.view!=='pmxfichas') return; [1,2,3].forEach(p18QbAplica); },'fichas: busca por bloco');
let p18T3=0;
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.dataset||!t.dataset.pmxqb) return; const k=+t.dataset.pmxqb; S.pmx.qb[k]=t.value;
  if(k===3){ clearTimeout(p18T3); p18T3=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=document.querySelector('[data-pmxqb="3"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },350); }
  else p18QbAplica(k); });
document.addEventListener('keydown',ev=>{ const t=ev.target; if(ev.key==='Escape'&&t&&t.dataset&&t.dataset.pmxqb&&t.value){ t.value=''; t.dispatchEvent(new Event('input',{bubbles:true})); } });

/* ---------- 2: receitas só da administradora ---------- */
function p18RecDono(){ return !!(S.acs&&S.acs.dono); }
depoisDoRender(()=>{ if(S.view!=='pmxrec'||p18RecDono()) return; const V=document.getElementById('view'); if(!V) return;
  V.querySelectorAll('[data-act="pmx-rec-nova"],[data-act="pmx-rec-ed"],[data-act="pmx-imp-abrir"]').forEach(b=>b.remove());
  const f=V.querySelector('#pmx-est-arq'); if(f&&f.closest('label')) f.closest('label').remove();
  const hd=V.querySelector(':scope > .head'); if(hd&&!hd.querySelector('.p18-so')) hd.insertAdjacentHTML('beforeend','<div class="sub p18-so" style="margin:0;font-size:13px">Só a administradora cria e edita as receitas.</div>');
  if(S.pmx.red){ S.pmx.red=null; render(); } },'receitas só da dona');
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="pmx-rec-"],[data-act="pmx-imp-abrir"],[data-act="pmx-imp-ok"]'); if(!b||p18RecDono()) return;
  ev.stopImmediatePropagation(); ev.preventDefault(); toast('Só a administradora pode mexer nas receitas.'); },true);
document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='pmx-est-arq'&&!p18RecDono()){ ev.stopImmediatePropagation(); ev.target.value=''; toast('Só a administradora pode mexer nas receitas.'); } },true);

/* ---------- 8: antecipado descontado em parte ---------- */
const p18Rest=e=>Math.max(0,(+e.qtd||0)-(+e.descQtd||0));
{ const _l=atcLista; atcLista=function(){ return _l.apply(this,arguments).map(e=>+e.descQtd>0?Object.assign({},e,{qtd:p18Rest(e),_qTot:+e.qtd||0}):e).filter(e=>+e.qtd>0); }; }
async function p18Desconta(ids,q){ if(!S.db) return; let falta=q; const em=new Date().toISOString(), por=S.uid||null, porNome=(S.nomes&&S.nomes[S.uid])||'';
  const es=ids.map(id=>(S.entregas||[]).find(x=>x._id===id)).filter(Boolean).sort((a,b)=>String(a.em).localeCompare(String(b.em)));
  for(const e of es){ if(falta<=0) break; const r=p18Rest(e); if(r<=0) continue; const d=Math.min(r,falta); falta-=d;
    const nq=(+e.descQtd||0)+d, u={descQtd:nq,descParc:[...(e.descParc||[]),{q:d,em,por,porNome}]}; if(nq>=(+e.qtd||0)-1e-9){ u.descontadoEm=em; u.descontadoPor=por; }
    await S.db.doc('entregas/'+e._id).update(u); Object.assign(e,u); } }
/* ---------- 7: filtro dentro do quadro dos antecipados ---------- */
S.p18.atc=S.p18.atc||{q:'',ln:''};
function p18Norm(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
{ const _a=atcCard; atcCard=function(){ let h=_a.apply(this,arguments); if(!h) return h; try{
    const gs=p12AtcGrupos(), A=S.p18.atc, lns=[...new Set(gs.map(x=>x.ln).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true}));
    let i=0; h=h.replace(/<div class="p12-r">/g,()=>{ const x=gs[i++]; if(!x) return '<div class="p12-r">'; const b=p18Norm([x.cod,x.ln,x.o?nomeCurto(x.o):'',x.o?(x.o.produto||''):'',[...x.nums].join(' ')].join(' '));
      return `<div class="p12-r" data-p18b="${esc(b)}" data-p18ln="${esc(x.ln||'')}">`; });
    gs.forEach(x=>{ const ids=x.ids.join(','), un=x.o?uA(x.o):'';
      const ok=`<button class="lnk" data-act="atc-ok" data-ids="${esc(ids)}">Já descontei</button>`;
      const novo=S.p18.parc===ids?`<span class="p18-pc"><input class="txt num" id="p18-pcq" inputmode="decimal" placeholder="Quanto já descontou" aria-label="Quanto já descontou"><small>${esc(un||'un.')} de ${fq(x.q)}</small><button class="btn" data-act="p18-pcok" data-ids="${esc(ids)}" data-max="${x.q}" style="height:32px;padding:0 12px">Salvar</button><button class="lnk" data-act="p18-pcx">Cancelar</button></span>`
        :`<span class="p18-acs">${ok}<button class="lnk" data-act="p18-pc" data-ids="${esc(ids)}">Só uma parte</button></span>`;
      h=h.replace(ok,novo); });
    const fil=gs.length>1?`<div class="p18-af"><label class="srch">${ic('lupa',14,2)}<input class="txt" type="search" data-p18aq value="${esc(A.q)}" placeholder="Procurar: código, produto ou ordem" autocomplete="off"></label>${lns.length>1?`<select class="txt" data-p18aln aria-label="Linha"><option value="">Todas as linhas</option>${lns.map(l=>`<option ${A.ln===l?'selected':''}>${esc(l)}</option>`).join('')}</select>`:''}<span class="p18-an num"></span></div>`:'';
    h=h.replace('</summary>','</summary>'+fil);
  }catch(e){ console.warn('[18/11] antecipados',e); } return h; }; }
function p18AtcFiltra(){ const A=S.p18.atc, q=p18Norm(A.q).trim(), rs=[...document.querySelectorAll('.p12-atc .p12-r[data-p18b]')]; let n=0;
  rs.forEach(r=>{ const ok=(!q||q.split(/\s+/).every(w=>r.dataset.p18b.includes(w)))&&(!A.ln||r.dataset.p18ln===A.ln); r.hidden=!ok; if(ok) n++; });
  const c=document.querySelector('.p12-atc .p18-an'); if(c) c.textContent=(q||A.ln)?n+' de '+rs.length:''; }
depoisDoRender(()=>{ if(document.querySelector('.p12-atc')) p18AtcFiltra(); },'antecipados: filtro');
document.addEventListener('input',ev=>{ const t=ev.target; if(t&&t.dataset&&'p18aq' in t.dataset){ S.p18.atc.q=t.value; p18AtcFiltra(); } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t&&t.dataset&&'p18aln' in t.dataset){ S.p18.atc.ln=t.value; p18AtcFiltra(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="p18-pc"],[data-act="p18-pcx"],[data-act="p18-pcok"]'); if(!b) return; ev.preventDefault(); ev.stopPropagation();
  const a=b.dataset.act; if(a==='p18-pcx'){ S.p18.parc=null; render(); return; }
  if(a==='p18-pc'){ S.p18.parc=b.dataset.ids; S.p12.atcAb=true; render(); setTimeout(()=>{ const i=document.getElementById('p18-pcq'); if(i) i.focus(); },30); return; }
  const v=String((document.getElementById('p18-pcq')||{}).value||'').replace(/\./g,'').replace(',','.'), q=+v, max=+b.dataset.max||0;
  if(!(q>0)){ toast('Digite quanto já foi descontado.'); return; } if(q>max+1e-9){ toast('É mais do que falta descontar ('+fq(max)+'). Use "Já descontei".'); return; }
  b.disabled=true; try{ await p18Desconta(b.dataset.ids.split(',').filter(Boolean),q); S.p18.parc=null; toast(q>=max?'Antecipado todo descontado.':'Descontado '+fq(q)+'. Falta descontar '+fq(max-q)+'.'); render(); }catch(e){ b.disabled=false; erro(e); } },true);
document.addEventListener('keydown',ev=>{ if(ev.target&&ev.target.id==='p18-pcq'){ if(ev.key==='Enter'){ ev.preventDefault(); const b=document.querySelector('[data-act="p18-pcok"]'); if(b) b.click(); } else if(ev.key==='Escape'){ S.p18.parc=null; render(); } } });
try{ if(window.Painel) window.Painel.p18={atcLista:()=>atcLista(),desconta:p18Desconta,qb:p18QbAplica}; }catch(e){}
document.head.insertAdjacentHTML('beforeend',`<style id="p18-css">
.pmx-qbw{margin:0;max-width:260px;flex:1 1 200px}.pmx-qbw input{height:38px}.pmx-qbn{font-size:12.5px;color:var(--muted);white-space:nowrap}
.p18-af{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 14px;border-top:1px solid var(--line)}.p18-af .srch{margin:0;flex:1 1 220px;max-width:360px}.p18-af .txt{height:34px}
.p18-af select{width:auto}.p18-an{font-size:12.5px;color:var(--muted)}
.p18-acs{display:flex;gap:12px;align-items:center;flex-shrink:0}
.p18-pc{display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0}.p18-pc input{height:32px;width:130px}.p18-pc small{color:var(--muted);font-size:12px}
</style>`);
