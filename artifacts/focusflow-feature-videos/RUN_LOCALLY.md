# Running FocusFlow Feature Videos Locally

## Prerequisites

- [Node.js 18+](https://nodejs.org/) — download and install the LTS version
- [pnpm](https://pnpm.io/) — install after Node.js by running:
  ```
  npm install -g pnpm
  ```

## Steps

**1. Clone the repo**
```
git clone https://github.com/TITANICBHAI/FocusFlow.git
cd FocusFlow
```

**2. Install dependencies**
```
pnpm install
```

**3. Start the feature videos app**
```
pnpm --filter @workspace/focusflow-feature-videos run dev
```

**4. Open in browser**
```
http://localhost:6000
```

That's it. The app hot-reloads on save so any edits you make show up instantly.

## Building for production (optional)

If you want a static build you can open directly from a file or upload anywhere:
```
pnpm --filter @workspace/focusflow-feature-videos run build
```
Output goes to `artifacts/focusflow-feature-videos/dist/public/`.
Open `dist/public/index.html` in any browser or serve it with:
```
npx serve dist/public
```
