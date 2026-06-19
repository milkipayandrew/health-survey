# Docs Request: app

Pending cache maintenance requests for `docs.app.md`. Each entry captures research already performed by the orchestrator. Resolve with `/ACTION--dx-orchestrator -resolve`.

---

## Entry — 2026-06-18T17:54:57Z

**Status:** STALE
**Target:** `demo/src/docs.app.md`
**Reason:** Cache references commit `eaecc7b`; 7 commits / 33 changed files behind HEAD. Cache predates the scheduling/flow-logic/QR layers entirely.
**Commit at research time:** `75b3ccc`

### Sources read

| File | Commit | Lines |
|------|--------|-------|
| `demo/src/docs.app.md` | `eaecc7b` | 1-110 |
| `demo/src/lib/scheduling.ts` | `75b3ccc` | 1-144 |
| `demo/src/types/domain.ts` | `75b3ccc` | 1-288 |
| `demo/src/lib/mock/store.ts` | `75b3ccc` | 1-604 |
| `demo/src/lib/mock/fixtures.ts` | `75b3ccc` | 1-397 |
| `demo/src/lib/flow-logic.ts` | `75b3ccc` | 1-77 |
| `demo/src/lib/qr/survey-url.ts` | `75b3ccc` | 1-23 |
| `demo/src/app/(admin)/surveys/new/_components/survey-builder.tsx` | `75b3ccc` | 1-925 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-preview.tsx` | `75b3ccc` | 1-250 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-qr-preview.tsx` | `75b3ccc` | 1-49 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-detail.tsx` | `75b3ccc` | 1-150 |

### dx-find output

Single cache file `demo/src/docs.app.md` (110 lines), reference commit `eaecc7b`, STALE — 7 commits behind HEAD `75b3ccc`, 33 files changed (+3462/-466) in `demo/src`. New since cache: `lib/scheduling.ts`, `lib/flow-logic.ts`, `lib/qr/survey-url.ts`, `lib/mock/test-responses.ts`, `active-client.tsx`, `client-selector.tsx`, `question-editor.tsx`, `search-input.tsx`. Heavily modified: `survey-builder.tsx` (~831 lines changed), `store.ts`, `fixtures.ts`, `types/domain.ts`, library manager (+297). No pending requests previously. No coverage gaps — target within `docs.app.md` scope.

### Proposed updates

- **ADD chunk `scheduling`** — New section documenting the scheduling/cadence layer:
  - `lib/scheduling.ts`: `resolveEffectiveCadence(survey, group)` resolves a **2-layer** effective
    cadence (survey default → block-group override). Pure, render-time. Medication-preset layer is
    explicitly out of scope (comment at `scheduling.ts:18-21`).
  - `types/domain.ts:149-159`: `Schedule { every, unit, firstSendOffsetDays }`.
  - `types/domain.ts:168-181`: `BlockGroup { name, order, schedule?, blocks[] }`.
  - Persistence: `store.ts:480-485` `updateSurveySchedule`, `store.ts:498-523`
    `updateBlockGroupSchedule` (localStorage only).
  - Authoring UI: `survey-builder.tsx` `ScheduleEditor` (859-925), per-group override toggle
    (607-644).
  - Note the runtime gap: no Check-in lifecycle, no scheduler trigger, no Enrollment — `domain.ts:8`
    marks Enrollment/Check-in/Response/Alert intentionally out of scope.

- **ADD chunk `flow-logic`** — `lib/flow-logic.ts`: `resolveInclusion`, `isBlockIncluded`
  (initial/recurring/always), `isQuestionVisible` (display-condition branching). Render-time only.

- **ADD chunk `qr`** — `lib/qr/survey-url.ts:20-22` `surveyCheckInUrl()` derives a deterministic
  preview URL (`https://demo.effective-health.example/c/<surveyId>`); preview artifact only, never
  creates a check-in (`qr/survey-url.ts:6-19`, `survey-qr-preview.tsx`).

- **UPDATE chunk** covering `survey-builder.tsx` — reflect the ~831-line growth: block groups,
  per-group schedule override, block inclusion (initial/recurring), question editor, display
  conditions.

