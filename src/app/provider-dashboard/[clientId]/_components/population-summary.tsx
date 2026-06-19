import type {
  CategoryBreakdownItem,
  PopulationSummary as PopulationSummaryData,
} from '@/lib/dashboard-aggregation';

interface CategoryBreakdownProps {
  /** Heading for this category axis (e.g. "By risk", "By age"). */
  title: string;
  /** The buckets to render, each a label + patient count. */
  items: CategoryBreakdownItem[];
}

/**
 * One category axis of the population breakdown: a labelled list of buckets, each
 * showing how many patients fall in that category. Read-only.
 */
function CategoryBreakdown({ title, items }: CategoryBreakdownProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400">No data</p>
      ) : (
        <dl className="flex flex-col gap-1">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="text-sm capitalize text-zinc-700">{item.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-zinc-900">
                {item.count}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

interface PopulationSummaryProps {
  /** The aggregated by-category summary for the client's population. */
  summary: PopulationSummaryData;
}

/**
 * The aggregated patient-population summary (REQ00004, DOM00009): headline
 * totals plus the population rolled up **by category** — adherence risk band,
 * age band, and gender — over the client's patients. Read-only.
 */
export function PopulationSummary({ summary }: PopulationSummaryProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-900">Population summary</h2>

      <div className="mt-4 flex flex-wrap gap-6">
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tabular-nums text-zinc-900">
            {summary.totalPatients}
          </span>
          <span className="text-xs text-zinc-500">Monitored patients</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tabular-nums text-red-600">
            {summary.patientsNeedingFollowUp}
          </span>
          <span className="text-xs text-zinc-500">Need follow-up</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <CategoryBreakdown title="By adherence risk" items={summary.byRiskBand} />
        <CategoryBreakdown title="By age band" items={summary.byAgeBand} />
        <CategoryBreakdown title="By gender" items={summary.byGender} />
      </div>
    </section>
  );
}
