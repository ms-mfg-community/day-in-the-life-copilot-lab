import { spawn } from 'node:child_process';

const REQUEST_TIMEOUT_MS = 60000;
const HEADER_END = '\r\n\r\n';

export class RpcProcess {
  constructor(command, args, { cwd, env, framed = false }) {
    this.framed = framed;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.sequence = 0;
    this.stderr = '';
    this.child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stderr.on('data', (chunk) => { this.stderr = (this.stderr + chunk).slice(-4000); });
    this.child.stdout.on('data', (chunk) => {
      try {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.consume();
      } catch (error) {
        this.fail(error);
      }
    });
    this.child.on('error', (error) => this.fail(error));
    this.child.on('exit', (code) => this.fail(new Error(`Local protocol process exited (${code}): ${this.stderr}`)));
  }

  fail(error) {
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }

  consume() {
    while (this.buffer.length) {
      const end = this.buffer.indexOf(this.framed ? HEADER_END : '\n');
      if (end < 0) return;
      const length = this.framed
        ? Number(this.buffer.subarray(0, end).toString().match(/Content-Length:\s*(\d+)/i)?.[1]) : end;
      if (!Number.isFinite(length)) throw new Error('Malformed LSP frame from local language server');
      const start = this.framed ? end + HEADER_END.length : 0;
      const consumed = this.framed ? start + length : end + 1;
      if (this.buffer.length < consumed) return;
      const body = this.buffer.subarray(start, start + length).toString('utf8').trim();
      this.buffer = this.buffer.subarray(consumed);
      if (body) this.receive(JSON.parse(body));
    }
  }

  receive(message) {
    if (message.method && message.id !== undefined) {
      if (message.method === 'workspace/configuration') {
        this.send({ jsonrpc: '2.0', id: message.id, result: message.params.items.map(() => null) });
      } else if (['window/workDoneProgress/create', 'client/registerCapability', 'client/unregisterCapability'].includes(message.method)) {
        this.send({ jsonrpc: '2.0', id: message.id, result: null });
      } else {
        this.send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Unsupported readiness-client method' } });
      }
      return;
    }
    const request = this.pending.get(message.id);
    if (!request) return;
    this.pending.delete(message.id);
    if (message.error) request.reject(new Error(`Local protocol error: ${JSON.stringify(message.error)}`));
    else request.resolve(message.result);
  }

  send(message) {
    const body = JSON.stringify(message);
    const frame = this.framed ? `Content-Length: ${Buffer.byteLength(body)}${HEADER_END}${body}` : `${body}\n`;
    this.child.stdin.write(frame);
  }

  notify(method, params = {}) {
    this.send({ jsonrpc: '2.0', method, params });
  }

  request(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Local protocol timeout: ${method}. ${this.stderr}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  async close() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    const exited = new Promise((resolve) => this.child.once('exit', resolve));
    this.child.kill('SIGTERM');
    const timer = setTimeout(() => this.child.kill('SIGKILL'), 3000);
    try { await exited; } finally { clearTimeout(timer); }
  }
}
