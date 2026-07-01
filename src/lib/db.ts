import type { PomodoroRecord } from '../types/pomodoro';

const DB_NAME = 'focus-broker-db';
const LEGACY_DB_NAME = ['lux', 'ury-pomodoro-db'].join('');
const DB_VERSION = 1;
const STORE_NAME = 'records';

let dbPromise: Promise<IDBDatabase> | null = null;
let legacyMigrationPromise: Promise<void> | null = null;

function openNamedDB(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('endedAt', 'endedAt');
        store.createIndex('category', 'task.category');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openPomodoroDB() {
  if (dbPromise) return dbPromise;
  dbPromise = openNamedDB(DB_NAME);
  return dbPromise;
}

function transaction<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function batchTransaction(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => void) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    run(tx.objectStore(STORE_NAME));
  });
}

async function migrateLegacyRecordsIfNeeded() {
  if (legacyMigrationPromise) return legacyMigrationPromise;
  legacyMigrationPromise = (async () => {
    const db = await openPomodoroDB();
    const existing = await transaction<PomodoroRecord[]>(db, 'readonly', (store) => store.getAll());
    if (existing.length > 0) return;

    try {
      const legacyDb = await openNamedDB(LEGACY_DB_NAME);
      const legacyRecords = await transaction<PomodoroRecord[]>(legacyDb, 'readonly', (store) => store.getAll());
      if (legacyRecords.length) await savePomodoroRecords(legacyRecords);
      legacyDb.close();
    } catch {
      // 旧测试版数据库不存在或不可读时，直接使用新的 Focus Broker 数据库。
    }
  })();
  return legacyMigrationPromise;
}

export async function savePomodoroRecord(record: PomodoroRecord) {
  const db = await openPomodoroDB();
  await transaction(db, 'readwrite', (store) => store.put(record));
}

export async function listPomodoroRecords() {
  await migrateLegacyRecordsIfNeeded();
  const db = await openPomodoroDB();
  const records = await transaction<PomodoroRecord[]>(db, 'readonly', (store) => store.getAll());
  return records.sort((a, b) => b.endedAt - a.endedAt);
}

export async function savePomodoroRecords(records: PomodoroRecord[]) {
  if (!records.length) return;
  const db = await openPomodoroDB();
  await batchTransaction(db, 'readwrite', (store) => {
    for (const record of records) store.put(record);
  });
}

export async function replacePomodoroRecords(records: PomodoroRecord[]) {
  const db = await openPomodoroDB();
  await batchTransaction(db, 'readwrite', (store) => {
    store.clear();
    for (const record of records) store.put(record);
  });
}

export async function clearPomodoroRecords() {
  const db = await openPomodoroDB();
  await transaction(db, 'readwrite', (store) => store.clear());
  try {
    const legacyDb = await openNamedDB(LEGACY_DB_NAME);
    await transaction(legacyDb, 'readwrite', (store) => store.clear());
    legacyDb.close();
  } catch {
    // 清理兼容库失败不影响当前数据库。
  }
}
