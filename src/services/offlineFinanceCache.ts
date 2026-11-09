import type { DemoUser } from "@/lib/auth/types";
import type { FinanceSnapshot } from "@/store/financeStore";

const DATABASE_NAME = "finsight-offline";
const DATABASE_VERSION = 1;
const STORE_NAME = "user-snapshots";

interface CachedFinanceData {
  userId: string;
  user: DemoUser;
  snapshot: FinanceSnapshot;
  cachedAt: number;
}

function openCache(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("This browser does not support offline finance storage."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline finance storage."));
    request.onblocked = () => reject(new Error("Offline finance storage is blocked by another open tab."));
  });
}

export async function saveOfflineFinanceData(user: DemoUser, snapshot: FinanceSnapshot): Promise<void> {
  const database = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        userId: user.id,
        user,
        snapshot,
        cachedAt: Date.now(),
      } satisfies CachedFinanceData);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the offline finance snapshot."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline finance snapshot save was aborted."));
    });
  } finally {
    database.close();
  }
}

export async function loadOfflineFinanceData(userId: string): Promise<CachedFinanceData | null> {
  const database = await openCache();
  try {
    return await new Promise<CachedFinanceData | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(userId);
      request.onsuccess = () => resolve((request.result as CachedFinanceData | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read the offline finance snapshot."));
    });
  } finally {
    database.close();
  }
}

export async function deleteOfflineFinanceData(userId: string): Promise<void> {
  const database = await openCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear offline finance storage."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline finance cache deletion was aborted."));
    });
  } finally {
    database.close();
  }
}
