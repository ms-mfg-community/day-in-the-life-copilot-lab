import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const LAB12 = join(ROOT, 'labs/lab12.md');
const README = join(ROOT, 'README.md');
const SETUP = join(ROOT, 'labs/setup.md');

describe('lab-structure: lab12 exists and is linked', () => {
  it('labs/lab12.md exists', () => {
    expect(existsSync(LAB12), `expected ${LAB12} to exist`).toBe(true);
  });

  it('lab12 has frontmatter consistent with sibling labs', () => {
    const raw = readFileSync(LAB12, 'utf8');
    const parsed = matter(raw);
    expect(parsed.matter.length, 'lab12 must have a YAML frontmatter block').toBeGreaterThan(0);
    expect(parsed.data.title, 'lab12 must declare title').toBeTypeOf('string');
    expect(parsed.data.lab_number, 'lab12 lab_number must equal 12').toBe(12);
    expect(parsed.data.pace, 'lab12 must declare pace').toBeDefined();
    expect(parsed.data.pace.presenter_minutes).toBeTypeOf('number');
    expect(parsed.data.pace.self_paced_minutes).toBeTypeOf('number');
  });

  it('lab12 covers Fabric MCP for both Copilot CLI and VS Code', () => {
    const body = readFileSync(LAB12, 'utf8').toLowerCase();
    expect(body).toContain('fabric');
    expect(body).toContain('mcp');
    expect(body).toMatch(/copilot cli|copilot-cli|cli\b/);
    expect(body).toMatch(/vs code|vscode|visual studio code/);
  });

  it('lab12 documents BOTH the live Fabric path and the offline simulator path', () => {
    const body = readFileSync(LAB12, 'utf8').toLowerCase();
    // Live path — Fabric workspace + lakehouse(s)
    expect(body, 'lab12 must mention live Fabric workspace usage').toMatch(/live\s+fabric|fabric workspace/);
    expect(body, 'lab12 must mention lakehouse(s)').toContain('lakehouse');
    // Offline path — explicit fallback for Codespaces learners
    expect(body, 'lab12 must mention the offline simulator fallback').toMatch(/offline\s+(simulator|fallback|path)/);
    expect(body, 'lab12 offline path must use a Parquet fixture').toContain('parquet');
  });

  it('lab12 documents notebook hygiene best practices', () => {
    const body = readFileSync(LAB12, 'utf8');
    // git diff config
    expect(body).toContain('*.ipynb');
    expect(body).toMatch(/diff=jupyternotebook/);
    // Papermill-style parameter cells
    expect(body.toLowerCase()).toContain('papermill');
    // Pre-commit hook reference
    expect(body).toContain('pre-commit-strip-notebook-outputs.sh');
    // Key Vault for secrets
    expect(body).toMatch(/key vault/i);
  });

  it('lab12 is referenced from README.md', () => {
    const body = readFileSync(README, 'utf8');
    expect(body, 'README must link to labs/lab12.md').toContain('labs/lab12.md');
    expect(body, 'README lab table must list Lab 12').toMatch(/Lab 12/);
  });

  it('lab12 is referenced from labs/setup.md', () => {
    const body = readFileSync(SETUP, 'utf8');
    expect(body, 'labs/setup.md must reference lab12').toMatch(/lab12/i);
  });
});
