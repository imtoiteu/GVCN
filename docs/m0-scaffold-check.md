# M0 — Scaffold Check

> Session scope: **baseline hygiene only.** Fix the known config bug, confirm the
> Tauri + React + TypeScript scaffold builds cleanly, document environment gaps.
> No product features (DB, UI, import/export, generators) started. See
> [`../SPEC.md`](../SPEC.md) and [`../tasks/plan.md`](../tasks/plan.md).
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What was fixed / changed

| File | Change | Why |
|------|--------|-----|
| `src-tauri/tauri.conf.json` | `identifier`: `"mkdir -p .claude/skills"` → `"vn.gvcn.autoreport"` | Scaffold copy-paste bug; invalid bundle identifier would break `tauri build` (SPEC Risk #1). |
| `src-tauri/tauri.conf.json` | Main window `800×600` → `1200×800`; title `"gvcn-autoreport"` → `"GVCN AutoReport"` | Roomier default for tables/forms (SPEC Risk #2); proper app name. |
| `index.html` | `<title>` → `GVCN AutoReport`; `lang="en"` → `lang="vi"` | Remove scaffold placeholder; app is Vietnamese-first. |
| `package.json` | Added script `"typecheck": "tsc --noEmit"` | Expected basic command; **zero new dependencies** (uses existing TypeScript). |

**Deliberately NOT done this session** (deferred to the full M0 dependency work):
`test` / `lint` scripts and their libraries (Vitest, ESLint), Tailwind/shadcn/ui,
TanStack Table, RHF/Zod, `@tauri-apps/plugin-sql`, SheetJS, docxtemplater, app shell,
SQLite schema, and DAL. Per the session constraint "do not add unnecessary libraries yet."

## Commands run & results

| Command | Result |
|---------|--------|
| `npm install` | ✅ 72 packages added, audited 73, **0 vulnerabilities** (~27s). |
| `node -e` JSON parse of `tauri.conf.json` | ✅ Valid JSON. `identifier=vn.gvcn.autoreport`, window `1200×800`. |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0, no type errors. |
| `npm run build` (`tsc && vite build`) | ✅ Built in ~3s; 32 modules; emitted `dist/` (index.html + assets). |

The existing scaffold scripts `dev`, `build`, `preview`, `tauri` are present and valid.

## Environment limitations (could NOT run here)

| Check | Blocked because | Run later on local Mac |
|-------|-----------------|------------------------|
| `cargo check` / Rust compile of `src-tauri` | No Rust toolchain on this VPS (`cargo`/`rustc` not found). | `rustup` installed → `cd src-tauri && cargo check` |
| `npm run tauri dev` | Needs Rust + a GUI/WebKit (WebKitGTK) display; headless VPS has neither. | `npm run tauri dev` (verify window opens at 1200×800, titled "GVCN AutoReport") |
| `npm run tauri build` | Same as above + platform bundling toolchain. | `npm run tauri build` (verify bundle uses identifier `vn.gvcn.autoreport`) |

The web/TypeScript half of the toolchain is fully verified; only the Rust/desktop half
is unverified and must be confirmed on a developer machine before relying on `tauri dev/build`.

## Remaining risks / notes

- **Tauri config not yet exercised by a real `tauri` invocation** — JSON is valid and the
  identifier is now a proper reverse-DNS string, but only a local `cargo check` / `tauri dev`
  will confirm the Rust side compiles against it. (Low risk; standard scaffold.)
- **`test`/`lint` still unconfigured** — intentionally deferred; tracked as the partial
  item in `tasks/todo.md` M0. They land with the dependency-install step at the start of
  the full M0 build.
- Other SPEC risks (#3 tag taxonomy, #5 DOCX template, #6 SheetJS edition) are unaffected
  by this session and remain open in SPEC §14.

## Next recommended step

Proceed to the **remaining M0 tasks** (dependency install + `test`/`lint` config →
app shell/routing → SQLite plugin, schema, seed tags → typed DAL), gated by Checkpoint A,
**after** a local Mac run confirms `cargo check` and `npm run tauri dev` succeed with the
corrected config.
