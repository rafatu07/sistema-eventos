'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { CustomFormBuilder } from '@/components/CustomFormBuilder';
import { 
  getEvent,
  getCustomFormByEventId,
  createCustomForm,
  updateCustomForm
} from '@/lib/firestore';
import { Event, CustomFormConfig } from '@/types';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CustomFormEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [formConfig, setFormConfig] = useState<CustomFormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return;

        // Carregar dados do evento
        const eventData = await getEvent(eventId);
        if (!eventData) {
          setError('Evento não encontrado');
          return;
        }
        setEvent(eventData);

        // Carregar formulário existente (se houver)
        const existingForm = await getCustomFormByEventId(eventId);
        setFormConfig(existingForm);

      } catch (error) {
        console.error('Error loading data:', error);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, user]);

  const handleSaveForm = async (config: CustomFormConfig) => {
    if (!user || !event) return;

    try {
      if (formConfig?.id) {
        // Atualizar formulário existente
        await updateCustomForm(formConfig.id, {
          ...config,
          eventId,
          updatedAt: new Date(),
        });
      } else {
        // Criar novo formulário
        await createCustomForm({
          ...config,
          eventId,
          createdBy: user.uid,
          isActive: true,
        });
      }

      // Redirecionar para a página do evento
      router.push(`/eventos/${eventId}`);
    } catch (error) {
      console.error('Error saving form:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push(`/eventos/${eventId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <Loading text="Carregando editor de formulário..." />
      </ProtectedRoute>
    );
  }

  if (error || !event) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erro</h3>
              <p className="text-gray-600 mb-6">{error || 'Evento não encontrado'}</p>
              <Link href="/dashboard" className="btn-primary">
                Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!user?.isAdmin) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
              <p className="text-gray-600 mb-6">Você precisa ser um administrador para editar formulários.</p>
              <Link href="/dashboard" className="btn-primary">
                Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <CustomFormBuilder
        eventId={eventId}
        initialConfig={formConfig}
        onSave={handleSaveForm}
        onCancel={handleCancel}
        userId={user.uid}
      />
    </ProtectedRoute>
  );
}
