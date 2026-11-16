/* Painel Colafix · 53-pedidos2610.js (26/10) — "Pedidos de ajuste" da Iasmyn de 23/10.
   2) Avisos da administradora só do que é dela (PCP): no sino, nas "3 coisas que mais importam" e no Meu dia saem os avisos da
      manutenção (chamados), do almoxarifado (material urgente da linha, auditoria do inventário) e do RH — cada setor vê os seus.
   3) Ensacado para apontar: quando é lançada produção (apontamento) de uma ordem que tem ordem de ensacado (rejunte flexível/
      siliconizado), aparece o aviso "Apontar o ensacado N no sistema" (sino, Meu dia e topo da Programação) com "Apontei", que
      grava entregas/{id}.ensAp {em,por,porNome} em todos os apontamentos daquela ordem.
   4) Nova medição: o "Salvar medição" não fica mais travado quando a internet demora (depois de 10 s a medição fica guardada no
      aparelho e sobe sozinha), e avisa quando nenhum silo foi preenchido. */
"use strict";
/* ---------- 2) avisos dos outros setores fora do painel da administradora ---------- */
const AVD_FORA=/^(man|mz|gx|of|ped|rh|alx|almox|pmxent)/;
function avdSo(){ try{ return !!(S.acs&&S.acs.dono); }catch(e){ return false; } }
{ const _ta=tpAvisos; tpAvisos=function(){ const xs=_ta.apply(this,arguments); if(!avdSo()) return xs; return (xs||[]).filter(x=>!AVD_FORA.test(String(x.acao||''))&&!/^(Manutenção|RH|Almoxarifado)$/i.test(String(x.s||''))); }; }
{ const _am=avisosModulos; avisosModulos=function(){ const xs=_am.apply(this,arguments); if(!avdSo()) return xs; return xs.filter(a=>!/^(Material|Manutenção|RH|Almox|Inventário)/i.test(String(a.rotulo||''))&&!/^(diario|dbfila|man|rh|alx)/.test(String(a.go||''))); }; }
{ const _ax=alxAvisoMeuDia; alxAvisoMeuDia=function(){ if(avdSo()) return ''; return _ax.apply(this,arguments); }; }
/* ---------- 3) ensacado para apontar ---------- */
const ENS_DESDE='2026-10-26';
function ensPode(){ try{ if(S.acs&&S.acs.dono) return true; return viewOk('programacao')&&!(typeof soVer==='function'&&soVer()); }catch(e){ return false; } }
/* ensPend: a versão que vale está mais adiante (removida a repetida em 16/11) */
/* ensApontei: a versão que vale está mais adiante (removida a repetida em 16/11) */
/* ensCard: a versão que vale está mais adiante (removida a repetida em 16/11) */
{ const _vp=vProgramacao; vProgramacao=function(){ const h=_vp.apply(this,arguments); try{ const c=ensCard(); if(!c) return h; const i=h.indexOf('</div>',h.indexOf('<div class="head"')); if(i<0) return c+h;
    /* depois do cabeçalho da tela */ let k=h.indexOf('<div class="head"'), d=0, j=k; const re=/<\/?div\b/g; re.lastIndex=k; let m; while((m=re.exec(h))){ if(m[0]==='<div') d++; else { d--; if(d===0){ j=h.indexOf('>',m.index)+1; break; } } }
    return h.slice(0,j)+c+h.slice(j); }catch(e){ return h; } }; }
{ const _ta=tpAvisos; tpAvisos=function(){ const xs=_ta.apply(this,arguments); try{ if(ensPode()){ const n=ensPend().length; if(n) xs.unshift({n,t:'Ensacado para apontar',s:'O almox entregou o rancho de ordem com ensacado: apontar o ensacado no sistema',acao:'ensap',c:'warn'}); } }catch(e){} return xs; }; }
{ const _ir=tpIr; tpIr=function(acao){ if(acao==='ensap'){ S.tp.pop=null; try{ tpFechaPop(); }catch(e){} go('programacao'); setTimeout(()=>{ const c=document.querySelector('.ens-c'); c&&c.scrollIntoView({block:'start',behavior:'smooth'}); },80); return; } return _ir.apply(this,arguments); }; }
registrarAviso(()=>{ if(!ensPode()) return []; const xs=ensPend(); return xs.length?[{nivel:'warn',rotulo:'PCP',titulo:xs.length===1?'Apontar o ensacado '+xs[0].o.ensaca+' no sistema':xs.length+' ensacados para apontar no sistema',texto:xs.slice(0,3).map(x=>'ordem '+x.o.num+' · '+fq(x.qtd)+' '+uA(x.o)).join(' · '),go:'programacao'}]:[]; });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="ens-ok"]'); if(!b) return; ev.stopPropagation(); b.disabled=true; ensApontei(b.dataset.id); },true);
/* ---------- 4) Nova medição: não trava esperando o servidor ---------- */
{ const _sv=salvar; salvar=function(col,doc){ const p=_sv.apply(this,arguments); if(col!=='medicoes'&&col!=='premix') return p;
    let fim=false; p.then(()=>{ fim=true; },()=>{ fim=true; });
    return Promise.race([p,new Promise(r=>setTimeout(()=>{ if(fim) return; toast('A internet está lenta: a medição ficou guardada neste aparelho e vai para o servidor sozinha.'); r(true); },10000))]); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="salvar-med"]'); if(!b||S.view!=='medicao') return;
  const n=S.cfg.silos.filter(s=>{ const v=numIn(S.med.v[s.id]); return v!=null&&v>=0; }).length; if(!n){ ev.stopPropagation(); toast('Preencha a medição de pelo menos um silo para salvar.'); } },true);
/* entrou na tela: nada fica preso em "salvando" de uma tentativa anterior */
{ let _vAnt=''; const _r=render; render=function(){ try{ if(S.view==='medicao'&&_vAnt!=='medicao') S.salvando=false; _vAnt=S.view; }catch(e){} return _r.apply(this,arguments); }; }
document.head.insertAdjacentHTML('beforeend',`<style id="ens-css">
.ens-c{border-left:4px solid var(--warn,#C99A2E);margin-bottom:14px}.ens-r{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line,#E3E8EC);flex-wrap:wrap}.ens-r>div{flex:1 1 260px;min-width:0}
.ens-r small{display:block;color:var(--muted);font-size:12px;margin-top:2px}.ens-q{font-size:16px}
.anl-pvf{display:block;color:var(--muted);font-size:11px;white-space:nowrap}
</style>`);
