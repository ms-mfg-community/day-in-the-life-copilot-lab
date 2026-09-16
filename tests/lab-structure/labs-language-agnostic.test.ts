import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TARGET_LABS = ['lab03.md', 'lab04.md', 'lab05.md', 'lab06.md'];

describe('lab-structure: labs 03–06 are language-agnostic', () => {
  it.each(TARGET_LABS)(
    '%s contains no ```csharp fenced blocks',
    (name) => {
      const path = join(ROOT, 'labs', name);
      expect(existsSync(path)).toBe(true);
      const txt = readFileSync(path, 'utf8');
      const csharpBlocks = txt.match(/```csharp/g) ?? [];
      expect(
        csharpBlocks.length,
        `${name} still has ${csharpBlocks.length} csharp blocks`,
      ).toBe(0);
    },
  );

  it.each(TARGET_LABS)('%s links to dotnet AND node appendices', (name) => {
    const path = join(ROOT, 'labs', name);
    expect(existsSync(path)).toBe(true);
    const txt = readFileSync(path, 'utf8');
    const stem = name.replace('.md', '');
    expect(
      txt,
      `${name} should link to appendices/dotnet/${stem}.md`,
    ).toMatch(new RegExp(`appendices/dotnet/${stem}\\.md`));
    expect(
      txt,
      `${name} should link to appendices/node/${stem}.md`,
    ).toMatch(new RegExp(`appendices/node/${stem}\\.md`));
  });
});
