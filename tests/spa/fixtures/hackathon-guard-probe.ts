import { deepStrictEqual, strictEqual } from "node:assert";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { ModuleKind, transpileModule } from "typescript";

export const GUARD_FILE = fileURLToPath(
  new URL("../hackathon-untouched.test.ts", import.meta.url),
);
export const GUARD_SOURCE = readFileSync(GUARD_FILE, "utf8");
const REPO_ROOT = dirname(dirname(dirname(GUARD_FILE)));
const require = createRequire(import.meta.url);

// null represents a directory, not a missing file; omit a key to represent absence.
export type Files = Record<string, string | Buffer | null>;

/**
 * Capture the delivered test's real-tree assertion without running its fixture cases.
 * Its filesystem is entirely in memory: even an accidental write is an error.
 * This exercises the assertion npm test runs, not a second implementation of the guard.
 */
export function captureGuard(files: Files, source = GUARD_SOURCE) {
  const entries = new Map<string, Buffer | null>();
  const reads: string[] = [];
  const key = (path: string): string => resolve(REPO_ROOT, path);
  const set = (path: string, value: string | Buffer | null): void => {
    entries.set(key(path), value === null ? null : Buffer.from(value));
  };
  for (const [path, value] of Object.entries(files)) set(path, value);

  const missing = (path: string): never => {
    throw new Error(`ENOENT: ${path}`);
  };
  const noWrites = (): never => {
    throw new Error("The QA guard probe must never write to a filesystem");
  };
  const fs = {
    statSync(path: string) {
      if (!entries.has(key(path))) return missing(path);
      return { isFile: () => entries.get(key(path)) !== null };
    },
    readFileSync(path: string, encoding?: BufferEncoding) {
      reads.push(path);
      const entry = entries.get(key(path));
      if (entry === undefined || entry === null) return missing(path);
      return encoding ? entry.toString(encoding) : Buffer.from(entry);
    },
    mkdirSync: noWrites,
    mkdtempSync: noWrites,
    writeFileSync: noWrites,
    rmSync: noWrites,
  };

  const stack: string[] = [];
  const assertions: Array<() => void> = [];
  const it = Object.assign(
    (_name: string, body: () => void) => {
      if (stack.at(-1) === "the real tree") assertions.push(body);
    },
    { each: () => () => {} },
  );
  const vitest = {
    describe(name: string, body: () => void) {
      stack.push(name);
      try {
        body();
      } finally {
        stack.pop();
      }
    },
    it,
    afterAll: () => {},
    expect(actual: unknown) {
      return {
        toEqual(expected: unknown) {
          // The VM has different Array/Object prototypes; compare serialized values.
          deepStrictEqual(
            JSON.parse(JSON.stringify(actual)),
            JSON.parse(JSON.stringify(expected)),
          );
        },
      };
    },
  };

  const compiled = transpileModule(
    source.replaceAll(
      "import.meta.url",
      JSON.stringify(pathToFileURL(GUARD_FILE).href),
    ),
    { compilerOptions: { module: ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(
    compiled,
    {
      Buffer,
      URL,
      exports: {},
      require: (id: string) => {
        if (id === "node:fs") return fs;
        if (id === "vitest") return vitest;
        if (id.startsWith("node:")) return require(id);
        throw new Error(`Unexpected guard dependency: ${id}`);
      },
    },
    { filename: GUARD_FILE, timeout: 5000 },
  );
  strictEqual(
    assertions.length,
    1,
    "Expected exactly one real-tree AC21 assertion",
  );

  return {
    assertGuard: assertions[0],
    reads,
    set,
    remove: (path: string): void => {
      entries.delete(key(path));
    },
  };
}
