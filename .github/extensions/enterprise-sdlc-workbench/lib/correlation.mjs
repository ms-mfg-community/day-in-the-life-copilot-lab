// lib/correlation.mjs — the shared correlation key this lab uses to tie a
// dispatch/audit comment back to a feature, SDLC stage, task, and run.
//
// Implements EPIC-001's Provenance contract: one key names the feature,
// stage, task, and run. SCHEMA_VERSION versions the hidden dispatch marker;
// if the shared key shape changes, bump it and keep parse() accepting both
// formats during migration.

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
