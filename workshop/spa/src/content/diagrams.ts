// Drawn diagrams for what the slides carry as blocks of box-drawing text. A directory tree drawn in text becomes an explorer
// (folders fold, every entry keeps its note); a flow drawn in boxes and arrows becomes a drawing with clickable nodes and a
// step-through of its edges, from a description in workshop/spa/content/diagrams.json that names the segment and a phrase the
// block contains. A block nothing matches stays as it is, and the text block always stays with the drawing, as its text
// version: the drawing adds, it never takes away. Runs in a browser only: the shell's DOM doubles have no createElementNS.

import specs from '../../content/diagrams.json';
import { create, listen } from '../interactions/dom';

interface FlowNode {
  readonly id: string;
  readonly label: readonly string[];
  readonly col: number;
  readonly row: number;
  readonly kind?: 'box' | 'actor' | 'gate' | 'model' | 'note';
  readonly warn?: string;
}

interface FlowEdge {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly dashed?: boolean;
}

interface FlowSpec {
  readonly id: string;
  readonly segment: string;
  readonly match: string;
  readonly title: string;
  readonly steps?: readonly string[];
  readonly bands?: ReadonlyArray<{ readonly label: string; readonly rows: readonly number[]; readonly tone?: 'calm' | 'hot' }>;
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}

const FLOWS = (specs as { diagrams: FlowSpec[] }).diagrams;
const SVG = 'http://www.w3.org/2000/svg';

