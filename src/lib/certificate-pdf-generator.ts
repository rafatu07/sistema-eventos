// Importação dinâmica para compatibilidade com Next.js
import { CertificateConfig } from '@/types';
import { formatDateBrazil, formatTimeRangeBrazil, formatTimeBrazil } from '@/lib/date-utils';
import { getPageDimensions, getMarginSettings, generatePageCSS } from '@/lib/page-utils';
import { getBaseUrl } from '@/lib/url-detector';
import QRCode from 'qrcode';

/**
 * Interface para dados do certificado PDF
 */
export interface CertificatePDFData {
  userName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
  eventId: string;
  registrationId?: string;
  config?: CertificateConfig | null;
}

/**
 * Gera um certificado em formato PDF usando o componente reutilizável
 * 
 * Esta função utiliza o componente React de certificado existente (CertificatePreview)
 * e o converte para PDF mantendo todas as configurações personalizadas
 */
export const generateCertificatePDF = async (data: CertificatePDFData): Promise<Buffer> => {
  try {
    console.log('🚀 Iniciando geração de certificado PDF');
    console.log('📋 Dados recebidos:', {
      userName: data.userName,
      eventName: data.eventName,
      eventDate: data.eventDate,
      hasConfig: !!data.config,
      template: data.config?.template || 'default'
    });

    // Validar dados de entrada
    validateCertificateData(data);

    // ✅ CORREÇÃO: Usar configurações personalizadas salvas ou fallbacks padrão
    const certificateConfig = {
      // Configurações básicas
      template: data.config?.template || 'elegant',
      orientation: data.config?.orientation || 'landscape',
      pageSize: data.config?.pageSize || 'A4',
      pageMargin: data.config?.pageMargin || 'normal',
      
      // Cores personalizadas
      primaryColor: data.config?.primaryColor || '#7c3aed',
      secondaryColor: data.config?.secondaryColor || '#6b7280',
      backgroundColor: data.config?.backgroundColor || '#ffffff',
      
      // ✅ Textos personalizados - respeitando elementos ativos
      title: data.config?.title || (data.config?.activeElements?.includes('title') ? 'Certificado de Participação' : ''),
      subtitle: data.config?.subtitle || '',
      bodyText: data.config?.bodyText || 'Certificamos que {userName} participou do evento {eventName}, realizado em {eventDate} das {eventTime}.',
      footer: data.config?.footer || '',
      
      // Posicionamento personalizado
      titlePosition: data.config?.titlePosition || { x: 50, y: 25 },
      namePosition: data.config?.namePosition || { x: 50, y: 45 },
      bodyPosition: data.config?.bodyPosition || { x: 50, y: 65 },
      logoPosition: data.config?.logoPosition || { x: 10, y: 10 },
      qrCodePosition: data.config?.qrCodePosition || { x: 85, y: 85 },
      
      // Tamanhos de fonte personalizados
      titleFontSize: data.config?.titleFontSize || 24,
      nameFontSize: data.config?.nameFontSize || 18,
      bodyFontSize: data.config?.bodyFontSize || 12,
      
      // Logo personalizada
      logoUrl: data.config?.logoUrl || '',
      logoSize: data.config?.logoSize || 80,
      
      // ✨ Imagem de fundo original - SEM degradação
      backgroundImageUrl: data.config?.backgroundImageUrl || '',
      backgroundImageOpacity: 1.0, // ✅ OPACIDADE TOTAL - sem overlay que degrada
      backgroundImageSize: data.config?.backgroundImageSize || 'cover',
      backgroundImagePosition: data.config?.backgroundImagePosition || 'center',
      
      // QR Code personalizado
      includeQRCode: data.config?.includeQRCode ?? false,
      qrCodeText: data.config?.qrCodeText || '',
      
      // Bordas e decorações personalizadas
      showBorder: data.config?.showBorder ?? true,
      borderColor: data.config?.borderColor || data.config?.primaryColor || '#e2e8f0',
      borderWidth: data.config?.borderWidth || 2,
      showWatermark: data.config?.showWatermark ?? false,
      watermarkText: data.config?.watermarkText || 'CERTIFICADO',
      watermarkOpacity: data.config?.watermarkOpacity || 0.1,
      
      // Fonte personalizada
      fontFamily: data.config?.fontFamily || 'helvetica'
    };

    console.log('🎨 Configurações do certificado preparadas:', {
      template: certificateConfig.template,
      orientation: certificateConfig.orientation,
      colors: {
        primary: certificateConfig.primaryColor,
        secondary: certificateConfig.secondaryColor,
        background: certificateConfig.backgroundColor
      },
      fonts: {
        family: certificateConfig.fontFamily,
        titleSize: certificateConfig.titleFontSize,
        nameSize: certificateConfig.nameFontSize,
        bodySize: certificateConfig.bodyFontSize
      },
      customTexts: {
        title: certificateConfig.title,
        hasSubtitle: !!certificateConfig.subtitle,
        hasFooter: !!certificateConfig.footer,
        bodyTextLength: certificateConfig.bodyText.length
      },
      features: {
        hasLogo: !!certificateConfig.logoUrl && certificateConfig.logoUrl !== null,
        logoSize: certificateConfig.logoSize,
        includeQRCode: certificateConfig.includeQRCode,
        showBorder: certificateConfig.showBorder,
        showWatermark: certificateConfig.showWatermark
      },
      usingCustomConfig: !!data.config
    });

    // Gerar HTML do certificado
    const certificateHTML = await generateCertificateHTML(
      certificateConfig,
      {
        participantName: data.userName,
        eventName: data.eventName,
        eventDate: data.eventDate,
        eventStartTime: data.eventStartTime,
        eventEndTime: data.eventEndTime,
      },
      data.registrationId
    );

    console.log('🌐 HTML do certificado gerado');

    // Usar Puppeteer para converter HTML em PDF
    console.log('📄 Gerando PDF com Puppeteer...');
    
    const pdfBuffer = await generatePDFFromHTML(certificateHTML, {
      pageSize: certificateConfig.pageSize,
      orientation: certificateConfig.orientation,
      pageMargin: certificateConfig.pageMargin
    });

    // 🚨 VALIDAÇÃO CRÍTICA: Verificar se o PDF foi gerado corretamente
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer vazio - geração falhou');
    }

    // Verificar assinatura PDF
    const pdfSignature = pdfBuffer.subarray(0, 4).toString('ascii');
    if (pdfSignature !== '%PDF') {
      console.error('❌ Buffer gerado não é um PDF válido. Assinatura:', pdfSignature);
      console.error('📊 Primeiros 100 bytes:', pdfBuffer.subarray(0, 100).toString('hex'));
      throw new Error(`Buffer inválido gerado pelo Puppeteer. Assinatura: ${pdfSignature}`);
    }

    console.log('✅ PDF válido gerado com sucesso', {
      tamanho: pdfBuffer.length,
      assinatura: pdfSignature,
      método: 'CertificatePreview + Puppeteer'
    });

    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erro na geração do certificado PDF:', error);
    throw new Error(`Falha ao gerar certificado PDF: ${(error as Error).message}`);
  }
};

