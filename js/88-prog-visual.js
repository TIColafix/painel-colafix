/* 88 · Programação com acabamento (16/11, pedido "as funcionalidades estão boas mas o layout ainda está muito básico").
   Só aparência: nenhuma função muda.
   - Números do alto (Abertas · Para hoje · Pendente · Sem linha) viram cartões (`.pg-kpi`).
   - Filtros com a mesma altura e letra: "Atrasadas" como os outros botões, Família compacta.
   - Faixas de aviso (ensacado, antecipados) com ícone e a quantidade em selo.
   Prefixo `pg-`. */
{ const _vp=vProgramacao; vProgramacao=function(){ const h=_vp.apply(this,arguments); try{ return h.replace('<div class="rsm num">','<div class="rsm num pg-kpi">'); }catch(e){ return h; } }; }
{ const _e=ensCard; ensCard=function(){ const h=_e.apply(this,arguments); if(!h) return h; const n=ensPend().length;
    return h.replace('<span class="p12-dot"></span>',`<span class="p12-ic">${ic('caixa',15,2.2)}</span>`).replace(/<b>(\d+) ensacados? para apontar<\/b>/,`<b>Ensacado para apontar</b><span class="p12-n num">${n}</span>`); }; }
{ const _a=atcCard; atcCard=function(){ const h=_a.apply(this,arguments); if(!h) return h; const n=p12AtcGrupos().length;
    return h.replace('<span class="p12-dot"></span>',`<span class="p12-ic">${ic('relogio',15,2.2)}</span>`).replace('<b>Antecipados para descontar</b>',`<b>Antecipados para descontar</b><span class="p12-n num">${n}</span>`); }; }
document.head.insertAdjacentHTML('beforeend',`<style id="pg-css">
.rsm.pg-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 4px;padding:0;font-size:12.5px}
.pg-kpi>span{display:flex;flex-direction:column-reverse;align-items:flex-start;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 16px;color:var(--muted);font-weight:500;min-width:0}
.pg-kpi>span b,.pg-kpi>span .lnk{font-size:24px;font-weight:400;letter-spacing:-.02em;color:var(--ink);margin:0;line-height:1.15}
.pg-kpi>span.warn{border-color:var(--warn,#C99A2E);background:var(--warn-tint,#FBF4E6)}.pg-kpi>span.warn .lnk{color:var(--warn-ink)}
@media (max-width:640px){ .rsm.pg-kpi{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px} .pg-kpi>span{padding:10px 12px} .pg-kpi>span b,.pg-kpi>span .lnk{font-size:20px} }
.pfil .p29-at{height:32px;border-radius:9px;padding:0 12px;font-size:13px;font-weight:500;background:var(--surface-2,#F2F4F6);border-color:transparent}
.pfil .p29-at small{font-size:11px;color:var(--muted);font-weight:500}
.pfil .p29-at.on{background:var(--teal-strong);color:#fff;border-color:var(--teal-strong)}.pfil .p29-at.on small{color:rgba(255,255,255,.8)}
.pfil .p29-fam{display:inline-flex;align-items:center;gap:8px}
.pfil #p29-fam{height:32px;font-size:13px;padding:0 30px 0 10px;border-radius:9px;min-width:150px;width:auto}
details.p12-f{border-radius:14px}
details.p12-f>summary{padding:10px 14px}
.p12-ic{width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--warn-tint,#FBF4E6);color:var(--warn-ink,#8a6a1f)}
.p12-n{min-width:22px;height:22px;padding:0 7px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:var(--warn,#C99A2E);color:#fff;flex-shrink:0}
details.p12-f .p12-r{padding:10px 14px 10px 52px}
details.p12-f .p12-r .lnk{font-weight:600}
@media (max-width:640px){ details.p12-f .p12-s{display:none} details.p12-f>summary b{white-space:nowrap} details.p12-f .p12-v{margin-left:auto} details.p12-f .p12-r{padding:10px 14px} }
</style>`);
