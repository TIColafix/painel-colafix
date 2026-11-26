/* Carros · portaria (modulos/carros.js, 26/11/2026): o adm cadastra carros e motoristas (bloqueia), imprime os QR;
   o porteiro abre o carro pelo QR (?carro=<id>), registra saída (motorista liberado + km, avisa km diferente) e volta
   (km de chegada, calcula quanto rodou); o adm vê as viagens. Dados inventados. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs;
 d.users['portaria@painel-colafix.app']={uid:'uPORT',pass:'por123',nome:'Seu Zé Porteiro'}; D['perfis/uPORT']={nome:'Seu Zé Porteiro',usuario:'portaria'}; D['acessos/uPORT']={perfil:'portaria',mods:['portaria'],locais:[],ativo:true};
 d.users['fernando@painel-colafix.app']={uid:'uFER',pass:'fer123',nome:'Fernando Frota'}; D['perfis/uFER']={nome:'Fernando Frota',usuario:'fernando'}; D['acessos/uFER']={perfil:'outro',mods:['frota','carros'],locais:[],ativo:true};
 const srv=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 /* ---------- administrador ---------- */
 const A=await H.abrir({viewport:{width:1366,height:900}}); const pa=A.page; const erros=[]; pa.on('pageerror',e=>erros.push(e.message));
 await H.preparar(pa,d); await pa.goto(H.BASE); await H.entrar(pa,'fernando','fer123'); await H.dorme(2500);
 await pa.evaluate(()=>__T.go('carcad')); await H.dorme(800);
 const cad=async(pl,mo,km)=>{ await pa.fill('#cv-c-pl',pl); await pa.fill('#cv-c-mo',mo); await pa.fill('#cv-c-km',km); await pa.click('[data-act="cv-c-salva"]'); await H.dorme(500); };
 await cad('AB12','Fiat Strada','100'); ok('Placa inválida é recusada', await pa.evaluate(()=>/Placa inválida/.test(document.body.innerText)));
 await cad('abc1d23','Fiat Strada branca','45230'); await cad('QWE-4567','VW Saveiro','38904'); await cad('ABC1D23','Outro','1');
 ok('Placa repetida é recusada', await pa.evaluate(()=>/Já existe um carro com esta placa/.test(document.body.innerText)));
 await pa.click('[data-act="cv-c-x"]').catch(()=>{}); await pa.evaluate(()=>{ __carros.edC=null; }); await H.dorme(200);
 let s=await srv(pa); let cs=(s['carros/cad']||{}).carros||[];
 ok('Carros cadastrados em carros/cad (placa sem traço, km, ativo)', cs.length===2&&cs.some(c=>c.placa==='ABC1D23'&&c.km===45230&&c.ativo)&&cs.some(c=>c.placa==='QWE4567'), JSON.stringify(cs).slice(0,200));
 const pl=await pa.evaluate(()=>{ const p=document.querySelector('.cv-pl'); return p?{t:p.innerText.replace(/\s+/g,' ').trim(),band:getComputedStyle(p.querySelector('.cv-plb')).backgroundColor,logo:getComputedStyle(p.querySelector('.cv-plb i')).backgroundImage}:null; });
 ok('Placa no padrão Mercosul: faixa azul "BRASIL", "BR" e a logo Colafix no lugar da bandeira', pl&&/BRASIL/.test(pl.t)&&/BR ABC1D23/.test(pl.t)&&pl.band==='rgb(31, 61, 153)'&&/logo-colafix-escuro/.test(pl.logo), JSON.stringify(pl));
 await pa.click('[data-act="cv-aba"][data-v="mot"]'); await H.dorme(300);
 for(const n of ['Carlos Bento','Joana Prado']){ await pa.fill('#cv-m-no',n); await pa.click('[data-act="cv-m-salva"]'); await H.dorme(400); }
 const jid=await pa.evaluate(()=>__carros.cad.mot.find(m=>m.nome==='Joana Prado').id); await pa.click(`[data-act="cv-m-bl"][data-v="${jid}"]`); await H.dorme(500);
 s=await srv(pa); const ms=s['carros/cad'].mot;
 ok('Motoristas cadastrados; Joana bloqueada', ms.length===2&&ms.find(m=>m.nome==='Carlos Bento').ok===true&&ms.find(m=>m.nome==='Joana Prado').ok===false&&/Bloqueado/.test(await pa.evaluate(()=>document.body.innerText)));
 await pa.click('[data-act="cv-aba"][data-v="carros"]'); await H.dorme(300);
 const [dl]=await Promise.all([pa.waitForEvent('download',{timeout:10000}).catch(()=>null),pa.click('[data-act="cv-qr"]')]);
 ok('"Imprimir QR codes (PDF)" baixa qr-carros-AAAA-MM-DD.pdf', dl&&/^qr-carros-\d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename()), dl&&dl.suggestedFilename());
 if(dl&&process.env.JSPDF_REAL) await dl.saveAs('/tmp/qr-carros.pdf');
 const cid=cs.find(c=>c.placa==='ABC1D23').id;
 /* ---------- porteiro ---------- */
 const B=await H.abrir({viewport:{width:390,height:844}}); const pb=B.page; pb.on('pageerror',e=>erros.push(e.message));
 await H.preparar(pb,{users:d.users,docs:await srv(pa)}); await pb.goto(H.BASE); await H.entrar(pb,'portaria','por123'); await H.dorme(2500);
 const v0=await pb.evaluate(()=>({v:__T.S().view,t:document.body.innerText,nav:[...document.querySelectorAll('[data-go]')].map(b=>b.dataset.go)}));
 ok('Porteiro entra direto na Portaria e vê os carros na empresa', v0.v==='portaria'&&/Portaria · carros/.test(v0.t)&&/Na empresa/.test(v0.t)&&/ABC1D23/.test(v0.t), v0.v);
 ok('Porteiro não vê o cadastro nem as viagens', !v0.nav.includes('carcad')&&!v0.nav.includes('carviag'), v0.nav.join(','));
 /* QR lido = endereço com ?carro= */
 await pb.goto(H.BASE+'?carro='+cid); await H.dorme(3000);
 const f=await pb.evaluate(()=>({t:(document.querySelector('.cv-fl')||{}).innerText||'',ops:[...document.querySelectorAll('#cv-mot option')].map(o=>o.textContent),km:(document.getElementById('cv-km')||{}).value}));
 ok('QR do carro abre a saída com placa, último km e só motoristas liberados', /Saída/.test(f.t)&&/ABC1D23/.test(f.t)&&/45\.230/.test(f.t)&&f.km==='45230'&&f.ops.includes('Carlos Bento')&&!f.ops.includes('Joana Prado'), JSON.stringify(f).slice(0,300));
 await pb.click('[data-act="cv-saida"]'); await H.dorme(300); ok('Sem motorista não registra', await pb.evaluate(()=>/Escolha o motorista/.test(document.body.innerText)));
 await pb.selectOption('#cv-mot',{label:'Carlos Bento'}); await pb.fill('#cv-km','45200'); await pb.click('[data-act="cv-saida"]'); await H.dorme(300);
 ok('Km menor que o último é recusado', await pb.evaluate(()=>/não pode ser menor que o último registrado \(45\.230 km\)/.test(document.body.innerText)));
 await pb.fill('#cv-km','45250'); await pb.fill('#cv-obs','Vai ao banco'); await pb.click('[data-act="cv-saida"]'); await H.dorme(300);
 ok('Km diferente do último pede confirmação', await pb.evaluate(()=>/20 km sem registro/.test(document.body.innerText)&&/Confirmar saída/.test(document.body.innerText)));
 await pb.click('[data-act="cv-saida"]'); await H.dorme(700);
 s=await srv(pb); let vs=Object.entries(s).filter(([k])=>k.startsWith('carrosv/')).map(([,v])=>v);
 ok('Saída gravada (motorista, km, aberta, km diferente marcado) e último km atualizado', vs.length===1&&vs[0].aberta===true&&vs[0].motNome==='Carlos Bento'&&vs[0].kmS===45250&&vs[0].kmDif===true&&vs[0].kmEsp===45230&&vs[0].obsS==='Vai ao banco'&&s['carrosk/'+cid].km===45250, JSON.stringify(vs[0]||{}).slice(0,250));
 const t1=await pb.evaluate(()=>document.body.innerText);
 ok('Mensagem de saída e o carro aparece em "Fora agora"', /Saída registrada: ABC1D23 com Carlos Bento · 45\.250 km/.test(t1)&&/Fora agora\s*1/i.test(t1), t1.slice(0,300).replace(/\n/g,' | '));
 await pb.click(`[data-act="cv-abre"][data-v="${cid}"]`); await H.dorme(400);
 const fv=await pb.evaluate(()=>(document.querySelector('.cv-fl')||{}).innerText||'');
 ok('Tocar no carro fora abre a volta (saiu com, km da saída)', /Volta/.test(fv)&&/Carlos Bento/.test(fv)&&/45\.250/.test(fv), fv.replace(/\n/g,' | ').slice(0,200));
 await pb.fill('#cv-km','45240'); await pb.click('[data-act="cv-volta"]'); await H.dorme(300);
 ok('Km da volta menor que o da saída é recusado', await pb.evaluate(()=>/não pode ser menor que o da saída/.test(document.body.innerText)));
 await pb.fill('#cv-km','45358'); await pb.dispatchEvent('#cv-km','input'); await H.dorme(200);
 ok('Mostra quanto rodou enquanto digita', /Rodou 108 km/.test(await pb.evaluate(()=>document.getElementById('cv-rod').innerText)));
 if(process.env.SHOT) await pb.screenshot({path:'/home/claude/scripts/cv-volta.png',fullPage:true});
 await pb.click('[data-act="cv-volta"]'); await H.dorme(700);
 s=await srv(pb); vs=Object.entries(s).filter(([k])=>k.startsWith('carrosv/')).map(([,v])=>v);
 ok('Volta gravada: km, rodou 108, fechada; último km 45.358', vs[0].aberta===false&&vs[0].kmV===45358&&vs[0].rodou===108&&vs[0].porVN==='Seu Zé Porteiro'&&s['carrosk/'+cid].km===45358, JSON.stringify(vs[0]).slice(0,250));
 ok('Mensagem da volta', /Volta registrada: ABC1D23 · Carlos Bento rodou 108 km/.test(await pb.evaluate(()=>document.body.innerText)));
 await pb.evaluate(()=>{ __carros.msg=null; window.scrollTo(0,0); }); await H.dorme(300);
 const lg=await pb.evaluate(()=>document.documentElement.scrollWidth); ok('No celular a portaria não passa da largura', lg<=392, lg);
 if(process.env.SHOT){ await pb.evaluate(()=>{ __T.go('portaria'); }); await H.dorme(400); await pb.screenshot({path:'/home/claude/scripts/cv-port.png',fullPage:true}); await pb.click(`[data-act="cv-abre"][data-v="${cid}"]`); await H.dorme(300); await pb.screenshot({path:'/home/claude/scripts/cv-saida.png',fullPage:true}); }
 /* ---------- adm vê as viagens ---------- */
 const A2=await H.abrir({viewport:{width:1366,height:900}}); const pa2=A2.page; pa2.on('pageerror',e=>erros.push(e.message)); await H.preparar(pa2,{users:d.users,docs:await srv(pb)}); await pa2.goto(H.BASE); await H.entrar(pa2,'fernando','fer123'); await H.dorme(2500);
 await pa2.evaluate(()=>__T.go('carviag')); await H.dorme(1200);
 const tv=await pa2.evaluate(()=>document.body.innerText);
 ok('Viagens: 1 viagem, 108 km rodados, 1 com km diferente, km por carro e por motorista', /1\s*viagens/i.test(tv.replace(/\n/g,' '))&&/108\s*km rodados/i.test(tv.replace(/\n/g,' '))&&/1\s*com km diferente/i.test(tv.replace(/\n/g,' '))&&/Km por motorista/.test(tv)&&/Carlos Bento/.test(tv)&&/\+20 sem registro/.test(tv), tv.replace(/\n/g,' | ').slice(0,400));
 if(process.env.SHOT) await pa2.screenshot({path:'/home/claude/scripts/cv-viag.png',fullPage:true});
 const [dc]=await Promise.all([pa2.waitForEvent('download',{timeout:8000}).catch(()=>null),pa2.click('[data-act="cv-csv"]')]);
 let csv=''; if(dc){ const fp='/tmp/viag.csv'; await dc.saveAs(fp); csv=require('fs').readFileSync(fp,'utf8'); }
 ok('Planilha das viagens', dc&&/^viagens-carros-/.test(dc.suggestedFilename())&&/Placa;Modelo;Motorista/.test(csv)&&/ABC1D23;Fiat Strada branca;Carlos Bento/.test(csv)&&/;108;/.test(csv), csv.slice(0,200));
 ok('Sem erro de script', !erros.length, erros.join(' | '));
 await A.browser.close(); await B.browser.close(); await A2.browser.close();
 const fl=res.filter(x=>!x.ok); console.log(fl.length?fl.length+' FALHOU':'tudo PASSOU'); process.exit(fl.length?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
