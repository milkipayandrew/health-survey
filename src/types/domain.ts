/**
 * Domain types for the Admin demo of the patient medication check-in platform.
 *
 * @remarks
 * Models the ubiquitous language from the domain model (Client, Survey, Block,
 * Question) for the two in-scope Admin workflows, plus the {@link Enrollment}
 * whose effective cadence is resolved from the layered schedule model, and the
 * per-patient check-in cadence lifecycle ({@link Patient}, {@link CheckIn},
 * {@link Response}) that the resolved cadence drives (Workflow 2), and the
 * read-only Provider-dashboard entities ({@link Alert}, plus the
 * dashboard-relevant {@link Patient} demographics/score fields) the
 * provider-dashboard demo reads (Workflow 3, DOM00009). All runtime entities are
 * demo-scoped mock data — there is no live engine, backend, or auth.
 */

/** Whether a Client's check-ins are running. */
export type ClientStatus = 'active' | 'inactive';

/**
 * A Client's white-label branding, applied to everything patients would see.
 *
 * @remarks Brand colors are optional — neutral is acceptable for MVP.
 */
export interface ClientBranding {
  /** Logo shown on the survey. Stored as a URL or data URI for the mock. */
  logo: string;
  /** Primary brand color as a hex string (e.g. `#1d4ed8`). */
  primaryColor: string;
  /** Secondary/accent brand color as a hex string. */
  secondaryColor: string;
}

/**
 * A white-labeled healthcare organization Effective serves.
 *
 * @remarks Owns its own surveys; its branding is applied to patient-facing
 * screens. Managed (added, edited, activated/deactivated, switched between) by
 * the Admin.
 */
export interface Client {
  id: string;
  /** Organization name. Required; editable. */
  name: string;
  /** White-label branding applied to patient-facing screens. */
  branding: ClientBranding;
  /** Whether the client's check-ins are running. */
  status: ClientStatus;
  /** ISO-8601 timestamp of when the client was added. */
  createdAt: string;
}

/**
 * The fields an Admin supplies when onboarding a new Client. The store derives
 * the generated `id` and `createdAt`, so they are omitted here.
 */
export type NewClientInput = Omit<Client, 'id' | 'createdAt'>;

/** A Survey's draft-vs-live lifecycle state. */
export type SurveyStatus = 'draft' | 'published' | 'archived';

/** The MVP question-type set a Question can take. */
export type QuestionType = 'single-select' | 'multi-select' | 'text' | 'date';

/** A selectable choice for single/multi-select questions, with a scoring code. */
export interface QuestionChoice {
  id: string;
  label: string;
  /** Per-choice numeric scoring code (incl. reverse) driving adherence score. */
  scoreCode: number;
}

/**
 * A branching display condition: the question is shown only when the gateway
 * question's answer matches the triggering choice.
 *
 * @remarks Models the domain model's `Question.Display condition` — branching
 * visibility revealed by a gateway answer (e.g. an SDOH gateway reveals
 * housing/food/transport questions). Demo-level: visibility is computed during
 * render from the current preview answers, not by a live runtime engine.
 */
export interface DisplayCondition {
  /** The gateway question whose answer governs this question's visibility. */
  questionId: string;
  /** The gateway choice id that, when selected, reveals this question. */
  choiceId: string;
}

/**
 * A single question within a Block, of a defined type, optionally required, and
 * optionally shown only when a branching display condition applies.
 */
export interface Question {
  id: string;
  type: QuestionType;
  /** The question prompt shown to the patient. */
  label: string;
  /** Whether an answer is mandatory. */
  required: boolean;
  /** Choices for single/multi-select questions; empty for text/date. */
  choices: QuestionChoice[];
  /**
   * Optional branching visibility: when set, the question is shown only once the
   * gateway answer applies. Absent means the question is always shown.
   */
  displayCondition?: DisplayCondition;
}

/**
 * When a Block applies on a check-in run.
 *
 * @remarks Models the domain model's `Block.Inclusion`: `'initial'` blocks run
 * only on the first check-in (e.g. identity/contact/demographics), `'recurring'`
 * blocks run only on subsequent check-ins, and `'always'` blocks run on every
 * run. Legacy/existing data without this field defaults to `'always'`.
 */
export type BlockInclusion = 'initial' | 'recurring' | 'always';

