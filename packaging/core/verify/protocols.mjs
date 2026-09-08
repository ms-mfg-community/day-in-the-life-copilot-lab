import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mcpConfiguration, lspConfiguration } from '../runtime/profile.mjs';
import { RpcProcess } from './rpc.mjs';
import { waitForSourceSymbol } from './lsp-source.mjs';

async function withMcp(server, workspace, env, action) {
  const rpc = new RpcProcess(server.command, server.args, { cwd: workspace, env: { ...env, ...server.env } });
  try {
    const initialized = await rpc.request('initialize', {
      protocolVersion: '2025-11-25', capabilities: {},
      clientInfo: { name: 'prepared-core-readiness', version: '1.0.0' },
    });
    rpc.notify('notifications/initialized');
    await action(rpc);
    return initialized.protocolVersion;
  } finally {
    await rpc.close();
  }
}

async function call(rpc, name, args) {
  const result = await rpc.request('tools/call', { name, arguments: args });
  if (result.isError) throw new Error(`Local MCP tool failed: ${name}: ${JSON.stringify(result.content)}`);
  return result;
}

export async function probeAttendeeMemory(workspace, runtime, env, entity, create = false) {
  const memory = mcpConfiguration(workspace, runtime).mcpServers.memory;
  await withMcp(memory, workspace, env, async (rpc) => {
    if (create) {
      await call(rpc, 'create_entities', {
        entities: [{ name: entity, entityType: 'attendee-work', observations: ['preserve across lifecycle changes'] }],
      });
    }
    const graph = await call(rpc, 'read_graph', {});
    assert.ok(JSON.stringify(graph).includes(entity), 'The actual memory server could not retrieve preserved attendee state');
  });
}

export async function probeMcp(workspace, runtime, env) {
  const servers = mcpConfiguration(workspace, runtime).mcpServers;
  const scratch = mkdtempSync(join(workspace, '.lab-state/mcp-readiness-'));
  const entity = `readiness-${randomUUID()}`;
  const memory = { ...servers.memory, env: { MEMORY_FILE_PATH: join(scratch, 'memory.jsonl') } };
  try {
    const memoryVersion = await withMcp(memory, workspace, env, async (rpc) => {
      await call(rpc, 'create_entities', { entities: [{ name: entity, entityType: 'readiness', observations: ['local persistence'] }] });
    });
    await withMcp(memory, workspace, env, async (rpc) => {
      const graph = await call(rpc, 'read_graph', {});
      assert.ok(JSON.stringify(graph).includes(entity), 'Memory did not persist across real server processes');
    });
    const filesystemVersion = await withMcp(servers.filesystem, workspace, env, async (rpc) => {
      const root = join(workspace, 'labs/fixtures');
      const allowed = await call(rpc, 'list_allowed_directories', {});
      assert.ok(JSON.stringify(allowed).includes(root), 'Filesystem is not scoped to this checkout');
      await call(rpc, 'list_directory', { path: root });
      const denied = await rpc.request('tools/call', {
        name: 'read_text_file', arguments: { path: join(workspace, 'package.json') },
      });
      assert.equal(denied.isError, true, 'Filesystem server allowed access outside its fixture root');
    });
    const thinkingVersion = await withMcp(servers['sequential-thinking'], workspace, env, async (rpc) => {
      const thought = await call(rpc, 'sequentialthinking', {
        thought: 'Check local tool execution.', thoughtNumber: 1, totalThoughts: 1, nextThoughtNeeded: false,
      });
      const result = JSON.parse(thought.content.find((entry) => entry.type === 'text').text);
      assert.equal(result.thoughtNumber, 1);
      assert.equal(result.nextThoughtNeeded, false);
    });
    return { memory: memoryVersion, filesystem: filesystemVersion, sequentialThinking: thinkingVersion };
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

function findSource(directory, extension) {
  const ignored = new Set(['node_modules', 'bin', 'obj', '.git', '.lab-state']);
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isFile() && entry.name.endsWith(extension)) return path;
    if (entry.isDirectory()) {
      const nested = findSource(path, extension);
      if (nested) return nested;
    }
  }
  return undefined;
}

async function probeLanguage(server, workspace, env, preferredFile, languageId, extension) {
  const root = join(workspace, server.rootUri);
  const rpc = new RpcProcess(server.command, server.args, { cwd: root, env, framed: true });
  try {
    const rootUri = pathToFileURL(root).href;
    await rpc.request('initialize', {
      processId: process.pid, rootUri, capabilities: { textDocument: { documentSymbol: { hierarchicalDocumentSymbolSupport: true } } },
      workspaceFolders: [{ uri: rootUri, name: server.rootUri }],
    });
    rpc.notify('initialized');
    const preferred = join(workspace, preferredFile);
    const file = existsSync(preferred) ? preferred : findSource(root, extension);
    assert.ok(file, `No ${languageId} source is available for an LSP readiness request`);
    const uri = pathToFileURL(file).href;
    const text = readFileSync(file, 'utf8');
    rpc.notify('textDocument/didOpen', { textDocument: { uri, languageId, version: 1, text } });
    const grounded = await waitForSourceSymbol(rpc, uri, text);
    await rpc.request('shutdown');
    rpc.notify('exit');
    return { file: relative(workspace, file), symbol: grounded.name };
  } finally {
    await rpc.close();
  }
}

export async function probeLsp(workspace, runtime, env) {
  const servers = lspConfiguration(runtime).lspServers;
  const [typescript, csharp] = await Promise.all([
    probeLanguage(servers.typescript, workspace, env, 'node/web/server.ts', 'typescript', '.ts'),
    probeLanguage(servers.csharp, workspace, env, 'dotnet/ContosoUniversity.Core/Models/Student.cs', 'csharp', '.cs'),
  ]);
  return { typescript, csharp };
}
