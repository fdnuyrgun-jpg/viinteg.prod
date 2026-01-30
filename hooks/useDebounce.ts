
import { useState, useEffect } from 'react';

/**
 * Хук, который возвращает значение с задержкой.
 * Полезен для оптимизации поисковых запросов и предотвращения частых перерисовок.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
