import Link from 'next/link';

import { SEED_SURVEYS } from '@/lib/mock/fixtures';

import { SurveyBuilder } from '../../new/_components/survey-builder';

/**
 * Pre-renders a static HTML shell per seeded survey for the static export
 * (GitHub Pages). Drafts created during a demo session live only in the
 * browser's `localStorage` and are reached via in-app client navigation;
 * `dynamicParams = false` keeps the export to exactly these known ids.
 */
export function generateStaticParams(): { id: string }[] {
  return SEED_SURVEYS.map((survey) => ({ id: survey.id }));
}

export const dynamicParams = false;

/**
 * Edit-draft page. Re-opens an existing Draft survey in the builder (resolving
 * the route `id`, a Promise in Next.js 16) so an Admin can revise its name,
 * owning client, and assembled blocks/questions before it is published.
 */
export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
