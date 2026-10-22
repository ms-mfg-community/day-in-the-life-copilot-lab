// A small DOM for the interaction tests (specs/005-teaching-spa.md sections 2.4 and 2.10, AC6 and AC13).
//
// The repository has no DOM library (jsdom, happy-dom and linkedom are not dependencies) and the vitest environment is
// node, so a test that wants to know what a widget does to a page needs a page. This is one, built to be an ORACLE
// rather than a convenience: it models the browser rules that make interaction code fail in practice, and nothing
// else. The rules it enforces:
//   - `focus()` is silently ignored on an element that is hidden, inert, disabled, detached or not focusable, so
//     code that focuses before it un-hides, or while an ancestor is still inert, ends up with focus nowhere;
//   - a focused element that stops being focusable (hidden, made inert or disabled, moved or removed) has lost focus
//     and `document.activeElement` is <body>; the fake clears focus at once, with no blur or focusout (see below);
//   - `mouseenter`, `mouseleave`, `pointerenter`, `pointerleave`, `focus` and `blur` do not bubble, while `focusin`,
//     `focusout`, `mouseover`, `mouseout` and the key and click events do;
//   - a button is activated by Enter on keydown and by Space on keyup, and not at all when keydown was cancelled;
//   - Tab moves through the tabbable elements in document order and, past the last one, out of the page.
// It models no layout and no CSS: `hidden` is `display: none`, as the user-agent stylesheet has it.
//
// It enforces a restraint too: a selector, event option or tree operation it does not model throws instead of being
// guessed at, so the code under test cannot lean on a behaviour this file never checked.
//
// An oracle that cannot fail proves nothing, and one that is wrong proves the wrong thing, so it is checked twice.
// fake-dom.test.ts is its self-test, and fake-dom-browser-check.mjs runs the same scenarios in this fake and in a real
// Chromium and Firefox and requires the observations to be identical (node --test, not part of `npm test`, because it
// needs a browser). Where the engines differ from each other the fake follows Chromium, and a widget must not depend on
// what the engines disagree about:
//   - the timing of the focus fix-up and the blur and focusout events it fires (the settled result is the same);
//   - where Tab goes from the last tabbable element in the page (Chromium leaves the page and wraps, Firefox stays);
//   - when a click on a link to a fragment changes the hash (here at once, as in Chromium; Firefox does it on a later task).
// Anything else the fake does is a rule both engines were seen to follow.

import { decodeOnce } from './html-scan';

// ---------------------------------------------------------------------------------------------------------------------
// Events

export type Listener = (event: FakeEvent) => void;
type ListenerOptions = boolean | { capture?: boolean; once?: boolean };
interface Registration {
  listener: Listener;
  capture: boolean;
  once: boolean;
}

export interface EventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  key?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  button?: number;
  relatedTarget?: FakeEventTarget | null;
}

