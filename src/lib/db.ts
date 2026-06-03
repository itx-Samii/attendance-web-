import dns from 'dns';
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
  try {
    const dnsPromises = require('dns').promises;
    if (dnsPromises && dnsPromises.setServers) {
      dnsPromises.setServers(['1.1.1.1', '8.8.8.8']);
    }
  } catch {}
  try {
    const dnsPromisesNode = require('node:dns/promises');
    if (dnsPromisesNode && dnsPromisesNode.setServers) {
      dnsPromisesNode.setServers(['1.1.1.1', '8.8.8.8']);
    }
  } catch {}
  console.log('[DNS] Forced DNS resolution to Cloudflare & Google public servers.');
} catch (e: any) {
  console.warn('[DNS] Could not override DNS servers:', e.message);
}

import fs from 'fs/promises';
import path from 'path';
import { MongoClient, Db } from 'mongodb';

const DATA_DIR = path.join(process.cwd(), 'data');
const tableCache = new Map<string, any[]>();

export function clearTableCache(tableName: string) {
  tableCache.delete(tableName);
}

export function clearAllTableCaches() {
  tableCache.clear();
}

// ── MongoDB Caching & Singleton Connection ────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __mongoDb: Db | undefined;
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<Db | null> | undefined;
  // eslint-disable-next-line no-var
  var __mongoConnectionFailed: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mongoLastAttemptTime: number | undefined;
  // eslint-disable-next-line no-var
  var __dbInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __dbInitializingPromise: Promise<void> | undefined;
}

async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (global.__mongoDb) return global.__mongoDb;

  // If connection failed recently, avoid blocking and fallback to local JSON immediately
  const now = Date.now();
  if (global.__mongoConnectionFailed && global.__mongoLastAttemptTime && (now - global.__mongoLastAttemptTime < 30000)) {
    return null;
  }

  if (global.__mongoClientPromise) {
    return global.__mongoClientPromise;
  }

  global.__mongoLastAttemptTime = now;
  global.__mongoClientPromise = (async () => {
    try {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 2000, // Reduced to 2s for faster offline fallback
      });
      await client.connect();
      const db = client.db('aura_attendance');
      global.__mongoClient = client;
      global.__mongoDb = db;
      global.__mongoConnectionFailed = false;
      console.log('[MongoDB] Connected successfully');
      return db;
    } catch (error) {
      console.error('[MongoDB] Connection failed, falling back to local files:', error);
      global.__mongoConnectionFailed = true;
      global.__mongoClientPromise = undefined; // clear so we can retry later
      return null;
    }
  })();

  return global.__mongoClientPromise;
}

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
 * Reads a database table.
 * If MongoDB is active, retrieves it from the MongoDB collection.
 * Otherwise, falls back to the local JSON file.
 * @param tableName The filename of the table (without path/extension, e.g. 'classes')
 */
export async function readTable<T>(tableName: string): Promise<T[]> {
  try {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      const collection = mongoDb.collection(tableName);
      const docs = await collection.find({}).toArray();
      // Remove _id from document mapping to prevent type mismatch with T[]
      return docs.map((d) => {
        const { _id, ...rest } = d;
        return rest;
      }) as any as T[];
    }
  } catch (error) {
    console.error(`[MongoDB] Error reading table "${tableName}":`, error);
  }

  // Fallback to local JSON files
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  await ensureFileExists(filePath);

  const cached = tableCache.get(tableName);
  if (cached) {
    return structuredClone(cached) as T[];
  }
  
  try {
    const rawData = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(rawData) as T[];
    tableCache.set(tableName, parsed);
    return structuredClone(parsed) as T[];
  } catch (error) {
    console.error(`Error reading database table "${tableName}":`, error);
    return [];
  }
}

/**
 * Writes an array of records to a database table.
 * If MongoDB is active, deletes all documents in the collection and inserts the new records.
 * Otherwise, falls back to local JSON atomic write files.
 * @param tableName The filename of the table (without path/extension, e.g. 'classes')
 * @param data The array of data to write
 */
