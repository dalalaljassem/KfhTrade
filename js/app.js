/* Shared helpers + light/dark toggle for the trade views */
(function () {
  var THEME_KEY = 'kfht-theme';

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Coloured circle with initials, colour derived from the symbol
  function avatar(s, size) {
    var text = /^\d/.test(s.sym) ? s.name.slice(0, 2) : s.sym.slice(0, 2);
    var hue = KT.hash(s.sym) % 360;
    return '<span class="avatar" style="background:hsl(' + hue + ' 42% 38%);' +
      (size ? 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.36) + 'px' : '') +
      '" aria-hidden="true">' + esc(text) + '</span>';
  }

  // Tiny inline sparkline
  function spark(values, w, h) {
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var span = max - min || 1;
    var pts = values.map(function (v, i) {
      return (i / (values.length - 1) * w).toFixed(1) + ',' + (h - 2 - (v - min) / span * (h - 4)).toFixed(1);
    }).join(' ');
    var up = values[values.length - 1] >= values[0];
    return '<svg class="spark ' + (up ? 'up' : 'down') + '" viewBox="0 0 ' + w + ' ' + h +
      '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '"/></svg>';
  }

  window.KTUI = { esc: esc, avatar: avatar, spark: spark };

  // ---- Theme toggle (default is dark; the choice is remembered) ----
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');

  function label() {
    if (!btn) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
  }
  label();

  if (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage blocked: ignore */ }
      label();
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }
})();
