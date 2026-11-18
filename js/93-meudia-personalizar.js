/* 93 · Meu dia personalizável (18/11/2026, pedido "deixar o painel mais personalizável como o Outlook").
   Botão "Personalizar" no alto do Meu dia (só o Meu dia de quem usa, não o "Ver como" dos cargos) abre uma gaveta à direita,
   como o "Personalizar a exibição" do Outlook:
   - Blocos: mostrar/esconder e mudar a ordem (↑ ↓). Os de cima (Avisos, O que importa, Rotina) mudam de ordem entre si;
     os quadros do lado (Cimento, Atenção, Paradas…) mudam de ordem entre si. Quadros novos de outros arquivos aparecem sozinhos.
   - Cartões da rotina: quais aparecem (Silos, Programação, Ranchos, Folhas, Apontamento, Base do Focco…).
   - Aparência: duas colunas ou uma coluna, confortável ou compacto, mostrar a frase de explicação embaixo da saudação.
   - "Voltar ao padrão". Guardado por pessoa em perfis/{uid}.meuDia {oc, ord, rot, cols, comp, semSub} (vale em todos os aparelhos;
     a regra de perfis já deixa cada pessoa gravar o próprio).
   Só reorganiza o que o Meu dia já desenhou (depois de cada render): nenhuma conta muda. Prefixo `mdp`. */
S.mdp=S.mdp||{c:null,lido:false,ab:false,vistos:[],rots:[]};
const MDP_PAD={oc:{},ord:[],rot:{},cols:'2',comp:false,semSub:false};
function mdpCfg(){ return Object.assign({},MDP_PAD,S.mdp.c||{}); }
function mdpOn(){ return S.view==='meudia'&&!!S.uid; }
function mdpLe(){ if(S.mdp.lido===S.uid||!S.db||!S.uid) return; S.mdp.lido=S.uid;
  S.db.doc('perfis/'+S.uid).get().then(g=>{ const dd=(g&&g.exists&&g.data())||{}; S.mdp.c=dd.meuDia||null; visDe(dd.visual||null); if(S.view==='meudia') render(); }).catch(e=>{ S.mdp.lido=false; console.warn('[meu dia]',e); }); }
async function mdpGrava(p){ S.mdp.c=Object.assign({},mdpCfg(),p); mdpAplica(); mdpGaveta();
  try{ await S.db.doc('perfis/'+S.uid).set({meuDia:S.mdp.c},{merge:true}); }catch(e){ erro(e); } }
const mdpSlug=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/* acha os blocos do Meu dia na tela: {k, t (nome), reg:'topo'|'linhas'|'lado', el} */
function mdpBlocos(){ const V=document.getElementById('view'); if(!V) return []; const out=[];
  const lab=el=>{ const l=el.querySelector(':scope > .label, :scope > .head .label, :scope > .md3-h .label, :scope > .head .eyebrow'); return (l&&l.textContent||'').trim(); };
  [...V.children].forEach(el=>{
    if(el.matches('section.md-av')) out.push({k:'avisos',t:'Avisos',reg:'topo',el});
    else if(el.matches('section.md3')) out.push({k:'md3',t:'O que mais importa hoje',reg:'topo',el});
    else if(el.matches('.rotina')) out.push({k:'rotina',t:'Rotina do dia (cartões)',reg:'topo',el});
    else if(el.matches('.md-grid')){
      const ch=[...el.children], esq=ch.find(c=>c.tagName==='SECTION'), lado=ch.find(c=>c.tagName==='DIV');
      if(esq) out.push({k:'linhas',t:'Hoje nas linhas',reg:'linhas',el:esq});
      if(lado) [...lado.children].forEach(s=>{ const t=lab(s)||((s.textContent||'').trim().slice(0,30)); const k='lado:'+mdpSlug(t); if(!out.some(o=>o.k===k)) out.push({k,t:t.charAt(0)+t.slice(1).toLowerCase(),reg:'lado',el:s}); }); }
    else if(el.matches('section.card')&&!el.closest('.md-grid')){ const t=lab(el); if(t) out.push({k:'extra:'+mdpSlug(t),t:t.charAt(0)+t.slice(1).toLowerCase(),reg:'topo',el}); } });
  return out; }
