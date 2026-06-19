import { SEED_SURVEYS } from '@/lib/mock/fixtures';

import { SurveyDetail } from './_components/survey-detail';

/**
 * Pre-renders a static HTML shell per seeded survey for the static export
 * (GitHub Pages). Surveys created during a demo session live only in the
 * browser's `localStorage` and are reached via in-app client navigation;
 * `dynamicParams = false` keeps the export to exactly these known ids.
 */
export function generateStaticParams(): { id: string }[] {
  return SEED_SURVEYS.map((survey) => ({ id: survey.id }));
}

export const dynamicParams = false;

/**
 * Survey detail page. The survey itself lives in the client-side mock store, so
 * this server component only resolves the route `id` (a Promise in Next.js 16)
 * and hands it to the client {@link SurveyDetail}, which renders the respondent
 * preview (incl. a mobile preview) and the generate-test-responses action.
 */
export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SurveyDetail surveyId={id} />;
}
