// The deck: what turns a rendered segment into a lesson. A segment's slide is one long rendered document; the deck cuts it
// into screens (the opener, then one per h2 section), gives each a kind (the hook, a concept, the live demo, the pitfalls,
// the takeaway), moves between them from the keyboard and the bar, and turns the parts of the document a reader can act on
// into things to act on: a list of named points becomes reveal cards, a code block gets a Copy control, a block of
// box-drawing text becomes a drawn, clickable diagram (content/diagrams.ts). Around it: the bar (where you are, Previous and
// Next, Present, the speaker script), the module strip, the presenter setup panel and the cover, which is also the agenda.
//
// Everything here is built after the interactions have mounted, on the DOM they left, and it moves nodes without removing
// any: an interaction that holds a reference to an element keeps a live one. Nothing here is a route of its own: a module is
// the route main.ts serves (#/<id>), a section is the in-page anchor hash-rewrite.ts scrolls to (the sanitizer's slug, less
// its prefix). The deck mounts only where it can measure a page (IntersectionObserver): the shell's own tests run main.ts in
// DOM doubles that cannot, and get the document as the interactions left it.

import { CLOBBER_PREFIX } from '../content/hash-rewrite';
import { create, leadInLists, listen, textOf } from '../interactions/dom';
import { BACKDROP, PANEL, createModal, type Modal } from '../interactions/modal';
import { hashFor } from './router';
import type { ShellStore } from './state';

export interface DeckSection {
  readonly id: string;
  readonly title: string;
}

export interface DeckSegment {
  readonly id: string;
  readonly title: string;
  readonly minutes: number;
  readonly labRefs: readonly string[];
  readonly module?: string;
  readonly sections?: readonly DeckSection[];
  /** The curriculum's "advanced outcome" for the module, rendered and sanitized at build time. */
  readonly outcomeHtml?: string;
}

export interface DeckWindow {
  location: { hash: string };
}

export interface DeckOptions {
  readonly document: Document;
  readonly window: DeckWindow;
  readonly store: ShellStore;
  readonly segments: readonly DeckSegment[];
  /** Whether the page was opened without naming a module: the cover opens on top of the first one. */
  readonly openCover: boolean;
  /** Whether the segment has a staged reveal, and how many steps it has: Next at the last screen reveals the next one. */
  readonly revealStepsOf: (segmentId: string) => number;
}

export interface Deck {
  /** Cuts the segment that was just rendered into screens and draws the bar, the strip and the pager for it. */
  render(segmentId: string, body: HTMLElement): void;
  /** Closes the cover and the setup panel, the way Escape does. */
  dismiss(): void;
  dispose(): void;
}

type Kind = 'opener' | 'hook' | 'concept' | 'demo' | 'pitfalls' | 'takeaway' | 'next';

const KIND_WORDS: Readonly<Record<Kind, string>> = {
  opener: 'Module',
  hook: 'The problem',
  concept: 'Concept',
  demo: 'Live demo',
  pitfalls: 'Watch out',
  takeaway: 'Takeaway',
  next: 'What comes next',
};