function mdpOrdena(xs,ord){ const pos=k=>{ const i=ord.indexOf(k); return i<0?1e3+xs.findIndex(x=>x.k===k):i; }; return xs.slice().sort((a,b)=>pos(a.k)-pos(b.k)); }
function mdpAplica(){ if(!mdpOn()) return; const V=document.getElementById('view'); if(!V||!V.querySelector('.rotina, .md-grid, .md3')) return;
  const C=mdpCfg(), B=mdpBlocos(); S.mdp.vistos=B.map(b=>({k:b.k,t:b.t,reg:b.reg}));
  /* rotina: guarda os cartões vistos e esconde os escolhidos */
  const rots=[...V.querySelectorAll('.rotina > .rot')].map(r=>{ const t=((r.querySelector(':scope > b')||{}).textContent||'').trim(); return {k:mdpSlug(t),t,el:r}; });
  if(rots.length) S.mdp.rots=rots.map(r=>({k:r.k,t:r.t}));
  rots.forEach(r=>{ r.el.hidden=!!C.rot[r.k]; }); const rv=rots.filter(r=>!r.el.hidden).length, ro=V.querySelector('.rotina'); if(ro){ ro.style.setProperty('--mdp-n',Math.max(1,rv)); ro.classList.toggle('mdp-n',rv<rots.length); }
  /* blocos: esconder */
  B.forEach(b=>{ b.el.hidden=!!C.oc[b.k]; });
  /* ordem dos de cima (antes da grade) e dos do lado */
  const grid=V.querySelector('.md-grid'), topo=mdpOrdena(B.filter(b=>b.reg==='topo'),C.ord);
  const ancora=grid||null; topo.forEach(b=>{ if(ancora) V.insertBefore(b.el,ancora); else V.appendChild(b.el); });
  const lado=grid&&[...grid.children].find(c=>c.tagName==='DIV'); if(lado) mdpOrdena(B.filter(b=>b.reg==='lado'),C.ord).forEach(b=>lado.appendChild(b.el));
  /* aparência */
  const esqOc=B.some(b=>b.k==='linhas'&&b.el.hidden), ladoOc=B.filter(b=>b.reg==='lado').every(b=>b.el.hidden);
  if(grid){ grid.classList.toggle('mdp-uma',C.cols==='1'||esqOc||ladoOc); grid.hidden=esqOc&&ladoOc; }
  V.classList.toggle('mdp-comp',!!C.comp);
  const sub=V.querySelector(':scope > .head .sub'); if(sub) sub.hidden=!!C.semSub;
  /* botão Personalizar no cabeçalho */
  const hd=V.querySelector(':scope > .head'); if(hd&&!hd.querySelector('[data-act="mdp-abre"]')){
    const bt=document.createElement('button'); bt.className='btn sec mdp-bt'; bt.dataset.act='mdp-abre'; bt.type='button'; bt.title='Escolher o que aparece no Meu dia e em que ordem';
    bt.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg> Personalizar`;
    const ult=hd.lastElementChild; if(ult&&ult.tagName==='BUTTON'){ const w=document.createElement('div'); w.className='mdp-hbt'; hd.insertBefore(w,ult); w.appendChild(bt); w.appendChild(ult); } else hd.appendChild(bt); } }
/* gaveta (fora do #view: não some quando o painel redesenha) */
function mdpGaveta(){ let g=document.getElementById('mdp-gav'); if(!S.mdp.ab||!mdpOn()){ if(g) g.remove(); return; }
  if(!g){ g=document.createElement('div'); g.id='mdp-gav'; document.body.appendChild(g); }
  const C=mdpCfg(), vs=S.mdp.vistos, rots=S.mdp.rots, e=esc;
  const lista=(reg,tit,dica)=>{ const xs=mdpOrdena(vs.filter(v=>reg.includes(v.reg)),C.ord); if(!xs.length) return '';
    return `<div class="mdp-sec"><div class="mdp-st">${tit}</div>${dica?`<p class="mdp-dica">${dica}</p>`:''}${xs.map((v,i)=>`<div class="mdp-it ${C.oc[v.k]?'off':''}">
      <label><input type="checkbox" data-mdp-oc="${e(v.k)}" ${C.oc[v.k]?'':'checked'}><span>${e(v.t)}</span></label>
      ${xs.length>1&&v.reg!=='linhas'?`<span class="mdp-mv"><button data-act="mdp-mv" data-k="${e(v.k)}" data-d="-1" ${i===0?'disabled':''} aria-label="Subir ${e(v.t)}">↑</button><button data-act="mdp-mv" data-k="${e(v.k)}" data-d="1" ${i===xs.length-1?'disabled':''} aria-label="Descer ${e(v.t)}">↓</button></span>`:''}</div>`).join('')}</div>`; };
  const seg=(k,ops)=>`<div class="seg mdp-seg" role="group">${ops.map(([v,t])=>`<button data-act="mdp-set" data-k="${k}" data-v="${v}" aria-pressed="${String(C[k])===v}">${t}</button>`).join('')}</div>`;
  g.innerHTML=`<div class="mdp-fundo" data-act="mdp-fecha"></div><aside class="mdp-g" role="dialog" aria-modal="true" aria-label="Personalizar o Meu dia">
    <div class="mdp-gh"><div><div class="eyebrow">MEU DIA</div><h3>Personalizar</h3><p>Só muda o seu Meu dia. Vale em todos os seus aparelhos.</p></div><button class="mdp-x" data-act="mdp-fecha" aria-label="Fechar">✕</button></div>
    <div class="mdp-gc">
      ${lista(['topo'],'Blocos de cima','Desmarque o que não quer ver. As setas mudam a ordem.')}
      ${rots.length?`<div class="mdp-sec"><div class="mdp-st">Cartões da rotina</div>${rots.map(r=>`<div class="mdp-it ${C.rot[r.k]?'off':''}"><label><input type="checkbox" data-mdp-rot="${e(r.k)}" ${C.rot[r.k]?'':'checked'}><span>${e(r.t)}</span></label></div>`).join('')}</div>`:''}
      ${lista(['linhas','lado'],'Quadros de baixo','"Hoje nas linhas" fica à esquerda; os outros quadros ficam ao lado, na ordem que você escolher.')}
      ${visSecao()}
      <div class="mdp-sec"><div class="mdp-st">Arrumação do Meu dia</div>
        <div class="mdp-ap"><span>Quadros de baixo</span>${seg('cols',[['2','Duas colunas'],['1','Uma coluna']])}</div>
        <div class="mdp-ap"><span>Espaçamento</span>${seg('comp',[['false','Confortável'],['true','Compacto']])}</div>
        <div class="mdp-it"><label><input type="checkbox" data-mdp-sub ${C.semSub?'':'checked'}><span>Mostrar a frase de explicação embaixo da saudação</span></label></div></div>
    </div>
    <div class="mdp-gf"><button class="btn sec" data-act="mdp-pad">Voltar ao padrão</button><button class="btn" data-act="mdp-fecha">Pronto</button></div></aside>`; }
depoisDoRender(()=>{ if(S.uid&&S.db) mdpLe(); if(!mdpOn()){ if(S.mdp.ab){ S.mdp.ab=false; mdpGaveta(); } return; } mdpLe(); mdpAplica(); if(S.mdp.ab) mdpGaveta(); },'meu dia: personalizar');
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mdp-"]'); if(!b) return; ev.preventDefault(); const a=b.dataset.act, C=mdpCfg();
  if(a==='mdp-abre'){ S.mdp.ab=true; mdpAplica(); mdpGaveta(); setTimeout(()=>{ const x=document.querySelector('#mdp-gav .mdp-x'); if(x) x.focus(); },30); return; }
  if(a==='mdp-fecha'){ S.mdp.ab=false; mdpGaveta(); return; }
  if(a==='mdp-pad'){ if(!confirm('Voltar o Meu dia ao jeito padrão (todos os blocos, na ordem de sempre)?')) return; await mdpGrava(Object.assign({},MDP_PAD,{oc:{},ord:[],rot:{}})); toast('Meu dia de volta ao padrão.'); return; }
  if(a==='mdp-set'){ const k=b.dataset.k; let v=b.dataset.v; if(k==='comp') v=v==='true'; await mdpGrava({[k]:v}); return; }
  if(a==='mdp-mv'){ const k=b.dataset.k, d=+b.dataset.d, v=S.mdp.vistos.find(x=>x.k===k); if(!v) return;
    const grupo=v.reg==='topo'?['topo']:['lado'], xs=mdpOrdena(S.mdp.vistos.filter(x=>grupo.includes(x.reg)),C.ord).map(x=>x.k), i=xs.indexOf(k), j=i+d; if(i<0||j<0||j>=xs.length) return;
    [xs[i],xs[j]]=[xs[j],xs[i]]; const resto=C.ord.filter(x=>!xs.includes(x)); await mdpGrava({ord:resto.concat(xs)}); return; } });
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.closest||!t.closest('#mdp-gav')) return; const C=mdpCfg();
  if(t.dataset.mdpOc!==undefined){ const oc=Object.assign({},C.oc); if(t.checked) delete oc[t.dataset.mdpOc]; else oc[t.dataset.mdpOc]=true; await mdpGrava({oc}); return; }
  if(t.dataset.mdpRot!==undefined){ const rot=Object.assign({},C.rot); if(t.checked) delete rot[t.dataset.mdpRot]; else rot[t.dataset.mdpRot]=true; await mdpGrava({rot}); return; }
  if(t.hasAttribute('data-mdp-sub')){ await mdpGrava({semSub:!t.checked}); } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.mdp.ab){ S.mdp.ab=false; mdpGaveta(); } });
try{ if(window.Painel) window.Painel.meuDia={cfg:mdpCfg,blocos:()=>S.mdp.vistos,rotina:()=>S.mdp.rots}; }catch(e){}
(function(){ if(document.getElementById('mdp-css')) return; const s=document.createElement('style'); s.id='mdp-css'; s.textContent=`
.mdp-hbt{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mdp-bt{display:inline-flex;align-items:center;gap:6px}
@media (min-width:1101px){.rotina.mdp-n{grid-template-columns:repeat(var(--mdp-n),minmax(0,1fr))!important}}
.md-grid.mdp-uma{grid-template-columns:1fr!important}.md-grid.mdp-uma>div{display:grid!important;align-items:start;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start}
#view.mdp-comp>.card,#view.mdp-comp .md-grid .card{padding:12px 16px}#view.mdp-comp>*{margin-bottom:10px}#view.mdp-comp .md-grid{gap:10px}#view.mdp-comp .md-grid>div{gap:10px}
#view.mdp-comp .rotina{gap:8px}#view.mdp-comp .rot{padding:10px 12px;min-height:0}#view.mdp-comp .md3-i{padding:8px 12px}#view.mdp-comp .mdo{padding-top:5px;padding-bottom:5px}
#mdp-gav{position:fixed;inset:0;z-index:80}.mdp-fundo{position:absolute;inset:0;background:rgba(10,30,40,.28)}
.mdp-g{position:absolute;top:0;right:0;bottom:0;width:min(400px,100%);background:var(--surface);color:var(--ink,inherit);box-shadow:-12px 0 32px rgba(10,30,40,.18);display:flex;flex-direction:column}
.mdp-gh{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:20px 20px 12px;border-bottom:1px solid var(--line)}.mdp-gh h3{margin:2px 0 4px;font-size:20px}.mdp-gh p{margin:0;font-size:12.5px;color:var(--muted)}
.mdp-x{border:0;background:var(--ground);border-radius:10px;width:34px;height:34px;cursor:pointer;color:inherit;font-size:14px}
.mdp-gc{flex:1;overflow:auto;padding:6px 20px 16px}.mdp-sec{padding:12px 0;border-bottom:1px solid var(--line)}.mdp-sec:last-child{border-bottom:0}
.mdp-st{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:6px}.mdp-dica{margin:0 0 6px;font-size:12px;color:var(--muted)}
.mdp-it{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:6px 8px;border-radius:10px}.mdp-it:hover{background:var(--ground)}.mdp-it.off span{color:var(--muted)}
.mdp-it label{display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;font-size:14px}.mdp-it input{width:18px;height:18px;accent-color:var(--teal-strong,#143F54)}
.mdp-mv{display:inline-flex;gap:2px}.mdp-mv button{border:1px solid var(--line);background:var(--surface);border-radius:8px;width:30px;height:28px;cursor:pointer;color:inherit}.mdp-mv button:disabled{opacity:.35;cursor:default}
.mdp-ap{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;font-size:14px}.mdp-seg button{font-size:12.5px}
.mdp-gf{display:flex;gap:8px;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--line)}
@media (max-width:700px){.mdp-g{width:100%;top:auto;max-height:88vh;border-radius:18px 18px 0 0}}`; document.head.appendChild(s); })();

/* ---------- Visual do painel (18/11/2026, "personalização visual também"): como os temas do Outlook, vale para o painel todo,
   por pessoa (perfis/{uid}.visual {cor, fundo, tam}) e lembrado no aparelho (localStorage colafix.visual) para aparecer já na abertura.
   - Cor: muda a barra lateral, os botões principais, os links e as abas (variáveis --nav, --teal, --teal-strong, --teal-tint, --teal-wash, --v-azul),
     no claro e no escuro. Fundo: só no tema claro (--ground, --surface-2). Tamanho do texto: normal ou maior (zoom só no conteúdo).
   - Tema claro/escuro/automático e a letra continuam os de antes (colafix.tema do js/36 e colafix.letra do js/66, por aparelho).
   As TVs (body.tv) e as telas inteiras do chão de fábrica (.cq) não mudam. Prefixo `vis`. */
const VIS_CORES={
  padrao:{n:'Azul-petróleo (padrão)',c:'#143F54'},
  azul:{n:'Azul',c:'#1E40AF',l:{nav:'#1E3A8A',t:'#2563EB',ts:'#1E40AF',ti:'#E0E8FB',tw:'#EEF3FD',va:'#2563EB'},d:{nav:'#16255C',t:'#7AA2F7',ts:'#A9C1FA',ti:'#1F2A44',tw:'#1B2540'}},
  verde:{n:'Verde',c:'#1B5E3A',l:{nav:'#14532D',t:'#2F7D52',ts:'#1B5E3A',ti:'#E1EFE6',tw:'#EEF6F1',va:'#2F9E63'},d:{nav:'#103A22',t:'#6FBF8F',ts:'#9AD4B0',ti:'#1E3328',tw:'#1A2E23'}},
  roxo:{n:'Roxo',c:'#4A3790',l:{nav:'#3B2A6B',t:'#6B4FB0',ts:'#4A3790',ti:'#EAE4F6',tw:'#F4F0FA',va:'#7C5CD6'},d:{nav:'#2A1E4C',t:'#A890E0',ts:'#C6B6EE',ti:'#2B2540',tw:'#26213A'}},
  vinho:{n:'Vinho',c:'#6E2635',l:{nav:'#5B1D2A',t:'#9B3D4E',ts:'#6E2635',ti:'#F4E3E6',tw:'#FAF0F2',va:'#C0465C'},d:{nav:'#3F141D',t:'#D88A97',ts:'#E8B1BA',ti:'#3A2227',tw:'#331E23'}},
  terracota:{n:'Terracota',c:'#82391A',l:{nav:'#6A2E14',t:'#B4572A',ts:'#82391A',ti:'#F6E6DC',tw:'#FBF2EC',va:'#D2692F'},d:{nav:'#4A200E',t:'#E09A72',ts:'#ECBA9C',ti:'#3A281E',tw:'#33241B'}},
  grafite:{n:'Grafite',c:'#2B2F33',l:{nav:'#2B2F33',t:'#4B5563',ts:'#2B2F33',ti:'#E6E8EB',tw:'#F2F3F5',va:'#4B5563'},d:{nav:'#1B1E21',t:'#A7B0BA',ts:'#C9D0D6',ti:'#2A2F34',tw:'#25292D'}}};
const VIS_FUNDOS={padrao:{n:'Padrão',c:'#EDF1F4'},branco:{n:'Branco',c:'#F9FAFB',s:'#FFFFFF'},areia:{n:'Areia',c:'#F4EFE6',s:'#F8F4EC'},azul:{n:'Azul claro',c:'#E8F0F8',s:'#F1F6FB'},verde:{n:'Verde claro',c:'#EAF3ED',s:'#F2F8F4'},lilas:{n:'Lilás',c:'#F0EDF7',s:'#F6F4FA'},rosa:{n:'Rosé',c:'#F7EEF0',s:'#FBF5F6'}};
S.vis=S.vis||{v:null};
function visGet(){ const v=S.vis.v||(()=>{ try{ return JSON.parse(localStorage.getItem('colafix.visual')||'null'); }catch(e){ return null; } })()||{}; return {cor:VIS_CORES[v.cor]?v.cor:'padrao',fundo:VIS_FUNDOS[v.fundo]?v.fundo:'padrao',tam:v.tam==='maior'?'maior':'normal'}; }
function visDe(v){ if(v){ S.vis.v=v; try{ localStorage.setItem('colafix.visual',JSON.stringify(v)); }catch(e){} } visAplica(); }
function visAplica(){ const V=visGet(), C=VIS_CORES[V.cor], F=VIS_FUNDOS[V.fundo]; let css='';
  const vars=(o,extra)=>`--nav:${o.nav};--teal:${o.t};--teal-strong:${o.ts};--teal-tint:${o.ti};--teal-wash:${o.tw};${o.va?'--v-azul:'+o.va+';':''}${extra||''}`;
  if(C&&C.l) css+=`html:root:not([data-theme="dark"]){${vars(C.l)}}html:root[data-theme="dark"]{${vars(C.d)}}`;
  if(V.fundo!=='padrao'&&F) css+=`html:root:not([data-theme="dark"]){--ground:${F.c};--surface-2:${F.s};}`;
  if(V.tam==='maior') css+=`body:not(.tv) #view{zoom:1.1}`;
  let st=document.getElementById('vis-css'); if(!st){ st=document.createElement('style'); st.id='vis-css'; document.head.appendChild(st); } if(st.textContent!==css) st.textContent=css;
  try{ document.documentElement.dataset.cor=V.cor; }catch(e){} }
visAplica();
async function visGrava(p){ const v=Object.assign({},visGet(),p); visDe(v); mdpGaveta(); if(S.uid&&S.db){ try{ await S.db.doc('perfis/'+S.uid).set({visual:v},{merge:true}); }catch(e){ erro(e); } } }
function visSecao(){ const V=visGet(), e=esc, tema=typeof temaGet==='function'?temaGet():'auto', letra=typeof letraAtual==='function'?letraAtual():'archivo';
  const seg=(act,cur,ops)=>`<div class="seg mdp-seg" role="group">${ops.map(([v,t])=>`<button data-act="${act}" data-v="${v}" aria-pressed="${cur===v}">${t}</button>`).join('')}</div>`;
  return `<div class="mdp-sec vis-sec"><div class="mdp-st">Visual do painel</div><p class="mdp-dica">Vale para o painel todo, no seu login.</p>
    <div class="vis-l">Cor</div><div class="vis-sw">${Object.entries(VIS_CORES).map(([k,c])=>`<button class="vis-b ${V.cor===k?'on':''}" data-act="vis-cor" data-v="${k}" title="${e(c.n)}" aria-label="Cor ${e(c.n)}" aria-pressed="${V.cor===k}"><i style="background:${c.c}"></i></button>`).join('')}<span class="vis-nm">${e(VIS_CORES[V.cor].n)}</span></div>
    <div class="vis-l">Fundo <small>(tema claro)</small></div><div class="vis-sw">${Object.entries(VIS_FUNDOS).map(([k,c])=>`<button class="vis-b f ${V.fundo===k?'on':''}" data-act="vis-fundo" data-v="${k}" title="${e(c.n)}" aria-label="Fundo ${e(c.n)}" aria-pressed="${V.fundo===k}"><i style="background:${c.c}"></i></button>`).join('')}<span class="vis-nm">${e(VIS_FUNDOS[V.fundo].n)}</span></div>
    <div class="mdp-ap"><span>Tema</span>${seg('vis-tema',tema,[['auto','Automático'],['light','Claro'],['dark','Escuro']])}</div>
    <div class="mdp-ap"><span>Letra</span>${seg('vis-letra',letra,[['archivo','Archivo'],['geist','Geist']])}</div>
    <div class="mdp-ap"><span>Tamanho do texto</span>${seg('vis-tam',V.tam,[['normal','Normal'],['maior','Maior']])}</div>
    <div class="vis-prev"><span class="vis-pn" style="background:var(--nav)"></span><span class="vis-pc"><b>Assim fica</b><small>link</small><em>Botão</em></span></div></div>`; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="vis-"]'); if(!b) return; ev.preventDefault(); const a=b.dataset.act, v=b.dataset.v;
  if(a==='vis-cor') return visGrava({cor:v});
  if(a==='vis-fundo') return visGrava({fundo:v});
  if(a==='vis-tam') return visGrava({tam:v});
  if(a==='vis-tema'){ if(typeof temaSet==='function') temaSet(v); mdpGaveta(); return; }
  if(a==='vis-letra'){ try{ localStorage.setItem('colafix.letra',v); }catch(e){} if(typeof letraAplicar==='function') letraAplicar(); else document.documentElement.dataset.letra=v; mdpGaveta(); return; } });
try{ if(window.Painel) window.Painel.visual={get:visGet,cores:VIS_CORES,fundos:VIS_FUNDOS}; }catch(e){}
(function(){ const s=document.createElement('style'); s.id='vis-css2'; s.textContent=`
.vis-l{font-size:13px;margin:8px 8px 6px;color:var(--ink-2,inherit)}.vis-l small{color:var(--muted)}
.vis-sw{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:0 8px 6px}.vis-b{width:34px;height:34px;border-radius:50%;border:2px solid transparent;background:none;padding:3px;cursor:pointer}
.vis-b i{display:block;width:100%;height:100%;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}.vis-b.on{border-color:var(--teal-strong)}.vis-b:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.vis-nm{font-size:12.5px;color:var(--muted);margin-left:4px}
.vis-prev{display:flex;gap:0;margin:10px 8px 4px;border:1px solid var(--line);border-radius:12px;overflow:hidden;height:64px}.vis-pn{width:42px}
.vis-pc{flex:1;background:var(--ground);display:flex;align-items:center;gap:12px;padding:0 14px;font-size:13px}.vis-pc small{color:var(--teal);text-decoration:underline;font-size:13px}
.vis-pc em{font-style:normal;background:var(--teal-strong);color:#fff;border-radius:9px;padding:6px 12px;font-weight:600;font-size:12.5px}
:root[data-theme="dark"] .vis-pc em{background:var(--teal);color:#0d1418}`; document.head.appendChild(s); })();
