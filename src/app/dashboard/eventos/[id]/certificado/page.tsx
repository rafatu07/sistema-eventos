'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CertificateConfigForm } from '@/components/CertificateConfigForm';
import { CertificatePreviewWithControls } from '@/components/CertificatePreview';
import { getCertificateConfig, updateCertificateConfig, getDefaultCertificateConfig } from '@/lib/certificate-config';
import { getEvent } from '@/lib/firestore';
import { CertificateConfigData } from '@/lib/schemas';
import { CertificateConfig } from '@/types';
import { useNotifications } from '@/components/NotificationSystem';
import { ArrowLeft, FileText, Eye, Save, Loader } from 'lucide-react';

export default function CertificateConfigPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  const [activeView, setActiveView] = useState<'form' | 'preview'>('form');
  const [localConfig, setLocalConfig] = useState<CertificateConfig | null>(null);

  // Buscar dados do evento
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId),
    enabled: !!eventId,
  });

  // Buscar configuração de certificado
  const { data: certificateConfig, isLoading: configLoading } = useQuery({
    queryKey: ['certificate-config', eventId],
    queryFn: () => getCertificateConfig(eventId),
    enabled: !!eventId,
  });

  // Mutation para salvar configuração
  const saveCertificateConfigMutation = useMutation({
    mutationFn: async (configData: CertificateConfigData) => {
      await updateCertificateConfig(eventId, configData);
      return configData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-config', eventId] });
      notifications.success('Configuração Salva', 'Configuração do certificado salva com sucesso!');
    },
    onError: (error: Error) => {
      notifications.error('Erro ao Salvar', error.message);
    },
  });

  // Configuração atual ou padrão (usa localConfig primeiro para updates em tempo real)
  const currentConfig = localConfig || certificateConfig || (user?.uid ? getDefaultCertificateConfig(eventId, user.uid) : null);

  if (eventLoading || configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando configurações do certificado...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Evento não encontrado</h1>
          <p className="text-gray-600 mb-6">O evento solicitado não foi encontrado ou você não tem permissão para acessá-lo.</p>
          <Link href="/dashboard" className="btn-primary">
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">Você precisa ser um administrador para configurar certificados.</p>
          <Link href="/dashboard" className="btn-primary">
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveConfig = async (configData: CertificateConfigData) => {
    // Update local config immediately for real-time preview
    const updatedConfig: CertificateConfig = {
      ...configData,
      id: certificateConfig?.id || 'temp',
      createdAt: certificateConfig?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    setLocalConfig(updatedConfig);
    
    await saveCertificateConfigMutation.mutateAsync(configData);
  };

  const handleExportPreview = () => {
    // Implementar exportação do preview em imagem
    notifications.info('Em Desenvolvimento', 'Funcionalidade de exportação será implementada em breve');
  };

  const handleToggleFullscreen = () => {
    // Implementar visualização em tela cheia
    notifications.info('Em Desenvolvimento', 'Visualização em tela cheia será implementada em breve');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/eventos/${eventId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Evento
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="h-8 w-8 mr-3 text-blue-600" />
                Configuração do Certificado
              </h1>
              <p className="mt-2 text-gray-600">
                Personalize o design e layout do certificado para <strong>{event.name}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Data: {event.date.toLocaleDateString('pt-BR')} • Local: {event.location}
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveView('form')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'form'
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4 mr-2 inline" />
                Configurações
              </button>
              <button
                onClick={() => setActiveView('preview')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'preview'
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Eye className="h-4 w-4 mr-2 inline" />
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form ou Preview */}
          <div className="lg:col-span-2">
            {activeView === 'form' ? (
              currentConfig && (
                <CertificateConfigForm
                  eventId={eventId}
                  config={certificateConfig || undefined}
                  onSave={handleSaveConfig}
                  onConfigChange={setLocalConfig}
                />
              )
            ) : (
              currentConfig && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                                  <CertificatePreviewWithControls
                  config={currentConfig}
                  eventName={event.name}
                  participantName="João Silva"
                  eventDate={event.date}
                  eventStartTime={event.startTime}
                  eventEndTime={event.endTime}
                  onExportPreview={handleExportPreview}
                  onToggleFullscreen={handleToggleFullscreen}
                />
                </div>
              )
            )}
          </div>

          {/* Sidebar com Preview ou Informações */}
          <div className="lg:col-span-1">
            {activeView === 'form' ? (
              <div className="space-y-6">
                {/* Preview pequeno na sidebar quando estiver no form */}
                {currentConfig && (
                  <div className="bg-white rounded-lg shadow-sm border p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Preview
                    </h3>
                    <CertificatePreviewWithControls
                      config={currentConfig}
                      eventName={event.name}
                      participantName="João Silva"
                      eventDate={event.date}
                      eventStartTime={event.startTime}
                      eventEndTime={event.endTime}
                      className="scale-75 origin-top"
                    />
                  </div>
                )}

                {/* Informações do evento */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Evento</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nome</label>
                      <p className="text-gray-900">{event.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Data</label>
                      <p className="text-gray-900">{event.date.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Local</label>
                      <p className="text-gray-900">{event.location}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Horário</label>
                      <p className="text-gray-900">
                        {event.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às{' '}
                        {event.endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Templates disponíveis */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates Disponíveis</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-6 bg-blue-500 rounded border"></div>
                      <div>
                        <p className="text-sm font-medium">Moderno</p>
                        <p className="text-xs text-gray-600">Design limpo e contemporâneo</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-6 bg-amber-700 rounded border"></div>
                      <div>
                        <p className="text-sm font-medium">Clássico</p>
                        <p className="text-xs text-gray-600">Estilo tradicional e elegante</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-6 bg-purple-500 rounded border"></div>
                      <div>
                        <p className="text-sm font-medium">Elegante</p>
                        <p className="text-xs text-gray-600">Sofisticado e refinado</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-6 bg-gray-800 rounded border"></div>
                      <div>
                        <p className="text-sm font-medium">Minimalista</p>
                        <p className="text-xs text-gray-600">Simplicidade e clareza</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Informações detalhadas quando no preview
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Configuração</h3>
                {currentConfig && (
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="font-medium text-gray-600">Template:</label>
                      <p className="text-gray-900 capitalize">{currentConfig.template}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-600">Orientação:</label>
                      <p className="text-gray-900">
                        {currentConfig.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-600">Família da Fonte:</label>
                      <p className="text-gray-900 capitalize">{currentConfig.fontFamily}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-600">Cores:</label>
                      <div className="flex space-x-2 mt-1">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: currentConfig.primaryColor }}
                          title="Cor Primária"
                        />
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: currentConfig.secondaryColor }}
                          title="Cor Secundária"
                        />
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: currentConfig.backgroundColor }}
                          title="Cor de Fundo"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-medium text-gray-600">Opções:</label>
                      <ul className="text-gray-900 mt-1 space-y-1">
                        {currentConfig.showBorder && <li>• Borda ativa</li>}
                        {currentConfig.showWatermark && <li>• Marca d'água ativa</li>}
                        {currentConfig.includeQRCode && <li>• QR Code ativo</li>}
                        {currentConfig.logoUrl && <li>• Logo personalizada</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
