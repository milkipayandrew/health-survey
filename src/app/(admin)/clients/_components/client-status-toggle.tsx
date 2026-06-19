'use client';

import { setClientStatus } from '@/lib/mock/store';
import type { ClientStatus } from '@/types/domain';

interface ClientStatusToggleProps {
  /** The id of the client to toggle. */
  clientId: string;
  /** The client's current status, driving the toggle's label and next state. */
  status: ClientStatus;
}

/**
 * Client-leaf toggle that flips a client between active and inactive via
 * {@link setClientStatus}, persisting immediately. Only the status changes —
 * name, branding, and `createdAt` are untouched — and the store notifies
 * subscribers so the status badge updates in place.
 */
export function ClientStatusToggle({ clientId, status }: ClientStatusToggleProps) {
  const nextStatus: ClientStatus =
    status === 'active' ? 'inactive' : 'active';

  function handleToggle() {
    setClientStatus(clientId, nextStatus);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
    >
      {status === 'active' ? 'Deactivate' : 'Activate'}
    </button>
  );
}
