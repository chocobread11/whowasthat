import { openDB } from "idb";

let dbPromise: Promise<any> | null = null;

function initDB() {
  return openDB("people-memory-db", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("tags")) {
      db.createObjectStore("tags", { keyPath: "id" });
      }
    },
  });
}

export function getDb() {
  if (typeof window === "undefined") {
    throw new Error(
      "IndexedDB is not available on the server. Call getDb() from client-side code only."
    );
  }

  if (!dbPromise) dbPromise = initDB();
  return dbPromise;
}

export default getDb;