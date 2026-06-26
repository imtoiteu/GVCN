# M8.1 — i18n Audit + Vietnamese/English UI Support

> Small release-polish task: make the **UI chrome** bilingual (Vietnamese default + English
> secondary) with a language switcher, while keeping all **generated GVCN documents Vietnamese**.
> No i18n framework, no external translation APIs, no business/generation-logic changes.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## Audit result (before)

The app was **Vietnamese-only**. UI copy lived in a single flat `t` object in `src/app/i18n.ts`,
imported directly by 9 files, plus six label helpers. There was **no locale concept**. Stray
hardcoded strings outside the dictionary were minimal:

| Location | String | Action |
|----------|--------|--------|
| `src/app/nav.tsx` | 11 sidebar labels + 2 placeholder titles (VN literals) | Moved into `t.nav`; rendered via `navLabel(id)`. |
| `src/app/AppShell.tsx` | `aria-label="Điều hướng chính"` | Moved to `t.a11y.mainNav`. |
| `src/features/import/ImportPage.tsx` | `'Không đọc được tệp Excel.'` (parse error) | Moved to `t.importPage.readError`. |
| helper `genderLabel` / `categoryLabel` | hardcoded `Nam/Nữ` and the 5 categories | Moved to `t.gender` / `t.category`; helpers now read the live `t`. |
| `src/features/exports/ExportsPage.tsx` | `'Danh sách nhận xét…'`, `'Nhận xét'`, `'Tin nhắn'` | **Left Vietnamese on purpose** — these are *exported document* titles/column headers, not UI chrome (see "Vietnamese-only"). |

## Approach (no framework)

`src/app/i18n.ts` now holds two dictionaries:

- **`vi`** — the canonical, **complete** dictionary (the previous copy, plus `nav`, `a11y`,
  `lang`, `gender`, `category`, `importPage.readError`).
- **`en`** — a **partial** `DeepPartial<Dict>`. A small `deepMerge(vi, en)` overlays English onto
  Vietnamese, so **any key missing in `en` falls back to the `vi` value**. (`appTitle` is
  intentionally omitted from `en` — a product name — which keeps the fallback path exercised in
  real use and in tests.)

Reactivity without a library: **`t` is an exported _live binding_** (`export let t`).
`setLocale(locale)` swaps it to the resolved dictionary. The app shell keeps the locale in React
state, so switching re-renders the tree and every page — which imports `t` as a module binding —
picks up the new strings. **No per-page wiring was needed**; the 9 page components were not touched
(except the one stray `ImportPage` error string). The label helpers (`navLabel`, `reportKindLabel`,
`parentTypeLabel`, `toneLabel`, `exportArtifactLabel`, `genderLabel`, `categoryLabel`) read the live
`t`, so they translate automatically.

```ts
export type Locale = 'vi' | 'en';
export const DEFAULT_LOCALE: Locale = 'vi';
export let t: Dict;                       // live binding, swapped by setLocale()
export function setLocale(value: unknown): Locale   // normalizes unknown → 'vi'
export function getLocale(): Locale
export function loadLocale(): Locale      // reads localStorage['gvcn.locale'], safe everywhere
export function saveLocale(value: unknown): void    // never throws if localStorage is absent
```

## What is now bilingual

Everything the teacher sees as **UI chrome**, in both `vi` and `en`:

- App title/subtitle, offline indicator, **sidebar nav** (all 11 entries), main-nav aria-label.
- Every page's title, intro, field labels, buttons, dropdown options, tone/type/kind labels.
- All **empty / loading / saving / success / warning / error** states, including the import
  parse-error and the banned-phrase warnings.
- Gender column and the 5 observation-tag category labels.

## What remains Vietnamese-only (by design)

**Generated educational content stays Vietnamese**, regardless of UI language:

- Student comments, parent messages, meeting minutes, weekly/monthly reports.
- The **exported document body text**, titles and table headers in DOCX/XLSX/PDF
  (e.g. "Danh sách nhận xét học sinh", "Nhận xét", "Tin nhắn", "Mã học sinh").

Why: these are official GVCN artifacts for Vietnamese lower-secondary schools — parents, students
and administrators read them in Vietnamese. Translating the generators (M4–M6) and the export
mappers (M7) into English would (a) be inappropriate for the actual school use, and (b) be a large
change to verified generation logic, out of scope for a polish task. The UI being English does not
change what document a teacher produces. This is documented and intentional, not an omission.

## Why Vietnamese is the default

The product's audience is Vietnamese homeroom teachers (CLAUDE.md: "Use Vietnamese UX copy by
default"). `DEFAULT_LOCALE = 'vi'`, `index.html` ships `lang="vi"`, and an unknown/missing stored
preference normalizes to `vi`. English is a convenience secondary language (e.g. for reviewers or
non-Vietnamese evaluators).

## How to switch language in the UI

A **language `<select>`** sits at the top of the sidebar (under the app title), labelled
"Ngôn ngữ / Language", offering **Tiếng Việt** and **English**. The choice is:

- applied immediately (the live `t` binding is swapped and the tree re-renders),
- **persisted to `localStorage['gvcn.locale']`** and restored on next launch,
- reflected on `document.documentElement.lang` (kept in sync via a `useEffect`).

## Tests

`src/app/__tests__/i18n.test.ts` (**+10**, deterministic):

- default locale is `vi`; `t` + `navLabel` return Vietnamese.
- `setLocale('en')` returns English UI labels (incl. helpers and function-valued strings).
- **fallback**: a key omitted from `en` (`appTitle`) returns the Vietnamese value; no UI string is
  ever `undefined` in either locale.
- `normalizeLocale`/`setLocale` coerce unknown input (`'fr'`, `null`, `undefined`) → `vi`.
- `navLabel`/`categoryLabel` fall back to the raw id for unknown keys.
- `loadLocale`/`saveLocale` round-trip through a stubbed `localStorage`, and **do not throw** when
  `localStorage` is absent or throws.

## Verification

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 |
| `npm run test` | ✅ **110 passed** (18 files; was 100, **+10**) |
| `npm run build` | ✅ 0 (pre-existing chunk-size warning only) |
| `cd src-tauri && cargo check` | ✅ Finished, 0 errors |
| `npm audit` | ✅ 0 vulnerabilities |

**Dependencies added: none.** `npm run tauri build` was **not** re-run: changes are frontend +
TS only — no Tauri runtime, capability, `tauri.conf.json`, migration, or dependency change, so the
M8 Linux bundle remains valid.

## Remaining risks / deferred

- **Live-binding `t`** relies on the shell re-rendering after `setLocale`. That holds for the
  current tree (pages render under `AppShell`); if a future component memoizes aggressively or
  reads `t` outside React render, it should call a helper or read `getLocale()`. Documented here.
- **English translations are hand-written** for the MVP surface; if new screens/strings are added,
  add the matching `en` keys (missing ones safely fall back to Vietnamese, so nothing breaks).
- **Generated documents are Vietnamese-only** (intentional, above) — revisit only if a real
  bilingual-document requirement appears.
- The visual switch + persisted-reload behavior is covered by logic tests; the final look on a real
  desktop is part of the existing `docs/demo-checklist.md` GUI pass.
