import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCertificateConfig, updateCertificateConfig, getDefaultCertificateConfig } from '@/lib/certificate-config';
import { useAuth } from '@/contexts/AuthContext';
import { CertificateConfig } from '@/types';
import { CertificateConfigData } from '@/lib/schemas';
import { useNotifications } from '@/components/NotificationSystem';

/**
 * Hook personalizado para gerenciar configurações de certificado com cache otimizado
 */
export const useCertificateConfig = (eventId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notifications = useNotifications();

  // Query para buscar configuração com cache inteligente
  const configQuery = useQuery<CertificateConfig | null>({
    queryKey: ['certificate-config', eventId],
    queryFn: async () => {
      console.log('🔍 Buscando configuração do certificado (com cache)...');
      const config = await getCertificateConfig(eventId);
      
      if (config) {
        console.log('✅ Configuração carregada do Firebase');
      } else {
        console.log('💡 Usando configuração padrão');
      }
      
      return config;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados "frescos"
    gcTime: 30 * 60 * 1000, // 30 minutos - manter em cache
    retry: 2, // Tentar até 2 vezes em caso de erro
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Não refetch ao focar a janela
    refetchOnMount: false, // Não refetch ao montar se dados em cache são válidos
  });

  // Mutation para salvar configuração com invalidação de cache
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: CertificateConfigData) => {
      console.log('💾 HOOK: Salvando configuração do certificado...');
      console.log('📋 HOOK: configData recebido:', configData);
      
      // Validação de segurança
      if (!configData) {
        console.error('❌ HOOK: configData está undefined!');
        throw new Error('Dados de configuração não fornecidos');
      }
      
      await updateCertificateConfig(eventId, configData);
      return configData;
    },
    onMutate: async (newConfig) => {
      // Cancel ongoing queries to avoid optimistic update conflicts
      await queryClient.cancelQueries({ queryKey: ['certificate-config', eventId] });

      // Snapshot previous value for rollback
      const previousConfig = queryClient.getQueryData<CertificateConfig | null>(['certificate-config', eventId]);

      // Optimistically update with new config
      const optimisticConfig: CertificateConfig = {
        ...newConfig,
        id: (previousConfig as CertificateConfig)?.id || 'temp',
        createdAt: (previousConfig as CertificateConfig)?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData(['certificate-config', eventId], optimisticConfig);

      console.log('⚡ Atualização otimista aplicada');

      // Return context with previous config for rollback
      return { previousConfig };
    },
    onSuccess: (savedConfig) => {
      console.log('✅ Configuração salva com sucesso');
      notifications.success('Configuração Salva', 'Configuração do certificado salva com sucesso!');
      
      // Update cache with server response
      const finalConfig: CertificateConfig = {
        ...savedConfig,
        id: configQuery.data?.id || 'temp',
        createdAt: configQuery.data?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      
      queryClient.setQueryData(['certificate-config', eventId], finalConfig);
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ 
        queryKey: ['certificate-config'],
        exact: false 
      });
    },
    onError: (error: Error, _newConfig, context) => {
      console.error('❌ Erro ao salvar configuração:', error);
      
      // Rollback optimistic update
      if (context?.previousConfig !== undefined) {
        queryClient.setQueryData(['certificate-config', eventId], context.previousConfig);
        console.log('🔄 Rollback da atualização otimista');
      }
      
      notifications.error('Erro ao Salvar', error.message || 'Erro desconhecido ao salvar configuração');
    },
  });

  // Helper para obter configuração atual (cached ou padrão)
  const getCurrentConfig = (): CertificateConfig | null => {
    const cachedConfig = configQuery.data;
    
    if (cachedConfig) {
      return cachedConfig;
    }
    
    if (user?.uid && eventId) {
      const defaultData = getDefaultCertificateConfig(eventId, user.uid);
      return {
        id: 'default',
        ...defaultData,
      } as CertificateConfig;
    }
    
    return null;
  };

  // Helper para prefetch configuração (útil para navegação)
  const prefetchConfig = async (prefetchEventId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['certificate-config', prefetchEventId],
      queryFn: () => getCertificateConfig(prefetchEventId),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Helper para invalidar cache específico
  const invalidateConfig = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['certificate-config', eventId] 
    });
  };

  // Helper para resetar configuração para padrão
  const resetToDefault = async () => {
    if (!user?.uid) return;
    
    const defaultData = getDefaultCertificateConfig(eventId, user.uid);
    await saveConfigMutation.mutateAsync(defaultData);
  };

  return {
    // Dados
    config: configQuery.data,
    currentConfig: getCurrentConfig(),
    
    // Estados de loading
    isLoading: configQuery.isLoading,
    isFetching: configQuery.isFetching,
    isError: configQuery.isError,
    isSaving: saveConfigMutation.isPending,
    
    // Erros
    error: configQuery.error,
    saveError: saveConfigMutation.error,
    
    // Funções
    saveConfig: saveConfigMutation.mutateAsync,
    prefetchConfig,
    invalidateConfig,
    resetToDefault,
    
    // Informações de cache
    isStale: configQuery.isStale,
    lastUpdated: configQuery.dataUpdatedAt,
    
    // Query object completo para casos avançados
    query: configQuery,
  };
};

/**
 * Hook para gerenciar múltiplas configurações (útil para dashboards)
 */
export const useCertificateConfigs = (eventIds: string[]) => {

  const results = useQuery<Record<string, CertificateConfig | null>>({
    queryKey: ['certificate-configs', eventIds.sort().join(',')],
    queryFn: async () => {
      const promises = eventIds.map(eventId => getCertificateConfig(eventId));
      const configs = await Promise.all(promises);
      
      return eventIds.reduce((acc, eventId, index) => {
        acc[eventId] = configs[index] || null;
        return acc;
      }, {} as Record<string, CertificateConfig | null>);
    },
    enabled: eventIds.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutos para múltiplas configs
    gcTime: 15 * 60 * 1000, // 15 minutos
  });

  return {
    configs: results.data || {},
    isLoading: results.isLoading,
    isError: results.isError,
    error: results.error,
  };
};
