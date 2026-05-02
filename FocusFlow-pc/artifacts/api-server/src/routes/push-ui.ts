import { Router } from "express";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const router = Router();

const OWNER = "TITANICBHAI";
const REPO = "focusflow-pc";
const PROJECT_DIR = "/home/runner/workspace/focusflow-pc";
const EXCLUDE_NAMES = new Set(["node_modules", "out", "dist", ".git", "push-to-github.sh"]);

function getAllFiles(dir: string, base: string = dir): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_NAMES.has(entry)) continue;
    const full = join(dir, entry);
    const rel = relative(base, full);
    if (statSync(full).isDirectory()) {
      files.push(...getAllFiles(full, base));
    } else {
      files.push(rel);
    }
  }
  return files;
}

async function ghApi(method: string, path: string, token: string, body?: object) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "FocusFlow-Build/1.0",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

// Serve the push UI HTML page
router.get("/push", (_req, res) => {
  const files = getAllFiles(PROJECT_DIR);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FocusFlow PC — Push to GitHub</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); padding: 32px; width: 100%; max-width: 520px; }
  h1 { font-size: 20px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; }
  .badge { background: #6366f1; color: white; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
  p { font-size: 14px; color: #64748b; margin: 8px 0 20px; line-height: 1.5; }
  label { display: block; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
  input[type=text], input[type=password] { width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-family: monospace; color: #1e293b; outline: none; transition: border .15s; }
  input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .steps { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #475569; line-height: 1.8; }
  .steps a { color: #6366f1; font-weight: 600; }
  .steps code { background: #e0e7ff; color: #4f46e5; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  button { width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 16px; transition: background .15s; }
  button:hover { background: #4f46e5; }
  button:disabled { background: #94a3b8; cursor: not-allowed; }
  #log { margin-top: 20px; background: #0f172a; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 12px; color: #94a3b8; max-height: 320px; overflow-y: auto; display: none; line-height: 1.6; }
  #log .ok { color: #4ade80; }
  #log .fail { color: #f87171; }
  #log .info { color: #60a5fa; }
  .file-count { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 8px; }
  .success-banner { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px 16px; color: #166534; font-size: 13px; font-weight: 600; margin-top: 16px; display: none; }
  .success-banner a { color: #15803d; }
  .error-banner { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 14px 16px; color: #991b1b; font-size: 13px; font-weight: 600; margin-top: 16px; display: none; }
</style>
</head>
<body>
<div class="card">
  <h1>🚀 FocusFlow PC <span class="badge">GitHub Push</span></h1>
  <p>Paste a fresh GitHub Personal Access Token below to push all <strong>${files.length} files</strong> to <strong>TITANICBHAI/focusflow-pc</strong>.</p>

  <div class="steps">
    <strong>Generate a new token in 30 seconds:</strong><br>
    1. <a href="https://github.com/settings/tokens/new" target="_blank">github.com/settings/tokens/new</a><br>
    2. Note: <code>focusflow-pc</code> · Expiry: 90 days<br>
    3. Scopes: ✅ <code>repo</code> (all) + ✅ <code>workflow</code><br>
    4. Click "Generate token" → copy the <code>ghp_…</code> value
  </div>

  <label for="token">GitHub Personal Access Token</label>
  <input type="password" id="token" placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off" spellcheck="false">

  <button id="pushBtn" onclick="startPush()">🚀 Push ${files.length} files to GitHub</button>
  <div class="file-count">Ready: ${files.length} files · Repo: github.com/${OWNER}/${REPO}</div>

  <div class="success-banner" id="successBanner"></div>
  <div class="error-banner" id="errorBanner"></div>
  <div id="log"></div>
</div>

<script>
async function startPush() {
  const token = document.getElementById('token').value.trim();
  if (!token || !token.startsWith('ghp_')) {
    alert('Please enter a valid GitHub token (starts with ghp_)');
    return;
  }

  const btn = document.getElementById('pushBtn');
  const log = document.getElementById('log');
  const successBanner = document.getElementById('successBanner');
  const errorBanner = document.getElementById('errorBanner');

  btn.disabled = true;
  btn.textContent = '⏳ Pushing...';
  log.style.display = 'block';
  log.innerHTML = '<span class="info">Starting push to GitHub...</span>\\n';
  successBanner.style.display = 'none';
  errorBanner.style.display = 'none';

  try {
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(300000)
    });
    const data = await res.json();

    if (data.log) {
      log.innerHTML = '';
      data.log.forEach(line => {
        const cls = line.includes('✅') ? 'ok' : line.includes('❌') ? 'fail' : 'info';
        log.innerHTML += \`<span class="\${cls}">\${escHtml(line)}</span>\\n\`;
      });
      log.scrollTop = log.scrollHeight;
    }

    if (data.success) {
      btn.textContent = '✅ Done!';
      successBanner.style.display = 'block';
      successBanner.innerHTML = \`✅ Pushed \${data.uploaded} files! · <a href="\${data.repoUrl}" target="_blank">View repo</a> · <a href="\${data.actionsUrl}" target="_blank">Watch CI build .exe →</a>\`;
    } else {
      btn.textContent = '❌ Failed';
      btn.disabled = false;
      errorBanner.style.display = 'block';
      errorBanner.textContent = 'Error: ' + (data.error || 'Unknown error') + (data.detail ? ' — ' + data.detail : '');
    }
  } catch(e) {
    btn.textContent = '❌ Failed — retry';
    btn.disabled = false;
    errorBanner.style.display = 'block';
    errorBanner.textContent = 'Network error: ' + e.message;
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.getElementById('token').addEventListener('keydown', e => {
  if (e.key === 'Enter') startPush();
});
</script>
</body>
</html>`);
});

// Handle the actual push
router.post("/push", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token?.trim().startsWith("ghp_")) {
    res.status(400).json({ error: "Invalid token — must start with ghp_" });
    return;
  }

  const tk = token.trim();
  const log: string[] = [];
  const push = (msg: string) => { log.push(msg); req.log.info(msg); };

  try {
    push(`Authenticating with GitHub...`);
    const user = await ghApi("GET", "/user", tk);
    if (user.status !== 200) {
      res.json({ success: false, error: "Bad credentials", detail: user.data?.message, log });
      return;
    }
    push(`✅ Authenticated as: ${user.data.login}`);

    push(`Creating repo ${OWNER}/${REPO}...`);
    const create = await ghApi("POST", "/user/repos", tk, {
      name: REPO,
      description: "FocusFlow PC — Electron desktop app (React + TypeScript + SQLite). Auto-builds Windows .exe via GitHub Actions.",
      private: false,
      auto_init: false,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
    });
    if (create.status === 201) push(`✅ Repo created: https://github.com/${OWNER}/${REPO}`);
    else if (create.status === 422) push(`ℹ️  Repo already exists — uploading files...`);
    else {
      res.json({ success: false, error: "Create repo failed", detail: create.data?.message, log });
      return;
    }

    const files = getAllFiles(PROJECT_DIR);
    push(`📤 Uploading ${files.length} files...`);

    let ok = 0;
    const failed: string[] = [];

    for (const rel of files) {
      const fullPath = join(PROJECT_DIR, rel);
      const isBinary = /\.(png|ico|icns|jpg|jpeg|gif|woff|woff2|ttf|eot|zip|exe)$/.test(rel);
      let content: string;
      try {
        content = isBinary
          ? readFileSync(fullPath).toString("base64")
          : Buffer.from(readFileSync(fullPath, "utf8")).toString("base64");
      } catch {
        push(`  ❌ ${rel} — read error`);
        failed.push(rel);
        continue;
      }

      const apiPath = `/repos/${OWNER}/${REPO}/contents/${rel.replace(/\\/g, "/")}`;
      const existing = await ghApi("GET", apiPath, tk);
      const body: Record<string, string> = { message: `feat: add ${rel.replace(/\\/g, "/")}`, content };
      if (existing.status === 200 && existing.data?.sha) body["sha"] = existing.data.sha;

      const result = await ghApi("PUT", apiPath, tk, body);
      if (result.status === 201 || result.status === 200) {
        push(`  ✅ ${rel}`);
        ok++;
      } else {
        push(`  ❌ ${rel} — ${result.data?.message || result.status}`);
        failed.push(rel);
      }
      await new Promise((r) => setTimeout(r, 80));
    }

    push(`\n🎉 Done! ${ok} uploaded, ${failed.length} failed.`);
    res.json({
      success: true,
      uploaded: ok,
      failed: failed.length,
      failedFiles: failed,
      repoUrl: `https://github.com/${OWNER}/${REPO}`,
      actionsUrl: `https://github.com/${OWNER}/${REPO}/actions`,
      log,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg, log });
  }
});

export default router;
