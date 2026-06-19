import type {
  Alert,
  CheckIn,
  Enrollment,
  Patient,
  Response,
  RuntimeMockData,
  Schedule,
} from '@/types/domain';

/**
 * Demo-scoped seed fixtures for the provider dashboard (Workflow 3, DOM00009).
 *
 * @remarks
 * Pure data — no behavior. The runtime entities (Patient, Enrollment, Check-in,
 * Response, Alert) are intentionally not modeled by the Admin platform
 * (REQ00006); these mock rows exist only to drive the read-only provider
 * dashboard so it reads as realistic (REQ00005). Ids are stable literals (not
 * generated) so rows are addressable and deterministic across reads. Rows follow
 * the domain relationships (DOM00002): each {@link Patient} belongs to a Client,
 * each {@link Enrollment} links a Patient to a Survey + Medication, each
 * {@link CheckIn} belongs to an Enrollment, each {@link Response} answers a
 * Check-in, and each {@link Alert} concerns the patient/response that raised it.
 *
 * The seed is scoped **per client** (`Patient.clientId`) so the dashboard reads
 * one client's population in isolation. Several patients per client each carry a
 * run of responses over time ({@link Response.submittedAt}) with an
 * {@link Response.adherenceScore} so the longitudinal graph has a real trend;
 * a subset carry free-text and a raised {@link Alert} for the triage view.
 */

/** Weekly cadence used for the seeded enrollments' effective cadence. */
const WEEKLY: Schedule = {
  every: 1,
  unit: 'weeks',
  firstSendOffsetDays: 0,
  scope: 'survey-default',
};

/** Biweekly cadence (the GLP-1 medication preset) for one enrollment. */
const BIWEEKLY: Schedule = {
  every: 2,
  unit: 'weeks',
  firstSendOffsetDays: 0,
  scope: 'medication-preset',
};

/**
 * Per-client patient directory (DOM00013 `Client ||--o{ Patient`). Each patient
 * carries the dashboard-read attributes: name/email for the list filter and
 * demographics (gender + age band) for the aggregate-by-category breakdown
 * (DOM00015).
 */
export const SEED_PATIENTS: Patient[] = [
  // Bayside Community Pharmacy — the richest population for the demo.
  {
    id: 'patient-bs-ava',
    clientId: 'client-bayside',
    name: 'Ava Thompson',
    phone: '+15125550101',
    email: 'ava.thompson@example.com',
    dateOfBirth: '1958-03-12',
    demographics: { gender: 'female', ageBand: '65+' },
    language: 'en',
  },
  {
    id: 'patient-bs-marcus',
    clientId: 'client-bayside',
    name: 'Marcus Lee',
    phone: '+15125550102',
    email: 'marcus.lee@example.com',
    dateOfBirth: '1972-09-30',
    demographics: { gender: 'male', ageBand: '40-64' },
    language: 'en',
  },
  {
    id: 'patient-bs-sofia',
    clientId: 'client-bayside',
    name: 'Sofia Ramirez',
    phone: '+15125550103',
    email: 'sofia.ramirez@example.com',
    dateOfBirth: '1990-06-18',
    demographics: { gender: 'female', ageBand: '18-39' },
    language: 'es',
  },
  {
    id: 'patient-bs-james',
    clientId: 'client-bayside',
    name: 'James Okafor',
    phone: '+15125550104',
    email: 'james.okafor@example.com',
    dateOfBirth: '1965-11-02',
    demographics: { gender: 'male', ageBand: '40-64' },
    language: 'en',
  },
  // River Valley FQHC.
  {
    id: 'patient-rv-elena',
    clientId: 'client-rivervalley',
    name: 'Elena Petrova',
    phone: '+15125550201',
    email: 'elena.petrova@example.com',
    dateOfBirth: '1948-01-25',
    demographics: { gender: 'female', ageBand: '65+' },
    language: 'en',
  },
  {
    id: 'patient-rv-david',
    clientId: 'client-rivervalley',
    name: 'David Nguyen',
    phone: '+15125550202',
    email: 'david.nguyen@example.com',
    dateOfBirth: '1985-07-14',
    demographics: { gender: 'male', ageBand: '40-64' },
    language: 'en',
  },
];

