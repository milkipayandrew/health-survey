import { flattenBlocks } from '@/lib/scheduling';
import type {
  Question,
  Survey,
  TestResponse,
  TestResponseAnswer,
  TestResponseRisk,
} from '@/types/domain';

/**
 * Canned test-response generator for the Admin preview surface.
 *
 * @remarks
 * The real scoring/branching engine is out of scope for this demo, so these
 * helpers fabricate plausible results deterministically from the survey's own
 * questions/choices/scoreCodes. Determinism (no `Math.random`) keeps the demo
 * predictable and avoids any SSR/client mismatch: the same survey always yields
 * the same canned set.
 */

/**
 * Generation mode for fabricated test responses.
 *
 * - `'answer-all'` (default): every question is answered, mirroring a complete,
 *   validation-passing submission.
 * - `'ignore-validation'`: deterministically leaves some required questions
 *   unanswered / partially answered, standing in for the ignore-validation tool
 *   Anne relies on to produce responses that omit required fields.
 */
export type TestResponseMode = 'answer-all' | 'ignore-validation';

/** Default mode: answer every question (unchanged legacy behavior). */
const DEFAULT_MODE: TestResponseMode = 'answer-all';

/** How many fabricated respondents a generated set contains. */
const TEST_RESPONDENT_COUNT = 3;

/** Score thresholds (inclusive lower bound) mapping a summed score to a risk tier. */
const RISK_THRESHOLDS: { min: number; risk: TestResponseRisk }[] = [
  { min: 6, risk: 'high' },
  { min: 3, risk: 'medium' },
  { min: 0, risk: 'low' },
];

/** Flattens a survey into its ordered questions (group order, then block order). */
function collectQuestions(survey: Survey): Question[] {
  return flattenBlocks(survey).flatMap((block) => block.questions);
}

/** Derives a risk tier from a summed adherence score. */
function riskForScore(score: number): TestResponseRisk {
  return (
    RISK_THRESHOLDS.find((threshold) => score >= threshold.min)?.risk ?? 'low'
  );
}

/**
 * Decides — deterministically — whether a given required question is left
 * unanswered in `'ignore-validation'` mode. Only required questions are ever
 * skipped (so the response visibly omits a mandatory field); the choice is keyed
 * on the question/respondent indices so the same survey always produces the same
 * gaps and no `Math.random` is involved.
 */
function shouldSkipRequired(
  required: boolean,
  respondentIndex: number,
  questionIndex: number,
): boolean {
  if (!required) {
    return false;
  }
  // Skip on an even (respondent + question) sum: a stable, spread-out pattern
  // that leaves at least some required questions unanswered for each respondent.
  return (respondentIndex + questionIndex) % 2 === 0;
}

/**
 * Fabricates one respondent's answers and score for a survey.
 *
 * @param survey - The survey whose questions/choices seed the canned answers.
 * @param respondentIndex - Zero-based index; varies which choice is picked so
 * generated respondents span a range of scores (and thus risk tiers).
 * @param mode - Whether to answer every question (`'answer-all'`) or
 * deterministically leave some required questions unanswered
 * (`'ignore-validation'`).
 * @returns The fabricated {@link TestResponse}.
 */
function generateTestResponse(
  survey: Survey,
  respondentIndex: number,
  mode: TestResponseMode,
): TestResponse {
  const answers: TestResponseAnswer[] = [];

  collectQuestions(survey).forEach((question, questionIndex) => {
    const base = { questionId: question.id, questionLabel: question.label };

    if (
      mode === 'ignore-validation' &&
      shouldSkipRequired(question.required, respondentIndex, questionIndex)
    ) {
      // Leave this required question unanswered to mimic an ignore-validation
      // submission that omits a mandatory field.
      answers.push({
        ...base,
        answerLabel: '— (required, left blank)',
        scoreContribution: 0,
      });
      return;
    }

    if (question.choices.length > 0) {
      // Pick a choice deterministically, shifting by respondent so different
      // test respondents answer differently and produce a spread of scores.
      const choiceIndex =
        (respondentIndex + questionIndex) % question.choices.length;

      if (question.type === 'multi-select') {
        // Select choices up to (and including) the picked index.
        const selected = question.choices.slice(0, choiceIndex + 1);
        answers.push({
          ...base,
          answerLabel: selected.map((choice) => choice.label).join(', '),
          scoreContribution: selected.reduce(
            (sum, choice) => sum + choice.scoreCode,
            0,
          ),
        });
        return;
      }

      const choice = question.choices[choiceIndex];
      answers.push({
        ...base,
        answerLabel: choice.label,
        scoreContribution: choice.scoreCode,
      });
      return;
    }

    // Free-text / date questions carry no score; fabricate a sample value.
    answers.push({
      ...base,
      answerLabel:
        question.type === 'date' ? '1980-04-15' : 'Sample text response',
      scoreContribution: 0,
    });
  });

  const score = answers.reduce(
    (sum, answer) => sum + answer.scoreContribution,
    0,
  );

  return {
    id: `${survey.id}-test-${respondentIndex + 1}`,
    respondentLabel: `Test patient ${respondentIndex + 1}`,
    answers,
    score,
    risk: riskForScore(score),
  };
}

/**
 * Generates a deterministic set of canned test responses for a survey, standing
 * in for branching/scoring validation before the Admin publishes.
 *
 * @param survey - The survey to fabricate responses for.
 * @param mode - Generation mode. Defaults to `'answer-all'` (every question
 * answered — the unchanged legacy behavior); `'ignore-validation'`
 * deterministically leaves some required questions unanswered.
 * @returns One {@link TestResponse} per fabricated respondent.
 */
export function generateTestResponses(
  survey: Survey,
  mode: TestResponseMode = DEFAULT_MODE,
): TestResponse[] {
  return Array.from({ length: TEST_RESPONDENT_COUNT }, (_unused, index) =>
    generateTestResponse(survey, index, mode),
  );
}
