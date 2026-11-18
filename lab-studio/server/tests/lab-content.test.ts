import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { resetSandbox } from "../src/sandbox.js";
import { runVerify } from "../src/verify.js";

/**
 * Content contract for the Lab Studio adaptation of the lab markdown.
 *
 * Lab Studio's client content is hand-authored TSX that the server verifies
 * by id and learners track progress against by step key. These tests read the
 * TSX as text (the client bundle needs a browser) and pin:
 *   - the identity contract: step keys and verifyIds never change or vanish;
 *   - the structure conventions in .github/skills/lab-studio-sync;
 *   - the Phase 6 coverage the labs/*.md rewrite (Phases 1-5) added.
 */

const here = dirname(fileURLToPath(import.meta.url));
const LABS_DIR = resolve(here, "../../client/src/labs");
const COMPONENTS_DIR = resolve(here, "../../client/src/components");

const readLab = (labId: string): string =>
  readFileSync(join(LABS_DIR, `${labId}.tsx`), "utf8");

/** Collapse JSX line wrapping so a sentence that wraps across lines still matches. */
const flat = (source: string): string =>
  source.replace(/\{" "\}/g, " ").replace(/\s+/g, " ");

const found = (haystack: string, needle: string | RegExp): boolean =>
  typeof needle === "string"
    ? haystack.includes(needle)
    : needle.test(haystack);

/**
 * Assert coverage with a short failure message. `expect(longSource).toContain()`
 * would print the whole TSX file on failure, which buries the one missing phrase.
 */
const mentions = (
  haystack: string,
  needle: string | RegExp,
  where: string,
): void => {
  expect(
    found(haystack, needle),
    `${where} should mention ${String(needle)}`,
  ).toBe(true);
};

const omits = (
  haystack: string,
  needle: string | RegExp,
  where: string,
): void => {
  expect(
    found(haystack, needle),
    `${where} should not mention ${String(needle)}`,
  ).toBe(false);
};

interface Step {
  key: string;
  verifyId?: string;
  quiz: boolean;
  /** The step's source, from its `key:` to the next step's `key:`. */
  source: string;
}

function stepsOf(labId: string): Step[] {
  const source = readLab(labId);
  const starts = [...source.matchAll(/\bkey:\s*"(lab\d{2}\/[\w-]+)"/g)];
  return starts.map((match, i) => {
    const from = match.index ?? 0;
    const to = starts[i + 1]?.index ?? source.length;
    const chunk = source.slice(from, to);
    return {
      key: match[1] ?? "",
      verifyId: /\bverifyId:\s*"([^"]+)"/.exec(chunk)?.[1],
      quiz: /\bquiz:\s*true\b/.test(chunk),
      source: chunk,
    };
  });
}

const stepOf = (labId: string, key: string): Step => {
  const step = stepsOf(labId).find((s) => s.key === key);
  if (!step) throw new Error(`${labId} has no step ${key}`);
  return step;
};

/** The body of `const NAME = \`...\`;` — used to inspect what a FileCard writes. */
function constBody(source: string, name: string): string {
  const match = new RegExp(`const ${name} = \`((?:[^\`\\\\]|\\\\.)*)\`;`).exec(
    source,
  );
  if (!match) throw new Error(`no template-literal const ${name}`);
  return match[1] ?? "";
}

const LAB_IDS = Array.from(
  { length: 20 },
  (_, i) => `lab${String(i + 1).padStart(2, "0")}`,
);