/**
 * Enrollments (DOM00020) linking each seeded Patient to a Survey + Medication
 * (DOM00002 `Patient ||--o{ Enrollment`, `Survey ||--o{ Enrollment`,
 * `Medication ||--o{ Enrollment`). The {@link Enrollment.effectiveCadence} is the
 * resolved interval seeded directly (the dashboard reads it; the resolver is not
 * re-run here).
 */
export const SEED_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enrollment-bs-ava',
    patientId: 'patient-bs-ava',
    surveyId: 'survey-bayside-statin',
    medicationId: 'medication-cardiovascular',
    effectiveCadence: WEEKLY,
    status: 'active',
    startDate: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'enrollment-bs-marcus',
    patientId: 'patient-bs-marcus',
    surveyId: 'survey-bayside-statin',
    medicationId: 'medication-cardiovascular',
    effectiveCadence: WEEKLY,
    status: 'active',
    startDate: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'enrollment-bs-sofia',
    patientId: 'patient-bs-sofia',
    surveyId: 'survey-bayside-statin',
    medicationId: 'medication-glp1',
    effectiveCadence: BIWEEKLY,
    status: 'active',
    startDate: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'enrollment-bs-james',
    patientId: 'patient-bs-james',
    surveyId: 'survey-bayside-statin',
    medicationId: 'medication-cardiovascular',
    effectiveCadence: WEEKLY,
    status: 'stopped',
    startDate: '2026-03-15T09:00:00.000Z',
  },
  {
    id: 'enrollment-rv-elena',
    patientId: 'patient-rv-elena',
    surveyId: 'survey-rivervalley-bp',
    medicationId: 'medication-cardiovascular',
    effectiveCadence: WEEKLY,
    status: 'active',
    startDate: '2026-04-08T09:00:00.000Z',
  },
  {
    id: 'enrollment-rv-david',
    patientId: 'patient-rv-david',
    surveyId: 'survey-rivervalley-bp',
    medicationId: 'medication-cardiovascular',
    effectiveCadence: WEEKLY,
    status: 'active',
    startDate: '2026-04-08T09:00:00.000Z',
  },
];

/**
 * One completed Check-in (DOM00021) per seeded Response, in the order the
 * responses were submitted (DOM00002 `Enrollment ||--o{ CheckIn`,
 * `CheckIn ||--o| Response`). All are `'completed'` — the dashboard only surfaces
 * answered check-ins.
 */
