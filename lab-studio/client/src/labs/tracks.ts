/**
 * The four learning tracks that group Labs 01-20.
 *
 * Pure data with no imports, so the Rail, the Home screen, and the tests that
 * keep the repository README honest can all read it. Lab ids, lab numbers and
 * the order of the `labs` array never change: a track is a reading order laid
 * over them, which is why a track can skip numbers (Track 2 goes 10 -> 12).
 *
 * Keep this in step with the "Lab Modules" section of the repository README.
 */
export interface Track {
  /** Stable id, e.g. "track1". */
  id: string;
  number: number;
  title: string;
  /** One sentence on what the track is for. */
  summary: string;
  /** Lab ids, in the order a learner takes them. */
  labIds: readonly string[];
}

export const TRACKS: readonly Track[] = [
  {
    id: "track1",
    number: 1,
    title: "Core Customizations & Guardrails",
    summary:
      "Learn what each Copilot configuration file is, how Copilot combines them, and how to guard and coordinate agents. Every later track builds on this one.",
    labIds: ["lab01", "lab02", "lab03", "lab04", "lab05", "lab06", "lab07"],
  },
  {
    id: "track2",
    number: 2,
    title: "Cloud Agents, Memory & Context Engineering",
    summary:
      "Run Copilot in the cloud with agentic workflows and the coding agent, then control what it knows: memory, MCP data sources and code intelligence.",
    labIds: ["lab08", "lab09", "lab10", "lab12", "lab15"],
  },
  {
    id: "track3",
    number: 3,
    title: "Multi-Agent Orchestration, A2A & Extensions",
    summary:
      "Package and share plugins, then scale from one agent to many: agent-to-agent patterns, the tmux orchestrator, and a governed marketplace.",
    labIds: ["lab11", "lab13", "lab14", "lab16"],
  },
  {
    id: "track4",
    number: 4,
    title: "Enterprise Governance, Spec-Driven Delivery & FinOps",
    summary:
      "Run Copilot across an organization: admin controls, spec-driven delivery with stacked PRs, self-improving agents, and token reporting.",
    labIds: ["lab17", "lab18", "lab19", "lab20"],
  },
];

/** Lab ids in learning-path order: every lab of Track 1, then Track 2, and so on. */
export const LEARNING_PATH: readonly string[] = TRACKS.flatMap(
  (track) => track.labIds,
);

export function trackOfLab(labId: string): Track | undefined {
  return TRACKS.find((track) => track.labIds.includes(labId));
}

/** The lab that follows `labId` on the learning path, or undefined at the end. */
export function nextLabId(labId: string): string | undefined {
  const index = LEARNING_PATH.indexOf(labId);
  return index === -1 ? undefined : LEARNING_PATH[index + 1];
}

/** The lab that precedes `labId` on the learning path, or undefined at the start. */
export function previousLabId(labId: string): string | undefined {
  const index = LEARNING_PATH.indexOf(labId);
  return index <= 0 ? undefined : LEARNING_PATH[index - 1];
}

/**
 * Label a set of labs the way the README does: contiguous runs collapse to an
 * en-dash range and runs are separated by commas, e.g. "08–10, 12, 15".
 */
export function formatLabRange(labIds: readonly string[]): string {
  const numbers = [
    ...new Set(
      labIds
        .map((id) => Number(id.replace(/^lab/, "")))
        .filter((n) => Number.isInteger(n)),
    ),
  ].sort((a, b) => a - b);

  const pad = (n: number): string => String(n).padStart(2, "0");
  const runs: string[] = [];
  let runStart: number | undefined;
  let previous: number | undefined;
  const closeRun = (): void => {
    if (runStart === undefined || previous === undefined) return;
    runs.push(
      runStart === previous
        ? pad(runStart)
        : `${pad(runStart)}–${pad(previous)}`,
    );
  };

  for (const n of numbers) {
    if (previous !== undefined && n === previous + 1) {
      previous = n;
      continue;
    }
    closeRun();
    runStart = n;
    previous = n;
  }
  closeRun();
  return runs.join(", ");
}
