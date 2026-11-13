import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Children,
  Fragment,
  createElement,
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  parseFrontmatter,
  readWorkspaceFile,
  resetSandbox,
  writeWorkspaceFile,
} from "../src/sandbox.js";
import { runVerify } from "../src/verify.js";
import { formatLabRange } from "../../client/src/labs/tracks.js";

const here = dirname(fileURLToPath(import.meta.url));
const client = resolve(here, "../../client/src");
const NUMERIC_IDS = Array.from(
  { length: 20 },
  (_, index) => `lab${String(index + 1).padStart(2, "0")}`,
);
const PATH_IDS = [
  "lab01", "lab02", "lab03", "lab04", "lab05", "lab06", "lab07",
  "lab08", "lab09", "lab10", "lab12", "lab15", "lab11", "lab13",
  "lab14", "lab16", "lab17", "lab18", "lab19", "lab20",
];

// Import the real client modules through Vite, not a text search or a mock.
// Non-literal paths let the server's NodeNext typecheck remain independent of
// the client's JSX compiler configuration.
interface Step {
  key: string;
  verifyId?: string;
  quiz?: boolean;
  body: ReactNode;
}

interface Lab {
  id: string;
  number: string;
  title: string;
  steps: Step[];
}

interface LabModule {
  labs: Lab[];
  labIndexById: (id: string) => number;
  nextLabIdx: (index: number) => number | undefined;
  previousLabIdx: (index: number) => number | undefined;
}

interface ContentProps {
  children?: ReactNode;
  path?: string;
  content?: string;
  correct?: number;
  options?: string[];
  stepKey?: string;
}

let curriculum: LabModule;
let Home: ComponentType;
let Rail: ComponentType;

beforeAll(async () => {
  curriculum = await vi.importActual<LabModule>(resolve(client, "labs/index.ts"));
  ({ Home } = await vi.importActual<{ Home: ComponentType }>(
    resolve(client, "components/Home.tsx"),
  ));
  ({ Rail } = await vi.importActual<{ Rail: ComponentType }>(
    resolve(client, "components/Rail.tsx"),
  ));
});