export const SEED_CHECKINS: CheckIn[] = [
  // Ava — four weekly check-ins (improving adherence).
  checkIn('checkin-bs-ava-1', 'enrollment-bs-ava', '2026-04-08'),
  checkIn('checkin-bs-ava-2', 'enrollment-bs-ava', '2026-04-15'),
  checkIn('checkin-bs-ava-3', 'enrollment-bs-ava', '2026-04-22'),
  checkIn('checkin-bs-ava-4', 'enrollment-bs-ava', '2026-04-29'),
  // Marcus — four weekly check-ins (worsening adherence → alert).
  checkIn('checkin-bs-marcus-1', 'enrollment-bs-marcus', '2026-04-08'),
  checkIn('checkin-bs-marcus-2', 'enrollment-bs-marcus', '2026-04-15'),
  checkIn('checkin-bs-marcus-3', 'enrollment-bs-marcus', '2026-04-22'),
  checkIn('checkin-bs-marcus-4', 'enrollment-bs-marcus', '2026-04-29'),
  // Sofia — three biweekly check-ins (steady, low score).
  checkIn('checkin-bs-sofia-1', 'enrollment-bs-sofia', '2026-04-15'),
  checkIn('checkin-bs-sofia-2', 'enrollment-bs-sofia', '2026-04-29'),
  checkIn('checkin-bs-sofia-3', 'enrollment-bs-sofia', '2026-05-13'),
  // James — two check-ins before the enrollment was stopped.
  checkIn('checkin-bs-james-1', 'enrollment-bs-james', '2026-03-22'),
  checkIn('checkin-bs-james-2', 'enrollment-bs-james', '2026-03-29'),
  // Elena — three weekly check-ins (side-effect concern → alert).
  checkIn('checkin-rv-elena-1', 'enrollment-rv-elena', '2026-04-15'),
  checkIn('checkin-rv-elena-2', 'enrollment-rv-elena', '2026-04-22'),
  checkIn('checkin-rv-elena-3', 'enrollment-rv-elena', '2026-04-29'),
  // David — three weekly check-ins (steady, low score).
  checkIn('checkin-rv-david-1', 'enrollment-rv-david', '2026-04-15'),
  checkIn('checkin-rv-david-2', 'enrollment-rv-david', '2026-04-22'),
  checkIn('checkin-rv-david-3', 'enrollment-rv-david', '2026-04-29'),
];

/**
 * Responses (DOM00022) — the answered check-ins. Each carries the
 * {@link Response.adherenceScore} (lower is better) and
 * {@link Response.submittedAt} that plot the longitudinal graph over time, plus
 * optional {@link Response.freeText} the provider reads on drill-down.
 */
export const SEED_RESPONSES: Response[] = [
  // Ava — score trending down (improving): 5 → 4 → 2 → 1.
  response('response-bs-ava-1', 'checkin-bs-ava-1', 'Ava Thompson', '+15125550101', 5, '2026-04-08'),
  response('response-bs-ava-2', 'checkin-bs-ava-2', 'Ava Thompson', '+15125550101', 4, '2026-04-15'),
  response('response-bs-ava-3', 'checkin-bs-ava-3', 'Ava Thompson', '+15125550101', 2, '2026-04-22', 'Feeling much better this week, no issues.'),
  response('response-bs-ava-4', 'checkin-bs-ava-4', 'Ava Thompson', '+15125550101', 1, '2026-04-29'),
  // Marcus — score trending up (worsening): 2 → 4 → 6 → 8 (raises an alert).
  response('response-bs-marcus-1', 'checkin-bs-marcus-1', 'Marcus Lee', '+15125550102', 2, '2026-04-08'),
  response('response-bs-marcus-2', 'checkin-bs-marcus-2', 'Marcus Lee', '+15125550102', 4, '2026-04-15'),
  response('response-bs-marcus-3', 'checkin-bs-marcus-3', 'Marcus Lee', '+15125550102', 6, '2026-04-22', 'Missed a few doses, work has been hectic.'),
  response('response-bs-marcus-4', 'checkin-bs-marcus-4', 'Marcus Lee', '+15125550102', 8, '2026-04-29', 'Stopped taking it — not sure it is helping.'),
  // Sofia — steady low score: 1 → 0 → 1.
  response('response-bs-sofia-1', 'checkin-bs-sofia-1', 'Sofia Ramirez', '+15125550103', 1, '2026-04-15'),
  response('response-bs-sofia-2', 'checkin-bs-sofia-2', 'Sofia Ramirez', '+15125550103', 0, '2026-04-29'),
  response('response-bs-sofia-3', 'checkin-bs-sofia-3', 'Sofia Ramirez', '+15125550103', 1, '2026-05-13'),
  // James — two responses then stopped: 3 → 5.
  response('response-bs-james-1', 'checkin-bs-james-1', 'James Okafor', '+15125550104', 3, '2026-03-22'),
  response('response-bs-james-2', 'checkin-bs-james-2', 'James Okafor', '+15125550104', 5, '2026-03-29', 'Doctor switched my medication.'),
  // Elena — side-effect concern (raises an alert): 2 → 3 → 7.
  response('response-rv-elena-1', 'checkin-rv-elena-1', 'Elena Petrova', '+15125550201', 2, '2026-04-15'),
  response('response-rv-elena-2', 'checkin-rv-elena-2', 'Elena Petrova', '+15125550201', 3, '2026-04-22'),
  response('response-rv-elena-3', 'checkin-rv-elena-3', 'Elena Petrova', '+15125550201', 7, '2026-04-29', 'Severe dizziness and nausea after each dose.'),
  // David — steady low score: 1 → 2 → 1.
  response('response-rv-david-1', 'checkin-rv-david-1', 'David Nguyen', '+15125550202', 1, '2026-04-15'),
  response('response-rv-david-2', 'checkin-rv-david-2', 'David Nguyen', '+15125550202', 2, '2026-04-22'),
  response('response-rv-david-3', 'checkin-rv-david-3', 'David Nguyen', '+15125550202', 1, '2026-04-29'),
];

