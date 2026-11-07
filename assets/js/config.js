/* ==========================================================================
   Nexa — application configuration
   --------------------------------------------------------------------------
   Single place to change app-wide settings. Everything else reads from here.
   ========================================================================== */
window.APP_CONFIG = {
  APP_NAME: 'Nexa',
  APP_TAGLINE: 'Trade, stake and predict crypto — all in one place.',

  /* ---------------------------------------------------------------------
     SOLE ADMIN ACCOUNT
     The admin panel (admin.html) is locked to this exact email address.
     Change this one line to your own Gmail address.
     --------------------------------------------------------------------- */
  ADMIN_EMAIL: 'joshuajoshfrosh@gmail.com',

  CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',

  /* localStorage key holding the whole mock database */
  STORAGE_KEY: 'nexa_state_v1',

  /* Demo mode: seed data is created on first load */
  DEMO_MODE: true,

  /* Minimum deposit / withdrawal amounts */
  MIN_DEPOSIT: 10,
  MIN_WITHDRAWAL: 20,

  /* Supported assets for deposit/withdraw */
  NETWORKS: {
    BTC: ['Bitcoin', 'Lightning'],
    ETH: ['ERC-20', 'Arbitrum', 'Base'],
    USDT: ['TRC-20', 'ERC-20', 'BEP-20'],
    USDC: ['ERC-20', 'Solana'],
    SOL: ['Solana'],
    BNB: ['BEP-20']
  }
};
