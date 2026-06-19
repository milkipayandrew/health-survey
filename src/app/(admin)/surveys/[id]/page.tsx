import { SurveyDetail } from './_components/survey-detail';

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
