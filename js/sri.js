/* Bibliotecas de fora (CDN) travadas pelo conteúdo (16/11/2026, revisão de segurança).
   Cada endereço tem o "código de conferência" (SRI, sha384) do arquivo. Com LIGADO, o navegador só roda a biblioteca se o
   arquivo baixado for exatamente aquele: se alguém trocar o arquivo na CDN, ele não roda (em vez de rodar código estranho
   com o login de quem está usando o painel).
   Vale para os <script> que o painel cria (createElement('script')); os do index.html já têm o integrity escrito.
   O GitHub Actions (testes/sri.js) baixa cada endereço todo dia e avisa se algum código não bate.
   Biblioteca nova ou versão nova: acrescente aqui (rode `node testes/sri.js --novo` num computador com internet).
   O "?sri=1" no fim do endereço só serve para o service worker antigo não entregar uma cópia guardada sem conferência. */
(function () {
  var LIGADO = false;
  var M = {
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js': 'sha384-ZaR6mWzmJtrRibZ1Vm7SoHFr8OXjyAuGAXalGDKqbxFT18oi/z+oZLIRFkpeNor1',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js': 'sha384-I1LYojsZ5RM1cOda44Z2h42Qa6YfsQ1XkXxREnhp4ueYBR/4d1pG1K+NZM537Vsj',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js': 'sha384-Ke0FJhH7LyRqDxZ0wt+/OXV38yfQVu7g9VPEEGjYmB4RVOY/ta04uecRhsMwT7V3',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js': 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw',
    'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js': 'sha384-Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H',
    'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js': 'sha384-Kk5SjBOKprEnGfyBWfD2zROFd1Cu8kwOXxG2GIhYPcoDL2rBJS9P8Ud1ZMy4412a',
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js': 'sha384-nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js': 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js': 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e',
    'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js': 'sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ',
    'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js': 'sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ',
    'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js': 'sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js': 'sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx'
  };
  window.PAINEL_SRI = { mapa: M, ligado: LIGADO };
  if (!LIGADO || window.__semSRI) return;
  function ajusta(el) {
    try {
      if (!el || el.tagName !== 'SCRIPT' || el.integrity) return;
      var src = el.getAttribute('src') || ''; var h = M[src.split('?')[0]]; if (!h) return;
      el.integrity = h; el.crossOrigin = 'anonymous';
      if (!/[?&]sri=1\b/.test(src)) el.setAttribute('src', src + (src.indexOf('?') >= 0 ? '&' : '?') + 'sri=1');
    } catch (e) {}
  }
  function envolve(obj, nome, pos) { var f = obj[nome]; if (typeof f !== 'function') return;
    obj[nome] = function () { for (var i = 0; i < arguments.length; i++) if (pos === undefined || i === pos) ajusta(arguments[i]); return f.apply(this, arguments); }; }
  envolve(Node.prototype, 'appendChild', 0); envolve(Node.prototype, 'insertBefore', 0);
  ['append', 'prepend', 'before', 'after'].forEach(function (n) { envolve(Element.prototype, n); });
})();
