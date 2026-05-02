(function () {
  'use strict';
  var KEY = 'gte_cookie_consent';
  try {
    if (localStorage.getItem(KEY)) return;
  } catch (e) { return; }

  var css = '' +
    '#gte-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;' +
    'background:#0f172a;color:#f8fafc;border-radius:12px;padding:18px 20px;' +
    'box-shadow:0 10px 40px rgba(0,0,0,.25);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
    'display:flex;flex-wrap:wrap;align-items:center;gap:12px;max-width:980px;margin:0 auto}' +
    '#gte-cc p{margin:0;flex:1 1 280px}' +
    '#gte-cc a{color:#7dd3fc;text-decoration:underline}' +
    '#gte-cc .gte-cc-btns{display:flex;gap:8px;flex-wrap:wrap}' +
    '#gte-cc button{font:600 14px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
    'padding:10px 18px;border-radius:8px;border:0;cursor:pointer;min-height:40px}' +
    '#gte-cc .gte-accept{background:#0284c7;color:#fff}' +
    '#gte-cc .gte-accept:hover{background:#0369a1}' +
    '#gte-cc .gte-reject{background:transparent;color:#cbd5e1;border:1px solid #475569}' +
    '#gte-cc .gte-reject:hover{background:#1e293b}' +
    '@media (max-width:520px){#gte-cc{flex-direction:column;align-items:stretch}' +
    '#gte-cc .gte-cc-btns{justify-content:flex-end}}';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);

    var bar = document.createElement('div');
    bar.id = 'gte-cc';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-live', 'polite');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<p>We use cookies for analytics and to display ads. Your photos are processed in your browser and never uploaded. ' +
      'See our <a href="/privacy-policy/">Privacy Policy</a> for details.</p>' +
      '<div class="gte-cc-btns">' +
      '<button type="button" class="gte-reject" aria-label="Reject non-essential cookies">Reject</button>' +
      '<button type="button" class="gte-accept" aria-label="Accept all cookies">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);

    function dismiss(value) {
      try { localStorage.setItem(KEY, value); } catch (e) {}
      bar.parentNode && bar.parentNode.removeChild(bar);
    }
    bar.querySelector('.gte-accept').addEventListener('click', function () { dismiss('accepted'); });
    bar.querySelector('.gte-reject').addEventListener('click', function () { dismiss('rejected'); });
  });
})();
