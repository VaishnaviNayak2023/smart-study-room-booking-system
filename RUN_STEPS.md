# Booking Configuration — How to Run (Steps & Commands)

This document explains how to run the **Booking Configuration (ResourceHub)** project
locally. The project has two parts:

1. **Backend** — Node.js + Express + SQLite REST API (folder: `backend/`)
2. **Frontend** — Quasar + Vue 3 SPA (folder: `booking-configuration/`)

---

## 0. Prerequisites

Make sure the following are installed on your machine:

| Tool  | Version used | Check command        |
|-------|--------------|----------------------|
| Node.js | v24.14.0   | `node --version`     |
| npm   | 11.9.0       | `npm --version`      |
| pnpm  | (optional)   | `pnpm --version`     |

> The backend uses `better-sqlite3`, which is a native module. It requires a
> Node version of **22+** (the installed version is v24.14.0, which works).

---

## 1. Install Backend Dependencies

Open a terminal in the **project root**, then:

```bash
cd backend
npm install
```

> `node_modules` is already present in the repo, so you can skip this step if it
> is already installed. Rerunning `npm install` is safe and will just verify.

---

## 2. (Optional) Configure Backend Environment

The backend reads configuration from `backend/.env`. A `.env` file already exists
with these values:

```
PORT=5000
JWT_SECRET=super-secret-booking-configuration-jwt-key-2026
JWT_EXPIRES_IN=2d
DB_FILE=./data/booking.db
CLIENT_ORIGIN=http://localhost:9000
```

- `PORT` — backend port (default `5000`)
- `CLIENT_ORIGIN` — allowed frontend origin (must match the Quasar dev URL, `9000`)
- `DB_FILE` — SQLite database file location

The database tables and seed data are created automatically on first run by
`backend/db.js`, so **no manual DB setup is required**.

---

## 3. Start the Backend Server

From the project root:

```bash
cd backend
node server.js
```

You should see:

```
✅ Booking Configuration backend running on http://localhost:5000
```

> Alternative scripts defined in `backend/package.json`:
> - `npm start` → runs `node server.js`
> - `npm run dev` → runs `node --watch server.js` (auto-restart on file changes)

### Verify the backend

Open another terminal and run:

```bash
Invoke-RestMethod -Uri http://localhost:5000/api -Method Get | ConvertTo-Json
```

Expected output:

```json
{
  "message":  "Booking Configuration API is running.",
  "status":  "ok"
}
```

---

## 4. Install Frontend Dependencies

Open a new terminal in the project root:

```bash
cd booking-configuration
npm install
# or, if you use pnpm:
pnpm install
```

> `node_modules` is already present, so this step can be skipped if already done.

---

## 5. Start the Frontend Dev Server

From `booking-configuration/`:

```bash
npx quasar dev
# or
npm run dev
```

You should see the Quasar banner and then:

```
» App URL................ http://localhost:9000/
                           http://localhost:9000/
» Dev mode............... SPA
```

The browser will open automatically at **http://localhost:9000/**.

> The Quasar dev server (in `quasar.config.ts`) proxies `/api` requests to
> `http://localhost:5000`, so the frontend talks to the backend through the proxy.
> No extra configuration is needed.

---

## 6. Test the Full Stack (End-to-End)

With both servers running, verify the login endpoint works:

```bash
$body = @{email='admin@example.com';password='admin123'} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method Post `
  -ContentType 'application/json' -Body $body | ConvertTo-Json
```

Expected output (truncated):

```json
{
  "user":  {
    "id":  1,
    "email":  "admin@example.com",
    "name":  "System Admin",
    "role":  "admin"
  },
  "token":  "eyJhbGciOi..."
}
```

---

## 7. Demo Login Credentials (Seed Data)

The database is seeded automatically with these accounts:

| Role  | Email               | Password (bcrypt seed) |
|-------|---------------------|------------------------|
| Admin | admin@example.com   | see seed hash in db.js |
| User  | user@example.com    | see seed hash in db.js |
| User  | rohan@example.com   | see seed hash in db.js |
| User  | neha@example.com    | see seed hash in db.js |
| User  | arjun@example.com   | see seed hash in db.js |
| User  | priya@example.com   | see seed hash in db.js |

> The seed user passwords are stored as bcrypt hashes in `backend/db.js`.
> If you need the plaintext passwords, check `backend/debug_hashes.cjs` or the
> backend TODO notes. You can also simply **register a new account** from the
> frontend Register page.

---

## 8. Useful npm Scripts

### Backend (`backend/package.json`)
| Script | Command            | Purpose                              |
|--------|--------------------|--------------------------------------|
| start  | `node server.js`   | Start backend once                   |
| dev    | `node --watch server.js` | Start with auto-restart on change |
| seed   | `node server.js`   | Start + seed DB (runs db.js)         |

### Frontend (`booking-configuration/package.json`)
| Script     | Command                          | Purpose                          |
|------------|----------------------------------|----------------------------------|
| dev        | `quasar dev`                     | Start dev server (HMR)           |
| build      | `quasar build`                   | Production build                 |
| lint       | prettier + eslint (autofix)      | Format & lint code               |
| typecheck  | `vue-tsc --noEmit`               | Run TypeScript type checks       |

---

## 9. Ports & URLs Summary

| Service  | URL                                | Notes                              |
|----------|------------------------------------|------------------------------------|
| Backend  | http://localhost:5000              | REST API                           |
| Frontend | http://localhost:9000              | Quasar SPA app                     |
| API base | http://localhost:5000/api          | Health check / root endpoint       |
| Proxy    | `/api` → http://localhost:5000     | Frontend dev proxy (auto)          |

---

## 10. Troubleshooting

- **Port already in use** — Change `PORT` in `backend/.env` and update the proxy
  target in `booking-configuration/quasar.config.ts` if needed.
- **`better-sqlite3` build error** — Update Node to 22+ and re-run `npm install`.
- **Frontend can't reach backend** — Make sure the backend runs BEFORE the
  frontend, and that `CLIENT_ORIGIN` / proxy target both point to the right ports.
- **CORS issues** — The backend already enables CORS for `http://localhost:9000`
  (from `CLIENT_ORIGIN`). Add more origins via comma-separated values if needed.
- **`[vue-router] No rootDir specified`** — Harmless warning. Optionally set
  `compilerOptions.rootDir` in `booking-configuration/tsconfig.json`.

---

## Quick Start (TL;DR)

```bash
# Terminal 1 — Backend
cd backend
npm install        # if needed
node server.js     # → http://localhost:5000

# Terminal 2 — Frontend
cd booking-configuration
npm install        # if needed
npx quasar dev     # → http://localhost:9000
```

Open **http://localhost:9000** in your browser and log in with a seeded account
(or register a new one).
