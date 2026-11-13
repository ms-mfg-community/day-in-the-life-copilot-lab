/**
 * Three Surfaces contract — the mechanical definition of done for
 * `specs/labs/three-surfaces.md` (Phase 5, "3-Surface UX Facelift").
 *
 * The labs ask a learner to type into three different places: the OS shell, an
 * interactive `copilot>` session, and VS Code. The facelift makes every step say
 * which one, adds a legend that teaches the three, keeps file-creation steps
 * editor-first (with the shell heredoc folded away), and adds seven annotated SVG
 * captures. Each describe block below maps to one numbered acceptance criterion.
 *
 * Nothing here pins pacing, a CLI version, or the exact prose of a step.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const LABS = join(ROOT, 'labs');
const DOCS = join(ROOT, 'docs');
const IMAGE_DIR = join(DOCS, 'images', 'labs');
const SPEC = join(ROOT, 'specs', 'labs', 'three-surfaces.md');

const rel = (p: string): string => relative(ROOT, p).split('\\').join('/');
const read = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function walkMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkMarkdown(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The lab set this contract governs
// ---------------------------------------------------------------------------
const LAB_NAMES = [
  'setup',
  ...Array.from({ length: 20 }, (_, i) => `lab${String(i + 1).padStart(2, '0')}`),
  'lab-hardening',
  'lab-copilot-cli-extensions',
  'lab-gh-extensions',
];
const labFile = (name: string): string => join(LABS, `${name}.md`);
const ALL_LAB_MARKDOWN = walkMarkdown(LABS); // labs/*.md and labs/appendices/**
const MAIN_LAB_MARKDOWN = ALL_LAB_MARKDOWN.filter((f) => dirname(f) === LABS);

const BADGE = { shell: '\u{1F41A}', cli: '\u{1F916}', vscode: '\u{1F4A0}' } as const; // 🐚 🤖 💠
const ANY_SURFACE = /[\u{1F41A}\u{1F916}\u{1F4A0}]/u;
const SHELL_FENCE = /^(?:bash|sh|shell|zsh|powershell|pwsh|console|cmd)\b/i;

// ---------------------------------------------------------------------------
// Markdown helpers: fence-aware blocks, sections, paragraphs
// ---------------------------------------------------------------------------
interface Block {
  kind: 'text' | 'fence';
  line: number;
  text: string;
  info: string;
}

/** CommonMark-style fences: a fence closes only on the same character, at least as long. */
function parseBlocks(md: string): { blocks: Block[]; unterminatedAt: number | null } {
  const blocks: Block[] = [];
  let open: { ch: string; len: number; start: number; info: string; body: string[] } | null = null;
  md.split('\n').forEach((text, idx) => {
    const line = idx + 1;
    if (open) {
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(text);
      if (close && close[1][0] === open.ch && close[1].length >= open.len) {
        blocks.push({ kind: 'fence', line: open.start, text: open.body.join('\n'), info: open.info });
        open = null;
      } else {
        open.body.push(text);
      }
      return;
    }
    const start = /^\s*(`{3,}|~{3,})\s*([^`]*)$/.exec(text);
    if (start) {
      open = { ch: start[1][0], len: start[1].length, start: line, info: start[2].trim(), body: [] };
      return;
    }
    blocks.push({ kind: 'text', line, text, info: '' });
  });
  const unterminatedAt = open ? (open as { start: number }).start : null;
  return { blocks, unterminatedAt };
}

interface Section {
  heading: string;
  line: number;
  blocks: Block[];
}

/** Splits at `##` and `###` headings that are outside fences. */
function sectionsOf(md: string, maxLevel = 3): Section[] {
  const out: Section[] = [{ heading: '(top)', line: 1, blocks: [] }];
  for (const block of parseBlocks(md).blocks) {
    if (block.kind === 'text') {
      const m = /^(#{2,6})\s+(.*)$/.exec(block.text);
      if (m && m[1].length <= maxLevel) {
        out.push({ heading: m[2], line: block.line, blocks: [] });
        continue;
      }
    }
    out[out.length - 1].blocks.push(block);
  }
  return out;
}

const sectionHasSurfaceMarker = (s: Section): boolean =>
  s.blocks.some((b) => b.kind === 'text' && ANY_SURFACE.test(b.text));

/** Runs of consecutive prose lines, with blockquote markers removed and whitespace collapsed. */
function paragraphsOf(md: string): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = [];
  let current: string[] = [];
  let startLine = 0;
  const flush = (): void => {
    if (current.length) out.push({ line: startLine, text: current.join(' ').replace(/\s+/g, ' ').trim() });
    current = [];
  };
  for (const block of parseBlocks(md).blocks) {
    if (block.kind === 'fence') {
      flush();
      continue;
    }
    const stripped = block.text.replace(/^\s*(?:>\s?)+/, '');
    if (stripped.trim() === '') {
      flush();
      continue;
    }
    if (!current.length) startLine = block.line;
    current.push(stripped);
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------
// A strict, small XML well-formedness parser (no XML library ships with the repo)
// ---------------------------------------------------------------------------
interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
  line: number;
}

const NAME_START = /^<([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)/;
const CLOSE_TAG = /^<\/([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)\s*>/;
const WS = /\s*/y;
const ATTR = /([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/y;
const ENTITY = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9A-Fa-f]+);/y;
// XML 1.0 forbids C0 control characters other than tab, newline and carriage return.
// eslint-disable-next-line no-control-regex
const ILLEGAL_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/** Parses one XML document, throwing a descriptive Error on the first well-formedness problem. */
function parseXml(source: string): XNode {
  const s = source.replace(/^\uFEFF/, '');
  const n = s.length;
  const lineAt = (pos: number): number => s.slice(0, pos).split('\n').length;
  const fail = (message: string, pos: number): never => {
    throw new Error(`${message} (line ${lineAt(pos)})`);
  };
  const checkEntities = (text: string, base: number): void => {
    for (let at = text.indexOf('&'); at !== -1; at = text.indexOf('&', at + 1)) {
      ENTITY.lastIndex = at;
      if (!ENTITY.exec(text)) fail(`bad entity reference near "${text.slice(at, at + 12)}"`, base + at);
    }
  };

  const bad = ILLEGAL_CHAR.exec(s);
  if (bad) fail(`illegal control character U+${bad[0].charCodeAt(0).toString(16).padStart(4, '0')}`, bad.index);

  const stack: XNode[] = [];
  let root: XNode | undefined;
  let i = 0;
  if (s.startsWith('<?xml')) {
    const end = s.indexOf('?>');
    if (end < 0) fail('unterminated XML declaration', 0);
    i = end + 2;
  }

  while (i < n) {
    const lt = s.indexOf('<', i);
    const text = s.slice(i, lt < 0 ? n : lt);
    if (text.length > 0) {
      if (stack.length === 0 && text.trim() !== '') fail('text outside the root element', i);
      if (text.includes(']]>')) fail('"]]>" in text content', i);
      checkEntities(text, i);
      if (stack.length > 0) stack[stack.length - 1].text += text;
    }
    if (lt < 0) break;
    i = lt;

    if (s.startsWith('<!--', i)) {
      const end = s.indexOf('-->', i + 4);
      if (end < 0) fail('unterminated comment', i);
      const body = s.slice(i + 4, end);
      if (body.includes('--') || body.endsWith('-')) fail('"--" is not allowed inside a comment', i);
      i = end + 3;
      continue;
    }
    if (s.startsWith('<![CDATA[', i)) {
      if (stack.length === 0) fail('CDATA outside the root element', i);
      const end = s.indexOf(']]>', i + 9);
      if (end < 0) fail('unterminated CDATA section', i);
      stack[stack.length - 1].text += s.slice(i + 9, end);
      i = end + 3;
      continue;
    }
    if (s.startsWith('<?', i)) {
      const end = s.indexOf('?>', i + 2);
      if (end < 0) fail('unterminated processing instruction', i);
      i = end + 2;
      continue;
    }
    if (s.startsWith('<!', i)) fail('DOCTYPE and other <! declarations are not allowed in these SVGs', i);

    if (s.startsWith('</', i)) {
      const m = CLOSE_TAG.exec(s.slice(i, i + 256));
      if (!m) fail('malformed closing tag', i);
      const closing = m as RegExpExecArray;
      const opened = stack.pop();
      if (!opened) fail(`closing tag </${closing[1]}> with nothing open`, i);
      if ((opened as XNode).name !== closing[1]) {
        fail(`closing tag </${closing[1]}> does not match <${(opened as XNode).name}>`, i);
      }
      i += closing[0].length;
      continue;
    }

    const nameMatch = NAME_START.exec(s.slice(i, i + 256));
    if (!nameMatch) fail('"<" that does not start a tag', i);
    const node: XNode = { name: (nameMatch as RegExpExecArray)[1], attrs: {}, children: [], text: '', line: lineAt(i) };
    let j = i + (nameMatch as RegExpExecArray)[0].length;
    let selfClosing = false;
    for (;;) {
      WS.lastIndex = j;
      const wsLen = (WS.exec(s) as RegExpExecArray)[0].length;
      const at = j + wsLen;
      if (s.startsWith('/>', at)) {
        selfClosing = true;
        j = at + 2;
        break;
      }
      if (s[at] === '>') {
        j = at + 1;
        break;
      }
      if (at >= n) fail(`unterminated start tag <${node.name}>`, i);
      if (wsLen === 0) fail(`missing whitespace before an attribute of <${node.name}>`, at);
      ATTR.lastIndex = at;
      const am = ATTR.exec(s);
      if (!am) fail(`malformed attribute in <${node.name}>`, at);
      const [whole, attrName, dq, sq] = am as RegExpExecArray;
      const value = dq ?? sq;
      if (Object.prototype.hasOwnProperty.call(node.attrs, attrName)) {
        fail(`duplicate attribute "${attrName}" on <${node.name}>`, at);
      }
      checkEntities(value, at);
      node.attrs[attrName] = value;
      j = at + whole.length;
    }

    if (stack.length === 0) {
      if (root) fail('more than one root element', i);
      root = node;
    } else {
      stack[stack.length - 1].children.push(node);
    }
    if (!selfClosing) stack.push(node);
    i = j;
  }

  if (stack.length > 0) fail(`unclosed element <${stack[stack.length - 1].name}>`, n);
  if (!root) fail('no root element', 0);

  // Every namespace prefix in use must be declared somewhere in the document.
  const declared = new Set<string>(['xml', 'xmlns']);
  const used = new Set<string>();
  const visit = (node: XNode): void => {
    if (node.name.includes(':')) used.add(node.name.split(':')[0]);
    for (const attr of Object.keys(node.attrs)) {
      if (attr.startsWith('xmlns:')) declared.add(attr.slice(6));
      else if (attr.includes(':')) used.add(attr.split(':')[0]);
    }
    node.children.forEach(visit);
  };
  visit(root as XNode);
  for (const prefix of used) {
    if (!declared.has(prefix)) throw new Error(`undeclared namespace prefix "${prefix}:"`);
  }
  return root as XNode;
}

function* walkNodes(node: XNode): Generator<XNode> {
  yield node;
  for (const child of node.children) yield* walkNodes(child);
}

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9A-Fa-f]+);/g, (_m, e: string) => {
    switch (e) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    }
  });
}

