/* 89 · Menu lateral mais rápido e que recolhe (16/11, pedido "o menu lateral demora muito para carregar e deixe a opção de deixar ela fechado para dar mais espaço").
   - Antes o menu era refeito do zero a cada dado que chegava do banco (dezenas de vezes ao abrir). Agora: na administradora o menu
     de base não é desenhado só para ser trocado em seguida (`S._navSkip`) e o menu em grupos só é trocado quando muda (js/56).
   - Abrir o painel: o último menu deste aparelho aparece na hora (`localStorage colafix.navCache`, só os nomes das telas),
     enquanto o acesso carrega; some quando o menu de verdade é desenhado.
   - Recolher: botão no pé da lateral (`#side-min`); recolhida, a lateral fica com a logo da Colafix (pequena) e só os ícones (68 px) e o nome aparece ao passar o mouse.
     Lembrado no aparelho (`localStorage colafix.sideMin`). Prefixo `sm-`. */
const SM_KEY='colafix.sideMin', NC_KEY='colafix.navCache';
function smLer(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function smGrava(k,v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} }
function smAplica(){ const on=smLer(SM_KEY)==='1'; document.body.classList.toggle('side-min',on); const b=document.getElementById('side-min');
  if(b){ b.innerHTML=(on?'<span class="sm-ar">»</span>':'<span class="sm-ar">«</span>')+'<span>'+(on?'Abrir menu':'Recolher menu')+'</span>'; b.title=on?'Abrir o menu lateral':'Recolher o menu lateral (fica só com os ícones)'; b.setAttribute('aria-pressed',on); } }
function smBotao(){ if(document.getElementById('side-min')) return; const aj=document.getElementById('nav-ajustes'); if(!aj) return;
  const b=document.createElement('button'); b.id='side-min'; b.type='button'; b.className='navbtn sm-bt'; aj.after(b); smAplica(); }
function smTitulos(){ document.querySelectorAll('.side .navbtn').forEach(b=>{ const t=(b.textContent||'').trim(); if(t&&b.id!=='side-min') b.title=t; }); }
/* menu salvo: aparece na hora, enquanto o acesso carrega */
(function(){ const nl=document.getElementById('navlist'); if(!nl||nl.firstElementChild) return; let c=null; try{ c=JSON.parse(smLer(NC_KEY)||'null'); }catch(e){}
  if(c&&c.h){ nl.innerHTML=c.h; nl.classList.add('nav-cache'); if(c.adm) document.body.classList.add('sbg-adm'); } })();
{ const _rn=renderNav; renderNav=function(){ let adm=false; try{ adm=sbPerfil()==='adm'; }catch(e){}
    S._navSkip=adm; try{ _rn.apply(this,arguments); } finally{ S._navSkip=false; }
    try{ const nl=document.getElementById('navlist'); if(nl){ nl.classList.remove('nav-cache'); if(nl.firstElementChild){ const h=nl.innerHTML; if(h!==renderNav._ult){ renderNav._ult=h; smGrava(NC_KEY,JSON.stringify({h:h.replace(/\s*aria-current="page"/g,''),adm})); } } }
      smBotao(); smTitulos(); }catch(e){ console.warn('[menu lateral]',e); } }; }
smBotao(); smAplica();
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('#side-min'); if(!b) return; ev.preventDefault(); ev.stopPropagation();
  smGrava(SM_KEY,document.body.classList.contains('side-min')?null:'1'); smAplica(); try{ window.dispatchEvent(new Event('resize')); }catch(e){} },true);
document.head.insertAdjacentHTML('beforeend',`<style id="sm-css">
#navlist.nav-cache{pointer-events:none;opacity:.75}
.side .sm-bt{flex-shrink:0;color:rgba(255,255,255,.62);font-size:12.5px;margin-top:2px}.side .sm-bt:hover{color:#fff}
.sm-ar{display:inline-flex;width:20px;justify-content:center;font-size:16px;line-height:1}
@media (min-width:901px){
 body.side-min .side{width:68px;padding-left:6px;padding-right:6px}
 body.side-min .side .brand{justify-content:center;padding-left:0;padding-right:0}
 body.side-min .side .brand{flex-direction:column;gap:5px;margin:0 -6px;width:auto}
 body.side-min .side .brand>*:not(img){display:none!important}
 body.side-min .side .brand>img:not(.assin){display:block!important;width:56px;max-width:56px;height:auto;margin:0 auto}
 body.side-min .side .modulo,body.side-min .side #gxs,body.side-min .side .gxg-sub{display:none}
 body.side-min .side .navbtn{justify-content:center;padding-left:0;padding-right:0;gap:0}
 body.side-min .side .navbtn>span:not(.sm-ar),body.side-min .side .navbtn small,body.side-min .side .navbtn .badge{display:none}
 body.side-min .side .navbtn{font-size:0}
 body.side-min .side .navbtn svg{width:20px;height:20px;flex-shrink:0}
 body.side-min .side .sm-bt .sm-ar{font-size:18px}
}
</style>`);
