# Nexa — Crypto Trading, Staking & Prediction Platform

A multi-page crypto platform front-end: spot trading, staking vaults, up/down price
predictions, bonuses, a wallet with admin-approved deposits and withdrawals, KYC
verification, multi-method authentication, and a restricted admin panel.

Built with **plain HTML, CSS and JavaScript** — no build step, no dependencies, no
framework. All state lives in a mock data layer on top of `localStorage`, so every
flow is clickable and demonstrable. The data layer is isolated behind a single
module so a real backend can be dropped in later without touching the UI.

---

## Quick start

Because the app uses `localStorage` and relative asset paths, serve it over HTTP
(opening `index.html` via `file://` works in most browsers, but a local server is
more reliable):

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static host works too — GitHub Pages, Netlify, Vercel, S3, nginx.

---

## Demo accounts

| Role  | Email                        | Password    | Notes                          |
|-------|------------------------------|-------------|--------------------------------|
| Admin | `joshuajoshfrosh@gmail.com`  | `admin1234` | **Sole admin** — sees the panel |
| User  | `demo@nexa.app`              | `demo1234`  | Pre-funded with $12,500        |

The admin panel is locked to the email in `assets/js/config.js` → `ADMIN_EMAIL`.
Change that one line to move admin access to a different account.

> Passwords are hashed with a trivial non-cryptographic function for demo purposes
> only. A production build must hash server-side with bcrypt/argon2.

---

## Pages

| File | Page | What it does |
|------|------|--------------|
| `index.html` | Home | Landing page: hero with live mock chart, feature grid, how-it-works, security, FAQ, CTA |
| `trade.html` | Trade & Buy | Market list (12 assets), price chart with range switch, buy/sell form, holdings, order history |
| `staking.html` | Staking | Vault cards with APY/terms, stake modal, active positions with accrued yield, unstake |
| `predictions.html` | Predictions | Open 15-minute rounds with live countdown, up/down calls, your predictions, settled results |
| `bonuses.html` | Bonuses | Claimable offers (admin-managed), claim history |
| `wallet.html` | Wallet | Deposit and withdraw request modals, balance stats, filterable transaction history |
| `kyc.html` | KYC | Identity form (name, DOB, country, document), status banner, resubmit on rejection |
| `auth.html` | Login / Sign up | Gmail, iCloud, email and phone sign-in; full international country-code selector |
| `admin.html` | Admin panel | Restricted to the sole admin — see below |

---

## Admin panel

Accessible only when signed in as `joshuajoshfrosh@gmail.com` (configurable). Any other
account is shown an "Admin access only" screen.

Sections:

- **Overview** — user count, custodied balance, pending queue, recent activity
- **KYC** — approve or reject submissions (rejection takes a reason shown to the user)
- **Deposits** — approve (credits balance) or reject
- **Withdrawals** — approve (debits balance) or reject
- **Users** — search, suspend/activate, delete (admin account is protected)
- **Balances** — credit or debit any user with a reason; every adjustment is logged
- **Bonuses** — create, edit, enable/disable, delete; set amount, wagering and code
- **Staking plans** — create, edit, delete; set asset, APY, lock days, min/max
- **Prediction rounds** — create rounds, resolve with a closing price (winners paid 2×), delete
- **Audit log** — every admin action with actor and timestamp

### Undo

Every admin mutation pushes a full state snapshot before it runs. The **Undo last
action** button (top right, and in the amber bar) restores the exact previous state —
so any approve, reject, credit, delete or edit can be reversed. The stack holds the
last 60 actions.

---

## Project structure

```
crypto-app/
├── index.html            # Home
├── trade.html            # Trade & Buy
├── staking.html          # Staking
├── predictions.html      # Predictions
├── bonuses.html          # Bonuses
├── wallet.html           # Wallet
├── kyc.html              # KYC verification
├── auth.html             # Login / Sign up
├── admin.html            # Admin panel
├── README.md
└── assets/
    ├── css/
    │   └── styles.css    # Design system: tokens, components, responsive rules
    └── js/
        ├── config.js     # App config — ADMIN_EMAIL, currency, networks, limits
        ├── countries.js  # Full international dialling-code list (~195 entries)
        ├── store.js      # Mock data layer (the "backend")
        └── app.js        # Shared shell: nav, guards, toasts, modals, charts, country picker
```

