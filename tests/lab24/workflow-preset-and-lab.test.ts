import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const FIX = join(ROOT, "labs", "fixtures", "lab24");

type Step = { id: string; type?: string; command?: string; options?: string[]; on_reject?: string; then?: Step[]; run?: string };

describe("lab24: contoso-sdlc workflow", () => {
  const wf = yaml.load(readFileSync(join(FIX, "contoso-sdlc", "workflow.yml"), "utf8")) as {
    workflow: { id: string };
    steps: Step[];
  };
  const ids = wf.steps.map((s) => s.id);

  it("keeps Lab 23's stage order with signal steps between them", () => {
    expect(wf.workflow.id).toBe("contoso-sdlc");
    expect(ids).toHaveLength(19);
    const core = ["epic", "review-epic", "specify", "review-spec", "plan", "review-plan", "tasks", "implement", "qa-review", "review-qa"];
    expect(ids.filter((id) => core.includes(id))).toEqual(core);
    expect(ids.indexOf("validate-tasks")).toBe(ids.indexOf("tasks") + 1);
    expect(ids.indexOf("taskstoissues")).toBeLessThan(ids.indexOf("implement"));
  });

  it("makes every gate approve/reject with retry", () => {
    const gates = [...wf.steps, ...wf.steps.flatMap((s) => s.then ?? [])].filter((s) => s.type === "gate");
    expect(gates.map((g) => g.id)).toEqual(["review-epic", "review-spec", "review-plan", "review-qa", "review-tasks"]);
    for (const g of gates) {
      expect(g.options).toEqual(["approve", "reject"]);
      expect(g.on_reject).toBe("retry");
    }
  });

  it("makes review-tasks optional", () => {
    const maybe = wf.steps.find((s) => s.id === "maybe-review-tasks") as Step & { condition: string };
    expect(maybe.type).toBe("if");
    expect(maybe.condition).toContain("inputs.review_tasks");
  });

  it("signals each stage with the run id through the shipped scripts", () => {
    const signals = wf.steps.filter((s) => s.id.startsWith("signal-"));
    expect(signals.map((s) => s.id)).toEqual(["signal-epic", "signal-spec", "signal-plan", "signal-tasks", "signal-implement", "signal-qa"]);
    for (const s of signals) {
      expect(s.run).toContain("{{ context.workflow_dir }}/scripts/record-stage.mjs");
      expect(s.run).toContain("--run {{ context.run_id }}");
    }
    expect(wf.steps.find((s) => s.id === "validate-tasks")?.run).toContain("--stamp-run {{ context.run_id }}");
  });
});

describe("lab24: contoso-tasks preset", () => {
  const preset = yaml.load(readFileSync(join(FIX, "contoso-tasks", "preset.yml"), "utf8")) as {
    preset: { id: string };
    provides: { templates: Array<{ name: string; strategy: string; file: string }> };
  };

  it("extends the core templates by appending, not replacing", () => {
    expect(preset.preset.id).toBe("contoso-tasks");
    for (const t of preset.provides.templates) expect(t.strategy).toBe("append");
    expect(preset.provides.templates.map((t) => t.name)).toEqual(
      expect.arrayContaining(["tasks-template", "speckit.taskstoissues"]),
    );
  });

  it("ships the taskstoissues fragment without frontmatter", () => {
    const fragment = readFileSync(join(FIX, "contoso-tasks", "commands", "speckit.taskstoissues.md"), "utf8");
    expect(fragment.startsWith("---")).toBe(false);
    expect(fragment).toContain("correlation_key");
    expect(fragment).toMatch(/supersedes/i);
  });
});

describe("lab24: qa-review independence", () => {
  const cmd = readFileSync(
    join(ROOT, "labs", "fixtures", "lab23", "contoso-review", "commands", "speckit.contoso-review.qa-review.md"),
    "utf8",
  );

  it("declares a tools list and reads spec, diff and tasks only", () => {
    expect(cmd).toMatch(/^tools:/m);
    expect(cmd).toMatch(/implementer'?s? summary/i);
  });
});

describe("lab24: lab content", () => {
  const lab = readFileSync(join(ROOT, "labs", "lab24.md"), "utf8");

  it.each([
    ["taskstoissues prerequisites", /origin.*remote[\s\S]*GitHub MCP server|GitHub MCP server[\s\S]*origin.*remote/i],
    ["DIY caveat", /DIY\. Per-task agent and model metadata isn't native to Spec Kit/],
    ["staged workshop path", /staged: true/],
    ["rework rounds capped", /round_cap_reached/],
    ["fresh QA process", /copilot -p/],
    ["contoso-sdlc ships", /specify workflow add/],
  ])("teaches %s", (_name, pattern) => {
    expect(lab).toMatch(pattern);
  });

  it("hardcodes no Spec Kit or gh-aw version", () => {
    expect(lab).not.toMatch(/spec[- ]kit[^\n]{0,20}v?1\.\d+\.\d+/i);
    expect(lab).not.toMatch(/gh-aw[^\n]{0,20}v0\.\d+\.\d+/i);
  });
});
