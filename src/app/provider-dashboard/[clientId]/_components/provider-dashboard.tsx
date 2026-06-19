'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useMockData } from '@/hooks/use-mock-data';
import { useRuntimeData } from '@/hooks/use-runtime-data';
import {
  aggregateClientPopulation,
  buildPatientDetail,
} from '@/lib/dashboard-aggregation';
import type { Client } from '@/types/domain';

import { PatientDrilldown } from './patient-drilldown';
import { PatientList } from './patient-list';
import { PopulationSummary } from './population-summary';

interface ProviderDashboardProps {
  /** The id of the client whose provider dashboard to render, from the route. */
  clientId: string;
}

interface BrandedHeaderProps {
  client: Client;
}

/**
 * The white-label dashboard header: the client's logo (or name fallback) on the
 * client's primary brand color, reading branding from the Client entity
 * (DOM00013). This is the client's own provider experience — never Effective's
 * brand.
 */
function BrandedHeader({ client }: BrandedHeaderProps) {
  const { branding } = client;
  return (
    <header
      className="text-white"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-5 sm:px-6">
        {branding.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- mock placeholder logo
          <img
            src={branding.logo}
            alt={`${client.name} logo`}
            className="h-8 w-auto rounded bg-white/90 p-1"
          />
        ) : (
          <span className="text-base font-semibold">{client.name}</span>
        )}
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{client.name}</span>
          <span className="text-xs text-white/80">Provider dashboard</span>
        </div>
      </div>
    </header>
  );
}

/** The chrome-free page frame shared by every dashboard state. */
function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      {children}
    </main>
  );
}

/**
 * Standalone provider-dashboard surface (REQ00004). Resolves the {@link Client}
 * by id from the mock store (DOM00013), applies the client's white-label
 * branding (logo + brand colors per REQ00007 — Effective's brand never appears),
 * and lays out the single standardised provider dashboard shell — outside the
 * `(admin)` shell with no admin nav/sidebar, mirroring the top-level
 * `/preview/[id]` pattern.
 *
 * @remarks
 * Fills the dashboard content regions for this client: the aggregated
 * population summary by category ({@link PopulationSummary}) and the
 * name/email-filterable {@link PatientList} with read-only follow-up flags
 * (DOM00023), both rolled up from the per-client runtime mock data
 * ({@link aggregateClientPopulation}). Selecting a patient opens the
 * single-patient {@link PatientDrilldown} — the longitudinal SVG graph, free-text
 * messages, and read-only alerts for that patient ({@link buildPatientDetail}) —
 * replacing the list until dismissed. Handles three non-happy states explicitly (glEH): the
 * store still hydrating (loading), an unknown `clientId` (not found), and a
 * resolved client with no seeded runtime population (empty population — not an
 * error).
 */
export function ProviderDashboard({ clientId }: ProviderDashboardProps) {
  const data = useMockData();
  const runtime = useRuntimeData();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );

  if (data === null) {
    return (
      <DashboardFrame>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-zinc-500">Loading dashboard…</p>
        </div>
      </DashboardFrame>
    );
  }

  const client = data.clients.find((candidate) => candidate.id === clientId);

  if (client === undefined) {
    return (
      <DashboardFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-zinc-500">
            Provider dashboard not found — this client may have been removed.
          </p>
          <Link
            href="/clients"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back to clients
          </Link>
        </div>
      </DashboardFrame>
    );
  }

  // Roll up the runtime population for this client (DOM00013 `Client ||--o{
  // Patient`): per-patient response summaries + the by-category aggregate. A
  // client with no seeded patients is an empty population, not an error — the
  // shell still renders, branded, with an empty-state notice.
  const population = aggregateClientPopulation(runtime, client.id);
  const hasPopulation = population.patients.length > 0;

  // The drill-down opens from the patient list's selection hook. Resolve the
  // selected patient's full detail (responses + alerts) for the longitudinal
  // graph; a selection that no longer resolves falls back to the list.
  const selectedDetail =
    selectedPatientId === null
      ? undefined
      : buildPatientDetail(runtime, client.id, selectedPatientId);

  return (
    <DashboardFrame>
      <BrandedHeader client={client} />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Patient monitoring
          </h1>
          <p className="text-sm text-zinc-500">
            How {client.name}&rsquo;s care team reviews their monitored patient
            population.
          </p>
        </div>

        {selectedDetail !== undefined ? (
          <PatientDrilldown
            detail={selectedDetail}
            onBack={() => setSelectedPatientId(null)}
          />
        ) : hasPopulation ? (
          <>
            <PopulationSummary summary={population.summary} />
            <PatientList
              patients={population.patients}
              onSelectPatient={setSelectedPatientId}
            />
          </>
        ) : (
          <section className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
            <h2 className="text-sm font-semibold text-zinc-900">
              No monitored patients yet
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {client.name} has no patient monitoring data to display. Patient
              responses appear here once check-ins are completed.
            </p>
          </section>
        )}
      </div>
    </DashboardFrame>
  );
}
