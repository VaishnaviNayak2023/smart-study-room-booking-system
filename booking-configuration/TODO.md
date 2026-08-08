# Task: Login page skipped → straight to dashboard

## Goal
Fix the issue where the login page is not shown and the app goes straight to the user dashboard.

## Root cause
A previously logged-in session persists in localStorage (`booking_user`/`booking_token`). The router guard sees `currentUser` and redirects `/login` → `/dashboard`. The stored token was never validated against the backend, so even an expired/invalid token keeps the user "logged in".

## Changes
- [x] `stores/studyroom-store.ts`: added `validateSession()` which calls `GET /api/auth/me` and clears the session if invalid/expired.
- [x] `router/index.ts`: guard awaits `validateSession()` once on first navigation before deciding redirects.
- [x] `App.vue`: removed redundant `validateSession()` on boot (router guard already handles it; avoids boot-time 401 redirect edge case).

## Follow-up
- Hard-refresh browser / clear localStorage once to pick up the fix.
- Logout action already exists for when a *valid* session is active.

---

# Task: Login/Register failing → "not logging in or registering"

## Goal
Fix login/register not working for either user or admin.

## Root cause
The backend was completely down. `db.js` imports `better-sqlite3`, but it was NOT declared in `backend/package.json` dependencies and NOT installed, so `node index.js` crashed with `ERR_MODULE_NOT_FOUND: Cannot find package 'better-sqlite3'`. With the backend down, login/register (and all API calls) failed.

## Changes
- [x] Installed `better-sqlite3` in `backend/` (now declared in `package.json` as `better-sqlite3 ^13.0.3`).
- [x] Verified backend starts: `GET /api` → 200 OK, running on port 5000.
- [x] Verified login: `POST /api/auth/login` admin creds → 200 with token.
- [x] Verified register: `POST /api/auth/register` → 201 with token.
- [x] Verified frontend dev server up on port 9000.

---

# Task: Filter / Profile redirect / Cancel dialog / Logout popup

## Goal
Address the 4 user-facing requirements:
1. BrowseRooms filter (date) should actually work
2. Profile icon redirect to profile section
3. Centered cancel confirmation popup (already done)
4. Logout → login page + "logged out successfully" popup

## Steps
- [x] Analyze task & codebase
- [x] Create plan & get approval
- [x] BrowseRooms.vue: make Date filter actually filter rooms (exclude rooms booked on selected date)
- [x] BrowseRooms.vue: header profile avatar/username redirect to /profile
- [x] AppSideBar.vue: add "Logged out successfully" notification on admin logout
- [x] Run typecheck

## Follow-up: Connect Admin & User dashboards
- [x] Analyze: `rooms` table (user) is separate from `resources` table (admin) — root cause of no sync
- [x] room route: make `/api/rooms` read from shared `resources` table
- [x] Run typecheck/verify
