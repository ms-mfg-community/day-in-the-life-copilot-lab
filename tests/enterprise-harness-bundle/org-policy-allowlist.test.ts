import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";

const ROOT = process.cwd();
const BUNDLE_DIR = join(ROOT, "enterprise-harness-bundle");
const POLICY_PATH = join(BUNDLE_DIR, "org-policy.example.yaml");
const POLICY_MODULE = join(BUNDLE_DIR, "scripts", "policy.mjs");

describe("enterprise-harness-bundle: org-policy allowlist", () => {
  it("org-policy.example.yaml exists and parses", () => {
    expect(existsSync(POLICY_PATH)).toBe(true);
    const parsed = yaml.load(readFileSync(POLICY_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    expect(parsed.default_action).toBe("deny");
    expect(Array.isArray(parsed.allowlist)).toBe(true);
    expect((parsed.allowlist as unknown[]).length).toBeGreaterThan(0);
  });

  it("require block is documentation-only and ignored by isAllowed()", () => {
    const parsed = yaml.load(readFileSync(POLICY_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    // The require block exists in the YAML for documentation purposes
    expect(parsed.require).toBeDefined();
    // Verify the YAML has the documentation comment by checking raw content
    const raw = readFileSync(POLICY_PATH, "utf8");
    expect(raw).toMatch(/Documentation-only/);
  });

  it("isAllowed() accepts a source listed in the allowlist", async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = yaml.load(readFileSync(POLICY_PATH, "utf8"));
    const decision = mod.isAllowed(
      policy,
      "contoso-internal/enterprise-copilot-harness",
    );
    expect(decision.allowed).toBe(true);
  });

  it("isAllowed() rejects a source not in the allowlist (deny-by-default)", async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = yaml.load(readFileSync(POLICY_PATH, "utf8"));
    const decision = mod.isAllowed(policy, "random-user/untrusted-plugin");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/allowlist|deny/i);
  });

  it("isAllowed() supports glob patterns in allowlist entries", async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = {
      default_action: "deny",
      allowlist: [{ source: "contoso-internal/*" }],
    };
    expect(mod.isAllowed(policy, "contoso-internal/anything").allowed).toBe(
      true,
    );
    expect(mod.isAllowed(policy, "other-org/plugin").allowed).toBe(false);
  });

  it("isAllowed() segment-wildcard `*` does not cross `/` boundaries", async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = {
      default_action: "deny",
      allowlist: [{ source: "contoso-internal/*" }],
    };
    expect(mod.isAllowed(policy, "contoso-internal/foo/bar").allowed).toBe(
      false,
    );
    expect(mod.isAllowed(policy, "contoso-internal/foo").allowed).toBe(true);
  });

  it("isAllowed() does not read or enforce the require block", async () => {
    const mod = await import(pathToFileURL(POLICY_MODULE).href);
    const policy = {
      default_action: "deny",
      allowlist: [{ source: "org/repo" }],
      require: { signed_releases: true, sbom: true },
    };
    // require block has no effect on the allow/deny decision
    const decision = mod.isAllowed(policy, "org/repo");
    expect(decision.allowed).toBe(true);
    expect(decision.reason).not.toMatch(/require|signed|sbom/i);
  });
});
