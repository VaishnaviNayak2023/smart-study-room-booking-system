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
