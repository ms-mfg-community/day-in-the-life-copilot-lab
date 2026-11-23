// lib/codeMap.mjs — parses dotnet/ContosoUniversity.sln into the project
// list shown by the `code-map` canvas, and reports a last-known build/test
// status per project. Degrades gracefully: a malformed Project(...) entry is
// skipped and reported, never thrown.

import { readFile } from "node:fs/promises";
import { run } from "./exec.mjs";

// Project(...) entries wrap across two physical lines in Visual Studio .sln
// files, e.g.:
//   Project("{GUID}") = "Name",
//   "relative\path.csproj", "{GUID2}"
// `\s*` (not `.`) bridges the line break; standard `\s` already matches
// newlines so no `s`/dotAll flag is needed.
const PROJECT_RE =
    /Project\("\{[0-9A-Fa-f-]+\}"\)\s*=\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"\{[0-9A-Fa-f-]+\}"/g;

/**
 * @param {string} slnPath - absolute path to a .sln file.
 * @returns {Promise<{ projects: Array<{name:string, path:string, isTest:boolean}>, malformedCount: number }>}
 */
export async function parseSolution(slnPath) {
    const raw = await readFile(slnPath, "utf8");
    return parseSolutionText(raw);
}

/** Exported separately so tests can feed in the adversarial fixture text directly. */
export function parseSolutionText(text) {
    const projects = [];
    let malformedCount = 0;

    // Count every `Project(` header line, then compare against how many we
    // actually matched, so a truncated/malformed entry is detected instead
    // of silently vanishing.
    const headerCount = (text.match(/^Project\(/gm) ?? []).length;

    for (const match of text.matchAll(PROJECT_RE)) {
        const [, name, relativePath] = match;
        projects.push({
            name,
            path: relativePath.replace(/\\/g, "/"),
            isTest: /\.(Tests|PlaywrightTests)$/i.test(name) || /test/i.test(name),
        });
    }

    malformedCount = Math.max(0, headerCount - projects.length);

    return { projects, malformedCount };
}

/**
 * Bounded, best-effort "last status" probe for a project: runs
 * `dotnet build`/`dotnet test` only if the caller explicitly opts in via
 * `probe: true` (board/code-map views default to showing "unknown" so
 * opening the canvas never kicks off a build).
 */
export async function probeProjectStatus(project, { cwd, probe = false } = {}) {
    if (!probe) {
        return { ...project, status: "unknown" };
    }
    const command = project.isTest ? "test" : "build";
    const result = await run("dotnet", [command, project.path, "--nologo"], {
        cwd,
        timeoutMs: 60_000,
    });
    return { ...project, status: result.ok ? "passing" : "failing" };
}
