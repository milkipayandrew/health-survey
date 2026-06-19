import { cn } from '@/lib/utils';
import type { ClientBranding } from '@/types/domain';

interface BrandSwatchesProps {
  /** The client's white-label branding (logo + brand colors). */
  branding: ClientBranding;
  /** Optional extra classes for the swatch row. */
  className?: string;
}

/**
 * Renders a client's brand colors as labelled color swatches, demonstrating the
 * white-labeling applied to everything patients see.
 */
export function BrandSwatches({ branding, className }: BrandSwatchesProps) {
  const swatches = [
    { label: 'Primary', color: branding.primaryColor },
    { label: 'Secondary', color: branding.secondaryColor },
  ];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {swatches.map((swatch) => (
        <div key={swatch.label} className="flex items-center gap-1.5">
          <span
            className="size-5 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: swatch.color }}
            aria-hidden="true"
          />
          <span className="font-mono text-xs uppercase text-zinc-500">
            {swatch.color}
          </span>
        </div>
      ))}
    </div>
  );
}
