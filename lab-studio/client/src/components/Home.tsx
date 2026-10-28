import { useEffect, useState } from "react";
import { api } from "../api";
import { labs } from "../labs";
import { useStudio } from "../store";

interface CheckState {
  server: boolean | null;
  sandbox: boolean | null;
}

export function Home(): JSX.Element {
  const navigate = useStudio((s) => s.navigate);
  const progress = useStudio((s) => s.progress);
  const [checks, setChecks] = useState<CheckState>({
    server: null,
    sandbox: null,
  });

  useEffect(() => {
    api
      .health()
      .then(() => setChecks({ server: true, sandbox: true }))
      .catch(() => setChecks({ server: false, sandbox: false }));
  }, []);

  const doneCount = labs.reduce(
    (n, lab) => n + lab.steps.filter((s) => progress[s.key]).length,
    0,
  );
  const totalCount = labs.reduce((n, lab) => n + lab.steps.length, 0);

  return (
    <div className="home-hero">
      <div className="eyebrow">
        <span>Everything GitHub Copilot · Labs 01–05</span>
      </div>
      <div className="big">
        The Copilot workshop,
        <br />
        running <span className="accent">live on your bench</span>.
      </div>
      <p>
        This studio walks you through the first five labs of the{" "}
        <em>Everything GitHub Copilot</em> workshop without leaving the browser.
        The manual on this side teaches; the dark bench on the right is a real
        instrument — a <strong>live GitHub Copilot session</strong> driven
        through the official Copilot SDK, working inside a disposable lab
        workspace.
      </p>
      <div className="legend">
        <span className="badge live">live · real Copilot</span>
        <span className="badge sim">
          simulated · remote git &amp; marketplace
        </span>
        <span className="badge done">
          verified · checked against the workspace
        </span>
      </div>
      <p>
        Everything blue is real: prompts, agents, skills, instructions, and MCP
        tool calls round-trip through Copilot itself. Everything amber is
        simulated so you never need a GitHub remote, a fork, or a network
        marketplace. Each step ends with a <strong>Verify</strong> check that
        inspects your actual workspace — not your honesty.
      </p>

      <div className="syscheck" aria-live="polite">
        <div className="row">
          <span
            className={
              checks.server === null ? "" : checks.server ? "ok" : "bad"
            }
          >
            {checks.server === null ? "…" : checks.server ? "●" : "●"}
          </span>
          <span>Lab Studio server</span>
          <span style={{ marginLeft: "auto" }}>
            {checks.server === null
              ? "checking"
              : checks.server
                ? "connected"
                : "unreachable — run `npm run dev` in lab-studio/"}
          </span>
        </div>
        <div className="row">
          <span
            className={
              checks.sandbox === null ? "" : checks.sandbox ? "ok" : "bad"
            }
          >
            ●
          </span>
          <span>Lab workspace (sandboxed copy of ContosoUniversity)</span>
          <span style={{ marginLeft: "auto" }}>
            {checks.sandbox ? "ready" : "—"}
          </span>
        </div>
        <div className="row">
          <span className="ok">●</span>
          <span>Copilot CLI auth</span>
          <span style={{ marginLeft: "auto" }}>
            uses this machine's `copilot login` — tested when a session starts
          </span>
        </div>
      </div>

      <h2>The five labs</h2>
      <table>
        <thead>
          <tr>
            <th>Lab</th>
            <th>What you'll do</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {labs.map((lab, i) => {
            const done = lab.steps.filter((s) => progress[s.key]).length;
            return (
              <tr key={lab.id}>
                <td>
                  <code>{lab.number}</code> {lab.title}
                </td>
                <td>{lab.tagline}</td>
                <td>
                  {done}/{lab.steps.length}
                  {done === lab.steps.length ? " ✓" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="step-nav" style={{ borderTop: "none", marginTop: 20 }}>
        <span
          style={{
            alignSelf: "center",
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
        >
          {doneCount}/{totalCount} steps verified
        </span>
        <button
          className="primary"
          onClick={() => navigate({ labIdx: 0, stepIdx: 0 })}
        >
          {doneCount > 0 ? "Continue →" : "Start Lab 01 →"}
        </button>
      </div>
    </div>
  );
}