// The drawing's own units. The stage scales them to its width (CSS: container units), so they are never pixels.
const NODE_W = 236;
const LINE = 22;
const PAD = 14;
const GAP_X = 96;
const GAP_Y = 68;
const MARGIN = 20;
const STEP_H = 40;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function svg<K extends keyof SVGElementTagNameMap>(doc: Document, name: K, attributes: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] {
  const element = doc.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Where a line from the centre of `rect` toward `to` leaves the rectangle. */
function exitPoint(rect: Rect, to: { x: number; y: number }): { x: number; y: number } {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = to.x - cx;
  const dy = to.y - cy;
  const scale = Math.min(dx === 0 ? Infinity : Math.abs(rect.w / 2 / dx), dy === 0 ? Infinity : Math.abs(rect.h / 2 / dy));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** Lines of at most `width` characters, broken at spaces. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line !== '' && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else line = line === '' ? word : `${line} ${word}`;
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** Draws one flow: the wires in SVG, the nodes as buttons over them, a step-through of the edges beneath. */
function flow(doc: Document, spec: FlowSpec, source: HTMLElement): { figure: HTMLElement; dispose: () => void } {
  const removers: Array<() => void> = [];
  const warnLines = (node: FlowNode): string[] => (node.warn === undefined ? [] : wrap(node.warn, 30));
  const heightOf = (node: FlowNode): number => PAD * 2 + node.label.length * LINE + (node.warn === undefined ? 0 : (warnLines(node).length + 0.4) * LINE);
  const rows = Math.max(...spec.nodes.map((node) => node.row)) + 1;
  const cols = Math.max(...spec.nodes.map((node) => node.col)) + 1;
  const rowHeight = Array.from({ length: rows }, (_, row) => Math.max(0, ...spec.nodes.filter((node) => node.row === row).map(heightOf)));
  const top = MARGIN + (spec.steps ? STEP_H + 32 : 0) + (spec.bands?.length ? 30 : 0); // room for a band's label above its first row
  const rowY = rowHeight.map((_, row) => top + rowHeight.slice(0, row).reduce((sum, height) => sum + height + GAP_Y, 0));
  const width = MARGIN * 2 + cols * NODE_W + (cols - 1) * GAP_X;
  const height = rowY[rows - 1] + rowHeight[rows - 1] + MARGIN;
  const rectOf = new Map<string, Rect>();
  for (const node of spec.nodes) {
    const h = heightOf(node);
    rectOf.set(node.id, { x: MARGIN + node.col * (NODE_W + GAP_X), y: rowY[node.row] + (rowHeight[node.row] - h) / 2, w: NODE_W, h });
  }

  const wires = svg(doc, 'svg', { class: 'diagram-wires', viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true', focusable: 'false' });
  const defs = svg(doc, 'defs');
  for (const state of ['', '-active']) {
    const marker = svg(doc, 'marker', { id: `${spec.id}-arrow${state}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse' });
    marker.append(svg(doc, 'path', { d: 'M 0 0 L 10 5 L 0 10 z', class: `diagram-arrow${state}` }));
    defs.append(marker);
  }
  wires.append(defs);
  for (const band of spec.bands ?? []) {
    const first = Math.min(...band.rows);
    const last = Math.max(...band.rows);
    const y0 = Math.max(4, rowY[first] - 34);
    const y1 = Math.min(height - 4, rowY[last] + rowHeight[last] + 20);
    wires.append(svg(doc, 'rect', { x: 4, y: y0, width: width - 8, height: y1 - y0, rx: 10, class: `diagram-band diagram-band-${band.tone ?? 'calm'}` }));
    wires.append(svg(doc, 'text', { x: 18, y: y0 + 20, class: 'diagram-band-label' }, band.label)); // above the band's first row, left, clear of the edges
  }
  if (spec.steps) {
    const chipW = (width - MARGIN * 2 - (spec.steps.length - 1) * 18) / spec.steps.length;
    spec.steps.forEach((step, index) => {
      const x = MARGIN + index * (chipW + 18);
      wires.append(svg(doc, 'rect', { x, y: MARGIN, width: chipW, height: STEP_H, rx: STEP_H / 2, class: 'diagram-step' }));
      wires.append(svg(doc, 'text', { x: x + chipW / 2, y: MARGIN + STEP_H / 2 + 5, 'text-anchor': 'middle', class: 'diagram-step-label' }, step));
      if (index < spec.steps!.length - 1) wires.append(svg(doc, 'text', { x: x + chipW + 9, y: MARGIN + STEP_H / 2 + 5, 'text-anchor': 'middle', class: 'diagram-step-arrow' }, '→'));
    });
  }
  const edgeElements: SVGElement[] = [];
  spec.edges.forEach((edge, index) => {
    const a = rectOf.get(edge.from);
    const b = rectOf.get(edge.to);
    if (!a || !b) throw new Error(`diagram ${spec.id}: edge ${index} names a node that is not there`);
    const from = exitPoint(a, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const to = exitPoint(b, { x: a.x + a.w / 2, y: a.y + a.h / 2 });
    const group = svg(doc, 'g', { class: `diagram-edge${edge.dashed ? ' diagram-edge-dashed' : ''}`, 'data-from': edge.from, 'data-to': edge.to });
    group.append(svg(doc, 'line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, 'marker-end': `url(#${spec.id}-arrow)` }));
    if (edge.label) {
      // On a box of its own at the line's middle, so it reads over anything the line crosses.
      const lines = wrap(edge.label, 22);
      const boxW = Math.max(...lines.map((line) => line.length)) * 7.4 + 16;
      const boxH = lines.length * 16 + 8;
      // A box wider than the line is long would sit on the arrowhead: it goes beside the line instead.
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const sideways = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
      const crowded = (sideways ? boxW : boxH) > length - 20;
      const mx = (from.x + to.x) / 2 + (crowded && !sideways ? boxW / 2 + 10 : 0);
      const my = (from.y + to.y) / 2 - (crowded && sideways ? boxH / 2 + 10 : 0);
      group.append(svg(doc, 'rect', { x: mx - boxW / 2, y: my - boxH / 2, width: boxW, height: boxH, rx: 6, class: 'diagram-edge-label-box' }));
      lines.forEach((line, at) => group.append(svg(doc, 'text', { x: mx, y: my - boxH / 2 + 4 + (at + 1) * 16 - 4, 'text-anchor': 'middle', class: 'diagram-edge-label' }, line)));
    }
    wires.append(group);
    edgeElements.push(group);
  });

  const nodes = create(doc, 'div', { class: 'diagram-nodes' });
  const buttons = new Map<string, HTMLButtonElement>();
  for (const node of spec.nodes) {
    const rect = rectOf.get(node.id)!;
    const pct = (value: number, of: number): string => `${((value / of) * 100).toFixed(3)}%`;
    const button = create(doc, 'button', {
      type: 'button',
      class: `dnode dnode-${node.kind ?? 'box'}`,
      'aria-pressed': 'false',
      'data-node': node.id,
      style: `left:${pct(rect.x, width)};top:${pct(rect.y, height)};width:${pct(rect.w, width)};height:${pct(rect.h, height)}`,
    });
    node.label.forEach((line, at) => button.append(create(doc, 'span', { class: at === 0 ? 'dnode-name' : 'dnode-line' }, line)));
    if (node.warn) button.append(create(doc, 'span', { class: 'dnode-warn' }, node.warn));
    nodes.append(button);
    buttons.set(node.id, button);
  }

  const stage = create(doc, 'div', { class: 'diagram-stage', style: `--w:${width};--h:${height};aspect-ratio:${width} / ${height}` }, wires, nodes);
  const caption = create(doc, 'p', { class: 'diagram-caption' }, 'Select a node, or step through the flow.');
  const back = create(doc, 'button', { type: 'button', class: 'button diagram-stepper' }, 'Previous step');
  const next = create(doc, 'button', { type: 'button', class: 'button diagram-stepper' }, 'Next step');
  const tools = create(doc, 'div', { class: 'diagram-tools' }, back, caption, next);
  const nameOf = (id: string): string => spec.nodes.find((node) => node.id === id)?.label[0] ?? id;

  let step = -1; // the edge the step-through is on
  let chosen: string | null = null;
  function paint(): void {
    edgeElements.forEach((element, index) => {
      const active = step === index || (chosen !== null && (element.getAttribute('data-from') === chosen || element.getAttribute('data-to') === chosen));
      element.setAttribute('class', `diagram-edge${spec.edges[index].dashed ? ' diagram-edge-dashed' : ''}${active ? ' is-active' : ''}`);
      element.querySelector('line')?.setAttribute('marker-end', `url(#${spec.id}-arrow${active ? '-active' : ''})`);
    });
    const edge = step >= 0 ? spec.edges[step] : null;
    for (const [id, button] of buttons) {
      const pressed = id === chosen;
      const lit = pressed || (edge !== null && (edge.from === id || edge.to === id));
      button.setAttribute('aria-pressed', String(pressed));
      button.setAttribute('class', `dnode dnode-${spec.nodes.find((node) => node.id === id)?.kind ?? 'box'}${lit ? ' is-lit' : ''}`);
    }
    if (edge !== null) caption.textContent = `Step ${step + 1} of ${spec.edges.length}: ${nameOf(edge.from)} → ${nameOf(edge.to)}${edge.label ? ` — ${edge.label}` : ''}`;
    else if (chosen !== null) {
      const node = spec.nodes.find((candidate) => candidate.id === chosen)!;
      caption.textContent = `${node.label.join(' · ')}${node.warn ? `. ${node.warn}` : ''}`;
    } else caption.textContent = 'Select a node, or step through the flow.';
    back.disabled = step < 0;
    next.disabled = step >= spec.edges.length - 1;
  }
  for (const [id, button] of buttons) {
    removers.push(
      listen(button, 'click', () => {
        chosen = chosen === id ? null : id;
        step = -1;
        paint();
      }),
    );
  }
  removers.push(
    listen(next, 'click', () => {
      chosen = null;
      step = Math.min(step + 1, spec.edges.length - 1);
      paint();
    }),
    listen(back, 'click', () => {
      chosen = null;
      step = Math.max(step - 1, -1);
      paint();
    }),
  );
  paint();

  const figure = create(
    doc,
    'figure',
    { class: 'diagram', 'data-diagram': spec.id },
    stage,
    tools,
    create(doc, 'figcaption', { class: 'diagram-title' }, spec.title),
    create(doc, 'details', { class: 'diagram-text' }, create(doc, 'summary', {}, 'Text version')), // the block joins it once the figure is in place
  );
  void source;
  return { figure, dispose: () => removers.forEach((remove) => remove()) };
}

// -- the directory tree

interface TreeEntry {
  readonly name: string;
  readonly note: string;
  readonly depth: number;
  readonly children: TreeEntry[];
}

const TREE_LINE = /^((?:(?:│|\s)\s{3})*)(?:(?:├──|└──)\s)?(.*)$/u;

function parseTree(text: string): TreeEntry[] {
  const roots: TreeEntry[] = [];
  const stack: TreeEntry[] = [];
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const match = TREE_LINE.exec(raw);
    if (!match) continue;
    const prefix = match[1];
    const connected = /(?:├──|└──)\s/.test(raw.slice(prefix.length));
    const depth = Math.round(prefix.length / 4) + (connected ? 1 : 0);
    const hash = match[2].indexOf('#');
    const name = (hash >= 0 ? match[2].slice(0, hash) : match[2]).trim();
    const note = hash >= 0 ? match[2].slice(hash + 1).trim() : '';
    const entry: TreeEntry = { name, note, depth, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length === 0) roots.push(entry);
    else stack[stack.length - 1].children.push(entry);
    stack.push(entry);
  }
  return roots;
}

function tree(doc: Document, source: HTMLElement): { figure: HTMLElement; dispose: () => void } {
  const removers: Array<() => void> = [];
  const list = (entries: TreeEntry[]): HTMLElement =>
    create(
      doc,
      'ul',
      { class: 'tree-list' },
      ...entries.map((entry) => {
        const folder = entry.children.length > 0 || entry.name.endsWith('/');
        const item = create(doc, 'li', { class: folder ? 'tree-dir' : 'tree-file' });
        const row = create(doc, 'span', { class: 'tree-row' });
        if (entry.children.length > 0) {
          const toggle = create(doc, 'button', { type: 'button', class: 'tree-toggle', 'aria-expanded': 'true' }, create(doc, 'span', { class: 'tree-icon' }), entry.name);
          const children = list(entry.children);
          row.append(toggle);
          removers.push(
            listen(toggle, 'click', () => {
              const open = children.hidden;
              children.hidden = !open;
              toggle.setAttribute('aria-expanded', String(open));
            }),
          );
          if (entry.note) row.append(create(doc, 'span', { class: 'tree-note' }, entry.note));
          item.append(row, children);
        } else {
          row.append(create(doc, 'span', { class: 'tree-name' }, create(doc, 'span', { class: 'tree-icon' }), entry.name));
          if (entry.note) row.append(create(doc, 'span', { class: 'tree-note' }, entry.note));
          item.append(row);
        }
        return item;
      }),
    );
  const figure = create(
    doc,
    'figure',
    { class: 'tree' },
    list(parseTree(source.textContent ?? '')),
    create(doc, 'details', { class: 'diagram-text' }, create(doc, 'summary', {}, 'Text version')), // the block joins it once the figure is in place
  );
  return { figure, dispose: () => removers.forEach((remove) => remove()) };
}

/** Replaces, in `root`, every text block the segment's diagrams describe, and every text-drawn tree, with its drawing. */
/**
 * A second, live drawing of a flow already drawn in `figure`, for the enlarge dialog: a copy of its DOM would carry the
 * nodes and the steppers without what they do. Null when `figure` is not a flow, or where nothing can be drawn.
 */
export function redraw(doc: Document, figure: HTMLElement): { figure: HTMLElement; dispose: () => void } | null {
  if (typeof doc.createElementNS !== 'function') return null;
  const spec = FLOWS.find((candidate) => candidate.id === figure.getAttribute('data-diagram'));
  const block = figure.querySelector<HTMLElement>('details > pre');
  if (!spec || !block) return null;
  const drawn = flow(doc, spec, block);
  drawn.figure.querySelector('details')?.append(block.cloneNode(true));
  return drawn;
}

export function renderDiagrams(doc: Document, root: HTMLElement, segmentId: string): () => void {
  if (typeof doc.createElementNS !== 'function' || typeof root.querySelectorAll !== 'function') return () => undefined;
  const disposers: Array<() => void> = [];
  for (const block of Array.from(root.querySelectorAll<HTMLElement>('pre'))) {
    const text = block.textContent ?? '';
    const spec = FLOWS.find((candidate) => candidate.segment === segmentId && text.includes(candidate.match));
    try {
      if (spec) {
        const drawn = flow(doc, spec, block);
        block.replaceWith(drawn.figure); // the block is now inside the figure, as its text version
        drawn.figure.querySelector('details')?.append(block);
        disposers.push(drawn.dispose);
      } else if (/├──|└──/.test(text) && !/[┌┐]/.test(text)) {
        const drawn = tree(doc, block);
        block.replaceWith(drawn.figure);
        drawn.figure.querySelector('details')?.append(block);
        disposers.push(drawn.dispose);
      }
    } catch (error) {
      console.error(`diagram in ${segmentId} was not drawn`, error); // the text block stays
    }
  }
  return () => disposers.forEach((dispose) => dispose());
}
