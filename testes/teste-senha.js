/* Esqueci a senha (16/11/2026): ligar a conta Google pelo menu do nome, entrar pelo Google e criar senha nova;
   conta Google que não é de ninguém não entra (e o usuário criado à toa é apagado); pedido à administradora sem login,
   que aparece em Equipe e cargos e no sino, com "Criar o login de novo". A conta Google do teste vem de __ctl.google. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const srvDe=async p=>JSON.parse(await p.evaluate(()=>localStorage.getItem('__srv')));
(async()=>{ const {d}=H.seed();
  /* 1. João liga a conta Google pelo menu do nome */
  let B=await H.abrir(); let p=B.page; await H.preparar(p,d,{google:'joao.silva@gmail.com'}); await p.goto(H.BASE); await H.entrar(p,'joao','joao123'); await H.dorme(2500);
  await p.click('.quem'); await H.dorme(300);
  ok('Menu do nome tem "Ligar minha conta Google"', /Ligar minha conta Google/.test(await p.evaluate(()=>document.getElementById('pf-menu').innerText)));
  await p.click('#pf-menu [data-m="google"]'); await H.dorme(300); await p.click('#cg-lig'); await H.dorme(800);
  let S=await srvDe(p);
  ok('Conta Google fica ligada ao usuário', S.users['joao@painel-colafix.app'].google==='joao.silva@gmail.com');
  ok('Perfil guarda que tem recuperação pelo Google', !!(S.docs['perfis/uJOAO'].recup&&S.docs['perfis/uJOAO'].recup.google));
  await p.click('.quem'); await H.dorme(300);
  ok('Depois de ligar, o menu mostra "Conta Google ligada"', /Conta Google ligada/.test(await p.evaluate(()=>document.getElementById('pf-menu').innerText)));
  await B.browser.close();
  /* 2. João esqueceu a senha: entra pelo Google e cria a senha nova */
  B=await H.abrir(); p=B.page; await H.preparar(p,S,{google:'joao.silva@gmail.com'}); await p.goto(H.BASE); await H.dorme(1200);
  ok('Tela de entrar tem "Esqueci a senha"', !!await p.$('#lg-esq'));
  await p.click('#lg-esq'); await H.dorme(300);
  ok('Esqueci a senha mostra os dois jeitos', await p.evaluate(()=>/Entrar com a conta Google/.test(document.getElementById('lg').innerText)&&/PEDIR AJUDA/.test(document.getElementById('lg').innerText)));
  await p.click('#lg-goo'); await H.dorme(3500);
  const ns=await p.evaluate(()=>({m:!!document.getElementById('ns-n'),view:!!document.querySelector('#view .head'),lg:!!document.getElementById('lg')}));
  ok('Entrou pelo Google como o João e o painel pede a senha nova', ns.m&&!ns.lg, JSON.stringify(ns));
  await p.fill('#ns-n','novaSenha9'); await p.fill('#ns-r','outraSenha'); await p.click('#pf-m .p'); await H.dorme(300);
  ok('Senhas diferentes: avisa e não troca', /não são iguais/.test(await p.evaluate(()=>document.getElementById('ns-er').textContent)));
  await p.fill('#ns-r','novaSenha9'); await p.click('#pf-m .p'); await H.dorme(600);
  S=await srvDe(p); ok('Senha nova salva', S.users['joao@painel-colafix.app'].pass==='novaSenha9');
  await B.browser.close();
  B=await H.abrir(); p=B.page; await H.preparar(p,S); await p.goto(H.BASE); await H.entrar(p,'joao','novaSenha9'); await H.dorme(2500);
  ok('Entra com a senha nova', await p.evaluate(()=>!document.getElementById('lg')&&!!document.querySelector('.quem')));
  await B.browser.close();
  /* 3. conta Google que não está ligada a ninguém */
  B=await H.abrir(); p=B.page; await H.preparar(p,S,{google:'estranho@gmail.com'}); await p.goto(H.BASE); await H.dorme(1200);
  await p.click('#lg-esq'); await H.dorme(300); await p.click('#lg-goo'); await H.dorme(1500);
  const r3=await p.evaluate(()=>({er:document.getElementById('lg-er').textContent,lg:!!document.getElementById('lg'),log:window.__mockLog.filter(x=>x[0]==='deleteUser')}));
  S=await srvDe(p);
  ok('Conta Google de ninguém: não entra e explica', r3.lg&&/não está ligada a nenhum usuário/.test(r3.er), r3.er);
  ok('O usuário que o Firebase criou à toa é apagado', !S.users['estranho@gmail.com']&&r3.log.length===1);
  /* 4. sem Google: pedido à administradora, sem login */
  await p.fill('#lg-psu','maria'); await p.fill('#lg-psn','Maria Souza'); await p.fill('#lg-psc','ramal 210'); await p.click('#lg-ps button[type=submit]'); await H.dorme(1000);
  S=await srvDe(p); const ped=Object.entries(S.docs).filter(([k])=>k.startsWith('pedsenha/'));
  ok('Pedido gravado em pedsenha com usuário, nome e contato', ped.length===1&&ped[0][1].usuario==='maria'&&ped[0][1].status==='aberto'&&ped[0][1].contato==='ramal 210', JSON.stringify(ped));
  ok('Tela confirma o pedido', /Pedido enviado/.test(await p.evaluate(()=>document.getElementById('lg').innerText)));
  await p.click('#lg-vol2'); await H.dorme(300); await p.click('#lg-esq'); await H.dorme(200); await p.fill('#lg-psu','maria'); await p.fill('#lg-psn','Maria Souza'); await p.click('#lg-ps button[type=submit]'); await H.dorme(600);
  ok('Não manda o mesmo pedido de novo em seguida', /já foi enviado/.test(await p.evaluate(()=>document.getElementById('lg-er').textContent))&&Object.keys((await srvDe(p)).docs).filter(k=>k.startsWith('pedsenha/')).length===1);
  await B.browser.close();
  /* 5. administradora vê e recria o login */
  S.docs['acessos/uMARIA']={perfil:'outro',mods:['producao'],ativo:true};
  B=await H.abrir(); p=B.page; await H.preparar(p,S); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
  const sino=await p.evaluate(()=>{ try{ return JSON.stringify(__T.S()&&true); }catch(e){ return ''; } });
  await p.evaluate(()=>__T.go('acessos')); await H.dorme(1500);
  const card=await p.evaluate(()=>(document.getElementById('ps-card')||{}).innerText||'');
  ok('Equipe e cargos mostra o pedido com os passos', /Pedidos de senha \(1\)/.test(card)&&/Maria Souza/.test(card)&&/Excluir conta/.test(card), card.slice(0,200));
  ok('Botão "Criar o login de novo" aponta para a pessoa certa', await p.evaluate(()=>{ const b=document.querySelector('#ps-card [data-act="eq-recriar"]'); return !!b&&b.dataset.id==='uMARIA'; }));
  /* passo 1 feito "no console": apaga o login antigo */
  await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('__srv')); delete s.users['maria@painel-colafix.app']; localStorage.setItem('__srv',JSON.stringify(s)); });
  await p.click('#ps-card [data-act="eq-recriar"]'); await H.dorme(600);
  await p.fill('#eq-nv-sen','provisoria9'); await p.click('[data-act="eq-nv-criar"]'); await H.dorme(1500);
  S=await srvDe(p); const nu=S.users['maria@painel-colafix.app']; const nacs=nu&&S.docs['acessos/'+nu.uid];
  ok('Login recriado com o mesmo usuário e o mesmo cargo', !!nu&&nu.pass==='provisoria9'&&!!nacs&&nacs.herdadoDe==='uMARIA'&&(nacs.mods||[]).includes('producao'), JSON.stringify(nacs||{}).slice(0,200));
  ok('O pedido fica resolvido sozinho', Object.entries(S.docs).filter(([k])=>k.startsWith('pedsenha/')).every(([,v])=>v.status==='feito'));
  const e=B.erros.filter(x=>!/404|cdnjs/.test(x)); ok('Sem erros no console', !e.length, e.join(' | '));
  await B.browser.close();
  const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU '+f+' de '+res.length:'PASSOU tudo ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.log('ERRO '+(e&&e.stack||e)); process.exit(1); });
