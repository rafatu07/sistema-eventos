import { QueryClient } from '@tanstack/react-query';

// Configurações otimizadas para o sistema de certificados
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Não repetir para erros 4xx (client errors)
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        // Máximo 2 tentativas para outros erros
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados "frescos"
      gcTime: 30 * 60 * 1000, // 30 minutos - manter em cache (substitui cacheTime)
    },
    mutations: {
      retry: 1, // Apenas 1 tentativa para mutations
      retryDelay: 1000,
    },
  },
});

// Prefetch strategies para melhorar UX
export const prefetchStrategies = {
  // Prefetch configuração ao navegar para evento
  certificateConfig: async (eventId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['certificate-config', eventId],
      queryFn: async () => {
        const { getCertificateConfig } = await import('@/lib/certificate-config');
        return getCertificateConfig(eventId);
      },
      staleTime: 5 * 60 * 1000,
    });
  },
  
  // Prefetch evento ao navegar para dashboard
  event: async (eventId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['event', eventId],
      queryFn: async () => {
        const { getEvent } = await import('@/lib/firestore');
        return getEvent(eventId);
      },
      staleTime: 10 * 60 * 1000,
    });
  },
};

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidar cache de configuração específica
  invalidateCertificateConfig: (eventId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: ['certificate-config', eventId] 
    });
  },
  
  // Invalidar todas as configurações
  invalidateAllCertificateConfigs: () => {
    return queryClient.invalidateQueries({ 
      queryKey: ['certificate-config'],
      exact: false 
    });
  },
  
  // Limpar cache antigo (útil para limpeza periódica)
  clearStaleCache: () => {
    queryClient.getQueryCache().clear();
  },
  
  // Obter estatísticas do cache
  getCacheStats: () => {
    const queries = queryClient.getQueryCache().getAll();
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(query => query.isStale()).length,
      activeQueries: queries.filter(query => query.getObserversCount() > 0).length,
      cacheSize: queries.reduce((size, query) => {
        return size + (JSON.stringify(query.state.data)?.length || 0);
      }, 0),
    };
  },
};

// Sistema de warming do cache para melhor performance inicial
export const warmupCache = async () => {
  if (typeof window === 'undefined') return; // Apenas no client
  
  try {
    // Warm up apenas se não houver dados em cache
    const cacheStats = cacheUtils.getCacheStats();
    
    if (cacheStats.totalQueries === 0) {
      console.log('🔥 Warming up cache...');
      
      // Carregar dados essenciais em background se necessário
      // (implementar conforme necessidade específica do app)
    }
  } catch (error) {
    console.warn('Cache warmup failed:', error);
  }
};
