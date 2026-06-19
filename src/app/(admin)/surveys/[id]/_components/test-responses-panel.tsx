import { Badge, type BadgeTone } from '@/components/badge';
import type { TestResponse, TestResponseRisk } from '@/types/domain';

interface TestResponsesPanelProps {
  /** The generated canned test responses to display. */
  responses: TestResponse[];
}

/** Maps each risk tier to a semantic badge tone. */
const RISK_TONES: Record<TestResponseRisk, BadgeTone> = {
  low: 'positive',
  medium: 'caution',
  high: 'critical',
};

/**
 * Displays the canned test responses generated for a survey — fabricated
 * respondents, their answers, summed adherence scores, and derived risk tiers —
 * standing in for the real branching/scoring engine during validation.
 */
export function TestResponsesPanel({ responses }: TestResponsesPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        Canned results standing in for branching/scoring validation. Scores are
        fabricated from each question&apos;s choice score codes.
      </p>
      <ul className="flex flex-col gap-3">
        {responses.map((response) => (
          <li
            key={response.id}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {response.respondentLabel}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">
                  Score {response.score}
                </span>
                <Badge tone={RISK_TONES[response.risk]}>
                  {response.risk} risk
                </Badge>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5">
              {response.answers.map((answer) => (
                <li
                  key={answer.questionId}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-zinc-600">{answer.questionLabel}</span>
                  <span className="shrink-0 text-right font-medium text-zinc-900">
                    {answer.answerLabel}
                    <span className="ml-2 font-mono text-xs text-zinc-400">
                      +{answer.scoreContribution}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
