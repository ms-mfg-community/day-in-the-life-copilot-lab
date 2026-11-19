import { FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const PRESET_YML = `preset:
  id: contoso-sdd
  name: "Contoso Enterprise SDD Preset"
  version: "1.0.0"

provides:
  templates:
    - type: template
      name: spec-template
      file: templates/spec-template.md
      strategy: replace
    - type: template
      name: plan-template
      file: templates/plan-template.md
      strategy: wrap
    - type: template
      name: tasks-template
      file: templates/tasks-governance.md
      strategy: append
`;

const PLAN_WRAP_TEMPLATE = `# Contoso Architecture & Security Gate (Wrapper)

> Required before implementation: threat-model sign-off and rollback plan.

{CORE_TEMPLATE}

## Contoso Sign-Off Checklist
- [ ] Threat model reviewed
- [ ] Rollback procedure documented
`;

export const lab22: Lab = {
  id: "lab22",
  number: "22",
  title: "Centralized Spec Kit Templates & the Org Catalog",
  tagline:
    "The four-layer resolution stack, replace/wrap/append strategies, bundle.yml, and discovery-vs-install catalogs.",
  steps: [
    {
      key: "lab22/preset",
      title: "The resolution stack and composition strategies",
      kind: "mixed",
      verifyId: "lab22/preset",
      body: (
        <>
          <p>
            Forking Spec Kit to customize templates turns every upstream release
            into a merge conflict. Instead, Spec Kit resolves each template{" "}
            <strong>independently</strong> through a four-layer stack (highest
            precedence first):
          </p>
          <Snippet title="template resolution order (lower priority number wins)">{`1. .specify/templates/overrides/   (project-local overrides)
2. .specify/presets/<id>/          (installed presets — default priority 10, lower wins)
3. .specify/extensions/<id>/       (installed extensions)
4. .specify/templates/             (Spec Kit core)`}</Snippet>
          <p>
            A preset can <code>replace</code>, <code>prepend</code>,{" "}
            <code>append</code>, or <code>wrap</code> core templates without
            forking core. A <code>wrap</code> template must include the literal{" "}
            <code>{"{CORE_TEMPLATE}"}</code> placeholder (scripts use{" "}
            <code>$CORE_SCRIPT</code>). Author the Contoso preset manifest and
            its wrapped plan template:
          </p>
          <FileCard
            path=".specify/presets/contoso-sdd/preset.yml"
            content={PRESET_YML}
            label=".specify/presets/contoso-sdd/preset.yml"
          />
          <FileCard
            path=".specify/presets/contoso-sdd/templates/plan-template.md"
            content={PLAN_WRAP_TEMPLATE}
            label=".specify/presets/contoso-sdd/templates/plan-template.md"
          />
        </>
      ),
    },
    {
      key: "lab22/catalog",
      title: "Surface layouts, catalog replacement, and bundle.yml",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Four operational traps in Spec Kit cost platform teams hours if they
            are not taught explicitly:
          </p>
          <ul>
            <li>
              <strong>Surface layout split:</strong> default{" "}
              <code>specify init --integration copilot</code> writes{" "}
              <code>.github/skills/speckit-*/SKILL.md</code> (hyphenated slash
              commands in VS Code, and skills-mode prompts when Spec Kit
              dispatches CLI steps, leaving <code>.github/agents/</code> empty).
              Pass <code>--integration-options=&quot;--commands&quot;</code> to
              write <code>.github/agents/speckit.&lt;cmd&gt;.agent.md</code>{" "}
              custom agents for Copilot CLI&apos;s <code>/agent</code> picker
              and <code>--agent</code> flag.
            </li>
            <li>
              <strong>
                <code>--preset</code> does not take a URL:
              </strong>{" "}
              passing a URL prints a warning and <strong>exits 0</strong>,
              leaving the project unconfigured. Install archives after init with{" "}
              <code>specify preset add --from &lt;url&gt;</code>.
            </li>
            <li>
              <strong>Catalog config replaces defaults:</strong> creating{" "}
              <code>.specify/preset-catalogs.yml</code> replaces the built-in{" "}
              <code>default</code> + <code>community</code> stack entirely —
              re-declare <code>community</code> with{" "}
              <code>install_allowed: false</code> so discovery still works while
              unreviewed installs are refused.
            </li>
            <li>
              <strong>
                <code>specify preset resolve</code> takes a template name:
              </strong>{" "}
              pass <code>spec-template</code> or <code>plan-template</code>, not
              the preset ID <code>contoso-sdd</code>.
            </li>
          </ul>
          <Note>
            <code>bundle.yml</code> pins a preset, extension, and workflow
            version together so a repository never runs this quarter&apos;s
            templates against last quarter&apos;s workflow.
          </Note>
          <Quiz
            stepKey="lab22/catalog"
            question="Your team creates .specify/preset-catalogs.yml with only your internal contoso-approved catalog (install_allowed: true), and developers report that specify preset search no longer finds any community presets. Why?"
            options={[
              "install_allowed: true disables search across all catalogs",
              "Spec Kit's catalog resolution returns the first configuration layer that exists — a project .specify/preset-catalogs.yml replaces the built-in default + community stack instead of merging with it, so community must be re-declared with install_allowed: false",
              "Community presets require --integration-options='--commands'",
            ]}
            correct={1}
            explain="Catalog layers do not merge: once .specify/preset-catalogs.yml exists, the built-in catalog list is skipped unless you explicitly include the community entry (with install_allowed: false for discovery-only governance)."
          />
        </>
      ),
    },
  ],
};
