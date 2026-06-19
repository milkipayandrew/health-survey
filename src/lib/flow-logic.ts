import type {
  Block,
  BlockInclusion,
  Question,
} from '@/types/domain';

/**
 * Flow-logic helpers for the demo's conditional rendering: resolving a block's
 * effective inclusion, deciding whether a block runs on a given run mode, and
 * deciding whether a gated question is currently visible.
 *
 * @remarks Pure functions — visibility/skip is computed during render from the
 * current answers and the selected run mode, never via derived-state effects.
 * Legacy/malformed data degrades safely to "always show": a missing/unknown
 * `inclusion` resolves to `'always'`, and a display condition pointing at a
 * missing gateway never hides its question.
 */

/** Whether a check-in run is the patient's first ('initial') or a later one. */
export type RunMode = 'initial' | 'recurring';

/** The block-inclusion values we treat as known/valid. */
const KNOWN_INCLUSIONS: readonly BlockInclusion[] = [
  'initial',
  'recurring',
  'always',
];

/**
 * Resolves a block's effective inclusion, defaulting legacy/malformed data to
 * `'always'` so existing surveys (which have no `inclusion`) keep rendering.
 *
 * @param block - The block whose inclusion to resolve.
 * @returns The block's inclusion, or `'always'` when unset/unrecognised.
 */
export function resolveInclusion(block: Block): BlockInclusion {
  const value = block.inclusion;
  if (value !== undefined && KNOWN_INCLUSIONS.includes(value)) {
    return value;
  }
  return 'always';
}

/**
 * Whether a block runs on the given run mode. `'always'` blocks run on both;
 * `'initial'`/`'recurring'` blocks run only on the matching mode.
 *
 * @param block - The block to test.
 * @param mode - The previewed run mode (initial vs recurring).
 * @returns `true` when the block is included on that run, `false` when skipped.
 */
export function isBlockIncluded(block: Block, mode: RunMode): boolean {
  const inclusion = resolveInclusion(block);
  return inclusion === 'always' || inclusion === mode;
}

/**
 * Whether a question is currently visible given the answers chosen so far. A
 * question with no display condition is always visible; a gated question is
 * visible only once its gateway's triggering choice has been selected.
 *
 * @param question - The question to test.
 * @param selectedChoiceIds - The set of currently-selected choice ids across
 * the previewed survey (single- and multi-select alike).
 * @returns `true` when the question should be shown.
 */
export function isQuestionVisible(
  question: Question,
  selectedChoiceIds: ReadonlySet<string>,
): boolean {
  const condition = question.displayCondition;
  if (condition === undefined) {
    return true;
  }
  return selectedChoiceIds.has(condition.choiceId);
}
