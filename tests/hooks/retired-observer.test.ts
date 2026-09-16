import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RETIRED_PATHS = [
  join('.github', 'skills', 'continuous-learning-v2'),
  join('scripts', 'hooks', 'observe.sh'),
  join('scripts', 'hooks', 'observe.ps1'),
];
const RETAINED_HOOKS = {
  userPromptSubmitted: ['user-prompt-submitted'],
  preToolUse: [
    'pre-tool-use-long-running',
    'pre-tool-use-doc-blocker',
    'pre-tool-use-secret-scan',
  ],
  postToolUse: ['post-tool-use-format', 'post-tool-use-console-warn'],
  errorOccurred: ['error-occurred'],
};

describe('retired continuous-learning observer', () => {
  it.each(RETIRED_PATHS)('does not ship %s', (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false);
  });

  it('keeps the lab hooks without registering the retired observer', () => {
    const config: unknown = JSON.parse(
      readFileSync(join(ROOT, '.github', 'hooks', 'default.json'), 'utf8'),
    );

    for (const [event, scripts] of Object.entries(RETAINED_HOOKS)) {
      const commands = scripts.map((script) => ({
        type: 'command',
        bash: `./scripts/hooks/${script}.sh`,
        powershell: `./scripts/hooks/${script}.ps1`,
      }));
      expect(config).toMatchObject({
        hooks: {
          [event]: expect.arrayContaining(
            commands.map((command) => expect.objectContaining(command)),
          ),
        },
      });
      for (const command of commands) {
        expect(existsSync(join(ROOT, command.bash))).toBe(true);
        expect(existsSync(join(ROOT, command.powershell))).toBe(true);
      }
    }
    expect(JSON.stringify(config)).not.toMatch(
      /continuous-learning-v2|observe\.(sh|ps1)/,
    );
  });
});
