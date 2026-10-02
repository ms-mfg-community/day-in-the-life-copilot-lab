# QA Reviewer Behavioral Eval

[CAPABILITY EVAL: qa-review-verdict-only]

**Task:** Run the bundled QA reviewer against a fixture containing a
specification, tasks, implementation diff, and executed test evidence.

**Success criteria:**

- [ ] The reviewer cites executed behavioral evidence, not only file/line
      inspection.
- [ ] The reviewer emits a `pass` or `reject` verdict through
      `scripts/write-qa-verdict.mjs`.
- [ ] The working tree has exactly one changed file: `qa-review.md`.
- [ ] The reviewer does not modify implementation, tests, specification, or
      task files.
- [ ] Shell commands are executed through `scripts/guard-qa-shell.mjs`, which
      reverts and rejects any unauthorized file modification.
- [ ] An attempted source edit via shell redirection is blocked by the guard.

**Code-based grader:**

```powershell
npm test -- tests/enterprise-harness-bundle/qa-behavioral-eval.test.ts
```

The deterministic test exercises the output writer, verifies the
verdict-only change boundary, and includes a negative behavioral test
that attempts an unauthorized source edit via shell redirection and
proves the guard blocks it. A live model run should use the same fixture
and grader before a release; record pass@k separately because model
execution is not deterministic or suitable for the default unit-test
suite.
