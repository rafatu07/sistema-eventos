'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface TestResult {
  success: boolean;
  message: string;
  certificateUrl?: string;
  certificateType?: string;
  debugInfo?: any;
}

export default function TestCertificatePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [eventId, setEventId] = useState('');

  const testCertificateGeneration = async () => {
    if (!eventId.trim()) {
      alert('Por favor, insira um ID de evento válido');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user',
          userName: 'Usuário de Teste',
          eventId: eventId,
          eventName: 'Evento de Teste',
          eventDate: new Date().toISOString(),
          eventStartTime: new Date().toISOString(),
          eventEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          certificateUrl: data.certificateUrl,
          certificateType: data.certificateType,
          debugInfo: data
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Erro desconhecido',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Erro de rede: ${error instanceof Error ? error.message : 'Desconhecido'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDebugGeneration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      setResult({
        success: response.ok,
        message: data.message,
        certificateUrl: data.certificateUrl,
        certificateType: data.certificateType,
        debugInfo: data
      });
    } catch (error) {
      setResult({
        success: false,
        message: `Erro de rede: ${error instanceof Error ? error.message : 'Desconhecido'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        🧪 Teste de Geração de Certificados
      </h1>

      <div className="space-y-8">
        {/* Teste com Event ID personalizado */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Teste com Event ID Personalizado
          </h2>
          <p className="text-blue-700 mb-4">
            Use o ID de um evento real que tenha configurações personalizadas salvas.
          </p>
          
          <div className="flex gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">
                Event ID
              </label>
              <input
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="ex: abc123"
                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <Button
              onClick={testCertificateGeneration}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Gerando...' : 'Testar Geração'}
            </Button>
          </div>
        </div>

        {/* Teste de debug */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h2 className="text-xl font-semibold text-green-900 mb-4">
            Teste Debug (Configurações Fixas)
          </h2>
          <p className="text-green-700 mb-4">
            Testa com configurações predefinidas (template elegante, logo, QR code).
          </p>
          
          <Button
            onClick={testDebugGeneration}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Testando...' : 'Teste Debug'}
          </Button>
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
            
            <p className={`mb-4 ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.message}
            </p>

            {result.certificateUrl && (
              <div className="space-y-3">
                <div>
                  <strong className="text-gray-700">URL do Certificado:</strong>
                  <br />
                  <a 
                    href={result.certificateUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {result.certificateUrl}
                  </a>
                </div>
                
                <div>
                  <strong className="text-gray-700">Tipo:</strong>
                  <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">
                    {result.certificateType}
                  </span>
                </div>

                {/* Preview do certificado */}
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Preview:</h4>
                  <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                    <img 
                      src={result.certificateUrl} 
                      alt="Preview do certificado"
                      className="max-w-full h-auto rounded"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {result.debugInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  Ver informações de debug
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(result.debugInfo, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            📋 Como usar
          </h3>
          <ul className="text-yellow-800 space-y-2 text-sm">
            <li><strong>1.</strong> Vá para a configuração do certificado de um evento</li>
            <li><strong>2.</strong> Configure template, logo, cores, etc.</li>
            <li><strong>3.</strong> Salve as configurações</li>
            <li><strong>4.</strong> Cole o ID do evento aqui e teste</li>
            <li><strong>5.</strong> Compare o resultado com o preview da configuração</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