/**
 * A reusable group of questions (acknowledgments, demographics, medication) —
 * the unit surveys are assembled from.
 */
export interface Block {
  id: string;
  /** Block label. Required. */
  name: string;
  /** Position within the survey. */
  order: number;
  /**
   * When this block applies on a run (initial-only / recurring / always).
   * Optional for backward-compatibility; absent is treated as `'always'`.
   */
  inclusion?: BlockInclusion;
  questions: Question[];
}

/**
 * The granularity of a {@link Schedule}'s re-send interval.
 *
 * @remarks Models the domain model's Schedule "Interval" attribute
 * (every N days / weeks / months).
 */
export type ScheduleUnit = 'days' | 'weeks' | 'months';

/**
 * Which cadence layer a {@link Schedule} governs — the domain model's Schedule
 * "Scope" attribute.
 *
 * @remarks One of the three layers a schedule can be attached as:
 * `'survey-default'` (the Survey's baseline), `'block-group-override'` (a
 * {@link BlockGroup}'s override of that baseline), or `'medication-preset'`
 * (the per-medication-type preset that forms the lowest cadence layer). The
 * effective cadence applied to a patient resolves across these layers:
 * survey default → block-group override → medication preset.
 */
export type ScheduleScope =
  | 'survey-default'
  | 'block-group-override'
  | 'medication-preset';

/**
 * A reusable configuration of *how often* and *when* check-ins are sent —
 * the domain model's `Schedule` (interval + first-send timing + scope).
 *
 * @remarks The reusable cadence-config unit, attached as the Survey's
 * {@link Survey.defaultSchedule}, optionally per {@link BlockGroup} as an
 * override, and as a {@link Medication} type's preset. Its {@link Schedule.scope}
 * records which of those three layers it governs. No live scheduler consumes
 * this — it configures values for authoring/preview only.
 */
export interface Schedule {
  /** Re-send period count (e.g. `2` with `unit: 'weeks'` = every 2 weeks). */
  every: number;
  /** The interval's unit of time. */
  unit: ScheduleUnit;
  /**
   * When the first check-in goes out, as a whole-day offset from enrollment
   * (`0` = same day). Models the domain "first-send timing".
   */
  firstSendOffsetDays: number;
  /**
   * Which of the three cadence layers this schedule governs (survey default,
   * block-group override, or medication preset) — the domain "Scope" attribute.
   */
  scope: ScheduleScope;
}

/**
 * A drug/regimen class whose type maps to a {@link Schedule} preset — the
 * domain model's `Medication`.
 *
 * @remarks The medication's type is the key that maps to a re-send schedule
 * preset (e.g. GLP-1 → every 2 weeks, cardiovascular → monthly). That preset is
 * the lowest cadence layer: it feeds a patient's effective cadence as a fallback
 * when no survey default or block-group override applies. Modeled as a
 * first-class entity (referenced by an enrollment) to future-proof
 * multi-medication monitoring.
 */
export interface Medication {
  id: string;
  /** Medication name. Required. */
  name: string;
  /** The medication class that maps to a schedule preset. Required. */
  type: string;
  /**
   * The default re-send interval for this medication type — the lowest cadence
   * layer. Its {@link Schedule.scope} is `'medication-preset'`.
   */
  schedulePreset: Schedule;
}

/**
 * The fields an Admin supplies when adding a Medication preset. The store
 * derives the generated `id`, so it is omitted here.
 */
export type NewMedicationInput = Omit<Medication, 'id'>;

/**
 * A named grouping of blocks within a Survey that can carry its own schedule
 * overriding the survey default — the domain model's `Block Group`. Introduces
 * the canonical layer between Survey and Block
 * (`Survey ||--o{ BlockGroup ||--o{ Block`), so different parts of one survey
 * can recur on different intervals.
 */
export interface BlockGroup {
  id: string;
  /** Group label. Required. */
  name: string;
  /** Position within the survey. */
  order: number;
  /**
   * Optional schedule overriding the survey default. When absent, the group
   * inherits the survey's {@link Survey.defaultSchedule}.
   */
  schedule?: Schedule;
  /** The grouped blocks, in order. */
  blocks: Block[];
}

/**
 * The configured check-in definition owned by a Client. Assembled from grouped
 * blocks, with a default schedule and a draft-vs-live lifecycle, managed within
 * a client's context.
 */
