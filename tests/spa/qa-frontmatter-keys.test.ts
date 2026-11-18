// Preservation must hold for every key the generator itself accepts.
// The "QA defect" describe at the end was an expected failure (it.fails) while the generator dropped
// the row of a key spelled Key or --- and its hand-written Meaning with it; that is fixed, so it is an
// ordinary test now and a regression turns it red.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DOC, QASandbox } from './helpers/qa-sandbox';
import { SLOW } from './helpers/run-node';

let box: QASandbox;
beforeEach(() => {
  box = new QASandbox();
});
afterEach(() => {
  box?.close();
});

function expectMeaningPreserved(key: string, meaning = 'Hand-written meaning that must survive.'): void {
  box.write('labs/qa-key.md', `---\n${JSON.stringify(key)}: 1\n---\nFixture body.\n`);
  const first = box.generate();
  expect(first.status, first.stdout + first.stderr).toBe(0);
  const placeholder = `| ${key} | labs | TODO: write a Meaning for this key. |`;
  const authored = `| ${key} | labs | ${meaning} |`;
  const generated = box.read(DOC);
  expect(generated).toContain(placeholder);
  box.write(DOC, generated.replace(placeholder, authored));
  const before = box.read(DOC);
  const second = box.generate();
  expect(second.status, second.stdout + second.stderr).toBe(0);
  const actualRow = box.read(DOC).split(/\r?\n/).find((line) => line.startsWith(`| ${key} | labs |`));
  expect(actualRow).toBe(authored);
  expect(box.read(DOC)).toBe(before);
  expect(second.stdout).not.toMatch(/no hand-written Meaning yet/);
}

describe('QA front-matter Meaning preservation: positive controls', () => {
  it.each(['qa_key', 'key'])('preserves the handwritten Meaning for %s on repeated generation', (key) => {
    expectMeaningPreserved(key);
  }, SLOW);
});

describe('QA defect: accepted keys must not be confused with table syntax', () => {
  it.each(['Key', '---'])('preserves the handwritten Meaning for the accepted key %s', (key) => {
    expectMeaningPreserved(key);
  }, SLOW);
});

describe('QA round-2: complete rows, not individual cells, decide table syntax', () => {
  it.each([
    ['Key', 'Meaning'],
    ['-', '---'],
    [':---:', ':---:'],
    [':-', ':-:'],
  ])('preserves key %s with table-like Meaning %s', (key, meaning) => {
    expectMeaningPreserved(key, meaning);
    const current = box.generate('--check');
    expect(current.status, current.stdout + current.stderr).toBe(0);
    expect(current.stdout).toContain('is up to date');
  }, SLOW);
});
