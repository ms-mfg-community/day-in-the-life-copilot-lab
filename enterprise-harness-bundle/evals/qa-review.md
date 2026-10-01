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

**Code-based grader:**

```powershell
npm test -- tests/enterprise-harness-bundle/qa-behavioral-eval.test.ts
```

The deterministic test exercises the output writer and verifies the
verdict-only change boundary. A live model run should use the same fixture and
grader before a release; record pass@k separately because model execution is
not deterministic or suitable for the default unit-test suite.
