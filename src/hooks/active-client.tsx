'use client';

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/**
 * Shared "active client" context for the admin area.
 *
 * @remarks
 * The active client is the single working context the whole `(admin)` surface
 * reads — selecting one filters the surveys list and defaults the "new survey"
 * builder to that client. It is the one canonical source of truth for "which
 * client am I working within"; pages compute their filtering from it in render
 * rather than mirroring it into their own state.
 *
 * Persistence mirrors the mock store's style (`src/lib/mock/store.ts`): a
 * `localStorage`-backed snapshot read through {@link useSyncExternalStore}, with
 * a stable cached reference and subscriber notification on every write. It is
 * SSR-safe — the server snapshot is `null`, so consumers render an unfiltered
 * ("all clients") view until the client mounts. No backend is involved.
 */

/** Storage key under which the active-client selection is persisted. */
export const ACTIVE_CLIENT_STORAGE_KEY = 'health-survey-demo:active-client:v1';

/** Sentinel value representing "all clients" (no active client selected). */
export const ALL_CLIENTS = 'all';

/** True when a browser `localStorage` is available to read/write. */
function isStorageAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  );
}

/**
 * Cached active-client snapshot. `useSyncExternalStore` compares by identity, so
 * this primitive value is stable between writes and changes on every write,
 * which is exactly what a string snapshot gives us.
 */
let activeClientId: string | null = null;

/** Whether {@link activeClientId} has been hydrated from storage yet. */
let hydrated = false;

/** Subscribers notified whenever the active client changes. */
const listeners = new Set<() => void>();

/** Subscribes to active-client changes; returns an unsubscribe function. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns the current active client id for {@link useSyncExternalStore},
 * hydrating from storage on first client read. `null` means no client is active
 * (the "all clients" / unfiltered state).
 */
function getSnapshot(): string | null {
  if (!hydrated) {
    hydrated = true;
    if (isStorageAvailable()) {
      activeClientId =
        window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY) ?? null;
    }
  }
  return activeClientId;
}

/** Server render has no browser store, so nothing is active. */
function getServerSnapshot(): null {
  return null;
}

/**
 * Sets (or clears) the active client, persisting to `localStorage` and notifying
 * subscribers so the whole admin area re-renders against the new context.
 *
 * @param id - The client id to make active, or `null` to clear back to "all
 * clients".
 */
function setActiveClientId(id: string | null): void {
  activeClientId = id;
  hydrated = true;
  if (isStorageAvailable()) {
    if (id === null) {
      window.localStorage.removeItem(ACTIVE_CLIENT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_CLIENT_STORAGE_KEY, id);
    }
  }
  for (const listener of listeners) {
    listener();
  }
}

/** The value exposed through {@link ActiveClientContext}. */
interface ActiveClientContextValue {
  /** The active client id, or `null` for the "all clients" / unfiltered state. */
  activeClientId: string | null;
  /** Sets the active client, or clears it with `null`. */
  setActiveClientId: (id: string | null) => void;
}

const ActiveClientContext = createContext<ActiveClientContextValue | null>(null);

/**
 * Provider for the shared active-client context. Mounted once at the top of the
 * `(admin)` layout so every admin page reads the same selection. Subscribes to
 * the `localStorage`-backed external store via {@link useSyncExternalStore}, so
 * the selection survives a refresh and stays in sync across pages without any
 * derived-state effects.
 */
export function ActiveClientProvider({ children }: { children: ReactNode }) {
  const id = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <ActiveClientContext.Provider
      value={{ activeClientId: id, setActiveClientId }}
    >
      {children}
    </ActiveClientContext.Provider>
  );
}

/**
 * Reads the shared active-client context.
 *
 * @returns The active client id (`null` when none is selected) and a setter.
 * @throws If used outside an {@link ActiveClientProvider}.
 */
export function useActiveClient(): ActiveClientContextValue {
  const context = useContext(ActiveClientContext);
  if (context === null) {
    throw new Error(
      'useActiveClient must be used within an ActiveClientProvider',
    );
  }
  return context;
}
