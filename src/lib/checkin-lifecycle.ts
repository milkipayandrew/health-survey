import type {
  CheckIn,
  CheckInStatus,
  Enrollment,
  Patient,
  Response,
  ResponseContact,
  Schedule,
  ScheduleUnit,
} from '@/types/domain';

import { makeId } from '@/lib/utils';

/**
 * The per-patient check-in cadence lifecycle (Workflow 2): create the next
 * Scheduled check-in when a cadence cycle is due, dispatch its SMS link, record
 * the patient's Response, update the contact record, and schedule the next send.
 *
 * @remarks
 * Pure domain functions — there is no live scheduler or SMS gateway in the demo.
 * The recurring runtime flow (DOM00008) is realized as a sequence of pure state
 * transitions over the {@link CheckIn} entity (DOM00021), each guarded by the
 * Check-in Lifecycle rules (DOM00004). The interval that times each next send is
 * the Enrollment's already-resolved {@link Enrollment.effectiveCadence}
 * (DOM00020): this module **consumes** that single cadence and never re-resolves
 * the survey/block-group/medication layers.
 *
 * Error model: an illegal lifecycle transition (e.g. completing a check-in that
 * was never sent, or opening one that has expired) is an **expected** business
 * rule failure returned as a {@link TransitionResult} value, not thrown. Truly
 * unexpected states (a cadence with no interval) throw.
 */

/** Default active period for an SMS link before it expires, in whole days. */
const DEFAULT_LINK_ACTIVE_DAYS = 7;

/** Milliseconds in one day, for whole-day cadence arithmetic. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A check-in lifecycle transition outcome: the updated check-in on success, or a
 * machine-readable reason when the transition is not allowed from the current
 * state (an expected failure surfaced as a value, not thrown).
 */
export type TransitionResult =
  | { ok: true; checkIn: CheckIn }
  | { ok: false; reason: TransitionError };

/** Why a requested lifecycle transition was rejected. */
export type TransitionError =
  | 'invalid-state'
  | 'link-expired';

/**
 * A trigger that moves a {@link CheckIn} between existing lifecycle states — the
 * Check-in Lifecycle transitions (DOM00004).
 *
 * @remarks The lifecycle's entry edge `[*] --> Scheduled` (`cadence cycle due`)
 * *creates* a check-in rather than transitioning one, so it is realized by
 * {@link scheduleCheckIn} and is not a member of this between-states union.
 */
export type CheckInTrigger =
  | 'sms-dispatched'
  | 'opened-and-verified'
  | 'submitted'
  | 'link-expired'
  | 'abandoned';

/**
 * The state-machine edges of the Check-in Lifecycle (DOM00004): which
 * {@link CheckInTrigger} moves the check-in from which state to which next
 * state. The single source of truth for legal transitions — every transition
 * helper validates against this table.
 */
const TRANSITIONS: Record<
  CheckInTrigger,
  { from: CheckInStatus; to: CheckInStatus }
> = {
  'sms-dispatched': { from: 'scheduled', to: 'sent' },
  'opened-and-verified': { from: 'sent', to: 'in-progress' },
  submitted: { from: 'in-progress', to: 'completed' },
  'link-expired': { from: 'sent', to: 'expired' },
  abandoned: { from: 'in-progress', to: 'expired' },
};

/** Whole-day count one cadence interval spans, by unit (months ≈ 30 days). */
const UNIT_DAYS: Record<ScheduleUnit, number> = {
  days: 1,
  weeks: 7,
  months: 30,
};

/**
 * Advances an ISO-8601 instant by one cadence interval of the given schedule —
 * the gap until the next check-in is due.
 *
 * @param fromIso - The ISO-8601 instant to advance from.
 * @param schedule - The cadence schedule supplying the interval.
 * @returns The next-due instant as ISO-8601.
 */
function addInterval(fromIso: string, schedule: Schedule): string {
  const every = Math.max(1, Math.round(schedule.every));
  const days = every * UNIT_DAYS[schedule.unit];
  return new Date(new Date(fromIso).getTime() + days * MS_PER_DAY).toISOString();
}

/**
 * Builds the link a patient opens for a check-in — the same value delivered by
 * SMS and encoded in an in-office QR code (DOM00021). One link per cadence
 * cycle, so it is keyed by the check-in id.
 *
 * @param checkInId - The check-in the link belongs to.
 * @returns The opaque check-in link.
 */
export function buildCheckInLink(checkInId: string): string {
  return `/checkin/${checkInId}`;
}

/**
 * Creates the next {@link CheckIn} in `'scheduled'` state when a cadence cycle is
 * due — the lifecycle entry edge `[*] --> Scheduled` (DOM00004) and step 1 of
 * Workflow 2 (DOM00008).
 *
 * @remarks Times the occurrence off the Enrollment's already-resolved
 * {@link Enrollment.effectiveCadence} (DOM00020); this consumer never
 * re-resolves the schedule layers. The link is minted up-front so it can be
 * delivered by SMS or encoded into a QR code, but `sentAt`/`expiresAt` stay
 * unset until the SMS is dispatched.
 *
 * @param enrollment - The enrollment whose cadence drives this occurrence. Its
 * {@link Enrollment.effectiveCadence} is resolved upstream (DOM00020) before
 * scheduling — the type guarantees it, so this consumer reads it directly.
 * @returns A freshly scheduled check-in.
 */
