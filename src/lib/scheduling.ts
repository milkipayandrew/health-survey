import type {
  Block,
  BlockGroup,
  Enrollment,
  Medication,
  NewEnrollmentInput,
  Schedule,
  ScheduleScope,
  ScheduleUnit,
  Survey,
} from '@/types/domain';

/**
 * Scheduling helpers for the demo's layered cadence: the ONE canonical place
 * that resolves a block group's effective schedule, flattens grouped blocks for
 * consumers that want a flat ordered list, and formats a schedule for display.
 *
 * @remarks Pure functions — the effective cadence is computed during render, not
 * via derived-state effects. No live scheduler / SMS is involved; this only
 * configures and surfaces values for admin authoring and read-only preview.
 *
 * The full domain resolution is **survey default → block-group override →
 * medication preset**. This module attaches each layer — the survey-default and
 * block-group override layers (via {@link resolveEffectiveCadence}) and the
 * medication-preset layer's type → preset mapping (via
 * {@link medicationPresetFor}) — and combines all three into a single
 * Enrollment effective cadence (via {@link resolveEnrollmentEffectiveCadence}),
 * the value that drives the recurring sends downstream.
 */

/**
 * A sensible default schedule for newly assembled surveys: weekly, same-day.
 * Its scope marks it as the survey-default cadence layer.
 */
export const DEFAULT_SURVEY_SCHEDULE: Schedule = {
  every: 1,
  unit: 'weeks',
  firstSendOffsetDays: 0,
  scope: 'survey-default',
};

/** Which layer a resolved effective cadence came from, for the read-only UI. */
export type CadenceSource = 'survey-default' | 'block-group-override';

/** The resolved effective cadence for a block group, with its originating layer. */
export interface EffectiveCadence {
  /** The schedule actually applied to the group. */
  schedule: Schedule;
  /** Which layer the schedule resolved from. */
  source: CadenceSource;
}

/**
 * Which of the three cadence layers an Enrollment's resolved effective cadence
 * came from (DOM00032). `'medication-preset'` is the lowest layer / fallback,
 * applied only when neither a block-group override nor a survey default is
 * present.
 */
export type EnrollmentCadenceSource = ScheduleScope;

/**
 * An Enrollment's resolved effective cadence (DOM00020), with the layer it
 * resolved from for traceability.
 */
export interface EnrollmentEffectiveCadence {
  /** The interval actually applied to the patient — the Enrollment's cadence. */
  schedule: Schedule;
  /** Which of the three layers the cadence resolved from (DOM00032). */
  source: EnrollmentCadenceSource;
}

/**
 * Resolves the effective cadence for a block group — the single canonical
 * resolution helper (do not inline this logic elsewhere). A group's own
 * schedule overrides the survey default; absent it inherits the survey default.
 *
 * @param survey - The owning survey, supplying the default schedule layer.
 * @param group - The block group whose effective cadence to resolve.
 * @returns The resolved {@link EffectiveCadence} (schedule + originating layer).
 */
export function resolveEffectiveCadence(
  survey: Survey,
  group: BlockGroup,
): EffectiveCadence {
  if (group.schedule !== undefined) {
    return { schedule: group.schedule, source: 'block-group-override' };
  }
  return { schedule: survey.defaultSchedule, source: 'survey-default' };
}

/**
 * Maps a medication **type** to its {@link Schedule} preset — the lowest cadence
 * layer (DOM00016). The canonical type-to-preset lookup: a medication's `type`
 * (e.g. `'GLP-1'`, `'cardiovascular'`) is the key that selects a preset schedule.
 * Matching is case-insensitive on the trimmed type so authoring-entered types
 * resolve regardless of casing/whitespace.
 *
 * This is the *attachment* of the medication-preset layer — wiring the
 * type → preset relationship — **not** the layered effective-cadence resolution
 * (survey default → block-group override → medication preset), which combines
 * this with the other layers at enrollment downstream.
 *
 * @param medications - The available medication presets to look up within.
 * @param type - The medication type to resolve a preset for.
 * @returns The matching medication's `schedulePreset`, or `null` when no
 * medication of that type is configured (an expected miss returned as a value,
 * not thrown).
 */
export function medicationPresetFor(
  medications: Medication[],
  type: string,
): Schedule | null {
  const key = type.trim().toLowerCase();
  const match = medications.find(
    (medication) => medication.type.trim().toLowerCase() === key,
  );
  return match?.schedulePreset ?? null;
}

/**
 * The schedule layers an enrollment's effective cadence is resolved from
 * (DOM00032). Each is optional: a layer that is not configured for the
 * enrollment is simply skipped during resolution.
 */
