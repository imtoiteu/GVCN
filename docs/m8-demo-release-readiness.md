# M8 — Demo Polish · Runtime Smoke Check · Release Readiness

> Session scope: prepare the M0–M7 MVP for **manual demo/review** without adding major features.
> Rebuild the Linux bundle after M7, ship a demo-usable `README.md` + a manual GUI
> **demo checklist**, re-verify safety of exported filenames/text, and document exactly what
> still needs a real desktop. **No** new product features.
>
> Note on numbering: `tasks/plan.md` labels the *Claude Export (anonymized)* slice as **M8** and
> *Polish/review/security* as **M9**. This session is the **release-readiness** pass (plan's M9
> content) and **defers** Claude Export — see "Claude Export decision" below.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2, Rust stable.

## What was done

| Item | Outcome |
|------|---------|
| Rebuild Linux bundle after M7 | `npm run tauri build` re-run; `.deb` + `.rpm` paths reported below. |
| `README.md` (demo usage) | Rewritten from the Tauri template stub → install/build/dev commands, demo workflow, known limitations (Vietnamese-first). |
| `docs/demo-checklist.md` | **New** reproducible offline manual GUI test (launch → 8A → import → week → comments → messages → minutes/reports → export DOCX/XLSX/PDF → reopen/persist → safety spot-check). |
| Demo-data notes | Demo class **8A** = 12 fake students (`8A-01`…`8A-12`) + 2 demo weeks (`src/lib/db/seed.ts`); documented in README. No real PII. |
| Export safety re-check | No phone/address/grade patterns in `src/` or migrations; only `8A-NN` codes in seed; ASCII-slug filenames + diacritics-intact DOCX already asserted by the M7 test suite. |
| Claude Export (plan M8) | **Deferred** (rationale below). "Claude Export" nav slot stays a placeholder. |

## Claude Export decision — deferred (not silently skipped)

The optional item was: add the anonymized "Claude Export" *only if already in the plan and doable
without expanding scope; defer if it risks delaying release readiness.* It **is** in the plan
(plan.md §M8), but it is also the product's **single highest-risk feature**: a summary intended to
leave the app (manual paste into Claude). The plan mandates a dedicated `lib/export/anonymize.ts`
**PII boundary** gated by a **no-PII test** (asserts no name/phone/address/grade leaks — only
`student_code`). That safety bar deserves its own focused TDD milestone rather than being squeezed
into a release-readiness pass; rushing it would contradict CLAUDE.md ("never skip verification",
"never send real student data"). **Decision: defer to the next milestone** and keep this session
strictly about making the existing, already-verified surface demo-ready.

## Verification

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ Exit 0. |
| `npm run test` (`vitest run`) | ✅ **100 passed** (17 files). |
| `npm run build` | ✅ Exit 0; bundle 1,271.66 kB / 367.18 kB gzip; CSS 5.05 kB (pre-existing chunk-size warning). |
| `cd src-tauri && cargo check` | ✅ Finished, 0 errors. |
| `npm audit` | ✅ 0 vulnerabilities. |
| `npm run tauri build` | ⚠️ **`.deb` + `.rpm` produced OK** (paths below). The `.AppImage` target (also attempted because `bundle.targets: "all"`) **failed on this VPS** — `xdg-open` binary not installed — an environment limitation, not an app/code problem. The two requested Linux packages completed before that step. |

**Dependencies added: none.** No code changes to `src/` runtime or the Rust shell — this milestone
is docs + a rebuild.

### Final Linux bundle paths

```
src-tauri/target/release/bundle/deb/gvcn-autoreport_0.1.0_amd64.deb   (6,104,478 bytes)
src-tauri/target/release/bundle/rpm/gvcn-autoreport-0.1.0-1.x86_64.rpm (6,107,203 bytes)
src-tauri/target/release/gvcn-autoreport                              (17,219,512 bytes, binary)
```

Validated without installing: `dpkg-deb -I` → `Package: gvcn-autoreport, Version: 0.1.0,
Architecture: amd64`; `dpkg-deb -c` shows the package embeds `usr/bin/gvcn-autoreport` +
`usr/share/applications/gvcn-autoreport.desktop`; `file` confirms the `.rpm` is `RPM v3.0 bin`.

> **AppImage not produced.** `bundle.targets` is `"all"`, so Tauri also tried the `.AppImage`
> target and failed with `xdg-open binary not found` — `xdg-open` isn't installed on this headless
> VPS. This is a host tooling gap, not a build/code defect (the `.deb`/`.rpm` already succeeded). To
> also emit an AppImage here, install `xdg-utils`; or narrow `bundle.targets` to `["deb","rpm"]` if
> AppImage isn't wanted. Left as-is to keep cross-platform defaults intact.

## Still requires manual GUI testing on a desktop (headless-VPS limits)

The VPS has no display/WebKitGTK, so these are left as the **one manual pass** (see
[`demo-checklist.md`](demo-checklist.md)):

- **SQLite persistence** — first-run DB creation and "reopen app → data still there".
- **File download wiring** — DOCX/XLSX actually downloading from the webview.
- **Print → PDF** — the webview print dialog → "Save as PDF".
- **Open exported files** — DOCX in Word/LibreOffice, XLSX in Excel/Calc, PDF in a viewer, with
  diacritics + layout correct. (Byte/CRC integrity already verified in M7 via `unzip -t`.)
- **Window/nav** — 1200×800 window, sidebar navigation across all screens.

## Remaining risks / deferred

- **Claude Export (anonymized) not yet built** — next milestone; the M7 `ExportModel` + `asciiSlug`
  give it a foundation, but anonymization must run *before* any model is built for that path.
- **Cross-OS packaging** — only Linux `.deb`/`.rpm` built here; macOS `.dmg` / Windows `.exe`/`.msi`
  need their own OS or per-OS CI (not in MVP scope).
- **ESLint not configured**; `typecheck --strict` covers static checks for now.
- **PDF fidelity** depends on the print engine; **DOCX** is intentionally minimal; **save** uses a
  Blob download, not a native dialog (all documented upgrade paths in `docs/m7-exports.md`).
- **Tag taxonomy (Risk #3)** still provisional pending teacher sign-off.

## MVP readiness

The MVP is **ready for manual demo testing on a desktop**: all logic paths are unit-tested
(100 passed), the app builds (web + Linux bundle), audit is clean, and the demo flow is documented
end-to-end. The only outstanding work before a confident demo is the **single manual GUI pass** in
`docs/demo-checklist.md` on a machine with a display.

## Next recommended milestone

**M8 (plan) — Claude Export (anonymized):** `src/lib/export/anonymize.ts` single PII boundary +
"Claude Export" screen → student-code-only summary to clipboard, gated by a no-PII test. Then
**M9 — review/security skills pass** against SPEC §8 acceptance criteria for sign-off.
</content>
