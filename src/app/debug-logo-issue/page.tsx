'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function DebugLogoIssuePage() {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<any>(null);

  const runFullTest = async () => {
    setStep(0);
    setResult(null);

    const eventId = 'OOCTF7tEKs5D2i9CjUMG';
    const testLogoUrl = 'https://via.placeholder.com/100x100/7c3aed/ffffff?text=DEBUG+TEST';

    try {
      // Step 1: Limpar configuração existente
      setStep(1);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Salvar nova configuração com logo
      setStep(2);
      console.log('🔄 Salvando configuração com logo...');
      
      const saveResponse = await fetch('/api/test-save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          configData: {
            template: 'elegant',
            logoUrl: testLogoUrl,
            title: 'Teste Debug Logo - ' + new Date().toISOString(),
            primaryColor: '#7c3aed'
          }
        }),
      });
      
      const saveData = await saveResponse.json();
      console.log('Resultado do save:', saveData);
      
      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Erro ao salvar');
      }
      
      // Step 3: Aguardar propagação
      setStep(3);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 4: Carregar configuração novamente
      setStep(4);
      console.log('🔍 Carregando configuração...');
      
      const loadResponse = await fetch(`/api/get-config/${eventId}`);
      const loadData = await loadResponse.json();
      console.log('Resultado do load:', loadData);
      
      // Step 5: Verificar resultado
      setStep(5);
      const logoFound = loadData.config && loadData.config.logoUrl === testLogoUrl;
      
      setResult({
        success: logoFound,
        steps: {
          save: saveData,
          load: loadData
        },
        analysis: {
          logoUrlSaved: testLogoUrl,
          logoUrlLoaded: loadData.config?.logoUrl || 'NÃO ENCONTRADA',
          match: logoFound,
          savedAt: saveData.timestamp,
          loadedAt: new Date().toISOString()
        }
      });
      
      setStep(6);
      
    } catch (error) {
      console.error('Erro no teste:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        step: step
      });
      setStep(-1);
    }
  };

  const testDirectFirestore = async () => {
    setStep(0);
    setResult(null);

    try {
      setStep(1);
      
      const response = await fetch('/api/debug-firestore-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: 'OOCTF7tEKs5D2i9CjUMG',
          logoUrl: 'https://via.placeholder.com/150x150/ff0000/ffffff?text=DIRECT+TEST'
        }),
      });
      
      const data = await response.json();
      setResult(data);
      setStep(2);
      
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      setStep(-1);
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 0: return 'Preparando teste...';
      case 1: return '🧹 Limpando configuração anterior...';
      case 2: return '💾 Salvando configuração com logo...';
      case 3: return '⏳ Aguardando propagação no Firestore...';
      case 4: return '🔍 Carregando configuração do banco...';
      case 5: return '🔬 Analisando resultado...';
      case 6: return '✅ Teste concluído!';
      case -1: return '❌ Erro no teste';
      default: return 'Aguardando...';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        🐛 Debug - Problema de Logo Não Salvar
      </h1>

      <div className="space-y-6">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            🎯 Objetivo do Teste
          </h3>
          <p className="text-yellow-800 text-sm">
            Este teste vai simular exatamente o que acontece quando você:
            <br />1. Faz upload de uma logo
            <br />2. Salva a configuração
            <br />3. Recarrega a página
            <br />4. Verifica se a logo ainda está lá
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={runFullTest}
            disabled={step > 0 && step < 6}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {step > 0 && step < 6 ? 'Testando...' : '🧪 Executar Teste Completo'}
          </Button>
          
          <Button
            onClick={testDirectFirestore}
            disabled={step > 0 && step < 6}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {step > 0 && step < 6 ? 'Testando...' : '🔥 Teste Direto Firestore'}
          </Button>
        </div>

        {/* Status do teste */}
        {step > 0 && step < 6 && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-blue-800 font-medium">{getStepMessage()}</span>
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className={`p-6 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              result.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.success ? '✅ LOGO SENDO SALVA CORRETAMENTE!' : '❌ PROBLEMA CONFIRMADO!'}
            </h3>
            
            {result.analysis && (
              <div className="space-y-3 text-sm">
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-semibold mb-2">📊 Análise:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <strong>URL Salva:</strong>
                      <br />
                      <code className="text-xs break-all">{result.analysis.logoUrlSaved}</code>
                    </div>
                    <div>
                      <strong>URL Carregada:</strong>
                      <br />
                      <code className="text-xs break-all">{result.analysis.logoUrlLoaded}</code>
                    </div>
                  </div>
                  <div className="mt-2">
                    <strong>Resultado:</strong> {result.analysis.match ? '✅ Combinam' : '❌ Não combinam'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <img 
                    src={result.analysis.logoUrlSaved} 
                    alt="Logo salva"
                    className="max-w-24 max-h-24 object-contain border border-gray-300 rounded"
                  />
                  {result.analysis.logoUrlLoaded !== 'NÃO ENCONTRADA' && (
                    <img 
                      src={result.analysis.logoUrlLoaded} 
                      alt="Logo carregada"
                      className="max-w-24 max-h-24 object-contain border border-gray-300 rounded"
                    />
                  )}
                </div>
              </div>
            )}

            {result.error && (
              <div className="text-red-700 mb-4">
                <strong>Erro:</strong> {result.error}
                <br />
                <strong>No step:</strong> {result.step}
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Ver dados técnicos completos
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            📋 Como interpretar
          </h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li><strong>✅ Verde:</strong> Logo está sendo salva e carregada corretamente</li>
            <li><strong>❌ Vermelho:</strong> Há um problema no processo de salvamento/carregamento</li>
            <li><strong>Dados técnicos:</strong> Mostram exatamente o que foi salvo vs o que foi carregado</li>
            <li><strong>Console:</strong> Abra F12 para ver logs detalhados do processo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
