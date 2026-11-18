import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

// A scratch copy of the real artifacts can be substituted for a targeted red
// check without ever changing the learner's files in the working tree.
const ROOT = process.env.PHASE5_QA_ROOT ?? process.cwd();
const LABS = join(ROOT, 'labs');
const IMAGES = join(ROOT, 'docs', 'images', 'labs');
const read = (file: string): string => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const rel = (file: string): string => relative(ROOT, file).replace(/\\/g, '/');

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? markdownFiles(file) : entry.name.endsWith('.md') ? [file] : [];
  });
}

interface MarkdownNode {
  type: string;
  value?: string;
  lang?: string | null;
  children?: MarkdownNode[];
  position?: { start: { line: number; offset?: number } };
}

interface Fence {
  body: string;
  lang: string;
  line: number;
  offset: number;
}

function codeFences(md: string): Fence[] {
  const collect = (node: MarkdownNode): Fence[] =>
    node.type === 'code'
      ? [{
          body: node.value ?? '',
          lang: node.lang ?? '',
          line: node.position?.start.line ?? 0,
          offset: node.position?.start.offset ?? 0,
        }]
      : (node.children ?? []).flatMap(collect);
  return collect(unified().use(remarkParse).parse(md) as MarkdownNode);
}

function inDetails(md: string, fence: Fence): boolean {
  return [...md.slice(0, fence.offset).matchAll(/<\/?details\b[^>]*>/g)]
    .reduce((depth, match) => depth + (match[0].startsWith('</') ? -1 : 1), 0) > 0;
}

