// סקריפטים שמוזרקים ל-WebView של אמי"ת.
//
// GUARD: אוכף "קריאה בלבד". חוסם כל שליחת טופס חוץ מטופס ההתחברות (טופס עם שדה סיסמה),
// כך ששום דבר באפליקציה – ושום לחיצה בטעות – לא יגיש משימה או ימלא תשובה.

export const GUARD_SCRIPT = `
(function () {
  if (window.__schoolGuard) return; window.__schoolGuard = true;
  function isLoginForm(f) { return !!(f && f.querySelector && f.querySelector('input[type=password]')); }
  function notify(msg) { try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'blocked', msg: msg })); } catch (e) {} }
  var origSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    if (isLoginForm(this)) return origSubmit.apply(this, arguments);
    notify('submit');
  };
  if (HTMLFormElement.prototype.requestSubmit) {
    var origReq = HTMLFormElement.prototype.requestSubmit;
    HTMLFormElement.prototype.requestSubmit = function () {
      if (isLoginForm(this)) return origReq.apply(this, arguments);
      notify('submit');
    };
  }
  document.addEventListener('submit', function (e) {
    if (!isLoginForm(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); notify('submit'); }
  }, true);
  // כפתורי הגשה/שליחה שעובדים ב-AJAX (בלי form)
  var SUBMIT_WORDS = /הגש|הגשה|שלח|שליחה|submit|send|upload|העלא/i;
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('button, input[type=submit], input[type=button], [role=button]') : null;
    if (!el) return;
    if (isLoginForm(el.form || (el.closest && el.closest('form')))) return;
    var label = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim();
    if (SUBMIT_WORDS.test(label)) { e.preventDefault(); e.stopImmediatePropagation(); notify('click:' + label); }
  }, true);
})();
true;
`;

/** ממלא שם משתמש וסיסמה בטופס ההתחברות (רק בדף שיש בו שדה סיסמה), ומדווח על כתובת הדף. */
export function autofillScript(username: string, password: string): string {
  return `
(function () {
  var U = ${JSON.stringify(username)}, P = ${JSON.stringify(password)};
  function setVal(el, v) {
    var proto = Object.getPrototypeOf(el);
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function tryFill() {
    var pass = document.querySelector('input[type=password]');
    if (!pass || pass.__filled) return;
    var scope = pass.form || document;
    var inputs = Array.prototype.slice.call(scope.querySelectorAll('input'));
    var user = inputs.filter(function (i) {
      var t = (i.type || 'text').toLowerCase();
      return (t === 'text' || t === 'email' || t === 'tel' || t === 'number') && i.offsetParent !== null;
    })[0];
    if (!user) return;
    if (U) setVal(user, U);
    if (P) setVal(pass, P);
    pass.__filled = true;
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loginPage', url: location.href })); } catch (e) {}
  }
  tryFill();
  setInterval(tryFill, 1000);
})();
true;
`;
}

/** מחזיר את ה-HTML של הדף (אחרי שה-JS של האתר רץ), בלי ערכי שדות סיסמה. */
export const CAPTURE_HTML_SCRIPT = `
(function () {
  var clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('input').forEach(function (i) { i.removeAttribute('value'); });
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'html', url: location.href, title: document.title, html: '<!doctype html>\\n' + clone.outerHTML }));
})();
true;
`;
