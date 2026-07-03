import { useEffect, useState } from 'react';

export function useDebounce<T>(valor: T, atrasoMs = 300): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);

  return debounced;
}
