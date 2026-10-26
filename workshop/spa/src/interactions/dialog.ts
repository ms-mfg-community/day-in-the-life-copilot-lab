// APG modal dialog (specs/005-teaching-spa.md 2.4, F102, F103; AC13). A button after the slide's first preformatted block
// opens a dialog that holds a copy of that block. While the dialog is open the rest of the page is inert, Tab stays inside
// it, and Escape or the close button closes it and gives focus back to the button that opened it (modal.ts).

import { create, listen } from './dom';
import { BACKDROP, PANEL, createModal } from './modal';
import type { Mounted, Mounter } from './types';

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
    { id: dialogId, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, hidden: '', style: BACKDROP },
    create(doc, 'div', { style: PANEL }, create(doc, 'h2', { id: titleId }, entry.label), closeButton, copy),
  );
  source.after(create(doc, 'div', { id: entry.id }, trigger, dialog));

  // The button that opened it is where focus goes back to: named, rather than guessed from where the focus happened to be.
  const modal = createModal(doc, dialog, { initialFocus: () => closeButton, returnTo: () => trigger });
  const removers = [listen(trigger, 'click', modal.open), listen(closeButton, 'click', modal.close)];

  return {
    dismiss: modal.close, // what Escape does, for when the browser has spent the key: closed, and the focus back on the button that opened it
    dispose(): void {
      modal.dispose();
      removers.forEach((remove) => remove());
    },
  };
};