/** Visible and accessible text of the SVG (not the CSS), one entry per element. */
function svgText(root: XNode): string {
  const parts: string[] = [];
  for (const node of walkNodes(root)) {
    if (node.name === 'style') continue;
    const t = decodeEntities(node.text).replace(/\s+/g, ' ').trim();
    if (t) parts.push(t);
  }
  return parts.join(' | ');
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((k) => {
    const c = parseInt(hex.slice(k, k + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ---------------------------------------------------------------------------
// Image links
// ---------------------------------------------------------------------------
interface ImageRef {
  file: string;
  line: number;
  alt: string;
  url: string;
  syntax: 'markdown' | 'html';
}

const MD_IMAGE = /!\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const MD_REFERENCE_IMAGE = /!\[[^\]]*\]\[[^\]]*\]/;
const HTML_IMAGE = /<img\b[^>]*>/gi;

function imagesInText(md: string, file: string): { refs: ImageRef[]; referenceStyle: number[] } {
  const refs: ImageRef[] = [];
  const referenceStyle: number[] = [];
  for (const block of parseBlocks(md).blocks) {
    if (block.kind !== 'text') continue;
    const line = block.text.replace(/`[^`]*`/g, '');
    if (MD_REFERENCE_IMAGE.test(line)) referenceStyle.push(block.line);
    for (const m of line.matchAll(MD_IMAGE)) {
      refs.push({ file, line: block.line, alt: m[1], url: m[2].replace(/^<|>$/g, ''), syntax: 'markdown' });
    }
    for (const m of line.matchAll(HTML_IMAGE)) {
      const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[0]);
      const alt = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[0]);
      refs.push({
        file,
        line: block.line,
        alt: alt ? (alt[1] ?? alt[2] ?? '') : '',
        url: src ? (src[1] ?? src[2] ?? '') : '',
        syntax: 'html',
      });
    }
  }
  return { refs, referenceStyle };
}

const imagesIn = (file: string): { refs: ImageRef[]; referenceStyle: number[] } => imagesInText(read(file), file);

const isExternal = (url: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(url);
const targetOf = (ref: ImageRef): string =>
  resolve(dirname(ref.file), decodeURI(ref.url.split('#')[0].split('?')[0]));

/** Alt text must say what the picture shows: a sentence, not a file name or a one-word label. */
const hasWeakAlt = (ref: ImageRef): boolean =>
  ref.alt.trim().length < 20 || !/\s/.test(ref.alt.trim()) || /\.(?:svg|png|jpe?g|gif)\b/i.test(ref.alt);

/** One line per local image whose target is missing or empty. */
function unresolvedImages(refs: ImageRef[]): string[] {
  return refs
    .filter((r) => !isExternal(r.url))
    .flatMap((r) => {
      const target = targetOf(r);
      if (!existsSync(target)) return [`${rel(r.file)}:${r.line} -> ${r.url} (missing: ${rel(target)})`];
      if (!statSync(target).isFile() || statSync(target).size === 0) return [`${rel(r.file)}:${r.line} -> ${r.url} (empty)`];
      return [];
    });
}

// ---------------------------------------------------------------------------
// The seven SVGs and where each one must be embedded
// ---------------------------------------------------------------------------
const SVG_NAMES = [
  'three-surfaces-guide',
  'vscode-customizations-and-hooks',
  'vscode-agent-debug-logs',
  'vscode-chat-debug-view',
  'cli-env-context-diagnose',
  'hooks-lifecycle-15-events',
  'otel-span-tree',
].map((n) => `${n}.svg`);
const svgPath = (name: string): string => join(IMAGE_DIR, name);

const EMBEDDED_IN: Record<string, string[]> = {
  'three-surfaces-guide.svg': ['labs/setup.md', 'labs/lab01.md'],
  'vscode-customizations-and-hooks.svg': ['labs/lab01.md', 'labs/lab06.md'],
  'vscode-agent-debug-logs.svg': ['labs/lab06.md', 'labs/lab07.md', 'docs/debugging-and-observability.md'],
  'vscode-chat-debug-view.svg': ['labs/lab02.md', 'docs/debugging-and-observability.md'],
  'cli-env-context-diagnose.svg': ['labs/lab01.md', 'labs/lab04.md', 'labs/lab06.md'],
  'hooks-lifecycle-15-events.svg': ['labs/lab06.md', 'docs/copilot-config-reference.md'],
  'otel-span-tree.svg': ['labs/lab06.md', 'docs/debugging-and-observability.md'],
};

/** Text each diagram must carry, so a caption in a lab cannot promise what the picture lacks. */
const REQUIRED_LABELS: Record<string, string[]> = {
  'three-surfaces-guide.svg': [
    'OS Terminal',
    'Copilot CLI',
    'VS Code',
    'PS>',
    'copilot>',
    '/agent',
    '/skills',
    '/instructions',
    '/env',
    '/diagnose',
    'Chat: Open Customizations',
    'Show Agent Debug Logs',
    'Show Chat Debug View',
    BADGE.shell,
    BADGE.cli,
    BADGE.vscode,
  ],
  'vscode-customizations-and-hooks.svg': [
    'Chat: Open Customizations',
    'Instructions',
    'Skills',
    'Agents',
    'MCP Servers',
    'Hooks',
    '/hooks',
  ],
  'vscode-agent-debug-logs.svg': [
    'Show Agent Debug Logs',
    'Load Instructions',
    'Load Agents',
    'Load Hooks',
    'Load Skills',
    'Summary view',
    'Agent Flow Chart',
    'Cache Explorer',
    '#debugEventsSnapshot',
    'sparkle',
  ],
  'vscode-chat-debug-view.svg': [
    'Show Chat Debug View',
    'System prompt',
    'User prompt',
    'Context',
    'Response',
    'Tool responses',
  ],
  'cli-env-context-diagnose.svg': [
    '/env',
    '/instructions',
    '/context',
    '/diagnose',
    'System Prompt',
    'Custom Instructions',
    'System Tools',
    'MCP Tools',
    'Messages',
    'Free Space',
    'Buffer',
  ],
  'hooks-lifecycle-15-events.svg': ['Session', 'Subagent', 'Tool execution', 'Turn and prompt', 'stdin', 'stdout', 'HTTP'],
  'otel-span-tree.svg': [
    'invoke_agent',
    'chat',
    'execute_tool task',
    'invoke_agent explore',
    'github.copilot.hook.start',
    'github.copilot.hook.end',
  ],
};

const HOOK_EVENTS_BY_GROUP: Record<string, string[]> = {
  Session: ['sessionStart', 'preCompact', 'notification', 'errorOccurred', 'sessionEnd'],
  'Turn and prompt': ['userPromptSubmitted', 'userPromptTransformed', 'agentStop'],
  Subagent: ['subagentStart', 'subagentStop'],
  'Tool execution': ['permissionRequest', 'preToolUse', 'preMcpToolCall', 'postToolUse', 'postToolUseFailure'],
};

// ===========================================================================
describe('three-surfaces contract: the spec exists and governs', () => {
  it('specs/labs/three-surfaces.md exists', () => {
    expect(existsSync(SPEC), `expected a cross-lab spec at ${rel(SPEC)}`).toBe(true);
  });

  it('the lab set this contract governs is exactly labs/*.md', () => {
    const onDisk = MAIN_LAB_MARKDOWN.map((f) => rel(f)).sort();
    const expected = LAB_NAMES.map((n) => rel(labFile(n))).sort();
    expect(onDisk, 'a lab was added or removed; add it to LAB_NAMES so it is held to this contract').toEqual(expected);
  });
});

// ===========================================================================
describe('three-surfaces AC2 — no ambiguous terminal header remains', () => {
  const COMPUTER = /\u{1F5A5}/u; // the old "🖥️" header glyph
  const AMBIGUOUS_HEADER = /\*\*[^*\n]*\bin (?:your|a) terminal\b[^*\n]*:\*\*/i;

  it('no labs file (including the track appendices) contains the 🖥️ glyph', () => {
    const offenders = ALL_LAB_MARKDOWN.flatMap((f) =>
      read(f)
        .split('\n')
        .map((text, i) => ({ f, i, text }))
        .filter((l) => COMPUTER.test(l.text))
        .map((l) => `${rel(l.f)}:${l.i + 1}`),
    );
    expect(offenders, `replace each 🖥️ with 🐚, 🤖 or 💠:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no bold "In your terminal:" header remains; headers name OS Terminal, Copilot CLI or VS Code', () => {
    const offenders = ALL_LAB_MARKDOWN.flatMap((f) =>
      read(f)
        .split('\n')
        .map((text, i) => ({ f, i, text }))
        .filter((l) => AMBIGUOUS_HEADER.test(l.text))
        .map((l) => `${rel(l.f)}:${l.i + 1}: ${l.text.trim().slice(0, 80)}`),
    );
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('the detectors are live: they flag the old header and accept the new ones', () => {
    expect(COMPUTER.test('\u{1F5A5}\uFE0F **In your terminal:**')).toBe(true);
    expect(AMBIGUOUS_HEADER.test('**In your terminal:**')).toBe(true);
    expect(AMBIGUOUS_HEADER.test('**Before you start — preflight, in your terminal:**')).toBe(true);
    expect(AMBIGUOUS_HEADER.test('**In your OS Terminal:**')).toBe(false);
    expect(AMBIGUOUS_HEADER.test('**Advanced-tier lab — Copilot CLI, in a terminal.**')).toBe(false);
  });
});

// ===========================================================================
describe('three-surfaces AC3 — the legend is up front in Setup and Lab 01', () => {
  const CANONICAL_BADGES = [
    '\u{1F41A} **In your OS Terminal (Bash / PowerShell)**',
    '\u{1F916} **In Copilot CLI (`copilot>` session)**',
    '\u{1F4A0} **In VS Code (Editor & Copilot Chat)**',
  ];
  const LEGEND_FACTS = [
    '`$` in Bash',
    '`PS>` in PowerShell',
    '`dotnet`',
    '`git`',
    '`gh`',
    '`copilot --version`',
    '`/agent`',
    '`/skills`',
    '`/instructions`',
    '`/env`',
    '`/diagnose`',
    '`Chat: Open Customizations`',
    '`Show Agent Debug Logs`',
    '`Show Chat Debug View`',
    '`.github/`',
  ];

  const legendOf = (name: string): { md: string; section: Section } => {
    const md = read(labFile(name));
    const section = sectionsOf(md).find((s) => /^The Three Surfaces Legend\b/.test(s.heading));
    expect(section, `${name}.md has no "## The Three Surfaces Legend" section`).toBeDefined();
    return { md, section: section as Section };
  };
  const bodyOf = (s: Section): string => s.blocks.map((b) => b.text).join('\n');

  it.each(['setup', 'lab01'])('%s.md carries the three canonical badges, verbatim', (name) => {
    const body = bodyOf(legendOf(name).section);
    for (const badge of CANONICAL_BADGES) expect(body, `${name}.md legend is missing ${badge}`).toContain(badge);
  });

  it.each(['setup', 'lab01'])('%s.md legend says what belongs on each surface', (name) => {
    const body = bodyOf(legendOf(name).section);
    for (const fact of LEGEND_FACTS) expect(body, `${name}.md legend does not mention ${fact}`).toContain(fact);
  });

  it.each(['setup', 'lab01'])('%s.md legend embeds the three-surfaces-guide image', (name) => {
    const { section } = legendOf(name);
    const body = bodyOf(section);
    expect(body).toMatch(/!\[[^\]]{20,}\]\(\.\.\/docs\/images\/labs\/three-surfaces-guide\.svg\)/);
  });

  it('lab01 introduces the legend before the first numbered section', () => {
    const md = read(labFile('lab01'));
    const legend = md.search(/^## The Three Surfaces Legend\b/m);
    const first = md.search(/^## 1\.\d/m);
    expect(legend, 'legend heading not found').toBeGreaterThan(-1);
    expect(first, 'numbered sections not found').toBeGreaterThan(-1);
    expect(legend).toBeLessThan(first);
  });

  it('the legend explains that the badge names what you type into, not the window', () => {
    for (const name of ['setup', 'lab01']) {
      expect(bodyOf(legendOf(name).section), name).toMatch(/integrated terminal is still a .{0,4}OS Terminal/);
    }
  });
});

// ===========================================================================
describe('three-surfaces AC4 — every lab names the surface at each step', () => {
  it.each(LAB_NAMES)('%s.md uses at least one explicit surface marker (🐚, 🤖 or 💠)', (name) => {
    expect(ANY_SURFACE.test(read(labFile(name))), `${name}.md has no 🐚, 🤖 or 💠 marker`).toBe(true);
  });

  it('no lab or appendix has an unterminated code fence', () => {
    const offenders = ALL_LAB_MARKDOWN.flatMap((f) => {
      const { unterminatedAt } = parseBlocks(read(f));
      return unterminatedAt === null ? [] : [`${rel(f)}:${unterminatedAt}`];
    });
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('every ##/### section that holds a shell block carries a surface marker', () => {
    const offenders: string[] = [];
    for (const f of ALL_LAB_MARKDOWN) {
      for (const section of sectionsOf(read(f))) {
        const hasShell = section.blocks.some((b) => b.kind === 'fence' && SHELL_FENCE.test(b.info));
        if (hasShell && !sectionHasSurfaceMarker(section)) {
          offenders.push(`${rel(f)}:${section.line} "${section.heading.slice(0, 60)}"`);
        }
      }
    }
    expect(
      offenders,
      `these sections run shell commands but never say where to type them (add 🐚 **In your OS Terminal**):\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('the section check is live: a shell block with no badge is flagged, with one it is not', () => {
    const bare = '## 1.1 Try it\n\n```bash\nls\n```\n';
    const badged = '## 1.1 Try it\n\n\u{1F41A} **In your OS Terminal:**\n\n```bash\nls\n```\n';
    const flagged = (md: string): boolean =>
      sectionsOf(md).some(
        (s) => s.blocks.some((b) => b.kind === 'fence' && SHELL_FENCE.test(b.info)) && !sectionHasSurfaceMarker(s),
      );
    expect(flagged(bare)).toBe(true);
    expect(flagged(badged)).toBe(false);
  });

  // -- A Copilot prompt is never left under a 🐚 badge -----------------------------------------
  //
  // The section check above stops at "this section has *a* badge". A section can hold one 🐚 step and,
  // a few paragraphs later, a prompt meant for `copilot>` that says nothing, so the learner pastes it
  // into the shell (`I: command not found`). Lab 10 §10.3a, §10.3b, §10.5a and §10.5b did exactly that.
  // The rule below follows the cursor instead: the surface in force at a prompt is the last
  // 🐚 / 🤖 / 💠 / 💬 above it, and it must not be 🐚 (or nothing at all).
  type Surface = 'shell' | 'cli' | 'vscode' | 'discuss' | 'none';
  const SURFACE_OF: Record<string, Surface> = {
    [BADGE.shell]: 'shell',
    [BADGE.cli]: 'cli',
    [BADGE.vscode]: 'vscode',
    '\u{1F4AC}': 'discuss', // 💬 a question to answer aloud: nothing is typed anywhere
  };
  // 🌐 is deliberately absent: "open this page in your browser" does not move the cursor.
  const CURSOR_MARKER = /[\u{1F41A}\u{1F916}\u{1F4A0}\u{1F4AC}]/gu;
  const DIAGRAM = /[\u2190-\u21FF\u2500-\u257F\u25A0-\u25FF]/; // arrows, box drawing, geometric shapes

  /** The first paragraph of a fence body as one line, with `> ` quote markers removed. */
  const firstParagraph = (body: string): string => {
    const lines: string[] = [];
    for (const raw of body.split('\n')) {
      if (raw.trim() === '') {
        if (lines.length) break;
        continue;
      }
      lines.push(raw.replace(/^\s*>\s?/, '').trim());
    }
    return lines.join(' ');
  };

  /**
   * Copilot input: a slash command (`/consolidate-lessons --dry-run`) or a plain-English request (a capitalised word
   * and at least three more). A path, a command line, tool-call pseudo-code, sample output and a diagram are not.
   */
  const looksLikeCopilotPrompt = (body: string): boolean => {
    const text = firstParagraph(body);
    if (DIAGRAM.test(text)) return false;
    return /^\/[a-z][\w-]*(?:\s|$)/.test(text) || /^[A-Z][A-Za-z'\u2019-]*(?: \S+){3,}/.test(text);
  };

  /** Every Copilot prompt in a blank or `text` fence, with the surface in force where it sits. */
  function copilotPrompts(md: string): Array<{ line: number; surface: Surface; text: string }> {
    const out: Array<{ line: number; surface: Surface; text: string }> = [];
    let surface: Surface = 'none';
    const outside: Surface[] = []; // what to return to when a <details> fold closes
    for (const block of parseBlocks(md).blocks) {
      if (block.kind === 'text') {
        if (/<details\b/i.test(block.text)) outside.push(surface);
        const marks = [...block.text.matchAll(CURSOR_MARKER)];
        if (marks.length) surface = SURFACE_OF[marks[marks.length - 1][0]]; // "🐚 run it, then 🤖 type": the last one wins
        if (/<\/details>/i.test(block.text)) surface = outside.pop() ?? surface;
        continue;
      }
      if (/^(?:text|txt|plaintext)?$/i.test(block.info) && looksLikeCopilotPrompt(block.text)) {
        out.push({ line: block.line, surface, text: firstParagraph(block.text) });
      }
    }
    return out;
  }

  it('no Copilot prompt is left under a 🐚 badge, or under no badge at all: 🤖 or 💠 introduces it', () => {
    const offenders: string[] = [];
    let seen = 0;
    for (const f of ALL_LAB_MARKDOWN) {
      for (const p of copilotPrompts(read(f))) {
        seen++;
        if (p.surface === 'shell' || p.surface === 'none') {
          const where = p.surface === 'shell' ? 'follows a 🐚 step' : 'has no surface badge above it';
          offenders.push(`${rel(f)}:${p.line} ${where}: ${p.text.slice(0, 70)}`);
        }
      }
    }
    expect(seen, 'no prompts found: the detector is broken, or the labs lost their prompts').toBeGreaterThan(30);
    expect(
      offenders,
      'a learner pastes these into the OS shell. Put a 🤖 **In Copilot CLI (`copilot>`):** line (or 💠 **In VS Code:** ' +
        'for the Chat box) between the 🐚 step and the prompt, and under 🐚 say to start `copilot` if no session is ' +
        'open yet. Sample output that reads like a sentence is not a prompt: give its fence an info string such as ' +
        `\`console\`.\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('the prompt check is live: a prompt under 🐚 is flagged; its own 🤖, 💠 or 💬 clears it; a 🌐 aside does not', () => {
    const shellStep = '\u{1F41A} **In your OS Terminal:**\n\n```bash\nls\n```\n\n';
    const prompt = '```\nWhat have we learned about verifying .NET changes in this repo?\n```\n';
    const under = (before: string): Surface[] => copilotPrompts(before + prompt).map((p) => p.surface);

    expect(under('')).toEqual(['none']);
    expect(under(shellStep)).toEqual(['shell']);
    expect(under(`${shellStep}Ask the agent to record it:\n\n`)).toEqual(['shell']); // prose alone moves nothing
    expect(under(`${shellStep}> \u{1F310} **Open the page in a browser.**\n\n`)).toEqual(['shell']); // §10.5b's shape
    expect(under(`${shellStep}\u{1F916} **In Copilot CLI (\`copilot>\`):**\n\n`)).toEqual(['cli']);
    expect(under(`${shellStep}\u{1F4A0} **In VS Code:** ask in the Chat box.\n\n`)).toEqual(['vscode']);
    expect(under(`${shellStep}\u{1F4AC} **Discuss:**\n\n`)).toEqual(['discuss']);
    expect(under('\u{1F916} **In Copilot CLI:**\n\n> \u{1F310} **A page.**\n\n')).toEqual(['cli']); // the aside does not hand it back
    expect(under('\u{1F41A} **In your OS Terminal**, run `copilot`, then \u{1F916} **in Copilot CLI** type:\n\n')).toEqual(['cli']);
    expect(under('\u{1F916} **In Copilot CLI:** `/exit`, then back in your \u{1F41A} **OS Terminal**:\n\n')).toEqual(['shell']);

    // A folded shell alternative labels only its own fold: after </details> the editor step is back in force.
    const fold =
      '<details>\n<summary>\u{1F41A} Shell alternative (Bash / PowerShell heredoc)</summary>\n\n```bash\nls\n```\n\n';
    expect(under(`\u{1F4A0} **In VS Code:** create it.\n\n${fold}</details>\n\n`)).toEqual(['vscode']);
    expect(under(`\u{1F4A0} **In VS Code:** create it.\n\n${fold}`)).toEqual(['shell']); // still inside the fold

    // Only blank and text fences hold prompts; a shell fence is a command, and a markdown fence is file content.
    expect(copilotPrompts(`${shellStep}\`\`\`markdown\nWhat have we learned about verifying .NET changes?\n\`\`\`\n`)).toEqual([]);
    expect(copilotPrompts(`${shellStep}\`\`\`text\n/consolidate-lessons --scope project\n\`\`\`\n`)).toHaveLength(1);
    expect(copilotPrompts(`${shellStep}\`\`\`text\n/consolidate-lessons --scope project\n\`\`\`\n`)[0].surface).toBe('shell');
  });

  it('a prompt is recognised by its shape: a slash command or a plain-English request, not a path, command, output or diagram', () => {
    const prompts = [
      '/consolidate-lessons --dry-run --scope project\nDo not write any files.',
      '/memory',
      'What have we learned about verifying .NET changes in this repo? Check\n.copilot/lessons/ before answering.',
      'Append to .github/instructions/dotnet.instructions.md:\n"Every new repository class must have a test."',
      "> List the lakehouses in my Fabric workspace, showing each lakehouse's\n  name and ID.",
    ];
    const notPrompts = [
      'copilot',
      'copilot -p "/consolidate-lessons --scope project" --allow-all-tools',
      '.github/extensions/clab-summarize/extension.mjs',
      'node/.a2a/handoff.md',
      '/usr/local/bin/copilot',
      '[pre-commit] gh clab summary written to .git/CLAB_SUMMARY.md',
      'extensions_manage({ operation: "list" })',
      'MAX_TURNS = 4',
      'Layer 1                Layer 2 · Recall (advisory)                  Layer 3',
      'User Request\n    │\n    ▼\nlab-orchestrator (coordinates)',
      'Main session → task(name="implementer", agent_type="general-purpose")',
      '---\nname: lab-orchestrator\n---',
    ];
    for (const body of prompts) expect(looksLikeCopilotPrompt(body), `should be a prompt: ${body}`).toBe(true);
    for (const body of notPrompts) expect(looksLikeCopilotPrompt(body), `should not be a prompt: ${body}`).toBe(false);
  });

  it('Lab 10: §10.3a, §10.3b, §10.5a and §10.5b each carry a 🤖 badge of their own above their prompt, and §10.3a starts copilot', () => {
    const md = read(labFile('lab10'));
    const lines = md.split('\n');
    const all = sectionsOf(md);
    const sectionMarkdown = (id: string): string => {
      const i = all.findIndex((s) => s.heading.startsWith(`${id} `));
      expect(i, `lab10.md has no section ${id}`).toBeGreaterThan(-1);
      return lines.slice(all[i].line - 1, all[i + 1] ? all[i + 1].line - 1 : undefined).join('\n');
    };

    // The cursor check above lets a later prompt inherit an earlier 🤖 (§10.5b follows §10.5a), which is right for a
    // session that carries on. These four sections are independent steps a learner can start from, so each one,
    // read on its own, must already say where its prompt is typed.
    for (const id of ['10.3a', '10.3b', '10.5a', '10.5b']) {
      const prompts = copilotPrompts(sectionMarkdown(id));
      expect(prompts.length, `lab10.md §${id} holds no Copilot prompt: the detector or the section changed`).toBeGreaterThan(0);
      for (const p of prompts) {
        expect(
          p.surface,
          `lab10.md §${id}: the prompt "${p.text.slice(0, 50)}" needs a 🤖 **In Copilot CLI (\`copilot>\`)** line of its own, in this section`,
        ).toBe('cli');
      }
    }

    // §10.3a follows a shell step with no session open yet, so it must say how to start one before the 🤖 line.
    const paragraphs = paragraphsOf(sectionMarkdown('10.3a'));
    const launch = paragraphs.findIndex((p) => p.text.includes(BADGE.shell) && p.text.includes('`copilot`'));
    const cli = paragraphs.findIndex((p) => p.text.includes(BADGE.cli));
    expect(launch, '§10.3a never tells the learner, under 🐚 **In your OS Terminal**, to start `copilot`').toBeGreaterThan(-1);
    expect(cli, '§10.3a has no 🤖 line after the launch').toBeGreaterThan(launch);
  });
});

// ===========================================================================
describe('three-surfaces AC5 — a badge always names its surface', () => {
  const NAMES: Array<[string, RegExp, string]> = [
    [BADGE.shell, /OS Terminal/i, 'OS Terminal'],
    [BADGE.cli, /Copilot CLI|copilot>/i, 'Copilot CLI'],
    [BADGE.vscode, /VS Code/i, 'VS Code'],
  ];

  it('every paragraph that uses 🐚, 🤖 or 💠 also says OS Terminal, Copilot CLI or VS Code, respectively', () => {
    const offenders: string[] = [];
    for (const f of ALL_LAB_MARKDOWN) {
      for (const p of paragraphsOf(read(f))) {
        if (/<summary>/i.test(p.text)) continue; // "🐚 Shell alternative (Bash / PowerShell heredoc)"
        for (const [emoji, name, label] of NAMES) {
          if (p.text.includes(emoji) && !name.test(p.text)) {
            offenders.push(`${rel(f)}:${p.line} uses ${emoji} without saying "${label}": ${p.text.slice(0, 70)}`);
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('a wrapped badge still counts: blockquote markers and line breaks inside the name are ignored', () => {
    const md = '> \u{1F41A} **In your OS\n> Terminal**, run it.\n';
    const [p] = paragraphsOf(md);
    expect(p.text).toContain('OS Terminal');
  });
});

// ===========================================================================
describe('three-surfaces AC6 — Labs 01–07 are editor-first, with VS Code counterparts', () => {
  const EDITOR_FIRST_LABS = ['lab02', 'lab03', 'lab04', 'lab06', 'lab07'];
  const EDITOR_FIRST_FILES = ALL_LAB_MARKDOWN.filter((f) => {
    const base = f.split(/[\\/]/).pop() as string;
    return EDITOR_FIRST_LABS.includes(base.replace(/\.md$/, ''));
  });
  const FOLDED = '\u{1F41A} Shell alternative (Bash / PowerShell heredoc)';
  const WRITES_A_FILE =
    /<<-?\s*['"]?[A-Za-z_]\w*['"]?|@['"]\s*$|\b(?:Set-Content|Out-File|Add-Content)\b|\bcat\s*>/m;

  /** Every file-writing shell fence, with the summary of the <details> it sits in (if any). */
  function fileWritingFences(md: string): Array<{ line: number; folded: boolean; summary: string; preceded: boolean }> {
    const out: Array<{ line: number; folded: boolean; summary: string; preceded: boolean }> = [];
    const details: Array<{ summary: string; sawEditorStep: boolean }> = [];
    let sectionSawEditorStep = false;
    for (const block of parseBlocks(md).blocks) {
      if (block.kind === 'text') {
        if (/^#{2,4}\s/.test(block.text)) sectionSawEditorStep = false;
        if (block.text.includes(BADGE.vscode)) sectionSawEditorStep = true;
        if (/<details\b/i.test(block.text)) details.push({ summary: '', sawEditorStep: sectionSawEditorStep });
        const summary = /<summary>(.*?)<\/summary>/i.exec(block.text);
        if (summary && details.length) details[details.length - 1].summary = summary[1].replace(/<[^>]+>/g, '');
        if (/<\/details>/i.test(block.text)) details.pop();
        continue;
      }
      if (!(SHELL_FENCE.test(block.info) || block.info === '')) continue;
      if (!WRITES_A_FILE.test(block.text)) continue;
      const top = details[details.length - 1];
      out.push({
        line: block.line,
        folded: !!top && top.summary.includes(FOLDED),
        summary: top?.summary ?? '',
        preceded: !!top && top.sawEditorStep,
      });
    }
    return out;
  }

  it('the editor-first files are found', () => {
    expect(EDITOR_FIRST_FILES.length, 'expected labs 02/03/04/06/07 and their appendices').toBeGreaterThanOrEqual(10);
  });

  it('every heredoc / here-string / Set-Content block that writes a file is folded into the shell-alternative <details>', () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const f of EDITOR_FIRST_FILES) {
      for (const fence of fileWritingFences(read(f))) {
        checked++;
        if (!fence.folded) offenders.push(`${rel(f)}:${fence.line} (inside: "${fence.summary || 'no <details>'}")`);
      }
    }
    expect(checked, 'no file-writing blocks found: the detector is broken, or the folds were removed').toBeGreaterThan(10);
    expect(
      offenders,
      `wrap each in <details><summary>${FOLDED}</summary> and put the 💠 editor instruction first:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('a 💠 In VS Code editor instruction comes before each folded shell alternative in the same section', () => {
    const offenders: string[] = [];
    for (const f of EDITOR_FIRST_FILES) {
      for (const fence of fileWritingFences(read(f))) {
        if (fence.folded && !fence.preceded) offenders.push(`${rel(f)}:${fence.line}`);
      }
    }
    expect(offenders, `no 💠 step precedes these shell alternatives:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the fold detector is live: an unfolded heredoc and a folded one are told apart', () => {
    const unfolded = '\u{1F4A0} **In VS Code:** create it.\n\n```bash\ncat > .github/x.md <<\'EOF\'\nhi\nEOF\n```\n';
    const folded =
      '\u{1F4A0} **In VS Code:** create it.\n\n<details>\n<summary>' +
      FOLDED +
      '</summary>\n\n```bash\ncat > .github/x.md <<\'EOF\'\nhi\nEOF\n```\n\n</details>\n';
    expect(fileWritingFences(unfolded).map((f) => f.folded)).toEqual([false]);
    expect(fileWritingFences(folded).map((f) => [f.folded, f.preceded])).toEqual([[true, true]]);
    const noEditorStep = folded.replace(/^.*\n\n/, '');
    expect(fileWritingFences(noEditorStep).map((f) => [f.folded, f.preceded])).toEqual([[true, false]]);
  });

  const COUNTERPARTS: Array<[string, RegExp, string]> = [
    ['lab01', /\*\*Agent\*\* dropdown/, 'selects a custom agent from the Chat Agent dropdown'],
    ['lab01', /\*\*Chat: Open Customizations\*\*/, 'inspects customizations with Chat: Open Customizations'],
    ['lab02', /\*\*Chat: Open Customizations\*\*/, 'inspects customizations with Chat: Open Customizations'],
    ['lab02', /\*\*Show Chat Debug View\*\*/, 'opens the Chat Debug View'],
    ['lab03', /\*\*Agent\*\* dropdown/, 'selects a custom agent from the Chat Agent dropdown'],
    ['lab03', /\*\*Chat: Open Customizations\*\*/, 'inspects customizations with Chat: Open Customizations'],
    ['lab04', /type `\/`/i, 'types / to list skills'],
    ['lab04', /`\/create-dotnet-test`/, 'invokes a skill by /name'],
    ['lab04', /\*\*Chat: Open Customizations\*\*/, 'inspects customizations with Chat: Open Customizations'],
    ['lab05', /\*\*Chat: Open Customizations\*\*/, 'inspects customizations with Chat: Open Customizations'],
    ['lab05', /\*\*MCP Servers\*\*/, 'looks at the MCP Servers tab'],
    ['lab06', /\*\*Chat: Open Customizations\*\*/, 'inspects customizations with Chat: Open Customizations'],
    ['lab06', /\*\*Hooks\*\*/, 'looks at the Hooks tab'],
    ['lab06', /\*\*Show Agent Debug Logs\*\*/, 'opens the Agent Debug Logs'],
    ['lab07', /\*\*Agent\*\* dropdown/, 'selects a custom agent from the Chat Agent dropdown'],
    ['lab07', /\*\*Show Agent Debug Logs\*\*/, 'opens the Agent Debug Logs'],
  ];

  it.each(['lab01', 'lab02', 'lab03', 'lab04', 'lab05', 'lab06', 'lab07'])(
    '%s.md has a 💠 In VS Code counterpart',
    (name) => {
      const md = read(labFile(name));
      expect(md, `${name}.md has no "💠 **In VS Code" step`).toMatch(/\u{1F4A0} \*\*In VS Code/u);
    },
  );

  it.each(COUNTERPARTS)('%s.md %s', (name, pattern, description) => {
    const md = parseBlocks(read(labFile(name)))
      .blocks.filter((b) => b.kind === 'text')
      .map((b) => b.text)
      .join('\n');
    expect(md, `${name}.md never ${description}`).toMatch(pattern);
  });
});

// ===========================================================================
describe('three-surfaces AC7 — the seven SVG captures are valid, accessible and self-contained', () => {
  it('docs/images/labs holds exactly the seven SVGs', () => {
    expect(existsSync(IMAGE_DIR), `${rel(IMAGE_DIR)} does not exist`).toBe(true);
    expect(readdirSync(IMAGE_DIR).sort()).toEqual([...SVG_NAMES].sort());
  });

  describe.each(SVG_NAMES)('%s', (name) => {
    const file = svgPath(name);
    const raw = (): string => read(file);
    const root = (): XNode => parseXml(raw());

    it('exists, is not empty and stays small enough to review', () => {
      expect(existsSync(file), `${rel(file)} is missing`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(2000);
      expect(statSync(file).size, 'an SVG this large is probably an embedded raster').toBeLessThan(250 * 1024);
    });

    it('is well-formed XML', () => {
      expect(() => root()).not.toThrow();
    });

    it('declares the SVG namespace, a viewBox, role="img" and aria-labelledby', () => {
      const r = root();
      expect(r.name).toBe('svg');
      expect(r.attrs['xmlns']).toBe('http://www.w3.org/2000/svg');
      expect(r.attrs['role']).toBe('img');
      const box = (r.attrs['viewBox'] ?? '').trim().split(/\s+/).map(Number);
      expect(box, 'viewBox must be "minX minY width height"').toHaveLength(4);
      expect(box.every(Number.isFinite)).toBe(true);
      expect(box[2], 'viewBox width: wide enough that text stays legible when scaled to a page').toBeGreaterThanOrEqual(1200);
      expect(box[3]).toBeGreaterThan(0);
      expect((r.attrs['aria-labelledby'] ?? '').trim().length, 'aria-labelledby is missing').toBeGreaterThan(0);
    });

    it('has a <title> and a <desc> as direct children, named by aria-labelledby', () => {
      const r = root();
      const ids = (r.attrs['aria-labelledby'] ?? '').trim().split(/\s+/);
      const title = r.children.find((c) => c.name === 'title');
      const desc = r.children.find((c) => c.name === 'desc');
      expect(title, '<title> must be a direct child of <svg>').toBeDefined();
      expect(desc, '<desc> must be a direct child of <svg>').toBeDefined();
      expect(ids, 'aria-labelledby must list the title id and the desc id').toEqual([
        (title as XNode).attrs['id'],
        (desc as XNode).attrs['id'],
      ]);
      expect(decodeEntities((title as XNode).text).trim().length, 'empty <title>').toBeGreaterThan(10);
      expect(decodeEntities((desc as XNode).text).trim().length, '<desc> should describe the picture').toBeGreaterThan(200);
    });

    it('is self-contained: no script, no event handlers, no external references', () => {
      const r = root();
      const problems: string[] = [];
      const ids = new Map<string, number>();
      for (const node of walkNodes(r)) {
        if (['script', 'foreignObject', 'iframe', 'object', 'embed', 'image'].includes(node.name)) {
          problems.push(`<${node.name}> is not allowed`);
        }
        for (const [attr, value] of Object.entries(node.attrs)) {
          if (/^on/i.test(attr)) problems.push(`event handler ${attr} on <${node.name}>`);
          if (/^(?:xlink:)?href$/.test(attr) && !value.startsWith('#')) problems.push(`external ${attr}="${value}"`);
          if (/javascript:/i.test(value)) problems.push(`javascript: URL in ${attr}`);
          if (attr === 'id') ids.set(value, (ids.get(value) ?? 0) + 1);
        }
        if (node.name === 'style' && /@import|url\(\s*['"]?(?!#)/i.test(node.text)) {
          problems.push('<style> imports or loads an external resource');
        }
      }
      for (const [id, count] of ids) if (count > 1) problems.push(`duplicate id "${id}"`);
      expect(problems, problems.join('\n')).toEqual([]);
    });

    it('every #id reference (href, url()) resolves inside the document', () => {
      const r = root();
      const ids = new Set<string>();
      const refs: string[] = [];
      for (const node of walkNodes(r)) {
        if (node.attrs['id']) ids.add(node.attrs['id']);
        for (const value of Object.values(node.attrs)) {
          for (const m of value.matchAll(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g)) refs.push(m[1]);
        }
        for (const key of ['href', 'xlink:href']) {
          if (node.attrs[key]?.startsWith('#')) refs.push(node.attrs[key].slice(1));
        }
      }
      expect(refs.filter((id) => !ids.has(id)), 'dangling #id references').toEqual([]);
    });

    it('draws on a dark background', () => {
      const r = root();
      const style = [...walkNodes(r)].filter((n) => n.name === 'style').map((n) => n.text).join('\n');
      const bg = /\.bg\s*\{[^}]*fill:\s*#([0-9A-Fa-f]{6})/.exec(style);
      expect(bg, 'no ".bg { fill: #rrggbb }" rule: the dark-theme background is missing').not.toBeNull();
      expect(relativeLuminance((bg as RegExpExecArray)[1]), 'background is not dark').toBeLessThan(0.05);
      const painted = [...walkNodes(r)].find((n) => n.name === 'rect' && /\bbg\b/.test(n.attrs['class'] ?? ''));
      expect(painted, 'no <rect class="bg"> covers the canvas').toBeDefined();
    });

    it('carries no inline Copilot CLI version string (1.0.NN)', () => {
      expect(raw()).not.toMatch(/\b1\.0\.\d{2,}\b/);
    });

    it('carries the labels its captions promise', () => {
      const text = svgText(root());
      const missing = (REQUIRED_LABELS[name] ?? []).filter((label) => !text.includes(label));
      expect(missing, `${name} is missing: ${missing.join(', ')}`).toEqual([]);
    });

    it('does not repeat the claims the Phase 4 contract retired', () => {
      const text = svgText(root());
      expect(text).not.toMatch(/every internal operation|complete record of|complete[^.\n]{0,40}event log/i);
      expect(text).not.toMatch(/git-?ignored/i);
    });
  });

  it('the XML checker is live: well-formed input passes', () => {
    const ok = `<?xml version="1.0" encoding="UTF-8"?>
<!-- a comment -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">
  <title id="t">a &lt;b&gt; &amp; c &#169; &#xA9;</title>
  <style><![CDATA[ .a > .b { fill: #000 } ]]></style>
  <use xlink:href="#t"/>
  <text x='1'>it&apos;s</text>
</svg>`;
    const root = parseXml(ok);
    expect(root.name).toBe('svg');
    expect(decodeEntities('a &lt;b&gt; &amp; &#169;')).toBe('a <b> & ©');
  });

  const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg">';
  it.each<[string, string, RegExp]>([
    ['a mismatched closing tag', `${SVG_OPEN}<g></svg>`, /does not match <g>/],
    ['an element left open', `${SVG_OPEN}<g></g>`, /unclosed element <svg>/],
    ['a stray closing tag', '</svg>', /nothing open/],
    ['a bare ampersand', `${SVG_OPEN}<text>a & b</text></svg>`, /bad entity/],
    ['an entity XML does not define', `${SVG_OPEN}<text>&nbsp;</text></svg>`, /bad entity/],
    ['a duplicate attribute', '<svg xmlns="http://www.w3.org/2000/svg" a="1" a="2"/>', /duplicate attribute/],
    ['an unquoted attribute', '<svg xmlns="http://www.w3.org/2000/svg" a=1/>', /malformed attribute/],
    ['a "<" inside an attribute value', '<svg xmlns="http://www.w3.org/2000/svg" a="x<y"/>', /malformed attribute/],
    ['attributes with no space between them', '<svg xmlns="http://www.w3.org/2000/svg"a="1"/>', /missing whitespace/],
    ['two root elements', '<svg xmlns="http://www.w3.org/2000/svg"/><svg xmlns="http://www.w3.org/2000/svg"/>', /more than one root/],
    ['text before the root', 'hello<svg xmlns="http://www.w3.org/2000/svg"/>', /outside the root/],
    ['a DOCTYPE', '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>', /not allowed/],
    ['"--" inside a comment', `${SVG_OPEN}<!-- a -- b --></svg>`, /comment/],
    ['an unterminated comment', `${SVG_OPEN}<!-- a </svg>`, /unterminated comment/],
    ['an undeclared namespace prefix', `${SVG_OPEN}<use xlink:href="#a"/></svg>`, /undeclared namespace prefix/],
    ['a control character', `${SVG_OPEN}<text>a\u0001b</text></svg>`, /control character/],
    ['an empty document', '   ', /no root element/],
  ])('the XML checker rejects %s', (_label, xml, pattern) => {
    expect(() => parseXml(xml)).toThrow(pattern);
  });
});

// ===========================================================================
describe('three-surfaces AC8 — every image link resolves, has alt text, and each SVG is embedded where promised', () => {
  const MD_FILES = [...ALL_LAB_MARKDOWN, ...walkMarkdown(DOCS)];
  const ALL_REFS = MD_FILES.flatMap((f) => imagesIn(f).refs);

  it('the scan sees images (otherwise every check below is vacuous)', () => {
    expect(ALL_REFS.filter((r) => r.url.endsWith('.svg')).length).toBeGreaterThanOrEqual(15);
  });

  it('no image uses reference-style syntax, which this check cannot resolve', () => {
    const offenders = MD_FILES.flatMap((f) => imagesIn(f).referenceStyle.map((line) => `${rel(f)}:${line}`));
    expect(offenders, 'use inline ![alt](path) images:\n' + offenders.join('\n')).toEqual([]);
  });

  it('every image has descriptive, non-empty alt text', () => {
    const offenders = ALL_REFS.filter(hasWeakAlt).map((r) => `${rel(r.file)}:${r.line} alt="${r.alt}"`);
    expect(offenders, 'alt text must describe the picture in a sentence:\n' + offenders.join('\n')).toEqual([]);
  });

  it('every local image resolves on disk to a non-empty file', () => {
    const offenders = unresolvedImages(ALL_REFS);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no image points at a path with a backslash or an absolute machine path', () => {
    const offenders = ALL_REFS.filter((r) => /\\|^[A-Za-z]:|^\//.test(r.url) && !isExternal(r.url)).map(
      (r) => `${rel(r.file)}:${r.line} -> ${r.url}`,
    );
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it.each(SVG_NAMES)('%s is embedded in every file the spec names, by a link that resolves to it', (name) => {
    for (const relFile of EMBEDDED_IN[name]) {
      const file = join(ROOT, relFile);
      const hit = imagesIn(file).refs.some((r) => !isExternal(r.url) && targetOf(r) === svgPath(name));
      expect(hit, `${relFile} must embed docs/images/labs/${name}`).toBe(true);
    }
  });

  it('no SVG is an orphan: each is embedded at least once', () => {
    const embedded = new Set(ALL_REFS.filter((r) => !isExternal(r.url)).map((r) => targetOf(r)));
    const orphans = SVG_NAMES.filter((name) => !embedded.has(svgPath(name)));
    expect(orphans, `not embedded anywhere: ${orphans.join(', ')}`).toEqual([]);
  });

  it('the embedding map covers exactly the seven SVGs', () => {
    expect(Object.keys(EMBEDDED_IN).sort()).toEqual([...SVG_NAMES].sort());
    expect(Object.keys(REQUIRED_LABELS).sort()).toEqual([...SVG_NAMES].sort());
  });

  it('the image scanner is live: it finds markdown and HTML images, skips code, and flags weak alt text and missing files', () => {
    const md = [
      'Prose ![A mock-up of the panel](../docs/images/labs/otel-span-tree.svg "title") and <img src="./x.png" alt="">.',
      '',
      '```md',
      '![not an image, it is in a fence](nope.svg)',
      '```',
      '',
      'Inline `![also not](nope.svg)` code.',
      '',
      '![](../docs/images/labs/otel-span-tree.svg) and ![image](../docs/images/labs/missing.svg)',
      '',
      'Reference style ![Looks fine but is not inline][ref].',
    ].join('\n');
    const probe = join(LABS, '__three_surfaces_probe__.md'); // never written: only its location matters
    const { refs, referenceStyle } = imagesInText(md, probe);

    expect(refs.map((r) => r.syntax)).toEqual(['markdown', 'html', 'markdown', 'markdown']);
    expect(refs[0].alt).toBe('A mock-up of the panel');
    expect(referenceStyle, 'the reference-style image on line 11 must be reported').toEqual([11]);

    // Weak alt text: empty, one word, or a file name. A real sentence passes.
    expect(refs.map(hasWeakAlt)).toEqual([false, true, true, true]);

    // Resolution: the first target exists, the missing file and the missing ./x.png do not.
    const problems = unresolvedImages(refs);
    expect(problems).toHaveLength(2);
    expect(problems.join('\n')).toContain('x.png');
    expect(problems.join('\n')).toContain('missing.svg');
  });
});

// ===========================================================================
describe('three-surfaces AC9 — the hook-lifecycle diagram matches the catalogue and the verified wording', () => {
  const svg = (): string => svgText(parseXml(read(svgPath('hooks-lifecycle-15-events.svg'))));

  /** The 15 event names in docs/copilot-config-reference.md §4.3, first table. */
  function catalogueEvents(): string[] {
    const md = read(join(DOCS, 'copilot-config-reference.md'));
    const start = md.search(/^### 4\.3 Event catalogue/m);
    expect(start, 'config reference §4.3 not found').toBeGreaterThan(-1);
    const body = md.slice(start).split(/^### 4\.4 /m)[0];
    return [...body.matchAll(/^\|\s*\d+\s*\|\s*`([A-Za-z]+)`\s*\|/gm)].map((m) => m[1]);
  }

  it('the four groups partition exactly the 15 events the config reference catalogues', () => {
    const grouped = Object.values(HOOK_EVENTS_BY_GROUP).flat();
    expect(grouped).toHaveLength(15);
    expect(new Set(grouped).size).toBe(15);
    expect([...catalogueEvents()].sort()).toEqual([...grouped].sort());
  });

  it('draws every one of the 15 events, by its camelCase name', () => {
    const text = svg();
    for (const event of Object.values(HOOK_EVENTS_BY_GROUP).flat()) {
      expect(text, `the diagram never names ${event}`).toMatch(new RegExp(`(?<![A-Za-z])${event}(?![A-Za-z])`));
    }
  });

  it('names the four groups', () => {
    const text = svg();
    for (const group of Object.keys(HOOK_EVENTS_BY_GROUP)) expect(text).toContain(group);
  });

  it('never invents a PascalCase alias for an event that documents none', () => {
    const text = svg();
    expect(text).not.toMatch(/\b(?:UserPromptTransformed|PreMcpToolCall|SubagentStart)\b/);
    expect(text).not.toMatch(/\bNotification\b/);
  });

  it('marks preMcpToolCall as a Copilot CLI build setting, not a hooks-reference event', () => {
    expect(svg()).toMatch(/preMcpToolCall[\s\S]*CLI build/i);
  });

  it('compares command and HTTP dispatch, with the verified failure semantics', () => {
    const text = svg();
    expect(text).toMatch(/command hook/i);
    expect(text).toMatch(/HTTP hook/i);
    expect(text).toMatch(/fail-closed/);
    expect(text).toMatch(/fail-open/);
    expect(text).toMatch(/\bexec\b[\s\S]*\bargs\b/);
  });

  it('does not call HTTP the only way, and does not call shell-free exec CLI-only', () => {
    const text = svg();
    expect(text).not.toMatch(/only (?:built-in |supported )?(?:way|type|option)/i);
    expect(text).not.toMatch(/\bCLI[- ]only\b/i);
    expect(text).toMatch(/Recommended built-in type/i);
    expect(text).toMatch(/exec \+ args work in Copilot CLI and the VS Code Copilot harness/);
  });
});
