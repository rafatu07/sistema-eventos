import React from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getEventsPaginated, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  PaginationOptions,
  PaginatedResult
} from '@/lib/firestore';
import { Event } from '@/types';

// Hook para eventos paginados
export function useEventsPaginated(options: PaginationOptions = {}) {
  return useQuery({
    queryKey: ['events-paginated', options],
    queryFn: () => getEventsPaginated(options),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });
}

// Hook para scroll infinito de eventos
export function useEventsInfinite(pageSize = 10) {
  return useInfiniteQuery({
    queryKey: ['events-infinite'],
    queryFn: async ({ pageParam }) => {
      const options: PaginationOptions = {
        limit: pageSize,
        startAfterDoc: pageParam?.lastDoc,
      };
      return getEventsPaginated(options);
    },
    initialPageParam: undefined as PaginatedResult<Event> | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage : undefined;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Cache maior para infinite scroll
  });
}

// Hook otimizado para mutations de eventos
export function useEventMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => 
      createEvent(eventData),
    onSuccess: () => {
      // Invalidar todas as consultas de eventos
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => 
      updateEvent(id, data),
    onSuccess: (_, { id }) => {
      // Invalidar consultas específicas e gerais
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => {
      // Invalidar todas as consultas relacionadas a eventos
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });

  return {
    createEvent: createMutation,
    updateEvent: updateMutation,
    deleteEvent: deleteMutation,
  };
}

// Hook para pré-carregar eventos
export function usePrefetchEvents() {
  const queryClient = useQueryClient();

  const prefetchNextPage = (currentResult: PaginatedResult<Event>) => {
    if (currentResult.hasNextPage && currentResult.lastDoc) {
      queryClient.prefetchQuery({
        queryKey: ['events-paginated', { startAfterDoc: currentResult.lastDoc }],
        queryFn: () => getEventsPaginated({ startAfterDoc: currentResult.lastDoc }),
        staleTime: 2 * 60 * 1000,
      });
    }
  };

  return { prefetchNextPage };
}

// Hook para otimização de background sync
export function useBackgroundSync() {
  const queryClient = useQueryClient();

  const syncEvents = () => {
    // Refetch silencioso em background
    queryClient.refetchQueries({
      queryKey: ['events'],
      type: 'active',
    });
  };

  // Configurar sync automático
  React.useEffect(() => {
    const interval = setInterval(syncEvents, 5 * 60 * 1000); // A cada 5 minutos
    
    // Sync quando a janela ganha foco
    const handleFocus = () => syncEvents();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEvents]);

  return { syncEvents };
}

// Hook para debounce de pesquisa
export function useEventSearch(searchTerm: string, debounceMs = 300) {
  const [debouncedTerm, setDebouncedTerm] = React.useState(searchTerm);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  return useQuery({
    queryKey: ['events-search', debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm.trim()) return [];
      
      // Implementar busca otimizada no Firestore
      const allEvents = await getEventsPaginated({ limit: 50 });
      return allEvents.items.filter(event => 
        event.name.toLowerCase().includes(debouncedTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(debouncedTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(debouncedTerm.toLowerCase())
      );
    },
    enabled: debouncedTerm.trim().length > 2, // Só buscar com 3+ caracteres
    staleTime: 1 * 60 * 1000, // 1 minuto para buscas
  });
}
