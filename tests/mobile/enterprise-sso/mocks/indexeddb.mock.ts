/**
 * WS-251: Mobile Enterprise SSO - IndexedDB Mock for Testing
 * Mock IndexedDB operations for enterprise SSO testing
 */

interface MockObjectStore {
  name: string;
  data: Map<string, any>;
  keyPath?: string | string[];
  autoIncrement?: boolean;
  indices: Map<string, { name: string; keyPath: string; unique: boolean }>;
}

interface MockDatabase {
  name: string;
  version: number;
  objectStores: Map<string, MockObjectStore>;
}

class MockIDBRequest {
  result: any = null;
  error: any = null;
  readyState: 'pending' | 'done' = 'pending';
  source: any = null;
  transaction: any = null;
  
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(result?: any, error?: any) {
    if (error) {
      this.error = error;
      setTimeout(() => this.onerror?.(this), 0);
    } else {
      this.result = result;
      this.readyState = 'done';
      setTimeout(() => this.onsuccess?.(this), 0);
    }
  }
}

class MockIDBTransaction {
  mode: 'readonly' | 'readwrite' | 'versionchange' = 'readonly';
  db: MockIDBDatabase;
  objectStoreNames: string[] = [];
  
  oncomplete: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onabort: ((event: any) => void) | null = null;

  constructor(db: MockIDBDatabase, storeNames: string[], mode: 'readonly' | 'readwrite' | 'versionchange') {
    this.db = db;
    this.objectStoreNames = storeNames;
    this.mode = mode;
    
    // Complete transaction after current execution
    setTimeout(() => this.oncomplete?.(this), 0);
  }

  objectStore(name: string) {
    const store = this.db.mockDb.objectStores.get(name);
    if (!store) throw new Error(`Object store '${name}' not found`);
    return new MockIDBObjectStore(store, this);
  }
}

class MockIDBObjectStore {
  store: MockObjectStore;
  transaction: MockIDBTransaction;
  name: string;
  keyPath?: string | string[];
  autoIncrement?: boolean;

  constructor(store: MockObjectStore, transaction: MockIDBTransaction) {
    this.store = store;
    this.transaction = transaction;
    this.name = store.name;
    this.keyPath = store.keyPath;
    this.autoIncrement = store.autoIncrement;
  }

  add(value: any, key?: any) {
    const finalKey = key || this.generateKey(value);
    if (this.store.data.has(finalKey)) {
      return new MockIDBRequest(null, new Error('Key already exists'));
    }
    this.store.data.set(finalKey, value);
    return new MockIDBRequest(finalKey);
  }

  put(value: any, key?: any) {
    const finalKey = key || this.generateKey(value);
    this.store.data.set(finalKey, value);
    return new MockIDBRequest(finalKey);
  }

  get(key: any) {
    const value = this.store.data.get(key);
    return new MockIDBRequest(value);
  }

  getAll(query?: any) {
    return new MockIDBRequest(Array.from(this.store.data.values()));
  }

  delete(key: any) {
    const deleted = this.store.data.delete(key);
    return new MockIDBRequest(deleted);
  }

  clear() {
    this.store.data.clear();
    return new MockIDBRequest(true);
  }

  count() {
    return new MockIDBRequest(this.store.data.size);
  }

  private generateKey(value: any): string {
    if (this.keyPath && typeof this.keyPath === 'string') {
      return value[this.keyPath];
    }
    return Math.random().toString(36).substr(2, 9);
  }
}

class MockIDBDatabase {
  name: string;
  version: number;
  mockDb: MockDatabase;
  
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onversionchange: ((event: any) => void) | null = null;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    this.mockDb = {
      name,
      version,
      objectStores: new Map()
    };
  }

  get objectStoreNames() {
    return Array.from(this.mockDb.objectStores.keys());
  }

  transaction(storeNames: string | string[], mode: 'readonly' | 'readwrite' | 'versionchange' = 'readonly') {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, names, mode);
  }

  close() {
    // Mock close operation
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  onupgradeneeded: ((event: any) => void) | null = null;
  onblocked: ((event: any) => void) | null = null;

  constructor(dbName: string, version: number) {
    const db = new MockIDBDatabase(dbName, version);
    super(db);

    // Simulate upgrade needed for new database
    if (version > 1) {
      setTimeout(() => {
        if (this.onupgradeneeded) {
          this.onupgradeneeded({ target: this, oldVersion: 1, newVersion: version });
        }
      }, 0);
    }
  }
}

// Mock IDBFactory
class MockIDBFactory {
  databases: Map<string, MockDatabase> = new Map();

  open(name: string, version?: number): MockIDBOpenDBRequest {
    return new MockIDBOpenDBRequest(name, version || 1);
  }

  deleteDatabase(name: string) {
    this.databases.delete(name);
    return new MockIDBRequest(true);
  }

  cmp(first: any, second: any): number {
    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
  }
}

// Setup global mocks
const mockIDBFactory = new MockIDBFactory();
global.indexedDB = mockIDBFactory;
global.IDBDatabase = MockIDBDatabase as any;
global.IDBTransaction = MockIDBTransaction as any;
global.IDBRequest = MockIDBRequest as any;
global.IDBObjectStore = MockIDBObjectStore as any;
global.IDBOpenDBRequest = MockIDBOpenDBRequest as any;

// Export utilities for tests
export { mockIDBFactory };

export const createMockObjectStore = (request: any, storeName: string, options?: { keyPath?: string; autoIncrement?: boolean }) => {
  const db = request.result as MockIDBDatabase;
  const store: MockObjectStore = {
    name: storeName,
    data: new Map(),
    keyPath: options?.keyPath,
    autoIncrement: options?.autoIncrement,
    indices: new Map()
  };
  db.mockDb.objectStores.set(storeName, store);
  return store;
};

export const clearMockDatabase = (dbName: string) => {
  mockIDBFactory.databases.delete(dbName);
};

export const getMockObjectStoreData = (dbName: string, storeName: string): Map<string, any> => {
  const db = mockIDBFactory.databases.get(dbName);
  if (!db) throw new Error(`Database ${dbName} not found`);
  
  const store = db.objectStores.get(storeName);
  if (!store) throw new Error(`Object store ${storeName} not found`);
  
  return store.data;
};

// Wedding-specific test data helpers
export const createMockWeddingData = () => ({
  weddingId: 'wedding-123',
  couple: { bride: 'Alice', groom: 'Bob' },
  weddingDate: '2024-06-15',
  venue: 'Grand Hotel',
  status: 'active'
});

export const createMockVendorCredentials = () => ({
  vendorId: 'vendor-456',
  businessName: 'Smith Photography',
  ownerName: 'John Smith',
  email: 'john@smithphoto.com',
  role: 'photographer',
  tier: 'professional'
});