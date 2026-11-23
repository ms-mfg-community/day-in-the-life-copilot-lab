// lib/exec.mjs — safe, bounded process execution.
//
// Every `gh`/`git`/`dotnet`/`docker` call in this extension goes through
// `run()`. It never shells out via string concatenation (always an argv
// array), always has a timeout, and never throws on a missing binary or a
// non-zero exit — callers get a structured result and decide what a
// "degraded" tile looks like. This keeps prerequisite checks and board/code
// map loads from ever crashing the canvas.

import { execFile } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB cap per call

/**
 * @param {string} command - binary name, e.g. "gh", "git", "dotnet".
 * @param {string[]} args - argv, never a shell string.
 * @param {{ cwd?: string, timeoutMs?: number, env?: Record<string,string> }} [options]
 * @returns {Promise<{ ok: boolean, stdout: string, stderr: string, code: number|null, error?: string }>}
 */
export function run(command, args = [], options = {}) {
    const { cwd, timeoutMs = DEFAULT_TIMEOUT_MS, env } = options;
    return new Promise((resolve) => {
        execFile(
            command,
            args,
            {
                cwd,
                timeout: timeoutMs,
                maxBuffer: MAX_OUTPUT_BYTES,
                env: env ?? process.env,
                windowsHide: true,
            },
            (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        ok: false,
                        stdout: String(stdout ?? ""),
                        stderr: String(stderr ?? ""),
                        code: typeof error.code === "number" ? error.code : null,
                        error: error.message,
                    });
                    return;
                }
                resolve({
                    ok: true,
                    stdout: String(stdout ?? ""),
                    stderr: String(stderr ?? ""),
                    code: 0,
                });
            },
        );
    });
}

/**
 * Convenience wrapper for commands that return JSON on stdout (e.g.
 * `gh ... --json ...`). Returns `{ ok: false }` (never throws) if the
 * command failed or the output wasn't valid JSON.
 */
export async function runJson(command, args, options) {
    const result = await run(command, args, options);
    if (!result.ok) return result;
    try {
        return { ...result, data: JSON.parse(result.stdout) };
    } catch (parseError) {
        return { ...result, ok: false, error: `invalid JSON output: ${parseError.message}` };
    }
}
