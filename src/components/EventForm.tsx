'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/types';
import { createEvent, updateEvent } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, FileText, Save, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { useScreenReader } from '@/hooks/useA11y';
import { useValidatedForm, FieldError } from '@/hooks/useValidatedForm';
import { eventSchema, EventFormData as ZodEventFormData } from '@/lib/schemas';
import { useNotifications } from '@/components/NotificationSystem';

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

// Helper function to create Date from date string in local timezone
const createLocalDate = (dateString: string) => {
  // Adicionar T12:00:00 para garantir que seja interpretado no timezone local
  // e evitar mudança de dia devido a diferenças de fuso horário
  return new Date(`${dateString}T12:00:00`);
};

export const EventForm: React.FC<EventFormProps> = ({ event, isEditing = false }) => {
  const { user } = useAuth();
  const router = useRouter();
  const { announce } = useScreenReader();
  const notifications = useNotifications();

  const form = useValidatedForm<ZodEventFormData>({
    schema: eventSchema,
    defaultValues: {
      name: event?.name || '',
      description: event?.description || '',
      date: event?.date ? formatDateForInput(event.date) : '',
      startTime: event?.startTime ? formatTimeForInput(event.startTime) : '',
      endTime: event?.endTime ? formatTimeForInput(event.endTime) : '',
      location: event?.location || '',
    },
    onSubmitSuccess: () => {
      notifications.success(
        isEditing ? 'Evento Atualizado' : 'Evento Criado',
        isEditing ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!'
      );
      announce(isEditing ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!');
      router.push('/dashboard');
    },
    onSubmitError: (error) => {
      announce(`Erro: ${error.message}`, 'assertive');
    },
  });

  const { register, handleSubmit, isSubmitting, submitError, getFieldError } = form;

  const onSubmit = async (data: ZodEventFormData) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Combinar data com horários para criar Date objects completos
    // Usar timezone local para evitar problemas de fuso horário
    const eventDate = createLocalDate(data.date);
    const startDateTime = new Date(`${data.date}T${data.startTime}:00`);
    const endDateTime = new Date(`${data.date}T${data.endTime}:00`);

    const eventData = {
      name: data.name.trim(),
      description: data.description.trim(),
      date: eventDate,
      startTime: startDateTime,
      endTime: endDateTime,
      location: data.location.trim(),
      createdBy: user.uid,
    };

    if (isEditing && event) {
      await updateEvent(event.id, eventData);
    } else {
      await createEvent(eventData);
    }
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
        <form onSubmit={handleSubmit(onSubmit)} className="card-content space-y-6">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm error-message">{submitError}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-2" aria-hidden="true" />
              Nome do Evento
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className={`input w-full ${getFieldError('name') ? 'border-red-500' : ''}`}
              placeholder="Digite o nome do evento"
              aria-label="Nome do evento"
              aria-describedby="name-help name-error"
              maxLength={100}
            />
            <div id="name-help" className="sr-only">
              Campo obrigatório. Digite o nome do evento com até 100 caracteres.
            </div>
            <FieldError error={getFieldError('name')} />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-2" aria-hidden="true" />
              Descrição
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={4}
              className={`input w-full resize-none ${getFieldError('description') ? 'border-red-500' : ''}`}
              placeholder="Descreva o evento"
              aria-label="Descrição do evento"
              aria-describedby="description-help description-error"
              maxLength={1000}
            />
            <div id="description-help" className="sr-only">
              Campo obrigatório. Descreva o evento com até 1000 caracteres.
            </div>
            <FieldError error={getFieldError('description')} />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-2" />
              Data do Evento
            </label>
            <input
              type="date"
              id="date"
              {...register('date')}
              className={`input w-full ${getFieldError('date') ? 'border-red-500' : ''}`}
            />
            <FieldError error={getFieldError('date')} />
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
                {...register('startTime')}
                className={`input w-full ${getFieldError('startTime') ? 'border-red-500' : ''}`}
              />
              <FieldError error={getFieldError('startTime')} />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-2" />
                Horário de Término
              </label>
              <input
                type="time"
                id="endTime"
                {...register('endTime')}
                className={`input w-full ${getFieldError('endTime') ? 'border-red-500' : ''}`}
              />
              <FieldError error={getFieldError('endTime')} />
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
              {...register('location')}
              className={`input w-full ${getFieldError('location') ? 'border-red-500' : ''}`}
              placeholder="Digite o local do evento"
            />
            <FieldError error={getFieldError('location')} />
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
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
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

