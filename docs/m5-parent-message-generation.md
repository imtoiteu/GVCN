# M5 — Parent-Message Generation

> Session scope: the **M5 vertical slice** only — a pure, local, deterministic generator that turns
> a student's weekly record (observation tags + teacher note, optionally an M4 comment) into a
> respectful, **cooperative** Vietnamese parent-message *draft*, plus a "Tin nhắn phụ huynh" screen
> to generate → edit → save into `parent_messages`. **No** sending (SMS/Zalo/email), no minutes or
> reports (M6), no exports (M7), no Claude Export (M8), no dashboard, no tag-catalog CRUD, no
> router/UI framework. See [`../SPEC.md`](../SPEC.md) §6/§8 and [`../tasks/plan.md`](../tasks/plan.md) §M5.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What was built

| File | Role |
|------|------|
| `src/lib/generate/parentMessage.ts` | **New** pure generator. Reuses M4's `findBannedPhrases` guard. |
| `src/lib/generate/__tests__/parentMessage.test.ts` | **+13 TDD tests** (types, cooperative tone, fallback, guard). |
| `src/lib/db/repositories.ts` | **+1 function** `listLatestParentMessagesByWeek` (prefill). Existing funcs unchanged. |
| `src/lib/db/__tests__/parentMessages.test.ts` | **+2 DAL tests** for the latest-per-week reader. |
| `src/features/parent/ParentMessagesPage.tsx` | The "Tin nhắn phụ huynh" screen (thin consumer). |
| `src/app/nav.tsx` | `parent` slot wired from placeholder → `ParentMessagesPage`. |
| `src/app/i18n.ts` | `parent` copy block + `parentTypeLabel()` helper + `ParentTypeChoice` type. |

(No CSS change — the screen reuses the M4 `.comment-input` / `.badge` / `.comment-warn` styles.)

## The generator (`lib/generate/parentMessage.ts`)

Pure and deterministic — no I/O, no external AI, no `Date`/`Math.random`. Same input → same text,
so output is golden-testable and reproducible offline. **Drafts only** — the module never sends
anything.

```ts
generateParentMessage({ studentName, tags, teacherNote?, comment?, type? }): { text, type, summary }
deriveParentMessageType(tags): 'praise' | 'reminder' | 'cooperation' | 'support'
```

- **Inputs:** student display name/code, the selected observation tags (category + sentiment +
  `label_vi` from the controlled catalog), an optional free-text teacher note, an optional existing
  M4 comment (used only as fallback content), and an optional explicit message type.
- **Four message types** (SPEC §6 "cooperative parent drafts"), each with its own opening + closing
  framing:
  - `praise` — positive update.
  - `reminder` — gentle, shared reminder for `concern` points.
  - `cooperation` — a general request to coordinate.
  - `support` — support-needed follow-up (cooperative "phối hợp / đồng hành" with the family).
- **Default type** is derived from the tags by priority: `support` tag → `support`; else any
  `concern` → `reminder`; else any `positive` → `praise`; else `cooperation`. The screen can
  override this per page (including an "auto" choice that derives per student).