function heredocPayloads(body: string): Array<{ path: string; content: string }> {
  return [...body.matchAll(/^cat\s*>\s*(\S+)\s*<<-?\s*['"]?([A-Za-z_]\w*)['"]?\s*$/gm)]
    .map((match) => {
      const rest = body.slice(match.index + match[0].length).replace(/^\n/, '');
      const end = new RegExp(`^${match[2]}\\s*$`, 'm').exec(rest);
      if (!end) throw new Error(`Unterminated heredoc writing ${match[1]}`);
      return { path: match[1], content: rest.slice(0, end.index).trim() };
    });
}

const EDITOR_FILES = markdownFiles(LABS).filter((file) => /[/\\]lab(?:02|03|04|06|07)\.md$/.test(file));

// Well-formedness and accessibility metadata are independently checked by the
// existing XML contract. Here only drawn <text> counts: title/desc cannot make a
// missing visual annotation pass. Nested tspans stay in their original order.
function drawnLabels(name: string): string[] {
  const entities: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
  return [...read(join(IMAGES, name)).matchAll(/<text\b[^>]*>([\s\S]*?)<\/text\s*>/g)]
    .map((match) => match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&(lt|gt|amp|quot|apos);/g, (_all, entity: string) => entities[entity])
      .replace(/\s+/g, ' ')
      .trim());
}

describe('Phase 5 executable regression coverage', () => {
  it('keeps Copilot REPL commands out of shell fences, including a launch followed by a slash command', () => {
    const offenders: string[] = [];
    for (const file of markdownFiles(LABS)) {
      for (const fence of codeFences(read(file))) {
        if (!/^(?:bash|sh|shell|powershell|pwsh)$/.test(fence.lang)) continue;
        // Ignore quoted file content, but still inspect commands after its
        // closing delimiter. Skill examples inside a heredoc are not shell input.
        const commands = heredocPayloads(fence.body).reduce(
          (body, payload) => body.replace(payload.content, ''),
          fence.body,
        );
        if (/^\s*\/(?:agent|skills|instructions|env|context|diagnose|mcp|exit|plugin|hooks|usage|tasks|lsp)\b/m.test(commands)) {
          offenders.push(`${rel(file)}:${fence.line}`);
        }
      }
    }
    expect(offenders, 'split the OS launch and interactive Copilot input into separately badged blocks').toEqual([]);
  });

  it('makes every folded Bash heredoc write exactly the content shown in the VS Code editor block', () => {
    const checked: string[] = [];
    const mismatches: string[] = [];
    for (const file of EDITOR_FILES) {
      const md = read(file);
      const fences = codeFences(md);
      const editorBlocks = fences.filter((fence) => !inDetails(md, fence));
      for (const fence of fences.filter((candidate) => candidate.lang === 'bash' && inDetails(md, candidate))) {
        for (const payload of heredocPayloads(fence.body)) {
          const location = `${rel(file)}:${fence.line} -> ${payload.path}`;
          checked.push(location);
          if (!editorBlocks.some((editor) => editor.body.trim() === payload.content)) mismatches.push(location);
        }
      }
    }
    expect(checked, 'retain all eleven editor-first file payloads, including nested Markdown fences').toHaveLength(11);
    expect(mismatches, 'the editor and shell routes must produce the same complete file').toEqual([]);
  });

  it('renders file-writing shell alternatives as collapsed details containing real code blocks', async () => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true });
    let checked = 0;
    for (const file of EDITOR_FILES) {
      const html = String(await processor.process(read(file)));
      const folds = [...html.matchAll(/<details([^>]*)>([\s\S]*?)<\/details>/g)]
        .filter((match) => match[2].includes('Shell alternative (Bash / PowerShell heredoc)'));
      for (const fold of folds) {
        checked++;
        expect(fold[1], `${rel(file)}: alternatives must start collapsed`).not.toMatch(/\bopen\b/);
        expect(fold[2], `${rel(file)}: Markdown fences must render inside the fold`).toMatch(/<pre><code class="language-(?:bash|powershell)"/);
      }
    }
    expect(checked).toBe(11);
  });

  it('draws every promised SVG label visibly rather than satisfying the check with title or desc text', () => {
    const labels: Record<string, string[]> = {
      'three-surfaces-guide.svg': ['🐚', '🤖', '💠', 'OS Terminal', 'PS>', 'Copilot CLI', 'copilot>', 'VS Code', 'Chat: Open Customizations'],
      'vscode-customizations-and-hooks.svg': ['Chat: Open Customizations', 'Instructions', 'Skills', 'Agents', 'MCP Servers', 'Hooks'],
      'vscode-agent-debug-logs.svg': ['Load Instructions', 'Load Agents', 'Load Hooks', 'Load Skills', 'Summary view', 'Agent Flow Chart', '#debugEventsSnapshot', 'sparkle icon'],
      'vscode-chat-debug-view.svg': ['System prompt', 'User prompt', 'Context', 'Response', 'Tool responses'],
      'cli-env-context-diagnose.svg': ['/env', '/instructions', '/context', '/diagnose', 'System Prompt', 'Custom Instructions', 'System Tools', 'MCP Tools', 'Messages', 'Free Space', 'Buffer'],
      'hooks-lifecycle-15-events.svg': [
        'Session', 'Turn and prompt', 'Subagent', 'Tool execution',
        'sessionStart', 'preCompact', 'notification', 'errorOccurred', 'sessionEnd',
        'userPromptSubmitted', 'userPromptTransformed', 'agentStop', 'subagentStart', 'subagentStop',
        'permissionRequest', 'preToolUse', 'preMcpToolCall', 'postToolUse', 'postToolUseFailure',
      ],
      'otel-span-tree.svg': ['invoke_agent', 'chat', 'execute_tool task', 'invoke_agent explore', 'github.copilot.hook.start', 'github.copilot.hook.end'],
    };
    const missing = Object.entries(labels).flatMap(([name, required]) => {
      const visible = drawnLabels(name).join(' ');
      return required.filter((label) => !visible.includes(label)).map((label) => `${name}: ${label}`);
    });
    expect(missing).toEqual([]);
  });

  it('assigns the verified nonzero-exit and fall-through semantics to the correct hook dispatch panel', () => {
    const labels = drawnLabels('hooks-lifecycle-15-events.svg');
    const command = labels.findIndex((label) => label.startsWith('Command hook:'));
    const http = labels.findIndex((label) => label.startsWith('HTTP hook:'));
    expect(command).toBeGreaterThanOrEqual(0);
    expect(http).toBeGreaterThan(command);
    const commandPanel = labels.slice(command, http).join(' ');
    const httpPanel = labels.slice(http).join(' ');
    expect(commandPanel).toMatch(/preToolUse is fail-closed: a non-zero exit denies the call/);
    expect(commandPanel).toMatch(/timeout.*empty or unparseable output.*falls through/);
    expect(httpPanel).toMatch(/preToolUse is fail-open: a network error, a timeout or a non-2xx response falls through/);
    expect(commandPanel).toContain('exec + args work in Copilot CLI and the VS Code Copilot harness');
    expect(httpPanel).toContain('Recommended built-in type for persistent audit logs');
  });

  it('marks observed OTel delegation rows as observed and the optional plan row as plan-mode only', () => {
    const labels = drawnLabels('otel-span-tree.svg');
    for (const row of ['execute_tool task', 'invoke_agent explore']) {
      const index = labels.indexOf(row);
      expect(index, `missing waterfall row ${row}`).toBeGreaterThanOrEqual(0);
      expect(labels[index + 1], `do not present ${row} as a documented span name`).toBe('observed');
    }
    const plan = labels.indexOf('plan');
    expect(plan).toBeGreaterThanOrEqual(0);
    expect(labels[plan + 1]).toBe('plan mode only');
    expect(labels.join(' ')).toContain('span events on invoke_agent');
  });
});