- **UPDATE chunk** covering `lib/mock/` — add `test-responses.ts` (deterministic fabricated preview
  responses) and the schedule mutators; note migration logic for legacy flat-block surveys in
  `store.ts`.

- **UPDATE `doc-meta.commit`** to `75b3ccc`.

---

## Entry — 2026-06-18T16:30:00Z

**Status:** STALE
**Target:** `demo/src/docs.app.md`
**Reason:** Supersedes the prior entry's commit target. HEAD has advanced to `c55de4c` (check-in lifecycle layer added: `lib/checkin-lifecycle.ts`, effective-cadence resolution, Workflow 2). Cache still references `eaecc7b` (34 files / ~11 commits behind). Research was for the patient-survey-mobile-preview task.
**Commit at research time:** `c55de4c`

### Sources read

| File | Commit | Lines |
|------|--------|-------|
| `demo/src/docs.app.md` | `c55de4c` | 1-111 |
| `demo/src/types/domain.ts` | `c55de4c` | 1-511 (full; note uncommitted working-tree edit) |
| `demo/src/lib/flow-logic.ts` | `c55de4c` | 1-77 |
| `demo/src/lib/scheduling.ts` | `c55de4c` | 1-360 |
| `demo/src/lib/qr/survey-url.ts` | `c55de4c` | 1-23 |
| `demo/src/lib/mock/store.ts` | `c55de4c` | 1-626 |
| `demo/src/lib/utils.ts` | `c55de4c` | 1-52 |
| `demo/src/hooks/use-mock-data.ts` | `c55de4c` | 1-34 |
| `demo/src/hooks/active-client.tsx` | `c55de4c` | 1-148 |
| `demo/src/app/layout.tsx` | `c55de4c` | 1-36 |
| `demo/src/app/page.tsx` | `c55de4c` | 1-7 |
| `demo/src/app/(admin)/layout.tsx` | `c55de4c` | 1-41 |
| `demo/src/app/(admin)/surveys/[id]/page.tsx` | `c55de4c` | 1-17 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-preview.tsx` | `c55de4c` | 1-296 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-detail.tsx` | `c55de4c` | 1-296 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-qr-preview.tsx` | `c55de4c` | 1-49 |
| `demo/src/components/brand-swatches.tsx` | `c55de4c` | 1-38 |
| `demo/src/app/globals.css` | `c55de4c` | 1-20 |

### dx-find output

Single cache file `demo/src/docs.app.md` (110 lines), reference commit `eaecc7b`, STALE — 34 files changed (+4354/-470) in `demo/src` vs HEAD `c55de4c`. `dx-staleness-check` binary errored (`no source entries found in frontmatter` — expects flat `source`, cache uses `sources:` block format); staleness determined via git. New since cache and outside declared `sources:` prefixes: `lib/scheduling.ts`, `lib/flow-logic.ts`, `lib/qr/`, `lib/export/`, `lib/checkin-lifecycle.ts`. Resolver should extend `sources:` to cover `lib/` broadly.

### Proposed updates

In addition to the prior entry's proposed ADD/UPDATE chunks (scheduling, flow-logic, qr, survey-builder, lib/mock), apply:

- **ADD chunk `checkin-lifecycle`** — `lib/checkin-lifecycle.ts` + the layered effective-cadence resolution (Workflow 2); `domain.ts:292-438` `Patient`/`Enrollment`/`CheckIn`/`Response` are now modeled (the cache wrongly claims these are absent).
- **CORRECT survey-shape facts** — current shape is `Survey → BlockGroup → Block → Question` (`Survey.blockGroups`, `domain.ts:242-264`); the cache's flat-`blocks[]` description is wrong. `Question.displayCondition` (`domain.ts:79-84`) and `Block.inclusion` (`domain.ts:114`) exist.
- **NOTE for future patient-facing route** — no `/preview` route or patient-facing UI exists yet; store is client-only (`use-mock-data.ts:1`). Captured in research doc `__Tasks/02_open/task-260618_1619-patient-survey-mobile-preview/research/RES-survey-preview-edit-points.md`.
- **UPDATE `doc-meta.commit`** to `c55de4c` (not `75b3ccc`) and extend `sources:` to include `lib/` broadly.

---
