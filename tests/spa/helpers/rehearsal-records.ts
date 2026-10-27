// The rehearsal records of workshop/spa/docs (specs/005-teaching-spa.md, AC22, AC23), parsed: the text under each `## ` heading and
// the first word of the Verdict section. Shared by rehearsal-record.test.ts, which holds every record to the shape, and
// hackathon-retired.test.ts, which reads the verdict of the record the retirement names.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const DOCS = path.join(ROOT, 'workshop/spa/docs');
export const NAME = /^rehearsal-(\d{4})-(\d{2})-(\d{2})\.md$/;
export const HEADINGS = ['## Environment', '## What was presented', '## Defects found', '## Verdict'];

export interface Record {
  file: string;
  date: string;
  sections: Map<string, string>;
  verdict: string;
}

/** Every rehearsal record, parsed: the text under each of its `## ` headings, and the first word of its Verdict section. */
export function readRecords(dir = DOCS): Record[] {
  return readdirSync(dir)
    .filter((name) => NAME.test(name))
    .sort()
    .map((name) => {
      const text = readFileSync(path.join(dir, name), 'utf8');
      const sections = new Map<string, string>();
      let current: string | undefined;
      for (const line of text.split(/\r?\n/)) {
        if (/^## /.test(line)) {
          current = line.trim();
          sections.set(current, '');
        } else if (current !== undefined) sections.set(current, `${sections.get(current)}${line}\n`);
      }
      const verdict = (sections.get('## Verdict') ?? '').trim().split(/[\s.,:;!]+/)[0] ?? '';
      const [, year, month, day] = NAME.exec(name) as RegExpExecArray;
      return { file: name, date: `${year}-${month}-${day}`, sections, verdict };
    });
}