- **Layout** (three logical lines): respectful greeting → body (opening → tag details → free-text →
  closing) → thank-you. Concerns are always framed as a *shared, gentle* reminder
  ("Giáo viên sẽ … nhắc nhở em ở lớp và rất mong quý phụ huynh cùng động viên em ở nhà để em tiến
  bộ."), never as blame.
- **Empty/minimal record** → a valid, generic `cooperation` draft (greeting + cooperative
  opening/closing + thanks); a note- or comment-only week falls back to that free text as content.

### Safety guard (shared with M4)

The generator imports **`findBannedPhrases`** from `lib/generate/comment.ts` — a single source of
truth for punitive/stigmatizing Vietnamese phrasing matched on **whole syllable tokens** (so
`như`/`nhưng` never trip the bare `hư` entry). `generateParentMessage` self-asserts its own
controlled output (greeting, opening, tag-derived details, closing, thanks — everything except the
verbatim teacher note / comment) is banned-free, and the screen scans the final edited text to warn
the teacher if a manual edit (or a pasted note) introduces harsh wording.

## Sample output (real generator output)

```
Positive (auto → praise):
Kính gửi quý phụ huynh em An,
Giáo viên xin chia sẻ với quý phụ huynh một số ghi nhận tích cực của em An trong tuần qua. Cụ thể,
em đi học đầy đủ và tích cực phát biểu. Rất mong quý phụ huynh tiếp tục động viên để em phát huy.
Trân trọng cảm ơn sự phối hợp của quý phụ huynh.

Mixed + note (auto → reminder):
Kính gửi quý phụ huynh em Bình,
Giáo viên xin trao đổi với quý phụ huynh một vài điểm em Bình cần cố gắng thêm trong tuần qua. Cụ
thể, em đi học đầy đủ. Em cần cố gắng thêm ở: cần tập trung hơn trong giờ học và chưa hoàn thành bài
tập về nhà. Trao đổi thêm từ giáo viên: Em đã chủ động hỏi bài hơn. Giáo viên sẽ quan tâm, nhắc nhở
em ở lớp và rất mong quý phụ huynh cùng động viên em ở nhà để em tiến bộ.
Trân trọng cảm ơn sự phối hợp của quý phụ huynh.

Support (auto → support):
Kính gửi quý phụ huynh em Cường,
Giáo viên mong được phối hợp cùng gia đình để hỗ trợ em Cường trong thời gian tới. Em cần được hỗ
trợ thêm về: cần phối hợp với gia đình. Giáo viên rất mong quý phụ huynh cùng đồng hành để em được
hỗ trợ kịp thời và tiến bộ.
Trân trọng cảm ơn sự phối hợp của quý phụ huynh.

Empty (auto → cooperation):
Kính gửi quý phụ huynh em An,
Giáo viên mong được phối hợp cùng quý phụ huynh để cùng đồng hành và hỗ trợ em An trong học tập và
rèn luyện. Rất mong quý phụ huynh dành thời gian trao đổi cùng giáo viên khi cần.
Trân trọng cảm ơn sự phối hợp của quý phụ huynh.
```

## Screen flow ("Tin nhắn phụ huynh")

1. **Choose a class** (`listClasses`). Empty state → points to "Lớp & Học sinh".
2. **Choose a recorded week** (`listWeeksByClass`). Empty state → points to "Ghi nhận tuần".
3. The screen reads the week's records via the M3 DAL (`listWeeklyRecordsByWeek` +
   `listRecordTagIdsByWeek`, resolved against `listTags`), pulls the latest M4 comments
   (`listLatestCommentsByWeek`) as fallback context, and **generates a parent-message draft per
   student that has a record**. Previously saved drafts (`listLatestParentMessagesByWeek`) are
   prefilled.
4. **Type selector** (Tự động / Khen ngợi / Nhắc nhở / Đề nghị phối hợp / Theo dõi & hỗ trợ) and
   **"Tạo lại tin nhắn"** regenerate fresh text (discarding in-editor edits — predictable, explicit).
5. Each draft is shown in an **editable textarea**; a warning appears under any draft whose
   (edited) text contains banned phrasing.
6. **Lưu tin nhắn** inserts each non-empty draft into `parent_messages`
   (`edited_by_user` = whether the text differs from the generated baseline). **No message is sent.**

## Commands run & results

| Command | Result |
|---------|--------|
| `npm run test` (`vitest run`) | ✅ **55 passed** (was 40; **+15** = 13 generator + 2 parent DAL). |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Exit 0; bundle 1,236.34 kB / 357.65 kB gzip; CSS 4.90 kB. |
| `cd src-tauri && cargo check` | ✅ Finished (no Rust changed). |
| `npm audit` | ✅ 0 vulnerabilities. |

`npm run tauri build` was **not** re-run: M5 changed only the web frontend + TS modules — no Tauri
runtime, capability, or `tauri.conf.json` change.

## Dependencies added

**None.** The generator is plain TypeScript reusing M4's guard; the screen reuses the in-memory page
switcher, native controls, and plain CSS established in M2.5/M3/M4. No router / UI framework added.

## Risks / deferred (documented, not silently skipped)

- **No real sending — by design.** Parent messages are drafts to be copied/sent manually by the
  teacher. SMS/Zalo/email integration is explicitly out of MVP scope (CLAUDE.md / SPEC §13).
- **Teacher / school communication policy sign-off.** The standard phrasings ("Kính gửi quý phụ
  huynh…", greeting/closing templates) should be reviewed by a real homeroom teacher against local
  school communication norms before they harden. Templates are plain strings → re-wording needs no
  structural change.
- **Tag taxonomy (Risk #3)** still feeds generated text (same provisional 22-tag catalog as M3/M4).
- **Runtime GUI smoke-check.** Headless VPS has no WebKitGTK display. On a desktop via
  `npm run tauri dev`: seed 8A → "Ghi nhận tuần" (record ≥3 students) → "Tin nhắn phụ huynh" →
  switch type → edit → save → reopen the week and confirm prefill. Generation + save/reload are
  fully unit-tested; this is wiring verification.
- **Component tests (RTL)** — still gated on the ask-first dependency decision.
- **Draft history UI** — `parent_messages` keeps every save; the screen only surfaces the latest per
  student. A history/version view is out of M5 scope.
- **Code-splitting** the `exceljs`/`plugin-sql` bundle — same deferred optimization as M2.5–M4.

## Next recommended milestone

**M6 — Meeting minutes + weekly/monthly reports (TDD).** Aggregation generators in `lib/generate/`
(minutes per week/class; weekly/monthly report grouping weeks → month, Risk #4) with correctness +
empty-period-fallback tests, reusing the same read DAL.
