// lib/prerequisites.mjs — bounded, timeout'd checks for the tools this
// extension's live-mode actions rely on. Every check is a best-effort probe
// via lib/exec.mjs: a missing binary or failed auth never throws, it just
// marks that capability "unavailable" so the canvas can show a degraded
// tile. A missing/unauthenticated `gh` disables only live mutations --
// fixture mode and the code-map canvas keep working regardless.

import { run } from "./exec.mjs";

const PROBE_TIMEOUT_MS = 5_000;

async function probe(label, command, args) {
    const result = await run(command, args, { timeoutMs: PROBE_TIMEOUT_MS });
    return {
        label,
        available: result.ok,
        detail: result.ok ? result.stdout.trim().split("\n")[0] : (result.error ?? result.stderr.trim()),
    };
}

export async function checkDotnet() {
    return probe("dotnet", "dotnet", ["--version"]);
}

export async function checkDocker() {
    return probe("docker", "docker", ["--version"]);
}

export async function checkGh() {
    return probe("gh", "gh", ["--version"]);
}

export async function checkGhAuth() {
    const result = await run("gh", ["auth", "status"], { timeoutMs: PROBE_TIMEOUT_MS });
    return {
        label: "gh auth",
        available: result.ok,
        detail: result.ok ? "authenticated" : (result.error ?? result.stderr.trim() ?? "not authenticated"),
    };
}

/**
 * Runs all prerequisite checks concurrently (each individually bounded) and
 * returns a summary plus whether live/mutating actions should be enabled.
 */
export async function checkAllPrerequisites() {
    const [dotnet, docker, gh, ghAuth] = await Promise.all([
        checkDotnet(),
        checkDocker(),
        checkGh(),
        checkGhAuth(),
    ]);
    const checks = [dotnet, docker, gh, ghAuth];
    return {
        checks,
        liveModeAvailable: gh.available && ghAuth.available,
    };
}
