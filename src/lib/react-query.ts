/**
 * Configuração e queries do React Query
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { 
  getAllEvents, 
  getEvent, 
  getUserRegistrations, 
  getEventRegistrations,
  getRegistration,
  createEvent,
  updateEvent,
  deleteEvent,
  createRegistration,
  updateRegistration
} from './firestore';
import { Event, Registration } from '@/types';
import { logError, logInfo } from './logger';

// Chaves de query organizadas
export const queryKeys = {
  events: ['events'] as const,
  event: (id: string) => ['event', id] as const,
  userRegistrations: (userId: string) => ['userRegistrations', userId] as const,
  eventRegistrations: (eventId: string) => ['eventRegistrations', eventId] as const,
  registration: (eventId: string, userId: string) => ['registration', eventId, userId] as const,
};

// Configurações de cache
const CACHE_TIMES = {
  SHORT: 2 * 60 * 1000,    // 2 minutos
  MEDIUM: 5 * 60 * 1000,   // 5 minutos
  LONG: 15 * 60 * 1000,    // 15 minutos
  VERY_LONG: 60 * 60 * 1000, // 1 hora
};

/**
 * Hook para buscar todos os eventos
 */
export function useEvents(options?: UseQueryOptions<Event[]>) {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: async () => {
      try {
        logInfo('Buscando todos os eventos');
        const events = await getAllEvents();
        logInfo(`Encontrados ${events.length} eventos`);
        return events;
      } catch (error) {
        logError('Erro ao buscar eventos', error as Error);
        throw error;
      }
    },
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.LONG, // Substitui cacheTime
    ...options,
  });
}

/**
 * Hook para buscar um evento específico
 */
export function useEvent(eventId: string, options?: UseQueryOptions<Event | null>) {
  return useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: async () => {
      try {
        logInfo(`Buscando evento ${eventId}`);
        const event = await getEvent(eventId);
        if (event) {
          logInfo(`Evento encontrado: ${event.name}`);
        } else {
          logInfo(`Evento ${eventId} não encontrado`);
        }
        return event;
      } catch (error) {
        logError(`Erro ao buscar evento ${eventId}`, error as Error);
        throw error;
      }
    },
    enabled: !!eventId,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.LONG,
    ...options,
  });
}

/**
 * Hook para buscar registros de um usuário
 */
export function useUserRegistrations(userId: string, options?: UseQueryOptions<Registration[]>) {
  return useQuery({
    queryKey: queryKeys.userRegistrations(userId),
    queryFn: async () => {
      try {
        logInfo(`Buscando registros do usuário ${userId}`);
        const registrations = await getUserRegistrations(userId);
        logInfo(`Encontrados ${registrations.length} registros para o usuário`);
        return registrations;
      } catch (error) {
        logError(`Erro ao buscar registros do usuário ${userId}`, error as Error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.MEDIUM,
    ...options,
  });
}

/**
 * Hook para buscar registros de um evento
 */
export function useEventRegistrations(eventId: string, options?: UseQueryOptions<Registration[]>) {
  return useQuery({
    queryKey: queryKeys.eventRegistrations(eventId),
    queryFn: async () => {
      try {
        logInfo(`Buscando registros do evento ${eventId}`);
        const registrations = await getEventRegistrations(eventId);
        logInfo(`Encontrados ${registrations.length} registros para o evento`);
        return registrations;
      } catch (error) {
        logError(`Erro ao buscar registros do evento ${eventId}`, error as Error);
        throw error;
      }
    },
    enabled: !!eventId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.MEDIUM,
    ...options,
  });
}

/**
 * Hook para buscar um registro específico
 */
export function useRegistration(eventId: string, userId: string, options?: UseQueryOptions<Registration | null>) {
  return useQuery({
    queryKey: queryKeys.registration(eventId, userId),
    queryFn: async () => {
      try {
        logInfo(`Buscando registro do usuário ${userId} no evento ${eventId}`);
        const registration = await getRegistration(eventId, userId);
        return registration;
      } catch (error) {
        logError(`Erro ao buscar registro`, error as Error, { eventId, userId });
        throw error;
      }
    },
    enabled: !!eventId && !!userId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.MEDIUM,
    ...options,
  });
}

/**
 * Mutation para criar evento
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
      logInfo('Criando novo evento', { eventName: eventData.name });
      const eventId = await createEvent(eventData);
      logInfo(`Evento criado com ID: ${eventId}`);
      return eventId;
    },
    onSuccess: () => {
      // Invalidar cache de eventos
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      logInfo('Cache de eventos invalidado após criação');
    },
    onError: (error) => {
      logError('Erro ao criar evento', error as Error);
    },
  });
}

/**
 * Mutation para atualizar evento
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: string; eventData: Partial<Event> }) => {
      logInfo(`Atualizando evento ${eventId}`);
      await updateEvent(eventId, eventData);
      logInfo(`Evento ${eventId} atualizado com sucesso`);
    },
    onSuccess: (_, { eventId }) => {
      // Invalidar cache específico do evento e lista geral
      queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      logInfo(`Cache invalidado para evento ${eventId}`);
    },
    onError: (error) => {
      logError('Erro ao atualizar evento', error as Error);
    },
  });
}

/**
 * Mutation para deletar evento
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      logInfo(`Deletando evento ${eventId}`);
      await deleteEvent(eventId);
      logInfo(`Evento ${eventId} deletado com sucesso`);
    },
    onSuccess: (_, eventId) => {
      // Remover do cache e invalidar lista
      queryClient.removeQueries({ queryKey: queryKeys.event(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      logInfo(`Cache removido para evento ${eventId}`);
    },
    onError: (error) => {
      logError('Erro ao deletar evento', error as Error);
    },
  });
}

/**
 * Mutation para criar registro
 */
export function useCreateRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (registrationData: Omit<Registration, 'id' | 'createdAt'>) => {
      logInfo('Criando novo registro', { 
        eventId: registrationData.eventId, 
        userId: registrationData.userId 
      });
      const registrationId = await createRegistration(registrationData);
      logInfo(`Registro criado com ID: ${registrationId}`);
      return registrationId;
    },
    onSuccess: (_, registrationData) => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userRegistrations(registrationData.userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.eventRegistrations(registrationData.eventId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.registration(registrationData.eventId, registrationData.userId) 
      });
      logInfo('Cache de registros invalidado após criação');
    },
    onError: (error) => {
      logError('Erro ao criar registro', error as Error);
    },
  });
}

