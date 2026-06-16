import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CLI_FILE = join(ROOT, 'mcp-configs/copilot-cli/individual/fabric.json');
const VSCODE_FILE = join(ROOT, 'mcp-configs/vscode/individual/fabric.json');

// Detect literal secrets/tokens that must never be committed.
// Allowed: env-var placeholders like ${env:FABRIC_AUTH_TOKEN}, ${input:fabric-token},
// and the literal string "FABRIC_AUTH_TOKEN" used as an env-var name.
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, label: 'JWT token' },
  { pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}/i, label: 'inline Bearer token' },
  { pattern: /\bsk-[A-Za-z0-9]{20,}/, label: 'OpenAI-style secret key' },
  { pattern: /\bghp_[A-Za-z0-9]{30,}/, label: 'GitHub PAT' },
  { pattern: /\bxox[bpars]-[A-Za-z0-9-]{10,}/, label: 'Slack token' },
  { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS access key id' },
];

function assertNoLiteralSecrets(filePath: string, raw: string) {
  for (const { pattern, label } of SECRET_PATTERNS) {
    expect(
      pattern.test(raw),
      `${filePath} contains what looks like a ${label}; secrets must come from env, not be inline`,
    ).toBe(false);
  }
}

function collectStrings(node: unknown, acc: string[] = []): string[] {
  if (typeof node === 'string') {
    acc.push(node);
  } else if (Array.isArray(node)) {
    node.forEach((n) => collectStrings(n, acc));
  } else if (node && typeof node === 'object') {
    Object.values(node as Record<string, unknown>).forEach((v) => collectStrings(v, acc));
  }
  return acc;
}

describe('mcp-configs: fabric server config shape', () => {
  it('copilot-cli fabric.json exists', () => {
    expect(
      existsSync(CLI_FILE),
      `expected Copilot CLI fabric MCP config at ${CLI_FILE}`,
    ).toBe(true);
  });

  it('vscode fabric.json exists', () => {
    expect(
      existsSync(VSCODE_FILE),
      `expected VS Code fabric MCP config at ${VSCODE_FILE}`,
    ).toBe(true);
  });

  it('copilot-cli fabric.json has required mcpServers.fabric shape', () => {
    const raw = readFileSync(CLI_FILE, 'utf8');
    assertNoLiteralSecrets(CLI_FILE, raw);
    const json = JSON.parse(raw);
    expect(json.mcpServers, 'CLI fabric.json must use "mcpServers" key').toBeDefined();
    expect(json.mcpServers.fabric, 'expected mcpServers.fabric entry').toBeDefined();

    const entry = json.mcpServers.fabric;
    expect(entry.description, 'fabric entry must include description').toBeTypeOf('string');
    expect(entry.type, 'fabric entry must declare type').toBeTypeOf('string');
    expect(['local', 'http'], 'fabric type must be local or http').toContain(entry.type);
    expect(entry.tools, 'CLI fabric entry REQUIRES tools array').toBeDefined();
    expect(Array.isArray(entry.tools)).toBe(true);

    if (entry.type === 'local') {
      expect(entry.command, 'local fabric entry must declare command').toBeTypeOf('string');
      expect(Array.isArray(entry.args), 'local fabric entry must declare args array').toBe(true);
    } else {
      expect(entry.url, 'http fabric entry must declare url').toBeTypeOf('string');
    }
  });

  it('vscode fabric.json has required servers.fabric shape', () => {
    const raw = readFileSync(VSCODE_FILE, 'utf8');
    assertNoLiteralSecrets(VSCODE_FILE, raw);
    const json = JSON.parse(raw);
    expect(json.servers, 'VS Code fabric.json must use "servers" key').toBeDefined();
    expect(json.servers.fabric, 'expected servers.fabric entry').toBeDefined();

    const entry = json.servers.fabric;
    expect(entry.description).toBeTypeOf('string');
    expect(entry.type, 'VS Code fabric entry must declare type').toBeTypeOf('string');
    expect(['stdio', 'http'], 'VS Code fabric type must be stdio or http').toContain(entry.type);

    if (entry.type === 'stdio') {
      expect(entry.command).toBeTypeOf('string');
      expect(Array.isArray(entry.args)).toBe(true);
    } else {
      expect(entry.url).toBeTypeOf('string');
    }
  });

  it('fabric configs reference env-var-based auth (no inline credentials)', () => {
    for (const file of [CLI_FILE, VSCODE_FILE]) {
      const raw = readFileSync(file, 'utf8');
      const json = JSON.parse(raw);
      const allStrings = collectStrings(json).join('\n');

      // Must mention an env var (FABRIC_*) somewhere — that's the auth contract.
      expect(
        /FABRIC_[A-Z_]+/.test(allStrings),
        `${file} must reference a FABRIC_* env var for auth/config`,
      ).toBe(true);

      // Must use a placeholder pattern (${env:...}, ${input:...}, or <your-...>)
      // anywhere a credential could appear — never a literal value.
      const hasPlaceholder =
        /\$\{(env|input):[^}]+\}/.test(allStrings) || /<your-[^>]+>/.test(allStrings);
      expect(
        hasPlaceholder,
        `${file} must use \${env:...}, \${input:...}, or <your-...> placeholders for credentials`,
      ).toBe(true);
    }
  });
});
