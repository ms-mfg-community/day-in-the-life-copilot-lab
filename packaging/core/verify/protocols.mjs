import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mcpConfiguration, lspConfiguration } from '../runtime/profile.mjs';
import { RpcProcess } from './rpc.mjs';

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
      const listing = await call(rpc, 'list_directory', { path: join(workspace, 'labs/fixtures') });
      assert.ok(JSON.stringify(listing).includes('lab12'), 'Filesystem fixture listing is incomplete');
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

function symbolNames(symbols) {
  return symbols.flatMap((symbol) => [symbol.name, ...symbolNames(symbol.children ?? [])]);
}

async function probeLanguage(server, workspace, env, relativeFile, expectedSymbol, languageId) {
  const root = join(workspace, server.rootUri);
  const rpc = new RpcProcess(server.command, server.args, { cwd: root, env, framed: true });
  try {
    const rootUri = pathToFileURL(root).href;
    await rpc.request('initialize', {
      processId: process.pid, rootUri, capabilities: { textDocument: { documentSymbol: { hierarchicalDocumentSymbolSupport: true } } },
      workspaceFolders: [{ uri: rootUri, name: server.rootUri }],
    });
    rpc.notify('initialized');
    const file = join(workspace, relativeFile);
    const uri = pathToFileURL(file).href;
    rpc.notify('textDocument/didOpen', { textDocument: { uri, languageId, version: 1, text: readFileSync(file, 'utf8') } });
    const symbols = await rpc.request('textDocument/documentSymbol', { textDocument: { uri } });
    assert.ok(Array.isArray(symbols) && symbolNames(symbols).includes(expectedSymbol), `LSP did not resolve ${expectedSymbol}`);
    await rpc.request('shutdown');
    rpc.notify('exit');
    return { file: relativeFile, symbol: expectedSymbol };
  } finally {
    await rpc.close();
  }
}

export async function probeLsp(workspace, runtime, env) {
  const servers = lspConfiguration(runtime).lspServers;
  const [typescript, csharp] = await Promise.all([
    probeLanguage(servers.typescript, workspace, env, 'node/web/server.ts', 'main', 'typescript'),
    probeLanguage(servers.csharp, workspace, env, 'dotnet/ContosoUniversity.Core/Models/Student.cs', 'Student', 'csharp'),
  ]);
  return { typescript, csharp };
}
