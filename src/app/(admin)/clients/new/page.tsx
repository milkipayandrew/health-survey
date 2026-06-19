import Link from 'next/link';

import { ClientForm } from './_components/client-form';

/**
 * Add-client page. Frames the onboarding form an Admin uses to white-label a new
 * client (name, logo, brand colors, status).
 */
export default function NewClientPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/clients"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Add client
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          White-label a new organization. It appears in the client list on save.
        </p>
      </div>

      <ClientForm />
    </div>
  );
}
