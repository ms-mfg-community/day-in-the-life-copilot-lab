import { Note, PromptCard, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

export const lab15: Lab = {
  id: "lab15",
  number: "15",
  title: "LSP & Code Intelligence",
  tagline:
    "What a language server gives Copilot, how to wire one, and watching the text-search fallback when none is configured.",
  steps: [
    {
      key: "lab15/what",
      title: "What LSP gives Copilot CLI",
      kind: "read",
      body: (
        <>
          <p>
            A language server understands code the way a compiler does. When one
            is configured, Copilot CLI <strong>prefers it automatically</strong>{" "}
            over text search — no slash command, no opt-in per query:
          </p>
          <table>
            <thead>
              <tr>
                <th>Operation</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Go to definition</td>
                <td>
                  The actual definition, not a text match that looks similar
                </td>
              </tr>
              <tr>
                <td>Find references</td>
                <td>Every real usage, from the symbol graph</td>
              </tr>
              <tr>
                <td>Rename</td>
                <td>
                  Project-wide, following real references — never an unrelated
                  name-twin
                </td>
              </tr>
              <tr>
                <td>Call hierarchy</td>
                <td>Who calls this / what does this call</td>
              </tr>
              <tr>
                <td>Workspace symbols</td>
                <td>
                  Compact structured results instead of whole files read into
                  context
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Why it beats grep: accuracy (the analyzer's answer), token
            efficiency (structured results, not file dumps), and safer
            refactoring (renames touch only true references).
          </p>
          <Snippet title="where servers get configured">{`.github/lsp.json            project-level (you add it; repos don't ship one by default)
~/.copilot/lsp-config.json  personal, machine-wide
copilot lsp list            prints what's configured · /lsp manages in-session`}</Snippet>
        </>
      ),
    },
    {
      key: "lab15/fallback",
      title: "Watch the fallback happen",
      kind: "live",
      verifyId: "lab15/fallback",
      body: (
        <>
          <p>
            This workspace configures <em>no</em> language server — which makes
            it the perfect place to watch the other half of the behavior: the
            text-search fallback. Ask a symbol-level question and watch the tool
            chips:
          </p>
          <PromptCard prompt="Find every reference to the displayName function across this workspace, and tell me FIRST what mechanism you are using to find them. List each file and line. Do not change anything." />
          <Note>
            The chips show <code>grep</code>/<code>glob</code> — pattern
            matching, not symbol resolution. For <code>displayName</code> that
            works fine; for a symbol that shares its name with an unrelated one,
            text search returns both and a rename would damage both. With a
            TypeScript language server configured, those same questions route to
            the symbol graph.
          </Note>
        </>
      ),
    },
    {
      key: "lab15/when",
      title: "When Copilot still falls back",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Even with a server configured, Copilot drops to text search when:
          </p>
          <ul>
            <li>
              the server doesn't cover the language of the file in question (a
              TS server can't answer C#),
            </li>
            <li>the server is still indexing, or crashed,</li>
            <li>
              the question is textual, not symbolic — "find TODO comments" is a
              grep job, properly.
            </li>
          </ul>
          <Quiz
            stepKey="lab15/when"
            question="You ask Copilot to rename a method used in 14 files. What's the decisive advantage of having an LSP server configured?"
            options={[
              "It's faster to type the command",
              "The rename follows real symbol references — an unrelated member that merely shares the name is untouched",
              "The LSP lets Copilot edit files it otherwise couldn't",
            ]}
            correct={1}
            explain="Grep-and-replace rewrites every text match, name-twins included. The language server rewrites only true references to that symbol — that's the 'safer refactoring' row of the operations table."
          />
        </>
      ),
    },
  ],
};
