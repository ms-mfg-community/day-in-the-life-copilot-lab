// QA fixtures stay inside this worktree. Product and curriculum files are only read.
// SPA_QA_SOURCE_ROOT selects an isolated mutant's scripts/schema for red checks.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { CURRICULUM_GLOBS } from './frontmatter-keys';
import { runNode, type Run } from './run-node';

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, process.env.SPA_QA_SOURCE_ROOT ?? '.');

export const CONTENT = 'workshop/spa/content';
export const DECK = `${CONTENT}/deck.json`;
export const INTERACTIONS = `${CONTENT}/interactions.json`;
export const DATASET = `${CONTENT}/datasets/token-cost-model.json`;
export const DOC = 'workshop/spa/docs/content-authoring.md';

export interface ValidationReport {
  ok: boolean;
  targets: Array<{
    target: string;
    files: Array<{
      file: string;
      kind: string | null;
      ok: boolean;
      errors: Array<{ keyword: string; path: string; message: string }>;
    }>;
  }>;
}

export class QASandbox {
  readonly root = mkdtempSync(join(ROOT, 'tests/spa/.qa-sandbox-'));

  constructor() {
    try {
      for (const dir of ['scripts/spa', 'workshop/spa/schema']) {
        cpSync(join(SOURCE, dir), join(this.root, dir), { recursive: true });
      }
      for (const dir of [CONTENT, 'workshop/spa/docs']) {
        cpSync(join(ROOT, dir), join(this.root, dir), { recursive: true });
      }
      for (const { dir } of CURRICULUM_GLOBS) {
        mkdirSync(join(this.root, dir), { recursive: true });
        for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
          if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
            cpSync(join(ROOT, dir, entry.name), join(this.root, dir, entry.name));
          }
        }
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }

  read(path: string): string {
    return readFileSync(join(this.root, path), 'utf8');
  }

  json<T>(path: string): T {
    return JSON.parse(this.read(path)) as T;
  }

  write(path: string, text: string): void {
    mkdirSync(dirname(join(this.root, path)), { recursive: true });
    writeFileSync(join(this.root, path), text, 'utf8');
  }

  writeJson(path: string, data: unknown): void {
    this.write(path, `${JSON.stringify(data, null, 2)}\n`);
  }

  remove(path: string): void {
    rmSync(join(this.root, path), { recursive: true, force: true });
  }

  validate(...targets: string[]): Run {
    return runNode(join(this.root, 'scripts/spa/validate.mjs'), ['--json', ...targets], this.root);
  }

  generate(...args: string[]): Run {
    return runNode(join(this.root, 'scripts/spa/frontmatter-keys.mjs'), args, this.root);
  }

  report(run: Run): ValidationReport {
    try {
      return JSON.parse(run.stdout) as ValidationReport;
    } catch {
      throw new Error(`validator produced no JSON (exit ${run.status}): ${run.stderr || run.stdout}`);
    }
  }

  close(): void {
    rmSync(this.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
