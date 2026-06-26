# GVCN AutoReport

This is the GVCN AutoReport project — a local-first desktop app for Vietnamese lower-secondary homeroom teachers.

The product helps teachers import a class list, record weekly homeroom observations, generate student comments, parent-message drafts, homeroom meeting minutes, weekly/monthly reports, and evidence exports for the “giáo viên chủ nhiệm giỏi” workflow.

The goal is a practical tool, not an overbuilt school ERP.

## Project Structure

```
app/gvcn-autoreport/        → Main Tauri + React app
src/                        → Frontend source code
src-tauri/                  → Tauri/Rust desktop shell
.claude/skills/             → Selected agent-skills copied into this project
.claude/commands/           → Optional slash commands copied from agent-skills
references/repos/           → Read-only reference repos for workflow/UI ideas
references/agent-skills/    → Full cloned agent-skills repository
docs/                       → Product notes, ADRs, implementation notes
templates/                  → DOCX/PDF/export templates
tests/                      → Unit/integration tests when added
```

Reference repos:

```
references/repos/report-card-creator/
  → Study Excel → DOCX/PDF generation workflow.

references/repos/report-card-generator/
  → Study offline HTML/JS report-card generation and PDF layout.

references/repos/Iskole/
  → Study student records, attendance, remarks, parent/teacher workflows.

references/repos/Student-Attendance-Management-System/
  → Study attendance schema, reports, analytics, at-risk student ideas.

references/repos/shadcn-admin/
  → Study admin dashboard layout, sidebar, tables, forms, responsive UI.
```

Treat reference repos as source material, not as the app architecture. Reuse ideas, small patterns, and compatible code only after checking license and explaining what is being adapted.

## Skills by Phase

**Define:** spec-driven-development
**Plan:** planning-and-task-breakdown
**Build:** source-driven-development, incremental-implementation, test-driven-development, frontend-ui-engineering
**Verify:** test-driven-development
**Review:** code-review-and-quality, security-and-hardening

Use only the selected skills in `.claude/skills/` unless the user explicitly asks to add more.

## Product Scope

Build an MVP desktop app named “GVCN AutoReport”.

Core MVP:

1. Manage classes and student lists.
2. Import student list from Excel.
3. Weekly record screen for:

   * attendance/chuyên cần
   * study/học tập
   * discipline/nề nếp
   * good deeds/việc tốt
   * support needed/cần hỗ trợ
   * teacher notes/ghi chú
4. Generate student comments from selected tags and notes.
5. Generate parent-message drafts in Vietnamese.
6. Generate homeroom meeting minutes.
7. Generate weekly/monthly homeroom reports.
8. Export DOCX/PDF/XLSX.
9. Provide demo data for class 8A.
10. Provide a “Claude Export” page that creates anonymized summaries for manual copy-paste into Claude.

Nice-to-have after MVP:

1. Seating chart.
2. Student support history.
3. Before/after evidence dashboard.
4. Report templates for “giáo viên chủ nhiệm giỏi”.
5. GitHub Actions build for macOS DMG and Windows EXE/installer.

## Preferred Architecture

Prefer this architecture unless there is a clear reason to change:

```
Tauri + React + TypeScript + Vite
Local data layer: SQLite or PocketBase, chosen after inspection
UI: shadcn/ui-inspired admin interface
Tables: TanStack Table or simple typed table components
Charts: ECharts or lightweight charting if needed
Excel: SheetJS or equivalent
DOCX: docxtemplater or equivalent
PDF: pdfmake or browser print-to-PDF flow
```

Do not over-constrain implementation. If another architecture is better after inspecting the codebase and references, propose it with tradeoffs before switching.

## Conventions

* Build local-first. The app must work offline for demo.
* Use Vietnamese UX copy by default.
* Use fake/demo student data in development and screenshots.
* Do not commit real student names, phone numbers, addresses, grades, family situations, or sensitive notes.
* Prefer student codes in generated AI/export summaries.
* Do not call external AI APIs by default. The first MVP should use copy-paste “Claude Export”.
* Keep generated comments respectful, specific, and non-judgmental.
* Parent-message drafts must be phrased as cooperation, not accusation.
* Do not make the app feel like surveillance. Use language such as “ghi nhận”, “hỗ trợ”, “phối hợp”, “tiến bộ”.
* Keep features practical for one homeroom teacher managing one or more classes.
* Avoid building a full school ERP unless the user explicitly expands scope.
* Reference repos are not the app. Do not blindly port their architecture.
* Before copying non-trivial code from a reference repo, check the license and explain the adaptation.
* Keep changes small and verifiable.
* Prefer readable, boring code over clever abstractions.
* Update docs when the product flow, data model, or export templates change.

## Commands

Update these commands after the package scripts are finalized.

Expected commands:

```
npm install
npm run dev
npm run tauri dev
npm run build
npm run tauri build
npm run test
npm run lint
npm run typecheck
```

If a command does not exist yet, either add the script or state that it is not configured yet.

## Skill Usage Rules

Use `spec-driven-development` before major implementation. Produce or update `SPEC.md`.

Use `planning-and-task-breakdown` after the spec. Produce or update `tasks/plan.md` and `tasks/todo.md`.

Use `source-driven-development` when:

* choosing libraries,
* integrating Tauri,
* implementing Excel/DOCX/PDF export,
* adapting reference repo ideas,
* using unfamiliar APIs.

Use `incremental-implementation` for all multi-file changes. Build one vertical slice at a time.

Use `test-driven-development` for:

* comment generation,
* parent-message generation,
* weekly report generation,
* Excel import/export,
* DOCX/PDF data mapping,
* data validation.

Use `frontend-ui-engineering` for:

* dashboard layout,
* tables,
* forms,
* accessibility,
* responsive UI,
* empty/error/loading states.

Use `security-and-hardening` for:

* student data handling,
* import validation,
* local storage decisions,
* export safety,
* AI summary anonymization.

Use `code-review-and-quality` before considering a milestone complete.

## Boundaries

Always:

* Protect student data.
* Keep MVP practical for Vietnamese lower-secondary homeroom teachers.
* Use fake demo data unless the user explicitly provides sanitized data.
* Prefer local/offline operation.
* Verify imports, exports, and generated text with tests or reproducible checks.
* Explain tradeoffs before expanding scope.

Never:

* Send real student data to external services.
* Store secrets in the repo.
* Build hidden monitoring, surveillance, or behavior-scoring features.
* Generate insulting, stigmatizing, or punitive comments about students.
* Modify reference repos as if they were the main app.
* Copy large chunks from reference repos without checking license.
* Replace a simple MVP with a full school-management system without approval.
* Skip verification because “it looks fine”.

