'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { EventForm } from '@/components/EventForm';
import { Loading } from '@/components/Loading';
import { getEvent } from '@/lib/firestore';
import { Event } from '@/types';

export default function EditarEventoPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const eventData = await getEvent(eventId);
        if (eventData) {
          setEvent(eventData);
        } else {
          setError('Evento não encontrado');
        }
      } catch (error) {
        console.error('Error loading event:', error);
        setError('Erro ao carregar evento');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  if (loading) {
    return (
      <ProtectedRoute requireAdmin={true}>
        <Navbar />
        <Loading text="Carregando evento..." />
      </ProtectedRoute>
    );
  }

  if (error || !event) {
    return (
      <ProtectedRoute requireAdmin={true}>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
            <p className="text-gray-600">{error || 'Evento não encontrado'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <EventForm event={event} isEditing={true} />
        </div>
      </div>
    </ProtectedRoute>
  );
}

