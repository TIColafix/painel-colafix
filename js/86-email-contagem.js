/* E-mail da contagem do dia (16/11/2026, "todo dia eu tenho que mandar esse e-mail; tenho como automatizar? já tenho os itens no painel
   e os múltiplos de paletes"). Cartão no alto de Análise PCP › Divergências do inventário (`anlinvd`).
   - Itens do e-mail e destinatários ficam em `config/geral.invEmail {itens:[cód], para, cc, ult:{dia,em,por}}`.
   - Físico: a contagem de hoje do inventário (a mais recente que tem o item, Almox 3 + 30); sem contagem, a pessoa digita
     paletes × múltiplo do item (Ajustes › Itens, `palete`) + sacos avulsos.
   - Sistema: o saldo do Focco da base (`pcpbase/itens.l[cód].a3 + a30`, a última importação).
   - Obs: igual → "Sem divergência"; divergência do dia com causa → a causa; senão "Não encontrei a causa da divergência" (editável).
   - Enviar: "Criar o e-mail no Outlook" (rascunho pelo login da Microsoft, como o e-mail ao financeiro dos PJ), "Abrir no Outlook"
     (Outlook na internet com o texto) ou "Copiar". O site não manda e-mail sozinho (sem servidor). Prefixo `iem`. */
S.iem=S.iem||{fis:{},obs:{},add:'',edit:false};
function iemCfg(){ const c=(S.cfg&&S.cfg.invEmail)||{}; return {itens:Array.isArray(c.itens)?c.itens.map(String):[],para:c.para||'',cc:c.cc||'',ult:c.ult||null}; }
const iemN=v=>(Math.round(+v||0)).toLocaleString('pt-BR');
function iemDesc(c){ const it=(typeof itemDe==='function'&&itemDe(c))||{}; return it.descricao||((((S.anl.base||{}).itens||{}).l||{})[c]||{}).d||c; }
function iemPal(c){ const it=(typeof itemDe==='function'&&itemDe(c))||{}; return +it.palete||0; }
function iemSis(c){ const l=(((S.anl.base||{}).itens||{}).l||{})[c]; return l?(+l.a3||0)+(+l.a30||0):null; }
function iemContado(c){ /* a contagem de hoje mais recente com o item */
  let m=null; const h=hojeStr(); (typeof invdConfHoje==='function'?invdConfHoje():[]).forEach(cf=>{ if(!cf||cf.excluida||(cf.dia||String(cf.em||'').slice(0,10))!==h) return;
    const it=(cf.itens||{})[c]; if(!it) return; if(!m||String(cf.em||'')>String(m.em||'')) m={q:(+it.almox3||0)+(+it.almox30||0),em:cf.em,por:cf.porNome||cf.nomeUsuario||''}; }); return m; }
function iemLinha(c){ const X=S.iem, f=X.fis[c]||{}, pal=iemPal(c), cont=iemContado(c);
  let fis=null, fonte='';
  if(f.pal!==undefined&&f.pal!==''||f.av!==undefined&&f.av!==''){ fis=(+f.pal||0)*(pal||0)+(+f.av||0); fonte='digitado'; }
  else if(cont){ fis=cont.q; fonte='contagem'; }
  const sis=iemSis(c), dif=fis!=null&&sis!=null?fis-sis:null;
  let obs=X.obs[c];
  if(obs==null){ const dv=((S.invd&&S.invd.ab)||[]).concat((S.invd&&S.invd.fe)||[]).filter(x=>x.c===c&&x.dia===hojeStr()).pop();
    obs=dif===0?'Sem divergência':dv&&dv.causa?dv.causa:dv&&dv.st==='extrato'?'Conferindo com o movimento do Focco depois da foto do saldo':'Não encontrei a causa da divergência'; }
  return {c,d:iemDesc(c),pal,cont,fis,fonte,sis,dif,obs}; }
function iemSaud(){ const h=new Date().getHours(); return h<12?'Bom dia!!':h<18?'Boa tarde!!':'Boa noite!!'; }
function iemAssunto(){ return 'Contagem do estoque · '+dm(hojeStr())+'/'+hojeStr().slice(0,4); }
function iemHtml(L){ const e=esc; return `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#222"><p>${iemSaud()}<br>Segue a contagem na data de hoje:</p>`
  +L.map(x=>`<p style="margin:14px 0 4px"><b>Hoje temos em estoque ${e(x.d)} (${e(x.c)})</b></p><p style="margin:0">Físico = ${x.fis==null?'—':iemN(x.fis)} sacos<br>Sistema = ${x.sis==null?'—':iemN(x.sis)} sacos<br>&nbsp;Obs: ${e(x.obs)}</p>`).join('')+'</div>'; }