export interface CadenceLayers {
  /**
   * The owning survey's default schedule — the top layer. Present whenever a
   * survey is known for the enrollment.
   */
  surveyDefault?: Schedule;
  /**
   * The block-group schedule override applying to the enrollment, when a group
   * with its own schedule governs it. Overrides {@link CadenceLayers.surveyDefault}.
   */
  blockGroupOverride?: Schedule;
  /**
   * The medication-type preset — the lowest layer / fallback, applied only when
   * neither a block-group override nor a survey default is present.
   */
  medicationPreset?: Schedule;
}

/**
 * Resolves an enrollment's effective cadence across the three schedule layers
 * (DOM00032): **survey default → block-group override → medication preset**.
 *
 * @remarks
 * Precedence — the highest-priority *present* layer wins, with the medication
 * preset as the lowest layer / fallback:
 *   1. block-group override (when the enrollment is governed by a group schedule),
 *   2. survey default,
 *   3. medication preset (fallback).
 *
 * The layered resolution is **provisional** per DOM00032 (pending client
 * confirmation of whether the block-group layer is kept). When the client
 * confirms a uniform per-survey or strictly medication-driven cadence, the
 * block-group layer collapses by simply not supplying
 * {@link CadenceLayers.blockGroupOverride} — no change to this resolver is
 * required.
 *
 * A pure function returning the resolved value (and its originating layer) so
 * the caller can store it on {@link Enrollment.effectiveCadence}. When no layer
 * is configured at all, returns `null` — an expected miss surfaced as a value
 * rather than thrown — so the caller decides how to handle an enrollment that
 * cannot yet be scheduled.
 *
 * @param layers - The candidate schedule layers for the enrollment.
 * @returns The resolved {@link EnrollmentEffectiveCadence} (schedule + layer),
 * or `null` when none of the three layers is present.
 */
export function resolveEnrollmentCadence(
  layers: CadenceLayers,
): EnrollmentEffectiveCadence | null {
  if (layers.blockGroupOverride !== undefined) {
    return {
      schedule: layers.blockGroupOverride,
      source: 'block-group-override',
    };
  }
  if (layers.surveyDefault !== undefined) {
    return { schedule: layers.surveyDefault, source: 'survey-default' };
  }
  if (layers.medicationPreset !== undefined) {
    return { schedule: layers.medicationPreset, source: 'medication-preset' };
  }
  return null;
}

/**
 * Gathers an enrollment's candidate cadence layers from the domain entities and
 * resolves its effective cadence (DOM00020, DOM00032). The single canonical
 * place that combines the survey-default and block-group-override layers (via
 * {@link resolveEffectiveCadence}) with the medication-preset layer (via
 * {@link medicationPresetFor}) into one effective cadence for a patient.
 *
 * The resolved schedule is what {@link Enrollment.effectiveCadence} is set to —
 * the interval that drives the recurring sends downstream — so the check-in
 * lifecycle reads a single cadence without re-resolving the layers.
 *
 * @param input - The enrollment being resolved (without its effective cadence).
 * @param survey - The survey the enrollment is on, supplying the default
 * schedule and the block group whose override may apply. Pass `null` when the
 * survey is unknown so its layers are skipped.
 * @param medication - The enrollment's medication, supplying the preset fallback
 * layer. Pass `null` when unknown so the preset layer is skipped.
 * @returns The resolved {@link EnrollmentEffectiveCadence}, or `null` when none
 * of the three layers is configured (an expected miss returned as a value).
 */
export function resolveEnrollmentEffectiveCadence(
  input: NewEnrollmentInput,
  survey: Survey | null,
  medication: Medication | null,
): EnrollmentEffectiveCadence | null {
  let surveyDefault: Schedule | undefined;
  let blockGroupOverride: Schedule | undefined;

  if (survey !== null) {
    surveyDefault = survey.defaultSchedule;
    if (input.blockGroupId !== undefined) {
      const group = survey.blockGroups.find(
        (candidate) => candidate.id === input.blockGroupId,
      );
      // Reuse the canonical survey/group resolution so the block-group-override
      // semantics live in exactly one place.
      if (group !== undefined) {
        const groupCadence = resolveEffectiveCadence(survey, group);
        if (groupCadence.source === 'block-group-override') {
          blockGroupOverride = groupCadence.schedule;
        }
      }
    }
  }

  return resolveEnrollmentCadence({
    surveyDefault,
    blockGroupOverride,
    medicationPreset: medication?.schedulePreset,
  });
}

