# `gh-clab` — sample solution for `labs/lab-gh-extensions.md`

An **interpreted** GitHub CLI extension (Node shebang, no compile step, no runtime
dependencies outside Node ≥ 20) that asks an LLM to summarize the working-tree
diff into a structured changelog.

> Reference spec: [`labs/lab-gh-extensions.md`](../../../labs/lab-gh-extensions.md).
> Extension type: *interpreted* — see
> [Creating GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions).

## Install (local)

```bash
cd solutions/lab-gh-extensions/gh-clab
chmod +x gh-clab
gh extension install .
gh extension list | grep gh-clab
```

`gh extension install .` installs the current directory as a local extension.
The repo/directory name must start with `gh-`; the `gh-` prefix is stripped to
form the command, so `gh-clab/` becomes `gh clab`.

## Invoke

```bash
# Summarize the current working-tree diff
gh clab

# Force the deterministic mock path (no credentials, no network)
gh clab --mock

# Allow running with no diff (e.g. for a smoke test)
gh clab --allow-empty --mock
```

## Three runtime modes (selected automatically)

| Priority | Mode       | Trigger                                                                   |
|----------|------------|---------------------------------------------------------------------------|
| 1        | `gh models`| `gh` on PATH **and** `github/gh-models` installed (`gh extension install github/gh-models`). Auth inherited from `gh auth`. |
| 2        | OpenAI     | `OPENAI_API_KEY` **or** `AZURE_OPENAI_API_KEY` (+ `_ENDPOINT`, `_DEPLOYMENT`). |
| 3        | Mock       | `GH_CLAB_MOCK=1`, `--mock`, or neither upstream available.                |

Selection logic lives in `pickMode()` in `gh-clab` and is kept under 30 lines so
the lab's teaching surface is not dominated by fallback handling.

## Uninstall

```bash
gh extension remove clab
```

## References

- Using GitHub CLI extensions — <https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions>
- Creating GitHub CLI extensions — <https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions>
- GitHub Models — <https://docs.github.com/en/github-models>
- `gh-models` source — <https://github.com/github/gh-models>
