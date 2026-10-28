import { Note, Quiz } from "./content";
import type { Lab } from "./types";

export const lab17: Lab = {
  id: "lab17",
  number: "17",
  title: "GitHub Admin Controls",
  tagline:
    "The AI Controls nav, the 2026 default-on model policy, and what the audit log does — and pointedly does not — capture.",
  steps: [
    {
      key: "lab17/controls",
      title: "AI Controls & the default-on model policy",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Labs 01–16 were the developer's view. This is the admin's: a
            dedicated <strong>AI Controls</strong> area in enterprise/org
            settings covering custom AI-scoped admin roles, agent session
            activity (filterable by repo/actor/time), the managed-settings
            source-org selection from Lab 16, and the global model availability
            policy.
          </p>
          <p>
            That last one is 2026's biggest policy shift. Previously a newly-GA
            model was effectively <em>off</em> until an admin enabled it. Since
            2026-08-26, the global{" "}
            <strong>"Default availability for released models"</strong> policy
            flips that:{" "}
            <strong>
              any GA model an admin hasn't explicitly configured is available by
              default.
            </strong>{" "}
            Two categories stay off regardless: open-weight models, and models
            not covered by GitHub's data retention agreement.
          </p>
          <Note>
            This is why a learner's <code>/model</code> picker can show models a
            curated tier list never anticipated — that's the new platform
            default, not a bug. The old curated-allowlist behavior is one global
            switch away.
          </Note>
          <Quiz
            stepKey="lab17/controls"
            question="Your enterprise wants engineers to only ever pick from a small, security-reviewed model set — no silent additions when GitHub ships a new model. What's the move?"
            options={[
              "Nothing — new models are always off until enabled",
              'Disable the global "default availability for released models" policy, then explicitly enable each reviewed model',
              "Set model: auto in managed-settings.json",
            ]}
            correct={1}
            explain="Disabling the global policy restores the curated-allowlist behavior — at the cost of manually enabling each future model the org actually wants. That follow-on governance burden is part of the answer."
          />
        </>
      ),
    },
    {
      key: "lab17/audit",
      title: "Audit logs for AI activity",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            The audit log records Copilot{" "}
            <em>plan, settings and policy changes</em>, and{" "}
            <em>agent activity on GitHub</em>. Two documented fields make agent
            events analyzable: <code>actor_is_agent</code> (always true for
            agentic events — separates agent-initiated from human-initiated) and{" "}
            <code>agent_session_id</code> (correlates every event of one agent
            session). Retention: 180 days standard; stream to a SIEM for longer.
          </p>
          <Note tone="warn">
            <strong>Explicitly excluded:</strong> the content of local IDE/CLI
            sessions. Prompts, responses, and generated code in Copilot CLI are{" "}
            <em>not</em> in the audit log. It tells you <em>that</em> an agent
            session ran and <em>what policy/config</em> it touched — never the
            literal conversation. Don't design a compliance story that assumes
            otherwise.
          </Note>
          <Quiz
            stepKey="lab17/audit"
            question='A security reviewer asks: "Can we see exactly what a developer asked Copilot CLI locally last Tuesday?" What does the audit log give you?'
            options={[
              "Yes — full prompt and response text, for 180 days",
              "Policy/config events and the fact that agent sessions ran — never local conversation content",
              "Only if the developer opted into telemetry",
            ]}
            correct={1}
            explain="Local CLI/IDE conversation content is explicitly out of scope. Capturing it would need a separate, locally-enforced mechanism the org opts into (e.g. a logging hook) — not the platform audit log."
          />
        </>
      ),
    },
  ],
};
