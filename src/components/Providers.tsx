'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Criar QueryClient dentro do componente para evitar problemas de SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tempo que os dados ficam "fresh" (não refetch automaticamente)
            staleTime: 2 * 60 * 1000, // 2 minutos
            // Tempo que os dados ficam no cache
            gcTime: 5 * 60 * 1000, // 5 minutos (substitui cacheTime)
            // Retry automático em caso de erro
            retry: (failureCount, error: unknown) => {
              // Não fazer retry para erros 4xx (cliente)
              const errorWithStatus = error as { status?: number };
              if (errorWithStatus?.status && errorWithStatus.status >= 400 && errorWithStatus.status < 500) {
                return false;
              }
              // Máximo 3 tentativas para outros erros
              return failureCount < 3;
            },
            // Refetch quando a janela ganha foco
            refetchOnWindowFocus: false,
            // Refetch quando reconecta
            refetchOnReconnect: 'always',
          },
          mutations: {
            // Retry automático para mutations
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {/* DevTools apenas em desenvolvimento */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools 
            initialIsOpen={false}
          />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
