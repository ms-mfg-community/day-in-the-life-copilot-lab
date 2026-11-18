import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import type { Student } from '../../node/core/entities/student.js';

const ROOT = process.cwd();
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

function fenced(path: string, language: string): string[] {
  const blocks = [...read(path).matchAll(new RegExp('```' + language + '\\r?\\n([\\s\\S]*?)```', 'g'))];
  expect(blocks.length, `${path} must retain its ${language} example`).toBeGreaterThan(0);
  return blocks.map((block) => block[1]);
}

/** Check the actual snippet against real repository types, without writing compiler output. */
function diagnostics(source: string): ts.Diagnostic[] {
  const file = join(ROOT, 'tests/prompts/__github_example_contract__.ts').replaceAll('\\', '/');
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
    name === file
      ? ts.createSourceFile(name, source, languageVersion, true)
      : getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
  return [...ts.getPreEmitDiagnostics(ts.createProgram([file], options, host))];
}

describe('shipped ContosoUniversity code examples', () => {
  const INSTRUCTIONS = '.github/copilot-instructions.md';

  it('executes the correct rename example without mutating a real Student-shaped input', () => {
    const example = fenced(INSTRUCTIONS, 'typescript')[0].split('// WRONG:')[0];
    const js = ts.transpileModule(example, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const rename = runInNewContext(`${js}\nrenameStudent`) as (student: Student, lastName: string) => Student;
    const student: Student = Object.freeze({
      id: 1,
      firstMidName: 'Ada',
      lastName: 'Lovelace',
      enrollmentDate: new Date('2024-09-01'),
    });

    for (const lastName of ['Hopper', '', '李']) {
      const renamed = rename(student, lastName);
      expect(renamed).toEqual({ ...student, lastName });
      expect(renamed).not.toBe(student);
      expect(student.lastName).toBe('Lovelace');
    }
  });

  it('rejects the intentionally wrong rename example using the actual readonly Student type', () => {
    const example = fenced(INSTRUCTIONS, 'typescript')[0].split('// WRONG:')[1];
    expect(example).toBeDefined();
    const functionStart = example.indexOf('function renameStudent');
    expect(functionStart).toBeGreaterThanOrEqual(0);
    const errors = diagnostics(`${read('node/core/entities/student.ts')}\n${example.slice(functionStart)}`);
    expect(errors.map((error) => error.code)).toEqual([2540]);
    expect(ts.flattenDiagnosticMessageText(errors[0].messageText, '\n')).toContain("'lastName'");
  });

  it('keeps the documented response union assignable both ways with real ok/fail response types', () => {
    const example = fenced(INSTRUCTIONS, 'typescript')[1];
    const source = `
namespace Runtime {
${read('node/web/api-response.ts')}
}
${example}
let documented!: ApiResponse<{ id: number }>;
let actual!: Runtime.ApiResponse<{ id: number }>;
documented = actual;
actual = documented;
`;
    const errors = diagnostics(source);
    expect(errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))).toEqual([]);
  });

  it('uses the exact xUnit missing-student regression that the .NET suite executes', () => {
    const example = fenced('.github/instructions/testing.instructions.md', 'csharp')[0];
    const canonical = read('dotnet/ContosoUniversity.Tests/Controllers/StudentsControllerTests.cs');
    const normalize = (text: string): string => text.replace(/\/\/[^\r\n]*/g, '').replace(/\s+/g, '');
    expect(normalize(canonical)).toContain(normalize(example));
  });
});