const BUBBLING = new Set([
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseover',
  'mouseout',
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerover',
  'pointerout',
  'keydown',
  'keyup',
  'focusin',
  'focusout',
  'input',
  'change',
]);
const CANCELABLE = new Set(['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'keydown', 'keyup']);

export class FakeEvent {
  readonly type: string;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly button: number;
  readonly relatedTarget: FakeEventTarget | null;
  readonly isComposing = false;
  target: FakeEventTarget | null = null;
  currentTarget: FakeEventTarget | null = null;
  defaultPrevented = false;
  propagationStopped = false;
  immediatelyStopped = false;

  /** Bubbling and cancelability default to what the platform gives an event of this type. */
  constructor(type: string, init: EventInit = {}) {
    this.type = type;
    this.bubbles = init.bubbles ?? BUBBLING.has(type);
    this.cancelable = init.cancelable ?? CANCELABLE.has(type);
    this.key = init.key ?? '';
    this.shiftKey = init.shiftKey ?? false;
    this.ctrlKey = init.ctrlKey ?? false;
    this.altKey = init.altKey ?? false;
    this.metaKey = init.metaKey ?? false;
    this.button = init.button ?? 0;
    this.relatedTarget = init.relatedTarget ?? null;
  }

  preventDefault(): void {
    if (this.cancelable) this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }

  stopImmediatePropagation(): void {
    this.propagationStopped = true;
    this.immediatelyStopped = true;
  }
}

export class FakeEventTarget {
  private readonly registrations = new Map<string, Registration[]>();

  addEventListener(type: string, listener: Listener, options?: ListenerOptions): void {
    const capture = typeof options === 'boolean' ? options : options?.capture === true;
    const once = typeof options === 'object' && options.once === true;
    const list = this.registrations.get(type) ?? [];
    if (list.some((entry) => entry.listener === listener && entry.capture === capture)) return; // as in the DOM
    list.push({ listener, capture, once });
    this.registrations.set(type, list);
  }

  removeEventListener(type: string, listener: Listener, options?: ListenerOptions): void {
    const capture = typeof options === 'boolean' ? options : options?.capture === true;
    const list = this.registrations.get(type);
    if (!list) return;
    const index = list.findIndex((entry) => entry.listener === listener && entry.capture === capture);
    if (index >= 0) list.splice(index, 1);
  }

  /** How many listeners of `type` (all types when omitted) are registered here: a test's proof that nothing is left behind. */
  listenerCount(type?: string): number {
    if (type !== undefined) return this.registrations.get(type)?.length ?? 0;
    let total = 0;
    for (const list of this.registrations.values()) total += list.length;
    return total;
  }

  /** Drops every listener of every type: what the end of a page does to the script that was listening. */
  removeAllListeners(): void {
    this.registrations.clear();
  }

  protected eventParent(): FakeEventTarget | null {
    return null;
  }

  /** Capture, target and bubble phases. A listener that throws fails the test: nothing here swallows an error. */
  dispatchEvent(event: FakeEvent): boolean {
    event.target = this;
    const ancestors: FakeEventTarget[] = [];
    for (let up = this.eventParent(); up !== null; up = up.eventParent()) ancestors.push(up);
    const visit = (node: FakeEventTarget, phase: 'capture' | 'target' | 'bubble'): void => {
      if (event.propagationStopped) return;
      event.currentTarget = node;
      for (const entry of [...(node.registrations.get(event.type) ?? [])]) {
        if (phase === 'capture' && !entry.capture) continue;
        if (phase === 'bubble' && entry.capture) continue;
        if (event.immediatelyStopped) return;
        if (entry.once) node.removeEventListener(event.type, entry.listener, entry.capture);
        entry.listener.call(node, event);
      }
    };
    for (const node of [...ancestors].reverse()) visit(node, 'capture');
    visit(this, 'target');
    if (event.bubbles) for (const node of ancestors) visit(node, 'bubble');
    event.currentTarget = null;
    return !event.defaultPrevented;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Nodes

type FakeParent = FakeElement | FakeDocument;

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);
/** Natively focusable without a tabindex (an `a` and an `area` only with an href). */
const NATIVELY_FOCUSABLE = new Set(['button', 'input', 'select', 'textarea']);
const CAN_BE_DISABLED = new Set(['button', 'input', 'select', 'textarea']);
/** The `tabIndex` property of these is 0 without an attribute, even where the element is not focusable (an `a` with no href). */
const TAB_INDEX_DEFAULTS_TO_ZERO = new Set(['a', 'area', 'button', 'iframe', 'input', 'object', 'select', 'textarea']);

function detach(node: FakeNode): void {
  const parent = node.parentNode;
  if (parent === null) return;
  const index = parent.childNodes.indexOf(node);
  if (index >= 0) parent.childNodes.splice(index, 1);
  node.parentNode = null;
  node.ownerDocument?.reconcileFocus();
}

function insertBefore(parent: FakeParent, node: FakeNode, reference: FakeNode | null): void {
  if (node instanceof FakeElement && node.contains(parent instanceof FakeElement ? parent : null)) {
    throw new Error('fake-dom: HierarchyRequestError, a node cannot be inserted into itself or a descendant');
  }
  detach(node); // a node that is already in a tree moves, as in the DOM; the index is read after it has left
  const index = reference === null ? parent.childNodes.length : parent.childNodes.indexOf(reference);
  if (index < 0) throw new Error('fake-dom: NotFoundError, the reference node is not a child of this node');
  parent.childNodes.splice(index, 0, node);
  node.parentNode = parent;
}

export abstract class FakeNode extends FakeEventTarget {
  abstract readonly nodeType: number;
  parentNode: FakeParent | null = null;

  constructor(readonly ownerDocument: FakeDocument | null) {
    super();
  }

  protected override eventParent(): FakeEventTarget | null {
    return this.parentNode;
  }

  get isConnected(): boolean {
    let node: FakeNode = this;
    while (node.parentNode !== null) node = node.parentNode;
    return node instanceof FakeDocument;
  }

  get parentElement(): FakeElement | null {
    return this.parentNode instanceof FakeElement ? this.parentNode : null;
  }

  get nextSibling(): FakeNode | null {
    const siblings = this.parentNode?.childNodes;
    return siblings === undefined ? null : (siblings[siblings.indexOf(this) + 1] ?? null);
  }

  get previousSibling(): FakeNode | null {
    const siblings = this.parentNode?.childNodes;
    if (siblings === undefined) return null;
    const index = siblings.indexOf(this);
    return index > 0 ? siblings[index - 1] : null;
  }

  abstract get textContent(): string;

  remove(): void {
    detach(this);
  }

  before(...items: Array<FakeNode | string>): void {
    const parent = this.parentNode;
    if (parent === null) return;
    for (const node of this.toNodes(items)) insertBefore(parent, node, this);
  }

  after(...items: Array<FakeNode | string>): void {
    const parent = this.parentNode;
    if (parent === null) return;
    const nodes = this.toNodes(items);
    let reference = this.nextSibling;
    while (reference !== null && nodes.includes(reference)) reference = reference.nextSibling;
    for (const node of nodes) insertBefore(parent, node, reference);
  }

  replaceWith(...items: Array<FakeNode | string>): void {
    const parent = this.parentNode;
    if (parent === null) return;
    const nodes = this.toNodes(items);
    let reference = this.nextSibling;
    while (reference !== null && nodes.includes(reference)) reference = reference.nextSibling;
    detach(this);
    for (const node of nodes) insertBefore(parent, node, reference);
  }

  protected toNodes(items: ReadonlyArray<FakeNode | string>): FakeNode[] {
    return items.map((item) => (typeof item === 'string' ? new FakeText(this.ownerDocument, item) : item));
  }
}

export class FakeText extends FakeNode {
  readonly nodeType = 3;

  constructor(
    doc: FakeDocument | null,
    public data: string,
  ) {
    super(doc);
  }

  get textContent(): string {
    return this.data;
  }

  set textContent(value: string) {
    this.data = String(value);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Selectors: type, universal, #id, .class, [attr], [attr op value], :not(...), the descendant and child combinators
// (and the sibling ones) and comma lists. Anything else throws.

type Combinator = ' ' | '>' | '+' | '~';
interface AttributeSelector {
  name: string;
  op: '' | '=' | '^=' | '$=' | '*=' | '~=';
  value: string;
}
interface Compound {
  tag: string | null;
  id: string | null;
  classes: string[];
  attributes: AttributeSelector[];
  not: Compound[];
}
interface Step {
  combinator: Combinator | null;
  compound: Compound;
}

const IDENT = /[A-Za-z0-9_\u00A0-\uFFFF-]+/y;

function readIdent(source: string, from: number): { text: string; end: number } {
  IDENT.lastIndex = from;
  const match = IDENT.exec(source);
  if (!match) throw new Error(`fake-dom: unsupported selector "${source}" (expected a name at ${from})`);
  return { text: match[0], end: from + match[0].length };
}

function parseCompound(source: string, from: number): { compound: Compound; end: number } {
  const compound: Compound = { tag: null, id: null, classes: [], attributes: [], not: [] };
  let i = from;
  if (source[i] === '*') i += 1;
  else if (/[A-Za-z]/.test(source.charAt(i))) {
    const ident = readIdent(source, i);
    compound.tag = ident.text.toLowerCase();
    i = ident.end;
  }
  for (;;) {
    const ch = source[i];
    if (ch === '#') {
      const ident = readIdent(source, i + 1);
      compound.id = ident.text;
      i = ident.end;
    } else if (ch === '.') {
      const ident = readIdent(source, i + 1);
      compound.classes.push(ident.text);
      i = ident.end;
    } else if (ch === '[') {
      const close = source.indexOf(']', i);
      if (close < 0) throw new Error(`fake-dom: unsupported selector "${source}" (unterminated attribute)`);
      const body = source.slice(i + 1, close).trim();
      const match = /^([A-Za-z_:][\w:.-]*)\s*(?:([~^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?$/.exec(body);
      if (!match) throw new Error(`fake-dom: unsupported attribute selector "[${body}]"`);
      compound.attributes.push({
        name: match[1].toLowerCase(),
        op: (match[2] ?? '') as AttributeSelector['op'],
        value: match[3] ?? match[4] ?? match[5] ?? '',
      });
      i = close + 1;
    } else if (source.startsWith(':not(', i)) {
      const close = source.indexOf(')', i);
      if (close < 0) throw new Error(`fake-dom: unsupported selector "${source}" (unterminated :not)`);
      for (const part of source.slice(i + 5, close).split(',')) {
        const inner = parseCompound(part.trim(), 0);
        if (inner.end !== part.trim().length) throw new Error(`fake-dom: unsupported :not(${part})`);
        compound.not.push(inner.compound);
      }
      i = close + 1;
    } else if (ch === ':') {
      throw new Error(`fake-dom: unsupported pseudo-class in selector "${source}"`);
    } else break;
  }
  if (i === from) throw new Error(`fake-dom: unsupported selector "${source}" (at ${from})`);
  return { compound, end: i };
}

const selectorCache = new Map<string, Step[][]>();

function parseSelectorList(source: string): Step[][] {
  const cached = selectorCache.get(source);
  if (cached) return cached;
  const list: Step[][] = [];
  let current: Step[] = [];
  let pending: Combinator | null = null;
  const text = source.trim();
  let i = 0;
  const finish = (): void => {
    if (current.length === 0 || pending !== null) throw new Error(`fake-dom: unsupported selector "${source}"`);
    list.push(current);
    current = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === ',') {
      finish();
      i += 1;
    } else if (/\s/.test(ch) || ch === '>' || ch === '+' || ch === '~') {
      let sawSpace = false;
      let explicit: Combinator | null = null;
      while (i < text.length && (/\s/.test(text[i]) || '>+~'.includes(text[i]))) {
        if (/\s/.test(text[i])) sawSpace = true;
        else explicit = text[i] as Combinator;
        i += 1;
      }
      pending = explicit ?? (sawSpace ? ' ' : null);
      if (current.length === 0 && explicit !== null) throw new Error(`fake-dom: unsupported leading combinator in "${source}"`);
    } else {
      const { compound, end } = parseCompound(text, i);
      current.push({ combinator: current.length === 0 ? null : (pending ?? ' '), compound });
      pending = null;
      i = end;
    }
  }
  finish();
  selectorCache.set(source, list);
  return list;
}

function matchesCompound(el: FakeElement, compound: Compound): boolean {
  if (compound.tag !== null && el.localName !== compound.tag) return false;
  if (compound.id !== null && el.getAttribute('id') !== compound.id) return false;
  if (compound.classes.length > 0) {
    const classes = (el.getAttribute('class') ?? '').split(/\s+/);
    if (!compound.classes.every((name) => classes.includes(name))) return false;
  }
  for (const { name, op, value } of compound.attributes) {
    const actual = el.getAttribute(name);
    if (actual === null) return false;
    if (op === '=' && actual !== value) return false;
    if (op === '^=' && !(value !== '' && actual.startsWith(value))) return false;
    if (op === '$=' && !(value !== '' && actual.endsWith(value))) return false;
    if (op === '*=' && !(value !== '' && actual.includes(value))) return false;
    if (op === '~=' && !actual.split(/\s+/).includes(value)) return false;
  }
  return !compound.not.some((inner) => matchesCompound(el, inner));
}

function matchesSteps(el: FakeElement, steps: readonly Step[], index = steps.length - 1): boolean {
  const step = steps[index];
  if (!matchesCompound(el, step.compound)) return false;
  if (index === 0) return true;
  switch (step.combinator) {
    case '>': {
      const parent = el.parentElement;
      return parent !== null && matchesSteps(parent, steps, index - 1);
    }
    case '+': {
      const previous = el.previousElementSibling;
      return previous !== null && matchesSteps(previous, steps, index - 1);
    }
    case '~': {
      for (let sibling = el.previousElementSibling; sibling !== null; sibling = sibling.previousElementSibling) {
        if (matchesSteps(sibling, steps, index - 1)) return true;
      }
      return false;
    }
    default: {
      for (let ancestor = el.parentElement; ancestor !== null; ancestor = ancestor.parentElement) {
        if (matchesSteps(ancestor, steps, index - 1)) return true;
      }
      return false;
    }
  }
}

function elementMatches(el: FakeElement, selector: string): boolean {
  return parseSelectorList(selector).some((steps) => matchesSteps(el, steps));
}

function descendants(root: FakeParent): FakeElement[] {
  const found: FakeElement[] = [];
  const walk = (node: FakeParent): void => {
    for (const child of node.childNodes) {
      if (child instanceof FakeElement) {
        found.push(child);
        walk(child);
      }
    }
  };
  walk(root);
  return found;
}

// ---------------------------------------------------------------------------------------------------------------------
// Elements

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Current engines also escape the angle brackets in an attribute value (`title="a &gt; b"`). */
function escapeAttribute(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The text inside these elements is written out as it is, not escaped (the other raw-text elements are not modelled). */
const RAW_TEXT_SERIALIZED = new Set(['script', 'style']);

function serialize(node: FakeNode): string {
  if (node instanceof FakeText) {
    const parent = node.parentElement;
    return parent !== null && RAW_TEXT_SERIALIZED.has(parent.localName) ? node.data : escapeText(node.data);
  }
  if (!(node instanceof FakeElement)) return '';
  const attributes = [...node.attributeEntries()].map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join('');
  if (VOID_ELEMENTS.has(node.localName)) return `<${node.localName}${attributes}>`;
  return `<${node.localName}${attributes}>${node.childNodes.map(serialize).join('')}</${node.localName}>`;
}

/** A short, readable name for an element in a failure message: `<button#id[role=tab]>`. */
export function describeNode(node: FakeNode | null): string {
  if (node === null) return 'null';
  if (!(node instanceof FakeElement)) return node instanceof FakeText ? `#text(${JSON.stringify(node.data)})` : '#document';
  const id = node.getAttribute('id');
  const role = node.getAttribute('role');
  return `<${node.localName}${id ? `#${id}` : ''}${role ? `[role=${role}]` : ''}>`;
}

export class FakeElement extends FakeNode {
  readonly nodeType = 1;
  readonly localName: string;
  readonly childNodes: FakeNode[] = [];
  private readonly attributes = new Map<string, string>();

  constructor(doc: FakeDocument | null, name: string) {
    super(doc);
    this.localName = name.toLowerCase();
  }

  private get doc(): FakeDocument {
    if (this.ownerDocument === null) throw new Error('fake-dom: element has no owner document');
    return this.ownerDocument;
  }

  get tagName(): string {
    return this.localName.toUpperCase();
  }

  // -- attributes

  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null;
  }

  setAttribute(name: string, value: string | number | boolean): void {
    this.attributes.set(name.toLowerCase(), String(value));
    this.ownerDocument?.reconcileFocus();
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name.toLowerCase());
    this.ownerDocument?.reconcileFocus();
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }

  toggleAttribute(name: string, force?: boolean): boolean {
    const next = force ?? !this.hasAttribute(name);
    if (next) {
      if (!this.hasAttribute(name)) this.setAttribute(name, '');
    } else this.removeAttribute(name);
    return next;
  }

  attributeEntries(): Array<[string, string]> {
    return [...this.attributes];
  }

  // -- reflected properties (only the ones the SPA uses)

  get id(): string {
    return this.getAttribute('id') ?? '';
  }

  set id(value: string) {
    this.setAttribute('id', value);
  }

  get className(): string {
    return this.getAttribute('class') ?? '';
  }

  set className(value: string) {
    this.setAttribute('class', value);
  }

  get hidden(): boolean {
    return this.hasAttribute('hidden');
  }

  set hidden(value: boolean) {
    this.toggleAttribute('hidden', value);
  }

  get inert(): boolean {
    return this.hasAttribute('inert');
  }

  set inert(value: boolean) {
    this.toggleAttribute('inert', value);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }

  get href(): string {
    return this.getAttribute('href') ?? '';
  }

  set href(value: string) {
    this.setAttribute('href', value);
  }

  get type(): string {
    return this.getAttribute('type') ?? '';
  }

  set type(value: string) {
    this.setAttribute('type', value);
  }

  /** The IDL value: the attribute when it is an integer, else 0 for the elements that default to 0 (href or not), else -1. */
  get tabIndex(): number {
    const parsed = Number.parseInt(this.getAttribute('tabindex') ?? '', 10);
    if (Number.isInteger(parsed)) return parsed;
    return TAB_INDEX_DEFAULTS_TO_ZERO.has(this.localName) ? 0 : -1;
  }

  set tabIndex(value: number) {
    this.setAttribute('tabindex', String(value));
  }

  // -- tree

  get children(): FakeElement[] {
    return this.childNodes.filter((node): node is FakeElement => node instanceof FakeElement);
  }

  get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  get lastElementChild(): FakeElement | null {
    return this.children.at(-1) ?? null;
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }

  get nextElementSibling(): FakeElement | null {
    for (let node = this.nextSibling; node !== null; node = node.nextSibling) if (node instanceof FakeElement) return node;
    return null;
  }

  get previousElementSibling(): FakeElement | null {
    for (let node = this.previousSibling; node !== null; node = node.previousSibling) if (node instanceof FakeElement) return node;
    return null;
  }

  contains(node: FakeNode | null): boolean {
    for (let up: FakeNode | null = node; up !== null; up = up.parentNode) if (up === this) return true;
    return false;
  }

  appendChild<T extends FakeNode>(node: T): T {
    insertBefore(this, node, null);
    return node;
  }

  insertBefore<T extends FakeNode>(node: T, reference: FakeNode | null): T {
    insertBefore(this, node, reference);
    return node;
  }

  removeChild<T extends FakeNode>(node: T): T {
    if (node.parentNode !== this) throw new Error('fake-dom: NotFoundError, the node is not a child of this node');
    detach(node);
    return node;
  }

  append(...items: Array<FakeNode | string>): void {
    for (const node of this.toNodes(items)) insertBefore(this, node, null);
  }

  prepend(...items: Array<FakeNode | string>): void {
    const first = this.childNodes[0] ?? null;
    for (const node of this.toNodes(items)) insertBefore(this, node, first);
  }

  replaceChildren(...items: Array<FakeNode | string>): void {
    const nodes = this.toNodes(items); // a node that is already a child is taken out first, as in the DOM
    for (const node of nodes) detach(node);
    for (const child of [...this.childNodes]) detach(child);
    for (const node of nodes) insertBefore(this, node, null);
  }

  cloneNode(deep = false): FakeElement {
    const copy = new FakeElement(this.ownerDocument, this.localName);
    for (const [name, value] of this.attributes) copy.setAttribute(name, value);
    if (deep) {
      for (const child of this.childNodes) {
        copy.appendChild(child instanceof FakeElement ? child.cloneNode(true) : new FakeText(this.ownerDocument, child.textContent));
      }
    }
    return copy;
  }

  // -- text and markup

  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value: string) {
    for (const child of [...this.childNodes]) detach(child);
    const text = String(value);
    if (text !== '') this.appendChild(new FakeText(this.ownerDocument, text));
  }

  get innerHTML(): string {
    return this.childNodes.map(serialize).join('');
  }

  set innerHTML(html: string) {
    for (const child of [...this.childNodes]) detach(child);
    parseInto(this, html);
  }

  get outerHTML(): string {
    return serialize(this);
  }

  // -- selectors

  matches(selector: string): boolean {
    return elementMatches(this, selector);
  }

  closest(selector: string): FakeElement | null {
    for (let up: FakeElement | null = this; up !== null; up = up.parentElement) if (up.matches(selector)) return up;
    return null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const lists = parseSelectorList(selector);
    return descendants(this).filter((el) => lists.some((steps) => matchesSteps(el, steps)));
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  // -- focus and activation

  /** Whether the element is displayed: attached, and neither it nor an ancestor has `hidden`. */
  isRendered(): boolean {
    if (!this.isConnected) return false;
    for (let up: FakeElement | null = this; up !== null; up = up.parentElement) if (up.hasAttribute('hidden')) return false;
    return true;
  }

  private isNativelyFocusable(): boolean {
    if (NATIVELY_FOCUSABLE.has(this.localName)) return !(this.localName === 'input' && this.getAttribute('type') === 'hidden');
    return (this.localName === 'a' || this.localName === 'area') && this.hasAttribute('href');
  }

  /** The browser's "focusable area" test: rendered, not inert, not disabled, and focusable natively or by a tabindex. */
  isFocusable(): boolean {
    if (!this.isRendered()) return false;
    for (let up: FakeElement | null = this; up !== null; up = up.parentElement) if (up.hasAttribute('inert')) return false;
    if (CAN_BE_DISABLED.has(this.localName) && this.hasAttribute('disabled')) return false;
    if (Number.isInteger(Number.parseInt(this.getAttribute('tabindex') ?? '', 10))) return true;
    return this.isNativelyFocusable();
  }

  /** Focusable and in the sequential focus order: a negative tabindex is focusable by script, not by Tab. */
  isTabbable(): boolean {
    return this.isFocusable() && this.tabIndex >= 0;
  }

  /** Whether a pointer can land on it: displayed and not inert. */
  isHitTestable(): boolean {
    if (!this.isRendered()) return false;
    for (let up: FakeElement | null = this; up !== null; up = up.parentElement) if (up.hasAttribute('inert')) return false;
    return true;
  }

  focus(_options?: { preventScroll?: boolean }): void {
    if (this.isFocusable()) this.doc.moveFocusTo(this);
  }

  blur(): void {
    if (this.doc.focusedOrNull() === this) this.doc.moveFocusTo(null);
  }

  click(): void {
    if (CAN_BE_DISABLED.has(this.localName) && this.hasAttribute('disabled')) return;
    dispatchClick(this);
  }

  scrollIntoView(): void {
    this.doc.scrolledIntoView.push(this);
  }
}

/** A click, with the one default action the SPA depends on: a link to a `#fragment` changes the location hash. */
export function dispatchClick(target: FakeElement, init: EventInit = {}): FakeEvent {
  const event = new FakeEvent('click', init);
  target.dispatchEvent(event);
  if (!event.defaultPrevented) {
    const href = target.closest('a[href]')?.getAttribute('href') ?? null;
    if (href !== null && href.startsWith('#') && target.ownerDocument?.defaultView) {
      target.ownerDocument.defaultView.location.hash = href;
    }
  }
  return event;
}

// ---------------------------------------------------------------------------------------------------------------------
// Parser: tag soup in, nodes out. It reads what rehype-stringify writes (closed elements, quoted attributes, numeric
// character references) and the shell's index.html; it is not a conforming HTML parser.

const END_TAG = /<\/([A-Za-z][^\s/>]*)[^>]*>/y;
const START_TAG = /<([A-Za-z][^\s/>]*)/y;

function parseInto(container: FakeParent, html: string): void {
  const doc = container instanceof FakeDocument ? container : container.ownerDocument;
  const stack: FakeParent[] = [container];
  const top = (): FakeParent => stack[stack.length - 1];
  const addText = (raw: string): void => {
    if (raw !== '') insertBefore(top(), new FakeText(doc, decodeOnce(raw)), null);
  };
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      addText(html.slice(i));
      break;
    }
    addText(html.slice(i, lt));
    i = lt;
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const end = html.indexOf('>', i);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    if (html[i + 1] === '/') {
      END_TAG.lastIndex = i;
      const end = END_TAG.exec(html);
      if (!end) {
        addText('<');
        i += 1;
        continue;
      }
      const name = end[1].toLowerCase();
      for (let k = stack.length - 1; k > 0; k -= 1) {
        const open = stack[k];
        if (open instanceof FakeElement && open.localName === name) {
          stack.length = k;
          break;
        }
      }
      i += end[0].length;
      continue;
    }
    START_TAG.lastIndex = i;
    const start = START_TAG.exec(html);
    if (!start) {
      addText('<'); // a `<` that opens no tag is text
      i += 1;
      continue;
    }
    let j = i + start[0].length;
    const attributes: Array<[string, string]> = [];
    for (;;) {
      while (j < html.length && /\s/.test(html[j])) j += 1;
      if (j >= html.length) break;
      if (html[j] === '>') {
        j += 1;
        break;
      }
      if (html[j] === '/') {
        j += 1;
        continue;
      }
      const nameFrom = j;
      j += 1;
      while (j < html.length && !/[\s/>=]/.test(html[j])) j += 1;
      const name = html.slice(nameFrom, j).toLowerCase();
      while (j < html.length && /\s/.test(html[j])) j += 1;
      let value = '';
      if (html[j] === '=') {
        j += 1;
        while (j < html.length && /\s/.test(html[j])) j += 1;
        const quote = html[j];
        if (quote === '"' || quote === "'") {
          const end = html.indexOf(quote, j + 1);
          value = html.slice(j + 1, end === -1 ? html.length : end);
          j = end === -1 ? html.length : end + 1;
        } else {
          const from = j;
          while (j < html.length && !/[\s>]/.test(html[j])) j += 1;
          value = html.slice(from, j);
        }
      }
      attributes.push([name, decodeOnce(value)]);
    }
    const tag = start[1].toLowerCase();
    const el = new FakeElement(doc, tag);
    for (const [name, value] of attributes) if (!el.hasAttribute(name)) el.setAttribute(name, value); // the first wins
    insertBefore(top(), el, null);
    if (VOID_ELEMENTS.has(tag)) {
      i = j;
      continue;
    }
    if (RAW_TEXT_ELEMENTS.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, j);
      const text = html.slice(j, close === -1 ? html.length : close);
      if (text !== '') insertBefore(el, new FakeText(doc, tag === 'textarea' || tag === 'title' ? decodeOnce(text) : text), null);
      const end = close === -1 ? -1 : html.indexOf('>', close);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    if ((tag === 'pre' || tag === 'listing') && html[j] === '\n') j += 1; // the parser drops a newline right after <pre>
    stack.push(el);
    i = j;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Document, window, location

export class FakeDocument extends FakeNode {
  readonly nodeType = 9;
  readonly childNodes: FakeNode[] = [];
  readonly scrolledIntoView: FakeElement[] = [];
  title = '';
  private focused: FakeElement | null = null;

  constructor(readonly defaultView: FakeWindow) {
    super(null);
    this.open('<!doctype html><html lang="en"><head></head><body></body></html>');
  }

  protected override eventParent(): FakeEventTarget | null {
    return this.defaultView;
  }

  get textContent(): string {
    return '';
  }

  get documentElement(): FakeElement {
    const html = this.childNodes.find((node): node is FakeElement => node instanceof FakeElement);
    if (!html) throw new Error('fake-dom: the document has no root element');
    return html;
  }

  get body(): FakeElement {
    const existing = this.documentElement.querySelector('body');
    return existing ?? this.documentElement.appendChild(this.createElement('body'));
  }

  get head(): FakeElement {
    const existing = this.documentElement.querySelector('head');
    if (existing !== null) return existing;
    const head = this.createElement('head');
    this.documentElement.prepend(head);
    return head;
  }

  /** Replace the whole document with `html`. A document without a head or a body gets an empty one, as a parser would add. */
  open(html: string): void {
    for (const child of [...this.childNodes]) detach(child);
    this.focused = null;
    parseInto(this, html);
    if (!this.childNodes.some((node) => node instanceof FakeElement)) insertBefore(this, this.createElement('html'), null);
    void this.head;
    void this.body;
  }

  createElement(name: string): FakeElement {
    return new FakeElement(this, name);
  }

  createTextNode(data: string): FakeText {
    return new FakeText(this, data);
  }

  getElementById(id: string): FakeElement | null {
    return descendants(this).find((el) => el.getAttribute('id') === id) ?? null;
  }

  getElementsByName(name: string): FakeElement[] {
    return descendants(this).filter((el) => el.getAttribute('name') === name);
  }

  querySelectorAll(selector: string): FakeElement[] {
    const lists = parseSelectorList(selector);
    return descendants(this).filter((el) => lists.some((steps) => matchesSteps(el, steps)));
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  hasFocus(): boolean {
    return true;
  }

  /** The element that has focus, or <body> when none does (including when the focused one has stopped being focusable). */
  get activeElement(): FakeElement {
    return this.focusedOrNull() ?? this.body;
  }

  /**
   * The focus fix-up: a focused element that has stopped being focusable (hidden, made inert or disabled, moved or
   * removed) has lost focus. It runs after every attribute and tree change, so the fake is eager where the engines are
   * not (Chromium acts at once for the element's own `hidden` and `disabled` and for removal, and at the next rendering
   * update for an inert or hidden ancestor; Firefox acts at the next rendering update, except on removal). The settled
   * result is the same everywhere and is the only thing a widget may rely on. No blur or focusout is fired, because
   * the engines disagree on those too.
   */
  reconcileFocus(): void {
    if (this.focused !== null && !this.focused.isFocusable()) this.focused = null;
  }

  /** The focused element, or null. */
  focusedOrNull(): FakeElement | null {
    this.reconcileFocus();
    return this.focused;
  }

  /** The focus change behind `focus()` and `blur()`: blur and focusout, then focus and focusin, with relatedTarget set. */
  moveFocusTo(next: FakeElement | null): void {
    const previous = this.focusedOrNull();
    if (previous === next) return;
    if (previous !== null) {
      previous.dispatchEvent(new FakeEvent('blur', { relatedTarget: next }));
      previous.dispatchEvent(new FakeEvent('focusout', { relatedTarget: next }));
    }
    this.focused = next;
    if (next !== null) {
      next.dispatchEvent(new FakeEvent('focus', { relatedTarget: previous }));
      next.dispatchEvent(new FakeEvent('focusin', { relatedTarget: previous }));
    }
  }
}

export class FakeLocation {
  readonly base = 'https://spa.test/qa/index.html';
  private current = '';

  constructor(private readonly view: FakeWindow) {}

  get hash(): string {
    return this.current;
  }

  set hash(value: string) {
    this.change(value);
  }

  get href(): string {
    return this.base + this.current;
  }

  /** The SPA only ever replaces the fragment; the rest of the URL is not modelled. */
  replace(url: string): void {
    const hash = url.indexOf('#');
    this.change(hash >= 0 ? url.slice(hash) : '');
  }

  private change(value: string): void {
    const next = value === '' || value === '#' ? '' : value.startsWith('#') ? value : `#${value}`;
    if (next === this.current) return;
    this.current = next;
    queueMicrotask(() => this.view.dispatchEvent(new FakeEvent('hashchange'))); // asynchronous, as in a browser
  }
}

export class FakeWindow extends FakeEventTarget {
  readonly document: FakeDocument;
  readonly location: FakeLocation;
  readonly history = { scrollRestoration: 'auto' };
  readonly scrolls: Array<[number, number]> = [];
  teachingSpa?: unknown;

  constructor() {
    super();
    this.location = new FakeLocation(this);
    this.document = new FakeDocument(this);
  }

  scrollTo(x: number, y: number): void {
    this.scrolls.push([x, y]);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Sequential focus navigation, the keyboard and the pointer

function inDocumentOrder(doc: FakeDocument): FakeElement[] {
  return descendants(doc);
}

/** The elements Tab visits, in order. A positive tabindex would reorder them; the SPA must not use one, so it throws. */
export function tabOrder(doc: FakeDocument): FakeElement[] {
  const tabbable = inDocumentOrder(doc).filter((el) => el.isTabbable());
  const positive = tabbable.find((el) => el.tabIndex > 0);
  if (positive) throw new Error(`fake-dom: positive tabindex is not modelled (${describeNode(positive)})`);
  return tabbable;
}

export interface Modifiers {
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/** An element a keyboard activates natively: a button on Enter and Space, a link on Enter. */
function activatedBy(el: FakeElement, key: string): boolean {
  if (CAN_BE_DISABLED.has(el.localName) && el.hasAttribute('disabled')) return false;
  if (el.localName === 'button') return key === 'Enter' || key === ' ';
  if (el.localName === 'a' && el.hasAttribute('href')) return key === 'Enter';
  return false;
}

export class Keyboard {
  constructor(private readonly doc: FakeDocument) {}

  /**
   * One key press on the focused element: keydown, the default action if keydown was not cancelled, keyup. Returns the
   * keydown event, so a test can ask whether the code under test handled (cancelled) the key.
   */
  press(key: string, modifiers: Modifiers = {}): FakeEvent {
    const init = { key, shiftKey: modifiers.shift, ctrlKey: modifiers.ctrl, altKey: modifiers.alt, metaKey: modifiers.meta };
    const target = this.doc.activeElement;
    const down = new FakeEvent('keydown', init);
    target.dispatchEvent(down);
    if (!down.defaultPrevented) {
      if (key === 'Tab') this.tab(modifiers.shift === true);
      else if (activatedBy(target, key) && key === 'Enter') dispatchClick(target);
    }
    const after = this.doc.activeElement; // the keyup goes to whatever has focus by then
    after.dispatchEvent(new FakeEvent('keyup', init));
    if (key === ' ' && !down.defaultPrevented && after === target && activatedBy(target, key)) dispatchClick(target);
    return down;
  }

  /** The default action of an uncancelled Tab: the next (or previous) tabbable element, or out of the page. */
  private tab(backwards: boolean): void {
    const order = tabOrder(this.doc);
    const current = this.doc.focusedOrNull();
    let next: FakeElement | null;
    if (current === null) next = (backwards ? order.at(-1) : order[0]) ?? null;
    else {
      const flat = inDocumentOrder(this.doc);
      const position = flat.indexOf(current);
      next = backwards
        ? ([...order].reverse().find((el) => flat.indexOf(el) < position) ?? null)
        : (order.find((el) => flat.indexOf(el) > position) ?? null);
    }
    if (next === null) this.doc.moveFocusTo(null); // focus has left the page, for the browser's own interface
    else next.focus();
  }
}

function ancestorsAndSelf(el: FakeElement): FakeElement[] {
  const chain: FakeElement[] = [];
  for (let up: FakeElement | null = el; up !== null; up = up.parentElement) chain.push(up);
  return chain;
}

export class Pointer {
  hovered: FakeElement | null = null;

  constructor(private readonly doc: FakeDocument) {}

  /**
   * Move the pointer onto `target` (or off the page with null). The events are the platform's: over and out bubble;
   * enter and leave do not, and go to every element the pointer crosses into or out of, outermost first on the way in.
   * A hidden, inert or detached element cannot be pointed at, so a test cannot hover something a user could not.
   */
  moveTo(target: FakeElement | null): void {
    if (target !== null && !target.isHitTestable()) {
      throw new Error(`fake-dom: the pointer cannot land on ${describeNode(target)}: it is hidden, inert or detached`);
    }
    const from = this.hovered;
    const leaving = from === null ? [] : ancestorsAndSelf(from);
    const entering = target === null ? [] : ancestorsAndSelf(target);
    if (from !== null) {
      from.dispatchEvent(new FakeEvent('pointerout', { relatedTarget: target }));
      from.dispatchEvent(new FakeEvent('mouseout', { relatedTarget: target }));
    }
    for (const el of leaving) {
      if (entering.includes(el)) continue;
      el.dispatchEvent(new FakeEvent('pointerleave', { relatedTarget: target }));
      el.dispatchEvent(new FakeEvent('mouseleave', { relatedTarget: target }));
    }
    this.hovered = target;
    if (target === null) return;
    target.dispatchEvent(new FakeEvent('pointerover', { relatedTarget: from }));
    target.dispatchEvent(new FakeEvent('mouseover', { relatedTarget: from }));
    for (const el of [...entering].reverse()) {
      if (leaving.includes(el)) continue;
      el.dispatchEvent(new FakeEvent('pointerenter', { relatedTarget: from }));
      el.dispatchEvent(new FakeEvent('mouseenter', { relatedTarget: from }));
    }
    target.dispatchEvent(new FakeEvent('pointermove'));
    target.dispatchEvent(new FakeEvent('mousemove'));
  }

  /** A primary-button click: the pointer arrives, mousedown moves focus (to the nearest focusable ancestor, or nowhere), click follows. */
  click(target: FakeElement): void {
    this.moveTo(target);
    const down = new FakeEvent('pointerdown');
    target.dispatchEvent(down);
    const mousedown = new FakeEvent('mousedown');
    target.dispatchEvent(mousedown);
    if (!mousedown.defaultPrevented) {
      const focusTarget = ancestorsAndSelf(target).find((el) => el.isFocusable()) ?? null;
      this.doc.moveFocusTo(focusTarget);
    }
    target.dispatchEvent(new FakeEvent('pointerup'));
    target.dispatchEvent(new FakeEvent('mouseup'));
    dispatchClick(target);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// A browser to run the shell in

/** `MutationObserver` as far as the built bundle needs it: Vite's module-preload polyfill constructs one and observes. */
export class FakeMutationObserver {
  observe(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

export interface Browser {
  window: FakeWindow;
  document: FakeDocument;
  keyboard: Keyboard;
  pointer: Pointer;
  /** What to stub onto globalThis (vi.stubGlobal) so code that names `window` and `document` bare finds them. */
  globals: Record<string, unknown>;
}

/** A window whose document is `shellHtml` (the real workshop/spa/index.html, in the tests). */
export function createBrowser(shellHtml?: string): Browser {
  const window = new FakeWindow();
  if (shellHtml !== undefined) window.document.open(shellHtml);
  return {
    window,
    document: window.document,
    keyboard: new Keyboard(window.document),
    pointer: new Pointer(window.document),
    globals: { window, document: window.document, MutationObserver: FakeMutationObserver },
  };
}
