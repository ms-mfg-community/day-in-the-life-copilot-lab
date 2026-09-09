import { describe, expect, it, vi } from 'vitest';
import { waitForAnySourceSymbol, waitForSourceSymbol } from '../../packaging/core/verify/lsp-source.mjs';

const symbol = {
  name: 'runAttendeeApp', kind: 12,
  selectionRange: { start: { line: 0, character: 9 }, end: { line: 0, character: 23 } },
};

describe('local LSP readiness', () => {
  it('waits for cold indexing and accepts renamed source symbols', async () => {
    const rpc = { request: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce([]).mockResolvedValue([symbol]) };
    const result = await waitForSourceSymbol(rpc, 'file:///repo/app.ts', 'function runAttendeeApp() {}', {
      timeoutMs: 1000, pollMs: 1,
    });
    expect(result.name).toBe('runAttendeeApp');
    expect(rpc.request).toHaveBeenCalledTimes(3);
  });

  it('does not accept a status-shaped or ungrounded symbol response', async () => {
    const rpc = { request: vi.fn().mockResolvedValue([{ ...symbol, name: 'notInTheSource' }]) };
    await expect(waitForSourceSymbol(rpc, 'file:///repo/app.ts', 'function runAttendeeApp() {}', {
      timeoutMs: 5, pollMs: 1,
    })).rejects.toThrow(/current source/);
  });

  it('rejects malformed protocol results instead of calling them ready', async () => {
    const rpc = { request: vi.fn().mockResolvedValue({ status: 'ready' }) };
    await expect(waitForSourceSymbol(rpc, 'file:///repo/app.ts', 'function runAttendeeApp() {}'))
      .rejects.toThrow(/invalid document-symbol/);
  });

  it('accepts an import-only entry point by validating another real source document', async () => {
    const documents = [
      { uri: 'file:///repo/server.ts', text: "import './attendee-server.js';" },
      { uri: 'file:///repo/attendee-server.ts', text: 'function runAttendeeApp() {}' },
    ];
    const rpc = { request: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([symbol]) };
    const result = await waitForAnySourceSymbol(rpc, documents, { timeoutMs: 1000, pollMs: 1 });
    expect(result.document.uri).toBe(documents[1].uri);
    expect(result.symbol.name).toBe('runAttendeeApp');
  });
});
