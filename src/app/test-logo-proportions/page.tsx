'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function TestLogoProportionsPage() {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testProportions = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testando proporções da logo...');

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
          message: 'Certificado gerado! Verifique se a logo manteve as proporções corretas.'
        });
        
        // Abrir certificado automaticamente
        window.open(data.certificateUrl, '_blank');
      } else {
        setResult({
          success: false,
          error: data.error || 'Erro ao gerar certificado'
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
    <div className="max-w-3xl mx-auto p-6 bg-white">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        🔧 Teste de Proporções da Logo
      </h1>

      <div className="space-y-6">
        {/* Problema anterior */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Problema Anterior</h3>
          <div className="flex items-center space-x-4 mb-3">
            <div className="text-center">
              <div className="w-16 h-8 bg-blue-200 border border-blue-300 rounded flex items-center justify-center">
                <span className="text-xs text-blue-700 font-bold">LOGO</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Imagem original<br/>(392x97 px)</p>
            </div>
            
            <span className="text-red-500">→</span>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-red-200 border border-red-300 rounded flex items-center justify-center">
                <span className="text-xs text-red-700 font-bold">LOGO</span>
              </div>
              <p className="text-xs text-red-600 mt-1">No certificado<br/>(achatada para 150x150)</p>
            </div>
          </div>
          <p className="text-red-700 text-sm">
            <strong>Resultado:</strong> Logo ficava achatada/distorcida porque era forçada a ser quadrada.
          </p>
        </div>

        {/* Solução atual */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Solução Implementada</h3>
          <div className="flex items-center space-x-4 mb-3">
            <div className="text-center">
              <div className="w-16 h-8 bg-blue-200 border border-blue-300 rounded flex items-center justify-center">
                <span className="text-xs text-blue-700 font-bold">LOGO</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Imagem original<br/>(392x97 px)</p>
            </div>
            
            <span className="text-green-500">→</span>
            
            <div className="text-center">
              <div className="w-16 h-8 bg-green-200 border border-green-300 rounded flex items-center justify-center">
                <span className="text-xs text-green-700 font-bold">LOGO</span>
              </div>
              <p className="text-xs text-green-600 mt-1">No certificado<br/>(proporções mantidas)</p>
            </div>
          </div>
          <p className="text-green-700 text-sm">
            <strong>Resultado:</strong> Logo mantém suas proporções originais. O tamanho controla a maior dimensão.
          </p>
        </div>

        {/* Código técnico */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🔧 Mudança no Código</h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong className="text-red-600">❌ Antes:</strong>
              <code className="block bg-red-100 p-2 rounded mt-1 text-xs">
                ctx.drawImage(logo, logoX, logoY, logoSize, logoSize); // Forçava quadrado
              </code>
            </div>
            
            <div>
              <strong className="text-green-600">✅ Agora:</strong>
              <code className="block bg-green-100 p-2 rounded mt-1 text-xs">
                // Calcula proporções corretas<br/>
                const logoWidth = originalWidth > originalHeight ? maxSize : (originalWidth * maxSize) / originalHeight;<br/>
                const logoHeight = originalHeight > originalWidth ? maxSize : (originalHeight * maxSize) / originalWidth;<br/>
                ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight); // Mantém proporções
              </code>
            </div>
          </div>
        </div>

        {/* Teste */}
        <div className="text-center">
          <Button
            onClick={testProportions}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Gerando certificado...
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-xl mr-2">🧪</span>
                Testar Correção de Proporções
              </div>
            )}
          </Button>
        </div>

        {/* Resultado */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              result.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.success ? '✅ Teste Concluído!' : '❌ Erro no Teste'}
            </h3>
            
            {result.success && (
              <div className="space-y-3">
                <p className="text-green-700">{result.message}</p>
                <div>
                  <strong>Certificado gerado:</strong>
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
                
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium mb-2">✅ Verifique no certificado:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• A logo deve aparecer com proporções naturais</li>
                    <li>• Não deve estar achatada ou esticada</li>
                    <li>• O texto deve estar legível e proporcional</li>
                  </ul>
                </div>
              </div>
            )}

            {result.error && (
              <p className="text-red-700">{result.error}</p>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-900 mb-2">📋 Como verificar:</h4>
          <ol className="text-yellow-800 text-sm space-y-1">
            <li><strong>1.</strong> Clique no botão de teste acima</li>
            <li><strong>2.</strong> O certificado abrirá em nova aba automaticamente</li>
            <li><strong>3.</strong> Verifique se a logo (Prefeitura de Taubaté) aparece com proporções corretas</li>
            <li><strong>4.</strong> Compare com versões anteriores - não deve estar mais achatada</li>
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
