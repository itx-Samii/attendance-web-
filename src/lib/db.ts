import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Ensures that the data directory and the target JSON file exist.
 * If they do not exist, initializes them with an empty array.
 */
async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      // File does not exist, initialize it with empty array
      await fs.writeFile(filePath, '[]', 'utf8');
    }
  } catch (error) {
    console.error(`Failed to ensure file exists at ${filePath}:`, error);
    throw error;
  }
}

/**
 * Reads a JSON file table from the local storage.
 * @param tableName The filename of the table (without path/extension, e.g. 'classes')
 */
export async function readTable<T>(tableName: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  await ensureFileExists(filePath);
  
  try {
    const rawData = await fs.readFile(filePath, 'utf8');
    return JSON.parse(rawData) as T[];
  } catch (error) {
    console.error(`Error reading database table "${tableName}":`, error);
    return [];
  }
}

/**
 * Writes an array of records to a JSON file table atomically.
 * Accomplished by writing to a temp file first, then performing an atomic fs.rename.
 * @param tableName The filename of the table (without path/extension, e.g. 'classes')
 * @param data The array of data to write
 */
export async function writeTable<T>(tableName: string, data: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  const tempPath = path.join(DATA_DIR, `${tableName}.json.tmp`);
  
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  try {
    const serializedData = JSON.stringify(data, null, 2);
    // 1. Write data to a temporary file
    await fs.writeFile(tempPath, serializedData, 'utf8');
    // 2. Atomically rename/replace the target file (guarantees safe write operations)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    console.error(`Failed to write atomically to database table "${tableName}":`, error);
    // Cleanup temporary file if it was created
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw error;
  }
}

/**
 * Initialize all core relational tables
 */
export async function initDatabase(): Promise<void> {
  const tables = ['classes', 'students', 'attendance'];
  for (const table of tables) {
    const filePath = path.join(DATA_DIR, `${table}.json`);
    await ensureFileExists(filePath);
  }
}
