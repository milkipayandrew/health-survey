'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

import { ActiveClientProvider } from '@/hooks/active-client';

import { AdminNav } from './(admin)/_components/admin-nav';
import { EditClientForm } from './(admin)/clients/[id]/edit/_components/edit-client-form';
import { SurveyBuilder } from './(admin)/surveys/new/_components/survey-builder';
import { SurveyDetail } from './(admin)/surveys/[id]/_components/survey-detail';
import { PatientSurveyPreview } from './preview/[id]/_components/patient-survey-preview';

/**
 * Client-side SPA fallback for the GitHub Pages static export.
 *
 * @remarks
 * Entities created or copied during a demo session live only in the browser's
 * `localStorage` and get random ids, so the static export has no pre-built page
 * for routes like `/surveys/<random-id>`. GitHub Pages serves this `404.html`
 * (built from this component) for any unmatched path, so here we re-dispatch on
 * the current URL and render the matching view client-side — making any
 * session-created survey/client viewable, editable, and previewable. Paths that
 * match nothing fall through to a genuine "not found" message.
 *
 * Mirrors {@link next.config.ts}'s `basePath`; keep the two in sync.
 */
const BASE_PATH = '/health-survey';

/** Admin chrome mirroring `(admin)/layout.tsx`, for fallback-rendered admin views. */
function AdminChrome({ children }: { children: ReactNode }) {
  return (
    <ActiveClientProvider>
      <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="flex size-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-bold text-white">
              E
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Effective Admin</span>
              <span className="text-xs text-zinc-500">
                Patient medication check-ins
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
          <aside className="md:w-48 md:shrink-0">
            <AdminNav />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </ActiveClientProvider>
  );
}

/** Edit-draft wrapper mirroring `(admin)/surveys/[id]/edit/page.tsx`. */
function EditSurveyView({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/surveys/${id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to survey
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit draft
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Revise the draft&rsquo;s blocks and questions, then save your changes.
        </p>
      </div>
      <SurveyBuilder editSurveyId={id} />
    </div>
  );
}

/** Edit-client wrapper mirroring `(admin)/clients/[id]/edit/page.tsx`. */
function EditClientView({ id }: { id: string }) {
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

/**
 * Resolves the current path (sans `basePath`) to a fallback view, or `null` when
 * nothing matches.
 */
function resolveView(pathname: string): ReactNode | null {
  const stripped = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length)
    : pathname;
  const seg = stripped.split('/').filter(Boolean);

  // /preview/<id> — patient-facing, chrome-free (matches its own route group).
  if (seg.length === 2 && seg[0] === 'preview') {
    return <PatientSurveyPreview surveyId={seg[1]} />;
  }
  // /surveys/<id>/edit
  if (seg.length === 3 && seg[0] === 'surveys' && seg[2] === 'edit') {
    return (
      <AdminChrome>
        <EditSurveyView id={seg[1]} />
      </AdminChrome>
    );
  }
  // /surveys/<id>
  if (seg.length === 2 && seg[0] === 'surveys') {
    return (
      <AdminChrome>
        <SurveyDetail surveyId={seg[1]} />
      </AdminChrome>
    );
  }
  // /clients/<id>/edit
  if (seg.length === 3 && seg[0] === 'clients' && seg[2] === 'edit') {
    return (
      <AdminChrome>
        <EditClientView id={seg[1]} />
      </AdminChrome>
    );
  }
  return null;
}

/** A genuine not-found message, shown when the path matches no known view. */
function RealNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">404</h1>
      <p className="text-sm text-zinc-500">This page could not be found.</p>
      <Link href="/dashboard" className="text-sm text-zinc-900 underline">
        Go to dashboard
      </Link>
    </div>
  );
}

/** Never-firing subscribe — the path only matters at first client render. */
const subscribe = (): (() => void) => () => {};

export default function NotFound() {
  // Read the URL via `useSyncExternalStore` so the static prerender (server
  // snapshot) yields `null` and never touches `window`, while the client
  // snapshot resolves the real pathname after hydration.
  const pathname = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => null,
  );

  if (pathname === null) {
    return null;
  }
  return resolveView(pathname) ?? <RealNotFound />;
}
