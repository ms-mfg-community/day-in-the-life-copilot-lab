import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const TEMPLATE_DIR = join(ROOT, 'plugin-template');
const MANIFEST_PATH = join(TEMPLATE_DIR, 'manifest.yaml');
const SCHEMA_PATH = join(ROOT, 'tests', 'plugin-template', 'manifest.schema.json');

describe('plugin-template: manifest.yaml validates against schema', () => {
  it('manifest.yaml exists at plugin-template/', () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true);
  });

  it('manifest validates against manifest.schema.json', () => {
    const manifest = yaml.load(readFileSync(MANIFEST_PATH, 'utf8'));
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(manifest);

    expect(
      ok,
      `manifest.yaml invalid: ${JSON.stringify(validate.errors, null, 2)}`,
    ).toBe(true);
  });

  it('manifest minimum_cli_version matches registry.yaml floor', () => {
    const manifest = yaml.load(
      readFileSync(MANIFEST_PATH, 'utf8'),
    ) as Record<string, unknown>;
    const registry = yaml.load(
      readFileSync(join(ROOT, 'docs', '_meta', 'registry.yaml'), 'utf8'),
    ) as Record<string, unknown>;
    expect(manifest.minimum_cli_version).toBe(
      registry.copilot_cli_version_floor,
    );
  });
});
