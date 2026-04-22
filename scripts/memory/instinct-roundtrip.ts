// Instinct export/import round-trip module.
//
// User-level skills `/instinct-export` and `/instinct-import` move learned
// instincts between machines and teammates. This module is the in-repo,
// testable kernel of that round-trip: it parses an instinct markdown file
// into a structured bundle and re-serializes a bundle back to markdown,
// guaranteeing that the `confidence` score (and every other frontmatter key)
// survives the trip without silent drift.

import matter from 'gray-matter';

export interface InstinctFrontmatter {
  id: string;
  trigger: string;
  confidence: number;
  domain: string;
  source?: string;
  created?: string;
  [key: string]: unknown;
}

export interface InstinctBundle {
  id: string;
  confidence: number;
  frontmatter: InstinctFrontmatter;
  body: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function exportInstinct(markdown: string): InstinctBundle {
  const parsed = matter(markdown);
  const data = parsed.data as Partial<InstinctFrontmatter>;

  if (typeof data.id !== 'string' || data.id.length === 0) {
    throw new Error('instinct export: frontmatter.id is required');
  }
  if (!isFiniteNumber(data.confidence)) {
    throw new Error(
      `instinct export: frontmatter.confidence must be a finite number (got ${String(data.confidence)})`,
    );
  }
  if (data.confidence < 0 || data.confidence > 1) {
    throw new Error(
      `instinct export: frontmatter.confidence must be in [0, 1] (got ${data.confidence})`,
    );
  }
  if (typeof data.trigger !== 'string') {
    throw new Error('instinct export: frontmatter.trigger is required');
  }
  if (typeof data.domain !== 'string') {
    throw new Error('instinct export: frontmatter.domain is required');
  }

  const frontmatter: InstinctFrontmatter = {
    ...(data as InstinctFrontmatter),
  };

  return {
    id: frontmatter.id,
    confidence: frontmatter.confidence,
    frontmatter,
    body: parsed.content,
  };
}

export function importInstinct(bundle: InstinctBundle): string {
  if (!isFiniteNumber(bundle.confidence)) {
    throw new Error('instinct import: bundle.confidence must be a finite number');
  }
  // gray-matter's stringify normalizes whitespace; we re-attach the body
  // verbatim so a downstream re-parse sees byte-identical content.
  return matter.stringify(bundle.body, bundle.frontmatter);
}
