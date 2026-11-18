import { api } from "../api";
import { refreshTree } from "../controller";
import { TRACKS, formatLabRange, labIndexById, labs } from "../labs";
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
        {TRACKS.map((track) => {
          const trackLabs = track.labIds.flatMap((labId) => {
            const lab = labs[labIndexById(labId)];
            return lab ? [lab] : [];
          });
          const trackSteps = trackLabs.flatMap((lab) => lab.steps);
          const trackDone = trackSteps.filter((s) => progress[s.key]).length;
          return (
            <div
              className="rail-track"
              key={track.id}
              role="group"
              aria-labelledby={`rail-${track.id}`}
            >
              <div className="rail-track-header" id={`rail-${track.id}`}>
                <div className="rail-track-eyebrow">
                  <span>Track {track.number}</span>
                  <span className="rail-track-progress">
                    {trackDone}/{trackSteps.length}
                  </span>
                </div>
                <div className="rail-track-title">{track.title}</div>
                <div className="rail-track-labs">
                  Labs {formatLabRange(track.labIds)}
                </div>
              </div>
              {trackLabs.map((lab) => {
                const labIdx = labIndexById(lab.id);
                const allDone = lab.steps.every((s) => progress[s.key]);
                const doneCount = lab.steps.filter(
                  (s) => progress[s.key],
                ).length;
                const isActive = location.labIdx === labIdx;
                return (
                  <div
                    className="rail-lab"
                    key={lab.id}
                    style={{ marginTop: isActive ? 10 : 2 }}
                  >
                    <button
                      className={`rail-lab-head${allDone ? " done" : ""}`}
                      onClick={() => navigate({ labIdx, stepIdx: 0 })}
                    >
                      <span className="num">{allDone ? "✓" : lab.number}</span>
                      <span>{lab.title}</span>
                      {!isActive && doneCount > 0 && !allDone ? (
                        <span style={{ marginLeft: "auto", opacity: 0.6 }}>
                          {doneCount}/{lab.steps.length}
                        </span>
                      ) : null}
                    </button>
                    {isActive ? (
                      <ul className="rail-steps">
                        {lab.steps.map((step, stepIdx) => (
                          <li key={step.key}>
                            <button
                              className={`rail-step${location.stepIdx === stepIdx ? " active" : ""}`}
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
                    ) : null}
                  </div>
                );
              })}
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
