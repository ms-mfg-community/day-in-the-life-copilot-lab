// APG accordion (specs/005-teaching-spa.md 2.4, F97, F98). The panels come from the slide: each h2 and what follows it
// becomes a header and its panel. Any number of panels may be open, but one always is, so the header of the only open
// panel is aria-disabled. Which panels are open is kept in the store, so it outlives navigation (2.3).
//
// Enter and Space are not handled here: on a button the browser turns them into a click, and handling the key as well
// would toggle the panel twice.

import { NOTHING, create, isBlankText, isElement, setAriaDisabled, textOf } from './dom';
import { readParameter, writeParameter } from './persist';
import type { Mounter } from './types';

interface Section {
  readonly heading: HTMLElement;
  readonly content: ChildNode[];
}

/** A rule right before a heading only marks the boundary that the accordion now draws itself. */
function separates(nodes: readonly ChildNode[], index: number): boolean {
  if (!isElement(nodes[index], 'hr')) return false;
  const next = nodes.slice(index + 1).find((node) => !isBlankText(node));
  return next !== undefined && isElement(next, 'h2');
}

/**
 * Everything from the first h2 on, cut at each h2: each h2 with the nodes up to the next one. What comes before the first
 * h2 (the slide's own heading) is left alone. The rules that only separate two sections are set aside, to be dropped.
 */
function cutSections(root: HTMLElement): { sections: Section[]; separators: ChildNode[] } {
  const nodes = Array.from(root.childNodes);
  const start = nodes.findIndex((node) => isElement(node, 'h2'));
  const sections: Section[] = [];
  const separators: ChildNode[] = [];
  for (let index = start < 0 ? nodes.length : start; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (isElement(node, 'h2')) sections.push({ heading: node, content: [] });
    else if (separates(nodes, index)) separators.push(node);
    else sections[sections.length - 1].content.push(node);
  }
  return { sections, separators };
}

/** What a button may not contain: it would be interactive content inside interactive content. */
const INTERACTIVE = 'a, button, input, select, textarea';

/** The stored panels that exist, or the first when the store holds none that do. */
function storedPanels(value: unknown, count: number): number[] {
  const valid = Array.isArray(value) ? value.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < count) : [];
  return valid.length > 0 ? valid : [0];
}

export const mountAccordion: Mounter = ({ entry, segment, root, document: doc, store }) => {
  const { sections, separators } = cutSections(root);
  if (sections.length < 2) throw new Error(`accordion ${entry.id}: segment ${segment.id} has fewer than two h2 sections`);
  const linked = sections.find(({ heading }) => heading.querySelector(INTERACTIVE) !== null);
  if (linked !== undefined) {
    throw new Error(`accordion ${entry.id}: the heading "${textOf(linked.heading)}" holds a control, which cannot go inside a header button`);
  }

  const buttons = sections.map(({ heading }, index) =>
    create(
      doc,
      'button',
      { type: 'button', id: `${entry.id}-header-${index + 1}`, 'aria-controls': `${entry.id}-panel-${index + 1}` },
      ...Array.from(heading.childNodes),
    ),
  );
  const panels = sections.map(({ content }, index) => create(doc, 'div', { id: `${entry.id}-panel-${index + 1}` }, ...content));
  // The button is the only child of its heading, which keeps its id for links to it.
  sections.forEach(({ heading }, index) => heading.replaceChildren(buttons[index]));

  const widget = create(doc, 'div', { id: entry.id, role: 'group', 'aria-label': entry.label });
  sections[0].heading.before(widget);
  for (const node of separators) node.remove();
  widget.append(...sections.flatMap(({ heading }, index) => [heading, panels[index]]));

  const open = new Set(storedPanels(readParameter(store, segment.id, entry.id), sections.length));
  const render = (): void => {
    buttons.forEach((button, index) => {
      const expanded = open.has(index);
      button.setAttribute('aria-expanded', String(expanded));
      setAriaDisabled(button, expanded && open.size === 1);
      panels[index].hidden = !expanded;
    });
  };
  const toggle = (index: number): void => {
    if (open.has(index)) {
      if (open.size === 1) return; // the only open panel cannot collapse
      open.delete(index);
    } else open.add(index);
    render();
    writeParameter(store, segment.id, entry.id, [...open].sort((a, b) => a - b));
  };

  buttons.forEach((button, index) => button.addEventListener('click', () => toggle(index)));
  render();
  return NOTHING;
};
