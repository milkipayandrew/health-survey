# Docs Request: app

Pending cache maintenance requests for `docs.app.md`. Each entry captures research already performed by the orchestrator. Resolve with `/ACTION--dx-orchestrator -resolve`.

---

## Entry — 2026-06-19T07:05:00

**Status:** STALE (relative to working tree — committed cache is fresh at `c8587b3`, but in-scope files carry uncommitted edits)
**Target:** `demo/src/docs.app.md`
**Reason:** Both preview targets have uncommitted working-tree edits not reflected in the cache; cache also cites a drifted line count for `survey-detail.tsx` (308 → now 313).
**Commit at research time:** `c8587b3`

### Sources read

| File | Commit | Lines |
|------|--------|-------|
| `demo/src/app/preview/[id]/_components/patient-survey-preview.tsx` | `c8587b3` | 1-498 |
| `demo/src/app/preview/[id]/page.tsx` | `c8587b3` | 1-46 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-detail.tsx` | `c8587b3` | 1-313 |
| `demo/src/app/(admin)/surveys/[id]/_components/survey-preview.tsx` | `c8587b3` | 1-295 |
| `demo/src/types/domain.ts` | `c8587b3` | 1-52 |
| `demo/src/app/not-found.tsx` | `c8587b3` | 110-124 |

### dx-find output

Cache `demo/src/docs.app.md` is FRESH at committed HEAD `c8587b3` (0 commits behind, 0 scope files changed per `dx-staleness-check`), but raised an uncommitted-changes warning. In-scope files with working-tree edits include both preview targets (`preview/[id]/page.tsx`, `surveys/[id]/_components/survey-detail.tsx`) plus `clients/[id]/edit/page.tsx`, `surveys/[id]/edit/page.tsx`, `surveys/[id]/page.tsx`, `layout.tsx`, new `components/wireframe-notice.tsx`, and the cache file itself. The prior `docs-request.app.md` was deleted in the working tree (no active request before this entry). No coverage gap — both targets are in `app/preview/` (PREV) and `app/(admin)/` (ADM) scope and documented in the DOC00007 region.

### Proposed updates

- **Chunk `DOC00007` (preview region, ~docs.app.md:228-257)** — UPDATE
  - Correct the cited length of `surveys/[id]/_components/survey-detail.tsx` from `308` to `313` lines.
  - Note the device-toggle scaffolding lives in `survey-detail.tsx`: `PreviewDevice` type `:31`, `device` state `:42`, segmented toggle UI `:186-208`, undefined-client text branch `:211-214`, mobile phone-bezel `:215-222`, desktop browser-chrome card `:223-234`.
  - Note the shared `survey-preview.tsx` (`SurveyPreview`) props contract: `{ survey: Survey; client: Client }` both required (`:22-27`); reads `client.branding.primaryColor` (`:150,:284`), `client.branding.logo` as a guard-less `<img>` (`:154`), `client.name` (`:156`), `<BrandSwatches branding={client.branding}>` (`:291`); owns its own internal run-mode toggle (`:161-183`).
  - Note `patient-survey-preview.tsx` structure: `PatientSurveyPreview :407-498`, local `SurveyRunner :190-339`, `QuestionInput :68-173`, `BrandedHeader :352-392` (with empty-logo guard at `:365`), `FALLBACK_BRANDING :26-30`, outer run-mode toggle `:444-465`, hardcoded phone bezel `:473-488`.
  - Note `PatientSurveyPreview` has a second importer beyond `page.tsx`: `app/not-found.tsx:13,121` (client-side `/preview/<id>` for session-created surveys).
  - Record domain types for fallback work: `ClientBranding` (`types/domain.ts:24-31`) `{logo,primaryColor,secondaryColor}`; `Client` (`:40-50`) `{id,name,branding,status,createdAt}`; `ClientStatus :17`.

> Note: this entry documents pre-implementation state for task-260619_0705 (unify preview route). The route rewrite will change `patient-survey-preview.tsx` substantially (drop `SurveyRunner`/`QuestionInput`/`BrandedHeader`, adopt `SurveyPreview` + device toggle). Prefer re-running dx-research on `app/preview/` after that task lands rather than applying these line-level notes verbatim if the rewrite is already committed at resolve time.

---
