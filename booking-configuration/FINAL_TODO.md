# Frontend ↔ Backend Connection — Implementation Plan

Goal: Make the Quasar frontend fully dynamic by wiring it to the Express/SQLite backend.

## Steps
- [x] 1. Add `axios` to `booking-configuration/package.json`
- [x] 2. Create API service `src/services/api.ts` (axios instance, JWT handling, 401 redirect)
- [x] 3. Update `src/stores/studyroom-store.ts` to call `/api/auth/login` + `/api/auth/register`, persist JWT/user
- [x] 4. Configure dev proxy in `quasar.config.ts` (`/api` → `http://localhost:5000`)
- [x] 5. Initialize store auth on boot (`App.vue`)
- [x] 6. Wire `LoginPage.vue` (async login + error handling)
- [x] 7. Wire `Register.vue` (async register + error handling)
- [x] 8. Wire `BrowseRooms.vue` → load rooms from `/api/rooms`, confirm booking via `/api/bookings`
- [x] 9. Wire `AdminDashboard.vue` → `/api/dashboard`
- [x] 10. Wire `Bookings.vue` (admin) → `/api/bookings`
- [x] 11. Wire `MyBookings.vue` → `/api/bookings/my` + cancel/modify
- [x] 12. Wire `ManageResources.vue` → `/api/resources` CRUD
- [x] 13. Wire `ResourceTypes.vue` → `/api/resource-types` CRUD
- [x] 14. Wire `PricingRules.vue` → `/api/pricing-rules`
- [x] 15. Wire `Reports.vue` → `/api/reports`
- [x] 16. Wire `Settings.vue` → `/api/settings`
- [x] 17. Wire `UserDashboardPage.vue` → `/api/dashboard` + `/api/bookings/my`
- [x] 18. Wire `Profile.vue` → `/api/auth/me` (update/change password) + added `PUT /api/auth/profile` backend route
- [x] 19. Verify: `npm run typecheck` + run dev server with backend

