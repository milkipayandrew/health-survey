import type { ReactNode } from 'react';

import { ActiveClientProvider } from '@/hooks/active-client';

import { AdminNav } from './_components/admin-nav';

/**
 * Responsive admin shell. Provides the persistent navigation chrome (brand
 * header + primary nav) around the admin surfaces. The nav stacks below the
 * header on small screens and becomes a fixed sidebar from the medium
 * breakpoint up.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
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
