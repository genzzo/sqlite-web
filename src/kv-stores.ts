export type SyncKeyValueStore<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  update: (key: string, updater: (value: T | undefined) => T) => void;
  delete: (key: string) => void;
  getMany: (keys: string[]) => (T | undefined)[];
  setMany: (keyValuePairs: [string, T][]) => void;
  updateMany: (keyValuePairs: [string, (value: T | undefined) => T][]) => void;
  deleteMany: (keys: string[]) => void;
  getAll: () => T[];
  clear: () => void;
};

export type AsyncKeyValueStore<T> = {
  [K in keyof SyncKeyValueStore<T>]: SyncKeyValueStore<T>[K] extends (
    ...args: infer Args
  ) => infer R
    ? (...args: Args) => Promise<R>
    : never;
};

/**
 * @deprecated do not use it's just for experimentation
 */
export type CustomSyncKeyValueStore<
  T,
  MethodsMapping extends Partial<{
    [K in keyof SyncKeyValueStore<T>]: "sync" | "async" | "both";
  }> = {}
> = {
  [K in keyof SyncKeyValueStore<T>]: SyncKeyValueStore<T>[K] extends (
    ...args: infer Args
  ) => infer R
    ? MethodsMapping[K] extends "both"
      ? (...args: Args) => Promise<R> | R
      : MethodsMapping[K] extends "async"
      ? (...args: Args) => Promise<R>
      : (...args: Args) => R
    : never;
};

export type KeyValueStore<T> = SyncKeyValueStore<T> | AsyncKeyValueStore<T>;

export class InMemoryKeyValueStore<T> implements SyncKeyValueStore<T> {
  private store: Map<string, T>;

  constructor() {
    this.store = new Map<string, T>();
  }

  get(key: string): T | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T) {
    this.store.set(key, value);
  }

  update(key: string, updater: (value: T | undefined) => T) {
    const value = this.store.get(key);
    const newValue = updater(value);
    this.store.set(key, newValue);
  }

  delete(key: string) {
    this.store.delete(key);
  }

  getMany(keys: string[]) {
    return keys.map((key) => this.store.get(key));
  }

  setMany(keyValuePairs: [string, T][]) {
    keyValuePairs.forEach(([key, value]) => this.store.set(key, value));
  }

  updateMany(keyValuePairs: [string, (value: T | undefined) => T][]) {
    keyValuePairs.forEach(([key, updater]) => {
      const value = this.store.get(key);
      const newValue = updater(value);
      this.store.set(key, newValue);
    });
  }

  deleteMany(keys: string[]) {
    keys.forEach((key) => this.store.delete(key));
  }

  getAll() {
    return Array.from(this.store.values());
  }

  clear() {
    this.store.clear();
  }
}

export class SessionStorageKeyValueStore<T> implements SyncKeyValueStore<T> {
  private readonly storeName: string;
  private serializer: (value: T) => string;
  private deserializer: (value: string) => T;

  constructor(
    storeName: string,
    options?: {
      serializer?: (value: T) => string;
      deserializer?: (value: string) => T;
    }
  ) {
    this.storeName = storeName;
    this.serializer = options?.serializer || JSON.stringify;
    this.deserializer = options?.deserializer || JSON.parse;
  }

  private _getKey(baseKey: string) {
    return `${this.storeName}:${baseKey}`;
  }

  private _getValue(key: string): T | undefined {
    const value = sessionStorage.getItem(key);
    return value ? this.deserializer(value) : undefined;
  }

  get(key: string) {
    return this._getValue(this._getKey(key));
  }

  set(key: string, value: T) {
    sessionStorage.setItem(this._getKey(key), this.serializer(value));
  }

  update(key: string, updater: (value: T | undefined) => T) {
    const value = this._getValue(this._getKey(key));
    const newValue = updater(value);
    sessionStorage.setItem(this._getKey(key), this.serializer(newValue));
  }

  delete(key: string) {
    sessionStorage.removeItem(this._getKey(key));
  }

  getMany(keys: string[]) {
    return keys.map((key) => this._getValue(this._getKey(key)));
  }