/**
 * Mutation para atualizar registro
 */
export function useUpdateRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      registrationId, 
      data, 
      eventId: _eventId, 
      userId: _userId 
    }: { 
      registrationId: string; 
      data: Partial<Registration>;
      eventId: string;
      userId: string;
    }) => {
      logInfo(`Atualizando registro ${registrationId}`);
      await updateRegistration(registrationId, data);
      logInfo(`Registro ${registrationId} atualizado com sucesso`);
    },
    onSuccess: (_, { eventId, userId }) => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userRegistrations(userId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.eventRegistrations(eventId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.registration(eventId, userId) 
      });
      logInfo('Cache de registros invalidado após atualização');
    },
    onError: (error) => {
      logError('Erro ao atualizar registro', error as Error);
    },
  });
}

/**
 * Função para pré-carregar dados importantes
 */
export function prefetchEventData(queryClient: ReturnType<typeof useQueryClient>, eventId: string) {
  // Pré-carregar evento
  queryClient.prefetchQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () => getEvent(eventId),
    staleTime: CACHE_TIMES.MEDIUM,
  });
  
  // Pré-carregar registros do evento
  queryClient.prefetchQuery({
    queryKey: queryKeys.eventRegistrations(eventId),
    queryFn: () => getEventRegistrations(eventId),
    staleTime: CACHE_TIMES.SHORT,
  });
}

/**
 * Função para limpar cache específico
 */
export function clearEventCache(queryClient: ReturnType<typeof useQueryClient>, eventId: string) {
  queryClient.removeQueries({ queryKey: queryKeys.event(eventId) });
  queryClient.removeQueries({ queryKey: queryKeys.eventRegistrations(eventId) });
  logInfo(`Cache limpo para evento ${eventId}`);
}

/**
 * Função para atualizar dados no cache sem nova requisição
 */
export function updateEventInCache(
  queryClient: ReturnType<typeof useQueryClient>, 
  eventId: string, 
  updatedEvent: Event
) {
  // Atualizar evento específico
  queryClient.setQueryData(queryKeys.event(eventId), updatedEvent);
  
  // Atualizar na lista de eventos
  queryClient.setQueryData(queryKeys.events, (oldEvents: Event[] | undefined) => {
    if (!oldEvents) return oldEvents;
    return oldEvents.map(event => 
      event.id === eventId ? updatedEvent : event
    );
  });
  
  logInfo(`Cache atualizado para evento ${eventId}`);
}
