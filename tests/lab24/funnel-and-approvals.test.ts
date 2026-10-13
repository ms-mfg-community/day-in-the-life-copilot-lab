import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const FIX = join(ROOT, "labs", "fixtures", "lab24");
const ROUTE = join(FIX, "scripts", "route.mjs");
const APPROVALS = join(FIX, "scripts", "approvals.mjs");
const RECORD = join(FIX, "contoso-sdlc", "scripts", "record-stage.mjs");
const EVENTS = join(FIX, "stage-events");
const KEY = /^[0-9]{3}-[a-z0-9-]+\/[a-z-]+\/(-|T\d{3})\/[0-9a-f]{8}$/;

const node = (...args: string[]) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });

describe("lab24: stage signal", () => {
  const lines = readFileSync(join(EVENTS, "001-enrollment-cap.jsonl"), "utf8").trim().split("\n");
  const events = lines.map((l) => JSON.parse(l));

  it("carries the shared correlation key on every event", () => {
    for (const e of events) {
      expect(e.correlation_key).toMatch(KEY);
      expect(e.correlation_key).toBe(`${e.feature}/${e.stage}/${e.task}/${e.run_id}`);
    }
  });

  it.each([
    ["--feature", "1001-enrollment-cap"],
    ["--task", "T1000"],
    ["--run", "3F9A2C1E"],
    ["--run", "3f9a2c1"],
    ["--run", "3f9a2c1ee"],
    ["--run", "run_1234"],
  ])("rejects a key outside the Lab 25 contract: %s %s", (flag, value) => {
    const args = ["--feature", "001-enrollment-cap", "--task", "T014", "--stage", "implement", "--run", "3f9a2c1e"];
    const invalid = args.map((arg, i) => args[i - 1] === flag ? value : arg);
    const dir = mkdtempSync(join(tmpdir(), "lab24-invalid-key-"));
    try {
      const r = node(RECORD, ...invalid, "--dir", dir);
      expect(r.status, r.stderr).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records the git blob SHA of each artifact", () => {
    for (const e of events.filter((x) => x.artifact)) {
      const sha = execFileSync("git", ["hash-object", join(FIX, e.artifact)], { encoding: "utf8" }).trim();
      expect(e.artifact_sha, e.correlation_key).toBe(sha);
    }
  });

  it("ends with the seeded QA rejection, classified, as a rework event", () => {
    expect(events.at(-1)).toMatchObject({
      stage: "rework",
      task: "T016",
      from_stage: "qa-review",
      transition: "rework",
      classification: "implementation",
    });
  });

  it("record-stage writes one event line with the key", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab24-signal-"));
    try {
      const r = node(RECORD, "--feature", "001-enrollment-cap", "--stage", "qa-review", "--from", "rework",
        "--run", "3f9a2c1e", "--require-artifact", "--artifact", "labs/fixtures/lab24/specs/001-enrollment-cap/qa-review.md",
        "--pr", "42", "--actor", "casey-qa", "--dir", dir);
      expect(r.status, r.stderr).toBe(0);
      const e = JSON.parse(readFileSync(join(dir, "001-enrollment-cap.jsonl"), "utf8").trim());
      expect(e).toMatchObject({ correlation_key: "001-enrollment-cap/qa-review/-/3f9a2c1e", pr: 42, actor: "casey-qa" });
      expect(e.artifact_sha).toMatch(/^[0-9a-f]{40}$/);
      const bad = node(RECORD, "--feature", "001-enrollment-cap", "--stage", "ship-it", "--run", "3f9a2c1e", "--dir", dir);
      expect(bad.status).toBe(1);
      const base = ["--stage", "implement", "--run", "3f9a2c1e", "--dir", dir];
      for (const extra of [["--feature", "../../etc"], ["--feature", "001-a/b"], ["--feature", "001-enrollment-cap", "--task", "foo"], ["--feature", "001-enrollment-cap", "--from", "bogus"]]) {
        expect(node(RECORD, ...extra, ...base).status, extra.join(" ")).toBe(1);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("lab24: deterministic routing", () => {
  const r = node(ROUTE, "--events", EVENTS);
  const route = JSON.parse(r.stdout);

  it("routes the latest event from the role table and CODEOWNERS", () => {
    expect(r.status).toBe(0);
    expect(route).toMatchObject({
      correlation_key: "001-enrollment-cap/rework/T016/3f9a2c1e",
      next: "implement",
      notify: "dana-dev",
      target: { kind: "pr", number: 42 },
      assignees: ["dana-dev"],
      project_status: "Rework",
    });
    expect(node(ROUTE, "--events", EVENTS).stdout).toBe(r.stdout);
  });

  it("--check accepts exactly the routed writes and rejects anything else", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab24-route-"));
    const key = "correlation_key: 001-enrollment-cap/rework/T016/3f9a2c1e";
    const full = [
      { type: "assign_to_user", issue_number: 42, assignee: "dana-dev" },
      { type: "add_reviewer", pull_request_number: 42, reviewers: ["blake-lead", "dana-dev"] },
      { type: "update_project", content_number: 42, fields: { Status: "Rework" } },
      { type: "add_comment", item_number: 42, body: `@dana-dev T016 is ready to implement.\n\n${key}` },
    ];
    const cases: Array<[string, unknown[], number]> = [
      ["full route", full, 0],
      ["empty output", [], 1],
      ["informational only", [{ type: "missing_tool", tool: "x" }], 1],
      ["noop with a target", [{ type: "noop", message: "nothing" }], 1],
      ["omitted review request", full.filter((i) => i.type !== "add_reviewer"), 1],
      ["wrong assignee", [{ ...full[0], assignee: "casey-qa" }, ...full.slice(1)], 1],
      ["reviewer dropped", [full[0], { ...full[1], reviewers: ["blake-lead"] }, ...full.slice(2)], 1],
      ["duplicate comment", [...full, full[3]], 1],
      ["stray mention", [...full.slice(0, 3), { ...full[3], body: `@mallory please look.\n\n${key}` }], 1],
    ];
    try {
      for (const [name, items, status] of cases) {
        const file = join(dir, `${name.replace(/\W/g, "-")}.json`);
        writeFileSync(file, JSON.stringify({ items }));
        const res = node(ROUTE, "--events", EVENTS, "--check", file);
        expect(res.status, `${name}: ${res.stderr}`).toBe(status);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("lab24: approvals of record", () => {
  it("counts rejects from the records, reproducing the committed fixture", () => {
    const r = node(APPROVALS, "--count", join(FIX, "approvals", "pr-comments.json"));
    expect(r.status, r.stderr).toBe(0);
    const counted = JSON.parse(r.stdout);
    const committed = JSON.parse(readFileSync(join(FIX, "approvals", "approvals-of-record.json"), "utf8"));
    expect(Array.isArray(committed)).toBe(true);
    expect(committed.map((rec: { correlation_key: string }) => rec.correlation_key)).toHaveLength(5);
    expect(counted.records).toEqual(committed);
    expect(counted.records.some((x: { gate: string; verdict: string }) => x.gate === "review-qa" && x.verdict === "reject")).toBe(true);
    expect(counted.invalid.length).toBeGreaterThan(0);
    for (const rec of counted.records) {
      expect(rec.correlation_key).toMatch(KEY);
      expect(["pr-review", "comment"]).toContain(rec.source);
    }
  });

  it("writes only records to --out and leaves the summary on stdout", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab24-records-"));
    try {
      const out = join(dir, "approvals-of-record.json");
      const r = node(APPROVALS, "--count", join(FIX, "approvals", "pr-comments.json"), "--out", out);
      expect(r.status, r.stderr).toBe(0);
      const records = JSON.parse(readFileSync(out, "utf8"));
      expect(records).toEqual(JSON.parse(readFileSync(join(FIX, "approvals", "approvals-of-record.json"), "utf8")));
      expect(JSON.parse(r.stdout)).toMatchObject({
        counts: { approve: 4, reject: 1, escalated: 0 },
        rework_rounds: 1, max_rework_rounds: 2, round_cap_reached: false,
      });
      expect(JSON.parse(r.stdout)).not.toHaveProperty("records");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each([
    "1001-enrollment-cap/plan/-/3f9a2c1e",
    "001-enrollment-cap/plan/-/3F9A2C1E",
    "001-enrollment-cap/plan/-/3f9a2c1",
    "001-enrollment-cap/plan/-/3f9a2c1ee",
    "001-enrollment-cap/plan/-/run_1234",
  ])("refuses an approval key outside the Lab 25 contract: %s", (key) => {
    const r = node(APPROVALS, "--record", "--gate", "review-plan", "--key", key,
      "--verdict", "approve", "--approver", "blake-lead");
    expect(r.status, r.stderr).toBe(1);
  });

  it("fails explicitly when the records file cannot be written", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab24-unwritable-records-"));
    try {
      const r = node(APPROVALS, "--count", join(FIX, "approvals", "pr-comments.json"),
        "--out", join(dir, "missing", "records.json"));
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("approvals.mjs:");
      expect(r.stdout).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("counts a decision posted twice once", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab24-approvals-"));
    try {
      const raw = JSON.parse(readFileSync(join(FIX, "approvals", "pr-comments.json"), "utf8"));
      const later = (x: { created_at?: string; submitted_at?: string }) => ({
        ...x,
        ...(x.created_at ? { created_at: x.created_at.replace(/^2026/, "2027") } : {}),
        ...(x.submitted_at ? { submitted_at: x.submitted_at.replace(/^2026/, "2027") } : {}),
      });
      const doubled = join(dir, "doubled.json");
      writeFileSync(doubled, JSON.stringify({
        comments: [...raw.comments, ...raw.comments.map(later)],
        reviews: [...raw.reviews, ...raw.reviews.map(later)],
      }));
      const r = node(APPROVALS, "--count", doubled);
      expect(r.status, r.stderr).toBe(0);
      const committed = JSON.parse(readFileSync(join(FIX, "approvals", "approvals-of-record.json"), "utf8"));
      const counted = JSON.parse(r.stdout);
      expect(counted.records).toEqual(committed);
      expect(counted.counts).toEqual({ approve: 4, reject: 1, escalated: 0 });
      expect(counted.rework_rounds).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("lab24: gh-aw funnel", () => {
  const md = readFileSync(join(ROOT, ".github", "workflows", "sdlc-funnel.md"), "utf8");
  const fm = matter(md).data as Record<string, any>;

  it("is staged, capped and guarded", () => {
    expect(fm.on.push.paths).toContain("stage-events/**");
    expect(fm["safe-outputs"].staged).toBe(true);
    for (const k of ["add-comment", "assign-to-user", "add-reviewer", "update-project"]) {
      expect(fm["safe-outputs"][k].max, k).toBeGreaterThan(0);
    }
    expect(fm["safe-outputs"]["assign-to-user"].allowed.length).toBeGreaterThan(0);
    expect(JSON.stringify(fm["pre-agent-steps"])).toContain("route.mjs");
    expect(JSON.stringify(fm["safe-outputs"].steps)).toContain("--check");
    expect(fm.permissions).not.toHaveProperty("issues", "write");
    expect(fm).not.toHaveProperty("strict");
  });

  it("has a compiled lock committed beside it", () => {
    const lock = readFileSync(join(ROOT, ".github", "workflows", "sdlc-funnel.lock.yml"), "utf8");
    expect(lock).toContain("route.mjs");
  });
});
