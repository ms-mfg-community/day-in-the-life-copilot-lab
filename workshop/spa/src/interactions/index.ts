// The interactions of the inventory (workshop/spa/content/interactions.json, specs/005-teaching-spa.md 2.4), built into the
// segment the shell has just rendered. The inventory says which segment each interaction belongs to and what it is called;
// the pattern modules here derive everything else from the slide itself, so the slide stays the one source of the text.

import inventory from '../../content/interactions.json';
import type { Announcer } from '../shell/live-region';
import type { ShellStore } from '../shell/state';
import { mountAccordion } from './accordion';
import { mountCarousel } from './carousel';
import { mountDialog } from './dialog';
import { mountDisclosurePopover } from './disclosure-popover';
import { NOTHING } from './dom';
import { mountNodeDiagram } from './node-diagram';
import { mountParameterChart } from './parameter-chart';
import { mountSegmentTimer } from './segment-timer';
import { mountStagedReveal } from './staged-reveal';
import { mountTabs } from './tabs';
import type { Mounted, Mounter, SegmentInfo } from './types';

export type { Mounted, SegmentInfo };

/** The patterns that are built. An inventory entry of a pattern that is not in this table has nothing to mount, and is left out. */
const MOUNTERS: Readonly<Record<string, Mounter>> = {
  tabs: mountTabs,
  accordion: mountAccordion,
  dialog: mountDialog,
  'staged-reveal': mountStagedReveal,
  'disclosure-popover': mountDisclosurePopover,
  'parameter-chart': mountParameterChart,
  'node-diagram': mountNodeDiagram,
  carousel: mountCarousel,
  'segment-timer': mountSegmentTimer,
};

export interface MountRequest {
  readonly segment: SegmentInfo;
  /** The element holding the slide the shell has just rendered. */
  readonly root: HTMLElement;
  readonly document: Document;
  readonly store: ShellStore;
  readonly announce: Announcer;
}

/**
 * Mounts every interaction the inventory declares for `segment`. A pattern whose slide lacks the structure it derives from
 * is reported and left out, so the slide stays readable and the other interactions still work. The result undoes
 * whatever the interactions put outside the segment's own DOM; call it before the segment is replaced. `dismiss` puts away,
 * the way Escape does, what Escape would put away in them (see `Mounted`).
 */
export function mountInteractions(request: MountRequest): Mounted {
  const { segment, root, document: doc, store, announce } = request;
  // The shell's own tests run it in a stripped-down DOM that cannot host a widget. There is nothing to mount in that.
  if (typeof root.querySelectorAll !== 'function' || typeof doc.addEventListener !== 'function') return NOTHING;

  const mounted: Mounted[] = [];
  for (const entry of inventory.interactions) {
    if (entry.segment !== segment.id || !Object.hasOwn(MOUNTERS, entry.pattern)) continue;
    try {
      mounted.push(MOUNTERS[entry.pattern]({ entry, segment, root, document: doc, store, announce }));
    } catch (error) {
      console.error(`interaction ${entry.id} (${entry.pattern}) was not mounted`, error);
    }
  }
  return {
    dismiss(): void {
      for (const interaction of mounted) interaction.dismiss?.();
    },
    dispose(): void {
      for (const interaction of mounted.splice(0).reverse()) interaction.dispose();
    },
  };
}