export interface Survey {
  id: string;
  /** The owning Client. */
  clientId: string;
  /** Identifies the survey config. Required. */
  name: string;
  /** Draft-vs-live lifecycle state. */
  status: SurveyStatus;
  /** Canonical source language (e.g. `en`). Translations derive from it. */
  baseLanguage: string;
  /**
   * The survey's baseline send interval + first-send timing. A block group's
   * schedule overrides this for its own blocks; otherwise this is the effective
   * cadence (see the scheduling resolution helper).
   */
  defaultSchedule: Schedule;
  /** The assembled block groups, in order, each containing ordered blocks. */
  blockGroups: BlockGroup[];
  /** ISO-8601 timestamp of when the survey was first created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent edit. */
  updatedAt: string;
}

/**
 * The fields an Admin supplies when assembling a new Survey in the builder. The
 * store derives the generated `id`, the Draft `status`, and the created/updated
 * timestamps, so they are omitted here.
 */
export type NewSurveyInput = Omit<
  Survey,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

/** Whether a patient's monitoring program is still running. */
export type EnrollmentStatus = 'active' | 'stopped';

/**
 * Links a Patient to a Survey and Medication — the monitoring program whose
 * effective cadence is resolved from the layered schedule model and drives the
 * recurring sends. The domain model's `Enrollment` (DOM00020).
 *
 * @remarks The {@link Enrollment.effectiveCadence} is the resolved interval
 * applied to this patient, computed across the cadence layers
 * (survey default → block-group override → medication preset; see the
 * scheduling resolution helper). Storing the resolved value here is what lets
 * downstream check-in scheduling read a single cadence without re-resolving the
 * layers. The block group whose override applies (when any) is identified by
 * {@link Enrollment.blockGroupId}; absent means the survey-level cadence applies.
 */
export interface Enrollment {
  id: string;
  /** The enrolled Patient (referenced by id; Patient is out of demo scope). */
  patientId: string;
  /** The Survey supplying the default schedule and block-group overrides. */
  surveyId: string;
  /** The Medication supplying the preset (lowest cadence layer). */
  medicationId: string;
  /**
   * The block group whose schedule override governs this enrollment's cadence,
   * when one applies. Absent means no block-group layer — the survey default (or
   * medication preset) applies.
   */
  blockGroupId?: string;
  /**
   * The resolved interval between check-ins for this patient — the domain's
   * "Effective cadence". Resolved across layers: block-group override → survey
   * default → medication preset (lowest fallback).
   */
  effectiveCadence: Schedule;
  /** Whether monitoring is running; stops on screen-out (med discontinued). */
  status: EnrollmentStatus;
  /** ISO-8601 timestamp of when monitoring began. Required. */
  startDate: string;
}

/**
 * The fields supplied to enroll a patient before the effective cadence is
 * resolved. The resolver derives {@link Enrollment.effectiveCadence}, and the
 * store derives the generated `id`, so both are omitted here.
 */
export type NewEnrollmentInput = Omit<Enrollment, 'id' | 'effectiveCadence'>;

/**
 * A patient's demographic attributes — the domain model's Patient
 * `Demographics` (DOM00015): captured once and hidden on recurring check-ins.
 *
 * @remarks Surfaced to the provider dashboard so the patient population can be
 * aggregated/grouped by category (e.g. age band, gender). Demo-scoped: these are
 * mock attributes for the dashboard's category breakdown, not a full
 * demographics model.
 */
export interface Demographics {
  /** Patient gender (e.g. `female`, `male`, `other`) — a grouping category. */
  gender: string;
  /** Patient age band (e.g. `18-39`, `40-64`, `65+`) — a grouping category. */
  ageBand: string;
}

/**
 * A person monitored on medication who receives and completes check-ins — the
 * domain model's `Patient` (DOM00015). The contact record whose phone must stay
 * valid for the next scheduled send: a patient is identified by phone on
 * recurring check-ins, and the lifecycle updates this record on each response.
 *
 * @remarks Contacts are kept **per client** (`clientId`) so each client's
 * patient population stays separate (REQ00007). The {@link Patient.email},
 * {@link Patient.dateOfBirth}, {@link Patient.demographics}, and
 * {@link Patient.language} fields are read-only demo attributes the provider
 * dashboard reads (DOM00009): `name`/`email` drive the patient-list filter and
 * `demographics` drives the aggregate-by-category breakdown. They are optional so
 * the Workflow-2 check-in lifecycle, which only needs identity + phone, is
 * unaffected.
 */
