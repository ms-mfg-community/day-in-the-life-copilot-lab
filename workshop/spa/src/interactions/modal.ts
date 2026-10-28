// What a modal dialog does to the page around it (specs/005-teaching-spa.md 2.4, F102, F103; 2.10, F84; AC13), shared by the
// dialog interaction (dialog.ts) and the shell's keyboard-shortcuts dialog (shell/keyboard.ts). While the dialog is open the
// rest of the page is inert, Tab stays inside it, and Escape closes it and gives focus back to the element that invoked it.
// Escape is the one way out that needs no control (SC 2.1.2), and it is never swallowed while the dialog is closed, because
// the document listener exists only while it is open.

import { listen, tabbables } from './dom';

// aria-modal="true" is only true when the page behind the dialog is hidden from the eye as well as from the keyboard
// (F103), so the dialog is its own backdrop: it covers the viewport and dims what is behind it, and what it says sits on
// an opaque panel above that. The backdrop, the panel's place and its opaque background travel with the elements (see
// dialog.ts); the panel's face (border, corners, padding) is the stylesheet's. Neither sets `display`: an author `display`
// would beat the rule behind the `hidden` attribute and leave a closed dialog on screen.
export const BACKDROP = 'position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 1000; background: rgba(0, 0, 0, 0.7)';
export const PANEL = [
  'box-sizing: border-box',
  'width: calc(100% - 2rem)',
  'max-width: 48rem',
  'max-height: 90vh',
  'margin: 5vh auto',
  'overflow: auto',
  'background: var(--surface, Canvas)',
  'color: var(--text, CanvasText)',
].join('; ');

export interface ModalOptions {
  /** The element that takes focus when the dialog opens: its first control, as a rule. */
  readonly initialFocus: () => HTMLElement | null | undefined;
  /** The element focus goes back to when the dialog closes: the one that invoked it, named rather than guessed. */
  readonly returnTo: () => HTMLElement | null | undefined;
}

export interface Modal {
  readonly isOpen: boolean;
  open(): void;
  /** Closes, and gives focus back. Nothing happens when it is not open. */
  close(): void;
  /** Closes without giving focus back, and refuses to open again: the page around it is going away. */
  dispose(): void;
}

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

/** The behaviour of `dialog`, an element with role="dialog" that is `hidden` while closed. */
export function createModal(doc: Document, dialog: HTMLElement, options: ModalOptions): Modal {
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
    options.initialFocus()?.focus();
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    release(); // before the focus moves back: the invoking element was inert too
    options.returnTo()?.focus();
    dialog.hidden = true;
    stopListening();
  }

  return {
    get isOpen(): boolean {
      return isOpen;
    },
    open,
    close,
    dispose(): void {
      disposed = true;
      isOpen = false;
      release(); // nothing to restore the focus to: the page is going away
      stopListening();
    },
  };
}
