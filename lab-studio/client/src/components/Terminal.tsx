import { useEffect, useRef, useState } from "react";
import { runLine } from "../controller";
import { useStudio } from "../store";
import type { TermBlock } from "../types";

function Block({ block }: { block: TermBlock }): JSX.Element {
  return (
    <div className={`term-line ${block.tone ?? "normal"}`}>
      {block.sim ? <span className="sim-tag">SIM</span> : null}
      {block.text}
    </div>
  );
}

export function Terminal(): JSX.Element {
  const entries = useStudio((s) => s.termEntries);
  const mode = useStudio((s) => s.termMode);
  const termBusy = useStudio((s) => s.termBusy);
  const copilotBusy = useStudio((s) => s.copilotBusy);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, copilotBusy]);

  const prompt = mode === "copilot" ? "copilot ❯" : "contoso-university $";

  const submit = (): void => {
    const line = input.trim();
    if (!line || termBusy) return;
    setHistory((h) => [...h, line]);
    setHistIdx(-1);
    setInput("");
    void runLine(line);
  };

  return (
    <div className="terminal">
      <div
        className="term-scroll"
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
      >
        {entries.map((entry, i) => {
          switch (entry.kind) {
            case "cmd":
              return (
                <div key={i} className={`term-cmd ${entry.mode}`}>
                  <span className="ps">
                    {entry.mode === "copilot" ? "copilot ❯ " : "$ "}
                  </span>
                  {entry.line}
                </div>
              );
            case "out":
              return (
                <div key={i}>
                  {entry.blocks.map((b, j) => (
                    <Block key={j} block={b} />
                  ))}
                </div>
              );
            case "stream":
              return (
                <div
                  key={i}
                  className={`stream-block${entry.active ? " active" : ""}`}
                >
                  {entry.text}
                  {entry.active ? "▌" : ""}
                </div>
              );
            case "tool":
              return (
                <div key={i}>
                  <span className="tool-chip">
                    {entry.running ? (
                      <span className="spinner" />
                    ) : entry.success === false ? (
                      <span className="cross">✕</span>
                    ) : (
                      <span className="tick">✓</span>
                    )}
                    <span>{entry.title}</span>
                    {entry.detail ? (
                      <span style={{ opacity: 0.65 }}>{entry.detail}</span>
                    ) : null}
                  </span>
                </div>
              );
            case "skill":
              return (
                <div key={i}>
                  <span className="tool-chip skill">
                    ⚡ skill activated: {entry.name}
                  </span>
                </div>
              );
            case "hook":
              return (
                <div key={i}>
                  <span className="tool-chip hook">
                    {entry.running ? (
                      <span className="spinner" />
                    ) : entry.success === false ? (
                      <span className="cross">✕</span>
                    ) : (
                      <span className="tick">✓</span>
                    )}
                    <span>
                      ⛓ {entry.hookType} hook
                      {entry.toolName ? ` · after ${entry.toolName}` : ""}
                    </span>
                  </span>
                </div>
              );
            case "subagent":
              return (
                <div key={i}>
                  <span className="tool-chip subagent">
                    {entry.running ? (
                      <span className="spinner" />
                    ) : entry.failed ? (
                      <span className="cross">✕</span>
                    ) : (
                      <span className="tick">✓</span>
                    )}
                    <span>
                      ⇄ dispatch: {entry.agentName}
                      {!entry.running && entry.toolCalls !== undefined
                        ? ` · ${entry.toolCalls} tool calls`
                        : ""}
                    </span>
                  </span>
                </div>
              );
          }
        })}
        {copilotBusy ? (
          <div className="term-line dim">copilot is working…</div>
        ) : null}
      </div>
      <div className={`term-input-row ${mode}`}>
        <span className="ps">{prompt}</span>
        <input
          ref={inputRef}
          value={input}
          disabled={termBusy}
          placeholder={
            mode === "copilot"
              ? "type a prompt, or /agent, /skills list, /mcp list, /exit…"
              : "type a command — try 'help'"
          }
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const idx =
                histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
              if (history[idx] !== undefined) {
                setHistIdx(idx);
                setInput(history[idx]);
              }
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (histIdx === -1) return;
              const idx = histIdx + 1;
              if (idx >= history.length) {
                setHistIdx(-1);
                setInput("");
              } else {
                setHistIdx(idx);
                setInput(history[idx] ?? "");
              }
            }
          }}
          aria-label="Terminal input"
        />
      </div>
    </div>
  );
}
