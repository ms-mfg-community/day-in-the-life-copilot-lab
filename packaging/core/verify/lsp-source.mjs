import { setTimeout as delay } from 'node:timers/promises';

const INDEX_TIMEOUT_MS = 60000;
const INDEX_POLL_MS = 250;
const NON_CODE_SYMBOL_KINDS = new Set([1, 2, 3, 4]);

function flatten(symbols) {
  return symbols.flatMap((symbol) => [symbol, ...flatten(symbol.children ?? [])]);
}

export async function waitForAnySourceSymbol(rpc, documents, options = {}) {
  if (!documents.length) throw new Error('No source documents are available for LSP readiness');
  const deadline = Date.now() + (options.timeoutMs ?? INDEX_TIMEOUT_MS);
  const candidates = documents.map((document) => ({ document, lines: document.text.split(/\r?\n/) }));
  do {
    for (const { document, lines } of candidates) {
      const symbols = await rpc.request('textDocument/documentSymbol', { textDocument: { uri: document.uri } });
      if (symbols !== null && !Array.isArray(symbols)) throw new Error('LSP returned an invalid document-symbol response');
      const grounded = flatten(symbols ?? []).find((symbol) => {
        const range = symbol.selectionRange ?? symbol.location?.range ?? symbol.range;
        return !NON_CODE_SYMBOL_KINDS.has(symbol.kind) && range && lines[range.start.line]?.includes(symbol.name);
      });
      if (grounded) return { symbol: grounded, document };
      if (Date.now() >= deadline) break;
    }
    await delay(options.pollMs ?? INDEX_POLL_MS);
  } while (Date.now() < deadline);
  throw new Error('LSP indexing did not return a symbol grounded in the current source before the local readiness deadline');
}

export async function waitForSourceSymbol(rpc, uri, text, options = {}) {
  return (await waitForAnySourceSymbol(rpc, [{ uri, text }], options)).symbol;
}
