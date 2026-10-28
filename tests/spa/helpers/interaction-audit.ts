// The AC6 audit (specs/005-teaching-spa.md section 2.4): the role set and states each interaction pattern requires, read
// from the DOM the way assistive technology would, as a list of what is wrong. An empty list means the inventory id is
// present in the DOM and carries them. Beside it sits the AC19 audit of the long description a chart or diagram declares
// (section 2.4, "Complex visuals", F109), which auditInteraction applies to every entry that needs one.
//
// This module is pure. It touches the DOM only through the narrow surface the fake DOM (helpers/fake-dom.ts) and a real
// browser have in common (getElementById, getAttribute, hasAttribute, hidden, matches, querySelector(All), contains,
// textContent, childNodes, children, firstElementChild, parentElement, localName), and it imports the fake DOM for its
// types alone. That is what lets interactions-browser-check.mjs bundle this file and run the very same audit in
// Chromium and Firefox.

import type { FakeDocument, FakeElement } from './fake-dom';

/** One entry of workshop/spa/content/interactions.json. */
export interface InventoryEntry {
  id: string;
  pattern: string;
  segment: string;
  label: string;
  keys: string[];
  statusRegion: boolean;
  longDescriptionId?: string;
  dataset?: string;
}

const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
const NATIVELY_FOCUSABLE = new Set(['a', 'button', 'input', 'select', 'textarea']);

function text(el: FakeElement): string {
  return el.textContent.replace(/\s+/g, ' ').trim();
}

/** The name from `aria-labelledby` or `aria-label` (the two a role such as tablist or dialog takes its name from). */
export function ariaName(el: FakeElement, doc: FakeDocument): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy !== null) {
    return labelledBy
      .split(/\s+/)
      .filter((id) => id !== '')
      .map((id) => (doc.getElementById(id) === null ? '' : text(doc.getElementById(id) as FakeElement)))
      .join(' ')
      .trim();
  }
  return (el.getAttribute('aria-label') ?? '').trim();
}

/** The name of an element whose role takes it from content as well (a button, a tab, a heading). */
export function contentName(el: FakeElement, doc: FakeDocument): string {
  return ariaName(el, doc) || text(el);
}

export function within(root: FakeElement, selector: string): FakeElement[] {
  return [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
}

function firstContentIsFocusable(panel: FakeElement): boolean {
  const first = panel.firstElementChild;
  return first !== null && (NATIVELY_FOCUSABLE.has(first.localName) || first.hasAttribute('tabindex'));
}

/**
 * The patterns whose entries must declare a long description (AC19): the chart and the diagram, which the table of section 2.4
 * makes complex images, and the carousel and the timer, because child issue 5 of section 7 builds all four "each with a long
 * description".
 */
const LONG_DESCRIPTION_PATTERNS = new Set(['parameter-chart', 'node-diagram', 'carousel', 'segment-timer']);

const HIDING_STYLE = /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i;

/** What takes an element out of reach of a reader (`hidden`, `inert`, `aria-hidden`, an inline display:none or visibility:hidden), on it or on an ancestor. */
function unreachableBecause(el: FakeElement): string | null {
  for (let node: FakeElement | null = el; node !== null; node = node.parentElement) {
    const where = node === el ? 'it' : `its ancestor <${node.localName}>`;
    if (node.hidden) return `${where} is hidden`;
    if (node.hasAttribute('inert')) return `${where} is inert`;
    if (node.getAttribute('aria-hidden') === 'true') return `${where} is aria-hidden`;
    if (HIDING_STYLE.test(node.getAttribute('style') ?? '')) return `${where} is styled out of the page`;
  }
  return null;
}

function numeric(el: FakeElement, attribute: string): number {
  const raw = el.getAttribute(attribute);
  return raw === null || raw.trim() === '' ? Number.NaN : Number(raw);
}

/**
 * AC19, F109: a complex image needs a short description (here the accessible name) plus a long description, the textual
 * representation of what the image conveys, structurally associated with it (F109 allows one adjacent to the image). For
 * one inventory entry that means: the entry declares the id, one element with exactly that id is in the DOM, it says
 * something that is not just the name, a reader can reach it and the chart or diagram points at it with aria-describedby.
 */
export function auditLongDescription(doc: FakeDocument, entry: InventoryEntry): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => void problems.push(`#${entry.id} (${entry.pattern}): ${message}`);
  const root = doc.getElementById(entry.id);
  if (root === null) {
    fail('the id is not in the DOM');
    return problems;
  }
  const name = ariaName(root, doc);
  if (name === '') fail('has no short description: it has no accessible name');
  const id = entry.longDescriptionId;
  if (id === undefined || id.trim() === '') {
    fail('declares no longDescriptionId, and each of the chart, diagram, carousel and timer must (AC19, issue 5)');
    return problems;
  }
  const holders = doc.querySelectorAll(`[id="${id}"]`);
  if (holders.length === 0) {
    fail(`the long description #${id} is not in the DOM`);
    return problems;
  }
  if (holders.length > 1) fail(`the id ${id} is on ${holders.length} elements, so the long description is ambiguous`);
  const description = holders[0];
  const words = text(description);
  if (words === '') fail(`the long description #${id} is empty`);
  else if (words.toLowerCase() === name.toLowerCase()) fail(`the long description #${id} only repeats the short description`);
  const unreachable = unreachableBecause(description);
  if (unreachable !== null) fail(`the long description #${id} is not reachable: ${unreachable}`);
  if (!(root.getAttribute('aria-describedby') ?? '').split(/\s+/).includes(id)) {
    fail(`it is not aria-describedby #${id}, so nothing associates the long description with it`);
  }
  return problems;
}

