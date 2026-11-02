import { Badge, Cmd, Note, PromptCard } from "./content";
import type { Lab } from "./types";

export const lab01: Lab = {
  id: "lab01",
  number: "01",
  title: "Exploring Copilot Configuration",
  tagline:
    "Map the configuration ecosystem, browse the plugin marketplace, and ask a custom agent for a plan.",
  steps: [
    {
      key: "lab01/map",
      title: "The configuration ecosystem",
      kind: "mixed",
      verifyId: "lab01/explore",
      body: (
        <>
          <p>
            Your lab workspace is a miniature <strong>ContosoUniversity</strong>{" "}
            — a TypeScript university app — that ships with the same kinds of
            Copilot configuration the full workshop repository carries. Every
            lab builds on this map:
          </p>
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>What lives there</th>
                <th>Lab</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>.github/agents/</code>
                </td>
                <td>
                  Specialized AI personas (<code>.agent.md</code>)
                </td>
                <td>03</td>
              </tr>
              <tr>
                <td>
                  <code>.github/skills/</code>
                </td>
                <td>
                  Auto-activating knowledge packs (<code>SKILL.md</code>)
                </td>
                <td>04</td>
              </tr>
              <tr>
                <td>
                  <code>.github/copilot-instructions.md</code>
                </td>
                <td>Repo-wide rules — always loaded</td>
                <td>02</td>
              </tr>
              <tr>
                <td>
                  <code>AGENTS.md</code>
                </td>
                <td>Project context — always loaded</td>
                <td>02</td>
              </tr>
              <tr>
                <td>
                  <code>.copilot/mcp-config.json</code>
                </td>
                <td>External tool integrations (MCP servers)</td>
                <td>05</td>
              </tr>
            </tbody>
          </table>
          <p>
            Explore it from the bench terminal. An agent file is just YAML
            frontmatter plus a markdown system prompt — read one and see:
          </p>
          <Cmd
            lines={["ls .github/agents", "cat .github/agents/planner.agent.md"]}
          />
          <Cmd lines={["tree .github"]} label="or map the whole tree" />
          <Note>
            The terminal on the right is your workspace shell. You can type any
            of these yourself — the Run button just saves you the keystrokes.{" "}
            <code>help</code> lists what the shell understands.
          </Note>
        </>
      ),
    },
    {
      key: "lab01/marketplace",
      title: "Discover agents from the marketplace",
      kind: "sim",
      verifyId: "lab01/marketplace",
      body: (
        <>
          <p>
            The Copilot CLI has a <strong>plugin marketplace</strong> — a
            registry of community and first-party plugins you install from the
            terminal. A plugin is not a command: it adds <em>components</em> —
            agents, skills, hooks, MCP servers — that you use by their own
            names.
          </p>
          <Note tone="sim">
            <Badge kind="sim" /> &nbsp;Marketplace commands normally reach
            GitHub over the network. Lab Studio answers them from a local
            catalog instead, so this works offline and never touches a remote.
            The command surface is identical to the real CLI.
          </Note>
          <p>List the registered marketplaces, then browse the catalog:</p>
          <Cmd
            lines={[
              "copilot plugin marketplace list",
              "copilot plugin marketplace browse awesome-copilot",
            ]}
          />
          <p>
            Install one. <code>github/awesome-copilot</code> is a{" "}
            <em>marketplace</em> — a catalog — and a plugin that happens to
            share its name lives inside it. The <code>plugin@marketplace</code>{" "}
            form picks that plugin precisely:
          </p>
          <Cmd
            lines={[
              "copilot plugin install awesome-copilot@awesome-copilot",
              "copilot plugin list",
            ]}
          />
          <Note>
            <strong>Key insight:</strong> marketplace plugins are a head start,
            not the ceiling. In Lab 03 you build your own agent from scratch —
            think of installed plugins as patterns to study and customize.
          </Note>
        </>
      ),
    },
    {
      key: "lab01/hierarchy",
      title: "The instruction hierarchy",
      kind: "read",
      body: (
        <>
          <p>
            Copilot <strong>combines</strong> every instruction source that
            applies to what you are doing — it does not rank them or pick a
            winner. The single most important concept in this workshop is{" "}
            <em>what loads when</em>:
          </p>
          <table>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Source</th>
                <th>When loaded</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Whole repository</td>
                <td>
                  <code>.github/copilot-instructions.md</code>
                </td>
                <td>
                  <strong>Always</strong> — every session
                </td>
              </tr>
              <tr>
                <td>Whole repository</td>
                <td>
                  <code>AGENTS.md</code>
                </td>
                <td>
                  <strong>Always</strong> — every session
                </td>
              </tr>
              <tr>
                <td>Matching files</td>
                <td>
                  <code>.github/instructions/*.instructions.md</code>
                </td>
                <td>
                  Only when the file's <code>applyTo</code> glob matches files
                  in context
                </td>
              </tr>
              <tr>
                <td>Matching topics</td>
                <td>
                  <code>.github/skills/*/SKILL.md</code>
                </td>
                <td>
                  When the skill's <code>description</code> matches your prompt
                </td>
              </tr>
              <tr>
                <td>Selected agent</td>
                <td>
                  <code>.github/agents/*.agent.md</code>
                </td>
                <td>
                  When you select it with <code>/agent</code>
                </td>
              </tr>
            </tbody>
          </table>
          <Note>
            <strong>Instructions cascade and stack.</strong> If{" "}
            <code>copilot-instructions.md</code> says "use immutable patterns"
            and a path rule says "use async/await", <em>both</em> apply. Copilot
            defines no precedence between them — so never write instructions
            that contradict each other.
          </Note>
          <p>
            In a session, <code>/instructions</code> lists exactly which sources
            Copilot discovered — you'll use it in Lab 02 to prove a new rule
            actually loaded.
          </p>
        </>
      ),
    },
    {
      key: "lab01/try",
      title: "Try it — ask the planner for a plan",
      kind: "live",
      verifyId: "lab01/try-planner",
      body: (
        <>
          <p>
            Time to run Copilot for real. The workspace ships a{" "}
            <code>planner</code> agent — a planning specialist that decomposes
            features but never writes code. Sending this prompt will:
          </p>
          <ol>
            <li>
              start a live Copilot session against your lab workspace (watch the
              status lamp),
            </li>
            <li>
              select the <code>planner</code> agent — its system prompt takes
              over,
            </li>
            <li>
              stream the reply, with a chip for every tool call Copilot makes
              while it reads your code.
            </li>
          </ol>
          <PromptCard
            agent="planner"
            prompt="How should I add a student search feature to ContosoUniversity?"
          />
          <Note>
            Notice the plan references the real project layout —{" "}
            <code>src/repos</code>, the repository pattern, the display-name
            convention. None of that is in the prompt: it comes from the
            configuration files and the code Copilot just read. That is semantic
            search plus instructions at work.
          </Note>
          <p>
            Lab Studio drives this through the official{" "}
            <code>@github/copilot-sdk</code> — the same engine as{" "}
            <code>copilot</code> in your terminal, which is why the session
            behaves exactly like the CLI the workshop teaches. One SDK honesty
            note: the CLI auto-discovers <code>.github/agents/</code> and{" "}
            <code>.github/skills/</code> from your working directory, but an SDK
            host must pass those directories explicitly — Lab Studio does that
            for you at session start.
          </p>
        </>
      ),
    },
  ],
};
