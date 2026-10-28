import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { labs } from "../labs";
import { useStudio } from "../store";
import type { VerifyState } from "../types";
import { Badge } from "../labs/content";
import { Home } from "./Home";

function VerifyCard({
  verifyId,
  stepKey,
}: {
  verifyId: string;
  stepKey: string;
}): JSX.Element {
  const [state, setState] = useState<VerifyState | null>(null);
  const [checking, setChecking] = useState(false);
  const done = useStudio((s) => Boolean(s.progress[stepKey]));
  const markDone = useStudio((s) => s.markDone);

  const check = (): void => {
    setChecking(true);
    api
      .verify(verifyId)
      .then((result) => {
        setState(result);
        if (result.pass) markDone(stepKey);
      })
      .catch((error: unknown) =>
        setState({
          pass: false,
          message: error instanceof Error ? error.message : String(error),
        }),
      )
      .finally(() => setChecking(false));
  };

  return (
    <div className={`verify-card${done ? " pass" : ""}`}>
      <div className="verify-row">
        <strong style={{ fontSize: 14 }}>
          {done ? "Step verified ✓" : "Check your work"}
        </strong>
        <button className="action verify" onClick={check} disabled={checking}>
          {checking ? "Checking…" : done ? "Verify again" : "Verify ▸"}
        </button>
      </div>
      {state ? (
        <div className={`verify-msg ${state.pass ? "pass" : "fail"}`}>
          {state.message}
        </div>
      ) : null}
    </div>
  );
}

function MarkReadCard({ stepKey }: { stepKey: string }): JSX.Element {
  const done = useStudio((s) => Boolean(s.progress[stepKey]));
  const markDone = useStudio((s) => s.markDone);
  return (
    <div className={`verify-card${done ? " pass" : ""}`}>
      <div className="verify-row">
        <strong style={{ fontSize: 14 }}>
          {done ? "Step complete ✓" : "Read it? Mark the step complete."}
        </strong>
        <button
          className="action verify"
          onClick={() => markDone(stepKey)}
          disabled={done}
        >
          {done ? "Done" : "Mark complete ▸"}
        </button>
      </div>
    </div>
  );
}

export function Manual(): JSX.Element {
  const location = useStudio((s) => s.location);
  const navigate = useStudio((s) => s.navigate);
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [location]);

  if (location.labIdx < 0) {
    return (
      <main className="manual" ref={scrollRef}>
        <div className="manual-inner">
          <Home />
        </div>
      </main>
    );
  }

  const lab = labs[location.labIdx];
  const step = lab?.steps[location.stepIdx];
  if (!lab || !step) return <main className="manual" />;

  const isFirst = location.stepIdx === 0;
  const isLastStep = location.stepIdx === lab.steps.length - 1;
  const isLastLab = location.labIdx === labs.length - 1;

  const goPrev = (): void => {
    if (!isFirst)
      navigate({ labIdx: location.labIdx, stepIdx: location.stepIdx - 1 });
    else if (location.labIdx > 0) {
      const prevLab = labs[location.labIdx - 1];
      navigate({
        labIdx: location.labIdx - 1,
        stepIdx: (prevLab?.steps.length ?? 1) - 1,
      });
    } else navigate({ labIdx: -1, stepIdx: 0 });
  };

  const goNext = (): void => {
    if (!isLastStep)
      navigate({ labIdx: location.labIdx, stepIdx: location.stepIdx + 1 });
    else if (!isLastLab) navigate({ labIdx: location.labIdx + 1, stepIdx: 0 });
  };

  const badgeKind =
    step.kind === "live" ? "live" : step.kind === "sim" ? "sim" : "read";

  return (
    <main className="manual" ref={scrollRef}>
      <div className="manual-inner">
        <div className="eyebrow">
          <span>
            Lab {lab.number} · {lab.title}
          </span>
          <span>
            step {location.stepIdx + 1} / {lab.steps.length}
          </span>
          {step.kind !== "mixed" ? <Badge kind={badgeKind} /> : null}
        </div>
        <h1>{step.title}</h1>
        <div key={`body-${step.key}`}>{step.body}</div>
        {step.verifyId ? (
          <VerifyCard
            key={`verify-${step.key}`}
            verifyId={step.verifyId}
            stepKey={step.key}
          />
        ) : step.quiz ? null : (
          <MarkReadCard key={`read-${step.key}`} stepKey={step.key} />
        )}
        <div className="step-nav">
          <button onClick={goPrev}>← Back</button>
          {!(isLastStep && isLastLab) ? (
            <button className="primary" onClick={goNext}>
              {isLastStep
                ? `Next: Lab ${labs[location.labIdx + 1]?.number}`
                : "Next step"}{" "}
              →
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => navigate({ labIdx: -1, stepIdx: 0 })}
            >
              Finish ✓
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
