/* Screener page */
(function () {
  var STOCKS = KT.STOCKS, MARKETS = KT.MARKETS;
  var money = KT.money, big = KT.big, pct = KT.pct, cls = KT.cls, toUsd = KT.toUsd, series = KT.series;
  var esc = KTUI.esc, avatar = KTUI.avatar, spark = KTUI.spark;

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  // Extra columns are worked out here, so data.js stays untouched
  var ROWS = STOCKS.map(function (s) {
    var w = series(s, '1W'), m = series(s, '1M');
    return { s: s, w1: (s.price / w[0] - 1) * 100, m1: (s.price / m[0] - 1) * 100, trend: m };
  });

  var BANDS = [
    { label: 'Under $10B', min: 0, max: 1e10 },
    { label: '$10B \u2013 $100B', min: 1e10, max: 1e11 },
    { label: '$100B \u2013 $1T', min: 1e11, max: 1e12 },
    { label: '$1T and above', min: 1e12, max: Infinity }
  ];
  var DIVS = [{ label: '2% or more', min: 2 }, { label: '3% or more', min: 3 }, { label: '4% or more', min: 4 }];

  // md = hidden on medium screens, sm = hidden on small screens (see trade.css)
  var COLS = [
    { key: 'name', label: 'Stock', val: function (r) { return r.s.name.toLowerCase(); } },
    { key: 'price', label: 'Price', r: 1, val: function (r) { return toUsd(r.s.price, r.s.ccy); } },
    { key: 'chg', label: '1D', r: 1, val: function (r) { return r.s.chg; } },
    { key: 'w1', label: '1W', r: 1, sm: 1, val: function (r) { return r.w1; } },
    { key: 'm1', label: '1M', r: 1, sm: 1, val: function (r) { return r.m1; } },
    { key: 'vol', label: '1D volume (USD)', r: 1, sm: 1, val: function (r) { return r.s.volUsd; } },
    { key: 'mc', label: 'Market cap (USD)', r: 1, val: function (r) { return r.s.mcUsd; } },
    { key: 'div', label: 'Dividend yield', r: 1, md: 1, val: function (r) { return r.s.div; } },
    { key: 'trend', label: 'Last 30 days', md: 1, nosort: 1 }
  ];
  var PRESETS = {
    trending: { sort: 'vol', dir: -1 },
    top: { sort: 'mc', dir: -1 },
    gainers: { sort: 'chg', dir: -1 },
    losers: { sort: 'chg', dir: 1 }
  };

  var state = {
    tab: 'trending', sort: 'vol', dir: -1,
    markets: new Set(), sectors: new Set(), band: null, div: null,
    q: (new URLSearchParams(location.search).get('q') || '').trim()
  };

  var href = function (s) { return 'asset.html?s=' + encodeURIComponent(s.sym); };
  function colCls(c) { return (c.r ? 'r ' : '') + (c.md ? 'c-md ' : '') + (c.sm ? 'c-sm' : ''); }

  // ---------- Header ----------
  var arrows = '<svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><path d="M5 0l4 5H1zM5 12L1 7h8z"/></svg>';
  $('#sc-head').innerHTML = COLS.map(function (c) {
    return '<th class="' + colCls(c) + '" data-key="' + c.key + '" aria-sort="none">' +
      (c.nosort ? esc(c.label) : '<button class="sort" type="button" data-sort="' + c.key + '">' + esc(c.label) + ' ' + arrows + '</button>') +
      '</th>';
  }).join('');

  // ---------- Filter chips (built once, then only their pressed state changes) ----------
  function fchip(group, value, label) {
    return '<button class="fchip" type="button" data-group="' + group + '" data-value="' + esc(value) +
      '" aria-pressed="false">' + esc(label) + '</button>';
  }
  $('#f-markets').innerHTML = Object.keys(MARKETS).map(function (c) { return fchip('markets', c, MARKETS[c].name); }).join('');
  $('#f-cap').innerHTML = BANDS.map(function (b, i) { return fchip('band', String(i), b.label); }).join('');
  $('#f-sector').innerHTML = Array.from(new Set(STOCKS.map(function (s) { return s.sector; }))).sort()
    .map(function (x) { return fchip('sectors', x, x); }).join('');
  $('#f-div').innerHTML = DIVS.map(function (d, i) { return fchip('div', String(i), d.label); }).join('');

  function activeCount() {
    return state.markets.size + state.sectors.size + (state.band !== null ? 1 : 0) + (state.div !== null ? 1 : 0);
  }

  function syncControls() {
    $$('.fchip').forEach(function (b) {
      var g = b.dataset.group, v = b.dataset.value;
      var on = (g === 'markets' || g === 'sectors') ? state[g].has(v) : state[g] === Number(v);
      b.setAttribute('aria-pressed', String(on));
    });
    $$('.seg-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tab === state.tab)); });
    $$('#sc-head th[data-key]').forEach(function (th) {
      th.setAttribute('aria-sort', th.dataset.key === state.sort ? (state.dir > 0 ? 'ascending' : 'descending') : 'none');
    });
    $('#f-clear').hidden = activeCount() === 0;
  }

  // ---------- Data ----------
  function visible() {
    var q = state.q.toLowerCase();
    var list = ROWS.filter(function (r) {
      var s = r.s;
      if (state.markets.size && !state.markets.has(s.mkt)) return false;
      if (state.sectors.size && !state.sectors.has(s.sector)) return false;
      if (state.band !== null && (s.mcUsd < BANDS[state.band].min || s.mcUsd >= BANDS[state.band].max)) return false;
      if (state.div !== null && s.div < DIVS[state.div].min) return false;
      if (q && (s.sym + ' ' + s.name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var col = COLS.filter(function (c) { return c.key === state.sort; })[0];
    list.sort(function (a, b) {
      var x = col.val(a), y = col.val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * state.dir;
    });
    return list;
  }

  function row(r) {
    var s = r.s;
    return '<tr data-href="' + href(s) + '">' +
      '<td><a class="asset" href="' + href(s) + '">' + avatar(s, 32) +
        '<span><b>' + esc(s.name) + '</b><small>' + esc(s.sym) + ' \u00b7 ' + esc(MARKETS[s.mkt].name) + '</small></span></a></td>' +
      '<td class="r num">' + money(s.price, s.ccy) + '</td>' +
      '<td class="r num ' + cls(s.chg) + '">' + pct(s.chg) + '</td>' +
      '<td class="r num c-sm ' + cls(r.w1) + '">' + pct(r.w1) + '</td>' +
      '<td class="r num c-sm ' + cls(r.m1) + '">' + pct(r.m1) + '</td>' +
      '<td class="r num c-sm">$' + big(s.volUsd) + '</td>' +
      '<td class="r num">$' + big(s.mcUsd) + '</td>' +
      '<td class="r num c-md">' + s.div.toFixed(2) + '%</td>' +
      '<td class="c-md">' + spark(r.trend, 90, 28) + '</td>' +
      '</tr>';
  }

  function render() {
    var list = visible();
    $('#rows').innerHTML = list.length
      ? list.map(row).join('')
      : '<tr><td colspan="' + COLS.length + '" class="empty">No stocks match these filters.<br>' +
          '<button class="btn" id="empty-clear" type="button">Clear filters</button></td></tr>';
    $('#count').textContent = list.length + (list.length === 1 ? ' stock' : ' stocks');
    syncControls();
  }

  function clearAll() {
    state.markets.clear(); state.sectors.clear(); state.band = null; state.div = null;
    render();
  }

  // ---------- Events ----------
  $('#filters').addEventListener('click', function (e) {
    var b = e.target.closest('.fchip');
    if (b) {
      var g = b.dataset.group, v = b.dataset.value;
      if (g === 'markets' || g === 'sectors') {
        if (state[g].has(v)) state[g].delete(v); else state[g].add(v);
      } else {
        state[g] = state[g] === Number(v) ? null : Number(v);
      }
      render();
      return;
    }
    if (e.target.closest('#f-clear')) clearAll();
  });

  $('#seg').addEventListener('click', function (e) {
    var b = e.target.closest('.seg-btn');
    if (!b) return;
    state.tab = b.dataset.tab;
    state.sort = PRESETS[state.tab].sort;
    state.dir = PRESETS[state.tab].dir;
    render();
  });

  $('#sc-table').addEventListener('click', function (e) {
    var sortBtn = e.target.closest('.sort');
    if (sortBtn) {
      var key = sortBtn.dataset.sort;
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
      // A custom sort no longer matches a preset tab
      var preset = PRESETS[state.tab];
      if (!preset || preset.sort !== state.sort || preset.dir !== state.dir) state.tab = null;
      render();
      return;
    }
    if (e.target.closest('#empty-clear')) { clearAll(); return; }
    if (e.target.closest('a')) return;
    var tr = e.target.closest('tr[data-href]');
    if (tr) location.href = tr.dataset.href;
  });

  $('#dens').addEventListener('click', function (e) {
    var b = e.target.closest('[data-dens]');
    if (!b) return;
    $('#sc-table').classList.toggle('dense', b.dataset.dens === 'compact');
    $$('#dens [data-dens]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  });

  var shell = $('#screener'), collapse = $('#collapse');
  function setCollapsed(on) {
    shell.classList.toggle('is-collapsed', on);
    collapse.setAttribute('aria-expanded', String(!on));
    collapse.setAttribute('aria-label', on ? 'Show filters' : 'Hide filters');
  }
  collapse.addEventListener('click', function () { setCollapsed(!shell.classList.contains('is-collapsed')); });
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) setCollapsed(true);

  var search = $('#q');
  search.value = state.q;
  search.addEventListener('input', function () { state.q = search.value.trim(); render(); });
  $('form.search').addEventListener('submit', function (e) { e.preventDefault(); });

  render();
})();
