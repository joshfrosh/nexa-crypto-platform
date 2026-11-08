/* ==========================================================================
   Safu Traders — shared UI shell
   Nav rendering, auth guards, toasts, modals, formatting, charts,
   and the international country-code selector.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.APP_CONFIG;

  /* ------------------------------------------------------------ formatting */
  function money(n, opts) {
    opts = opts || {};
    var v = Number(n) || 0;
    var dec = opts.decimals != null ? opts.decimals : (Math.abs(v) >= 1000 ? 2 : 2);
    return CFG.CURRENCY_SYMBOL + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function num(n, dec) {
    var v = Number(n) || 0;
    dec = dec == null ? 2 : dec;
    return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function price(n) {
    var v = Number(n) || 0;
    if (v >= 1000) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (v >= 1) return '$' + v.toFixed(2);
    return '$' + v.toFixed(4);
  }
  function pct(n) {
    var v = Number(n) || 0;
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  }
  function dateShort(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
           d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  function timeAgo(iso) {
    if (!iso) return '—';
    var s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function initials(sym) { return String(sym || '?').slice(0, 3).toUpperCase(); }

  /* ---------------------------------------------------------------- toast */
  function toastHost() {
    var h = document.querySelector('.toast-host');
    if (!h) { h = document.createElement('div'); h.className = 'toast-host'; document.body.appendChild(h); }
    return h;
  }
  function toast(msg, kind) {
    var host = toastHost();
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    var ico = kind === 'err' ? '✕' : kind === 'warn' ? '!' : '✓';
    el.innerHTML = '<span class="t-ico">' + ico + '</span><span>' + esc(msg) + '</span>';
    host.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(function () { el.remove(); }, 220);
    }, 3600);
  }

  /* ---------------------------------------------------------------- modal */
  function modal(opts) {
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || 'Dialog') + '">' +
        '<div class="modal-head"><h3>' + esc(opts.title || '') + '</h3>' +
          '<button class="modal-close" aria-label="Close">&times;</button></div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        (opts.footer === false ? '' : '<div class="modal-foot">' +
          '<button class="btn btn-ghost" data-close>Cancel</button>' +
          '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm>' +
          esc(opts.confirmText || 'Confirm') + '</button></div>') +
      '</div>';
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('open'); });

    function close() {
      backdrop.classList.remove('open');
      setTimeout(function () { backdrop.remove(); }, 200);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    backdrop.querySelector('.modal-close').addEventListener('click', close);
    var cancel = backdrop.querySelector('[data-close]');
    if (cancel) cancel.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });

    var confirmBtn = backdrop.querySelector('[data-confirm]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        var ok = opts.onConfirm ? opts.onConfirm(backdrop) : true;
        if (ok !== false) close();
      });
    }
    if (opts.onOpen) opts.onOpen(backdrop);
    return { el: backdrop, close: close };
  }

  /* ---------------------------------------------------------------- charts */
  /* Draw a smooth area+line chart into an SVG element from a numeric series */
  function drawChart(svg, series, opts) {
    opts = opts || {};
    if (!svg || !series || series.length < 2) return;
    var W = 600, H = opts.height || 300;
    var pad = { t: 14, r: 8, b: 22, l: 8 };
    var min = Math.min.apply(null, series);
    var max = Math.max.apply(null, series);
    var span = (max - min) || 1;
    min -= span * 0.12; max += span * 0.12; span = max - min;

    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var pts = series.map(function (v, i) {
      return [pad.l + (i / (series.length - 1)) * iw, pad.t + ih - ((v - min) / span) * ih];
    });

    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i];
      var cx = (p0[0] + p1[0]) / 2;
      d += ' C' + cx.toFixed(1) + ',' + p0[1].toFixed(1) + ' ' + cx.toFixed(1) + ',' + p1[1].toFixed(1) + ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1);
    }
    var area = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (pad.t + ih) + ' L' + pts[0][0].toFixed(1) + ',' + (pad.t + ih) + ' Z';

    var up = series[series.length - 1] >= series[0];
    var color = opts.color || (up ? '#00d68f' : '#ff4d6a');
    var gid = 'g' + Math.random().toString(36).slice(2, 8);

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML =
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.22"/>' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + pts[pts.length - 1][0].toFixed(1) + '" cy="' + pts[pts.length - 1][1].toFixed(1) +
        '" r="3.5" fill="' + color + '"/>';
  }

  /* Small inline sparkline for market rows */
  function sparkline(series, up) {
    if (!series || series.length < 2) return '';
    var W = 90, H = 30;
    var min = Math.min.apply(null, series), max = Math.max.apply(null, series);
    var span = (max - min) || 1;
    var pts = series.map(function (v, i) {
      return (i / (series.length - 1) * W).toFixed(1) + ',' + (H - ((v - min) / span) * (H - 4) - 2).toFixed(1);
    }).join(' ');
    var color = up ? '#00d68f' : '#ff4d6a';
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  /* ------------------------------------------------------- country selector */
  function flagEmoji(iso) {
    if (!iso || iso.length !== 2) return '🌐';
    var A = 0x1F1E6;
    return String.fromCodePoint(A + iso.charCodeAt(0) - 65, A + iso.charCodeAt(1) - 65);
  }

  /* Build a country-code picker inside `wrap`.
     opts: { onChange(country) }  — country = {name, iso, dial} */
  function countryPicker(wrap, opts) {
    opts = opts || {};
    var list = window.COUNTRIES || [];
    var selected = list.find(function (c) { return c[1] === 'US'; }) || list[0];

    wrap.innerHTML =
      '<button type="button" class="country-trigger" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="flag">' + flagEmoji(selected[1]) + '</span>' +
        '<span class="dial">+' + selected[2] + '</span>' +
        '<span class="caret">▾</span>' +
      '</button>' +
      '<div class="country-panel hidden">' +
        '<div class="country-search"><input type="text" placeholder="Search country or code…" aria-label="Search country"></div>' +
        '<div class="country-list" role="listbox"></div>' +
      '</div>';

    var trigger = wrap.querySelector('.country-trigger');
    var panel = wrap.querySelector('.country-panel');
    var search = wrap.querySelector('.country-search input');
    var listEl = wrap.querySelector('.country-list');

    function render(filter) {
      var q = (filter || '').toLowerCase().trim();
      var items = list.filter(function (c) {
        if (!q) return true;
        return c[0].toLowerCase().indexOf(q) !== -1 || c[2].indexOf(q.replace('+', '')) !== -1 || c[1].toLowerCase() === q;
      });
      if (!items.length) {
        listEl.innerHTML = '<div class="country-empty">No country matches “' + esc(filter) + '”</div>';
        return;
      }
      listEl.innerHTML = items.map(function (c) {
        return '<button type="button" class="country-item" role="option" data-iso="' + c[1] + '">' +
          '<span class="flag">' + flagEmoji(c[1]) + '</span>' +
          '<span>' + esc(c[0]) + '</span>' +
          '<span class="dial">+' + c[2] + '</span></button>';
      }).join('');
    }

    function open() {
      panel.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      search.value = '';
      render('');
      search.focus();
    }
    function close() {
      panel.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.classList.contains('hidden')) open(); else close();
    });
    search.addEventListener('input', function () { render(search.value); });
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.country-item');
      if (!btn) return;
      var c = list.find(function (x) { return x[1] === btn.dataset.iso; });
      if (!c) return;
      selected = c;
      trigger.querySelector('.flag').textContent = flagEmoji(c[1]);
      trigger.querySelector('.dial').textContent = '+' + c[2];
      close();
      if (opts.onChange) opts.onChange({ name: c[0], iso: c[1], dial: c[2] });
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    render('');
    return {
      get: function () { return { name: selected[0], iso: selected[1], dial: selected[2] }; }
    };
  }

  /* ------------------------------------------------------------------- nav */
  var NAV_ITEMS = [
    { href: 'index.html', label: 'Home' },
    { href: 'trade.html', label: 'Trade' },
    { href: 'staking.html', label: 'Staking' },
    { href: 'predictions.html', label: 'Predictions' },
    { href: 'bonuses.html', label: 'Bonuses' },
    { href: 'wallet.html', label: 'Wallet' }
  ];

  function currentPage() {
    var p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function renderNav() {
    var host = document.getElementById('nav');
    if (!host) return;
    var user = Store.currentUser();
    var page = currentPage();
    var admin = Store.isAdmin();

    var links = NAV_ITEMS.map(function (it) {
      var active = it.href === page ? ' active' : '';
      return '<a class="nav-link' + active + '" href="' + it.href + '">' + it.label + '</a>';
    }).join('');

    if (admin) {
      links += '<a class="nav-link' + (page === 'admin.html' ? ' active' : '') + '" href="admin.html">Admin</a>';
    }

    var right = '';
    if (user) {
      right =
        '<div class="nav-balance"><small>Balance</small><strong>' + money(user.balance) + '</strong></div>' +
        '<a class="btn btn-sm btn-outline" href="wallet.html">Wallet</a>' +
        '<button class="btn btn-sm btn-ghost" id="navLogout">Sign out</button>';
    } else {
      right = '<a class="btn btn-sm btn-ghost" href="auth.html">Sign in</a>' +
              '<a class="btn btn-sm btn-primary" href="auth.html#signup">Get started</a>';
    }

    host.innerHTML =
      '<div class="container nav-inner">' +
        '<a class="brand" href="index.html"><span class="brand-mark">S</span><span>' + CFG.APP_NAME + '</span></a>' +
        '<button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="navLinks" aria-label="Toggle navigation">' +
          '<span></span><span></span><span></span></button>' +
        '<nav class="nav-links" id="navLinks">' + links + '</nav>' +
        '<div class="nav-right">' + right + '</div>' +
      '</div>';

    var toggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');
    toggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('.nav-link')) {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    var logout = document.getElementById('navLogout');
    if (logout) {
      logout.addEventListener('click', function () {
        Store.logout();
        toast('Signed out.');
        setTimeout(function () { location.href = 'index.html'; }, 400);
      });
    }
  }

  /* ------------------------------------------------------------ auth guard */
  /* requireAuth() — bounce to auth.html if not signed in.
     requireAdmin() — bounce unless the signed-in email is the sole admin. */
  function requireAuth() {
    var u = Store.currentUser();
    if (!u) {
      var next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.replace('auth.html?next=' + next);
      return null;
    }
    return u;
  }
  function requireAdmin() {
    var u = Store.currentUser();
    if (!u) {
      location.replace('auth.html?next=admin.html');
      return null;
    }
    if (!Store.isAdmin()) {
      document.body.innerHTML =
        '<div class="container" style="padding:80px 20px;max-width:560px;text-align:center">' +
          '<div style="font-size:40px;margin-bottom:16px">🔒</div>' +
          '<h1 style="font-size:24px;margin-bottom:10px">Admin access only</h1>' +
          '<p class="text-dim" style="margin-bottom:24px">This panel is restricted to the account owner. ' +
          'You are signed in as <strong>' + esc(u.email) + '</strong>.</p>' +
          '<a class="btn btn-primary" href="index.html">Back to home</a>' +
        '</div>';
      return null;
    }
    return u;
  }

  /* --------------------------------------------------------------- footer */
  function renderFooter() {
    var host = document.getElementById('footer');
    if (!host) return;
    host.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<a class="brand" href="index.html"><span class="brand-mark">S</span><span>' + CFG.APP_NAME + '</span></a>' +
            '<p>' + esc(CFG.APP_TAGLINE) + '</p>' +
          '</div>' +
          '<div><h4>Product</h4><ul>' +
            '<li><a href="trade.html">Trade &amp; Buy</a></li>' +
            '<li><a href="staking.html">Staking</a></li>' +
            '<li><a href="predictions.html">Predictions</a></li>' +
            '<li><a href="bonuses.html">Bonuses</a></li>' +
          '</ul></div>' +
          '<div><h4>Account</h4><ul>' +
            '<li><a href="wallet.html">Wallet</a></li>' +
            '<li><a href="kyc.html">Verification</a></li>' +
            '<li><a href="auth.html">Sign in</a></li>' +
          '</ul></div>' +
          '<div><h4>Company</h4><ul>' +
            '<li><a href="index.html#features">About</a></li>' +
            '<li><a href="index.html#security">Security</a></li>' +
            '<li><a href="index.html#faq">FAQ</a></li>' +
          '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>&copy; ' + new Date().getFullYear() + ' ' + esc(CFG.APP_NAME) + '. Demo application.</span>' +
          '<span>Not financial advice. Trading involves risk.</span>' +
        '</div>' +
        '<p class="disclaimer">This is a front-end demonstration built with mock data. No real funds, ' +
        'assets or personal data are processed. Nothing here constitutes investment advice.</p>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    Store.init();
    renderNav();
    renderFooter();
  }

  window.UI = {
    money: money, num: num, price: price, pct: pct,
    dateShort: dateShort, timeAgo: timeAgo, esc: esc, initials: initials,
    toast: toast, modal: modal,
    drawChart: drawChart, sparkline: sparkline,
    countryPicker: countryPicker, flagEmoji: flagEmoji,
    requireAuth: requireAuth, requireAdmin: requireAdmin,
    renderNav: renderNav, renderFooter: renderFooter,
    boot: boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
