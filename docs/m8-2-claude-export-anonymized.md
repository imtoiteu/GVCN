# M8.2 — Claude Export / Anonymized AI Summary

> Privacy feature: a **student-code-only, PII-free** summary a teacher can **manually** copy into
> Claude (or another AI assistant) to get help drafting comments / messages — **without exposing any
> student identity**. Local-first, offline, deterministic. The app calls **no external AI/API** and
> **never sends anything automatically**.
>
> This is plan.md §M8 (deferred during M8 release-readiness — see `docs/m8-demo-release-readiness.md`
> "Claude Export decision" — and built here as its own focused, test-gated slice).
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What it does

- Reads existing **local** data for a chosen class + period (week or month): the roster, the
  observation tags recorded that period, and the teacher notes.
- **Anonymizes** it: each student becomes a stable alias `S001`, `S002`… (independent of name *and*
  of the real student code), tags are kept (controlled catalog labels — not PII), and teacher notes
  are scrubbed of identifiers.
- Builds a deterministic **Vietnamese** instruction block + per-alias summary + safety reminder, and
  shows it in a read-only preview with a **Copy to clipboard** button.

## What it does NOT do

- ❌ No Claude API, OpenAI API, or any network call. ❌ No automatic sending. ❌ No login/account,
  no cloud sync, no external translation, no prompt-template designer, no charts.
- It does not embed generated comments / parent messages / full reports (those are the *output* the
  teacher wants the AI to help write, and embedding them would widen the PII surface). The summary is
  built from tags + sanitized notes only — reports are represented by the per-student tag rollup.

## It never sends data automatically

Anonymization (`src/lib/export/anonymize.ts`) and text building (`src/lib/export/claudeExport.ts`)
are **pure** functions — no I/O, no `fetch`, no Date/random. The only outbound action is the teacher
pressing **Copy to clipboard** (`navigator.clipboard.writeText`); from there the teacher pastes it
themselves. A test stubs `fetch` and asserts it is never called.

## What PII is removed

`anonymize.ts` runs a layered, **over-redaction-biased** pipeline over every free-text note (and the
class name). For an anonymized export, removing too much is safe; leaking is not.

| Layer | Removes | Replaced with |
|-------|---------|---------------|
| `redactEmails` | `a.b@gmail.com` | `[email đã ẩn]` |
| `redactUrls` | `http(s)://…`, `www.…` | `[liên kết đã ẩn]` |
| `redactDates` | `12/05/2010`, `2010-05-12`… (birth dates) | `[ngày đã ẩn]` |
| `redactPhones` | digit runs ≥8 (VN mobile/landline, `+84…`) | `[số điện thoại đã ẩn]` |
| `redactAddresses` | `đường/phố/số nhà/phường/quận/huyện/tỉnh…` + a number/proper-noun | `[địa chỉ đã ẩn]` |
| `redactKnownNames` | any **roster** full name (this class) | `[tên riêng đã ẩn]` |
| `redactGenericNames` | any run of **2–4 capitalized words** (parent/relative names) | `[tên riêng đã ẩn]` |

Names are also removed **structurally**: the export builder only ever receives aliases + tag labels
+ already-scrubbed notes — real names never enter the produced text in the first place.
`safeNote()` adds a backstop: if scrubbing leaves no human-readable content (a note that was
essentially all PII), the whole note is replaced with `[ghi chú đã được ẩn để bảo vệ thông tin]`.

> Implementation note: JavaScript's `\b` is ASCII-only and silently fails around Vietnamese letters
> (`\bđường\b` is `false`), and the `i` flag makes `\p{Lu}` case-insensitive. Both bit the address
> matcher during development; it now uses a Unicode-safe lookbehind + a digit/proper-noun lookahead
> (no `i` flag). This is why over-redaction collisions like "phối hợp" / "xã hội" / "đường lối" are
> *not* redacted while real addresses are.

## Where it lives in the UI

- Nav slot **`claude`**, now wired to `ClaudeExportPage` (was a placeholder).
  Label: **`Xuất ẩn danh cho AI`** (vi) / **`Anonymized AI Export`** (en).
- Flow: choose **class** → **period** (Theo tuần / Theo tháng) → **week/month** → **tone** →
  preview → **Copy to clipboard**. A prominent amber **privacy warning** sits above the preview
  telling the teacher to review the text before copying and never paste if any real identifier is
  still visible. Empty period / no records show a safe message (no crash).
- Uses the M8.1 i18n system (Vietnamese default, English secondary). The **export body itself is
  Vietnamese** regardless of UI language — the target output (Vietnamese comments) is Vietnamese, and
  the AI instructions must match (consistent with the M8.1 generated-content decision).

## Sample anonymized output

