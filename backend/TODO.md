# Backend Implementation Plan (Node.js + Express + SQLite)

## Goals
- Build a real REST API backend in `backend/` using Node.js, Express, SQLite (better-sqlite3).
- JWT + bcrypt authentication (user / admin roles).
- Seed database with data matching the frontend's current mock data.
- Wire the Quasar/Vue frontend (`booking-configuration/`) to consume the backend APIs instead of local mock data.

## Backend Steps
- [x] 1. Scaffold `backend/` — package.json, .env, .gitignore, directories
- [x] 2. SQLite database setup + schema + seed data (users, resourceTypes, resources, rooms, bookings, pricingRules, settings)
- [x] 3. Auth (register/login) with JWT + bcrypt; middleware (auth, role authorize, error handler, cors)
- [x] 4. REST routes: auth, resources, resourceTypes, rooms, bookings, pricing, settings, reports, dashboard
- [x] 5. Server entry (`index.js`) and optional dev proxy config
- [x] 6. Backend README + test server runs

## Frontend Wiring Steps
- [ ] 7. Add `axios` dependency + create API service (`src/services/api.js`) with JWT token handling
- [ ] 8. Update `studyroom-store.ts` to call `/api/auth/login` + `/api/auth/register`
- [ ] 9. Wire pages to backend: Resources, ManageResources, BrowseRooms, Bookings, MyBookings, AdminDashboard, ResourceTypes, PricingRules, Reports, Settings
- [ ] 10. Configure dev server proxy or .env base URL
- [ ] 11. Verify frontend compiles/runs and communicates with backend

