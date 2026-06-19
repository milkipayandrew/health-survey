'use client';

import { useState } from 'react';

/**
 * A floating, dismissible banner shown across the entire demo to make clear
 * that this is a wireframe — a rough illustration of how things could work,
 * not a finished design or final UX/UI. It exists to communicate scope of work
 * between client and developer team for estimation. Tap/click to dismiss.
 */
export function WireframeNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setDismissed(true)}
      aria-label="Dismiss wireframe notice"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left shadow-lg transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      <span className="flex items-start gap-2">
        <span aria-hidden className="text-lg leading-none">
          ⚠️
        </span>
        <span className="text-sm text-amber-900">
          <span className="block font-semibold">
            Wireframe / demo — not final design
          </span>
          <span className="mt-1 block text-amber-800">
            This illustrates how things could work to estimate the project and
            communicate scope between client and developer team. It is by no
            means a final UX/UI.
          </span>
          <span className="mt-1 block text-xs font-medium text-amber-700">
            Tap to dismiss
          </span>
        </span>
      </span>
    </button>
  );
}
