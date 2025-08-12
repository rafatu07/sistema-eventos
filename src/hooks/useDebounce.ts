import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debounce de valores
 * Útil para evitar atualizações excessivas em previews e buscas
 */
export function useDebounce<T>(value: T, delay: number): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);

  useEffect(() => {
    // Marcar como debouncing se o valor mudou
    if (JSON.stringify(value) !== JSON.stringify(debouncedValue)) {
      setIsDebouncing(true);
    }

    // Configurar timer para debounce
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    // Limpar timeout se o valor mudar novamente antes do delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, debouncedValue]);

  return [debouncedValue, isDebouncing];
}

/**
 * Hook para debounce de callbacks
 * Útil para evitar chamadas excessivas de funções
 */
export function useDebouncedCallback<TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn,
  delay: number
): [(...args: TArgs) => void, boolean] {
  const [isPending, setIsPending] = useState<boolean>(false);

  const debouncedCallback = useState(() => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: TArgs) => {
      setIsPending(true);
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        callback(...args);
        setIsPending(false);
      }, delay);
    });
  })[0];

  return [debouncedCallback, isPending];
}

/**
 * Hook para debounce com immediate execution na primeira chamada
 * Útil quando você quer execução imediata na primeira vez, depois debounce
 */
export function useDebouncedImmediate<T>(
  value: T,
  delay: number,
  immediate: boolean = true
): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);
  const [isFirst, setIsFirst] = useState<boolean>(true);

  useEffect(() => {
    // Primeira execução imediata se configurada
    if (isFirst && immediate) {
      setDebouncedValue(value);
      setIsFirst(false);
      return;
    }

    // Marcar como debouncing se o valor mudou
    if (JSON.stringify(value) !== JSON.stringify(debouncedValue)) {
      setIsDebouncing(true);
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
      setIsFirst(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, immediate, debouncedValue, isFirst]);

  return [debouncedValue, isDebouncing];
}
