import type {
  Alert,
  Enrollment,
  Patient,
  Response,
  RuntimeMockData,
} from '@/types/domain';

/**
 * Read-only aggregation of the runtime mock data into the shapes the provider
 * dashboard's population summary and patient list render (Workflow 3, DOM00009).
 *
 * @remarks
 * Pure functions — no state, no side effects. The provider dashboard reads one
 * Client's population (DOM00013 `Client ||--o{ Patient`), so the entry point
 * {@link aggregateClientPopulation} scopes by `Patient.clientId` and rolls each
 * patient's {@link Response}s (reached via the
 * `Patient ||--o{ Enrollment ||--o{ CheckIn ||--o| Response` chain, DOM00002)
 * up into a single {@link PatientSummary}. Patients are then grouped **by
 * category** (adherence risk band + demographics) for the aggregated summary.
 * Adherence score is "lower is better" (DOM00022), so a higher latest score is a
 * higher risk band. Alerts (DOM00023) are surfaced read-only — counted per
 * patient so the list can flag who needs follow-up — with no acknowledge/handle
 * lifecycle.
 */

/**
 * An adherence risk band derived from a patient's latest adherence score — the
 * category axis for the population breakdown. Lower adherence score is better
 * (DOM00022), so `'high'` is the worst band.
 */
export type RiskBand = 'low' | 'medium' | 'high';

/** Score thresholds (inclusive lower bound) mapping a latest score to a band. */
const RISK_THRESHOLDS: { min: number; band: RiskBand }[] = [
  { min: 6, band: 'high' },
  { min: 3, band: 'medium' },
  { min: 0, band: 'low' },
];

/** Human-readable label for each risk band, for the summary headings. */
export const RISK_BAND_LABELS: Record<RiskBand, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};

/** Derives the adherence risk band from a latest adherence score. */
function bandForScore(score: number): RiskBand {
  return RISK_THRESHOLDS.find((threshold) => score >= threshold.min)?.band ?? 'low';
}

/**
 * One patient rolled up across their responses — the unit the patient list
 * renders and the population summary groups by category.
 */
export interface PatientSummary {
  /** The underlying patient (name/email drive the list filter; demographics the breakdown). */
  patient: Patient;
  /** Number of completed, scored check-ins rolled up for this patient. */
  responseCount: number;
  /** The patient's most recent adherence score, when any response is scored. */
  latestScore?: number;
  /** ISO-8601 timestamp of the patient's most recent response, when any. */
  latestSubmittedAt?: string;
  /** Risk band from the latest score; `undefined` when the patient has no scored response. */
  riskBand?: RiskBand;
  /** Open alerts concerning this patient (read-only; who needs follow-up). */
  alerts: Alert[];
}

/** A single category bucket in the aggregated population summary. */
export interface CategoryBreakdownItem {
  /** The category value (e.g. a risk-band label, a gender, an age band). */
  label: string;
  /** How many patients fall in this category. */
  count: number;
}

/**
 * The aggregated patient-population summary, rolled up by category (DOM00009 —
 * "recorded only, aggregated in dashboard"). Each axis is a list of buckets over
 * the same client population.
 */
export interface PopulationSummary {
  /** Total patients in the client's population. */
  totalPatients: number;
  /** Total patients with at least one open alert (who needs follow-up). */
  patientsNeedingFollowUp: number;
  /** Patient counts grouped by adherence risk band (worst band first). */
  byRiskBand: CategoryBreakdownItem[];
  /** Patient counts grouped by demographic age band. */
  byAgeBand: CategoryBreakdownItem[];
  /** Patient counts grouped by demographic gender. */
  byGender: CategoryBreakdownItem[];
}

/**
 * The provider dashboard's view of one client's population: the per-patient
 * roll-ups and the by-category summary over them.
 */
export interface ClientPopulation {
  /** Per-patient roll-ups, most-recently-active first. */
  patients: PatientSummary[];
  /** The aggregated by-category summary over {@link ClientPopulation.patients}. */
  summary: PopulationSummary;
}

