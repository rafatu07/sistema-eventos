'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { CertificateConfig } from '@/types';
import { Upload, Move, Type, Eye, RotateCcw, Trash2 } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface CertificateElement {
  id: string;
  type: 'name' | 'eventName' | 'eventDate' | 'eventTime' | 'title' | 'subtitle' | 'body' | 'footer';
  label: string;
  position: Position;
  fontSize: number;
  color: string;
  placeholder: string;
}

interface CertificateVisualEditorProps {
  config?: Partial<CertificateConfig>;
  onConfigChange?: (config: Partial<CertificateConfig>) => void;
  eventName: string;
  eventDate: string;
}

// Todos os elementos disponíveis para escolher
const availableElements: CertificateElement[] = [
  {
    id: 'name',
    type: 'name',
    label: 'Nome do Participante',
    position: { x: 50, y: 45 },
    fontSize: 24,
    color: '#000000',
    placeholder: 'João Silva'
  },
  {
    id: 'title',
    type: 'title',
    label: 'Título do Certificado',
    position: { x: 50, y: 25 },
    fontSize: 28,
    color: '#000000',
    placeholder: 'CERTIFICADO DE PARTICIPAÇÃO'
  },
  {
    id: 'eventName',
    type: 'eventName',
    label: 'Nome do Evento',
    position: { x: 50, y: 60 },
    fontSize: 16,
    color: '#333333',
    placeholder: 'Nome do Evento'
  },
  {
    id: 'eventDate',
    type: 'eventDate',
    label: 'Data do Evento',
    position: { x: 50, y: 70 },
    fontSize: 14,
    color: '#666666',
    placeholder: '18 de setembro de 2025'
  },
  {
    id: 'subtitle',
    type: 'subtitle',
    label: 'Subtítulo',
    position: { x: 50, y: 35 },
    fontSize: 16,
    color: '#666666',
    placeholder: 'Subtítulo do certificado'
  },
  {
    id: 'body',
    type: 'body',
    label: 'Texto do Corpo',
    position: { x: 50, y: 75 },
    fontSize: 12,
    color: '#333333',
    placeholder: 'Texto adicional do certificado'
  },
  {
    id: 'footer',
    type: 'footer',
    label: 'Rodapé',
    position: { x: 50, y: 85 },
    fontSize: 10,
    color: '#999999',
    placeholder: 'Rodapé do certificado'
  }
];

// Elementos padrão (apenas o nome inicialmente)
const defaultActiveElements = ['name'];

