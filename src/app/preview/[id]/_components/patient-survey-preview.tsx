'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useMockData } from '@/hooks/use-mock-data';
import {
  isBlockIncluded,
  isQuestionVisible,
  type RunMode,
} from '@/lib/flow-logic';
import { orderedBlockGroups, orderedBlocks } from '@/lib/scheduling';
import { cn } from '@/lib/utils';
import type { Client, Question, Survey } from '@/types/domain';

/** A single question paired with its owning block name, in walkthrough order. */
interface QuestionStep {
  question: Question;
  blockName: string;
}

/** A patient's answer: a choice id (single), choice ids (multi), or free text/date. */
type AnswerValue = string | string[];

/** Neutral fallback branding when the survey's owning client can't be resolved. */
const FALLBACK_BRANDING = {
  logo: '',
  primaryColor: '#18181b',
  secondaryColor: '#71717a',
} as const;

/** The run-mode toggle options for the preview chrome (not patient-facing). */
const RUN_MODE_OPTIONS: { value: RunMode; label: string }[] = [
  { value: 'initial', label: 'Initial check-in' },
  { value: 'recurring', label: 'Recurring check-in' },
];

/** Which device frame the patient walkthrough is rendered inside. */
type PreviewDevice = 'desktop' | 'mobile';

/**
 * Whether a question has been answered, per its type. Drives required-field
 * gating on the Next/Submit control.
 */
function isAnswered(question: Question, value: AnswerValue | undefined): boolean {
  switch (question.type) {
    case 'single-select':
    case 'date':
      return typeof value === 'string' && value.length > 0;
    case 'text':
      return typeof value === 'string' && value.trim().length > 0;
    case 'multi-select':
      return Array.isArray(value) && value.length > 0;
  }
}

interface QuestionInputProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Brand color used to tint the active controls. */
  accentColor: string;
}

/**
 * The interactive answer control for a question — fully functional for all four
 * MVP question types (unlike the admin preview, where only single-select is
 * live). Single/multi-select choices feed the branching engine via the answer
 * state lifted into {@link SurveyRunner}.
 */
function QuestionInput({
  question,
  value,
  onChange,
  accentColor,
}: QuestionInputProps) {
  switch (question.type) {
    case 'single-select':
      return (
        <fieldset className="flex flex-col gap-2.5">
          {question.choices.map((choice) => {
            const checked = value === choice.id;
            return (
              <label
                key={choice.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors',
                  checked
                    ? 'border-transparent text-zinc-900'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                )}
                style={
                  checked
                    ? { backgroundColor: `${accentColor}14`, borderColor: accentColor }
                    : undefined
                }
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={checked}
                  onChange={() => onChange(choice.id)}
                  className="size-4 shrink-0"
                  style={{ accentColor }}
                />
                {choice.label}
              </label>
            );
          })}
        </fieldset>
      );
    case 'multi-select': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset className="flex flex-col gap-2.5">
          {question.choices.map((choice) => {
            const checked = selected.includes(choice.id);
            return (
              <label
                key={choice.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors',
                  checked
                    ? 'border-transparent text-zinc-900'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                )}
                style={
                  checked
                    ? { backgroundColor: `${accentColor}14`, borderColor: accentColor }
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  name={question.id}
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked
                        ? selected.filter((id) => id !== choice.id)
                        : [...selected, choice.id],
                    )
                  }
                  className="size-4 shrink-0"
                  style={{ accentColor }}
                />
                {choice.label}
              </label>
            );
          })}
        </fieldset>
      );
    }
    case 'date':
      return (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-[15px] text-zinc-900 focus:outline-none focus:ring-2"
          style={{ outlineColor: accentColor }}
        />
      );
    case 'text':
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type your answer"
          rows={3}
          className="w-full resize-none rounded-xl border border-zinc-300 px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2"
          style={{ outlineColor: accentColor }}
        />
      );
  }
}

interface SurveyRunnerProps {
  survey: Survey;
  branding: { logo: string; primaryColor: string; secondaryColor: string };
  clientName: string;
  /** Which run the preview simulates; remounted (state reset) when this changes. */
  runMode: RunMode;
}