export function scheduleCheckIn(enrollment: Enrollment): CheckIn {
  const id = makeId('checkin');
  return {
    id,
    enrollmentId: enrollment.id,
    link: buildCheckInLink(id),
    status: 'scheduled',
  };
}

/**
 * Validates and applies a lifecycle transition against the {@link TRANSITIONS}
 * table — the one place every state change is checked, so an illegal change
 * (e.g. completing a check-in that was never sent) is rejected as an expected
 * value rather than silently corrupting state.
 *
 * @param checkIn - The check-in to transition.
 * @param trigger - The lifecycle trigger to apply.
 * @param patch - Extra fields to merge on success (e.g. `sentAt`).
 * @returns The transitioned check-in, or a rejection reason.
 */
function applyTransition(
  checkIn: CheckIn,
  trigger: CheckInTrigger,
  patch: Partial<CheckIn> = {},
): TransitionResult {
  const edge = TRANSITIONS[trigger];
  if (checkIn.status !== edge.from) {
    return { ok: false, reason: 'invalid-state' };
  }
  return { ok: true, checkIn: { ...checkIn, ...patch, status: edge.to } };
}

/**
 * Dispatches the outbound SMS link for a scheduled check-in and transitions it
 * to `'sent'` — the `Scheduled --> Sent` edge (DOM00004), step 1 of Workflow 2
 * (DOM00008), satisfying SMS delivery (REQ00008).
 *
 * @remarks SMS is the primary channel (REQ00008). The actual gateway is
 * injected via {@link SmsSender} so the platform is **not locked to Twilio** —
 * any provider implementing the port works, and the demo uses a no-op recorder.
 * On dispatch the check-in records its `sentAt` and an `expiresAt` active period
 * (REQ00006) after which a stale link is rejected.
 *
 * @param checkIn - The scheduled check-in to send.
 * @param patient - The recipient contact (its phone is the SMS destination).
 * @param send - The SMS gateway port to deliver through.
 * @param now - The dispatch instant (ISO-8601); defaults to the current time.
 * @param activeDays - The link's active-period length in whole days.
 * @returns The check-in advanced to `'sent'`, or a rejection when it was not
 * `'scheduled'`.
 */
export function dispatchCheckInSms(
  checkIn: CheckIn,
  patient: Patient,
  send: SmsSender,
  now: string = new Date().toISOString(),
  activeDays: number = DEFAULT_LINK_ACTIVE_DAYS,
): TransitionResult {
  const transitioned = applyTransition(checkIn, 'sms-dispatched', {
    sentAt: now,
    expiresAt: new Date(
      new Date(now).getTime() + Math.max(1, Math.round(activeDays)) * MS_PER_DAY,
    ).toISOString(),
  });
  if (!transitioned.ok) {
    return transitioned;
  }
  send({ to: patient.phone, link: transitioned.checkIn.link });
  return transitioned;
}

/**
 * The outbound SMS message a {@link SmsSender} delivers.
 */
export interface SmsMessage {
  /** Destination phone number (the patient's contact phone). */
  to: string;
  /** The check-in link to deliver. */
  link: string;
}

/**
 * The SMS delivery port (REQ00008). An abstraction over the provider (Twilio or
 * an equivalent) so the platform is not locked to one vendor — production wires
 * a real gateway; the demo passes {@link noopSmsSender}.
 */
export type SmsSender = (message: SmsMessage) => void;

/** A no-op SMS sender for the demo (no live gateway). */
export const noopSmsSender: SmsSender = () => {};

/**
 * Transitions a sent check-in to `'in-progress'` once the patient opens the link
 * and passes OTP — the `Sent --> InProgress` edge (DOM00004).
 *
 * @remarks Rejects a link whose active period has already ended (REQ00006):
 * a stale link cannot be opened, surfaced as a `'link-expired'` value. The
 * lifecycle marking the check-in `'expired'` itself is done via
 * {@link expireCheckIn}.
 *
 * @param checkIn - The sent check-in being opened.
 * @param now - The open instant (ISO-8601); defaults to the current time.
 * @returns The check-in advanced to `'in-progress'`, or a rejection.
 */
export function openCheckIn(
  checkIn: CheckIn,
  now: string = new Date().toISOString(),
): TransitionResult {
  if (isLinkExpired(checkIn, now)) {
    return { ok: false, reason: 'link-expired' };
  }
  return applyTransition(checkIn, 'opened-and-verified');
}

/**
 * Whether a check-in's SMS link has passed its active period (REQ00006). A
 * check-in with no `expiresAt` (never dispatched) is never expired.
 *
 * @param checkIn - The check-in to test.
 * @param now - The instant to compare against (ISO-8601).
 * @returns `true` when the active period has ended.
 */
