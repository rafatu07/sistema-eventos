'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event, EventFormData } from '@/types';
import { createEvent, updateEvent } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, FileText, Save, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

interface EventFormProps {
  event?: Event;
  isEditing?: boolean;
}

// Helper function to format date to local date string (YYYY-MM-DD)
const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to format time to local time string (HH:MM)
const formatTimeForInput = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const EventForm: React.FC<EventFormProps> = ({ event, isEditing = false }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<EventFormData>({
    name: event?.name || '',
    description: event?.description || '',
    date: event?.date ? formatDateForInput(event.date) : '',
    startTime: event?.startTime ? formatTimeForInput(event.startTime) : '',
    endTime: event?.endTime ? formatTimeForInput(event.endTime) : '',
    location: event?.location || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Validar se horário de término é depois do horário de início
      if (formData.startTime >= formData.endTime) {
        throw new Error('O horário de término deve ser posterior ao horário de início');
      }

      // Combinar data com horários para criar Date objects completos
      const eventDate = new Date(formData.date);
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      const eventData = {
        name: formData.name,
        description: formData.description,
        date: eventDate,
        startTime: startDateTime,
        endTime: endDateTime,
        location: formData.location,
        createdBy: user.uid,
      };

      if (isEditing && event) {
        await updateEvent(event.id, eventData);
      } else {
        await createEvent(eventData);
      }

      router.push('/dashboard');
    } catch (error) {
      setError((error as Error).message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Editar Evento' : 'Criar Novo Evento'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEditing 
            ? 'Atualize as informações do evento'
            : 'Preencha as informações para criar um novo evento'
          }
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-content space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-2" />
              Nome do Evento
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="input w-full"
              placeholder="Digite o nome do evento"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-2" />
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              className="input w-full resize-none"
              placeholder="Descreva o evento"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-2" />
              Data do Evento
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              className="input w-full"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-2" />
                Horário de Início
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                required
                className="input w-full"
                value={formData.startTime}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-2" />
                Horário de Término
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                required
                className="input w-full"
                value={formData.endTime}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-2" />
              Local
            </label>
            <input
              type="text"
              id="location"
              name="location"
              required
              className="input w-full"
              placeholder="Digite o local do evento"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Link
              href="/dashboard"
              className="btn-outline"
            >
              Cancelar
            </Link>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Atualizar Evento' : 'Criar Evento'}
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