/**
 * The one-question-at-a-time walkthrough rendered inside the phone screen. Honors
 * the admin-authored survey exactly: block order/inclusion (initial vs recurring)
 * and per-question display conditions, recomputed live as answers change so a
 * branching question appears the moment its gateway is satisfied. Ends on a
 * branded completion screen. Nothing is persisted — this is a preview.
 */
function SurveyRunner({ survey, branding, clientName, runMode }: SurveyRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Every question that could appear on this run (block included for run mode),
  // in group-then-block order, tagged with its block name for context.
  const candidates: QuestionStep[] = orderedBlockGroups(survey).flatMap((group) =>
    orderedBlocks(group)
      .filter((block) => isBlockIncluded(block, runMode))
      .flatMap((block) =>
        block.questions.map((question) => ({ question, blockName: block.name })),
      ),
  );

  // All selected choice ids (single + multi) drive display-condition branching.
  const selectedChoiceIds = new Set<string>();
  for (const { question } of candidates) {
    const answer = answers[question.id];
    if (question.type === 'single-select' && typeof answer === 'string') {
      selectedChoiceIds.add(answer);
    } else if (question.type === 'multi-select' && Array.isArray(answer)) {
      answer.forEach((id) => selectedChoiceIds.add(id));
    }
  }

  // The live sequence the patient actually walks, after branching is applied.
  const visibleSteps = candidates.filter(({ question }) =>
    isQuestionVisible(question, selectedChoiceIds),
  );

  const total = visibleSteps.length;
  // currentIndex === total means "past the last question" → completion screen.
  const clampedIndex = Math.min(currentIndex, total);
  const isComplete = total > 0 && clampedIndex >= total;
  const step = isComplete ? undefined : visibleSteps[clampedIndex];

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function restart() {
    setAnswers({});
    setCurrentIndex(0);
  }

  if (total === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <BrandedHeader branding={branding} clientName={clientName} title={survey.name} />
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-zinc-500">
            This survey has no questions to show on a {runMode} check-in yet.
          </p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-1 flex-col">
        <BrandedHeader
          branding={branding}
          clientName={clientName}
          title={survey.name}
          progress={1}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div
            className="flex size-16 items-center justify-center rounded-full text-3xl text-white"
            style={{ backgroundColor: branding.primaryColor }}
            aria-hidden
          >
            ✓
          </div>
          <h3 className="text-xl font-semibold text-zinc-900">You&apos;re all set</h3>
          <p className="text-sm text-zinc-500">
            Thanks for completing your check-in. Your care team will be in touch if
            anything needs attention.
          </p>
          <button
            type="button"
            onClick={restart}
            className="mt-2 text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: branding.primaryColor }}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const question = step!.question;
  const answered = isAnswered(question, answers[question.id]);
  const canAdvance = !question.required || answered;
  const isLast = clampedIndex === total - 1;

  return (
    <div className="flex flex-1 flex-col">
      <BrandedHeader
        branding={branding}
        clientName={clientName}
        title={survey.name}
        progress={(clampedIndex + 1) / total}
        stepLabel={`Question ${clampedIndex + 1} of ${total}`}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {step!.blockName}
        </p>
        <h3 className="text-lg font-semibold leading-snug text-zinc-900">
          {question.label}
          {question.required && (
            <span aria-hidden className="ml-1 text-red-500">
              *
            </span>
          )}
        </h3>
        <QuestionInput
          question={question}
          value={answers[question.id]}
          onChange={(value) => setAnswer(question.id, value)}
          accentColor={branding.primaryColor}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-100 px-6 py-4">
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          disabled={clampedIndex === 0}
          className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setCurrentIndex((index) => index + 1)}
          disabled={!canAdvance}
          className="flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {isLast ? 'Submit check-in' : 'Next'}
        </button>
      </div>
    </div>
  );
}

interface BrandedHeaderProps {
  branding: { logo: string; primaryColor: string; secondaryColor: string };
  clientName: string;
  title: string;
  /** Progress fraction 0–1; omit to hide the progress bar. */
  progress?: number;
  /** Optional step counter shown beside the progress bar. */
  stepLabel?: string;
}