export function isLinkExpired(checkIn: CheckIn, now: string): boolean {
  if (checkIn.expiresAt === undefined) {
    return false;
  }
  return new Date(now).getTime() > new Date(checkIn.expiresAt).getTime();
}

/**
 * Expires a check-in whose active period ended before it was opened, or whose
 * in-progress response was abandoned past timeout — the `Sent --> Expired` and
 * `InProgress --> Expired` edges (DOM00004, REQ00006).
 *
 * @param checkIn - The check-in to expire.
 * @returns The check-in marked `'expired'`, or a rejection when it is neither
 * `'sent'` nor `'in-progress'`.
 */
export function expireCheckIn(checkIn: CheckIn): TransitionResult {
  if (checkIn.status === 'sent') {
    return applyTransition(checkIn, 'link-expired');
  }
  if (checkIn.status === 'in-progress') {
    return applyTransition(checkIn, 'abandoned');
  }
  return { ok: false, reason: 'invalid-state' };
}

/** The outcome of recording a response and driving the next-send step. */
export interface CompletedCheckIn {
  /** The check-in advanced to `'completed'`. */
  checkIn: CheckIn;
  /** The recorded response. */
  response: Response;
  /** The patient contact record refreshed from the response's confirmed contact. */
  patient: Patient;
  /** The next scheduled check-in created for the following cadence cycle. */
  nextCheckIn: CheckIn;
}

/**
 * Records a patient's {@link Response} for an in-progress check-in and drives the
 * rest of the per-patient lifecycle (REQ00007): transition the check-in to
 * `'completed'`, **update the contact record** from the confirmed contact, and
 * **schedule the next send** off the enrollment's effective cadence — steps 4–5
 * of Workflow 2 (DOM00008).
 *
 * @remarks One submission per link (REQ00006): a check-in that is not
 * `'in-progress'` (already completed, expired, or never opened) is rejected as
 * an `'invalid-state'` value rather than recording a duplicate response. The
 * contact update keeps the patient's phone valid so the next scheduled send does
 * not break (REQ00006). The next check-in is timed off the same already-resolved
 * {@link Enrollment.effectiveCadence} (DOM00020) — never re-resolving the layers.
 *
 * @param checkIn - The in-progress check-in being submitted.
 * @param enrollment - The enrollment whose cadence times the next send.
 * @param patient - The current contact record to refresh.
 * @param contact - The contact the patient confirmed on this submission.
 * @param submission - The submitted response payload (answers/score/free-text).
 * @param now - The submission instant (ISO-8601); defaults to the current time.
 * @returns The completed check-in, recorded response, updated patient, and the
 * next scheduled check-in — or a rejection when the check-in was not in progress.
 */
export function receiveResponse(
  checkIn: CheckIn,
  enrollment: Enrollment,
  patient: Patient,
  contact: ResponseContact,
  submission: Pick<Response, 'adherenceScore' | 'freeText'> = {},
  now: string = new Date().toISOString(),
):
  | { ok: true; result: CompletedCheckIn }
  | { ok: false; reason: TransitionError } {
  const transitioned = applyTransition(checkIn, 'submitted');
  if (!transitioned.ok) {
    return { ok: false, reason: transitioned.reason };
  }

  const response: Response = {
    id: makeId('response'),
    checkInId: checkIn.id,
    contact,
    adherenceScore: submission.adherenceScore,
    freeText: submission.freeText,
    submittedAt: now,
  };

  // Update the contact record from the confirmed contact so the next send stays
  // valid (REQ00007: receive response → update the contact record → next send).
  const updatedPatient: Patient = {
    ...patient,
    name: contact.name,
    phone: contact.phone,
  };

  return {
    ok: true,
    result: {
      checkIn: transitioned.checkIn,
      response,
      patient: updatedPatient,
      nextCheckIn: scheduleCheckIn(enrollment),
    },
  };
}

/**
 * Whether a cadence cycle is due for an enrollment given when the last check-in
 * was sent — `true` once a full effective-cadence interval has elapsed
 * (DOM00004 `cadence cycle due`).
 *
 * @param enrollment - The enrollment whose cadence governs the cycle. Only an
 * `'active'` enrollment is ever due; a stopped one (screen-out) never is.
 * @param lastSentAt - When the previous check-in was dispatched (ISO-8601), or
 * `null` for an enrollment that has not yet had its first send (always due).
 * @param now - The instant to evaluate against (ISO-8601); defaults to now.
 * @returns `true` when the next cadence cycle is due.
 */
export function isCadenceCycleDue(
  enrollment: Enrollment,
  lastSentAt: string | null,
  now: string = new Date().toISOString(),
): boolean {
  if (enrollment.status !== 'active') {
    return false;
  }
  if (lastSentAt === null) {
    return true;
  }
  const nextDueAt = addInterval(lastSentAt, enrollment.effectiveCadence);
  return new Date(now).getTime() >= new Date(nextDueAt).getTime();
}