export const CertificateVisualEditor: React.FC<CertificateVisualEditorProps> = ({
  config,
  onConfigChange,
  eventName,
  eventDate
}) => {
  // Debug: verificar se as props estão sendo recebidas corretamente
  console.log('🎨 CertificateVisualEditor montado com config:', config);
  
  // Usar configuração padrão se não houver config
  const safeConfig = useMemo(() => config || {
    titlePosition: { x: 50, y: 25 },
    namePosition: { x: 50, y: 45 },
    bodyPosition: { x: 50, y: 60 },
    titleFontSize: 28,
    nameFontSize: 24,
    bodyFontSize: 16
  }, [config]);
  const [backgroundImage, setBackgroundImage] = useState<string>(safeConfig.backgroundImageUrl || '');
  // Estado para elementos ativos (quais estão sendo usados)
  const [activeElementIds, setActiveElementIds] = useState<string[]>(() => {
    // Usar elementos do config se disponível, senão usar padrão
    const configElements = safeConfig.activeElements || defaultActiveElements;
    return configElements;
  });

  // Elementos ativos com configurações aplicadas
  const [elements, setElements] = useState<CertificateElement[]>(() => {
    const activeIds = safeConfig.activeElements || defaultActiveElements;
    return availableElements
      .filter(element => activeIds.includes(element.id))
      .map(element => ({
        ...element,
        position: (() => {
          switch (element.type) {
            case 'name':
              return safeConfig.namePosition || element.position;
            case 'title':
              return safeConfig.titlePosition || element.position;
            case 'eventName':
            case 'eventDate':
              return safeConfig.bodyPosition || element.position;
            default:
              return element.position;
          }
        })(),
        fontSize: (() => {
          switch (element.type) {
            case 'name':
              return safeConfig.nameFontSize || element.fontSize;
            case 'title':
              return safeConfig.titleFontSize || element.fontSize;
            case 'eventName':
            case 'eventDate':
              return safeConfig.bodyFontSize || element.fontSize;
            default:
              return element.fontSize;
          }
        })()
      }));
  });
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload de imagem
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setBackgroundImage(imageUrl);
        if (onConfigChange && typeof onConfigChange === 'function') {
          onConfigChange({
            ...safeConfig,
            backgroundImageUrl: imageUrl,
            backgroundImageSize: 'cover',
            backgroundImagePosition: 'center'
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }, [safeConfig, onConfigChange]);

  // Calcular posição relativa baseada no clique
  const calculateRelativePosition = useCallback((clientX: number, clientY: number): Position => {
    if (!imageRef.current) return { x: 50, y: 50 };
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y))
    };
  }, []);

  // Posicionar elemento no clique
  const handleImageClick = useCallback((event: React.MouseEvent) => {
    if (!selectedElement || isPreviewMode) return;
    
    const position = calculateRelativePosition(event.clientX, event.clientY);
    
    setElements(prev => prev.map(el => 
      el.id === selectedElement 
        ? { ...el, position }
        : el
    ));

    // Atualizar config baseado no tipo do elemento
    const element = elements.find(el => el.id === selectedElement);
    if (element) {
      const configUpdate: Partial<CertificateConfig> = {};
      
      switch (element.type) {
        case 'name':
          configUpdate.namePosition = position;
          configUpdate.nameFontSize = element.fontSize;
          break;
        case 'title':
          configUpdate.titlePosition = position;
          configUpdate.titleFontSize = element.fontSize;
          break;
        case 'eventName':
        case 'eventDate':
          configUpdate.bodyPosition = position;
          configUpdate.bodyFontSize = element.fontSize;
          break;
      }
      
      // Verificar se onConfigChange é uma função antes de chamar
      if (onConfigChange && typeof onConfigChange === 'function') {
        onConfigChange({ ...safeConfig, ...configUpdate });
      }
    }
  }, [selectedElement, isPreviewMode, elements, safeConfig, onConfigChange, calculateRelativePosition]);

  // Atualizar propriedades do elemento
  const updateElement = useCallback((id: string, updates: Partial<CertificateElement>) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  }, []);

  // Adicionar elemento à lista ativa
  const addElement = useCallback((elementId: string) => {
    if (!activeElementIds.includes(elementId)) {
      const newActiveIds = [...activeElementIds, elementId];
      setActiveElementIds(newActiveIds);
      
      // Encontrar o elemento na lista disponível
      const elementToAdd = availableElements.find(el => el.id === elementId);
      if (elementToAdd) {
        setElements(prev => [...prev, elementToAdd]);
        
        // Atualizar configuração
        if (onConfigChange && typeof onConfigChange === 'function') {
          onConfigChange({
            ...safeConfig,
            activeElements: newActiveIds
          });
        }
      }
    }
  }, [activeElementIds, safeConfig, onConfigChange]);

  // Remover elemento da lista ativa
  const removeElement = useCallback((elementId: string) => {
    const newActiveIds = activeElementIds.filter(id => id !== elementId);
    setActiveElementIds(newActiveIds);
    setElements(prev => prev.filter(el => el.id !== elementId));
    
    // Se era o elemento selecionado, desselecionar
    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
    
    // ✅ CRÍTICO: Limpar campos específicos quando remove elementos
    const configUpdates: Partial<CertificateConfig> = {
      ...safeConfig,
      activeElements: newActiveIds
    };
    
    // Limpar campos específicos baseado no elemento removido
    switch (elementId) {
      case 'title':
        configUpdates.title = '';
        console.log('🗑️ REMOVENDO TÍTULO - limpando config.title');
        break;
      case 'subtitle':
        configUpdates.subtitle = '';
        console.log('🗑️ REMOVENDO SUBTÍTULO - limpando config.subtitle');
        break;
      case 'footer':
        configUpdates.footer = '';
        console.log('🗑️ REMOVENDO FOOTER - limpando config.footer');
        break;
      default:
        console.log('🗑️ REMOVENDO ELEMENTO:', elementId, '- sem campo específico para limpar');
        break;
    }
    
    // Atualizar configuração
    if (onConfigChange && typeof onConfigChange === 'function') {
      onConfigChange(configUpdates);
    }
  }, [activeElementIds, selectedElement, safeConfig, onConfigChange]);

  // Resetar posições
  const resetPositions = useCallback(() => {
    const defaultElements = availableElements.filter(el => defaultActiveElements.includes(el.id));
    setElements(defaultElements);
    setActiveElementIds(defaultActiveElements);
    if (onConfigChange && typeof onConfigChange === 'function') {
      onConfigChange({
        ...safeConfig,
        activeElements: defaultActiveElements,
        titlePosition: { x: 50, y: 25 },
        namePosition: { x: 50, y: 45 },
        bodyPosition: { x: 50, y: 60 }
      });
    }
  }, [safeConfig, onConfigChange]);

  // Remover imagem de fundo
  const removeBackground = useCallback(() => {
    setBackgroundImage('');
    if (onConfigChange && typeof onConfigChange === 'function') {
      onConfigChange({
        ...safeConfig,
        backgroundImageUrl: undefined
      });
    }
  }, [safeConfig, onConfigChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Editor Visual de Certificado</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm ${
              isPreviewMode 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreviewMode ? 'Editando' : 'Preview'}
          </button>
          <button
            onClick={resetPositions}
            className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controle */}
        <div className="lg:col-span-1 space-y-4">
          {/* Upload de Imagem */}
          <div className="card">
            <div className="card-content">
              <h4 className="font-medium text-gray-900 mb-3">Imagem de Fundo</h4>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <Upload className="h-5 w-5 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {backgroundImage ? 'Trocar Imagem' : 'Upload Imagem'}
                  </span>
                </button>
                
                {backgroundImage && (
                  <button
                    onClick={removeBackground}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remover imagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {backgroundImage && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  ✅ Imagem carregada! Clique nos elementos à esquerda e depois clique na imagem para posicionar.
                </div>
              )}
            </div>
          </div>

          {/* Elementos Ativos */}
          <div className="card">
            <div className="card-content">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Elementos Ativos</h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {elements.length} ativo(s)
                </span>
              </div>
              
              {!isPreviewMode && (
                <p className="text-sm text-gray-600 mb-4">
                  Selecione um elemento e clique na imagem para posicioná-lo:
                </p>
              )}
              
              <div className="space-y-3">
                {elements.map((element) => (
                  <div
                    key={element.id}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedElement === element.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center cursor-pointer flex-1"
                        onClick={() => !isPreviewMode && setSelectedElement(element.id)}
                      >
                        <Type className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-sm font-medium">{element.label}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {selectedElement === element.id && !isPreviewMode && (
                          <Move className="h-4 w-4 text-blue-500" />
                        )}
                        {!isPreviewMode && (
                          <button
                            onClick={() => removeElement(element.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remover elemento"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {!isPreviewMode && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Tamanho</label>
                          <input
                            type="number"
                            value={element.fontSize}
                            onChange={(e) => updateElement(element.id, { 
                              fontSize: parseInt(e.target.value) || 14 
                            })}
                            className="w-full text-xs border rounded px-2 py-1 mt-1"
                            min="8"
                            max="72"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Cor</label>
                          <input
                            type="color"
                            value={element.color}
                            onChange={(e) => updateElement(element.id, { color: e.target.value })}
                            className="w-full h-8 border rounded mt-1"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Posição: X: {Math.round(element.position.x)}%, Y: {Math.round(element.position.y)}%
                    </div>
                  </div>
                ))}
                
                {elements.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum elemento ativo</p>
                    <p className="text-xs">Adicione elementos da lista abaixo</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Elementos Disponíveis para Adicionar */}
          {!isPreviewMode && (
            <div className="card">
              <div className="card-content">
                <h4 className="font-medium text-gray-900 mb-3">Adicionar Elementos</h4>
                
                <div className="space-y-2">
                  {availableElements
                    .filter(element => !activeElementIds.includes(element.id))
                    .map((element) => (
                      <button
                        key={element.id}
                        onClick={() => addElement(element.id)}
                        className="w-full flex items-center justify-between p-2 text-left border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <Type className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm">{element.label}</span>
                        </div>
                        <span className="text-blue-600 text-sm">+ Adicionar</span>
                      </button>
                    ))}
                  
                  {availableElements.filter(el => !activeElementIds.includes(el.id)).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">Todos os elementos estão ativos</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Área de Preview/Edição */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-content">
              <div
                ref={imageRef}
                className={`relative w-full aspect-[4/3] bg-gray-50 border-2 rounded-lg overflow-hidden ${
                  !isPreviewMode && selectedElement 
                    ? 'border-blue-300 cursor-crosshair' 
                    : 'border-gray-200'
                }`}
                onClick={handleImageClick}
                style={{
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {!backgroundImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Upload className="h-12 w-12 mx-auto mb-2" />
                      <p>Faça upload de uma imagem de certificado</p>
                    </div>
                  </div>
                )}

                {/* Elementos posicionados */}
                {backgroundImage && elements.map((element) => (
                  <div
                    key={element.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                      !isPreviewMode ? 'border-2 border-dashed' : ''
                    } ${
                      selectedElement === element.id && !isPreviewMode
                        ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                        : 'border-gray-400'
                    }`}
                    style={{
                      left: `${element.position.x}%`,
                      top: `${element.position.y}%`,
                      fontSize: `${Math.max(element.fontSize * 0.5, 8)}px`,
                      color: element.color,
                      fontWeight: element.type === 'name' || element.type === 'title' ? 'bold' : 'normal',
                      padding: isPreviewMode ? '0' : '4px 8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {element.type === 'name' && 'João Silva'}
                    {element.type === 'title' && 'CERTIFICADO DE PARTICIPAÇÃO'}
                    {element.type === 'eventName' && (eventName || 'Nome do Evento')}
                    {element.type === 'eventDate' && (eventDate || '18 de setembro de 2025')}
                    {element.type === 'subtitle' && (isPreviewMode ? 'Subtítulo do certificado' : element.placeholder)}
                    {element.type === 'body' && (isPreviewMode ? 'Texto do corpo do certificado' : element.placeholder)}
                    {element.type === 'footer' && (isPreviewMode ? 'Rodapé do certificado' : element.placeholder)}
                  </div>
                ))}

                {/* Indicador de elemento selecionado */}
                {!isPreviewMode && selectedElement && backgroundImage && (
                  <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">
                    Clique para posicionar: {elements.find(el => el.id === selectedElement)?.label}
                  </div>
                )}
              </div>

              {/* Instruções */}
              {!isPreviewMode && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Como usar:</h5>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. Faça upload da imagem do seu certificado</li>
                    <li>2. Selecione um elemento na lista à esquerda</li>
                    <li>3. Clique na posição exata da imagem onde o elemento deve aparecer</li>
                    <li>4. Ajuste o tamanho e cor se necessário</li>
                    <li>5. Use o botão &quot;Preview&quot; para ver o resultado final</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
