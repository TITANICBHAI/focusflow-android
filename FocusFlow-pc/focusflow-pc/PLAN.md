# FocusFlow PC — Build Plan & Progress Tracker
> Last updated: 2026-05-01 | Check this file before starting any new work.

## Project Goal
Port FocusFlow Android app → Full PC desktop app  
**Stack: Electron 29 · React 18 · TypeScript 5 · Tailwind CSS 3 · better-sqlite3 · electron-builder**  
Deploy: GitHub + GitHub Actions → Windows `.exe` auto-build on every push

---

## Phase Status Overview
| Phase | Status | Notes |
|-------|--------|-------|
| 1. Source Analysis | ✅ DONE | All 10+ screens studied |
| 2. Project Structure | ✅ DONE | All configs created |
| 3. Main Process | ✅ DONE | IPC + SQLite |
| 4. Preload & Types | ✅ DONE | contextBridge + TypeScript |
| 5. React Renderer | ✅ DONE | Entry, CSS, theme |
| 6. Global State | ✅ DONE | AppContext w/ all actions |
| 7. App Shell | ✅ DONE | Sidebar nav + TitleBar |
| 8. All 8 Screens | ✅ DONE | 1717 lines of screen code |
| 9. Build Tooling & CI | ✅ DONE | GitHub Actions .yml |
| 10. Build Verification | ✅ DONE | 52 modules, 0 errors |
| 11. GitHub Push | 🔴 BLOCKED | Token expired — use /api/push UI |
| 12. CI Verification | 🔲 TODO | After push succeeds |
| 13. Polish & Shortcuts | ✅ DONE | Global shortcuts, focus banner, kbd hints |
| 14. Major Feature Set | ✅ DONE | Week View, Pomodoro+sound, Search/Filter, Recurring, Notes |
| 15. Timeline & Templates | ✅ DONE | Visual timeline, task templates, live focus timer |

---

## ✅ Phase 14: Major Feature Set (DONE — 2026-05-01)

### WeekScreen.tsx (NEW — 7-day grid)
- [x] 7-column Mon–Sun grid, prev/next week navigation
- [x] Today's column highlighted in indigo
- [x] Per-day completion progress bar + done/total count
- [x] Mini task cards with hover complete/skip actions
- [x] "+ Add Task" per day (pre-fills date in modal)
- [x] Week-level progress bar in header

### FocusScreen.tsx (MAJOR UPGRADE)
- [x] Real Pomodoro timer — 25m work / 5m break × 4 intervals
- [x] Web Audio API beep at every phase transition (no audio file needed)
- [x] Desktop notification at each phase change
- [x] Pomodoro progress dots showing completed intervals
- [x] Ring turns green during break, task color during work
- [x] "Skip to Break / Skip Break" button
- [x] Pomodoro settings mini-popup during session
- [x] Ctrl+Enter to complete task from Focus screen

### TodayScreen.tsx (UPGRADED)
- [x] Search bar — filter tasks by title/description/tags
- [x] Status filter chips: All / Active / Scheduled / Done / Skipped
- [x] F key focuses search; Esc clears filters
- [x] Repeat field in AddTask modal (none/daily/weekdays/weekly/monthly)

### database.ts (UPGRADED)
- [x] `daily_notes` table (date PRIMARY KEY, content, updated_at)
- [x] `repeat_rule` column on tasks (with safe ALTER TABLE migration)
- [x] `scheduleNextRecurrence()` — auto-creates next occurrence on insert
- [x] `getNoteForDate`, `saveNote`, `getRecentNoteDates` functions

### main/index.ts + preload/index.ts (UPGRADED)
- [x] `notes:get`, `notes:save`, `notes:getRecentDates` IPC handlers
- [x] `window.api.notes` exposed via contextBridge
- [x] Tray menu updated: Today/Week/Focus/Stats items

### NotesScreen.tsx (NEW)
- [x] Full-page daily journal editor
- [x] Auto-save with 800ms debounce + save indicator
- [x] 14-day sidebar with past note dates
- [x] Daily writing prompt (cycles through 6 prompts based on date)
- [x] Character count display

---

## ✅ Phase 15: Timeline & Templates (DONE — 2026-05-01)

### TodayScreen.tsx — Timeline View
- [x] Toggle between **☰ List** and **📅 Timeline** views (T key)
- [x] Visual 6 AM–11 PM timeline with 72px/hour grid
- [x] Half-hour dashed guidelines
- [x] **Red "now" line** that updates every 30s, auto-scrolls to current time
- [x] Tasks rendered as colored blocks (height = duration)
- [x] Task block hover → quick ✓ complete and ↷ skip buttons
- [x] Active task shown with pulse dot on block
- [x] Click any empty hour slot → opens Add Task modal pre-filled to that hour
- [x] Completed tasks rendered greyed out with strikethrough

