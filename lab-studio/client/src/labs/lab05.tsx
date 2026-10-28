import { Cmd, FileCard, Note, OpenFileButton, PromptCard } from "./content";
import type { Lab } from "./types";

const MCP_CONFIG_WITH_LAB_DOCS = `{
  "mcpServers": {
    "microsoft-learn": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp",
      "tools": ["*"]
    },
    "lab-docs": {
      "type": "local",
      "command": "node",
      "args": ["./.copilot/mcp/lab-docs.mjs"],
      "tools": ["*"]
    }
  }
}
`;

export const lab05: Lab = {
  id: "lab05",
  number: "05",
  title: "MCP Server Configuration",
  tagline:
    "Wire a real MCP server into the session, watch a live tool call, and keep memory in markdown.",
  steps: [
    {
      key: "lab05/inspect",
      title: "Examine the MCP configuration",
      kind: "mixed",
      verifyId: "lab05/inspect",
      body: (
        <>
          <p>
            MCP (Model Context Protocol) servers extend Copilot with external
            tools — documentation lookup, knowledge persistence, structured
            reasoning. The wiring lives in <code>.copilot/mcp-config.json</code>
            . See what this workspace starts with:
          </p>
          <Cmd lines={["cat .copilot/mcp-config.json"]} />
          <p>There are two server types, and the difference matters:</p>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Runs as</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>local</code>
                </td>
                <td>A subprocess speaking JSON-RPC over stdio</td>
                <td>
                  a <code>node</code> or <code>npx</code> command
                </td>
              </tr>
              <tr>
                <td>
                  <code>http</code>
                </td>
                <td>A remote endpoint — no local process</td>
                <td>
                  <code>microsoft-learn</code> above
                </td>
              </tr>
            </tbody>
          </table>
          <Note>
            <code>"tools": ["*"]</code> exposes every tool the server offers. In
            production, restrict the list — an MCP server is exactly as
            trustworthy as the tools you let it serve.
          </Note>
        </>
      ),
    },
    {
      key: "lab05/add",
      title: "Add a local MCP server",
      kind: "mixed",
      verifyId: "lab05/add-server",
      body: (
        <>
          <p>
            Your workspace ships a tiny real MCP server — <code>lab-docs</code>,
            sixty lines of Node speaking stdio JSON-RPC, serving one tool:{" "}
            <code>get_contoso_fact</code>. It isn't wired up yet. Read it first;
            it's the whole protocol in one screen:
          </p>
          <p>
            <OpenFileButton path=".copilot/mcp/lab-docs.mjs">
              Open .copilot/mcp/lab-docs.mjs
            </OpenFileButton>
          </p>
          <p>
            Now add it to <code>.copilot/mcp-config.json</code> — a new entry
            inside the existing <code>mcpServers</code> object (mind the comma),
            or insert the complete file:
          </p>
          <FileCard
            path=".copilot/mcp-config.json"
            mode="replace"
            content={MCP_CONFIG_WITH_LAB_DOCS}
          />
          <Note tone="sim">
            In the full workshop this step adds a published npx server (like{" "}
            <code>fetch</code> or <code>context7</code>) from the registry's
            pinned catalog. The studio uses a local server for the same wiring
            so the lab is deterministic and offline-safe — the config shape is
            identical either way.
          </Note>
        </>
      ),
    },
    {
      key: "lab05/use",
      title: "Connect and call a real MCP tool",
      kind: "live",
      verifyId: "lab05/use-mcp",
      body: (
        <>
          <p>
            MCP config loads at session start — the same restart discipline as
            Lab 02. Restart and check the server actually connected:
          </p>
          <Cmd lines={["copilot", "/mcp list", "/mcp show lab-docs"]} restart />
          <p>
            <code>lab-docs</code> should show <strong>connected</strong>.
            (You'll also see Copilot's built-in GitHub MCP server — it ships
            with every session.) Now make Copilot call your server, and name the
            tool deliberately — a vague "look this up" can be answered without
            ever touching MCP:
          </p>
          <PromptCard prompt="Use the lab-docs MCP server's get_contoso_fact tool to look up the topic 'data layer', then report exactly what it said." />
          <Note>
            Watch the bench: the tool chip will read{" "}
            <code>lab-docs-get_contoso_fact</code>. That prefix is the MCP
            naming rule — <code>&lt;server&gt;-&lt;tool&gt;</code> — and the
            round-trip you just watched is a real subprocess, spawned by the
            session, answering over stdio.
          </Note>
        </>
      ),
    },
    {
      key: "lab05/lessons",
      title: "Persistence: markdown, not a memory server",
      kind: "live",
      verifyId: "lab05/lessons",
      body: (
        <>
          <p>
            MCP gives you live tools. It is deliberately <em>not</em> this
            workshop's memory layer: cross-session knowledge lives in plain
            markdown under <code>.copilot/lessons/</code> — diffable,
            reviewable, revertable, shipped with the repo. Have Copilot write
            itself a lesson:
          </p>
          <PromptCard prompt="Append a lesson entry to .copilot/lessons/log.md following the schema described at the top of that file: ContosoUniversity uses the repository pattern with in-memory repositories that return immutable copies, and enrollmentDate is always an ISO date string. Leave 'Promoted to' blank." />
          <p>Then check the file landed as reviewable text:</p>
          <Cmd lines={["cat .copilot/lessons/log.md"]} />
          <Note>
            The payoff: start a fresh session (<code>/new</code>) and ask{" "}
            <em>
              "What does this repo use for data access? Check .copilot/lessons/
              before answering."
            </em>{" "}
            The new session reads the lesson the old one wrote — no
            knowledge-graph server, no embeddings, just markdown committed next
            to the code. Lab 10 of the full workshop builds the complete
            three-layer model on this foundation.
          </Note>
        </>
      ),
    },
  ],
};
