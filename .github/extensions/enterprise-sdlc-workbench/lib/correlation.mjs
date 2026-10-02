// lib/correlation.mjs — the shared correlation key this lab uses to tie a
// dispatch/audit comment back to a feature, SDLC stage, task, and run.
//
// ghcp-was-here: this is Lab 26's OWN convention (schema "v1"), not yet the
// ratified EPIC-001 "Provenance section" key that issue #59 references —
// that section doesn't exist in this repo yet (Labs 23-25 are unimplemented
// as of this lab). When EPIC-001's Provenance section ships, reconcile this
// module against it rather than silently diverging. Upgrade path: bump
// SCHEMA_VERSION and keep parse() accepting both versions during migration.

export const SCHEMA_VERSION = "v1";

// Four kebab-case segments: feature/stage/task/run.
const SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*";
const CORRELATION_RE = new RegExp(`^(${SEGMENT})/(${SEGMENT})/(${SEGMENT})/(${SEGMENT})$`);

/**
 * @param {{ feature: string, stage: string, task: string, run: string }} parts
 * @returns {string} e.g. "lab26/implement/sdlc-board/run-001"
 */
export function formatCorrelationKey({ feature, stage, task, run }) {
    const key = `${feature}/${stage}/${task}/${run}`;
    if (!CORRELATION_RE.test(key)) {
        throw new Error(
            `invalid correlation key parts: each of feature/stage/task/run must be ` +
                `lowercase kebab-case (got "${key}")`,
        );
    }
    return key;
}

/**
 * @param {string} key
 * @returns {{ feature: string, stage: string, task: string, run: string } | null}
 */
export function parseCorrelationKey(key) {
    const match = typeof key === "string" ? key.match(CORRELATION_RE) : null;
    if (!match) return null;
    const [, feature, stage, task, run] = match;
    return { feature, stage, task, run };
}

export function isValidCorrelationKey(key) {
    return parseCorrelationKey(key) !== null;
}
