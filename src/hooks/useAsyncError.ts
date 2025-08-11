import { useCallback, useState } from 'react';

/**
 * Hook para capturar erros assíncronos e propagá-los para o ErrorBoundary
 * ErrorBoundaries não capturam erros que ocorrem em:
 * - Event handlers
 * - Async code (setTimeout, fetch, etc)
 * - Durante SSR
 * - Erros lançados no próprio error boundary
 */
export function useAsyncError() {
  const [, setError] = useState();

  return useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

/**
 * Hook para executar funções assíncronas com tratamento automático de erro
 */
export function useAsyncErrorHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  asyncFunction: T,
  dependencies: React.DependencyList = []
): [T, { loading: boolean; error: Error | null; clearError: () => void }] {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const throwError = useAsyncError();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const wrappedFunction = useCallback(
    (async (...args: Parameters<T>) => {
      try {
        setLoading(true);
        setError(null);
        const result = await asyncFunction(...args);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        // Para erros críticos, propagar para ErrorBoundary
        if (isCriticalError(error)) {
          throwError(error);
        }
        
        throw error;
      } finally {
        setLoading(false);
      }
    }) as T,
    [asyncFunction, throwError, ...dependencies]
  );

  return [wrappedFunction, { loading, error, clearError }];
}

/**
 * Determina se um erro é crítico e deve ser propagado para o ErrorBoundary
 */
function isCriticalError(error: Error): boolean {
  const criticalPatterns = [
    /chunk load error/i,
    /loading chunk \d+ failed/i,
    /network error/i,
    /failed to fetch/i,
    /script error/i,
    /module not found/i,
    /unexpected token/i,
    /syntax error/i,
  ];

  return criticalPatterns.some(pattern => pattern.test(error.message));
}

/**
 * Hook para monitorar e capturar erros globais não tratados
 */
export function useGlobalErrorHandler() {
  React.useEffect(() => {
    const throwError = (error: Error) => {
      // Usar um timeout para garantir que o erro seja lançado na próxima tick
      setTimeout(() => {
        throw error;
      }, 0);
    };

    // Capturar erros JavaScript não tratados
    const handleError = (event: ErrorEvent) => {
      console.error('Erro global capturado:', event.error);
      
      if (isCriticalError(event.error)) {
        throwError(event.error);
      }
    };

    // Capturar promises rejeitadas não tratadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
        
      console.error('Promise rejeitada não tratada:', error);
      
      if (isCriticalError(error)) {
        throwError(error);
      }
    };

    // Adicionar listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}

/**
 * Hook para retry com backoff exponencial
 */
export function useRetryWithBackoff<T>(
  asyncFunction: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000
) {
  const [attempt, setAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const throwError = useAsyncError();

  const executeWithRetry = useCallback(async (): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        setAttempt(i + 1);
        
        if (i > 0) {
          setIsRetrying(true);
          const delay = Math.min(baseDelay * Math.pow(2, i - 1), maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await asyncFunction();
        setIsRetrying(false);
        setAttempt(0);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Se é o último retry ou erro crítico, falha definitivamente
        if (i === maxRetries || isCriticalError(lastError)) {
          setIsRetrying(false);
          setAttempt(0);
          
          if (isCriticalError(lastError)) {
            throwError(lastError);
          }
          
          throw lastError;
        }
      }
    }

    // Não deveria chegar aqui, mas por segurança
    throw lastError!;
  }, [asyncFunction, maxRetries, baseDelay, maxDelay, throwError]);

  return {
    executeWithRetry,
    attempt,
    isRetrying,
    maxRetries,
  };
}

// Re-exportar React para evitar erro de import
import React from 'react';
