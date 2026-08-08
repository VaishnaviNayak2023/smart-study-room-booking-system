# Fix Routing Configuration

## Steps

- [x] 1. Remove broken `/notifications` and `/help` items from user sidebar navigation.
- [x] 2. Remove broken `/admin/users` item from admin sidebar navigation.
- [x] 3. Fix sidebar logout handler to clear auth store before redirecting to `/login`.
- [x] 4. Verify no routes reference missing pages (HTTP 200, dev server compiles clean).

## Pricing Rules Fix

- [x] 1. Fix malformed SFC in `PricingRules.vue` — move misplaced `watch()` block back inside `<script setup>`.
- [x] 2. Add `lang="ts"` to the `<script setup>` block.
- [x] 3. Fix implicit `any` type errors on `formatCurrency(value)` and `editDiscountRule(rule)`.
- [x] 4. Add a route `name` (`pricing-rules`) to the `/pricing-rules` route in `src/router/index.ts`.
- [x] 5. Add a "Pricing Rules" quick-access link on the Admin Dashboard (`AdminDashboard.vue`).
- [x] 6. Verify `npm run typecheck` passes cleanly (only cosmetic `rootDir` Volar warning remains).

## Browse Rooms Fix

- [x] 1. Register `BrowseRooms.vue` as a new route `/browse-rooms` (with `name: 'browse-rooms'`) in `src/router/index.ts`.
- [x] 2. Point the user dashboard's "Browse Rooms" quick action (`browseRooms()`) to `/browse-rooms`.
- [x] 3. Point the user sidebar "Browse Rooms" navigation item to `/browse-rooms`.
- [x] 4. Point the sidebar "Book Now" button (`goToBooking()`) to `/browse-rooms`.
- [x] 5. Add a "Back to Dashboard" link on the Browse Rooms page.
- [x] 6. Fix all TypeScript errors in `BrowseRooms.vue` (add `lang="ts"`, type `Room`, `selectRoom`, `formatPrice`, `convertTimeToMinutes`).
- [x] 7. Verify `npm run typecheck` passes cleanly.

## Role Guards, Navbar Logout & Page Build-Out

- [x] 1. Add role-based route meta (`requiresAuth`, `roles`) to all routes in `src/router/index.ts`.
- [x] 2. Add auth + role guarding in the router `beforeEach` guard (protect private routes, route users/admins to their own dashboards).
- [x] 3. Add a Logout button to the top navbar (`AppNavbar.vue`) that clears the auth store and redirects to `/login`.
- [x] 4. Build out `Profile.vue` with a real profile page (avatar, account details, change password).
- [x] 5. Build out `Bookings.vue` (admin) with stats and a bookings management table.
- [x] 6. Build out `ResourceTypes.vue` with resource-type cards.
- [x] 7. Build out `ManageResources.vue` with a resource management table.
- [x] 8. Build out `Reports.vue` with analytics stats and breakdown charts.
- [x] 9. Build out `Settings.vue` with general and booking preferences.
- [x] 10. Redirect `/resources` to `/browse-rooms` so the sidebar "Browse Rooms" link opens the full booking page.
- [x] 11. Verify `npm run typecheck` passes cleanly.

## Admin Bookings Adjustments

- [x] 1. Remove the "New Booking" button from the admin Bookings page header.
- [x] 2. Remove the edit (pencil) action from the admin Bookings table.
- [x] 3. Remove the now-unused `updateStatus` function to satisfy eslint/lint.

## Browse Rooms & Resources Lint/Typecheck Fixes

- [x] 1. Add `lang="ts"` to `<script setup>` in `BrowseRooms.vue` (fixes `vue/block-lang` eslint error).
- [x] 2. Add typed `Room` interface and type `rooms` ref as `ref<Room[]>`.
- [x] 3. Fix `capacityMap[capacity]` indexing with `Record<string, number>` + `?? 0` fallback.
- [x] 4. Type filter callback `(room: Room)`, `selectRoom(room: Room)`, and `selectedRoom` as `ref<Room | null>`.
- [x] 5. Type `convertTimeToMinutes(time: string): number` (fix `prefer-const` on `minutes` and "possibly undefined" errors).
- [x] 6. Type `formatPrice(value: number): string`.
- [x] 7. Verify `BrowseRooms.vue` and `Resources.vue` pass eslint and typecheck cleanly (only cosmetic `rootDir` Volar warning remains).
