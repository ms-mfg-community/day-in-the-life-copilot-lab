import { rmSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  readWorkspaceFile,
  resetSandbox,
  safePath,
  writeWorkspaceFile,
} from "../src/sandbox.js";
import { runVerify } from "../src/verify.js";

const WITH_OPERATIONAL_NOTES = `# ContosoUniversity — Agent Context

## Operational Notes

- **No database.** Repositories are in-memory and start empty on every run.
- **Never hand-edit generated files.** \`.lock.yml\` is compiled from the \`.md\`.
`;

// What the lab taught before it turned the ADR into an anti-pattern. A learner
// whose sandbox still holds this must not lose the step they already passed.
const LEGACY_WITH_ADR = `# ContosoUniversity — Agent Context

## Architecture Decisions

### ADR-001: Repository Pattern for Data Access

**Status**: Accepted
`;

beforeEach(() => {
  resetSandbox();
});

describe("lab02/agents-md verify", () => {
  it("templateState.fails.guidesLearnerToAddOperationalNotes", () => {
    // Arrange: the freshly reset sandbox ships an AGENTS.md without the notes.

    // Act
    const result = runVerify("lab02/agents-md");

    // Assert
    expect(result.pass).toBe(false);
    expect(result.message).toContain("## Operational Notes");
  });

  it("operationalNotesSection.passes", () => {
    writeWorkspaceFile("AGENTS.md", WITH_OPERATIONAL_NOTES);

    const result = runVerify("lab02/agents-md");

    expect(result.pass).toBe(true);
    expect(result.message).toContain("Operational");
  });

  it("legacyAdr001Workspace.stillPasses", () => {
    writeWorkspaceFile("AGENTS.md", LEGACY_WITH_ADR);

    const result = runVerify("lab02/agents-md");

    expect(result.pass).toBe(true);
  });

  it("legacyAdr001Workspace.passMessageNudgesTowardOperationalNotes", () => {
    writeWorkspaceFile("AGENTS.md", LEGACY_WITH_ADR);

    const result = runVerify("lab02/agents-md");

    expect(result.message).toContain("Operational Notes");
  });

  it("operationalNotesPlusAdr001.passesButFlagsTheAntiPattern", () => {
    writeWorkspaceFile(
      "AGENTS.md",
      `${WITH_OPERATIONAL_NOTES}\n${LEGACY_WITH_ADR}`,
    );

    const result = runVerify("lab02/agents-md");

    expect(result.pass).toBe(true);
    expect(result.message).toContain("ADR-001");
  });

  it("agentsMdMissing.failsNamingTheFile", () => {
    rmSync(safePath("AGENTS.md"));

    const result = runVerify("lab02/agents-md");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("AGENTS.md is missing");
  });

  it("emptyOrPartialLegacyEntry.failsWithoutChangingTheLearnersFile", () => {
    for (const content of [
      "",
      "## Architecture Decisions\n\nNo decision has been recorded yet.\n",
      "### ADR-001: Repository Pattern for Data Access\n",
    ]) {
      writeWorkspaceFile("AGENTS.md", content);

      const result = runVerify("lab02/agents-md");

      expect(result.pass).toBe(false);
      expect(result.message).toContain("## Operational Notes");
      expect(readWorkspaceFile("AGENTS.md")).toBe(content);
    }
  });

  it("operationalNotes.caseInsensitiveHeading.stillPasses", () => {
    writeWorkspaceFile(
      "AGENTS.md",
      WITH_OPERATIONAL_NOTES.replace("Operational Notes", "OPERATIONAL NOTES"),
    );

    expect(runVerify("lab02/agents-md").pass).toBe(true);
  });

  it("todoMentionWithoutHeading.fails", () => {
    writeWorkspaceFile(
      "AGENTS.md",
      "# ContosoUniversity — Agent Context\n\nTODO: add Operational Notes later.\n",
    );

    const result = runVerify("lab02/agents-md");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("## Operational Notes");
  });
});