From demo-shaped data (fake names "Nguyễn Văn An" / "Trần Thị Bình", a note with a parent name +
phone) — note the aliases, the scrubbed note, and that the legitimate word "phối hợp" survives:

```
=== DỮ LIỆU LỚP HỌC ĐÃ ẨN DANH (DÀNH CHO TRỢ LÝ AI) ===

HƯỚNG DẪN CHO AI:
- Dữ liệu dưới đây đã được ẩn danh: chỉ dùng mã học sinh (S001, S002, …), không có tên thật hay thông tin cá nhân.
- Hãy hỗ trợ giáo viên chủ nhiệm soạn nhận xét / tin nhắn phụ huynh bằng tiếng Việt cho từng học sinh, dựa trên các ghi nhận bên dưới.
- Văn phong mong muốn: cân đối giữa ghi nhận và góp ý nhẹ nhàng.
- Luôn tôn trọng, mang tính phối hợp và động viên; tập trung vào sự tiến bộ và hướng hỗ trợ.
- KHÔNG phê phán, KHÔNG quy chụp hay đổ lỗi cho học sinh hoặc gia đình.

THÔNG TIN CHUNG:
- Lớp: 8A
- Kỳ: Tuần 1 (02/09–06/09)
- Số học sinh có ghi nhận: 2

DANH SÁCH GHI NHẬN:
[S001]
- Điểm tích cực: Đi học đầy đủ, Tích cực phát biểu
- Cần hỗ trợ: (không có)
- Ghi chú (đã ẩn danh): Em tiến bộ rõ trong tuần.
[S002]
- Điểm tích cực: Tham gia hoạt động tập thể
- Cần hỗ trợ: Cần hỗ trợ môn Toán
- Ghi chú (đã ẩn danh): Mẹ là [tên riêng đã ẩn], sđt [số điện thoại đã ẩn] — cần phối hợp.

LƯU Ý AN TOÀN:
- Đây là dữ liệu hỗ trợ. Giáo viên cần đọc lại và chịu trách nhiệm trước khi sử dụng kết quả.
- Không dùng dữ liệu này để xếp loại hay đánh giá tiêu cực học sinh.
```

## Tests (the no-PII gate)

`src/lib/export/__tests__/anonymize.test.ts` (**+13**) and
`src/lib/export/__tests__/claudeExport.test.ts` (**+9**) assert deterministically:

1. student names removed · 2. phone numbers removed · 3. emails removed · 4. addresses removed ·
5. parent names removed (non-roster, via generic-name layer) · 6. aliases stable (S001.. by code,
name-independent) · 7. the built export contains **none** of the original names · 8. an all-PII note
becomes the placeholder; a partly-safe note is sanitized but kept · 9. **no network**: `fetch` is
stubbed and asserted never called · 10. Vietnamese + English labels exist for the page and nav.
Plus: deterministic output, and a safe empty-records export.

## Verification

| Command | Result |
|---------|--------|
| `npm run test` | ✅ **132 passed** (20 files; was 110, **+22**) |
| `npm run typecheck` | ✅ 0 |
| `npm run build` | ✅ 0 (pre-existing chunk-size warning only) |
| `cd src-tauri && cargo check` | ✅ Finished, 0 errors |
| `npm audit` | ✅ 0 vulnerabilities |

**Dependencies added: none.** `npm run tauri build` not re-run — frontend + TS only (new page, pure
modules, i18n strings); no Tauri runtime/capability/config/migration/dependency change, so the M8
Linux bundle remains valid.

## Remaining privacy limitations

- **Heuristic, not perfect.** Free-text scrubbing is pattern/heuristic-based. A name written all
  lowercase, an unusual identifier format, or an address with no number/proper-noun could slip
  through. The UI therefore **requires the teacher to review** before copying — this is a
  human-in-the-loop safeguard, not a guarantee.
- **Over-redaction** can drop legitimate content (e.g. an unusual capitalized phrase treated as a
  name). That is the intended trade — privacy over completeness.
- **Student codes vs aliases:** the export uses aliases (`S001`) and never the real code, but the
  teacher's own data on screen still shows real names — only the *copied text* is anonymized.
- **No DOCX/XLSX/PDF for this artifact** — copyable text only (by scope).

## Safe for manual GUI testing?

**Yes.** The anonymization + build path is pure and covered by the no-PII gate (132 tests green),
and the page is wired with safe empty states and a privacy warning. The one manual step (on a machine
with a display) is to open **Xuất ẩn danh cho AI**, pick 8A + a recorded week, confirm the preview
shows only aliases/tags/scrubbed notes, and that **Copy to clipboard** works — add this to
`docs/demo-checklist.md` §7-adjacent. As always, the teacher must read the text before pasting it
into any external tool.
