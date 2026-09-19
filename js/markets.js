/* Markets page */
(function () {
  var STOCKS = KT.STOCKS, MARKETS = KT.MARKETS;
  var money = KT.money, big = KT.big, pct = KT.pct, cls = KT.cls, toUsd = KT.toUsd;
  var esc = KTUI.esc, avatar = KTUI.avatar, spark = KTUI.spark;

  function $(sel) { return document.querySelector(sel); }

  // ---- Favorites (kept in this browser only) ----
  var FAV_KEY = 'kfht-fav';
  var favs = (function () {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); }
    catch (e) { return new Set(); }
  })();
  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs))); } catch (e) { /* ignore */ }
  }

  var state = {
    tab: 'stocks',
    market: 'all',
    sector: 'all',
    q: (new URLSearchParams(location.search).get('q') || '').trim(),
    sort: 'mc',
    dir: -1
  };

  var href = function (s) { return 'asset.html?s=' + encodeURIComponent(s.sym); };

  // ---------- Summary cards ----------
  function miniRow(s) {
    return '<a class="mini-row" href="' + href(s) + '">' + avatar(s) +
      '<span class="mini-name"><b>' + esc(s.sym) + '</b><small>' + esc(MARKETS[s.mkt].name) + '</small></span>' +
      '<span class="mini-num">' + money(s.price, s.ccy) + '</span>' +
      '<span class="num ' + cls(s.chg) + '">' + pct(s.chg) + '</span></a>';
  }

  function renderCards() {
    var gainers = STOCKS.slice().sort(function (a, b) { return b.chg - a.chg; }).slice(0, 3);
    var active = STOCKS.slice().sort(function (a, b) { return b.volUsd - a.volUsd; }).slice(0, 3);
    $('#card-gainers').innerHTML = gainers.map(miniRow).join('');
    $('#card-active').innerHTML = active.map(miniRow).join('');

    // Snapshot: cap-weighted composite of every stock's day series
    var n = STOCKS[0].spark.length;
    var comp = [];
    for (var i = 0; i < n; i++) {
      comp.push(STOCKS.reduce(function (a, s) { return a + s.mcUsd * s.spark[i] / s.spark[0]; }, 0));
    }
    var totalMc = STOCKS.reduce(function (a, s) { return a + s.mcUsd; }, 0);
    var totalVol = STOCKS.reduce(function (a, s) { return a + s.volUsd; }, 0);
    var wchg = STOCKS.reduce(function (a, s) { return a + s.mcUsd * s.chg; }, 0) / totalMc;

    $('#snap-kv').innerHTML =
      '<div><dt>Market cap</dt><dd>$' + big(totalMc) + ' <small class="' + cls(wchg) + '">' + pct(wchg) + '</small></dd></div>' +
      '<div><dt>Volume</dt><dd>$' + big(totalVol) + '</dd></div>' +
      '<div><dt>Stocks</dt><dd>' + STOCKS.length + '</dd></div>';

    var min = Math.min.apply(null, comp), max = Math.max.apply(null, comp), span = max - min || 1;
    var line = comp.map(function (v, k) {
      return (k ? 'L' : 'M') + (k / (n - 1) * 300).toFixed(1) + ' ' + (8 + (1 - (v - min) / span) * 60).toFixed(1);
    }).join('');
    var r = KT.rng(KT.hash('snap-volume')), bars = '';
    for (var b = 0; b < n; b++) {
      var h = 10 + r() * 34;
      bars += '<rect class="snap-bar" x="' + (b * 5 + 0.5).toFixed(1) + '" y="' + (110 - h).toFixed(1) + '" width="3" height="' + h.toFixed(1) + '"/>';
    }
    $('#snap-chart').innerHTML = '<svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true">' + bars +
      '<path class="snap-line ' + (comp[n - 1] >= comp[0] ? '' : 'down') + '" d="' + line + '"/></svg>';

    // Change by market: average day change per market
    var codes = Object.keys(MARKETS);
    var avgs = codes.map(function (c) {
      var list = STOCKS.filter(function (s) { return s.mkt === c; });
      return list.reduce(function (a, s) { return a + s.chg; }, 0) / list.length;
    });
    var adv = STOCKS.filter(function (s) { return s.chg > 0; }).length;
    var dec = STOCKS.filter(function (s) { return s.chg < 0; }).length;
    $('#flow-kv').innerHTML =
      '<div><dt>Advancing</dt><dd class="up">' + adv + '</dd></div>' +
      '<div><dt>Declining</dt><dd class="down">' + dec + '</dd></div>';

    var maxAbs = Math.max.apply(null, avgs.map(Math.abs).concat([1]));
    var barsSvg = avgs.map(function (v, k) {
      var h = Math.abs(v) / maxAbs * 44;
      var y = v >= 0 ? 50 - h : 50;
      return '<rect class="flow-bar ' + cls(v) + '" x="' + ((k + 0.5) * 60 - 14) + '" y="' + y.toFixed(1) + '" width="28" height="' + Math.max(h, 1).toFixed(1) + '" rx="3"/>';
    }).join('');
    $('#flow-chart').innerHTML = '<svg viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Average day change by market"><line class="axis" x1="0" x2="300" y1="50" y2="50"/>' + barsSvg + '</svg>';
    $('#flow-labels').innerHTML = codes.map(function (c, k) {
      return '<span title="' + esc(MARKETS[c].name) + '">' + c + ' <span class="' + cls(avgs[k]) + '">' + pct(avgs[k]) + '</span></span>';
    }).join('');
  }

  // ---------- Filters ----------
  function chip(label, group, value) {
    var on = state[group] === value;
    return '<button class="chip" type="button" data-group="' + group + '" data-value="' + esc(value) + '" aria-pressed="' + on + '">' + esc(label) + '</button>';
  }

  function renderChips() {
    var sectors = Array.from(new Set(STOCKS.map(function (s) { return s.sector; }))).sort();
    var html = chip('All', 'market', 'all');
    Object.keys(MARKETS).forEach(function (c) { html += chip(MARKETS[c].name, 'market', c); });
    html += '<span class="chip-sep" aria-hidden="true"></span>';
    html += chip('All sectors', 'sector', 'all');
    sectors.forEach(function (s) { html += chip(s, 'sector', s); });
    html += '<span class="result-count" id="count" aria-live="polite"></span>';
    $('#chips').innerHTML = html;
  }

  // ---------- Table ----------
  var sortValue = {
    name: function (s) { return s.name.toLowerCase(); },
    price: function (s) { return toUsd(s.price, s.ccy); },
    chg: function (s) { return s.chg; },
    mc: function (s) { return s.mcUsd; }
  };

  function visible() {
    var q = state.q.toLowerCase();
    var list = STOCKS.filter(function (s) {
      if (state.tab === 'favs' && !favs.has(s.sym)) return false;
      if (state.market !== 'all' && s.mkt !== state.market) return false;
      if (state.sector !== 'all' && s.sector !== state.sector) return false;
      if (q && (s.sym + ' ' + s.name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var get = sortValue[state.sort];
    list.sort(function (a, b) {
      var x = get(a), y = get(b);
      return (x < y ? -1 : x > y ? 1 : 0) * state.dir;
    });
    return list;
  }

  var starSvg = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>';

  function row(s) {
    var pos = s.hi === s.lo ? 50 : (s.price - s.lo) / (s.hi - s.lo) * 100;
    var d = KT.DEC[s.ccy];
    var on = favs.has(s.sym);
    return '<tr data-href="' + href(s) + '">' +
      '<td><div class="c-name">' +
        '<button class="star" type="button" data-sym="' + esc(s.sym) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove ' : 'Add ') + esc(s.sym) + (on ? ' from' : ' to') + ' favorites">' + starSvg + '</button>' +
        '<a class="asset" href="' + href(s) + '">' + avatar(s, 36) + '<span><b>' + esc(s.sym) + '</b><small>' + esc(s.name) + '</small></span></a>' +
      '</div></td>' +
      '<td class="num">' + money(s.price, s.ccy) + '</td>' +
      '<td class="num ' + cls(s.chg) + '">' + pct(s.chg) + '</td>' +
      '<td class="c-spark">' + spark(s.spark, 100, 32) + '</td>' +
      '<td class="c-range"><div class="range"><div class="range-bar"><i style="inset-inline-start:' + pos.toFixed(1) + '%"></i></div>' +
        '<div class="range-vals"><span>' + KT.num(s.lo, d) + '</span><span>' + KT.num(s.hi, d) + '</span></div></div></td>' +
      '<td class="num c-mc">$' + big(s.mcUsd) + '</td>' +
      '<td class="c-act"><a href="' + href(s) + '#trade">Trade</a><span class="sep"></span><a href="' + href(s) + '">Details</a></td>' +
      '</tr>';
  }

  function renderTable() {
    var list = visible();
    var body = list.length
      ? list.map(row).join('')
      : '<tr><td colspan="7" class="empty">' +
          (state.tab === 'favs' && !favs.size ? 'Star a stock to see it here.' : 'No stocks match your filters.') +
        '</td></tr>';
    $('#rows').innerHTML = body;
    var count = $('#count');
    if (count) count.textContent = list.length + (list.length === 1 ? ' stock' : ' stocks');

    document.querySelectorAll('.mk th[data-key]').forEach(function (th) {
      th.setAttribute('aria-sort', th.dataset.key === state.sort ? (state.dir > 0 ? 'ascending' : 'descending') : 'none');
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.setAttribute('aria-selected', String(t.dataset.tab === state.tab));
    });
  }

  // ---------- Events ----------
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    state[b.dataset.group] = b.dataset.value;
    renderChips();
    renderTable();
  });

  document.querySelector('.tabs-row').addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (!t) return;
    state.tab = t.dataset.tab;
    renderTable();
  });

  document.querySelector('table.mk').addEventListener('click', function (e) {
    var sortBtn = e.target.closest('.sort');
    if (sortBtn) {
      var key = sortBtn.dataset.sort;
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
      renderTable();
      return;
    }
    var star = e.target.closest('.star');
    if (star) {
      var sym = star.dataset.sym;
      if (favs.has(sym)) favs.delete(sym); else favs.add(sym);
      saveFavs();
      renderTable();
      return;
    }
    if (e.target.closest('a')) return;
    var tr = e.target.closest('tr[data-href]');
    if (tr) location.href = tr.dataset.href;
  });

  var search = $('#q');
  search.value = state.q;
  search.addEventListener('input', function () { state.q = search.value.trim(); renderTable(); });
  document.querySelector('form.search').addEventListener('submit', function (e) { e.preventDefault(); });

  renderCards();
  renderChips();
  renderTable();
})();
