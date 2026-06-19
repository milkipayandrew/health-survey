'use client';

import { useMockData } from '@/hooks/use-mock-data';

import { ClientForm } from '../../../new/_components/client-form';

interface EditClientFormProps {
  /** The id of the client to edit, resolved from the route. */
  clientId: string;
}

/**
 * Client-leaf wrapper for the edit route. Resolves the existing client from the
 * mock store and hands it to the reusable {@link ClientForm} pre-filled for
 * editing. Renders loading/not-found states while the store hydrates or when the
 * id has no matching client.
 */
export function EditClientForm({ clientId }: EditClientFormProps) {
  const data = useMockData();

  if (data === null) {
    return <p className="text-sm text-zinc-500">Loading client…</p>;
  }

  const client = data.clients.find((candidate) => candidate.id === clientId);

  if (client === undefined) {
    return (
      <p className="text-sm text-zinc-500">
        Client not found — it may have been removed.
      </p>
    );
  }

  // Key by client id so navigating between different clients remounts the form,
  // re-running its state initializers with the new client's content.
  return <ClientForm key={client.id} client={client} />;
}
