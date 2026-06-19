'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { SearchInput } from '@/components/search-input';
import { StatusBadge } from '@/components/status-badge';
import { useActiveClient } from '@/hooks/active-client';
import { useMockData } from '@/hooks/use-mock-data';
import { flattenBlocks } from '@/lib/scheduling';
import { primaryButtonClasses } from '@/lib/utils';

import { ClientSelector } from './client-selector';

/**
 * Survey list view. Reads surveys from the mock store and renders each with its
 * owning client and draft-vs-live status badge — the surface where a newly
 * assembled Draft survey appears after the builder saves it.
 *
 * The list is scoped by the shared active-client context (the one canonical
 * "which client am I working within" source): when a client is active only its
 * surveys show, and "All clients" shows everything. A name search composes on
 * top of that filter. The legacy `?client=` link (used by the client cards) is
 * honoured as a one-time entry seed: on first mount it adopts the param as the
 * active context and then strips it from the URL, so the context stays the single
 * ongoing source of truth and the URL can never linger as a competing one.
 */
export function SurveysList(): React.JSX.Element {
  const data = useMockData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeClientId, setActiveClientId } = useActiveClient();
  const [query, setQuery] = useState('');

  // One-time entry seed (URL → shared context), not derived state: a direct
  // `/surveys?client=<id>` deep link adopts that client as the active context on
  // first mount only, then `router.replace` strips the param so the URL is a
  // pure navigation intent and the context remains the single source of truth.
  // The ref gates this to the first mount so it can never re-fire and fight a
  // later header-driven context change.
  const seededRef = useRef(false);
  const clientParam = searchParams.get('client');
  useEffect(() => {
    if (seededRef.current) {
      return;
    }
    seededRef.current = true;
    if (clientParam !== null) {
      if (clientParam !== activeClientId) {
        setActiveClientId(clientParam);
      }
      router.replace('/surveys');
    }
    // Seed once on mount; the context itself must not re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data === null) {
    return <p className="text-sm text-zinc-500">Loading surveys…</p>;
  }

  const clientNameById = new Map(
    data.clients.map((client) => [client.id, client.name]),
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSurveys = data.surveys.filter((survey) => {
    const matchesClient =
      activeClientId === null || survey.clientId === activeClientId;
    const matchesQuery =
      normalizedQuery === '' ||
      survey.name.toLowerCase().includes(normalizedQuery);
    return matchesClient && matchesQuery;
  });

  const activeClientName =
    activeClientId === null ? null : clientNameById.get(activeClientId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Surveys</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {activeClientName === null
              ? 'Check-in definitions across all clients, with their draft-vs-live lifecycle status.'
              : `Check-in definitions for ${activeClientName}. Switch client below.`}
          </p>
        </div>
        <Link href="/surveys/new" className={primaryButtonClasses('shrink-0')}>
          Build survey
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <ClientSelector />
        <SearchInput
          id="survey-search"
          label="Search surveys"
          placeholder="Filter by survey name…"
          value={query}
          onChange={setQuery}
        />
      </div>

      {visibleSurveys.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {normalizedQuery === ''
            ? 'No surveys for this client yet.'
            : 'No surveys match your search.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleSurveys.map((survey) => {
            const blockCount = flattenBlocks(survey).length;
            return (
            <li key={survey.id}>
              <Link
                href={`/surveys/${survey.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                <div>
                  <h2 className="text-base font-semibold">{survey.name}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {clientNameById.get(survey.clientId) ?? 'Unknown client'} ·{' '}
                    {blockCount}{' '}
                    {blockCount === 1 ? 'block' : 'blocks'}
                  </p>
                </div>
                <StatusBadge status={survey.status} />
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