/**
 * Interface para configuração simplificada do certificado
 */
interface SimpleCertificateConfig {
  template: 'modern' | 'classic' | 'elegant' | 'minimalist' | 'blank';
  orientation: 'landscape' | 'portrait';
  pageSize: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
  pageMargin: 'narrow' | 'normal' | 'wide';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  title: string;
  subtitle: string;
  bodyText: string;
  footer?: string;
  showBorder: boolean;
  borderWidth: number;
  borderColor: string;
  titlePosition: { x: number; y: number };
  titleFontSize: number;
  namePosition: { x: number; y: number };
  nameFontSize: number;
  bodyPosition: { x: number; y: number };
  bodyFontSize: number;
  logoPosition: { x: number; y: number };
  logoSize: number;
  logoUrl?: string;
  backgroundImageUrl?: string;
  backgroundImageOpacity: number;
  backgroundImageSize: 'cover' | 'contain' | 'auto';
  backgroundImagePosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  qrCodePosition: { x: number; y: number };
  includeQRCode: boolean;
  qrCodeText: string;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  fontFamily: 'helvetica' | 'times' | 'courier' | 'DejaVuSans';
  activeElements?: string[];
}

/**
 * Gera HTML do certificado baseado no componente CertificatePreview
 */
const generateCertificateHTML = async (
  config: SimpleCertificateConfig,
  data: {
    participantName: string;
    eventName: string;
    eventDate: Date;
    eventStartTime?: Date;
    eventEndTime?: Date;
  },
  registrationId?: string
): Promise<string> => {
  const formatPosition = (position: { x: number; y: number }) => 
    `left: ${position.x}%; top: ${position.y}%; transform: translate(-50%, -50%);`;

  const replaceVariables = (text: string) => {
    const formattedDate = formatDateBrazil(data.eventDate);
    const timeRange = formatTimeRangeBrazil(data.eventStartTime, data.eventEndTime);
    
    console.log('🕒 Debug timezone no certificado PDF:', {
      originalDate: data.eventDate.toISOString(),
      originalStartTime: data.eventStartTime?.toISOString(),
      originalEndTime: data.eventEndTime?.toISOString(),
      formattedDate,
      timeRange
    });
    
    return text
      .replace(/{userName}/g, data.participantName)
      .replace(/{eventName}/g, data.eventName)
      .replace(/{eventDate}/g, formattedDate)
      .replace(/{eventTime}/g, timeRange)
      .replace(/{eventStartTime}/g, data.eventStartTime ? formatTimeBrazil(data.eventStartTime) : '')
      .replace(/{eventEndTime}/g, data.eventEndTime ? formatTimeBrazil(data.eventEndTime) : '');
  };

  // ✅ Função para gerar estilos de borda específicos por template
  const getCertificateBorderStyle = (config: SimpleCertificateConfig): string => {
    if (!config.showBorder) return 'border: none;';
    
    switch (config.template) {
      case 'classic':
        return `
          border: ${config.borderWidth}px solid ${config.borderColor};
          border-radius: 8px;
          box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.3), 0 0 10px rgba(0,0,0,0.1);
          background: linear-gradient(45deg, ${config.backgroundColor} 0%, ${config.backgroundColor}f0 100%);
        `;
      case 'elegant':
        return `
          border: ${config.borderWidth}px solid ${config.borderColor};
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.2);
          background: radial-gradient(circle at 50% 50%, ${config.backgroundColor} 0%, ${config.backgroundColor}f8 100%);
        `;
      case 'modern':
        return `
          border: ${config.borderWidth}px solid ${config.borderColor};
          border-radius: 4px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        `;
      case 'minimalist':
        return `border: ${config.borderWidth}px solid ${config.borderColor};`;
      default:
        return `border: ${config.borderWidth}px solid ${config.borderColor};`;
    }
  };

  // ✅ Função para gerar elemento QR Code usando data URL local
  const generateQRCodeElement = async (
    qrText: string | undefined,
    position: { x: number; y: number },
    color: string
  ): Promise<string> => {
    const siteUrl = getBaseUrl();

    // Se o admin configurou uma URL válida, usa ela; caso contrário, monta URL de download
    const hasCustomUrl =
      qrText && (qrText.startsWith('http://') || qrText.startsWith('https://'));

    const finalQrText =
      (hasCustomUrl && qrText) ||
      (registrationId
        ? `${siteUrl}/api/certificate/download?registrationId=${registrationId}`
        : siteUrl);

    const qrSize = 80;

    let dataUrl: string;
    try {
      dataUrl = await QRCode.toDataURL(finalQrText, {
        width: qrSize,
        margin: 0,
        color: {
          dark: color,
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code para certificado PDF:', error);
      // Fallback: não quebra o PDF, apenas não mostra QR real
      return `
        <div class="qr-container" style="position: absolute; ${formatPosition(position)}">
          <div style="width: ${qrSize}px; height: ${qrSize}px; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 10px; color: ${color};">
            QR<br/>CODE
          </div>
        </div>
      `;
    }

    return `
      <div class="qr-container" style="position: absolute; ${formatPosition(position)}">
        <img src="${dataUrl}" alt="QR Code" style="width: ${qrSize}px; height: ${qrSize}px; display: block;" />
        ${
          hasCustomUrl
            ? `<div style="text-align: center; font-size: 8px; color: ${color}; margin-top: 4px; width: ${qrSize}px;">${qrText}</div>`
            : ''
        }
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificado</title>
      <style>
        ${generatePageCSS(config.pageSize, config.orientation, config.pageMargin)}
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${
            config.fontFamily === 'helvetica' ? 'Arial, sans-serif' :
            config.fontFamily === 'times' ? 'Times, serif' :
            config.fontFamily === 'courier' ? 'Courier, monospace' :
            'Arial, sans-serif'
          };
          background: white;
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .certificate {
          position: relative;
          width: ${(() => {
            const dimensions = getPageDimensions(config.pageSize, config.orientation);
            return `${dimensions.certificateWidth}px`;
          })()};
          height: ${(() => {
            const dimensions = getPageDimensions(config.pageSize, config.orientation);
            return `${dimensions.certificateHeight}px`;
          })()};
          background-color: ${config.backgroundColor};
          ${config.backgroundImageUrl ? `
            background-image: url('${config.backgroundImageUrl}');
            background-size: ${config.backgroundImageSize};
            background-position: ${config.backgroundImagePosition};
            background-repeat: no-repeat;
          ` : ''}
          ${getCertificateBorderStyle(config)}
          margin: 0 auto;
          overflow: hidden;
        }
        
        /* ✅ OVERLAY REMOVIDO - imagem original sem degradação */
        
        .title {
          position: absolute;
          ${formatPosition(config.titlePosition)}
          font-size: ${config.titleFontSize}px;
          font-weight: bold;
          color: ${config.primaryColor};
          text-align: center;
          width: 80%;
          z-index: 2;
          ${config.template === 'classic' ? 'font-family: serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);' : ''}
          ${config.template === 'elegant' ? 'font-family: serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);' : ''}
          ${config.template === 'modern' ? 'font-family: sans-serif; letter-spacing: 1px;' : ''}
          ${config.template === 'minimalist' ? 'font-family: sans-serif; font-weight: 300;' : ''}
          ${config.template === 'blank' ? 'font-family: sans-serif; font-weight: 400;' : ''}
        }
        
        .subtitle {
          position: absolute;
          ${formatPosition({ x: config.titlePosition.x, y: config.titlePosition.y + 8 })}
          font-size: ${Math.round(config.titleFontSize * 0.6)}px;
          color: ${config.secondaryColor};
          text-align: center;
          width: 70%;
          z-index: 2;
          font-style: italic;
          opacity: 0.9;
        }
        
        .participant-name {
          position: absolute;
          ${formatPosition(config.namePosition)}
          font-size: ${config.nameFontSize}px;
          font-weight: 600;
          color: ${config.primaryColor};
          text-align: center;
          width: 80%;
          z-index: 2;
          ${config.template === 'classic' || config.template === 'elegant' ? 'text-decoration: underline; text-decoration-color: ' + config.borderColor + '; text-decoration-thickness: 2px; text-underline-offset: 4px;' : ''}
        }
        
        .body-text {
          position: absolute;
          ${formatPosition(config.bodyPosition)}
          font-size: ${config.bodyFontSize}px;
          color: ${config.secondaryColor};
          text-align: center;
          width: 80%;
          line-height: 1.6;
          z-index: 2;
        }
        
        .footer {
          position: absolute;
          ${formatPosition({ x: config.bodyPosition.x, y: config.bodyPosition.y + 15 })}
          font-size: ${Math.round(config.bodyFontSize * 0.9)}px;
          color: ${config.secondaryColor};
          text-align: center;
          width: 70%;
          font-style: italic;
          z-index: 2;
          opacity: 0.8;
        }
        
        .logo {
          position: absolute;
          ${formatPosition(config.logoPosition)}
          max-width: ${config.logoSize}px;
          max-height: ${config.logoSize}px;
          width: auto;
          height: auto;
          object-fit: contain;
          z-index: 3;
        }
        
        /* Decorações do template elegant */
        .elegant-corner {
          position: absolute;
          width: 32px;
          height: 32px;
          border: 2px solid ${config.primaryColor};
        }
        
        .elegant-corner.top-left {
          top: 16px;
          left: 16px;
          border-right: none;
          border-bottom: none;
        }
        
        .elegant-corner.top-right {
          top: 16px;
          right: 16px;
          border-left: none;
          border-bottom: none;
        }
        
        .elegant-corner.bottom-left {
          bottom: 16px;
          left: 16px;
          border-right: none;
          border-top: none;
        }
        
        .elegant-corner.bottom-right {
          bottom: 16px;
          right: 16px;
          border-left: none;
          border-top: none;
        }
        
        /* Watermark */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: ${Math.round(config.titleFontSize * 3.5)}px;
          color: ${config.primaryColor};
          opacity: ${config.watermarkOpacity};
          pointer-events: none;
          z-index: 1;
          user-select: none;
          ${config.template === 'classic' ? 'font-family: serif; font-weight: bold;' : ''}
          ${config.template === 'elegant' ? 'font-family: serif; font-style: italic; font-weight: 300;' : ''}
          ${config.template === 'modern' ? 'font-family: sans-serif; font-weight: 200; letter-spacing: 2px;' : ''}
          ${config.template === 'minimalist' ? 'font-family: sans-serif; font-weight: 100;' : ''}
          ${config.template === 'blank' ? 'display: none;' : ''}
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <!-- ✅ Sem overlay - imagem de fundo em qualidade original -->
        
        <!-- Watermark -->
        ${config.showWatermark ? `<div class="watermark">${config.watermarkText}</div>` : ''}
        
        <!-- Elementos baseados em activeElements -->
        ${(() => {
          const activeElements = config.activeElements || ['name', 'title', 'eventName', 'eventDate'];
          console.log('🎯 PDF GENERATOR - Elementos ativos:', activeElements);
          
          let elementsHtml = '';
          
          // Título - somente se ativo E com conteúdo
          if (activeElements.includes('title') && config.title && config.title.trim() !== '') {
            elementsHtml += `<div class="title">${config.title}</div>`;
            console.log('🎯 PDF - Renderizando título:', config.title);
          } else if (!activeElements.includes('title')) {
            console.log('⏭️ PDF - Título desabilitado - elemento não está ativo');
          } else {
            console.log('⏭️ PDF - Título vazio - pulando renderização');
          }
          
          // Subtítulo
          if (activeElements.includes('subtitle') && config.subtitle) {
            elementsHtml += `<div class="subtitle">${config.subtitle}</div>`;
            console.log('🎯 PDF - Renderizando subtítulo:', config.subtitle);
          } else if (!activeElements.includes('subtitle')) {
            console.log('⏭️ PDF - Subtítulo desabilitado');
          }
          
          // Nome do participante
          if (activeElements.includes('name')) {
            elementsHtml += `<div class="participant-name">${data.participantName}</div>`;
            console.log('🎯 PDF - Renderizando nome:', data.participantName);
          } else {
            console.log('⏭️ PDF - Nome desabilitado');
          }
          
          return elementsHtml;
        })()}
        
        ${(() => {
          const activeElements = config.activeElements || ['name', 'title', 'eventName', 'eventDate'];
          let bodyFooterHtml = '';
          
          // Corpo do texto - somente se tiver elementos relacionados ativos
          const shouldRenderBody = activeElements.some((element: string) => 
            ['body', 'eventName', 'eventDate'].includes(element)
          );
          
          if (shouldRenderBody) {
            bodyFooterHtml += `<div class="body-text">${replaceVariables(config.bodyText)}</div>`;
            console.log('🎯 PDF - Renderizando corpo (elementos ativos:', activeElements.filter((el: string) => 
              ['body', 'eventName', 'eventDate'].includes(el)
            ), ')');
          } else {
            console.log('⏭️ PDF - Corpo desabilitado - nenhum elemento relacionado ativo');
          }
          
          // Rodapé - somente se estiver ativo
          if (activeElements.includes('footer') && config.footer) {
            bodyFooterHtml += `<div class="footer">${config.footer}</div>`;
            console.log('🎯 PDF - Renderizando footer:', config.footer);
          } else if (!activeElements.includes('footer')) {
            console.log('⏭️ PDF - Footer desabilitado');
          }
          
          return bodyFooterHtml;
        })()}
        
        <!-- Logo -->
        ${config.logoUrl && config.logoUrl !== null ? `<img src="${config.logoUrl}" alt="Logo" class="logo" />` : ''}
        
        <!-- QR Code -->
        ${
          config.includeQRCode
            ? await generateQRCodeElement(
                config.qrCodeText,
                config.qrCodePosition,
                config.secondaryColor
              )
            : ''
        }
        
        <!-- Decorações do template -->
        ${config.template === 'elegant' ? `
          <div class="elegant-corner top-left"></div>
          <div class="elegant-corner top-right"></div>
          <div class="elegant-corner bottom-left"></div>
          <div class="elegant-corner bottom-right"></div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};

/**
 * Gera HTML do QR Code usando API externa (compatível com Puppeteer)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateQRCodeHTML = async (qrText: string, color: string): Promise<string> => {
  try {
    // Se não há texto específico, usar validação genérica  
    const finalQrText = qrText || 'Validação digital de autenticidade';
    
    // Usar API pública de QR code que funciona bem em produção
    const qrSize = 60;
    const colorHex = color.replace('#', '');
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(finalQrText)}&format=png&color=${colorHex}&bgcolor=ffffff&margin=1`;
    
    console.log('🔗 Gerando QR Code via API:', {
      text: finalQrText,
      url: qrApiUrl.substring(0, 100) + '...'
    });
    
    return `<img src="${qrApiUrl}" alt="QR Code" class="qr-code" style="width: 60px; height: 60px; border: 2px solid ${color};" crossorigin="anonymous" />`;
    
  } catch (error) {
    console.error('❌ Erro ao gerar QR Code HTML:', error);
    // Fallback para placeholder
    return `<div class="qr-code" style="border: 2px solid ${color}; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: ${color};">QR<br/>CODE</div>`;
  }
};

/**
 * Converte HTML em PDF usando Puppeteer simplificado
 */
const generatePDFFromHTML = async (html: string, config?: { pageSize: string; orientation: string; pageMargin: string }): Promise<Buffer> => {
  let browser: Awaited<ReturnType<typeof import('puppeteer')['default']['launch']>> | null = null;
  
  try {
    console.log('🌐 Iniciando Puppeteer com importação dinâmica...');
    
    // Importação dinâmica para evitar problemas de build no Next.js
    const puppeteer = await import('puppeteer');
    
    // Detectar se está em ambiente Vercel/serverless
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    // 🚀 CONFIGURAÇÃO PARA VERCEL: Usar @sparticuz/chromium
    const launchOptions: {
      args: string[];
      headless: boolean;
      defaultViewport: { width: number; height: number };
      executablePath?: string;
    } = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--hide-scrollbars',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      headless: true,
      defaultViewport: { width: 1200, height: 800 }
    };

    // 🔧 VERCEL: Usar @sparticuz/chromium para ambiente serverless
    if (isServerless) {
      console.log('🏭 Ambiente serverless detectado - configurando @sparticuz/chromium...');
      
      try {
        const chromium = await import('@sparticuz/chromium');
        launchOptions.executablePath = await chromium.default.executablePath();
        
        // Adicionar args específicos do chromium para Vercel
        launchOptions.args = [
          ...launchOptions.args,
          ...chromium.default.args,
        ];
        
        console.log('✅ @sparticuz/chromium configurado com sucesso');
      } catch (chromiumError) {
        console.error('❌ Erro ao configurar @sparticuz/chromium:', chromiumError);
        console.log('🔄 Tentando usar Puppeteer padrão como fallback...');
      }
    }

    console.log('⚙️ Configurações do Puppeteer:', {
      isServerless,
      headless: launchOptions.headless,
      argsCount: launchOptions.args.length,
      usingChromium: isServerless && launchOptions.executablePath ? '✅ @sparticuz/chromium' : '🔧 Puppeteer padrão'
    });
    
    browser = await puppeteer.default.launch(launchOptions);

    const page = await browser.newPage();
    
    console.log('📄 Carregando HTML na página...');
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    // 🔄 Aguardar carregamento de imagens externas (QR code, logos)
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, img => 
          img.complete || new Promise(resolve => {
            img.onload = img.onerror = resolve;
          })
        )
      );
    });

    console.log('✅ Todas as imagens carregadas');

    console.log('🖨️ Gerando PDF...');
    
    // Configurações dinâmicas baseadas na config
    const marginSettings = getMarginSettings(config?.pageMargin || 'normal');
    const isLandscape = config?.orientation === 'landscape';
    
    const pdfData = await page.pdf({
      format: (config?.pageSize || 'A4') as 'A4' | 'A3' | 'A5' | 'Legal' | 'Letter',
      landscape: isLandscape,
      margin: {
        top: marginSettings.top,
        right: marginSettings.right,
        bottom: marginSettings.bottom,
        left: marginSettings.left
      },
      printBackground: true,
      preferCSSPageSize: true, // Usar tamanho definido no CSS
    });

    console.log('✅ PDF gerado via Puppeteer', {
      tamanho: pdfData.length,
      tipo: typeof pdfData,
      isBuffer: Buffer.isBuffer(pdfData),
      isUint8Array: pdfData instanceof Uint8Array
    });

    // 🚨 VALIDAÇÃO: Verificar se o Puppeteer retornou dados válidos
    if (!pdfData || pdfData.length === 0) {
      throw new Error('Puppeteer retornou dados vazios');
    }

    // 🔧 CONVERSÃO: Puppeteer pode retornar Uint8Array, garantir que seja Buffer
    let pdfBuffer: Buffer;
    
    if (Buffer.isBuffer(pdfData)) {
      console.log('✅ Puppeteer retornou Buffer diretamente');
      pdfBuffer = pdfData;
    } else if (pdfData instanceof Uint8Array) {
      console.log('🔄 Convertendo Uint8Array para Buffer...');
      pdfBuffer = Buffer.from(pdfData);
      console.log('✅ Conversão Uint8Array → Buffer bem-sucedida');
    } else {
      const unknownData = pdfData as { constructor?: { name?: string } };
      console.error('❌ Puppeteer retornou tipo inesperado:', {
        tipo: typeof pdfData,
        constructor: unknownData?.constructor?.name || 'unknown',
        isArray: Array.isArray(pdfData)
      });
      throw new Error(`Puppeteer retornou tipo inválido: ${typeof pdfData} (${unknownData?.constructor?.name || 'unknown'})`);
    }

    console.log('✅ Buffer PDF validado e pronto', {
      tamanho: pdfBuffer.length,
      isBuffer: Buffer.isBuffer(pdfBuffer)
    });

    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erro no Puppeteer:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Puppeteer fechado');
    }
  }
};

/**
 * Função auxiliar para validar dados do certificado
 */
const validateCertificateData = (data: CertificatePDFData): void => {
  const requiredFields = ['userName', 'eventName', 'eventDate', 'eventId'];
  
  for (const field of requiredFields) {
    if (!data[field as keyof CertificatePDFData]) {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }
  
  // Validar data
  if (!(data.eventDate instanceof Date) || isNaN(data.eventDate.getTime())) {
    throw new Error('Data do evento inválida');
  }
  
  console.log('✅ Dados do certificado validados');
};
