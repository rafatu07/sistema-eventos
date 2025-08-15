// Utilitários para configurações de página de certificados

export interface PageDimensions {
  width: number;
  height: number;
  cssSize: string;
  certificateWidth: number;
  certificateHeight: number;
}

export interface MarginSettings {
  top: string;
  right: string;
  bottom: string;
  left: string;
  cssMargin: string;
}

/**
 * Configurações de dimensões para diferentes tamanhos de papel
 * Valores em pixels para 96dpi (padrão web) e dimensões otimizadas para certificados
 */
export const PAGE_SIZES: Record<string, PageDimensions> = {
  A4: {
    width: 1122,      // 297mm em pixels
    height: 794,      // 210mm em pixels  
    cssSize: 'A4',
    // Certificado ocupa mais espaço da página
    certificateWidth: 1000,   // Era 800px, agora maior
    certificateHeight: 700,   // Era 600px, agora maior
  },
  A3: {
    width: 1587,      // 420mm
    height: 1122,     // 297mm
    cssSize: 'A3',
    certificateWidth: 1400,
    certificateHeight: 980,
  },
  A5: {
    width: 794,       // 210mm
    height: 559,      // 148mm
    cssSize: 'A5',
    certificateWidth: 700,
    certificateHeight: 480,
  },
  Letter: {
    width: 1054,      // 8.5in
    height: 816,      // 11in
    cssSize: '8.5in 11in',
    certificateWidth: 950,
    certificateHeight: 720,
  },
  Legal: {
    width: 1054,      // 8.5in
    height: 1344,     // 14in
    cssSize: '8.5in 14in',
    certificateWidth: 950,
    certificateHeight: 1200,
  }
};

/**
 * Configurações de margem para diferentes estilos
 */
export const MARGIN_SETTINGS: Record<string, MarginSettings> = {
  narrow: {
    top: '0.3in',
    right: '0.3in', 
    bottom: '0.3in',
    left: '0.3in',
    cssMargin: '0.3in',
  },
  normal: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in', 
    left: '0.5in',
    cssMargin: '0.5in',
  },
  wide: {
    top: '0.8in',
    right: '0.8in',
    bottom: '0.8in',
    left: '0.8in',
    cssMargin: '0.8in',
  }
};

/**
 * Obtém as dimensões da página baseado na configuração
 */
export function getPageDimensions(pageSize: string, orientation: 'landscape' | 'portrait'): PageDimensions {
  // Valores padrão A4
  const defaultDimensions: PageDimensions = {
    width: 1122,
    height: 794,
    cssSize: 'A4',
    certificateWidth: 1000,
    certificateHeight: 700,
  };
  
  // Tentar obter as dimensões específicas ou usar padrão
  const pageKey = pageSize as keyof typeof PAGE_SIZES;
  const baseDimensions = PAGE_SIZES[pageKey] || defaultDimensions;
  
  if (orientation === 'portrait') {
    return {
      cssSize: baseDimensions.cssSize,
      width: baseDimensions.height,
      height: baseDimensions.width,
      certificateWidth: baseDimensions.certificateHeight,
      certificateHeight: baseDimensions.certificateWidth,
    };
  }
  
  return {
    cssSize: baseDimensions.cssSize,
    width: baseDimensions.width,
    height: baseDimensions.height,
    certificateWidth: baseDimensions.certificateWidth,
    certificateHeight: baseDimensions.certificateHeight,
  };
}

/**
 * Obtém as configurações de margem
 */
export function getMarginSettings(marginType: string): MarginSettings {
  // Valores padrão (normal)
  const defaultMargins: MarginSettings = {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
    cssMargin: '0.5in',
  };
  
  const marginKey = marginType as keyof typeof MARGIN_SETTINGS;
  return MARGIN_SETTINGS[marginKey] || defaultMargins;
}

/**
 * Gera o CSS @page baseado nas configurações
 */
export function generatePageCSS(pageSize: string, orientation: 'landscape' | 'portrait', marginType: string): string {
  const dimensions = getPageDimensions(pageSize, orientation);
  const margins = getMarginSettings(marginType);
  
  return `
    @page {
      size: ${dimensions.cssSize} ${orientation};
      margin: ${margins.cssMargin};
    }
  `;
}

/**
 * Informações sobre os tamanhos de papel para exibição no UI
 */
export const PAGE_SIZE_INFO = {
  A4: {
    name: 'A4',
    description: '297×210mm - Padrão internacional',
    dimensions: '297×210mm',
    recommended: true,
  },
  A3: {
    name: 'A3', 
    description: '420×297mm - Tamanho grande',
    dimensions: '420×297mm',
    recommended: false,
  },
  A5: {
    name: 'A5',
    description: '210×148mm - Tamanho compacto', 
    dimensions: '210×148mm',
    recommended: false,
  },
  Letter: {
    name: 'Letter',
    description: '8.5×11in - Padrão americano',
    dimensions: '216×279mm',
    recommended: false,
  },
  Legal: {
    name: 'Legal',
    description: '8.5×14in - Formato jurídico',
    dimensions: '216×356mm', 
    recommended: false,
  }
};

export const MARGIN_INFO = {
  narrow: {
    name: 'Estreita',
    description: 'Margens pequenas (7.6mm)',
    value: '0.3in'
  },
  normal: {
    name: 'Normal', 
    description: 'Margens padrão (12.7mm)',
    value: '0.5in'
  },
  wide: {
    name: 'Ampla',
    description: 'Margens grandes (20.3mm)', 
    value: '0.8in'
  }
};
