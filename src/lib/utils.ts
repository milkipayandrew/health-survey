import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional Tailwind class names, resolving conflicts predictably.
 *
 * @param inputs - Class values (strings, arrays, conditional objects).
 * @returns A single merged, deduplicated class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Shared Tailwind classes for the dark primary action button/link. */
const PRIMARY_BUTTON_BASE =
  'rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700';

/**
 * Builds the primary-button class string, merging optional per-site overrides.
 *
 * @param extra - Additional classes (e.g. layout/sizing) for the call site.
 * @returns The merged primary-button class string.
 */
export function primaryButtonClasses(extra?: string): string {
  return cn(PRIMARY_BUTTON_BASE, extra);
}

/** Shared Tailwind classes for the light secondary/outline action button/link. */
const SECONDARY_BUTTON_BASE =
  'rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100';

/**
 * Builds the secondary/outline-button class string, merging optional overrides.
 *
 * @param extra - Additional classes (e.g. layout/sizing) for the call site.
 * @returns The merged secondary-button class string.
 */
export function secondaryButtonClasses(extra?: string): string {
  return cn(SECONDARY_BUTTON_BASE, extra);
}

/**
 * Generates a stable-enough unique id for a builder/library-created entity,
 * prefixed so the entity kind stays recognisable in the persisted mock data.
 *
 * @param prefix - Short kind prefix (e.g. `q`, `c`, `block`, `lib-block`).
 * @returns A prefixed UUID, e.g. `q-1f2e3d4c-…`.
 */
export function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
