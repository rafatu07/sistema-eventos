'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { updateCertificateConfig, getCertificateConfig } from '@/lib/certificate-config';

export default function DebugSaveLogoPage() {
  const [eventId, setEventId] = useState('OOCTF7tEKs5D2i9CjUMG');
  const [logoUrl, setLogoUrl] = useState('https://via.placeholder.com/100x100/7c3aed/ffffff?text=TESTE+LOGO');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testSaveOnly = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 TESTE: Salvando apenas logoUrl...');
      console.log('Event ID:', eventId);
      console.log('Logo URL:', logoUrl);

      // Salvar apenas logoUrl (teste mínimo)
      await updateCertificateConfig(eventId, {
        logoUrl: logoUrl,
        title: 'Teste de Salvamento de Logo'
      });

      setResult({
        success: true,
        action: 'save',
        message: 'logoUrl salva com sucesso!'
      });

    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      setResult({
        success: false,
        action: 'save',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testLoadOnly = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 TESTE: Carregando configuração...');
      console.log('Event ID:', eventId);

      const config = await getCertificateConfig(eventId);
      console.log('Configuração carregada:', config);

      setResult({
        success: true,
        action: 'load',
        message: 'Configuração carregada!',
        config: config,
        logoUrl: config?.logoUrl || 'NÃO ENCONTRADA',
        hasLogo: !!config?.logoUrl
      });

    } catch (error) {
      console.error('❌ Erro ao carregar:', error);
      setResult({
        success: false,
        action: 'load',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSaveAndLoad = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔄 TESTE: Salvando e carregando...');
      
      // 1. Salvar
      console.log('1️⃣ Salvando...');
      await updateCertificateConfig(eventId, {
        logoUrl: logoUrl,
        title: `Teste Completo - ${new Date().toISOString()}`
      });
      
      // 2. Aguardar um pouco
      console.log('2️⃣ Aguardando...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Carregar
      console.log('3️⃣ Carregando...');
      const config = await getCertificateConfig(eventId);
      
      console.log('Resultado final:', config);

      const success = config?.logoUrl === logoUrl;
      setResult({
        success,
        action: 'save_and_load',
        message: success ? 'Teste completo com sucesso!' : 'FALHA: logoUrl não confere',
        savedUrl: logoUrl,
        loadedUrl: config?.logoUrl || 'NÃO ENCONTRADA',
        match: success,
        config
      });

    } catch (error) {
      console.error('❌ Erro no teste completo:', error);
      setResult({
        success: false,
        action: 'save_and_load',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        🐛 Debug - Salvamento de Logo
      </h1>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event ID
            </label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Button
            onClick={testSaveOnly}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Salvando...' : '💾 Apenas Salvar'}
          </Button>
          
          <Button
            onClick={testLoadOnly}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Carregando...' : '🔍 Apenas Carregar'}
          </Button>
          
          <Button
            onClick={testSaveAndLoad}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Testando...' : '🔄 Salvar e Carregar'}
          </Button>
        </div>

        {/* Preview da logo */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Preview da Logo</h3>
          <img
            src={logoUrl}
            alt="Preview da logo"
            className="max-w-32 max-h-32 object-contain border border-gray-300 rounded"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/100x100/cccccc/666666?text=ERRO';
            }}
          />
        </div>

        {/* Resultado */}
        {result && (
          <div className={`p-6 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 ${
              result.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.success ? '✅ Sucesso!' : '❌ Erro'}
            </h3>
            
            <div className="space-y-2 text-sm">
              <p><strong>Ação:</strong> {result.action}</p>
              
              {result.message && (
                <p><strong>Mensagem:</strong> {result.message}</p>
              )}
              
              {result.error && (
                <p className="text-red-700"><strong>Erro:</strong> {result.error}</p>
              )}
              
              {result.action === 'save_and_load' && (
                <div className="bg-white p-3 rounded border">
                  <p><strong>URL Salva:</strong> <code>{result.savedUrl}</code></p>
                  <p><strong>URL Carregada:</strong> <code>{result.loadedUrl}</code></p>
                  <p><strong>Confere:</strong> {result.match ? '✅ Sim' : '❌ Não'}</p>
                </div>
              )}
              
              {result.logoUrl && (
                <p><strong>Logo URL:</strong> <code>{result.logoUrl}</code></p>
              )}
              
              {result.hasLogo !== undefined && (
                <p><strong>Tem Logo:</strong> {result.hasLogo ? '✅ Sim' : '❌ Não'}</p>
              )}
            </div>

            {result.config && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  Ver configuração completa
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(result.config, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Console */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            📋 Como Diagnosticar
          </h3>
          <ol className="text-yellow-800 text-sm space-y-1">
            <li><strong>1.</strong> Abra o Console do navegador (F12)</li>
            <li><strong>2.</strong> Execute os testes na ordem: Salvar → Carregar → Salvar e Carregar</li>
            <li><strong>3.</strong> Verifique os logs no console para cada operação</li>
            <li><strong>4.</strong> Se "Salvar e Carregar" falhar, há problema no Firestore</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
