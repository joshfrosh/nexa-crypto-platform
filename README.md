# Safu Traders — Crypto Trading, Staking & Prediction Platform

A polished, multi-page front-end crypto platform: spot trading, staking vaults,
up/down price predictions, task-gated bonuses, a wallet with admin-approved
deposits and withdrawals, KYC verification, and a restricted admin panel.

Everything runs client-side on a **mock data layer** (`localStorage`), so every
flow is clickable and demonstrable. The code is structured so a real backend can
be dropped in later without touching the UI.

---

## Pages

| Page | File | What it does |
|------|------|--------------|
| Home | `index.html` | Landing page — hero, product grid, how it works, security, FAQ |
| Trade & Buy | `trade.html` | Market list, price chart, buy/sell forms, holdings |
| Staking | `staking.html` | Staking plans with APY, stake / unstake |
| Predictions | `predictions.html` | Up/down rounds with countdown and results |
| Bonuses & Tasks | `bonuses.html` | Task centre + task-gated bonus offers |
| Wallet | `wallet.html` | Deposit / withdraw requests, transaction history |
| KYC | `kyc.html` | Identity verification submission |
| Sign in / Sign up | `auth.html` | Email, phone (full country-code list), Gmail, iCloud |
| Admin panel | `admin.html` | Restricted to the sole admin account |

---

## Admin account

The admin panel is locked to **one** email address, set in
`assets/js/config.js`:

```js
ADMIN_EMAIL: 'joshuajoshfrosh@gmail.com'
```

- Signing up (or signing in) with that address grants the **Admin** link in the
  navigation and full access to `admin.html`.
- Every other account is a normal user and is redirected away from the panel.
- To change the owner, edit that one line.

### Admin capabilities

- Approve / reject **KYC** submissions
- Approve / reject **deposits** and **withdrawals** (approving a deposit credits
  the balance; approving a withdrawal debits it)
- **Credit / debit** any user balance with a reason
- Create, edit, enable/disable and delete **bonuses** — including which **tasks**
  a user must complete before claiming
- Manage **users** (suspend, activate, delete)
- Manage **staking plans** and **prediction rounds** (create, edit, resolve, delete)
- **Undo** the last action (every mutation pushes a snapshot)
- Full **audit log**

---

## Bonuses are task-gated

A bonus can only be claimed once every task attached to it is complete. Tasks are
derived live from real activity:

| Task | Completed when |
|------|----------------|
| Verify your account | KYC is approved |
| Complete your profile | Name and phone are set |
| Make a deposit | A deposit request was approved |
| Place a trade | Any buy or sell order exists |
| Open a staking position | Any stake exists |
| Play a prediction round | Any prediction exists |

Admins choose the required tasks per bonus in the admin panel.

---

## Sign-in

- **Email + password** — standard sign in / sign up.
- **Phone** — full international dialling-code selector (200 countries).
- **Gmail / iCloud** — opens a prompt asking for the account address and
  password, then signs in to that exact account (creating it on first use).
  It never logs anyone in silently.

---

## Running locally

No build step, no dependencies. Any static server works:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

> Opening `index.html` directly via `file://` also works, but a local server is
> recommended so `localStorage` behaves consistently.

---

## Project structure

```
.
├── index.html            # Home
├── trade.html            # Trade & Buy
├── staking.html          # Staking
├── predictions.html      # Predictions
├── bonuses.html          # Bonuses & Tasks
├── wallet.html           # Wallet
├── kyc.html              # KYC verification
├── auth.html             # Sign in / Sign up
├── admin.html            # Admin panel (restricted)
├── README.md
└── assets/
    ├── css/styles.css    # Design system (dark crypto/fintech theme)
    └── js/
        ├── config.js     # App config, admin email, task definitions
        ├── countries.js  # Full international dialling codes
        ├── store.js      # Mock data layer (the "backend")
        └── app.js        # Shared UI shell: nav, guards, toasts, charts
```

### Swapping in a real backend

The UI only ever calls `window.Store.*`. To go live, re-implement those functions
in `store.js` against HTTP endpoints — no page code needs to change.

---

## Data & privacy

All data lives in the browser's `localStorage` under `safu_state_v2`. Nothing is
sent to a server. Clearing site data resets the app to a clean slate.

---

## Production checklist

This is a front-end demo. To make it production-ready you would need:

- A real backend API and database (users, balances, orders, transactions)
- Real authentication with server-side password hashing (bcrypt/argon2)
- Real OAuth for Gmail and iCloud (Apple Sign In)
- An SMS provider for phone verification (Twilio, etc.)
- A KYC provider (Onfido, Sumsub, Persona)
- A crypto payment/custody gateway for real deposits and withdrawals
- Server-side authorization for the admin panel (never trust the client)
- Rate limiting, audit trails, 2FA, and security hardening
- Legal and regulatory compliance (licensing, AML/KYC, terms, privacy policy)

---

**Disclaimer:** This is a demonstration application built with mock data. No real
funds, assets or personal data are processed. Nothing here constitutes
investment advice.