// Step keys are progress-tracking identity: renaming one resets a learner's
// progress for that step. Everything that shipped before Phase 6 stays.
// prettier-ignore
const SHIPPED_STEP_KEYS: Record<string, string[]> = {
  lab01: ["map", "marketplace", "hierarchy", "try"],
  lab02: ["repo-rules", "path-rule", "agents-md", "reload"],
  lab03: ["anatomy", "create", "select", "test"],
  lab04: ["anatomy", "create", "activate", "prompts"],
  lab05: ["inspect", "add", "use", "lessons"],
  lab06: ["config", "ipc", "create", "live"],
  lab07: ["design", "workers", "orchestrator", "delegate"],
  lab08: ["format", "compile", "backlog", "run", "review-prd"],
  lab09: ["ruleset", "coding-agent", "review", "iterate"],
  lab10: ["layer1", "copilot-memory", "wiki", "schema", "consolidate", "custom-memory"],
  lab11: ["scaffold", "registry", "policy"],
  lab12: ["why", "wire", "query"],
  lab13: ["concepts", "critic", "failures"],
  lab14: ["pattern", "handoff", "discipline"],
  lab15: ["what", "fallback", "when"],
  lab16: ["managed", "strict", "admin"],
  lab17: ["controls", "audit"],
  lab18: ["spec", "prd", "stack", "layer-review"],
  lab19: ["workflow", "dryrun", "bounded"],
  lab20: ["sources", "governance"],
};

// A verify check a shipped step references is never deleted: the Verify button
// would answer "Unknown verification id" for every learner on that step.
// prettier-ignore
const SHIPPED_VERIFY_IDS = [
  "lab01/explore", "lab01/marketplace", "lab01/try-planner",
  "lab02/repo-rules", "lab02/path-rule", "lab02/agents-md", "lab02/reload",
  "lab03/anatomy", "lab03/create-agent", "lab03/select-agent", "lab03/test-agent",
  "lab04/skill-anatomy", "lab04/create-skill", "lab04/activate",
  "lab05/inspect", "lab05/add-server", "lab05/use-mcp", "lab05/lessons",
  "lab06/config", "lab06/create-hook", "lab06/live",
  "lab07/workers", "lab07/orchestrator", "lab07/delegate",
  "lab08/format", "lab08/compile", "lab08/backlog", "lab08/run", "lab08/review-prd",
  "lab09/ruleset", "lab09/coding-agent", "lab09/review", "lab09/iterate",
  "lab10/layer1", "lab10/wiki", "lab10/schema", "lab10/consolidate",
  "lab11/scaffold", "lab11/policy",
  "lab12/wire", "lab12/query",
  "lab13/critic",
  "lab14/handoff",
  "lab15/fallback",
  "lab16/managed",
  "lab18/spec", "lab18/prd", "lab18/stack", "lab18/layer-review",
  "lab19/workflow", "lab19/dryrun",
];

const unknownToServer = (id: string): boolean =>
  /^Unknown verification id/.test(runVerify(id).message);

describe("step identity (progress tracking never resets)", () => {
  it.each(Object.entries(SHIPPED_STEP_KEYS))(
    "%s keeps every shipped step key",
    (labId, slugs) => {
      const keys = stepsOf(labId).map((s) => s.key);

      for (const slug of slugs) {
        expect(
          keys.includes(`${labId}/${slug}`),
          `${labId}/${slug} was renamed or removed`,
        ).toBe(true);
      }
    },
  );

  it.each(LAB_IDS)(
    "%s step keys are unique and namespaced by their lab",
    (labId) => {
      const keys = stepsOf(labId).map((s) => s.key);

      expect(keys.length).toBeGreaterThanOrEqual(2);
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys)
        expect(key).toMatch(new RegExp(`^${labId}/[a-z0-9-]+$`));
    },
  );
});

