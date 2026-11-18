// Interaction state that outlives navigation (specs/005-teaching-spa.md 2.3): the shell store keeps it, per segment, under
// the interaction's id. What is read back is not trusted: the store may hold a value from an earlier shape of the page.

import type { ShellStore } from '../shell/state';

/** A plain object: what a stored value has to be before any of its fields is read. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The stored position, or the first when the store holds anything that is not the index of one of `count` things. */
export function storedIndex(value: unknown, count: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < count ? value : 0;
}

export function readParameter(store: ShellStore, segmentId: string, interactionId: string): unknown {
  return store.get().segments[segmentId]?.parameters[interactionId];
}

/** Stores `value` under the interaction's id. Writing what is already there is not a change, so nobody is notified. */
export function writeParameter(store: ShellStore, segmentId: string, interactionId: string, value: unknown): void {
  store.update(segmentId, (state) =>
    JSON.stringify(state.parameters[interactionId]) === JSON.stringify(value)
      ? state
      : { ...state, parameters: { ...state.parameters, [interactionId]: value } },
  );
}
