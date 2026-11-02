import { Cmd, FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const MANIFEST = `name: contoso-copilot-starter
version: 1.0.0
description: "Contoso's starter plugin: a greeting agent plus org conventions"
minimum_cli_version: "1.0.100"
entrypoints:
  agents:
    - agents/greeter.agent.md
`;

const GREETER_AGENT = `---
name: "greeter"
description: "Demonstration agent bundled with the contoso-copilot-starter plugin."
tools: ["read"]
---

You are the greeter agent from the contoso-copilot-starter plugin. When
invoked, confirm the plugin name and version you shipped with, then help
with the request.
`;

const ORG_POLICY = `default_action: deny
allowlist:
  - source: "contoso-internal/contoso-copilot-plugins"
  - source: "contoso-internal/*"
  - source: "github/awesome-copilot"
require:
  signed_releases: true
  sbom: true
`;

export const lab11: Lab = {
  id: "lab11",
  number: "11",
  title: "Building & Distributing a Plugin",
  tagline:
    "Scaffold a plugin, install it from a local source, and evaluate a deny-by-default org allowlist.",
  steps: [
    {
      key: "lab11/scaffold",
      title: "Anatomy: scaffold and install",
      kind: "mixed",
      verifyId: "lab11/scaffold",
      body: (
        <>
          <p>
            A plugin is a directory that bundles components — agents, skills,
            hooks, prompts, MCP wiring — behind a manifest. Build a minimal one:
          </p>
          <FileCard path="my-plugin/manifest.yaml" content={MANIFEST} />
          <FileCard
            path="my-plugin/agents/greeter.agent.md"
            content={GREETER_AGENT}
          />
          <p>
            Install it from the local directory source and confirm it loaded:
          </p>
          <Cmd
            lines={[
              "copilot plugin install ./my-plugin",
              "copilot plugin list",
            ]}
          />
          <Note>
            <strong>Key contract from the workshop repo:</strong> the manifest's{" "}
            <code>minimum_cli_version</code> must match the registry's{" "}
            <code>copilot_cli_version_floor</code> — CI enforces it. And note
            the real CLI loads plugins through a <code>plugin.json</code>; the
            workshop's <code>manifest.yaml</code> is the supply-chain teaching
            scaffold around it.
          </Note>
        </>
      ),
    },
    {
      key: "lab11/registry",
      title: "Private registries & the release pipeline",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            The enterprise pattern is a <strong>private org repo</strong> —{" "}
            <code>contoso-internal/contoso-copilot-plugins</code> — that hosts
            plugins. Consumers install with{" "}
            <code>
              copilot plugin install contoso-internal/contoso-copilot-plugins
            </code>
            , and the org pins the registry at the onboarding layer:
          </p>
          <Snippet title="local pin (devcontainer / CI image / shell profile)">{`export COPILOT_PLUGIN_REGISTRIES="contoso-internal/contoso-copilot-plugins"`}</Snippet>
          <p>
            That env var is a <em>local, opt-in</em> pin. The centrally{" "}
            <strong>enforced</strong> mechanism is{" "}
            <code>managed-settings.json</code> (Lab 16). The release pipeline
            carries the supply-chain story: a <code>vMAJOR.MINOR.PATCH</code>{" "}
            tag validates the manifest version, generates a{" "}
            <strong>CycloneDX SBOM</strong>, attests build provenance, and cuts
            the GitHub Release. Deprecation discipline: never delete a shipped
            version — announce, point at the replacement, keep it installable.
          </p>
          <Quiz
            stepKey="lab11/registry"
            question="A developer's machine sets COPILOT_PLUGIN_REGISTRIES to the org registry. Can they still install a plugin from a random public repo?"
            options={[
              "No — the env var blocks all other sources",
              "Yes — it's a convention-level pin, not enforcement; central enforcement needs managed-settings.json",
              "Only if the plugin has no SBOM",
            ]}
            correct={1}
            explain="The env var is an onboarding-layer convention. Deny-by-default enforcement on every client is what strictKnownMarketplaces in managed-settings.json provides (Lab 16)."
          />
        </>
      ),
    },
    {
      key: "lab11/policy",
      title: "The org allowlist policy",
      kind: "mixed",
      verifyId: "lab11/policy",
      body: (
        <>
          <p>
            The workshop models the decision logic as a small, portable
            evaluator over a <strong>deny-by-default</strong> policy file.
            Author it, then evaluate both sides of the decision:
          </p>
          <FileCard path="my-plugin/org-policy.yaml" content={ORG_POLICY} />
          <Cmd
            lines={[
              "policy check random-user/untrusted-plugin",
              "policy check contoso-internal/anything-else",
            ]}
          />
          <Note tone="warn">
            <strong>
              <code>require:</code> is declared intent, not enforcement.
            </strong>{" "}
            The evaluator reads only the default action and the allowlist — an
            allowlisted source passes even with no signature and no SBOM.
            Signing and SBOMs get enforced where releases are built (the
            pipeline), not in this file.
          </Note>
        </>
      ),
    },
  ],
};
