'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { CertificateVisualEditor } from '@/components/CertificateVisualEditor';
import { useCertificateConfig } from '@/hooks/useCertificateConfig';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';
import { useNotifications } from '@/components/NotificationSystem';
import { CertificateConfig } from '@/types';

export default function CertificateVisualEditorPage() {
  const params = useParams();
  const eventId = params.id as string;
  const notifications = useNotifications();
  
  const {
    config,
    isLoading: loading,
    isError: hasError,
    error,
    saveConfig,
    isSaving: isSubmitting
  } = useCertificateConfig(eventId);

  // Debug: Log estado do hook
  console.log('🔍 VISUAL_PAGE: Estado do hook:', {
    config,
    loading,
    hasError,
    error: error?.message,
    eventId
  });

  // Estado local para as mudanças de configuração
  const [localConfig, setLocalConfig] = useState<Partial<CertificateConfig> | null>(null);

  // Configuração atual (usa localConfig com mudanças ou config original)  
  const currentConfig = localConfig ? { ...config, ...localConfig } : config;
  
  console.log('🎛️ VISUAL_PAGE: Configurações:', {
    originalConfig: config,
    localConfig,
    currentConfig,
    hasLocalChanges: localConfig && Object.keys(localConfig).length > 0
  });

  // Função para atualizar configuração localmente
  const updateConfig = useCallback((newConfig: Partial<CertificateConfig>) => {
    console.log('🔄 Atualizando configuração local:', newConfig);
    setLocalConfig(prev => ({
      ...prev,
      ...newConfig
    }));
  }, []);

  const handleSave = async () => {
    try {
      console.log('💾 SALVAMENTO: Iniciando salvamento...');
      console.log('📊 SALVAMENTO: Estado atual:', { 
        config, 
        localConfig, 
        hasLocalChanges: localConfig && Object.keys(localConfig).length > 0 
      });

      // Sempre preparar configuração final para salvar
      const finalConfig = localConfig && Object.keys(localConfig).length > 0 
        ? { ...config, ...localConfig }
        : config;

      console.log('📋 SALVAMENTO: Configuração final a ser salva:', finalConfig);

      // Verificar se há configuração para salvar
      if (!finalConfig) {
        console.warn('⚠️ SALVAMENTO: Nenhuma configuração para salvar');
        notifications.warning(
          'Nada para Salvar',
          'Não há configurações para salvar. Aguarde o carregamento ou configure primeiro.'
        );
        return;
      }

      // Verificar se a configuração tem pelo menos eventId
      if (!finalConfig.eventId) {
        console.warn('⚠️ SALVAMENTO: Configuração sem eventId');
        notifications.error(
          'Erro de Configuração',
          'Configuração incompleta. Recarregue a página e tente novamente.'
        );
        return;
      }

      await saveConfig(finalConfig as CertificateConfig);
      
      // Limpar mudanças locais após salvamento bem-sucedido
      if (localConfig && Object.keys(localConfig).length > 0) {
        setLocalConfig(null);
        console.log('✅ SALVAMENTO: Mudanças locais limpas');
      }
      
      notifications.success(
        'Configuração Salva',
        'As configurações do certificado foram salvas com sucesso!'
      );
      
    } catch (error) {
      console.error('❌ SALVAMENTO: Erro ao salvar configuração:', error);
      notifications.error(
        'Erro ao Salvar',
        'Não foi possível salvar as configurações. Tente novamente.'
      );
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <Loading text="Carregando editor visual..." />
      </ProtectedRoute>
    );
  }

  if (hasError) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar</h3>
            <p className="text-gray-600">{error?.message || 'Erro inesperado'}</p>
            <Link
              href={`/dashboard/eventos/${eventId}/certificado`}
              className="btn-primary mt-4 inline-block"
            >
              Voltar para Configurações
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href={`/dashboard/eventos/${eventId}/certificado`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Configurações de Certificado
                </Link>
                
                <h1 className="text-3xl font-bold text-gray-900">
                  Editor Visual de Certificados
                </h1>
                <p className="mt-2 text-gray-600">
                  Posicione os elementos do certificado de forma visual e precisa
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/dashboard/eventos/${eventId}/certificado`}
                  className="btn-outline flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Completo
                </Link>
                
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !config || loading}
                  className={`flex items-center px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    isSubmitting || !config || loading
                      ? 'bg-gray-400 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title={
                    loading ? 'Carregando configuração...' :
                    !config ? 'Aguardando configuração...' :
                    isSubmitting ? 'Salvando...' :
                    'Salvar configurações do certificado'
                  }
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2" />
                      Carregando...
                    </>
                  ) : !config ? (
                    <>
                      <Save className="h-4 w-4 mr-2 opacity-50" />
                      Aguardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <CertificateVisualEditor
                config={currentConfig ?? undefined}
                onConfigChange={updateConfig}
                eventName="Palestra: Como Envelhecemos e Morremos no Século XXI?"
                eventDate="18 de setembro de 2025"
              />
            </div>
          </div>

          {/* Instruções Detalhadas */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Como Usar o Editor Visual
              </h3>
              
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">1</span>
                  <span><strong>Upload da Imagem:</strong> Faça upload da sua imagem de certificado personalizada</span>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">2</span>
                  <span><strong>Selecionar Elemento:</strong> Clique em um elemento na lista à esquerda</span>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">3</span>
                  <span><strong>Posicionar:</strong> Clique na posição exata da imagem onde o elemento deve aparecer</span>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">4</span>
                  <span><strong>Ajustar:</strong> Configure tamanho da fonte e cor diretamente no painel</span>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">5</span>
                  <span><strong>Preview:</strong> Use o modo Preview para ver o resultado final</span>
                </li>
              </ol>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 Dicas e Truques
              </h3>
              
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Use imagens de alta resolução (mínimo 1200x800px) para melhor qualidade</span>
                </li>
                <li className="flex">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Posicione o nome do participante em uma área com bom contraste</span>
                </li>
                <li className="flex">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Teste diferentes tamanhos de fonte para encontrar o ideal</span>
                </li>
                <li className="flex">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>O botão &quot;Resetar&quot; volta às posições padrão se necessário</span>
                </li>
                <li className="flex">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>As configurações são automaticamente sincronizadas entre as abas</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer com informações adicionais */}
          <div className="mt-8 bg-gray-50 rounded-lg border p-6 text-center">
            <p className="text-gray-600 text-sm">
              💾 Lembre-se de clicar em <strong>&quot;Salvar Configurações&quot;</strong> para aplicar as alterações aos certificados do evento.
              <br />
              🎨 Você pode continuar editando nas outras abas da configuração do certificado.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
