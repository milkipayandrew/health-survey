'use client';

import { useMemo, useState } from 'react';

import { Badge, type BadgeTone } from '@/components/badge';
import { SearchInput } from '@/components/search-input';
import {
  filterPatientsByNameOrEmail,
  RISK_BAND_LABELS,
  type PatientSummary,
  type RiskBand,
} from '@/lib/dashboard-aggregation';

/** Maps an adherence risk band to a semantic badge tone (high = critical). */
const RISK_BAND_TONES: Record<RiskBand, BadgeTone> = {
  low: 'positive',
  medium: 'caution',
  high: 'critical',
};

interface PatientRowProps {
  summary: PatientSummary;
  /** Invoked when the row is activated, opening the single-patient drill-down. */
  onSelect: (patientId: string) => void;
}

/**
 * One patient row in the list: name + email, latest adherence score and risk
 * band, and a read-only follow-up flag when the patient has any open alert
 * (DOM00023 — who needs follow-up, no acknowledge/handle interaction). The whole
 * row is a button that hands the patient id to the drill-down hook.
 */
function PatientRow({ summary, onSelect }: PatientRowProps) {
  const { patient, latestScore, riskBand, alerts } = summary;
  const needsFollowUp = alerts.length > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(patient.id)}
      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
    >
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 truncate text-sm font-medium text-zinc-900">
          {patient.name}
          {needsFollowUp && (
            <Badge tone="critical">
              Needs follow-up
              {alerts.length > 1 ? ` (${alerts.length})` : ''}
            </Badge>
          )}
        </span>
        {patient.email && (
          <span className="truncate text-xs text-zinc-500">{patient.email}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {riskBand ? (
          <Badge tone={RISK_BAND_TONES[riskBand]}>
            {RISK_BAND_LABELS[riskBand]}
          </Badge>
        ) : (
          <Badge tone="neutral">No responses</Badge>
        )}
        <span className="w-16 text-right text-sm tabular-nums text-zinc-500">
          {latestScore === undefined ? '—' : `Score ${latestScore}`}
        </span>
      </div>
    </button>
  );
}

interface PatientListProps {
  /** The client's per-patient roll-ups to list. */
  patients: PatientSummary[];
  /** Drill-down hook: invoked with the selected patient id to open their detail. */
  onSelectPatient?: (patientId: string) => void;
}

/**
 * The provider dashboard's patient list (REQ00004): every monitored patient for
 * the client, filterable by **name or email** (DOM00015), each showing a
 * read-only adherence risk badge and a follow-up flag when alerts are open
 * (DOM00023). Selecting a row calls {@link PatientListProps.onSelectPatient} to
 * open that patient's single-patient drill-down (longitudinal graph + free text).
 */
export function PatientList({ patients, onSelectPatient }: PatientListProps) {
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () => filterPatientsByNameOrEmail(patients, query),
    [patients, query],
  );

  const handleSelect = (patientId: string) => {
    onSelectPatient?.(patientId);
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-sm font-semibold text-zinc-900">Patients</h2>
        <SearchInput
          id="patient-search"
          label="Search patients"
          placeholder="Filter by name or email…"
          value={query}
          onChange={setQuery}
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No patients match your search.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-md border border-zinc-100">
          {visible.map((summary) => (
            <li key={summary.patient.id}>
              <PatientRow summary={summary} onSelect={handleSelect} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
