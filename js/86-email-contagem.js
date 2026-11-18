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
/* 16/11 ("é um outro sistema, eu que coloco a quantidade que tem no sistema"): o Sistema também é digitado; o digitado no dia fica guardado no aparelho */
(function(){ try{ const g=JSON.parse(localStorage.getItem('colafix.iem.'+hojeStr())||'null'); if(g){ S.iem.fis=g.fis||{}; S.iem.obs=g.obs||{}; } }catch(e){} })();
function iemGuarda(){ try{ localStorage.setItem('colafix.iem.'+hojeStr(),JSON.stringify({fis:S.iem.fis,obs:S.iem.obs})); }catch(e){} }
function iemCfg(){ const c=(S.cfg&&S.cfg.invEmail)||{}; return {itens:Array.isArray(c.itens)?c.itens.map(String):[],para:c.para||'',cc:c.cc||'',ult:c.ult||null}; }
const iemN=v=>(Math.round(+v||0)).toLocaleString('pt-BR');
function iemDesc(c){ const it=(typeof itemDe==='function'&&itemDe(c))||{}; return it.descricao||((((S.anl.base||{}).itens||{}).l||{})[c]||{}).d||c; }
function iemPal(c){ const it=(typeof itemDe==='function'&&itemDe(c))||{}; return +it.palete||0; }
function iemSis(c){ const t=(S.iem.fis[c]||{}).sis; if(t!==undefined&&t!=='') return +t; const l=(((S.anl.base||{}).itens||{}).l||{})[c]; return l?(+l.a3||0)+(+l.a30||0):null; }
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
    <td><b class="num" data-iem-fis="${esc(x.c)}">${x.fis==null?'—':iemN(x.fis)}</b></td><td><input class="txt iem-sis" inputmode="numeric" data-iem="sis" data-c="${esc(x.c)}" value="${esc((X.fis[x.c]||{}).sis??'')}" placeholder="${x.sis==null?'digite':esc(iemN(x.sis))}" aria-label="Quantidade no sistema"></td>
    <td><span data-iem-dif="${esc(x.c)}" class="${x.dif==null?'':x.dif<0?'cm-neg':x.dif>0?'ivd-pos':''}">${x.dif==null?'—':x.dif===0?'igual':invdS(x.dif)}</span></td>
    <td class="l"><input class="txt iem-obs" data-iem="obs" data-c="${esc(x.c)}" value="${esc(x.obs)}"></td></tr>`;
  const lista=iemTodos().filter(i=>!C.itens.includes(String(i.codigo))).slice(0,1500);
  const add=`<div class="iem-add"><input class="txt" id="iem-add" list="iem-dl" placeholder="Acrescentar item (código ou nome) e Enter" value="${esc(X.add||'')}"><datalist id="iem-dl">${lista.map(i=>`<option value="${esc(i.codigo)}">${esc(i.descricao||i.nome||'')}</option>`).join('')}</datalist><button class="btn sec" data-act="iem-addok">Acrescentar</button></div>`;
  const falta=L.filter(x=>x.fis==null).length;
  return `<section class="card cm-s iem"><div class="iem-h"><div><div class="cm-q">E-MAIL DA CONTAGEM DO DIA</div>
     <p class="cm-r" style="margin:4px 0 0">${C.itens.length?`${C.itens.length} ${C.itens.length===1?'item':'itens'} · sistema = o que você digita${sdT?' (sem digitar, vale o saldo do Focco de '+esc(sdT)+')':''}${feito?` · <b>mandado hoje</b> às ${esc(new Date(C.ult.em).toTimeString().slice(0,5))}${C.ult.por?' por '+esc(C.ult.por):''}`:''}`:'Escolha os itens que vão no e-mail (ex.: os cimentos) e os destinatários. Depois é só conferir e mandar todo dia.'}</p></div>
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
/* soma na hora, sem esperar sair do campo */
function iemConta(c){ try{ const x=iemLinha(c), q=v=>[...document.querySelectorAll('['+v+']')].find(e=>e.getAttribute(v)===c);
  const f=q('data-iem-fis'); if(f) f.textContent=x.fis==null?'—':iemN(x.fis);
  const d=q('data-iem-dif'); if(d){ d.textContent=x.dif==null?'—':x.dif===0?'igual':invdS(x.dif); d.className=x.dif==null?'':x.dif<0?'cm-neg':x.dif>0?'ivd-pos':''; } }catch(e){} }
