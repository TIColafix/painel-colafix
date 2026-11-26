/* Carros · portaria (26/11/2026). Pedido: "login para o porteiro onde ele vai escanear o QR code, já puxa placa e o último km;
   lista de motoristas liberados; o adm pode cadastrar e bloquear um motorista; o porteiro escolhe o nome e o km é dado na ida
   e na volta; por enquanto o porteiro vai ter só os carros"; "layout da placa e no lugar da bandeira a logo Colafix".
   - Módulo `portaria` (tela `portaria`): o porteiro escaneia o QR do carro (câmera do aparelho; sem câmera, toca na placa),
     o painel mostra placa, modelo e último km e abre a SAÍDA (motorista liberado + km + observação) ou a VOLTA (km de chegada,
     calcula quanto rodou). Cargo pronto "Portaria (carros)" só com este módulo.
   - Módulo `carros` (telas `carviag` Viagens e `carcad` Carros e motoristas): o adm cadastra carros (placa, modelo, km inicial,
     ativo), motoristas (liberado/bloqueado), imprime os QR codes (PDF com a placa), vê e corrige as viagens, km por carro e
     por motorista, planilha.
   - Dados: carros/cad {carros:[{id,placa,modelo,km,ativo}], mot:[{id,nome,ok}]} (só o adm grava) · carrosv/<id> viagens
     {carro,placa,modelo,mot,motNome,kmS,emS,diaS,porS,porSN,obsS,kmEsp,kmDif,aberta, kmV,emV,porV,porVN,obsV,rodou,removido}
     · carrosk/<carroId> {km,em,viagem} último km (a portaria grava). Regras: carrosOk / carrosAdm no firestore.rules.
   - QR: o texto é o endereço do painel com ?carro=<id> (a câmera do celular também abre direto o carro na portaria).
   Prefixo `cv`. */
