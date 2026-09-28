/** Stand-ins for the app page's localStorage, where the window keeps its settings. */

/** A page store kept in memory, as the app page's localStorage keeps one. */
export function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

/** A store that refuses every call, as a private window's may. */
export const refusing: Storage = {
  length: 0,
  clear: () => {
    throw new Error("refused");
  },
  getItem: () => {
    throw new Error("refused");
  },
  key: () => null,
  removeItem: () => {
    throw new Error("refused");
  },
  setItem: () => {
    throw new Error("refused");
  },
};
