# Expense Splitter

A full-stack expense-sharing app: React (Vite) frontend + Node/Express backend.

## Quick start

```bash
npm install
npm run dev        # starts the API on :4000 and the web app on :5173
```

Open http://localhost:5173, create an account and start a group.

Other scripts

| Command         | What it does                                                        |
| --------------- | ------------------------------------------------------------------- |
| `npm run build` | Production build of the frontend into `dist/`                        |
| `npm start`     | Runs the API and serves `dist/` from one server (http://localhost:4000) |
| `npm test`      | Backend + split-maths tests (Node's built-in test runner)           |
| `npm run lint`  | ESLint                                                              |

Requires Node 18.11+ (tested on Node 22).

## Features

- **Groups & members**: create groups, add/remove members, edit or delete a group
- **Splitting**: equal, percentage (must total 100%) or exact amounts (must match the total), with live preview and a "Fill evenly" helper
- **Settle up**: suggested payments ("who owes whom"), **Mark as paid** (full or partial), payment history with undo
- **Dashboard**: hero + quick actions, summary cards (total spending, paid, owed, to receive), recent expenses, active groups, current balances, category donut and 6-month trend
- **Categories & analytics**: per-category tracking, monthly trend, spending by group, biggest shares; filter by group and period
- **Search / filter / sort** expenses (text, category, group, date range, 5 sort orders)
- **Export** the filtered list as CSV or PDF; full JSON backup from Profile
- **Persistence**: data lives on the server (`server/data/db.json`); a copy is cached in `localStorage` so the app opens instantly and still shows your data if the server is down. Theme and session token are also in `localStorage`
- **Profile & settings**: name, currency (INR/USD/EUR/GBP/AUD/CAD/JPY), password change, theme (light/dark/system)
- Toast notifications, inline form validation, confirm dialogs, responsive layout with mobile menu

### How the dashboard numbers are defined

| Card            | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| Total spending  | Your own share of every expense you're part of                       |
| Amount paid     | Cash you actually paid out (can be more than your share)             |
| Amount owed     | What you still owe others after recorded payments                    |
| To receive      | What others still owe you after recorded payments                    |

## Project structure

```
shared/calc.js        Split + balance + settlement maths, used by BOTH frontend and backend
server/
  index.js, app.js    Express setup (serves dist/ in production)
  db.js               Atomic JSON-file store (no native modules needed)
  auth.js             JWT middleware
  routes/auth.js      register / login / profile
  routes/data.js      groups, members, expenses, settlements
  tests/              API + calculation tests
src/
  api/client.js       fetch wrapper
  context/            UI (toasts/confirm), Auth, Settings (theme/currency), Data providers
  components/         Navbar, Modal, Charts (SVG), ExpenseList, ...
  pages/              Landing, Login, Register, Home (dashboard), Groups, GroupDetail,
                      AddExpense (add + edit), Expenses, Analytics, Profile
```

## API (all `/api`, JSON, Bearer token except auth)

| Method & path                            | Purpose                              |
| ---------------------------------------- | ------------------------------------ |
| `POST /auth/register`, `POST /auth/login` | Returns `{ token, user }`            |
| `GET/PUT /auth/me`                       | Profile (name, currency, password)   |
| `GET /data`                              | All your groups, expenses, settlements |
| `POST /groups`, `PUT/DELETE /groups/:id` | Manage groups                        |
| `POST /groups/:id/members`, `DELETE /groups/:id/members/:memberId` | Manage members |
| `POST /expenses`, `PUT/DELETE /expenses/:id` | Manage expenses (server re-validates the split) |
| `POST /settlements`, `DELETE /settlements/:id` | Mark as paid / undo            |

## Configuration

| Env var      | Default                | Notes                                              |
| ------------ | ---------------------- | -------------------------------------------------- |
| `PORT`       | `4000`                 | API port (if you change it, update `vite.config.js` proxy) |
| `JWT_SECRET` | auto-generated         | Otherwise a random secret is stored in `server/data/.secret` |
| `DATA_DIR`   | `server/data`          | Where `db.json` is stored                          |

## Notes / limitations

- Group members are names, not separate accounts: one user (the group owner) manages each group. Inviting other logged-in users to a shared group would need an extra membership model.
- The JSON-file database is ideal for personal/small use. For many concurrent users, swap `server/db.js` for SQLite/Postgres/MongoDB.
- PDF exports show amounts with the currency code (e.g. `INR 1200.00`) because the built-in PDF font has no ₹ glyph.
- Accounts from the previous localStorage-only version are not migrated; register again.
