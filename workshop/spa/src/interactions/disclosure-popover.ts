// Disclosure popover (specs/005-teaching-spa.md 2.4, F92; WCAG 1.4.13 and AC13). A button reveals a popover with what the
// segment says about itself: how long it runs and which labs it belongs to, read from the metadata of the content
// pipeline. The popover shows on pointer hover, on keyboard focus and on activation. It is hoverable (the pointer can
// move from the button onto it), persistent (it stays while any of those holds) and dismissible (Escape closes it
// without the pointer or the focus having to move).

import { create, listen } from './dom';
import type { Mounter } from './types';

/** How long the pointer may be away from both the button and the popover before the popover goes: long enough to cross the gap between them. */
const LEAVE_GRACE_MS = 300;

export const mountDisclosurePopover: Mounter = ({ entry, segment, root, document: doc }) => {
  const popoverId = `${entry.id}-popover`;
  const trigger = create(doc, 'button', { type: 'button', 'aria-expanded': 'false', 'aria-controls': popoverId }, entry.label);
  // tabindex -1: a click on the popover's own text puts the focus inside it, where Escape has to give it back from.
  const popover = create(doc, 'div', { id: popoverId, hidden: '', tabindex: '-1' }, create(doc, 'p', {}, `Time: ${segment.minutes} minutes`));
  if (segment.labRefs.length > 0) {
    popover.append(create(doc, 'ul', {}, ...segment.labRefs.map((lab) => create(doc, 'li', {}, lab))));
  }
  const widget = create(doc, 'div', { id: entry.id }, trigger, popover);
  const lead = root.firstElementChild;
  if (lead !== null && lead.localName === 'h1') lead.after(widget);
  else root.prepend(widget);

  let hover = false;
  let focused = false;
  let pinned = false; // by activation, which touch and Safari rely on: they do not focus a button
  let dismissed = false; // by Escape, until the pointer and the focus have both left
  let shown = false;
  let disposed = false;
  let leaving: ReturnType<typeof setTimeout> | undefined;
  /** Exist only while the popover is shown. */
  let removeDocumentListeners: Array<() => void> = [];

  const update = (): void => {
    if (disposed) return;
    if (!hover && !focused && !pinned) dismissed = false;
    const show = (hover || focused || pinned) && !dismissed;
    if (show === shown) return;
    shown = show;
    trigger.setAttribute('aria-expanded', String(show));
    popover.hidden = !show;
    if (show) {
      removeDocumentListeners = [listen(doc, 'keydown', onKeydown), listen(doc, 'pointerdown', onPointerDown)];
    } else {
      removeDocumentListeners.forEach((remove) => remove());
      removeDocumentListeners = [];
    }
  };

  /** What Escape does to a popover that is showing: it goes, and stays gone until the pointer and the focus have both left. */
  function putAway(): void {
    // Only when the focus is inside the popover does it have to move, to the button that revealed it.
    const active = doc.activeElement;
    if (active !== null && popover.contains(active)) trigger.focus();
    pinned = false;
    dismissed = true;
    update();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    putAway();
  }

  /** A press outside lets go of an activation, so a popover opened by touch can be put away by tapping elsewhere. */
  function onPointerDown(event: PointerEvent): void {
    if (widget.contains(event.target as Node)) return;
    pinned = false;
    update();
  }

  const stopLeaving = (): void => {
    if (leaving !== undefined) clearTimeout(leaving);
    leaving = undefined;
  };
  const enter = (): void => {
    stopLeaving();
    hover = true;
    update();
  };
  const leave = (): void => {
    stopLeaving();
    leaving = setTimeout(() => {
      leaving = undefined;
      hover = false;
      update();
    }, LEAVE_GRACE_MS);
  };

  const removers = [trigger, popover].flatMap((element) => [
    listen(element, 'pointerenter', enter),
    listen(element, 'mouseenter', enter),
    listen(element, 'pointerleave', leave),
    listen(element, 'mouseleave', leave),
  ]);
  removers.push(
    listen(widget, 'focusin', () => {
      focused = true;
      update();
    }),
    listen(widget, 'focusout', (event) => {
      const into = event.relatedTarget as Node | null;
      focused = into !== null && widget.contains(into);
      if (!focused) pinned = false;
      update();
    }),
    listen(trigger, 'click', () => {
      if (shown && pinned) {
        pinned = false;
        dismissed = true;
      } else {
        pinned = true;
        dismissed = false;
      }
      update();
    }),
  );

  return {
    // For when the browser has spent the Escape: what it does to a popover that is showing. One that is not showing has nothing
    // to put away and is left as it is.
    dismiss(): void {
      if (shown) putAway();
    },
    dispose(): void {
      disposed = true;
      stopLeaving();
      removeDocumentListeners.forEach((remove) => remove());
      removeDocumentListeners = [];
      removers.forEach((remove) => remove());
    },
  };
};
