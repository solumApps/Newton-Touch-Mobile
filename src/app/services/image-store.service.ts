import { Injectable } from '@angular/core';

const DB_NAME = 'nt-images';
const STORE = 'blobs';

/** IndexedDB-backed store for large image/video data URIs.
 *
 *  @capacitor/preferences is localStorage-backed (~5 MB quota) — stuffing
 *  base64 media into one JSON string throws QuotaExceededError fast. Drafts /
 *  themes therefore persist tiny `idb:<id>` refs and the actual data URIs live
 *  here (IndexedDB: hundreds of MB, works in browser AND Capacitor webview).
 *
 *  Ids are content-hashes, so storing the same image twice dedupes for free.
 *  Ids are namespaced (`c_…` content, `t_…` themes) so each owner can gc its
 *  own keys without touching the other's. */
@Injectable({ providedIn: 'root' })
export class ImageStoreService {
  private dbPromise?: Promise<IDBDatabase>;
  /** data URI → content hash. Avoids re-running SHA-1 over multi-MB media every
   *  time an unchanged draft/theme is re-persisted (the delete/save jank). Keyed
   *  by the exact string instance already held in the cached records, so it costs
   *  a pointer, not a second copy of the media. Namespace-independent (the hash is
   *  the same for `c_`/`t_`; only the prefix differs). */
  private hashByData = new Map<string, string>();
  /** ids known to currently exist in IndexedDB — lets `put` skip the write for a
   *  blob that is already stored (kept in sync by get/delete/gc). */
  private stored = new Set<string>();

  /** Store a data URI; returns its id (hash-based → automatic dedupe). Re-hashing
   *  and the IndexedDB write are both skipped when the value was seen before. */
  async put(dataUri: string, ns: string = 'c'): Promise<string> {
    let h = this.hashByData.get(dataUri);
    if (h === undefined) { h = await this.hash(dataUri); this.hashByData.set(dataUri, h); }
    const id = `${ns}_${h}`;
    if (!this.stored.has(id)) {
      const db = await this.open();
      await this.req(db.transaction(STORE, 'readwrite').objectStore(STORE).put(dataUri, id));
      this.stored.add(id);
    }
    return id;
  }

  async get(id: string): Promise<string | undefined> {
    const db = await this.open();
    const v = await this.req<string | undefined>(db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
    if (v !== undefined && typeof v === 'string') {
      // Seed the caches so the next persist of this data URI neither re-hashes nor
      // re-writes it. id is `${ns}_${hash}`; ns is a single token (no underscore).
      this.stored.add(id);
      this.hashByData.set(v, id.slice(id.indexOf('_') + 1));
    }
    return v ?? undefined;
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    await this.req(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
    this.stored.delete(id);
  }

  /** Delete every blob in namespace `ns` whose id is not in `liveIds`. */
  async gc(liveIds: Set<string>, ns: string = 'c'): Promise<void> {
    const db = await this.open();
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    const keys = await this.req<IDBValidKey[]>(store.getAllKeys());
    for (const k of keys) {
      if (typeof k !== 'string' || !k.startsWith(`${ns}_`)) continue;
      if (liveIds.has(k)) { this.stored.add(k); }
      else { store.delete(k); this.stored.delete(k); }
    }
  }

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }
    return this.dbPromise;
  }

  private req<T = unknown>(r: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  /** SHA-1 of the string via SubtleCrypto; FNV-1a fallback (insecure context). */
  private async hash(s: string): Promise<string> {
    if (crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return `${(h >>> 0).toString(16)}_${s.length}`;
  }
}
