/**
 * AudioFileStorage manages binary audio file persistence using browser IndexedDB.
 * 
 * Why IndexedDB?
 * 1. localStorage has a strict 5MB quota and only supports strings.
 * 2. Blobs / ArrayBuffers can be several megabytes each (e.g. 5-20MB for an MP3 or WAV).
 * 3. IndexedDB natively supports storing binary Blobs with gigabyte-scale quotas.
 * 4. This cleanly separates binary audio storage from metadata persistence (localStorage),
 *    mirroring the future architecture where Supabase Storage will hold the files and
 *    PostgreSQL/Supabase will hold the metadata.
 */

const DB_NAME = 'untouchable_bard_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class AudioFileStorage {
  /**
   * Store a binary audio file/blob associated with an asset ID
   */
  public static async saveAudioBlob(id: string, blob: Blob): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = { id, blob, updatedAt: Date.now() };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve a stored audio blob by asset ID
   */
  public static async getAudioBlob(id: string): Promise<Blob | null> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result && request.result.blob) {
            resolve(request.result.blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete an audio blob from local storage
   */
  public static async deleteAudioBlob(id: string): Promise<void> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Ignore if database cannot be opened
    }
  }

  /**
   * Clear all audio files from local storage
   */
  public static async clearAll(): Promise<void> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Ignore errors
    }
  }
}
