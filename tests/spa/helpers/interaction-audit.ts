// The AC6 audit (specs/005-teaching-spa.md section 2.4): the role set and states each interaction pattern requires, read
// from the DOM the way assistive technology would, as a list of what is wrong. An empty list means the inventory id is
// present in the DOM and carries them.
//
// This module is pure. It touches the DOM only through the narrow surface the fake DOM (helpers/fake-dom.ts) and a real
// browser have in common (getElementById, getAttribute, hasAttribute, hidden, matches, querySelector(All), contains,
// textContent, childNodes, firstElementChild, localName), and it imports the fake DOM for its types alone. That is what
// lets interactions-browser-check.mjs bundle this file and run the very same audit in Chromium and Firefox.

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

    default:
      fail(`no audit exists for pattern "${entry.pattern}"`);
  }
  return problems;
}