### The data layer (`store.js`)

`window.Store` is the only thing the pages talk to. It exposes:

- **Session** — `login`, `signup`, `logout`, `currentUser`, `isAdmin`
- **Markets & trading** — `markets`, `market`, `buy`, `sell`, `holdings`, `portfolio`
- **Staking** — `stakingPlans`, `stake`, `unstake`, `myStakes`
- **Predictions** — `openRounds`, `placePrediction`, `myPredictions`
- **Bonuses** — `bonuses`, `claimBonus`, `claimedBonusIds`
- **Wallet** — `requestDeposit`, `requestWithdrawal`, `myTransactions`
- **KYC** — `submitKyc`, `myKyc`
- **Admin** — `reviewKyc`, `reviewTransaction`, `adjustBalance`, `saveBonus`,
  `deleteBonus`, `toggleBonus`, `setUserStatus`, `deleteUser`, `savePlan`,
  `deletePlan`, `saveRound`, `resolveRound`, `deleteRound`
- **Undo** — `undoStack`, `undo`

To plug in a real backend, re-implement these functions against HTTP endpoints.
The return shape is consistently `{ ok: true, ... }` or `{ ok: false, error }`, so
the UI needs no changes.

---

## Design

Dark crypto/fintech theme: near-black background (`#070b12`), layered surfaces,
a single green accent (`#00d68f`) for positive/primary actions, red for negative,
amber for pending. Solid colours rather than gradients, tabular-numeric monospace
for all figures. Fully responsive from 320px up, with a collapsible mobile nav and
`prefers-reduced-motion` support.

---

## What is needed to make this production-ready

This is a **front-end demonstration with mock data**. Nothing is real: no funds
move, no personal data leaves the browser, and all state resets when storage is
cleared. To ship it for real you need:

1. **Real backend** — an API server (Node/Go/Python) replacing `store.js`, with
   server-side validation on every mutation. Never trust the client for balances.
2. **Database** — Postgres (or similar) with a proper schema: users, balances,
   ledger entries, orders, stakes, predictions, bonuses, claims, KYC records,
   transactions, audit log. Balances must be derived from an append-only ledger,
   not a mutable column.
3. **Payment / crypto gateway** — a custody or on-chain integration (Fireblocks,
   BitGo, Coinbase Custody, or direct node + HD wallet) for real deposits and
   withdrawals, with address generation, confirmations and reconciliation.
4. **Real OAuth** — Google OAuth 2.0 / OpenID Connect for Gmail, Sign in with
   Apple for iCloud. The current buttons create local demo accounts.
5. **SMS provider** — Twilio, MessageBird or Vonage for phone verification (OTP),
   plus rate limiting and abuse protection.
6. **KYC provider** — Sumsub, Onfido, Persona or Jumio for document capture,
   liveness checks and sanctions/PEP screening. Store only provider references,
   never raw documents.
7. **Security** — server-side password hashing (bcrypt/argon2), session tokens or
   JWTs with rotation, CSRF protection, rate limiting, 2FA, secrets management,
   encrypted at-rest storage, and a real audit trail that cannot be edited.
8. **Legal & compliance** — licensing in each jurisdiction you serve, AML/KYC
   program, transaction monitoring, sanctions screening, terms of service, privacy
   policy (GDPR/CCPA), risk disclosures, and — depending on the product — MiCA
   (EU), MSB/FinCEN registration (US), or local equivalents. Prediction markets in
   particular are regulated as gambling or derivatives in many jurisdictions and
   may be prohibited entirely.
9. **Operational** — monitoring, alerting, backups, disaster recovery, on-call,
   and a treasury operations runbook for manual approvals.

> **Not financial advice.** This project is a technical demonstration. Trading and
> prediction products carry substantial risk of loss and are restricted or illegal
> in some jurisdictions.
