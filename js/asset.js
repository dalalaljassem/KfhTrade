/* Asset detail page */
(function () {
  var STOCKS = KT.STOCKS, MARKETS = KT.MARKETS, TFS = KT.TFS, DEC = KT.DEC;
  var num = KT.num, big = KT.big, pct = KT.pct, cls = KT.cls, series = KT.series;
  var esc = KTUI.esc, avatar = KTUI.avatar;

  function $(sel) { return document.querySelector(sel); }

  var id = new URLSearchParams(location.search).get('s');
  var s = STOCKS.filter(function (x) { return x.sym === id; })[0] || STOCKS[0];
  var state = { tf: '1D', ccy: s.ccy };

  var c = function (v) { return KT.conv(v, s.ccy, state.ccy); };
  var dec = function () { return DEC[state.ccy]; };
  var mkt = MARKETS[s.mkt];

  document.title = s.sym + ' price | KFH Trade';

  // ---- Static header bits ----
  $('#who').innerHTML = avatar(s, 40) + '<div><b>' + esc(s.name) + '</b><small>' + esc(s.sym) + '</small></div>';
  $('#badge').textContent = mkt.name + ' \u00b7 ' + s.sector;
  $('#conv-sym').textContent = s.sym;
  $('#about-title').textContent = 'About ' + s.name;
  $('#about-text').textContent = s.name + ' is listed on ' + s.ex + ' in ' + mkt.name + ' and trades in ' + s.ccy +
    '. It is grouped under ' + s.sector + ' on KFH Trade. Figures on this page are demo data until the live market feed is connected.';
  $('#about-tags').innerHTML = [mkt.name, s.sector, s.ex].map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
  $('#about-facts').innerHTML =
    fact('Ticker', s.sym) + fact('Exchange', s.ex) + fact('Trading currency', s.ccy);
  $('#cta-title').textContent = 'Trade ' + s.sym + ' with KFH Trade';

  function fact(label, value) {
    return '<div class="stat-row"><span>' + esc(label) + '</span><span>' + esc(value) + '</span></div>';
  }

  // ---- Currency select ----
  var sel = $('#ccy');
  sel.innerHTML = Object.keys(KT.FX).map(function (k) {
    return '<option value="' + k + '"' + (k === state.ccy ? ' selected' : '') + '>' + k + '</option>';
  }).join('');
  sel.addEventListener('change', function () { state.ccy = sel.value; render(); });

  // ---- Timeframes ----
  var tfBox = $('#tfs');
  tfBox.innerHTML = TFS.map(function (t) {
    return '<button class="tf" type="button" data-tf="' + t + '" aria-pressed="' + (t === state.tf) + '">' + t + '</button>';
  }).join('');
  tfBox.addEventListener('click', function (e) {
    var b = e.target.closest('.tf');
    if (!b) return;
    state.tf = b.dataset.tf;
    tfBox.querySelectorAll('.tf').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    render();
  });

  // ---- Axis labels ----
  function two(n) { return n < 10 ? '0' + n : String(n); }
  function label(i, n, tf) {
    if (tf === '1D') {
      var mins = Math.round(9 * 60 + i / (n - 1) * 8 * 60);
      return two(Math.floor(mins / 60)) + ':' + two(mins % 60);
    }
    var days = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365, '5Y': 1826 }[tf];
    var d = new Date(Date.now() - (n - 1 - i) / (n - 1) * days * 864e5);
    var opts = (tf === '1Y' || tf === '5Y') ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', opts);
  }

  // ---- Chart ----
  function drawChart() {
    var box = $('#chart');
    var W = Math.max(box.clientWidth, 300);
    var H = Math.round(Math.min(340, Math.max(240, W * 0.42)));
    var vals = series(s, state.tf).map(c);
    var n = vals.length;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
    var T = 36, B = 44;
    var x = function (i) { return i / (n - 1) * W; };
    var y = function (v) { return T + (1 - (v - min) / span) * (H - T - B); };
    var col = vals[n - 1] >= vals[0] ? 'var(--up)' : 'var(--down)';

    var line = vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join('');
    var area = line + 'L' + W + ' ' + (H - B) + 'L0 ' + (H - B) + 'Z';
    var iMax = vals.indexOf(max), iMin = vals.indexOf(min);
    var clampX = function (v) { return Math.min(Math.max(v, 44), W - 44); };

    var ticks = '';
    for (var k = 0; k <= 6; k++) {
      var idx = Math.round(k * (n - 1) / 6);
      var anchor = k === 0 ? 'start' : k === 6 ? 'end' : 'middle';
      ticks += '<text class="axis-text" x="' + x(idx).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '">' + label(idx, n, state.tf) + '</text>';
    }

    box.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(s.sym) + ' price chart, ' + state.tf + '">' +
        '<defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">' +
          '<stop offset="0" style="stop-color:' + col + ';stop-opacity:.22"/><stop offset="1" style="stop-color:' + col + ';stop-opacity:0"/>' +
        '</linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#fill)"/>' +
        '<path d="' + line + '" fill="none" stroke-width="2" stroke-linejoin="round" style="stroke:' + col + '"/>' +
        '<text class="axis-text" x="' + clampX(x(iMax)).toFixed(1) + '" y="' + (y(max) - 10).toFixed(1) + '" text-anchor="middle">' + num(max, dec()) + '</text>' +
        '<text class="axis-text" x="' + clampX(x(iMin)).toFixed(1) + '" y="' + (y(min) + 20).toFixed(1) + '" text-anchor="middle">' + num(min, dec()) + '</text>' +
        ticks +
        '<g class="hover" hidden><line y1="' + T + '" y2="' + (H - B) + '"/><circle r="5" style="fill:' + col + '"/></g>' +
      '</svg><div class="tip" hidden></div>';

    var svg = box.querySelector('svg'), g = box.querySelector('.hover'), tip = box.querySelector('.tip');
    var vline = g.querySelector('line'), dot = g.querySelector('circle');

    svg.addEventListener('pointermove', function (e) {
      var rect = svg.getBoundingClientRect();
      var i = Math.round((e.clientX - rect.left) / rect.width * (n - 1));
      i = Math.min(Math.max(i, 0), n - 1);
      var px = x(i), py = y(vals[i]);
      vline.setAttribute('x1', px); vline.setAttribute('x2', px);
      dot.setAttribute('cx', px); dot.setAttribute('cy', py);
      g.hidden = false; tip.hidden = false;
      tip.textContent = label(i, n, state.tf) + '  ' + num(vals[i], dec());
      var tw = tip.offsetWidth;
      tip.style.insetInlineStart = Math.min(Math.max(px - tw / 2, 0), W - tw) + 'px';
    });
    svg.addEventListener('pointerleave', function () { g.hidden = true; tip.hidden = true; });
  }

  // ---- Price + stats ----
  function row(label, value, tip) {
    return '<div class="stat-row"><span title="' + esc(tip) + '">' + esc(label) + '</span><span>' + value + '</span></div>';
  }

  function render() {
    var d = dec(), ccy = state.ccy;
    var vals = series(s, state.tf).map(c);
    var diff = vals[vals.length - 1] - vals[0];
    var p = (vals[vals.length - 1] / vals[0] - 1) * 100;

    $('#title').textContent = s.name + ' price in ' + ccy;
    $('#price').textContent = ccy + ' ' + num(c(s.price), d);
    var dl = $('#delta');
    dl.className = 'delta ' + cls(diff);
    dl.textContent = (diff >= 0 ? '+' : '-') + ccy + ' ' + num(Math.abs(diff), d) + ' (' + pct(p) + ')';

    $('#stats').innerHTML =
      row('Market cap', ccy + ' ' + big(c(s.mc * 1e9)), 'Total value of all shares') +
      row('Day range', num(c(s.lo), d) + ' - ' + num(c(s.hi), d), 'Lowest and highest price today') +
      row('52-week range', num(c(s.y52lo), d) + ' - ' + num(c(s.y52hi), d), 'Lowest and highest price in the past year') +
      row('Volume', big(s.vol) + ' shares', 'Shares traded today') +
      row('Dividend yield', s.div.toFixed(2) + '%', 'Yearly dividend as a share of the price');

    $('#conv-ccy').textContent = ccy;
    syncValue();
    drawChart();
  }

  // ---- Estimate: shares <-> value ----
  var sh = $('#sh'), val = $('#val');
  var parse = function (t) { var v = parseFloat(String(t).replace(/,/g, '')); return isFinite(v) ? v : 0; };
  function syncValue() { val.value = num(parse(sh.value) * c(s.price), dec()); }
  sh.addEventListener('input', syncValue);
  val.addEventListener('input', function () {
    var shares = parse(val.value) / c(s.price);
    sh.value = String(+shares.toFixed(4));
  });
  val.addEventListener('blur', syncValue);

  // ---- Performance ----
  $('#perf').innerHTML = TFS.map(function (t) {
    var v = series(s, t);
    var p = (v[v.length - 1] / v[0] - 1) * 100;
    return '<div class="perf-item"><span>' + t + '</span><b class="' + cls(p) + '">' + pct(p) + '</b></div>';
  }).join('');

  // ---- Share ----
  $('#share').addEventListener('click', function () {
    var done = $('#share-done');
    var show = function () { done.hidden = false; setTimeout(function () { done.hidden = true; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(show, function () {});
  });

  // ---- Nav search: jump to the markets list with the query ----
  // (the form already submits to index.html?q=...)

  render();
  window.addEventListener('resize', drawChart);
})();
