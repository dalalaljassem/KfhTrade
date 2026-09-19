/* ==========================================================
   KFH Trade — demo market data
   Everything here is GENERATED for the prototype. Prices, volumes,
   market caps and charts are illustrative, not live quotes.
   When the real feed exists, replace RAW + series() with API calls;
   the pages only read the fields on each stock object.
   ========================================================== */
(function () {
  // Illustrative rates: how many USD one unit of currency buys
  var FX = { KWD: 3.25, SAR: 0.2667, AED: 0.2723, QAR: 0.2747, USD: 1 };
  var DEC = { KWD: 3, SAR: 2, AED: 2, QAR: 2, USD: 2 };

  var MARKETS = {
    KW: { name: 'Kuwait', ccy: 'KWD' },
    SA: { name: 'Saudi Arabia', ccy: 'SAR' },
    AE: { name: 'UAE', ccy: 'AED' },
    QA: { name: 'Qatar', ccy: 'QAR' },
    US: { name: 'United States', ccy: 'USD' }
  };

  // [symbol, name, market, sector, price (local), market cap (bn, local), exchange]
  var RAW = [
    ['KFH', 'Kuwait Finance House', 'KW', 'Banking', 0.78, 13, 'Boursa Kuwait'],
    ['NBK', 'National Bank of Kuwait', 'KW', 'Banking', 0.98, 8.8, 'Boursa Kuwait'],
    ['ZAIN', 'Zain Group', 'KW', 'Telecom', 0.55, 2.4, 'Boursa Kuwait'],
    ['BOUBYAN', 'Boubyan Bank', 'KW', 'Banking', 0.68, 2.7, 'Boursa Kuwait'],
    ['MABANEE', 'Mabanee Company', 'KW', 'Real estate', 0.9, 1.2, 'Boursa Kuwait'],

    ['2222', 'Saudi Aramco', 'SA', 'Energy', 27.5, 6600, 'Tadawul'],
    ['1120', 'Al Rajhi Bank', 'SA', 'Banking', 95, 380, 'Tadawul'],
    ['7010', 'stc', 'SA', 'Telecom', 42, 210, 'Tadawul'],
    ['2010', 'SABIC', 'SA', 'Materials', 55, 165, 'Tadawul'],
    ['1180', 'Saudi National Bank', 'SA', 'Banking', 36, 215, 'Tadawul'],

    ['EMAAR', 'Emaar Properties', 'AE', 'Real estate', 14, 125, 'DFM'],
    ['FAB', 'First Abu Dhabi Bank', 'AE', 'Banking', 15, 165, 'ADX'],
    ['ADNOCDIST', 'ADNOC Distribution', 'AE', 'Energy', 3.6, 45, 'ADX'],
    ['EAND', 'e& (Etisalat)', 'AE', 'Telecom', 17, 150, 'ADX'],
    ['DEWA', 'Dubai Electricity & Water Authority', 'AE', 'Utilities', 2.7, 135, 'DFM'],

    ['QNBK', 'Qatar National Bank', 'QA', 'Banking', 17, 160, 'Qatar Stock Exchange'],
    ['IQCD', 'Industries Qatar', 'QA', 'Materials', 12.5, 75, 'Qatar Stock Exchange'],
    ['ORDS', 'Ooredoo', 'QA', 'Telecom', 12, 38, 'Qatar Stock Exchange'],
    ['QIBK', 'Qatar Islamic Bank', 'QA', 'Banking', 21, 50, 'Qatar Stock Exchange'],

    ['AAPL', 'Apple', 'US', 'Technology', 230, 3500, 'Nasdaq'],
    ['MSFT', 'Microsoft', 'US', 'Technology', 480, 3570, 'Nasdaq'],
    ['NVDA', 'NVIDIA', 'US', 'Technology', 140, 3400, 'Nasdaq'],
    ['AMZN', 'Amazon', 'US', 'Consumer', 220, 2300, 'Nasdaq'],
    ['TSLA', 'Tesla', 'US', 'Consumer', 300, 950, 'Nasdaq'],
    ['XOM', 'Exxon Mobil', 'US', 'Energy', 110, 480, 'NYSE']
  ];

  // Timeframes: points per series, step volatility, and the size of the drift
  var TFS = ['1D', '1W', '1M', '3M', '1Y', '5Y'];
  var TF = {
    '1D': { n: 60, vol: 0.0025 },
    '1W': { n: 70, vol: 0.005, drift: 0.04 },
    '1M': { n: 60, vol: 0.009, drift: 0.08 },
    '3M': { n: 90, vol: 0.012, drift: 0.15 },
    '1Y': { n: 120, vol: 0.02, drift: 0.35 },
    '5Y': { n: 150, vol: 0.02, drift: 1.0 }
  };

  // Small seeded PRNG so the demo numbers are stable between page loads
  function hash(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Random walk pinned to `start` at the first point and `end` at the last
  function walk(key, n, start, end, vol) {
    var r = rng(hash(key));
    var p = [0], i;
    for (i = 1; i < n; i++) p.push(p[i - 1] + (r() - 0.5) * 2 * vol);
    var last = p[n - 1], out = [];
    for (i = 0; i < n; i++) {
      var t = i / (n - 1);
      var v = start + (end - start) * t + (p[i] - last * t) * start;
      out.push(Math.max(v, start * 0.05));
    }
    out[n - 1] = end;
    return out;
  }

  function series(s, tf) {
    if (s._c[tf]) return s._c[tf];
    var cfg = TF[tf], start;
    if (tf === '1D') {
      start = s.prev;
    } else {
      var r = rng(hash(s.sym + '|drift|' + tf));
      start = s.price / (1 + cfg.drift * (r() - 0.45));
    }
    s._c[tf] = walk(s.sym + '|' + tf, cfg.n, start, s.price, cfg.vol);
    return s._c[tf];
  }

  var STOCKS = RAW.map(function (row) {
    var r = rng(hash(row[0]));
    var s = {
      sym: row[0], name: row[1], mkt: row[2], sector: row[3],
      price: row[4], mc: row[5], ex: row[6],
      ccy: MARKETS[row[2]].ccy, _c: {}
    };
    s.chg = +((r() - 0.5) * 5).toFixed(2);
    s.prev = s.price / (1 + s.chg / 100);
    s.spark = series(s, '1D');
    s.lo = Math.min.apply(null, s.spark);
    s.hi = Math.max.apply(null, s.spark);
    var y = series(s, '1Y');
    s.y52lo = Math.min.apply(null, y);
    s.y52hi = Math.max.apply(null, y);
    s.vol = (s.mc * 1e9 / s.price) * (0.0008 + r() * 0.004);
    s.div = +(0.3 + r() * 5).toFixed(2);
    s.mcUsd = s.mc * 1e9 * FX[s.ccy];
    s.volUsd = s.vol * s.price * FX[s.ccy];
    return s;
  });

  function num(v, d) {
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  window.KT = {
    STOCKS: STOCKS, MARKETS: MARKETS, FX: FX, DEC: DEC, TFS: TFS,
    series: series, rng: rng, hash: hash, num: num,
    money: function (v, ccy) { return ccy + ' ' + num(v, DEC[ccy]); },
    big: function (v) {
      var a = Math.abs(v);
      if (a >= 1e12) return num(v / 1e12, 2) + 'T';
      if (a >= 1e9) return num(v / 1e9, 2) + 'B';
      if (a >= 1e6) return num(v / 1e6, 2) + 'M';
      if (a >= 1e3) return num(v / 1e3, 1) + 'K';
      return num(v, 0);
    },
    pct: function (v) {
      return (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v).toFixed(2) + '%';
    },
    cls: function (v) { return v > 0 ? 'up' : v < 0 ? 'down' : 'flat'; },
    conv: function (v, from, to) { return v * FX[from] / FX[to]; },
    toUsd: function (v, ccy) { return v * FX[ccy]; }
  };
})();
