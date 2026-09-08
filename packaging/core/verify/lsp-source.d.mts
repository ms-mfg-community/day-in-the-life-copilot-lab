export function waitForSourceSymbol(
  rpc: { request(method: string, params: unknown): Promise<unknown> },
  uri: string,
  text: string,
  options?: { timeoutMs?: number; pollMs?: number },
): Promise<{ name: string; kind: number }>;
