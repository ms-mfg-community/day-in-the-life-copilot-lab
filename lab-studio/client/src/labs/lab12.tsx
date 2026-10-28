import {
  Badge,
  Cmd,
  FileCard,
  Note,
  OpenFileButton,
  PromptCard,
} from "./content";
import type { Lab } from "./types";

const MCP_WITH_FABRIC = `{
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
    },
    "fabric-sim": {
      "type": "local",
      "command": "node",
      "args": ["./.copilot/mcp/fabric-sim.mjs"],
      "tools": ["*"]
    }
  }
}
`;

export const lab12: Lab = {
  id: "lab12",
  number: "12",
  title: "Fabric MCP (Offline Path)",
  tagline:
    "Wire a data-plane MCP server, enumerate lakehouses, and query a gold table — the lab's offline simulator path, live over MCP.",
  steps: [
    {
      key: "lab12/why",
      title: "Why a separate Fabric MCP?",
      kind: "read",
      body: (
        <>
          <p>
            Labs 05 taught MCP as a docs-and-tools plane. Microsoft Fabric's MCP
            server brings the <strong>data plane</strong> into the same
            conversation: lakehouses, tables, notebook cells — the agent can
            enumerate a medallion architecture (bronze → silver → gold) and
            query it without leaving the session.
          </p>
          <p>The real lab runs two paths, and the distinction is the lesson:</p>
          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>Needs</th>
                <th>What you learn</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Live</strong>
                </td>
                <td>Azure CLI sign-in, a Fabric tenant</td>
                <td>The same wiring against real OneLake</td>
              </tr>
              <tr>
                <td>
                  <strong>Offline</strong>
                </td>
                <td>A committed Parquet fixture</td>
                <td>Identical MCP mechanics, deterministic data</td>
              </tr>
            </tbody>
          </table>
          <Note tone="sim">
            <Badge kind="sim" /> &nbsp;The studio takes the offline path —
            exactly as the lab prescribes when no tenant is available. The MCP
            wiring and tool round-trips are real; the lakehouse data is a local
            fixture served by <code>.copilot/mcp/fabric-sim.mjs</code>.
          </Note>
        </>
      ),
    },
    {
      key: "lab12/wire",
      title: "Wire the server into the session",
      kind: "mixed",
      verifyId: "lab12/wire",
      body: (
        <>
          <p>
            The simulator ships with the workspace — read it, then wire it into
            the MCP config:
          </p>
          <p>
            <OpenFileButton path=".copilot/mcp/fabric-sim.mjs">
              Open .copilot/mcp/fabric-sim.mjs
            </OpenFileButton>
          </p>
          <FileCard
            path=".copilot/mcp-config.json"
            mode="replace"
            content={MCP_WITH_FABRIC}
          />
          <p>
            Config loads at session start — restart and confirm the connection:
          </p>
          <Cmd
            lines={["copilot", "/mcp list", "/mcp show fabric-sim"]}
            restart
          />
        </>
      ),
    },
    {
      key: "lab12/query",
      title: "Enumerate and query the lakehouse",
      kind: "live",
      verifyId: "lab12/query",
      body: (
        <>
          <p>
            Drive the data plane the way the lab does — enumerate first, then
            pull a result set and summarize:
          </p>
          <PromptCard prompt="Using the fabric-sim MCP server: list the lakehouses, list the tables in contoso_university, then query gold_enrollment_stats and summarize enrollment by course in a small table, calling out the course with the weakest average grade." />
          <Note>
            Watch the chips: <code>fabric-sim-list_lakehouses</code> →{" "}
            <code>fabric-sim-list_tables</code> →{" "}
            <code>fabric-sim-query_table</code>. Three real MCP round-trips; the
            agent then reasons over the rows it got back.
          </Note>
          <Note>
            <strong>Notebook hygiene, the lab's closing discipline:</strong>{" "}
            commit notebooks with outputs stripped (the workshop enforces it
            with a pre-commit hook), parameterize cells for Papermill, and pin
            the environment — reproducibility is what makes agent-edited
            notebooks reviewable.
          </Note>
        </>
      ),
    },
  ],
};
