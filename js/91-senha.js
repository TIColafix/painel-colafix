/* ================= ESQUECI A SENHA · lado da administradora (16/11/2026) =================
   Na tela de entrar, "Esqueci a senha" tem dois caminhos (painel-firebase.js):
   1) quem ligou a conta Google entra pelo Google e cria a senha nova sozinho (não chega aqui);
   2) quem não ligou manda um pedido → pedsenha/{id} {usuario,nome,contato,em,status:'aberto'}.
   Aqui, em Equipe e cargos (tela "acessos") e no sino, a administradora vê os pedidos. O Firebase não deixa o site trocar a
   senha de outra pessoa (só um servidor faria isso), então o caminho é: apagar o login antigo no console do Firebase e
   recriar o login com o mesmo usuário pelo "Recriar login" de sempre, que copia o cargo e os ajustes (eqHerdar). */
const PS={lista:[],ass:false};
function psAssina(){ if(PS.ass||!S.db||!(S.acs&&S.acs.dono)) return; PS.ass=true;
  inscrever('pedsenha',()=>S.db.collection('pedsenha').where('status','==','aberto').limit(30),snap=>{
    PS.lista=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>String(b.em||'').localeCompare(String(a.em||''))); rerenderSeguro(); }); }
setInterval(psAssina,3000);
NAV_EXTRA.push(()=>{ if(!(S.acs&&S.acs.dono)) return []; const n=PS.lista.length; return n?[{n,t:n>1?'pessoas esqueceram a senha':'pessoa esqueceu a senha',s:'Equipe e cargos',acao:'acessos',c:'warn'}]:[]; });
function psUid(usu){ const E=S.eq||{}, u=String(usu||'').toLowerCase(); return Object.keys(E.usu||{}).find(id=>String(E.usu[id]||'').toLowerCase()===u)||null; }
function psHa(iso){ const m=Math.round((Date.now()-new Date(iso).getTime())/60000); return !isFinite(m)?'':m<60?'há '+Math.max(1,m)+' min':m<1440?'há '+Math.round(m/60)+' h':'há '+Math.round(m/1440)+' dia'+(m>=2880?'s':''); }
function psCard(){ if(!PS.lista.length) return '';
  const proj=((window.PAINEL_CONFIG||{}).firebase||{}).projectId||'';
  const cons='https://console.firebase.google.com/project/'+encodeURIComponent(proj)+'/authentication/users';
  return `<section class="card" id="ps-card" style="border-left:4px solid var(--warn)"><h2 style="margin:0 0 4px">Pedidos de senha (${PS.lista.length})</h2>
    <div class="sub" style="margin:0 0 10px">Pessoas que tocaram em "Esqueci a senha". O site não consegue trocar a senha de outra pessoa; o jeito é recriar o login com o mesmo usuário (o cargo e os ajustes continuam).</div>
    ${PS.lista.map(x=>{ const uid=psUid(x.usuario);
      return `<div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)"><div style="flex:1 1 260px"><b>${esc(x.nome)}</b> · usuário <b>${esc(x.usuario)}</b>${x.contato?' · '+esc(x.contato):''}<div class="sub" style="margin:2px 0 0">${esc(psHa(x.em))}${uid?'':' · <span style="color:var(--crit)">não achei esse usuário na equipe (confira o nome)</span>'}</div>
        ${uid?`<ol class="sub" style="margin:6px 0 0;padding-left:18px"><li><a href="${esc(cons)}" target="_blank" rel="noopener">Abra o Firebase › Authentication</a>, procure <b>${esc(x.usuario)}@painel-colafix.app</b>, toque nos ⋮ e em <b>Excluir conta</b>.</li><li>Volte aqui e toque em <b>Criar o login de novo</b>: escolha uma senha provisória e passe para a pessoa.</li><li>Depois de entrar, ela troca a senha e pode ligar a conta Google (menu do nome) para não precisar de você da próxima vez.</li></ol>`:''}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${uid?`<button class="btn" data-act="eq-recriar" data-id="${esc(uid)}" data-ps="${esc(x._id)}">Criar o login de novo</button>`:''}<button class="btn sec" data-act="ps-ok" data-v="${esc(x._id)}">Resolvido</button><button class="lnk" data-act="ps-x" data-v="${esc(x._id)}">apagar</button></div></div>`; }).join('')}</section>`; }
function psPoe(){ if(S.view!=='acessos'||!(S.acs&&S.acs.dono)) return; const v=$('#view'); if(!v) return; const h=psCard(), c=document.getElementById('ps-card');
  if(!h){ if(c) c.remove(); return; } if(c){ if(c.outerHTML!==h) c.outerHTML=h; return; }
  const hd=v.querySelector(':scope > .head'); if(hd) hd.insertAdjacentHTML('afterend',h); else v.insertAdjacentHTML('afterbegin',h); }
depoisDoRender(()=>{ psPoe(); psAuto(); },'pedidos de senha');
async function psMarca(id,st){ try{ await S.db.doc('pedsenha/'+id).update({status:st,feitoEm:new Date().toISOString(),feitoPor:S.uid||null}); PS.lista=PS.lista.filter(x=>x._id!==id); psPoe(); return true; }catch(e){ erro(e); return false; } }
/* o login foi recriado com o mesmo usuário (cartão de "login criado" na tela): o pedido fica resolvido sozinho */
function psAuto(){ const C=S.eq&&S.eq.cartao; if(!C||!C.usu) return; PS.lista.filter(x=>String(x.usuario).toLowerCase()===String(C.usu).toLowerCase()&&!x._auto).forEach(x=>{ x._auto=true; psMarca(x._id,'feito'); }); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('#ps-card [data-act="eq-recriar"]'); if(b&&S.eq) S.eq.aba='pessoas'; },true);
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="ps-ok"],[data-act="ps-x"]'); if(!b||!(S.acs&&S.acs.dono)) return; const id=b.dataset.v;
  if(b.dataset.act==='ps-ok'){ if(await psMarca(id,'feito')) toast('Pedido marcado como resolvido.'); return; }
  if(!confirm('Apagar este pedido?')) return; try{ await S.db.doc('pedsenha/'+id).delete(); PS.lista=PS.lista.filter(x=>x._id!==id); psPoe(); }catch(e){ erro(e); } });
