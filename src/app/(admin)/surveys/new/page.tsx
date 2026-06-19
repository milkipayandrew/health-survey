import Link from 'next/link';

import { SurveyBuilder } from './_components/survey-builder';

/**
 * Survey builder page. Frames the assembly workflow an Admin uses to build a
 * Survey from the reusable block library and save it as a Draft.
 */
export default function NewSurveyPage() {
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
          Build survey
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Assemble a survey from the reusable block library or add custom blocks,
          author questions of each type with their choices and scoring, reorder
          them, then save it as a Draft.
        </p>
      </div>

      <SurveyBuilder />
    </div>
  );
}
