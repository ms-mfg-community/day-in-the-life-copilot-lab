import { useStudio } from "../store";
import { FilesPanel } from "./FilesPanel";
import { Terminal } from "./Terminal";

function StatusLamp(): JSX.Element {
  const meta = useStudio((s) => s.sessionMeta);
  const copilotBusy = useStudio((s) => s.copilotBusy);
  const state = !meta?.active ? "off" : copilotBusy ? "busy" : "idle";
  const label =
    state === "off"
      ? "no session"
      : state === "busy"
        ? "copilot working"
        : "session idle";
  return (
    <div className={`lamp ${state}`} title={meta?.sessionId ?? undefined}>
      <span className="lamp-dot" />
      <span>{label}</span>
      {meta?.selectedAgent ? (
        <span style={{ color: "#a98ef5" }}>· {meta.selectedAgent}</span>
      ) : null}
    </div>
  );
}

export function Bench(): JSX.Element {
  const tab = useStudio((s) => s.benchTab);
  const setTab = useStudio((s) => s.setBenchTab);
  return (
    <section className="bench" aria-label="Lab bench">
      <div className="bench-bar">
        <button
          className={`bench-tab${tab === "terminal" ? " active" : ""}`}
          onClick={() => setTab("terminal")}
        >
          Terminal
        </button>
        <button
          className={`bench-tab${tab === "files" ? " active" : ""}`}
          onClick={() => setTab("files")}
        >
          Files
        </button>
        <StatusLamp />
      </div>
      {tab === "terminal" ? <Terminal /> : <FilesPanel />}
    </section>
  );
}
