import { QRCodeSVG } from 'qrcode.react';

import { surveyCheckInUrl } from '@/lib/qr/survey-url';

interface SurveyQrPreviewProps {
  /** The id of the survey the QR should link to. */
  surveyId: string;
}

/**
 * A preview QR code for in-office printing, encoding a stable demo check-in URL
 * derived from the survey id.
 *
 * @remarks
 * This is an admin **preview** artifact, not real delivery: scanning it does not
 * create a check-in. The encoded URL is derived from the survey id during render
 * (no effect mirroring), so the QR always reflects the selected survey. The QR is
 * rendered as inline SVG entirely client-side — `qrcode.react` makes no network
 * calls at render time.
 */
export function SurveyQrPreview({ surveyId }: SurveyQrPreviewProps) {
  // Derive the payload URL in render from the survey id (glPERF00009: no effect).
  const url = surveyCheckInUrl(surveyId);

  return (
    <section
      className="flex flex-col items-center gap-2 rounded-xl border border-zinc-300 p-4"
      aria-label="In-office QR preview"
    >
      <h2 className="self-start text-sm font-semibold text-zinc-700">
        In-office QR
      </h2>
      <div className="rounded-md bg-white p-3">
        <QRCodeSVG
          value={url}
          size={144}
          marginSize={2}
          level="M"
          title={`QR code linking to ${url}`}
        />
      </div>
      <p className="break-all text-center text-xs text-zinc-500">{url}</p>
      <p className="text-center text-[11px] text-zinc-400">
        Preview only — printing this does not create a real check-in.
      </p>
    </section>
  );
}
