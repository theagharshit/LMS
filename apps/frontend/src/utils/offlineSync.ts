type QueuedRequest = { id?: number; url: string; options: RequestInit; createdAt: string };
import { toast } from './toast';
const DB_NAME = 'sikshya-offline';
const STORE_NAME = 'pending-requests';

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineRequest(url: string, options: RequestInit) {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).add({
      url,
      options: {
        ...options,
        headers: Object.fromEntries(new Headers(options.headers).entries()),
      },
      createdAt: new Date().toISOString(),
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function flushOfflineRequests(fetcher: typeof fetch = fetch) {
  const database = await openDatabase();
  if (!database) return 0;
  const entries = await new Promise<QueuedRequest[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  let synced = 0;
  for (const entry of entries) {
    try {
      const response = await fetcher(entry.url, entry.options);
      if (!response.ok) continue;
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(entry.id!);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      synced += 1;
    } catch {
      break;
    }
  }
  database.close();
  return synced;
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () =>
    toast.warning('You can keep working. Supported changes will be queued until you reconnect.', {
      title: 'You are offline',
      id: 'connection-status',
    }),
  );
  window.addEventListener('online', () => {
    void flushOfflineRequests().then((synced) => {
      if (synced > 0)
        toast.success(`${synced} queued ${synced === 1 ? 'change' : 'changes'} synced.`, {
          title: 'Back online',
          id: 'connection-status',
        });
      else
        toast.info('Your connection has been restored.', {
          title: 'Back online',
          id: 'connection-status',
        });
    });
  });
}
