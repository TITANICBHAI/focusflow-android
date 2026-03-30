# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

---

## FocusFlow — Android Productivity App

`artifacts/focusflow` — Expo (React Native) Android app combining intelligent task scheduling with OS-level app blocking via custom Kotlin native services.

### Architecture

- **JS layer (control plane)** — writes config to SharedPreferences, displays UI, manages app state (AppContext).
- **Kotlin layer (execution plane)** — owns timing, enforcement, and recovery. Never relies on JS being alive.

### Native Services

| Service | Purpose |
|---|---|
| `ForegroundTaskService.kt` | Always-running foreground service. IDLE mode: quiet persistent notification. ACTIVE mode: task countdown + blocking. Never stopped — goes IDLE instead. |
| `AppBlockerAccessibilityService.kt` | Intercepts every window-change event. Enforces both task-based AND standalone block lists independently. Self-heals stale SharedPrefs flags when timestamps pass. |
| `BootReceiver.kt` | Restarts `ForegroundTaskService` on reboot — in ACTIVE mode if a task session was running, IDLE mode otherwise (always-on). |

### SharedPreferences Schema (`focusday_prefs`)

| Key | Type | Purpose |
|---|---|---|
| `focus_active` | Boolean | Task focus session is active |
| `task_name` | String | Current task display name |
| `task_end_ms` | Long | Task session end epoch ms |
| `next_task_name` | String? | Next task name for notification sub-text |
| `allowed_packages` | String (JSON array) | Apps allowed during task focus (NOT StringSet — reference bug) |
| `standalone_block_active` | Boolean | Standalone (no-task) block is enabled |
| `standalone_blocked_packages` | String (JSON array) | Apps always blocked until expiry |
| `standalone_block_until_ms` | Long | Standalone block expiry epoch ms |

### Blocking Logic (Collision Handling)

When both task-based focus and standalone block are active simultaneously, enforcement is **additive (union)**:
- Task focus: blocks every app NOT in `allowed_packages`
- Standalone block: blocks every app IN `standalone_blocked_packages`
- Both are checked independently — the more restrictive rule wins for each app

### Key JS Files

| File | Purpose |
|---|---|
| `src/context/AppContext.tsx` | Global state, `setStandaloneBlock()`, starts idle service on init |
| `src/services/focusService.ts` | Starts/stops task focus. Calls `goHome()` after activation. |
| `src/components/AllowedAppsModal.tsx` | Picker for allowed apps (task focus) |
| `src/components/StandaloneBlockModal.tsx` | Picker for blocked apps + date/time expiry (standalone) |
| `app/(tabs)/settings.tsx` | Settings screen including Block Schedule section |

### Deferred Feature: Full-screen Lock Overlay

**Idea:** When "Activate Focus" is tapped, instead of just going to the home screen, a full-screen lock UI appears over the home screen showing the active task name and a live countdown timer. The overlay is non-dismissable during the focus session (Back is intercepted) and auto-dismisses when the session ends.

**Implementation plan (NOT yet implemented):**

1. **New `FocusLockActivity`** — a dedicated Kotlin `Activity` with `Theme.Black.NoTitleBar.Fullscreen`. It reads task name + end time from SharedPreferences and shows a live countdown. Back button is intercepted and no-ops.

2. **Launch mechanism** — two options:
   - `USE_FULL_SCREEN_INTENT` permission on the `ForegroundTaskService` notification (no SYSTEM_ALERT_WINDOW needed, works on API < 34 without user grant). The notification's `setFullScreenIntent()` launches `FocusLockActivity`.
   - OR: `SYSTEM_ALERT_WINDOW` (Draw over other apps) — a `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY` view. More powerful but requires explicit user grant on API ≥ 23.

3. **Manifest registration** — add `FocusLockActivity` to `withFocusDayAndroid.js` config plugin (careful: this file is delicate, test after any touch). Add `USE_FULL_SCREEN_INTENT` permission if using option A.

4. **Dismiss trigger** — `ForegroundTaskService` fires a local broadcast (e.g. `com.tbtechs.focusflow.FOCUS_ENDED`) that `FocusLockActivity` listens for and uses to `finish()` itself.

5. **JS stub already exists** — `ForegroundLaunchModule.showOverlay(message)` is a placeholder that currently calls `bringToFront()`. Wire it to launch `FocusLockActivity` instead.

---

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