export function auditInteraction(doc: FakeDocument, entry: InventoryEntry): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => void problems.push(`#${entry.id} (${entry.pattern}): ${message}`);
  const root = doc.getElementById(entry.id);
  if (root === null) {
    fail('the id is not in the DOM');
    return problems;
  }
  const all = (selector: string): FakeElement[] => within(root, selector);
  const target = (el: FakeElement, attribute: string): FakeElement | null => {
    const id = el.getAttribute(attribute);
    return id === null ? null : doc.getElementById(id);
  };
  const isBoolean = (el: FakeElement, attribute: string): boolean => ['true', 'false'].includes(el.getAttribute(attribute) ?? '');

  if (entry.statusRegion) {
    const region = doc.getElementById('live-region');
    if (region === null || region.getAttribute('role') !== 'status' || region.getAttribute('aria-live') !== 'polite') {
      fail('statusRegion is true but the shell has no polite status region to announce to');
    }
  }

  switch (entry.pattern) {
    case 'tabs': {
      const lists = all('[role="tablist"]');
      const tabs = all('[role="tab"]');
      const panels = all('[role="tabpanel"]');
      if (lists.length !== 1) fail(`expected one tablist, found ${lists.length}`);
      else {
        if (ariaName(lists[0], doc) !== entry.label) fail(`the tablist is named "${ariaName(lists[0], doc)}", not "${entry.label}"`);
        if (lists[0].getAttribute('aria-orientation') === 'vertical') fail('aria-orientation=vertical on a horizontal tablist');
        for (const tab of tabs) if (!lists[0].contains(tab)) fail(`${tab.id} is a tab outside the tablist`);
      }
      if (tabs.length < 2) fail(`expected at least two tabs, found ${tabs.length}`);
      if (panels.length !== tabs.length) fail(`${tabs.length} tabs but ${panels.length} tabpanels`);
      const selected = tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true');
      if (selected.length !== 1) fail(`expected exactly one aria-selected=true tab, found ${selected.length}`);
      for (const tab of tabs) {
        if (!isBoolean(tab, 'aria-selected')) fail(`${tab.id} has no aria-selected true/false`);
        const panel = target(tab, 'aria-controls');
        if (panel === null || panel.getAttribute('role') !== 'tabpanel') fail(`${tab.id} has no aria-controls pointing at a tabpanel`);
        else {
          if (panel.getAttribute('aria-labelledby') !== tab.id) fail(`${panel.id} is not aria-labelledby its tab ${tab.id}`);
          const active = tab.getAttribute('aria-selected') === 'true';
          if (panel.hidden === active) fail(`${panel.id} is ${panel.hidden ? 'hidden' : 'shown'} but its tab is aria-selected=${active}`);
          if (active && !firstContentIsFocusable(panel) && panel.getAttribute('tabindex') !== '0') {
            fail(`${panel.id} has no tabindex=0 although its first content is not focusable`);
          }
        }
        const expectedTabindex = tab.getAttribute('aria-selected') === 'true' ? '0' : '-1';
        if (tab.getAttribute('tabindex') !== expectedTabindex) fail(`${tab.id} has tabindex ${tab.getAttribute('tabindex')}, expected ${expectedTabindex} (roving)`);
      }
      for (const panel of panels) if (panel.getAttribute('aria-labelledby') === null) fail(`${panel.id} has no aria-labelledby`);
      break;
    }

    case 'accordion': {
      if (root.getAttribute('role') !== 'group' || ariaName(root, doc) !== entry.label) {
        fail(`the root is not a role=group named "${entry.label}"`);
      }
      const headings = all(HEADING).filter((heading) => heading.querySelector('button') !== null);
      if (headings.length < 2) fail(`expected at least two accordion headings, found ${headings.length}`);
      const expanded: FakeElement[] = [];
      for (const heading of headings) {
        const buttons = heading.querySelectorAll('button');
        if (heading.getAttribute('role') === 'heading' && !/^[1-9]\d*$/.test(heading.getAttribute('aria-level') ?? '')) {
          fail(`${heading.id} has role=heading without an aria-level`);
        }
        const only = heading.childNodes.length === 1 && heading.firstElementChild === buttons[0];
        if (!only) fail(`the button of ${heading.id || 'a heading'} is not the only child of the heading`);
        const button = buttons[0];
        if (!isBoolean(button, 'aria-expanded')) fail(`${button.id} has no aria-expanded true/false`);
        if (contentName(button, doc) === '') fail(`${button.id} has no name`);
        const panel = target(button, 'aria-controls');
        if (panel === null) fail(`${button.id} has no aria-controls pointing at its panel`);
        else if (panel.hidden === (button.getAttribute('aria-expanded') === 'true')) {
          fail(`${panel.id} is ${panel.hidden ? 'hidden' : 'shown'} but ${button.id} says aria-expanded=${button.getAttribute('aria-expanded')}`);
        }
        if (button.getAttribute('aria-expanded') === 'true') expanded.push(button);
        const disabled = button.getAttribute('aria-disabled');
        if (disabled !== null && (disabled !== 'true' || button.getAttribute('aria-expanded') !== 'true')) {
          fail(`${button.id} has aria-disabled="${disabled}": only an expanded header that cannot collapse takes aria-disabled=true`);
        }
        if (button.hasAttribute('disabled')) fail(`${button.id} is disabled: it must stay in the tab order (use aria-disabled)`);
      }
      if (expanded.length === 1 && expanded[0].getAttribute('aria-disabled') !== 'true') {
        fail('the only open panel cannot be collapsed but its header lacks aria-disabled=true');
      }
      break;
    }

    case 'dialog': {
      const dialogs = all('[role="dialog"]');
      if (dialogs.length !== 1) {
        fail(`expected one role=dialog, found ${dialogs.length}`);
        break;
      }
      const dialog = dialogs[0];
      if (dialog.getAttribute('aria-modal') !== 'true') fail('the dialog is not aria-modal=true');
      if (ariaName(dialog, doc) !== entry.label) fail(`the dialog is named "${ariaName(dialog, doc)}", not "${entry.label}"`);
      if (dialog.querySelectorAll('button').length === 0) fail('the dialog has no operating control (a close button) as a descendant');
      const triggers = all('button').filter((button) => !dialog.contains(button) && button.getAttribute('aria-controls') === dialog.id);
      if (triggers.length !== 1) fail(`expected one trigger button with aria-controls="${dialog.id}", found ${triggers.length}`);
      else {
        if (triggers[0].getAttribute('aria-haspopup') !== 'dialog') fail('the trigger lacks aria-haspopup="dialog"');
        if (contentName(triggers[0], doc) !== entry.label) fail(`the trigger is named "${contentName(triggers[0], doc)}", not "${entry.label}"`);
      }
      break;
    }

    case 'staged-reveal': {
      if (root.getAttribute('role') !== 'group' || ariaName(root, doc) !== entry.label) {
        fail(`the root is not a role=group named "${entry.label}"`);
      }
      const buttons = all('button');
      if (buttons.length < 2) fail(`expected previous and next buttons, found ${buttons.length}`);
      for (const button of buttons) if (contentName(button, doc) === '') fail('a stage control has no name');
      if (!/\b\d+\b.*\b\d+\b/.test(text(root))) fail('the control does not show the current stage and the number of stages');
      break;
    }

    case 'disclosure-popover': {
      const triggers = all('button[aria-expanded]');
      if (triggers.length !== 1) {
        fail(`expected one trigger button with aria-expanded, found ${triggers.length}`);
        break;
      }
      const trigger = triggers[0];
      if (!isBoolean(trigger, 'aria-expanded')) fail('the trigger has no aria-expanded true/false');
      if (contentName(trigger, doc) !== entry.label) fail(`the trigger is named "${contentName(trigger, doc)}", not "${entry.label}"`);
      const popover = target(trigger, 'aria-controls');
      if (popover === null) fail('the trigger has no aria-controls pointing at the popover');
      else {
        if (!root.contains(popover)) fail('the popover is not inside the interaction, so moving onto it would leave the hover target');
        if (popover.hidden === (trigger.getAttribute('aria-expanded') === 'true')) fail('the popover visibility disagrees with aria-expanded');
      }
      break;
    }

    case 'parameter-chart': {
      if (root.getAttribute('role') !== 'group' || ariaName(root, doc) !== entry.label) {
        fail(`the root is not a role=group named "${entry.label}"`);
      }
      const sliders = all('[role="slider"]');
      if (sliders.length === 0) fail('no parameter can be set: expected a role=slider for each parameter (F83)');
      for (const slider of sliders) {
        const who = slider.id || 'a slider';
        if (ariaName(slider, doc) === '') fail(`${who} has no accessible name (a slider takes its name from the author)`);
        if (slider.getAttribute('tabindex') !== '0') fail(`${who} is not in the tab order (tabindex=0), so the keyboard cannot reach it (F83)`);
        const [low, high, now] = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'].map((attribute) => numeric(slider, attribute));
        if (![low, high, now].every(Number.isFinite)) fail(`${who} lacks a numeric aria-valuemin, aria-valuemax and aria-valuenow`);
        else if (!(low < high) || now < low || now > high) fail(`${who} has aria-valuenow ${now} outside ${low}..${high}`);
        const steppers = all('button').filter((button) => button.getAttribute('aria-controls') === slider.id);
        if (steppers.length < 2) fail(`${who} has no single-pointer way to set it: expected a decrease and an increase button with aria-controls="${slider.id}" (F88)`);
        for (const stepper of steppers) if (contentName(stepper, doc) === '') fail(`a step button of ${who} has no name`);
      }
      break;
    }

    case 'node-diagram': {
      if (root.getAttribute('role') !== 'group' || ariaName(root, doc) !== entry.label) {
        fail(`the root is not a role=group named "${entry.label}"`);
      }
      const nodes = all('button');
      if (nodes.length < 2) fail(`expected at least two diagram nodes, found ${nodes.length}`);
      const selected = nodes.filter((node) => node.getAttribute('aria-pressed') === 'true');
      if (selected.length !== 1) fail(`expected exactly one selected node (aria-pressed=true), found ${selected.length}`);
      const inTabOrder = nodes.filter((node) => node.getAttribute('tabindex') !== '-1');
      if (inTabOrder.length !== 1) fail(`expected exactly one node in the tab order (roving tabindex), found ${inTabOrder.length}`);
      for (const node of nodes) {
        if (!isBoolean(node, 'aria-pressed')) fail(`${node.id || 'a node'} does not expose its selected state with aria-pressed true/false (F91)`);
        if (contentName(node, doc) === '') fail(`${node.id || 'a node'} has no name`);
        const details = target(node, 'aria-controls');
        if (details === null) fail(`${node.id || 'a node'} has no aria-controls pointing at the details it shows`);
        else if (unreachableBecause(details) !== null) fail(`the details ${details.id} are not visible: ${unreachableBecause(details)}`);
        else if (text(details) === '') fail(`the details ${details.id} are empty`);
      }
      break;
    }

    case 'carousel': {
      if (!['region', 'group'].includes(root.getAttribute('role') ?? '') || root.getAttribute('aria-roledescription') !== 'carousel') {
        fail('the container is not a role=region or role=group with aria-roledescription="carousel" (F100)');
      }
      if (ariaName(root, doc) !== entry.label) fail(`the carousel is named "${ariaName(root, doc)}", not "${entry.label}"`);
      const slides = all('[aria-roledescription="slide"]');
      if (slides.length < 2) fail(`expected at least two slides, found ${slides.length}`);
      const wrapper = slides.length === 0 ? null : slides[0].parentElement;
      for (const slide of slides) {
        if (slide.getAttribute('role') !== 'group') fail('a slide is not a role=group');
        if (ariaName(slide, doc) === '') fail('a slide has no accessible name (a form such as "3 of 10" will do)');
        if (slide.parentElement !== wrapper) fail('the slides do not share one wrapper');
      }
      if (wrapper !== null) {
        for (const child of [...wrapper.children]) if (child.getAttribute('aria-roledescription') !== 'slide') fail(`the slide wrapper holds a <${child.localName}> that is not a slide`);
        if (wrapper.getAttribute('aria-live') !== 'polite') fail(`the slide wrapper is aria-live="${wrapper.getAttribute('aria-live')}": nothing rotates it, so it must be polite (F100)`);
        if (slides.filter((slide) => !slide.hidden).length !== 1) fail('expected exactly one slide shown at a time');
        const buttons = all('button');
        if (buttons.length < 2) fail(`expected previous and next buttons, found ${buttons.length} (F99)`);
        for (const button of buttons) {
          if (contentName(button, doc) === '') fail('a slide control has no name');
          if (button.getAttribute('aria-controls') !== wrapper.id || wrapper.id === '') fail(`a slide control has no aria-controls pointing at the slide wrapper`);
        }
        if (buttons.some((button) => wrapper.contains(button))) fail('a slide control sits inside the live slide wrapper, so its caption would be announced');
      }
      break;
    }

    case 'segment-timer': {
      if (root.getAttribute('role') !== 'group' || ariaName(root, doc) !== entry.label) {
        fail(`the root is not a role=group named "${entry.label}"`);
      }
      const buttons = all('button');
      for (const button of buttons) if (contentName(button, doc) === '') fail('a timer control has no name');
      for (const control of ['start', 'pause', 'stop', 'reset']) {
        if (!buttons.some((button) => contentName(button, doc).toLowerCase().startsWith(control))) fail(`no ${control} control (F108)`);
      }
      const clocks = all('[role="timer"]');
      if (clocks.length !== 1) fail(`expected one role=timer, found ${clocks.length}`);
      else {
        if (ariaName(clocks[0], doc) === '') fail('the clock has no accessible name');
        if (!/\b\d+:\d{2}\b/.test(text(clocks[0]))) fail('the clock does not show the time as minutes:seconds');
      }
      break;
    }

    default:
      fail(`no audit exists for pattern "${entry.pattern}"`);
  }
  if (LONG_DESCRIPTION_PATTERNS.has(entry.pattern) || entry.longDescriptionId !== undefined) problems.push(...auditLongDescription(doc, entry));
  return problems;
}
