import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Ajv from "ajv";

import { formatCorrelationKey, parseCorrelationKey, isValidCorrelationKey } from "../../.github/extensions/enterprise-sdlc-workbench/lib/correlation.mjs";
import { run } from "../../.github/extensions/enterprise-sdlc-workbench/lib/exec.mjs";
import {
    loadFixtureBoard,
    computeReadiness,
    filterByLabel,
} from "../../.github/extensions/enterprise-sdlc-workbench/lib/board.mjs";
import { parseSolutionText, parseSolution } from "../../.github/extensions/enterprise-sdlc-workbench/lib/codeMap.mjs";
import { buildMarker, dispatch } from "../../.github/extensions/enterprise-sdlc-workbench/lib/dispatch.mjs";
import {
    composeHandoffMarkdown,
    resolveReleasePath,
    saveDraft,
} from "../../.github/extensions/enterprise-sdlc-workbench/lib/releaseComposer.mjs";
import { escapeHtml, renderBoard } from "../../.github/extensions/enterprise-sdlc-workbench/lib/render.mjs";
import { buildCanvasDefs } from "../../.github/extensions/enterprise-sdlc-workbench/lib/canvasDefs.mjs";

const ROOT = process.cwd();
const EXT_DIR = join(ROOT, ".github", "extensions", "enterprise-sdlc-workbench");
const FIXTURE_PATH = join(EXT_DIR, "fixtures", "epic-001-board.json");
const ADVERSARIAL_PATH = join(EXT_DIR, "fixtures", "adversarial-board.json");
const MALFORMED_SLN = join(EXT_DIR, "fixtures", "malformed.sln");
const REAL_SLN = join(ROOT, "dotnet", "ContosoUniversity.sln");

