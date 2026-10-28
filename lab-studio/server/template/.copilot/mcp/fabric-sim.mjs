// fabric-sim — an offline Fabric-style MCP server (stdio, newline JSON-RPC).
// Lab 12's "offline Parquet simulator" path: real MCP wiring, local data —
// no Azure tenant, no network.
import { createInterface } from "node:readline";

const LAKEHOUSES = [
  { name: "contoso_university", description: "Student/course enrollment data (medallion: bronze→silver→gold)" },
  { name: "campus_operations", description: "Facilities and scheduling data" },
];

const TABLES = {
  contoso_university: ["bronze_enrollments_raw", "silver_enrollments", "gold_enrollment_stats"],
  campus_operations: ["rooms", "bookings"],
};

const GOLD_ENROLLMENT_STATS = [
  { courseId: 1050, title: "Chemistry", enrolled: 42, avgGrade: "B" },
  { courseId: 2021, title: "Composition", enrolled: 31, avgGrade: "A" },
  { courseId: 3141, title: "Trigonometry", enrolled: 27, avgGrade: "C" },
  { courseId: 4041, title: "Microeconomics", enrolled: 19, avgGrade: "B" },
];

const TOOLS = [
  {
    name: "list_lakehouses",
    description: "List the lakehouses available in the (simulated) Fabric workspace.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tables",
    description: "List tables in a lakehouse. Args: lakehouse (string).",
    inputSchema: {
      type: "object",
      properties: { lakehouse: { type: "string" } },
      required: ["lakehouse"],
    },
  },
  {
    name: "query_table",
    description: "Return the rows of a table as JSON. Args: lakehouse, table.",
    inputSchema: {
      type: "object",
      properties: { lakehouse: { type: "string" }, table: { type: "string" } },
      required: ["lakehouse", "table"],
    },
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function textResult(id, text) {
  send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } });
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
        serverInfo: { name: "fabric-sim", version: "1.0.0" },
      },
    });
  } else if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    const tool = params?.name;
    const args = params?.arguments ?? {};
    if (tool === "list_lakehouses") {
      textResult(id, `Lakehouses (offline fixture):\n${LAKEHOUSES.map((l) => `- ${l.name}: ${l.description}`).join("\n")}`);
    } else if (tool === "list_tables") {
      const tables = TABLES[args.lakehouse];
      textResult(id, tables ? `Tables in ${args.lakehouse}: ${tables.join(", ")}` : `Unknown lakehouse: ${args.lakehouse}`);
    } else if (tool === "query_table") {
      if (args.table === "gold_enrollment_stats") {
        textResult(id, JSON.stringify(GOLD_ENROLLMENT_STATS, null, 2));
      } else {
        textResult(id, `Fixture only materializes gold_enrollment_stats; ${args.table ?? "?"} is listed but not loaded offline.`);
      }
    } else {
      textResult(id, `Unknown tool: ${tool}`);
    }
  } else if (id !== undefined) {
    send({ jsonrpc: "2.0", id, result: {} });
  }
});
