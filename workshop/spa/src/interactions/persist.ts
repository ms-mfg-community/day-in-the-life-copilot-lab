// Interaction state that outlives navigation (specs/005-teaching-spa.md 2.3): the shell store keeps it, per segment, under
// the interaction's id. What is read back is not trusted: the store may hold a value from an earlier shape of the page.

import type { ShellStore } from '../shell/state';

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
