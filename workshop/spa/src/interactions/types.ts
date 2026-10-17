import type { Announcer } from '../shell/live-region';
import type { ShellStore } from '../shell/state';

/** One entry of workshop/spa/content/interactions.json, the inventory (specs/005-teaching-spa.md 2.4). */
export interface InventoryEntry {
  readonly id: string;
  readonly pattern: string;
  readonly segment: string;
  readonly label: string;
  readonly keys: readonly string[];
  readonly statusRegion: boolean;
}

/** What a pattern may read about the segment it sits in: the metadata the content pipeline derives from front matter. */
export interface SegmentInfo {
  readonly id: string;
  readonly title: string;
  readonly minutes: number;
  readonly labRefs: readonly string[];
}

/** A mounted interaction. `dispose` undoes whatever reaches outside the segment's own DOM: document listeners, timers, `inert`, store subscriptions. */
export interface Mounted {
  dispose(): void;
}

export interface PatternContext {
  readonly entry: InventoryEntry;
  readonly segment: SegmentInfo;
  /** The element holding the rendered slide. The pattern derives its content from it and builds its widget in it. */
  readonly root: HTMLElement;
  readonly document: Document;
  readonly store: ShellStore;
  readonly announce: Announcer;
}

/**
 * Builds one inventory entry into the segment DOM. Throws, before it has changed anything, when the slide does not
 * have the structure the pattern derives its content from.
 */
export type Mounter = (context: PatternContext) => Mounted;