/** The branded patient-facing header: client logo, survey title, progress bar. */
function BrandedHeader({
  branding,
  clientName,
  title,
  progress,
  stepLabel,
}: BrandedHeaderProps) {
  return (
    <header
      className="flex flex-col gap-3 px-6 py-5 text-white"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div className="flex items-center gap-2">
        {branding.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- mock placeholder logo
          <img
            src={branding.logo}
            alt={`${clientName} logo`}
            className="h-7 w-auto rounded bg-white/90 p-1"
          />
        ) : (
          <span className="text-sm font-semibold">{clientName}</span>
        )}
      </div>
      <h2 className="text-lg font-semibold leading-tight">{title}</h2>
      {progress !== undefined && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          {stepLabel && (
            <span className="text-[11px] font-medium text-white/80">{stepLabel}</span>
          )}
        </div>
      )}
    </header>
  );
}

interface PatientSurveyPreviewProps {
  /** The id of the survey to preview, resolved from the route. */
  surveyId: string;
}

/**
 * Standalone patient-facing preview surface. Looks the survey + owning client up
 * from the client-side mock store, applies white-label branding, and renders the
 * one-question-at-a-time walkthrough inside a selectable device frame — a phone
 * mockup (mobile) or a faux browser window (desktop) — so a reviewer sees exactly
 * the patient experience on either form factor. The page chrome (run-mode +
 * device toggles, "not saved" note, back link) sits OUTSIDE the device frame so
 * the framed content stays a faithful patient view.
 */
export function PatientSurveyPreview({ surveyId }: PatientSurveyPreviewProps) {
  const data = useMockData();
  const [runMode, setRunMode] = useState<RunMode>('initial');
  const [device, setDevice] = useState<PreviewDevice>('mobile');

  if (data === null) {
    return (
      <main className="flex min-h-full items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Loading preview…</p>
      </main>
    );
  }

  const survey = data.surveys.find((item) => item.id === surveyId);
  if (survey === undefined) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 bg-zinc-100">
        <p className="text-sm text-zinc-500">Survey not found.</p>
        <Link href="/surveys" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to surveys
        </Link>
      </main>
    );
  }

  const client: Client | undefined = data.clients.find(
    (item) => item.id === survey.clientId,
  );
  const branding = client?.branding ?? FALLBACK_BRANDING;
  const clientName = client?.name ?? 'Preview';

  return (
    <main className="flex min-h-full flex-col items-center gap-6 bg-zinc-100 px-4 py-8">
      <div className="flex w-full max-w-2xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
            Preview
          </span>
          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label="Preview run mode"
              className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5"
            >
              {RUN_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={runMode === option.value}
                  onClick={() => setRunMode(option.value)}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium transition-colors',
                    runMode === option.value
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div
              role="group"
              aria-label="Preview device"
              className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5"
            >
              {(['desktop', 'mobile'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={device === option}
                  onClick={() => setDevice(option)}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium capitalize transition-colors',
                    device === option
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          This is how {clientName} patients see “{survey.name}” on{' '}
          {device === 'mobile' ? 'their phone' : 'the web'}. Answers
          aren&apos;t saved.
        </p>
      </div>

      {device === 'mobile' ? (
        // Phone mockup: a device bezel framing the true mobile patient view.
        <div className="rounded-[2.75rem] border-[12px] border-zinc-900 bg-zinc-900 shadow-2xl">
          <div className="relative h-[760px] w-[360px] overflow-hidden rounded-[2rem] bg-white">
            {/* Notch */}
            <div className="absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
            <div className="flex h-full flex-col">
              <SurveyRunner
                key={runMode}
                survey={survey}
                branding={branding}
                clientName={clientName}
                runMode={runMode}
              />
            </div>
          </div>
        </div>
      ) : (
        // Desktop browser window — the same walkthrough in a roomy card topped
        // with faux browser chrome so it reads as a wide desktop viewport.
        <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-100 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-zinc-300" />
            <span className="h-3 w-3 rounded-full bg-zinc-300" />
            <span className="h-3 w-3 rounded-full bg-zinc-300" />
          </div>
          <div className="flex h-[700px] flex-col">
            <SurveyRunner
              key={runMode}
              survey={survey}
              branding={branding}
              clientName={clientName}
              runMode={runMode}
            />
          </div>
        </div>
      )}

      <Link
        href={`/surveys/${survey.id}`}
        className="text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Back to survey admin
      </Link>
    </main>
  );
}