export interface Patient {
  id: string;
  /** The Client whose patient population this contact belongs to. */
  clientId: string;
  /** Patient's name. Verified each check-in. */
  name: string;
  /**
   * Identity + SMS + OTP channel. Required and must stay valid for the next
   * send — a bad/blank phone breaks the next scheduled send (REQ00006).
   */
  phone: string;
  /** Contact email — a filter key for the provider dashboard's patient list. */
  email?: string;
  /** Date of birth (ISO-8601 `YYYY-MM-DD`). Identity field verified each check-in. */
  dateOfBirth?: string;
  /** Demographics (race, gender, etc.); captured once, hidden on recurring check-ins. */
  demographics?: Demographics;
  /** Preferred language (e.g. `en`, `es`); defaults per contact, drives survey language. */
  language?: string;
}

/**
 * The fields supplied when registering a new {@link Patient} contact. The store
 * derives the generated `id`, so it is omitted here.
 */
export type NewPatientInput = Omit<Patient, 'id'>;

/**
 * A check-in's lifecycle state — the domain model's Check-in `Status` (DOM00021)
 * and the states of the Check-in Lifecycle (DOM00004).
 *
 * @remarks Progression: `'scheduled'` (cadence cycle due) → `'sent'` (SMS
 * dispatched) → `'in-progress'` (patient opens link & passes OTP) →
 * `'completed'` (patient submits). `'sent'` and `'in-progress'` can each branch
 * to `'expired'` when the active period ends before open or a partial response
 * times out.
 */
export type CheckInStatus =
  | 'scheduled'
  | 'sent'
  | 'in-progress'
  | 'completed'
  | 'expired';

/**
 * A single scheduled survey occurrence sent to a patient — the domain model's
 * `Check-in` (DOM00021). One link for one cadence cycle, with its own status and
 * expiry.
 *
 * @remarks The link arrives by SMS (REQ00008), or for the first / in-office
 * check-in is reached by scanning a QR code that encodes the same link. One
 * submission per link (REQ00006). Created in `'scheduled'` state when a cadence
 * cycle is due and transitioned through the {@link CheckInStatus} states.
 */
export interface CheckIn {
  id: string;
  /** The Enrollment this check-in belongs to (its cadence drives the timing). */
  enrollmentId: string;
  /**
   * The link the patient opens — delivered by SMS, or encoded in an in-office QR
   * code for the first check-in. One submission per link.
   */
  link: string;
  /** The lifecycle state. See the Check-in Lifecycle. */
  status: CheckInStatus;
  /**
   * Dispatch time (ISO-8601). Set when the SMS is dispatched (`'sent'`); absent
   * while still `'scheduled'`.
   */
  sentAt?: string;
  /**
   * End of the active period (ISO-8601), after which a stale link is rejected.
   * Set when the check-in is dispatched.
   */
  expiresAt?: string;
}

/**
 * A patient's submitted answers for a check-in — the domain model's `Response`
 * (DOM00022). Recording a Response is what advances the check-in to
 * `'completed'` and triggers the contact-update + next-send step of the
 * lifecycle (Workflow 2).
 */
export interface Response {
  id: string;
  /** The Check-in this response answers. */
  checkInId: string;
  /**
   * The patient's contact details as confirmed on this check-in. Used to update
   * the {@link Patient} contact record so the next send stays valid (REQ00007).
   */
  contact: ResponseContact;
  /**
   * Weighted adherence score; lower is better. Computed from scoring codes
   * downstream (scoring is out of this slice's scope).
   */
  adherenceScore?: number;
  /** Optional free-text message to the provider. */
  freeText?: string;
  /** Completion time (ISO-8601). */
  submittedAt: string;
}

/**
 * The contact fields a patient confirms when submitting a {@link Response},
 * carried back to refresh the {@link Patient} record for the next send.
 */
export interface ResponseContact {
  /** The patient's name as confirmed on this check-in. */
  name: string;
  /** The patient's phone as confirmed on this check-in — kept valid for SMS. */
  phone: string;
}