function iemTexto(L){ return iemSaud()+'\nSegue a contagem na data de hoje:\n'+L.map(x=>'\nHoje temos em estoque '+x.d+' ('+x.c+')\nFísico = '+(x.fis==null?'—':iemN(x.fis))+' sacos\nSistema = '+(x.sis==null?'—':iemN(x.sis))+' sacos\n Obs: '+x.obs).join('\n')+'\n'; }
const iemMails=t=>String(t||'').split(/[;,\s]+/).filter(x=>/@/.test(x));
function iemOwa(L,C){ const q=['to='+encodeURIComponent(iemMails(C.para).join(';'))]; if(iemMails(C.cc).length) q.push('cc='+encodeURIComponent(iemMails(C.cc).join(';')));
  q.push('subject='+encodeURIComponent(iemAssunto())); return 'https://outlook.office.com/mail/deeplink/compose?'+q.join('&')+'&body='+encodeURIComponent(iemTexto(L)); }
async function iemGravaCfg(p){ const v=Object.assign({},iemCfg(),p); S.cfg.invEmail=Object.assign({},S.cfg.invEmail||{},p); try{ await S.db.doc('config/geral').set({invEmail:p},{merge:true}); }catch(e){ erro(e); } return v; }
async function iemMarca(como){ const ult={dia:hojeStr(),em:new Date().toISOString(),por:(S.nomes&&S.nomes[S.uid])||'',como}; await iemGravaCfg({ult}); }
function iemCard(){ let pode=false; try{ pode=viewOk('anlinvd'); }catch(e){} if(!pode) return '';
  const C=iemCfg(), X=S.iem, L=C.itens.map(iemLinha), feito=C.ult&&C.ult.dia===hojeStr();
  const sd=typeof invdSaldoEm==='function'?invdSaldoEm():null, sdT=sd?dm(hojeStr(sd))+' às '+sd.toTimeString().slice(0,5):'';
  const ol=window.OneDrive&&OneDrive.mail&&OneDrive.mail.ativo&&OneDrive.mail.ativo();
  const linha=x=>`<tr><td class="l"><b>${esc(x.d)}</b><small class="xf-de">${esc(x.c)}${x.pal?' · palete de '+iemN(x.pal):' · sem múltiplo de palete em Ajustes › Itens'} <a href="#" data-act="iem-tira" data-v="${esc(x.c)}">tirar</a></small></td>
    <td class="l"><div class="iem-fis"><label>Paletes<input class="txt" inputmode="numeric" data-iem="pal" data-c="${esc(x.c)}" value="${esc((X.fis[x.c]||{}).pal??'')}" placeholder="0"${x.pal?'':' disabled'}></label><label>Sacos avulsos<input class="txt" inputmode="numeric" data-iem="av" data-c="${esc(x.c)}" value="${esc((X.fis[x.c]||{}).av??'')}" placeholder="0"></label></div>
      <small class="xf-de">${x.fonte==='contagem'?'da contagem de hoje'+(x.cont.por?' · '+esc(x.cont.por):'')+(x.cont.em?' às '+new Date(x.cont.em).toTimeString().slice(0,5):'')+' (digite para trocar)':x.fonte==='digitado'?'digitado agora':'ninguém contou hoje: digite paletes e avulsos'}</small></td>
    <td><b class="num">${x.fis==null?'—':iemN(x.fis)}</b></td><td><b class="num">${x.sis==null?'—':iemN(x.sis)}</b></td>
    <td><span class="${x.dif==null?'':x.dif<0?'cm-neg':x.dif>0?'ivd-pos':''}">${x.dif==null?'—':x.dif===0?'igual':invdS(x.dif)}</span></td>
    <td class="l"><input class="txt iem-obs" data-iem="obs" data-c="${esc(x.c)}" value="${esc(x.obs)}"></td></tr>`;
  const lista=iemTodos().filter(i=>!C.itens.includes(String(i.codigo))).slice(0,1500);
  const add=`<div class="iem-add"><input class="txt" id="iem-add" list="iem-dl" placeholder="Acrescentar item (código ou nome) e Enter" value="${esc(X.add||'')}"><datalist id="iem-dl">${lista.map(i=>`<option value="${esc(i.codigo)}">${esc(i.descricao||i.nome||'')}</option>`).join('')}</datalist><button class="btn sec" data-act="iem-addok">Acrescentar</button></div>`;
  const falta=L.filter(x=>x.fis==null).length;
  return `<section class="card cm-s iem"><div class="iem-h"><div><div class="cm-q">E-MAIL DA CONTAGEM DO DIA</div>
     <p class="cm-r" style="margin:4px 0 0">${C.itens.length?`${C.itens.length} ${C.itens.length===1?'item':'itens'} · sistema = saldo do Focco ${sdT?'de '+esc(sdT):'(nenhum importado)'}${feito?` · <b>mandado hoje</b> às ${esc(new Date(C.ult.em).toTimeString().slice(0,5))}${C.ult.por?' por '+esc(C.ult.por):''}`:''}`:'Escolha os itens que vão no e-mail (ex.: os cimentos) e os destinatários. Depois é só conferir e mandar todo dia.'}</p></div>
     <button class="btn sec" data-act="iem-cfg">${X.edit?'Fechar os ajustes':'Itens e destinatários'}</button></div>
   ${X.edit||!C.itens.length?`<div class="iem-aj"><label>Para<input class="txt" id="iem-para" value="${esc(C.para)}" placeholder="email1@…; email2@…"></label><label>Cópia<input class="txt" id="iem-cc" value="${esc(C.cc)}" placeholder="opcional"></label><button class="btn" data-act="iem-salva">Salvar destinatários</button></div>${add}`:''}
   ${C.itens.length?`<div class="cm-tw"><table class="cm-t iem-t"><thead><tr><th class="l">Item</th><th class="l">Paletes e avulsos</th><th>Físico</th><th>Sistema</th><th>Diferença</th><th class="l">Obs</th></tr></thead><tbody>${L.map(linha).join('')}</tbody></table></div>
   <div class="iem-bt">${falta?`<span class="sub" style="margin:0">Falta o físico de ${falta} ${falta===1?'item':'itens'}.</span>`:''}${!iemMails(C.para).length?'<span class="sub" style="margin:0">Ponha os destinatários em "Itens e destinatários".</span>':''}
     ${ol?(OneDrive.mail.conectado()?`<button class="btn" data-act="iem-ol">Criar o e-mail no Outlook</button>`:`<button class="btn" data-act="iem-olc">Conectar o Outlook (uma vez só)</button>`):''}
     <button class="btn ${ol?'sec':''}" data-act="iem-owa">Abrir no Outlook</button><button class="btn sec" data-act="iem-cop">Copiar o e-mail</button>
     <a href="#" data-act="iem-ok">${feito?'':'já mandei · marcar como mandado'}</a></div>`:''}</section>`; }
