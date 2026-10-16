// Staged reveal (specs/005-teaching-spa.md 2.4, F93, F174). The sections of the slide appear one step at a time. How many
// are revealed is the segment's `revealedSteps` in the store (2.3), so it outlives navigation and anything else that
// writes it, a presenter key later on, moves the page too. The buttons and the arrow keys only ever write to the store;
// the page follows the store. No key depends on timing, and the current step is announced to the live region.

import { create, elementsOf, hasModifier, listen, setAriaDisabled, textOf } from './dom';
import type { Mounter } from './types';

interface Staging {
  /** The elements of the slide, in order. */
  readonly elements: HTMLElement[];
  /** The step each element appears at. 0 is always shown; the h2 that opens a section is the step that reveals it. */
  readonly appearsAt: number[];
  /** What each step is called: the heading that opens it. */
  readonly titles: string[];
}

/** A section is an h2 and what follows it. A rule that stands right before an h2 introduces that section, not the one above. */
function stageSlide(root: HTMLElement): Staging {
  const elements = elementsOf(root);
  const titles: string[] = [];
  const appearsAt = elements.map((element, index) => {
    if (element.localName === 'h2') titles.push(textOf(element));
    const introduces = element.localName === 'hr' && elements[index + 1]?.localName === 'h2';
    return introduces ? titles.length + 1 : titles.length;
  });
  return { elements, appearsAt, titles };
}

/** A step the page can show: a whole number from none revealed to all of them. Whatever else the store holds is not trusted. */
function clampStep(value: unknown, total: number): number {
  const whole = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(Math.max(whole, 0), total);
}

export const mountStagedReveal: Mounter = ({ entry, segment, root, document: doc, store, announce }) => {
  const { elements, appearsAt, titles } = stageSlide(root);
  const total = titles.length;
  const firstHidden = appearsAt.findIndex((step) => step >= 1);
  if (total < 2 || firstHidden < 0) {
    throw new Error(`staged-reveal ${entry.id}: segment ${segment.id} has fewer than two h2 sections to reveal`);
  }

  const previous = create(doc, 'button', { type: 'button' }, 'Previous step');
  const next = create(doc, 'button', { type: 'button' }, 'Next step');
  const status = create(doc, 'span');
  // The text between the controls keeps "Step 3 of 10" apart from the button names around it.
  const control = create(doc, 'div', { id: entry.id, role: 'group', 'aria-label': entry.label }, previous, ' ', status, ' ', next);
  elements[firstHidden].before(control);

  const where = (step: number): string => `Step ${step} of ${total}`;
  let shown = clampStep(store.get().segments[segment.id]?.revealedSteps, total);
  let disposed = false;

  const paint = (): void => {
    elements.forEach((element, index) => {
      element.hidden = appearsAt[index] > shown;
    });
    status.textContent = where(shown);
    // Spent, not disabled: the button stays in the tab order and keeps the focus a keypress put on it.
    setAriaDisabled(previous, shown === 0);
    setAriaDisabled(next, shown === total);
  };

  /** The one way to change the step. The subscription below turns the new value into a page. */
  const move = (by: number): void => {
    const target = Math.min(Math.max(shown + by, 0), total);
    if (target === shown) return;
    store.update(segment.id, (state) => ({ ...state, revealedSteps: target }));
  };

  paint();
  const unsubscribe = store.subscribe((state) => {
    if (disposed) return;
    const step = clampStep(state.segments[segment.id]?.revealedSteps, total);
    if (step === shown) return; // some other part of the state changed, or this widget was only just mounted from it
    shown = step;
    paint();
    announce(step === 0 ? where(step) : `${where(step)}: ${titles[step - 1]}`);
  });

  const removers = [
    listen(previous, 'click', () => move(-1)),
    listen(next, 'click', () => move(1)),
    listen(control, 'keydown', (event) => {
      if (hasModifier(event)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      }
    }),
  ];

  return {
    dispose(): void {
      disposed = true;
      unsubscribe();
      removers.forEach((remove) => remove());
    },
  };
};