function step(key: string): Step {
  const found = curriculum.labs
    .flatMap((lab) => lab.steps)
    .find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Missing step ${key}`);
  return found;
}

function elements(node: ReactNode): ReactElement<ContentProps>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<ContentProps>(child)) return [];
    return [child, ...elements(child.props.children)];
  });
}

function card(key: string, path: string): string {
  const content = elements(step(key).body).find(
    (element) => element.props.path === path,
  )?.props.content;
  if (typeof content !== "string") {
    throw new Error(`${key} has no writable card for ${path}`);
  }
  return content;
}

const htmlOf = (node: ReactNode): string =>
  renderToStaticMarkup(createElement(Fragment, null, node));

function plain(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function rows(html: string): string[][] {
  return [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...(row[1] ?? "").matchAll(/<td>([\s\S]*?)<\/td>/g)].map((cell) =>
      plain(cell[1] ?? ""),
    ),
  );
}

describe("Phase 6 executable client contracts", () => {
  it("labIndices.numericSlots.preservePersistedLabLocations", () => {
    expect(curriculum.labs.map((lab) => lab.id)).toEqual(NUMERIC_IDS);
    for (const [index, id] of NUMERIC_IDS.entries()) {
      expect(curriculum.labIndexById(id)).toBe(index);
      expect(curriculum.labs[index]?.number).toBe(id.slice(3));
    }
    expect(curriculum.labIndexById("lab99")).toBe(-1);
  });

  it("labIndices.nextAndPrevious.followEveryTrackHandoff", () => {
    for (const [position, id] of PATH_IDS.entries()) {
      const index = curriculum.labIndexById(id);
      const next = curriculum.nextLabIdx(index);
      const previous = curriculum.previousLabIdx(index);
      expect(next === undefined ? undefined : curriculum.labs[next]?.id).toBe(
        PATH_IDS[position + 1],
      );
      expect(
        previous === undefined ? undefined : curriculum.labs[previous]?.id,
      ).toBe(PATH_IDS[position - 1]);
    }
  });

  it("labIndices.invalidSavedLocations.haveNoNeighbor", () => {
    for (const index of [-1, 20, 999, 0.5, Number.NaN]) {
      expect(curriculum.nextLabIdx(index)).toBeUndefined();
      expect(curriculum.previousLabIdx(index)).toBeUndefined();
    }
  });

  it("labRanges.duplicatesAndUnsortedInput.doNotMutateTheCaller", () => {
    const input = Object.freeze(["lab15", "lab10", "lab08", "lab10", "lab09"]);
    expect(formatLabRange(input)).toBe("08–10, 15");
    expect(input).toEqual(["lab15", "lab10", "lab08", "lab10", "lab09"]);
  });

  it("shippedSteps.completionModes.remainBoundToTheirOriginalKeys", () => {
    // Derived from the actual pre-Phase-6 files at b7a592b, not an author's
    // checklist. A registry-wide existence test cannot detect swapped bindings.
    const original: Record<string, string | "read" | "quiz"> = {
      "lab01/map": "lab01/explore",
      "lab01/marketplace": "lab01/marketplace",
      "lab01/hierarchy": "read",
      "lab01/try": "lab01/try-planner",
      "lab02/repo-rules": "lab02/repo-rules",
      "lab02/path-rule": "lab02/path-rule",
      "lab02/agents-md": "lab02/agents-md",
      "lab02/reload": "lab02/reload",
      "lab03/anatomy": "lab03/anatomy",
      "lab03/create": "lab03/create-agent",
      "lab03/select": "lab03/select-agent",
      "lab03/test": "lab03/test-agent",
      "lab04/anatomy": "lab04/skill-anatomy",
      "lab04/create": "lab04/create-skill",
      "lab04/activate": "lab04/activate",
      "lab04/prompts": "read",
      "lab05/inspect": "lab05/inspect",
      "lab05/add": "lab05/add-server",
      "lab05/use": "lab05/use-mcp",
      "lab05/lessons": "lab05/lessons",
      "lab06/config": "lab06/config",
      "lab06/ipc": "read",
      "lab06/create": "lab06/create-hook",
      "lab06/live": "lab06/live",
      "lab07/design": "read",
      "lab07/workers": "lab07/workers",
      "lab07/orchestrator": "lab07/orchestrator",
      "lab07/delegate": "lab07/delegate",
      "lab19/workflow": "lab19/workflow",
      "lab19/dryrun": "lab19/dryrun",
      "lab19/bounded": "quiz",
    };
    for (const [key, completion] of Object.entries(original)) {
      const current = step(key);
      expect(current.verifyId ?? (current.quiz ? "quiz" : "read"), key).toBe(
        completion,
      );
    }
  });

  it("homeAndRail.renderFourAccessibleGroups.withAllTwentyLabsInPathOrder", () => {
    const home = htmlOf(createElement(Home));
    const rail = htmlOf(createElement(Rail));
    expect(
      [...home.matchAll(/<section[^>]*aria-labelledby="home-(track\d)"/g)].map(
        (match) => match[1],
      ),
    ).toEqual(["track1", "track2", "track3", "track4"]);
    expect(
      [...rail.matchAll(/role="group" aria-labelledby="rail-(track\d)"/g)].map(
        (match) => match[1],
      ),
    ).toEqual(["track1", "track2", "track3", "track4"]);
    expect(rows(home).flatMap((row) => row[0]?.match(/^\d{2}/) ?? [])).toEqual(
      PATH_IDS.map((id) => id.slice(3)),
    );
    const headings = [...rail.matchAll(/class="rail-lab-head[^"]*">([\s\S]*?)<\/button>/g)];
    expect(headings.map((match) => plain(match[1] ?? "").slice(0, 2))).toEqual(
      PATH_IDS.map((id) => id.slice(3)),
    );
    expect(plain(home)).toContain("20 labs · 4 tracks");
    expect(plain(home)).not.toMatch(/first five labs|The five labs|Labs 01–05/i);
  });
});

describe("Phase 6 rendered lessons and their real writable artifacts", () => {
  it("perLabNotes.renderedSteps.keepDebuggingAndPrerequisiteGuidance", () => {
    // Source-text matches can survive a commented-out or disconnected body.
    // Guard the rendered content on the actual step, including display-only
    // examples that must not silently disappear while their constants remain.
    const notes: readonly [string, readonly (string | RegExp)[]][] = [
      ["lab01/map", [".github/instructions/", ".github/hooks/"]],
      ["lab01/hierarchy", ["disable-model-invocation"]],
      ["lab01/try", ["/env", "/instructions", "Show Agent Debug Logs"]],
      ["lab01/marketplace", [/optional/i, "simulated"]],
      ["lab02/path-rule", ["230 lines", "applyTo", "Spot the Anti-Pattern"]],
      ["lab02/agents-md", ["ADR-001", "Operational Notes", "20%", "arXiv:2602.11988"]],
      ["lab02/reload", ["/instructions", "/env", "/context"]],
      ["lab03/test", ["/context", /experimental/i, "Show Agent Debug Logs"]],
      ["lab04/activate", ["/skills list", "/context", /experimental/i]],
      ["lab04/prompts", ["${input:", "ADD:", "description", "Spot the Anti-Pattern"]],
      ["lab05/use", ["/mcp list", "/mcp get", "mcp-servers:", "Lab 03"]],
      ["lab05/lessons", ["Lab 10", /preview/i, ".copilot/lessons/", "live tools"]],
      ["lab07/workers", ["contoso-qa", "before you run", "no two-worker fallback"]],
      ["lab07/delegate", ["Agent Flow Chart", "/tasks", "press f"]],
      ["lab19/dryrun", [".github/prompts/", "ADD:", "Retired model ID"]],
    ];
    for (const [key, needles] of notes) {
      const rendered = plain(htmlOf(step(key).body));
      for (const needle of needles) {
        const present =
          typeof needle === "string"
            ? rendered.includes(needle)
            : needle.test(rendered);
        expect(present, `${key} must render ${String(needle)}`).toBe(true);
      }
    }
  });

  it("agentsMd.insertedCard.persistsOperationalNotesAndPassesTheRealVerifier", () => {
    resetSandbox();
    expect(runVerify("lab02/agents-md").pass).toBe(false);
    const content = card("lab02/agents-md", "AGENTS.md");
    writeWorkspaceFile("AGENTS.md", content);
    const saved = readWorkspaceFile("AGENTS.md");
    expect(saved).toBe(content);
    expect(saved).toContain("## Operational Notes");
    expect(saved).toContain("enrollmentDate");
    expect(saved).toContain("immutable copies");
    expect(saved).not.toMatch(/ADR-001|Architecture Decisions|## Layout/);
    expect(runVerify("lab02/agents-md").pass).toBe(true);
    // Repeating the actual card write stays complete and never accumulates ADRs.
    writeWorkspaceFile("AGENTS.md", content);
    expect(readWorkspaceFile("AGENTS.md")).toBe(saved);
    expect(runVerify("lab02/agents-md").pass).toBe(true);
  });

  it("devAgent.mcpPreview.isDisplayOnlyAndNeverEnablesMcpBeforeLab05", () => {
    const body = step("lab03/create").body;
    const preview = plain(htmlOf(body));
    const content = card("lab03/create", ".github/agents/contoso-dev.agent.md");
    expect(preview).toContain("mcp-servers:");
    expect(preview).toContain("after Lab 05");
    expect(content).not.toMatch(/mcp-servers:|lab-docs/);
    expect(parseFrontmatter(content).data.tools).toContain("read");
  });

  it("hooks.lifecycleRows.bindAllFifteenEventsToTheirDocumentedAliases", () => {
    const html = htmlOf(step("lab06/config").body);
    const deepDive = /<details[^>]*>([\s\S]*?)<\/details>/.exec(html)?.[1] ?? "";
    const aliases: Record<string, string> = {
      sessionStart: "SessionStart",
      userPromptSubmitted: "UserPromptSubmit",
      userPromptTransformed: "no alias",
      permissionRequest: "PermissionRequest",
      preToolUse: "PreToolUse",
      preMcpToolCall: "no alias",
      postToolUse: "PostToolUse",
      postToolUseFailure: "PostToolUseFailure",
      subagentStart: "no alias",
      subagentStop: "SubagentStop",
      agentStop: "Stop",
      preCompact: "PreCompact",
      notification: "no alias",
      errorOccurred: "ErrorOccurred",
      sessionEnd: "SessionEnd",
    };
    const events = rows(deepDive).filter((row) => row.length > 0);
    expect(events).toHaveLength(15);
    for (const [event, alias] of Object.entries(aliases)) {
      const row = events.find((entry) => entry[0]?.startsWith(`${event} `));
      expect(row?.[0], event).toBe(`${event} (${alias})`);
      expect(row?.[1]?.length, event).toBeGreaterThan(10);
      expect(row?.[2]?.length, event).toBeGreaterThan(10);
    }
    expect(plain(deepDive)).toContain("CLI build setting hooks.preMcpToolCall");
    expect(plain(deepDive)).toContain("Fourteen are listed in GitHub's hooks-reference");
  });

  it("hooks.typesExample.isValidDisplayOnlyJsonAndTheQuizTeachesFailOpen", () => {
    const body = step("lab06/types").body;
    const descendants = elements(body);
    const example = descendants.find(
      (element) =>
        typeof element.props.children === "string" &&
        element.props.children.startsWith('{\n  "version": 1,'),
    )?.props.children;
    expect(typeof example).toBe("string");
    const config = JSON.parse(String(example)) as {
      hooks: Record<string, Record<string, unknown>[]>;
    };
    expect(config.hooks.sessionStart?.[0]?.type).toBe("prompt");
    expect(config.hooks.preToolUse?.[0]).toMatchObject({
      type: "command",
      exec: "node",
      args: ["scripts/hooks/guard-env.mjs"],
    });
    expect(config.hooks.preToolUse?.[0]).not.toHaveProperty("bash");
    expect(config.hooks.postToolUse?.[0]).toMatchObject({
      type: "http",
      url: "https://audit.example.com/copilot-hooks",
      allowedEnvVars: ["AUDIT_TOKEN"],
    });
    expect(descendants.filter((element) => element.props.path)).toEqual([]);
    const quiz = descendants.find(
      (element) => element.props.stepKey === "lab06/types",
    );
    expect(quiz?.props.options?.[quiz.props.correct ?? -1]).toContain("fail-open");
    expect(plain(htmlOf(body))).toContain("VS Code's Copilot harness");
  });

  it("debugToolkit.renderedMetadataAndOptInContent.keepTheSourcePrecisionRules", () => {
    const html = htmlOf(step("lab06/debug").body);
    const metadata = rows(html).find((row) => row[0] === "workspace.yaml");
    expect(metadata?.[1]).toContain("id");
    expect(metadata?.[1]).toContain("updated_at");
    expect(metadata?.[1]).not.toContain("summary");
    const text = plain(html);
    expect(text).toContain("chronological event log");
    expect(text).toContain('source: "local"');
    expect(text).toContain("search_index");
    expect(text).toContain("session_usage");
    expect(text).toContain("created when the session uses plans");
    expect(text).toContain("created when the session uses that tool");
    expect(text).toContain("OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY");
    expect(text).toContain("By default only metadata is recorded");
    expect(text).toContain("separate content events aren't exported");
    expect(text).toContain("read it: they can hold prompts");
  });
});
