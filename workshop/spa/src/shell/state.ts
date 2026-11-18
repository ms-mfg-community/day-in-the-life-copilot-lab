// Segment state that outlives navigation (spec 2.3). Later interaction issues read and advance it through `get` and
// `update`; the store never mutates a value it has handed out.

export interface SegmentState {
  /** Steps revealed so far in this segment. Issue 4/5 interactions advance it. */
  readonly revealedSteps: number;
  /** Interaction parameters keyed by interaction id. Values are replaced, never mutated. */
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface ShellState {
  readonly currentId: string;
  readonly segments: Readonly<Record<string, SegmentState>>;
}

export type Listener = (next: ShellState, previous: ShellState) => void;

/** A fresh state per segment: one shared object would let a change to one segment's parameters leak into every other. */
function emptySegment(): SegmentState {
  return { revealedSteps: 0, parameters: {} };
}

export function createState(segmentIds: readonly string[]) {
  let state: ShellState = {
    currentId: segmentIds[0],
    segments: Object.fromEntries(segmentIds.map((id) => [id, emptySegment()])),
  };
  const listeners = new Set<Listener>();

  function set(next: ShellState): void {
    const previous = state;
    state = next;
    listeners.forEach((listener) => listener(next, previous));
  }

  return {
    get: (): ShellState => state,
    /** Move to a segment. Unknown ids are ignored; every segment keeps its own state. */
    navigate(id: string): void {
      if (id === state.currentId || !Object.hasOwn(state.segments, id)) return;
      set({ ...state, currentId: id });
    },
    /** Replace one segment's state with the result of `change`. Handing back the current state is a no-op: no notification. */
    update(id: string, change: (current: SegmentState) => SegmentState): void {
      if (!Object.hasOwn(state.segments, id)) return;
      const current = state.segments[id];
      const updated = change(current);
      if (updated === current) return;
      set({ ...state, segments: { ...state.segments, [id]: updated } });
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type ShellStore = ReturnType<typeof createState>;
