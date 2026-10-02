import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import yaml from "js-yaml";

const ROOT = process.cwd();
const BUNDLE_DIR = join(ROOT, "enterprise-harness-bundle");
const MANIFEST_PATH = join(BUNDLE_DIR, "manifest.yaml");
const SCHEMA_PATH = join(
  ROOT,
  "tests",
  "plugin-template",
  "manifest.schema.json",
);

describe("enterprise-harness-bundle: manifest.yaml", () => {
  it("validates against the plugin manifest schema", () => {
    const manifest = yaml.load(readFileSync(MANIFEST_PATH, "utf8"));
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      schema,
    );

    expect(
      validate(manifest),
      `manifest.yaml invalid: ${JSON.stringify(validate.errors, null, 2)}`,
    ).toBe(true);
  });

  it("keeps the CLI plugin manifest aligned with the lab manifest", () => {
    const manifest = yaml.load(readFileSync(MANIFEST_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    const plugin = JSON.parse(
      readFileSync(join(BUNDLE_DIR, "plugin.json"), "utf8"),
    );

    expect(plugin.name).toBe(manifest.name);
    expect(plugin.version).toBe(manifest.version);
    expect(plugin.agents).toBe("agents");
    expect(plugin.skills).toBe("skills");
  });

  it("ships the scoped QA boundary scripts", () => {
    expect(existsSync(join(BUNDLE_DIR, "scripts", "qa-boundary-mcp.mjs"))).toBe(
      true,
    );
    expect(
      existsSync(join(BUNDLE_DIR, "scripts", "run-qa-live-eval.mjs")),
    ).toBe(true);
  });

  it("uses the registry Copilot CLI version floor", () => {
    const manifest = yaml.load(readFileSync(MANIFEST_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    const registry = yaml.load(
      readFileSync(join(ROOT, "docs", "_meta", "registry.yaml"), "utf8"),
    ) as Record<string, unknown>;

    expect(manifest.minimum_cli_version).toBe(
      registry.copilot_cli_version_floor,
    );
  });
});
