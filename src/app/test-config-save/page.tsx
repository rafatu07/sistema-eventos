'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { updateCertificateConfig } from '@/lib/certificate-config';

export default function TestConfigSavePage() {
  const [eventId, setEventId] = useState('OOCTF7tEKs5D2i9CjUMG');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConfigSave = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testando salvamento de configuração...');
      
      const testConfig = {
        template: 'elegant' as const,
        orientation: 'landscape' as const,
        primaryColor: '#7c3aed',
        secondaryColor: '#6b7280',
        backgroundColor: '#ffffff',
        borderColor: '#c4b5fd',
        titleFontSize: 24,
        nameFontSize: 18,
        bodyFontSize: 12,
        fontFamily: 'times' as const,
        title: 'Certificado de Excelência - TESTE',
        subtitle: 'Reconhecimento de Participação',
        bodyText: 'Por meio deste, certificamos que {userName} participou com distinção do evento {eventName}, demonstrando dedicação e comprometimento, realizado em {eventDate} das {eventTime}.',
        footer: 'Organização Certificada',
        titlePosition: { x: 50, y: 22 },
        namePosition: { x: 50, y: 42 },
        bodyPosition: { x: 50, y: 62 },
        logoUrl: 'https://via.placeholder.com/100x100/7c3aed/ffffff?text=TESTE',
        logoSize: 75,
        logoPosition: { x: 12, y: 18 },
        showBorder: true,
        borderWidth: 2,
        showWatermark: false,
        watermarkText: 'TESTE',
        watermarkOpacity: 0.08,
        includeQRCode: true,
        qrCodeText: `https://sistema-eventos.vercel.app/validate/${eventId}/teste`,
        qrCodePosition: { x: 88, y: 18 },
        createdBy: 'test-user',
      };

      console.log('Configuração a ser salva:', testConfig);
      
      await updateCertificateConfig(eventId, testConfig);
      
      setResult({
        success: true,
        message: 'Configuração salva com sucesso!',
        eventId,
        config: testConfig
      });

    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventId
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDebugWithEventId = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testando debug com Event ID...');
      
      const response = await fetch('/api/debug-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: eventId
        }),
      });

      const data = await response.json();
      
      setResult({
        success: response.ok,
        certificateUrl: data.certificateUrl,
        debugResponse: data
      });

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        🧪 Teste de Salvamento de Configuração
      </h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event ID
          </label>
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="OOCTF7tEKs5D2i9CjUMG"
          />
        </div>

        <div className="flex gap-4">
          <Button
            onClick={testConfigSave}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Salvando...' : '💾 Testar Salvamento'}
          </Button>
          
          <Button
            onClick={testDebugWithEventId}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Gerando...' : '🧪 Testar Debug com Config Real'}
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
            
            {result.message && (
              <p className={`mb-4 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
            )}

            {result.error && (
              <p className="text-red-700 mb-4">
                {result.error}
              </p>
            )}

            {result.certificateUrl && (
              <div className="space-y-3">
                <div>
                  <strong className="text-gray-700">Certificado gerado:</strong>
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

                {/* Preview */}
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Preview:</h4>
                  <img 
                    src={result.certificateUrl} 
                    alt="Certificado gerado"
                    className="max-w-full h-auto rounded border border-gray-200"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Ver dados completos
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Como usar
          </h3>
          <ol className="text-blue-800 space-y-2 text-sm">
            <li><strong>1.</strong> Cole o Event ID do evento que você configurou</li>
            <li><strong>2.</strong> Clique em "Testar Salvamento" para salvar uma configuração de teste</li>
            <li><strong>3.</strong> Clique em "Testar Debug" para gerar um certificado com a configuração salva</li>
            <li><strong>4.</strong> Compare o resultado com o que você configurou na interface</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
