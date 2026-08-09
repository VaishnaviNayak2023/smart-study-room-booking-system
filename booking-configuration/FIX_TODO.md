# Fix Login/Register/Logout Issue + Typecheck Errors

## Root cause of login/register/logout failure
`quasar.config.ts` had `framework.plugins: []` (EMPTY). The app uses `Notify`, `Dialog`, and `Dark`.
Calling `Notify.create()` without the plugin registered throws, halting the `router.replace()`
navigation after login/register and the logout redirect.

## Steps
- [x] 1. Add `Notify`, `Dialog`, `Dark` plugins to `framework.plugins` in `quasar.config.ts` (FIXES login/register/logout)
- [ ] 2. (Optional) Add `rootDir` to `.quasar/tsconfig.json` to silence the vue-router rootDir warning (benign — typecheck passes with exit 0)
- [x] 3. Restore admin registration in `backend/routes/auth.js` (admin registration retained per requirement: `role === 'admin' ? 'admin' : 'user'`)
- [x] 4. Restore admin role selector in `Register.vue` (admin + user toggle, register redirects to correct dashboard based on role)
- [x] 5. Verify typecheck passes (vue-tsc --noEmit exit 0)
- [x] 6. Verify backend: admin login → 200, user login → 200, admin registration → 201 (all return valid tokens)

