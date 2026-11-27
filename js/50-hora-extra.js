/* Painel Colafix · 50-hora-extra.js (24/10; 27/11/2026: lista por setor como o Quadro de pessoas, incluir nomes, PDF) — pedido 11: hora extra autorizada pelo Marcelo (sem pedido de ninguém).
   Visão do gestor › Hora extra (gxhe, logo depois de Pessoas hoje): o Marcelo escolhe o dia, as pessoas (da presença do Face ID
   ou digitando), o horário (das/até) ou as horas, e o motivo → horaextra/{id} {dia,nomes[],ini,fim,horas,mot,setor,porNome,por,em,removido}.
   Lista do mês com total de horas por pessoa; "Tirar" (dois toques) marca removido. Regra geral do banco (não mudou).
   RH: window.HoraExtra.doMes(m) e .horasDe(nome,m) — usados no Fechamento para a folha (coluna e aba "Hora extra"). */
"use strict";
S.he={dia:null,nomes:[],ini:'',fim:'',horas:'',mot:'',setor:'',q:'',cx:null,mes:null}; S.heLista=[]; let _heSub=false;
function heRH(){ try{ const p=acsP(); return !!(S.acs&&S.acs.dono)||!!(p&&((p.mods||[]).includes('rh')||(S.acs.doc&&(S.acs.doc.extras||[]).includes('rh')))); }catch(e){ return false; } }
setInterval(()=>{ try{ if(_heSub||!S.db||!S.acs||!S.acs.pronto) return; if(!(viewOk('gxhe')||heRH())) return; _heSub=true;
  inscrever('horaextra',()=>S.db.collection('horaextra').orderBy('dia','desc').limit(600),snap=>{ S.heLista=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); rerenderSeguro(); }); }catch(e){} },1500);
