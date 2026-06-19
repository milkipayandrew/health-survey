'use client';

import { ALL_CLIENTS, useActiveClient } from '@/hooks/active-client';
import { useMockData } from '@/hooks/use-mock-data';

/**
 * Surveys client selector. Sets the shared active-client context the surveys
 * surface works within — the single source of truth that the surveys list
 * filters by and the survey builder defaults to. Choosing "All clients" clears
 * the context back to the unfiltered state.
 *
 * Lives in the surveys list (not the global admin shell): the client context is
 * only meaningful while working with surveys, so the control is scoped to that
 * surface rather than shown on every admin page. The value is read straight from
 * the context (no local mirror), so the dropdown always reflects the canonical
 * selection. Styled to match {@link SearchInput} so it sits in the same filter
 * row.
 */
export function ClientSelector() {
  const data = useMockData();
  const { activeClientId, setActiveClientId } = useActiveClient();

  // Until the client store hydrates there are no clients to choose from; render
  // a stable disabled control so the filter row layout doesn't shift.
  const clients = data?.clients ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="active-client" className="text-sm font-medium">
        Client
      </label>
      <select
        id="active-client"
        value={activeClientId ?? ALL_CLIENTS}
        disabled={data === null}
        onChange={(event) => {
          const next = event.target.value;
          setActiveClientId(next === ALL_CLIENTS ? null : next);
        }}
        className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none disabled:opacity-50"
      >
        <option value={ALL_CLIENTS}>All clients</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </div>
  );
}
