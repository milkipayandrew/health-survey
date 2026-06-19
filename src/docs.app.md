---
chunking: DOC
created: 2026-06-17
doc-meta:
  commit: eaecc7b
sources:
  - file: demo/src/app/(admin)/
    prefix: ADM
  - file: demo/src/lib/mock/
    prefix: MOCK
  - file: demo/src/components/
    prefix: CMP
  - file: demo/src/types/domain.ts
    prefix: DT
  - file: demo/src/hooks/use-mock-data.ts
    prefix: HK
---

<!--DOC00001:ADM&MOCK&HK-->
## Architecture

Next.js App Router with a single `(admin)` route group. All data flows through `useMockData()` (`demo/src/hooks/use-mock-data.ts`), which wraps `useSyncExternalStore` over a `localStorage`-persisted snapshot maintained in `demo/src/lib/mock/store.ts`.

There is no backend, no API data routes, and no patient/provider surfaces. Everything is client-side mock state.

Route tree (under `(admin)`):
- `dashboard`
- `clients` (+ `new`)
- `surveys` (+ `new`, + `[id]`, + `[id]/edit`)
- `library`
<!--/DOC00001:ADM&MOCK&HK-->

<!--DOC00002:MOCK-->
## Data Store

`fixtures.ts` seeds the initial snapshot with 4 clients, 5 surveys, and 5 library blocks.

`store.ts` exposes these mutations:
- `addClient`
- `addSurvey`
- `updateSurvey`
- `setSurveyStatus`
- `copySurvey`
- `addLibraryBlock`
- `updateLibraryBlock`

ABSENT mutations (no corresponding store API exists):
- `updateClient`
- `setClientStatus`
- `reopenSurvey`

Ids are stable via `crypto.randomUUID()`. `copySurvey` deep-clones and re-mints nested ids.

Persistence mechanism: `structuredClone` of the snapshot + write to `localStorage` + subscriber notification.
<!--/DOC00002:MOCK-->

<!--DOC00003:DT-->
## Domain Entities

Domain types defined in `types/domain.ts`:
- `Client`
- `ClientBranding`
- `Survey`
- `Block`
- `Question` (4 types: single-select / multi-select / text / date)
- `QuestionChoice` (carries `scoreCode`)
- `LibraryBlock`
- `TestResponse`

Absent / deferred (out of admin scope, deferred to runtime):
- `Provider`
- `Patient`
- `Medication`
- `Enrollment`
- `Check-in`
- `Response`
- `Alert`
<!--/DOC00003:DT-->

<!--DOC00004:ADM&MOCK&CMP-->
## Capabilities (implemented vs absent)

Implemented:
- Client list
- Add client
- White-label config + preview application
- Survey list
- Survey builder (assemble from library, reorder blocks)
- Copy survey
- Edit draft
- Stable ids
- Publish/archive lifecycle
- Library block CRUD
- Question editor (required + scoring codes)
- Respondent preview
- Mobile/desktop toggle
- Deterministic test responses

Absent:
- Client edit
- Client activate/deactivate
- Persistent client-context
- Client/survey search
- Re-open archived survey
- Ignore-validation mode
- Response export
- All provider/patient runtime

A full gap analysis derived from this research lives at `__Tasks/02_open/task-260617_1355-demo-delta-gap-analysis/research/RES-admin-panel-implementation-gap.md`.
<!--/DOC00004:ADM&MOCK&CMP-->
