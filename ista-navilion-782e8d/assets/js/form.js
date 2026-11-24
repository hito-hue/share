/* ログインID発行フォーム：入力チェックと送信（送信先＝Google Apps Script の受け口） */
(function () {
  'use strict';

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzupd_i0fMd8_uuNCJUhicDx8F8tR5m4JvJ4LrEaxAJgRZai3WyHiKEBYS29_9DejPeyQ/exec';

  var form = document.getElementById('entry');
  if (!form) return;
  var FORM_ID = form.getAttribute('data-form'); // eigyo（営業用） / cs（メルマガ用）
  var btn = document.getElementById('submit-btn');
  var errBox = document.getElementById('form-error');
  var thanks = document.getElementById('thanks');

  /* ---------- 入力のゆれを直す ---------- */
  function toHalf(s) {
    return String(s || '')
      .replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[－ー―‐ｰ−–—]/g, '-')
      .replace(/　/g, ' ');
  }
  function hiraToKata(s) {
    return String(s || '').replace(/[ぁ-ゖ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60); });
  }
  function normalize(input) {
    var kind = input.getAttribute('data-kind');
    var v = input.value;
    if (kind === 'zip') {
      v = toHalf(v).replace(/[^\d]/g, '');
      if (v.length === 7) v = v.slice(0, 3) + '-' + v.slice(3);
    } else if (kind === 'tel') {
      v = toHalf(v).replace(/[^\d-]/g, '');
    } else if (input.type === 'email' || input.name === 'hp_url') {
      v = toHalf(v).replace(/\s+/g, '');
    } else if (/_kana$/.test(input.name)) {
      v = hiraToKata(v).trim();
    } else {
      v = v.replace(/^\s+|\s+$/g, '');
    }
    input.value = v;
  }
  form.querySelectorAll('input[type=text], input[type=email], input[type=tel]').forEach(function (el) {
    el.addEventListener('blur', function () { normalize(el); });
    el.addEventListener('input', function () { clearError(el.closest('.field')); });
  });
  form.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(function (el) {
    el.addEventListener('change', function () { clearError(el.closest('.field')); });
  });

  /* ---------- エラー表示 ---------- */
  function setError(field, msg) {
    if (!field) return;
    field.classList.add('is-invalid');
    var p = field.querySelector('.field-error');
    if (!p) { p = document.createElement('p'); p.className = 'field-error'; field.appendChild(p); }
    p.textContent = msg;
    var input = field.querySelector('input');
    if (input) input.setAttribute('aria-invalid', 'true');
  }
  function clearError(field) {
    if (!field) return;
    field.classList.remove('is-invalid');
    var p = field.querySelector('.field-error');
    if (p) p.remove();
    var input = field.querySelector('input');
    if (input) input.removeAttribute('aria-invalid');
  }
  function val(name) { var el = form.elements[name]; return el && el.value !== undefined ? String(el.value).trim() : ''; }
  function checked(name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (i) { return i.value; });
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    form.querySelectorAll('.field').forEach(clearError);
    form.querySelectorAll('input[type=text], input[type=email], input[type=tel]').forEach(normalize);
    var bad = [];
    function fail(name, msg) { var f = form.querySelector('.field[data-name="' + name + '"]'); setError(f, msg); bad.push(f); }

    if (!checked('agree').length) fail('agree', '「同意する」にチェックを入れてください。');
    form.querySelectorAll('input[required][type=text], input[required][type=email], input[required][type=tel]').forEach(function (el) {
      if (!el.value.trim()) fail(el.name, '入力してください。');
    });
    if (!checked('has_hp').length) fail('has_hp', 'どちらかを選択してください。');
    if (!checked('items').length) fail('items', '1つ以上選択してください。');
    if (!checked('furikae').length) fail('furikae', 'どちらかを選択してください。');

    var zip = val('zip');
    if (zip && !/^\d{3}-\d{4}$/.test(zip)) fail('zip', '郵便番号は7桁の半角数字で入力してください。');
    ['tel', 'fax'].forEach(function (n) {
      var d = val(n).replace(/-/g, '');
      if (val(n) && (d.length < 10 || d.length > 11)) fail(n, '番号を正しく入力してください（半角数字・10〜11桁）。');
    });
    var email = val('email');
    if (email && !EMAIL_RE.test(email)) fail('email', 'メールアドレスの形式が正しくありません。');
    if (val('email2') && email && val('email2').toLowerCase() !== email.toLowerCase()) fail('email2', 'メールアドレスが一致しません。');
    var inv = val('invoice_email');
    if (inv && !EMAIL_RE.test(inv)) fail('invoice_email', 'メールアドレスの形式が正しくありません。');

    return bad.filter(Boolean);
  }

  /* ---------- 送る内容 ---------- */
  function newId() {
    try { return crypto.randomUUID(); } catch (e) { return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }
  var SID = newId();
  function payload() {
    var q = new URLSearchParams(location.search);
    var data = {};
    ['company', 'company_kana', 'rep_last', 'rep_first', 'zip', 'pref', 'city', 'address', 'building',
      'hp_url', 'last', 'first', 'last_kana', 'first_kana', 'dept', 'tel', 'fax', 'email',
      'sales', 'invoice_email'].forEach(function (n) { if (form.elements[n]) data[n] = val(n); });
    data.agree = checked('agree').join('');
    data.has_hp = checked('has_hp').join('');
    data.items = checked('items').join('、');
    data.furikae = checked('furikae').join('');
    return {
      v: 1,
      form: FORM_ID,
      sid: SID,
      data: data,
      meta: {
        page: location.href.split('#')[0],
        ref: document.referrer || '',
        utm_source: q.get('utm_source') || '',
        utm_medium: q.get('utm_medium') || '',
        utm_campaign: q.get('utm_campaign') || '',
        utm_content: q.get('utm_content') || '',
        ua: navigator.userAgent
      },
      website: val('website')
    };
  }

  /* ---------- 送信 ---------- */
  function showThanks() {
    form.hidden = true;
    thanks.hidden = false;
    window.scrollTo(0, 0);
    try { thanks.focus({ preventScroll: true }); } catch (e) { thanks.focus(); }
  }

  var sending = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    errBox.hidden = true;
    var bad = validate();
    if (bad.length) {
      errBox.textContent = '入力内容に不足があります。赤く表示された項目をご確認ください。';
      errBox.hidden = false;
      var first = bad[0].querySelector('input');
      bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
      return;
    }
    var body = payload();
    if (body.website) { showThanks(); return; } // ロボットよけ（人には見えない欄に入力があった）

    sending = true;
    btn.disabled = true;
    btn.textContent = '送信中…';
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined, redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'error');
        showThanks();
      })
      .catch(function () {
        errBox.textContent = '送信できませんでした。通信環境をご確認のうえ、もう一度「送信」を押してください。';
        errBox.hidden = false;
        btn.disabled = false;
        btn.textContent = '送信';
        sending = false;
      })
      .finally(function () { clearTimeout(timer); });
  });
})();
