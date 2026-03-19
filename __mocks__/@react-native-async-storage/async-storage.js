/**
 * Manual Jest mock for @react-native-async-storage/async-storage.
 *
 * Provides an in-memory key-value store so that integration tests can exercise
 * StorageService, useGameSession, and other persistence code paths without
 * requiring a native AsyncStorage module.
 *
 * Jest automatically applies this mock for all tests because it lives in the
 * root-level __mocks__ directory adjacent to node_modules.
 */

let store = {};

const AsyncStorage = {
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),

  getItem: jest.fn(key => {
    const value = key in store ? store[key] : null;
    return Promise.resolve(value);
  }),

  removeItem: jest.fn(key => {
    delete store[key];
    return Promise.resolve();
  }),

  mergeItem: jest.fn((key, value) => {
    if (key in store) {
      const existing = JSON.parse(store[key]);
      const incoming = JSON.parse(value);
      store[key] = JSON.stringify({ ...existing, ...incoming });
    } else {
      store[key] = value;
    }
    return Promise.resolve();
  }),

  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  }),

  getAllKeys: jest.fn(() => {
    return Promise.resolve(Object.keys(store));
  }),

  multiGet: jest.fn(keys => {
    const pairs = keys.map(key => [key, key in store ? store[key] : null]);
    return Promise.resolve(pairs);
  }),

  multiSet: jest.fn(pairs => {
    pairs.forEach(([key, value]) => {
      store[key] = value;
    });
    return Promise.resolve();
  }),

  multiRemove: jest.fn(keys => {
    keys.forEach(key => {
      delete store[key];
    });
    return Promise.resolve();
  }),

  multiMerge: jest.fn(pairs => {
    pairs.forEach(([key, value]) => {
      if (key in store) {
        const existing = JSON.parse(store[key]);
        const incoming = JSON.parse(value);
        store[key] = JSON.stringify({ ...existing, ...incoming });
      } else {
        store[key] = value;
      }
    });
    return Promise.resolve();
  }),

  flushGetRequests: jest.fn(),
};

export default AsyncStorage;
