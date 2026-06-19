import { cn } from '@/lib/utils';

/** Canonical base styling shared by every pill badge. */
const BADGE_BASE =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset';

/** Semantic color tones a badge can render in. */
export type BadgeTone = 'positive' | 'neutral' | 'caution' | 'critical';

/** Per-tone color + ring styling, merged onto {@link BADGE_BASE}. */
const TONE_STYLES: Record<BadgeTone, string> = {
  positive: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  neutral: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
  caution: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
};

interface BadgeProps {
  /** The semantic color tone to render the pill in. */
  tone: BadgeTone;
  /** The pill's label content. */
  children: React.ReactNode;
}

/**
 * A generic presentational pill badge. Owns the single canonical base pill
 * styling; callers pick a semantic {@link BadgeTone} for color.
 */
export function Badge({ tone, children }: BadgeProps) {
  return <span className={cn(BADGE_BASE, TONE_STYLES[tone])}>{children}</span>;
}
