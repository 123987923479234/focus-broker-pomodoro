import type { PomodoroRecord } from '../types/pomodoro';

const DB_NAME = 'luxury-pomodoro-db';
const DB_VERSION = 1;
const STORE_NAME = 'records';

let dbPromise: Promise<IDBDatabase> | null = null;

function openPomodoroDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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

  return dbPromise;
}

function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openPomodoroDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const request = run(tx.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function savePomodoroRecord(record: PomodoroRecord) {
  await transaction('readwrite', (store) => store.put(record));
}

export async function listPomodoroRecords() {
  const records = await transaction<PomodoroRecord[]>('readonly', (store) => store.getAll());
  return records.sort((a, b) => b.endedAt - a.endedAt);
}

export async function clearPomodoroRecords() {
  await transaction('readwrite', (store) => store.clear());
}