/* fora do "anlinvd" o cartão não aparece; dentro, vem logo antes dos números das divergências */
(function(){ const o=S.extViews&&S.extViews.anlinvd; if(!o) return; S.extViews.anlinvd=()=>{ const h=o(); const i=h.indexOf('<div class="cm">'); return i<0?h+iemCard():h.slice(0,i)+'<div class="cm">'+iemCard()+h.slice(i+16); }; })();
NAV_EXTRA.push(()=>{ try{ if(!viewOk('anlinvd')) return []; const C=iemCfg(), d=new Date(); if(!C.itens.length||d.getDay()===0||d.getDay()===6||d.getHours()<8) return [];
  if(C.ult&&C.ult.dia===hojeStr()) return []; return [{n:'',t:'E-mail da contagem de hoje ainda não foi mandado',s:C.itens.length+' itens · Divergências do inventário',acao:'anlinvd',c:'warn'}]; }catch(e){ return []; } });
function iemLe(){ const X=S.iem; document.querySelectorAll('[data-iem]').forEach(el=>{ const c=el.dataset.c, k=el.dataset.iem; if(k==='obs') X.obs[c]=el.value; else { X.fis[c]=X.fis[c]||{}; X.fis[c][k]=el.value.replace(/\D/g,''); } }); }
document.addEventListener('input',ev=>{ const el=ev.target; if(!el||!el.dataset) return; if(el.id==='iem-add'){ S.iem.add=el.value; return; } if(!el.dataset.iem) return;
  iemLe(); if(el.dataset.iem==='obs') return; clearTimeout(S.iem._t); S.iem._t=setTimeout(()=>{ if(typeof rerenderSeguro==='function') rerenderSeguro(); else render(); },700); });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='iem-add'){ ev.preventDefault(); const b=document.querySelector('[data-act="iem-addok"]'); if(b) b.click(); } });
