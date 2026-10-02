import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { guardExec } from "./guard-qa-shell.mjs";
import { writeVerdictData } from "./write-qa-verdict.mjs";

const SERVER_INFO = { name: "qa-boundary", version: "0.1.0" };

const TOOLS = [
  {
    name: "run_evidence",
    description:
      "Run a behavioral evidence command and restore any workspace changes except qa-review.md.",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string", minLength: 1 } },
      required: ["command"],
      additionalProperties: false,
    },
  },
  {
    name: "write_verdict",
    description: "Write the validated QA verdict to qa-review.md.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pass", "reject"] },
        summary: { type: "string", minLength: 1 },
        findings: { type: "array", items: { type: "string", minLength: 1 } },
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
    if (name === "run_evidence") {
      const result = guardExec(args?.command, cwd);
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
      if (result.blocked) {
        return textResult(
          `Blocked unauthorized changes: ${result.unauthorizedFiles.join(", ")}\n${output}`.trim(),
          true,
        );
      }
      return textResult(
        `exitCode=${result.exitCode}\n${output}`.trim(),
        result.exitCode !== 0,
      );
    }

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
