import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";

const ROOT = process.cwd();
const BUNDLE_DIR = join(ROOT, "enterprise-harness-bundle");
const MANIFEST = yaml.load(
  readFileSync(join(BUNDLE_DIR, "manifest.yaml"), "utf8"),
) as {
  entrypoints: { agents: string[]; skills: string[] };
  mcp_servers?: Array<{ pin?: string }>;
};

describe("enterprise-harness-bundle: agent bindings", () => {
  it.each(MANIFEST.entrypoints.agents)(
    "%s declares a least-privilege tools list",
    (relativePath) => {
      const parsed = matter(
        readFileSync(join(BUNDLE_DIR, relativePath), "utf8"),
      );
      const tools = parsed.data.tools as unknown;

      expect(Array.isArray(tools), `${relativePath} must declare tools`).toBe(
        true,
      );
      expect(tools).not.toHaveLength(0);
      expect(tools).not.toContain("*");
      expect(
        (tools as string[]).some((tool) => tool.includes("*")),
        `${relativePath} must not use wildcard tools`,
      ).toBe(false);
    },
  );

  it("scopes QA evidence and verdict writes to its MCP server", () => {
    const qa = matter(
      readFileSync(join(BUNDLE_DIR, "agents", "qa-reviewer.md"), "utf8"),
    );

    expect(qa.data.tools).not.toContain("execute");
    expect(qa.data.tools).not.toContain("edit");
    expect(qa.data.tools).toContain("qa-boundary/run_evidence");
    expect(qa.data.tools).toContain("qa-boundary/write_verdict");
    expect(qa.data["mcp-servers"]["qa-boundary"]).toEqual({
      command: "node",
      args: ["${PLUGIN_ROOT}/scripts/qa-boundary-mcp.mjs"],
      tools: ["run_evidence", "write_verdict"],
    });
    expect(qa.content).toContain("qa-boundary/run_evidence");
    expect(qa.content).toContain("qa-boundary/write_verdict");
  });

  it("binds stage agents to centrally owned commands and skills", () => {
    const spec = readFileSync(
      join(BUNDLE_DIR, "agents", "spec-author.md"),
      "utf8",
    );
    const qa = readFileSync(
      join(BUNDLE_DIR, "agents", "qa-reviewer.md"),
      "utf8",
    );

    expect(spec).toContain("speckit.specify");
    expect(qa).toContain("qa-review");
  });

  it("references the exact centrally owned stage commands", () => {
    const qaSkill = readFileSync(
      join(BUNDLE_DIR, "skills", "qa-review", "SKILL.md"),
      "utf8",
    );
    const spec = matter(
      readFileSync(join(BUNDLE_DIR, "agents", "spec-author.md"), "utf8"),
    );

    expect(qaSkill).toContain("`speckit.contoso-review.qa-review`");
    expect(spec.content).toContain("`speckit.specify`");
    expect(spec.data.tools).toContain("agent");
  });

  it("does not ship unpinned MCP servers", () => {
    for (const server of MANIFEST.mcp_servers ?? []) {
      expect(server.pin).toBeTruthy();
      expect(server.pin).not.toBe("latest");
    }
  });

  it("keeps skill directory names aligned with skill frontmatter", () => {
    for (const relativePath of MANIFEST.entrypoints.skills) {
      const parsed = matter(
        readFileSync(join(BUNDLE_DIR, relativePath), "utf8"),
      );
      const directory = basename(dirname(join(BUNDLE_DIR, relativePath)));
      expect(parsed.data.name).toBe(directory);
    }
  });
});
