/* ================= REVISÃO DE CÓDIGO (16/11/2026) =================
   1) Redesenho em rajada: cada dado que chega do banco pedia um redesenho da tela inteira. Ao abrir o painel chegam
      dezenas de listas em poucos milissegundos; agora os pedidos que chegam juntos viram um redesenho só (REV_JUNTA ms).
   2) Erros registrados: erro de JavaScript que antes sumia em silêncio vai para erros/{id} (no máximo REV_MAX por
      abertura, sem repetir a mesma mensagem). A administradora vê em Ajustes › "Erros do painel". */
const REV_JUNTA=30, REV_MAX=8;

/* 3) Gancho único depois de cada render. Até aqui cada arquivo novo embrulhava o render (const _r=render; render=function…),
      e hoje são 38 camadas. Código NOVO: use depoisDoRender(fn) (ou Painel.depoisDoRender nos módulos). Cada fn roda depois
      de cada redesenho, em ordem, e um erro numa não impede as outras (vai para erros/). Os embrulhos antigos continuam. */
const DEPOIS_RENDER=[];
function depoisDoRender(fn,nome){ if(typeof fn==='function') DEPOIS_RENDER.push({fn,nome:nome||fn.name||'?'}); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); for(const h of DEPOIS_RENDER){ try{ h.fn(); }catch(e){ revErro(e,'depoisDoRender:'+h.nome); } } return x; }; }
try{ if(window.Painel) window.Painel.depoisDoRender=depoisDoRender; }catch(e){}

{ const _rs=rerenderSeguro; let t=null;
  rerenderSeguro=function(){ if(t) return; t=setTimeout(()=>{ t=null; try{ _rs(); }catch(e){ revErro(e,'rerender'); } },REV_JUNTA); }; }

const REV={n:0,vistos:new Set(),fila:[],lista:null,carregando:false};
function revTxt(v,n){ return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n); }
function revErro(e,onde){
  try{
    const msg=revTxt(e&&(e.message||e.reason&&e.reason.message)||e,300);
    if(!msg||/^Script error\.?$/i.test(msg)||/ResizeObserver loop/i.test(msg)) return;   /* de outro site / do navegador: nada a fazer */
    if(REV.vistos.has(msg)||REV.n>=REV_MAX) return; REV.vistos.add(msg); REV.n++;
    const st=revTxt(e&&e.stack,600);
    const doc={ em:new Date().toISOString(), msg, onde:revTxt(onde,120), pilha:st, tela:revTxt(S&&S.view,40),
      uid:(S&&S.uid)||null, perfil:revTxt(S&&S.acs&&S.acs.doc&&S.acs.doc.perfil,30), endereco:revTxt(location.pathname+location.search,160),
      aparelho:revTxt(navigator.userAgent,160) };
    if(S&&S.db&&S.uid) S.db.collection('erros').add(doc).catch(()=>{}); else REV.fila.push(doc);
  }catch(_){}
}
window.addEventListener('error',ev=>{ revErro(ev.error||ev.message,(ev.filename||'').replace(/^.*\//,'')+':'+(ev.lineno||'')); });
window.addEventListener('unhandledrejection',ev=>{ const r=ev.reason; if(r&&(r.code==='permission-denied'||r.code==='unavailable')) return; revErro(r,'promessa'); });
/* erros de antes do login sobem quando o banco fica pronto */
setInterval(()=>{ if(REV.fila.length&&S.db&&S.uid){ const xs=REV.fila.splice(0); xs.forEach(d=>{ d.uid=S.uid; S.db.collection('erros').add(d).catch(()=>{}); }); } },5000);
window.PainelErro=revErro; window.PainelRev={rerender:()=>rerenderSeguro(),erro:revErro};

/* ---- Ajustes › Erros do painel (só a administradora) ---- */
function revCard(){
  const L=REV.lista;
  const lin=L?(L.length?L.map(x=>`<tr><td style="white-space:nowrap">${esc(String(x.em||'').slice(8,10)+'/'+String(x.em||'').slice(5,7)+' '+String(x.em||'').slice(11,16))}</td><td>${esc(nomeDe(x.uid))}<div class="sub" style="margin:0">${esc(x.tela||'')}${x.perfil?' · '+esc(x.perfil):''}</div></td><td><b>${esc(x.msg)}</b><div class="sub" style="margin:0">${esc(x.onde||'')}</div></td><td><button class="lnk" data-act="rev-x" data-v="${esc(x._id)}">apagar</button></td></tr>`).join(''):'<tr><td colspan="4"><div class="sub" style="margin:0">Nenhum erro registrado. 👍</div></td></tr>'):'';
  return `<section class="card" id="rev-card"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between"><div><h2 style="margin:0">Erros do painel</h2><div class="sub" style="margin:4px 0 0">Erros de programa que aconteceram no aparelho de alguém (os 60 mais recentes). Ajudam a achar o que "não fez nada".</div></div>
    <div style="display:flex;gap:8px"><button class="btn sec" data-act="rev-ver">${REV.carregando?'Carregando…':L?'Atualizar':'Ver os erros'}</button>${L&&L.length?'<button class="btn sec" data-act="rev-limpa">Apagar todos</button>':''}</div></div>
    ${L?`<div style="overflow:auto;margin-top:10px"><table class="rtab"><thead><tr><th>Quando</th><th>Quem · tela</th><th>Erro</th><th></th></tr></thead><tbody>${lin}</tbody></table></div>`:''}</section>`;
}
function revPoe(){ if(S.view!=='ajustes'||!(S.acs&&S.acs.dono)) return; const v=$('#view'); if(!v) return; const h=revCard(), c=document.getElementById('rev-card');
  if(c){ if(c.outerHTML!==h) c.outerHTML=h; } else v.insertAdjacentHTML('beforeend',h); }
depoisDoRender(revPoe,'erros do painel');
async function revCarrega(){ if(!S.db) return; REV.carregando=true; revPoe();
  try{ const q=await S.db.collection('erros').orderBy('em','desc').limit(60).get(); REV.lista=q.docs.map(d=>Object.assign({_id:d.id},d.data())); }
  catch(e){ toast('Não foi possível ler os erros: '+((e&&e.code)||'erro')+'. Publique as regras novas no Firebase.'); }
  REV.carregando=false; revPoe(); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rev-"]'); if(!b||!(S.acs&&S.acs.dono)) return; const a=b.dataset.act;
  if(a==='rev-ver') return revCarrega();
  if(a==='rev-x'){ try{ await S.db.doc('erros/'+b.dataset.v).delete(); REV.lista=(REV.lista||[]).filter(x=>x._id!==b.dataset.v); revPoe(); }catch(e){ erro(e); } return; }
  if(a==='rev-limpa'){ if(!confirm('Apagar todos os erros mostrados?')) return; try{ await Promise.all((REV.lista||[]).map(x=>S.db.doc('erros/'+x._id).delete())); REV.lista=[]; revPoe(); toast('Erros apagados.'); }catch(e){ erro(e); } }
});
