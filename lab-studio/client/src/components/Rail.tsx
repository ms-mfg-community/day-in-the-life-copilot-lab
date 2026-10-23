import { api } from "../api";
import { refreshTree } from "../controller";
import { labs } from "../labs";
import { useStudio } from "../store";

export function Rail(): JSX.Element {
  const location = useStudio((s) => s.location);
  const progress = useStudio((s) => s.progress);
  const navigate = useStudio((s) => s.navigate);
  const resetProgress = useStudio((s) => s.resetProgress);

  return (
    <aside className="rail" aria-label="Lab navigation">
      <button
        className="rail-brand"
        onClick={() => navigate({ labIdx: -1, stepIdx: 0 })}
      >
        <div className="mark">Everything GitHub Copilot</div>
        <div className="name">Lab Studio</div>
      </button>
      <nav>
        {labs.map((lab, labIdx) => {
          const allDone = lab.steps.every((s) => progress[s.key]);
          return (
            <div className="rail-lab" key={lab.id}>
              <button
                className={`rail-lab-head${allDone ? " done" : ""}`}
                onClick={() => navigate({ labIdx, stepIdx: 0 })}
              >
                <span className="num">{allDone ? "✓" : lab.number}</span>
                <span>{lab.title}</span>
              </button>
              <ul className="rail-steps">
                {lab.steps.map((step, stepIdx) => (
                  <li key={step.key}>
                    <button
                      className={`rail-step${location.labIdx === labIdx && location.stepIdx === stepIdx ? " active" : ""}`}
                      onClick={() => navigate({ labIdx, stepIdx })}
                    >
                      <span
                        className={`punch${progress[step.key] ? " done" : ""}`}
                      />
                      <span>{step.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="rail-foot">
        <button
          onClick={() => {
            if (
              !window.confirm(
                "Reset the workspace to its starting state and clear all progress?",
              )
            )
              return;
            void api.resetSandbox().then(() => {
              resetProgress();
              void refreshTree();
              window.location.reload();
            });
          }}
        >
          reset workspace
        </button>
      </div>
    </aside>
  );
}
