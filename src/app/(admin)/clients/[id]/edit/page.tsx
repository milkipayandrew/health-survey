import Link from 'next/link';

import { EditClientForm } from './_components/edit-client-form';

/**
 * Edit-client page. Re-opens an existing client in the reusable client form
 * (resolving the route `id`, a Promise in Next.js 16) so an Admin can revise its
 * name, branding, and status. Saving updates the client in place, preserving its
 * `id` and `createdAt`.
 */
export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
          Edit client
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Revise the organization&rsquo;s name, branding, and status. Changes are
          reflected in the client list and survey preview on save.
        </p>
      </div>

      <EditClientForm clientId={id} />
    </div>
  );
}
