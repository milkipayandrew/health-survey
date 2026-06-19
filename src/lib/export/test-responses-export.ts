import type { TestResponse } from '@/types/domain';

/**
 * Client-side export helpers for generated test responses.
 *
 * @remarks
 * This is the demo: test responses live only in memory, so export is performed
 * entirely in the browser via a `Blob` + object URL — there is no backend. The
 * exported rows mirror the {@link TestResponse} shape (respondent label,
 * per-question answers, summed score, and risk tier) so the data is not locked
 * into the in-memory store.
 */

/** The supported export file formats. */
export type ExportFormat = 'csv' | 'json';

/**
 * One flattened export row, derived from {@link TestResponse}. Each row is a
 * single respondent; the per-question answers are flattened into a compact,
 * human-readable string so the shape stays tabular for CSV without losing the
 * answer/score detail.
 */
type ExportRow = Pick<TestResponse, 'respondentLabel' | 'score' | 'risk'> & {
  /** Per-question answers rendered as `"<question>: <answer> (+<score>)"`. */
  answers: string;
};

/** The CSV column order, matching the {@link ExportRow} fields. */
const CSV_COLUMNS: readonly (keyof ExportRow)[] = [
  'respondentLabel',
  'answers',
  'score',
  'risk',
];

/** Flattens a {@link TestResponse} into a single tabular {@link ExportRow}. */
function toExportRow(response: TestResponse): ExportRow {
  return {
    respondentLabel: response.respondentLabel,
    answers: response.answers
      .map(
        (answer) =>
          `${answer.questionLabel}: ${answer.answerLabel} (+${answer.scoreContribution})`,
      )
      .join('; '),
    score: response.score,
    risk: response.risk,
  };
}

/** Escapes a single CSV cell per RFC 4180 (quote-wrap, double inner quotes). */
function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Serializes the export rows to a CSV document (header + one row each). */
function toCsv(rows: ExportRow[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(','),
  );
  return [header, ...lines].join('\n');
}

/** MIME type + file content for each supported export format. */
function serialize(
  responses: TestResponse[],
  format: ExportFormat,
): { mimeType: string; content: string } {
  const rows = responses.map(toExportRow);
  if (format === 'csv') {
    return { mimeType: 'text/csv;charset=utf-8', content: toCsv(rows) };
  }
  return {
    mimeType: 'application/json;charset=utf-8',
    content: JSON.stringify(rows, null, 2),
  };
}

/**
 * Downloads the given test responses as a file, entirely client-side.
 *
 * @remarks
 * Builds a `Blob`, hands it to the browser via a temporary object URL and a
 * synthetic anchor click, then revokes the object URL to avoid a memory leak.
 * No-ops when there are no responses, so the caller can safely disable the
 * control instead of throwing.
 *
 * @param responses - The generated test responses to export.
 * @param format - The output format (`'csv'` or `'json'`).
 * @param fileBaseName - Base name (without extension) for the downloaded file.
 */
export function downloadTestResponses(
  responses: TestResponse[],
  format: ExportFormat,
  fileBaseName: string,
): void {
  if (responses.length === 0) {
    // Nothing to export — no-op rather than producing an empty file or throwing.
    return;
  }

  const { mimeType, content } = serialize(responses, format);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileBaseName}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Release the object URL once the download has been initiated so the Blob
    // can be garbage-collected (avoids a memory leak per glPERF00004).
    URL.revokeObjectURL(url);
  }
}
