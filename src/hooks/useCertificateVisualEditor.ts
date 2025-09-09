import { useState, useCallback } from 'react';
import { CertificateConfig } from '@/types';

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

interface UseCertificateVisualEditorProps {
  initialConfig?: Partial<CertificateConfig>;
  onConfigChange?: (config: Partial<CertificateConfig>) => void;
}

const defaultElements: CertificateElement[] = [
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
  }
];

export const useCertificateVisualEditor = ({
  initialConfig,
  onConfigChange
}: UseCertificateVisualEditorProps = {}) => {
  const [backgroundImage, setBackgroundImage] = useState<string>(
    initialConfig?.backgroundImageUrl || ''
  );
  
  const [elements, setElements] = useState<CertificateElement[]>(() => {
    // Inicializar elementos com posições do config se disponível
    return defaultElements.map(element => ({
      ...element,
      position: initialConfig?.[`${element.type}Position` as keyof CertificateConfig] as Position || element.position,
      fontSize: initialConfig?.[`${element.type}FontSize` as keyof CertificateConfig] as number || element.fontSize
    }));
  });
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Atualizar imagem de fundo
  const updateBackgroundImage = useCallback((imageUrl: string) => {
    setBackgroundImage(imageUrl);
    onConfigChange?.({
      backgroundImageUrl: imageUrl,
      backgroundImageSize: 'cover',
      backgroundImagePosition: 'center'
    });
  }, [onConfigChange]);

  // Atualizar posição de elemento
  const updateElementPosition = useCallback((elementId: string, position: Position) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, position } : el
    ));

    const element = elements.find(el => el.id === elementId);
    if (element && onConfigChange) {
      const configUpdate: Partial<CertificateConfig> = {};
      
      switch (element.type) {
        case 'name':
          configUpdate.namePosition = position;
          break;
        case 'title':
          configUpdate.titlePosition = position;
          break;
        case 'eventName':
        case 'eventDate':
          configUpdate.bodyPosition = position;
          break;
      }
      
      onConfigChange(configUpdate);
    }
  }, [elements, onConfigChange]);

  // Atualizar propriedades de elemento
  const updateElementProperties = useCallback((
    elementId: string, 
    properties: { fontSize?: number; color?: string }
  ) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...properties } : el
    ));

    const element = elements.find(el => el.id === elementId);
    if (element && onConfigChange) {
      const configUpdate: Partial<CertificateConfig> = {};
      
      if (properties.fontSize) {
        switch (element.type) {
          case 'name':
            configUpdate.nameFontSize = properties.fontSize;
            break;
          case 'title':
            configUpdate.titleFontSize = properties.fontSize;
            break;
          case 'eventName':
          case 'eventDate':
            configUpdate.bodyFontSize = properties.fontSize;
            break;
        }
      }
      
      onConfigChange(configUpdate);
    }
  }, [elements, onConfigChange]);

  // Calcular posição relativa
  const calculateRelativePosition = useCallback((
    clickX: number, 
    clickY: number, 
    containerRect: DOMRect
  ): Position => {
    const x = ((clickX - containerRect.left) / containerRect.width) * 100;
    const y = ((clickY - containerRect.top) / containerRect.height) * 100;
    
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y))
    };
  }, []);

  // Resetar posições
  const resetPositions = useCallback(() => {
    setElements(defaultElements);
    onConfigChange?.({
      titlePosition: { x: 50, y: 25 },
      namePosition: { x: 50, y: 45 },
      bodyPosition: { x: 50, y: 60 }
    });
  }, [onConfigChange]);

  // Remover imagem de fundo
  const removeBackground = useCallback(() => {
    setBackgroundImage('');
    onConfigChange?.({
      backgroundImageUrl: undefined
    });
  }, [onConfigChange]);

  // Carregar configuração externa
  const loadConfig = useCallback((config: Partial<CertificateConfig>) => {
    if (config.backgroundImageUrl) {
      setBackgroundImage(config.backgroundImageUrl);
    }

    setElements(prev => prev.map(element => ({
      ...element,
      position: config[`${element.type}Position` as keyof CertificateConfig] as Position || element.position,
      fontSize: config[`${element.type}FontSize` as keyof CertificateConfig] as number || element.fontSize
    })));
  }, []);

  return {
    // Estados
    backgroundImage,
    elements,
    selectedElement,
    isPreviewMode,
    
    // Ações
    setSelectedElement,
    setIsPreviewMode,
    updateBackgroundImage,
    updateElementPosition,
    updateElementProperties,
    calculateRelativePosition,
    resetPositions,
    removeBackground,
    loadConfig,
    
    // Utilitários
    hasBackgroundImage: !!backgroundImage,
    selectedElementData: selectedElement ? elements.find(el => el.id === selectedElement) : null
  };
};
