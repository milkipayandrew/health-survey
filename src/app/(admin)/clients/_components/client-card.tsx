import Link from 'next/link';

import { BrandSwatches } from '@/components/brand-swatches';
import { StatusBadge } from '@/components/status-badge';
import { secondaryButtonClasses } from '@/lib/utils';
import type { Client } from '@/types/domain';

import { ClientStatusToggle } from './client-status-toggle';
import { SelectClientLink } from './select-client-link';

interface ClientCardProps {
  /** The client to render. */
  client: Client;
  /** Number of surveys owned by this client, for client-context summary. */
  surveyCount: number;
}

/**
 * A client card showing the white-label branding (logo + brand swatches), the
 * organization name, its active/inactive status badge, and its survey count —
 * the per-client entry point into client context. Selecting the card switches
 * into that client's context (its filtered survey list).
 */
export function ClientCard({ client, surveyCount }: ClientCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5">
      <SelectClientLink
        clientId={client.id}
        className="flex flex-col gap-4 rounded-md transition-colors hover:opacity-80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/*
              White-label client logos come from arbitrary client-supplied URLs,
              so a plain <img> is used rather than next/image (which requires
              per-host remotePatterns config not appropriate for dynamic logos).
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={client.branding.logo}
              alt={`${client.name} logo`}
              width={120}
              height={40}
              className="h-10 w-auto rounded"
            />
          </div>
          <StatusBadge status={client.status} />
        </div>

        <div>
          <h2 className="text-base font-semibold">{client.name}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {surveyCount} {surveyCount === 1 ? 'survey' : 'surveys'}
          </p>
        </div>

        <BrandSwatches branding={client.branding} />
      </SelectClientLink>

      <div className="flex gap-2 border-t border-zinc-100 pt-3">
        <Link
          href={`/clients/${client.id}/edit`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Edit
        </Link>
        <Link
          href={`/provider-dashboard/${client.id}`}
          target="_blank"
          rel="noopener"
          className={secondaryButtonClasses('px-3 py-1.5 text-xs font-medium')}
        >
          View provider dashboard ↗
        </Link>
        <ClientStatusToggle clientId={client.id} status={client.status} />
      </div>
    </div>
  );
}
