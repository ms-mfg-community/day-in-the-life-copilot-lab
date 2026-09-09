export function waitForSourceSymbol(
  rpc: { request(method: string, params: unknown): Promise<unknown> },
  uri: string,
  text: string,
  options?: { timeoutMs?: number; pollMs?: number },
): Promise<{ name: string; kind: number }>;
export function waitForAnySourceSymbol<T extends { uri: string; text: string }>(
  rpc: { request(method: string, params: unknown): Promise<unknown> },
  documents: T[],
  options?: { timeoutMs?: number; pollMs?: number },
): Promise<{ symbol: { name: string; kind: number }; document: T }>;