  setMany(keyValuePairs: [string, T][]) {
    keyValuePairs.forEach(([key, value]) => {
      sessionStorage.setItem(this._getKey(key), this.serializer(value));
    });
  }

  updateMany(keyValuePairs: [string, (value: T | undefined) => T][]) {
    keyValuePairs.forEach(([key, updater]) => {
      const value = this._getValue(this._getKey(key));
      const newValue = updater(value);
      sessionStorage.setItem(this._getKey(key), this.serializer(newValue));
    });
  }

  deleteMany(keys: string[]) {
    keys.forEach((key) => sessionStorage.removeItem(this._getKey(key)));
  }
  getAll() {
    const allValues: T[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.storeName)) {
        const value = this._getValue(key);
        if (value) allValues.push(value);
      }
    }
    return allValues;
  }

  clear() {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.storeName)) {
        sessionStorage.removeItem(key);
      }
    }
  }
}

export class IDBKeyValueStore<T> implements AsyncKeyValueStore<T> {
  private readonly dbName: string;
  private readonly storeName: string;
  private ready: Promise<void>;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.ready = new Promise(() => {});
    this._initDB();
  }

  private static _promisifyRequest<T = undefined>(
    request: IDBRequest<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (request instanceof IDBTransaction) {
        request.oncomplete = () => resolve(null as unknown as T);
        request.onerror = () => reject(request.error);
        return;
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async _initDB() {
    if (this.db) return;

    const request = indexedDB.open(this.dbName);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore(this.storeName);
    };

    this.db = await IDBKeyValueStore._promisifyRequest(request);
    this.ready = Promise.resolve();
  }

  private async _getTransactionStore(mode: IDBTransactionMode) {
    await this.ready;
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const transaction = this.db.transaction(this.storeName, mode);
    const store = transaction.objectStore(this.storeName);
    return store;
  }

  async get(key: string) {
    const store = await this._getTransactionStore("readonly");
    return IDBKeyValueStore._promisifyRequest<T | undefined>(store.get(key));
  }

  async set(key: string, value: T) {
    const store = await this._getTransactionStore("readwrite");
    const request = store.put(value, key);

    await IDBKeyValueStore._promisifyRequest(request);
  }

  async update(key: string, updater: (value: T | undefined) => T) {
    const store = await this._getTransactionStore("readwrite");
    await new Promise<void>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const value = request.result as T | undefined;
        const newValue = updater(value);
        const updateRequest = store.put(newValue, key);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string) {
    const store = await this._getTransactionStore("readwrite");
    await IDBKeyValueStore._promisifyRequest(store.delete(key));
  }

  async getMany(keys: string[] = []) {
    const store = await this._getTransactionStore("readonly");
    const requests = keys.map((key) =>
      IDBKeyValueStore._promisifyRequest<T>(store.get(key))
    );
    return Promise.all(requests);
  }

  async setMany(keyValuePairs: [string, T][]) {
    const store = await this._getTransactionStore("readwrite");
    const requests = keyValuePairs.map(([key, value]) => store.put(value, key));
    await Promise.all(requests);
  }

  async updateMany(keyValuePairs: [string, (value: T | undefined) => T][]) {
    const store = await this._getTransactionStore("readwrite");
    await Promise.all(
      keyValuePairs.map(
        ([key, updater]) =>
          new Promise<void>((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
              const value = request.result as T | undefined;
              const newValue = updater(value);
              const updateRequest = store.put(newValue, key);
              updateRequest.onsuccess = () => resolve();
              updateRequest.onerror = () => reject(updateRequest.error);
            };
            request.onerror = () => reject(request.error);
          })
      )
    );
  }

  async deleteMany(keys: string[]) {
    const store = await this._getTransactionStore("readwrite");
    const requests = keys.map((key) => store.delete(key));
    await Promise.all(requests);
  }

  async getAll() {
    const store = await this._getTransactionStore("readonly");
    const allValues: T[] = [];
    return new Promise<T[]>((resolve, reject) => {
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          allValues.push(cursor.value);
          cursor.continue();
        } else {
          resolve(allValues);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    const store = await this._getTransactionStore("readwrite");
    await IDBKeyValueStore._promisifyRequest(store.clear());
  }
}
