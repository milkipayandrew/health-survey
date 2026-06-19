import type { Metadata, Viewport } from 'next';

import { SEED_SURVEYS } from '@/lib/mock/fixtures';

import { PatientSurveyPreview } from './_components/patient-survey-preview';

/**
 * Pre-renders a static HTML shell per seeded survey for the static export
 * (GitHub Pages). Surveys created during a demo session live only in the
 * browser's `localStorage`, so their preview is reached via in-app client
 * navigation rather than a pre-built page. `dynamicParams = false` keeps the
 * export to exactly these known ids.
 */
export function generateStaticParams(): { id: string }[] {
  return SEED_SURVEYS.map((survey) => ({ id: survey.id }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: 'Survey preview',
  description: 'Patient-facing preview of a medication check-in survey',
};

/** Render the preview at true device width so it looks native on a phone. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Patient-facing survey preview page. Lives OUTSIDE the `(admin)` route group, so
 * it inherits only the chrome-free root layout — no admin nav/sidebar — giving a
 * clean surface that reads as the real patient experience. The survey itself
 * lives in the client-side mock store, so this server component only resolves the
 * route `id` (a Promise in Next.js 16) and hands it to the client
 * {@link PatientSurveyPreview}, which looks the survey up and runs the walkthrough.
 */
export default async function SurveyPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientSurveyPreview surveyId={id} />;
}
