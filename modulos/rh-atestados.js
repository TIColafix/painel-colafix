/* ===================== RH · ATESTADOS E FALTAS (pedido de 30/10) =====================
   O RH registra atestado médico, declaração de comparecimento (horas), acompanhamento de familiar, falta legal, falta
   justificada e falta sem justificativa — com foto/PDF do documento (OneDrive ou arquivos do painel). Não pede CID
   (dado de saúde: LGPD). Dados em rh/dados/atestados/{id} (regra rh/**: só a dona e quem tem o RH):
     {funcId, nome, cpf, setor, empresa, tipo, ini, dias, fim, hIni, hFim, horas, abona, mot, arq:{url,nome}, por, em, removido}
   O que muda sozinho com o registro: Pessoas na empresa ("não vieram" mostra o motivo), Pontualidade (o dia coberto não é
   falta sem registro, nem atraso/saída antes), Almoço (veio e não almoçou no dia = justificado "Atestado"), Fechamento
   para a folha (colunas e aba própria) e a história da pessoa. Tela: Funcionários › Atestados e faltas (rh.js, R.fview='atest').
   window.RHAtest = {render(c), novo(c,funcId), cobre({funcId,cpf},dia), resumo(funcId,ini,fim), daPessoa(funcId), lista(), TIPOS}.
   Relatório no padrão (RHRel): PDF e Excel com os filtros da tela. Prefixo `rat`. */
