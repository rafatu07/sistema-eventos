'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function DebugSimplePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testWithRealEvent = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testando com evento real: OOCTF7tEKs5D2i9CjUMG');

      const response = await fetch('/api/debug-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: 'OOCTF7tEKs5D2i9CjUMG'
        }),
      });

      const data = await response.json();

      if (response.ok && data.certificateUrl) {
        setResult({
          success: true,
          certificateUrl: data.certificateUrl,
          message: 'Certificado gerado com sucesso!',
          data
        });
        
        // Abrir certificado automaticamente
        window.open(data.certificateUrl, '_blank');
      } else {
        setResult({
          success: false,
          error: data.error || 'Erro desconhecido',
          data
        });
      }

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        🚀 Teste Rápido de Certificado
      </h1>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm">
            Este teste vai gerar um certificado usando as configurações salvas do evento 
            <strong> OOCTF7tEKs5D2i9CjUMG</strong>. Se você configurou uma logo, ela deve aparecer.
          </p>
        </div>

        <Button
          onClick={testWithRealEvent}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Gerando certificado...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="text-xl mr-2">🧪</span>
              Gerar Certificado de Teste
            </div>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              result.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.success ? '✅ Sucesso!' : '❌ Erro'}
            </h3>
            
            {result.success && result.certificateUrl && (
              <div className="space-y-3">
                <p className="text-green-700">{result.message}</p>
                <div>
                  <strong>URL do Certificado:</strong>
                  <br />
                  <a 
                    href={result.certificateUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {result.certificateUrl}
                  </a>
                </div>
                <div className="border border-gray-200 rounded p-2">
                  <strong className="text-sm">Preview:</strong>
                  <img 
                    src={result.certificateUrl} 
                    alt="Certificado gerado"
                    className="w-full max-w-md mx-auto mt-2 rounded shadow"
                  />
                </div>
              </div>
            )}

            {result.error && (
              <p className="text-red-700">{result.error}</p>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Ver dados técnicos
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result.data || result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-900 mb-2">💡 Como usar:</h4>
          <ol className="text-yellow-800 text-sm space-y-1">
            <li><strong>1.</strong> Configure uma logo no certificado (se ainda não fez)</li>
            <li><strong>2.</strong> Clique "Salvar Configuração"</li>
            <li><strong>3.</strong> Clique no botão acima para testar</li>
            <li><strong>4.</strong> O certificado deve abrir em nova aba com sua logo</li>
          </ol>
        </div>

        <div className="text-center">
          <a 
            href="/dashboard/eventos/OOCTF7tEKs5D2i9CjUMG/certificado" 
            className="text-blue-600 hover:underline text-sm"
          >
            ← Voltar para Configuração do Certificado
          </a>
        </div>
      </div>
    </div>
  );
}