/** What a section is for, from the words the curriculum gave its heading. The first section of every module is the hook. */
function kindOf(index: number, heading: string): Kind {
  const title = heading.toLowerCase();
  if (index === 1) return 'hook';
  if (/live demo|^demo\b/.test(title)) return 'demo';
  if (/anti-pattern|failure mode|trips people up|caveat|gotcha/.test(title)) return 'pitfalls';
  if (/^takeaway/.test(title)) return 'takeaway';
  if (/what'?s next|next steps/.test(title)) return 'next';
  return 'concept';
}

const labName = (ref: string): string => ref.replace(/^labs\//, '').replace(/\.md$/, '');
const label = (segment: DeckSegment): string => (segment.module ? `${segment.module} — ${segment.title}` : segment.title);
const anchorOf = (id: string): string => `#${id.startsWith(CLOBBER_PREFIX) ? id.slice(CLOBBER_PREFIX.length) : id}`;
const isElement = (node: Node, name: string): node is HTMLElement => node.nodeType === 1 && (node as Element).localName === name;

/** Keys the deck moves on, and where it leaves them alone: a widget's own keys, a field, a dialog. */
const KEYS_IGNORED_IN = 'input, select, textarea, [contenteditable], [role="dialog"], [role="tablist"], [role="slider"], [role="group"], [aria-pressed]';

export function mountDeck(options: DeckOptions): Deck | null {
  const { document: doc, window: win, store, segments, openCover, revealStepsOf } = options;
  const host = doc.getElementById('journey');
  const main = doc.getElementById('main');
  const pager = doc.getElementById('segment-pager');
  if (host === null || main === null || pager === null || typeof IntersectionObserver !== 'function' || typeof doc.createElementNS !== 'function') return null;
  const pagerHost: HTMLElement = pager; // the guard above does not narrow inside the hoisted functions below
  const ids = segments.map((segment) => segment.id);
  const byId = (id: string): HTMLElement | null => doc.getElementById(id);
  const position = byId('deck-position');
  const previousButton = byId('slide-prev') as HTMLButtonElement | null;
  const nextButton = byId('slide-next') as HTMLButtonElement | null;
  const nav = byId('segment-nav');
  const removers: Array<() => void> = [];
  let disposed = false;

  // -- the screens of the segment on show

  let screens: HTMLElement[] = [];
  let members: ChildNode[][] = []; // what each screen was cut from: the nodes the staged reveal shows and hides
  let current = 0;
  let segmentId = ids[0];
  let observer: IntersectionObserver | undefined;
  let unfollow: (() => void) | undefined;
  let pending: 'first' | 'last' | null = null; // where a module opened from a Next or a Previous at its edge lands

  const shown = (): HTMLElement[] => screens.filter((screen) => !screen.hidden);

  /**
   * A screen is shown while any of its members is: the staged reveal hides the elements of a section it has not reached, and a
   * wrapper this deck put around one (a code frame, a card block, a drawn diagram) follows the element inside it.
   */
  function follow(): void {
    screens.forEach((screen, index) => {
      if (index === 0) return;
      let any = false;
      for (const member of members[index]) {
        if (!(member instanceof HTMLElement)) continue;
        let shell: HTMLElement = member;
        while (shell.parentElement !== null && shell.parentElement !== screen) shell = shell.parentElement;
        if (shell !== member) shell.hidden = member.hidden;
        if (!member.hidden) any = true;
      }
      screen.hidden = !any;
    });
  }

  function drawPosition(): void {
    const index = Math.max(0, current);
    const segment = segments.find((candidate) => candidate.id === segmentId);
    const code = segment?.module ?? `Module ${ids.indexOf(segmentId) + 1}`;
    if (position) position.textContent = `${code} · Screen ${index + 1} of ${screens.length}`;
    screens.forEach((screen, at) => {
      screen.setAttribute('data-kicker', `${code} · ${at + 1} / ${screens.length} · ${KIND_WORDS[(screen.getAttribute('data-kind') ?? 'concept') as Kind]}`);
    });
    const first = ids.indexOf(segmentId) === 0 && index === 0;
    const last = ids.indexOf(segmentId) === ids.length - 1 && index === screens.length - 1;
    if (previousButton) previousButton.disabled = first;
    if (nextButton) nextButton.disabled = last;
  }

  const revealed = (): number => store.get().segments[segmentId]?.revealedSteps ?? 0;

  function scrollTo(screen: HTMLElement): void {
    current = screens.indexOf(screen);
    const header = screen.querySelector<HTMLButtonElement>(':scope > h2 > button[aria-expanded="false"]');
    header?.click(); // a section the accordion keeps folded: the screen shows it open
    (current === 0 ? main : screen)?.scrollIntoView({ block: 'start' });
    drawPosition();
  }

  /** The next screen; at the last one, the next step of a staged reveal, else the next module. */
  function forward(): void {
    const visible = shown();
    const index = visible.indexOf(screens[current]);
    if (index >= 0 && index < visible.length - 1) {
      scrollTo(visible[index + 1]);
      return;
    }
    const total = revealStepsOf(segmentId);
    if (revealed() < total) {
      const step = revealed() + 1;
      store.update(segmentId, (state) => ({ ...state, revealedSteps: step })); // the reveal follows the store and shows the screen
      const now = shown();
      scrollTo(now[now.length - 1]);
      return;
    }
    const next = ids[ids.indexOf(segmentId) + 1];
    if (next === undefined) return;
    pending = 'first';
    store.navigate(next);
  }

  /** The previous screen; at the first one, the last screen of the previous module. */
  function backward(): void {
    const visible = shown();
    const index = visible.indexOf(screens[current]);
    if (index > 0) {
      scrollTo(visible[index - 1]);
      return;
    }
    const previous = ids[ids.indexOf(segmentId) - 1];
    if (previous === undefined) return;
    pending = 'last';
    store.navigate(previous);
  }

  function watch(): void {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (!hit) return;
        current = screens.indexOf(hit.target as HTMLElement);
        drawPosition();
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const screen of screens) observer.observe(screen);
  }

  // -- the cut: the opener, then one screen per h2

  function cut(body: HTMLElement, segment: DeckSegment): void {
    // Where the sections are: the body, or the accordion's group when that interaction took every h2 into it.
    const hasHeadings = (parent: Element): boolean => Array.from(parent.children).some((child) => child.localName === 'h2');
    const holder = hasHeadings(body) ? body : (Array.from(body.children).find((child) => child.getAttribute('role') === 'group' && hasHeadings(child)) ?? body);
    const groups: ChildNode[][] = [[]];
    if (holder !== body) {
      for (const node of Array.from(body.childNodes)) {
        if (node !== holder) groups[0].push(node); // what stands before the group: the slide's h1, a widget, an intro
      }
    }
    for (const node of Array.from(holder.childNodes)) {
      if (isElement(node, 'h2')) groups.push([node]);
      else if (isElement(node, 'hr')) node.remove(); // a separator between sections: the screens separate them now
      else groups[groups.length - 1].push(node); // before the first h2, the opener's; after one, its section's
    }
    members = groups;
    screens = groups.map((group, index) => {
      const heading = group[0];
      const kind: Kind = index === 0 ? 'opener' : kindOf(index, isElement(heading, 'h2') ? textOf(heading) : '');
      const screen = create(doc, 'section', { class: 'screen', 'data-kind': kind });
      (index === 0 ? body : holder).append(screen);
      screen.append(...group);
      if (index === 0) {
        const head = opener(segment);
        screen.prepend(head);
        const timer = screen.querySelector<HTMLElement>(':scope > [role="group"]:has(> [role="timer"])');
        if (timer) head.querySelector('.opener-kicker')?.after(timer); // the clock first, then what the module is for
      }
      return screen;
    });
    if (holder !== body) body.append(holder); // the opener first, then the group that holds the section screens
  }

  /** What the opener says: where the module sits, what the attendee can do after it, its labs, and its sections. */
  function opener(segment: DeckSegment): HTMLElement {
    const index = ids.indexOf(segment.id);
    const head = create(doc, 'div', { class: 'opener' });
    head.append(create(doc, 'p', { class: 'opener-kicker' }, `Module ${index + 1} of ${ids.length} · ${segment.minutes} minutes`));
    if (segment.outcomeHtml) {
      const outcome = create(doc, 'div', { class: 'opener-outcome' });
      outcome.innerHTML = segment.outcomeHtml; // sanitized by the content pipeline at build time, as the slide is
      head.append(create(doc, 'p', { class: 'opener-label' }, 'After this module you can'), outcome);
    }
    const sections = segment.sections ?? [];
    if (sections.length > 0) {
      const list = create(
        doc,
        'ol',
        { class: 'opener-outline' },
        ...sections.map((section, at) => create(doc, 'li', {}, create(doc, 'button', { type: 'button', class: 'opener-jump', 'data-screen': String(at + 1) }, section.title))),
      );
      head.append(create(doc, 'p', { class: 'opener-label' }, 'In this module'), list);
    }
    if (segment.labRefs.length > 0) {
      head.append(
        create(doc, 'p', { class: 'opener-label' }, 'Anchor labs, for after the session'),
        create(doc, 'p', { class: 'opener-labs' }, ...segment.labRefs.map((ref) => create(doc, 'span', { class: 'chip' }, labName(ref)))),
      );
    }
    return head;
  }

  // -- what the document holds that a reader can act on

  /** A list of named points, not taken by an interaction, becomes reveal cards: the name shows, the point is a click away. */
  function cards(body: HTMLElement): void {
    for (const { list, items, leadIns } of leadInLists(body)) {
      if (items.length < 2 || items.length > 8 || list.closest('[role="group"], [role="tabpanel"], [aria-roledescription]') !== null) continue;
      if (list.id !== '' && body.querySelector(`[aria-describedby~="${list.id}"]`) !== null) continue; // a diagram's long description stays as written
      list.setAttribute('class', 'cards');
      const block = create(doc, 'div', { class: 'cards-block' });
      list.before(block);
      block.append(list); // the list and its control travel together, and follow the list when a reveal hides it
      items.forEach((item, index) => {
        const leadIn = leadIns[index];
        const rest = Array.from(item.childNodes).filter((node) => node !== leadIn);
        const detail = create(doc, 'div', { class: 'card-detail', hidden: '' }, ...rest);
        const button = create(doc, 'button', { type: 'button', class: 'card-face', 'aria-expanded': 'false' }, create(doc, 'span', { class: 'card-name' }, ...Array.from(leadIn.childNodes)));
        leadIn.replaceWith(button);
        item.replaceChildren(button, detail);
        item.setAttribute('class', 'card');
        removers.push(
          listen(button, 'click', () => {
            const open = detail.hidden;
            detail.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
          }),
        );
      });
      const all = create(doc, 'button', { type: 'button', class: 'cards-all' }, 'Reveal all');
      block.prepend(all);
      removers.push(
        listen(all, 'click', () => {
          const open = all.textContent === 'Reveal all';
          for (const item of items) {
            (item.lastElementChild as HTMLElement).hidden = !open;
            item.firstElementChild?.setAttribute('aria-expanded', String(open));
          }
          all.textContent = open ? 'Hide all' : 'Reveal all';
        }),
      );
    }
  }

  /** A code block gets a Copy control, for the live demo. */
  function copyButtons(body: HTMLElement): void {
    for (const block of Array.from(body.querySelectorAll<HTMLElement>('pre'))) {
      if (block.closest('figure, [role="dialog"]') !== null) continue;
      const frame = create(doc, 'div', { class: 'code' });
      block.before(frame);
      const button = create(doc, 'button', { type: 'button', class: 'code-copy' }, 'Copy');
      frame.append(button, block);
      removers.push(
        listen(button, 'click', () => {
          const text = block.textContent ?? '';
          const done = () => {
            button.textContent = 'Copied';
            setTimeout(() => {
              button.textContent = 'Copy';
            }, 1500);
          };
          const clipboard = (globalThis as { navigator?: { clipboard?: { writeText(text: string): Promise<void> } } }).navigator?.clipboard;
          if (clipboard) clipboard.writeText(text).then(done, () => undefined);
        }),
      );
    }
  }

  // -- the bar, the strip and the pager

  function drawStrip(): void {
    if (nav === null) return;
    for (const link of Array.from(nav.querySelectorAll('a'))) {
      const segment = segments.find((candidate) => hashFor(candidate.id) === link.getAttribute('href'));
      if (segment && !link.hasAttribute('title')) link.setAttribute('title', `${label(segment)} · ${segment.minutes} min`);
    }
  }

  function drawPager(index: number): void {
    const card = (target: DeckSegment, kicker: string, kind: string): HTMLElement =>
      create(doc, 'a', { class: `pager-link ${kind}`, href: hashFor(target.id) }, create(doc, 'span', { class: 'pager-kicker' }, kicker), create(doc, 'span', { class: 'pager-title' }, label(target)));
    const before = segments[index - 1];
    const after = segments[index + 1];
    const cards: HTMLElement[] = [];
    if (before !== undefined) cards.push(card(before, 'Previous module', 'pager-prev'));
    if (after !== undefined) cards.push(card(after, 'Up next', 'pager-next'));
    else cards.push(create(doc, 'p', { class: 'pager-end' }, 'That was the last module. ', create(doc, 'a', { href: hashFor(ids[0]) }, 'Back to the first module')));
    pagerHost.replaceChildren(...cards);
  }

  // -- the presenter setup panel: a dropdown under the bar

  const setupToggle = byId('present-setup-toggle');
  const setupPanel = byId('present-options');
  function setSetup(open: boolean): void {
    if (setupToggle === null || setupPanel === null) return;
    setupPanel.setAttribute('class', open ? 'setup-panel is-open' : 'setup-panel');
    setupToggle.setAttribute('aria-expanded', String(open));
  }
  if (setupToggle !== null) removers.push(listen(setupToggle, 'click', () => setSetup(setupToggle.getAttribute('aria-expanded') !== 'true')));

  // -- the cover, which is the agenda

  let cover: Modal | null = null;
  const agendaButton = byId('agenda-open');
  const agendaItems: HTMLElement[] = [];
  if (agendaButton !== null && typeof doc.body?.contains === 'function') {
    const closeButton = create(doc, 'button', { type: 'button', class: 'dialog-close' }, 'Close');
    const title = byId('brand-title')?.textContent?.trim() || 'Agenda';
    const tagline = byId('brand-tagline')?.textContent?.trim() ?? '';
    const total = segments.reduce((sum, segment) => sum + segment.minutes, 0);
    const labs = new Set(segments.flatMap((segment) => segment.labRefs)).size;
    const start = create(doc, 'button', { type: 'button', class: 'cover-start' }, 'Start the workshop');
    const script = create(doc, 'button', { type: 'button', class: 'button' }, 'Open the speaker script');
    const present = create(doc, 'button', { type: 'button', class: 'button' }, 'Present fullscreen');
    segments.forEach((segment, index) => {
      const item = create(
        doc,
        'li',
        { class: 'agenda-item' },
        create(
          doc,
          'a',
          { class: 'agenda-link', href: hashFor(segment.id) },
          create(doc, 'span', { class: 'agenda-code' }, segment.module ?? String(index + 1)),
          create(doc, 'span', { class: 'agenda-name' }, segment.title),
          create(doc, 'span', { class: 'agenda-minutes' }, `${segment.minutes} min`),
        ),
      );
      const sections = segment.sections ?? [];
      if (sections.length > 0) {
        item.append(
          create(
            doc,
            'ol',
            { class: 'agenda-sections' },
            ...sections.map((section) => create(doc, 'li', {}, create(doc, 'a', { href: hashFor(segment.id), 'data-segment': segment.id, 'data-section': section.id }, section.title))),
          ),
        );
      }
      agendaItems.push(item);
    });
    const dialog = create(
      doc,
      'div',
      { id: 'agenda', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'agenda-title', hidden: '', style: BACKDROP },
      create(
        doc,
        'div',
        { class: 'dialog-panel cover', style: `${PANEL}; max-width: 68rem` },
        create(doc, 'div', { class: 'dialog-head' }, create(doc, 'p', { class: 'cover-kicker' }, 'Workshop'), closeButton),
        create(doc, 'h2', { id: 'agenda-title', class: 'cover-title' }, title),
        create(doc, 'p', { class: 'cover-tagline' }, tagline),
        create(doc, 'p', { class: 'cover-stats' }, `${segments.length} modules · ${total} minutes of teaching · ${labs} anchor labs to take home`),
        create(doc, 'div', { class: 'cover-actions' }, start, script, present),
        create(doc, 'p', { class: 'cover-label' }, 'Agenda'),
        create(doc, 'ol', { class: 'agenda-list' }, ...agendaItems),
      ),
    );
    host.append(dialog);
    agendaButton.setAttribute('aria-controls', 'agenda');
    const modal = createModal(doc, dialog, { initialFocus: () => start, returnTo: () => agendaButton });
    cover = modal;
    const proxy = (id: string) => (): void => {
      modal.close();
      byId(id)?.click(); // within the user's own click: the activation it carries is what fullscreen and a window need
    };
    removers.push(
      listen(agendaButton, 'click', modal.open),
      listen(closeButton, 'click', modal.close),
      listen(start, 'click', () => {
        modal.close();
        main.focus?.({ preventScroll: true });
      }),
      listen(script, 'click', proxy('present-script-open')),
      listen(present, 'click', proxy('present-start')),
      listen(dialog, 'click', (event) => {
        const link = (event.target as Element | null)?.closest?.('a[href]');
        if (!link) return;
        modal.close();
        const target = link.getAttribute('data-segment');
        const section = link.getAttribute('data-section');
        if (target === null || section === null) return; // a module: the browser follows the link, the route opens its opener
        event.preventDefault();
        store.navigate(target);
        win.location.hash = anchorOf(section); // the in-page anchor: hash-rewrite.ts scrolls, main.ts settles the address
      }),
    );
    if (openCover) modal.open();
  }

  // -- keys: the arrows and the page keys move between screens, except where a widget or a field has them

  removers.push(
    listen(doc, 'keydown', (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as Element | null;
      if (target?.closest?.(KEYS_IGNORED_IN)) return;
      if (event.key === 'Escape') {
        if (setupPanel?.getAttribute('class')?.includes('is-open')) setSetup(false);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        forward();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        backward();
      }
    }),
  );
  if (previousButton) removers.push(listen(previousButton, 'click', backward));
  if (nextButton) removers.push(listen(nextButton, 'click', forward));
  removers.push(
    listen(main, 'click', (event) => {
      const jump = (event.target as Element | null)?.closest?.('button.opener-jump');
      const at = Number(jump?.getAttribute('data-screen'));
      if (!jump || !Number.isInteger(at) || screens[at] === undefined) return;
      const total = revealStepsOf(segmentId);
      if (total > 0 && revealed() < at) store.update(segmentId, (state) => ({ ...state, revealedSteps: at })); // a staged section: revealed up to it first
      scrollTo(screens[at]);
    }),
  );

  // The bar wraps as the window narrows; what it takes is measured, so that --bar-h (the screens' height, the scroll
  // padding that keeps a focused element clear of it) is what it is, not what it was assumed to be.
  let sizer: ResizeObserver | undefined;
  if (typeof ResizeObserver === 'function') {
    const measure = (): void => doc.documentElement.style.setProperty('--bar-h', `${Math.ceil(host.getBoundingClientRect().height)}px`);
    sizer = new ResizeObserver(measure);
    sizer.observe(host);
    measure();
  }

  function render(id: string, body: HTMLElement): void {
    if (disposed) return;
    const segment = segments.find((candidate) => candidate.id === id);
    if (segment === undefined) return;
    segmentId = id;
    cut(body, segment);
    cards(body);
    copyButtons(body);
    follow();
    unfollow?.();
    unfollow = store.subscribe(() => follow()); // after the reveal's own subscription, which was made when it mounted
    drawStrip();
    drawPager(ids.indexOf(id));
    agendaItems.forEach((item, index) => {
      if (index === ids.indexOf(id)) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    current = 0;
    watch();
    drawPosition();
    if (pending === 'last') {
      const visible = shown();
      scrollTo(visible[visible.length - 1]);
    }
    pending = null;
  }

  return {
    render,
    dismiss(): void {
      cover?.close();
      setSetup(false);
    },
    dispose(): void {
      disposed = true;
      observer?.disconnect();
      sizer?.disconnect();
      unfollow?.();
      cover?.dispose();
      removers.forEach((remove) => remove());
    },
  };
}