function heMin(s){ const m=String(s||'').match(/^(\d{1,2}):(\d{2})$/); return m?+m[1]*60+ +m[2]:null; }
function heHoras(x){ if(+x.horas>0) return +x.horas; const a=heMin(x.ini), b=heMin(x.fim); if(a==null||b==null) return 0; let d=b-a; if(d<0) d+=1440; return Math.round(d/60*100)/100; }
function heFH(h){ const m=Math.round((+h||0)*60); return Math.floor(m/60)+'h'+(m%60?String(m%60).padStart(2,'0'):''); }
function heKey(n){ return String(n||'').replace(/^\s*(motorista|terceiros?)\s*-\s*/i,'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z ]+/g,' ').trim().split(/\s+/).filter(w=>!['DA','DE','DO','DAS','DOS','E'].includes(w)); }
function heMesma(a,b){ const x=heKey(a), y=heKey(b); if(!x.length||!y.length) return false; if(x.join(' ')===y.join(' ')) return true; return x[0]===y[0]&&x[x.length-1]===y[y.length-1]; }
window.HoraExtra={ doMes(m){ return (S.heLista||[]).filter(x=>String(x.dia||'').slice(0,7)===m); },
  horasDe(nome,m){ return this.doMes(m).filter(x=>(x.nomes||[]).some(n=>heMesma(n,nome))).reduce((a,x)=>a+heHoras(x),0); },
  diasDe(nome,m){ return this.doMes(m).filter(x=>(x.nomes||[]).some(n=>heMesma(n,nome))); }, horas:heHoras, fh:heFH, pronto(){ return _heSub; } };
function heCands(d){ const doc=typeof gxpDoc==='function'?gxpDoc(d):null, s=new Map(); if(doc){ (doc.p||[]).forEach(p=>s.set(p.n,{n:p.n,s:p.s||'',veio:true})); (doc.f||[]).forEach(p=>{ if(!s.has(p.n)) s.set(p.n,{n:p.n,s:p.s||'',veio:false}); }); }
  return [...s.values()].sort((a,b)=>(b.veio-a.veio)||a.n.localeCompare(b.n,'pt-BR')); }
/* 27/11/2026 · "parecido com o quadro de pessoas": a lista não depende mais do Face ID do dia. As pessoas vêm por setor,
   na ordem do Quadro de pessoas (gxquadro/atual, menos quem está como "Sai"), depois o cadastro do RH (presenca/cadastro),
   o histórico do Face ID e quem já fez hora extra. Dá para marcar o setor inteiro, procurar e incluir qualquer nome digitado.
   PDF: de cada autorização e do mês (janela de impressão A4, com coluna para assinatura). */
function heIg(a,b){ return typeof qdMesma==='function'?qdMesma(a,b):heMesma(a,b); }
function heGrupos(dia){ const G=[], todos=[]; const ja=n=>todos.some(x=>heIg(x,n));
  const grp=nome=>{ nome=String(nome||'').trim()||'Sem setor'; const k=heKey(nome).join(' '); let g=G.find(x=>heKey(x.nome).join(' ')===k); if(!g){ g={nome,ps:[]}; G.push(g); } return g; };
  const poe=(n,s,g)=>{ n=String(n||'').trim(); if(!n||ja(n)) return; todos.push(n); (g||grp(s)).ps.push({n,s:String(s||'').trim()}); };
  try{ const D=S.qd&&S.qd.dados; if(D&&Array.isArray(D.cols)&&S.qd.lido) D.cols.forEach(c=>{ const g=grp(c.nome); (c.ps||[]).filter(p=>p&&p.st!=='sai').forEach(p=>poe(p.n,c.nome,g)); }); }catch(e){}
  try{ (S.qd&&S.qd.cad||[]).forEach(f=>poe(f.n,f.s)); }catch(e){}
  try{ if(typeof qdPessoasRH==='function') qdPessoasRH().forEach(p=>poe(p.n,p.s)); }catch(e){}
  heCands(dia).forEach(p=>poe(p.n,p.s));
  (S.heLista||[]).forEach(x=>(x.pessoas||(x.nomes||[]).map(n=>({n,s:''}))).forEach(p=>poe(p.n,p.s||'Já fizeram hora extra')));
  const doc=typeof gxpDoc==='function'?gxpDoc(dia):null, veio=n=>!doc?null:(doc.p||[]).some(p=>heIg(p.n,n))?true:false;
  G.forEach(g=>g.ps.forEach(p=>{ p.veio=veio(p.n); }));
  return {G:G.filter(g=>g.ps.length),doc}; }
function heSetorDe(n){ const E=S.he; if(E.set&&E.set[n]!=null) return E.set[n]; for(const g of heGrupos(E.dia).G){ if(g.ps.some(p=>p.n===n)) return g.nome; } return ''; }
function vGxHe(){ if(typeof gxpAssina==='function') gxpAssina(); try{ if(typeof qdAssina==='function') qdAssina(); }catch(e){}
  const E=S.he, h=hojeStr(); if(!E.dia) E.dia=h; if(!E.mes) E.mes=h.slice(0,7); E.set=E.set||{};
  const {G,doc}=heGrupos(E.dia), qq=heKey(E.q), hr=heHoras({ini:E.ini,fim:E.fim,horas:numIn(E.horas)||0}), qt=String(E.q||'').trim();
  const casa=p=>!qq.length||qq.every(w=>heKey(p.n).some(x=>x.startsWith(w)));
  const vis=G.map((g,i)=>({g,i,ps:g.ps.filter(casa)})).filter(o=>o.ps.length), nvis=vis.reduce((a,o)=>a+o.ps.length,0);
  const exato=qt.length>1&&G.some(g=>g.ps.some(p=>heKey(p.n).join(' ')===heKey(qt).join(' ')))||E.nomes.some(n=>heKey(n).join(' ')===heKey(qt).join(' '));
  const xs=window.HoraExtra.doMes(E.mes).sort((a,b)=>String(b.dia).localeCompare(String(a.dia))||String(b.em).localeCompare(String(a.em)));
  const tot={}; xs.forEach(x=>(x.nomes||[]).forEach(n=>{ tot[n]=(tot[n]||0)+heHoras(x); }));
  const chip=p=>{ const on=E.nomes.includes(p.n); return `<button class="he-ch ${on?'on':''} ${p.veio===false?'fora':''}" data-act="he-tg" data-v="${esc(p.n)}" data-s="${esc(p.s||'')}" aria-pressed="${on}"><b>${esc(p.n)}</b>${p.veio===true?'<small>veio</small>':p.veio===false?'<small>não veio</small>':''}</button>`; };
  const quadro=vis.length?`<div class="he-bd">${vis.map(({g,i,ps})=>{ const n=ps.filter(p=>E.nomes.includes(p.n)).length, todos=n===ps.length;
      return `<div class="he-col"><div class="he-colh"><b>${esc(g.nome)}</b><span>${n?n+' de ':''}${ps.length}</span><button class="lnk" data-act="he-all" data-g="${i}">${todos?'Desmarcar':'Todos'}</button></div><div class="he-cps">${ps.map(chip).join('')}</div></div>`; }).join('')}</div>`
    :`<div class="he-vz">${G.length?'Ninguém com esse nome na lista.':'A lista aparece quando o Quadro de pessoas ou o RH tiver nomes.'} Digite o nome e toque em <b>+ Incluir</b>.</div>`;
  const form=`<section class="card he-f"><div class="eyebrow">AUTORIZAR HORA EXTRA</div>
    <div class="he-g"><label><span>Dia</span><input type="date" class="txt" id="he-dia" value="${esc(E.dia)}"></label>
      <label><span>Das</span><input class="txt he-h" id="he-ini" inputmode="numeric" maxlength="5" placeholder="17:30" value="${esc(E.ini)}"></label>
      <label><span>Até</span><input class="txt he-h" id="he-fim" inputmode="numeric" maxlength="5" placeholder="20:00" value="${esc(E.fim)}"></label>
      <label><span>ou horas</span><input class="txt he-h" id="he-horas" inputmode="decimal" maxlength="5" placeholder="2,5" value="${esc(E.horas)}"></label>
      <label class="he-w"><span>Motivo</span><input class="txt" id="he-mot" maxlength="120" placeholder="Ex.: terminar a ordem 5012 da Linha 1" value="${esc(E.mot)}"></label>
      <label class="he-w"><span>Linha ou setor <small>(opcional)</small></span><input class="txt" id="he-setor" maxlength="40" list="he-ls" value="${esc(E.setor)}"><datalist id="he-ls">${linhasOrd().map(l=>`<option value="${esc(l)}">`).join('')}</datalist></label></div>
    <div class="he-p"><div class="he-ph"><b>Quem vai fazer</b><input class="txt" id="he-q" placeholder="Procurar ou digitar um nome" value="${esc(E.q)}" autocomplete="off" enterkeyhint="done">
        <button class="btn sec" id="he-add-b" data-act="he-add" ${qt.length>1&&!exato?'':'hidden'}>+ Incluir "<span>${esc(qt)}</span>"</button></div>
      <div class="he-lista"><div class="he-lh2"><b>Lista da hora extra · ${E.nomes.length} pessoa${E.nomes.length===1?'':'s'}</b>${E.nomes.length?'<button class="lnk" data-act="he-limpa">Limpar</button>':''}</div>
        ${E.nomes.length?`<div class="he-sel">${E.nomes.map(n=>{ const st=heSetorDe(n); return `<button class="he-ch on" data-act="he-tg" data-v="${esc(n)}" title="Tirar da lista">${esc(n)}${st?` <small>${esc(st)}</small>`:''} <i aria-hidden="true">×</i></button>`; }).join('')}</div>`:'<div class="he-vz" style="margin:6px 0 0">Toque nos nomes abaixo, ou em <b>Todos</b> para o setor inteiro.</div>'}</div>
      <div class="he-dica">${doc?'Mostra quem veio pelo Face ID neste dia.':'Pode escolher qualquer pessoa, mesmo sem o Face ID do dia.'}${nvis?'':''}</div>
      ${quadro}</div>
    <div class="he-ac"><span id="he-res">${E.nomes.length&&hr?`${E.nomes.length} pessoa${E.nomes.length>1?'s':''} × ${heFH(hr)} = ${heFH(E.nomes.length*hr)}`:'Escolha as pessoas e o horário'}</span><button class="btn" data-act="he-ok" ${E.salv?'disabled':''}>${E.salv?'Gravando…':'Autorizar hora extra'}</button></div></section>`;
  const lista=`<section class="card he-l"><div class="he-lh"><div><div class="eyebrow">AUTORIZADAS NO MÊS</div><h2 style="margin:2px 0 0">${xs.length} autorização${xs.length===1?'':'ões'} · ${heFH(Object.values(tot).reduce((a,b)=>a+b,0))} no total</h2></div><div class="he-lb"><input type="month" class="txt" id="he-mes" value="${esc(E.mes)}" style="width:auto">${xs.length?'<button class="btn sec" data-act="he-pdfm">PDF do mês</button>':''}</div></div>
    ${Object.keys(tot).length?`<div class="he-tot">${Object.entries(tot).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<span><b>${esc(n)}</b> ${heFH(v)}</span>`).join('')}</div>`:''}
    ${xs.length?xs.map(x=>`<div class="he-r"><div><b>${esc(dm(x.dia))} · ${x.ini&&x.fim?esc(x.ini)+' às '+esc(x.fim):heFH(heHoras(x))}${x.ini&&x.fim?' ('+heFH(heHoras(x))+')':''} · ${(x.nomes||[]).length} pessoa${(x.nomes||[]).length===1?'':'s'}</b><span>${esc((x.nomes||[]).join(', '))}</span><small>${esc(x.mot||'')}${x.setor?' · '+esc(x.setor):''} · autorizado por ${esc(x.porNome||'')}</small></div><div class="he-ra"><button class="btn sec" data-act="he-pdf" data-id="${esc(x._id)}">PDF</button><button class="lnk" data-act="he-x" data-id="${esc(x._id)}" style="color:var(--crit-ink,#93413F)">${E.cx===x._id?'Confirmar: tirar':'Tirar'}</button></div></div>`).join(''):'<div class="empty">Nenhuma hora extra autorizada neste mês.</div>'}</section>`;
  return `${banner()}${gxCab('VISÃO DO GESTOR','Hora extra')}<div class="sub" style="margin:-6px 0 14px">Você autoriza direto, sem pedido. O RH vê no fechamento do mês para a folha.</div><div class="he-gr">${form}${lista}</div>`; }
/* PDF (janela de impressão: "Salvar como PDF") */
function hePdf(xs,titulo){ const w=window.open('','_blank'); if(!w){ toast('O navegador bloqueou a janela do PDF. Libere pop-ups para o painel.'); return; }
  let logo=''; try{ logo=(document.querySelector('.brand img')||{}).src||''; }catch(e){}
  xs=xs.slice().sort((a,b)=>String(a.dia).localeCompare(String(b.dia))||String(a.ini).localeCompare(String(b.ini)));
  const np=xs.reduce((a,x)=>a+(x.nomes||[]).length,0), th=xs.reduce((a,x)=>a+heHoras(x)*(x.nomes||[]).length,0);
  const bloco=x=>{ const ps=x.pessoas&&x.pessoas.length?x.pessoas:(x.nomes||[]).map(n=>({n,s:''}));
    return `<section><h2>${esc(new Date(x.dia+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}))} · ${x.ini&&x.fim?esc(x.ini)+' às '+esc(x.fim)+' ('+heFH(heHoras(x))+')':heFH(heHoras(x))}</h2>
      <p>${esc(x.mot||'')}${x.setor?' · '+esc(x.setor):''} · autorizado por ${esc(x.porNome||'')}</p>
      <table><thead><tr><th class="n">#</th><th>Nome</th><th>Setor</th><th class="h">Horas</th><th class="a">Assinatura</th></tr></thead><tbody>${ps.map((p,i)=>`<tr><td class="n">${i+1}</td><td><b>${esc(p.n)}</b></td><td>${esc(p.s||'')}</td><td class="h">${heFH(heHoras(x))}</td><td class="a"></td></tr>`).join('')}</tbody></table></section>`; };
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font:10.5pt Arial,Helvetica,sans-serif;color:#143F54;margin:0}
    .t{display:flex;align-items:center;gap:14px;border-bottom:2px solid #143F54;padding-bottom:6px;margin-bottom:10px}.t img{height:32px}.t h1{font-size:16pt;margin:0}.t p{margin:2px 0 0;color:#5E6E77;font-size:9pt}
    section{break-inside:avoid;margin:0 0 7mm}h2{font-size:11.5pt;margin:0}h2::first-letter{text-transform:uppercase}section>p{margin:2px 0 4px;color:#5E6E77;font-size:9pt}
    table{width:100%;border-collapse:collapse}th{text-align:left;font-size:8.5pt;color:#5E6E77;border-bottom:1.5px solid #143F54;padding:3px 4px}td{border-bottom:1px solid #D5DDE3;padding:6px 4px;vertical-align:bottom}
    .n{width:7mm;color:#5E6E77}.h{width:16mm;text-align:right}.a{width:55mm}.r{margin-top:10mm;display:flex;justify-content:space-between;gap:20mm;font-size:9pt;color:#5E6E77}.r div{flex:1;border-top:1px solid #143F54;padding-top:3px}</style></head><body>
    <div class="t">${logo?`<img src="${logo}" alt="Colafix">`:''}<div><h1>${esc(titulo)}</h1><p>${xs.length} autorização${xs.length===1?'':'ões'} · ${np} pessoa${np===1?'':'s'} · ${heFH(th)} no total · impresso em ${new Date().toLocaleDateString('pt-BR')}</p></div></div>
    ${xs.map(bloco).join('')}<div class="r"><div>Gestor</div><div>RH</div></div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`); w.document.close(); }
Object.assign(VIEWS,{gxhe:{nome:'Hora extra',ic:'relogio',mob:'Hora extra'}}); CRUMB.gxhe='Hora extra';
S.extViews=S.extViews||{}; S.extViews.gxhe=vGxHe;
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxhe')){ const i=M.views.indexOf('gxpres'); M.views.splice(i>=0?i+1:1,0,'gxhe'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxhe')){ const i=GXN_TELAS.indexOf('gxpres'); GXN_TELAS.splice(i>=0?i+1:2,0,'gxhe'); }
function heLe(){ const g=id=>{ const x=document.getElementById(id); return x?x.value:null; }, E=S.he; [['he-dia','dia'],['he-ini','ini'],['he-fim','fim'],['he-horas','horas'],['he-mot','mot'],['he-setor','setor'],['he-q','q']].forEach(([i,k])=>{ const v=g(i); if(v!=null) E[k]=v; }); }
function heInclui(){ const E=S.he, v=String(E.q||'').trim().replace(/\s+/g,' '); if(v.length<2) return toast('Digite o nome da pessoa.');
  const ach=heGrupos(E.dia).G.flatMap(g=>g.ps.map(p=>Object.assign({g:g.nome},p))).find(p=>heKey(p.n).join(' ')===heKey(v).join(' '));
  const n=ach?ach.n:v; E.set=E.set||{}; if(!E.nomes.includes(n)){ E.nomes.push(n); E.set[n]=ach?ach.g:''; } E.q=''; render(); const i=document.getElementById('he-q'); if(i) i.focus(); toast(n+' está na lista.'); }
document.addEventListener('keydown',ev=>{ if(ev.key!=='Enter'||!ev.target||ev.target.id!=='he-q') return; ev.preventDefault(); heLe(); heInclui(); });
function heHoraFmt(i){ let d=i.value.replace(/\D/g,'').slice(0,4); if(d.length>=3) d=d.slice(0,d.length-2)+':'+d.slice(-2); i.value=d; }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.id||!/^he-/.test(t.id)) return; if(t.id==='he-ini'||t.id==='he-fim') heHoraFmt(t); heLe();
  if(/^he-(ini|fim|horas)$/.test(t.id)){ const E=S.he, hr=heHoras({ini:E.ini,fim:E.fim,horas:numIn(E.horas)||0}), r=document.getElementById('he-res'); if(r) r.textContent=E.nomes.length&&hr?`${E.nomes.length} pessoa${E.nomes.length>1?'s':''} × ${heFH(hr)} = ${heFH(E.nomes.length*hr)}`:'Escolha as pessoas e o horário'; }
  if(t.id==='he-q'){ const p=t.selectionStart; render(); const n=document.getElementById('he-q'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.id) return; if(t.id==='he-dia'){ S.he.dia=t.value||hojeStr(); render(); } if(t.id==='he-mes'){ S.he.mes=t.value||hojeStr().slice(0,7); render(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="he-"]'); if(!b) return; const a=b.dataset.act, E=S.he; heLe();
  E.set=E.set||{};
  if(a==='he-tg'){ const v=b.dataset.v; if(E.nomes.includes(v)) E.nomes=E.nomes.filter(x=>x!==v); else { E.nomes=E.nomes.concat([v]); if(b.dataset.s!=null) E.set[v]=b.dataset.s; } render(); return; }
  if(a==='he-add'){ heInclui(); return; }
  if(a==='he-limpa'){ E.nomes=[]; render(); return; }
  if(a==='he-all'){ const g=heGrupos(E.dia).G[+b.dataset.g]; if(!g) return; const qq=heKey(E.q), ps=g.ps.filter(p=>!qq.length||qq.every(w=>heKey(p.n).some(x=>x.startsWith(w)))).map(p=>p.n);
    if(ps.every(n=>E.nomes.includes(n))) E.nomes=E.nomes.filter(n=>!ps.includes(n)); else ps.forEach(n=>{ if(!E.nomes.includes(n)){ E.nomes.push(n); E.set[n]=g.nome; } }); render(); return; }
  if(a==='he-pdf'){ const x=(S.heLista||[]).find(o=>o._id===b.dataset.id); if(x) hePdf([x],'Hora extra · '+dm(x.dia)); return; }
  if(a==='he-pdfm'){ const xs=window.HoraExtra.doMes(E.mes); if(!xs.length) return toast('Nenhuma hora extra neste mês.'); const [y,m]=E.mes.split('-'); hePdf(xs,'Hora extra · '+new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})); return; }
  if(a==='he-x'){ const id=b.dataset.id; if(E.cx!==id){ E.cx=id; render(); return; } E.cx=null; try{ await S.db.doc('horaextra/'+id).update({removido:true,removidoEm:new Date().toISOString(),removidoPor:S.uid}); S.heLista=S.heLista.filter(x=>x._id!==id); toast('Hora extra tirada.'); }catch(e){ erro(e); } render(); return; }
  if(a==='he-ok'){ if(!E.nomes.length) return toast('Escolha quem vai fazer a hora extra.'); const ini=heMin(E.ini), fim=heMin(E.fim), hs=numIn(E.horas)||0;
    if(!(hs>0)&&(ini==null||fim==null)) return toast('Diga o horário (das/até) ou quantas horas.'); if(!String(E.mot||'').trim()) return toast('Escreva o motivo.');
    const d={dia:E.dia||hojeStr(),nomes:E.nomes.slice(),pessoas:E.nomes.map(n=>({n,s:heSetorDe(n)||''})),ini:ini!=null&&fim!=null?E.ini:'',fim:ini!=null&&fim!=null?E.fim:'',horas:hs>0&&(ini==null||fim==null)?hs:0,mot:String(E.mot).trim(),setor:String(E.setor||'').trim(),porNome:(S.nomes&&S.nomes[S.uid])||'',por:S.uid||null,em:new Date().toISOString()};
    E.salv=true; render(); const id='he'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    try{ await S.db.doc('horaextra/'+id).set(d); S.heLista=[Object.assign({_id:id},d)].concat(S.heLista.filter(x=>x._id!==id)); Object.assign(E,{nomes:[],set:{},ini:'',fim:'',horas:'',mot:'',q:'',salv:false,mes:d.dia.slice(0,7)}); toast('Hora extra autorizada: '+d.nomes.length+' pessoa'+(d.nomes.length>1?'s':'')+' em '+dm(d.dia)+'. Toque em PDF para imprimir a lista.'); }
    catch(e){ E.salv=false; erro(e); } render(); return; } });
document.head.insertAdjacentHTML('beforeend',`<style id="he-css">
.he-gr{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(320px,1fr);gap:18px;align-items:start}@media(max-width:1200px){.he-gr{grid-template-columns:1fr}}
.he-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}.he-g label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}.he-g .he-w{grid-column:span 2}.he-g small{font-weight:400;color:var(--muted)}
@media(max-width:640px){.he-g{grid-template-columns:1fr 1fr}.he-g .he-w{grid-column:span 2}}
.he-p{margin-top:16px}.he-ph{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.he-ph input{flex:1 1 220px}.he-ph [hidden]{display:none}
.he-lista{margin-top:10px;background:var(--surface-2,#F2F5F7);border-radius:12px;padding:10px 12px}.he-lh2{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px}
.he-sel{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.he-sel .he-ch i{font-style:normal;opacity:.8;margin-left:2px}.he-sel .he-ch small{display:inline;color:#D6E3EA}
.he-dica{margin:10px 0 6px;font-size:12px;color:var(--muted)}
.he-bd{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;max-height:460px;overflow:auto;padding:2px}
.he-col{border:1px solid var(--line,#D5DDE3);border-radius:12px;background:var(--surface,#fff);display:flex;flex-direction:column;min-width:0}
.he-colh{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line,#E3E8EC);border-top:3px solid var(--teal-strong,#143F54);border-radius:12px 12px 0 0}.he-colh b{flex:1;font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.he-colh span{font-size:12px;color:var(--muted)}.he-colh .lnk{font-size:12px}
.he-cps{display:flex;flex-direction:column;gap:4px;padding:8px}
.he-ch{border:1px solid var(--line,#D5DDE3);background:var(--surface,#fff);border-radius:9px;padding:6px 9px;font:inherit;font-size:13px;cursor:pointer;text-align:left;color:inherit;display:flex;align-items:baseline;gap:6px;justify-content:space-between}.he-ch b{font-weight:600;min-width:0}.he-ch small{color:var(--muted);font-size:11px;white-space:nowrap}
.he-ch.on{background:var(--teal-strong,#143F54);color:#fff;border-color:var(--teal-strong,#143F54)}.he-ch.on small{color:#D6E3EA}.he-ch.fora{opacity:.65}
.he-vz{color:var(--muted);font-size:13px;padding:6px 0}
.he-ac{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap}.he-ac span{color:var(--muted)}
.he-lh{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap}.he-lb{display:flex;gap:8px;align-items:center}.he-tot{display:flex;flex-wrap:wrap;gap:6px 14px;margin:10px 0;font-size:13px}
.he-r{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line,#E3E8EC)}.he-r b,.he-r span,.he-r small{display:block}.he-r span{font-size:13px;margin-top:2px}.he-r small{color:var(--muted);font-size:12px}.he-ra{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.he-ra .btn{padding:4px 12px;font-size:13px}
</style>`);