function iemTodos(){ const m={}; (S.itens||[]).filter(i=>i.ativo!==false).forEach(i=>{ const c=String(i.codigo||i._id||''); if(c) m[c]={codigo:c,descricao:i.descricao||''}; });
  const l=(((S.anl.base||{}).itens||{}).l)||{}; for(const c in l) if(!m[c]) m[c]={codigo:c,descricao:l[c].d||''}; return Object.values(m).sort((a,b)=>a.codigo.localeCompare(b.codigo)); }
async function iemAcrescenta(){ const v=String(S.iem.add||'').trim(); if(!v) return; const T=iemTodos();
  const n=anlNorm(v); let it=T.find(i=>String(i.codigo).toUpperCase()===v.toUpperCase()); if(!it){ const xs=T.filter(i=>anlNorm((i.codigo||'')+' '+(i.descricao||i.nome||'')).includes(n)); if(xs.length===1) it=xs[0]; else return toast(xs.length?'Mais de um item com esse nome: escolha na lista.':'Não achei esse item.'); }
  const C=iemCfg(); if(C.itens.includes(String(it.codigo))) return toast('Esse item já está no e-mail.'); S.iem.add=''; S.iem.edit=true; await iemGravaCfg({itens:C.itens.concat([String(it.codigo)])}); render(); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="iem-"]'); if(!b) return; ev.preventDefault(); const a=b.dataset.act; iemLe();
  const C=iemCfg(), L=C.itens.map(iemLinha);
  if(a==='iem-cfg'){ S.iem.edit=!S.iem.edit; render(); return; }
  if(a==='iem-salva'){ const g=id=>(document.getElementById(id)||{}).value||''; await iemGravaCfg({para:g('iem-para').trim(),cc:g('iem-cc').trim()}); toast('Destinatários salvos.'); render(); return; }
  if(a==='iem-addok'){ await iemAcrescenta(); return; }
  if(a==='iem-tira'){ await iemGravaCfg({itens:C.itens.filter(x=>x!==b.dataset.v)}); render(); return; }
  if(a==='iem-ok'){ await iemMarca('marcado'); toast('Marcado como mandado hoje.'); render(); return; }
  const semFis=L.filter(x=>x.fis==null).length; if(semFis&&!confirm('Falta o físico de '+semFis+(semFis===1?' item':' itens')+'. Mandar assim mesmo?')) return;
  if(a==='iem-owa'){ if(!iemMails(C.para).length) return toast('Ponha os destinatários primeiro.'); window.open(iemOwa(L,C),'_blank'); await iemMarca('outlook'); render(); return; }
  if(a==='iem-cop'){ const html=iemHtml(L), txt=iemTexto(L);
    try{ if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write) await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([txt],{type:'text/plain'})})]); else await navigator.clipboard.writeText(txt); toast('E-mail copiado. É só colar no Outlook.'); }
    catch(e){ toast('Não consegui copiar. Use "Abrir no Outlook".'); } window.__iem={html,txt,assunto:iemAssunto()}; return; }
  if(a==='iem-olc'){ try{ await OneDrive.mail.conectar(); toast('Outlook conectado.'); }catch(e){ erro(e); } render(); return; }
  if(a==='iem-ol'){ if(!iemMails(C.para).length) return toast('Ponha os destinatários primeiro.'); const w=window.open('about:blank','_blank');
    try{ const r=await OneDrive.mail.rascunho({para:iemMails(C.para).join(';'),cc:iemMails(C.cc).join(';'),assunto:iemAssunto(),html:iemHtml(L)}); if(w) w.location.href=r.link; else toast('Rascunho criado na sua caixa do Outlook.'); await iemMarca('rascunho'); render(); }
    catch(e){ if(w) w.close(); erro(e); } return; } });
if(window.Painel) Painel.emailContagem={linhas:()=>iemCfg().itens.map(iemLinha),html:()=>iemHtml(iemCfg().itens.map(iemLinha)),texto:()=>iemTexto(iemCfg().itens.map(iemLinha)),owa:()=>iemOwa(iemCfg().itens.map(iemLinha),iemCfg())};
(function(){ if(document.getElementById('iem-css')) return; const s=document.createElement('style'); s.id='iem-css'; s.textContent=`
.iem-h{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
.iem-aj,.iem-add{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:12px 0 0}.iem-aj label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);flex:1 1 220px}
.iem-add input{flex:1 1 280px}.iem-t td{vertical-align:top}.iem-fis{display:flex;gap:8px}.iem-fis label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--muted)}.iem-fis input{width:86px}
.iem-obs{width:100%;min-width:200px}.iem-bt{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-end;margin-top:12px}`; document.head.appendChild(s); })();
