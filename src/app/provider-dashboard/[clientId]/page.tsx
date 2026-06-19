import type { Metadata } from 'next';

import { SEED_CLIENTS } from '@/lib/mock/fixtures';

import { ProviderDashboard } from './_components/provider-dashboard';

/**
 * Pre-renders a static HTML shell per seeded client for the static export
 * (GitHub Pages). Clients created during a demo session live only in the
 * browser's `localStorage`, so their dashboard is reached via the client-side
 * SPA fallback (`not-found.tsx`) rather than a pre-built page.
 * `dynamicParams = false` keeps the export to exactly these known ids.
 */
export function generateStaticParams(): { clientId: string }[] {
  return SEED_CLIENTS.map((client) => ({ clientId: client.id }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: 'Provider dashboard',
  description: 'Provider-facing view of a client’s patient population',
};

/**
 * Provider-dashboard page. Lives OUTSIDE the `(admin)` route group (top-level,
 * standalone — mirroring the patient preview at `/preview/[id]`), so it inherits
 * only the chrome-free root layout with no admin nav/sidebar. This server
 * component resolves the route `clientId` (a Promise in Next.js 16) and hands it
 * to the client {@link ProviderDashboard}, which resolves the client from the
 * mock store, applies its white-label branding, and lays out the dashboard
 * shell.
 */
export default async function ProviderDashboardPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return <ProviderDashboard clientId={clientId} />;
}
