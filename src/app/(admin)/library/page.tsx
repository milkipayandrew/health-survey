import Link from 'next/link';

import { LibraryManager } from './_components/library-manager';

/**
 * Block library management page. Lets an Admin curate the reusable Blocks (and
 * their typed, scoreable Questions) that the survey builder assembles surveys
 * from — add, edit, and remove library blocks. Edits only affect future
 * assemblies; surveys already built own their own deep-copied content.
 */
export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/surveys"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to surveys
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Block library
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage the reusable blocks and questions the survey builder assembles
          from. Adding or editing a block changes what future surveys start
          from; surveys already built keep their own copy.
        </p>
      </div>

      <LibraryManager />
    </div>
  );
}
