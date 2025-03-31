export type KeyValueStore<T> = {
  get: (key: string) => Promise<T | undefined>;
  set: (key: string, value: T) => Promise<void>;
  update: (key: string, updater: (value: T | undefined) => T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  getMany: (keys: string[]) => Promise<(T | undefined)[]>;
  setMany: (keyValuePairs: [string, T][]) => Promise<void>;
  updateMany: (
    keyValuePairs: [string, (value: T | undefined) => T][]
  ) => Promise<void>;
  deleteMany: (keys: string[]) => Promise<void>;
  getAll: () => Promise<T[]>;
  clear: () => Promise<void>;
};

export class InMemoryKeyValueStore<T> implements KeyValueStore<T> {
  private store: Map<string, T>;

  constructor() {
    this.store = new Map<string, T>();
  }

  async get(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: T) {
    this.store.set(key, value);
  }

  async update(key: string, updater: (value: T | undefined) => T) {
    const value = this.store.get(key);
    const newValue = updater(value);
    this.store.set(key, newValue);
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async getMany(keys: string[]) {
    return keys.map((key) => this.store.get(key));
  }

  async setMany(keyValuePairs: [string, T][]) {
    keyValuePairs.forEach(([key, value]) => this.store.set(key, value));
  }

  async updateMany(keyValuePairs: [string, (value: T | undefined) => T][]) {
    keyValuePairs.forEach(([key, updater]) => {
      const value = this.store.get(key);
      const newValue = updater(value);
      this.store.set(key, newValue);
    });
  }

  async deleteMany(keys: string[]) {
    keys.forEach((key) => this.store.delete(key));
  }

  async getAll() {
    return Array.from(this.store.values());
  }

  async clear() {
    this.store.clear();
  }
}

export class SessionStorageKeyValueStore<T> implements KeyValueStore<T> {
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

  async get(key: string) {
    return this._getValue(this._getKey(key));
  }

  async set(key: string, value: T) {
    sessionStorage.setItem(this._getKey(key), this.serializer(value));
  }

  async update(key: string, updater: (value: T | undefined) => T) {
    const value = this._getValue(this._getKey(key));
    const newValue = updater(value);
    sessionStorage.setItem(this._getKey(key), this.serializer(newValue));
  }

  async delete(key: string) {
    sessionStorage.removeItem(this._getKey(key));
  }

  async getMany(keys: string[]) {
    return keys.map((key) => this._getValue(this._getKey(key)));
  }

  async setMany(keyValuePairs: [string, T][]) {
    keyValuePairs.forEach(([key, value]) => {
      sessionStorage.setItem(this._getKey(key), this.serializer(value));
    });
  }

  async updateMany(keyValuePairs: [string, (value: T | undefined) => T][]) {
    keyValuePairs.forEach(([key, updater]) => {
      const value = this._getValue(this._getKey(key));
      const newValue = updater(value);
      sessionStorage.setItem(this._getKey(key), this.serializer(newValue));
    });
  }

  async deleteMany(keys: string[]) {
    keys.forEach((key) => sessionStorage.removeItem(this._getKey(key)));
  }
  async getAll() {
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

  async clear() {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.storeName)) {
        sessionStorage.removeItem(key);
      }
    }
  }
}

export class IDBKeyValueStore<T> implements KeyValueStore<T> {
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
