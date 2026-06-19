import { Suspense } from 'react';

import { SurveysList } from './_components/surveys-list';

/**
 * Surveys page. Wraps {@link SurveysList} in a Suspense boundary because it
 * reads the URL search params (`useSearchParams`) to honour the legacy
 * `?client=` link, which Next.js requires to be suspended during prerender.
 */
export default function SurveysPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-zinc-500">Loading surveys…</p>}
    >
      <SurveysList />
    </Suspense>
  );
}
