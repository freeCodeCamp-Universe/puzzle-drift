export function readStorageValue<T>(key: string, fallbackValue: T): T {
  try {
    const storedValue = window.localStorage.getItem(key);

    return storedValue ? (JSON.parse(storedValue) as T) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export function writeStorageValue<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing or embedded test contexts.
  }
}

export function removeStorageValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing or embedded test contexts.
  }
}
