import { Metadata } from 'next';
import { Event } from '@/types';

// Função helper para gerar metadata dinâmica para eventos
export function generateEventMetadata(event: Event): Metadata {
  const eventDate = event.date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const startTime = event.startTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    title: `${event.name} - Evento`,
    description: `${event.description} | Data: ${eventDate} às ${startTime} | Local: ${event.location}`,
    openGraph: {
      title: event.name,
      description: event.description,
      type: 'article',
      publishedTime: event.createdAt.toISOString(),
      modifiedTime: event.updatedAt.toISOString(),
      authors: ['Sistema de Gestão de Eventos'],
      images: [
        {
          url: '/event-og-image.jpg',
          width: 1200,
          height: 630,
          alt: `Evento: ${event.name}`,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: `${event.description.slice(0, 150)}...`,
      images: ['/event-og-image.jpg'],
    },
    other: {
      'event:start_time': event.startTime.toISOString(),
      'event:end_time': event.endTime.toISOString(),
      'event:location': event.location,
    },
  };
}

// Metadata para páginas administrativas
export const adminMetadata: Metadata = {
  title: 'Dashboard Administrativo',
  description: 'Painel de controle para gestão de eventos, participantes e estatísticas.',
  robots: {
    index: false,
    follow: false,
  },
};

// Metadata para página de login
export const loginMetadata: Metadata = {
  title: 'Login',
  description: 'Faça login no Sistema de Gestão de Eventos para acessar sua conta e gerenciar seus eventos.',
  openGraph: {
    title: 'Login - Sistema de Gestão de Eventos',
    description: 'Acesse sua conta no Sistema de Gestão de Eventos',
  },
};

// Metadata para páginas públicas de eventos
export function generatePublicEventMetadata(event: Event): Metadata {
  const metadata = generateEventMetadata(event);
  
  return {
    ...metadata,
    title: `${event.name} - Inscreva-se`,
    description: `Inscreva-se no evento: ${event.name}. ${event.description}`,
    openGraph: {
      ...metadata.openGraph,
      title: `Inscreva-se: ${event.name}`,
      description: `Faça sua inscrição gratuita no evento ${event.name}`,
    },
    other: {
      'event:start_time': event.startTime.toISOString(),
      'event:end_time': event.endTime.toISOString(),
      'event:location': event.location,
      'event:registration': 'open',
    },
  };
}