export async function writeTable<T>(tableName: string, data: T[]): Promise<void> {
  try {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      const collection = mongoDb.collection(tableName);
      await collection.deleteMany({});
      if (data.length > 0) {
        await collection.insertMany(data as any);
      }
      return;
    }
  } catch (error) {
    console.error(`[MongoDB] Error writing table "${tableName}":`, error);
    throw error;
  }

  // Fallback to local JSON files
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  const tempPath = path.join(DATA_DIR, `${tableName}.json.tmp`);
  
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  try {
    const serializedData = JSON.stringify(data, null, 2);
    // 1. Write data to a temporary file
    await fs.writeFile(tempPath, serializedData, 'utf8');
    // 2. Atomically rename/replace the target file (guarantees safe write operations)
    await fs.rename(tempPath, filePath);
    tableCache.set(tableName, structuredClone(data));
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
 * Initialize all core tables and seed default mock values if empty.
 * Compatible with both MongoDB Atlas and local file-based database.
 */
export async function initDatabase(): Promise<void> {
  const isJestUnitTest = process.env.NODE_ENV === 'test';

  if (!isJestUnitTest) {
    if (global.__dbInitialized) return;
    if (global.__dbInitializingPromise) return global.__dbInitializingPromise;
  }

  let resolveInit: () => void = () => {};
  let rejectInit: (err: any) => void = () => {};
  if (!isJestUnitTest) {
    global.__dbInitializingPromise = new Promise<void>((resolve, reject) => {
      resolveInit = resolve;
      rejectInit = reject;
    });
  }

  try {
    // 1. Try to connect to MongoDB if URI is active
  try {
    const mongoDb = await getMongoDb();
    if (mongoDb) {
      const isDevOrProd = !isJestUnitTest;

      if (isDevOrProd) {
        // Seeding Schools
        const schoolsCol = mongoDb.collection('schools');
        const schoolsCount = await schoolsCol.countDocuments({});
        if (schoolsCount === 0) {
          const defaultSchool = {
            schoolId: 'school-aura',
            schoolName: 'Aura Attendance ERP',
            principalEmail: 'admin@aura.edu',
            status: 'active',
            createdAt: new Date().toISOString(),
            useSimulator: true,
            whatsappEnabled: false,
            smsTemplate: 'Dear Parent, your child {name} (Roll: {roll}) was marked Absent from class {class} on {date}. Please contact the school office.',
            licenseKey: 'AURA-ENT-ACTIVE-9999-XXXX-2026',
            licenseStatus: 'Active',
            licenseExpiry: '2027-12-31',
            licenseLimitClasses: 25,
          };
          await schoolsCol.insertOne(defaultSchool);
        }

        // Seeding Classes
        const classesCol = mongoDb.collection('classes');
        const classesCount = await classesCol.countDocuments({});
        if (classesCount === 0) {
          const mockClasses = [
            { classId: '9a', name: 'Grade 9 - Section A', schoolId: 'school-aura' },
            { classId: '9b', name: 'Grade 9 - Section B', schoolId: 'school-aura' },
            { classId: '10a', name: 'Grade 10 - Section A', schoolId: 'school-aura' },
            { classId: '10b', name: 'Grade 10 - Section B', schoolId: 'school-aura' }
          ];
          await classesCol.insertMany(mockClasses);
        }

        // Seeding Students
        const studentsCol = mongoDb.collection('students');
        const studentsCount = await studentsCol.countDocuments({});
        if (studentsCount === 0) {
          const mockStudents = [
            // 9A Students
            { rollNumber: '9A-01', name: 'Aiden Smith', parentPhone: '+15550100001', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-02', name: 'Bella Johnson', parentPhone: '+15550100002', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-03', name: 'Carter Davis', parentPhone: '+15550100003', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-04', name: 'Diana Miller', parentPhone: '+15550100004', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-05', name: 'Ethan Wilson', parentPhone: '+15550100005', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-06', name: 'Fiona Taylor', parentPhone: '+15550100006', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-07', name: 'George Anderson', parentPhone: '+15550100007', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-08', name: 'Hannah Thomas', parentPhone: '+15550100008', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-09', name: 'Ian Jackson', parentPhone: '+15550100009', classId: '9a', schoolId: 'school-aura' },
            { rollNumber: '9A-10', name: 'Julia White', parentPhone: '+15550100010', classId: '9a', schoolId: 'school-aura' },

            // 9B Students
            { rollNumber: '9B-01', name: 'Kevin Harris', parentPhone: '+15550100011', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-02', name: 'Lily Martin', parentPhone: '+15550100012', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-03', name: 'Mason Thompson', parentPhone: '+15550100013', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-04', name: 'Nora Garcia', parentPhone: '+15550100014', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-05', name: 'Oliver Martinez', parentPhone: '+15550100015', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-06', name: 'Penelope Robinson', parentPhone: '+15550100016', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-07', name: 'Quinn Clark', parentPhone: '+15550100017', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-08', name: 'Ruby Rodriguez', parentPhone: '+15550100018', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-09', name: 'Samuel Lewis', parentPhone: '+15550100019', classId: '9b', schoolId: 'school-aura' },
            { rollNumber: '9B-10', name: 'Tara Lee', parentPhone: '+15550100020', classId: '9b', schoolId: 'school-aura' },

            // 10A Students
            { rollNumber: '10A-01', name: 'Uma Patel', parentPhone: '+15550100021', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-02', name: 'Victor Walker', parentPhone: '+15550100022', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-03', name: 'Wendy Hall', parentPhone: '+15550100023', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-04', name: 'Xavier Allen', parentPhone: '+15550100024', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-05', name: 'Yara Young', parentPhone: '+15550100025', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-06', name: 'Zachary King', parentPhone: '+15550100026', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-07', name: 'Alice Wright', parentPhone: '+15550100027', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-08', name: 'Benjamin Lopez', parentPhone: '+15550100028', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-09', name: 'Chloe Hill', parentPhone: '+15550100029', classId: '10a', schoolId: 'school-aura' },
            { rollNumber: '10A-10', name: 'Daniel Scott', parentPhone: '+15550100030', classId: '10a', schoolId: 'school-aura' },

            // 10B Students
            { rollNumber: '10B-01', name: 'Emily Green', parentPhone: '+15550100031', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-02', name: 'Felix Adams', parentPhone: '+15550100032', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-03', name: 'Grace Baker', parentPhone: '+15550100033', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-04', name: 'Henry Gonzalez', parentPhone: '+15550100034', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-05', name: 'Ivy Nelson', parentPhone: '+15550100035', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-06', name: 'Jack Carter', parentPhone: '+15550100036', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-07', name: 'Katherine Mitchell', parentPhone: '+15550100037', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-08', name: 'Logan Perez', parentPhone: '+15550100038', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-09', name: 'Mia Roberts', parentPhone: '+15550100039', classId: '10b', schoolId: 'school-aura' },
            { rollNumber: '10B-10', name: 'Noah Turner', parentPhone: '+15550100040', classId: '10b', schoolId: 'school-aura' }
          ];
          await studentsCol.insertMany(mockStudents);
        }

        // Seeding Users
        const usersCol = mongoDb.collection('users');
        const usersCount = await usersCol.countDocuments({});
        if (usersCount === 0) {
          const defaultUsers = [
            {
              email: 'superadmin@aura.edu',
              password: 'SuperAdmin123!',
              name: 'Platform Super Admin',
              role: 'superadmin'
            },
            {
              email: 'admin@aura.edu',
              password: 'Admin123!',
              name: 'Principal Aura',
              role: 'admin',
              schoolId: 'school-aura'
            }
          ];
          await usersCol.insertMany(defaultUsers);
        } else {
          // If users exist, ensure superadmin is present
          const hasSuperAdmin = await usersCol.findOne({ role: 'superadmin' });
          if (!hasSuperAdmin) {
            await usersCol.insertOne({
              email: 'superadmin@aura.edu',
              password: 'SuperAdmin123!',
              name: 'Platform Super Admin',
              role: 'superadmin'
            });
          }
        }
      }
      if (!isJestUnitTest) {
        global.__dbInitialized = true;
        resolveInit();
      }
      return;
    }
  } catch (error) {
    console.warn('[MongoDB] Init database failed, falling back to local files:', error);
  }

  // Legacy local file initialization
  const tables = isJestUnitTest
    ? ['classes', 'students']
    : ['schools', 'users', 'classes', 'students', 'attendance', 'notifications', 'settings'];

  for (const table of tables) {
    const filePath = path.join(DATA_DIR, `${table}.json`);
    await ensureFileExists(filePath);
  }

  // 1. Migrate & Seed Schools
  if (!isJestUnitTest) {
    const schools = await readTable<any>('schools');
    if (schools.length === 0) {
      // Read old settings to preserve the school name if possible
      let oldSettings: any = {};
      try {
        const settings = await readTable<any>('settings');
        if (settings.length > 0) {
          oldSettings = settings[0];
        }
      } catch {}

      const defaultSchool = {
        schoolId: 'school-aura',
        schoolName: oldSettings.schoolName || 'Aura Attendance ERP',
        principalEmail: 'admin@aura.edu',
        status: 'active',
        createdAt: new Date().toISOString(),
        useSimulator: oldSettings.useSimulator !== undefined ? oldSettings.useSimulator : true,
        whatsappEnabled: oldSettings.whatsappEnabled !== undefined ? oldSettings.whatsappEnabled : false,
        smsTemplate: oldSettings.smsTemplate || 'Dear Parent, your child {name} (Roll: {roll}) was marked Absent from class {class} on {date}. Please contact the school office.',
        licenseKey: oldSettings.licenseKey || 'AURA-ENT-ACTIVE-9999-XXXX-2026',
        licenseStatus: oldSettings.licenseStatus || 'Active',
        licenseExpiry: oldSettings.licenseExpiry || '2027-12-31',
        licenseLimitClasses: oldSettings.licenseLimitClasses || 25,
      };
      await writeTable('schools', [defaultSchool]);
    }
  }

  // 2. Seed / Migrate classes
  const classes = await readTable<any>('classes');
  let classesChanged = false;
  if (classes.length === 0) {
    const mockClasses = [
      { classId: '9a', name: 'Grade 9 - Section A', schoolId: 'school-aura' },
      { classId: '9b', name: 'Grade 9 - Section B', schoolId: 'school-aura' },
      { classId: '10a', name: 'Grade 10 - Section A', schoolId: 'school-aura' },
      { classId: '10b', name: 'Grade 10 - Section B', schoolId: 'school-aura' }
    ];
    await writeTable('classes', mockClasses);
  } else {
    if (!isJestUnitTest) {
      const migrated = classes.map((c: any) => {
        if (!c.schoolId) {
          classesChanged = true;
          return { ...c, schoolId: 'school-aura' };
        }
        return c;
      });
      if (classesChanged) {
        await writeTable('classes', migrated);
      }
    }
  }

  // 3. Seed / Migrate students
  const students = await readTable<any>('students');
  let studentsChanged = false;
  if (students.length === 0) {
    const mockStudents = [
      // 9A Students
      { rollNumber: '9A-01', name: 'Aiden Smith', parentPhone: '+15550100001', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-02', name: 'Bella Johnson', parentPhone: '+15550100002', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-03', name: 'Carter Davis', parentPhone: '+15550100003', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-04', name: 'Diana Miller', parentPhone: '+15550100004', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-05', name: 'Ethan Wilson', parentPhone: '+15550100005', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-06', name: 'Fiona Taylor', parentPhone: '+15550100006', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-07', name: 'George Anderson', parentPhone: '+15550100007', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-08', name: 'Hannah Thomas', parentPhone: '+15550100008', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-09', name: 'Ian Jackson', parentPhone: '+15550100009', classId: '9a', schoolId: 'school-aura' },
      { rollNumber: '9A-10', name: 'Julia White', parentPhone: '+15550100010', classId: '9a', schoolId: 'school-aura' },

      // 9B Students
      { rollNumber: '9B-01', name: 'Kevin Harris', parentPhone: '+15550100011', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-02', name: 'Lily Martin', parentPhone: '+15550100012', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-03', name: 'Mason Thompson', parentPhone: '+15550100013', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-04', name: 'Nora Garcia', parentPhone: '+15550100014', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-05', name: 'Oliver Martinez', parentPhone: '+15550100015', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-06', name: 'Penelope Robinson', parentPhone: '+15550100016', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-07', name: 'Quinn Clark', parentPhone: '+15550100017', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-08', name: 'Ruby Rodriguez', parentPhone: '+15550100018', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-09', name: 'Samuel Lewis', parentPhone: '+15550100019', classId: '9b', schoolId: 'school-aura' },
      { rollNumber: '9B-10', name: 'Tara Lee', parentPhone: '+15550100020', classId: '9b', schoolId: 'school-aura' },

      // 10A Students
      { rollNumber: '10A-01', name: 'Uma Patel', parentPhone: '+15550100021', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-02', name: 'Victor Walker', parentPhone: '+15550100022', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-03', name: 'Wendy Hall', parentPhone: '+15550100023', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-04', name: 'Xavier Allen', parentPhone: '+15550100024', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-05', name: 'Yara Young', parentPhone: '+15550100025', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-06', name: 'Zachary King', parentPhone: '+15550100026', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-07', name: 'Alice Wright', parentPhone: '+15550100027', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-08', name: 'Benjamin Lopez', parentPhone: '+15550100028', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-09', name: 'Chloe Hill', parentPhone: '+15550100029', classId: '10a', schoolId: 'school-aura' },
      { rollNumber: '10A-10', name: 'Daniel Scott', parentPhone: '+15550100030', classId: '10a', schoolId: 'school-aura' },

      // 10B Students
      { rollNumber: '10B-01', name: 'Emily Green', parentPhone: '+15550100031', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-02', name: 'Felix Adams', parentPhone: '+15550100032', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-03', name: 'Grace Baker', parentPhone: '+15550100033', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-04', name: 'Henry Gonzalez', parentPhone: '+15550100034', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-05', name: 'Ivy Nelson', parentPhone: '+15550100035', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-06', name: 'Jack Carter', parentPhone: '+15550100036', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-07', name: 'Katherine Mitchell', parentPhone: '+15550100037', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-08', name: 'Logan Perez', parentPhone: '+15550100038', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-09', name: 'Mia Roberts', parentPhone: '+15550100039', classId: '10b', schoolId: 'school-aura' },
      { rollNumber: '10B-10', name: 'Noah Turner', parentPhone: '+15550100040', classId: '10b', schoolId: 'school-aura' }
    ];
    await writeTable('students', mockStudents);
  } else {
    if (!isJestUnitTest) {
      const migrated = students.map((s: any) => {
        if (!s.schoolId) {
          studentsChanged = true;
          return { ...s, schoolId: 'school-aura' };
        }
        return s;
      });
      if (studentsChanged) {
        await writeTable('students', migrated);
      }
    }
  }

  // 4. Seed / Migrate users
  if (!isJestUnitTest) {
    const users = await readTable<any>('users');
    let usersChanged = false;
    let updatedUsers = [...users];

    // Make sure superadmin exists
    const hasSuperAdmin = users.some((u: any) => u.role === 'superadmin');
    if (!hasSuperAdmin) {
      updatedUsers.push({
        email: 'superadmin@aura.edu',
        password: 'SuperAdmin123!',
        name: 'Platform Super Admin',
        role: 'superadmin'
      });
      usersChanged = true;
    }

    const migratedUsers = updatedUsers.map((u: any) => {
      if (u.role !== 'superadmin' && !u.schoolId) {
        usersChanged = true;
        return { ...u, schoolId: 'school-aura' };
      }
      return u;
    });

    if (usersChanged) {
      await writeTable('users', migratedUsers);
    }
  }

  // 5. Migrate attendance records
  if (!isJestUnitTest) {
    const attendance = await readTable<any>('attendance');
    let attendanceChanged = false;
    const migratedAttendance = attendance.map((a: any) => {
      if (!a.schoolId) {
        attendanceChanged = true;
        return { ...a, schoolId: 'school-aura' };
      }
      return a;
    });
    if (attendanceChanged) {
      await writeTable('attendance', migratedAttendance);
    }
  }

  // 6. Migrate notifications
  if (!isJestUnitTest) {
    const notifications = await readTable<any>('notifications');
    let notificationsChanged = false;
    const migratedNotifications = notifications.map((n: any) => {
      if (!n.schoolId) {
        notificationsChanged = true;
        return { ...n, schoolId: 'school-aura' };
      }
      return n;
    });
    if (notificationsChanged) {
      await writeTable('notifications', migratedNotifications);
    }
  }

    if (!isJestUnitTest) {
      global.__dbInitialized = true;
      resolveInit();
    }
  } catch (error) {
    if (!isJestUnitTest) {
      global.__dbInitializingPromise = undefined;
      rejectInit(error);
    }
    throw error;
  }
}
