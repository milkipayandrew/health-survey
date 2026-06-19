'use client';

import { Badge } from '@/components/badge';
import type { PatientDetail } from '@/lib/dashboard-aggregation';
import type { Response } from '@/types/domain';

/** Inner plot dimensions and padding for the hand-rolled SVG line chart. */
const CHART = {
  width: 640,
  height: 220,
  paddingX: 40,
  paddingY: 24,
} as const;

/** A single response plotted as an (x, y) point in SVG user space. */
interface PlotPoint {
  x: number;
  y: number;
  response: Response;
}

/** Formats an ISO-8601 timestamp as a short, locale-stable calendar date. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Projects the patient's scored responses onto the chart's pixel grid.
 *
 * @remarks
 * X is the response's `submittedAt` spread evenly left → right in chronological
 * order (responses arrive pre-sorted oldest-first). Y is the adherence score
 * inverted: lower score is better (DOM00022), so a better score sits **higher**
 * on the chart. A single point is centred; an empty/all-unscored history yields
 * no points (the caller renders an empty state instead).
 */
function plotResponses(responses: Response[]): {
  points: PlotPoint[];
  minScore: number;
  maxScore: number;
} {
  const scored = responses.filter(
    (response): response is Response & { adherenceScore: number } =>
      response.adherenceScore !== undefined,
  );

  const scores = scored.map((response) => response.adherenceScore);
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const scoreRange = maxScore - minScore || 1;

  const innerWidth = CHART.width - CHART.paddingX * 2;
  const innerHeight = CHART.height - CHART.paddingY * 2;
  const xStep = scored.length > 1 ? innerWidth / (scored.length - 1) : 0;

  const points = scored.map((response, index) => {
    const x =
      scored.length > 1
        ? CHART.paddingX + index * xStep
        : CHART.paddingX + innerWidth / 2;
    // Invert: lower (better) score → higher on the chart (smaller y).
    const normalized = (response.adherenceScore - minScore) / scoreRange;
    const y = CHART.paddingY + normalized * innerHeight;
    return { x, y, response };
  });

  return { points, minScore, maxScore };
}

interface AdherenceLineChartProps {
  /** The patient's responses, oldest-first, to plot over time. */
  responses: Response[];
}

/**
 * A lightweight hand-rolled INLINE SVG line chart of a patient's adherence score
 * over time (REQ00004, REQ00007 — the explicitly-requested longitudinal graph).
 * X is response submission time (DOM00022 "Submitted at enables longitudinal
 * graph"); Y is the adherence score inverted so that a lower (better) score
 * (DOM00022) plots higher. No charting dependency is added (charting decision).
 */
function AdherenceLineChart({ responses }: AdherenceLineChartProps) {
  const { points, minScore, maxScore } = plotResponses(responses);

  if (points.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
        No scored responses yet to chart.
      </p>
    );
  }

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-56 w-full"
        role="img"
        aria-label="Line chart of adherence score over time; lower is better"
      >
        {/* Baseline axis. */}
        <line
          x1={CHART.paddingX}
          y1={CHART.height - CHART.paddingY}
          x2={CHART.width - CHART.paddingX}
          y2={CHART.height - CHART.paddingY}
          className="stroke-zinc-200"
          strokeWidth={1}
        />
        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            className="stroke-blue-600"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((point) => (
          <g key={point.response.id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={4}
              className="fill-blue-600"
            />
            <title>
              {`${formatDate(point.response.submittedAt)}: score ${point.response.adherenceScore}`}
            </title>
          </g>
        ))}
      </svg>
      <figcaption className="flex items-center justify-between text-xs text-zinc-500">
        <span>Adherence score over time (lower is better)</span>
        <span className="tabular-nums">
          Best {minScore} · Worst {maxScore}
        </span>
      </figcaption>
    </figure>
  );
}

interface FreeTextResponsesProps {
  /** The patient's responses (oldest-first); only those with free text render. */
  responses: Response[];
}

/**
 * The patient's free-text messages to the provider (DOM00022 — "Free text:
 * messages to the provider"), newest-first so the latest message leads.
 * Read-only.
 */
function FreeTextResponses({ responses }: FreeTextResponsesProps) {
  const withText = responses
    .filter((response) => (response.freeText ?? '').trim() !== '')
    .reverse();

  if (withText.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
        No free-text messages from this patient.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {withText.map((response) => (
        <li
          key={response.id}
          className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
        >
          <p className="text-sm text-zinc-800">{response.freeText}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatDate(response.submittedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

interface PatientDrilldownProps {
  /** The drilled-into patient's detail (patient + responses + alerts). */
  detail: PatientDetail;
  /** Returns to the patient list, clearing the selection. */
  onBack: () => void;
}

/**
 * The single-patient drill-down (REQ00004): one patient's (DOM00015) adherence
 * trend as a hand-rolled inline SVG longitudinal line graph, their free-text
 * messages to the provider, and any alerts concerning them surfaced READ-ONLY as
 * a flag/badge (DOM00023) — no acknowledge/handle interaction (alerts decision).
 * Sourced from the per-client runtime mock data.
 */
export function PatientDrilldown({ detail, onBack }: PatientDrilldownProps) {
  const { patient, responses, alerts } = detail;
  const needsFollowUp = alerts.length > 0;

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to patients
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">{patient.name}</h2>
          {needsFollowUp && (
            <Badge tone="critical">
              Needs follow-up
              {alerts.length > 1 ? ` (${alerts.length})` : ''}
            </Badge>
          )}
        </div>
        {patient.email && (
          <span className="text-sm text-zinc-500">{patient.email}</span>
        )}
      </div>

      {needsFollowUp && (
        <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Alerts
          </h3>
          <ul className="flex flex-col gap-1">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-red-800"
              >
                <span>{alert.reason}</span>
                <span className="text-xs text-red-600">
                  {formatDate(alert.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900">
          Adherence over time
        </h3>
        <AdherenceLineChart responses={responses} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900">
          Messages to provider
        </h3>
        <FreeTextResponses responses={responses} />
      </div>
    </section>
  );
}
