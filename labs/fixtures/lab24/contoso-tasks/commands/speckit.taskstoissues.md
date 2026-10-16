## Contoso: issue body (contoso-tasks)

For every issue you create, write the body as follows. Keep the title rule above
(`T001: <description>`) unchanged; the deduplication depends on it.

1. The task line from `tasks.md`, without the checkbox.
2. A link to the task in `tasks.md` at the current commit:
   `https://github.com/<owner>/<repo>/blob/<commit-sha>/specs/<feature>/tasks.md`.
   Get the SHA with `git rev-parse HEAD`.
3. The task's `yaml task-prompt` block, copied verbatim in a fenced `yaml` block.
4. A last line: `correlation_key: <the block's correlation_key>`.

Do not create an issue for a `G` task.

If a task has `supersedes: T###`, find that task's issue, add `Supersedes #<number>`
to the new issue's body, and close the old issue with `issue_write` (`state: closed`).
Do not edit the old issue's title. Core's tools list has no comment tool, so the
link lives in the new issue.
