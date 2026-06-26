# M4 — Student Comment Generation

> Session scope: the **M4 vertical slice** only — a pure, local, deterministic generator that turns
> a student's M3 weekly record (observation tags + teacher note) into a respectful Vietnamese
> comment, plus a "Tạo nhận xét" screen to generate → edit → save into `generated_comments`.
> **No** parent messages (M5), minutes/reports (M6), exports (M7), Claude Export (M8), dashboard,
> tag-catalog CRUD, router/UI framework. See [`../SPEC.md`](../SPEC.md) §6/§8.5 and
> [`../tasks/plan.md`](../tasks/plan.md) §M4.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What was built

| File | Role |
|------|------|
| `src/lib/generate/comment.ts` | **New** pure generator + `findBannedPhrases` safety guard. |
| `src/lib/generate/__tests__/comment.test.ts` | **+13 TDD tests** (tones, sentiment framing, fallback, guard). |
| `src/lib/db/repositories.ts` | **+1 function** `listLatestCommentsByWeek` (prefill). Existing funcs unchanged. |
| `src/lib/db/__tests__/comments.test.ts` | **+2 DAL tests** for the latest-per-week reader. |
| `src/features/comments/CommentsPage.tsx` | The "Tạo nhận xét" screen (thin consumer). |
| `src/app/nav.tsx` | `comments` slot wired from placeholder → `CommentsPage`. |
| `src/app/i18n.ts` | `comments` copy block + `toneLabel()` helper. |
| `src/app/app-shell.css` | `.comment-input` / `.badge` / `.comment-warn` styles (plain CSS). |

## The generator (`lib/generate/comment.ts`)

Pure and deterministic — no I/O, no external AI, no `Date`/`Math.random`. Same input → same text,
so output is golden-testable and reproducible offline.

```ts
generateComment({ studentName, tags, teacherNote?, tone? }): { text, tone, summary }
findBannedPhrases(text): string[]
```

- **Inputs:** student display name/code, the selected observation tags (category + sentiment +
  `label_vi` from the controlled catalog), an optional free-text teacher note, and a tone.
- **Composition** is sentiment/category-aware, in a fixed order: positive praise → neutral
  observations → gentle growth points (`concern`) → cooperation note (`support` category) →
  teacher note (verbatim) → closing. `concern` tags are always framed as *support*
  ("cần cố gắng… giáo viên sẽ quan tâm, nhắc nhở để em tiến bộ"), never punishment.
- **Tones:**
  - `short` — terse leads, drops the neutral segment and the closing flourish.
  - `balanced` (default) — full segments + a "Mong em tiếp tục phát huy." style closing.
  - `encouraging` — warmer leads ("Giáo viên rất vui khi thấy em…") + a hopeful closing.
