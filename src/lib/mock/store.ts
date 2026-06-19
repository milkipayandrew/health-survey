import type {
  Block,
  BlockGroup,
  Client,
  ClientStatus,
  LibraryBlock,
  Medication,
  MockData,
  NewClientInput,
  NewLibraryBlockInput,
  NewSurveyInput,
  Question,
  Schedule,
  Survey,
  SurveyStatus,
} from '@/types/domain';

import { DEFAULT_SURVEY_SCHEDULE } from '@/lib/scheduling';

import { createSeedData, SEED_MEDICATIONS } from './fixtures';

/**
 * localStorage-backed mock store for the Admin demo.
 *
 * @remarks
 * Simulates a backend with no real persistence. The seeded fixtures are the
 * source of truth on first load; edits made during a demo session are written
 * to `localStorage` so they survive a refresh, and `resetMockData` restores the
 * seeded state. All functions are SSR-safe: when `localStorage` is unavailable
 * (server render) they fall back to a fresh copy of the seed data without
 * touching storage.
 */

/** Storage key under which the mock dataset is persisted. */
export const MOCK_DATA_STORAGE_KEY = 'health-survey-demo:mock-data:v1';

/** True when a browser `localStorage` is available to read/write. */
function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Loads the mock dataset.
 *
 * @returns Persisted demo state if present and valid, otherwise a fresh copy of
 * the seeded fixtures. On a server render (no `localStorage`) always returns
 * seed data.
 */
export function loadMockData(): MockData {
  if (!isStorageAvailable()) {
    return createSeedData();
  }

  const raw = window.localStorage.getItem(MOCK_DATA_STORAGE_KEY);
  if (raw === null) {
    return createSeedData();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isMockData(parsed)) {
      // Migrate any legacy flat-block surveys saved before the Block Group layer
      // existed, so older persisted demo sessions still load and preview, and
      // backfill the medication presets for payloads saved before that layer.
      const medications = asArray<Medication>(
        (parsed as { medications?: unknown }).medications,
      );
      return {
        ...parsed,
        surveys: parsed.surveys.map(migrateSurvey),
        medications: medications.length > 0 ? medications : SEED_MEDICATIONS,
      };
    }
  } catch {
    // Corrupt payload — fall through to seed data below.
  }

  return createSeedData();
}

/**
 * The untrusted persisted survey shape: a survey that may predate the Block
 * Group layer (carrying a flat `blocks` array) and whose nested array fields may
 * be missing or wrong-typed in an old/corrupt payload. `migrateSurvey` narrows
 * this into a well-formed {@link Survey}.
 */
type PersistedSurvey = Partial<Survey> & { blocks?: unknown };

/** Coerces an unknown value to an array, defaulting to `[]` when it is not one. */
function asArray<TItem>(value: unknown): TItem[] {
  return Array.isArray(value) ? (value as TItem[]) : [];
}

/** Defensively coerces a persisted block's nested `questions`/`choices` to arrays. */
function migrateBlock(block: Partial<Block>): Block {
  return {
    ...(block as Block),
    questions: asArray<Partial<Question>>(block.questions).map((question) => ({
      ...(question as Question),
      choices: asArray(question.choices),
    })),
  };
}

/**
 * Defensively coerces a persisted group's nested `blocks` to migrated blocks and
 * backfills a group schedule's {@link Schedule.scope} (added with the cadence
 * layering) to `'block-group-override'` when an older payload omits it.
 */
function migrateGroup(group: Partial<BlockGroup>): BlockGroup {
  const migrated: BlockGroup = {
    ...(group as BlockGroup),
    blocks: asArray<Partial<Block>>(group.blocks).map(migrateBlock),
  };
  if (migrated.schedule !== undefined) {
    migrated.schedule = {
      ...migrated.schedule,
      scope: 'block-group-override',
    };
  }
  return migrated;
}

