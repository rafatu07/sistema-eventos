'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function TestLogoUrlPage() {
  const [url, setUrl] = useState('https://res.cloudinary.com/dxyc8dy6z/image/upload/v1754999774/logos/logo_1754999774174_taubate.png');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testUrl = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('Testing URL:', url);
      
      const response = await fetch(url, {
        method: 'HEAD', // Apenas headers, sem baixar conteúdo
      });
      
      const headers: { [key: string]: string } = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      setResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        url: response.url,
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

  const testImageLoad = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Teste básico de carregamento de imagem
      const img = new Image();
      
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve({
          success: true,
          width: img.naturalWidth,
          height: img.naturalHeight,
          message: 'Imagem carregada com sucesso no browser'
        });
        
        img.onerror = () => reject(new Error('Falha ao carregar imagem no browser'));
        
        img.crossOrigin = 'anonymous'; // Para evitar problemas de CORS
      });
      
      img.src = url;
      const loadResult = await loadPromise;
      
      setResult(loadResult);
      
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
        🔍 Teste de URL da Logo
      </h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL da Logo
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://res.cloudinary.com/..."
          />
        </div>

        <div className="flex gap-4">
          <Button
            onClick={testUrl}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Testando...' : 'Testar Headers'}
          </Button>
          
          <Button
            onClick={testImageLoad}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Carregando...' : 'Testar Carregamento'}
          </Button>
        </div>

        {/* Preview da imagem */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Preview</h3>
          <img
            src={url}
            alt="Preview da logo"
            className="max-w-xs max-h-48 object-contain border border-gray-300 rounded"
            onLoad={() => console.log('Preview image loaded successfully')}
            onError={() => console.log('Preview image failed to load')}
          />
        </div>

        {/* Resultado do teste */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 ${
              result.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.success ? '✅ Sucesso!' : '❌ Erro'}
            </h3>
            
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Informações úteis */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Informações Úteis
          </h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• URLs do Cloudinary devem ser públicas</li>
            <li>• Verifique se a imagem não foi deletada</li>
            <li>• Teste se a URL abre em uma nova aba</li>
            <li>• CORS pode bloquear carregamento de imagens</li>
          </ul>
        </div>

        {/* URLs de teste */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            🧪 URLs de Teste
          </h3>
          <div className="space-y-2 text-sm">
            <button
              onClick={() => setUrl('https://via.placeholder.com/150/7c3aed/ffffff?text=TESTE')}
              className="block text-left text-blue-600 hover:underline"
            >
              • Placeholder de teste (deve funcionar)
            </button>
            <button
              onClick={() => setUrl('https://res.cloudinary.com/demo/image/upload/sample')}
              className="block text-left text-blue-600 hover:underline"
            >
              • Imagem demo do Cloudinary (deve funcionar)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
