# FocusFlow PC

A full-featured productivity and focus app for desktop, built with **Electron + React + TypeScript + Tailwind CSS + SQLite**.

This is a complete PC port of the [FocusFlow Android app](https://github.com/TITANICBHAI/FocusFlow), replicating all features for Windows, macOS, and Linux.

---

## Features

- **📅 Smart Task Scheduling** — Schedule your day with time-blocked tasks, priorities, tags, and color coding
- **🛡 Focus Mode** — Animated timer ring, focus enforcement, emergency override tracking
- **📊 Statistics** — Today/Yesterday/Week/All-time views, completion heatmap, streaks, milestones
- **🔥 Streak Tracking** — Daily streaks with milestone badges (7-day, 30-day)
- **📋 Reports** — Detailed focus time breakdowns, task completion rates, distraction logs
- **⚡ Active Status** — Live dashboard of all enforcement layers
- **👤 User Profile** — Name, occupation, chronotype, focus goals, distraction triggers
- **🌐 Website Blocking** — Track distracting websites (focus-mode awareness)
- **🔤 Keyword Blocker** — Track distraction keywords
- **🍅 Pomodoro** — Optional pomodoro timer mode
- **🌙 Dark Mode** — Full dark theme support
- **💾 Backup/Restore** — JSON export of all tasks and settings
- **🔔 Notifications** — Task reminders and focus alerts via system notifications
- **🖥 System Tray** — Minimize to tray, accessible from anywhere

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 29 |
| Frontend | React 18 + TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Database | better-sqlite3 (SQLite, WAL mode) |
| Build | electron-vite 2 |
| Packaging | electron-builder |

---

## Development

```bash
# Install dependencies
npm install

# Start in dev mode
npm run dev

# Build renderer + main
npm run build

# Package for current platform
npm run package

# Package for Windows only
npm run package:win
```

---

## Download (Releases)

Grab the latest `.exe` installer from the [Releases](../../releases) page — built automatically by GitHub Actions on every tag push.

---

## Building a Release

Push a tag and GitHub Actions handles the rest:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers a Windows build and creates a GitHub Release with the `.exe` attached.

---

## Project Structure

```
src/
├── main/           # Electron main process (database, IPC, tray)
│   ├── index.ts    # App bootstrap + all IPC handlers
│   └── database.ts # better-sqlite3 layer (tasks, settings, focus sessions, stats)
├── preload/
│   └── index.ts    # contextBridge API exposed to renderer
└── renderer/
    └── src/
        ├── App.tsx          # Root shell with sidebar navigation
        ├── context/
        │   └── AppContext.tsx  # Global state & all app actions
        ├── screens/
        │   ├── TodayScreen.tsx   # Task schedule, add/edit/complete/skip/extend
        │   ├── FocusScreen.tsx   # Animated timer ring, focus mode
        │   ├── StatsScreen.tsx   # Stats, heatmap, milestones
        │   ├── SettingsScreen.tsx
        │   ├── ProfileScreen.tsx
        │   ├── ReportsScreen.tsx
        │   ├── ActiveScreen.tsx
        │   └── OnboardingScreen.tsx
        └── services/
            └── taskService.ts  # Pure task helpers (factory, status, timing)
```

---

## License

MIT
