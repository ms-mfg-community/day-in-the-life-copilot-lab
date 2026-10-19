// A parameter chart (specs/005-teaching-spa.md 2.4, F83, F88, F104, F109). Every parameter of the dataset the entry names
// becomes a slider the reader sets from the keyboard, with a pair of buttons for a pointer that cannot drag. The outputs
// are computed here, from the dataset and the values on show, so the slide says what the data says. A change is kept in the
// store (2.3), told to the live region, and written out again in the long description that sits with the chart.

import tokenCostModel from '../../content/datasets/token-cost-model.json';
import { NOTHING, create, elementsOf, hasModifier } from './dom';
import { isRecord, readParameter, writeParameter } from './persist';
import type { Mounter } from './types';

interface Parameter {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
}

interface Output {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly constant?: number;
  readonly terms: ReadonlyArray<{ readonly parameter: string; readonly coefficient: number }>;
}

interface Dataset {
  readonly label: string;
  readonly provenance: { readonly kind: string; readonly note: string };
  readonly parameters: readonly Parameter[];
  readonly outputs: readonly Output[];
}

type Values = Readonly<Record<string, number>>;

// ghcp-was-here: a dataset is imported by name, so a new one is one more line here. The upgrade path is `import.meta.glob`
// over content/datasets, once more than one chart needs it.
const DATASETS: Readonly<Record<string, Dataset>> = { [tokenCostModel.id]: tokenCostModel };

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const say = (value: number): string => NUMBER.format(value);

/** A figure without the noise of binary arithmetic (0.1 * 3), which a coefficient of the dataset would put on the page. */
const tidy = (value: number): number => Number(value.toPrecision(12));

/** The nearest allowed value of a parameter: a step of its range, inside it. Anything that is no number is its default. */
function allowed(parameter: Parameter, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return parameter.default;
  const stepped = parameter.min + Math.round((value - parameter.min) / parameter.step) * parameter.step;
  return tidy(Math.min(parameter.max, Math.max(parameter.min, stepped)));
}

/** The values to show: each one the stored value it is allowed to be, or the default. The store may hold anything. */
function restore(model: Dataset, stored: unknown): Values {
  const saved = isRecord(stored) ? stored : {};
  return Object.fromEntries(model.parameters.map((parameter) => [parameter.id, allowed(parameter, saved[parameter.id])]));
}

/** Every output of the dataset at these values: its constant plus each term's coefficient times the parameter it names. */
function compute(model: Dataset, values: Values): Values {
  return Object.fromEntries(
    model.outputs.map((output) => [
      output.id,
      tidy((output.constant ?? 0) + output.terms.reduce((sum, term) => sum + term.coefficient * values[term.parameter], 0)),
    ]),
  );
}

/** The least and the greatest an output can be while every parameter stays inside its range: the two ends of its bar. */
function reachOf(model: Dataset, output: Output): [number, number] {
  let low = output.constant ?? 0;
  let high = low;
  for (const term of output.terms) {
    const parameter = model.parameters.find((candidate) => candidate.id === term.parameter);
    if (parameter === undefined) continue;
    const ends = [term.coefficient * parameter.min, term.coefficient * parameter.max];
    low += Math.min(...ends);
    high += Math.max(...ends);
  }
  return [low, high];
}

/** How far along between its ends a value is, as the width of a bar. */
const percent = (value: number, low: number, high: number): string =>
  `${high > low ? Math.min(100, Math.max(0, Math.round(((value - low) / (high - low)) * 1000) / 10)) : 0}%`;

/** The value a key asks for, or undefined for a key the slider has no use for. */
function asked(key: string, parameter: Parameter, value: number): number | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return value + parameter.step;
    case 'ArrowLeft':
    case 'ArrowDown':
      return value - parameter.step;
    case 'Home':
      return parameter.min;
    case 'End':
      return parameter.max;
    default:
      return undefined;
  }
}

/** The long description (F109), in paragraphs: how the figures are sourced, what each parameter and output is, and how the settings on show compare with the baseline. */
function describe(model: Dataset, values: Values, baseline: Values): string[] {
  const now = compute(model, values);
  const then = compute(model, baseline);
  const labelOf = (id: string): string => model.parameters.find((parameter) => parameter.id === id)?.label ?? id;
  const formula = (output: Output): string =>
    [...(output.constant ? [say(output.constant)] : []), ...output.terms.map((term) => `${say(term.coefficient)} × ${labelOf(term.parameter)}`)].join(' + ');
  return [
    `${model.label}: ${model.provenance.kind} figures. ${model.provenance.note}`,
    ...model.parameters.map(
      (p) =>
        `${p.label} runs from ${say(p.min)} to ${say(p.max)} ${p.unit} in steps of ${say(p.step)}. It is ${say(values[p.id])} ${p.unit} now and ${say(baseline[p.id])} ${p.unit} at the baseline.`,
    ),
    ...model.outputs.map(
      (o) => `${o.label} is ${formula(o)}. It is ${say(now[o.id])} ${o.unit} now and ${say(then[o.id])} ${o.unit} at the baseline.`,
    ),
  ];
}

// The shell has no stylesheet yet (see dialog.ts), so the presentation travels with the elements. System colors keep the
// chart legible in a dark theme and in forced colors; the controls are at least 24 by 24 CSS pixels (2.5.8), the track
// of a slider included, and the fill of a track or a bar is a flex item, which takes the whole height of what holds it.
const BOX = 'margin:1rem 0;padding:0.75rem 1rem;border:1px solid CanvasText;';
const ROW = 'display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;margin:0.5rem 0;';
const BUTTON = 'min-width:24px;min-height:24px;';
const TRACK = 'display:flex;flex:1 1 10rem;min-width:10rem;min-height:24px;box-sizing:border-box;border:1px solid CanvasText;';
const BAR = 'display:flex;width:10rem;max-width:100%;height:0.75rem;border:1px solid CanvasText;';
const FILL = 'background-color:Highlight;';