/**
 * Upgrades a persisted survey to the grouped structure when it predates the
 * Block Group layer: a legacy survey carrying a flat `blocks` array is wrapped
 * in a single implicit default group, and a missing `defaultSchedule` is filled
 * with {@link DEFAULT_SURVEY_SCHEDULE}. Surveys already in the grouped shape are
 * still walked so any missing/non-array nested `blockGroups[].blocks` /
 * `blocks[].questions` / `questions[].choices` field degrades to `[]` rather than
 * letting downstream `.map`/`.some` throw a `TypeError` on old/corrupt payloads.
 *
 * @param survey - An untrusted persisted survey of either shape (the shallow
 * {@link isMockData} guard only verified the top-level arrays, so the per-survey
 * shape is narrowed here).
 * @returns The survey in the current grouped shape.
 */
function migrateSurvey(survey: PersistedSurvey): Survey {
  const defaultSchedule: Schedule = survey.defaultSchedule
    ? { ...survey.defaultSchedule, scope: 'survey-default' }
    : DEFAULT_SURVEY_SCHEDULE;

  if (Array.isArray(survey.blockGroups)) {
    return {
      ...(survey as Survey),
      defaultSchedule,
      blockGroups: survey.blockGroups.map(migrateGroup),
    };
  }

  const legacyBlocks = asArray<Partial<Block>>(survey.blocks).map(migrateBlock);
  const blockGroups: BlockGroup[] =
    legacyBlocks.length === 0
      ? []
      : [
          {
            id: `group-${crypto.randomUUID()}`,
            name: 'Main check-in',
            order: 0,
            blocks: legacyBlocks,
          },
        ];

  // Drop the obsolete flat `blocks` field from the migrated record.
  const migrated: Survey & { blocks?: unknown } = {
    ...(survey as Survey),
    defaultSchedule,
    blockGroups,
  };
  delete migrated.blocks;
  return migrated;
}

/**
 * Cached client-side snapshot. `useSyncExternalStore` compares snapshots by
 * identity, so this reference must stay stable between writes (a fresh clone on
 * every read would loop infinitely) and change on every mutation (so React
 * re-renders). It is lazily populated on the first client read.
 */
let snapshot: MockData | null = null;

/** Subscribers notified whenever the cached snapshot is replaced. */
const listeners = new Set<() => void>();

/**
 * Subscribes to mock-store mutations.
 *
 * @param listener - Called after each mutation that replaces the snapshot.
 * @returns An unsubscribe function.
 */
