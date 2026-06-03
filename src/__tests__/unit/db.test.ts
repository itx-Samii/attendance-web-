/**
 * ============================================================
 * WHITE-BOX UNIT TESTS — src/lib/db.ts
 * ============================================================
 * Tests internal paths of the JSON file-based database layer:
 *   - readTable: normal read, missing file auto-init, parse error fallback
 *   - writeTable: atomic write (temp-then-rename), error cleanup
 *   - initDatabase: table initialisation and mock data seeding
 *   - ensureFileExists: directory creation, file creation, access check
 * ============================================================
 */

import path from 'path';

// ──────────────────────────────────────────────────────────────
// Mock fs/promises entirely — no actual disk I/O in unit tests
// ──────────────────────────────────────────────────────────────
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  rename: jest.fn(),
  unlink: jest.fn(),
}));

import fs from 'fs/promises';
import { readTable, writeTable, initDatabase, clearAllTableCaches } from '@/lib/db';

const mockFs = fs as jest.Mocked<typeof fs>;
const DATA_DIR = path.join(process.cwd(), 'data');

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
function filePath(tableName: string) {
  return path.join(DATA_DIR, `${tableName}.json`);
}
function tempPath(tableName: string) {
  return path.join(DATA_DIR, `${tableName}.json.tmp`);
}

beforeEach(() => {
  jest.resetAllMocks();
  clearAllTableCaches();
});

// ════════════════════════════════════════════════════════════
// ① readTable
// ════════════════════════════════════════════════════════════
describe('readTable', () => {
  it('parses and returns data from an existing JSON file', async () => {
    const fixture = [{ classId: '9a', name: 'Grade 9A' }];
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValueOnce(JSON.stringify(fixture) as any);

    const result = await readTable<{ classId: string; name: string }>('classes');
    expect(result).toEqual(fixture);
    expect(mockFs.readFile).toHaveBeenCalledWith(filePath('classes'), 'utf8');
  });

  it('creates file with [] and returns [] when file does not exist', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.access.mockRejectedValue(new Error('ENOENT')); // file missing
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('[]' as any);

    const result = await readTable('newTable');
    expect(result).toEqual([]);
    // It must have written an empty-array seed file
    expect(mockFs.writeFile).toHaveBeenCalledWith(filePath('newTable'), '[]', 'utf8');
  });

  it('returns [] (not throws) when JSON.parse fails on corrupted data', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('INVALID_JSON{{{{' as any);

    const result = await readTable('broken');
    expect(result).toEqual([]);
  });

  it('uses the correct file path derived from tableName', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('[]' as any);

    await readTable('students');
    expect(mockFs.readFile).toHaveBeenCalledWith(filePath('students'), 'utf8');
  });
});

// ════════════════════════════════════════════════════════════
// ② writeTable
// ════════════════════════════════════════════════════════════
describe('writeTable', () => {
  it('writes to a temp file then renames atomically', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);

    const data = [{ id: 1, value: 'hello' }];
    await writeTable('test', data);

    // Step 1: write to temp file
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      tempPath('test'),
      JSON.stringify(data, null, 2),
      'utf8'
    );
    // Step 2: rename temp → target (atomic replace)
    expect(mockFs.rename).toHaveBeenCalledWith(tempPath('test'), filePath('test'));
  });

  it('attempts to clean up the temp file if rename fails', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockRejectedValue(new Error('rename failed'));
    mockFs.unlink.mockResolvedValue(undefined);

    await expect(writeTable('test', [])).rejects.toThrow('rename failed');
    expect(mockFs.unlink).toHaveBeenCalledWith(tempPath('test'));
  });

  it('re-throws the original error after cleanup attempt', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockRejectedValue(new Error('disk full'));
    mockFs.unlink.mockResolvedValue(undefined);

    await expect(writeTable('broken', [])).rejects.toThrow('disk full');
  });

  it('serialises data as pretty-printed JSON (indent=2)', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);

    const data = [{ a: 1 }];
    await writeTable('pretty', data);

    const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1];
    // Must be pretty-printed (contains newline + spaces)
    expect(written).toContain('\n');
    expect(written).toContain('  ');
  });
});

// ════════════════════════════════════════════════════════════
// ③ initDatabase — seeding paths
// ════════════════════════════════════════════════════════════
describe('initDatabase', () => {
  it('seeds mock classes when classes table is empty', async () => {
    // All three ensureFileExists calls succeed
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.access.mockResolvedValue(undefined);

    // First readTable('classes') → empty
    // Second readTable('students') → empty  
    mockFs.readFile
      .mockResolvedValueOnce('[]' as any)   // classes empty
      .mockResolvedValueOnce('[]' as any)   // students empty
      .mockResolvedValueOnce('[]' as any);  // re-read after seed
    
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);

    await initDatabase();

    // writeTable should be called at least twice (once for classes, once for students)
    expect(mockFs.rename).toHaveBeenCalledTimes(2);
  });

  it('does NOT overwrite existing classes data', async () => {
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);

    const existingClasses = [{ classId: '12a', name: 'Grade 12A' }];
    const existingStudents = [{ rollNumber: '12A-01', name: 'Alice', parentPhone: '+1', classId: '12a' }];

    // initDatabase reads classes then students via readTable.
    // readTable('classes') is the first readFile call, readTable('students') is the second.
    mockFs.readFile
      .mockResolvedValueOnce(JSON.stringify(existingClasses) as any)  // classes
      .mockResolvedValueOnce(JSON.stringify(existingStudents) as any); // students

    await initDatabase();

    // Since both tables are non-empty, writeFile should NOT have been called
    // for any SEEDING purpose (no empty-array [] writes for initialization either,
    // since access resolves → files already "exist").
    const writeFileCalls = (mockFs.writeFile as jest.Mock).mock.calls;
    // No seed writeFile should have been triggered (files "exist" via access mock)
    expect(writeFileCalls).toHaveLength(0);
  });
});
