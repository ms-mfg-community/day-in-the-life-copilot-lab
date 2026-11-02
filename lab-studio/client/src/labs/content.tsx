import { useState, type ReactNode } from "react";
import {
  insertFile,
  openWorkspaceFile,
  runRestartSequence,
  runSequence,
} from "../controller";
import { useStudio } from "../store";

/** Building blocks the lab manuals are written with. */

export function Note({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "sim" | "warn";
}): JSX.Element {
  return (
    <div
      className={`note${tone === "sim" ? " sim-note" : tone === "warn" ? " warn" : ""}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  kind,
}: {
  kind: "live" | "sim" | "read";
}): JSX.Element {
  const label =
    kind === "live"
      ? "live · real Copilot"
      : kind === "sim"
        ? "simulated"
        : "reading";
  return <span className={`badge ${kind}`}>{label}</span>;
}

/**
 * A command card: shows the command, runs it in the bench terminal.
 * With `restart`, a leading `copilot` line becomes a session restart — the
 * studio types `/new` when a session is already running, `copilot` otherwise.
 */
export function Cmd({
  lines,
  label,
  restart,
}: {
  lines: string[];
  label?: string;
  restart?: boolean;
}): JSX.Element {
  const busy = useStudio((s) => s.termBusy || s.copilotBusy);
  const setBenchTab = useStudio((s) => s.setBenchTab);
  const run = (): void => {
    setBenchTab("terminal");
    if (restart) {
      void runRestartSequence(lines.filter((l) => l !== "copilot"));
    } else {
      void runSequence(lines);
    }
  };
  return (
    <div className="snippet">
      <div className="snippet-head">
        <span>{label ?? "terminal"}</span>
        {restart ? (
          <span>restarts the session — /new if one is running</span>
        ) : null}
      </div>
      <pre>{lines.map((l) => `$ ${l}`).join("\n")}</pre>
      <div className="card-actions">
        <button className="action run" disabled={busy} onClick={run}>
          Run it ▸
        </button>
      </div>
    </div>
  );
}

/** A Copilot prompt card: ensures a session, optionally selects an agent, sends the prompt. */
export function PromptCard({
  prompt,
  agent,
  label,
}: {
  prompt: string;
  agent?: string;
  label?: string;
}): JSX.Element {
  const busy = useStudio((s) => s.termBusy || s.copilotBusy);
  const mode = useStudio((s) => s.termMode);
  const meta = useStudio((s) => s.sessionMeta);
  const setBenchTab = useStudio((s) => s.setBenchTab);

  const run = (): void => {
    setBenchTab("terminal");
    const lines: string[] = [];
    if (mode === "shell") lines.push("copilot");
    if (agent && meta?.selectedAgent !== agent) lines.push(`/agent ${agent}`);
    lines.push(prompt);
    void runSequence(lines);
  };

  return (
    <div className="snippet">
      <div className="snippet-head">
        <span>
          {label ??
            (agent ? `copilot session · agent: ${agent}` : "copilot session")}
        </span>
        <span style={{ color: "#6aa5f5" }}>live</span>
      </div>
      <pre>{prompt}</pre>
      <div className="card-actions">
        <button className="action run" disabled={busy} onClick={run}>
          Send to Copilot ▸
        </button>
      </div>
    </div>
  );
}

/** A file-creation/edit card: open in the Files tab, or write it in one click. */
export function FileCard({
  path,
  content,
  label,
  mode = "create",
}: {
  path: string;
  content: string;
  label?: string;
  mode?: "create" | "replace";
}): JSX.Element {
  const [inserted, setInserted] = useState(false);
  return (
    <div className="snippet">
      <div className="snippet-head">
        <span>{label ?? path}</span>
        <span>{mode === "create" ? "new file" : "full file contents"}</span>
      </div>
      <pre>{content}</pre>
      <div className="card-actions">
        <button
          className="action run"
          onClick={() => {
            void insertFile(
              path,
              content.endsWith("\n") ? content : content + "\n",
            ).then(() => setInserted(true));
          }}
        >
          {inserted ? "Written ✓" : "Insert for me ▸"}
        </button>
        <button
          className="action ghost"
          onClick={() => void openWorkspaceFile(path, content)}
        >
          Open in Files
        </button>
      </div>
    </div>
  );
}

/** Static code/snippet display without actions. */
export function Snippet({
  title,
  children,
}: {
  title?: string;
  children: string;
}): JSX.Element {
  return (
    <div className="snippet">
      {title ? (
        <div className="snippet-head">
          <span>{title}</span>
        </div>
      ) : null}
      <pre>{children}</pre>
    </div>
  );
}

export function OpenFileButton({
  path,
  children,
}: {
  path: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <button
      className="action paper"
      style={{ margin: "4px 0" }}
      onClick={() => void openWorkspaceFile(path)}
    >
      {children ?? `Open ${path}`}
    </button>
  );
}

/**
 * A knowledge check. For read-only steps the quiz IS the verification:
 * answering correctly marks the step complete.
 */
export function Quiz({
  stepKey,
  question,
  options,
  correct,
  explain,
}: {
  stepKey?: string;
  question: string;
  options: string[];
  correct: number;
  explain: string;
}): JSX.Element {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const markDone = useStudio((s) => s.markDone);
  const isRight = picked === correct;
  return (
    <div className="quiz">
      <div className="quiz-q">{question}</div>
      {options.map((option, i) => (
        <label key={i}>
          <input
            type="radio"
            name={stepKey ?? question}
            checked={picked === i}
            onChange={() => {
              setPicked(i);
              setChecked(false);
            }}
          />
          <span>{option}</span>
        </label>
      ))}
      <div className="card-actions" style={{ background: "none", borderTop: "none", padding: "8px 0 0" }}>
        <button
          className="action verify"
          disabled={picked === null}
          onClick={() => {
            setChecked(true);
            if (picked === correct && stepKey) markDone(stepKey);
          }}
        >
          Check answer ▸
        </button>
      </div>
      {checked ? (
        <div className={`quiz-result ${isRight ? "ok" : "no"}`}>
          {isRight ? `✓ Right. ${explain}` : "✕ Not quite — think it through and try again."}
        </div>
      ) : null}
    </div>
  );
}

/** Opens the bench's GitHub tab. */
export function GitHubTabButton({ children }: { children?: ReactNode }): JSX.Element {
  const setBenchTab = useStudio((s) => s.setBenchTab);
  return (
    <button className="action paper" style={{ margin: "4px 0" }} onClick={() => setBenchTab("github")}>
      {children ?? "Open the GitHub tab"}
    </button>
  );
}
