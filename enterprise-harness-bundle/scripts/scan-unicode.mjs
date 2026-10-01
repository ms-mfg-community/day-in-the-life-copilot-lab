import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEXT_EXTENSIONS = new Set(["", ".json", ".md", ".mjs", ".yaml", ".yml"]);
const SKIP_DIRECTORIES = new Set([".git", "node_modules"]);
const SUSPICIOUS_UNICODE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/gu;

function listFiles(root, current = root) {
  const files = [];
  for (const entry of readdirSync(current)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const path = join(current, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listFiles(root, path));
      continue;
    }
    if (TEXT_EXTENSIONS.has(extname(entry)) || entry === "CODEOWNERS") {
      files.push(path);
    }
  }
  return files;
}

export function scan(root) {
  const resolvedRoot = resolve(root);
  const findings = [];
  for (const file of listFiles(resolvedRoot)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(SUSPICIOUS_UNICODE)) {
      const prefix = text.slice(0, match.index);
      findings.push({
        file: relative(resolvedRoot, file),
        line: prefix.split("\n").length,
        codePoint: `U+${match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
      });
    }
  }
  return findings;
}

function main(argv) {
  const root = resolve(
    argv[0] ?? fileURLToPath(new URL("..", import.meta.url)),
  );
  const findings = scan(root);
  if (findings.length > 0) {
    for (const finding of findings) {
      process.stderr.write(
        `${finding.file}:${finding.line}: suspicious ${finding.codePoint}\n`,
      );
    }
    return 1;
  }
  process.stdout.write("unicode scan: ok\n");
  return 0;
}

const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  process.exit(main(process.argv.slice(2)));
}
