import React, { useEffect, useLayoutEffect, useState } from 'react';

// Hook que usa useLayoutEffect no cliente e useEffect no servidor
export const useIsomorphicLayoutEffect = 
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Hook para detectar se estamos no cliente - versão estável
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Usar setTimeout para evitar problemas de hidratação
    const timer = setTimeout(() => {
      setIsClient(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return isClient;
}

// Hook mais simples que apenas detecta se window existe
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

// Hook para executar código apenas no cliente
export function useClientOnly<T>(fn: () => T, deps: React.DependencyList): T | null {
  const [value, setValue] = useState<T | null>(null);
  const isClient = useIsClient();

  useEffect(() => {
    if (isClient) {
      setValue(fn());
    }
  }, [isClient, ...deps]);

  return value;
}
