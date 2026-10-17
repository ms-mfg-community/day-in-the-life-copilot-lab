// APG tabs with automatic activation (specs/005-teaching-spa.md 2.4, F94-F96). The tabs come from the slide: the first list
// whose every item opens with bold text becomes the tablist, the bold lead-in names its tab, and the rest of the item is
// the panel. Which tab is active is kept in the store, so it outlives navigation (2.3).

import { NOTHING, create, elementsOf, firstContent, hasModifier, takesFocusItself, textOf } from './dom';
import { readParameter, writeParameter } from './persist';
import type { Mounter } from './types';

interface Surfaces {
  readonly list: HTMLElement;
  readonly items: HTMLElement[];
  /** The bold lead-in of each item, in order. */
  readonly names: string[];
}

function findSurfaces(root: HTMLElement): Surfaces | null {
  for (const list of Array.from(root.querySelectorAll<HTMLElement>('ul'))) {
    const items = elementsOf(list);
    const names: string[] = [];
    for (const item of items) {
      const leadIn = item.localName === 'li' ? firstContent(item) : null;
      if (leadIn?.localName !== 'strong') break;
      names.push(textOf(leadIn));
    }
    if (items.length >= 2 && names.length === items.length) return { list, items, names };
  }
  return null;
}

/** The stored tab, or the first when the store holds anything that is not the index of a tab. */
function storedTab(value: unknown, count: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < count ? value : 0;
}

export const mountTabs: Mounter = ({ entry, segment, root, document: doc, store }) => {
  const surfaces = findSurfaces(root);
  if (surfaces === null) {
    throw new Error(`tabs ${entry.id}: segment ${segment.id} has no list whose items all open with bold text`);
  }
  const { list, items, names } = surfaces;

  const tabs = names.map((name, index) =>
    create(
      doc,
      'button',
      { type: 'button', role: 'tab', id: `${entry.id}-tab-${index + 1}`, 'aria-controls': `${entry.id}-panel-${index + 1}` },
      name,
    ),
  );
  const panels = items.map((item, index) => {
    const panel = create(doc, 'div', { role: 'tabpanel', id: `${entry.id}-panel-${index + 1}`, 'aria-labelledby': tabs[index].id });
    panel.append(...Array.from(item.childNodes));
    // A panel with nothing focusable at its start would otherwise be skipped by Tab: the tabs would lead nowhere.
    if (!takesFocusItself(firstContent(panel))) panel.setAttribute('tabindex', '0');
    return panel;
  });
  const tablist = create(doc, 'div', { role: 'tablist', 'aria-label': entry.label }, ...tabs);
  list.replaceWith(create(doc, 'div', { id: entry.id }, tablist, ...panels));

  let current = -1;
  const show = (index: number): void => {
    current = index;
    tabs.forEach((tab, position) => {
      tab.setAttribute('aria-selected', String(position === index));
      tab.setAttribute('tabindex', position === index ? '0' : '-1'); // roving: only the active tab is in the tab order
      panels[position].hidden = position !== index;
    });
  };
  /** Makes a tab the active one, and keeps it in the store. Nothing happens for the tab that already is. */
  const activate = (index: number): void => {
    if (index === current) return;
    show(index);
    writeParameter(store, segment.id, entry.id, index);
  };
  /** Moves the focus to a tab. The focus listener below is what activates it; this covers the focus that is already there or is refused. */
  const choose = (index: number): void => {
    tabs[index].focus();
    activate(index);
  };

  tabs.forEach((tab, index) => {
    // Automatic activation follows the focus itself, whoever moves it: an arrow key here, a click, a screen reader's own
    // navigation, a script. Activating only from the keys this widget handles would leave a focused tab under another's panel.
    tab.addEventListener('focus', () => activate(index));
    tab.addEventListener('click', () => choose(index)); // a click does not focus a button in every engine
  });
  tablist.addEventListener('keydown', (event) => {
    if (hasModifier(event)) return;
    const from = tabs.indexOf(event.target as HTMLButtonElement);
    if (from < 0) return;
    const last = tabs.length - 1;
    let to: number;
    switch (event.key) {
      case 'ArrowRight':
        to = from === last ? 0 : from + 1;
        break;
      case 'ArrowLeft':
        to = from === 0 ? last : from - 1;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = last;
        break;
      default:
        return; // ArrowUp and ArrowDown stay with the browser: the tablist is horizontal
    }
    event.preventDefault();
    choose(to);
  });

  show(storedTab(readParameter(store, segment.id, entry.id), tabs.length));
  return NOTHING;
};
