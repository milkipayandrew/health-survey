'use client';

import Link from 'next/link';
import { useState } from 'react';

import { SearchInput } from '@/components/search-input';
import { useMockData } from '@/hooks/use-mock-data';
import { primaryButtonClasses } from '@/lib/utils';

import { ClientCard } from './_components/client-card';

/**
 * Client list view. Reads clients from the mock store and renders each as a
 * card with its white-label branding (logo + brand swatches) and status badge —
 * the Admin's entry point for selecting and working within a client's context.
 */
export default function ClientsPage() {
  const data = useMockData();
  const [query, setQuery] = useState('');

  if (data === null) {
    return <p className="text-sm text-zinc-500">Loading clients…</p>;
  }

  const surveyCountByClient = new Map<string, number>();
  for (const survey of data.surveys) {
    surveyCountByClient.set(
      survey.clientId,
      (surveyCountByClient.get(survey.clientId) ?? 0) + 1,
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleClients =
    normalizedQuery === ''
      ? data.clients
      : data.clients.filter((client) =>
          client.name.toLowerCase().includes(normalizedQuery),
        );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500">
            White-labeled organizations Effective serves. Select a client to
            work within its context.
          </p>
        </div>
        <Link
          href="/clients/new"
          className={primaryButtonClasses('shrink-0')}
        >
          Add client
        </Link>
      </div>

      <SearchInput
        id="client-search"
        label="Search clients"
        placeholder="Filter by client name…"
        value={query}
        onChange={setQuery}
      />

      {visibleClients.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No clients match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              surveyCount={surveyCountByClient.get(client.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
