import { beforeEach, describe, expect, it } from "vitest";
import { resetSandbox, writeWorkspaceFile } from "../src/sandbox.js";
import { runVerify } from "../src/verify.js";

const MODULE_PATH = ".github/extensions/sdlc-filter/filter.mjs";

const ESCAPE_HTML_DEC = `export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}`;

const ESCAPE_HTML_HEX = `export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}`;

const CORRECT_FILTER = `export function filterByState(issues, state) {
  return issues.filter((i) => i.state.toLowerCase() === state.toLowerCase());
}`;

beforeEach(() => {
  resetSandbox();
});

describe("lab26/canvas verify", () => {
  it("correctModuleWithDecimalApostropheEntity.passes", () => {
    writeWorkspaceFile(MODULE_PATH, `${CORRECT_FILTER}\n${ESCAPE_HTML_DEC}\n`);

    const result = runVerify("lab26/canvas");

    expect(result.pass).toBe(true);
  });

  it("correctModuleWithHexApostropheEntity.passes", () => {
    writeWorkspaceFile(MODULE_PATH, `${CORRECT_FILTER}\n${ESCAPE_HTML_HEX}\n`);

    const result = runVerify("lab26/canvas");

    expect(result.pass).toBe(true);
  });

  it("throwingFilterByState.failsCleanly", () => {
    writeWorkspaceFile(
      MODULE_PATH,
      `export function filterByState(issues, state) {
  return issues.filter((i) => i.State.toLowerCase() === state);
}
${ESCAPE_HTML_DEC}
`,
    );

    const result = runVerify("lab26/canvas");

    expect(result.pass).toBe(false);
  });

  it("partialEscapeHtmlOnlyAngleBrackets.fails", () => {
    writeWorkspaceFile(
      MODULE_PATH,
      `${CORRECT_FILTER}
export function escapeHtml(value) {
  return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
`,
    );

    const result = runVerify("lab26/canvas");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("escapeHtml(value)");
  });

  it("nonTerminatingFilterByState.failsWithinTimeoutNamingLimit", () => {
    // Cap the runaway loop at 4000ms (> LEARNER_CODE_TIMEOUT_MS = 2000ms) so
    // running this test against an unguarded implementation fails fast on the
    // timeout assertions instead of wedging the Vitest worker forever.
    writeWorkspaceFile(
      MODULE_PATH,
      `export function filterByState(issues, state) {
  const deadline = Date.now() + 4000;
  const out = [];
  for (let i = 0; i < issues.length && Date.now() < deadline; i--) {
    if (issues[i]?.state === state) out.push(issues[i]);
  }
  return out;
}
${ESCAPE_HTML_DEC}
`,
    );

    const started = Date.now();
    const result = runVerify("lab26/canvas");
    const elapsedMs = Date.now() - started;

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/timed out.*2000\s*ms/i);
    expect(elapsedMs).toBeLessThan(3500);
  });

  it.each([
    ["moduleInitialization", `const deadline = Date.now() + 4000;
while (Date.now() < deadline) {}
${CORRECT_FILTER}
${ESCAPE_HTML_DEC}`],
    ["escapeHtml", `${CORRECT_FILTER}
export function escapeHtml(value) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {}
  return value;
}`],
  ])("%s.timesOutAndAllowsACorrectedRetry", (_name, code) => {
    // The local deadline also bounds the negative control without a VM timeout.
    writeWorkspaceFile(MODULE_PATH, code);

    const started = Date.now();
    const result = runVerify("lab26/canvas");
    const elapsedMs = Date.now() - started;

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/timed out.*2000\s*ms/i);
    expect(elapsedMs).toBeLessThan(3500);
    writeWorkspaceFile(MODULE_PATH, `${CORRECT_FILTER}\n${ESCAPE_HTML_DEC}`);
    expect(runVerify("lab26/canvas").pass).toBe(true);
  });

  it("moduleSyntaxError.failsCleanlyAndAllowsACorrectedRetry", () => {
    writeWorkspaceFile(MODULE_PATH, `export function filterByState(issues, state) {
  return issues.;
}
${ESCAPE_HTML_DEC}`);

    const result = runVerify("lab26/canvas");

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/Unexpected token/i);
    writeWorkspaceFile(MODULE_PATH, `${CORRECT_FILTER}\n${ESCAPE_HTML_DEC}`);
    expect(runVerify("lab26/canvas").pass).toBe(true);
  });

  it("filterMissingReturn.failsWithActionableFilterFeedback", () => {
    writeWorkspaceFile(MODULE_PATH, `export function filterByState(issues, state) {
  issues.filter((i) => i.state.toLowerCase() === state.toLowerCase());
}
${ESCAPE_HTML_DEC}`);

    const result = runVerify("lab26/canvas");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("filterByState(issues, state)");
  });

  it("escapeHtmlMissingReturn.failsWithActionableEscapingFeedback", () => {
    writeWorkspaceFile(MODULE_PATH, `${CORRECT_FILTER}
export function escapeHtml(value) {
  String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}`);

    const result = runVerify("lab26/canvas");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("escapeHtml(value)");
  });
});