/**
 * Builds a fully-resolved {@link Enrollment} from the enrollment input by
 * resolving and exposing its {@link Enrollment.effectiveCadence} (DOM00020) from
 * the layered schedule model (DOM00032). This is the boundary where the resolved
 * interval becomes the single cadence that drives the patient's recurring sends —
 * downstream check-in scheduling reads `effectiveCadence` directly and never
 * re-resolves the layers.
 *
 * @param id - The generated enrollment id (minted by the caller/store).
 * @param input - The enrollment fields supplied before resolution (patient,
 * survey, medication, optional governing block group, status, start date).
 * @param survey - The survey supplying the default + block-group layers, or
 * `null` when unknown.
 * @param medication - The medication supplying the preset fallback layer, or
 * `null` when unknown.
 * @returns The fully-resolved {@link Enrollment} with its effective cadence set.
 * @throws {Error} When none of the three cadence layers is configured, so the
 * enrollment has no interval to schedule from — an unexpected state (a caller
 * always enrolls against at least a medication preset), surfaced as a thrown
 * error rather than a silently mis-scheduled enrollment.
 */
export function buildEnrollment(
  id: string,
  input: NewEnrollmentInput,
  survey: Survey | null,
  medication: Medication | null,
): Enrollment {
  const resolved = resolveEnrollmentEffectiveCadence(input, survey, medication);
  if (resolved === null) {
    throw new Error(
      `Cannot resolve an effective cadence for enrollment "${id}": no survey default, block-group override, or medication preset is configured.`,
    );
  }
  return { ...input, id, effectiveCadence: resolved.schedule };
}

/** Human-readable label for a schedule's interval unit. */
const UNIT_LABEL: Record<ScheduleUnit, { singular: string; plural: string }> = {
  days: { singular: 'day', plural: 'days' },
  weeks: { singular: 'week', plural: 'weeks' },
  months: { singular: 'month', plural: 'months' },
};

/**
 * Formats a schedule's interval as a human phrase (e.g. `Every 2 weeks`).
 *
 * @param schedule - The schedule to describe.
 * @returns The interval phrase for display.
 */
export function formatInterval(schedule: Schedule): string {
  const unit = UNIT_LABEL[schedule.unit];
  const count = Math.max(1, Math.round(schedule.every));
  return count === 1
    ? `Every ${unit.singular}`
    : `Every ${count} ${unit.plural}`;
}

/**
 * Formats a schedule's first-send timing as a human phrase.
 *
 * @param schedule - The schedule to describe.
 * @returns The first-send phrase for display.
 */
export function formatFirstSend(schedule: Schedule): string {
  const offset = Math.max(0, Math.round(schedule.firstSendOffsetDays));
  if (offset === 0) {
    return 'first send same day';
  }
  return offset === 1 ? 'first send after 1 day' : `first send after ${offset} days`;
}

/**
 * Formats a full schedule (interval + first-send timing) for display.
 *
 * @param schedule - The schedule to describe.
 * @returns A combined phrase, e.g. `Every 2 weeks · first send same day`.
 */
export function formatSchedule(schedule: Schedule): string {
  return `${formatInterval(schedule)} · ${formatFirstSend(schedule)}`;
}

/**
 * Returns a survey's block groups in display order (by `order`), without
 * mutating the source array. The single canonical source for group ordering —
 * consumers that need the grouped render shape should use this rather than
 * re-implementing the sort.
 *
 * @param survey - The survey whose groups to order.
 * @returns A new array of the survey's groups, sorted by `order`.
 */
export function orderedBlockGroups(survey: Survey): BlockGroup[] {
  return survey.blockGroups.slice().sort((a, b) => a.order - b.order);
}

/**
 * Returns a block group's blocks in display order (by `order`), without
 * mutating the source array. The single canonical source for block ordering
 * within a group.
 *
 * @param group - The group whose blocks to order.
 * @returns A new array of the group's blocks, sorted by `order`.
 */
export function orderedBlocks(group: BlockGroup): Block[] {
  return group.blocks.slice().sort((a, b) => a.order - b.order);
}

/**
 * Flattens a survey's grouped blocks into a single ordered list, preserving
 * group order then block order. The canonical adapter for consumers that work
 * over a flat block list (list counts, test-response generation, preview).
 * Delegates ordering to {@link orderedBlockGroups}/{@link orderedBlocks} so the
 * sort lives in exactly one place.
 *
 * @param survey - The survey whose grouped blocks to flatten.
 * @returns All blocks across all groups, in group-then-block order.
 */
export function flattenBlocks(survey: Survey): Block[] {
  return orderedBlockGroups(survey).flatMap(orderedBlocks);
}
