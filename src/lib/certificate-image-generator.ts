import { CertificateConfig } from '@/types';
import { sanitizeTextForPDF } from './text-utils';
import type { CanvasRenderingContext2D } from 'canvas';

/**
 * Valida se uma URL de imagem é acessível
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Carrega uma imagem como buffer usando fetch
 * Resolve problemas de CORS e headers com Cloudinary
 */
async function loadImageBuffer(url: string): Promise<Buffer> {
  console.log('🌐 Fazendo fetch da imagem:', url);
  
  // Lista de URLs para tentar (diferentes transformações do Cloudinary)
  const urlsToTry = [
    url, // URL original
    url.replace(/\/upload\//, '/upload/f_auto,q_auto/'), // Auto format e qualidade
    url.replace(/\/upload\//, '/upload/c_fit,w_400,h_400/'), // Redimensionamento
  ];

  let lastError: Error | null = null;
  
  for (const testUrl of urlsToTry) {
    try {
      console.log('🔄 Tentando carregar:', testUrl);
      
      const response = await fetch(testUrl, {
        headers: {
          'User-Agent': 'Certificate-Generator/1.0',
          'Accept': 'image/*',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty response body');
      }
      
      const buffer = Buffer.from(arrayBuffer);
      console.log('✅ Imagem carregada via fetch:', buffer.length, 'bytes');
      return buffer;
      
    } catch (error) {
      console.log('❌ Falha ao carregar URL:', testUrl, error instanceof Error ? error.message : error);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue; // Tentar próxima URL
    }
  }
  
  // Se todas as tentativas falharam
  throw new Error(`Failed to load image after trying ${urlsToTry.length} URLs. Last error: ${lastError?.message}`);
}

export interface CertificateImageData {
  userName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
  eventId?: string;
  config?: CertificateConfig;
}

/**
 * Gera um certificado como imagem PNG usando Canvas
 * Mais confiável para exibição web que PDFs
 */
export const generateCertificateImage = async (data: CertificateImageData): Promise<Buffer> => {
  try {
    // Importar canvas apenas no servidor
    const { createCanvas, loadImage } = await import('canvas');
    const QRCode = await import('qrcode');
    
    // Usar configuração padrão se não fornecida
    const config = data.config || getDefaultImageConfig();
    
    console.log('🖼️  Gerando certificado como imagem com config:', {
      hasLogo: !!config.logoUrl,
      logoUrl: config.logoUrl?.substring(0, 50) + '...',
      includeQRCode: config.includeQRCode,
      qrCodeText: config.qrCodeText?.substring(0, 30) + '...'
    });
    
    // Definir dimensões da imagem (alta resolução para qualidade)
    const width = config.orientation === 'landscape' ? 1200 : 800;
    const height = config.orientation === 'landscape' ? 800 : 1200;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Border se habilitado
    if (config.showBorder) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = config.borderWidth * 2; // Dobrar para alta resolução
      ctx.strokeRect(
        config.borderWidth, 
        config.borderWidth, 
        width - config.borderWidth * 2, 
        height - config.borderWidth * 2
      );
    }
    
    // Template decorations
    if (config.template === 'modern') {
      // Linhas de destaque
      ctx.fillStyle = config.primaryColor;
      ctx.fillRect(0, 0, width, 20);
      ctx.fillRect(0, height - 20, width, 20);
    } else if (config.template === 'elegant') {
      // Cantos decorativos
      drawCornerDecorations(ctx, width, height, config.primaryColor);
    }
    
    // Watermark se habilitado
    if (config.showWatermark) {
      drawWatermark(ctx, width, height, config.watermarkText, config.watermarkOpacity, config.secondaryColor);
    }
    
    // Título
    drawText(ctx, config.title, {
      x: (width * config.titlePosition.x) / 100,
      y: (height * config.titlePosition.y) / 100,
      fontSize: config.titleFontSize * 2, // Dobrar para alta resolução
      color: config.primaryColor,
      fontWeight: 'bold',
      align: 'center',
      fontFamily: getFontFamily(config.fontFamily)
    });
    
    // Subtítulo se presente
    if (config.subtitle) {
      drawText(ctx, config.subtitle, {
        x: (width * config.titlePosition.x) / 100,
        y: (height * config.titlePosition.y) / 100 + config.titleFontSize * 2.5,
        fontSize: config.titleFontSize * 1.2,
        color: config.secondaryColor,
        fontWeight: 'normal',
        align: 'center',
        fontFamily: getFontFamily(config.fontFamily)
      });
    }
    
    // Nome do participante
    const sanitizedUserName = sanitizeTextForPDF(data.userName);
    drawText(ctx, sanitizedUserName, {
      x: (width * config.namePosition.x) / 100,
      y: (height * config.namePosition.y) / 100,
      fontSize: config.nameFontSize * 2,
      color: config.primaryColor,
      fontWeight: 'bold',
      align: 'center',
      fontFamily: getFontFamily(config.fontFamily)
    });
    
    // Texto do corpo com substituição de variáveis
    const formattedDate = data.eventDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    
    const formattedStartTime = data.eventStartTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '00:00';
    const formattedEndTime = data.eventEndTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '00:00';
    const formattedTimeRange = `${formattedStartTime} às ${formattedEndTime}`;
    
    const bodyText = config.bodyText
      .replace(/{userName}/g, data.userName)
      .replace(/{eventName}/g, data.eventName)
      .replace(/{eventDate}/g, formattedDate)
      .replace(/{eventTime}/g, formattedTimeRange)
      .replace(/{eventStartTime}/g, formattedStartTime)
      .replace(/{eventEndTime}/g, formattedEndTime);
    
    const sanitizedBodyText = sanitizeTextForPDF(bodyText);
    
    // Desenhar texto multilinha
    drawMultilineText(ctx, sanitizedBodyText, {
      x: (width * config.bodyPosition.x) / 100,
      y: (height * config.bodyPosition.y) / 100,
      fontSize: config.bodyFontSize * 2,
      color: config.secondaryColor,
      maxWidth: width * 0.8,
      lineHeight: config.bodyFontSize * 2.4,
      fontFamily: getFontFamily(config.fontFamily)
    });
    
    // Footer se presente
    if (config.footer) {
      drawText(ctx, config.footer, {
        x: (width * config.bodyPosition.x) / 100,
        y: (height * config.bodyPosition.y) / 100 + 120,
        fontSize: config.bodyFontSize * 1.8,
        color: config.secondaryColor,
        align: 'center',
        fontFamily: getFontFamily(config.fontFamily)
      });
    }
    
    // Logo se fornecida
    if (config.logoUrl) {
      try {
        console.log('🖼️  Processando logo:', config.logoUrl);
        
        // Primeiro, validar se a URL é acessível
        console.log('🔍 Validando URL da logo...');
        const isValid = await validateImageUrl(config.logoUrl);
        
        if (!isValid) {
          console.warn('⚠️  URL da logo não é válida ou não é uma imagem');
          throw new Error('Invalid logo URL or not an image');
        }
        
        console.log('✅ URL da logo validada, carregando...');
        
        // Carregar logo usando fetch com headers apropriados
        const logoBuffer = await loadImageBuffer(config.logoUrl);
        const logo = await loadImage(logoBuffer);
        
        // Calcular dimensões mantendo proporção
        const maxLogoSize = config.logoSize * 2; // Alta resolução
        const originalWidth = logo.naturalWidth;
        const originalHeight = logo.naturalHeight;
        
        // Calcular dimensões proporcionais
        let logoWidth, logoHeight;
        if (originalWidth > originalHeight) {
          // Imagem mais larga que alta
          logoWidth = maxLogoSize;
          logoHeight = (originalHeight * maxLogoSize) / originalWidth;
        } else {
          // Imagem mais alta que larga
          logoHeight = maxLogoSize;
          logoWidth = (originalWidth * maxLogoSize) / originalHeight;
        }
        
        // Centralizar a logo na posição especificada
        const logoX = (width * config.logoPosition.x) / 100 - logoWidth / 2;
        const logoY = (height * config.logoPosition.y) / 100 - logoHeight / 2;
        
        console.log('🖼️  Desenhando logo com proporções corretas:', { 
          originalWidth,
          originalHeight,
          logoWidth: Math.round(logoWidth),
          logoHeight: Math.round(logoHeight),
          logoX: Math.round(logoX), 
          logoY: Math.round(logoY),
          aspectRatio: (originalWidth / originalHeight).toFixed(2)
        });
        
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        console.log('✅ Logo desenhada com proporções corretas no certificado');
        
      } catch (logoError) {
        console.error('❌ Erro completo ao processar logo:', {
          error: logoError instanceof Error ? logoError.message : logoError,
          stack: logoError instanceof Error ? logoError.stack : undefined,
          logoUrl: config.logoUrl
        });
        
        // Desenhar placeholder da logo em caso de erro (mantem proporção quadrada para placeholder)
        const logoSize = config.logoSize * 2;
        const logoX = (width * config.logoPosition.x) / 100 - logoSize / 2;
        const logoY = (height * config.logoPosition.y) / 100 - logoSize / 2;
        
        console.log('🔄 Desenhando placeholder da logo:', { logoX, logoY, logoSize });
        
        ctx.strokeStyle = config.secondaryColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(logoX, logoY, logoSize, logoSize);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = config.secondaryColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LOGO', logoX + logoSize / 2, logoY + logoSize / 2);
        
        console.log('✅ Placeholder da logo desenhado');
      }
    }
    
    // QR Code real se habilitado
    if (config.includeQRCode) {
      // Se não há texto específico, usar URL base para validação
      const qrText = config.qrCodeText || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sistema-eventos.vercel.app'}/validate/${data.eventId}/${data.userName}`;
      
      if (qrText) {
        try {
          console.log('🖼️  Gerando QR Code:', qrText);
          
          // Gerar QR Code como data URL
          const qrDataURL = await QRCode.toDataURL(qrText, {
          width: 120,
          margin: 1,
          color: {
            dark: config.secondaryColor,
            light: '#ffffff'
          }
        });
        
        // Carregar QR Code como imagem
        const qrImage = await loadImage(qrDataURL);
        const qrSize = 120;
        const qrX = (width * config.qrCodePosition.x) / 100 - qrSize / 2;
        const qrY = (height * config.qrCodePosition.y) / 100 - qrSize / 2;
        
        console.log('🖼️  Desenhando QR Code:', { qrSize, qrX, qrY });
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        console.log('✅ QR Code desenhado com sucesso');
        
      } catch (qrError) {
        console.error('❌ Erro ao gerar QR Code:', qrError);
        
        // Fallback para placeholder em caso de erro
        drawQRPlaceholder(ctx, {
          x: (width * config.qrCodePosition.x) / 100,
          y: (height * config.qrCodePosition.y) / 100,
          size: 120,
          color: config.secondaryColor
        });
        }
      }
    }
    
    // Data de geração
    const currentDate = new Date().toLocaleDateString('pt-BR');
    drawText(ctx, `Certificado emitido em ${currentDate}`, {
      x: 40,
      y: height - 40,
      fontSize: 16,
      color: config.secondaryColor,
      align: 'left',
      fontFamily: getFontFamily(config.fontFamily)
    });
    
    return canvas.toBuffer('image/png', { compressionLevel: 6, quality: 0.95 });
    
  } catch (error) {
    console.error('Erro ao gerar certificado como imagem:', error);
    throw new Error('Erro interno ao gerar certificado como imagem. Tente novamente.');
  }
};

// Funções auxiliares
function getFontFamily(family: string): string {
  switch (family) {
    case 'times':
      return 'Times, serif';
    case 'courier':
      return 'Courier, monospace';
    default:
      return 'Arial, sans-serif';
  }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, options: {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
}) {
  ctx.font = `${options.fontWeight || 'normal'} ${options.fontSize}px ${options.fontFamily || 'Arial'}`;
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, options.x, options.y);
}

function drawMultilineText(ctx: CanvasRenderingContext2D, text: string, options: {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  maxWidth: number;
  lineHeight: number;
  fontFamily?: string;
}) {
  ctx.font = `${options.fontSize}px ${options.fontFamily || 'Arial'}`;
  ctx.fillStyle = options.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const testWidth = ctx.measureText(testLine).width;
    
    if (testWidth <= options.maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  const startY = options.y - (lines.length * options.lineHeight) / 2;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, options.x, startY + index * options.lineHeight);
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, text: string, opacity: number, color: string) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.globalAlpha = opacity;
  ctx.font = 'bold 80px Arial';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawCornerDecorations(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  const cornerSize = 60;
  const cornerOffset = 40;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  
  // Top-left
  ctx.beginPath();
  ctx.moveTo(cornerOffset, cornerOffset + cornerSize);
  ctx.lineTo(cornerOffset, cornerOffset);
  ctx.lineTo(cornerOffset + cornerSize, cornerOffset);
  ctx.stroke();
  
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - cornerOffset - cornerSize, cornerOffset);
  ctx.lineTo(width - cornerOffset, cornerOffset);
  ctx.lineTo(width - cornerOffset, cornerOffset + cornerSize);
  ctx.stroke();
  
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(cornerOffset, height - cornerOffset - cornerSize);
  ctx.lineTo(cornerOffset, height - cornerOffset);
  ctx.lineTo(cornerOffset + cornerSize, height - cornerOffset);
  ctx.stroke();
  
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - cornerOffset - cornerSize, height - cornerOffset);
  ctx.lineTo(width - cornerOffset, height - cornerOffset);
  ctx.lineTo(width - cornerOffset, height - cornerOffset - cornerSize);
  ctx.stroke();
}

