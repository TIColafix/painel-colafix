/* Painel Colafix · 92-gestor-extras.js (17/11/2026) — gestor com módulo a mais.
   Pedido: "liberei uma tela para o Marcelo (a do almox) e ficou tudo desorganizado".
   Causa: marcar um módulo no cargo da pessoa troca o cargo "Gestor" por "Personalizado" (perfil 'outro'), e o menu da
   Visão do gestor (gxSolo) só valia para o cargo 'gestor' — ele caía no menu comum, com tudo solto.
   Agora: quem tem o módulo Visão do gestor (e não é a administradora) continua com o menu do gestor, e os módulos que vêm
   além do pacote do gestor aparecem embaixo, em "Outros módulos" (lateral e "Mais" do celular). */
"use strict";
const GXE_BASE=['gestor','producao','silos','manut','telas','analise','inicio','ajustes'];
gxSolo=function(){ try{ const A=S.acs; if(!A||!A.pronto) return false; if(A.dono) return /[?&]gestor=1/.test(location.search);
  const d=A.doc; if(!d||d.ativo===false) return false; return (d.perfil==='gestor'||(d.mods||[]).includes('gestor'))&&viewOk('gxinicio'); }catch(e){ return false; } };
function gxeExtras(){ try{ const d=S.acs&&S.acs.doc, dado=(d&&d.mods)||[]; return modsVis().filter(m=>dado.includes(m.id)&&!GXE_BASE.includes(m.id)&&!GXN_FORA.includes(m.id)); }catch(e){ return []; } }
{ const _n=gxnNav; gxnNav=function(){ const r=_n.apply(this,arguments); try{ if(!gxSolo()) return r; const nl=$('#navlist'); if(!nl) return r; const xs=gxeExtras(); if(!xs.length) return r;
    nl.insertAdjacentHTML('beforeend',`<div class="gxe-h">OUTROS MÓDULOS</div>`+xs.map(m=>{ const v=mViews(m)[0]; return v?`<button class="navbtn gxn-nb gxe-m" data-go="${esc(v)}" ${S.mod===m.id?'aria-current="page"':''}>${ic(m.ic,18)}<span>${esc(m.nome)}</span></button>`:''; }).join('')); }catch(e){} return r; }; }
{ const _m=gxnModulos; gxnModulos=function(){ let h=_m.apply(this,arguments); try{ const xs=gxeExtras(); if(xs.length) h+=`<section class="card gxg-mc"><h2 class="gxn-h2">Outros módulos</h2><div class="gxn-mg">${xs.map(m=>{ const v=mViews(m)[0]; return v?`<button class="gxn-mb" data-go="${esc(v)}">${ic(m.ic,22)}<span>${esc(m.nome)}</span></button>`:''; }).join('')}</div></section>`; }catch(e){} return h; }; }
try{ document.head.insertAdjacentHTML('beforeend',`<style id="gxe-css">.gxe-h{font-size:11px;letter-spacing:.08em;font-weight:600;opacity:.6;margin:16px 12px 6px;color:inherit}</style>`); }catch(e){}
window.Painel=window.Painel||{}; window.Painel.gestorExtras=()=>gxeExtras().map(m=>m.id);
