'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { StatusBadge } from '@/components/status-badge';
import { useMockData } from '@/hooks/use-mock-data';
import {
  downloadTestResponses,
  type ExportFormat,
} from '@/lib/export/test-responses-export';
import { copySurvey, reopenSurvey, setSurveyStatus } from '@/lib/mock/store';
import {
  generateTestResponses,
  type TestResponseMode,
} from '@/lib/mock/test-responses';
import { cn, primaryButtonClasses, secondaryButtonClasses } from '@/lib/utils';
import type { TestResponse } from '@/types/domain';

import { SurveyPreview } from './survey-preview';
import { SurveyQrPreview } from './survey-qr-preview';
import { TestResponsesPanel } from './test-responses-panel';

interface SurveyDetailProps {
  /** The id of the survey to preview, resolved from the route. */
  surveyId: string;
}

/** Which device frame the respondent preview is rendered inside. */
type PreviewDevice = 'desktop' | 'mobile';

/** Outer frame width per device, sized to a phone vs. a roomy desktop card. */
const DEVICE_FRAME: Record<PreviewDevice, string> = {
  desktop: 'w-full max-w-2xl',
  mobile: 'w-[375px]',
};

/**
 * Survey detail surface. Renders the assembled survey as a respondent would see
 * it (with the owning client's white-label branding), offers a desktop/mobile
 * preview toggle, and a "Generate test responses" action that produces canned
 * mock results standing in for branching/scoring validation before publish.
 */
export function SurveyDetail({ surveyId }: SurveyDetailProps) {
  const router = useRouter();
  const data = useMockData();
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [responses, setResponses] = useState<TestResponse[] | null>(null);
  const [testMode, setTestMode] = useState<TestResponseMode>('answer-all');

  if (data === null) {
    return <p className="text-sm text-zinc-500">Loading survey…</p>;
  }

  const survey = data.surveys.find((item) => item.id === surveyId);
  if (survey === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">Survey not found.</p>
        <Link
          href="/surveys"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to surveys
        </Link>
      </div>
    );
  }

  const client = data.clients.find((item) => item.id === survey.clientId);

  function handleGenerate() {
    if (survey === undefined) {
      return;
    }
    setResponses(generateTestResponses(survey, testMode));
  }

  function handleExport(format: ExportFormat) {
    if (survey === undefined || responses === null || responses.length === 0) {
      // No responses to export — no-op (the control is disabled in this state).
      return;
    }
    downloadTestResponses(responses, format, `${survey.name}-test-responses`);
  }

  function handlePublish() {
    setSurveyStatus(surveyId, 'published');
  }

  function handleArchive() {
    setSurveyStatus(surveyId, 'archived');
  }

  function handleReopen() {
    reopenSurvey(surveyId);
  }

  function handleCopy() {
    const copy = copySurvey(surveyId);
    if (copy !== null) {
      router.push(`/surveys/${copy.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/surveys"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to surveys
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {survey.name}
          </h1>
          <StatusBadge status={survey.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {client?.name ?? 'Unknown client'} · Preview the survey as a
          respondent sees it, then generate test responses to validate
          branching and scoring.
        </p>

        <div className="mt-4 flex flex-wrap gap-3" aria-label="Lifecycle actions">
          {survey.status === 'draft' && (
            <button
              type="button"
              onClick={handlePublish}
              className={primaryButtonClasses()}
            >
              Publish
            </button>
          )}
          {survey.status === 'draft' && (
            <Link
              href={`/surveys/${survey.id}/edit`}
              className={secondaryButtonClasses()}
            >
              Edit draft
            </Link>
          )}
          {survey.status === 'published' && (
            <button
              type="button"
              onClick={handleArchive}
              className={secondaryButtonClasses()}
            >
              Archive
            </button>
          )}
          {survey.status === 'archived' && (
            <button
              type="button"
              onClick={handleReopen}
              className={primaryButtonClasses()}
            >
              Re-open
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className={secondaryButtonClasses()}
          >
            Add by copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr]">
        <section className="flex flex-col gap-3" aria-label="Respondent preview">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-700">Preview</h2>
            <div className="flex items-center gap-3">
              <Link
                href={`/preview/${survey.id}`}
                target="_blank"
                className={secondaryButtonClasses('px-3 py-1 text-xs')}
              >
                Open patient preview ↗
              </Link>
            <div
              role="group"
              aria-label="Preview device"
              className="inline-flex rounded-md border border-zinc-300 p-0.5"
            >
              {(['desktop', 'mobile'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={device === option}
                  onClick={() => setDevice(option)}
                  className={cn(
                    'rounded px-3 py-1 text-sm font-medium capitalize transition-colors',
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

          {client === undefined ? (
            <p className="text-sm text-zinc-500">
              Owning client not found — cannot render the branded preview.
            </p>
          ) : (
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-zinc-300 shadow-sm transition-all',
                DEVICE_FRAME[device],
              )}
            >
              <SurveyPreview survey={survey} client={client} />
            </div>
          )}

          <SurveyQrPreview surveyId={survey.id} />
        </section>

        <section
          className="flex flex-col gap-3"
          aria-label="Test responses"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-zinc-700">
              Test responses
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="Test response mode"
                className="inline-flex rounded-md border border-zinc-300 p-0.5"
              >
                {(
                  [
                    { mode: 'answer-all', label: 'Answer all' },
                    { mode: 'ignore-validation', label: 'Ignore validation' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    aria-pressed={testMode === option.mode}
                    onClick={() => setTestMode(option.mode)}
                    className={cn(
                      'rounded px-3 py-1 text-sm font-medium transition-colors',
                      testMode === option.mode
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className={primaryButtonClasses('shrink-0')}
              >
                Generate test responses
              </button>
              {(['csv', 'json'] as const).map((format) => {
                const hasResponses =
                  responses !== null && responses.length > 0;
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => handleExport(format)}
                    disabled={!hasResponses}
                    className={secondaryButtonClasses(
                      'shrink-0 uppercase disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    Export {format}
                  </button>
                );
              })}
            </div>
          </div>

          {responses === null ? (
            <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
              No test responses yet. Generate canned results to validate
              branching and scoring.
            </p>
          ) : (
            <TestResponsesPanel responses={responses} />
          )}
        </section>
      </div>
    </div>
  );
}
