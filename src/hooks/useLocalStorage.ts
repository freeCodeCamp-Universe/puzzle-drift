import { useEffect, useState } from 'react';
import { readStorageValue, writeStorageValue } from '../utils/storage';

export function useLocalStorage<T>(key: string, fallbackValue: T) {
  const [value, setValue] = useState<T>(() => readStorageValue(key, fallbackValue));

  useEffect(() => {
    writeStorageValue(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