function iemLe(){ const X=S.iem; document.querySelectorAll('[data-iem]').forEach(el=>{ const c=el.dataset.c, k=el.dataset.iem; if(k==='obs') X.obs[c]=el.value; else { X.fis[c]=X.fis[c]||{}; X.fis[c][k]=el.value.replace(/\D/g,''); } }); iemGuarda(); }
document.addEventListener('input',ev=>{ const el=ev.target; if(!el||!el.dataset) return; if(el.id==='iem-add'){ S.iem.add=el.value; return; } if(!el.dataset.iem) return;
  iemLe(); if(el.dataset.iem==='obs') return; iemConta(el.dataset.c); clearTimeout(S.iem._t); S.iem._t=setTimeout(()=>{ if(typeof rerenderSeguro==='function') rerenderSeguro(); else render(); },700); });
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
.iem-obs{width:100%;min-width:200px}.iem-sis{width:96px;text-align:right}.iem-bt{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-end;margin-top:12px}`; document.head.appendChild(s); })();
/* Histórico das contagens do e-mail (18/11/2026, pedido "salvar as contagens do cimento para ter um histórico").
   - Cada dia fica em `invemail/{AAAA-MM-DD}` {dia, em, por, porNome, como, itens:{cód:{d, fis, sis, dif, obs, fonte}}}: gravado ao mandar
     (Outlook, cópia, "já mandei") e também sozinho alguns segundos depois de digitar (merge; o mesmo dia é atualizado, não repete).
   - Botão "Histórico" no cartão: últimos 30/60/90 dias (leitura sob demanda, até 120 documentos), por dia o físico, o sistema e a
     diferença de cada item, resumo por item (dias contados, dias iguais, maior falta e maior sobra) e Excel. Prefixo `iem`. */
async function iemSalvaDia(como){ try{ const C=iemCfg(); if(!C.itens.length) return; const L=C.itens.map(iemLinha), it={};
    L.forEach(x=>{ if(x.fis==null&&x.sis==null) return; it[x.c]={d:x.d,fis:x.fis,sis:x.sis,dif:x.dif,obs:x.obs||'',fonte:x.fonte||''}; });
    if(!Object.keys(it).length) return;
    const o={dia:hojeStr(),em:new Date().toISOString(),por:S.uid||'',porNome:(S.nomes&&S.nomes[S.uid])||'',itens:it}; if(como) o.como=como;
    await S.db.collection('invemail').doc(hojeStr()).set(o,{merge:true});
    if(S.iem.H&&S.iem.H.xs){ const i=S.iem.H.xs.findIndex(x=>x.dia===o.dia); const n=Object.assign({},i>=0?S.iem.H.xs[i]:{},o); if(i>=0) S.iem.H.xs[i]=n; else S.iem.H.xs.unshift(n); }
  }catch(e){ console.warn('[e-mail da contagem] histórico',e); } }
{ const _m=iemMarca; iemMarca=async function(como){ await iemSalvaDia(como); return _m.apply(this,arguments); }; }
document.addEventListener('input',ev=>{ const el=ev.target; if(!el||!el.dataset||!el.dataset.iem) return; clearTimeout(S.iem._ts); S.iem._ts=setTimeout(()=>iemSalvaDia(),4000); });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="iem-cop"]'); if(b) setTimeout(()=>iemSalvaDia('copiado'),50); },true);
async function iemHistCarrega(forca){ const H=S.iem.H=S.iem.H||{dias:30}; if(H.carr||(H.xs&&!forca&&H.de===H.dias)) return; H.carr=true;
  const d=new Date(); d.setDate(d.getDate()-H.dias); const desde=d.toISOString().slice(0,10);
  try{ const s=await S.db.collection('invemail').where('dia','>=',desde).orderBy('dia','desc').limit(120).get(); H.xs=s.docs.map(x=>Object.assign({_id:x.id},x.data())); H.de=H.dias; H.erro=''; }
  catch(e){ H.erro=String(e&&e.message||e); H.xs=H.xs||[]; } H.carr=false; render(); }
function iemHistItens(xs){ const m=new Map(); iemCfg().itens.forEach(c=>m.set(c,iemDesc(c))); xs.forEach(r=>Object.entries(r.itens||{}).forEach(([c,v])=>{ if(!m.has(c)) m.set(c,(v&&v.d)||c); })); return [...m.entries()]; }
function iemHistHtml(){ const H=S.iem.H||{}; if(!H.xs) return `<div class="iem-hs"><p class="sub" style="margin:0">Carregando o histórico…</p></div>`;
  const xs=H.xs.slice().sort((a,b)=>b.dia.localeCompare(a.dia)), IT=iemHistItens(xs);
  const per=`<div class="seg iem-hper" role="group" aria-label="Período">${[30,60,90].map(n=>`<button data-act="iem-hdias" data-v="${n}" aria-pressed="${H.dias===n}">${n} dias</button>`).join('')}</div>`;
  if(!xs.length) return `<div class="iem-hs"><div class="iem-hh"><b>Histórico das contagens</b>${per}</div><p class="sub" style="margin:6px 0 0">${H.erro?'Não consegui ler o histórico: '+esc(H.erro):'Ainda não há contagem guardada neste período. A contagem de hoje entra sozinha ao digitar ou mandar o e-mail.'}</p></div>`;
  const res=IT.map(([c,d])=>{ const v=xs.map(r=>(r.itens||{})[c]).filter(y=>y&&y.dif!=null); const ig=v.filter(y=>y.dif===0).length;
    const fal=v.reduce((a,y)=>Math.min(a,y.dif),0), sob=v.reduce((a,y)=>Math.max(a,y.dif),0);
    return `<div class="iem-hr"><b>${esc(d)}</b><small>${esc(c)}</small><span>${v.length} ${v.length===1?'dia contado':'dias contados'} · ${ig} ${ig===1?'igual':'iguais'}${fal<0?` · maior falta <b class="cm-neg">${invdS(fal)}</b>`:''}${sob>0?` · maior sobra <b class="ivd-pos">${invdS(sob)}</b>`:''}</span></div>`; }).join('');
  const cel=y=>!y?'<td colspan="3" class="iem-hv">—</td>':`<td>${y.fis==null?'—':iemN(y.fis)}</td><td>${y.sis==null?'—':iemN(y.sis)}</td><td class="${y.dif==null?'':y.dif<0?'cm-neg':y.dif>0?'ivd-pos':''}">${y.dif==null?'—':y.dif===0?'igual':invdS(y.dif)}</td>`;
  const tab=`<div class="cm-tw"><table class="cm-t iem-ht"><thead><tr><th class="l" rowspan="2">Dia</th>${IT.map(([c,d])=>`<th colspan="3" class="iem-hit" title="${esc(c)}">${esc(d)}</th>`).join('')}<th class="l" rowspan="2">Quem</th></tr>
    <tr>${IT.map(()=>'<th>Físico</th><th>Sistema</th><th>Dif.</th>').join('')}</tr></thead>
    <tbody>${xs.map(r=>`<tr><td class="l"><b>${esc(dm(r.dia))}</b><small class="xf-de">${esc(['dom','seg','ter','qua','qui','sex','sáb'][new Date(r.dia+'T12:00:00').getDay()])}${r.como?' · mandado':''}</small></td>${IT.map(([c])=>cel((r.itens||{})[c])).join('')}<td class="l"><small>${esc(r.porNome||'')}</small></td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="iem-hs"><div class="iem-hh"><b>Histórico das contagens</b><span class="sub" style="margin:0">${xs.length} ${xs.length===1?'dia':'dias'}</span><span style="flex:1"></span>${per}<button class="btn sec" data-act="iem-hxls">Baixar Excel</button></div>
    <div class="iem-hres">${res}</div>${tab}</div>`; }
function iemHistXls(){ const H=S.iem.H||{}, xs=(H.xs||[]).slice().sort((a,b)=>b.dia.localeCompare(a.dia)), IT=iemHistItens(xs); if(!xs.length) return toast('Não há contagem no histórico.');
  if(!window.PainelXls) return toast('O gerador de Excel ainda está carregando. Tente de novo em alguns segundos.');
  const lin=[]; xs.forEach(r=>IT.forEach(([c,d])=>{ const y=(r.itens||{})[c]; if(!y) return; lin.push([r.dia,c,d,y.fis,y.sis,y.dif,y.obs||'',r.porNome||'',r.como?'sim':'']); }));
  return window.PainelXls.gerar('Contagens do e-mail '+hojeStr()+'.xlsx',[{nome:'Contagens',cab:['Dia','Código','Item','Físico','Sistema','Diferença','Obs','Quem','E-mail mandado'],linhas:lin,tipos:['data','txt','txt','int','int','int','txt','txt','txt']}],
    {tit:'Contagens do e-mail da contagem do dia',sub:'Últimos '+(H.dias||30)+' dias · '+xs.length+' dias com contagem',filtros:'Divergências do inventário'}); }
{ const _c=iemCard; iemCard=function(){ let h=_c.apply(this,arguments); if(!h) return h; const ab=!!S.iem.hab;
    h=h.replace('<button class="btn sec" data-act="iem-cfg">',`<button class="btn sec" data-act="iem-hist" aria-pressed="${ab}">${ab?'Fechar o histórico':'Histórico'}</button><button class="btn sec" data-act="iem-cfg">`);
    if(ab){ if(!(S.iem.H&&S.iem.H.xs)) setTimeout(()=>iemHistCarrega(),0); const i=h.lastIndexOf('</section>'); h=h.slice(0,i)+iemHistHtml()+h.slice(i); }
    return h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="iem-hist"],[data-act="iem-hdias"],[data-act="iem-hxls"]'); if(!b) return; ev.preventDefault(); ev.stopImmediatePropagation(); const a=b.dataset.act;
  if(a==='iem-hist'){ S.iem.hab=!S.iem.hab; if(S.iem.hab){ await iemSalvaDia(); S.iem.H=S.iem.H||{dias:30}; S.iem.H.xs=null; iemHistCarrega(true); } render(); return; }
  if(a==='iem-hdias'){ S.iem.H=S.iem.H||{}; S.iem.H.dias=+b.dataset.v||30; S.iem.H.xs=null; render(); iemHistCarrega(true); return; }
  if(a==='iem-hxls'){ try{ await iemHistXls(); }catch(e){ erro(e); } } },true);
if(window.Painel&&Painel.emailContagem){ Painel.emailContagem.salvaDia=iemSalvaDia; Painel.emailContagem.historico=()=>(S.iem.H||{}).xs||null; }
(function(){ const s=document.createElement('style'); s.id='iem-css2'; s.textContent=`
.iem-hs{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}.iem-hh{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.iem-hres{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin-bottom:10px}.iem-hr{background:var(--ground);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}
.iem-hr small{color:var(--muted);font-size:11.5px}.iem-hr span{font-size:12.5px}.iem-ht th,.iem-ht td{text-align:right;white-space:nowrap}.iem-ht .l{text-align:left}.iem-hit{text-align:center!important;border-left:1px solid var(--line);max-width:200px;overflow:hidden;text-overflow:ellipsis}
.iem-hv{text-align:center!important;color:var(--muted)}`; document.head.appendChild(s); })();
