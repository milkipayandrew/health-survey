'use client';

import { useMemo } from 'react';

import { createRuntimeSeedData } from '@/lib/mock/dashboard-fixtures';
import type { RuntimeMockData } from '@/types/domain';

/**
 * Loads the demo-scoped runtime dataset the provider dashboard reads — the
 * runtime entities (Patient, Enrollment, Check-in, Response, Alert) that the
 * Admin platform does not model (REQ00006).
 *
 * @remarks
 * Unlike {@link useMockData}, this is **not** backed by the localStorage mock
 * store: the runtime entities are read-only seed data with no Admin authoring
 * surface, so the dashboard reads a fresh deep clone of the static seed
 * ({@link createRuntimeSeedData}). Memoised per mount so the same stable
 * reference is returned across re-renders. Scope the rows by `Patient.clientId`
 * (and `Enrollment.surveyId`) to read a single client's population; a client
 * with no seeded rows is an empty population, not an error.
 *
 * @returns The runtime seed dataset (a fresh, caller-owned copy).
 */
export function useRuntimeData(): RuntimeMockData {
  return useMemo(() => createRuntimeSeedData(), []);
}
