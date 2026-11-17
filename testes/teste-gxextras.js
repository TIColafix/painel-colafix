/* Gestor com módulo a mais (17/11/2026): cargo virou "Personalizado" ao liberar o almoxarifado; o menu da Visão do gestor continua
   e o módulo a mais aparece em "Outros módulos". Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const ok=(n,c,d)=>{ console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); if(!c) ok.f=(ok.f||0)+1; else ok.p=(ok.p||0)+1; };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'};
 D['acessos/uMAR']={perfil:'outro',mods:['gestor','producao','silos','manut','telas','analise','premix','monitor','silosver'],locais:[],ativo:true};
 const erros=[]; const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(3500);
 let s=await p.evaluate(()=>({solo:document.body.classList.contains('gx-solo'),nav:[...document.querySelectorAll('#navlist .navbtn')].map(b=>b.innerText.replace(/\s*\d+$/,'').trim()).join('|'),h:(document.querySelector('.gxe-h')||{}).innerText||''}));
 ok('Cargo "Personalizado" com Visão do gestor continua com o menu do gestor', s.solo&&/^Início\|Produção\|Manutenção\|Pessoas\|Plano de ação\|TVs da fábrica\|Cadastros/.test(s.nav), JSON.stringify(s));
 ok('Módulo a mais em "Outros módulos" (sem Monitor do rancho e Nível dos silos)', /OUTROS MÓDULOS/.test(s.h)&&/Cadastros\|Almoxarifado$/.test(s.nav), s.nav);
 await p.click('#navlist .gxe-m'); await H.dorme(800);
 s=await p.evaluate(()=>({mod:__T.S().mod,cur:(document.querySelector('#navlist .gxe-m[aria-current]')||{}).innerText||'',solo:document.body.classList.contains('gx-solo')}));
 ok('Abrir o módulo a mais pelo menu do gestor', s.mod==='premix'&&/Almoxarifado/.test(s.cur)&&s.solo, JSON.stringify(s));
 await p.click('#navlist [data-go="gxinicio"]'); await H.dorme(800); s=await p.evaluate(()=>({v:__T.S().view,mod:document.body.classList.contains('gx-mod')})); ok('Volta para o Início do gestor sem as abas soltas', s.v==='gxinicio'&&s.mod, JSON.stringify(s));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(ok.f?'FALHOU '+ok.f:'PASSOU tudo ('+ok.p+')'); await B.browser.close(); process.exit(ok.f?1:0);
})().catch(e=>{ console.log('FALHOU erro '+e.stack); process.exit(1); });