/**
 * A notification raised to a provider when a {@link Response} indicates the
 * patient should be contacted (e.g. severe side effects, high adherence score) —
 * the domain model's `Alert` (DOM00023). A concerning response may raise one or
 * more alerts (DOM00002: `Response ||--o{ Alert`).
 *
 * @remarks Surfaced **read-only** on the provider dashboard — a flag/badge/list
 * of who needs follow-up. The acknowledge/handle alert lifecycle is out of demo
 * scope, so this carries no status/handled field. Demo-scoped mock data: no
 * engine raises these; they are seeded against the responses they "concern".
 */
export interface Alert {
  id: string;
  /** The Patient the alert concerns. Required. */
  patientId: string;
  /**
   * The Response that triggered the alert (DOM00002 `may trigger`); links the
   * alert back to the concerning submission for the drill-down.
   */
  responseId: string;
  /** Why the alert fired (e.g. `High adherence score`, `Severe side effects`). Required. */
  reason: string;
  /** When the alert was raised (ISO-8601). */
  createdAt: string;
}

/**
 * Library template entities the survey builder assembles from. They carry no
 * survey/client identity until copied into a Survey.
 */

/** A reusable Question template in the library. */
export type LibraryQuestion = Omit<Question, 'id'>;

/** A reusable Block template (with its questions) in the library. */
export interface LibraryBlock extends Pick<Block, 'id' | 'name'> {
  /** Short description of what the block covers, for the builder library UI. */
  description: string;
  questions: LibraryQuestion[];
}

/**
 * The fields an Admin supplies when creating or editing a library Block. The
 * store derives the generated `id`, so it is omitted here.
 */
export type NewLibraryBlockInput = Omit<LibraryBlock, 'id'>;

/**
 * Canned test-response data the Admin generates to validate a survey's logic
 * before publishing. These stand in for the real scoring engine (out of scope):
 * the answers and scores are fabricated deterministically from the survey's own
 * questions/choices/scoreCodes, not computed by a live engine.
 */

/** A single fabricated answer to one question within a test response. */
export interface TestResponseAnswer {
  /** The answered question's id. */
  questionId: string;
  /** The question prompt, echoed for display. */
  questionLabel: string;
  /** Human-readable rendering of the chosen answer(s). */
  answerLabel: string;
  /** Per-answer scoring code(s) summed into the response's adherence score. */
  scoreContribution: number;
}

/** A risk tier derived from a fabricated adherence score, for at-a-glance triage. */
export type TestResponseRisk = 'low' | 'medium' | 'high';

/** One fabricated respondent's complete test response to a survey. */
export interface TestResponse {
  id: string;
  /** Display label for the fabricated respondent (e.g. `Test patient 1`). */
  respondentLabel: string;
  /** The fabricated answers, one per scored/answered question. */
  answers: TestResponseAnswer[];
  /** Summed adherence score across the answers (higher means greater risk). */
  score: number;
  /** Risk tier derived from {@link TestResponse.score}. */
  risk: TestResponseRisk;
}

/**
 * The full mock dataset persisted/served by the mock store. The shape mirrors
 * what a real backend would return for the Admin surface.
 */
export interface MockData {
  clients: Client[];
  surveys: Survey[];
  /** Reusable block library the builder assembles surveys from. */
  blockLibrary: LibraryBlock[];
  /**
   * Medication presets mapping a medication type to its schedule preset (the
   * lowest cadence layer).
   */
  medications: Medication[];
}

/**
 * The demo-scoped runtime dataset the provider dashboard reads — the runtime
 * entities (Patient, Enrollment, Check-in, Response, Alert) that are otherwise
 * not modeled by the Admin platform (REQ00006). Kept separate from
 * {@link MockData} (the Admin store) so the dashboard's mock data stays clearly
 * demo-scoped and read-only.
 *
 * @remarks Every record carries the relationships from DOM00002:
 * `Client ||--o{ Patient`, `Patient ||--o{ Enrollment`,
 * `Enrollment ||--o{ CheckIn`, `CheckIn ||--o| Response`,
 * `Response ||--o{ Alert`. Scope the rows by `Patient.clientId` /
 * `Enrollment.surveyId` to read one client's population.
 */
export interface RuntimeMockData {
  patients: Patient[];
  enrollments: Enrollment[];
  checkIns: CheckIn[];
  responses: Response[];
  alerts: Alert[];
}