/** Counts occurrences of each derived key, preserving first-seen order. */
function tallyBy<TItem>(
  items: TItem[],
  keyOf: (item: TItem) => string,
): CategoryBreakdownItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([label, count]) => ({ label, count }));
}

/**
 * Rolls one patient's responses up into a {@link PatientSummary}.
 *
 * @param patient - The patient to summarise.
 * @param responses - This patient's responses (already scoped to the patient).
 * @param alerts - This patient's alerts (already scoped to the patient).
 * @returns The patient's roll-up: latest score + risk band + alert flags.
 */
function summarisePatient(
  patient: Patient,
  responses: Response[],
  alerts: Alert[],
): PatientSummary {
  // Most recent response by submission time drives the latest score / risk band.
  const sorted = [...responses].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  );
  const latest = sorted.find((response) => response.adherenceScore !== undefined);
  const latestScore = latest?.adherenceScore;

  return {
    patient,
    responseCount: responses.length,
    latestScore,
    latestSubmittedAt: sorted[0]?.submittedAt,
    riskBand: latestScore === undefined ? undefined : bandForScore(latestScore),
    alerts,
  };
}

/**
 * Aggregates one client's runtime population for the provider dashboard.
 *
 * @remarks
 * Scopes by `Patient.clientId` (DOM00013), then walks the
 * `Patient → Enrollment → CheckIn → Response` chain (DOM00002) to collect each
 * patient's responses, and attaches each patient's alerts (DOM00023). Patients
 * are ordered most-recently-active first so the list leads with fresh activity.
 *
 * @param runtime - The full runtime mock dataset (a caller-owned copy).
 * @param clientId - The client whose population to read.
 * @returns The per-patient roll-ups plus the by-category summary over them.
 */
export function aggregateClientPopulation(
  runtime: RuntimeMockData,
  clientId: string,
): ClientPopulation {
  const patients = runtime.patients.filter(
    (patient) => patient.clientId === clientId,
  );
  const patientIds = new Set(patients.map((patient) => patient.id));

  // Index the chain so each lookup stays O(1): enrollment → patient,
  // check-in → enrollment, response → check-in.
  const enrollmentToPatient = new Map<string, string>(
    runtime.enrollments
      .filter((enrollment) => patientIds.has(enrollment.patientId))
      .map((enrollment: Enrollment) => [enrollment.id, enrollment.patientId]),
  );
  const checkInToPatient = new Map<string, string>();
  for (const checkIn of runtime.checkIns) {
    const patientId = enrollmentToPatient.get(checkIn.enrollmentId);
    if (patientId !== undefined) {
      checkInToPatient.set(checkIn.id, patientId);
    }
  }

  // Bucket responses and alerts by patient id.
  const responsesByPatient = new Map<string, Response[]>();
  for (const response of runtime.responses) {
    const patientId = checkInToPatient.get(response.checkInId);
    if (patientId === undefined) {
      continue;
    }
    const bucket = responsesByPatient.get(patientId) ?? [];
    bucket.push(response);
    responsesByPatient.set(patientId, bucket);
  }

  const alertsByPatient = new Map<string, Alert[]>();
  for (const alert of runtime.alerts) {
    if (!patientIds.has(alert.patientId)) {
      continue;
    }
    const bucket = alertsByPatient.get(alert.patientId) ?? [];
    bucket.push(alert);
    alertsByPatient.set(alert.patientId, bucket);
  }

  const summaries = patients
    .map((patient) =>
      summarisePatient(
        patient,
        responsesByPatient.get(patient.id) ?? [],
        alertsByPatient.get(patient.id) ?? [],
      ),
    )
    .sort((a, b) =>
      (b.latestSubmittedAt ?? '').localeCompare(a.latestSubmittedAt ?? ''),
    );

  return { patients: summaries, summary: summariseByCategory(summaries) };
}

/** Order risk-band buckets worst-first so triage leads with high risk. */
const RISK_BAND_ORDER: RiskBand[] = ['high', 'medium', 'low'];

