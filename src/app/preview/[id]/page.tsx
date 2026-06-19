import type { Metadata, Viewport } from 'next';

import { PatientSurveyPreview } from './_components/patient-survey-preview';

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