- **Empty/minimal record** → a safe supportive fallback ("…chưa ghi nhận thông tin nổi bật… sẽ
  tiếp tục quan tâm và đồng hành cùng em.").

### Safety guard

`findBannedPhrases` matches a curated list of punitive/stigmatizing Vietnamese phrasing
(`lười`, `hư`, `cá biệt`, `vô dụng`, …) on **whole syllable tokens**, so innocuous words that
merely share letters are never falsely flagged — e.g. `như`/`nhưng` do **not** trip the bare `hư`
entry. `generateComment` self-asserts its own controlled output (everything except the verbatim
teacher note) is banned-free, and the screen scans the final edited text to warn the teacher if a
manual edit (or a pasted note) introduces harsh wording.

## Sample output (real generator output)

| Tags / tone | Comment |
|-------------|---------|
| Positive · balanced | Trong tuần qua, em An đi học đầy đủ, tích cực phát biểu và giúp đỡ bạn bè. Mong em tiếp tục phát huy. |
| Mixed + note · balanced | Trong tuần qua, em Bình đi học đầy đủ. Bên cạnh đó, em cần cố gắng hơn ở: cần tập trung hơn trong giờ học và chưa hoàn thành bài tập về nhà. Giáo viên sẽ quan tâm, nhắc nhở nhẹ nhàng để em tiến bộ. Ghi chú của giáo viên: Em tiến bộ rõ sau khi đổi chỗ ngồi. Mong em tiếp tục phát huy. |
| Support · encouraging | Giáo viên tin em sẽ sớm tiến bộ hơn ở: cần tập trung hơn trong giờ học. Giáo viên mong tiếp tục phối hợp cùng gia đình để đồng hành với em về: cần phối hợp với gia đình. Giáo viên tin rằng em sẽ tiếp tục cố gắng và tiến bộ hơn nữa. |
| Mixed · short | Em An đi học đầy đủ. Em cần cố gắng hơn ở: cần tập trung hơn trong giờ học. |
| Empty · balanced | Trong tuần qua, giáo viên chưa ghi nhận thông tin nổi bật cho em An. Giáo viên sẽ tiếp tục quan tâm và đồng hành cùng em. |

## Screen flow ("Tạo nhận xét")

1. **Choose a class** (`listClasses`). Empty state → points to "Lớp & Học sinh".
2. **Choose a recorded week** (`listWeeksByClass`). Empty state → points to "Ghi nhận tuần".
3. The screen reads the week's records via the M3 DAL (`listWeeklyRecordsByWeek` +
   `listRecordTagIdsByWeek`, resolved against `listTags`) and **generates a comment per student
   that has a record**. Previously saved comments (`listLatestCommentsByWeek`) are prefilled.
4. **Tone selector** (Ngắn gọn / Cân đối / Động viên) and **"Tạo lại nhận xét"** regenerate fresh
   text (discarding in-editor edits — predictable, explicit).
5. Each comment is shown in an **editable textarea**; a warning appears under any comment whose
   (edited) text contains banned phrasing.
6. **Lưu nhận xét** inserts each non-empty comment into `generated_comments`
   (`edited_by_user` = whether the text differs from the generated baseline).

## Commands run & results

| Command | Result |
|---------|--------|
| `npm run test` (`vitest run`) | ✅ **40 passed** (was 25; **+15** = 13 generator + 2 comments DAL). |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Exit 0; bundle 1,225.78 kB / 356.09 kB gzip; CSS 4.90 kB. |
| `cd src-tauri && cargo check` | ✅ Finished (no Rust changed). |
| `npm audit` | ✅ 0 vulnerabilities. |

`npm run tauri build` was **not** re-run: M4 changed only the web frontend + TS modules — no Tauri
runtime, capability, or `tauri.conf.json` change.

## Dependencies added

**None.** The generator is plain TypeScript; the screen reuses the in-memory page switcher, native
controls, and plain CSS established in M2.5/M3. No router / UI framework was added.

## Risks / deferred (documented, not silently skipped)

- **Tag taxonomy (Risk #3)** now feeds generated text. The 22-tag catalog remains *provisional*;
  comment quality is bounded by label wording. Confirm categories/labels with a real homeroom
  teacher before this hardens. Tags are data, so re-wording needs no code change.
- **Runtime GUI smoke-check.** Headless VPS has no WebKitGTK display. On a desktop via
  `npm run tauri dev`: seed 8A → "Ghi nhận tuần" (record ≥3 students) → "Tạo nhận xét" → switch
  tones → edit → save → reopen the week and confirm prefill. Generation + save/reload are fully
  unit-tested; this is wiring verification.
- **Component tests (RTL)** — still gated on the ask-first dependency decision.
- **Comment history UI** — `generated_comments` keeps every save (createComment inserts); the
  screen only surfaces the latest per student. A history/version view is out of M4 scope.
- **Code-splitting** the `exceljs`/`plugin-sql` bundle — same deferred optimization as M2.5/M3.

## Next recommended milestone

**M5 — Parent-message generation (TDD).** A sibling pure generator
`lib/generate/parentMessage.ts` (cooperative, non-accusatory Vietnamese draft) reusing the same
record DAL and the `findBannedPhrases` guard pattern, saved into `parent_messages`.
