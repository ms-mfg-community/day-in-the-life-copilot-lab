import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { command } from './commands.mjs';

const DOTNET_TESTS = 'dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj';

export function exerciseSourceEdits(workspace, marker, env) {
  const nodeTest = `import { it, expect } from 'vitest';
import { layout } from '../../web/views/layout.js';
it('renders the attendee source edit', () => { expect(layout('Probe', '')).toContain('${marker}'); });
`;
  const dotnetTest = `using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
public class PreparedSourceEditTests {
  [Fact]
  public async Task Home_EditedSource_ReturnsAttendeeMarkup() {
    await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
    using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("http://localhost") });
    Assert.Contains("${marker}", await client.GetStringAsync("/"));
  }
}
`;
  writeFileSync(join(workspace, 'node/tests/unit/prepared-source-edit.test.ts'), nodeTest);
  writeFileSync(join(workspace, 'dotnet/ContosoUniversity.Tests/PreparedSourceEditTests.cs'), dotnetTest);
  command(workspace, 'node-source-red', 'pnpm', ['-C', 'node', 'test', 'tests/unit/prepared-source-edit.test.ts'], env, new RegExp(marker));
  command(workspace, 'dotnet-source-red', 'dotnet', [
    'test', DOTNET_TESTS, '--no-restore', '--filter', 'FullyQualifiedName~PreparedSourceEditTests',
  ], env, new RegExp(marker));
  const layout = join(workspace, 'node/web/views/layout.ts');
  const original = readFileSync(layout, 'utf8');
  assert.ok(original.includes('</head>'), 'Cannot locate the real Node layout edit point');
  writeFileSync(layout, original.replace('</head>', `<meta name="prepared-source-edit" content="${marker}">\n</head>`));
  const view = join(workspace, 'dotnet/ContosoUniversity.Web/Views/Home/Index.cshtml');
  writeFileSync(view, `${readFileSync(view, 'utf8')}\n<p data-prepared-source-edit="${marker}">Attendee source edit</p>\n`);
  command(workspace, 'node-build-edited', 'pnpm', ['-C', 'node', 'build'], env);
  command(workspace, 'node-source-green', 'pnpm', ['-C', 'node', 'test'], env);
  command(workspace, 'dotnet-build-edited', 'dotnet', [
    'build', 'dotnet/ContosoUniversity.sln', '--no-restore', '--no-incremental',
  ], env);
  command(workspace, 'dotnet-source-green', 'dotnet', ['test', DOTNET_TESTS, '--no-restore'], env);
}
