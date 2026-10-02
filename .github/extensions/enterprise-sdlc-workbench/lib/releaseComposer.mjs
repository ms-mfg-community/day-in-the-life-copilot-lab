// lib/releaseComposer.mjs — drafts a handoff/release-notes markdown from a
// set of completed issues and merged PRs, and (opt-in) saves it under
// docs/releases/. "Save" and "publish" are two distinct, separately
// confirmed actions -- composing/saving a draft never pushes anything to
// GitHub.

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const RELEASES_DIR = "docs/releases";

export function composeHandoffMarkdown({ title, correlationKey, issues = [], pullRequests = [] }) {
    const lines = [
        `# ${title}`,
        "",
        `_Correlation key: \`${correlationKey}\`_`,
        "",
        "## Completed issues",
        ...(issues.length
            ? issues.map((issue) => `- #${issue.number} ${issue.title}`)
            : ["- (none)"]),
        "",
        "## Merged pull requests",
        ...(pullRequests.length
            ? pullRequests.map((pr) => `- #${pr.number} ${pr.title}`)
            : ["- (none)"]),
        "",
    ];
    return lines.join("\n");
}

/**
 * Resolves a caller-provided filename against docs/releases/, rejecting any
 * attempt to escape that directory (path traversal, absolute paths,
 * symlink-style tricks via `..`).
 */
export function resolveReleasePath(repoRoot, filename) {
    if (!filename || typeof filename !== "string") {
        throw new Error("invalid release filename: must be a non-empty string");
    }
    const safeName = path.basename(filename);
    if (safeName !== filename) {
        throw new Error(`invalid release filename "${filename}": must be a plain filename, no path segments`);
    }
    const releasesDir = path.resolve(repoRoot, RELEASES_DIR);
    const target = path.resolve(releasesDir, safeName);
    if (!target.startsWith(releasesDir + path.sep) && target !== releasesDir) {
        throw new Error(`invalid release filename "${filename}": resolves outside ${RELEASES_DIR}`);
    }
    return target;
}

/**
 * Saves a composed draft to docs/releases/. Refuses to silently overwrite an
 * existing file unless the caller passes `overwrite: true`.
 */
export async function saveDraft({ repoRoot, filename, content, overwrite = false }) {
    const targetPath = resolveReleasePath(repoRoot, filename);
    const exists = await fileExists(targetPath);
    if (exists && !overwrite) {
        throw new Error(`"${filename}" already exists in ${RELEASES_DIR}/ -- pass overwrite:true to replace it`);
    }
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
    return { path: targetPath, overwritten: exists };
}

async function fileExists(targetPath) {
    try {
        await access(targetPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * "Publish" is a distinct, explicit action from "save": it reads back a
 * saved draft and returns it ready for the caller to attach to a GitHub
 * release or issue comment. It never calls `gh` itself -- the canvas action
 * handler is responsible for the actual network call, kept separate so a
 * single accidental click can't both write and publish.
 */
export async function readDraftForPublish({ repoRoot, filename }) {
    const targetPath = resolveReleasePath(repoRoot, filename);
    return readFile(targetPath, "utf8");
}
