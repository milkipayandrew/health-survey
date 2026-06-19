/**
 * Stable demo URL derivation for survey QR previews.
 *
 * @remarks
 * This is preview, not real delivery — the URL is a stable, deterministic string
 * derived purely from the survey id so the QR is reproducible across renders and
 * never triggers a real check-in. No network calls are involved.
 */

/** Base origin for the demo check-in links encoded into preview QR codes. */
const DEMO_CHECK_IN_BASE = 'https://demo.effective-health.example/c';

/**
 * Builds the stable demo check-in URL for a survey, suitable for encoding into a
 * preview QR code.
 *
 * @param surveyId - The survey's stable id.
 * @returns A deterministic `https://…/c/<surveyId>` URL.
 */
export function surveyCheckInUrl(surveyId: string): string {
  return `${DEMO_CHECK_IN_BASE}/${encodeURIComponent(surveyId)}`;
}
