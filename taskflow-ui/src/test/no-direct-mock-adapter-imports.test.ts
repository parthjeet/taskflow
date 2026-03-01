import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const DISALLOWED_IMPORT = /(?:^@\/lib\/api\/adapters\/mock(?:\.ts)?$)|(?:\/api\/adapters\/mock(?:\.ts)?$)/;

async function listFilesRecursively(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFilesRecursively(fullPath);
    return [fullPath];
  }));

  return files.flat();
}

function isTestFile(filePath: string): boolean {
  const normalized = filePath.split('\\').join('/');
  return (
    normalized.includes('/src/test/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx')
  );
}

function isAllowedImporter(filePath: string): boolean {
  const normalized = filePath.split('\\').join('/');
  return (
    normalized.endsWith('/src/lib/api/index.ts') ||
    normalized.includes('/src/lib/api/adapters/')
  );
}

function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const staticImportPattern = /\b(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const match of source.matchAll(staticImportPattern)) {
    specifiers.push(match[1]);
  }
  for (const match of source.matchAll(dynamicImportPattern)) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

describe('extractImportSpecifiers', () => {
  it('captures multi-line import specifiers', () => {
    const source = `import {
  MockApiClient,
} from '@/lib/api/adapters/mock';`;

    expect(extractImportSpecifiers(source)).toContain('@/lib/api/adapters/mock');
  });
});

describe('AC1 guardrail: no direct mock adapter imports in app source', () => {
  it('blocks direct imports of the mock adapter outside the API layer and tests', async () => {
    const allFiles = await listFilesRecursively(SRC_ROOT);
    const sourceFiles = allFiles.filter(file =>
      (file.endsWith('.ts') || file.endsWith('.tsx')) &&
      !isTestFile(file) &&
      !isAllowedImporter(file),
    );

    const violations: string[] = [];
    for (const file of sourceFiles) {
      const content = await readFile(file, 'utf8');
      const hasViolation = extractImportSpecifiers(content).some(specifier =>
        DISALLOWED_IMPORT.test(specifier.split('\\').join('/')),
      );
      if (hasViolation) {
        violations.push(path.relative(process.cwd(), file).split('\\').join('/'));
      }
    }

    expect(violations).toEqual([]);
  });
});
