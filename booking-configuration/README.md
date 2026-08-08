# Booking Configuration (ResourceHub)

Admin & user portal for booking rooms — Quasar + Vue 3 + Pinia

## Quick Start

Prerequisites

- Node.js (recommended 22+; package.json allows 22/24/26+)
- pnpm or npm installed globally

Install dependencies

```bash
pnpm install
# or
npm install
```

Run development server

```bash
pnpm dev
# or
npm run dev
```

Build for production

```bash
pnpm build
# or
npm run build
```

Lint & format

```bash
npm run lint
```

Type-check

```bash
npm run typecheck
```

## Project Structure (important files)

- `src/` — application source
  - `pages/` — route pages
    - `AdminDashboard.vue` — admin dashboard layout
    - `UserDashboardPage.vue` — user dashboard layout
    - `LoginPage.vue`, `Register.vue`, `ErrorNotFound.vue` — auth / misc
    - placeholders: `Bookings.vue`, `Resources.vue`, `MyBookings.vue`, etc.
  - `components/`
    - `AppNavbar.vue`, `AppSideBar.vue` — main header and left nav
  - `stores/`
    - `studyroom-store.ts` — Pinia store used for auth and current user
  - `router/index.ts` — explicit route table used by the app

Other files

- `quasar.config.ts` — Quasar configuration
- `package.json` — scripts used by the project

## Routing & Store Notes

- Routes are defined in `src/router/index.ts`. Add new pages and register them here.
- The auth/store API is provided by `useStudyroomStore()` (login, logout, currentUser).
- Sidebar and navbar components read `studyroomStore.currentUser` to determine UI state.

## How to extend

- Add a page under `src/pages/`, import and add to `src/router/index.ts`.
- Add store state/actions in `src/stores/studyroom-store.ts` and import `useStudyroomStore()`.
- Use Quasar components and conventions — keep styles in `src/css/`.

## Common Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — format + eslint autofix
- `npm run typecheck` — run `vue-tsc` type checks

## Troubleshooting

- If you see the Volar/Vue Router `rootDir` warning during `typecheck`, set `compilerOptions.rootDir` in `tsconfig.json` to the repo `src` path.

## Contributing

- Fork, create a branch, and open a PR.

## License

MIT

# Booking Configuration (booking-configuration)

## Install the dependencies

```bash
pnpm install
# or: yarn/npm/bun install
```

### Start the app in development mode (HMR, error reporting, etc.)

```bash
quasar dev
```

### Format & Lint the files

```bash
pnpm run lint
# or: yarn/npm/bun run lint
```

...or just check formatting & linting:

```bash
pnpm run lint:check
# or: yarn/npm/bun run lint:check
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-file).
