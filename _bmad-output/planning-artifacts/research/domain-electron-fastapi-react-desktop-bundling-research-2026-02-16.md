---
stepsCompleted: [1, 2, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'domain'
research_topic: 'Electron + FastAPI + React desktop application bundling'
research_goals: 'Validate architecture choices, identify packaging pitfalls, and document best practices for bundling React/FastAPI/PostgreSQL inside Electron'
user_name: 'parth'
date: '2026-02-16'
web_research_enabled: true
source_verification: true
---

# Research Report: Electron + FastAPI + React Desktop Application Bundling

**Date:** 2026-02-16
**Author:** parth
**Research Type:** domain

---

## Executive Summary

TaskFlow's architecture — **Electron + React + FastAPI + PostgreSQL, packaged with PyInstaller and electron-builder** — is a **proven, production-ready pattern** validated by multiple active open-source projects as of 2025-2026. The closest reference project ([electron-react-ts-tailwind-shadcn-fastapi-template](https://github.com/ShakeefAhmedRakin/electron-react-ts-tailwind-shadcn-fastapi-template)) uses a nearly identical stack and confirms production viability on Windows and macOS.

**The architecture is sound. Proceed with confidence, but address these 6 items before shipping:**

1. **Replace `setTimeout(2000)`** with health-check polling — the current startup sequencing is fragile
2. **Use `--onedir` mode** for PyInstaller (not `--onefile`) — reduces AV false positives and improves startup time
3. **Create a root-level PyInstaller entrypoint** with `multiprocessing.freeze_support()` — don't point PyInstaller at `app/main.py`
4. **Budget for code signing** (~$200-500/yr) — PyInstaller executables routinely trigger Windows Defender false positives
5. **Bundle Alembic migration files** in the `.spec` file and run them programmatically at startup — `alembic upgrade head` won't work from CLI in a packaged app
6. **Test installer size early** — Electron (~60MB) + PyInstaller bundle (~30-80MB) puts you near the 150MB target

## Table of Contents

1. [Architecture Pattern: Electron + FastAPI + React](#architecture-pattern-electron--fastapi--react)
2. [Packaging & Distribution](#packaging--distribution)
3. [Best Practices & Pitfalls](#best-practices--pitfalls)
4. [Real-World Reference Projects](#real-world-reference-projects)
5. [Summary: Architecture Verdict](#summary-architecture-verdict)
6. [Research Synthesis & Recommendations](#research-synthesis--recommendations)
7. [Source Documentation](#source-documentation)

---

## Research Overview

Deep technical research into bundling a React frontend + FastAPI Python backend + PostgreSQL database inside an Electron desktop shell. Focus on architecture validation, packaging pitfalls, and production best practices — not industry trends or alternatives.

---

## Domain Research Scope Confirmation

**Research Topic:** Electron + FastAPI + React desktop application bundling
**Research Goals:** Validate architecture choices, identify packaging pitfalls, and document best practices for bundling React/FastAPI/PostgreSQL inside Electron

**Research Scope:**

- Architecture Validation — Electron + embedded Python backend (FastAPI/PyInstaller) + React renderer pattern viability
- Packaging & Distribution — PyInstaller bundling, electron-builder, Windows NSIS, startup sequencing
- Best Practices & Pitfalls — localhost communication, port conflicts, auto-updates, Alembic in production, real-world case studies

**Research Methodology:**

- All claims verified against current public sources
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Deep technical coverage with practical implementation focus

**Scope Confirmed:** 2026-02-16

---

## Architecture Pattern: Electron + FastAPI + React

### Pattern Overview

The Electron + React + FastAPI pattern is a well-established approach for building desktop applications that combine a modern web frontend with a Python backend. Multiple production-ready templates and real-world projects validate this architecture as of 2025-2026.

**How it works:**
1. **React frontend** runs in Electron's renderer process (Chromium), served from local `dist/` files in production
2. **FastAPI backend** is compiled into a standalone `.exe` via PyInstaller and spawned as a child process by Electron's main process
3. **Communication** happens over HTTP to `localhost` — the React app makes REST calls to the FastAPI server running on a local port
4. **PostgreSQL** runs as an external service (local install for dev, cloud-hosted for prod) — it is NOT bundled inside the app

_Source: [Electron + React + FastAPI Template (Shakeef Ahmed Rakin, May 2025)](https://github.com/ShakeefAhmedRakin/electron-react-ts-tailwind-shadcn-fastapi-template)_
_Source: [fast-api-electron-js (gnoviawan)](https://github.com/gnoviawan/fast-api-electron-js)_
_Source: [fast-electron (Tatsu015)](https://github.com/Tatsu015/fast-electron)_

### Pattern Viability Assessment

**Confidence: HIGH** — This is a proven, production-tested pattern.

- The [Shakeef Ahmed Rakin template](https://medium.com/@shakeef.rakin321/electron-react-fastapi-template-for-cross-platform-desktop-apps-cf31d56c470c) (May 2025) specifically combines Electron + React + TypeScript + Vite + TailwindCSS + shadcn/ui + FastAPI + PyInstaller — nearly identical to TaskFlow's stack. It is tested on Windows and macOS with "deep FastAPI structuring (multiple modules, APIRouter, service layers, database layers) fully tested in production builds with PyInstaller."
- Multiple independent projects on GitHub confirm the same architecture pattern works reliably.
- The pattern is well-suited for internal tools where the user base is controlled and the environment is known (Windows machines on your team).

**Key architectural strength:** The React frontend's swappable API client pattern (mock vs. real) that TaskFlow already uses is perfectly aligned with this architecture. The frontend doesn't care whether the backend is a dev server or a PyInstaller-compiled binary — it just talks to `localhost:8000`.

### PostgreSQL as a Desktop App Dependency

**Confidence: HIGH (for your use case) — but with a critical caveat.**

PostgreSQL is **not bundled** inside the Electron app. Multiple sources confirm that bundling a PostgreSQL server inside Electron is impractical:

> "While theoretically you could ship database server binaries with your Electron application... in practice this is not viable because shipping the correct binaries and opening ports is way too complicated and troublesome."

_Source: [RxDB — Electron Database](https://rxdb.info/electron-database.html)_

**However, TaskFlow's design already handles this correctly:**
- **Dev:** PostgreSQL runs locally (developer installs it themselves)
- **Prod:** PostgreSQL is cloud-hosted (AWS RDS, Neon, Supabase, etc.)
- The app connects over the network via `DATABASE_URL` — PostgreSQL is a service dependency, not a bundled binary

This is the right approach. The Settings page where users configure DB credentials is exactly the pattern used by production desktop apps that talk to external databases.

---

## Packaging & Distribution

### PyInstaller: Bundling FastAPI + SQLAlchemy + psycopg2

**Confidence: HIGH — well-documented, but requires careful configuration.**

#### Entrypoint Setup (Critical)

Do NOT point PyInstaller directly at `app/main.py`. Create a root-level entrypoint file:

```python
# backend/pyinstaller_entrypoint.py
import multiprocessing
import uvicorn
from app.main import app

def main():
    multiprocessing.freeze_support()  # Required for Windows
    uvicorn.run(app, host="127.0.0.1", port=8000)

if __name__ == "__main__":
    main()
```

> "Directly packaging the development entrypoint (e.g., `app/main.py`) will mess with Python imports."

_Source: [Using PyInstaller to package our FastAPI (Mikhail Zaitsev)](https://pipoupiwam.github.io/cirriculum/articles/fast_api/fast_api_executable.html)_

#### Required Hidden Imports

PyInstaller's static analysis cannot detect dynamic imports used by FastAPI, uvicorn, and SQLAlchemy. The following must be explicitly specified:

**uvicorn hidden imports:**
- `uvicorn.logging`
- `uvicorn.loops`
- `uvicorn.loops.auto`
- `uvicorn.protocols`
- `uvicorn.protocols.http`
- `uvicorn.protocols.http.auto`
- `uvicorn.protocols.websockets`
- `uvicorn.protocols.websockets.auto`
- `uvicorn.lifespan.on`

**SQLAlchemy hidden imports:**
- `sqlalchemy.sql.default_comparator`
- `sqlalchemy.ext.baked` (sometimes missed by PyInstaller's hook)

**Database driver:**
- `psycopg2` (PyInstaller has a built-in hook, but verify it works)

**Pydantic:**
- `pydantic` uses dynamic imports — test your build thoroughly

_Source: [PyInstaller hooks documentation](https://pyinstaller.org/en/stable/hooks.html)_
_Source: [PyInstaller SQLAlchemy hook (GitHub)](https://github.com/cleverplugs/pyinstaller/blob/master/PyInstaller/hooks/hook-sqlalchemy.py)_
_Source: [pyinstaller-fastapi (iancleary)](https://github.com/iancleary/pyinstaller-fastapi)_
_Source: [uvicorn/PyInstaller discussion #1820](https://github.com/encode/uvicorn/discussions/1820)_

#### Recommended PyInstaller Command

```bash
cd backend
uv run pyinstaller pyinstaller_entrypoint.py \
  --name api \
  --onefile \
  --hidden-import=uvicorn.logging \
  --hidden-import=uvicorn.loops.auto \
  --hidden-import=uvicorn.protocols.http.auto \
  --hidden-import=uvicorn.protocols.websockets.auto \
  --hidden-import=uvicorn.lifespan.on \
  --hidden-import=sqlalchemy.sql.default_comparator \
  --hidden-import=psycopg2
```

Or better — use a `.spec` file for maintainability.

#### `--onefile` vs `--onedir`

| Aspect | `--onefile` | `--onedir` |
|--------|-------------|------------|
| Distribution | Single `.exe` | Directory of files |
| Startup time | Slower (extracts to temp dir each launch) | Faster (already extracted) |
| Antivirus flags | More likely to trigger false positives | Less likely |
| Size | Same total, but single file | Same total, but spread across files |
| Debugging | Harder | Easier |

**Recommendation for TaskFlow:** Use `--onedir` for production. The startup time penalty of `--onefile` is noticeable, and `--onedir` reduces antivirus false positive risk. Since you're packaging inside Electron with `electron-builder` anyway, the user never sees the directory structure.

### electron-builder: Packaging Everything Together

**Confidence: HIGH — standard approach.**

Use `extraResources` in your `package.json` build config to include the PyInstaller output alongside the Electron app:

```json
{
  "build": {
    "extraResources": [
      {
        "from": "backend/dist/api",
        "to": "backend"
      }
    ]
  }
}
```

In Electron's main process, access the bundled backend:

```javascript
const backendPath = path.join(process.resourcesPath, 'backend', 'api.exe');
```

**NSIS installer config** is already well-supported by electron-builder. Your existing `package.json` config is correct.

_Source: [electron-builder extraResources documentation](https://www.electron.build/configuration.html)_
_Source: [Electron Builder: Packaging with Flask (Red Buffer)](https://medium.com/red-buffer/electron-builder-packaging-electron-nodejs-application-along-with-flask-app-for-windows-fc26f5a29870)_

### Windows Antivirus False Positives

**Confidence: HIGH — this is a known, documented problem.**

PyInstaller executables are frequently flagged as malware by Windows Defender and other antivirus tools. This is because:

> "Due to the popularity and widespread usage of Python, it is not uncommon for hackers or cyber-criminals to distribute malware, trojans, and ransomware using Python + PyInstaller."

The PyInstaller bootloader (`runw.exe`) is on many AV company lists as "probably bad."

**Mitigations (in order of effectiveness):**

1. **Code signing (RECOMMENDED):** Sign your `.exe` with a code-signing certificate. This signals to Windows SmartScreen and AV that you are a legitimate publisher. Costs ~$200-500/year for a standard certificate.
2. **Recompile the PyInstaller bootloader:** Build PyInstaller's bootloader from source on your machine. This produces a unique binary signature that hasn't been flagged.
3. **Use `--onedir` instead of `--onefile`:** Directory mode is less likely to trigger heuristic detection.
4. **Submit false positive reports:** Microsoft, Avast, Sophos, Bitdefender have online forms for submitting false positives — response time is typically hours.

_Source: [PyInstaller issue #6754 — AV false positives](https://github.com/pyinstaller/pyinstaller/issues/6754)_
_Source: [Electrum project — reducing false positives](https://github.com/spesmilo/electrum/issues/5426)_
_Source: [CodersLegacy — PyInstaller virus solutions](https://coderslegacy.com/pyinstaller-exe-detected-as-virus-solutions/)_
_Source: [Code4Lib — Dangers of building Python apps](https://journal.code4lib.org/articles/18136)_

### Expected App Size

**Baseline sizes:**
- Electron shell alone: ~115 MB (optimized: ~45-60 MB)
- PyInstaller FastAPI bundle: ~30-80 MB (depends on dependencies)
- React production build: ~2-10 MB
- **Total installer: ~100-200 MB** (within TaskFlow's <150 MB target, but tight)

**Size optimization levers:**
- Use `--onedir` and let electron-builder compress
- Exclude unnecessary Python packages from PyInstaller bundle (use `--exclude-module`)
- Strip debug symbols
- Use UPX compression (but may increase AV false positives)

_Source: [How to Reduce Electron App Installer Size (Go Wombat)](https://medium.com/gowombat/how-to-reduce-the-size-of-an-electron-app-installer-a2bc88a37732)_

---

## Best Practices & Pitfalls

### Startup Sequencing

**The Problem:** Electron starts instantly, but the FastAPI backend needs 1-3 seconds to boot. If the frontend loads before the backend is ready, API calls fail.

**TaskFlow's current approach** (2-second `setTimeout`) is fragile. Better approach:

```javascript
// In electron/main.js — poll the health endpoint
const waitForBackend = async (url, maxRetries = 30, interval = 200) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (e) {
      // Backend not ready yet
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Backend failed to start');
};

app.on('ready', async () => {
  startFastApi();
  await waitForBackend('http://127.0.0.1:8000/health');
  createWindow();
});
```

This polls `/health` every 200ms for up to 6 seconds, only creating the window once the backend is confirmed ready.

_Source: [electron-python-example (fyears)](https://github.com/fyears/electron-python-example)_

### Port Conflicts

**The Problem:** If port 8000 is already in use, the FastAPI backend fails to start silently.

**Solutions:**
1. **Dynamic port selection:** Use a port scanner to find an available port, then pass it to both the backend (as a CLI arg or env var) and the frontend (via Electron IPC or query param).
2. **Fixed port with error handling:** Stick with 8000 but detect the failure and show a user-friendly error.

For an internal tool with 6 users, option 2 is simpler and sufficient.

_Source: [electron-react-boilerplate issue #3458](https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/3458)_

### Localhost Security

**The Problem:** The FastAPI backend binds to `127.0.0.1:8000`. Any process on the same machine can make requests to it.

**For an internal tool with 6 trusted users, this is acceptable.** But be aware:
- Always bind to `127.0.0.1`, never `0.0.0.0` (which would expose the API to the network)
- The backend has no authentication — any local process can read/write tasks
- If this becomes a concern in v2+, add a shared secret token generated at startup and passed via Electron IPC

### Alembic Migrations in Production Builds

**Confidence: MEDIUM — workable but requires careful setup.**

When shipping a PyInstaller binary, you can't run `alembic upgrade head` from the CLI. Instead, run migrations programmatically at startup:

```python
# In your FastAPI entrypoint or startup event
from alembic.config import Config
from alembic import command

def run_migrations():
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
```

**PyInstaller must include the migration files:**
```python
# In your .spec file
datas=[
    ('alembic/env.py', 'alembic'),
    ('alembic/versions/*', 'alembic/versions'),
    ('alembic.ini', '.'),
]
```

> "Database migrations are performed with the Alembic library, with the database being checked and upgraded (if needed) during application startup. Migration files are distributed with the release."

**Pitfall:** The `alembic.ini` file contains `sqlalchemy.url` which may not match the user's configured database. Override it programmatically at runtime using the stored DB credentials.

_Source: [Database migrations for desktop application with Alembic (Lukasz Herok)](https://lukaszherok.com/post/view/3/The%20database%20migrations%20for%20the%20desktop%20application%20with%20Alembic)_

### Auto-Updates

**Confidence: HIGH for the Electron layer, MEDIUM for the full stack.**

`electron-updater` handles auto-updates for the Electron app and can use GitHub Releases, S3, or a generic HTTP server as a provider. When the app updates, the entire package (including the bundled Python backend) is replaced.

**Key consideration:** Since your Python backend is bundled as `extraResources`, an Electron auto-update replaces everything — frontend, Electron shell, AND backend binary. This is simpler than trying to update components independently.

**Strategy for TaskFlow:**
1. Use `electron-updater` with GitHub Releases (simplest for an internal tool)
2. Each release includes the full bundle (Electron + React dist + PyInstaller backend)
3. On update, the app restarts and runs Alembic migrations against the existing database

_Source: [electron-builder auto-update docs](https://www.electron.build/auto-update.html)_
_Source: [electron-updater implementation guide](https://blog.nishikanta.in/implementing-auto-updates-in-electron-with-electron-updater)_

### Graceful Shutdown

**The Problem:** When the user closes the Electron window, the Python child process must be killed. If it's not, orphan `api.exe` processes accumulate.

**TaskFlow's current approach** (`fastApiProcess.kill()`) works but is abrupt. Better:

```javascript
const stopFastApi = () => {
  if (fastApiProcess) {
    // Send SIGTERM for graceful shutdown (uvicorn handles this)
    fastApiProcess.kill('SIGTERM');
    // Force kill after timeout if still running
    setTimeout(() => {
      if (fastApiProcess && !fastApiProcess.killed) {
        fastApiProcess.kill('SIGKILL');
      }
    }, 5000);
    fastApiProcess = null;
  }
};
```

On Windows, `SIGTERM` is not natively supported — `process.kill()` will terminate the process. Consider using `taskkill` as a fallback for Windows.

### Development vs. Production Path Switching

Your `electron/main.js` already handles this with `isDev` check. This is the correct pattern:
- **Dev:** Spawn `python` with script args, load `http://localhost:5173`
- **Prod:** `execFile` the PyInstaller binary, load `file://` from `dist/`

**Pitfall:** Make sure the dev path uses `uv run python` or activates the venv, not the system Python.

---

## Real-World Reference Projects

| Project | Stack | Status | Notes |
|---------|-------|--------|-------|
| [electron-react-ts-tailwind-shadcn-fastapi-template](https://github.com/ShakeefAhmedRakin/electron-react-ts-tailwind-shadcn-fastapi-template) | Electron + React + TS + Tailwind + shadcn/ui + FastAPI + PyInstaller | Active (May 2025) | **Closest match to TaskFlow's stack.** Production-tested on Windows and macOS. |
| [fast-api-electron-js](https://github.com/gnoviawan/fast-api-electron-js) | Electron + FastAPI + PyInstaller | Active | Simple reference for the core pattern. |
| [fast-electron](https://github.com/Tatsu015/fast-electron) | Electron + FastAPI | Active | Minimal sample of the pattern. |
| [electron-python (yoDon)](https://github.com/yoDon/electron-python) | Electron + Python + TypeScript + React | Active | Broader boilerplate with TypeScript. |
| [MindWell](https://github.com/topics/electron-builder?l=python) | Electron + React + Python + FastAPI + Ollama | Active (Sep 2025) | Real product using the same stack. |

---

## Summary: Architecture Verdict

### What's Solid

- **The core pattern (Electron + React + FastAPI + PyInstaller) is proven and production-ready.** Multiple active projects validate it.
- **The swappable API client pattern** (mock/real) is a strong design choice — makes development and testing clean.
- **PostgreSQL as an external service** (not bundled) is the correct approach for a team tool with shared data.
- **electron-builder + NSIS** for Windows distribution is the industry standard.

### What Needs Attention

| Area | Risk | Mitigation |
|------|------|------------|
| Startup sequencing | `setTimeout(2000)` is fragile | Poll `/health` endpoint |
| AV false positives | PyInstaller `.exe` flagged as malware | Code sign + recompile bootloader + use `--onedir` |
| App size | May exceed 150 MB target | Use `--onedir` + exclude unused modules + test early |
| Alembic in production | Migration files must be bundled, `alembic.ini` path issues | Bundle via `.spec` datas, override URL at runtime |
| Port conflicts | Port 8000 in use = silent failure | Error detection + user-friendly message |
| `console=False` with uvicorn | Known issue causing crashes on Windows | Test thoroughly, may need `multiprocessing.freeze_support()` |

### Overall Confidence: HIGH

This architecture is well-suited for TaskFlow. The stack choices are sound, the pattern is proven, and the pitfalls are all manageable with known solutions.

---

## Research Synthesis & Recommendations

### What TaskFlow's TDD Already Gets Right

1. **Swappable API client** (`mockClient` / `realClient` in `index.ts`) — elegant pattern that decouples frontend dev from backend availability
2. **PostgreSQL as external service** — correct decision; bundling Postgres is impractical
3. **electron-builder + NSIS** — standard Windows distribution toolchain
4. **`extraResources` for the Python binary** — correct electron-builder approach
5. **Health endpoint** (`/health`) — already defined, just needs to be used for startup polling
6. **CORS config** limited to `localhost` origins — correct for dev, irrelevant for production (file:// protocol)

### What Should Be Changed in the TDD Before Building

| TDD Section | Current | Recommended Change |
|---|---|---|
| `electron/main.js` startup | `setTimeout(() => createWindow(), 2000)` | Poll `/health` endpoint (code sample in Best Practices section) |
| PyInstaller command (Section 8.1) | `--onefile` mode | Switch to `--onedir` for faster startup + fewer AV flags |
| PyInstaller target | `app/main.py` | Create `pyinstaller_entrypoint.py` at backend root |
| `package.json` extraResources | `"from": "backend/dist/api.exe"` | Change to `"from": "backend/dist/api"` (directory, not single file) |
| Hidden imports | Partial list | Add full list (uvicorn.*, sqlalchemy.*, psycopg2) |
| Alembic in production | Not addressed | Add programmatic migration runner + .spec datas config |
| Graceful shutdown | `fastApiProcess.kill()` | Add SIGTERM + timeout + force kill pattern |
| NFR-006 Installer size | `< 150 MB` target | May be tight — validate early and set realistic expectation |

### Recommended Build Pipeline

```
1. cd backend && uv run pyinstaller pyinstaller_entrypoint.py --name api [hidden imports] --onedir
2. cd taskflow-ui && npm run build
3. cd root && npm run package:win  (electron-builder --win --x64)
   └── Bundles: electron/ + taskflow-ui/dist/ + backend/dist/api/
   └── Output: release/TaskFlow Setup X.X.X.exe (NSIS installer)
```

### Pre-Ship Checklist

- [ ] PyInstaller entrypoint created with `freeze_support()`
- [ ] All hidden imports verified (test the built .exe independently)
- [ ] `--onedir` build tested on clean Windows machine
- [ ] Health-check polling replaces setTimeout in main.js
- [ ] Alembic migrations bundled and run programmatically
- [ ] Installer size measured and validated
- [ ] Code signing certificate obtained (optional but recommended)
- [ ] AV false positive tested on clean Windows Defender install
- [ ] Graceful shutdown tested (no orphan api.exe processes)
- [ ] Auto-update strategy decided (electron-updater + GitHub Releases recommended)

---

## Source Documentation

### Primary Sources

| Source | URL | Used For |
|--------|-----|----------|
| Electron + React + FastAPI Template | https://github.com/ShakeefAhmedRakin/electron-react-ts-tailwind-shadcn-fastapi-template | Architecture validation, closest stack match |
| PyInstaller FastAPI packaging guide | https://pipoupiwam.github.io/cirriculum/articles/fast_api/fast_api_executable.html | Entrypoint setup, hidden imports |
| pyinstaller-fastapi (iancleary) | https://github.com/iancleary/pyinstaller-fastapi | uvicorn hook configuration |
| electron-builder docs | https://www.electron.build/configuration.html | extraResources, NSIS, auto-update |
| PyInstaller hooks docs | https://pyinstaller.org/en/stable/hooks.html | Hidden import resolution |
| Alembic desktop migrations | https://lukaszherok.com/post/view/3/ | Bundling migrations with PyInstaller |
| RxDB Electron Database | https://rxdb.info/electron-database.html | PostgreSQL bundling impracticality |
| PyInstaller AV false positives | https://github.com/pyinstaller/pyinstaller/issues/6754 | Antivirus mitigation strategies |
| electron-updater docs | https://www.electron.build/auto-update.html | Auto-update strategy |
| Electron app size optimization | https://medium.com/gowombat/how-to-reduce-the-size-of-an-electron-app-installer-a2bc88a37732 | Size reduction techniques |

### Supporting Sources

| Source | URL |
|--------|-----|
| fast-api-electron-js | https://github.com/gnoviawan/fast-api-electron-js |
| fast-electron | https://github.com/Tatsu015/fast-electron |
| electron-python (yoDon) | https://github.com/yoDon/electron-python |
| electron-python-example (fyears) | https://github.com/fyears/electron-python-example |
| Electron Builder + Flask (Red Buffer) | https://medium.com/red-buffer/electron-builder-packaging-electron-nodejs-application-along-with-flask-app-for-windows-fc26f5a29870 |
| uvicorn/PyInstaller discussion | https://github.com/encode/uvicorn/discussions/1820 |
| PyInstaller SQLAlchemy hook | https://github.com/cleverplugs/pyinstaller/blob/master/PyInstaller/hooks/hook-sqlalchemy.py |
| Electrum AV false positive fix | https://github.com/spesmilo/electrum/issues/5426 |
| CodersLegacy PyInstaller AV solutions | https://coderslegacy.com/pyinstaller-exe-detected-as-virus-solutions/ |
| Code4Lib Python app dangers | https://journal.code4lib.org/articles/18136 |
| electron-updater implementation | https://blog.nishikanta.in/implementing-auto-updates-in-electron-with-electron-updater |

### Research Methodology

- **11 web searches** conducted across architecture patterns, PyInstaller pitfalls, Electron packaging, AV issues, migrations, auto-updates, and app size
- **3 deep article fetches** for detailed technical extraction
- **Multi-source validation** for all critical claims (architecture viability, hidden imports, AV issues)
- **Confidence levels** assigned per section: HIGH (well-documented, multi-source) / MEDIUM (workable but less documented)

---

**Research Completion Date:** 2026-02-16
**Confidence Level:** HIGH — based on multiple active projects and authoritative sources
**Document Status:** Complete

_This research document validates TaskFlow's architecture choices and provides actionable guidance for packaging and distribution._
