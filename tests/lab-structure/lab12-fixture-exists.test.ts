import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Finding 2.2 (Phase A) — Lab 12 code blocks reference
// `labs/fixtures/lab12/sales.parquet` in 5+ places, but the file did not
// exist on disk. This test asserts the offline-simulator fixture ships with
// the repo so a learner on the offline path never hits a file-not-found.
//
// Validation strategy (no pyarrow/pandas dependency in the JS test runner):
//   1. File exists and is non-empty.
//   2. Parquet magic-byte envelope is intact (starts AND ends with "PAR1").
//      This is the format's defining signature
//      (https://parquet.apache.org/docs/file-format/).
//   3. The column names referenced by Lab 12 code blocks are present as
//      literal byte substrings — Parquet stores schema/column metadata as
//      UTF-8 in the footer thrift blob, so a plain grep is a cheap but
//      decisive schema check for this tiny fixture.

const ROOT = process.cwd();
const FIXTURE = join(ROOT, 'labs', 'fixtures', 'lab12', 'sales.parquet');
const PARQUET_MAGIC = Buffer.from('PAR1', 'utf8');

// These four columns appear in labs/lab12.md (the pandas snippet at ~L91-98
// and the analytic read at ~L204). Keep this list in sync with the generator
// script (scripts/generate-lab12-fixture.py) and the lab text.
const REQUIRED_COLUMNS = ['order_id', 'region', 'amount_usd', 'ts'];

describe('lab12: offline Parquet fixture ships with the repo', () => {
  it('labs/fixtures/lab12/sales.parquet exists on disk', () => {
    expect(
      existsSync(FIXTURE),
      `expected Lab 12 offline fixture at ${FIXTURE}`,
    ).toBe(true);
  });

  it('fixture is a non-empty file', () => {
    const size = statSync(FIXTURE).size;
    expect(size, 'fixture must be non-empty').toBeGreaterThan(0);
    // Parquet files have at minimum: 4-byte magic + footer length (4 bytes)
    // + trailing magic = 12 bytes. Our fixture is 5 rows so must exceed that
    // by a healthy margin but stay small enough to commit.
    expect(size).toBeGreaterThan(100);
    expect(size).toBeLessThan(32 * 1024);
  });

  it('starts and ends with the Parquet "PAR1" magic bytes', () => {
    const buf = readFileSync(FIXTURE);
    const head = buf.subarray(0, 4);
    const tail = buf.subarray(buf.length - 4);
    expect(head.equals(PARQUET_MAGIC), 'leading PAR1 magic bytes missing').toBe(true);
    expect(tail.equals(PARQUET_MAGIC), 'trailing PAR1 magic bytes missing').toBe(true);
  });

  it('embeds every column name referenced in labs/lab12.md', () => {
    const buf = readFileSync(FIXTURE);
    for (const col of REQUIRED_COLUMNS) {
      expect(
        buf.includes(Buffer.from(col, 'utf8')),
        `expected column "${col}" to appear in parquet metadata`,
      ).toBe(true);
    }
  });
});
