// The few DOM helpers the patterns share. Nothing here reads layout or uses classList or dataset: only what every
// engine, and the fake DOM the tests run the shell in, agree on.

import type { Mounted } from './types';

/** A mounted interaction that has nothing to undo. */
export const NOTHING: Mounted = { dispose(): void {} };

export type Attributes = Readonly<Record<string, string | undefined>>;

/** An element with these attributes and children. An attribute whose value is undefined is left off. */
export function create<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attributes: Attributes = {},
  ...children: ReadonlyArray<Node | string>
): HTMLElementTagNameMap[K] {
  const element = doc.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) element.setAttribute(name, value);
  }
  if (children.length > 0) element.append(...children);
  return element;
}

/** The element children of a node, as an array that stays put while the tree is rearranged. */
export function elementsOf(parent: Element): HTMLElement[] {
  return Array.from(parent.children) as HTMLElement[];
}

/** The text of a node with its white space collapsed: what a reader sees, whatever the markup around it. */
export function textOf(node: Node): string {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
}

// Node types are compared as numbers, because the interfaces are not globals everywhere the shell runs.
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

export function isElement(node: Node, name?: string): node is HTMLElement {
  return node.nodeType === ELEMENT_NODE && (name === undefined || (node as Element).localName === name);
}

/** White space between blocks: it carries nothing, so rearranging the blocks may drop it. */
export function isBlankText(node: Node): boolean {
  return node.nodeType === TEXT_NODE && textOf(node) === '';
}

/** The first thing a reader meets in an element: its first child element, unless text comes before it. */
export function firstContent(parent: Element): HTMLElement | null {
  for (const node of Array.from(parent.childNodes)) {
    if (isElement(node)) return node;
    if (node.nodeType === TEXT_NODE && !isBlankText(node)) return null;
  }
  return null;
}

/** A list whose every item opens with bold text: the bold text names the item, and the rest of the item is what it says. */
export interface LeadInList {
  readonly list: HTMLElement;
  readonly items: HTMLElement[];
  /** The bold lead-in of each item, in order. */
  readonly leadIns: HTMLElement[];
}

/** The lists of a slide with two or more items, each opening with bold text, in the order a reader meets them. */
export function leadInLists(root: Element): LeadInList[] {
  const found: LeadInList[] = [];
  for (const list of Array.from(root.querySelectorAll<HTMLElement>('ul'))) {
    const items = elementsOf(list);
    const leadIns: HTMLElement[] = [];
    for (const item of items) {
      const leadIn = item.localName === 'li' ? firstContent(item) : null;
      if (leadIn?.localName !== 'strong') break;
      leadIns.push(leadIn);
    }
    if (items.length >= 2 && leadIns.length === items.length) found.push({ list, items, leadIns });
  }
  return found;
}

const FOCUSABLE_BY_DEFAULT = new Set(['a', 'button', 'input', 'select', 'textarea']);

/** Whether an element can take focus without a tabindex of its own. */
export function takesFocusItself(element: Element | null): boolean {
  return element !== null && (FOCUSABLE_BY_DEFAULT.has(element.localName) || element.hasAttribute('tabindex'));
}

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]';

/** The elements Tab visits inside a container, in document order. */
export function tabbables(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (element) => element.tabIndex >= 0 && !element.hasAttribute('disabled') && element.closest('[hidden], [inert]') === null,
  );
}

/** A key press that carries a modifier belongs to the browser or the assistive technology (Alt+Left is Back), not to a widget. */
export function hasModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

/** Adds a listener and hands back what takes it off again, so a pattern can undo all of its listeners in one sweep. */
export function listen<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
): () => void {
  const listener = handler as EventListener;
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}

/**
 * `aria-disabled="true"` while a control has nothing left to do, and no attribute otherwise. The control stays focusable
 * and in the tab order, which the native `disabled` would not allow.
 */
export function setAriaDisabled(element: Element, spent: boolean): void {
  if (spent) element.setAttribute('aria-disabled', 'true');
  else element.removeAttribute('aria-disabled');
}
