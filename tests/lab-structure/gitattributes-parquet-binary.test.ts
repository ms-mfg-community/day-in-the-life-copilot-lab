import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// F08 — Lab 12 commits a binary Apache Parquet fixture
// (labs/fixtures/lab12/sales.parquet). Without an explicit `*.parquet binary`
// rule in `.gitattributes`, Git on a Windows checkout (core.autocrlf=true) or
// any environment with text=auto can normalize line endings inside the file
// and corrupt the trailing PAR1 magic bytes — which would silently break the
// offline path for every learner who clones after such a normalization.
//
// This test locks the invariant: `.gitattributes` must declare *.parquet as
// binary so `git check-attr` reports `binary: set` on the fixture.

const ROOT = process.cwd();
const GITATTRIBUTES = join(ROOT, '.gitattributes');

describe('.gitattributes — binary handling for Lab 12 Parquet fixture', () => {
  it('declares *.parquet as binary', () => {
    const body = readFileSync(GITATTRIBUTES, 'utf8');
    // Match a non-commented line that pins *.parquet to the `binary` macro.
    const hasParquetBinary = body
      .split(/\r?\n/)
      .some((line) => {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith('#')) return false;
        return /^\*\.parquet\b.*\bbinary\b/.test(trimmed);
      });
    expect(
      hasParquetBinary,
      '.gitattributes must contain a `*.parquet binary` rule to protect labs/fixtures/lab12/sales.parquet',
    ).toBe(true);
  });
});
