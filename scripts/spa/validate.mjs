#!/usr/bin/env node
// spa:validate - the Teaching SPA content validator (spec 005, AC1).
//
//   npm run spa:validate                         the content directory AND the three curriculum globs
//   npm run spa:validate -- <target> [<target>]  only the named targets
//   npm run spa:validate -- --json ...           machine-readable result on stdout
//
// A target is a directory (searched recursively), a file, or a pattern whose
// wildcard is in the file name (quote it: "labs/*.md"). Which schema applies
// follows from the file: deck.json, interactions.json, datasets/*.json, and
// *.md (front matter against frontmatter.schema.json).
//
// Exit 0: every file is valid. Exit 1: at least one file is invalid. Exit 2:
// the invocation or the environment is wrong (unknown option, a target that
// does not exist or matches no files, a schema that does not compile). An empty
// target is never a pass: a validator that reads no file proves nothing.
import { REPO_ROOT, UsageError, applySemanticChecks, displayPath, expandTarget, validateFile } from './lib/validate.mjs';

const DEFAULT_TARGETS = ['workshop/spa/content', 'workshop/slides/*.md', 'workshop/speaker-scripts/*.md', 'labs/*.md'];

const HELP = `Usage: node scripts/spa/validate.mjs [--json] [target ...]

With no target, validates ${DEFAULT_TARGETS.join(', ')}.
A target is a directory, a file, or a file-name pattern such as "labs/*.md".
Exit 0 = all valid, 1 = invalid file found, 2 = bad invocation or environment.
`;

function run(argv) {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const unknown = flags.filter((flag) => flag !== '--json' && flag !== '--help');
  if (unknown.length > 0) throw new UsageError(`unknown option: ${unknown.join(' ')}`);
  if (flags.includes('--help')) {
    process.stdout.write(HELP);
    return 0;
  }

  const explicit = positional.length > 0;
  const groups = (explicit ? positional : DEFAULT_TARGETS).map((target) => {
    const files = expandTarget(target, explicit ? process.cwd() : REPO_ROOT);
    if (files.length === 0) throw new UsageError(`target matched no files: ${target}`);
    return { target, results: files.map(validateFile) };
  });
  applySemanticChecks(groups.flatMap((group) => group.results));

  const failed = groups.flatMap((group) => group.results).filter((result) => result.errors.length > 0);
  if (flags.includes('--json')) {
    const report = {
      ok: failed.length === 0,
      targets: groups.map((group) => ({
        target: group.target,
        files: group.results.map((r) => ({ file: displayPath(r.file), kind: r.kind, ok: r.errors.length === 0, errors: r.errors })),
      })),
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return failed.length === 0 ? 0 : 1;
  }

  for (const { target, results } of groups) {
    const bad = results.filter((result) => result.errors.length > 0);
    const noun = results.length === 1 ? 'file' : 'files';
    process.stdout.write(`${bad.length === 0 ? 'PASS' : 'FAIL'}  ${target}  (${results.length} ${noun}${bad.length ? `, ${bad.length} invalid` : ''})\n`);
    for (const result of bad) {
      process.stdout.write(`  ${displayPath(result.file)}  [${result.kind ?? 'no schema'}]\n`);
      for (const error of result.errors) process.stdout.write(`    ${error.path}: ${error.message}\n`);
    }
  }
  process.stdout.write(failed.length === 0 ? 'spa:validate: all files valid\n' : `spa:validate: ${failed.length} invalid file(s)\n`);
  return failed.length === 0 ? 0 : 1;
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`spa:validate: ${error instanceof UsageError ? error.message : error.stack}\n`);
  process.exitCode = 2;
}
