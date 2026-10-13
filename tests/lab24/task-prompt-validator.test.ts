import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const FIX = join(ROOT, "labs", "fixtures", "lab24");
const VALIDATOR = join(FIX, "contoso-sdlc", "scripts", "validate-tasks.mjs");
const TASKS = join(FIX, "specs", "001-enrollment-cap", "tasks.md");
const INVALID = join(FIX, "invalid", "specs", "002-invalid", "tasks.md");
const MANIFEST = join(ROOT, "enterprise-harness-bundle", "manifest.yaml");
const REGISTRY = join(ROOT, "docs", "_meta", "registry.yaml");

function run(...args: string[]) {
  return spawnSync(process.execPath, [VALIDATOR, ...args, "--manifest", MANIFEST, "--registry", REGISTRY], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

describe("lab24: task-prompt validator", () => {
  it("accepts the seeded tasks.md", () => {
    const r = run(TASKS);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("4 task prompts valid");
  });

  it("rejects the invalid fixture with exactly ten errors and exit 1", () => {
    const r = run(INVALID);
    expect(r.status).toBe(1);
    const errors = r.stderr.split("\n").filter((l) => l.startsWith(INVALID));
    expect(errors).toHaveLength(10);
    const text = errors.join("\n");
    expect(text).toMatch(/T001: tier \S+ is not a registry tier/);
    expect(text).toMatch(/T002: agent yolo-agent is not in the manifest/);
    expect(text).toMatch(/T003: context link does not resolve/);
    expect(text).toMatch(/T003: acceptance needs a command and an expect/);
    expect(text).toMatch(/T004: sizing: more than 3 owned files/);
    expect(text).toMatch(/T004: execution split needs override/);
    expect(text).toMatch(/T004: escalation.retry_budget/);
    expect(text).toMatch(/T004: correlation_key run is not stamped/);
    expect(text).toMatch(/T005: no yaml task-prompt block/);
    expect(text).not.toMatch(/G001/);
  });

  it("prints a plain-language prompt for copilot -p", () => {
    const r = run(TASKS, "--print", "T014");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Decide whether one more enrollment fits in a course.");
    expect(r.stdout).toContain("Correlation key: 001-enrollment-cap/implement/T014/3f9a2c1e");
  });

  it("dispatches from the registry tier, never a model string in the task", () => {
    const registry = yaml.load(readFileSync(REGISTRY, "utf8")) as { models: Record<string, string[]> };
    const r = run(TASKS, "--dispatch", "T014");
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({
      agent: "task-executor",
      tier: "standard",
      model: registry.models.standard[0],
      fallback_model: registry.models.premium[0],
      execution: "agent",
    });
    expect(readFileSync(TASKS, "utf8")).not.toContain(registry.models.standard[0]);
  });

  it("stamps {run} placeholders, then validates", () => {
    const tmp = mkdtempSync(join(tmpdir(), "lab24-stamp-"));
    try {
      cpSync(join(FIX, "specs"), join(tmp, "specs"), { recursive: true });
      const copy = join(tmp, "specs", "001-enrollment-cap", "tasks.md");
      writeFileSync(copy, readFileSync(copy, "utf8").replaceAll("/3f9a2c1e", "/{run}"));
      expect(run(copy).status).toBe(1);
      expect(run(copy, "--stamp-run", "a1b2c3d4").status).toBe(0);
      const stamped = readFileSync(copy, "utf8");
      expect(stamped).toContain("001-enrollment-cap/implement/T014/a1b2c3d4");
      expect(stamped).not.toContain("{run}");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("keeps the native Spec Kit task format", () => {
    const text = readFileSync(TASKS, "utf8");
    expect(text).toMatch(/^## Phase /m);
    expect(text).toMatch(/^- \[[ x]\] T\d{3} \[P\] \[US1\] /m);
    expect(text).toMatch(/^- \[ \] G001 /m);
  });

  it("never calls a model or the network", () => {
    const src = readFileSync(VALIDATOR, "utf8");
    expect(src).not.toMatch(/\bfetch\(|child_process/);
  });
});