describe("verify checks match the steps that reference them", () => {
  beforeAll(() => {
    resetSandbox();
  });

  it.each(LAB_IDS)("%s: every verifyId has a server check", (labId) => {
    for (const step of stepsOf(labId)) {
      if (step.verifyId) {
        expect(
          unknownToServer(step.verifyId),
          `${step.key} -> ${step.verifyId}`,
        ).toBe(false);
      }
    }
  });

  it.each(SHIPPED_VERIFY_IDS)("shipped check %s still exists", (id) => {
    expect(unknownToServer(id)).toBe(false);
  });

  it.each(LAB_IDS)("%s: a step completes exactly one way", (labId) => {
    for (const step of stepsOf(labId)) {
      expect(
        step.verifyId !== undefined && step.quiz,
        `${step.key} has both a verifyId and a quiz`,
      ).toBe(false);
    }
  });

  it.each(LAB_IDS)(
    "%s: quiz steps render a Quiz bound to their own key",
    (labId) => {
      for (const step of stepsOf(labId)) {
        const hasQuiz = new RegExp(`<Quiz\\s+stepKey="${step.key}"`).test(
          step.source,
        );
        expect(
          hasQuiz,
          `${step.key}: quiz flag and <Quiz stepKey> must agree`,
        ).toBe(step.quiz);
      }
    },
  );
});

describe("Lab 01 teaches concepts before the marketplace", () => {
  const order = (): string[] => stepsOf("lab01").map((s) => s.key);

  it("hierarchyAndMap.comeBeforeMarketplaceAndTry", () => {
    const keys = order();
    const firstOptional = Math.min(
      keys.indexOf("lab01/marketplace"),
      keys.indexOf("lab01/try"),
    );

    expect(keys.indexOf("lab01/map")).toBeLessThan(firstOptional);
    expect(keys.indexOf("lab01/hierarchy")).toBeLessThan(firstOptional);
    expect(keys.indexOf("lab01/map")).toBeLessThan(
      keys.indexOf("lab01/hierarchy"),
    );
  });

  it("map.listsInstructionsAndHooksSoTheMapIsComplete", () => {
    const map = flat(stepOf("lab01", "lab01/map").source);

    mentions(map, ".github/instructions/", "lab01/map");
    mentions(map, ".github/hooks/", "lab01/map");
  });

  it("hierarchy.includesTheCommandSkillRow", () => {
    mentions(
      flat(stepOf("lab01", "lab01/hierarchy").source),
      "disable-model-invocation",
      "lab01/hierarchy",
    );
  });

  it("try.hasADebugItNoteForEnvAndInstructions", () => {
    const step = flat(stepOf("lab01", "lab01/try").source);

    for (const phrase of [
      "Debug It",
      "/env",
      "/instructions",
      "Show Agent Debug Logs",
    ]) {
      mentions(step, phrase, "lab01/try");
    }
  });

  it("marketplace.isFramedAsAnOptionalExtension", () => {
    mentions(
      flat(stepOf("lab01", "lab01/marketplace").source),
      /optional/i,
      "lab01/marketplace",
    );
  });
});

describe("Lab 02 teaches operational context, not an ADR", () => {
  const agentsMd = (): string =>
    flat(stepOf("lab02", "lab02/agents-md").source);

  it("agentsMd.namesTheOperationalNotesSection", () => {
    mentions(agentsMd(), "Operational Notes", "lab02/agents-md");
  });

  it("agentsMd.showsAdr001AsTheAntiPattern", () => {
    mentions(agentsMd(), "ADR-001", "lab02/agents-md");
    mentions(agentsMd(), "Spot the Anti-Pattern", "lab02/agents-md");
  });

  it("agentsMd.explainsDuplicatedAndDiscoverableWithTheResearchCost", () => {
    mentions(agentsMd(), /duplicated/i, "lab02/agents-md");
    mentions(agentsMd(), /discoverable/i, "lab02/agents-md");
    mentions(agentsMd(), "arXiv:2602.11988", "lab02/agents-md");
    mentions(agentsMd(), "20%", "lab02/agents-md");
  });

  it("agentsMd.theFileTheLearnerInsertsCarriesNotesAndNoAdr", () => {
    const source = readLab("lab02");
    const inserted = /<FileCard\s+path="AGENTS\.md"[^>]*content=\{(\w+)\}/.exec(
      source.replace(/\s+/g, " "),
    )?.[1];

    expect(
      inserted,
      "the AGENTS.md FileCard names a content const",
    ).toBeDefined();
    const content = constBody(source, inserted ?? "");
    mentions(
      content,
      "## Operational Notes",
      "the AGENTS.md the learner inserts",
    );
    omits(content, "ADR-001", "the AGENTS.md the learner inserts");
    omits(
      content,
      "Architecture Decisions",
      "the AGENTS.md the learner inserts",
    );
  });

  it("pathRule.warnsAboutBloatedDomainInstructions", () => {
    const step = flat(stepOf("lab02", "lab02/path-rule").source);

    mentions(step, "Spot the Anti-Pattern", "lab02/path-rule");
    mentions(step, /230/, "lab02/path-rule");
    mentions(step, "applyTo", "lab02/path-rule");
  });

  it("reload.hasADebugItNoteForInstructionsEnvAndContext", () => {
    const step = flat(stepOf("lab02", "lab02/reload").source);

    for (const phrase of [
      "Debug It",
      "/instructions",
      "/env",
      "/context",
      "Show Chat Debug View",
    ]) {
      mentions(step, phrase, "lab02/reload");
    }
  });
});

