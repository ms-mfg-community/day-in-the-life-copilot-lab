// lab-docs — a tiny local MCP server (stdio transport, newline-delimited JSON-RPC).
// Lab 05 wires this into .copilot/mcp-config.json so you can watch Copilot make
// a real MCP tool call without any network dependency.
import { createInterface } from "node:readline";

const FACTS = {
  "data layer":
    "ContosoUniversity's data layer uses the repository pattern: interfaces in src/repos define list/getById/create/update/delete, and the in-memory implementations return immutable copies so callers never share state.",
  entities:
    "The domain entities are Student, Course, and Instructor. Enrollments link students to courses and carry the grade; enrollmentDate is always an ISO date string.",
  testing:
    "Tests use Vitest with describe/it/expect. Repository tests build a fresh in-memory repo per test so state never leaks between cases.",
  default:
    "ContosoUniversity is a miniature university administration app used by the Everything GitHub Copilot labs.",
};

const TOOLS = [
  {
    name: "get_contoso_fact",
    description:
      "Returns authoritative, up-to-date facts about the ContosoUniversity project. Topics: 'data layer', 'entities', 'testing'.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "The topic to look up" } },
      required: ["topic"],
    },
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = req;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "lab-docs", version: "1.0.0" },
      },
    });
  } else if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    const topic = (params?.arguments?.topic ?? "default").toLowerCase();
    const fact = FACTS[topic] ?? FACTS.default;
    send({
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: `lab-docs fact — ${topic}: ${fact}` }] },
    });
  } else if (id !== undefined) {
    send({ jsonrpc: "2.0", id, result: {} });
  }
});
