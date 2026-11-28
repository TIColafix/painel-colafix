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
  const COMB=[['res','Reserva'],['1/4','1/4'],['1/2','1/2'],['3/4','3/4'],['cheio','Cheio']], combTxt=k=>(COMB.find(x=>x[0]===k)||[])[1]||'';
  const TERMO='Confirmo que estou saindo com este veículo, com o km registrado pela portaria, e que sou responsável por ele até a devolução na portaria.';
  const aceitePend=v=>!!(v&&v.precisaAceite&&!v.aceite&&!v.removido);
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
    P.inscrever('cv-cad',()=>P.db().doc('carros/cad'),g=>{ const d=g&&g.exists?g.data():{}; C.cad={carros:Array.isArray(d.carros)?d.carros:[],mot:Array.isArray(d.mot)?d.mot:[],termo:d.termo||null}; C.lido.cad=true; logoCss(); abrirDaUrl(); P.rerender(); });
    P.inscrever('cv-fora',()=>P.db().collection('carrosv').where('aberta','==',true).limit(200),s=>{ C.fora=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(v=>!v.removido); C.lido.fora=true; P.rerender(); });
    P.inscrever('cv-hist',()=>P.db().collection('carrosv').orderBy('emS','desc').limit(600),s=>{ C.viag=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(v=>!v.pedida&&!v.recusada&&!v.cancelada); C.lido.hist=true; P.rerender(); });
    /* 27/11 ("tudo dentro do painel, sem ntfy"): o vendedor pede a saída e entrega o carro pelo celular dele; a portaria só libera e recebe */
    P.inscrever('cv-ped',()=>P.db().collection('carrosv').where('pedida','==',true).limit(50),s=>{ const xs=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(v=>!v.removido&&!v.cancelada&&!v.recusada); somNovo('p',xs); C.ped=xs; P.rerender(); });
    P.inscrever('cv-devp',()=>P.db().collection('carrosv').where('devolPed','==',true).limit(50),s=>{ const xs=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(v=>!v.removido); somNovo('d',xs); C.devp=xs; P.rerender(); });
    P.inscrever('cv-km',()=>P.db().collection('carrosk').limit(300),s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data(); }); C.km=m; C.lido.km=true; P.rerender(); });
    if(adm()){ P.inscrever('cv-priv',()=>P.db().collection('carrosp').limit(300),s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data(); }); C.priv=m; P.rerender(); });
      P.inscrever('cv-termos',()=>P.db().collection('carrost').limit(500),s=>{ C.termos=s.docs.map(d=>Object.assign({_id:d.id},d.data())); P.rerender(); }); } }
  C.priv={}; C.termos=[]; C.ped=[]; C.devp=[]; C.kmM={}; C.mr={}; C.dv={};
  /* som e vibração na portaria quando chega pedido de saída ou devolução (a tela da portaria fica aberta) */
  const _vistosP={p:null,d:null};
  function somNovo(k,xs){ const ids=new Set(xs.map(v=>v._id)); if(_vistosP[k]===null){ _vistosP[k]=ids; return; } const novo=[...ids].some(i=>!_vistosP[k].has(i)); _vistosP[k]=ids;
    if(novo&&(P.S.view==='portaria'||P.S.view==='bdport')){ bip(); setTimeout(bip,220); try{ if(navigator.vibrate) navigator.vibrate([250,120,250]); }catch(e){} } }
  /* CPF (26/11, "cadastrar o nome e CPF do motorista para relatórios"): guardado à parte em carrosp/<motId> (só o adm e o próprio motorista leem) */
  const cpfL=v=>String(v||'').replace(/\D/g,'');
  const cpfOk=v=>{ const c=cpfL(v); if(c.length!==11||/^(\d)\1{10}$/.test(c)) return false; const dv=n=>{ let s=0; for(let i=0;i<n;i++) s+=+c[i]*(n+1-i); const r=(s*10)%11; return r===10?0:r; }; return dv(9)===+c[9]&&dv(10)===+c[10]; };
  const cpfF=v=>{ const c=cpfL(v); return c.length===11?c.slice(0,3)+'.'+c.slice(3,6)+'.'+c.slice(6,9)+'-'+c.slice(9):String(v||''); };
  const cpfM=v=>{ const c=cpfL(v); return c.length===11?'***.'+c.slice(3,6)+'.'+c.slice(6,9)+'-**':''; };
  const cpfDe=id=>(C.priv[id]||{}).cpf||'';
  /* termo de ciência (aceite único; nova versão = aceitar de novo) */
  const TERMO_CIENCIA=`TERMO DE CIÊNCIA E RESPONSABILIDADE · USO DE VEÍCULO DA EMPRESA

Eu, {NOME}, CPF {CPF}, declaro que estou ciente e de acordo com as regras abaixo para usar os veículos da Colafix:

1. Uso o veículo somente a serviço da empresa, nos trajetos e horários do meu trabalho.
2. Tenho Carteira Nacional de Habilitação válida e na categoria exigida, e aviso a empresa se ela for suspensa, cassada ou vencer.
3. Respeito as leis de trânsito. Multas por infração cometida enquanto eu estiver com o veículo poderão ser indicadas a mim como condutor, conforme a legislação de trânsito e a política interna.
4. Não empresto o veículo a outra pessoa e não transporto pessoas ou cargas sem autorização.
5. Registro a saída e a devolução no Painel da Colafix, confirmando o km, o estado do carro, avarias (com foto quando possível), abastecimento e limpeza, com informações verdadeiras.
6. Comunico na hora qualquer acidente, avaria, furto ou problema com o veículo.
7. Devolvo o veículo na portaria nas mesmas condições em que o recebi, salvo o desgaste normal de uso.
8. Estou ciente de que meu nome, CPF, horários, km, respostas e fotos ficam registrados para o controle da frota.`;
  const termoAtual=()=>{ const t=C.cad.termo; return t&&t.texto?t:{texto:TERMO_CIENCIA,versao:1}; };
  const termoPreenche=(tx,nome,cpf)=>String(tx).replace(/\{NOME\}/g,nome||'________').replace(/\{CPF\}/g,cpf?cpfF(cpf):'________');
  const termoDe=m=>{ const v=termoAtual().versao; return C.termos.filter(t=>t.motId===m.id||(m.uid&&t.uid===m.uid)).sort((a,b)=>(b.versao||0)-(a.versao||0)||String(b.em).localeCompare(String(a.em))).find(t=>t)||null; };
  const lido=()=>C.lido.cad&&C.lido.fora;
  async function gravaCad(novo,msg){ C.salv=true; P.render(); try{ const tm=novo.termo!==undefined?novo.termo:(C.cad.termo||null); await P.db().doc('carros/cad').set({carros:novo.carros,mot:novo.mot,termo:tm,em:new Date().toISOString(),por:S.uid||null}); C.cad=Object.assign({},novo,{termo:tm}); if(msg) P.toast(msg); return true; }
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
    if(!c){ if(P.S.view==='motorista'){ C.mr.err='Este QR não é de um carro cadastrado.'; P.render(); return; } msg('warn','Este QR não é de um carro cadastrado.'); return; } bip(); camDesliga();
    if(P.S.view==='motorista'){ motCarro(c.id); return; } abrir(c.id); }
  function abrir(id){ const c=carDe(id); if(!c) return; if(c.ativo===false){ msg('warn','O carro '+plT(c.placa)+' está desativado no cadastro. Fale com o administrador.'); return; }
    C.sel=id; const a=abertaDe(id); C.f={mot:'',km:a?'':String(ultKm(c)||''),obs:'',conf:false}; C.msg=null; if(P.S.view!=='portaria'&&P.viewOk('portaria')) P.go('portaria'); P.render();
    setTimeout(()=>{ const i=document.getElementById(a?'cv-km':'cv-mot'); if(i&&a) i.focus(); },60); }
  let _urlFeito=false;
  function abrirDaUrl(){ if(_urlFeito) return; const m=location.search.match(/[?&]carro=([A-Za-z0-9_-]+)/); if(!m) { _urlFeito=true; return; } if(!C.lido.cad||!P.viewOk('portaria')) return; _urlFeito=true;
    try{ history.replaceState(null,'',location.pathname+location.search.replace(/([?&])carro=[^&]*&?/,'$1').replace(/[?&]$/,'')+location.hash); }catch(e){}
    abrir(m[1]); }
  function msg(t,x,d){ C.msg={t,x,d:d||null}; P.render(); clearTimeout(msg._t); msg._t=setTimeout(()=>{ if(C.msg&&C.msg.d) _autoCam=true; C.msg=null; P.rerender(); },t==='ok'?6000:8000); }

  /* ---------- registrar ---------- */
  async function saida(){ const c=carDe(C.sel); if(!c||C.salv) return; if(abertaDe(c.id)){ msg('warn','Este carro já está fora. Registre a volta.'); return; }
    const m=motDe(C.f.mot), km=kmNum(C.f.km), esp=ultKm(c);
    if(!m){ campoErro('cv-mot','Escolha o motorista.'); return; } if(m.ok===false){ campoErro('cv-mot','Este motorista está bloqueado.'); return; }
    if(!Number.isFinite(km)||km<=0){ campoErro('cv-km','Digite o km do painel do carro.'); return; }
    if(km<esp){ campoErro('cv-km','O km não pode ser menor que o último registrado ('+fK(esp)+' km).'); return; }
    if(km!==esp&&!C.f.conf){ C.f.conf=true; P.render(); return; }
    const outro=C.fora.find(v=>v.mot===m.id&&v.aberta); const id=novoId('v'), agora=new Date().toISOString();
    const doc={carro:c.id,placa:c.placa,modelo:c.modelo||'',frota:c.frota||'',mot:m.id,motNome:m.nome,motUid:m.uid||null,precisaAceite:!!m.uid,aceite:null,kmS:km,emS:agora,diaS:hoje(),porS:S.uid||null,porSN:eu(),obsS:String(C.f.obs||'').trim().slice(0,300),kmEsp:esp,kmDif:km!==esp,aberta:true};
    C.salv=true; P.render();
    try{ await P.db().doc('carrosv/'+id).set(doc); await P.db().doc('carrosk/'+c.id).set({km,em:agora,viagem:id,placa:c.placa,fora:true,mot:m.nome});
      if(m.uid) avisaMot(m,'Confirme a saída com o '+plT(c.placa)+(c.frota?' (Frota '+c.frota+')':''),'A portaria registrou a sua saída com '+fK(km)+' km às '+hm(agora)+'. Abra o painel e confirme.');
      C.fora=C.fora.concat([Object.assign({_id:id},doc)]); C.sel=null; msg('ok','Saída registrada: '+plT(c.placa)+' com '+m.nome+' · '+fK(km)+' km.'+(outro?' Atenção: '+m.nome+' já estava com o '+plT(outro.placa)+'.':''),{tipo:'saida',placa:c.placa,frota:c.frota||'',mod:c.modelo||'',mot:m.nome,km,hora:hm(agora),aceite:m.uid?m.nome.split(' ')[0]:'',alerta:outro?m.nome+' já estava com o '+plT(outro.placa)+'.':(km!==esp?fK(km-esp)+' km sem registro desde a última viagem.':'')}); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  async function volta(){ const c=carDe(C.sel), a=c&&abertaDe(c.id); if(!a||C.salv) return; const km=kmNum(C.f.km);
    if(!Number.isFinite(km)||km<=0){ campoErro('cv-km','Digite o km do painel do carro.'); return; }
    if(km<+a.kmS){ campoErro('cv-km','O km da volta não pode ser menor que o da saída ('+fK(a.kmS)+' km).'); return; }
    if(km-a.kmS>1500&&!C.f.conf){ C.f.conf=true; P.render(); return; }
    const agora=new Date().toISOString(), up={kmV:km,emV:agora,porV:S.uid||null,porVN:eu(),obsV:String(C.f.obs||'').trim().slice(0,300),rodou:km-(+a.kmS||0),aberta:false};
    C.salv=true; P.render();
    try{ await P.db().doc('carrosv/'+a._id).update(up); await P.db().doc('carrosk/'+c.id).set({km,em:agora,viagem:a._id,placa:c.placa,fora:false});
      if(a.motUid){ const mm=motDe(a.mot); avisaMot(mm,'Confirme a devolução do '+plT(c.placa),'A portaria registrou a volta com '+fK(km)+' km às '+hm(agora)+'. Abra o painel, confira o km e responda as perguntas.'); }
      C.fora=C.fora.filter(v=>v._id!==a._id); C.sel=null; msg('ok','Volta registrada: '+plT(c.placa)+' · '+a.motNome+' rodou '+fK(up.rodou)+' km.',{tipo:'volta',placa:c.placa,frota:c.frota||'',mod:c.modelo||'',mot:a.motNome,km,rodou:up.rodou,hora:hm(agora),fora:dur(Date.now()-new Date(a.emS).getTime()),devol:a.motUid?(a.motNome||'').split(' ')[0]:''}); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  function campoErro(id,t){ C.f.err={id,t}; P.render(); setTimeout(()=>{ const i=document.getElementById(id); if(i) i.focus(); },40); }

  /* ---------- tela da portaria (26/11: "layout ainda muito básico") ----------
     faixa da portaria com os contadores e o botão de escanear; carros em cartões (fora / na empresa); movimentos do dia
     em linha do tempo; saída e volta com a placa grande, motoristas em botões e o km em destaque; confirmação em tela cheia */
  const ini=n=>String(n||'?').trim().split(/\s+/).filter(Boolean).map((w,i,a)=>i===0||i===a.length-1?w[0]:'').join('').toUpperCase().slice(0,2);
  const SVG={qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2h-2zM19 15h2M15 19h2M19 19v2h2v-2M12 3v4M12 11v2h-2M3 12h4"/></svg>',
    sai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    vol:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7L7 17M15 17H7V9"/></svg>',
    ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    rel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'};
  const DSEM=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  /* ---------- modo celular da portaria (26/11: "tem que ser específico para o celular, que nem o celular do almox") ----------
     o porteiro (cargo portaria) vê só o app da portaria em tela inteira: sem menu, sem barra do painel; barra própria com a
     logo, relógio, quem está e Sair; a câmera liga sozinha na tela inicial (como o celular do almox). A dona vê com ?portaria=1. */
  const soloDe=(tela,perfil)=>{ try{ const A=S.acs; if(!A||!A.pronto||S.view!==tela) return false; if(A.dono) return new RegExp('[?&]'+perfil+'=1').test(location.search); return (A.doc||{}).perfil===perfil; }catch(e){ return false; } };
  const solo=()=>soloDe('portaria','portaria');
  function appBar(tit){ const nm=eu(), ag=new Date(), sw=P.viewOk('bdport')?`<nav class="cv-sw" aria-label="Portaria"><button type="button" data-go="bdport" aria-pressed="${S.view==='bdport'}"><span class="cv-swl">Carregamento da expedição</span><span class="cv-sws">Expedição</span></button><button type="button" data-go="portaria" aria-pressed="${S.view==='portaria'}">Frota</button></nav>`:''; return `<div class="cv-bar" role="banner"><img src="${LOGO_ESC}" alt="Colafix"><span class="cv-bart">${esc(tit)}</span>${sw}${P.viewOk('bdmot')?`<a class="cv-tvm" href="${esc(location.pathname+'?tv=motoristas')}" target="_blank" rel="noopener" title="Abre a TV dos motoristas numa aba nova: leve para a tela da sala dos motoristas">TV dos motoristas ↗</a>`:''}<span class="cv-clk" data-rtv-clk>${String(ag.getHours()).padStart(2,'0')}:${String(ag.getMinutes()).padStart(2,'0')}</span>
      <button type="button" class="cv-sair" data-act="cv-sair" aria-label="Sair da conta ${esc(nm)}"><span class="cv-av" aria-hidden="true">${esc(ini(nm))}</span><span>${Date.now()-_sairConf<4000?'Toque de novo para sair':'Sair'}</span></button></div>`; }
  let _autoCam=true, _sairConf=0;
  function vPortaria(){ const so=solo(); try{ document.body.classList.toggle('cv-solo',so); }catch(e){}
    const corpo=vPortariaCorpo(so); if(!so) return corpo;
    if(lido()&&!C.sel&&!(C.msg&&C.msg.d)&&!C.cam.on&&!C.cam.erro&&_autoCam&&ativos().length){ _autoCam=false; setTimeout(()=>{ if(solo()&&!C.sel&&!C.cam.on) camLiga(); },60); }
    return `<div class="cv-app">${appBar('Portaria')}<main class="cv-appc">${corpo}</main></div>`; }
  function vPortariaCorpo(SO){ if(!lido()) return '<section class="card"><div class="empty">Carregando os carros…</div></section>';
    const cs=ativos(), fora=cs.filter(c=>abertaDe(c.id)).sort((a,b)=>String(abertaDe(a.id).emS).localeCompare(String(abertaDe(b.id).emS))), dentro=cs.filter(c=>!abertaDe(c.id)), h=hoje(), ag=Date.now();
    if(!cs.length) return `<section class="cv-hero"><div class="cv-hh"><div><p class="cv-eb">Portaria</p><h1>Frota</h1></div></div></section><section class="card cv-vz"><h2>Nenhum carro cadastrado</h2><p>O administrador cadastra os carros em Carros › Carros e motoristas e imprime os QR codes.</p></section>`;
    if(C.msg&&C.msg.d&&C.msg.t==='ok') return vFeito(C.msg);
    if(C.sel) return (C.msg?`<div class="cv-msg ${C.msg.t}" role="status">${esc(C.msg.x)}</div>`:'')+vFluxo();
    const dt=new Date(h+'T12:00:00'), mv=C.viag.filter(v=>!v.removido&&(v.diaS===h||diaDe(v.emV)===h));
    const ev=[]; mv.forEach(v=>{ if(v.diaS===h) ev.push({t:v.emS,k:'sai',v}); if(v.emV&&diaDe(v.emV)===h) ev.push({t:v.emV,k:'vol',v}); }); ev.sort((a,b)=>String(b.t).localeCompare(String(a.t)));
    const kmHoje=mv.filter(v=>v.emV&&diaDe(v.emV)===h).reduce((a,v)=>a+(+v.rodou||0),0);
    const hero=`<section class="cv-hero${SO?' so':''}"><div class="cv-hh">${SO?'':`<div><p class="cv-eb">Portaria · ${esc(DSEM[dt.getDay()])}, ${esc(brD(h))}</p><h1>Frota</h1></div>`}
        <div class="cv-cnt"><div><b>${fora.length}</b><span>fora</span></div><div><b>${dentro.length}</b><span>na empresa</span></div><div><b>${ev.length}</b><span>movimentos hoje</span></div></div></div>
      ${C.cam.on?`<div class="cv-cam"><div class="cv-vw"><video id="cv-video" playsinline muted autoplay></video><span class="cv-mira" aria-hidden="true"><i></i></span></div><p>Aponte para o QR code colado no carro</p><button type="button" class="cv-bt2" data-act="cv-camx">Cancelar</button></div>`
        :`<button type="button" class="cv-scan" data-act="cv-cam"><span class="cv-qric" aria-hidden="true">${SVG.qr}</span><span class="cv-sct"><b>Escanear QR do carro</b><small>Abre a saída ou a volta na hora</small></span></button>${C.cam.erro?`<p class="cv-err cv-errh">${esc(C.cam.erro)}</p>`:''}<p class="cv-nbh">No computador: clique em <b>Saída</b> ou <b>Registrar volta</b> no carro abaixo.</p>`}</section>`;
    const aviso=C.msg?`<div class="cv-msg ${C.msg.t}" role="status">${esc(C.msg.x)}</div>`:'';
    const tFora=c=>{ const a=abertaDe(c.id), ms=ag-new Date(a.emS).getTime(), lg=ms>8*3600e3;
      return `<button type="button" class="cv-tile fora${lg?' longo':''}" data-act="cv-abre" data-v="${esc(c.id)}"><span class="cv-tt">${placa(c)}${c.frota?`<span class="cv-fro">Frota ${esc(c.frota)}</span>`:''}<span class="cv-chip${lg?' warn':''}">${SVG.rel}há ${esc(dur(ms))}</span></span>
        <span class="cv-who"><span class="cv-av" aria-hidden="true">${esc(ini(a.motNome))}</span><span><b>${esc(a.motNome)}</b><small>saiu ${esc(quando(a.emS))} · ${fK(a.kmS)} km</small></span></span>
        ${aceitePend(a)?'<span class="cv-acp">Aguardando aceite do motorista</span>':a.aceite?`<span class="cv-acok">${SVG.ok}Aceite às ${esc(hm(a.aceite.em))}${a.aceite.avaria?' · avaria anotada':''}</span>`:''}
        <span class="cv-go vol">${SVG.vol}Registrar volta</span></button>`; };
    const tDentro=c=>`<button type="button" class="cv-tile" data-act="cv-abre" data-v="${esc(c.id)}"><span class="cv-tt">${placa(c)}</span><span class="cv-mod">${c.frota?`<span class="cv-fro">Frota ${esc(c.frota)}</span>`:''}<b>${esc(c.modelo||'Carro')}</b><small>${fK(ultKm(c))} km</small></span><span class="cv-go sai">${SVG.sai}Saída</span></button>`;
    const linha=e=>{ const v=e.v; return `<li class="${e.k}"><span class="cv-tlh">${esc(hm(e.t))}</span><span class="cv-tli" aria-hidden="true">${e.k==='sai'?SVG.sai:SVG.vol}</span><span class="cv-tlt"><b>${e.k==='sai'?'Saída':'Volta'} · ${esc(plT(v.placa))}</b><small>${esc(v.motNome)} · ${e.k==='sai'?fK(v.kmS)+' km':fK(v.kmV)+' km · rodou '+fK(v.rodou)+' km'}</small></span></li>`; };
    return `<div class="cv-ptl">`+hero+aviso+vPend()+`<div class="cv-sec"><h2>Fora agora <span>${fora.length}</span></h2>${fora.length?`<div class="cv-grid">${fora.map(tFora).join('')}</div>`:'<p class="cv-nada cv-nadab">Todos os carros estão na empresa.</p>'}</div>
      <div class="cv-sec"><h2>Na empresa <span>${dentro.length}</span></h2>${dentro.length?`<div class="cv-grid cv-gridp">${dentro.map(tDentro).join('')}</div>`:'<p class="cv-nada cv-nadab">Todos os carros estão fora.</p>'}</div>
      ${ev.length?`<section class="card cv-tl"><div class="cv-h2b"><h2>Movimentos de hoje</h2>${kmHoje?`<span class="cv-sub">${fK(kmHoje)} km rodados nas voltas de hoje</span>`:''}</div><ol>${ev.slice(0,12).map(linha).join('')}</ol></section>`:''}</div>`; }
  function vFeito(M){ const d=M.d, sai=d.tipo==='saida';
    return `<section class="cv-feito ${sai?'sai':'vol'}" role="status"><span class="cv-fok" aria-hidden="true">${SVG.ok}</span><h1>${sai?'Saída registrada':'Volta registrada'}</h1>${placa(d.placa,'g')}<p class="cv-fmod">${esc([d.frota?'Frota '+d.frota:'',d.mod].filter(Boolean).join(' · '))}</p>
      <dl class="cv-fdl"><div><dt>Motorista</dt><dd>${esc(d.mot)}</dd></div><div><dt>${sai?'Km na saída':'Km na volta'}</dt><dd>${fK(d.km)}</dd></div>${sai?`<div><dt>Hora</dt><dd>${esc(d.hora)}</dd></div>`:`<div><dt>Rodou</dt><dd>${fK(d.rodou)} km</dd></div><div><dt>Ficou fora</dt><dd>${esc(d.fora)}</dd></div>`}</dl>
      ${d.alerta?`<p class="cv-falt">${esc(d.alerta)}</p>`:''}${sai&&d.aceite?`<p class="cv-fac">${SVG.rel}Peça para o ${esc(d.aceite)} abrir o painel no celular e confirmar a saída. Até lá, o carro fica "aguardando aceite".</p>`:''}${!sai&&d.devol?`<p class="cv-fac">${SVG.rel}Peça para o ${esc(d.devol)} abrir o painel e confirmar a devolução (km, abastecimento, avaria e limpeza).</p>`:''}<button type="button" class="cv-bt1" data-act="cv-feito">Voltar para a portaria</button><p class="cv-fauto">Volta sozinho em alguns segundos</p></section>`; }
  function vFluxo(){ const c=carDe(C.sel), a=abertaDe(c.id), uk=ultKm(c), F=C.f, er=F.err||{}, kmv=kmNum(F.km);
    const errDe=id=>er.id===id?`<p class="cv-err" id="${id}-e">${esc(er.t)}</p>`:'';
    const topo=`<div class="cv-flh ${a?'vol':'sai'}"><button type="button" class="cv-x" data-act="cv-volta-x" aria-label="Cancelar e voltar">‹ Portaria</button><p class="cv-eb">${a?'Registrar volta':'Registrar saída'}</p>${placa(c,'g')}${c.frota?`<p class="cv-frog">Frota ${esc(c.frota)}</p>`:''}<p class="cv-fmod">${esc(c.modelo||'Carro')}</p></div>`;
    const kmBox=(lab,ph,hint)=>`<label class="cv-lb" for="cv-km">${lab}</label><div class="cv-kmw${er.id==='cv-km'?' bad':''}"><input id="cv-km" class="cv-kmi" inputmode="numeric" autocomplete="off" placeholder="${esc(ph)}" value="${esc(F.km)}" data-cvf="km"${er.id==='cv-km'?' aria-invalid="true" aria-describedby="cv-km-e"':''}><span>km</span></div>${hint?`<p class="cv-hint">${hint}</p>`:''}${errDe('cv-km')}`;
    const obs=ph=>`<label class="cv-lb" for="cv-obs">Observação <small>opcional</small></label><input id="cv-obs" class="cv-in" autocomplete="off" placeholder="${esc(ph)}" value="${esc(F.obs)}" data-cvf="obs" maxlength="300">`;
    if(a){ const rod=Number.isFinite(kmv)&&kmv>=a.kmS?kmv-a.kmS:null;
      return `<section class="card cv-fl">${topo}<div class="cv-flb"><div class="cv-who big"><span class="cv-av" aria-hidden="true">${esc(ini(a.motNome))}</span><span><b>${esc(a.motNome)}</b><small>saiu ${esc(quando(a.emS))} · ${fK(a.kmS)} km · há ${esc(dur(Date.now()-new Date(a.emS).getTime()))}</small></span></div>
        ${a.obsS?`<p class="cv-obs0">Na saída: ${esc(a.obsS)}</p>`:''}
        ${a.aceite?`<p class="cv-obs0${a.aceite.avaria||a.aceite.limpo===false?' warn':''}">Na saída o motorista confirmou: ${a.aceite.limpo===false?'carro sujo':'carro limpo'}${a.aceite.avaria?' · avaria antes da saída: '+esc(a.aceite.avariaTxt||''):' · sem avaria'}</p>`:''}${aceitePend(a)?'<p class="cv-obs0 warn">O motorista ainda não deu o aceite da saída.</p>':''}
        ${kmBox('Km no painel agora',fK(a.kmS),'Na saída estava com <b>'+fK(a.kmS)+' km</b>')}
        <div class="cv-rod" id="cv-rod">${rod!=null?'<span>Rodou</span><b>'+fK(rod)+' km</b>':''}</div>
        ${obs('Ex.: chegou com o pneu baixo')}
        ${F.conf?`<p class="cv-conf">O carro rodou ${fK(rod)} km nesta viagem. Confere o km? Toque de novo para confirmar.</p>`:''}
        <div class="cv-bts"><button type="button" class="cv-bt2" data-act="cv-volta-x">Cancelar</button><button type="button" class="cv-bt1 vol" data-act="cv-volta"${C.salv?' disabled':''}>${C.salv?'Salvando…':F.conf?'Confirmar volta':'Registrar volta'}</button></div></div></section>`; }
    const ls=liberados();
    return `<section class="card cv-fl">${topo}<div class="cv-flb">
      <p class="cv-lb" id="cv-mot-l">Quem vai dirigir?</p>
      ${ls.length?`<div class="cv-mots" role="radiogroup" aria-labelledby="cv-mot-l" id="cv-mot"${er.id==='cv-mot'?' aria-describedby="cv-mot-e"':''}>${ls.map(m=>{ const fo=C.fora.find(v=>v.mot===m.id&&v.aberta); return `<button type="button" role="radio" aria-checked="${F.mot===m.id}" class="cv-mt${F.mot===m.id?' on':''}" data-act="cv-mot" data-v="${esc(m.id)}"><span class="cv-av" aria-hidden="true">${esc(ini(m.nome))}</span><span><b>${esc(m.nome)}</b>${fo?`<small>já está com o ${esc(plT(fo.placa))}</small>`:''}</span></button>`; }).join('')}</div>`:'<p class="cv-err">Nenhum motorista liberado. Fale com o administrador.</p>'}${errDe('cv-mot')}
      ${kmBox('Km no painel',fK(uk),'Último km registrado: <b>'+fK(uk)+'</b>')}
      ${obs('Ex.: destino, avaria, carro sujo')}
      ${F.conf?`<p class="cv-conf">O km digitado (${fK(kmv)}) é diferente do último registrado (${fK(uk)}): ${fK(kmv-uk)} km sem registro. A saída fica marcada para o administrador ver. Toque de novo para confirmar.</p>`:''}
      <div class="cv-bts"><button type="button" class="cv-bt2" data-act="cv-volta-x">Cancelar</button><button type="button" class="cv-bt1 sai" data-act="cv-saida"${C.salv||!ls.length?' disabled':''}>${C.salv?'Salvando…':F.conf?'Confirmar saída':'Registrar saída'}</button></div></div></section>`; }

  /* ---------- pedidos do celular do vendedor (27/11): a portaria só libera a saída e recebe o carro ---------- */
  function miniFoto(id,alt){ if(!id) return '<span class="cv-pfz">sem foto do painel</span>'; const d=C.fotos[id]; if(d===undefined) fotoDe(id);
    return `<button type="button" class="cv-pf" data-act="cv-foto" data-v="${esc(id)}" aria-label="${esc(alt)} (ampliar)">${d?`<img src="${d}" alt="">`:'<span>carregando…</span>'}<small>${esc(alt)}</small></button>`; }
  const sn=(b,sim,nao,ruimSe)=>`<span class="cv-pi ${b===ruimSe?'warn':'ok'}">${b?sim:nao}</span>`;
  function vPend(){ const ped=C.ped.filter(v=>!v.recusada&&!v.cancelada).sort((a,b)=>String(a.pedS&&a.pedS.em).localeCompare(String(b.pedS&&b.pedS.em))), dev=C.devp.slice().sort((a,b)=>String(a.devol&&a.devol.em).localeCompare(String(b.devol&&b.devol.em)));
    if(!ped.length&&!dev.length) return ''; const ag=Date.now();
    const cP=v=>{ const c=carDe(v.carro)||{placa:v.placa}, a=abertaDe(v.carro), uk=ultKm(c), ac=v.aceite||{};
      return `<article class="cv-pd sai"><div class="cv-pdh"><span class="cv-pdk">Quer sair</span>${placa(v.placa)}${v.frota?`<span class="cv-fro">Frota ${esc(v.frota)}</span>`:''}<small>há ${esc(dur(ag-new Date(v.pedS.em).getTime()))}</small></div>
        <div class="cv-pdb">${miniFoto(v.fotoPS,'Painel do carro')}<div class="cv-pdi"><div class="cv-who"><span class="cv-av" aria-hidden="true">${esc(ini(v.motNome))}</span><span><b>${esc(v.motNome)}</b><small>${esc(v.modelo||'')}</small></span></div>
          <p class="cv-pdkm"><b>${fK(v.kmS)} km</b>${uk&&v.kmS!==uk?`<small class="warn">último registrado ${fK(uk)} km (${v.kmS>uk?'+':''}${fK(v.kmS-uk)})</small>`:'<small>confere com o último registrado</small>'}</p>
          <p class="cv-pis">${sn(ac.limpo,'limpo','sujo',false)}${sn(ac.avaria,'avaria: '+esc(ac.avariaTxt||''),'sem avaria',true)}${(ac.fotos||[]).length?fotosLinks(ac.fotos):''}</p></div></div>
        ${a?`<p class="cv-err">Este carro consta como fora com ${esc(a.motNome)}. Registre a volta antes de liberar.</p>`:''}
        <div class="cv-bts"><button type="button" class="cv-bt2" data-act="cv-pd-rec" data-v="${esc(v._id)}">Recusar</button><button type="button" class="cv-bt1 sai" data-act="cv-pd-lib" data-v="${esc(v._id)}"${C.salv||a?' disabled':''}>Liberar saída</button></div></article>`; };
    const cD=v=>{ const d=v.devol||{}, km=+d.kmV||+v.kmS, rod=km-(+v.kmS||0);
      return `<article class="cv-pd vol"><div class="cv-pdh"><span class="cv-pdk">Chegou</span>${placa(v.placa)}${v.frota?`<span class="cv-fro">Frota ${esc(v.frota)}</span>`:''}<small>saiu ${esc(quando(v.emS))}</small></div>
        <div class="cv-pdb">${miniFoto(v.fotoPV,'Painel do carro')}<div class="cv-pdi"><div class="cv-who"><span class="cv-av" aria-hidden="true">${esc(ini(v.motNome))}</span><span><b>${esc(v.motNome)}</b><small>saiu com ${fK(v.kmS)} km</small></span></div>
          <p class="cv-pdkm"><b>${fK(km)} km</b><small>rodou ${fK(rod)} km</small></p>
          <p class="cv-pis">${d.abast?`<span class="cv-pi info">abasteceu${d.litros?' '+esc(String(d.litros).replace('.',','))+' L':''}</span>`:'<span class="cv-pi">sem abastecimento</span>'}${sn(d.avaria,'avaria: '+esc(d.avariaTxt||''),'sem avaria',true)}${sn(d.limpo,'limpo','sujo',false)}${(d.fotos||[]).length?fotosLinks(d.fotos):''}</p></div></div>
        <div class="cv-bts"><button type="button" class="cv-bt1 vol cv-wide" data-act="cv-dv-rec" data-v="${esc(v._id)}"${C.salv?' disabled':''}>Recebido</button></div></article>`; };
    return `<div class="cv-sec cv-pend"><h2>Para a portaria <span>${ped.length+dev.length}</span></h2>${ped.map(cP).join('')}${dev.map(cD).join('')}</div>`; }
  async function liberarPed(id){ const v=C.ped.find(x=>x._id===id); if(!v||C.salv) return; if(!pode()) return P.toast('Seu acesso é só para ver.'); if(abertaDe(v.carro)) return P.toast('Este carro já está fora. Registre a volta antes.');
    const c=carDe(v.carro), agora=new Date().toISOString(), esp=ultKm(c), up={pedida:false,aberta:true,emS:agora,diaS:hoje(),porS:S.uid||null,porSN:eu(),kmEsp:esp,kmDif:+v.kmS!==esp};
    C.salv=true; P.render();
    try{ await P.db().doc('carrosv/'+id).update(up); await P.db().doc('carrosk/'+v.carro).set({km:+v.kmS,em:agora,viagem:id,placa:v.placa,fora:true,mot:v.motNome});
      C.ped=C.ped.filter(x=>x._id!==id); C.fora=C.fora.filter(x=>x._id!==id).concat([Object.assign({},v,up)]); P.toast('Saída liberada: '+plT(v.placa)+' com '+v.motNome+'.'); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  async function recusarPed(id){ const v=C.ped.find(x=>x._id===id); if(!v) return; const m=prompt('Recusar a saída de '+v.motNome+' com o '+plT(v.placa)+'? Motivo (aparece para ele):',''); if(m===null) return;
    try{ await P.db().doc('carrosv/'+id).update({pedida:false,recusada:{em:new Date().toISOString(),por:eu(),motivo:String(m).trim().slice(0,160)}}); C.ped=C.ped.filter(x=>x._id!==id); P.toast('Saída recusada.'); }catch(e){ P.erro(e); } P.render(); }
  async function receberDev(id){ const v=C.devp.find(x=>x._id===id); if(!v||C.salv) return; if(!pode()) return P.toast('Seu acesso é só para ver.');
    const d=v.devol||{}, km=+d.kmV||+v.kmS, agora=new Date().toISOString(), up={devolPed:false,kmV:km,emV:agora,porV:S.uid||null,porVN:eu(),rodou:km-(+v.kmS||0),aberta:false};
    C.salv=true; P.render();
    try{ await P.db().doc('carrosv/'+id).update(up); await P.db().doc('carrosk/'+v.carro).set({km,em:agora,viagem:id,placa:v.placa,fora:false});
      C.devp=C.devp.filter(x=>x._id!==id); C.fora=C.fora.filter(x=>x._id!==id); P.toast('Carro recebido: '+plT(v.placa)+' · rodou '+fK(up.rodou)+' km.'); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }

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
    const lista=xs.length?`<div class="cv-tw"><table class="cv-tb"><thead><tr><th>Carro</th><th>Motorista</th><th>Saída</th><th class="dir">Km saída</th><th>Volta</th><th class="dir">Km volta</th><th class="dir">Rodou</th><th>Aceite (saída)</th><th>Devolução</th><th>Observação</th>${adm()?'<th></th>':''}</tr></thead><tbody>
      ${xs.map(v=>`<tr class="${v.aberta?'fora':''}"><td>${placa(v.placa,'p')}</td><td>${esc(v.motNome||'')}</td><td>${esc(quando(v.emS))}<small>${esc(v.porSN||'')}</small></td><td class="dir">${fK(v.kmS)}${v.fotoPS?`<small><button type="button" class="lnk" data-act="cv-foto" data-v="${esc(v.fotoPS)}">foto do painel</button></small>`:''}${v.kmDif?`<small class="warn" title="Último km registrado: ${esc(fK(v.kmEsp))}">+${fK((+v.kmS||0)-(+v.kmEsp||0))} sem registro</small>`:''}</td>
        <td>${v.aberta?'<span class="cv-tag info">Ainda fora</span>':esc(quando(v.emV))+'<small>'+esc(v.porVN||'')+'</small>'}</td><td class="dir">${v.aberta?'—':fK(v.kmV)}${v.fotoPV?`<small><button type="button" class="lnk" data-act="cv-foto" data-v="${esc(v.fotoPV)}">foto do painel</button></small>`:''}</td><td class="dir"><b>${v.aberta?'—':fK(v.rodou)}</b></td><td>${v.aceite?`<span class="cv-tag ${v.aceite.avaria||v.aceite.limpo===false||v.aceite.estado==='avaria'?'warn':'ok'}">${esc(hm(v.aceite.em))}</span><small>${v.aceite.limpo===false?'sujo':v.aceite.limpo?'limpo':''}${v.aceite.avaria||v.aceite.estado==='avaria'?' · avaria: '+esc(v.aceite.avariaTxt||v.aceite.avaria||''):v.aceite.limpo!=null?' · sem avaria':''}</small>${fotosLinks(v.aceite.fotos)}`:aceitePend(v)?'<span class="cv-tag warn">Pendente</span>':'<small>sem login</small>'}</td>
        <td>${v.devol?`<span class="cv-tag ${v.devol.avaria||!v.devol.kmOk||!v.devol.limpo?'warn':'ok'}">${esc(hm(v.devol.em))}</span><small>${v.devol.kmOk?'km confere':'km do motorista: '+fK(v.devol.kmMot)}${v.devol.abast?' · abasteceu'+(v.devol.litros?' '+esc(String(v.devol.litros).replace('.',','))+' L':'')+(v.devol.valor?' R$ '+esc((+v.devol.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})):''):' · sem abastecimento'} · ${v.devol.limpo?'limpo':'sujo'}${v.devol.avaria?' · avaria: '+esc(v.devol.avariaTxt||''):''}</small>${fotosLinks(v.devol.fotos)}`:devolPend(v)?'<span class="cv-tag warn">Pendente</span>':v.comb?'<small>combustível: '+esc(combTxt(v.comb.nivel))+'</small>':'—'}</td>
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
  function csv(){ const xs=filtradas(); const L=[['Placa','Modelo','Nº de frota','Motorista','CPF do motorista','Saída','Km saída','Último km antes','Km sem registro','Volta','Km volta','Rodou','Aceite do motorista','Limpo na saída','Avaria antes da saída','Devolução confirmada','Km do motorista na volta','Abasteceu','Litros','Valor abastecido','Avaria no trajeto','Limpo na volta','Porteiro saída','Porteiro volta','Observação']];
    const dt=iso=>iso?new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
    xs.forEach(v=>L.push([plT(v.placa),v.modelo||'',v.frota||'',v.motNome||'',cpfDe(v.mot)?cpfF(cpfDe(v.mot)):'',dt(v.emS),v.kmS,v.kmEsp==null?'':v.kmEsp,v.kmDif?(+v.kmS)-(+v.kmEsp):'',v.aberta?'ainda fora':dt(v.emV),v.aberta?'':v.kmV,v.aberta?'':v.rodou,v.aceite?dt(v.aceite.em):aceitePend(v)?'pendente':'sem login',v.aceite?(v.aceite.limpo===false?'não':v.aceite.limpo?'sim':''):'',v.aceite?(v.aceite.avaria?(v.aceite.avariaTxt||'sim'):'não'):'',v.devol?dt(v.devol.em):devolPend(v)?'pendente':'',v.devol?(v.devol.kmOk?'confere':v.devol.kmMot):'',v.devol?(v.devol.abast?'sim':'não'):'',v.devol&&v.devol.litros!=null?String(v.devol.litros).replace('.',','):'',v.devol&&v.devol.valor!=null?String(v.devol.valor).replace('.',','):'',v.devol?(v.devol.avaria?(v.devol.avariaTxt||'sim'):'não'):'',v.devol?(v.devol.limpo?'sim':'não'):'',v.porSN||'',v.porVN||'',[v.obsS,v.obsV].filter(Boolean).join(' · ')]));
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
          <label>Km atual<input id="cv-c-km" class="cv-in" inputmode="numeric" autocomplete="off" placeholder="45230" value="${esc(E.km!=null?E.km:'')}"></label>
          <label>Nº de frota<input id="cv-c-fr" class="cv-in" autocomplete="off" maxlength="12" placeholder="12" value="${esc(E.frota||'')}"></label></div>
          ${E.err?`<p class="cv-err">${esc(E.err)}</p>`:''}
          <div class="cv-bts">${E.id?'<button type="button" class="btn sec" data-act="cv-c-x">Cancelar</button>':''}<button type="button" class="btn" data-act="cv-c-salva"${C.salv?' disabled':''}>${E.id?'Salvar':'Cadastrar carro'}</button></div></section>`:''}
        <section class="card"><div class="cv-h2b"><h2>Carros <span>${carros().length}</span></h2>${carros().length?`<button type="button" class="btn sec" data-act="cv-qr">Imprimir QR codes (PDF)</button>`:''}</div>
        ${carros().length?carros().slice().sort((a,b)=>(a.ativo===false)-(b.ativo===false)||a.placa.localeCompare(b.placa)).map(c=>{ const a=abertaDe(c.id); return `<div class="cv-cr${c.ativo===false?' ina':''}">${placa(c)}<div class="cv-cari"><b>${esc([c.frota?'Frota '+c.frota:'',c.modelo].filter(Boolean).join(' · '))}</b><small>${fK(ultKm(c))} km · ${c.ativo===false?'desativado':a?'fora com '+esc(a.motNome):'na empresa'}</small></div>
          ${ok?`<div class="cv-ac"><button type="button" class="lnk" data-act="cv-qr1" data-v="${esc(c.id)}">QR</button><button type="button" class="lnk" data-act="cv-c-ed" data-v="${esc(c.id)}">Editar</button><button type="button" class="lnk" data-act="cv-c-at" data-v="${esc(c.id)}">${c.ativo===false?'Reativar':'Desativar'}</button></div>`:''}</div>`; }).join(''):'<p class="cv-nada">Cadastre o primeiro carro acima.</p>'}</section>`; }
    else { const E=C.edM||{};
      corpo=`${ok?`<section class="card cv-ed"><h2>${E.id?'Editar motorista':'Cadastrar motorista'}</h2><div class="cv-g2"><label>Nome completo<input id="cv-m-no" class="cv-in" autocomplete="off" placeholder="Nome e sobrenome" value="${esc(E.nome||'')}"></label>
          <label>CPF<input id="cv-m-cpf" class="cv-in" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" value="${esc(E.cpf!=null?cpfF(E.cpf):(E.id?cpfF(cpfDe(E.id)):''))}"></label>
          <div class="cv-lgn"><span class="cv-lgt">Login no painel <small>para o motorista dar o aceite e ver o histórico</small></span>
          ${E.uid?`<div class="cv-lgs"><span class="cv-av" aria-hidden="true">${esc(ini(E.uidNome))}</span><b>${esc(E.uidNome||'')}</b><button type="button" class="lnk" data-act="cv-m-lx">Trocar</button></div>`
            :`<input id="cv-m-lq" class="cv-in" autocomplete="off" placeholder="Digite o nome ou usuário do login" value="${esc(C.lq||'')}"><div class="cv-lgr" id="cv-m-lr">${lgRes()}</div>`}</div></div>
          ${E.err?`<p class="cv-err">${esc(E.err)}</p>`:''}<div class="cv-bts">${E.id?'<button type="button" class="btn sec" data-act="cv-m-x">Cancelar</button>':''}<button type="button" class="btn" data-act="cv-m-salva"${C.salv?' disabled':''}>${E.id?'Salvar':'Cadastrar motorista'}</button></div></section>`:''}
        <section class="card"><h2>Motoristas <span>${liberados().length} liberados · ${mots().length-liberados().length} bloqueados</span></h2>
        ${mots().length?mots().map(m=>`<div class="cv-cr${m.ok===false?' ina':''}"><div class="cv-cari"><b>${esc(m.nome)}</b><small>${cpfDe(m.id)?'CPF '+esc(cpfM(cpfDe(m.id)))+' · ':'<span class="cv-wn">sem CPF</span> · '}${(()=>{ const t=termoDe(m); return t&&t.versao>=termoAtual().versao?'termo aceito em '+esc(brD(diaDe(t.em)))+' '+esc(hm(t.em))+' · ':m.uid?'<span class="cv-wn">termo pendente</span> · ':''; })()}${m.ok===false?'Bloqueado'+(m.bloqEm?' em '+esc(brD(diaDe(m.bloqEm))):''):'Liberado'} · ${m.uid?'login: '+esc(m.uidNome||''):'sem login (não pede a saída pelo celular)'}</small></div><span class="cv-tag ${m.ok===false?'crit':'ok'}">${m.ok===false?'Bloqueado':'Liberado'}</span>
          ${ok?`<div class="cv-ac"><button type="button" class="lnk" data-act="cv-m-ed" data-v="${esc(m.id)}">Editar</button><button type="button" class="lnk${m.ok===false?'':' cv-del'}" data-act="cv-m-bl" data-v="${esc(m.id)}">${m.ok===false?'Liberar':'Bloquear'}</button></div>`:''}</div>`).join(''):'<p class="cv-nada">Cadastre os motoristas que podem sair com os carros.</p>'}</section>
        <section class="card cv-ed"><div class="cv-h2b"><h2>Termo de ciência <span>versão ${termoAtual().versao}</span></h2>${ok&&!C.edT?'<button type="button" class="btn sec" data-act="cv-t-ed">Editar o termo</button>':''}</div>
          <p class="cv-hint">Cada motorista aceita uma vez no celular dele, antes de confirmar a primeira saída. {NOME} e {CPF} viram os dados do motorista. Ao salvar uma nova versão, todos precisam aceitar de novo.</p>
          ${C.edT?`<textarea id="cv-t-tx" class="cv-in cv-ta cv-tta">${esc(C.edT.texto)}</textarea>${C.edT.err?`<p class="cv-err">${esc(C.edT.err)}</p>`:''}<div class="cv-bts"><button type="button" class="btn sec" data-act="cv-t-x">Cancelar</button><button type="button" class="btn" data-act="cv-t-salva">Salvar nova versão</button></div>`
            :`<pre class="cv-tpre">${esc(termoAtual().texto)}</pre>`}</section>`; }
    return `<header class="cv-top"><div><h1>Carros e motoristas</h1><p>Quem cadastra e libera é o administrador; a portaria só escolhe da lista</p></div></header>${abas}${corpo}${P.dono()?vLimpar():''}`; }
  /* período de teste (26/11, "vou fazer um teste, tenho como apagar depois?"): só a dona apaga de verdade */
  function vLimpar(){ const L=C.limpa||{}; const nv=C.viag.length+C.fora.filter(v=>!C.viag.some(x=>x._id===v._id)).length;
    return `<section class="card cv-ed cv-lim"><h2>Apagar dados de teste <span>só a administradora vê</span></h2>
      <p class="cv-hint">Para depois dos testes. <b>Viagens e registros</b> apaga as saídas e voltas, aceites, devoluções, fotos, último km e termos aceitos (${nv} viage${nv===1?'m':'ns'} agora); os carros, os motoristas e o texto do termo ficam. <b>Tudo dos carros</b> apaga também os carros, os motoristas e os CPFs. Não dá para desfazer.</p>
      ${L.tipo?`<p class="cv-lb">Para confirmar, digite APAGAR</p><div class="cv-limr"><input id="cv-lim-tx" class="cv-in" autocomplete="off" placeholder="APAGAR"><button type="button" class="btn cv-bdel" data-act="cv-lim-ok">${L.tipo==='tudo'?'Apagar tudo dos carros':'Apagar viagens e registros'}</button><button type="button" class="btn sec" data-act="cv-lim-x">Cancelar</button></div>${L.err?`<p class="cv-err">${esc(L.err)}</p>`:''}${L.prog?`<p class="cv-hint">${esc(L.prog)}</p>`:''}`
        :`<div class="cv-bts" style="justify-content:flex-start"><button type="button" class="btn sec" data-act="cv-lim" data-v="viagens">Apagar viagens e registros</button><button type="button" class="btn sec cv-del" data-act="cv-lim" data-v="tudo">Apagar tudo dos carros</button></div>`}</section>`; }
  async function limpar(){ const L=C.limpa||{}; if(String((document.getElementById('cv-lim-tx')||{}).value||'').trim().toUpperCase()!=='APAGAR'){ L.err='Digite APAGAR para confirmar.'; P.render(); return; }
    const cols=['carrosv','carrosf','carrosk','carrost'].concat(L.tipo==='tudo'?['carrosp']:[]); let n=0;
    try{ for(const c of cols){ L.prog='Apagando '+c+'…'; P.render(); const q=await P.db().collection(c).limit(1000).get(); for(const d of q.docs){ await P.db().doc(c+'/'+d.id).delete(); n++; } }
      if(L.tipo==='tudo'){ await P.db().doc('carros/cad').set({carros:[],mot:[],termo:C.cad.termo||null,em:new Date().toISOString(),por:S.uid||null}); C.cad={carros:[],mot:[],termo:C.cad.termo||null}; C.priv={}; }
      C.viag=[]; C.fora=[]; C.km={}; C.termos=[]; C.limpa=null; P.toast(n+' registro'+(n===1?'':'s')+' de teste apagado'+(n===1?'':'s')+'.'); }
    catch(e){ L.err='Parou no meio: '+((e&&e.message)||e)+'. Tente de novo.'; L.prog=''; P.erro(e); } P.render(); }
  async function salvaCarro(){ const fr=String((document.getElementById('cv-c-fr')||{}).value||'').trim().slice(0,12), pl=plN((document.getElementById('cv-c-pl')||{}).value), mo=String((document.getElementById('cv-c-mo')||{}).value||'').trim(), kmT=(document.getElementById('cv-c-km')||{}).value, km=String(kmT||'').trim()?kmNum(kmT):0;
    const E=C.edC||{}; const err=t=>{ C.edC=Object.assign({},E,{placa:pl,modelo:mo,km:kmT,frota:fr,err:t}); P.render(); };
    if(!PL_RE.test(pl)) return err('Placa inválida. Use o formato ABC1234 ou ABC1D23.'); if(!Number.isFinite(km)||km<0) return err('Km inválido.');
    if(carros().some(c=>plN(c.placa)===pl&&c.id!==E.id)) return err('Já existe um carro com esta placa.'); if(fr&&carros().some(c=>String(c.frota||'').toLowerCase()===fr.toLowerCase()&&c.id!==E.id)) return err('Já existe um carro com este número de frota.');
    const novo={carros:(C.cad.carros||[]).map(c=>Object.assign({},c)),mot:C.cad.mot||[]};
    if(E.id){ const c=novo.carros.find(x=>x.id===E.id); if(c) Object.assign(c,{placa:pl,modelo:mo,km,frota:fr}); } else novo.carros.push({id:novoId('c'),placa:pl,modelo:mo,km,frota:fr,ativo:true,em:new Date().toISOString()});
    if(await gravaCad(novo,E.id?'Carro salvo.':'Carro '+plT(pl)+' cadastrado. Imprima o QR code para colar no carro.')) C.edC=null; P.render(); }
  async function salvaMot(){ const no=String((document.getElementById('cv-m-no')||{}).value||'').trim().replace(/\s+/g,' '), cpf=cpfL((document.getElementById('cv-m-cpf')||{}).value), E=C.edM||{}; const err=t=>{ C.edM=Object.assign({},E,{nome:no,cpf,err:t}); P.render(); };
    if(cpf&&!cpfOk(cpf)) return err('CPF inválido. Confira os números.'); if(cpf&&Object.entries(C.priv).some(([k,x])=>x&&cpfL(x.cpf)===cpf&&k!==E.id)) return err('Este CPF já está em outro motorista.');
    if(no.length<3) return err('Digite o nome do motorista.'); if(mots().some(m=>m.nome.toLowerCase()===no.toLowerCase()&&m.id!==E.id)) return err('Este motorista já está cadastrado.');
    const novo={carros:C.cad.carros||[],mot:(C.cad.mot||[]).map(m=>Object.assign({},m))};
    if(E.uid&&mots().some(m=>m.uid===E.uid&&m.id!==E.id)) return err('Este login já está ligado a outro motorista.');
    const tp=()=>'colafix-carro-'+Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,8);
    if(E.id){ const m=novo.mot.find(x=>x.id===E.id); if(m) Object.assign(m,{nome:no,uid:E.uid||null,uidNome:E.uid?E.uidNome||'':null,topico:m.topico||tp()}); } else novo.mot.push({id:novoId('m'),nome:no,ok:true,uid:E.uid||null,uidNome:E.uid?E.uidNome||'':null,topico:tp(),em:new Date().toISOString()});
    const mid=E.id||novo.mot[novo.mot.length-1].id, mm=novo.mot.find(x=>x.id===mid);
    if(await gravaCad(novo,E.id?'Motorista salvo.':no+' cadastrado e liberado.')){ try{ await P.db().doc('carrosp/'+mid).set({nome:no,cpf:cpf||'',uid:(mm&&mm.uid)||null,em:new Date().toISOString(),por:S.uid||null}); C.priv[mid]={nome:no,cpf:cpf||'',uid:(mm&&mm.uid)||null}; }catch(e){ P.erro(e); } C.edM=null; C.lq=''; C.lres=[]; } P.render(); }
  function lgRes(){ const r=C.lres||[]; if(!C.lq||C.lq.length<2) return ''; if(!r.length) return '<p class="cv-nada">Nenhum login com esse nome. Crie o login em Equipe e cargos com o cargo "Motorista (carros)".</p>'; return r.map(u=>`<button type="button" class="cv-lgi" data-act="cv-m-lsel" data-v="${esc(u.id)}" data-n="${esc(u.name||u.email)}"><span class="cv-av" aria-hidden="true">${esc(ini(u.name||u.email))}</span><span><b>${esc(u.name||'')}</b><small>${esc(u.email||'')}</small></span></button>`).join(''); }
  let _lgT=null; function lgBusca(q){ C.lq=q; clearTimeout(_lgT); if(q.trim().length<2){ C.lres=[]; const el=document.getElementById('cv-m-lr'); if(el) el.innerHTML=''; return; } _lgT=setTimeout(async()=>{ try{ C.lres=S.user&&S.user.search?(await S.user.search(q)).filter(u=>!u.isMe):[]; }catch(e){ C.lres=[]; } const el=document.getElementById('cv-m-lr'); if(el) el.innerHTML=lgRes(); },250); }

  /* ---------- QR codes em PDF (placa + QR, para colar no carro) ---------- */
  const urlDe=c=>location.origin+location.pathname+'?carro='+c.id;
  let _logoPdf=null;
  function logoPdf(){ if(_logoPdf) return Promise.resolve(_logoPdf); return new Promise(res=>{ const i=new Image(); i.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; c.getContext('2d').drawImage(i,0,0); _logoPdf=c.toDataURL('image/png'); res(_logoPdf); }catch(e){ res(null); } }; i.onerror=()=>res(null); i.src=LOGO_ESC; }); }
  async function qrPdf(cs){ if(!window.jspdf||!window.jspdf.jsPDF){ P.toast('Gerador de PDF indisponível. Recarregue a página.'); return; } if(typeof window.qrcode!=='function'){ P.toast('Gerador de QR indisponível. Recarregue a página.'); return; }
    if(!cs.length){ P.toast('Nenhum carro ativo para imprimir.'); return; }
    /* adesivo (26/11, opção B "faixa Colafix", sem a placa): faixa azul com a logo e "Controle de km · Portaria", QR de 58 mm,
       modelo e placa em texto pequeno (para saber em qual carro colar); 85 × 112 mm, 4 por folha, linha de corte tracejada */
    const logo=await logoPdf();
    const pdf=new window.jspdf.jsPDF('p','mm','a4'), W=85, H=112, gx=12, gy=12, x0=(210-2*W-gx)/2, y0=(297-2*H-gy)/2, NAV=[22,60,82], R=4, FH=19;
    cs.forEach((c,i)=>{ const k=i%4; if(i&&!k) pdf.addPage(); const x=x0+(k%2)*(W+gx), y=y0+Math.floor(k/2)*(H+gy);
      pdf.setDrawColor(185); pdf.setLineWidth(0.2); pdf.setLineDashPattern([1.6,1.4],0); pdf.roundedRect(x-2.5,y-2.5,W+5,H+5,R+2,R+2,'S'); pdf.setLineDashPattern([],0);
      pdf.setFillColor(...NAV); pdf.roundedRect(x,y,W,H,R,R,'F');
      pdf.setFillColor(255,255,255); pdf.roundedRect(x+0.01,y+FH,W-0.02,H-FH,R,R,'F'); pdf.rect(x+0.01,y+FH,W-0.02,R+1,'F');
      pdf.setDrawColor(...NAV); pdf.setLineWidth(0.5); pdf.roundedRect(x,y,W,H,R,R,'S');
      if(logo){ try{ pdf.addImage(logo,'PNG',x+6,y+(FH-7.5)/2,28.1,7.5); }catch(e){} }
      pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(9.5); pdf.text('Controle de km',x+W-6,y+8.2,{align:'right'});
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.text('Portaria',x+W-6,y+12.6,{align:'right'});
      const q=window.qrcode(0,'M'); q.addData(urlDe(c)); q.make(); const n=q.getModuleCount(), qs=58, m=qs/n, qx=x+(W-qs)/2, qy=y+FH+7; pdf.setFillColor(0,0,0);
      for(let r=0;r<n;r++) for(let cc=0;cc<n;cc++) if(q.isDark(r,cc)) pdf.rect(qx+cc*m,qy+r*m,m+0.01,m+0.01,'F');
      pdf.setTextColor(25,35,42); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text((c.modelo||'Carro').slice(0,30),x+W/2,qy+qs+8.5,{align:'center'});
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(95,105,112); pdf.text([c.frota?'Frota '+c.frota:'',plT(c.placa)].filter(Boolean).join('  ·  '),x+W/2,qy+qs+13.5,{align:'center'});
      pdf.setDrawColor(225); pdf.setLineWidth(0.3); pdf.line(x+8,y+H-10.5,x+W-8,y+H-10.5);
      pdf.setFontSize(8); pdf.setTextColor(95,105,112); pdf.text('Aponte a câmera na portaria: saída e volta',x+W/2,y+H-5.5,{align:'center'}); });
    pdf.save('qr-carros-'+hoje()+'.pdf'); }

  /* ---------- login do motorista (26/11; 2ª versão com o roteiro da empresa) ----------
     Saída: a portaria lê o QR (placa e nº de frota), põe motorista e km → aviso no celular do vendedor → ele confirma que pegou
     o carro, se estava limpo e se tinha avaria antes da saída (com foto, se tiver) e o termo.
     Volta: a portaria lê o QR e põe o km → aviso → o motorista confirma o km de retorno e responde: teve abastecimento? teve
     avaria no trajeto (com foto)? o carro está limpo?
     Lê só as próprias viagens (carrosv where motUid == uid); grava só `aceite`/`devol` e as fotos em carrosf. */
  C.meus=[]; C.ma={}; C.md={}; C.fotos={};
  let lendoMot=false, _vistos=null;
  function carregarMot(){ if(lendoMot) return; lendoMot=true;
    P.inscrever('cv-meus',()=>P.db().collection('carrosv').where('motUid','==',S.uid).limit(300),s=>{ const ant=new Map(C.meus.map(v=>[v._id,v])); C.meus=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(v=>!v.removido).sort((a,b)=>String(b.emS).localeCompare(String(a.emS))); C.lido.meus=true;
      if(C.lido.meusIni){ const lib=C.meus.find(v=>{ const o=ant.get(v._id); return o&&o.pedida&&!v.pedida&&v.aberta; }), rcb=C.meus.find(v=>{ const o=ant.get(v._id); return o&&o.devolPed&&!v.devolPed&&!v.aberta; }), rcs=C.meus.find(v=>{ const o=ant.get(v._id); return o&&o.pedida&&v.recusada; });
        if(lib||rcb||rcs){ bip(); setTimeout(bip,220); try{ if(navigator.vibrate) navigator.vibrate([200,100,200]); }catch(e){} P.toast(lib?'Saída liberada. Boa viagem!':rcb?'A portaria recebeu o carro. Obrigado!':'A portaria recusou a saída.'); } }
      C.lido.meusIni=true; notificaMot(); P.rerender(); });
    if(!lendo) P.inscrever('cv-cad-m',()=>P.db().doc('carros/cad'),g=>{ const d=g&&g.exists?g.data():{}; C.cad={carros:Array.isArray(d.carros)?d.carros:[],mot:Array.isArray(d.mot)?d.mot:[],termo:d.termo||null}; C.lido.cadM=true; P.rerender(); });
    P.inscrever('cv-km-m',()=>P.db().collection('carrosk').limit(300),s=>{ const m={}; s.docs.forEach(d=>{ m[d.id]=d.data(); }); C.kmM=m; C.lido.kmM=true; P.rerender(); });
    P.inscrever('cv-eu-p',()=>P.db().collection('carrosp').where('uid','==',S.uid).limit(5),s=>{ C.euP=s.docs.length?s.docs[0].data():{}; C.lido.euP=true; P.rerender(); });
    P.inscrever('cv-eu-t',()=>P.db().collection('carrost').where('uid','==',S.uid).limit(50),s=>{ C.euT=s.docs.map(d=>d.data()); C.lido.euT=true; P.rerender(); }); }
  C.euP={}; C.euT=[]; C.mt={};
  const termoOk=()=>{ const v=termoAtual().versao; return (C.euT||[]).some(t=>(+t.versao||0)>=v); };
  function cTermo(){ const nome=C.euP.nome||eu(), cpf=C.euP.cpf||'', tx=termoPreenche(termoAtual().texto,nome,cpf);
    return `<section class="card cv-fl cv-ace cv-termoc"><div class="cv-flh vol"><p class="cv-eb">Antes de usar os carros</p><h2 class="cv-tth">Termo de ciência</h2><p class="cv-fmod">Leia e aceite uma vez. Fica registrado com data e hora.</p></div><div class="cv-flb">
      <pre class="cv-tpre cv-tpm">${esc(tx)}</pre>${!cpf?'<p class="cv-obs0 warn">Seu CPF ainda não foi cadastrado. Peça para o administrador da frota cadastrar.</p>':''}
      <label class="cv-termo"><input type="checkbox" data-act="cv-mt-c"${C.mt.ok?' checked':''}><span>Li o termo e estou ciente das regras de uso dos veículos da empresa.</span></label>
      ${C.mt.err?`<p class="cv-err" role="alert">${esc(C.mt.err)}</p>`:''}
      <button type="button" class="cv-bt1 vol cv-wide" data-act="cv-mt-ok"${C.salv?' disabled':''}>${C.salv?'Salvando…':'Aceito o termo'}</button></div></section>`; }
  async function aceitaTermo(){ if(C.salv) return; if(!C.mt.ok){ C.mt.err='Marque que leu o termo e está ciente.'; P.render(); return; }
    const T=termoAtual(), nome=C.euP.nome||eu(), cpf=C.euP.cpf||'', mot=(C.cad.mot||[]).find(m=>m.uid===S.uid), id='u'+S.uid+'-v'+T.versao;
    const d={uid:S.uid,motId:mot?mot.id:null,nome,cpf,versao:T.versao,texto:termoPreenche(T.texto,nome,cpf),em:new Date().toISOString(),aparelho:String(navigator.userAgent||'').slice(0,160)};
    C.salv=true; P.render(); try{ await P.db().doc('carrost/'+id).set(d); C.euT=(C.euT||[]).concat([d]); C.mt={}; P.toast('Termo aceito. Obrigado!'); }catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  const devolPend=v=>!!(v&&v.precisaAceite&&!v.aberta&&v.emV&&!v.devol&&!v.removido);
  /* aviso no próprio aparelho quando chega pendência nova (o painel aberto ou em segundo plano) */
  function notificaMot(){ const ids=C.meus.filter(v=>aceitePend(v)||devolPend(v)).map(v=>v._id+(v.emV?'v':'s')); if(_vistos===null){ _vistos=new Set(ids); return; }
    const novos=C.meus.filter(v=>(aceitePend(v)||devolPend(v))&&!_vistos.has(v._id+(v.emV?'v':'s'))); ids.forEach(i=>_vistos.add(i)); if(!novos.length) return;
    const v=novos[0], tit=devolPend(v)?'Confirme a devolução do '+plT(v.placa):'Confirme a saída com o '+plT(v.placa), txt=devolPend(v)?'A portaria registrou a volta com '+fK(v.kmV)+' km.':'A portaria registrou a sua saída com '+fK(v.kmS)+' km.';
    try{ if('Notification' in window&&Notification.permission==='granted'&&navigator.serviceWorker){ navigator.serviceWorker.getRegistration().then(r=>{ if(r) r.showNotification(tit,{body:txt,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'cv-'+v._id,renotify:true}); else new Notification(tit,{body:txt}); }); } }catch(e){} try{ if(navigator.vibrate) navigator.vibrate([200,100,200]); }catch(e){} }
  /* 27/11: sem ntfy (pedido "tudo dentro do painel"): a confirmação acontece na hora, na portaria */
  function avisaMot(){}
  const frotaTxt=c=>c&&c.frota?'Frota '+c.frota:'';
  /* foto: reduz e guarda em carrosf/<id> (como as fotos dos chamados) */
  function reduzFoto(file){ return new Promise((ok,no)=>{ const fr=new FileReader(); fr.onload=()=>{ const img=new Image(); img.onload=()=>{ const k=Math.min(1,1280/Math.max(img.width,img.height)), w=Math.round(img.width*k), h=Math.round(img.height*k);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h); let q=.7, d=cv.toDataURL('image/jpeg',q); while(d.length>650000&&q>.3){ q-=.12; d=cv.toDataURL('image/jpeg',q); } ok(d); }; img.onerror=()=>no(new Error('Não deu para abrir a foto.')); img.src=fr.result; }; fr.onerror=()=>no(fr.error); fr.readAsDataURL(file); }); }
  async function guardaFotos(vid,tipo,ds){ const ids=[]; for(const d of ds){ const id=novoId('f'); await P.db().doc('carrosf/'+id).set({d,viagem:vid,tipo,em:new Date().toISOString(),por:S.uid||null}); C.fotos[id]=d; ids.push(id); } return ids; }
  async function fotoDe(id){ if(id in C.fotos) return C.fotos[id]; C.fotos[id]=null; try{ const g=await P.db().doc('carrosf/'+id).get(); C.fotos[id]=g.exists?g.data().d:''; }catch(e){ C.fotos[id]=''; } P.rerender(); return C.fotos[id]; }
  function verFoto(id){ const d=C.fotos[id]; if(!d){ fotoDe(id).then(x=>{ if(x) verFoto(id); }); return; } const ov=document.createElement('div'); ov.className='cv-fov'; ov.innerHTML=`<img src="${d}" alt="Foto"><button type="button" aria-label="Fechar">✕</button>`; ov.addEventListener('click',()=>ov.remove()); document.body.appendChild(ov); }
  const fotosLinks=ids=>(ids||[]).length?`<span class="cv-fl2">${ids.map((id,i)=>`<button type="button" class="lnk" data-act="cv-foto" data-v="${esc(id)}">foto ${i+1}</button>`).join(' ')}</span>`:'';
  const simNao=(grp,val,sim,nao,inv)=>`<div class="cv-sn" role="radiogroup">${[[true,sim],[false,nao]].map(([b,t])=>`<button type="button" role="radio" aria-checked="${val===b}" class="cv-snb${val===b?' on '+((b!==!!inv)?'bom':'ruim'):''}" data-act="cv-sn" data-v="${grp}|${b?1:0}">${t}</button>`).join('')}</div>`;
  function blocoFotos(st,id){ const fs=st.fotos||[]; return `<div class="cv-fts">${fs.map((d,i)=>`<span class="cv-ft"><img src="${d}" alt="Foto ${i+1}"><button type="button" data-act="cv-ftx" data-v="${id}|${i}" aria-label="Tirar a foto ${i+1}">✕</button></span>`).join('')}
      ${fs.length<3?`<label class="cv-ftadd"><input type="file" accept="image/*" capture="environment" data-cvfoto="${id}" hidden><span>📷</span><b>${fs.length?'Mais uma foto':'Tirar foto'}</b></label>`:''}</div>`; }
  function vMotorista(){ const so=soloDe('motorista','motorista'); try{ document.body.classList.toggle('cv-solo',so); }catch(e){}
    const corpo=vMotCorpo(); return so?`<div class="cv-app">${appBar('Motorista')}<main class="cv-appc">${corpo}</main></div>`:corpo; }
  function vMotCorpo(){ if(!C.lido.meus||!C.lido.cadM||!C.lido.euT) return '<section class="card"><div class="empty">Carregando as suas viagens…</div></section>';
    const xs=C.meus, h=hoje(), cp=h.slice(0,7), mes=xs.filter(v=>(v.diaS||'').slice(0,7)===cp), kmMes=mes.reduce((a,v)=>a+(+v.rodou||0),0);
    const pend=xs.filter(aceitePend), dev=xs.filter(devolPend), comigo=xs.filter(v=>v.aberta&&v.aceite&&!v.devolPed), ped=xs.filter(v=>v.pedida&&!v.cancelada&&!v.recusada), devAg=xs.filter(v=>v.devolPed);
    const nm=(eu()||'').split(' ')[0], np=('Notification' in window)?Notification.permission:'x';
    const hero=`<section class="cv-hero so cv-mh"><div class="cv-hh"><div><p class="cv-eb">Olá${nm?', '+esc(nm):''}</p><h1>${!termoOk()?'Aceite o termo':pend.length?'Confirme a saída':dev.length?'Confirme a devolução':ped.length||devAg.length?'Aguardando a portaria':comigo.length?'Você está com o carro':'Retirar carro'}</h1></div></div>
      <div class="cv-cnt"><div><b>${mes.length}</b><span>viagens no mês</span></div><div><b>${fK(kmMes)}</b><span>km no mês</span></div><div><b>${xs.length}</b><span>no total</span></div></div></section>
      `;
    const cab=(v,t,cl)=>`<div class="cv-flh ${cl}"><p class="cv-eb">${t}</p>${placa(v.placa,'g')}<p class="cv-fmod">${esc([v.modelo,v.frota?'Frota '+v.frota:''].filter(Boolean).join(' · '))}</p></div>`;
    const cAceite=v=>{ const M=C.ma[v._id]||(C.ma[v._id]={}); return `<section class="card cv-fl cv-ace" id="cv-ace-${esc(v._id)}">${cab(v,'A portaria registrou a sua saída','sai')}<div class="cv-flb">
      <dl class="cv-fdl"><div><dt>Km na saída</dt><dd>${fK(v.kmS)}</dd></div><div><dt>Saída</dt><dd>${esc(quando(v.emS))}</dd></div><div><dt>Porteiro</dt><dd>${esc((v.porSN||'').split(' ').slice(0,2).join(' '))}</dd></div></dl>
      <p class="cv-q">O carro estava limpo?</p>${simNao('limpo',M.limpo,'Sim, limpo','Não, estava sujo')}
      <p class="cv-q">Tinha alguma avaria antes da saída?</p>${simNao('avaria',M.avaria,'Sim, tinha','Não tinha',true)}
      ${M.avaria?`<label class="cv-lb" for="cv-ma-av">O que você notou?</label><textarea id="cv-ma-av" class="cv-in cv-ta" data-cvmv="${esc(v._id)}" maxlength="400" placeholder="Ex.: risco na porta direita, retrovisor quebrado">${esc(M.avariaTxt||'')}</textarea>
        <p class="cv-lb">Foto da avaria <small>se puder</small></p>${blocoFotos(M,v._id)}`:''}
      <label class="cv-termo"><input type="checkbox" data-act="cv-ma-t" data-v="${esc(v._id)}"${M.termo?' checked':''}><span>${esc(TERMO)}</span></label>
      ${M.err?`<p class="cv-err" role="alert">${esc(M.err)}</p>`:''}
      <button type="button" class="cv-bt1 sai cv-wide" data-act="cv-ma-ok" data-v="${esc(v._id)}"${C.salv?' disabled':''}>${C.salv?'Salvando…':'Confirmo que peguei o carro'}</button></div></section>`; };
    const cDevol=v=>{ const D=C.md[v._id]||(C.md[v._id]={}); return `<section class="card cv-fl cv-ace" id="cv-dev-${esc(v._id)}">${cab(v,'A portaria registrou a volta','vol')}<div class="cv-flb">
      <p class="cv-q">O km de retorno está certo?</p><div class="cv-kmc"><b>${fK(v.kmV)} km</b><small>registrado pela portaria ${esc(quando(v.emV))} · rodou ${fK(v.rodou)} km</small></div>
      ${simNao('kmOk',D.kmOk,'Sim, confere','Não, está diferente')}
      ${D.kmOk===false?`<label class="cv-lb" for="cv-md-km">Km que está no painel do carro</label><div class="cv-kmw"><input id="cv-md-km" class="cv-kmi" inputmode="numeric" autocomplete="off" data-cvmd="${esc(v._id)}|kmMot" value="${esc(D.kmMot||'')}" placeholder="${esc(fK(v.kmV))}"><span>km</span></div>`:''}
      <p class="cv-q">Teve abastecimento?</p>${simNao('abast',D.abast,'Sim','Não')}
      ${D.abast?`<div class="cv-g2b"><label class="cv-lb">Litros <small>opcional</small><input class="cv-in" inputmode="decimal" data-cvmd="${esc(v._id)}|litros" value="${esc(D.litros||'')}" placeholder="30"></label><label class="cv-lb">Valor (R$) <small>opcional</small><input class="cv-in" inputmode="decimal" data-cvmd="${esc(v._id)}|valor" value="${esc(D.valor||'')}" placeholder="180,00"></label></div>`:''}
      <p class="cv-q">Teve alguma avaria no trajeto?</p>${simNao('avaria',D.avaria,'Sim, teve','Não teve',true)}
      ${D.avaria?`<label class="cv-lb" for="cv-md-av">O que aconteceu?</label><textarea id="cv-md-av" class="cv-in cv-ta" data-cvmd="${esc(v._id)}|avariaTxt" maxlength="400" placeholder="Ex.: bati o para-choque no estacionamento">${esc(D.avariaTxt||'')}</textarea>
        <p class="cv-lb">Foto da avaria <small>se puder</small></p>${blocoFotos(D,'d'+v._id)}`:''}
      <p class="cv-q">O carro está limpo?</p>${simNao('limpo',D.limpo,'Sim, limpo','Não, está sujo')}
      ${D.err?`<p class="cv-err" role="alert">${esc(D.err)}</p>`:''}
      <button type="button" class="cv-bt1 vol cv-wide" data-act="cv-md-ok" data-v="${esc(v._id)}"${C.salv?' disabled':''}>${C.salv?'Salvando…':'Confirmar devolução'}</button></div></section>`; };
    const cComigo=v=>{ const D=C.dv[v._id]; if(D&&D.aberto) return cEntregar(v); return `<section class="card cv-com"><div class="cv-tt">${placa(v.placa)}<span class="cv-chip">${SVG.rel}há ${esc(dur(Date.now()-new Date(v.emS).getTime()))}</span></div>
      <p class="cv-p2">${esc([v.modelo,v.frota?'Frota '+v.frota:''].filter(Boolean).join(' · '))} · saiu ${esc(quando(v.emS))} com ${fK(v.kmS)} km</p>
      <button type="button" class="cv-bt1 vol cv-wide" data-act="cv-dv-abre" data-v="${esc(v._id)}">${SVG.vol}Devolver o carro</button><p class="cv-hint">Na volta, na portaria: toque aqui, tire a foto do painel e responda as perguntas.</p></section>`; };
    const cAguarda=(v,dev)=>`<section class="card cv-agu ${dev?'vol':'sai'}" role="status"><div class="cv-aguh"><span class="cv-pul" aria-hidden="true"></span><div><p class="cv-eb">${dev?'Carro entregue':'Pedido de saída enviado'}</p><h2>${dev?'Aguardando a portaria receber':'Aguardando a portaria liberar'}</h2></div></div>
      <div class="cv-tt">${placa(v.placa)}${v.frota?`<span class="cv-fro">Frota ${esc(v.frota)}</span>`:''}</div><p class="cv-p2">${dev?fK((v.devol||{}).kmV)+' km · rodou '+fK(((v.devol||{}).kmV||0)-(+v.kmS||0))+' km':fK(v.kmS)+' km'} · ${dev?'entregue':'pedido'} ${esc(quando(dev?(v.devol||{}).em:(v.pedS||{}).em))}</p>
      <p class="cv-hint">${dev?'O porteiro confere e toca em "Recebido". Pode deixar a chave na portaria.':'Fale com o porteiro: ele confere e toca em "Liberar saída". Esta tela atualiza sozinha.'}</p>${dev?'':`<button type="button" class="lnk" data-act="cv-ped-x" data-v="${esc(v._id)}">Cancelar o pedido</button>`}</section>`;
    const rec=xs.find(v=>v.recusada&&Date.now()-new Date(v.recusada.em).getTime()<6*3600e3&&!C.vistoRec[v._id]);
    const aviso=rec?`<div class="cv-msg warn" role="alert">A portaria recusou a saída com o ${esc(plT(rec.placa))}${rec.recusada.motivo?': '+esc(rec.recusada.motivo):''}. <button type="button" class="lnk" data-act="cv-rec-ok" data-v="${esc(rec._id)}">Ok</button></div>`:'';
    const st=v=>v.pedida&&!v.cancelada&&!v.recusada?'<span class="cv-tag info">Aguardando a portaria</span>':v.recusada?'<span class="cv-tag warn">Recusada</span>':v.cancelada?'<span class="cv-tag">Cancelada</span>':aceitePend(v)?'<span class="cv-tag warn">Falta o aceite</span>':devolPend(v)?'<span class="cv-tag warn">Falta a devolução</span>':v.devolPed?'<span class="cv-tag info">Entregue</span>':v.aberta?'<span class="cv-tag info">Em uso</span>':'<span class="cv-tag ok">Concluída</span>';
    const hist=xs.length?`<section class="card cv-tl cv-hist"><h2>Histórico</h2><ul>${xs.slice(0,60).map(v=>`<li>${placa(v.placa,'p')}<span><b>${esc(brD(v.diaS||diaDe(v.emS)))} · ${v.aberta||v.pedida||v.recusada||v.cancelada?'—':fK(v.rodou)+' km'}</b><small>${v.pedida||v.recusada||v.cancelada?fK(v.kmS)+' km':'saída '+esc(hm(v.emS))+' · '+fK(v.kmS)+' km'}${v.emV?' — volta '+esc(hm(v.emV))+' · '+fK(v.kmV)+' km':''}${v.devol&&v.devol.abast?' · abasteceu':''}</small></span>${st(v)}</li>`).join('')}</ul></section>`
      :'<section class="card cv-vz"><h2>Nenhuma viagem ainda</h2><p>Para sair com um carro, escaneie o QR colado nele e peça a saída aqui.</p></section>';
    if(!termoOk()) return hero+cTermo()+hist;
    const livre=!pend.length&&!dev.length&&!ped.length&&!devAg.length&&!comigo.length;
    return hero+aviso+pend.map(cAceite).join('')+dev.map(cDevol).join('')+ped.map(v=>cAguarda(v,false)).join('')+devAg.map(v=>cAguarda(v,true)).join('')+comigo.map(cComigo).join('')+(livre?cRetirar():'')+hist; }
  /* ---------- motorista: retirar e devolver pelo celular (27/11) ---------- */
  C.vistoRec={};
  const meuMot=()=>(C.cad.mot||[]).find(m=>m.uid===S.uid&&!m.removido)||null;
  const ultKmM=c=>c?Math.max(+c.km||0,+((C.kmM[c.id]||{}).km)||0,...C.meus.filter(v=>v.carro===c.id&&!v.pedida&&!v.recusada&&!v.cancelada).map(v=>Math.max(+v.kmS||0,+v.kmV||0))):0;
  const foraM=c=>{ const k=C.kmM[c.id]; return k&&k.fora?(k.mot||'outra pessoa'):''; };
  function fotoPainel(st,key){ return st.foto?`<div class="cv-fts"><span class="cv-ft cv-ftp"><img src="${st.foto}" alt="Foto do painel"><button type="button" data-act="cv-ftx" data-v="${key}|0" aria-label="Tirar a foto do painel">✕</button></span></div>`
      :`<label class="cv-ftpain"><input type="file" accept="image/*" capture="environment" data-cvfoto="${key}" hidden><span aria-hidden="true">📷</span><b>Tirar foto do painel</b><small>Mostrando o km (e o combustível)</small></label>`; }
  function motCarro(id){ const c=carDe(id); C.mr={car:id,km:'',err:''}; if(!c){ C.mr={err:'Carro não encontrado.'}; } else if(c.ativo===false){ C.mr={err:'O carro '+plT(c.placa)+' está desativado. Fale com o administrador da frota.'}; } else if(foraM(c)){ C.mr={err:'O '+plT(c.placa)+' consta como fora com '+foraM(c)+'. Fale com a portaria.'}; } P.render(); window.scrollTo({top:0,behavior:'smooth'}); }
  function cRetirar(){ const m=meuMot();
    if(!m) return '<section class="card cv-vz"><h2>Seu login ainda não está ligado a um motorista</h2><p>Peça para o administrador da frota ligar o seu login em Carros › Carros e motoristas.</p></section>';
    if(m.ok===false) return '<section class="card cv-vz"><h2>Você está bloqueado para usar os carros</h2><p>Fale com o administrador da frota.</p></section>';
    const M=C.mr, c=M.car&&carDe(M.car);
    if(!c){ const cs=ativos();
      return `<section class="card cv-ret"><h2 class="cv-reth">Vai sair com um carro?</h2>${C.cam.on?`<div class="cv-cam"><div class="cv-vw"><video id="cv-video" playsinline muted autoplay></video><span class="cv-mira" aria-hidden="true"><i></i></span></div><p>Aponte para o QR colado no carro</p><button type="button" class="cv-bt2" data-act="cv-camx">Cancelar</button></div>`
        :`<button type="button" class="cv-scan" data-act="cv-cam"><span class="cv-qric" aria-hidden="true">${SVG.qr}</span><span class="cv-sct"><b>Escanear QR do carro</b><small>O QR está colado no carro</small></span></button>`}${C.cam.erro?`<p class="cv-err">${esc(C.cam.erro)}</p>`:''}${M.err?`<p class="cv-err" role="alert">${esc(M.err)}</p>`:''}
        ${cs.length?`<p class="cv-lb">Ou escolha o carro</p><div class="cv-esc">${cs.map(x=>{ const f=foraM(x); return `<button type="button" class="cv-escb" data-act="cv-mcar" data-v="${esc(x.id)}"${f?' disabled':''}>${placa(x,'p')}<span><b>${esc(x.frota?'Frota '+x.frota:x.modelo||'Carro')}</b><small>${f?'fora com '+esc(f):esc(x.modelo||'')}</small></span></button>`; }).join('')}</div>`:''}</section>`; }
    const uk=ultKmM(c), er=M.err||'';
    return `<section class="card cv-fl cv-ace" id="cv-mr"><div class="cv-flh sai"><button type="button" class="cv-x" data-act="cv-mr-x" aria-label="Voltar">‹ Voltar</button><p class="cv-eb">Pedir saída</p>${placa(c,'g')}<p class="cv-fmod">${esc([c.frota?'Frota '+c.frota:'',c.modelo].filter(Boolean).join(' · '))}</p></div><div class="cv-flb">
      <label class="cv-lb" for="cv-mr-km">Km no painel</label><div class="cv-kmw"><input id="cv-mr-km" class="cv-kmi" inputmode="numeric" autocomplete="off" data-cvmr="km" value="${esc(M.km||'')}" placeholder="${esc(fK(uk))}"><span>km</span></div><p class="cv-hint">Último km registrado: <b>${fK(uk)}</b></p>
      <p class="cv-lb">Foto do painel</p>${fotoPainel(M,'mrp')}
      <p class="cv-q">O carro está limpo?</p>${simNao('limpo',M.limpo,'Sim, limpo','Não, está sujo')}
      <p class="cv-q">Tem alguma avaria?</p>${simNao('avaria',M.avaria,'Sim, tem','Não tem',true)}
      ${M.avaria?`<label class="cv-lb" for="cv-mr-av">O que você notou?</label><textarea id="cv-mr-av" class="cv-in cv-ta" data-cvmr="avariaTxt" maxlength="400" placeholder="Ex.: risco na porta direita">${esc(M.avariaTxt||'')}</textarea><p class="cv-lb">Foto da avaria <small>se puder</small></p>${blocoFotos(M,'mr')}`:''}
      <label class="cv-termo"><input type="checkbox" data-act="cv-mr-t"${M.termo?' checked':''}><span>${esc(TERMO)}</span></label>
      ${er?`<p class="cv-err" role="alert">${esc(er)}</p>`:''}
      <button type="button" class="cv-bt1 sai cv-wide" data-act="cv-mr-ok"${C.salv?' disabled':''}>${C.salv?'Enviando…':'Pedir saída à portaria'}</button></div></section>`; }
  function cEntregar(v){ const D=C.dv[v._id]||(C.dv[v._id]={}), kmv=kmNum(D.km), rod=Number.isFinite(kmv)&&kmv>=v.kmS?kmv-v.kmS:null;
    return `<section class="card cv-fl cv-ace" id="cv-dv-${esc(v._id)}"><div class="cv-flh vol"><button type="button" class="cv-x" data-act="cv-dv-x" data-v="${esc(v._id)}" aria-label="Voltar">‹ Voltar</button><p class="cv-eb">Devolver o carro</p>${placa(v.placa,'g')}<p class="cv-fmod">${esc([v.frota?'Frota '+v.frota:'',v.modelo].filter(Boolean).join(' · '))} · saiu com ${fK(v.kmS)} km</p></div><div class="cv-flb">
      <label class="cv-lb" for="cv-dv-km">Km no painel agora</label><div class="cv-kmw"><input id="cv-dv-km" class="cv-kmi" inputmode="numeric" autocomplete="off" data-cvdv="${esc(v._id)}|km" value="${esc(D.km||'')}" placeholder="${esc(fK(v.kmS))}"><span>km</span></div><p class="cv-hint" id="cv-dv-rod">${rod!=null?'Rodou <b>'+fK(rod)+' km</b>':'Na saída estava com <b>'+fK(v.kmS)+' km</b>'}</p>
      <p class="cv-lb">Foto do painel</p>${fotoPainel(D,'dvp:'+v._id)}
      <p class="cv-q">Teve abastecimento?</p>${simNao('abast',D.abast,'Sim','Não')}
      ${D.abast?`<div class="cv-g2b"><label class="cv-lb">Litros <small>opcional</small><input class="cv-in" inputmode="decimal" data-cvdv="${esc(v._id)}|litros" value="${esc(D.litros||'')}" placeholder="30"></label><label class="cv-lb">Valor (R$) <small>opcional</small><input class="cv-in" inputmode="decimal" data-cvdv="${esc(v._id)}|valor" value="${esc(D.valor||'')}" placeholder="180,00"></label></div>`:''}
      <p class="cv-q">Teve alguma avaria no trajeto?</p>${simNao('avaria',D.avaria,'Sim, teve','Não teve',true)}
      ${D.avaria?`<label class="cv-lb" for="cv-dv-av">O que aconteceu?</label><textarea id="cv-dv-av" class="cv-in cv-ta" data-cvdv="${esc(v._id)}|avariaTxt" maxlength="400" placeholder="Ex.: bati o para-choque no estacionamento">${esc(D.avariaTxt||'')}</textarea><p class="cv-lb">Foto da avaria <small>se puder</small></p>${blocoFotos(D,'dv:'+v._id)}`:''}
      <p class="cv-q">O carro está limpo?</p>${simNao('limpo',D.limpo,'Sim, limpo','Não, está sujo')}
      ${D.err?`<p class="cv-err" role="alert">${esc(D.err)}</p>`:''}
      <button type="button" class="cv-bt1 vol cv-wide" data-act="cv-dv-ok" data-v="${esc(v._id)}"${C.salv?' disabled':''}>${C.salv?'Enviando…':'Entregar o carro'}</button></div></section>`; }
  async function pedirSaida(){ const M=C.mr, c=carDe(M.car), m=meuMot(); if(!c||!m||C.salv) return; const err=t=>{ M.err=t; P.render(); };
    if(m.ok===false) return err('Você está bloqueado para usar os carros.'); if(foraM(c)) return err('Este carro consta como fora com '+foraM(c)+'. Fale com a portaria.');
    if(C.meus.some(v=>(v.pedida&&!v.cancelada&&!v.recusada)||v.aberta)) return err('Você já tem um carro em uso ou um pedido aberto.');
    const km=kmNum(M.km), uk=ultKmM(c);
    if(!Number.isFinite(km)||km<=0) return err('Digite o km que está no painel do carro.'); if(km<uk) return err('O km não pode ser menor que o último registrado ('+fK(uk)+' km).');
    if(!M.foto) return err('Tire a foto do painel do carro (mostrando o km).'); if(M.limpo==null) return err('Responda se o carro está limpo.'); if(M.avaria==null) return err('Responda se tem alguma avaria.');
    if(M.avaria&&String(M.avariaTxt||'').trim().length<3) return err('Escreva qual é a avaria.'); if(!M.termo) return err('Marque a confirmação de responsabilidade pelo carro.');
    C.salv=true; P.render();
    try{ const id=novoId('v'), agora=new Date().toISOString(), [fp]=await guardaFotos(id,'painel-saida',[M.foto]), fotos=M.avaria&&(M.fotos||[]).length?await guardaFotos(id,'saida',M.fotos):[];
      const ac={em:agora,pegou:true,limpo:!!M.limpo,avaria:!!M.avaria,avariaTxt:M.avaria?String(M.avariaTxt).trim().slice(0,400):'',fotos,termo:true,termoTxt:TERMO,por:S.uid||null};
      const doc={carro:c.id,placa:c.placa,modelo:c.modelo||'',frota:c.frota||'',mot:m.id,motNome:m.nome,motUid:S.uid,precisaAceite:true,aceite:ac,kmS:km,emS:agora,diaS:hoje(),pedida:true,aberta:false,pedS:{em:agora},fotoPS:fp,obsS:''};
      await P.db().doc('carrosv/'+id).set(doc); C.meus=[Object.assign({_id:id},doc)].concat(C.meus); C.mr={}; P.toast('Pedido enviado. Fale com o porteiro.'); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  async function entregar(id){ const v=C.meus.find(x=>x._id===id); if(!v||C.salv) return; const D=C.dv[id]||(C.dv[id]={}); const err=t=>{ D.err=t; P.render(); };
    const km=kmNum(D.km); if(!Number.isFinite(km)||km<=0) return err('Digite o km que está no painel do carro.'); if(km<+v.kmS) return err('O km não pode ser menor que o da saída ('+fK(v.kmS)+' km).');
    if(km-v.kmS>1500&&!D.conf){ D.conf=true; return err('Rodou '+fK(km-v.kmS)+' km? Confira o número e toque de novo em "Entregar o carro".'); }
    if(!D.foto) return err('Tire a foto do painel do carro (mostrando o km).'); if(D.abast==null) return err('Responda se teve abastecimento.'); if(D.avaria==null) return err('Responda se teve alguma avaria no trajeto.');
    if(D.avaria&&String(D.avariaTxt||'').trim().length<3) return err('Escreva o que aconteceu.'); if(D.limpo==null) return err('Responda se o carro está limpo.');
    C.salv=true; P.render();
    try{ const [fp]=await guardaFotos(id,'painel-volta',[D.foto]), fotos=D.avaria&&(D.fotos||[]).length?await guardaFotos(id,'volta',D.fotos):[];
      const dv={em:new Date().toISOString(),kmV:km,kmOk:true,kmMot:null,abast:!!D.abast,litros:D.abast?vazioNum(D.litros):null,valor:D.abast?vazioNum(D.valor):null,avaria:!!D.avaria,avariaTxt:D.avaria?String(D.avariaTxt).trim().slice(0,400):'',fotos,limpo:!!D.limpo,por:S.uid||null};
      await P.db().doc('carrosv/'+id).update({devol:dv,devolPed:true,fotoPV:fp}); Object.assign(v,{devol:dv,devolPed:true,fotoPV:fp}); delete C.dv[id]; P.toast('Carro entregue. Aguarde o porteiro conferir.'); }
    catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  async function cancelarPed(id){ const v=C.meus.find(x=>x._id===id); if(!v) return; if(!confirm('Cancelar o pedido de saída com o '+plT(v.placa)+'?')) return;
    try{ await P.db().doc('carrosv/'+id).update({pedida:false,cancelada:{em:new Date().toISOString()}}); v.pedida=false; v.cancelada={em:new Date().toISOString()}; }catch(e){ P.erro(e); } P.render(); }

  const vazioNum=t=>{ const x=String(t||'').trim().replace(/\./g,'').replace(',','.'); return x&&Number.isFinite(+x)?+x:null; };
  async function aceitar(id){ const v=C.meus.find(x=>x._id===id); if(!v||C.salv) return; const M=C.ma[id]||(C.ma[id]={}); const err=t=>{ M.err=t; P.render(); };
    if(M.limpo==null) return err('Responda se o carro estava limpo.'); if(M.avaria==null) return err('Responda se tinha alguma avaria antes da saída.');
    if(M.avaria&&String(M.avariaTxt||'').trim().length<3) return err('Escreva qual era a avaria.'); if(!M.termo) return err('Marque a confirmação de que pegou o carro.');
    C.salv=true; P.render();
    try{ const fotos=M.avaria&&(M.fotos||[]).length?await guardaFotos(id,'saida',M.fotos):[];
      const ac={em:new Date().toISOString(),pegou:true,limpo:!!M.limpo,avaria:!!M.avaria,avariaTxt:M.avaria?String(M.avariaTxt).trim().slice(0,400):'',fotos,termo:true,termoTxt:TERMO,por:S.uid||null};
      await P.db().doc('carrosv/'+id).update({aceite:ac}); v.aceite=ac; delete C.ma[id]; P.toast('Saída confirmada. Boa viagem!'); }catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  async function devolver(id){ const v=C.meus.find(x=>x._id===id); if(!v||C.salv) return; const D=C.md[id]||(C.md[id]={}); const err=t=>{ D.err=t; P.render(); };
    if(D.kmOk==null) return err('Confirme o km de retorno.'); const km=D.kmOk?null:kmNum(D.kmMot); if(D.kmOk===false&&(!Number.isFinite(km)||km<=0)) return err('Digite o km que está no painel do carro.');
    if(D.abast==null) return err('Responda se teve abastecimento.'); if(D.avaria==null) return err('Responda se teve alguma avaria no trajeto.');
    if(D.avaria&&String(D.avariaTxt||'').trim().length<3) return err('Escreva o que aconteceu.'); if(D.limpo==null) return err('Responda se o carro está limpo.');
    C.salv=true; P.render();
    try{ const fotos=D.avaria&&(D.fotos||[]).length?await guardaFotos(id,'volta',D.fotos):[];
      const dv={em:new Date().toISOString(),kmOk:!!D.kmOk,kmMot:D.kmOk?null:km,abast:!!D.abast,litros:D.abast?vazioNum(D.litros):null,valor:D.abast?vazioNum(D.valor):null,avaria:!!D.avaria,avariaTxt:D.avaria?String(D.avariaTxt).trim().slice(0,400):'',fotos,limpo:!!D.limpo,por:S.uid||null};
      await P.db().doc('carrosv/'+id).update({devol:dv}); v.devol=dv; delete C.md[id]; P.toast('Devolução confirmada. Obrigado!'); }catch(e){ P.erro(e); } finally{ C.salv=false; P.render(); } }
  function fotoAlvo(k){ if(k==='mrp') return [C.mr,'foto']; if(k==='mr') return [C.mr,'fotos']; if(k.startsWith('dvp:')) return [C.dv[k.slice(4)]||(C.dv[k.slice(4)]={}),'foto']; if(k.startsWith('dv:')) return [C.dv[k.slice(3)]||(C.dv[k.slice(3)]={}),'fotos'];
    if(k[0]==='d') return [C.md[k.slice(1)]||(C.md[k.slice(1)]={}),'fotos']; return [C.ma[k]||(C.ma[k]={}),'fotos']; }
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset||!t.dataset.cvfoto) return; const [st,campo]=fotoAlvo(t.dataset.cvfoto); const f=t.files&&t.files[0]; if(!f) return;
    try{ const d=await reduzFoto(f); if(campo==='foto') st.foto=d; else st.fotos=(st.fotos||[]).concat([d]).slice(0,3); st.err=''; }catch(e){ P.toast(e.message||'Não deu para usar a foto.'); } P.render(); });

  /* ---------- módulos e cargo ---------- */
  P.cvBar=appBar; /* a tela Caminhões (modulos/bordo.js, 27/11) usa a mesma barra no celular da portaria */
  P.registrarModulo({ id:'portaria', nome:'Portaria · carros', ic:'portaria', telas:{ portaria:{nome:'Portaria',mob:'Portaria',render:vPortaria}, bdport:{nome:'Carregamento da expedição',mob:'Expedição',render:()=>P.bordoPort?P.bordoPort():'<section class="card"><div class="empty">Carregando…</div></section>'}, bdmot:{nome:'TV dos motoristas',mob:'TV',menu:false,render:()=>P.bordoMot?P.bordoMot():'<section class="card"><div class="empty">Carregando…</div></section>'} }, iniciar:carregar });
  P.registrarModulo({ id:'carros', nome:'Carros', ic:'carro', telas:{ carviag:{nome:'Viagens',render:vViagens}, carcad:{nome:'Carros e motoristas',render:vCad} }, iniciar:carregar });
  P.registrarModulo({ id:'motorista', nome:'Motorista · carros', ic:'carro', telas:{ motorista:{nome:'Minhas viagens',mob:'Viagens',render:vMotorista} }, iniciar:carregarMot });
  P.registrarPerfil('motorista',{ nome:'Motorista (carros)', mods:['motorista'], pos:6, desc:'Para o celular do vendedor/motorista: escaneia o QR do carro e pede a saída (km, foto do painel, estado do carro e termo), devolve o carro na volta (km, foto do painel, abastecimento, avaria, limpeza) e vê o histórico. A portaria só libera e recebe.' });
  P.registrarPerfil('portaria',{ nome:'Portaria (carros e caminhões)', mods:['portaria'], pos:5, desc:'Só as telas da portaria: escaneia o QR do carro e registra a saída e a volta com o motorista e o km; registra a chegada dos caminhões no diário de bordo (pedidos e representante). Não vê nada da fábrica.' });
  /* porteiro entra direto na portaria; ?carro= abre o carro */
  { let foi=false; const t=setInterval(()=>{ try{ const A=S.acs; if(!A||!A.pronto) return; clearInterval(t); const d=A.doc||{};
      /* 28/11/2026: o perfil da portaria abre sempre no Carregamento da expedição (a Frota fica a um toque) */
      if(!foi&&!A.dono&&d.perfil==='portaria'&&!/[?&]carro=/.test(location.search)){ const v=P.viewOk('bdport')?'bdport':P.viewOk('portaria')?'portaria':''; if(v&&S.view!==v){ foi=true; P.go(v); } }
      if(!foi&&!A.dono&&d.perfil==='motorista'&&S.view!=='motorista'&&P.viewOk('motorista')){ foi=true; P.go('motorista'); } abrirDaUrl(); }catch(e){ clearInterval(t); } },400); }
  P.registrarAviso(()=>{ if(!lido()||!adm()) return []; const xs=[], ag=Date.now();
    const velhos=C.fora.filter(v=>ag-new Date(v.emS).getTime()>14*3600e3); if(velhos.length) xs.push({nivel:'warn',rotulo:'Carros',titulo:velhos.length+(velhos.length>1?' carros fora há mais de 14 horas':' carro fora há mais de 14 horas'),texto:velhos.map(v=>plT(v.placa)+' com '+v.motNome).join(', '),go:'carviag'});
    const dif=C.viag.filter(v=>v.kmDif&&!v.removido&&(v.diaS||'')>=addD(hoje(),-6)); if(dif.length) xs.push({nivel:'warn',rotulo:'Carros',titulo:dif.length+(dif.length>1?' saídas':' saída')+' com km diferente do último registro',texto:'Nos últimos 7 dias: '+dif.slice(0,3).map(v=>plT(v.placa)+' +'+fK((+v.kmS)-(+v.kmEsp))+' km').join(', '),go:'carviag'});
    const dp=C.viag.filter(v=>devolPend(v)&&ag-new Date(v.emV).getTime()>2*3600e3); if(dp.length) xs.push({nivel:'warn',rotulo:'Carros',titulo:dp.length+(dp.length>1?' devoluções sem confirmação do motorista':' devolução sem confirmação do motorista'),texto:dp.map(v=>plT(v.placa)+' com '+v.motNome).join(', '),go:'carviag'});
    const pb=C.viag.filter(v=>v.devol&&(v.devol.avaria||!v.devol.kmOk)&&(v.diaS||'')>=addD(hoje(),-2)); if(pb.length) xs.push({nivel:'warn',rotulo:'Carros',titulo:pb.length+(pb.length>1?' devoluções com avaria ou km diferente':' devolução com avaria ou km diferente'),texto:pb.map(v=>plT(v.placa)+': '+(v.devol.avaria?'avaria':'')+(v.devol.avaria&&!v.devol.kmOk?' e ':'')+(!v.devol.kmOk?'km '+fK(v.devol.kmMot):'')).join(' · '),go:'carviag'});
    const sa=C.fora.filter(v=>aceitePend(v)&&ag-new Date(v.emS).getTime()>30*60e3); if(sa.length) xs.push({nivel:'warn',rotulo:'Carros',titulo:sa.length+(sa.length>1?' saídas sem aceite do motorista':' saída sem aceite do motorista'),texto:sa.map(v=>plT(v.placa)+' com '+v.motNome).join(', '),go:'carviag'});
    return xs; });
  P.registrarAviso(()=>{ if(!C.lido.meus) return []; const p=C.meus.filter(aceitePend), d=C.meus.filter(devolPend); return [].concat(p.length?[{nivel:'warn',rotulo:'Carro',titulo:'Confirme a saída com o '+plT(p[0].placa),texto:'A portaria registrou a sua saída. Toque para confirmar.',go:'motorista'}]:[]).concat(d.length?[{nivel:'warn',rotulo:'Carro',titulo:'Confirme a devolução do '+plT(d[0].placa),texto:'Confira o km e responda as perguntas da volta.',go:'motorista'}]:[]); });

  /* ---------- eventos ---------- */
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.dataset) return; if(t.id==='cv-m-lq'){ lgBusca(t.value); return; } if(t.id==='cv-m-cpf'){ const c=cpfL(t.value).slice(0,11); const f=c.length>9?c.slice(0,3)+'.'+c.slice(3,6)+'.'+c.slice(6,9)+'-'+c.slice(9):c.length>6?c.slice(0,3)+'.'+c.slice(3,6)+'.'+c.slice(6):c.length>3?c.slice(0,3)+'.'+c.slice(3):c; if(t.value!==f) t.value=f; return; } if(t.dataset.cvmv){ (C.ma[t.dataset.cvmv]||(C.ma[t.dataset.cvmv]={})).avariaTxt=t.value; return; }
    if(t.dataset.cvmr){ C.mr[t.dataset.cvmr]=t.value; return; }
    if(t.dataset.cvdv){ const [id,k]=t.dataset.cvdv.split('|'), D=C.dv[id]||(C.dv[id]={}); D[k]=t.value; if(k==='km'){ D.conf=false; const v=C.meus.find(x=>x._id===id), r=document.getElementById('cv-dv-rod'), n=kmNum(t.value); if(v&&r) r.innerHTML=Number.isFinite(n)&&n>=v.kmS?'Rodou <b>'+fK(n-v.kmS)+' km</b>':'Na saída estava com <b>'+fK(v.kmS)+' km</b>'; } return; } if(t.dataset.cvmd){ const [id,k]=t.dataset.cvmd.split('|'); (C.md[id]||(C.md[id]={}))[k]=t.value; return; } const k=t.dataset.cvf; if(!k) return; C.f[k]=t.value; if(C.f.err&&C.f.err.id===t.id){ C.f.err=null; const e=document.getElementById(t.id+'-e'); if(e) e.remove(); t.removeAttribute('aria-invalid'); const w=t.closest('.cv-kmw'); if(w) w.classList.remove('bad'); }
    if(k==='km'){ C.f.conf=false; const a=C.sel&&abertaDe(C.sel), r=document.getElementById('cv-rod'); if(a&&r){ const n=kmNum(t.value); r.innerHTML=Number.isFinite(n)&&n>=a.kmS?'<span>Rodou</span><b>'+fK(n-a.kmS)+' km</b>':''; } } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t) return;
    if(t.dataset&&t.dataset.cvf){ C.f[t.dataset.cvf]=t.value; if(t.dataset.cvf==='mot'&&C.f.err&&C.f.err.id==='cv-mot'){ C.f.err=null; P.render(); } return; }
    const m={'cv-q-per':'per','cv-q-de':'de','cv-q-ate':'ate','cv-q-car':'car','cv-q-mot':'mot','cv-q-st':'st'}[t.id]; if(m){ C.q[m]=t.value; P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key!=='Enter') return; const t=ev.target; if(!t||!t.dataset||!t.dataset.cvf||t.tagName==='SELECT') return; ev.preventDefault(); const a=C.sel&&abertaDe(C.sel); if(a) volta(); else saida(); });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="cv-"]'); if(!b) return; const a=b.dataset.act, v=b.dataset.v; if(a==='cv-mt-c'){ C.mt.ok=!!b.checked; C.mt.err=''; const e=b.closest('.cv-ace')&&b.closest('.cv-ace').querySelector('.cv-err[role="alert"]'); if(e) e.remove(); return; } if(a==='cv-mr-t'){ C.mr.termo=!!b.checked; C.mr.err=''; const e=b.closest('.cv-ace')&&b.closest('.cv-ace').querySelector('.cv-err[role="alert"]'); if(e) e.remove(); return; } if(a==='cv-ma-t'){ const M=C.ma[v]||(C.ma[v]={}); M.termo=!!b.checked; M.err=''; const e=b.closest('.cv-ace')&&b.closest('.cv-ace').querySelector('.cv-err[role="alert"]'); if(e) e.remove(); return; } ev.preventDefault();
    if(a==='cv-mot'){ C.f.mot=v; if(C.f.err&&C.f.err.id==='cv-mot') C.f.err=null; P.render(); return; }
    if(a==='cv-feito'){ C.msg=null; _autoCam=true; P.render(); return; }
    if(a==='cv-sn'){ const sec=b.closest('.cv-ace'); if(!sec) return; const [g,val]=String(v).split('|'); let st;
      if(sec.id==='cv-mr') st=C.mr; else if(sec.id.startsWith('cv-dv-')){ const id=sec.id.slice(6); st=C.dv[id]||(C.dv[id]={}); } else { const dev=sec.id.startsWith('cv-dev-'), id=sec.id.replace(/^cv-(ace|dev)-/,''); st=dev?(C.md[id]||(C.md[id]={})):(C.ma[id]||(C.ma[id]={})); }
      st[g]=val==='1'; st.err=''; P.render(); return; }
    if(a==='cv-mcar'){ camDesliga(); motCarro(v); return; } if(a==='cv-mr-x'){ C.mr={}; P.render(); return; } if(a==='cv-mr-ok') return pedirSaida();
    if(a==='cv-dv-abre'){ C.dv[v]=Object.assign(C.dv[v]||{},{aberto:true}); P.render(); window.scrollTo({top:0,behavior:'smooth'}); return; } if(a==='cv-dv-x'){ delete C.dv[v]; P.render(); return; } if(a==='cv-dv-ok') return entregar(v);
    if(a==='cv-ped-x') return cancelarPed(v); if(a==='cv-rec-ok'){ C.vistoRec[v]=1; P.render(); return; }
    if(a==='cv-pd-lib') return liberarPed(v); if(a==='cv-pd-rec') return recusarPed(v); if(a==='cv-dv-rec') return receberDev(v);
    if(a==='cv-ma-ok') return aceitar(v); if(a==='cv-md-ok') return devolver(v); if(a==='cv-mt-ok') return aceitaTermo();
    if(a==='cv-ftx'){ const p=String(v).lastIndexOf('|'), k=String(v).slice(0,p), i=+String(v).slice(p+1), [st,campo]=fotoAlvo(k); if(campo==='foto') st.foto=null; else if(st.fotos) st.fotos.splice(i,1); P.render(); return; }
    if(a==='cv-foto') return verFoto(v);
    if(a==='cv-m-tp'){ try{ await navigator.clipboard.writeText(v); P.toast('Tópico copiado: '+v+'. No celular do motorista, abra o app ntfy, toque em + e cole.'); }catch(e){ P.toast('Tópico: '+v); } return; }
    if(a==='cv-notif'){ try{ await Notification.requestPermission(); }catch(e){} P.render(); return; }
    if(a==='cv-sair'){ if(Date.now()-_sairConf>4000){ _sairConf=Date.now(); P.render(); setTimeout(()=>P.rerender(),4100); return; } camDesliga(); document.body.classList.remove('cv-solo'); const x=document.createElement('button'); x.dataset.act='sair-conta'; x.hidden=true; document.body.appendChild(x); x.click(); x.remove(); return; }
    if(a==='cv-cam') return camLiga(); if(a==='cv-camx'){ camDesliga(); P.render(); return; }
    if(a==='cv-abre'){ camDesliga(); return abrir(v); }
    if(a==='cv-volta-x'){ _autoCam=true; C.sel=null; C.f={mot:'',km:'',obs:'',conf:false}; P.render(); return; }
    if(a==='cv-saida'){ if(!pode()) return P.toast('Seu acesso é só para ver.'); return saida(); }
    if(a==='cv-volta'){ if(!pode()) return P.toast('Seu acesso é só para ver.'); return volta(); }
    if(a==='cv-q-limpa'){ C.q={per:'7',de:'',ate:'',car:'',mot:'',st:''}; P.render(); return; }
    if(a==='cv-csv') return csv();
    if(a==='cv-aba'){ C.abaCad=v; P.render(); return; }
    if(!adm()&&/^cv-(c-|m-|t-|qr|ved|vsalva|vdel)/.test(a)){ P.toast('Só o administrador muda o cadastro.'); return; }
    if(a==='cv-ved'){ C.edV=v; C.f.ed=null; P.render(); window.scrollTo({top:0,behavior:'smooth'}); return; } if(a==='cv-vedx'){ C.edV=null; C.f.ed=null; P.render(); return; }
    if(a==='cv-vsalva') return salvaEdV();
    if(a==='cv-vdel'){ const E=C.f.ed||{}; if(!E.del){ C.f.ed=Object.assign({},E,{del:true}); P.render(); return; } try{ await P.db().doc('carrosv/'+C.edV).update({removido:true,aberta:false,removidoPor:eu(),removidoEm:new Date().toISOString()}); C.edV=null; C.f.ed=null; P.toast('Viagem apagada.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='cv-c-salva') return salvaCarro(); if(a==='cv-c-x'){ C.edC=null; P.render(); return; }
    if(a==='cv-c-ed'){ const c=carDe(v); if(c){ C.edC={id:c.id,placa:c.placa,modelo:c.modelo,km:c.km,frota:c.frota||''}; P.render(); window.scrollTo({top:0,behavior:'smooth'}); } return; }
    if(a==='cv-c-at'){ const novo={carros:C.cad.carros.map(c=>c.id===v?Object.assign({},c,{ativo:c.ativo===false}):c),mot:C.cad.mot}; const c=novo.carros.find(x=>x.id===v); await gravaCad(novo,c&&c.ativo?'Carro reativado.':'Carro desativado: não aparece mais na portaria.'); return; }
    if(a==='cv-lim'){ if(!P.dono()) return; C.limpa={tipo:v}; P.render(); setTimeout(()=>{ const i=document.getElementById('cv-lim-tx'); if(i) i.focus(); },40); return; } if(a==='cv-lim-x'){ C.limpa=null; P.render(); return; } if(a==='cv-lim-ok'){ if(!P.dono()) return; return limpar(); }
    if(a==='cv-t-ed'){ C.edT={texto:termoAtual().texto}; P.render(); return; } if(a==='cv-t-x'){ C.edT=null; P.render(); return; }
    if(a==='cv-t-salva'){ const tx=String((document.getElementById('cv-t-tx')||{}).value||'').trim(); if(tx.length<40){ C.edT={texto:tx,err:'O termo está muito curto.'}; P.render(); return; } const t={texto:tx,versao:termoAtual().versao+1,em:new Date().toISOString(),por:eu()};
      if(await gravaCad({carros:C.cad.carros,mot:C.cad.mot,termo:t},'Termo salvo (versão '+t.versao+'). Os motoristas vão aceitar de novo no próximo acesso.')) C.edT=null; P.render(); return; }
    if(a==='cv-m-salva'){ const no=document.getElementById('cv-m-no'); if(no&&C.edM) C.edM.nome=no.value; return salvaMot(); } if(a==='cv-m-x'){ C.edM=null; C.lq=''; C.lres=[]; P.render(); return; }
    if(a==='cv-m-lsel'){ const no=document.getElementById('cv-m-no'), cp=document.getElementById('cv-m-cpf'); C.edM=Object.assign({},C.edM||{},{nome:no?no.value:(C.edM||{}).nome,cpf:cp?cpfL(cp.value):(C.edM||{}).cpf,uid:v,uidNome:b.dataset.n||''}); C.lq=''; C.lres=[]; P.render(); return; }
    if(a==='cv-m-lx'){ const no=document.getElementById('cv-m-no'); C.edM=Object.assign({},C.edM||{},{nome:no?no.value:(C.edM||{}).nome,uid:null,uidNome:''}); P.render(); return; }
    if(a==='cv-m-ed'){ const m=motDe(v); if(m){ C.edM={id:m.id,nome:m.nome,uid:m.uid||null,uidNome:m.uidNome||'',cpf:cpfDe(m.id)}; P.render(); window.scrollTo({top:0,behavior:'smooth'}); } return; }
    if(a==='cv-m-bl'){ const ag=new Date().toISOString(); const novo={carros:C.cad.carros,mot:C.cad.mot.map(m=>m.id===v?Object.assign({},m,m.ok===false?{ok:true,libEm:ag,libPor:eu()}:{ok:false,bloqEm:ag,bloqPor:eu()}):m)}; const m=novo.mot.find(x=>x.id===v);
      await gravaCad(novo,m&&m.ok===false?m.nome+' bloqueado: não aparece mais na portaria.':m.nome+' liberado.'); return; }
    if(a==='cv-qr') return qrPdf(ativos()); if(a==='cv-qr1'){ const c=carDe(v); if(c) qrPdf([c]); return; } });
  /* sai da tela da portaria: desliga a câmera */
  setInterval(()=>{ if(CAM.stream&&P.S.view!=='portaria'&&P.S.view!=='motorista'){ camDesliga(); } if(P.S.view!=='portaria'&&P.S.view!=='motorista'&&P.S.view!=='bdport'&&document.body.classList.contains('cv-solo')) document.body.classList.remove('cv-solo'); },1000);

  document.head.insertAdjacentHTML('beforeend',`<style id="cv-css">
  .cv-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}.cv-top h1{margin:0;font-size:clamp(24px,3vw,30px);line-height:1.1}.cv-top p{margin:4px 0 0;color:var(--muted)}
  .cv-pl{--h:44px;display:inline-flex;flex-direction:column;height:var(--h);aspect-ratio:3.1/1;box-sizing:border-box;border:calc(var(--h)*.045) solid #111;border-radius:calc(var(--h)*.13);overflow:hidden;background:#fff;color:#111;vertical-align:middle;flex:none}
  .cv-plb{flex:0 0 24%;display:flex;align-items:center;justify-content:center;position:relative;background:#1f3d99;color:#fff}.cv-plb span{font:700 calc(var(--h)*.16)/1 Arial,Helvetica,sans-serif;letter-spacing:.14em}
  .cv-plb i{position:absolute;right:3.5%;top:14%;bottom:14%;width:19%;background:transparent center/contain no-repeat}
  .cv-plc{flex:1;position:relative;display:flex;align-items:center;justify-content:center;min-height:0;padding:0 4% 0 9%}
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
  .cv-ed{margin-bottom:14px}.cv-g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.cv-g2{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;max-width:480px}.cv-g3 label,.cv-g2 label{display:flex;flex-direction:column;gap:6px;font-weight:600;font-size:14px}
  .cv-h2b{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}.cv-h2b h2{margin:0}
  .cv-cr{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line);flex-wrap:wrap}.cv-cr.ina{opacity:.6}.cv-ac{display:flex;gap:14px}.cv-del{color:var(--crit-ink,var(--crit))!important}
  .cv-vz p{color:var(--muted)}
  @media(max-width:760px){.cv-pl{--h:38px}.cv-pl.p{--h:28px}.cv-pl.g{--h:70px}.cv-cols{grid-template-columns:minmax(0,1fr)}.cv-g3{grid-template-columns:minmax(0,1fr)}.cv-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.cv-bts .btn{flex:1}.cv-fil .btn{margin-left:0}
    .cv-hb{grid-template-columns:minmax(0,1fr) auto}.cv-hb .cv-bar{grid-column:1/-1;grid-row:2}.cv-hb small{display:none}}
  
  .cv-bar:has(.cv-sw) .cv-bart{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;padding:0}@media (max-width:440px){.cv-bar:has(.cv-sw) .cv-clk{display:none}}
  .cv-sw{display:flex;gap:4px;background:rgba(255,255,255,.12);border-radius:999px;padding:3px;margin-left:6px}.cv-sw button{font:inherit;font-size:13px;font-weight:700;border:0;border-radius:999px;padding:6px 11px;background:transparent;color:#fff;cursor:pointer}.cv-sw button[aria-pressed=true]{background:#fff;color:#143F54}
  </style>`);
  /* layout da portaria, 2ª versão (26/11) */
  document.head.insertAdjacentHTML('beforeend',`<style id="cv-css2">
  .cv-hero{background:var(--nav,#163c52);color:#fff;border-radius:20px;padding:22px 22px 20px;margin-bottom:18px;position:relative;overflow:hidden}
  .cv-hero::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none}
  .cv-hh{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px;position:relative;z-index:1}
  .cv-hero h1{margin:2px 0 0;font-size:clamp(28px,4vw,38px);line-height:1.05;color:#fff}.cv-eb{margin:0;font-size:13.5px;opacity:.75;font-weight:500}
  .cv-cnt{display:flex;gap:8px}.cv-cnt div{display:flex;flex-direction:column;align-items:flex-start;background:rgba(255,255,255,.09);border-radius:12px;padding:8px 14px;min-width:78px}
  .cv-cnt b{font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}.cv-cnt span{font-size:12px;opacity:.75}
  .cv-scan{all:unset;box-sizing:border-box;cursor:pointer;position:relative;z-index:1;width:100%;display:flex;align-items:center;gap:18px;padding:18px 20px;border-radius:16px;background:#fff;color:var(--nav,#163c52);text-align:left;margin:0}
  .cv-scan:hover{background:#f2f6f8}.cv-scan:focus-visible{outline:3px solid #8fd3e8;outline-offset:3px}
  .cv-qric{flex:none;width:58px;height:58px;border-radius:14px;background:var(--nav,#163c52);color:#fff;display:grid;place-items:center;position:relative}.cv-qric svg{width:32px;height:32px}
  .cv-sct{display:flex;flex-direction:column}.cv-sct b{font-size:20px;line-height:1.2}.cv-sct small{font-size:14px;color:#5b6b75;margin-top:2px}
  @media(prefers-reduced-motion:no-preference){.cv-qric::after{content:"";position:absolute;inset:-5px;border-radius:18px;border:2px solid var(--nav,#163c52);opacity:0;animation:cvPulso 2.4s ease-out infinite}@keyframes cvPulso{0%{opacity:.55;transform:scale(.92)}70%,100%{opacity:0;transform:scale(1.18)}}}
  .cv-errh{position:relative;z-index:1;color:#ffd7d2!important;margin-top:10px}
  .cv-cam{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:10px;margin:0}.cv-cam p{margin:0;color:#fff;opacity:.85}
  .cv-vw{position:relative;width:100%;max-width:560px;aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:#000}.cv-vw video{width:100%;height:100%;object-fit:cover}
  .cv-mira{position:absolute;inset:16% 22%;border-radius:18px;box-shadow:0 0 0 999px rgba(0,0,0,.35)}.cv-mira::before,.cv-mira::after,.cv-mira i::before,.cv-mira i::after{content:"";position:absolute;width:30px;height:30px;border:4px solid #fff}
  .cv-mira::before{left:0;top:0;border-right:0;border-bottom:0;border-radius:14px 0 0 0}.cv-mira::after{right:0;top:0;border-left:0;border-bottom:0;border-radius:0 14px 0 0}.cv-mira i::before{left:0;bottom:0;border-right:0;border-top:0;border-radius:0 0 0 14px}.cv-mira i::after{right:0;bottom:0;border-left:0;border-top:0;border-radius:0 0 14px 0}
  .cv-sec{margin-bottom:18px}.cv-sec>h2{font-size:17px;margin:0 0 10px;display:flex;align-items:center;gap:8px}.cv-sec>h2 span{font-size:13px;font-weight:700;background:color-mix(in srgb,var(--line) 70%,transparent);border-radius:999px;padding:1px 9px;color:inherit;margin:0}
  .cv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}.cv-gridp{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
  .cv-tile{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:16px;background:var(--surface,#fff);border:1px solid var(--line);transition:border-color .15s,transform .15s}
  .cv-tile:hover{border-color:var(--teal);transform:translateY(-1px)}.cv-tile:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
  .cv-tile.fora{border-left:5px solid var(--teal)}.cv-tile.fora.longo{border-left-color:var(--warn)}
  .cv-tt{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
  .cv-chip{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;padding:4px 10px;border-radius:999px;background:color-mix(in srgb,var(--teal) 12%,transparent);color:var(--teal);white-space:nowrap}.cv-chip svg{width:14px;height:14px}
  .cv-chip.warn{background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn-ink,var(--warn))}
  .cv-who{display:flex;align-items:center;gap:10px}.cv-who>span:last-child{display:flex;flex-direction:column;min-width:0}.cv-who b{font-size:16px}.cv-who small{color:var(--muted);font-size:13px}
  .cv-av{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;background:color-mix(in srgb,var(--teal) 16%,transparent);color:var(--teal)}
  .cv-who.big .cv-av{width:48px;height:48px;font-size:17px}.cv-who.big b{font-size:18px}
  .cv-mod{display:flex;flex-direction:column}.cv-mod b{font-size:15px}.cv-mod small{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
  .cv-go{display:flex;align-items:center;justify-content:center;gap:6px;font-weight:700;font-size:15px;min-height:44px;border-radius:12px;margin-top:auto}.cv-go svg{width:18px;height:18px}
  .cv-go.vol{background:var(--teal);color:#fff}.cv-go.sai{background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok-ink,var(--ok))}
  .cv-nadab{padding:16px;border-radius:14px;border:1px dashed var(--line);margin:0}
  .cv-tl ol{list-style:none;margin:4px 0 0;padding:0}.cv-tl li{display:grid;grid-template-columns:48px 34px minmax(0,1fr);align-items:center;gap:10px;padding:8px 0;position:relative}
  .cv-tl li:not(:last-child)::after{content:"";position:absolute;left:74px;top:42px;bottom:-8px;width:2px;background:var(--line)}
  .cv-tlh{font-weight:700;font-variant-numeric:tabular-nums;color:var(--muted);font-size:14px}.cv-tli{width:34px;height:34px;border-radius:50%;display:grid;place-items:center}.cv-tli svg{width:17px;height:17px}
  .cv-tl li.sai .cv-tli{background:color-mix(in srgb,var(--ok) 15%,transparent);color:var(--ok-ink,var(--ok))}.cv-tl li.vol .cv-tli{background:color-mix(in srgb,var(--teal) 15%,transparent);color:var(--teal)}
  .cv-tlt{display:flex;flex-direction:column}.cv-tlt small{color:var(--muted);font-size:13px}.cv-sub{color:var(--muted);font-size:13.5px}
  .cv-fl{max-width:640px;width:100%;box-sizing:border-box;margin:0 auto 18px;padding:0!important;overflow:hidden}.cv-feito{width:100%;box-sizing:border-box}.cv-flh>*{max-width:100%}
  .cv-flh{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 18px 18px;color:#fff;text-align:center}.cv-flh.sai{background:#17694a}.cv-flh.vol{background:var(--nav,#163c52)}
  .cv-flh .cv-fmod{margin:0;font-weight:600;font-size:16px;opacity:.9}.cv-flh .cv-eb{opacity:.85}
  .cv-x{all:unset;cursor:pointer;position:absolute;left:12px;top:12px;font-size:14px;font-weight:600;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.12)}.cv-x:focus-visible{outline:2px solid #fff}
  .cv-flb{padding:18px 20px 20px}.cv-flb .cv-lb:first-child{margin-top:0}
  .cv-obs0{margin:10px 0 0;padding:8px 12px;border-radius:10px;background:color-mix(in srgb,var(--line) 40%,transparent);font-size:14px}
  .cv-mots{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
  .cv-mt{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;border:1.5px solid var(--line);min-height:58px}
  .cv-mt span:last-child{display:flex;flex-direction:column;min-width:0}.cv-mt small{font-size:12px;color:var(--warn-ink,var(--warn))}.cv-mt:hover{border-color:var(--teal)}.cv-mt:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
  .cv-mt.on{border-color:#17694a;background:color-mix(in srgb,#17694a 10%,transparent)}.cv-mt.on .cv-av{background:#17694a;color:#fff}
  .cv-kmw{display:flex;align-items:center;border:2px solid var(--line);border-radius:16px;background:var(--surface,#fff);padding:0 18px;min-height:72px}.cv-kmw:focus-within{border-color:var(--teal)}.cv-kmw.bad{border-color:var(--crit)}
  .cv-kmi{flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:700 34px/1 inherit;font-family:inherit;font-variant-numeric:tabular-nums;letter-spacing:.5px;padding:0}.cv-kmw .cv-kmi,.cv-kmw .cv-kmi:focus,.cv-kmw .cv-kmi:hover{border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;min-height:0!important;height:auto!important}.cv-kmw span{font-size:18px;font-weight:600;color:var(--muted)}
  .cv-hint{margin:6px 0 0;color:var(--muted);font-size:14px}
  .cv-rod{display:flex;align-items:baseline;gap:10px;margin:12px 0 0;min-height:0}.cv-rod:not(:empty){padding:12px 16px;border-radius:14px;background:color-mix(in srgb,var(--teal) 10%,transparent)}.cv-rod span{color:var(--muted);font-weight:600}.cv-rod b{font-size:28px;color:var(--teal);font-variant-numeric:tabular-nums}
  .cv-bt1,.cv-bt2{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 24px;border-radius:14px;font-weight:700;font-size:16px;text-align:center}
  .cv-bt1{background:var(--nav,#163c52);color:#fff;flex:1}.cv-bt1.sai{background:#17694a}.cv-bt1.vol{background:var(--nav,#163c52)}.cv-bt1[disabled]{opacity:.55;cursor:default}
  .cv-bt2{border:1.5px solid var(--line);color:inherit}.cv-hero .cv-bt2{border-color:rgba(255,255,255,.4);color:#fff}
  .cv-bt1:focus-visible,.cv-bt2:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
  .cv-feito{max-width:560px;margin:10px auto 18px;padding:30px 22px;border-radius:22px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;background:var(--surface,#fff);border:1px solid var(--line)}
  .cv-fok{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;color:#fff;background:#17694a}.cv-feito.vol .cv-fok{background:var(--nav,#163c52)}.cv-fok svg{width:40px;height:40px}
  .cv-feito h1{margin:4px 0 6px;font-size:26px}.cv-feito .cv-fmod{margin:0;color:var(--muted)}
  .cv-fdl{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;width:100%;margin:8px 0 4px}.cv-fdl div{background:color-mix(in srgb,var(--line) 35%,transparent);border-radius:12px;padding:10px}.cv-fdl dt{font-size:12.5px;color:var(--muted)}.cv-fdl dd{margin:2px 0 0;font-weight:700;font-size:18px;font-variant-numeric:tabular-nums}
  .cv-falt{margin:0;padding:8px 12px;border-radius:10px;background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn-ink,var(--warn));font-weight:600}
  .cv-feito .cv-bt1{flex:none;width:100%;margin-top:8px}.cv-fauto{margin:0;font-size:12.5px;color:var(--muted)}
  body.cv-solo .side,body.cv-solo header.top,body.cv-solo .bottomnav,body.cv-solo nav.tabs,body.cv-solo .mob-top,body.cv-solo .crumbs{display:none!important}
  body.cv-solo .content{padding:0!important;max-width:none!important}body.cv-solo .main{margin:0!important}
  .cv-app{min-height:100vh;min-height:100dvh;background:var(--ground)}
  .cv-bar{position:sticky;top:0;z-index:20;box-sizing:border-box;min-height:54px;height:auto;display:flex;align-items:center;gap:10px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:var(--nav,#163c52);color:#fff;border-radius:0!important}
  .cv-swl{display:inline}.cv-sws{display:none}@media (max-width:600px){.cv-swl{display:none}.cv-sws{display:inline}}
  .cv-bar img{height:22px;width:auto;display:block}.cv-bart{font-weight:700;font-size:15px;opacity:.92;border-left:1px solid rgba(255,255,255,.28);padding-left:10px}
  .cv-clk{margin-left:auto;font-weight:700;font-size:18px;font-variant-numeric:tabular-nums}
  .cv-sair{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;padding:4px 10px 4px 4px;border-radius:999px;background:rgba(255,255,255,.13);min-height:36px}
  .cv-sair .cv-av{width:28px;height:28px;font-size:12px;background:#fff;color:var(--nav,#163c52)}.cv-sair:focus-visible{outline:2px solid #fff}
  .cv-appc{max-width:560px;margin:0 auto;padding:12px 12px calc(24px + env(safe-area-inset-bottom))}
  .cv-hero.so{padding:14px;border-radius:18px;margin-bottom:14px}.cv-hero.so .cv-hh{margin-bottom:12px}.cv-hero.so .cv-cnt{width:100%}.cv-hero.so .cv-cnt div{flex:1;min-width:0}
  .cv-hero.so .cv-vw{aspect-ratio:1/1;max-width:none}.cv-hero.so .cv-cam p{font-weight:600}
  body.cv-solo .cv-fl{margin:0 0 14px}body.cv-solo .cv-feito{margin:0 0 14px}body.cv-solo .cv-grid,body.cv-solo .cv-gridp{grid-template-columns:minmax(0,1fr)}
  body.cv-solo .cv-tile:not(.fora){flex-direction:row;align-items:center;flex-wrap:wrap}body.cv-solo .cv-tile:not(.fora) .cv-mod{flex:1}body.cv-solo .cv-tile:not(.fora) .cv-go{margin-top:0;padding:0 16px}
  body.cv-solo .cv-mots{grid-template-columns:minmax(0,1fr)}
  .cv-acp{display:block;font-size:13px;font-weight:700;padding:6px 10px;border-radius:10px;background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn-ink,var(--warn));text-align:center}
  .cv-acok{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ok-ink,var(--ok))}.cv-acok svg{width:16px;height:16px}
  .cv-fac{display:flex;gap:8px;align-items:flex-start;margin:0;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--teal) 10%,transparent);color:var(--teal);font-weight:600;text-align:left}.cv-fac svg{width:20px;height:20px;flex:none;margin-top:1px}
  .cv-obs0.warn{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn-ink,var(--warn));font-weight:600}
  .cv-tag.warn{background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn-ink,var(--warn))}
  .cv-lgn{display:flex;flex-direction:column;gap:6px}.cv-lgt{font-weight:600;font-size:14px}.cv-lgt small{display:block;font-weight:400;color:var(--muted)}
  .cv-lgs{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:12px}.cv-lgs b{flex:1}
  .cv-lgr{display:flex;flex-direction:column;gap:4px}.cv-lgi{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;border:1px solid var(--line)}.cv-lgi:hover{border-color:var(--teal)}.cv-lgi span:last-child{display:flex;flex-direction:column}.cv-lgi small{color:var(--muted);font-size:12px}
  .cv-mh h1{font-size:clamp(24px,6vw,30px)}
  .cv-est{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cv-eo{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px;border-radius:16px;border:2px solid var(--line);text-align:center;min-height:92px;justify-content:center}
  .cv-eo svg{width:28px;height:28px;color:var(--ok-ink,var(--ok))}.cv-exc{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:color-mix(in srgb,var(--warn) 25%,transparent);color:var(--warn-ink,var(--warn))}
  .cv-eo b{font-size:16px}.cv-eo.on.ok{border-color:#17694a;background:color-mix(in srgb,#17694a 10%,transparent)}.cv-eo.on.av{border-color:var(--warn);background:color-mix(in srgb,var(--warn) 14%,transparent)}.cv-eo:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
  .cv-ta{min-height:90px;padding:12px 14px;resize:vertical;font-size:16px}
  .cv-termo{display:flex;gap:12px;align-items:flex-start;margin:16px 0 0;padding:14px;border-radius:14px;background:color-mix(in srgb,var(--line) 35%,transparent);cursor:pointer;font-size:15px;line-height:1.45}
  .cv-termo input{width:24px;height:24px;flex:none;margin:0;accent-color:#17694a}
  .cv-wide{width:100%;margin-top:16px}
  .cv-com{margin-bottom:14px}.cv-p2{margin:10px 0 0;color:var(--muted);font-size:14px}
  .cv-comb{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
  .cv-cb{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:12px;border:2px solid var(--line);min-height:84px}
  .cv-cb b{font-size:13px}.cv-cb.on{border-color:var(--teal);background:color-mix(in srgb,var(--teal) 10%,transparent)}.cv-cb:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
  .cv-cbg{width:16px;height:40px;border-radius:4px;border:2px solid currentColor;display:flex;align-items:flex-end;overflow:hidden;color:var(--muted)}.cv-cbg i{display:block;width:100%;background:var(--teal)}.cv-cb:first-child .cv-cbg i{background:var(--warn)}
  .cv-hist ul{list-style:none;margin:6px 0 0;padding:0}.cv-hist li{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}.cv-hist li:first-child{border-top:0}.cv-hist li>span:nth-child(2){flex:1;display:flex;flex-direction:column;min-width:0}.cv-hist small{color:var(--muted);font-size:12.5px}
  .cv-q{font-weight:700;font-size:16px;margin:18px 0 8px}.cv-flb .cv-q:first-child{margin-top:0}
  .cv-sn{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .cv-snb{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;min-height:54px;padding:8px 10px;border-radius:14px;border:2px solid var(--line);font-weight:700;font-size:15px}
  .cv-snb:focus-visible{outline:3px solid var(--teal);outline-offset:2px}.cv-snb.on.bom{border-color:#17694a;background:color-mix(in srgb,#17694a 11%,transparent);color:#17694a}.cv-snb.on.ruim{border-color:var(--warn);background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--warn-ink,var(--warn))}
  .cv-kmc{display:flex;flex-direction:column;padding:12px 14px;border-radius:14px;background:color-mix(in srgb,var(--line) 35%,transparent);margin-bottom:8px}.cv-kmc b{font-size:26px;font-variant-numeric:tabular-nums}.cv-kmc small{color:var(--muted)}
  .cv-g2b{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cv-g2b .cv-lb{display:grid;grid-template-columns:auto 1fr;align-items:baseline;column-gap:6px;row-gap:6px;margin-top:10px}.cv-g2b .cv-lb input{grid-column:1/-1}
  .cv-fts{display:flex;flex-wrap:wrap;gap:8px}.cv-ft{position:relative;width:86px;height:86px;border-radius:12px;overflow:hidden;border:1px solid var(--line)}.cv-ft img{width:100%;height:100%;object-fit:cover}
  .cv-ft button{all:unset;cursor:pointer;position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;display:grid;place-items:center;font-size:12px}
  .cv-ftadd{width:86px;height:86px;border-radius:12px;border:2px dashed var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;text-align:center}.cv-ftadd span{font-size:22px}.cv-ftadd b{font-size:12px}
  .cv-notif{all:unset;box-sizing:border-box;cursor:pointer;width:100%;display:flex;gap:12px;align-items:center;padding:12px 14px;margin-bottom:14px;border-radius:14px;border:2px solid var(--teal);background:color-mix(in srgb,var(--teal) 8%,transparent)}
  .cv-notif svg{width:26px;height:26px;color:var(--teal);flex:none}.cv-notif span{display:flex;flex-direction:column}.cv-notif small{color:var(--muted);font-size:13px}
  .cv-fov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:grid;place-items:center;padding:16px}.cv-fov img{max-width:100%;max-height:90vh;border-radius:10px}.cv-fov button{all:unset;cursor:pointer;position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font-weight:700}
  .cv-fro{font-size:12px;font-weight:800;padding:2px 8px;border-radius:6px;background:var(--nav,#163c52);color:#fff;white-space:nowrap;align-self:flex-start}.cv-tt .cv-fro{align-self:center}
  .cv-frog{margin:0;font-weight:800;font-size:15px;padding:3px 12px;border-radius:999px;background:rgba(255,255,255,.16)}
  .cv-fl2{display:block;font-size:12px}.cv-fl2 .lnk{font-size:12px}
  .cv-tpre{white-space:pre-wrap;font:inherit;font-size:14px;line-height:1.55;margin:0;padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--line) 30%,transparent);max-height:320px;overflow:auto}
  .cv-tpm{max-height:none}.cv-tta{min-height:300px;font-size:14px;line-height:1.5}.cv-tth{margin:2px 0 0;font-size:24px;color:#fff}.cv-wn{color:var(--warn-ink,var(--warn));font-weight:600}
  .cv-lim{border:1.5px dashed color-mix(in srgb,var(--crit) 45%,var(--line))}.cv-limr{display:flex;gap:8px;flex-wrap:wrap}.cv-limr .cv-in{max-width:220px}.cv-bdel{background:var(--crit)!important;border-color:var(--crit)!important;color:#fff!important}
  @media(prefers-reduced-motion:no-preference){.cv-feito .cv-fok{animation:cvOk .35s ease-out}@keyframes cvOk{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}}
  @media(max-width:760px){.cv-hero{padding:18px 16px 16px;border-radius:18px}.cv-cnt{width:100%}.cv-cnt div{flex:1;min-width:0}.cv-grid,.cv-gridp{grid-template-columns:minmax(0,1fr)}
    .cv-tile:not(.fora){flex-direction:row;align-items:center;flex-wrap:wrap}.cv-tile:not(.fora) .cv-mod{flex:1}.cv-tile:not(.fora) .cv-go{margin-top:0;padding:0 16px}
    .cv-mots{grid-template-columns:minmax(0,1fr)}.cv-flb{padding:16px}.cv-kmi{font-size:30px}}
  
  /* 27/11: pedidos do celular do vendedor e devolução (portaria libera e recebe) */
  .cv-pend h2{color:inherit}.cv-pd{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin:0 0 10px;display:flex;flex-direction:column;gap:10px;box-shadow:inset 5px 0 0 #2f7a5a}.cv-pd.vol{box-shadow:inset 5px 0 0 #143F54}
  .cv-pdh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cv-pdh small{margin-left:auto;color:var(--muted);font-size:13px}.cv-pdk{font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;background:#e3f1ea;color:#17694a}.cv-pd.vol .cv-pdk{background:#e3ecf1;color:#143F54}
  .cv-pdb{display:flex;gap:12px;align-items:flex-start}.cv-pdi{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
  .cv-pf{all:unset;cursor:pointer;flex:none;width:104px;height:104px;border-radius:12px;overflow:hidden;position:relative;background:#e9eef1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px}.cv-pf img{width:100%;height:100%;object-fit:cover}
  .cv-pf small{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);color:#fff;font-size:11px;text-align:center;padding:2px 0}.cv-pf:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
  .cv-pfz{flex:none;width:104px;height:104px;border-radius:12px;border:1.5px dashed var(--line);display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;color:var(--muted);padding:6px;box-sizing:border-box}
  .cv-pdkm{margin:0;display:flex;flex-direction:column}.cv-pdkm b{font-size:22px;font-variant-numeric:tabular-nums}.cv-pdkm small{font-size:13px;color:var(--muted)}.cv-pdkm small.warn{color:var(--warn-ink,#8a4a08);font-weight:600}
  .cv-pis{margin:0;display:flex;flex-wrap:wrap;gap:5px;align-items:center}.cv-pi{font-size:12.5px;font-weight:600;padding:3px 9px;border-radius:999px;background:color-mix(in srgb,var(--line) 70%,transparent)}.cv-pi.ok{background:#e3f1ea;color:#17694a}.cv-pi.warn{background:#fbe9e8;color:#8f1d19}.cv-pi.info{background:#e3ecf1;color:#143F54}
  .cv-pd .cv-bts{margin-top:0}
  .cv-agu{display:flex;flex-direction:column;gap:8px}.cv-aguh{display:flex;gap:12px;align-items:center}.cv-aguh h2{margin:0;font-size:19px}.cv-aguh .cv-eb{margin:0}
  .cv-pul{width:16px;height:16px;border-radius:50%;background:#2f7a5a;flex:none;box-shadow:0 0 0 0 rgba(47,122,90,.5);animation:cvpul 1.6s infinite}.cv-agu.vol .cv-pul{background:#143F54;box-shadow:0 0 0 0 rgba(20,63,84,.5)}
  @keyframes cvpul{70%{box-shadow:0 0 0 12px rgba(0,0,0,0)}100%{box-shadow:0 0 0 0 rgba(0,0,0,0)}}@media (prefers-reduced-motion:reduce){.cv-pul{animation:none}}
  .cv-ret .cv-reth{font-size:19px;margin:0 0 10px}.cv-esc{display:flex;flex-direction:column;gap:8px}.cv-escb{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;min-height:56px}
  .cv-escb span{display:flex;flex-direction:column}.cv-escb small{color:var(--muted);font-size:13px}.cv-escb:disabled{opacity:.5;cursor:default}.cv-escb:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
  .cv-ftpain{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:110px;border:2px dashed #143F54;border-radius:14px;cursor:pointer;color:#143F54;text-align:center;padding:10px}.cv-ftpain span{font-size:28px}.cv-ftpain b{font-size:16px}.cv-ftpain small{color:var(--muted);font-size:13px}
  .cv-ftp{width:100%;height:180px}.cv-ftp img{object-fit:contain;background:#000}
  .cv-com .cv-bt1{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px}.cv-com .cv-bt1 svg{width:20px;height:20px;flex:none}
  
  /* 27/11/2026 · portaria no notebook: sem câmera, sem o botão do QR; tela larga em duas colunas. Celular não muda. */
  .cv-nbh{display:none;margin:0;font-size:14px;opacity:.9}
  @media (hover:hover) and (pointer:fine){.cv-hero .cv-scan,.cv-hero .cv-errh{display:none!important}.cv-hero .cv-nbh{display:block}}
  @media (min-width:1000px){.cv-appc{max-width:1180px;padding:18px 24px 32px}
    .cv-ptl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 22px;align-items:start}.cv-ptl>*{grid-column:1/-1}.cv-ptl>.cv-sec{grid-column:auto}
    .cv-ptl .cv-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
    .cv-appc .cv-feito,.cv-appc .cv-flh,.cv-appc .cv-fl{max-width:640px;margin-left:auto;margin-right:auto}}

  .cv-tvm{display:none;color:#fff;text-decoration:none;font-weight:700;font-size:13px;border:1px solid rgba(255,255,255,.45);border-radius:999px;padding:6px 12px;white-space:nowrap;margin-left:auto}.cv-tvm:hover{background:rgba(255,255,255,.12)}
  @media (hover:hover) and (pointer:fine) and (min-width:900px){.cv-tvm{display:inline-block}.cv-tvm+.cv-clk{margin-left:12px}}
</style>`);
})();
