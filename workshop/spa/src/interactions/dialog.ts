// APG modal dialog (specs/005-teaching-spa.md 2.4, F102, F103; AC13). A button after the slide's first preformatted block
// opens a dialog that holds a copy of that block. While the dialog is open the rest of the page is inert, Tab stays inside
// it, and Escape or the close button closes it and gives focus back to the button that opened it.

import { create, listen, tabbables } from './dom';
import type { Mounted, Mounter } from './types';

/**
 * Makes everything around `element` inert, on every level up to the body, and returns what it touched. A live region is
 * left alone so that announcements are still heard, and so is anything already inert, which is somebody else's to restore.
 */
function isolate(element: HTMLElement, body: HTMLElement): HTMLElement[] {
  const touched: HTMLElement[] = [];
  let node = element;
  while (node !== body) {
    const parent = node.parentElement;
    if (parent === null) break;
    for (const sibling of Array.from(parent.children) as HTMLElement[]) {
      if (sibling === node || sibling.hasAttribute('inert') || sibling.matches('[aria-live]')) continue;
      sibling.setAttribute('inert', '');
      touched.push(sibling);
    }
    node = parent;
  }
  return touched;
}

export const mountDialog: Mounter = ({ entry, segment, root, document: doc }): Mounted => {
  const source = root.querySelector('pre');
  if (source === null) throw new Error(`dialog ${entry.id}: segment ${segment.id} has no preformatted block to show`);

  const titleId = `${entry.id}-title`;
  const dialogId = `${entry.id}-dialog`;
  // The copy is a scrolling region, so it has to be reachable by keyboard. Its ids go: the slide keeps the originals.
  const copy = source.cloneNode(true) as HTMLElement;
  for (const element of [copy, ...Array.from(copy.querySelectorAll('[id]'))]) element.removeAttribute('id');
  copy.setAttribute('role', 'region');
  copy.setAttribute('aria-labelledby', titleId);
  copy.setAttribute('tabindex', '0');

  const trigger = create(
    doc,
    'button',
    { type: 'button', id: `${entry.id}-trigger`, 'aria-haspopup': 'dialog', 'aria-controls': dialogId },
    entry.label,
  );
  const closeButton = create(doc, 'button', { type: 'button' }, 'Close');
  const dialog = create(
    doc,
    'div',
    { id: dialogId, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, hidden: '' },
    create(doc, 'h2', { id: titleId }, entry.label),
    closeButton,
    copy,
  );
  source.after(create(doc, 'div', { id: entry.id }, trigger, dialog));

  let isOpen = false;
  let disposed = false;
  let inert: HTMLElement[] = [];
  /** Exists only while the dialog is open, so Escape elsewhere on the page is never swallowed. */
  let removeKeydown: (() => void) | undefined;

  const release = (): void => {
    for (const element of inert) element.removeAttribute('inert');
    inert = [];
  };
  const stopListening = (): void => {
    removeKeydown?.();
    removeKeydown = undefined;
  };

  /** Tab moves between the controls of the dialog and wraps at both ends; from anywhere outside them it comes back in. */
  const keepTabInside = (event: KeyboardEvent): void => {
    const stops = tabbables(dialog);
    if (stops.length === 0) {
      event.preventDefault();
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    const current = doc.activeElement;
    if (current === null || !dialog.contains(current)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      keepTabInside(event);
    }
  };

  function open(): void {
    if (isOpen || disposed) return;
    isOpen = true;
    inert = isolate(dialog, doc.body);
    dialog.hidden = false; // before the focus moves: an element that is not shown cannot take it
    removeKeydown = listen(doc, 'keydown', onKeydown);
    closeButton.focus();
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    release(); // before the focus moves back: the trigger was inert too
    trigger.focus(); // the button that opened it, named rather than guessed from where the focus happened to be
    dialog.hidden = true;
    stopListening();
  }

  const removers = [listen(trigger, 'click', open), listen(closeButton, 'click', close)];

  return {
    dispose(): void {
      disposed = true;
      isOpen = false;
      release(); // nothing to restore the focus to: the segment is going away
      stopListening();
      removers.forEach((remove) => remove());
    },
  };
};