function drawQRPlaceholder(ctx: CanvasRenderingContext2D, options: {
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  ctx.strokeStyle = options.color;
  ctx.lineWidth = 4;
  ctx.strokeRect(
    options.x - options.size / 2,
    options.y - options.size / 2,
    options.size,
    options.size
  );
  
  ctx.font = '24px Arial';
  ctx.fillStyle = options.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('QR', options.x, options.y - 15);
  ctx.fillText('CODE', options.x, options.y + 15);
}

function getDefaultImageConfig(): CertificateConfig {
  return {
    id: 'default',
    eventId: 'default',
    template: 'modern',
    orientation: 'landscape',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    titleFontSize: 24,
    nameFontSize: 18,
    bodyFontSize: 12,
    fontFamily: 'helvetica',
    title: 'Certificado de Participação',
    subtitle: '',
    bodyText: 'Certificamos que {userName} participou do evento {eventName}, realizado em {eventDate} das {eventTime}.',
    footer: '',
    titlePosition: { x: 50, y: 25 },
    namePosition: { x: 50, y: 45 },
    bodyPosition: { x: 50, y: 65 },
    logoUrl: undefined,
    logoSize: 80,
    logoPosition: { x: 10, y: 10 },
    showBorder: true,
    borderWidth: 2,
    showWatermark: false,
    watermarkText: 'CERTIFICADO',
    watermarkOpacity: 0.1,
    includeQRCode: false,
    qrCodeText: undefined,
    qrCodePosition: { x: 85, y: 85 },
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
