import { afterEach } from "vitest";

// Yield one macrotask turn after each test so synchronous test files (which
// otherwise transition between tests via microtasks only) allow the worker's
// event loop to drain IPC replies for Vitest's birpc `onTaskUpdate` calls.
afterEach(() => new Promise<void>((resolve) => setImmediate(resolve)));
