'use client';

import { useState } from 'react';

import { BrandSwatches } from '@/components/brand-swatches';
import {
  isBlockIncluded,
  isQuestionVisible,
  resolveInclusion,
  type RunMode,
} from '@/lib/flow-logic';
import {
  flattenBlocks,
  formatSchedule,
  orderedBlockGroups,
  orderedBlocks,
  resolveEffectiveCadence,
} from '@/lib/scheduling';
import { cn } from '@/lib/utils';
import type { Client, Question, Survey } from '@/types/domain';

interface SurveyPreviewProps {
  /** The survey to render as a respondent would experience it. */
  survey: Survey;
  /** The owning client, whose white-label branding is applied to the preview. */
  client: Client;
}

/** The run-mode toggle options, with human labels. */
const RUN_MODE_OPTIONS: { value: RunMode; label: string }[] = [
  { value: 'initial', label: 'Initial check-in' },
  { value: 'recurring', label: 'Recurring check-in' },
];

/** Human label for a block's inclusion, shown as a badge in the preview. */
const INCLUSION_LABEL: Record<RunMode | 'always', string> = {
  always: 'Every run',
  initial: 'Initial only',
  recurring: 'Recurring only',
};

interface QuestionFieldProps {
  question: Question;
  /** The currently-selected choice id for this question (single-select only). */
  selectedChoiceId: string | undefined;
  /** Records a single-select choice so dependent questions can reveal. */
  onSelectChoice: (choiceId: string) => void;
}

/**
 * Renders the answer control for a single question. Single-select inputs are
 * interactive in the preview so that branching display conditions can be
 * demonstrated; the other types stay non-interactive (a faithful preview).
 */
function QuestionField({
  question,
  selectedChoiceId,
  onSelectChoice,
}: QuestionFieldProps) {
  switch (question.type) {
    case 'single-select':
      return (
        <fieldset className="flex flex-col gap-2">
          {question.choices.map((choice) => (
            <label
              key={choice.id}
              className="flex items-center gap-2 text-sm text-zinc-700"
            >
              <input
                type="radio"
                name={question.id}
                checked={selectedChoiceId === choice.id}
                onChange={() => onSelectChoice(choice.id)}
                className="size-4"
              />
              {choice.label}
            </label>
          ))}
        </fieldset>
      );
    case 'multi-select':
      return (
        <fieldset className="flex flex-col gap-2">
          {question.choices.map((choice) => (
            <label
              key={choice.id}
              className="flex items-center gap-2 text-sm text-zinc-700"
            >
              <input type="checkbox" name={question.id} disabled className="size-4" />
              {choice.label}
            </label>
          ))}
        </fieldset>
      );
    case 'date':
      return (
        <input
          type="date"
          disabled
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
        />
      );
    case 'text':
      return (
        <input
          type="text"
          disabled
          placeholder="Your answer"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
        />
      );
  }
}

/**
 * Respondent-facing preview of an assembled survey, with the owning client's
 * white-label branding applied (logo + primary color). Honors the demo's flow
 * logic: a run-mode toggle (initial vs recurring) skips blocks whose inclusion
 * doesn't apply, and questions with a display condition stay hidden until their
 * gateway answer is selected. Visibility/skip is computed during render from the
 * current selections and run mode — no live runtime engine.
 */
export function SurveyPreview({ survey, client }: SurveyPreviewProps) {
  const [runMode, setRunMode] = useState<RunMode>('initial');
  // gateway question id -> selected single-select choice id.
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const selectedChoiceIds = new Set(Object.values(answers));

  const orderedGroups = orderedBlockGroups(survey);
  const totalBlocks = flattenBlocks(survey).length;
  // Blocks skipped on this run, across all groups — surfaced as a single summary.
  const skippedBlocks = orderedGroups.flatMap((group) =>
    group.blocks.filter((block) => !isBlockIncluded(block, runMode)),
  );
  // Whether any block applies on the current run mode; drives the run-mode
  // empty state when a survey has blocks but all are skipped for this mode.
  const anyIncluded = orderedGroups.some((group) =>
    group.blocks.some((block) => isBlockIncluded(block, runMode)),
  );

  function selectChoice(questionId: string, choiceId: string) {
    setAnswers((current) => ({ ...current, [questionId]: choiceId }));
  }

  return (
    <div className="flex flex-col bg-white">
      <header
        className="flex flex-col gap-2 px-5 py-4 text-white"
        style={{ backgroundColor: client.branding.primaryColor }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- mock placeholder logo */}
        <img
          src={client.branding.logo}
          alt={`${client.name} logo`}
          className="h-8 w-auto self-start rounded bg-white/90 p-1"
        />
        <h2 className="text-lg font-semibold">{survey.name}</h2>
      </header>

      <div
        className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3"
        role="group"
        aria-label="Preview run mode"
      >
        <span className="text-xs font-medium text-zinc-500">Previewing as</span>
        {RUN_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRunMode(option.value)}
            aria-pressed={runMode === option.value}
            className={cn(
              'rounded-md border px-3 py-1 text-xs font-medium transition-colors',
              runMode === option.value
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 px-5 py-6">
        {totalBlocks === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            This survey has no blocks yet.
          </p>
        ) : (
          <>
            {orderedGroups.map((group) => {
              const includedBlocks = orderedBlocks(group).filter((block) =>
                isBlockIncluded(block, runMode),
              );
              if (includedBlocks.length === 0) {
                return null;
              }
              const cadence = resolveEffectiveCadence(survey, group);
              return (
                <section key={group.id} className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {group.name}
                    </h3>
                    <span className="text-[11px] text-zinc-400">
                      {formatSchedule(cadence.schedule)}
                      {cadence.source === 'survey-default'
                        ? ' (survey default)'
                        : ' (group override)'}
                    </span>
                  </div>
                  {includedBlocks.map((block) => {
                    const visibleQuestions = block.questions.filter((question) =>
                      isQuestionVisible(question, selectedChoiceIds),
                    );
                    return (
                      <div key={block.id} className="flex flex-col gap-4">
                        <h4 className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                          {block.name}
                          {resolveInclusion(block) !== 'always' && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-zinc-500">
                              {INCLUSION_LABEL[resolveInclusion(block)]}
                            </span>
                          )}
                        </h4>
                        {visibleQuestions.length === 0 ? (
                          <p className="text-xs text-zinc-400">
                            No questions shown yet for the current answers.
                          </p>
                        ) : (
                          visibleQuestions.map((question) => (
                            <div
                              key={question.id}
                              className="flex flex-col gap-2"
                            >
                              <p className="text-sm font-medium text-zinc-900">
                                {question.label}
                                {question.required && (
                                  <span
                                    aria-hidden
                                    className="ml-1 text-red-500"
                                  >
                                    *
                                  </span>
                                )}
                              </p>
                              <QuestionField
                                question={question}
                                selectedChoiceId={answers[question.id]}
                                onSelectChoice={(choiceId) =>
                                  selectChoice(question.id, choiceId)
                                }
                              />
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })}

            {!anyIncluded && (
              <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
                No blocks apply on a {runMode} check-in.
              </p>
            )}

            {skippedBlocks.length > 0 && (
              <p className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                Skipped on this {runMode} run:{' '}
                {skippedBlocks.map((block) => block.name).join(', ')}.
              </p>
            )}
          </>
        )}

        <button
          type="button"
          disabled
          className="mt-2 rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: client.branding.primaryColor }}
        >
          Submit check-in
        </button>
      </div>

      <footer className="border-t border-zinc-100 px-5 py-3">
        <BrandSwatches branding={client.branding} />
      </footer>
    </div>
  );
}