(function(){ const P=window.Painel; if(!P) return;
  if(P.icone){ P.icone('carro','<path d="M4 15.5V12l2-5h12l2 5v3.5"/><path d="M3 15.5h18v2.5H3z"/><circle cx="7.5" cy="16.5" r="1.4"/><circle cx="16.5" cy="16.5" r="1.4"/><path d="M6.5 11.5h11"/>');
    P.icone('portaria','<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/><path d="M2 20h20"/>'); }
  const esc=P.esc, S=P.S, hoje=()=>P.hojeStr();
  const C={cad:{carros:[],mot:[]},viag:[],fora:[],km:{},lido:{},sel:null,f:{mot:'',km:'',obs:'',conf:false},msg:null,cam:{on:false,erro:''},q:{per:'7',de:'',ate:'',car:'',mot:'',st:''},
    edC:null,edM:null,edV:null,salv:false,abaCad:'carros',busca:''};
  window.__carros=C;
  const PL_RE=/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
  const plN=p=>String(p||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const plT=p=>{ p=plN(p); return /^[A-Z]{3}[0-9]{4}$/.test(p)?p.slice(0,3)+'-'+p.slice(3):p; };
  const fK=n=>(n==null||n===''||isNaN(+n))?'—':Math.round(+n).toLocaleString('pt-BR');
  const kmNum=v=>{ const t=String(v==null?'':v).replace(/\s|km/gi,'').replace(/\./g,'').replace(',','.'); const n=Math.round(Number(t)); return t&&Number.isFinite(n)?n:NaN; };
  const hm=iso=>iso?P.hora(iso):'';
  const diaDe=iso=>iso?P.hojeStr(new Date(iso)):'';
  const brD=d=>d?d.slice(8,10)+'/'+d.slice(5,7):'';
  const quando=iso=>{ if(!iso) return ''; const d=diaDe(iso), h=hoje(); return (d===h?'hoje':d===addD(h,-1)?'ontem':brD(d))+' às '+hm(iso); };
  const addD=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return P.hojeStr(x); };
  const dur=ms=>{ const m=Math.max(0,Math.round(ms/60000)); if(m<60) return m+' min'; const h=Math.floor(m/60); if(h<24) return h+' h'+(m%60?' '+String(m%60).padStart(2,'0'):''); const d=Math.floor(h/24); return d+(d>1?' dias':' dia')+(h%24?' '+(h%24)+' h':''); };
  const eu=()=>(S.nomes||{})[S.uid]||P.nomeDe(S.uid)||'';
  const novoId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const pode=()=>!P.soVer();
  const adm=()=>P.dono()||(P.viewOk('carcad')&&!P.soVer());
  const carros=()=>(C.cad.carros||[]).filter(c=>!c.removido);
  const ativos=()=>carros().filter(c=>c.ativo!==false).sort((a,b)=>a.placa.localeCompare(b.placa));
  const mots=()=>(C.cad.mot||[]).filter(m=>!m.removido).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  const liberados=()=>mots().filter(m=>m.ok!==false);
  const carDe=id=>carros().find(c=>c.id===id);
  const motDe=id=>mots().find(m=>m.id===id);
  const abertaDe=id=>C.fora.find(v=>v.carro===id&&v.aberta&&!v.removido);
  /* último km: o maior entre o registro da portaria, a última viagem e o km do cadastro */
  function ultKm(c){ if(!c) return null; const k=C.km[c.id], vs=C.viag.filter(v=>v.carro===c.id&&!v.removido), a=abertaDe(c.id);
    const xs=[+c.km||0,k&&+k.km||0].concat(vs.map(v=>Math.max(+v.kmS||0,+v.kmV||0))).concat(a?[+a.kmS||0]:[]); return Math.max(...xs); }

  /* ---------- placa (padrão Mercosul, com a logo da Colafix no lugar da bandeira) ---------- */
  function placa(c,tam){ const p=typeof c==='string'?c:(c&&c.placa)||''; return `<span class="cv-pl ${tam||''}" aria-label="Placa ${esc(plT(p))}"><span class="cv-plb"><span>BRASIL</span><i aria-hidden="true"></i></span><span class="cv-plc"><em aria-hidden="true">BR</em><b>${esc(plN(p))}</b></span></span>`; }
  /* logo na faixa azul: a versão para fundo escuro ("fix" branco), sem fundo atrás (26/11: "tire o fundo branco da logo") */
  const LOGO_ESC='icons/logo-colafix-escuro.png';
  function logoCss(){ if(document.getElementById('cv-logo-css')) return; document.head.insertAdjacentHTML('beforeend',`<style id="cv-logo-css">.cv-plb i{background-image:url("${LOGO_ESC}")}</style>`); }

  /* ---------- banco ---------- */
  let lendo=false;
  function carregar(){ if(lendo) return; lendo=true;
    P.inscrever('cv-cad',()=>P.db().doc('carros/cad'),g=>{ const d=g&&g.exists?g.data():{}; C.cad={carros:Array.isArray(d.carros)?d.carros:[],mot:Array.isArray(d.mot)?d.mot:[]}; C.lido.cad=true; logoCss(); abrirDaUrl(); P.rerender(); });
    P.inscrever('cv-fora',()=>P.db().collection('carrosv').where('aberta','==',true).limit(200),s=>{ C.fora=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(v=>!v.removido); C.lido.fora=true; P.rerender(); });
    P.inscrever('cv-hist',()=>P.db().collection('carrosv').orderBy('emS','desc').limit(600),s=>{ C.viag=s.docs.map(d=>Object.assign({_id:d.id},d.data())); C.lido.hist=true; P.rerender(); });
    P.inscrever('cv-km',()=>P.db().collection('carrosk').limit(300),s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data(); }); C.km=m; C.lido.km=true; P.rerender(); }); }
  const lido=()=>C.lido.cad&&C.lido.fora;
  async function gravaCad(novo,msg){ C.salv=true; P.render(); try{ await P.db().doc('carros/cad').set({carros:novo.carros,mot:novo.mot,em:new Date().toISOString(),por:S.uid||null}); C.cad=novo; if(msg) P.toast(msg); return true; }
    catch(e){ P.erro(e); return false; } finally{ C.salv=false; P.render(); } }

  /* ---------- QR: ler ---------- */
  const CAM={stream:null,timer:null,det:null,ocup:false,ult:''};
  async function detector(){ if(CAM.det) return CAM.det;
    if('BarcodeDetector' in window){ try{ const bd=new BarcodeDetector({formats:['qr_code']}); CAM.det=async c=>{ const r=await bd.detect(c); return r&&r[0]&&r[0].rawValue||''; }; return CAM.det; }catch(e){} }
    if(!window.jsQR) await new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; s.integrity='sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx'; s.crossOrigin='anonymous'; s.onload=ok; s.onerror=()=>no(new Error('leitor de QR indisponível')); document.head.appendChild(s); });
    if(!window.jsQR) throw new Error('leitor de QR indisponível');
    CAM.det=async c=>{ const x=c.getContext('2d'); const d=x.getImageData(0,0,c.width,c.height); const q=window.jsQR(d.data,c.width,c.height,{inversionAttempts:'dontInvert'}); return q?q.data:''; }; return CAM.det; }
  async function camLiga(){ if(CAM.stream) return; C.cam={on:true,erro:''}; P.render();
    try{ if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw {name:'sem-camera'};
      const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:false});
      if(!C.cam.on){ st.getTracks().forEach(t=>t.stop()); return; } CAM.stream=st;
      const v=document.getElementById('cv-video'); if(v){ v.srcObject=st; try{ await v.play(); }catch(e){} }
      const det=await detector(), cv=document.createElement('canvas');
      CAM.timer=setInterval(async()=>{ const vv=document.getElementById('cv-video'); if(CAM.ocup||!vv||vv.readyState<2) return; CAM.ocup=true;
        try{ if(vv.srcObject!==CAM.stream){ vv.srcObject=CAM.stream; try{ await vv.play(); }catch(e){} } const w=vv.videoWidth, h=vv.videoHeight; if(!w) return; const k=Math.min(1,1280/Math.max(w,h)); cv.width=Math.round(w*k); cv.height=Math.round(h*k);
          cv.getContext('2d').drawImage(vv,0,0,cv.width,cv.height); const t=await det(cv); if(t) leu(t); }catch(e){ console.warn('[carros] leitura',e); } finally{ CAM.ocup=false; } },250);
    }catch(e){ console.warn('[carros] câmera',e); C.cam={on:false,erro:e&&e.name==='NotAllowedError'?'A câmera foi bloqueada. Libere a câmera para este site nas configurações do navegador, ou toque na placa do carro abaixo.':e&&e.name==='sem-camera'?'Este aparelho não tem câmera. Toque na placa do carro abaixo.':'Não deu para ligar a câmera. Toque na placa do carro abaixo.'}; camDesliga(true); P.render(); } }
  function camDesliga(manter){ if(CAM.timer){ clearInterval(CAM.timer); CAM.timer=null; } if(CAM.stream){ CAM.stream.getTracks().forEach(t=>t.stop()); CAM.stream=null; } if(!manter) C.cam={on:false,erro:''}; }
  function bip(){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return; const x=CAM.ac||(CAM.ac=new A()), o=x.createOscillator(), g=x.createGain(); o.frequency.value=1250; o.connect(g); g.connect(x.destination); g.gain.setValueAtTime(0.2,x.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,x.currentTime+0.15); o.start(); o.stop(x.currentTime+0.16); }catch(e){} }
  /* texto lido: endereço com ?carro=<id>, o id puro ou a placa */
  function carDoTexto(t){ t=String(t||'').trim(); let id=''; const m=t.match(/[?&]carro=([A-Za-z0-9_-]+)/); if(m) id=m[1]; else if(/^c[a-z0-9]{6,}$/i.test(t)) id=t;
    if(id){ const c=carDe(id); if(c) return c; } const p=plN(t.replace(/^.*[?&]placa=/i,'')); return carros().find(c=>plN(c.placa)===p)||null; }
  function leu(t){ if(CAM.ult===t&&Date.now()-(CAM.ultEm||0)<3000) return; CAM.ult=t; CAM.ultEm=Date.now(); const c=carDoTexto(t);
    if(!c){ msg('warn','Este QR não é de um carro cadastrado.'); return; } bip(); camDesliga(); abrir(c.id); }
  function abrir(id){ const c=carDe(id); if(!c) return; if(c.ativo===false){ msg('warn','O carro '+plT(c.placa)+' está desativado no cadastro. Fale com o administrador.'); return; }
    C.sel=id; const a=abertaDe(id); C.f={mot:'',km:a?'':String(ultKm(c)||''),obs:'',conf:false}; C.msg=null; if(P.S.view!=='portaria'&&P.viewOk('portaria')) P.go('portaria'); P.render();
    setTimeout(()=>{ const i=document.getElementById(a?'cv-km':'cv-mot'); if(i&&a) i.focus(); },60); }
  let _urlFeito=false;
  function abrirDaUrl(){ if(_urlFeito) return; const m=location.search.match(/[?&]carro=([A-Za-z0-9_-]+)/); if(!m) { _urlFeito=true; return; } if(!C.lido.cad||!P.viewOk('portaria')) return; _urlFeito=true;
    try{ history.replaceState(null,'',location.pathname+location.search.replace(/([?&])carro=[^&]*&?/,'$1').replace(/[?&]$/,'')+location.hash); }catch(e){}
    abrir(m[1]); }
  function msg(t,x){ C.msg={t,x}; P.render(); clearTimeout(msg._t); msg._t=setTimeout(()=>{ C.msg=null; P.rerender(); },t==='ok'?6000:8000); }

  /* ---------- registrar ---------- */
  async function saida(){ const c=carDe(C.sel); if(!c||C.salv) return; if(abertaDe(c.id)){ msg('warn','Este carro já está fora. Registre a volta.'); return; }
    const m=motDe(C.f.mot), km=kmNum(C.f.km), esp=ultKm(c);
    if(!m){ campoErro('cv-mot','Escolha o motorista.'); return; } if(m.ok===false){ campoErro('cv-mot','Este motorista está bloqueado.'); return; }
    if(!Number.isFinite(km)||km<=0){ campoErro('cv-km','Digite o km do painel do carro.'); return; }
    if(km<esp){ campoErro('cv-km','O km não pode ser menor que o último registrado ('+fK(esp)+' km).'); return; }
    if(km!==esp&&!C.f.conf){ C.f.conf=true; P.render(); return; }
    const outro=C.fora.find(v=>v.mot===m.id&&v.aberta); const id=novoId('v'), agora=new Date().toISOString();
    const doc={carro:c.id,placa:c.placa,modelo:c.modelo||'',mot:m.id,motNome:m.nome,kmS:km,emS:agora,diaS:hoje(),porS:S.uid||null,porSN:eu(),obsS:String(C.f.obs||'').trim().slice(0,300),kmEsp:esp,kmDif:km!==esp,aberta:true};
    C.salv=true; P.render();
    try{ await P.db().doc('carrosv/'+id).set(doc); await P.db().doc('carrosk/'+c.id).set({km,em:agora,viagem:id,placa:c.placa});
      C.fora=C.fora.concat([Object.assign({_id:id},doc)]); C.sel=null; msg('ok','Saída registrada: '+plT(c.placa)+' com '+m.nome+' · '+fK(km)+' km.'+(outro?' Atenção: '+m.nome+' já estava com o '+plT(outro.placa)+'.':'')); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  async function volta(){ const c=carDe(C.sel), a=c&&abertaDe(c.id); if(!a||C.salv) return; const km=kmNum(C.f.km);
    if(!Number.isFinite(km)||km<=0){ campoErro('cv-km','Digite o km do painel do carro.'); return; }
    if(km<+a.kmS){ campoErro('cv-km','O km da volta não pode ser menor que o da saída ('+fK(a.kmS)+' km).'); return; }
    if(km-a.kmS>1500&&!C.f.conf){ C.f.conf=true; P.render(); return; }
    const agora=new Date().toISOString(), up={kmV:km,emV:agora,porV:S.uid||null,porVN:eu(),obsV:String(C.f.obs||'').trim().slice(0,300),rodou:km-(+a.kmS||0),aberta:false};
    C.salv=true; P.render();
    try{ await P.db().doc('carrosv/'+a._id).update(up); await P.db().doc('carrosk/'+c.id).set({km,em:agora,viagem:a._id,placa:c.placa});
      C.fora=C.fora.filter(v=>v._id!==a._id); C.sel=null; msg('ok','Volta registrada: '+plT(c.placa)+' · '+a.motNome+' rodou '+fK(up.rodou)+' km.'); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  function campoErro(id,t){ C.f.err={id,t}; P.render(); setTimeout(()=>{ const i=document.getElementById(id); if(i) i.focus(); },40); }

  /* ---------- tela da portaria ---------- */
  function vPortaria(){ if(!lido()) return '<section class="card"><div class="empty">Carregando os carros…</div></section>';
    const cs=ativos(), fora=cs.filter(c=>abertaDe(c.id)), dentro=cs.filter(c=>!abertaDe(c.id)), h=hoje();
    const mv=C.viag.filter(v=>!v.removido&&(v.diaS===h||diaDe(v.emV)===h)).slice(0,8);
    const topo=`<header class="cv-top"><div><h1>Portaria · carros</h1><p>${fora.length} fora · ${dentro.length} na empresa</p></div></header>`;
    const aviso=C.msg?`<div class="cv-msg ${C.msg.t}" role="status">${esc(C.msg.x)}</div>`:'';
    if(!cs.length) return topo+`<section class="card cv-vz"><h2>Nenhum carro cadastrado</h2><p>O administrador cadastra os carros em Carros › Carros e motoristas.</p></section>`;
    if(C.sel) return topo+aviso+vFluxo();
    const cam=C.cam.on?`<section class="card cv-cam"><div class="cv-vw"><video id="cv-video" playsinline muted autoplay></video><span class="cv-mira" aria-hidden="true"></span></div><p>Aponte para o QR code colado no carro.</p><button type="button" class="btn sec" data-act="cv-camx">Cancelar</button></section>`
      :`<button type="button" class="cv-scan" data-act="cv-cam"><span class="cv-qric" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2h-2zM19 15h2M15 19h2M19 19v2h2v-2M12 3v4M12 11v2h-2M3 12h4"/></svg></span><b>Escanear QR do carro</b><small>ou toque na placa abaixo</small></button>${C.cam.erro?`<p class="cv-err">${esc(C.cam.erro)}</p>`:''}`;
    const lin=(c,a)=>`<button type="button" class="cv-car${a?' fora':''}" data-act="cv-abre" data-v="${esc(c.id)}">${placa(c)}<span class="cv-cari">${a?`<b>${esc(a.motNome)}</b><small>saiu ${esc(quando(a.emS))} · há ${esc(dur(Date.now()-new Date(a.emS).getTime()))}</small>`:`<b>${esc(c.modelo||'')}</b><small>${fK(ultKm(c))} km</small>`}</span><span class="cv-acao">${a?'Volta':'Saída'}</span></button>`;
    return topo+aviso+cam+`<div class="cv-cols"><section class="card"><h2>Fora agora <span>${fora.length}</span></h2>${fora.length?fora.map(c=>lin(c,abertaDe(c.id))).join(''):'<p class="cv-nada">Todos os carros estão na empresa.</p>'}</section>
      <section class="card"><h2>Na empresa <span>${dentro.length}</span></h2>${dentro.length?dentro.map(c=>lin(c,null)).join(''):'<p class="cv-nada">Todos os carros estão fora.</p>'}</section></div>
      ${mv.length?`<section class="card"><h2>Movimentos de hoje</h2><ul class="cv-mv">${mv.map(v=>`<li>${placa(v.placa,'p')}<span><b>${esc(v.motNome)}</b><small>saída ${esc(hm(v.emS))} · ${fK(v.kmS)} km${v.emV?` — volta ${esc(hm(v.emV))} · ${fK(v.kmV)} km · rodou ${fK(v.rodou)} km`:' — ainda fora'}</small></span></li>`).join('')}</ul></section>`:''}`; }
  function vFluxo(){ const c=carDe(C.sel), a=abertaDe(c.id), uk=ultKm(c), F=C.f, er=F.err||{}, kmv=kmNum(F.km);
    const errDe=id=>er.id===id?`<p class="cv-err" id="${id}-e">${esc(er.t)}</p>`:'';
    const cab=`<div class="cv-fc">${placa(c,'g')}<div><b>${esc(c.modelo||'Carro')}</b><small>${a?'Está fora · registrar a volta':'Na empresa · registrar a saída'}</small></div></div>`;
    if(a){ const rod=Number.isFinite(kmv)&&kmv>=a.kmS?kmv-a.kmS:null;
      return `<section class="card cv-fl"><h2>Volta</h2>${cab}<dl class="cv-dl"><div><dt>Saiu com</dt><dd>${esc(a.motNome)}</dd></div><div><dt>Saída</dt><dd>${esc(quando(a.emS))}</dd></div><div><dt>Km na saída</dt><dd>${fK(a.kmS)}</dd></div>${a.obsS?`<div><dt>Observação da saída</dt><dd>${esc(a.obsS)}</dd></div>`:''}</dl>
        <label class="cv-lb" for="cv-km">Km na volta</label><input id="cv-km" class="cv-in cv-kmi" inputmode="numeric" autocomplete="off" placeholder="${esc(fK(a.kmS))}" value="${esc(F.km)}" data-cvf="km"${er.id==='cv-km'?' aria-invalid="true" aria-describedby="cv-km-e"':''}>${errDe('cv-km')}
        <p class="cv-rod" id="cv-rod">${rod!=null?'Rodou <b>'+fK(rod)+' km</b>':''}</p>
        <label class="cv-lb" for="cv-obs">Observação <small>(opcional)</small></label><input id="cv-obs" class="cv-in" autocomplete="off" placeholder="Ex.: chegou com o pneu baixo" value="${esc(F.obs)}" data-cvf="obs" maxlength="300">
        ${F.conf?`<p class="cv-conf">O carro rodou ${fK(rod)} km nesta viagem. Confere o km? Toque de novo para confirmar.</p>`:''}
        <div class="cv-bts"><button type="button" class="btn sec" data-act="cv-volta-x">Cancelar</button><button type="button" class="btn" data-act="cv-volta"${C.salv?' disabled':''}>${C.salv?'Salvando…':F.conf?'Confirmar volta':'Registrar volta'}</button></div></section>`; }
    const ls=liberados();
    return `<section class="card cv-fl"><h2>Saída</h2>${cab}<dl class="cv-dl"><div><dt>Último km</dt><dd>${fK(uk)}</dd></div></dl>
      <label class="cv-lb" for="cv-mot">Motorista</label>
      ${ls.length?`<select id="cv-mot" class="cv-in" data-cvf="mot"${er.id==='cv-mot'?' aria-invalid="true" aria-describedby="cv-mot-e"':''}><option value="">Escolha o motorista</option>${ls.map(m=>`<option value="${esc(m.id)}"${F.mot===m.id?' selected':''}>${esc(m.nome)}</option>`).join('')}</select>`:'<p class="cv-err">Nenhum motorista liberado. Fale com o administrador.</p>'}${errDe('cv-mot')}
      <label class="cv-lb" for="cv-km">Km na saída</label><input id="cv-km" class="cv-in cv-kmi" inputmode="numeric" autocomplete="off" value="${esc(F.km)}" data-cvf="km"${er.id==='cv-km'?' aria-invalid="true" aria-describedby="cv-km-e"':''}>${errDe('cv-km')}
      <label class="cv-lb" for="cv-obs">Observação <small>(opcional)</small></label><input id="cv-obs" class="cv-in" autocomplete="off" placeholder="Ex.: destino, avaria, carro sujo" value="${esc(F.obs)}" data-cvf="obs" maxlength="300">
      ${F.conf?`<p class="cv-conf">O km digitado (${fK(kmv)}) é diferente do último registrado (${fK(uk)}): ${fK(kmv-uk)} km sem registro. A saída fica marcada para o administrador ver. Toque de novo para confirmar.</p>`:''}
      <div class="cv-bts"><button type="button" class="btn sec" data-act="cv-volta-x">Cancelar</button><button type="button" class="btn" data-act="cv-saida"${C.salv||!ls.length?' disabled':''}>${C.salv?'Salvando…':F.conf?'Confirmar saída':'Registrar saída'}</button></div></section>`; }

  /* ---------- viagens (adm) ---------- */
  function periodo(){ const q=C.q, h=hoje(); if(q.per==='hoje') return [h,h]; if(q.per==='7') return [addD(h,-6),h]; if(q.per==='30') return [addD(h,-29),h]; if(q.per==='mes') return [h.slice(0,8)+'01',h];
    if(q.per==='datas') return [q.de||'0000-00-00',q.ate||'9999-99-99']; return ['0000-00-00','9999-99-99']; }
  function filtradas(){ const [de,ate]=periodo(), q=C.q; return C.viag.filter(v=>!v.removido&&(v.diaS||diaDe(v.emS))>=de&&(v.diaS||diaDe(v.emS))<=ate&&(!q.car||v.carro===q.car)&&(!q.mot||v.mot===q.mot)
    &&(!q.st||(q.st==='fora'?v.aberta:q.st==='dif'?v.kmDif:!v.aberta))); }
  function vViagens(){ if(!lido()||!C.lido.hist) return '<section class="card"><div class="empty">Carregando as viagens…</div></section>';
    const xs=filtradas(), q=C.q, km=xs.reduce((a,v)=>a+(+v.rodou||0),0), dif=xs.filter(v=>v.kmDif), fora=C.fora;
    const porC={}, porM={}; xs.forEach(v=>{ const r=+v.rodou||0; const a=porC[v.carro]=porC[v.carro]||{placa:v.placa,km:0,n:0}; a.km+=r; a.n++; const b=porM[v.mot]=porM[v.mot]||{nome:v.motNome,km:0,n:0}; b.km+=r; b.n++; });
    const mx=o=>Math.max(1,...Object.values(o).map(x=>x.km));
    const sel=(id,val,ops)=>`<select id="${id}" class="cv-fs">${ops.map(([v,t])=>`<option value="${esc(v)}"${val===v?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
    const filtros=`<div class="cv-fil">${sel('cv-q-per',q.per,[['hoje','Hoje'],['7','Últimos 7 dias'],['30','Últimos 30 dias'],['mes','Este mês'],['tudo','Tudo'],['datas','Entre datas']])}
      ${q.per==='datas'?`<input type="date" id="cv-q-de" class="cv-fs" value="${esc(q.de)}" aria-label="De"><input type="date" id="cv-q-ate" class="cv-fs" value="${esc(q.ate)}" aria-label="Até">`:''}
      ${sel('cv-q-car',q.car,[['','Todos os carros']].concat(carros().map(c=>[c.id,plT(c.placa)+(c.modelo?' · '+c.modelo:'')])))}
      ${sel('cv-q-mot',q.mot,[['','Todos os motoristas']].concat(mots().map(m=>[m.id,m.nome])))}
      ${sel('cv-q-st',q.st,[['','Todas'],['fora','Ainda fora'],['ok','Voltaram'],['dif','Km diferente']])}
      ${q.car||q.mot||q.st||q.per!=='7'?'<button type="button" class="lnk" data-act="cv-q-limpa">Limpar filtros</button>':''}<button type="button" class="btn sec" data-act="cv-csv">Planilha</button></div>`;
    const kpi=`<div class="cv-kpi"><div><b>${xs.length}</b><span>viagens</span></div><div><b>${fK(km)}</b><span>km rodados</span></div><div><b class="${fora.length?'info':''}">${fora.length}</b><span>carros fora agora</span></div><div><b class="${dif.length?'warn':''}">${dif.length}</b><span>com km diferente</span></div></div>`;
    const bar=(o,nm)=>Object.values(o).sort((a,b)=>b.km-a.km).map(x=>`<div class="cv-hb"><span>${nm(x)}</span><span class="cv-bar"><i style="width:${(x.km/mx(o)*100).toFixed(0)}%"></i></span><b>${fK(x.km)} km</b><small>${x.n} viage${x.n>1?'ns':'m'}</small></div>`).join('');
    const lista=xs.length?`<div class="cv-tw"><table class="cv-tb"><thead><tr><th>Carro</th><th>Motorista</th><th>Saída</th><th class="dir">Km saída</th><th>Volta</th><th class="dir">Km volta</th><th class="dir">Rodou</th><th>Observação</th>${adm()?'<th></th>':''}</tr></thead><tbody>
      ${xs.map(v=>`<tr class="${v.aberta?'fora':''}"><td>${placa(v.placa,'p')}</td><td>${esc(v.motNome||'')}</td><td>${esc(quando(v.emS))}<small>${esc(v.porSN||'')}</small></td><td class="dir">${fK(v.kmS)}${v.kmDif?`<small class="warn" title="Último km registrado: ${esc(fK(v.kmEsp))}">+${fK((+v.kmS||0)-(+v.kmEsp||0))} sem registro</small>`:''}</td>
        <td>${v.aberta?'<span class="cv-tag info">Ainda fora</span>':esc(quando(v.emV))+'<small>'+esc(v.porVN||'')+'</small>'}</td><td class="dir">${v.aberta?'—':fK(v.kmV)}</td><td class="dir"><b>${v.aberta?'—':fK(v.rodou)}</b></td>
        <td>${esc([v.obsS,v.obsV].filter(Boolean).join(' · '))}${v.corrigido?`<small>corrigido por ${esc(v.corrigido.por||'')}</small>`:''}</td>${adm()?`<td><button type="button" class="lnk" data-act="cv-ved" data-v="${esc(v._id)}">Corrigir</button></td>`:''}</tr>`).join('')}</tbody></table></div>`:'<p class="cv-nada">Nenhuma viagem com esses filtros.</p>';
    return `<header class="cv-top"><div><h1>Viagens dos carros</h1><p>Saídas e voltas registradas na portaria</p></div></header>${C.edV?vEdV():''}
      <section class="card">${filtros}${kpi}</section>
      ${xs.length?`<div class="cv-cols"><section class="card"><h2>Km por carro</h2>${bar(porC,x=>placa(x.placa,'p'))}</section><section class="card"><h2>Km por motorista</h2>${bar(porM,x=>esc(x.nome))}</section></div>`:''}
      <section class="card"><h2>Viagens <span>${xs.length}</span></h2>${lista}</section>`; }
  function vEdV(){ const v=C.viag.find(x=>x._id===C.edV)||C.fora.find(x=>x._id===C.edV); if(!v) return ''; const E=C.f.ed||{};
    return `<section class="card cv-ed"><h2>Corrigir viagem · ${placa(v.placa,'p')} · ${esc(v.motNome||'')}</h2>
      <div class="cv-g3"><label>Motorista<select id="cv-e-mot" class="cv-in">${mots().map(m=>`<option value="${esc(m.id)}"${(E.mot||v.mot)===m.id?' selected':''}>${esc(m.nome)}</option>`).join('')}</select></label>
      <label>Km na saída<input id="cv-e-kms" class="cv-in" inputmode="numeric" value="${esc(E.kmS!=null?E.kmS:v.kmS)}"></label>
      <label>Km na volta<input id="cv-e-kmv" class="cv-in" inputmode="numeric" value="${esc(E.kmV!=null?E.kmV:(v.kmV!=null?v.kmV:''))}" placeholder="${v.aberta?'ainda fora':''}"></label></div>
      ${E.err?`<p class="cv-err">${esc(E.err)}</p>`:''}
      <div class="cv-bts"><button type="button" class="lnk cv-del" data-act="cv-vdel">${E.del?'Toque de novo para apagar a viagem':'Apagar viagem'}</button><span style="flex:1"></span><button type="button" class="btn sec" data-act="cv-vedx">Cancelar</button><button type="button" class="btn" data-act="cv-vsalva">${v.aberta?'Salvar (e encerrar se tiver km da volta)':'Salvar correção'}</button></div></section>`; }
  async function salvaEdV(){ const v=C.viag.find(x=>x._id===C.edV)||C.fora.find(x=>x._id===C.edV); if(!v) return;
    const mot=(document.getElementById('cv-e-mot')||{}).value||v.mot, kmS=kmNum((document.getElementById('cv-e-kms')||{}).value), kvT=String((document.getElementById('cv-e-kmv')||{}).value||'').trim(), kmV=kvT?kmNum(kvT):null;
    const err=t=>{ C.f.ed={mot,kmS:(document.getElementById('cv-e-kms')||{}).value,kmV:kvT,err:t}; P.render(); };
    if(!Number.isFinite(kmS)||kmS<=0) return err('Digite o km da saída.'); if(kmV!=null&&(!Number.isFinite(kmV)||kmV<kmS)) return err('O km da volta não pode ser menor que o da saída.');
    const m=motDe(mot), up={mot,motNome:m?m.nome:v.motNome,kmS,corrigido:{por:eu(),em:new Date().toISOString(),antes:{mot:v.mot,kmS:v.kmS,kmV:v.kmV==null?null:v.kmV}}};
    if(kmV!=null){ up.kmV=kmV; up.rodou=kmV-kmS; if(v.aberta){ Object.assign(up,{aberta:false,emV:new Date().toISOString(),porV:S.uid||null,porVN:eu(),obsV:'Encerrada pelo administrador'}); } }
    try{ await P.db().doc('carrosv/'+v._id).update(up); if(kmV!=null||v.aberta){ const k=C.km[v.carro]; const nk=kmV!=null?kmV:kmS; if(!k||k.viagem===v._id) await P.db().doc('carrosk/'+v.carro).set({km:nk,em:new Date().toISOString(),viagem:v._id,placa:v.placa}); }
      C.edV=null; C.f.ed=null; P.toast('Viagem corrigida.'); }catch(e){ P.erro(e); } P.render(); }
  function csv(){ const xs=filtradas(); const L=[['Placa','Modelo','Motorista','Saída','Km saída','Último km antes','Km sem registro','Volta','Km volta','Rodou','Porteiro saída','Porteiro volta','Observação']];
    const dt=iso=>iso?new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
    xs.forEach(v=>L.push([plT(v.placa),v.modelo||'',v.motNome||'',dt(v.emS),v.kmS,v.kmEsp==null?'':v.kmEsp,v.kmDif?(+v.kmS)-(+v.kmEsp):'',v.aberta?'ainda fora':dt(v.emV),v.aberta?'':v.kmV,v.aberta?'':v.rodou,v.porSN||'',v.porVN||'',[v.obsS,v.obsV].filter(Boolean).join(' · ')]));
    const txt='﻿'+L.map(r=>r.map(c=>{ const s=String(c==null?'':c); return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(';')).join('\r\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'})); a.download='viagens-carros-'+hoje()+'.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); }

  /* ---------- carros e motoristas (adm) ---------- */
  function vCad(){ if(!C.lido.cad) return '<section class="card"><div class="empty">Carregando…</div></section>'; const ok=adm(), ab=C.abaCad;
    const abas=`<div class="cv-abas" role="tablist">${[['carros','Carros',carros().length],['mot','Motoristas',mots().length]].map(([k,t,n])=>`<button type="button" role="tab" aria-selected="${ab===k}" class="cv-aba${ab===k?' on':''}" data-act="cv-aba" data-v="${k}">${t} <span>${n}</span></button>`).join('')}</div>`;
    let corpo='';
    if(ab==='carros'){ const E=C.edC||{};
      corpo=`${ok?`<section class="card cv-ed"><h2>${E.id?'Editar carro':'Cadastrar carro'}</h2><div class="cv-g3">
          <label>Placa<input id="cv-c-pl" class="cv-in" autocomplete="off" maxlength="8" placeholder="ABC1D23" value="${esc(E.placa||'')}" style="text-transform:uppercase"></label>
          <label>Modelo<input id="cv-c-mo" class="cv-in" autocomplete="off" placeholder="Fiat Strada branca" value="${esc(E.modelo||'')}"></label>
          <label>Km atual<input id="cv-c-km" class="cv-in" inputmode="numeric" autocomplete="off" placeholder="45230" value="${esc(E.km!=null?E.km:'')}"></label></div>
          ${E.err?`<p class="cv-err">${esc(E.err)}</p>`:''}
          <div class="cv-bts">${E.id?'<button type="button" class="btn sec" data-act="cv-c-x">Cancelar</button>':''}<button type="button" class="btn" data-act="cv-c-salva"${C.salv?' disabled':''}>${E.id?'Salvar':'Cadastrar carro'}</button></div></section>`:''}
        <section class="card"><div class="cv-h2b"><h2>Carros <span>${carros().length}</span></h2>${carros().length?`<button type="button" class="btn sec" data-act="cv-qr">Imprimir QR codes (PDF)</button>`:''}</div>
        ${carros().length?carros().slice().sort((a,b)=>(a.ativo===false)-(b.ativo===false)||a.placa.localeCompare(b.placa)).map(c=>{ const a=abertaDe(c.id); return `<div class="cv-cr${c.ativo===false?' ina':''}">${placa(c)}<div class="cv-cari"><b>${esc(c.modelo||'')}</b><small>${fK(ultKm(c))} km · ${c.ativo===false?'desativado':a?'fora com '+esc(a.motNome):'na empresa'}</small></div>
          ${ok?`<div class="cv-ac"><button type="button" class="lnk" data-act="cv-qr1" data-v="${esc(c.id)}">QR</button><button type="button" class="lnk" data-act="cv-c-ed" data-v="${esc(c.id)}">Editar</button><button type="button" class="lnk" data-act="cv-c-at" data-v="${esc(c.id)}">${c.ativo===false?'Reativar':'Desativar'}</button></div>`:''}</div>`; }).join(''):'<p class="cv-nada">Cadastre o primeiro carro acima.</p>'}</section>`; }
    else { const E=C.edM||{};
      corpo=`${ok?`<section class="card cv-ed"><h2>${E.id?'Editar motorista':'Cadastrar motorista'}</h2><div class="cv-g2"><label>Nome<input id="cv-m-no" class="cv-in" autocomplete="off" placeholder="Nome e sobrenome" value="${esc(E.nome||'')}"></label></div>
          ${E.err?`<p class="cv-err">${esc(E.err)}</p>`:''}<div class="cv-bts">${E.id?'<button type="button" class="btn sec" data-act="cv-m-x">Cancelar</button>':''}<button type="button" class="btn" data-act="cv-m-salva"${C.salv?' disabled':''}>${E.id?'Salvar':'Cadastrar motorista'}</button></div></section>`:''}
        <section class="card"><h2>Motoristas <span>${liberados().length} liberados · ${mots().length-liberados().length} bloqueados</span></h2>
        ${mots().length?mots().map(m=>`<div class="cv-cr${m.ok===false?' ina':''}"><div class="cv-cari"><b>${esc(m.nome)}</b><small>${m.ok===false?'Bloqueado'+(m.bloqEm?' em '+esc(brD(diaDe(m.bloqEm))):''):'Liberado'}</small></div><span class="cv-tag ${m.ok===false?'crit':'ok'}">${m.ok===false?'Bloqueado':'Liberado'}</span>
          ${ok?`<div class="cv-ac"><button type="button" class="lnk" data-act="cv-m-ed" data-v="${esc(m.id)}">Editar</button><button type="button" class="lnk${m.ok===false?'':' cv-del'}" data-act="cv-m-bl" data-v="${esc(m.id)}">${m.ok===false?'Liberar':'Bloquear'}</button></div>`:''}</div>`).join(''):'<p class="cv-nada">Cadastre os motoristas que podem sair com os carros.</p>'}</section>`; }
    return `<header class="cv-top"><div><h1>Carros e motoristas</h1><p>Quem cadastra e libera é o administrador; a portaria só escolhe da lista</p></div></header>${abas}${corpo}`; }
  async function salvaCarro(){ const pl=plN((document.getElementById('cv-c-pl')||{}).value), mo=String((document.getElementById('cv-c-mo')||{}).value||'').trim(), kmT=(document.getElementById('cv-c-km')||{}).value, km=String(kmT||'').trim()?kmNum(kmT):0;
    const E=C.edC||{}; const err=t=>{ C.edC=Object.assign({},E,{placa:pl,modelo:mo,km:kmT,err:t}); P.render(); };
    if(!PL_RE.test(pl)) return err('Placa inválida. Use o formato ABC1234 ou ABC1D23.'); if(!Number.isFinite(km)||km<0) return err('Km inválido.');
    if(carros().some(c=>plN(c.placa)===pl&&c.id!==E.id)) return err('Já existe um carro com esta placa.');
    const novo={carros:(C.cad.carros||[]).map(c=>Object.assign({},c)),mot:C.cad.mot||[]};
    if(E.id){ const c=novo.carros.find(x=>x.id===E.id); if(c) Object.assign(c,{placa:pl,modelo:mo,km}); } else novo.carros.push({id:novoId('c'),placa:pl,modelo:mo,km,ativo:true,em:new Date().toISOString()});
    if(await gravaCad(novo,E.id?'Carro salvo.':'Carro '+plT(pl)+' cadastrado. Imprima o QR code para colar no carro.')) C.edC=null; P.render(); }
  async function salvaMot(){ const no=String((document.getElementById('cv-m-no')||{}).value||'').trim().replace(/\s+/g,' '), E=C.edM||{}; const err=t=>{ C.edM=Object.assign({},E,{nome:no,err:t}); P.render(); };
    if(no.length<3) return err('Digite o nome do motorista.'); if(mots().some(m=>m.nome.toLowerCase()===no.toLowerCase()&&m.id!==E.id)) return err('Este motorista já está cadastrado.');
    const novo={carros:C.cad.carros||[],mot:(C.cad.mot||[]).map(m=>Object.assign({},m))};
    if(E.id){ const m=novo.mot.find(x=>x.id===E.id); if(m) m.nome=no; } else novo.mot.push({id:novoId('m'),nome:no,ok:true,em:new Date().toISOString()});
    if(await gravaCad(novo,E.id?'Motorista salvo.':no+' cadastrado e liberado.')) C.edM=null; P.render(); }

  /* ---------- QR codes em PDF (placa + QR, para colar no carro) ---------- */
  const urlDe=c=>location.origin+location.pathname+'?carro='+c.id;
  let _logoPdf=null;
  function logoPdf(){ if(_logoPdf) return Promise.resolve(_logoPdf); return new Promise(res=>{ const i=new Image(); i.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; c.getContext('2d').drawImage(i,0,0); _logoPdf=c.toDataURL('image/png'); res(_logoPdf); }catch(e){ res(null); } }; i.onerror=()=>res(null); i.src=LOGO_ESC; }); }
  async function qrPdf(cs){ if(!window.jspdf||!window.jspdf.jsPDF){ P.toast('Gerador de PDF indisponível. Recarregue a página.'); return; } if(typeof window.qrcode!=='function'){ P.toast('Gerador de QR indisponível. Recarregue a página.'); return; }
    if(!cs.length){ P.toast('Nenhum carro ativo para imprimir.'); return; }
    const pdf=new window.jspdf.jsPDF('p','mm','a4'), W=90, H=120, gx=10, gy=10, x0=(210-2*W-gx)/2, y0=(297-2*H-gy)/2, logo=await logoPdf();
    cs.forEach((c,i)=>{ const k=i%4; if(i&&!k) pdf.addPage(); const x=x0+(k%2)*(W+gx), y=y0+Math.floor(k/2)*(H+gy);
      pdf.setDrawColor(170); pdf.setLineWidth(0.2); pdf.setLineDashPattern([1.5,1.5],0); pdf.rect(x,y,W,H); pdf.setLineDashPattern([],0);
      /* placa */ const px=x+8, py=y+8, pw=W-16, ph=26; pdf.setDrawColor(20); pdf.setLineWidth(0.6); pdf.setFillColor(255,255,255); pdf.roundedRect(px,py,pw,ph,2.5,2.5,'FD');
      pdf.setFillColor(0,51,153); pdf.rect(px+0.3,py+0.3,pw-0.6,7,'F'); pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.text('BRASIL',px+pw/2,py+5.2,{align:'center'});
      if(logo){ try{ pdf.addImage(logo,'PNG',px+pw-18.5,py+1.3,15.5,4.5); }catch(e){} }
      pdf.setTextColor(15,15,15); pdf.setFontSize(30); pdf.text(plN(c.placa),px+pw/2,py+21.5,{align:'center'}); pdf.setFontSize(6.5); pdf.text('BR',px+2.5,py+ph-2);
      /* QR */ const q=window.qrcode(0,'M'); q.addData(urlDe(c)); q.make(); const n=q.getModuleCount(), qs=56, m=qs/n, qx=x+(W-qs)/2, qy=y+40; pdf.setFillColor(0,0,0);
      for(let r=0;r<n;r++) for(let cc=0;cc<n;cc++) if(q.isDark(r,cc)) pdf.rect(qx+cc*m,qy+r*m,m+0.01,m+0.01,'F');
      pdf.setFontSize(11); pdf.setTextColor(30,30,30); pdf.text((c.modelo||'').slice(0,34),x+W/2,y+H-14,{align:'center'}); pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.setTextColor(90,90,90);
      pdf.text('Portaria: escaneie para registrar saída e volta',x+W/2,y+H-8,{align:'center'}); });
    pdf.save('qr-carros-'+hoje()+'.pdf'); }

  /* ---------- módulos e cargo ---------- */
  P.registrarModulo({ id:'portaria', nome:'Portaria · carros', ic:'portaria', telas:{ portaria:{nome:'Portaria',mob:'Portaria',render:vPortaria} }, iniciar:carregar });
  P.registrarModulo({ id:'carros', nome:'Carros', ic:'carro', telas:{ carviag:{nome:'Viagens',render:vViagens}, carcad:{nome:'Carros e motoristas',render:vCad} }, iniciar:carregar });
  P.registrarPerfil('portaria',{ nome:'Portaria (carros)', mods:['portaria'], pos:5, desc:'Só a tela da portaria: escaneia o QR do carro e registra a saída e a volta com o motorista e o km. Não vê nada da fábrica.' });
  /* porteiro entra direto na portaria; ?carro= abre o carro */
  { let foi=false; const t=setInterval(()=>{ try{ const A=S.acs; if(!A||!A.pronto) return; clearInterval(t); const d=A.doc||{};
      if(!foi&&!A.dono&&d.perfil==='portaria'&&S.view!=='portaria'&&P.viewOk('portaria')){ foi=true; P.go('portaria'); } abrirDaUrl(); }catch(e){ clearInterval(t); } },400); }
  P.registrarAviso(()=>{ if(!lido()||!adm()) return []; const xs=[], ag=Date.now();
    const velhos=C.fora.filter(v=>ag-new Date(v.emS).getTime()>14*3600e3); if(velhos.length) xs.push({nivel:'warn',rotulo:'Carros',titulo:velhos.length+(velhos.length>1?' carros fora há mais de 14 horas':' carro fora há mais de 14 horas'),texto:velhos.map(v=>plT(v.placa)+' com '+v.motNome).join(', '),go:'carviag'});
    const dif=C.viag.filter(v=>v.kmDif&&!v.removido&&(v.diaS||'')>=addD(hoje(),-6)); if(dif.length) xs.push({nivel:'warn',rotulo:'Carros',titulo:dif.length+(dif.length>1?' saídas':' saída')+' com km diferente do último registro',texto:'Nos últimos 7 dias: '+dif.slice(0,3).map(v=>plT(v.placa)+' +'+fK((+v.kmS)-(+v.kmEsp))+' km').join(', '),go:'carviag'});
    return xs; });

  /* ---------- eventos ---------- */
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.dataset) return; const k=t.dataset.cvf; if(!k) return; C.f[k]=t.value; if(C.f.err&&C.f.err.id===t.id){ C.f.err=null; const e=document.getElementById(t.id+'-e'); if(e) e.remove(); t.removeAttribute('aria-invalid'); }
    if(k==='km'){ C.f.conf=false; const a=C.sel&&abertaDe(C.sel), r=document.getElementById('cv-rod'); if(a&&r){ const n=kmNum(t.value); r.innerHTML=Number.isFinite(n)&&n>=a.kmS?'Rodou <b>'+fK(n-a.kmS)+' km</b>':''; } } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t) return;
    if(t.dataset&&t.dataset.cvf){ C.f[t.dataset.cvf]=t.value; if(t.dataset.cvf==='mot'&&C.f.err&&C.f.err.id==='cv-mot'){ C.f.err=null; P.render(); } return; }
    const m={'cv-q-per':'per','cv-q-de':'de','cv-q-ate':'ate','cv-q-car':'car','cv-q-mot':'mot','cv-q-st':'st'}[t.id]; if(m){ C.q[m]=t.value; P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key!=='Enter') return; const t=ev.target; if(!t||!t.dataset||!t.dataset.cvf||t.tagName==='SELECT') return; ev.preventDefault(); const a=C.sel&&abertaDe(C.sel); if(a) volta(); else saida(); });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="cv-"]'); if(!b) return; const a=b.dataset.act, v=b.dataset.v; ev.preventDefault();
    if(a==='cv-cam') return camLiga(); if(a==='cv-camx'){ camDesliga(); P.render(); return; }
    if(a==='cv-abre'){ camDesliga(); return abrir(v); }
    if(a==='cv-volta-x'){ C.sel=null; C.f={mot:'',km:'',obs:'',conf:false}; P.render(); return; }
    if(a==='cv-saida'){ if(!pode()) return P.toast('Seu acesso é só para ver.'); return saida(); }
    if(a==='cv-volta'){ if(!pode()) return P.toast('Seu acesso é só para ver.'); return volta(); }
    if(a==='cv-q-limpa'){ C.q={per:'7',de:'',ate:'',car:'',mot:'',st:''}; P.render(); return; }
    if(a==='cv-csv') return csv();
    if(a==='cv-aba'){ C.abaCad=v; P.render(); return; }
    if(!adm()&&/^cv-(c-|m-|qr|ved|vsalva|vdel)/.test(a)){ P.toast('Só o administrador muda o cadastro.'); return; }
    if(a==='cv-ved'){ C.edV=v; C.f.ed=null; P.render(); window.scrollTo({top:0,behavior:'smooth'}); return; } if(a==='cv-vedx'){ C.edV=null; C.f.ed=null; P.render(); return; }
    if(a==='cv-vsalva') return salvaEdV();
    if(a==='cv-vdel'){ const E=C.f.ed||{}; if(!E.del){ C.f.ed=Object.assign({},E,{del:true}); P.render(); return; } try{ await P.db().doc('carrosv/'+C.edV).update({removido:true,aberta:false,removidoPor:eu(),removidoEm:new Date().toISOString()}); C.edV=null; C.f.ed=null; P.toast('Viagem apagada.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='cv-c-salva') return salvaCarro(); if(a==='cv-c-x'){ C.edC=null; P.render(); return; }
    if(a==='cv-c-ed'){ const c=carDe(v); if(c){ C.edC={id:c.id,placa:c.placa,modelo:c.modelo,km:c.km}; P.render(); window.scrollTo({top:0,behavior:'smooth'}); } return; }
    if(a==='cv-c-at'){ const novo={carros:C.cad.carros.map(c=>c.id===v?Object.assign({},c,{ativo:c.ativo===false}):c),mot:C.cad.mot}; const c=novo.carros.find(x=>x.id===v); await gravaCad(novo,c&&c.ativo?'Carro reativado.':'Carro desativado: não aparece mais na portaria.'); return; }
    if(a==='cv-m-salva') return salvaMot(); if(a==='cv-m-x'){ C.edM=null; P.render(); return; }
    if(a==='cv-m-ed'){ const m=motDe(v); if(m){ C.edM={id:m.id,nome:m.nome}; P.render(); window.scrollTo({top:0,behavior:'smooth'}); } return; }
    if(a==='cv-m-bl'){ const ag=new Date().toISOString(); const novo={carros:C.cad.carros,mot:C.cad.mot.map(m=>m.id===v?Object.assign({},m,m.ok===false?{ok:true,libEm:ag,libPor:eu()}:{ok:false,bloqEm:ag,bloqPor:eu()}):m)}; const m=novo.mot.find(x=>x.id===v);
      await gravaCad(novo,m&&m.ok===false?m.nome+' bloqueado: não aparece mais na portaria.':m.nome+' liberado.'); return; }
    if(a==='cv-qr') return qrPdf(ativos()); if(a==='cv-qr1'){ const c=carDe(v); if(c) qrPdf([c]); return; } });
  /* sai da tela da portaria: desliga a câmera */
  setInterval(()=>{ if(CAM.stream&&P.S.view!=='portaria'){ camDesliga(); } },1000);

  document.head.insertAdjacentHTML('beforeend',`<style id="cv-css">
  .cv-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}.cv-top h1{margin:0;font-size:clamp(24px,3vw,30px);line-height:1.1}.cv-top p{margin:4px 0 0;color:var(--muted)}
  .cv-pl{--h:44px;display:inline-flex;flex-direction:column;height:var(--h);aspect-ratio:3.1/1;box-sizing:border-box;border:calc(var(--h)*.045) solid #111;border-radius:calc(var(--h)*.13);overflow:hidden;background:#fff;color:#111;vertical-align:middle;flex:none}
  .cv-plb{flex:0 0 24%;display:flex;align-items:center;justify-content:center;position:relative;background:#1f3d99;color:#fff}.cv-plb span{font:700 calc(var(--h)*.16)/1 Arial,Helvetica,sans-serif;letter-spacing:.14em}
  .cv-plb i{position:absolute;right:3.5%;top:14%;bottom:14%;width:19%;background:transparent center/contain no-repeat}
  .cv-plc{flex:1;position:relative;display:flex;align-items:center;justify-content:center;min-height:0}
  .cv-plc em{position:absolute;left:3.5%;bottom:7%;font:800 calc(var(--h)*.13)/1 Arial,Helvetica,sans-serif;font-style:normal;color:#111}
  .cv-plc b{font:700 calc(var(--h)*.5)/1 "Arial Narrow","Roboto Condensed",Arial,Helvetica,sans-serif;font-stretch:condensed;letter-spacing:.04em;white-space:nowrap;color:#111;transform:scaleY(1.15)}
  .cv-pl.p{--h:30px}.cv-pl.g{--h:84px}.cv-pl.p em{display:none}
  .cv-scan{all:unset;box-sizing:border-box;cursor:pointer;width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;padding:26px 16px;margin-bottom:14px;border-radius:16px;background:var(--nav,#163c52);color:#fff;text-align:center}
  .cv-scan b{font-size:20px}.cv-scan small{opacity:.8;font-size:14px}.cv-scan:focus-visible{outline:3px solid var(--teal);outline-offset:3px}.cv-qric svg{width:34px;height:34px}
  .cv-cam{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:14px}.cv-vw{position:relative;width:100%;max-width:520px;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:#000}
  .cv-vw video{width:100%;height:100%;object-fit:cover}.cv-mira{position:absolute;inset:18% 24%;border:3px solid #fff;border-radius:14px;box-shadow:0 0 0 999px rgba(0,0,0,.25)}.cv-cam p{margin:0;color:var(--muted)}
  .cv-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}.cv-cols>.card{margin:0}
  .card h2{font-size:17px;margin:0 0 8px}.card h2 span{color:var(--muted);font-weight:500;font-size:14px;margin-left:4px}
  .cv-car{all:unset;box-sizing:border-box;cursor:pointer;width:100%;display:flex;align-items:center;gap:12px;padding:10px 4px;border-top:1px solid var(--line);min-height:56px}.cv-car:first-of-type{border-top:0}
  .cv-car:hover{background:color-mix(in srgb,var(--teal) 5%,transparent)}.cv-car:focus-visible{outline:3px solid var(--teal);outline-offset:-2px}
  .cv-cari{display:flex;flex-direction:column;min-width:0;flex:1}.cv-cari small{color:var(--muted);font-size:13px}
  .cv-acao{font-weight:600;font-size:14px;padding:8px 14px;border-radius:10px;border:1px solid var(--line);white-space:nowrap}.cv-car.fora .cv-acao{background:var(--nav,#163c52);color:#fff;border-color:transparent}
  .cv-nada{color:var(--muted);margin:6px 0}.cv-err{color:var(--crit-ink,var(--crit));margin:6px 0 0;font-size:14px;font-weight:500}
  .cv-msg{padding:14px 16px;border-radius:12px;margin-bottom:14px;font-size:16px;font-weight:600}.cv-msg.ok{background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok-ink,var(--ok))}.cv-msg.warn{background:color-mix(in srgb,var(--warn) 22%,transparent);color:var(--warn-ink,var(--warn))}
  .cv-fl{max-width:620px}.cv-fc{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:6px 0 12px}.cv-fc>div{display:flex;flex-direction:column}.cv-fc>div>b{font-size:18px}.cv-fc>div>small{color:var(--muted)}
  .cv-dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:0 0 6px}.cv-dl div{background:color-mix(in srgb,var(--line) 35%,transparent);border-radius:10px;padding:8px 12px}.cv-dl dt{font-size:12.5px;color:var(--muted)}.cv-dl dd{margin:0;font-weight:700;font-size:17px;font-variant-numeric:tabular-nums}
  .cv-lb{display:block;font-weight:600;margin:14px 0 6px}.cv-lb small{color:var(--muted);font-weight:400}
  .cv-in{width:100%;box-sizing:border-box;font:inherit;font-size:17px;min-height:50px;padding:0 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface,#fff);color:inherit}.cv-in[aria-invalid="true"]{border-color:var(--crit)}
  .cv-kmi{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.5px;min-height:58px}
  .cv-rod{margin:8px 0 0;font-size:17px;min-height:1.4em}.cv-rod b{color:var(--ok-ink,var(--ok))}
  .cv-conf{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn-ink,var(--warn));font-weight:500}
  .cv-bts{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}.cv-bts .btn{min-height:50px;padding:0 22px;font-size:16px}
  .cv-mv{list-style:none;margin:0;padding:0}.cv-mv li{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--line)}.cv-mv li:first-child{border-top:0}.cv-mv span{display:flex;flex-direction:column}.cv-mv small{color:var(--muted);font-size:13px}
  .cv-fil{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.cv-fs{font:inherit;font-size:14px;min-height:40px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface,#fff);color:inherit}
  .cv-fil .btn{margin-left:auto}
  .cv-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.cv-kpi div{display:flex;flex-direction:column}.cv-kpi b{font-size:24px;font-variant-numeric:tabular-nums}.cv-kpi span{font-size:13px;color:var(--muted)}.cv-kpi b.warn{color:var(--warn-ink,var(--warn))}.cv-kpi b.info{color:var(--teal)}
  .cv-hb{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:6px 0}.cv-hb small{color:var(--muted);font-size:12px;white-space:nowrap}.cv-hb b{white-space:nowrap;font-variant-numeric:tabular-nums}
  .cv-bar{display:block;height:8px;border-radius:999px;background:color-mix(in srgb,var(--line) 70%,transparent);overflow:hidden}.cv-bar i{display:block;height:100%;background:var(--teal);border-radius:999px}
  .cv-tw{overflow-x:auto}.cv-tb{width:100%;border-collapse:collapse;font-size:14px}.cv-tb th{font-size:12px;color:var(--muted);text-align:left;font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
  .cv-tb td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.cv-tb td small{display:block;color:var(--muted);font-size:12px}.cv-tb td small.warn{color:var(--warn-ink,var(--warn));font-weight:600}.cv-tb .dir{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.cv-tb tr.fora{background:color-mix(in srgb,var(--teal) 5%,transparent)}
  .cv-tag{font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;white-space:nowrap}.cv-tag.ok{background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok-ink,var(--ok))}.cv-tag.crit{background:color-mix(in srgb,var(--crit) 16%,transparent);color:var(--crit-ink,var(--crit))}.cv-tag.info{background:color-mix(in srgb,var(--teal) 14%,transparent);color:var(--teal)}
  .cv-abas{display:flex;gap:6px;margin-bottom:14px}.cv-aba{font:inherit;font-weight:600;padding:9px 16px;border-radius:999px;border:1px solid var(--line);background:transparent;color:inherit;cursor:pointer;min-height:42px}.cv-aba.on{background:var(--nav,#163c52);color:#fff;border-color:transparent}.cv-aba span{opacity:.7;font-weight:500}
  .cv-ed{margin-bottom:14px}.cv-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cv-g2{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;max-width:480px}.cv-g3 label,.cv-g2 label{display:flex;flex-direction:column;gap:6px;font-weight:600;font-size:14px}
  .cv-h2b{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}.cv-h2b h2{margin:0}
  .cv-cr{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line);flex-wrap:wrap}.cv-cr.ina{opacity:.6}.cv-ac{display:flex;gap:14px}.cv-del{color:var(--crit-ink,var(--crit))!important}
  .cv-vz p{color:var(--muted)}
  @media(max-width:760px){.cv-pl{--h:38px}.cv-pl.p{--h:28px}.cv-pl.g{--h:70px}.cv-cols{grid-template-columns:minmax(0,1fr)}.cv-g3{grid-template-columns:minmax(0,1fr)}.cv-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.cv-bts .btn{flex:1}.cv-fil .btn{margin-left:0}
    .cv-hb{grid-template-columns:minmax(0,1fr) auto}.cv-hb .cv-bar{grid-column:1/-1;grid-row:2}.cv-hb small{display:none}}
  </style>`);
})();
