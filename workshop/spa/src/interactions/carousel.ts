// An APG carousel (specs/005-teaching-spa.md 2.4, F99, F100) without automatic rotation, which is the default of the
// inventory: nothing here moves by itself, so there is no rotation control to pause and no timer to undo. The slides come
// from the slide of the segment: the first list whose every item opens with bold text is replaced by the carousel, each item
// becoming a slide named by its bold lead-in. One slide is shown at a time, Previous and Next move between them, and the slide
// that is shown is kept in the store, so it outlives navigation (2.3). A long description under the slides says how many there
// are and what each is called, so a reader knows what the carousel holds before moving through it (F109).

import { NOTHING, create, leadInLists, textOf } from './dom';
import { readParameter, storedIndex, writeParameter } from './persist';
import type { Mounter } from './types';

// The shell has no stylesheet yet (see dialog.ts), so the presentation travels with the elements. The buttons are at least
// 24 by 24 CSS pixels (2.5.8).
const BOX = 'margin:1rem 0;padding:0.75rem 1rem;border:1px solid CanvasText;';
const CONTROLS = 'display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;';
const BUTTON = 'min-width:24px;min-height:24px;';
const NOTE = 'margin:0.75rem 0 0;font-size:0.875rem;';
const PREVIOUS = 'Previous slide';
const NEXT = 'Next slide';

export const mountCarousel: Mounter = ({ entry, segment, root, document: doc, store }) => {
  const source = leadInLists(root)[0];
  if (source === undefined) {
    throw new Error(`carousel ${entry.id}: segment ${segment.id} has no list whose items all open with bold text`);
  }
  const { list, items, leadIns } = source;
  const wrapperId = `${entry.id}-slides`;

  // A form such as "3 of 10" names a slide that has no lead-in to be named by (F100).
  const names = leadIns.map((leadIn, index) => textOf(leadIn).replace(/[.:]+$/, '') || `${index + 1} of ${items.length}`);
  const slides = items.map((item, index) => {
    const slide = create(doc, 'div', { role: 'group', 'aria-roledescription': 'slide', 'aria-label': names[index] });
    slide.append(...Array.from(item.childNodes));
    return slide;
  });
  const previous = create(doc, 'button', { type: 'button', 'aria-controls': wrapperId, style: BUTTON }, PREVIOUS);
  const next = create(doc, 'button', { type: 'button', 'aria-controls': wrapperId, style: BUTTON }, NEXT);
  const place = create(doc, 'span');
  // Polite, because nothing rotates the slides: only the reader changes them, and what they change to is worth hearing (F100).
  // The buttons are outside the wrapper, so pressing one does not read its own caption out.
  const wrapper = create(doc, 'div', { id: wrapperId, 'aria-live': 'polite' }, ...slides);
  const carousel = create(
    doc,
    'div',
    { id: entry.id, role: 'group', 'aria-roledescription': 'carousel', 'aria-label': entry.label, 'aria-describedby': entry.longDescriptionId, style: BOX },
    create(doc, 'div', { style: CONTROLS }, previous, ' ', place, ' ', next),
    wrapper,
  );
  // Outside the live wrapper, so a change of slide does not read it out again.
  if (entry.longDescriptionId !== undefined) {
    const description = `${slides.length} slides, shown one at a time: ${names.join(', ')}. ${PREVIOUS} and ${NEXT} move between them, and the first follows the last.`;
    carousel.append(create(doc, 'p', { id: entry.longDescriptionId, style: NOTE }, description));
  }
  list.replaceWith(carousel);

  let current = -1;
  const show = (index: number): void => {
    current = index;
    slides.forEach((slide, position) => {
      slide.hidden = position !== index;
    });
    place.textContent = `${index + 1} of ${slides.length}`;
  };
  /** Shows a slide, wrapping round at both ends, and keeps it in the store. The buttons are not touched, so they keep the focus. */
  const move = (by: number): void => {
    show((current + by + slides.length) % slides.length);
    writeParameter(store, segment.id, entry.id, current);
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));

  show(storedIndex(readParameter(store, segment.id, entry.id), slides.length));
  return NOTHING;
};
