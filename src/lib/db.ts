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
 * Initialize all core relational tables and seed default mock values if empty
 */
export async function initDatabase(): Promise<void> {
  const tables = ['classes', 'students', 'attendance'];
  for (const table of tables) {
    const filePath = path.join(DATA_DIR, `${table}.json`);
    await ensureFileExists(filePath);
  }

  // Seed classes if empty
  const classes = await readTable<any>('classes');
  if (classes.length === 0) {
    const mockClasses = [
      { classId: '9a', name: 'Grade 9 - Section A' },
      { classId: '9b', name: 'Grade 9 - Section B' },
      { classId: '10a', name: 'Grade 10 - Section A' },
      { classId: '10b', name: 'Grade 10 - Section B' }
    ];
    await writeTable('classes', mockClasses);
  }

  // Seed students if empty
  const students = await readTable<any>('students');
  if (students.length === 0) {
    const mockStudents = [
      // 9A Students
      { rollNumber: '9A-01', name: 'Aiden Smith', parentPhone: '+15550100001', classId: '9a' },
      { rollNumber: '9A-02', name: 'Bella Johnson', parentPhone: '+15550100002', classId: '9a' },
      { rollNumber: '9A-03', name: 'Carter Davis', parentPhone: '+15550100003', classId: '9a' },
      { rollNumber: '9A-04', name: 'Diana Miller', parentPhone: '+15550100004', classId: '9a' },
      { rollNumber: '9A-05', name: 'Ethan Wilson', parentPhone: '+15550100005', classId: '9a' },
      { rollNumber: '9A-06', name: 'Fiona Taylor', parentPhone: '+15550100006', classId: '9a' },
      { rollNumber: '9A-07', name: 'George Anderson', parentPhone: '+15550100007', classId: '9a' },
      { rollNumber: '9A-08', name: 'Hannah Thomas', parentPhone: '+15550100008', classId: '9a' },
      { rollNumber: '9A-09', name: 'Ian Jackson', parentPhone: '+15550100009', classId: '9a' },
      { rollNumber: '9A-10', name: 'Julia White', parentPhone: '+15550100010', classId: '9a' },

      // 9B Students
      { rollNumber: '9B-01', name: 'Kevin Harris', parentPhone: '+15550100011', classId: '9b' },
      { rollNumber: '9B-02', name: 'Lily Martin', parentPhone: '+15550100012', classId: '9b' },
      { rollNumber: '9B-03', name: 'Mason Thompson', parentPhone: '+15550100013', classId: '9b' },
      { rollNumber: '9B-04', name: 'Nora Garcia', parentPhone: '+15550100014', classId: '9b' },
      { rollNumber: '9B-05', name: 'Oliver Martinez', parentPhone: '+15550100015', classId: '9b' },
      { rollNumber: '9B-06', name: 'Penelope Robinson', parentPhone: '+15550100016', classId: '9b' },
      { rollNumber: '9B-07', name: 'Quinn Clark', parentPhone: '+15550100017', classId: '9b' },
      { rollNumber: '9B-08', name: 'Ruby Rodriguez', parentPhone: '+15550100018', classId: '9b' },
      { rollNumber: '9B-09', name: 'Samuel Lewis', parentPhone: '+15550100019', classId: '9b' },
      { rollNumber: '9B-10', name: 'Tara Lee', parentPhone: '+15550100020', classId: '9b' },

      // 10A Students
      { rollNumber: '10A-01', name: 'Uma Patel', parentPhone: '+15550100021', classId: '10a' },
      { rollNumber: '10A-02', name: 'Victor Walker', parentPhone: '+15550100022', classId: '10a' },
      { rollNumber: '10A-03', name: 'Wendy Hall', parentPhone: '+15550100023', classId: '10a' },
      { rollNumber: '10A-04', name: 'Xavier Allen', parentPhone: '+15550100024', classId: '10a' },
      { rollNumber: '10A-05', name: 'Yara Young', parentPhone: '+15550100025', classId: '10a' },
      { rollNumber: '10A-06', name: 'Zachary King', parentPhone: '+15550100026', classId: '10a' },
      { rollNumber: '10A-07', name: 'Alice Wright', parentPhone: '+15550100027', classId: '10a' },
      { rollNumber: '10A-08', name: 'Benjamin Lopez', parentPhone: '+15550100028', classId: '10a' },
      { rollNumber: '10A-09', name: 'Chloe Hill', parentPhone: '+15550100029', classId: '10a' },
      { rollNumber: '10A-10', name: 'Daniel Scott', parentPhone: '+15550100030', classId: '10a' },

      // 10B Students
      { rollNumber: '10B-01', name: 'Emily Green', parentPhone: '+15550100031', classId: '10b' },
      { rollNumber: '10B-02', name: 'Felix Adams', parentPhone: '+15550100032', classId: '10b' },
      { rollNumber: '10B-03', name: 'Grace Baker', parentPhone: '+15550100033', classId: '10b' },
      { rollNumber: '10B-04', name: 'Henry Gonzalez', parentPhone: '+15550100034', classId: '10b' },
      { rollNumber: '10B-05', name: 'Ivy Nelson', parentPhone: '+15550100035', classId: '10b' },
      { rollNumber: '10B-06', name: 'Jack Carter', parentPhone: '+15550100036', classId: '10b' },
      { rollNumber: '10B-07', name: 'Katherine Mitchell', parentPhone: '+15550100037', classId: '10b' },
      { rollNumber: '10B-08', name: 'Logan Perez', parentPhone: '+15550100038', classId: '10b' },
      { rollNumber: '10B-09', name: 'Mia Roberts', parentPhone: '+15550100039', classId: '10b' },
      { rollNumber: '10B-10', name: 'Noah Turner', parentPhone: '+15550100040', classId: '10b' }
    ];
    await writeTable('students', mockStudents);
  }
}

