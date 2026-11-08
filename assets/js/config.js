/* ==========================================================================
   Safu Traders — application configuration
   --------------------------------------------------------------------------
   Single place to change app-wide settings. Everything else reads from here.
   ========================================================================== */
window.APP_CONFIG = {
  APP_NAME: 'Safu Traders',
  APP_TAGLINE: 'Trade, stake and predict crypto — all in one place.',

  /* ---------------------------------------------------------------------
     SOLE ADMIN ACCOUNT
     The admin panel (admin.html) is locked to this exact email address.
     Change this one line to your own Gmail address.
     --------------------------------------------------------------------- */
  ADMIN_EMAIL: 'joshuajoshfrosh@gmail.com',

  CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',

  /* localStorage key holding the whole mock database.
     Bumped to v2: this wipes every previously signed-up account (including
     the owner's) so the platform starts from a clean slate. */
  STORAGE_KEY: 'safu_state_v2',

  /* Demo mode: seed data is created on first load */
  DEMO_MODE: true,

  /* Minimum deposit / withdrawal amounts */
  MIN_DEPOSIT: 10,
  MIN_WITHDRAWAL: 20,

  /* ---------------------------------------------------------------------
     BONUS TASK REQUIREMENTS
     A bonus can only be claimed once every task listed in its `requires`
     array is complete. Admins pick the required tasks per bonus.
     --------------------------------------------------------------------- */
  TASKS: [
    { id: 'verify',  label: 'Verify your account',      hint: 'Submit KYC and get it approved' },
    { id: 'profile', label: 'Complete your profile',     hint: 'Add your full name and phone number' },
    { id: 'deposit', label: 'Make a deposit',            hint: 'Request a deposit and have it approved' },
    { id: 'trade',   label: 'Place a trade',             hint: 'Buy or sell any asset' },
    { id: 'stake',   label: 'Open a staking position',   hint: 'Stake into any active plan' },
    { id: 'predict', label: 'Play a prediction round',   hint: 'Call up or down on a live round' }
  ],

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