/**
 * Alerts (DOM00023) raised by concerning responses (DOM00002
 * `Response ||--o{ Alert`). Surfaced read-only on the dashboard — who needs
 * follow-up — with no acknowledge/handle lifecycle.
 */
export const SEED_ALERTS: Alert[] = [
  {
    id: 'alert-bs-marcus-1',
    patientId: 'patient-bs-marcus',
    responseId: 'response-bs-marcus-4',
    reason: 'High adherence score (8) — patient reports stopping medication',
    createdAt: '2026-04-29T10:05:00.000Z',
  },
  {
    id: 'alert-rv-elena-1',
    patientId: 'patient-rv-elena',
    responseId: 'response-rv-elena-3',
    reason: 'Severe side effects reported (dizziness, nausea)',
    createdAt: '2026-04-29T11:20:00.000Z',
  },
];

/**
 * Builds a completed {@link CheckIn} for a seeded response.
 *
 * @param id - Stable check-in id.
 * @param enrollmentId - The owning enrollment.
 * @param day - Calendar day (`YYYY-MM-DD`) the check-in was sent/completed.
 * @returns A `'completed'` check-in sent at 09:00Z, expiring seven days later.
 */
function checkIn(id: string, enrollmentId: string, day: string): CheckIn {
  return {
    id,
    enrollmentId,
    link: `https://demo.example/c/${id}`,
    status: 'completed',
    sentAt: `${day}T09:00:00.000Z`,
    expiresAt: `${day}T09:00:00.000Z`,
  };
}

/**
 * Builds a submitted {@link Response} for a seeded check-in.
 *
 * @param id - Stable response id.
 * @param checkInId - The check-in this response answers.
 * @param name - Confirmed contact name.
 * @param phone - Confirmed contact phone.
 * @param adherenceScore - Weighted adherence score (lower is better).
 * @param day - Calendar day (`YYYY-MM-DD`) the response was submitted.
 * @param freeText - Optional free-text message to the provider.
 * @returns The seeded response.
 */
function response(
  id: string,
  checkInId: string,
  name: string,
  phone: string,
  adherenceScore: number,
  day: string,
  freeText?: string,
): Response {
  return {
    id,
    checkInId,
    contact: { name, phone },
    adherenceScore,
    freeText,
    submittedAt: `${day}T09:30:00.000Z`,
  };
}

/**
 * Deep-clones the runtime seed dataset so callers never mutate the fixtures.
 *
 * @returns A fresh, independent copy of the seeded runtime entities.
 */
export function createRuntimeSeedData(): RuntimeMockData {
  return structuredClone({
    patients: SEED_PATIENTS,
    enrollments: SEED_ENROLLMENTS,
    checkIns: SEED_CHECKINS,
    responses: SEED_RESPONSES,
    alerts: SEED_ALERTS,
  });
}