/** Builds the by-category {@link PopulationSummary} over patient roll-ups. */
function summariseByCategory(summaries: PatientSummary[]): PopulationSummary {
  const banded = summaries.filter(
    (summary): summary is PatientSummary & { riskBand: RiskBand } =>
      summary.riskBand !== undefined,
  );

  const byRiskBand = RISK_BAND_ORDER.map((band) => ({
    label: RISK_BAND_LABELS[band],
    count: banded.filter((summary) => summary.riskBand === band).length,
  })).filter((bucket) => bucket.count > 0);

  return {
    totalPatients: summaries.length,
    patientsNeedingFollowUp: summaries.filter(
      (summary) => summary.alerts.length > 0,
    ).length,
    byRiskBand,
    byAgeBand: tallyBy(
      summaries,
      (summary) => summary.patient.demographics?.ageBand ?? 'Unknown',
    ),
    byGender: tallyBy(
      summaries,
      (summary) => summary.patient.demographics?.gender ?? 'Unknown',
    ),
  };
}

/**
 * One client patient's full drill-down detail — the unit the single-patient
 * drill-down renders: the patient, their complete response history (oldest →
 * newest, so the longitudinal graph reads left-to-right over time), and their
 * read-only alerts.
 */
export interface PatientDetail {
  /** The patient being drilled into (name identifies them; DOM00015). */
  patient: Patient;
  /**
   * The patient's responses ordered oldest → newest by `submittedAt`
   * (DOM00022 — "Submitted at enables longitudinal graph"), each carrying its
   * adherence score (lower is better) and optional free text for the provider.
   */
  responses: Response[];
  /** Open alerts concerning this patient (read-only; who needs follow-up). */
  alerts: Alert[];
}

/**
 * Reads one patient's full drill-down detail from the runtime dataset, scoped to
 * the client.
 *
 * @remarks
 * Walks the same `Patient → Enrollment → CheckIn → Response` chain (DOM00002) as
 * {@link aggregateClientPopulation} but for a single patient, returning the full
 * response history (sorted oldest → newest for the longitudinal graph) plus the
 * patient's alerts (DOM00023). Returns `undefined` when no patient with that id
 * belongs to the client, so callers can render a not-found state.
 *
 * @param runtime - The full runtime mock dataset (a caller-owned copy).
 * @param clientId - The client the patient must belong to (scopes the read).
 * @param patientId - The patient to drill into.
 * @returns The patient's detail, or `undefined` when not found for the client.
 */
export function buildPatientDetail(
  runtime: RuntimeMockData,
  clientId: string,
  patientId: string,
): PatientDetail | undefined {
  const patient = runtime.patients.find(
    (candidate) => candidate.id === patientId && candidate.clientId === clientId,
  );
  if (patient === undefined) {
    return undefined;
  }

  // Index this patient's enrollments and check-ins so responses resolve back to
  // the patient via the DOM00002 chain.
  const enrollmentIds = new Set(
    runtime.enrollments
      .filter((enrollment) => enrollment.patientId === patient.id)
      .map((enrollment) => enrollment.id),
  );
  const checkInIds = new Set(
    runtime.checkIns
      .filter((checkIn) => enrollmentIds.has(checkIn.enrollmentId))
      .map((checkIn) => checkIn.id),
  );

  const responses = runtime.responses
    .filter((response) => checkInIds.has(response.checkInId))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  const alerts = runtime.alerts.filter(
    (alert) => alert.patientId === patient.id,
  );

  return { patient, responses, alerts };
}

/**
 * Filters patient roll-ups by a free-text query over name and email
 * (case-insensitive substring) for the dashboard's patient-list filter.
 *
 * @param summaries - The patient roll-ups to filter.
 * @param query - The raw query string (trimmed/lowercased here).
 * @returns The matching roll-ups; the full list when the query is blank.
 */
export function filterPatientsByNameOrEmail(
  summaries: PatientSummary[],
  query: string,
): PatientSummary[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === '') {
    return summaries;
  }
  return summaries.filter(({ patient }) => {
    const haystack = `${patient.name} ${patient.email ?? ''}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