### TodayScreen.tsx — Task Templates
- [x] "Quick Templates" row in Add Task modal
- [x] 6 presets: 🧠 Deep Work (90m, high), 📧 Email (30m, med), 📅 Meeting (60m, med), 💪 Exercise (45m, low), ☕ Break (15m, low), 📖 Learning (60m, high)
- [x] One click pre-fills title, duration, priority, color, tags

### TodayScreen.tsx — Live Focus Timer Chip
- [x] When focus session is active, header shows live `🛡 MM:SS` elapsed timer
- [x] Shows hours when session exceeds 1h (H:MM:SS)
- [x] Styled as indigo chip with green pulse dot

### App Shell — keyboard shortcuts updated
- [x] `T` key toggles List ↔ Timeline view on Today screen

---

## 🔴 Phase 11: GitHub Push (BLOCKED — TOKEN EXPIRED)

**Problem:** `GITHUB_PERSONAL_ACCESS_TOKEN` returns HTTP 401 "Bad credentials"  
**Token seen:** prefix `ghp_IXpNM3` (40 chars) — this token is revoked/expired on GitHub.

**SOLUTION — Use the Push UI page:**
1. In Replit preview pane → select **"API Server"** from the dropdown
2. Navigate to **/push** in the URL
3. On that page: click the link to generate a new GitHub token
   - Go to: https://github.com/settings/tokens/new
   - Note: `focusflow-pc-push`
   - Expiry: 90 days
   - Scopes: ✅ `repo` (all) + ✅ `workflow`
   - Click "Generate token" → copy the `ghp_…` value
4. Paste token into the field and click **"Push 36 files to GitHub"**
5. Watch the live log of file uploads
6. Click the repo link when done

**What the push does:**
- Creates `TITANICBHAI/focusflow-pc` repo via GitHub API
- Uploads all 36 source files via GitHub Contents API
- GitHub Actions triggers automatically → builds Windows `.exe`

---

## 🔲 Phase 12: CI Verification (TODO)
- [ ] Check GitHub Actions tab — `build-windows` job starts automatically
- [ ] Job: Node 20 setup → npm ci → electron-vite build → electron-builder --win
- [ ] `.exe` artifact uploaded (available in Actions run summary)
- [ ] Tag `v1.0.0` → verify Release job creates GitHub Release with `.exe`

---

## All 36 Project Files
```
.github/workflows/build.yml          ← GitHub Actions (Windows .exe build)
.gitignore
build/icon.png                       ← 512×512 app icon
build/tray-icon.png                  ← 64×64 system tray icon
electron.vite.config.ts
package.json
package-lock.json
postcss.config.js
README.md
PLAN.md                              ← This file
src/main/database.ts                 ← SQLite (better-sqlite3, WAL) + notes + recurring
src/main/index.ts                    ← Electron main + IPC + Tray + global shortcuts
src/preload/index.ts                 ← contextBridge API (tasks/focus/stats/notes/app/window)
src/renderer/index.html
src/renderer/src/App.tsx             ← Shell + sidebar (Today/Week/Focus/Stats/Settings) + shortcuts
src/renderer/src/context/AppContext.tsx
src/renderer/src/data/types.ts
src/renderer/src/env.d.ts
src/renderer/src/index.css
src/renderer/src/main.tsx
src/renderer/src/screens/ActiveScreen.tsx
src/renderer/src/screens/FocusScreen.tsx    ← Pomodoro timer + Web Audio + skip + settings
src/renderer/src/screens/NotesScreen.tsx    ← Daily journal + auto-save + history
src/renderer/src/screens/OnboardingScreen.tsx
src/renderer/src/screens/ProfileScreen.tsx
src/renderer/src/screens/ReportsScreen.tsx
src/renderer/src/screens/SettingsScreen.tsx
src/renderer/src/screens/StatsScreen.tsx
src/renderer/src/screens/TodayScreen.tsx    ← List+Timeline views + search + templates + focus chip
src/renderer/src/screens/WeekScreen.tsx     ← 7-day grid + per-day add + completion bars
src/renderer/src/services/taskService.ts
src/renderer/src/styles/theme.ts
tailwind.config.js
tsconfig.json
tsconfig.node.json
tsconfig.web.json
```
