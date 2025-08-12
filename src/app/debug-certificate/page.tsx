'use client';

import { useState } from 'react';

export default function DebugCertificatePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [eventId, setEventId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testCertificateGeneration = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/debug-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: eventId.trim() || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.details || data.error || 'Erro desconhecido');
      }
    } catch (err) {
      setError('Erro de rede: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Debug - Teste de Certificado
          </h1>
          
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event ID (opcional - deixe vazio para usar configuração padrão)
              </label>
              <input
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Ex: OOCTF7tEKs5D2i9CjUMG"
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se fornecido, usará as configurações reais salvas do evento
              </p>
            </div>
            
            <button
              onClick={testCertificateGeneration}
              disabled={isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Gerando certificado de teste...
                </div>
              ) : (
                '🧪 Testar Geração de Certificado'
              )}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Erro</h3>
              <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Sucesso</h3>
                <p className="text-green-700">{result.message}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">📊 Informações</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Public ID:</strong> {result.publicId}
                    </div>
                    <div>
                      <strong>Tipo:</strong> <span className={`px-2 py-1 rounded text-xs ${
                        result.certificateType === 'image' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {result.certificateType === 'image' ? '🖼️ Imagem PNG' : '📄 PDF'}
                      </span>
                    </div>
                    <div>
                      <strong>Tamanho:</strong> {result.pdfSize || result.imageSize || 'N/A'} bytes
                    </div>
                    <div>
                      <strong>Timestamp:</strong> {result.debug?.timestamp}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-3">⚙️ Debug Info</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Cloud Name:</strong> {result.debug?.cloudName}
                    </div>
                    <div>
                      <strong>API Key:</strong> {result.debug?.hasApiKey ? '✅ Configurada' : '❌ Não encontrada'}
                    </div>
                    <div>
                      <strong>API Secret:</strong> {result.debug?.hasApiSecret ? '✅ Configurada' : '❌ Não encontrada'}
                    </div>
                  </div>
                </div>
              </div>

              {result.certificateUrl && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3">🔗 URL do Certificado</h4>
                  <div className="space-y-3">
                    <div className="break-all text-sm font-mono bg-gray-100 p-2 rounded">
                      {result.certificateUrl}
                    </div>
                    <div className="flex space-x-3">
                      <a
                        href={result.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm"
                      >
                        📄 Abrir Certificado
                      </a>
                      <button
                        onClick={() => navigator.clipboard.writeText(result.certificateUrl)}
                        className="btn-outline text-sm"
                      >
                        📋 Copiar URL
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">ℹ️ Como usar</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Clique no botão "Testar Geração de Certificado"</li>
              <li>Aguarde o processo de geração e upload</li>
              <li>Se bem-sucedido, clique em "Abrir Certificado" para verificar</li>
              <li>Se der erro, verifique as configurações do Cloudinary</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
