import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { captureGuard, type Files } from "./fixtures/hackathon-guard-probe";

const PAGE_PATH = "workshop/site/hackathon.html";
const DOCS = "workshop/spa/docs";
const BASELINE_PATH = `${DOCS}/hackathon-baseline.sha256`;
const RETIRED_PATH = `${DOCS}/hackathon-retired.md`;
const PAGE = Buffer.from("<!doctype html>\n<p>Frozen — résumé ✓</p>\n", "utf8");
const DIGEST = createHash("sha256").update(PAGE).digest("hex");
const CHANGED_PAGE = Buffer.from(
  "<!doctype html>\n<p>Edited — résumé ✓</p>\n",
  "utf8",
);
const intact = (): Files => ({
  [PAGE_PATH]: PAGE,
  [BASELINE_PATH]: `${DIGEST}\n`,
});
const rehearsal = (verdict: string): string =>
  `## Environment\nWindows\n## What was presented\nSPA\n## Defects found\nNone\n## Verdict\n${verdict}\n`;

describe("QA — the real-tree AC21 assertion, with isolated filesystem inputs", () => {
  it("accepts a present LF page whose independently computed raw SHA-256 matches the baseline", () => {
    expect(captureGuard(intact()).assertGuard).not.toThrow();
  });

  it("fails when the page is absent and no retirement record exists", () => {
    expect(
      captureGuard({ [BASELINE_PATH]: `${DIGEST}\n` }).assertGuard,
    ).toThrow();
  });

  it.each([
    ["an edit", CHANGED_PAGE],
    ["an empty file", Buffer.alloc(0)],
    ["a NUL byte appended", Buffer.concat([PAGE, Buffer.from([0])])],
    ["an oversized replacement", Buffer.alloc(1024 * 1024, 0x61)],
  ])("fails for %s instead of the recorded page", (_label, page) => {
    expect(
      captureGuard({ ...intact(), [PAGE_PATH]: page }).assertGuard,
    ).toThrow();
  });

  it("fails when the baseline is missing", () => {
    expect(captureGuard({ [PAGE_PATH]: PAGE }).assertGuard).toThrow();
  });

  it.each([
    ["empty", ""],
    ["malformed", "not-a-sha256\n"],
    ["ambiguous", `${DIGEST}\n${DIGEST}\n`],
    ["wrong", `${"0".repeat(64)}\n`],
  ])("fails for an %s baseline", (_label, baseline) => {
    expect(
      captureGuard({ ...intact(), [BASELINE_PATH]: baseline }).assertGuard,
    ).toThrow();
  });

  it.each(["PASS", "FAIL"])(
    "a %s rehearsal leaves a changed and a missing page guarded",
    (verdict) => {
      const files: Files = {
        ...intact(),
        [`${DOCS}/rehearsal-2026-11-02.md`]: rehearsal(verdict),
        [PAGE_PATH]: CHANGED_PAGE,
      };
      expect(captureGuard(files).assertGuard).toThrow();
      delete files[PAGE_PATH];
      expect(captureGuard(files).assertGuard).toThrow();
    },
  );

  it("near-miss retirement names and paths do not release the real assertion", () => {
    expect(
      captureGuard({
        ...intact(),
        [PAGE_PATH]: CHANGED_PAGE,
        [`${RETIRED_PATH}.bak`]: "",
        [`${DOCS}/hackathon-retirement.md`]: "",
        "workshop/spa/hackathon-retired.md": "",
        "hackathon-retired.md": "",
      }).assertGuard,
    ).toThrow();
  });

  it("a directory at the retirement-record path does not release the assertion", () => {
    expect(
      captureGuard({
        ...intact(),
        [PAGE_PATH]: CHANGED_PAGE,
        [RETIRED_PATH]: null,
      }).assertGuard,
    ).toThrow();
  });

  it.each([
    ["a deleted page and absent baseline", {}],
    ["a changed page and absent baseline", { [PAGE_PATH]: CHANGED_PAGE }],
    [
      "a changed page and malformed baseline",
      { [PAGE_PATH]: CHANGED_PAGE, [BASELINE_PATH]: "bad" },
    ],
  ])("the exact retirement record releases it with %s", (_label, files) => {
    const guard = captureGuard({ ...files, [RETIRED_PATH]: "" });
    expect(guard.assertGuard).not.toThrow();
    expect(guard.reads).toEqual([]);
  });

  it("rechecks the freeze on each invocation across retirement and rearming", () => {
    const guard = captureGuard(intact());
    expect(guard.assertGuard).not.toThrow();
    guard.set(PAGE_PATH, CHANGED_PAGE);
    expect(guard.assertGuard).toThrow();
    guard.set(RETIRED_PATH, "");
    expect(guard.assertGuard).not.toThrow();
    guard.remove(RETIRED_PATH);
    expect(guard.assertGuard).toThrow();
  });
});

describe("QA delta — exact-byte freeze and recorded baseline", () => {
  const crlf = Buffer.from(
    PAGE.toString("latin1").replace(/\n/g, "\r\n"),
    "latin1",
  );
  const mixed = Buffer.concat([Buffer.from("first\r\n"), PAGE]);
  const binary = Buffer.from([0x80, 0xff, 0x0d, 0x0a, 0x00]);
  const sha256 = (bytes: Buffer): string =>
    createHash("sha256").update(bytes).digest("hex");

  it.each([
    ["CRLF", crlf],
    ["mixed LF and CRLF", mixed],
    ["non-UTF-8 bytes containing CRLF", binary],
  ])(
    "accepts %s bytes with their own independently computed raw digest",
    (_label, page) => {
      expect(
        captureGuard({
          [PAGE_PATH]: page,
          [BASELINE_PATH]: `${sha256(page)}\n`,
        }).assertGuard,
      ).not.toThrow();
    },
  );

  it.each([
    ["LF to CRLF", PAGE, crlf],
    ["CRLF to LF", crlf, PAGE],
  ])(
    "rejects an otherwise identical %s conversion",
    (_label, recorded, changed) => {
      expect(
        captureGuard({
          [PAGE_PATH]: changed,
          [BASELINE_PATH]: `${sha256(recorded)}\n`,
        }).assertGuard,
      ).toThrow();
    },
  );

  it("distinguishes invalid UTF-8 bytes that text decoding would collapse", () => {
    const recorded = Buffer.from([0xff, 0x00, 0x0a]);
    const changed = Buffer.from([0xfe, 0x00, 0x0a]);
    expect(recorded.toString("utf8")).toBe(changed.toString("utf8"));
    const guard = captureGuard({
      [PAGE_PATH]: recorded,
      [BASELINE_PATH]: `${sha256(recorded)}\n`,
    });
    expect(guard.assertGuard).not.toThrow();
    guard.set(PAGE_PATH, changed);
    expect(guard.assertGuard).toThrow();
  });

  it("records the SHA-256 of the untouched worktree page, not the Git blob", () => {
    const root = new URL("../../", import.meta.url);
    if (existsSync(new URL(RETIRED_PATH, root))) return;
    const page = readFileSync(new URL(PAGE_PATH, root));
    const baseline = readFileSync(
      fileURLToPath(new URL(BASELINE_PATH, root)),
      "utf8",
    )
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
    expect(baseline).toEqual([sha256(page)]);
  });
});