describe("Labs 03-05 forward references and Debug It tips", () => {
  it("lab03.previewsMcpServersAndSaysToWireThemAfterLab05", () => {
    const lab = flat(readLab("lab03"));

    mentions(lab, "mcp-servers:", "lab03");
    mentions(lab, /after Lab 05/i, "lab03");
    mentions(lab, /look, don't wire|preview/i, "lab03");
  });

  it("lab03.debugItCoversEnvContextAndTheExperimentalPerSkillView", () => {
    const lab = flat(readLab("lab03"));

    for (const phrase of [
      "Debug It",
      "/env",
      "/context",
      /experimental/i,
      "Show Agent Debug Logs",
    ]) {
      mentions(lab, phrase, "lab03");
    }
  });

  it("lab04.flagsOverlyBroadDescriptionsInputSyntaxAndConflictingCommitPrefixes", () => {
    const lab = flat(readLab("lab04"));

    for (const phrase of [
      "Spot the Anti-Pattern",
      "${input:",
      "ADD:",
      /matches every turn|matches everything/i,
    ]) {
      mentions(lab, phrase, "lab04");
    }
  });

  it("lab04.debugItCoversSkillsListAndTheExperimentalPerSkillContextView", () => {
    const lab = flat(readLab("lab04"));

    for (const phrase of [
      "Debug It",
      "/skills list",
      "/context",
      /experimental/i,
    ]) {
      mentions(lab, phrase, "lab04");
    }
  });

  it("lab05.framesLessonsAsAPreviewOfLab10", () => {
    const step = flat(stepOf("lab05", "lab05/lessons").source);

    for (const phrase of [
      ".copilot/lessons/",
      /preview/i,
      "Lab 10",
      /live tools/i,
    ]) {
      mentions(step, phrase, "lab05/lessons");
    }
  });

  it("lab05.sendsLearnersBackToWireMcpServersIntoTheirAgent", () => {
    const lab = flat(readLab("lab05"));

    mentions(lab, "mcp-servers:", "lab05");
    mentions(lab, "Lab 03", "lab05");
  });

  it("lab05.debugItCoversMcpListGetAndTheProcessLog", () => {
    const lab = flat(readLab("lab05"));

    for (const phrase of [
      "Debug It",
      "/mcp list",
      "/mcp get",
      "--log-level debug",
      "MCP: List Servers",
    ]) {
      mentions(lab, phrase, "lab05");
    }
  });
});

describe("Lab 06 covers every hook event, every hook type, and the debugging toolkit", () => {
  const lab = (): string => flat(readLab("lab06"));

  it("addsATypesStepAndADebugStepWithoutTouchingShippedKeys", () => {
    const keys = stepsOf("lab06").map((s) => s.key);

    expect(keys).toContain("lab06/types");
    expect(keys).toContain("lab06/debug");
    expect(stepOf("lab06", "lab06/types").quiz).toBe(true);
    expect(stepOf("lab06", "lab06/debug").quiz).toBe(true);
  });

  it.each([
    "sessionStart",
    "userPromptSubmitted",
    "userPromptTransformed",
    "permissionRequest",
    "preToolUse",
    "preMcpToolCall",
    "postToolUse",
    "postToolUseFailure",
    "subagentStart",
    "subagentStop",
    "agentStop",
    "preCompact",
    "notification",
    "errorOccurred",
    "sessionEnd",
  ])("lists the %s lifecycle event", (event) => {
    mentions(lab(), event, "lab06");
  });

  it("says fifteen events and attributes preMcpToolCall to the CLI build setting", () => {
    mentions(lab(), /15 (hook )?lifecycle/i, "lab06");
    mentions(lab(), "hooks.preMcpToolCall", "lab06");
    mentions(lab(), "hooks-reference", "lab06");
  });

  it("only claims PascalCase aliases the hooks reference documents", () => {
    const text = lab();

    for (const alias of [
      "SessionStart",
      "UserPromptSubmit",
      "PermissionRequest",
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "SubagentStop",
      "PreCompact",
      "ErrorOccurred",
      "SessionEnd",
    ]) {
      mentions(text, alias, "lab06 (documented alias)");
    }
    // These three have no PascalCase configuration alias in the hooks reference.
    for (const invented of [
      "UserPromptTransformed",
      "PreMcpToolCall",
      "SubagentStart",
    ]) {
      omits(text, invented, "lab06 (not a documented alias)");
    }
  });

  it("teachesAllThreeHookTypes", () => {
    for (const phrase of [
      '"type": "command"',
      '"type": "http"',
      '"type": "prompt"',
    ]) {
      mentions(lab(), phrase, "lab06");
    }
  });

  it("teachesPolyglotCommandHooksAndShellFreeExec", () => {
    for (const phrase of [
      "Node",
      "Python",
      "Bash",
      "PowerShell",
      '"exec"',
      '"args"',
      /Copilot harness/,
      /polyglot/i,
    ]) {
      mentions(lab(), phrase, "lab06");
    }
  });

  it("doesNotCallExecCopilotCliOnlyNorHttpTheOnlyWay", () => {
    omits(lab(), /Copilot CLI only/i, "lab06");
    omits(lab(), /the only way/i, "lab06");
    mentions(lab(), /recommended built-in hook type/i, "lab06");
  });

  it("explainsHttpHooks", () => {
    for (const phrase of [
      "url",
      "headers",
      "allowedEnvVars",
      "COPILOT_HOOK_ALLOW_LOCALHOST=1",
      "COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1",
      /Cloud Agent|cloud agent/,
    ]) {
      mentions(lab(), phrase, "lab06");
    }
  });

  it("separatesFailOpenFromFailClosed", () => {
    mentions(lab(), /fail-closed/i, "lab06");
    mentions(lab(), /fail-open/i, "lab06");
    mentions(lab(), /empty or unparseable/i, "lab06");
  });

  it("debugStep.coversVsCodeCliAndOpenTelemetry", () => {
    const step = flat(stepOf("lab06", "lab06/debug").source);

    for (const phrase of [
      "chat.agentHost.agentDebugLog.enabled",
      "Logs view",
      "Summary view",
      "Agent Flow Chart",
      "Cache Explorer",
      "Show Chat Debug View",
      "#debugEventsSnapshot",
      "/troubleshoot",
      "events.jsonl",
      "workspace.yaml",
      "/diagnose",
      "/collect-debug-logs",
      "session_store_sql",
      "COPILOT_OTEL_ENABLED=true",
      "OTEL_EXPORTER_OTLP_ENDPOINT",
      "COPILOT_OTEL_FILE_EXPORTER_PATH",
      "OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY",
    ]) {
      mentions(step, phrase, "lab06/debug");
    }
  });

  it("debugStep.keepsSessionStateClaimsPrecise", () => {
    const step = flat(stepOf("lab06", "lab06/debug").source);

    mentions(step, /chronological event log/i, "lab06/debug");
    omits(step, /complete record of every/i, "lab06/debug");
    mentions(step, "session-store.db", "lab06/debug");
    mentions(step, /cloud/i, "lab06/debug");
    mentions(step, /source: "local"|local store/i, "lab06/debug");
  });
});

describe("Lab 07 creates the QA agent before the orchestrator runs", () => {
  it("workers.precedesTheDelegationRun", () => {
    const keys = stepsOf("lab07").map((s) => s.key);

    expect(keys.indexOf("lab07/workers")).toBeLessThan(
      keys.indexOf("lab07/delegate"),
    );
    expect(keys.indexOf("lab07/orchestrator")).toBeLessThan(
      keys.indexOf("lab07/delegate"),
    );
    mentions(
      stepOf("lab07", "lab07/workers").source,
      "contoso-qa.agent.md",
      "lab07/workers",
    );
  });

  it("orchestrator.saysItHasNoTwoWorkerFallback", () => {
    const text = flat(
      stepOf("lab07", "lab07/workers").source +
        stepOf("lab07", "lab07/orchestrator").source,
    );

    mentions(text, /before (you )?run/i, "lab07/workers + lab07/orchestrator");
  });

  it("delegate.pointsToTheFlowChartAndTheTasksDialog", () => {
    const step = flat(stepOf("lab07", "lab07/delegate").source);

    for (const phrase of [
      "Debug It",
      "Agent Flow Chart",
      "/tasks",
      /press <code>f<\/code>|press f/i,
    ]) {
      mentions(step, phrase, "lab07/delegate");
    }
  });
});

describe("Lab 19 names the three classic drift signals", () => {
  it("dryrun.listsStalePathContradictoryPrefixAndRetiredModel", () => {
    const step = flat(stepOf("lab19", "lab19/dryrun").source);

    for (const phrase of [
      ".github/prompts/",
      "ADD:",
      /retired model/i,
      /Stale path/i,
      /Contradictory convention/i,
    ]) {
      mentions(step, phrase, "lab19/dryrun");
    }
  });
});

describe("home screen, rail and navigation present all 20 labs in four tracks", () => {
  const read = (file: string): string =>
    readFileSync(join(COMPONENTS_DIR, file), "utf8");

  it("home.noLongerClaimsFiveLabs", () => {
    const home = flat(read("Home.tsx"));

    omits(home, /Labs 01–05/, "Home.tsx");
    omits(home, /first five labs/i, "Home.tsx");
    omits(home, /The five labs/i, "Home.tsx");
  });

  it("home.saysTwentyLabsAndFourTracks", () => {
    const home = flat(read("Home.tsx"));

    mentions(home, /20 labs/i, "Home.tsx");
    mentions(home, /four (learning )?tracks/i, "Home.tsx");
  });

  it("home.rendersEveryTrackFromTheSharedTrackData", () => {
    const home = read("Home.tsx");

    mentions(home, /\bTRACKS\b/, "Home.tsx");
    mentions(home, /formatLabRange/, "Home.tsx");
  });

  it("rail.groupsLabsUnderTrackHeadersInsteadOfOneAdvancedDivider", () => {
    const rail = read("Rail.tsx");

    omits(rail, "Advanced track", "Rail.tsx");
    omits(rail, "ADVANCED_TRACK_START", "Rail.tsx");
    mentions(rail, /\bTRACKS\b/, "Rail.tsx");
    mentions(rail, /formatLabRange/, "Rail.tsx");
  });

  it("manual.nextAndBackFollowTheLearningPath", () => {
    const manual = read("Manual.tsx");

    mentions(manual, /nextLabIdx|nextLabId/, "Manual.tsx");
    mentions(manual, /previousLabIdx|previousLabId/, "Manual.tsx");
    omits(manual, /labs\[location\.labIdx \+ 1\]/, "Manual.tsx");
  });
});