export const mountParameterChart: Mounter = ({ entry, segment, root, document: doc, store, announce }) => {
  const model = entry.dataset !== undefined && Object.hasOwn(DATASETS, entry.dataset) ? DATASETS[entry.dataset] : undefined;
  if (model === undefined) throw new Error(`parameter-chart ${entry.id}: there is no dataset ${entry.dataset ?? 'declared for it'}`);
  const descriptionId = entry.longDescriptionId;
  if (descriptionId === undefined) throw new Error(`parameter-chart ${entry.id}: a chart declares its longDescriptionId (AC19)`);

  const baseline = restore(model, undefined);
  let values = restore(model, readParameter(store, segment.id, entry.id));

  // ghcp-was-here: Page Up and Page Down are not handled. Home, End and the buttons reach any value; the upgrade path is
  // the larger step the APG slider offers as an option.
  // ghcp-was-here: the track is a display, not a pointer target. Turning a click on it into a value needs the element's
  // layout, so the buttons are the single-pointer way to set a value (F88); the upgrade path is a click-to-set on the track.
  const sliders = model.parameters.map((parameter) => {
    const id = `${entry.id}-${parameter.id}`;
    const fill = create(doc, 'div');
    const readout = create(doc, 'span');
    const slider = create(
      doc,
      'div',
      {
        id,
        role: 'slider',
        tabindex: '0',
        'aria-labelledby': `${id}-label`,
        'aria-valuemin': String(parameter.min),
        'aria-valuemax': String(parameter.max),
        style: TRACK,
      },
      fill,
    );
    const decrease = create(doc, 'button', { type: 'button', 'aria-controls': id, style: BUTTON }, `Decrease ${parameter.label}`);
    const increase = create(doc, 'button', { type: 'button', 'aria-controls': id, style: BUTTON }, `Increase ${parameter.label}`);
    const row = create(doc, 'div', { style: ROW }, create(doc, 'span', { id: `${id}-label` }, parameter.label), readout, decrease, slider, increase);
    return { parameter, slider, fill, readout, decrease, increase, row };
  });

  const results = model.outputs.map((output) => {
    const [low, high] = reachOf(model, output);
    const figure = create(doc, 'span');
    const fill = create(doc, 'div');
    const row = create(
      doc,
      'div',
      { style: ROW },
      create(doc, 'dt', {}, output.label),
      create(doc, 'dd', { style: 'margin:0;' }, figure, create(doc, 'div', { 'aria-hidden': 'true', style: BAR }, fill)),
    );
    return { output, low, high, figure, fill, row };
  });

  const description = create(doc, 'div', { id: descriptionId });
  const widget = create(
    doc,
    'div',
    { id: entry.id, role: 'group', 'aria-label': entry.label, 'aria-describedby': descriptionId, style: BOX },
    ...sliders.map(({ row }) => row),
    create(doc, 'dl', { style: 'margin:0;' }, ...results.map(({ row }) => row)),
    description,
  );

  /** Puts the values on show into the page: each slider and its readout, each output and its bar, and the long description. */
  const render = (): void => {
    for (const { parameter, slider, fill, readout } of sliders) {
      const text = `${say(values[parameter.id])} ${parameter.unit}`;
      slider.setAttribute('aria-valuenow', String(values[parameter.id]));
      slider.setAttribute('aria-valuetext', text);
      fill.setAttribute('style', `${FILL}width:${percent(values[parameter.id], parameter.min, parameter.max)};`);
      readout.textContent = text;
    }
    const now = compute(model, values);
    const then = compute(model, baseline);
    for (const { output, low, high, figure, fill } of results) {
      figure.textContent = `${say(now[output.id])} ${output.unit}, baseline ${say(then[output.id])}`;
      fill.setAttribute('style', `${FILL}width:${percent(now[output.id], low, high)};`);
    }
    description.replaceChildren(...describe(model, values, baseline).map((paragraph) => create(doc, 'p', {}, paragraph)));
  };

  /** Sets a parameter to the nearest allowed value. A value that changes nothing says nothing and writes nothing. */
  const change = (parameter: Parameter, requested: number): void => {
    const value = allowed(parameter, requested);
    if (value === values[parameter.id]) return;
    const before = compute(model, values);
    values = { ...values, [parameter.id]: value };
    render();
    writeParameter(store, segment.id, entry.id, values);
    const after = compute(model, values);
    const moved = model.outputs.filter((output) => after[output.id] !== before[output.id]);
    if (moved.length > 0) announce(moved.map((output) => `${output.label}: ${say(after[output.id])} ${output.unit}`).join('. '));
  };

  for (const { parameter, slider, decrease, increase } of sliders) {
    slider.addEventListener('keydown', (event) => {
      if (hasModifier(event)) return;
      const to = asked(event.key, parameter, values[parameter.id]);
      if (to === undefined) return;
      event.preventDefault(); // a handled key must not also scroll the page
      change(parameter, to);
    });
    decrease.addEventListener('click', () => change(parameter, values[parameter.id] - parameter.step));
    increase.addEventListener('click', () => change(parameter, values[parameter.id] + parameter.step));
  }

  render();
  // Before the first break, so the chart sits with the problem the slide opens with; a slide without one ends with it.
  const firstBreak = elementsOf(root).find((child) => child.localName === 'hr');
  if (firstBreak !== undefined) firstBreak.before(widget);
  else root.append(widget);
  return NOTHING;
};