describe("extensions: enterprise-sdlc-workbench", () => {
    it("extension.mjs and every lib file pass a syntax smoke check", () => {
        const files = [
            "extension.mjs",
            "lib/exec.mjs",
            "lib/correlation.mjs",
            "lib/board.mjs",
            "lib/codeMap.mjs",
            "lib/prerequisites.mjs",
            "lib/dispatch.mjs",
            "lib/releaseComposer.mjs",
            "lib/render.mjs",
            "lib/canvasDefs.mjs",
            "lib/httpCanvasServer.mjs",
            "lib/canvases/sdlcBoardCanvas.mjs",
            "lib/canvases/codeMapCanvas.mjs",
            "lib/canvases/releaseComposerCanvas.mjs",
        ];
        for (const file of files) {
            expect(() => execFileSync("node", ["--check", join(EXT_DIR, file)], { stdio: "pipe" })).not.toThrow();
        }
    });

    describe("lib/correlation.mjs", () => {
        it("formats and round-trips a valid key", () => {
            const key = formatCorrelationKey({ feature: "lab26", stage: "implement", task: "sdlc-board", run: "run-001" });
            expect(key).toBe("lab26/implement/sdlc-board/run-001");
            expect(parseCorrelationKey(key)).toEqual({
                feature: "lab26",
                stage: "implement",
                task: "sdlc-board",
                run: "run-001",
            });
            expect(isValidCorrelationKey(key)).toBe(true);
        });

        it("rejects non-kebab-case or wrong segment counts", () => {
            expect(() => formatCorrelationKey({ feature: "Lab26", stage: "x", task: "y", run: "z" })).toThrow();
            expect(isValidCorrelationKey("too/few/segments")).toBe(false);
            expect(isValidCorrelationKey("way/too/many/segments/here")).toBe(false);
            expect(isValidCorrelationKey(42)).toBe(false);
        });
    });

    describe("lib/exec.mjs", () => {
        it("never throws on a missing binary, returns a structured failure", async () => {
            const result = await run("this-binary-does-not-exist-xyz", ["--version"], { timeoutMs: 2000 });
            expect(result.ok).toBe(false);
            expect(typeof result.error).toBe("string");
        });

        it("captures stdout on success via argv args (never shell-concatenated)", async () => {
            const result = await run("node", ["--version"], { timeoutMs: 5000 });
            expect(result.ok).toBe(true);
            expect(result.stdout.trim()).toMatch(/^v\d+\./);
        });
    });

    describe("fixtures/epic-001-board.json", () => {
        const ajv = new Ajv({ allErrors: true, strict: false });
        const schema = JSON.parse(readFileSync(join(EXT_DIR, "fixtures", "epic-001-board.schema.json"), "utf8"));
        const validate = ajv.compile(schema);

        it("validates against its own JSON Schema", () => {
            const data = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
            const valid = validate(data);
            expect(valid, JSON.stringify(validate.errors)).toBe(true);
        });

        it("carries the required fixture-honesty metadata", () => {
            const data = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
            expect(data.schemaVersion).toBe("v1");
            expect(data.sourceRepo).toBe("ms-mfg-community/day-in-the-life-copilot-lab");
            expect(typeof data.capturedAt).toBe("string");
        });

        it("adversarial fixture also validates (schema doesn't special-case hostile strings)", () => {
            const data = JSON.parse(readFileSync(ADVERSARIAL_PATH, "utf8"));
            expect(validate(data), JSON.stringify(validate.errors)).toBe(true);
        });
    });

    describe("lib/board.mjs", () => {
        it("loads the fixture board and tags it mode=fixture", async () => {
            const board = await loadFixtureBoard(FIXTURE_PATH);
            expect(board.mode).toBe("fixture");
            expect(board.issues.length).toBeGreaterThan(0);
        });

        it("computeReadiness marks #53 ready (its only dependency, #52, is closed)", async () => {
            const board = await loadFixtureBoard(FIXTURE_PATH);
            const readiness = computeReadiness(board);
            const issue53 = readiness.find((r) => r.number === 53);
            expect(issue53.ready).toBe(true);
        });

        it("computeReadiness marks #59 blocked (its dependency #53 is still open)", async () => {
            const board = await loadFixtureBoard(FIXTURE_PATH);
            const readiness = computeReadiness(board);
            const issue59 = readiness.find((r) => r.number === 59);
            expect(issue59.ready).toBe(false);
            expect(issue59.blockedBy).toContain(53);
        });

        it("filterByLabel returns only issues carrying that label (hands-on exercise contract)", async () => {
            const board = await loadFixtureBoard(FIXTURE_PATH);
            const filtered = filterByLabel(board, "agentic-workflows");
            expect(filtered.map((i) => i.number)).toEqual([53]);
            expect(filterByLabel(board, "")).toEqual(board.issues);
        });
    });

    describe("lib/codeMap.mjs", () => {
        it("parses the real ContosoUniversity.sln into 5 known projects", async () => {
            const result = await parseSolution(REAL_SLN);
            const names = result.projects.map((p) => p.name).sort();
            expect(names).toEqual([
                "ContosoUniversity.Core",
                "ContosoUniversity.Infrastructure",
                "ContosoUniversity.PlaywrightTests",
                "ContosoUniversity.Tests",
                "ContosoUniversity.Web",
            ]);
            expect(result.malformedCount).toBe(0);
        });

        it("flags isTest for the test projects only", async () => {
            const result = await parseSolution(REAL_SLN);
            const byName = Object.fromEntries(result.projects.map((p) => [p.name, p.isTest]));
            expect(byName["ContosoUniversity.Tests"]).toBe(true);
            expect(byName["ContosoUniversity.PlaywrightTests"]).toBe(true);
            expect(byName["ContosoUniversity.Web"]).toBe(false);
        });

        it("degrades gracefully on a malformed Project(...) entry: keeps the good one, counts the bad one", async () => {
            const text = readFileSync(MALFORMED_SLN, "utf8");
            const result = parseSolutionText(text);
            expect(result.projects.map((p) => p.name)).toEqual(["ContosoUniversity.Good"]);
            expect(result.malformedCount).toBe(1);
        });
    });

    describe("lib/dispatch.mjs", () => {
        it("defaults to dry-run and never calls gh", async () => {
            const key = formatCorrelationKey({ feature: "lab26", stage: "test", task: "dispatch", run: "run-001" });
            const result = await dispatch({ repo: "o/r", issueNumber: 1, correlationKey: key });
            expect(result.dryRun).toBe(true);
            expect(result.applied).toBe(false);
            expect(result.marker).toBe(buildMarker(key));
        });

        it("rejects an invalid correlation key", async () => {
            await expect(dispatch({ repo: "o/r", issueNumber: 1, correlationKey: "not-a-key" })).rejects.toThrow();
        });

        it("buildMarker is a deterministic, versioned, sha256-derived marker", () => {
            const key = "lab26/implement/sdlc-board/run-001";
            const marker = buildMarker(key);
            expect(marker).toMatch(/^<!-- enterprise-sdlc-workbench:dispatch:v1:[0-9a-f]{16} -->$/);
            expect(buildMarker(key)).toBe(marker);
        });
    });

    describe("lib/releaseComposer.mjs", () => {
        const tmpRoot = join(tmpdir(), `esw-release-test-${process.pid}`);

        beforeEach(() => {
            mkdirSync(join(tmpRoot, "docs", "releases"), { recursive: true });
        });
        afterEach(() => {
            rmSync(tmpRoot, { recursive: true, force: true });
        });

        it("composes markdown listing issues and PRs", () => {
            const md = composeHandoffMarkdown({
                title: "Lab 26 handoff",
                correlationKey: "lab26/release/handoff/run-001",
                issues: [{ number: 59, title: "Lab 26" }],
                pullRequests: [{ number: 63, title: "Lab 26 PR" }],
            });
            expect(md).toContain("#59 Lab 26");
            expect(md).toContain("#63 Lab 26 PR");
        });

        it("rejects a path-traversal filename", () => {
            expect(() => resolveReleasePath(tmpRoot, "../../etc/passwd")).toThrow();
            expect(() => resolveReleasePath(tmpRoot, "..\\..\\escape.md")).toThrow();
        });

        it("saves a draft, then refuses to silently overwrite it", async () => {
            const saved = await saveDraft({ repoRoot: tmpRoot, filename: "lab26-handoff.md", content: "hello" });
            expect(existsSync(saved.path)).toBe(true);
            await expect(saveDraft({ repoRoot: tmpRoot, filename: "lab26-handoff.md", content: "again" })).rejects.toThrow();
            const overwritten = await saveDraft({
                repoRoot: tmpRoot,
                filename: "lab26-handoff.md",
                content: "again",
                overwrite: true,
            });
            expect(readFileSync(overwritten.path, "utf8")).toBe("again");
        });
    });

    describe("lib/render.mjs", () => {
        it("escapes HTML special characters", () => {
            expect(escapeHtml(`<script>alert('x')</script> & "y"`)).toBe(
                "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;y&quot;",
            );
        });

        it("renderBoard never leaks a raw <script> tag from an adversarial issue title", () => {
            const data = JSON.parse(readFileSync(ADVERSARIAL_PATH, "utf8"));
            const readiness = computeReadiness(data);
            const html = renderBoard({ board: { ...data, mode: "fixture" }, readiness, token: "tok" });
            expect(html).not.toContain("<script>alert");
            expect(html).toContain("&lt;script&gt;");
        });

        it("shows a visible Fixture badge for fixture-mode boards", async () => {
            const board = await loadFixtureBoard(FIXTURE_PATH);
            const readiness = computeReadiness(board);
            const html = renderBoard({ board, readiness, token: "tok" });
            expect(html).toContain(">Fixture<");
        });
    });

    describe("lib/canvasDefs.mjs (the real canvas contract, no SDK import needed)", () => {
        const defs = buildCanvasDefs({ repoRoot: ROOT, fixturePath: FIXTURE_PATH });

        it("builds exactly the three documented canvases", () => {
            expect(defs.map((d) => d.id).sort()).toEqual(["code-map", "release-composer", "sdlc-board"]);
        });

        it("every action has a handler and a non-empty description", () => {
            for (const def of defs) {
                expect(typeof def.open).toBe("function");
                expect(typeof def.onClose).toBe("function");
                for (const action of def.actions) {
                    expect(typeof action.handler).toBe("function");
                    expect(action.description?.length).toBeGreaterThan(0);
                }
            }
        });

        it("sdlc-board: open -> filter_by_label works end to end against the real open()/action handlers", async () => {
            const board = defs.find((d) => d.id === "sdlc-board");
            const openResult = await board.open({ instanceId: "test-1", input: { mode: "fixture" } });
            expect(openResult.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);

            const filterAction = board.actions.find((a) => a.name === "filter_by_label");
            const filtered = await filterAction.handler({ instanceId: "test-1", input: { label: "agentic-workflows" } });
            expect(filtered.map((i) => i.number)).toEqual([53]);

            await board.onClose({ instanceId: "test-1" });
        });

        it("sdlc-board: dispatch rejects a missing/invalid capability token", async () => {
            const board = defs.find((d) => d.id === "sdlc-board");
            await board.open({ instanceId: "test-2", input: { mode: "fixture" } });
            const dispatchAction = board.actions.find((a) => a.name === "dispatch");
            await expect(
                dispatchAction.handler({
                    instanceId: "test-2",
                    input: {
                        issueNumber: 59,
                        correlationKey: "lab26/implement/sdlc-board/run-001",
                        capabilityToken: "wrong-token",
                    },
                }),
            ).rejects.toThrow(/capability token/);
            await board.onClose({ instanceId: "test-2" });
        });

        it("actions throw a clear error when the instance was never opened", async () => {
            const board = defs.find((d) => d.id === "sdlc-board");
            const refreshAction = board.actions.find((a) => a.name === "refresh");
            await expect(refreshAction.handler({ instanceId: "never-opened", input: {} })).rejects.toThrow(/not open/);
        });

        it("release-composer: compose -> save_draft requires the capability token", async () => {
            const releaseComposer = defs.find((d) => d.id === "release-composer");
            await releaseComposer.open({ instanceId: "test-3", input: {} });
            const composeAction = releaseComposer.actions.find((a) => a.name === "compose");
            await composeAction.handler({
                instanceId: "test-3",
                input: { title: "t", correlationKey: "lab26/release/handoff/run-001" },
            });
            const saveAction = releaseComposer.actions.find((a) => a.name === "save_draft");
            await expect(
                saveAction.handler({ instanceId: "test-3", input: { filename: "x.md", capabilityToken: "wrong" } }),
            ).rejects.toThrow(/capability token/);
            await releaseComposer.onClose({ instanceId: "test-3" });
        });

        it("code-map: open() parses the real solution file", async () => {
            const codeMap = defs.find((d) => d.id === "code-map");
            const openResult = await codeMap.open({ instanceId: "test-4", input: {} });
            expect(openResult.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
            const refreshAction = codeMap.actions.find((a) => a.name === "refresh");
            const refreshed = await refreshAction.handler({ instanceId: "test-4", input: {} });
            expect(refreshed.projectCount).toBe(5);
            await codeMap.onClose({ instanceId: "test-4" });
        });
    });
});
