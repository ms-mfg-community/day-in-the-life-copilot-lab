import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RETIRED_PATHS = [
  join('.github', 'skills', 'continuous-learning-v2'),
  join('scripts', 'hooks', 'observe.sh'),
  join('scripts', 'hooks', 'observe.ps1'),
];

describe('retired continuous-learning observer', () => {
  it.each(RETIRED_PATHS)('does not ship %s', (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false);
  });

  it('keeps the lab hooks without registering the retired observer', () => {
    const config: unknown = JSON.parse(
      readFileSync(join(ROOT, '.github', 'hooks', 'default.json'), 'utf8'),
    );

    expect(config).toMatchObject({
      hooks: {
        userPromptSubmitted: expect.any(Array),
        preToolUse: expect.any(Array),
        postToolUse: expect.any(Array),
        errorOccurred: expect.any(Array),
      },
    });
    expect(JSON.stringify(config)).not.toMatch(
      /continuous-learning-v2|observe\.(sh|ps1)/,
    );
  });
});
