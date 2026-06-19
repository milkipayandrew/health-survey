'use client';

import { cn, makeId } from '@/lib/utils';
import type {
  DisplayCondition,
  Question,
  QuestionChoice,
  QuestionType,
} from '@/types/domain';

/**
 * A question offered as a branching gateway, paired with its block's name for a
 * readable picker. Only single/multi-select questions (which have choices) can
 * act as a gateway.
 */
export interface GatewayOption {
  question: Question;
  blockName: string;
}

/** The selectable question types, with human labels for the type picker. */
const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'single-select', label: 'Single select' },
  { value: 'multi-select', label: 'Multi select' },
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
];

/** Whether a question type presents a fixed list of scoreable choices. */
function hasChoices(type: QuestionType): boolean {
  return type === 'single-select' || type === 'multi-select';
}

/** Builds a fresh, empty choice with a zero score code. */
export function makeEmptyChoice(): QuestionChoice {
  return { id: makeId('c'), label: '', scoreCode: 0 };
}

/** Builds a fresh single-select question seeded with one empty choice. */
export function makeEmptyQuestion(): Question {
  return {
    id: makeId('q'),
    type: 'single-select',
    label: '',
    required: false,
    choices: [makeEmptyChoice()],
  };
}

interface QuestionEditorProps {
  /** The question being edited. The parent owns and persists this value. */
  question: Question;
  /** One-based position within its block, shown as the question's heading. */
  index: number;
  /** Called with the next question whenever any field changes. */
  onChange: (next: Question) => void;
  /** Removes this question from its parent block. */
  onRemove: () => void;
  /**
   * Candidate gateway questions this question may be gated on (single/multi-
   * select questions appearing earlier in the survey). Omitted in contexts with
   * no branching (e.g. the library manager), which hides the condition control.
   */
  gatewayOptions?: GatewayOption[];
}

/**
 * Controlled editor for a single {@link Question}: its type, prompt label,
 * required flag, and — for select types — its scoreable choices. Shared by the
 * survey builder and the block-library manager so question authoring behaves
 * identically in both. Switching to a non-choice type (text/date) drops the
 * choices; switching to a choice type seeds one empty choice so the control is
 * never blank. Score codes feed the canned test-response generator (there is no
 * live scoring engine in the demo).
 */
export function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
  gatewayOptions,
}: QuestionEditorProps) {
  function changeType(type: QuestionType) {
    if (!hasChoices(type)) {
      onChange({ ...question, type, choices: [] });
      return;
    }
    const choices =
      question.choices.length > 0 ? question.choices : [makeEmptyChoice()];
    onChange({ ...question, type, choices });
  }

  function changeChoice(choiceId: string, changes: Partial<QuestionChoice>) {
    onChange({
      ...question,
      choices: question.choices.map((choice) =>
        choice.id === choiceId ? { ...choice, ...changes } : choice,
      ),
    });
  }

  function addChoice() {
    onChange({ ...question, choices: [...question.choices, makeEmptyChoice()] });
  }

  function removeChoice(choiceId: string) {
    onChange({
      ...question,
      choices: question.choices.filter((choice) => choice.id !== choiceId),
    });
  }

  function changeGateway(questionId: string) {
    if (questionId === '') {
      const { displayCondition: _omitted, ...rest } = question;
      void _omitted;
      onChange(rest);
      return;
    }
    const gateway = gatewayOptions?.find(
      (option) => option.question.id === questionId,
    );
    const firstChoiceId = gateway?.question.choices[0]?.id ?? '';
    const displayCondition: DisplayCondition = {
      questionId,
      choiceId: firstChoiceId,
    };
    onChange({ ...question, displayCondition });
  }

  function changeGatewayChoice(choiceId: string) {
    if (question.displayCondition === undefined) {
      return;
    }
    onChange({
      ...question,
      displayCondition: { ...question.displayCondition, choiceId },
    });
  }

  // Candidate gateways exclude this question itself (a question cannot gate on
  // its own answer). Only available when the parent supplies options.
  const availableGateways = (gatewayOptions ?? []).filter(
    (option) => option.question.id !== question.id,
  );
  const selectedGateway = availableGateways.find(
    (option) => option.question.id === question.displayCondition?.questionId,
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor={`question-label-${question.id}`}
            className="text-xs text-zinc-500"
          >
            Question {index}
          </label>
          <input
            id={`question-label-${question.id}`}
            type="text"
            value={question.label}
            onChange={(event) =>
              onChange({ ...question, label: event.target.value })
            }
            placeholder="Question prompt"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove question ${index}`}
          className="mt-6 shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          Remove
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`question-type-${question.id}`}
            className="text-xs text-zinc-500"
          >
            Type
          </label>
          <select
            id={`question-type-${question.id}`}
            value={question.type}
            onChange={(event) => changeType(event.target.value as QuestionType)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-900 focus:outline-none"
          >
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(event) =>
              onChange({ ...question, required: event.target.checked })
            }
            className="size-4"
          />
          Required
        </label>
      </div>

      {hasChoices(question.type) && (
        <div className="flex flex-col gap-2 border-l border-zinc-200 pl-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-500">
              Choices (score code feeds adherence scoring)
            </span>
            <button
              type="button"
              onClick={addChoice}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-zinc-100"
            >
              + Add choice
            </button>
          </div>
          {question.choices.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No choices yet — add at least one.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {question.choices.map((choice) => (
                <li key={choice.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={choice.label}
                    onChange={(event) =>
                      changeChoice(choice.id, { label: event.target.value })
                    }
                    placeholder="Choice label"
                    aria-label="Choice label"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={choice.scoreCode}
                    onChange={(event) =>
                      changeChoice(choice.id, {
                        scoreCode: Number(event.target.value),
                      })
                    }
                    aria-label="Score code"
                    className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeChoice(choice.id)}
                    aria-label={`Remove choice ${choice.label || ''}`.trim()}
                    className={cn(
                      'shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100',
                    )}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {gatewayOptions !== undefined && (
        <div className="flex flex-col gap-2 border-l border-zinc-200 pl-3">
          <span className="text-xs font-medium text-zinc-500">
            Display condition (branching visibility)
          </span>
          {availableGateways.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No earlier single/multi-select question to gate on yet.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor={`question-gateway-${question.id}`}
                className="text-xs text-zinc-500"
              >
                Show only when
              </label>
              <select
                id={`question-gateway-${question.id}`}
                value={question.displayCondition?.questionId ?? ''}
                onChange={(event) => changeGateway(event.target.value)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-900 focus:outline-none"
              >
                <option value="">Always shown</option>
                {availableGateways.map((option) => (
                  <option key={option.question.id} value={option.question.id}>
                    {option.blockName}: {option.question.label || '(untitled)'}
                  </option>
                ))}
              </select>
              {selectedGateway !== undefined && (
                <>
                  <span className="text-xs text-zinc-500">is</span>
                  <select
                    aria-label="Gateway answer"
                    value={question.displayCondition?.choiceId ?? ''}
                    onChange={(event) => changeGatewayChoice(event.target.value)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    {selectedGateway.question.choices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label || '(unlabeled)'}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
