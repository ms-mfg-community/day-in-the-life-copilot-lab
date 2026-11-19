import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { writeVerdictData } from "./write-qa-verdict.mjs";

const SERVER_INFO = { name: "qa-boundary", version: "0.1.0" };

const TOOLS = [
  {
    name: "write_verdict",
    description:
      "Write the validated QA verdict (approve or reject) to <FEATURE_DIR>/qa-review.md (or qa-review.md at the repository root) using the qa-review-template layout. When status is reject, classification ('implementation' or 'spec-scope') is required. This is the QA reviewer's only sanctioned file write.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["approve", "reject"] },
        summary: { type: "string", minLength: 1 },
        findings: { type: "array", items: { type: "string", minLength: 1 } },
        featureDir: { type: "string", minLength: 1 },
        classification: {
          type: "string",
          enum: ["implementation", "spec-scope"],
        },
        reviewed: { type: "string", minLength: 1 },
        counts: {
          type: "object",
          properties: {
            met: { type: "integer", minimum: 0 },
            partial: { type: "integer", minimum: 0 },
            unmet: { type: "integer", minimum: 0 },
            unverified: { type: "integer", minimum: 0 },
          },
          additionalProperties: false,
        },
        criteria: {
          type: "array",
          items: {
            type: "object",
            properties: {
              criterion: { type: "string", minLength: 1 },
              result: {
                type: "string",
                enum: ["met", "partial", "unmet", "unverified"],
              },
              evidence: { type: "string", minLength: 1 },
            },
            required: ["criterion", "result", "evidence"],
            additionalProperties: false,
          },
        },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", minLength: 1 },
              marked: { type: "string", minLength: 1 },
              evidenceFound: { type: "boolean" },
              note: { type: "string", minLength: 1 },
            },
            required: ["id", "evidenceFound"],
            additionalProperties: false,
          },
        },
        returnsTo: {
          type: "string",
          enum: ["epic", "specify", "plan", "tasks", "implement"],
        },
        whatChanges: { type: "string", minLength: 1 },
        rerunNeeded: { type: "string", minLength: 1 },
      },
      required: ["status", "summary", "findings"],
      additionalProperties: false,
    },
  },
];

function textResult(text, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

export function callTool(name, args, cwd = process.cwd()) {
  try {
    if (name === "write_verdict") {
      const outputPath = writeVerdictData(args, cwd);
      return textResult(`wrote ${outputPath}`);
    }

    return textResult(`Unknown tool: ${name}`, true);
  } catch (error) {
    return textResult(
      error instanceof Error ? error.message : String(error),
      true,
    );
  }
}

export function handleRequest(request, cwd = process.cwd()) {
  if (request.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: request.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    };
  }
  if (request.method === "tools/list") {
    return { jsonrpc: "2.0", id: request.id, result: { tools: TOOLS } };
  }
  if (request.method === "tools/call") {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: callTool(request.params?.name, request.params?.arguments, cwd),
    };
  }
  if (request.id === undefined) return undefined;
  return {
    jsonrpc: "2.0",
    id: request.id,
    error: { code: -32601, message: `Method not found: ${request.method}` },
  };
}

const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  const input = readline.createInterface({ input: process.stdin });
  input.on("line", (line) => {
    let request;
    try {
      request = JSON.parse(line);
      const response = handleRequest(request);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: request?.id ?? null, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } })}\n`,
      );
    }
  });
}
