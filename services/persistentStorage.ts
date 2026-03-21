export function readPersistedValue<T>(key: string, defaultValue: T): T {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    return JSON.parse(value) as T;
  } catch (e) {
    console.error(`Failed to read persisted value for key ${key}:`, e);
    return defaultValue;
  }
}

export function writePersistedValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write persisted value for key ${key}:`, e);
  }
}

export function removePersistedValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Failed to remove persisted value for key ${key}:`, e);
  }
}