(function(){
  const COL='rh/dados/atestados';
  /* tipo: [chave, nome, unidade (dias|horas), abona por padrão, cor] */
  const TIPOS=[['atestado','Atestado médico','dias',true,'teal'],['comparecimento','Declaração de comparecimento','horas',true,'pet'],['acompanhante','Acompanhamento de familiar','dias',true,'cinza'],
    ['legal','Falta legal (casamento, luto, doação…)','dias',true,'cinza'],['justificada','Falta justificada (sem documento)','dias',true,'warn'],['injustificada','Falta sem justificativa','dias',false,'crit']];
  const TIPO=k=>TIPOS.find(t=>t[0]===k)||TIPOS[0];
  const A={xs:[],lido:false,sub:false,f:null,cx:null,salv:false,rec:[],recLido:false,lk:false,abrindo:'',fil:{per:'mes',mes:'',de:'',ate:'',tipo:'',setor:'',q:''}};
  let C=null;
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const dig=s=>String(s||'').replace(/\D/g,'');
  const br=d=>d&&/^\d{4}-\d{2}-\d{2}/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'';
  const addD=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
  const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const mesNome=m=>MESES[+m.slice(5,7)-1]+' de '+m.slice(0,4);
  const mesMais=(m,n)=>{ const d=new Date(+m.slice(0,4),+m.slice(5,7)-1+n,1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };
  const hm=s=>{ const m=String(s||'').match(/^(\d{1,2}):(\d{2})/); return m?+m[1]*60+ +m[2]:null; };
  const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const fimDe=x=>TIPO(x.tipo)[2]==='horas'?x.ini:addD(x.ini,Math.max(1,parseInt(x.dias,10)||1)-1);
  const horasDe=x=>{ const a=hm(x.hIni), b=hm(x.hFim); return a!=null&&b!=null&&b>a?Math.round((b-a)/6)/10:(+x.horas||0); };
  const durTxt=x=>TIPO(x.tipo)[2]==='horas'?(x.hIni&&x.hFim?x.hIni+' às '+x.hFim+' ('+String(horasDe(x)).replace('.',',')+' h)':String(horasDe(x)).replace('.',',')+' h'):(+x.dias||1)+' dia'+((+x.dias||1)>1?'s':'');
  const perTxt=x=>TIPO(x.tipo)[2]==='horas'||!(+x.dias>1)?br(x.ini):br(x.ini).slice(0,5)+' a '+br(fimDe(x));
  function assina(c){ if(A.sub) return; A.sub=true; c.P.inscrever('rh-atest',()=>c.P.db().collection(COL).orderBy('ini','desc').limit(800),s=>{ A.xs=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); A.lido=true; c.P.rerender(); }); }
  const vivos=()=>A.xs.filter(x=>!x.removido);
  /* o dia está coberto por um registro da pessoa? (pelo cadastro ou pelo CPF do Face ID) */
  function cobre(p,d){ const cp=dig(p&&p.cpf).padStart(11,'0'); return vivos().find(x=>((p.funcId&&x.funcId===p.funcId)||(dig(x.cpf)&&dig(x.cpf).padStart(11,'0')===cp))&&x.ini<=d&&fimDe(x)>=d)||null; }
  function resumo(funcId,ini,fim){ const r={n:0,diasAt:0,faltJ:0,faltSJ:0,horas:0,xs:[]};
    vivos().filter(x=>x.funcId===funcId&&x.ini<=fim&&fimDe(x)>=ini).forEach(x=>{ r.n++; r.xs.push(x); const t=TIPO(x.tipo);
      if(t[2]==='horas'){ r.horas+=horasDe(x); return; } const a=x.ini>ini?x.ini:ini, b=fimDe(x)<fim?fimDe(x):fim, n=Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5)+1;
      if(x.tipo==='atestado'||x.tipo==='acompanhante') r.diasAt+=n; else if(x.abona===false||x.tipo==='injustificada') r.faltSJ+=n; else r.faltJ+=n; });
    r.horas=Math.round(r.horas*10)/10; return r; }
  const daPessoa=funcId=>vivos().filter(x=>x.funcId===funcId).sort((a,b)=>String(b.ini).localeCompare(String(a.ini)));
  /* ---------- filtros e dados da tela ---------- */
  function per(c){ const f=A.fil, h=c.P.hojeStr(), m=f.mes||h.slice(0,7);
    if(f.per==='datas') return {de:f.de||h.slice(0,8)+'01',ate:f.ate||h,txt:'de '+br(f.de||h.slice(0,8)+'01')+' a '+br(f.ate||h)};
    if(f.per==='90') return {de:addD(h,-89),ate:h,txt:'últimos 90 dias'};
    if(f.per==='ano') return {de:h.slice(0,4)+'-01-01',ate:h.slice(0,4)+'-12-31',txt:'ano de '+h.slice(0,4)};
    const fimM=addD(mesMais(m,1)+'-01',-1); return {de:m+'-01',ate:fimM,txt:mesNome(m)}; }
  function dados(c){ const P0=per(c), f=A.fil, ws=norm(f.q).split(' ').filter(Boolean), func=id=>(c.R.func||[]).find(y=>y._id===id)||null;
    const xs=vivos().filter(x=>x.ini<=P0.ate&&fimDe(x)>=P0.de).filter(x=>!f.tipo||(f.tipo==='faltas'?['justificada','injustificada','legal'].includes(x.tipo):x.tipo===f.tipo))
      .filter(x=>{ const fu=func(x.funcId), st=(fu&&fu.setor)||x.setor||''; return (!f.setor||(f.setor==='-'?!st:st===f.setor))&&(!ws.length||ws.every(w=>norm([x.nome,st,TIPO(x.tipo)[1],x.mot].join(' ')).includes(w))); })
      .sort((a,b)=>String(b.ini).localeCompare(String(a.ini))||String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    const dentro=x=>{ if(TIPO(x.tipo)[2]==='horas') return 0; const a=x.ini>P0.de?x.ini:P0.de, b=fimDe(x)<P0.ate?fimDe(x):P0.ate; return Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5)+1; };
    const diasAt=xs.filter(x=>x.tipo==='atestado'||x.tipo==='acompanhante').reduce((a,x)=>a+dentro(x),0), faltSJ=xs.filter(x=>x.tipo==='injustificada'||x.abona===false).reduce((a,x)=>a+dentro(x),0);
    const horas=Math.round(xs.filter(x=>TIPO(x.tipo)[2]==='horas').reduce((a,x)=>a+horasDe(x),0)*10)/10;
    const by=new Map(); xs.forEach(x=>{ const k=x.funcId||norm(x.nome); if(!by.has(k)) by.set(k,{nome:x.nome,setor:x.setor||'',dias:0,n:0,h:0}); const g=by.get(k); g.n++; g.dias+=dentro(x); g.h+=TIPO(x.tipo)[2]==='horas'?horasDe(x):0; });
    const rank=[...by.values()].sort((a,b)=>b.dias-a.dias||b.n-a.n).slice(0,8);
    const filtros=[f.tipo&&'Tipo: '+(f.tipo==='faltas'?'só faltas':TIPO(f.tipo)[1]),f.setor&&'Setor: '+(f.setor==='-'?'sem setor':f.setor),f.q&&'Busca: '+f.q].filter(Boolean);
    return {P0,xs,diasAt,faltSJ,horas,pes:by.size,rank,dentro,filtros}; }
  /* ---------- tela ---------- */
  function render(c){ C=c; assina(c); const e=c.esc, D=dados(c), f=A.fil, h=c.P.hojeStr(), m=f.mes||h.slice(0,7);
    const sets=[...new Set((c.R.func||[]).map(x=>x.setor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const sel=(k,l,ops)=>`<label><span>${l}</span><select class="txt" data-rat-f="${k}">${ops.map(([v,t])=>`<option value="${e(v)}" ${f[k]===v?'selected':''}>${e(t)}</option>`).join('')}</select></label>`;
    const linha=x=>{ const t=TIPO(x.tipo), fu=(c.R.func||[]).find(y=>y._id===x.funcId), st=(fu&&fu.setor)||x.setor||'';
      return `<tr><td><b>${e(c.titulo(x.nome||''))}</b><small>${e(st||'sem setor')}</small></td><td><span class="rat-tp ${t[4]}">${e(t[1])}</span>${x.abona===false&&x.tipo!=='injustificada'?'<small>não abona</small>':''}</td>
        <td class="num">${e(perTxt(x))}<small>${e(durTxt(x))}</small></td><td>${e(x.mot||'—')}</td>
        <td>${x.arq&&x.arq.url?`<a class="lnk" href="${e(x.arq.url)}" target="_blank" rel="noopener">Ver documento</a>`:'<small>sem arquivo</small>'}</td>
        <td class="rat-acs"><button class="lnk" data-act="rat-ed" data-id="${e(x._id)}">Editar</button><button class="lnk rat-del" data-act="rat-del" data-id="${e(x._id)}">${A.cx===x._id?'Confirmar: apagar':'Apagar'}</button></td></tr>`; };
    return `<section class="card rat"><div class="rat-tb">${c.semTitulo?'<div></div>':'<div><h2 style="margin:0">Atestados e faltas</h2><div class="sub" style="margin:2px 0 0">Entra sozinho no fechamento da folha, na presença e no almoço.</div></div>'}
        <span class="rat-sp"></span>${window.RHRel?RHRel.botoes('rat-pdf','rat-xls'):''}<button class="btn sec" data-act="rat-rlink" aria-expanded="${A.lk}">Link para os funcionários</button><button class="btn" data-act="rat-novo">${c.P.ic?c.P.ic('mais',16,2.4):''}Registrar</button></div>${A.lk?linkHtml(c):''}${recHtml(c)}
      <div class="rr-fil">${sel('per','Período',[['mes','Mês'],['90','Últimos 90 dias'],['ano','Este ano'],['datas','Escolher datas']])}
        ${f.per==='mes'?`<label><span>Mês</span><span class="rat-mes"><button class="btn sec rh-sm" data-act="rat-mes" data-v="-1" aria-label="Mês anterior">‹</button><b>${e(mesNome(m))}</b><button class="btn sec rh-sm" data-act="rat-mes" data-v="1" aria-label="Próximo mês">›</button></span></label>`:''}
        ${f.per==='datas'?`<label><span>De</span><input class="txt" type="date" data-rat-f="de" value="${e(f.de)}"></label><label><span>Até</span><input class="txt" type="date" data-rat-f="ate" value="${e(f.ate)}"></label>`:''}
        ${sel('tipo','Tipo',[['','Todos'],['faltas','Só faltas']].concat(TIPOS.map(t=>[t[0],t[1]])))}${sel('setor','Setor',[['','Todos']].concat(sets.map(x=>[x,x]),[['-','Sem setor']]))}
        <label><span>Pessoa ou motivo</span><input class="txt" type="search" id="rat-q" value="${e(f.q)}" placeholder="Buscar"></label></div>
      ${window.RHRel?RHRel.barra({chips:[{t:'Tipo',v:f.tipo&&(f.tipo==='faltas'?'só faltas':TIPO(f.tipo)[1])},{t:'Setor',v:f.setor&&(f.setor==='-'?'sem setor':f.setor)},{t:'Busca',v:f.q}],limpar:'rat-limpa'}):''}
      <div class="rat-k"><div><span>Registros</span><b>${D.xs.length}</b><small>${e(D.P0.txt)}</small></div><div><span>Dias de atestado</span><b>${D.diasAt}</b><small>médico e acompanhamento</small></div>
        <div class="${D.faltSJ?'crit':''}"><span>Faltas sem justificativa</span><b>${D.faltSJ}</b><small>dias que podem ser descontados</small></div><div><span>Horas de comparecimento</span><b>${String(D.horas).replace('.',',')}</b><small>declarações de horas</small></div><div><span>Pessoas</span><b>${D.pes}</b><small>com algum registro</small></div></div>
      ${D.xs.length?`<div class="rh-tw"><table class="rh-t rat-t"><thead><tr><th>Pessoa</th><th>Tipo</th><th>Quando</th><th>Motivo</th><th>Documento</th><th></th></tr></thead><tbody>${D.xs.map(linha).join('')}</tbody></table></div>`
        :`<div class="rat-vz">${!A.lido?'Carregando…':`<b>${f.tipo||f.setor||f.q?'Nenhum registro com estes filtros.':'Nenhum atestado ou falta '+(f.per==='mes'?'em '+e(mesNome(m)):'no período')+'.'}</b><span>Quando alguém trouxer atestado ou faltar, toque em "Registrar". A presença, o almoço e o fechamento da folha já passam a considerar.</span><button class="btn" data-act="rat-novo">Registrar atestado ou falta</button>`}</div>`}
      ${D.rank.length>1?`<div class="label" style="margin-top:14px">QUEM MAIS SE AUSENTOU NO PERÍODO</div><div class="rat-rk">${D.rank.map(g=>`<div><b>${e(c.titulo(g.nome))}</b><span>${g.dias?g.dias+' dia'+(g.dias>1?'s':''):''}${g.dias&&g.h?' · ':''}${g.h?String(Math.round(g.h*10)/10).replace('.',',')+' h':''}</span><small>${g.n} registro${g.n>1?'s':''}</small></div>`).join('')}</div>`:''}
      </section>${A.f?form(c):''}`; }
  /* ---------- formulário ---------- */
  function pessoas(c,q){ const n=norm(q); if(n.length<2) return []; const ws=n.split(' ');
    return (c.R.func||[]).filter(f=>f&&f.nome&&!f.removido&&ws.every(w=>norm(f.nome).includes(w))).sort((a,b)=>((a.status==='Desligado')-(b.status==='Desligado'))||String(a.nome).localeCompare(String(b.nome),'pt-BR')).slice(0,7); }
  function form(c){ const F=A.f, e=c.esc, t=TIPO(F.tipo), fu=F.funcId&&(c.R.func||[]).find(y=>y._id===F.funcId);
    const sug=!F.funcId?pessoas(c,F.nome):[];
    return `<div class="dbmodal" data-rat-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Registrar atestado ou falta" style="max-width:720px"><div class="rat-fm">
      <div class="head" style="align-items:baseline;margin:0"><h2 style="margin:0">${F._id?'Editar registro':'Registrar atestado ou falta'}</h2><button class="lnk" data-act="rat-fx">Fechar</button></div>
      <label class="rat-w"><span>Pessoa</span>${fu?`<span class="rat-sel"><b>${e(c.titulo(fu.nome))}</b> <small>${e([fu.setor,fu.funcao].filter(Boolean).join(' · '))}</small> <button class="lnk" data-act="rat-troca">trocar</button></span>`:`<input class="txt" id="rat-pn" autocomplete="off" value="${e(F.nome||'')}" placeholder="Digite o nome">`}</label>
      ${sug.length?`<div class="rat-sug">${sug.map(f=>`<button type="button" data-act="rat-pick" data-id="${e(f._id)}"><b>${e(c.titulo(f.nome))}</b><small>${e([f.setor,f.funcao,f.status==='Desligado'?'desligado':''].filter(Boolean).join(' · '))}</small></button>`).join('')}</div>`:''}
      <div class="rat-w"><span>O que é</span><div class="rat-tps" role="group" aria-label="Tipo">${TIPOS.map(x=>`<button type="button" class="${F.tipo===x[0]?'on':''}" aria-pressed="${F.tipo===x[0]}" data-act="rat-tipo" data-v="${x[0]}">${e(x[1])}</button>`).join('')}</div></div>
      <div class="rat-2">${t[2]==='horas'?`<label class="rat-w"><span>Dia</span><input class="txt" type="date" id="rat-ini" value="${e(F.ini||'')}"></label><label class="rat-w"><span>Das</span><input class="txt" type="time" id="rat-hi" value="${e(F.hIni||'')}"></label><label class="rat-w"><span>Até</span><input class="txt" type="time" id="rat-hf" value="${e(F.hFim||'')}"></label>`
        :`<label class="rat-w"><span>Primeiro dia</span><input class="txt" type="date" id="rat-ini" value="${e(F.ini||'')}"></label><label class="rat-w"><span>Quantos dias</span><input class="txt" type="number" min="1" max="365" id="rat-dias" value="${e(String(F.dias||1))}"></label><div class="rat-w"><span>Volta</span><b class="rat-volta" id="rat-volta">${F.ini?br(addD(F.ini,Math.max(1,parseInt(F.dias,10)||1))):'—'}</b></div>`}</div>
      <div class="rat-w"><span>Abona (não desconta)?</span><div class="rat-yn" role="group"><button type="button" class="${F.abona!==false?'on':''}" data-act="rat-ab" data-v="1">Sim</button><button type="button" class="${F.abona===false?'on nao':''}" data-act="rat-ab" data-v="0">Não</button></div></div>
      <label class="rat-w"><span>Motivo ou observação <small>(opcional · não precisa do CID)</small></span><input class="txt" id="rat-mot" maxlength="160" value="${e(F.mot||'')}" placeholder="Ex.: consulta, cirurgia do filho, enterro do avô"></label>
      <label class="rat-w"><span>Foto ou PDF do documento <small>(opcional)</small></span>${F.arq&&F.arq.url&&!F.file?`<span class="rat-sel"><a class="lnk" href="${e(F.arq.url)}" target="_blank" rel="noopener">${e(F.arq.nome||'documento')}</a> <small>já guardado · escolha outro para trocar</small></span>`:''}<input class="txt" type="file" id="rat-arq" accept="image/*,application/pdf" capture="environment">${F.file?`<small>${e(F.file.name)}</small>`:''}</label>
      <div class="rat-ac"><button class="btn sec" data-act="rat-fx">Cancelar</button><button class="btn" data-act="rat-ok" ${A.salv?'disabled':''}>${A.salv?'Guardando…':'Guardar'}</button></div></div></div></div>`; }
  const g=i=>{ const x=document.getElementById(i); return x?x.value:null; };
  function le(){ const F=A.f; if(!F) return; [['rat-pn','nome'],['rat-ini','ini'],['rat-dias','dias'],['rat-hi','hIni'],['rat-hf','hFim'],['rat-mot','mot']].forEach(([i,k])=>{ const v=g(i); if(v!=null) F[k]=v; }); }
  function novo(c,funcId){ C=c||C; if(!C) return; const fu=funcId&&(C.R.func||[]).find(y=>y._id===funcId); A.f={funcId:fu?fu._id:'',nome:fu?C.titulo(fu.nome):'',tipo:'atestado',ini:C.P.hojeStr(),dias:1,abona:true,mot:''}; C.P.render(); setTimeout(()=>{ const i=document.getElementById(fu?'rat-ini':'rat-pn'); i&&i.focus(); },60); }
  async function guarda(c){ const F=A.f, P=c.P; le(); const fu=F.funcId&&(c.R.func||[]).find(y=>y._id===F.funcId), t=TIPO(F.tipo);
    if(!fu) return P.toast('Escolha a pessoa na lista.'); if(!/^\d{4}-\d{2}-\d{2}$/.test(F.ini||'')) return P.toast('Escolha a data.');
    if(t[2]==='horas'&&!(hm(F.hIni)!=null&&hm(F.hFim)!=null&&hm(F.hFim)>hm(F.hIni))) return P.toast('Diga das que horas até que horas.');
    const dias=t[2]==='horas'?1:Math.max(1,Math.min(365,parseInt(F.dias,10)||1)), agora=new Date().toISOString(), nid=F._id||id();
    const d={funcId:fu._id,nome:c.titulo(fu.nome),cpf:dig(fu.cpf),setor:fu.setor||'',empresa:fu.empresa||'',tipo:F.tipo,ini:F.ini,dias,fim:t[2]==='horas'?F.ini:addD(F.ini,dias-1),
      hIni:t[2]==='horas'?F.hIni:'',hFim:t[2]==='horas'?F.hFim:'',horas:t[2]==='horas'?horasDe(F):0,abona:F.tipo==='injustificada'?false:F.abona!==false,mot:String(F.mot||'').trim().slice(0,160),
      arq:F.arq||null,por:F.por||c.eu(),em:F.em||agora,editEm:F._id?agora:null,editPor:F._id?c.eu():null};
    A.salv=true; P.render();
    try{ if(F.file&&c.guardar){ const ext=(F.file.name.match(/\.[a-z0-9]+$/i)||['.jpg'])[0], nome=(F.ini+' '+t[1].split(' (')[0]+' - '+d.nome).replace(/[\\/:*?"<>|]+/g,'-')+ext;
        try{ d.arq=await c.guardar('Atestados/'+F.ini.slice(0,7),nome,F.file); }catch(e){ P.toast('O registro foi guardado, mas o arquivo não subiu: '+(e&&e.message||e)); } }
      await P.db().doc(COL+'/'+nid).set(d); const i=A.xs.findIndex(x=>x._id===nid); if(i>=0) A.xs[i]=Object.assign({_id:nid},d); else A.xs.unshift(Object.assign({_id:nid},d));
      const rec=F.rec; A.f=null; P.toast(t[1]+' de '+d.nome+' guardado.');
      if(rec){ try{ await P.db().doc('rhatestrec/'+rec.id).update({st:'registrado',atestId:nid,regEm:agora,regPor:c.eu()}); A.rec=A.rec.filter(r=>r._id!==rec.id); await apagaArqs(P,rec); }catch(e){ console.warn('[RH] atestado do link',e); } }
    }catch(e){ P.erro(e); } finally{ A.salv=false; } P.render(); }
  /* ---------- atestados enviados pelo link (atestado.html, 27/11/2026) ---------- */
  const linkAt=()=>{ let b=(window.claude&&window.claude.link)||(location.origin+location.pathname.replace(/[^/]*$/,'')); if(!/\/$/.test(b)) b+='/'; return b+'atestado.html'; };
  function assinaRec(P){ if(A.recSub) return; A.recSub=true; P.inscrever('rh-atrec',()=>P.db().collection('rhatestrec').where('st','==','novo').limit(100),s=>{ A.rec=s.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>String(a.em).localeCompare(String(b.em))); A.recLido=true; P.rerender(); }); }
  { const t=setInterval(()=>{ try{ const P=window.Painel; if(!P||!P.S||!P.S.acs||!P.S.acs.pronto||!P.db()) return; clearInterval(t); if(P.viewOk('rhatest')||P.viewOk('rhfunc')) assinaRec(P); }catch(e){ clearInterval(t); } },800);
    const t2=setInterval(()=>{ const P=window.Painel; if(!P||!P.registrarAviso) return; clearInterval(t2);
      P.registrarAviso(()=>A.rec.length?[{nivel:'warn',rotulo:'RH',titulo:A.rec.length+(A.rec.length>1?' atestados enviados pelo link':' atestado enviado pelo link'),texto:A.rec.slice(0,3).map(r=>r.nome+' ('+br(r.ini)+')').join(', ')+' · conferir e registrar',go:'rhatest'}]:[]); },500); }
  function funcDoRec(c,r){ const fs=(c.R.func||[]).filter(f=>f&&!f.removido), m=String(r.mat||'').trim();
    return (m&&fs.find(f=>String(f.matricula||'').trim()===m))||fs.find(f=>norm(f.nome)===norm(r.nome))||null; }
  function recHtml(c){ if(!A.rec.length) return ''; const e=c.esc;
    return `<div class="rat-rec" aria-label="Recebidos pelo link"><div class="rat-rech"><b>Recebidos pelo link · ${A.rec.length}</b><small>Confira o documento e registre. Depois de registrar, o arquivo vai para a pasta dos atestados.</small></div>
      ${A.rec.map(r=>{ const f=funcDoRec(c,r), t=TIPO(r.tipo), porMat=f&&String(f.matricula||'').trim()===String(r.mat).trim();
        return `<div class="rat-ri"><div class="rat-rit"><b>${e(f?c.titulo(f.nome):r.nome)}</b><small>Matrícula ${e(r.mat)}${f?(porMat?' · '+e([f.setor,f.funcao].filter(Boolean).join(' · ')):' · achado pelo nome (a matrícula não está no cadastro)'):' · <span class="rat-rno">não achei no cadastro: escolha a pessoa ao registrar</span>'}${r.tel?' · '+e(r.tel):''}</small>
          <small><span class="rat-tp ${t[4]}">${e(t[1])}</span> ${e(t[2]==='horas'?br(r.ini)+' · '+r.hIni+' às '+r.hFim:br(r.ini)+' · '+r.dias+' dia'+(r.dias>1?'s':''))} · enviado ${e(new Date(r.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))}${r.obs?' · “'+e(r.obs)+'”':''}</small></div>
          <div class="rat-ria">${Array.from({length:Math.max(1,+r.n||1)},(_,i)=>`<button class="btn sec rh-sm" data-act="rat-rver" data-id="${e(r._id)}" data-i="${i}">${A.abrindo===r._id+'-'+i?'Abrindo…':(+r.n>1?'Ver '+(i+1):'Ver documento')}</button>`).join('')}<button class="btn rh-sm" data-act="rat-rreg" data-id="${e(r._id)}">Registrar</button><button class="lnk rat-del" data-act="rat-rrec" data-id="${e(r._id)}">Recusar</button></div></div>`; }).join('')}</div>`; }
  function qrSvg(txt){ if(typeof window.qrcode!=='function') return ''; const q=window.qrcode(0,'M'); q.addData(txt); q.make(); const n=q.getModuleCount(); let d='';
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(q.isDark(y,x)) d+='M'+x+' '+y+'h1v1h-1z'; return `<svg viewBox="-2 -2 ${n+4} ${n+4}" width="150" height="150" role="img" aria-label="QR code do link"><rect x="-2" y="-2" width="${n+4}" height="${n+4}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; }
  function linkHtml(c){ const e=c.esc, L=linkAt();
    return `<div class="rat-lk"><div class="rat-lkq">${qrSvg(L)}</div><div class="rat-lkt"><b>Link para o funcionário mandar o atestado</b><small>Sem senha: ele põe a matrícula e o nome, o tipo, as datas e tira a foto. Chega aqui em "Recebidos pelo link". Cole o QR no mural ou mande o link no grupo.</small>
      <code>${e(L)}</code><div class="rat-ria"><button class="btn sec rh-sm" data-act="rat-rcopia">Copiar link</button><a class="btn sec rh-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Para mandar atestado ou declaração para o RH da Colafix, use este link: '+L)}">Mandar no WhatsApp</a><button class="btn sec rh-sm" data-act="rat-rqr">Imprimir cartaz</button></div></div></div>`; }
  async function arqsDe(P,r){ const out=[]; for(let i=0;i<Math.max(1,+r.n||1);i++){ const g=await P.db().doc('rhatestarq/'+r._id+'-'+i).get(); if(g.exists) out.push(g.data()); } return out; }
  async function apagaArqs(P,r){ for(let i=0;i<Math.max(1,+r.n||1);i++){ try{ await P.db().doc('rhatestarq/'+(r.id||r._id)+'-'+i).delete(); }catch(e){} } }
  const blobDe=d=>{ const [h,b]=String(d).split(','), mime=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream', bin=atob(b), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new Blob([u],{type:mime}); };
  async function arquivoDoRec(P,r){ const xs=await arqsDe(P,r); if(!xs.length) return null; const base=(r.ini+' envio '+String(r.nome||'')).replace(/[\\/:*?"<>|]+/g,'-');
    if(xs[0].mime==='application/pdf') return new File([blobDe(xs[0].d)],base+'.pdf',{type:'application/pdf'});
    const J=window.jspdf&&window.jspdf.jsPDF; if(J&&xs.length>1){ try{ const pdf=new J({unit:'mm',format:'a4'}); for(let i=0;i<xs.length;i++){ if(i) pdf.addPage(); const im=await new Promise((ok,er)=>{ const m=new Image(); m.onload=()=>ok(m); m.onerror=er; m.src=xs[i].d; }); const k=Math.min(190/im.width,277/im.height); pdf.addImage(xs[i].d,'JPEG',10,10,im.width*k,im.height*k); }
      return new File([pdf.output('blob')],base+'.pdf',{type:'application/pdf'}); }catch(e){ console.warn('[RH] juntar fotos',e); } }
    return new File([blobDe(xs[0].d)],base+'.jpg',{type:'image/jpeg'}); }
  async function recAcao(c,a,id,i){ const P=c.P, r=A.rec.find(x=>x._id===id); if(!r) return;
    if(a==='ver'){ A.abrindo=id+'-'+i; P.render(); try{ const g=await P.db().doc('rhatestarq/'+id+'-'+i).get(); if(!g.exists) return P.toast('O arquivo não foi encontrado.'); const u=URL.createObjectURL(blobDe(g.data().d)); const w=window.open(u,'_blank','noopener'); if(!w){ const l=document.createElement('a'); l.href=u; l.target='_blank'; l.rel='noopener'; document.body.appendChild(l); l.click(); l.remove(); } setTimeout(()=>URL.revokeObjectURL(u),60000); }catch(e){ P.erro(e); } finally{ A.abrindo=''; P.render(); } return; }
    if(a==='rec'){ const m=prompt('Recusar o envio de '+r.nome+'? Motivo (opcional, fica guardado):',''); if(m===null) return;
      try{ await P.db().doc('rhatestrec/'+id).update({st:'recusado',motivo:String(m).trim().slice(0,160),regEm:new Date().toISOString(),regPor:c.eu()}); A.rec=A.rec.filter(x=>x._id!==id); await apagaArqs(P,r); P.toast('Envio recusado.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='reg'){ const f=funcDoRec(c,r); P.toast('Juntando o documento…'); let file=null; try{ file=await arquivoDoRec(P,r); }catch(e){ console.warn(e); }
      A.f={funcId:f?f._id:'',nome:f?c.titulo(f.nome):r.nome,tipo:r.tipo||'atestado',ini:r.ini,dias:r.dias||1,hIni:r.hIni||'',hFim:r.hFim||'',abona:TIPO(r.tipo)[3],mot:r.obs||'',file,rec:{id:r._id,n:r.n}}; P.render(); } }
  /* ---------- relatório no padrão (RHRel) ---------- */
  const linhaExp=(c,D,x)=>{ const fu=(c.R.func||[]).find(y=>y._id===x.funcId); return [c.titulo(x.nome||''),(fu&&fu.setor)||x.setor||'',TIPO(x.tipo)[1],br(x.ini),TIPO(x.tipo)[2]==='horas'?'':br(fimDe(x)),TIPO(x.tipo)[2]==='horas'?'':D.dentro(x),TIPO(x.tipo)[2]==='horas'?horasDe(x):'',x.abona===false||x.tipo==='injustificada'?'não':'sim',x.mot||'',x.arq&&x.arq.url?'sim':'não',x.por||'']; };
  async function pdf(c){ if(!window.RHRel) return c.P.toast('O gerador de relatórios ainda não carregou.'); const D=dados(c);
    try{ await RHRel.pdf({tit:'Atestados e faltas',sub:'RH · '+D.P0.txt,filtros:D.filtros,arq:'Atestados-faltas-'+D.P0.de+'_a_'+D.P0.ate,
      kpis:[{t:'Registros',v:String(D.xs.length),s:D.pes+' pessoa'+(D.pes===1?'':'s'),c:'pet'},{t:'Dias de atestado',v:String(D.diasAt),s:'médico e acompanhamento',c:'teal'},{t:'Faltas sem justificativa',v:String(D.faltSJ),s:'dias',c:D.faltSJ?'crit':'ok'},{t:'Horas de comparecimento',v:String(D.horas).replace('.',','),s:'declarações',c:'cinza'}],
      partes:[{secao:'Registros',nota:'do mais novo para o mais antigo',cols:[{t:'Pessoa',w:42},{t:'Setor',w:24},{t:'Tipo',w:36},{t:'Quando',w:30},{t:'Dias/horas',w:18,al:'r'},{t:'Abona',w:13},{t:'Motivo',w:36}],
          rows:D.xs.map(x=>{ const r=[c.titulo(x.nome||''),((c.R.func||[]).find(y=>y._id===x.funcId)||{}).setor||x.setor||'',TIPO(x.tipo)[1],perTxt(x),TIPO(x.tipo)[2]==='horas'?String(horasDe(x)).replace('.',',')+' h':String(D.dentro(x)),x.abona===false||x.tipo==='injustificada'?'não':'sim',x.mot||'']; if(x.tipo==='injustificada') r._cor={2:'crit',5:'crit'}; return r; }),vazio:'Nenhum registro no período.'},
        {secao:'Quem mais se ausentou',cols:[{t:'Pessoa',w:70},{t:'Dias',w:20,al:'r'},{t:'Horas',w:20,al:'r'},{t:'Registros',w:20,al:'r'}],rows:D.rank.map(g=>[c.titulo(g.nome),String(g.dias),String(Math.round(g.h*10)/10).replace('.',','),String(g.n)]),vazio:'—'},
        {texto:'Atestado e declaração são dados de saúde (LGPD): guarde o PDF em local protegido e compartilhe só com quem precisa.'}],assina:'Responsável pelo RH'}); }catch(e){ c.P.toast(String(e&&e.message||e)); } }
  async function xls(c){ if(!window.RHRel) return; const D=dados(c);
    await RHRel.xls('Atestados-faltas-'+D.P0.de+'_a_'+D.P0.ate,[['Registros',[['Pessoa','Setor','Tipo','Início','Fim','Dias no período','Horas','Abona','Motivo','Documento','Registrado por']].concat(D.xs.map(x=>linhaExp(c,D,x)))],
      ['Por pessoa',[['Pessoa','Setor','Dias','Horas','Registros']].concat([...new Map(D.xs.map(x=>[x.funcId,x])).keys()].map(fid=>{ const xs=D.xs.filter(x=>x.funcId===fid), x=xs[0]; return [c.titulo(x.nome||''),x.setor||'',xs.reduce((a,y)=>a+D.dentro(y),0),Math.round(xs.reduce((a,y)=>a+(TIPO(y.tipo)[2]==='horas'?horasDe(y):0),0)*10)/10,xs.length]; }))]],{tit:'Atestados e faltas',sub:D.P0.txt,filtros:D.filtros}); }
  /* ---------- eventos ---------- */
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!C) return;
    if(t.id==='rat-pn'&&A.f){ A.f.nome=t.value; A.f.funcId=''; clearTimeout(A._t); A._t=setTimeout(()=>{ C.P.render(); const i=document.getElementById('rat-pn'); if(i){ i.focus(); const n=i.value.length; try{ i.setSelectionRange(n,n); }catch(e){} } },250); return; }
    if((t.id==='rat-ini'||t.id==='rat-dias')&&A.f){ le(); const v=document.getElementById('rat-volta'); if(v) v.textContent=A.f.ini?br(addD(A.f.ini,Math.max(1,parseInt(A.f.dias,10)||1))):'—'; return; }
    if(t.id==='rat-q'){ A.fil.q=t.value; clearTimeout(A._q); A._q=setTimeout(()=>{ C.P.render(); const i=document.getElementById('rat-q'); if(i){ i.focus(); const n=i.value.length; try{ i.setSelectionRange(n,n); }catch(e){} } },350); } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!C) return;
    if(t.dataset&&t.dataset.ratF){ A.fil[t.dataset.ratF]=t.value; C.P.render(); return; }
    if(t.id==='rat-arq'&&A.f){ le(); A.f.file=t.files&&t.files[0]||null; C.P.render(); } });
  document.addEventListener('keydown',ev=>{ if(!A.f||!C) return; if(ev.key==='Escape'){ A.f=null; C.P.render(); } if(ev.key==='Enter'&&ev.target&&ev.target.id==='rat-pn'){ const b=document.querySelector('[data-act="rat-pick"]'); if(b){ ev.preventDefault(); b.click(); } } });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-rat-fundo]'); if(fu&&ev.target===fu&&C){ A.f=null; C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="rat-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P; le();
    if(a==='rat-novo'){ novo(C,b.dataset.id||''); return; }
    if(a==='rat-rlink'){ A.lk=!A.lk; P.render(); return; } if(a==='rat-rcopia'){ const L=linkAt(); try{ await navigator.clipboard.writeText(L); }catch(e){} window.__ratLink=L; P.toast('Link copiado.'); return; }
    if(a==='rat-rqr'){ const w=window.open('','_blank'); if(w){ w.document.write('<!doctype html><title>Atestado pelo celular</title><body style="font-family:sans-serif;text-align:center;padding:40px"><h1 style="font-size:40px;margin:0 0 10px">Atestado pelo celular</h1><p style="font-size:22px;margin:0 0 30px">Aponte a câmera, preencha e tire a foto do atestado.<br>Vai direto para o RH.</p><div style="width:360px;margin:0 auto">'+qrSvg(linkAt()).replace('width="150" height="150"','width="360" height="360"')+'</div><p style="font-size:16px;color:#555;margin-top:24px">'+linkAt()+'</p><p style="font-size:18px">Colafix · RH</p><script>setTimeout(()=>print(),400)<\/script></body>'); w.document.close(); } return; }
    if(a==='rat-rver'){ recAcao(C,'ver',b.dataset.id,+b.dataset.i||0); return; } if(a==='rat-rreg'){ recAcao(C,'reg',b.dataset.id); return; } if(a==='rat-rrec'){ recAcao(C,'rec',b.dataset.id); return; } if(a==='rat-fx'){ A.f=null; P.render(); return; }
    if(a==='rat-pdf'){ pdf(C); return; } if(a==='rat-xls'){ xls(C); return; }
    if(a==='rat-limpa'){ Object.assign(A.fil,{tipo:'',setor:'',q:''}); P.render(); return; }
    if(a==='rat-mes'){ A.fil.mes=mesMais(A.fil.mes||P.hojeStr().slice(0,7),+b.dataset.v); P.render(); return; }
    if(a==='rat-pick'&&A.f){ const f=(C.R.func||[]).find(x=>x._id===b.dataset.id); if(f){ A.f.funcId=f._id; A.f.nome=C.titulo(f.nome); } P.render(); return; }
    if(a==='rat-troca'&&A.f){ A.f.funcId=''; A.f.nome=''; P.render(); setTimeout(()=>{ const i=document.getElementById('rat-pn'); i&&i.focus(); },40); return; }
    if(a==='rat-tipo'&&A.f){ A.f.tipo=b.dataset.v; A.f.abona=TIPO(b.dataset.v)[3]; P.render(); return; }
    if(a==='rat-ab'&&A.f){ A.f.abona=b.dataset.v==='1'; P.render(); return; }
    if(a==='rat-ok'&&A.f){ if(!A.salv) await guarda(C); return; }
    const x=A.xs.find(y=>y._id===b.dataset.id); if(!x) return;
    if(a==='rat-ed'){ A.f=Object.assign({},x,{file:null}); P.render(); return; }
    if(a==='rat-del'){ if(A.cx!==x._id){ A.cx=x._id; P.render(); setTimeout(()=>{ if(A.cx===x._id){ A.cx=null; P.render(); } },4000); return; } A.cx=null;
      try{ await P.db().doc(COL+'/'+x._id).update({removido:true,removidoEm:new Date().toISOString(),removidoPor:C.eu()}); A.xs=A.xs.filter(y=>y!==x); P.toast('Registro apagado.'); }catch(e){ P.erro(e); } P.render(); } });
  window.RHAtest={render:c=>render(c),novo,cobre,resumo,daPessoa,lista:()=>vivos(),assina:c=>{ C=C||c; assina(c); },TIPOS,TIPO,fimDe,horasDe,durTxt,_A:A};
  document.head.insertAdjacentHTML('beforeend',`<style id="rat-css">
.rat-tb{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.rat-tb>div:first-child{flex:1 1 320px;min-width:0}.rat-sp{display:none}.rat-tb .btn{display:inline-flex;gap:6px;align-items:center}
.rat-mes{display:inline-flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0}.rat-mes b{font-size:15px;color:var(--ink,inherit);min-width:140px;text-align:center}
.rat-k{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:10px 0 14px}.rat-k>div{background:var(--ground);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:1px}.rat-k span{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em}.rat-k b{font-size:24px;line-height:1.2}.rat-k small{font-size:12px;color:var(--muted)}.rat-k .crit b{color:var(--crit-ink,var(--crit))}
@media (max-width:900px){.rat-k{grid-template-columns:1fr 1fr}}
.rat-t td{vertical-align:middle}.rat-t small{display:block;color:var(--muted);font-size:12px}.rat-acs{white-space:nowrap;text-align:right}.rat-acs .lnk{margin-left:10px}.rat-del{color:var(--crit-ink,var(--crit))}
.rat-tp{display:inline-block;border-radius:99px;padding:2px 10px;font-size:12.5px;font-weight:600;background:var(--ground)}.rat-tp.teal{background:color-mix(in srgb,var(--teal) 16%,transparent)}.rat-tp.pet{background:color-mix(in srgb,var(--teal-strong) 14%,transparent)}.rat-tp.warn{background:color-mix(in srgb,var(--warn) 18%,transparent)}.rat-tp.crit{background:color-mix(in srgb,var(--crit) 16%,transparent);color:var(--crit-ink,var(--crit))}
.rat-vz{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:28px 12px;border:1.5px dashed var(--line);border-radius:14px}.rat-vz span{color:var(--muted);max-width:520px;font-size:14px}
.rat-rk{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:6px}.rat-rk>div{background:var(--ground);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column}.rat-rk span{font-weight:600}.rat-rk small{color:var(--muted);font-size:12px}
.rat-fm{padding:20px 22px;display:flex;flex-direction:column;gap:14px}.rat-w{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--muted);font-weight:600;min-width:0}.rat-w small{font-weight:400}
.rat-2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media (max-width:640px){.rat-2{grid-template-columns:1fr}}
.rat-volta{font-size:16px;color:var(--ink,inherit);padding-top:8px}
.rat-tps{display:flex;gap:6px;flex-wrap:wrap}.rat-tps button{border:1.5px solid var(--line);background:var(--surface);border-radius:10px;padding:8px 12px;font:inherit;font-size:13.5px;font-weight:600;color:inherit;cursor:pointer}.rat-tps button.on{border-color:var(--teal-strong);background:var(--teal-strong);color:#fff}
.rat-yn{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;align-self:flex-start;background:var(--surface)}.rat-yn button{border:0;background:none;font:inherit;font-weight:700;font-size:13px;padding:6px 16px;cursor:pointer;color:var(--muted)}.rat-yn button.on{background:var(--ok,#3C8A63);color:#fff}.rat-yn button.on.nao{background:var(--crit,#B5473F)}
.rat-sug{display:flex;flex-direction:column;gap:4px;margin-top:-6px}.rat-sug button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:7px 10px;cursor:pointer;font:inherit;color:inherit}.rat-sug button:hover{border-color:var(--teal)}.rat-sug small{color:var(--muted);font-size:12px}
.rat-sel{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;color:var(--ink,inherit);font-size:15px}.rat-sel small{color:var(--muted)}
.rat-ac{display:flex;gap:8px;justify-content:flex-end}
.rat-rec{border:1.5px solid var(--warn);border-radius:14px;padding:12px 14px;margin:10px 0 4px;background:color-mix(in srgb,var(--warn) 7%,var(--surface))}.rat-rech{display:flex;flex-direction:column;gap:2px;margin-bottom:6px}.rat-rech small{color:var(--muted);font-size:12.5px}
.rat-ri{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)}.rat-ri:first-of-type{border-top:0}.rat-rit{display:flex;flex-direction:column;gap:3px;min-width:240px;flex:1}.rat-rit small{color:var(--muted);font-size:12.5px}.rat-rno{color:var(--crit-ink,var(--crit));font-weight:600}
.rat-ria{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.rat-lk{display:flex;gap:16px;align-items:center;flex-wrap:wrap;border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:10px 0 0;background:var(--ground)}.rat-lkq svg{display:block;border-radius:8px}.rat-lkt{display:flex;flex-direction:column;gap:6px;flex:1;min-width:240px}.rat-lkt small{color:var(--muted);font-size:13px}.rat-lkt code{font-size:13px;word-break:break-all;background:var(--surface);border-radius:8px;padding:6px 8px}
</style>`);
})();
