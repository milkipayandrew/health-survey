'use client';

import { useSyncExternalStore } from 'react';

import { getMockDataSnapshot, subscribeMockData } from '@/lib/mock/store';
import type { MockData } from '@/types/domain';

/** Server render has no browser store, so the snapshot is `null`. */
function getServerSnapshot(): null {
  return null;
}

/**
 * Loads the localStorage-backed mock dataset on the client and re-renders when
 * it mutates.
 *
 * @remarks
 * Uses {@link useSyncExternalStore} wired to the mock store's subscribe/snapshot
 * pair: the server snapshot returns `null` (avoiding a hydration mismatch) and
 * the client snapshot reads the cached store reference, which the store replaces
 * (and notifies subscribers about) on every mutation — so a newly added client
 * appears immediately. Consumers should render a loading state while the result
 * is `null`.
 *
 * @returns The current mock dataset, or `null` during server render.
 */
export function useMockData(): MockData | null {
  return useSyncExternalStore(
    subscribeMockData,
    getMockDataSnapshot,
    getServerSnapshot,
  );
}
