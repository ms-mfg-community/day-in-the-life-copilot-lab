import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const TEMPLATE_DIR = join(ROOT, 'plugin-template');
const POLICY_PATH = join(TEMPLATE_DIR, 'org-policy.example.yaml');
const POLICY_MODULE = join(TEMPLATE_DIR, 'scripts', 'policy.mjs');

describe('plugin-template: org-policy allowlist', () => {
  it('org-policy.example.yaml exists and parses', () => {
    expect(existsSync(POLICY_PATH)).toBe(true);
    const parsed = yaml.load(readFileSync(POLICY_PATH, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(parsed.default_action).toBe('deny');
    expect(Array.isArray(parsed.allowlist)).toBe(true);
    expect((parsed.allowlist as unknown[]).length).toBeGreaterThan(0);
  });

  it('isAllowed() accepts a source listed in the allowlist', async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = yaml.load(readFileSync(POLICY_PATH, 'utf8'));
    const decision = mod.isAllowed(
      policy,
      'contoso-internal/contoso-copilot-plugins',
    );
    expect(decision.allowed).toBe(true);
  });

  it('isAllowed() rejects a source not in the allowlist (deny-by-default)', async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = yaml.load(readFileSync(POLICY_PATH, 'utf8'));
    const decision = mod.isAllowed(policy, 'random-user/untrusted-plugin');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/allowlist|deny/i);
  });

  it('isAllowed() supports glob patterns in allowlist entries', async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = {
      default_action: 'deny',
      allowlist: [{ source: 'contoso-internal/*' }],
    };
    expect(mod.isAllowed(policy, 'contoso-internal/anything').allowed).toBe(
      true,
    );
    expect(mod.isAllowed(policy, 'other-org/plugin').allowed).toBe(false);
  });

  // Segment-wildcard lock test (V03 #16): a single `*` must NOT cross `/`
  // boundaries. If policy.mjs ever regresses from `[^/]+` to `.+`, this
  // would let `contoso-internal/*` match `contoso-internal/sub/path` and
  // silently widen the org allowlist. Lock the segment-bounded semantics.
  it('isAllowed() segment-wildcard `*` does not cross `/` boundaries', async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = {
      default_action: 'deny',
      allowlist: [{ source: 'contoso-internal/*' }],
    };
    expect(
      mod.isAllowed(policy, 'contoso-internal/foo/bar').allowed,
    ).toBe(false);
    expect(mod.isAllowed(policy, 'contoso-internal/foo').allowed).toBe(true);
  });
});
