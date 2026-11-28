/* Carros pelo celular do vendedor (modulos/carros.js, 27/11/2026: "tudo dentro do painel, fluido e leve, sem ntfy";
   "o vendedor escaneia" + "um espaço para tirar foto do painel"). O vendedor pede a saída (km, foto do painel, limpo,
   avaria, termo) e entrega o carro (km, foto do painel, abastecimento, avaria, limpo); a portaria só toca em Liberar
   saída / Recebido. Dados inventados. SHOT=1 salva as telas em /tmp/carcel-*.png. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const SHOT=!!process.env.SHOT, shot=async(p,n)=>{ if(SHOT) await p.screenshot({path:'/tmp/carcel-'+n+'.png'}); };
(async()=>{ const {d}=H.seed(); const D=d.docs;
 d.users['portaria@painel-colafix.app']={uid:'uPORT',pass:'por123',nome:'Seu Zé Porteiro'}; D['perfis/uPORT']={nome:'Seu Zé Porteiro',usuario:'portaria'}; D['acessos/uPORT']={perfil:'portaria',mods:['portaria'],locais:[],ativo:true};
 d.users['carlosb@painel-colafix.app']={uid:'uMOT',pass:'mot123',nome:'Carlos Bento'}; D['perfis/uMOT']={nome:'Carlos Bento',usuario:'carlosb'}; D['acessos/uMOT']={perfil:'motorista',mods:['motorista'],locais:[],ativo:true};
 d.users['joana@painel-colafix.app']={uid:'uJO',pass:'jo1234',nome:'Joana Prado'}; D['perfis/uJO']={nome:'Joana Prado',usuario:'joana'}; D['acessos/uJO']={perfil:'motorista',mods:['motorista'],locais:[],ativo:true};
 D['carros/cad']={carros:[{id:'c1',placa:'ABC1D23',modelo:'Fiat Strada',km:45230,frota:'12',ativo:true},{id:'c2',placa:'QWE4567',modelo:'VW Saveiro',km:38904,frota:'7',ativo:true}],
   mot:[{id:'m1',nome:'Carlos Bento',uid:'uMOT',uidNome:'Carlos Bento',ok:true},{id:'m2',nome:'Joana Prado',uid:'uJO',uidNome:'Joana Prado',ok:true}]};
 D['carrost/uuMOT-v1']={uid:'uMOT',motId:'m1',nome:'Carlos Bento',versao:1,em:'2026-11-26T10:00:00Z'}; D['carrost/uuJO-v1']={uid:'uJO',motId:'m2',nome:'Joana Prado',versao:1,em:'2026-11-26T10:00:00Z'};
 const srv=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const erros=[]; const tx=p=>p.evaluate(()=>document.body.innerText);
 const abrir=async(w,h,u,pw,docs)=>{ const X=await H.abrir({viewport:{width:w,height:h}}); X.page.on('pageerror',e=>erros.push(u+': '+e.message)); X.page.on('dialog',x=>x.accept('chave errada')); await H.preparar(X.page,{users:d.users,docs:docs||d.docs}); await X.page.goto(H.BASE); await H.entrar(X.page,u,pw); await H.dorme(2600); if(u==='portaria'){ await X.page.evaluate(()=>{ if(__T.S().view!=='portaria') __T.go('portaria'); }); await H.dorme(800); } return X; };
 const recarrega=async(X,u,pw,docs)=>{ await H.preparar(X.page,{users:d.users,docs}); await X.page.goto(H.BASE); await H.entrar(X.page,u,pw); await H.dorme(2600); if(u==='portaria'){ await X.page.evaluate(()=>{ if(__T.S().view!=='portaria') __T.go('portaria'); }); await H.dorme(800); } };
 /* ---------- vendedor pede a saída ---------- */
 const M=await abrir(390,844,'carlosb','mot123'); const pm=M.page;
 const t0=await tx(pm); ok('Vendedor entra em "Retirar carro" com Escanear QR e a lista dos carros', /Retirar carro/.test(t0)&&/Escanear QR do carro/.test(t0)&&/Ou escolha o carro/.test(t0)&&!/ntfy/.test(t0), t0.slice(0,200).replace(/\n/g,' | '));
 await shot(pm,'retirar');
 await pm.click('[data-act="cv-mcar"][data-v="c1"]'); await H.dorme(400);
 ok('Escolheu o carro: formulário com km, foto do painel, limpo, avaria e termo', await pm.evaluate(()=>!!document.getElementById('cv-mr')&&/Foto do painel/.test(document.body.innerText)&&/Último km registrado: 45\.230/.test(document.body.innerText)));
 await pm.fill('#cv-mr-km','45000'); await pm.click('[data-act="cv-mr-ok"]'); await H.dorme(300);
 ok('Km menor que o último é recusado', /não pode ser menor que o último registrado \(45\.230 km\)/.test(await tx(pm)));
 await pm.fill('#cv-mr-km','45260'); await pm.click('[data-act="cv-mr-ok"]'); await H.dorme(300);
 ok('Sem a foto do painel não pede', /Tire a foto do painel/.test(await tx(pm)));
 await pm.setInputFiles('[data-cvfoto="mrp"]',__dirname+'/foto-a.png'); await H.dorme(800);
 ok('Foto do painel aparece', await pm.evaluate(()=>!!document.querySelector('.cv-ftp img')));
 await pm.click('#cv-mr [data-act="cv-sn"][data-v="limpo|1"]'); await H.dorme(150); await pm.click('#cv-mr [data-act="cv-sn"][data-v="avaria|0"]'); await H.dorme(150);
 await pm.click('[data-act="cv-mr-ok"]'); await H.dorme(300); ok('Sem marcar o termo não pede', /confirmação de responsabilidade/.test(await tx(pm)));
 await pm.click('[data-act="cv-mr-t"]'); await pm.click('[data-act="cv-mr-ok"]'); await H.dorme(1200);
 const t1=await tx(pm); ok('Pedido enviado: "Aguardando a portaria liberar"', /Aguardando a portaria liberar/.test(t1)&&/45\.260 km/.test(t1), t1.slice(0,250).replace(/\n/g,' | '));
 await shot(pm,'aguardando');
 let s=await srv(pm); let v=Object.entries(s).filter(([k])=>k.startsWith('carrosv/')).map(([k,x])=>Object.assign({_id:k.slice(8)},x))[0];
 ok('Viagem gravada como pedido (não aberta), com aceite, termo e a foto do painel', v&&v.pedida===true&&v.aberta===false&&v.kmS===45260&&v.motUid==='uMOT'&&v.aceite.limpo===true&&v.aceite.avaria===false&&v.aceite.termo===true&&!!s['carrosf/'+v.fotoPS]&&s['carrosf/'+v.fotoPS].tipo==='painel-saida', JSON.stringify(v).slice(0,250));
 /* ---------- portaria libera ---------- */
 const PO=await abrir(390,844,'portaria','por123',s); const pp=PO.page;
 const t2=await tx(pp); ok('Portaria vê "Para a portaria" com o pedido: placa, vendedor, km, limpo/sem avaria e a foto do painel', /Para a portaria/.test(t2)&&/Quer sair/.test(t2)&&/Carlos Bento/.test(t2)&&/45\.260 km/.test(t2)&&/\+30/.test(t2)&&/limpo/.test(t2)&&/sem avaria/.test(t2)&&await pp.evaluate(()=>!!document.querySelector('.cv-pf img')), t2.slice(0,400).replace(/\n/g,' | '));
 await shot(pp,'portaria-pedido');
 await pp.click(`[data-act="cv-pd-lib"][data-v="${v._id}"]`); await H.dorme(900);
 s=await srv(pp); let v2=s['carrosv/'+v._id];
 ok('Liberar saída: viagem aberta, quem liberou, km diferente marcado, carro "fora" para os outros', v2.pedida===false&&v2.aberta===true&&v2.porSN==='Seu Zé Porteiro'&&v2.kmDif===true&&v2.kmEsp===45230&&s['carrosk/c1'].fora===true&&s['carrosk/c1'].km===45260, JSON.stringify({p:v2.pedida,a:v2.aberta,k:s['carrosk/c1']}));
 ok('Some da lista "Para a portaria" e aparece em "Fora agora"', !/Quer sair/.test(await tx(pp))&&/Fora agora\s*1/.test(await tx(pp)));
 /* ---------- outro vendedor não consegue pegar o mesmo carro ---------- */
 const J=await abrir(390,844,'joana','jo1234',s); const pj=J.page;
 ok('Para a Joana, o carro que saiu aparece "fora com Carlos Bento" e não dá para escolher', await pj.evaluate(()=>{ const b=document.querySelector('[data-act="cv-mcar"][data-v="c1"]'); return b&&b.disabled&&/fora com Carlos Bento/.test(b.innerText); }));
 await J.browser.close();
 /* ---------- vendedor está com o carro e devolve ---------- */
 await recarrega(M,'carlosb','mot123',s);
 const t3=await tx(pm); ok('Vendedor: "Você está com o carro" e o botão Devolver o carro', /Você está com o carro/.test(t3)&&/Devolver o carro/.test(t3));
 await pm.click(`[data-act="cv-dv-abre"][data-v="${v._id}"]`); await H.dorme(400);
 await pm.fill('#cv-dv-km','45100'); await pm.click('[data-act="cv-dv-ok"]'); await H.dorme(300);
 ok('Km da volta menor que o da saída é recusado', /não pode ser menor que o da saída/.test(await tx(pm)));
 await pm.fill('#cv-dv-km','45388'); await H.dorme(100); ok('Mostra quanto rodou enquanto digita', /Rodou 128 km/.test(await tx(pm)));
 await pm.click('[data-act="cv-dv-ok"]'); await H.dorme(300); ok('Sem a foto do painel não entrega', /Tire a foto do painel/.test(await tx(pm)));
 await pm.setInputFiles(`[data-cvfoto="dvp:${v._id}"]`,__dirname+'/foto-b.png'); await H.dorme(800);
 await pm.click(`#cv-dv-${v._id} [data-act="cv-sn"][data-v="abast|1"]`); await H.dorme(150); await pm.fill(`[data-cvdv="${v._id}|litros"]`,'32,5');
 await pm.click(`#cv-dv-${v._id} [data-act="cv-sn"][data-v="avaria|0"]`); await H.dorme(150); await pm.click(`#cv-dv-${v._id} [data-act="cv-sn"][data-v="limpo|1"]`); await H.dorme(150);
 await shot(pm,'devolver');
 await pm.click('[data-act="cv-dv-ok"]'); await H.dorme(1200);
 ok('Entregue: "Aguardando a portaria receber"', /Aguardando a portaria receber/.test(await tx(pm)));
 s=await srv(pm); v2=s['carrosv/'+v._id];
 ok('Devolução gravada: km, abasteceu 32,5 L, sem avaria, limpo, foto do painel da volta', v2.devolPed===true&&v2.devol.kmV===45388&&v2.devol.abast===true&&v2.devol.litros===32.5&&v2.devol.avaria===false&&v2.devol.limpo===true&&s['carrosf/'+v2.fotoPV].tipo==='painel-volta'&&v2.aberta===true, JSON.stringify(v2.devol).slice(0,200));
 /* ---------- portaria recebe ---------- */
 await recarrega(PO,'portaria','por123',s);
 const t4=await tx(pp); ok('Portaria vê "Chegou" com km, quanto rodou, abasteceu e a foto', /Chegou/.test(t4)&&/45\.388 km/.test(t4)&&/rodou 128 km/.test(t4)&&/abasteceu 32,5 L/.test(t4), t4.slice(0,300).replace(/\n/g,' | '));
 await shot(pp,'portaria-chegou');
 await pp.click(`[data-act="cv-dv-rec"][data-v="${v._id}"]`); await H.dorme(900);
 s=await srv(pp); v2=s['carrosv/'+v._id];
 ok('Recebido: viagem fechada (km da volta, rodou, quem recebeu) e o carro volta para a empresa', v2.aberta===false&&v2.devolPed===false&&v2.kmV===45388&&v2.rodou===128&&v2.porVN==='Seu Zé Porteiro'&&s['carrosk/c1'].fora===false&&s['carrosk/c1'].km===45388, JSON.stringify({a:v2.aberta,r:v2.rodou,k:s['carrosk/c1']}));
 ok('Na empresa de novo na portaria', /Na empresa\s*2/.test(await tx(pp)));
 /* ---------- recusar e cancelar ---------- */
 await recarrega(M,'carlosb','mot123',s);
 ok('Vendedor: histórico com a viagem concluída e pode retirar de novo', /Concluída/.test(await tx(pm))&&/Retirar carro/.test(await tx(pm)));
 await pm.click('[data-act="cv-mcar"][data-v="c2"]'); await H.dorme(300); await pm.fill('#cv-mr-km','38904'); await pm.setInputFiles('[data-cvfoto="mrp"]',__dirname+'/foto-a.png'); await H.dorme(700);
 await pm.click('#cv-mr [data-act="cv-sn"][data-v="limpo|0"]'); await pm.click('#cv-mr [data-act="cv-sn"][data-v="avaria|1"]'); await H.dorme(200); await pm.fill('#cv-mr-av','risco no para-choque'); await pm.click('[data-act="cv-mr-t"]'); await pm.click('[data-act="cv-mr-ok"]'); await H.dorme(1200);
 s=await srv(pm); const v3=Object.entries(s).filter(([k,x])=>k.startsWith('carrosv/')&&x.carro==='c2').map(([k,x])=>Object.assign({_id:k.slice(8)},x))[0];
 await recarrega(PO,'portaria','por123',s);
 ok('Portaria vê sujo e a avaria do pedido', /sujo/.test(await tx(pp))&&/avaria: risco no para-choque/.test(await tx(pp)));
 await pp.click(`[data-act="cv-pd-rec"][data-v="${v3._id}"]`); await H.dorme(800); s=await srv(pp);
 ok('Recusar guarda o motivo e o carro continua na empresa', s['carrosv/'+v3._id].recusada&&s['carrosv/'+v3._id].recusada.motivo==='chave errada'&&s['carrosv/'+v3._id].pedida===false&&!(s['carrosk/c2']||{}).fora);
 await recarrega(M,'carlosb','mot123',s);
 ok('Vendedor vê "A portaria recusou a saída" com o motivo', /A portaria recusou a saída com o QWE-?4567: chave errada/.test(await tx(pm)), (await tx(pm)).slice(0,200));
 await pm.click('[data-act="cv-mcar"][data-v="c2"]'); await H.dorme(300); await pm.fill('#cv-mr-km','38904'); await pm.setInputFiles('[data-cvfoto="mrp"]',__dirname+'/foto-a.png'); await H.dorme(700);
 await pm.click('#cv-mr [data-act="cv-sn"][data-v="limpo|1"]'); await pm.click('#cv-mr [data-act="cv-sn"][data-v="avaria|0"]'); await pm.click('[data-act="cv-mr-t"]'); await pm.click('[data-act="cv-mr-ok"]'); await H.dorme(1200);
 const v4=Object.entries(await srv(pm)).filter(([k,x])=>k.startsWith('carrosv/')&&x.carro==='c2'&&x.pedida).map(([k])=>k.slice(8))[0];
 await pm.click(`[data-act="cv-ped-x"][data-v="${v4}"]`); await H.dorme(800); s=await srv(pm);
 ok('Vendedor cancela o próprio pedido', s['carrosv/'+v4].pedida===false&&!!s['carrosv/'+v4].cancelada&&/Retirar carro/.test(await tx(pm)));
 ok('Sem erros de programa', !erros.length, erros.join(' | '));
 await M.browser.close(); await PO.browser.close();
 const nf=res.filter(r=>!r.ok).length; console.log(nf?`\n${nf} FALHOU de ${res.length}`:`\nTODOS PASSARAM (${res.length})`); process.exit(nf?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
