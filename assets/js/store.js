/* ==========================================================================
   Nexa — mock data layer
   --------------------------------------------------------------------------
   A single, self-contained "backend" implemented on top of localStorage.
   Every page talks to this module only, so swapping in a real API later
   means re-implementing these functions against HTTP endpoints — the UI
   never touches storage directly.

   Design notes
   ------------
   * All state lives in one JSON blob under APP_CONFIG.STORAGE_KEY.
   * Every admin mutation first pushes a full snapshot onto an undo stack,
     so "Undo" restores the exact previous state (works for any action).
   * Passwords are hashed with a trivial non-cryptographic hash. This is a
     DEMO ONLY — a real backend must use bcrypt/argon2 server-side.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.APP_CONFIG;
  var KEY = CFG.STORAGE_KEY;
  var MAX_UNDO = 60;

  /* ---------------------------------------------------------------- utils */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function now() { return new Date().toISOString(); }
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(36);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* Deterministic pseudo-random walk so charts look stable per symbol */
  function seededSeries(seed, points, start) {
    var s = 0;
    for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 100000;
    var out = [];
    var v = start;
    for (var p = 0; p < points; p++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      var r = (s / 2147483648) - 0.5;
      v = Math.max(start * 0.55, v * (1 + r * 0.035));
      out.push(+v.toFixed(2));
    }
    return out;
  }

  /* ------------------------------------------------------------- seed data */
  var SEED_MARKETS = [
    { symbol: 'BTC', name: 'Bitcoin', price: 68420.5, change24h: 2.41 },
    { symbol: 'ETH', name: 'Ethereum', price: 3542.18, change24h: 1.87 },
    { symbol: 'SOL', name: 'Solana', price: 172.44, change24h: -1.24 },
    { symbol: 'BNB', name: 'BNB', price: 598.72, change24h: 0.63 },
    { symbol: 'XRP', name: 'XRP', price: 0.6124, change24h: 4.12 },
    { symbol: 'ADA', name: 'Cardano', price: 0.4482, change24h: -2.05 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.1583, change24h: 6.74 },
    { symbol: 'AVAX', name: 'Avalanche', price: 36.91, change24h: -0.88 },
    { symbol: 'LINK', name: 'Chainlink', price: 17.24, change24h: 3.19 },
    { symbol: 'MATIC', name: 'Polygon', price: 0.7215, change24h: -1.63 },
    { symbol: 'DOT', name: 'Polkadot', price: 7.18, change24h: 1.02 },
    { symbol: 'ATOM', name: 'Cosmos', price: 9.44, change24h: -0.41 }
  ];

  function buildSeed() {
    var markets = SEED_MARKETS.map(function (m) {
      return {
        symbol: m.symbol,
        name: m.name,
        price: m.price,
        change24h: m.change24h,
        series: seededSeries(m.symbol, 60, m.price)
      };
    });

    var admin = {
      id: 'usr_admin',
      name: 'Joshua (Admin)',
      email: CFG.ADMIN_EMAIL,
      phone: '',
      country: 'United States',
      passwordHash: hash('admin1234'),
      balance: 0,
      kycStatus: 'approved',
      role: 'admin',
      status: 'active',
      createdAt: now()
    };

    var demo = {
      id: 'usr_demo',
      name: 'Demo Trader',
      email: 'demo@nexa.app',
      phone: '+1 555 0100',
      country: 'United States',
      passwordHash: hash('demo1234'),
      balance: 12500,
      kycStatus: 'pending',
      role: 'user',
      status: 'active',
      createdAt: now()
    };

    var plans = [
      { id: 'plan_btc30', name: 'Bitcoin Flexible', symbol: 'BTC', apy: 4.5, days: 30, min: 50, max: 100000, active: true },
      { id: 'plan_eth60', name: 'Ethereum Growth', symbol: 'ETH', apy: 6.2, days: 60, min: 100, max: 100000, active: true },
      { id: 'plan_sol90', name: 'Solana Boost', symbol: 'SOL', apy: 9.8, days: 90, min: 100, max: 50000, active: true },
      { id: 'plan_usdt180', name: 'Stablecoin Vault', symbol: 'USDT', apy: 12.5, days: 180, min: 250, max: 250000, active: true }
    ];

    var bonuses = [
      { id: 'bon_welcome', title: 'Welcome Bonus', description: 'New here? Grab a head start on your first trade.', amount: 25, type: 'credit', wager: 1, code: 'WELCOME25', active: true },
      { id: 'bon_deposit', title: 'First Deposit Match', description: 'Get 10% extra on your first approved deposit, up to $100.', amount: 100, type: 'credit', wager: 3, code: 'DEPOSIT10', active: true },
      { id: 'bon_stake', title: 'Staking Kickstart', description: 'Bonus credit when you open your first staking position.', amount: 15, type: 'credit', wager: 0, code: 'STAKE15', active: true },
      { id: 'bon_weekend', title: 'Weekend Prediction Boost', description: 'Extra balance for prediction markets this weekend.', amount: 10, type: 'credit', wager: 2, code: 'WEEKEND10', active: false }
    ];

    var rounds = [
      { id: 'rnd_btc_1', symbol: 'BTC', round: 1041, startPrice: 68100, endPrice: 68420.5, status: 'open', opensAt: now(), closesAt: new Date(Date.now() + 15 * 60000).toISOString() },
      { id: 'rnd_eth_1', symbol: 'ETH', round: 872, startPrice: 3510, endPrice: 3542.18, status: 'open', opensAt: now(), closesAt: new Date(Date.now() + 15 * 60000).toISOString() },
      { id: 'rnd_sol_1', symbol: 'SOL', round: 613, startPrice: 175.2, endPrice: 172.44, status: 'closed', opensAt: now(), closesAt: now() }
    ];

    var txs = [
      { id: 'tx_1', userId: 'usr_demo', type: 'deposit', asset: 'USDT', network: 'TRC-20', amount: 5000, address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', status: 'approved', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), note: 'Seed deposit' },
      { id: 'tx_2', userId: 'usr_demo', type: 'withdrawal', asset: 'BTC', network: 'Bitcoin', amount: 0.05, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', status: 'pending', createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), note: '' },
      { id: 'tx_3', userId: 'usr_demo', type: 'deposit', asset: 'ETH', network: 'ERC-20', amount: 1.2, address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', status: 'pending', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), note: '' }
    ];

    var kyc = [
      { id: 'kyc_1', userId: 'usr_demo', fullName: 'Demo Trader', dob: '1994-05-12', country: 'United States', docType: 'passport', docNumber: 'X1234567', status: 'pending', submittedAt: new Date(Date.now() - 7200000).toISOString(), reviewedAt: null, note: '' }
    ];

    return {
      version: 1,
      users: [admin, demo],
      session: null,
      markets: markets,
      orders: [],
      stakes: [],
      stakingPlans: plans,
      predictions: [],
      predictionRounds: rounds,
      bonuses: bonuses,
      claims: [],
      transactions: txs,
      kyc: kyc,
      auditLog: [],
      undoStack: []
    };
  }

  /* ------------------------------------------------------------ persistence */
  var state = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state || !state.users) throw new Error('bad state');
        return;
      }
    } catch (e) { /* fall through to seed */ }
    state = buildSeed();
    persist();
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Nexa: could not persist state', e); }
  }

  function get() { if (!state) load(); return state; }

  /* Snapshot before an admin mutation so it can be undone */
  function snapshot(label) {
    var s = get();
    s.undoStack.push({ id: uid('undo'), label: label, at: now(), state: clone({
      users: s.users, markets: s.markets, orders: s.orders, stakes: s.stakes,
      stakingPlans: s.stakingPlans, predictions: s.predictions,
      predictionRounds: s.predictionRounds, bonuses: s.bonuses, claims: s.claims,
      transactions: s.transactions, kyc: s.kyc, auditLog: s.auditLog
    }) });
    if (s.undoStack.length > MAX_UNDO) s.undoStack.shift();
  }

  function log(action, detail) {
    var s = get();
    s.auditLog.unshift({ id: uid('log'), action: action, detail: detail || '', at: now(), by: (s.session && s.session.email) || 'system' });
    if (s.auditLog.length > 200) s.auditLog.length = 200;
  }

  /* --------------------------------------------------------------- session */
  function currentUser() {
    var s = get();
    if (!s.session) return null;
    return s.users.find(function (u) { return u.id === s.session.userId; }) || null;
  }
  function isAdmin() {
    var u = currentUser();
    return !!u && u.email.toLowerCase() === CFG.ADMIN_EMAIL.toLowerCase();
  }
  function login(email, password) {
    var s = get();
    var u = s.users.find(function (x) { return x.email.toLowerCase() === String(email).toLowerCase().trim(); });
    if (!u) return { ok: false, error: 'No account found with that email.' };
    if (u.passwordHash !== hash(password)) return { ok: false, error: 'Incorrect password.' };
    if (u.status === 'suspended') return { ok: false, error: 'This account is suspended. Contact support.' };
    s.session = { userId: u.id, email: u.email };
    persist();
    return { ok: true, user: u };
  }
  function signup(data) {
    var s = get();
    var email = String(data.email || '').toLowerCase().trim();
    if (!email) return { ok: false, error: 'Email is required.' };
    if (s.users.some(function (x) { return x.email.toLowerCase() === email; })) {
      return { ok: false, error: 'An account with that email already exists.' };
    }
    var u = {
      id: uid('usr'),
      name: data.name || email.split('@')[0],
      email: email,
      phone: data.phone || '',
      country: data.country || '',
      passwordHash: hash(data.password || ''),
      balance: 0,
      kycStatus: 'unverified',
      role: 'user',
      status: 'active',
      createdAt: now()
    };
    s.users.push(u);
    s.session = { userId: u.id, email: u.email };
    log('signup', u.email);
    persist();
    return { ok: true, user: u };
  }
  function logout() { var s = get(); s.session = null; persist(); }

  /* --------------------------------------------------------------- markets */
  function markets() { return get().markets; }
  function market(symbol) {
    return get().markets.find(function (m) { return m.symbol === symbol; }) || null;
  }

  /* ---------------------------------------------------------------- trading */
  function buy(symbol, usdAmount) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var m = market(symbol);
    if (!m) return { ok: false, error: 'Unknown market.' };
    var amt = Number(usdAmount);
    if (!(amt > 0)) return { ok: false, error: 'Enter an amount greater than zero.' };
    if (amt > u.balance) return { ok: false, error: 'Insufficient balance.' };
    var qty = amt / m.price;
    u.balance = +(u.balance - amt).toFixed(2);
    s.orders.unshift({ id: uid('ord'), userId: u.id, symbol: symbol, side: 'buy', amount: amt, qty: qty, price: m.price, status: 'filled', createdAt: now() });
    log('trade.buy', symbol + ' $' + amt);
    persist();
    return { ok: true, qty: qty, price: m.price };
  }
  function sell(symbol, usdAmount) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var m = market(symbol);
    if (!m) return { ok: false, error: 'Unknown market.' };
    var amt = Number(usdAmount);
    if (!(amt > 0)) return { ok: false, error: 'Enter an amount greater than zero.' };
    var held = holdings(u.id, symbol);
    if (amt > held.value + 0.01) return { ok: false, error: 'You do not hold that much ' + symbol + '.' };
    u.balance = +(u.balance + amt).toFixed(2);
    s.orders.unshift({ id: uid('ord'), userId: u.id, symbol: symbol, side: 'sell', amount: amt, qty: amt / m.price, price: m.price, status: 'filled', createdAt: now() });
    log('trade.sell', symbol + ' $' + amt);
    persist();
    return { ok: true };
  }
  function holdings(userId, symbol) {
    var s = get();
    var qty = 0;
    s.orders.filter(function (o) { return o.userId === userId && o.symbol === symbol; }).forEach(function (o) {
      qty += o.side === 'buy' ? o.qty : -o.qty;
    });
    var m = market(symbol);
    return { qty: qty, value: qty * (m ? m.price : 0) };
  }
  function portfolio(userId) {
    var s = get();
    var map = {};
    s.orders.filter(function (o) { return o.userId === userId; }).forEach(function (o) {
      map[o.symbol] = (map[o.symbol] || 0) + (o.side === 'buy' ? o.qty : -o.qty);
    });
    return Object.keys(map).filter(function (k) { return map[k] > 0.0000001; }).map(function (k) {
      var m = market(k);
      return { symbol: k, qty: map[k], price: m ? m.price : 0, value: map[k] * (m ? m.price : 0) };
    });
  }

  /* ---------------------------------------------------------------- staking */
  function stakingPlans() { return get().stakingPlans.filter(function (p) { return p.active; }); }
  function allStakingPlans() { return get().stakingPlans; }
  function stake(planId, amount) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var p = s.stakingPlans.find(function (x) { return x.id === planId; });
    if (!p) return { ok: false, error: 'Plan not found.' };
    var amt = Number(amount);
    if (!(amt >= p.min)) return { ok: false, error: 'Minimum for this plan is $' + p.min + '.' };
    if (amt > p.max) return { ok: false, error: 'Maximum for this plan is $' + p.max + '.' };
    if (amt > u.balance) return { ok: false, error: 'Insufficient balance.' };
    u.balance = +(u.balance - amt).toFixed(2);
    s.stakes.unshift({ id: uid('stk'), userId: u.id, planId: p.id, planName: p.name, symbol: p.symbol, amount: amt, apy: p.apy, days: p.days, startedAt: now(), status: 'active' });
    log('stake.open', p.name + ' $' + amt);
    persist();
    return { ok: true };
  }
  function unstake(stakeId) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var st = s.stakes.find(function (x) { return x.id === stakeId && x.userId === u.id; });
    if (!st) return { ok: false, error: 'Stake not found.' };
    if (st.status !== 'active') return { ok: false, error: 'This stake is already closed.' };
    var days = (Date.now() - new Date(st.startedAt).getTime()) / 86400000;
    var earned = st.amount * (st.apy / 100) * (days / 365);
    var payout = +(st.amount + earned).toFixed(2);
    u.balance = +(u.balance + payout).toFixed(2);
    st.status = 'closed';
    st.closedAt = now();
    st.payout = payout;
    log('stake.close', st.planName + ' payout $' + payout);
    persist();
    return { ok: true, payout: payout, earned: +earned.toFixed(2) };
  }
  function myStakes(userId) { return get().stakes.filter(function (x) { return x.userId === userId; }); }

  /* ------------------------------------------------------------ predictions */
  function rounds() { return get().predictionRounds; }
  function openRounds() { return get().predictionRounds.filter(function (r) { return r.status === 'open'; }); }
  function placePrediction(roundId, direction, amount) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var r = s.predictionRounds.find(function (x) { return x.id === roundId; });
    if (!r) return { ok: false, error: 'Round not found.' };
    if (r.status !== 'open') return { ok: false, error: 'This round is closed.' };
    var amt = Number(amount);
    if (!(amt > 0)) return { ok: false, error: 'Enter a stake amount.' };
    if (amt > u.balance) return { ok: false, error: 'Insufficient balance.' };
    u.balance = +(u.balance - amt).toFixed(2);
    s.predictions.unshift({ id: uid('prd'), userId: u.id, roundId: r.id, symbol: r.symbol, round: r.round, direction: direction, amount: amt, entryPrice: r.startPrice, exitPrice: null, status: 'open', createdAt: now() });
    log('prediction.place', r.symbol + ' ' + direction + ' $' + amt);
    persist();
    return { ok: true };
  }
  function myPredictions(userId) { return get().predictions.filter(function (x) { return x.userId === userId; }); }

  /* ---------------------------------------------------------------- bonuses */
  function bonuses() { return get().bonuses.filter(function (b) { return b.active; }); }
  function allBonuses() { return get().bonuses; }
  function claimedBonusIds(userId) {
    return get().claims.filter(function (c) { return c.userId === userId; }).map(function (c) { return c.bonusId; });
  }
  function claimBonus(bonusId) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var b = s.bonuses.find(function (x) { return x.id === bonusId; });
    if (!b) return { ok: false, error: 'Bonus not found.' };
    if (!b.active) return { ok: false, error: 'This bonus is not currently available.' };
    if (claimedBonusIds(u.id).indexOf(bonusId) !== -1) return { ok: false, error: 'You have already claimed this bonus.' };
    u.balance = +(u.balance + b.amount).toFixed(2);
    s.claims.unshift({ id: uid('clm'), userId: u.id, bonusId: b.id, title: b.title, amount: b.amount, claimedAt: now() });
    log('bonus.claim', b.title + ' $' + b.amount);
    persist();
    return { ok: true, amount: b.amount };
  }

  /* ------------------------------------------------------- deposits/withdraw */
  function requestDeposit(asset, network, amount, address) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var amt = Number(amount);
    if (!(amt >= CFG.MIN_DEPOSIT)) return { ok: false, error: 'Minimum deposit is $' + CFG.MIN_DEPOSIT + '.' };
    s.transactions.unshift({ id: uid('tx'), userId: u.id, type: 'deposit', asset: asset, network: network, amount: amt, address: address || '', status: 'pending', createdAt: now(), note: '' });
    log('deposit.request', asset + ' ' + amt);
    persist();
    return { ok: true };
  }
  function requestWithdrawal(asset, network, amount, address) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var amt = Number(amount);
    if (!(amt >= CFG.MIN_WITHDRAWAL)) return { ok: false, error: 'Minimum withdrawal is $' + CFG.MIN_WITHDRAWAL + '.' };
    if (amt > u.balance) return { ok: false, error: 'Insufficient balance.' };
    if (!address) return { ok: false, error: 'Enter a destination address.' };
    s.transactions.unshift({ id: uid('tx'), userId: u.id, type: 'withdrawal', asset: asset, network: network, amount: amt, address: address, status: 'pending', createdAt: now(), note: '' });
    log('withdrawal.request', asset + ' ' + amt);
    persist();
    return { ok: true };
  }
  function myTransactions(userId) { return get().transactions.filter(function (x) { return x.userId === userId; }); }
  function allTransactions() { return get().transactions; }

  /* -------------------------------------------------------------------- KYC */
  function myKyc(userId) { return get().kyc.filter(function (k) { return k.userId === userId; })[0] || null; }
  function allKyc() { return get().kyc; }
  function submitKyc(data) {
    var s = get(), u = currentUser();
    if (!u) return { ok: false, error: 'Please sign in.' };
    var existing = myKyc(u.id);
    if (existing && existing.status === 'approved') return { ok: false, error: 'Your identity is already verified.' };
    var rec = {
      id: existing ? existing.id : uid('kyc'),
      userId: u.id,
      fullName: data.fullName,
      dob: data.dob,
      country: data.country,
      docType: data.docType,
      docNumber: data.docNumber,
      status: 'pending',
      submittedAt: now(),
      reviewedAt: null,
      note: ''
    };
    if (existing) { Object.assign(existing, rec); }
    else { s.kyc.unshift(rec); }
    u.kycStatus = 'pending';
    log('kyc.submit', u.email);
    persist();
    return { ok: true };
  }

  /* ------------------------------------------------------------ admin: KYC */
  function reviewKyc(kycId, decision, note) {
    var s = get();
    var k = s.kyc.find(function (x) { return x.id === kycId; });
    if (!k) return { ok: false, error: 'Record not found.' };
    snapshot('KYC ' + decision + ' — ' + k.fullName);
    k.status = decision;
    k.reviewedAt = now();
    k.note = note || '';
    var u = s.users.find(function (x) { return x.id === k.userId; });
    if (u) u.kycStatus = decision;
    log('admin.kyc.' + decision, k.fullName);
    persist();
    return { ok: true };
  }

  /* ------------------------------------------------- admin: transactions */
  function reviewTransaction(txId, decision, note) {
    var s = get();
    var t = s.transactions.find(function (x) { return x.id === txId; });
    if (!t) return { ok: false, error: 'Transaction not found.' };
    if (t.status !== 'pending') return { ok: false, error: 'This request was already reviewed.' };
    snapshot(t.type + ' ' + decision + ' — ' + t.asset + ' ' + t.amount);
    var u = s.users.find(function (x) { return x.id === t.userId; });
    t.status = decision;
    t.reviewedAt = now();
    t.note = note || '';
    if (decision === 'approved' && u) {
      if (t.type === 'deposit') u.balance = +(u.balance + t.amount).toFixed(2);
      if (t.type === 'withdrawal') u.balance = +(u.balance - t.amount).toFixed(2);
    }
    log('admin.tx.' + decision, t.type + ' ' + t.asset + ' ' + t.amount);
    persist();
    return { ok: true };
  }

  /* ------------------------------------------------------ admin: balances */
  function adjustBalance(userId, delta, reason) {
    var s = get();
    var u = s.users.find(function (x) { return x.id === userId; });
    if (!u) return { ok: false, error: 'User not found.' };
    var d = Number(delta);
    if (!d) return { ok: false, error: 'Enter a non-zero amount.' };
    snapshot((d > 0 ? 'Credit ' : 'Debit ') + '$' + Math.abs(d) + ' — ' + u.email);
    u.balance = +(u.balance + d).toFixed(2);
    s.transactions.unshift({ id: uid('tx'), userId: u.id, type: d > 0 ? 'credit' : 'debit', asset: 'USD', network: 'internal', amount: Math.abs(d), address: '', status: 'approved', createdAt: now(), note: reason || 'Admin adjustment' });
    log('admin.balance', (d > 0 ? '+' : '') + d + ' ' + u.email);
    persist();
    return { ok: true };
  }

  /* -------------------------------------------------------- admin: bonuses */
  function saveBonus(data) {
    var s = get();
    snapshot((data.id ? 'Edit' : 'Create') + ' bonus — ' + data.title);
    if (data.id) {
      var b = s.bonuses.find(function (x) { return x.id === data.id; });
      if (!b) return { ok: false, error: 'Bonus not found.' };
      Object.assign(b, data);
    } else {
      s.bonuses.unshift({
        id: uid('bon'), title: data.title, description: data.description || '',
        amount: Number(data.amount) || 0, type: data.type || 'credit',
        wager: Number(data.wager) || 0, code: data.code || '', active: data.active !== false
      });
    }
    log('admin.bonus.save', data.title);
    persist();
    return { ok: true };
  }
  function deleteBonus(id) {
    var s = get();
    var b = s.bonuses.find(function (x) { return x.id === id; });
    if (!b) return { ok: false, error: 'Bonus not found.' };
    snapshot('Delete bonus — ' + b.title);
    s.bonuses = s.bonuses.filter(function (x) { return x.id !== id; });
    log('admin.bonus.delete', b.title);
    persist();
    return { ok: true };
  }
  function toggleBonus(id) {
    var s = get();
    var b = s.bonuses.find(function (x) { return x.id === id; });
    if (!b) return { ok: false, error: 'Bonus not found.' };
    snapshot((b.active ? 'Disable' : 'Enable') + ' bonus — ' + b.title);
    b.active = !b.active;
    log('admin.bonus.toggle', b.title + ' -> ' + b.active);
    persist();
    return { ok: true };
  }

  /* ---------------------------------------------------------- admin: users */
  function allUsers() { return get().users; }
  function setUserStatus(userId, status) {
    var s = get();
    var u = s.users.find(function (x) { return x.id === userId; });
    if (!u) return { ok: false, error: 'User not found.' };
    if (u.email.toLowerCase() === CFG.ADMIN_EMAIL.toLowerCase()) return { ok: false, error: 'You cannot suspend the admin account.' };
    snapshot('Set user ' + status + ' — ' + u.email);
    u.status = status;
    log('admin.user.status', u.email + ' -> ' + status);
    persist();
    return { ok: true };
  }
  function deleteUser(userId) {
    var s = get();
    var u = s.users.find(function (x) { return x.id === userId; });
    if (!u) return { ok: false, error: 'User not found.' };
    if (u.email.toLowerCase() === CFG.ADMIN_EMAIL.toLowerCase()) return { ok: false, error: 'You cannot delete the admin account.' };
    snapshot('Delete user — ' + u.email);
    s.users = s.users.filter(function (x) { return x.id !== userId; });
    log('admin.user.delete', u.email);
    persist();
    return { ok: true };
  }

  /* --------------------------------------------------- admin: staking plans */
  function savePlan(data) {
    var s = get();
    snapshot((data.id ? 'Edit' : 'Create') + ' staking plan — ' + data.name);
    if (data.id) {
      var p = s.stakingPlans.find(function (x) { return x.id === data.id; });
      if (!p) return { ok: false, error: 'Plan not found.' };
      Object.assign(p, data);
    } else {
      s.stakingPlans.unshift({
        id: uid('plan'), name: data.name, symbol: data.symbol, apy: Number(data.apy) || 0,
        days: Number(data.days) || 30, min: Number(data.min) || 0, max: Number(data.max) || 100000,
        active: data.active !== false
      });
    }
    log('admin.plan.save', data.name);
    persist();
    return { ok: true };
  }
  function deletePlan(id) {
    var s = get();
    var p = s.stakingPlans.find(function (x) { return x.id === id; });
    if (!p) return { ok: false, error: 'Plan not found.' };
    snapshot('Delete staking plan — ' + p.name);
    s.stakingPlans = s.stakingPlans.filter(function (x) { return x.id !== id; });
    log('admin.plan.delete', p.name);
    persist();
    return { ok: true };
  }

  /* ---------------------------------------------- admin: prediction rounds */
  function saveRound(data) {
    var s = get();
    snapshot((data.id ? 'Edit' : 'Create') + ' prediction round — ' + data.symbol);
    if (data.id) {
      var r = s.predictionRounds.find(function (x) { return x.id === data.id; });
      if (!r) return { ok: false, error: 'Round not found.' };
      Object.assign(r, data);
    } else {
      s.predictionRounds.unshift({
        id: uid('rnd'), symbol: data.symbol, round: Number(data.round) || 1,
        startPrice: Number(data.startPrice) || 0, endPrice: null,
        status: 'open', opensAt: now(),
        closesAt: data.closesAt || new Date(Date.now() + 15 * 60000).toISOString()
      });
    }
    log('admin.round.save', data.symbol);
    persist();
    return { ok: true };
  }
  function resolveRound(roundId, endPrice) {
    var s = get();
    var r = s.predictionRounds.find(function (x) { return x.id === roundId; });
    if (!r) return { ok: false, error: 'Round not found.' };
    snapshot('Resolve round — ' + r.symbol + ' #' + r.round);
    r.status = 'closed';
    r.endPrice = Number(endPrice);
    var up = r.endPrice >= r.startPrice;
    s.predictions.filter(function (p) { return p.roundId === r.id && p.status === 'open'; }).forEach(function (p) {
      p.exitPrice = r.endPrice;
      var won = (p.direction === 'up') === up;
      p.status = won ? 'won' : 'lost';
      if (won) {
        var u = s.users.find(function (x) { return x.id === p.userId; });
        if (u) u.balance = +(u.balance + p.amount * 2).toFixed(2);
        p.payout = +(p.amount * 2).toFixed(2);
      } else { p.payout = 0; }
    });
    log('admin.round.resolve', r.symbol + ' #' + r.round + ' -> ' + r.endPrice);
    persist();
    return { ok: true };
  }
  function deleteRound(id) {
    var s = get();
    var r = s.predictionRounds.find(function (x) { return x.id === id; });
    if (!r) return { ok: false, error: 'Round not found.' };
    snapshot('Delete round — ' + r.symbol + ' #' + r.round);
    s.predictionRounds = s.predictionRounds.filter(function (x) { return x.id !== id; });
    log('admin.round.delete', r.symbol);
    persist();
    return { ok: true };
  }

  /* ------------------------------------------------------------------ undo */
  function undoStack() { return get().undoStack; }
  function undo() {
    var s = get();
    if (!s.undoStack.length) return { ok: false, error: 'Nothing to undo.' };
    var entry = s.undoStack.pop();
    var snap = entry.state;
    ['users', 'markets', 'orders', 'stakes', 'stakingPlans', 'predictions',
     'predictionRounds', 'bonuses', 'claims', 'transactions', 'kyc', 'auditLog'].forEach(function (k) {
      if (snap[k] !== undefined) s[k] = snap[k];
    });
    log('admin.undo', entry.label);
    persist();
    return { ok: true, label: entry.label };
  }

  /* ------------------------------------------------------------- utilities */
  function reset() {
    localStorage.removeItem(KEY);
    state = null;
    load();
  }

  window.Store = {
    init: load,
    get: get,
    reset: reset,
    uid: uid,
    now: now,
    hash: hash,
    /* session */
    currentUser: currentUser,
    isAdmin: isAdmin,
    login: login,
    signup: signup,
    logout: logout,
    /* markets & trading */
    markets: markets,
    market: market,
    buy: buy,
    sell: sell,
    holdings: holdings,
    portfolio: portfolio,
    /* staking */
    stakingPlans: stakingPlans,
    allStakingPlans: allStakingPlans,
    stake: stake,
    unstake: unstake,
    myStakes: myStakes,
    /* predictions */
    rounds: rounds,
    openRounds: openRounds,
    placePrediction: placePrediction,
    myPredictions: myPredictions,
    /* bonuses */
    bonuses: bonuses,
    allBonuses: allBonuses,
    claimedBonusIds: claimedBonusIds,
    claimBonus: claimBonus,
    /* wallet */
    requestDeposit: requestDeposit,
    requestWithdrawal: requestWithdrawal,
    myTransactions: myTransactions,
    allTransactions: allTransactions,
    /* kyc */
    myKyc: myKyc,
    allKyc: allKyc,
    submitKyc: submitKyc,
    /* admin */
    reviewKyc: reviewKyc,
    reviewTransaction: reviewTransaction,
    adjustBalance: adjustBalance,
    saveBonus: saveBonus,
    deleteBonus: deleteBonus,
    toggleBonus: toggleBonus,
    allUsers: allUsers,
    setUserStatus: setUserStatus,
    deleteUser: deleteUser,
    savePlan: savePlan,
    deletePlan: deletePlan,
    saveRound: saveRound,
    resolveRound: resolveRound,
    deleteRound: deleteRound,
    /* undo & audit */
    undoStack: undoStack,
    undo: undo,
    auditLog: function () { return get().auditLog; }
  };
})();
