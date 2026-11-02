// A node diagram (specs/005-teaching-spa.md 2.4, F91, F109). The nodes come from the slide: the first list left on it whose
// every item opens with bold text, so a list that tabs or a carousel has already turned into a widget is not offered a second
// time (the inventory's order says who goes first). The bold lead-in names a node, the rest of its item is what the node shows
// when it is selected, and the list itself stays in the page, whole, as the long description of the diagram (F109).

import { NOTHING, create, hasModifier, leadInLists, textOf } from './dom';
import { readParameter, storedIndex, writeParameter } from './persist';
import type { Mounter } from './types';

// The shell has no stylesheet yet (see dialog.ts), so the presentation travels with the elements. The colors are explicit,
// not system colors: the selected node has to be 3:1 against what is next to it (F91), and that is only knowable for colors
// the widget declares, on a surface it declares itself, so the ratio does not depend on the page. A selected node differs
// in border and weight as well, so it is still marked where forced colors replace these colors. The padding takes up what the
// thinner border leaves, so both states have the same border box and selecting a node moves nothing: a margin would not do
// that, because the flex row shares out its free space by margin box and the other nodes would shift to make room.
const SURFACE = 'background-color:#ffffff;color:#1a1a1a;';
const BOX = `${SURFACE}margin:1rem 0;padding:0.75rem;border:1px solid #595959;`;
const NODES = 'display:flex;flex-wrap:wrap;gap:0.5rem;';
const NODE = 'flex:1 1 14rem;min-width:24px;min-height:24px;margin:0;text-align:left;font-size:inherit;cursor:pointer;';
const PLAIN = `${NODE}background-color:#ffffff;color:#1a1a1a;border:1px solid #595959;padding:calc(0.4rem + 2px) calc(0.75rem + 2px);font-weight:normal;`;
const CHOSEN = `${NODE}background-color:#0b3d91;color:#ffffff;border:3px solid #0b3d91;padding:0.4rem 0.75rem;font-weight:bold;`;
const DETAILS = 'margin-top:0.75rem;padding:0.5rem 0.75rem;border:1px solid #595959;';

export const mountNodeDiagram: Mounter = ({ entry, segment, root, document: doc, store }) => {
  const descriptionId = entry.longDescriptionId;
  if (descriptionId === undefined) throw new Error(`node-diagram ${entry.id}: a diagram declares its longDescriptionId (AC19)`);
  const source = leadInLists(root)[0];
  if (source === undefined) {
    throw new Error(`node-diagram ${entry.id}: segment ${segment.id} has no list whose items all open with bold text`);
  }
  const { list, items, leadIns } = source;

  const nodes = leadIns.map((leadIn, index) =>
    create(doc, 'button', { type: 'button', id: `${entry.id}-node-${index + 1}`, 'aria-controls': `${entry.id}-details` }, textOf(leadIn)),
  );
  const details = create(doc, 'div', { id: `${entry.id}-details`, role: 'group', style: DETAILS });
  const diagram = create(
    doc,
    'div',
    { id: entry.id, role: 'group', 'aria-label': entry.label, 'aria-describedby': descriptionId, style: BOX },
    create(doc, 'div', { style: NODES }, ...nodes),
    details,
  );

  /**
   * What the item of a node says after its lead-in: a copy of the item, less the lead-in. The ids of the copy go, because the
   * original is still in the page and an id is for one element.
   */
  const detailsOf = (index: number): Node[] => {
    const copy = items[index].cloneNode(true) as HTMLElement;
    for (const element of [copy, ...Array.from(copy.querySelectorAll('[id]'))]) element.removeAttribute('id');
    copy.firstElementChild?.remove(); // the lead-in: the first element of an item that opens with one
    return Array.from(copy.childNodes);
  };

  let current = -1;
  const show = (index: number): void => {
    current = index;
    nodes.forEach((node, position) => {
      node.setAttribute('aria-pressed', String(position === index));
      node.setAttribute('style', position === index ? CHOSEN : PLAIN);
    });
    details.setAttribute('aria-labelledby', nodes[index].id);
    details.replaceChildren(...detailsOf(index));
  };
  /** Only one node is in the tab order, and it is the one the reader was last on, so Tab comes back to where the reader left. */
  const rove = (index: number): void => {
    nodes.forEach((node, position) => node.setAttribute('tabindex', position === index ? '0' : '-1'));
  };
  /** Selects a node, and keeps the choice in the store. Nothing happens for the node that is selected already. */
  const select = (index: number): void => {
    if (index === current) return;
    show(index);
    writeParameter(store, segment.id, entry.id, index);
  };

  nodes.forEach((node, index) => {
    // The focus is what the tab stop follows, whoever moves it: an arrow key, a click, a screen reader, a script.
    node.addEventListener('focus', () => rove(index));
    // A click does not focus a button in every engine, so it moves the tab stop itself; Enter and Space arrive here as clicks.
    node.addEventListener('click', () => {
      rove(index);
      select(index);
    });
  });
  diagram.addEventListener('keydown', (event) => {
    if (hasModifier(event)) return;
    const from = nodes.indexOf(event.target as HTMLButtonElement);
    if (from < 0) return;
    const last = nodes.length - 1;
    let to: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        to = from === last ? 0 : from + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        to = from === 0 ? last : from - 1;
        break;
      default:
        return;
    }
    event.preventDefault(); // the arrows move around the diagram, not the page
    nodes[to].focus(); // moving is not choosing: a node is selected by Enter, Space or a click
  });

  const first = storedIndex(readParameter(store, segment.id, entry.id), nodes.length);
  show(first);
  rove(first);
  list.id = descriptionId;
  list.before(diagram);
  return NOTHING;
};