export function subscribeMockData(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notifies all current subscribers that the snapshot changed. */
function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Returns the stable current snapshot for `useSyncExternalStore`, initializing
 * it from storage on first client read.
 *
 * @returns The cached dataset reference (stable until the next mutation).
 */
export function getMockDataSnapshot(): MockData {
  snapshot ??= initMockData();
  return snapshot;
}

/**
 * Persists the full mock dataset, updates the cached snapshot, and notifies
 * subscribers so React re-renders.
 *
 * @param data - The dataset to persist. Persists to `localStorage` when
 * available; always updates the in-memory snapshot and notifies subscribers.
 */
export function saveMockData(data: MockData): void {
  snapshot = data;
  if (isStorageAvailable()) {
    window.localStorage.setItem(MOCK_DATA_STORAGE_KEY, JSON.stringify(data));
  }
  notify();
}

/**
 * Restores the seeded fixtures, discarding any demo-session edits.
 *
 * @returns A fresh copy of the seeded dataset (also persisted when storage is
 * available).
 */
export function resetMockData(): MockData {
  const seed = createSeedData();
  saveMockData(seed);
  return seed;
}

/**
 * Ensures the store is initialized: if nothing is persisted yet, seeds it.
 *
 * @returns The current dataset after initialization.
 */
export function initMockData(): MockData {
  if (isStorageAvailable() && window.localStorage.getItem(MOCK_DATA_STORAGE_KEY) === null) {
    return resetMockData();
  }
  return loadMockData();
}

/**
 * Onboards a new client: assigns a generated id and creation timestamp, appends
 * it to the dataset, persists, and notifies subscribers so the client list
 * re-renders with the new entry.
 *
 * @param input - The Admin-supplied client fields (name, branding, status).
 * @returns The created {@link Client}, including its generated id.
 */
export function addClient(input: NewClientInput): Client {
  const client: Client = {
    ...input,
    id: `client-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
  const data = loadMockData();
  saveMockData({ ...data, clients: [...data.clients, client] });
  return client;
}

/**
 * Merges changes over an existing client by id, persisting and notifying
 * subscribers. The canonical client-mutation path that the edit and
 * activate/deactivate helpers funnel through; `id` and `createdAt` are preserved
 * (they are excluded from the accepted change set).
 *
 * @param id - The id of the client to patch.
 * @param changes - The client fields (name, branding, status) to merge over the
 * existing record.
 * @returns The updated {@link Client}, or `null` if no client has that id.
 */
function patchClient(
  id: string,
  changes: Partial<NewClientInput>,
): Client | null {
  const data = loadMockData();
  const existing = data.clients.find((client) => client.id === id);
  if (existing === undefined) {
    return null;
  }
  const updated: Client = { ...existing, ...changes };
  saveMockData({
    ...data,
    clients: data.clients.map((client) => (client.id === id ? updated : client)),
  });
  return updated;
}

/**
 * Edits an existing client in place by id (name + branding + status), persisting
 * and notifying subscribers so the client list and any survey-preview branding
 * re-render. Mirrors {@link updateLibraryBlock}: finds by id, returns `null` when
 * absent, merges the changes, and preserves the client's `id` and `createdAt`.
 *
 * @param id - The id of the client to edit.
 * @param changes - The client fields to merge over the existing record.
 * @returns The updated {@link Client}, or `null` if no client has that id.
 */
export function updateClient(
  id: string,
  changes: Partial<NewClientInput>,
): Client | null {
  return patchClient(id, changes);
}

/**
 * Activates or deactivates a client by flipping its {@link ClientStatus}, then
 * persisting and notifying subscribers so the status badge reflects the change
 * immediately. Only the status changes — name, branding, and `createdAt` are
 * untouched. Returns `null` when no client has that id.
 *
 * @param id - The id of the client to transition.
 * @param status - The status to move the client to.
 * @returns The updated {@link Client}, or `null` if no client has that id.
 */
export function setClientStatus(
  id: string,
  status: ClientStatus,
): Client | null {
  return patchClient(id, { status });
}

/**
 * Saves a newly assembled survey as a Draft: assigns a generated id and
 * created/updated timestamps, forces {@link Survey.status} to `'draft'`, appends
 * it to the dataset, persists, and notifies subscribers so any survey list
 * re-renders with the new entry.
 *
 * @param input - The Admin-supplied survey fields (owning client, name, base
 * language, assembled blocks). Status is always Draft on creation.
 * @returns The created {@link Survey}, including its generated id.
 */
export function addSurvey(input: NewSurveyInput): Survey {
  const now = new Date().toISOString();
  const survey: Survey = {
    ...input,
    id: `survey-${crypto.randomUUID()}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  const data = loadMockData();
  saveMockData({ ...data, surveys: [...data.surveys, survey] });
  return survey;
}

/**
 * Merges changes over an existing survey by id, bumping {@link Survey.updatedAt},
 * persisting, and notifying subscribers. The single canonical survey-mutation
 * path that the content-edit and lifecycle-transition helpers all funnel through.
 *
 * @param id - The id of the survey to patch.
 * @param changes - The survey fields (incl. `status`) to merge over the record.
 * @returns The updated {@link Survey}, or `null` if no survey has that id.
 */
function patchSurvey(
  id: string,
  changes: Partial<Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>>,
): Survey | null {
  const data = loadMockData();
  const existing = data.surveys.find((survey) => survey.id === id);
  if (existing === undefined) {
    return null;
  }
  const updated: Survey = {
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  saveMockData({
    ...data,
    surveys: data.surveys.map((survey) =>
      survey.id === id ? updated : survey,
    ),
  });
  return updated;
}

/**
 * Edits an existing survey's content (name, blocks, base language, owning
 * client) in place by id, bumping {@link Survey.updatedAt}. Used when an Admin
 * re-opens a Draft in the builder; does not change lifecycle status.
 *
 * @param id - The id of the survey to edit.
 * @param changes - The survey content fields to merge over the existing record.
 * @returns The updated {@link Survey}, or `null` if no survey has that id.
 */
export function updateSurvey(
  id: string,
  changes: Partial<NewSurveyInput>,
): Survey | null {
  return patchSurvey(id, changes);
}

/**
 * Transitions a survey to a new lifecycle {@link SurveyStatus}, following the
 * Survey Lifecycle (Draft → Published, Published → Archived, etc.). The status
 * change is persisted and reflected immediately via the survey's status badge.
 *
 * @param id - The id of the survey to transition.
 * @param status - The lifecycle status to move the survey to.
 * @returns The updated {@link Survey}, or `null` if no survey has that id.
 */
export function setSurveyStatus(
  id: string,
  status: SurveyStatus,
): Survey | null {
  return patchSurvey(id, { status });
}

/**
 * Re-opens an archived survey by transitioning it back to `'draft'`, giving the
 * lifecycle a return path (archived → draft) so the survey becomes editable
 * again and re-appears in draft listings. Funnels through {@link setSurveyStatus}
 * (and thus {@link patchSurvey}) so no transition logic is duplicated. The
 * transition is only valid from `'archived'`: any other status — or a missing id
 * — yields `null` (an expected error returned as a value, not thrown).
 *
 * @param id - The id of the survey to re-open.
 * @returns The re-opened Draft {@link Survey}, or `null` when the survey is
 * missing or is not currently `'archived'`.
 */
export function reopenSurvey(id: string): Survey | null {
  const data = loadMockData();
  const existing = data.surveys.find((survey) => survey.id === id);
  if (existing === undefined || existing.status !== 'archived') {
    return null;
  }
  return setSurveyStatus(id, 'draft');
}

/**
 * Adds a survey by copying an existing one: deep-clones its content, mints fresh
 * ids for the survey (and its blocks/questions/choices) so the copy owns its
 * content independently, resets lifecycle status to `'draft'`, and persists it
 * as a new entry. Stands in for the "copy an existing survey" assembly path.
 *
 * @param id - The id of the survey to duplicate.
 * @returns The created Draft copy, or `null` if no survey has that id.
 */
export function copySurvey(id: string): Survey | null {
  const data = loadMockData();
  const source = data.surveys.find((survey) => survey.id === id);
  if (source === undefined) {
    return null;
  }
  const now = new Date().toISOString();
  // Clone the whole tree once; the nested maps then only spread + re-mint ids
  // (the cloned subtrees are already independent copies — no re-cloning needed).
  const cloned = structuredClone(source);
  const copy: Survey = {
    ...cloned,
    id: `survey-${crypto.randomUUID()}`,
    name: `${source.name} (copy)`,
    status: 'draft',
    blockGroups: cloned.blockGroups.map((group) => ({
      ...group,
      id: `group-${crypto.randomUUID()}`,
      blocks: group.blocks.map((block) => ({
        ...block,
        id: `block-${crypto.randomUUID()}`,
        questions: block.questions.map((question) => ({
          ...question,
          id: `q-${crypto.randomUUID()}`,
          choices: question.choices.map((choice) => ({
            ...choice,
            id: `c-${crypto.randomUUID()}`,
          })),
        })),
      })),
    })),
    createdAt: now,
    updatedAt: now,
  };
  saveMockData({ ...data, surveys: [...data.surveys, copy] });
  return copy;
}

/**
 * Sets (or clears) a survey's **default schedule** by id, funnelling through
 * {@link patchSurvey} so the update is persisted and `updatedAt` bumped. Returns
 * `null` when no survey has that id (an expected error returned as a value, not
 * thrown).
 *
 * @param id - The id of the survey whose default schedule to set.
 * @param schedule - The new default schedule.
 * @returns The updated {@link Survey}, or `null` if no survey has that id.
 */
export function updateSurveySchedule(
  id: string,
  schedule: Schedule,
): Survey | null {
  return patchSurvey(id, { defaultSchedule: schedule });
}

/**
 * Sets or clears a block group's schedule **override** within a survey. Passing
 * a {@link Schedule} attaches the override; passing `null` removes it so the
 * group falls back to the survey default. Returns `null` (an expected error as a
 * value) when the survey id is missing or no group within it matches `groupId`.
 *
 * @param surveyId - The id of the owning survey.
 * @param groupId - The id of the block group to set the override on.
 * @param schedule - The override schedule, or `null` to clear it.
 * @returns The updated {@link Survey}, or `null` when the survey/group is missing.
 */
export function updateBlockGroupSchedule(
  surveyId: string,
  groupId: string,
  schedule: Schedule | null,
): Survey | null {
  const data = loadMockData();
  const survey = data.surveys.find((item) => item.id === surveyId);
  if (survey === undefined) {
    return null;
  }
  if (!survey.blockGroups.some((group) => group.id === groupId)) {
    return null;
  }
  const nextGroups = survey.blockGroups.map((group) => {
    if (group.id !== groupId) {
      return group;
    }
    if (schedule === null) {
      const next: BlockGroup = { ...group };
      delete next.schedule;
      return next;
    }
    return { ...group, schedule };
  });
  return patchSurvey(surveyId, { blockGroups: nextGroups });
}

/**
 * Adds a reusable Block to the library: assigns a generated id, appends it to
 * the dataset, persists, and notifies subscribers so the builder's library list
 * and the library manager re-render with the new block.
 *
 * @param input - The Admin-supplied library-block fields (name, description,
 * template questions). Status/identity are derived by the store.
 * @returns The created {@link LibraryBlock}, including its generated id.
 */
export function addLibraryBlock(input: NewLibraryBlockInput): LibraryBlock {
  const block: LibraryBlock = {
    ...input,
    id: `lib-block-${crypto.randomUUID()}`,
  };
  const data = loadMockData();
  saveMockData({ ...data, blockLibrary: [...data.blockLibrary, block] });
  return block;
}

/**
 * Edits an existing library Block in place by id (name, description, template
 * questions), persists, and notifies subscribers. Existing surveys are
 * unaffected — they own deep-copied content, so library edits only change what
 * future assemblies start from.
 *
 * @param id - The id of the library block to edit.
 * @param changes - The library-block fields to merge over the existing record.
 * @returns The updated {@link LibraryBlock}, or `null` if no block has that id.
 */
export function updateLibraryBlock(
  id: string,
  changes: Partial<NewLibraryBlockInput>,
): LibraryBlock | null {
  const data = loadMockData();
  const existing = data.blockLibrary.find((block) => block.id === id);
  if (existing === undefined) {
    return null;
  }
  const updated: LibraryBlock = { ...existing, ...changes };
  saveMockData({
    ...data,
    blockLibrary: data.blockLibrary.map((block) =>
      block.id === id ? updated : block,
    ),
  });
  return updated;
}

/**
 * Removes a Block from the library by id, persists, and notifies subscribers.
 * Surveys already assembled from it are unaffected (they own their own copy).
 *
 * @param id - The id of the library block to remove.
 * @returns `true` if a block was removed, `false` if no block had that id.
 */
export function removeLibraryBlock(id: string): boolean {
  const data = loadMockData();
  if (!data.blockLibrary.some((block) => block.id === id)) {
    return false;
  }
  saveMockData({
    ...data,
    blockLibrary: data.blockLibrary.filter((block) => block.id !== id),
  });
  return true;
}

/** Structural guard for a persisted {@link MockData} payload. */
function isMockData(value: unknown): value is MockData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.clients) &&
    Array.isArray(candidate.surveys) &&
    Array.isArray(candidate.blockLibrary)
  );
}
