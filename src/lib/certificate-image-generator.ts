import { CertificateConfig } from '@/types';
import { sanitizeTextForPDF } from './text-utils';
import type { CanvasRenderingContext2D } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import { 
  RELIABLE_FONT_URLS, 
  EMBEDDED_FONTS, 
  getSafeFontFamily, 
  isServerlessEnvironment 
} from './embedded-fonts';

/**
 * Valida se uma URL de imagem é acessível
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && (response.headers.get('content-type')?.startsWith('image/') || false);
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
    const { createCanvas, loadImage, registerFont } = await import('canvas');
    // ⚡ NOVA ESTRATÉGIA: Em produção, NUNCA tentar registrar fontes customizadas
    const isServerlessEnv = isServerlessEnvironment();
    
    if (!isServerlessEnv) {
      // Apenas em desenvolvimento local
      try {
        await ensureFontsRegistered(registerFont);
        console.log('🧪 Testando renderização de fonte localmente...');
        testFontRendering(createCanvas(100, 50).getContext('2d'));
      } catch (err) {
        console.warn('⚠️  Erro no carregamento de fontes locais (usando fallback):', err);
      }
    } else {
      // Produção: configuração ultra-simples
      console.log('🏭 PRODUÇÃO DETECTADA - usando estratégia ultra-simples');
      console.log('⚡ Pulando registro de fontes customizadas');
      console.log('🔤 Forçando fonts do sistema + ASCII');
      
      // Forçar configurações seguras para produção
      process.env.FORCE_ASCII_ONLY = 'true';
      process.env.TESTED_FONT = 'Arial, sans-serif'; // Força fonte ultra-confiável
      fontsRegistered = false; // Garantir que não tenta usar fonts registradas
    }
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
    
    // Usar dimensões padronizadas (voltando ao tamanho original)
    const width = config.orientation === 'landscape' ? 1200 : 800;
    const height = config.orientation === 'landscape' ? 800 : 1200;
    
    console.log(`📐 Certificado: ${width}x${height} (Serverless: ${isServerlessEnv})`);
    
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
    
    // Obter multiplicadores baseados no template
    const multipliers = getFontMultipliers(config.template);
    
    // Título - Restaurando tamanhos originais otimizados
    drawText(ctx, config.title, {
      x: (width * config.titlePosition.x) / 100,
      y: (height * config.titlePosition.y) / 100,
      fontSize: Math.round(config.titleFontSize * multipliers.title),
      color: config.primaryColor,
      fontWeight: 'bold',
      align: 'center',
      fontFamily: getFontFamily()
    });
    
    // Subtítulo se presente
    if (config.subtitle) {
      drawText(ctx, config.subtitle, {
        x: (width * config.titlePosition.x) / 100,
        y: (height * config.titlePosition.y) / 100 + config.titleFontSize * 2.5,
        fontSize: Math.round(config.titleFontSize * multipliers.subtitle),
        color: config.secondaryColor,
        fontWeight: 'normal',
        align: 'center',
        fontFamily: getFontFamily()
      });
    }
    
    // Nome do participante - Tamanho otimizado
    const participantName = data.userName;
    drawText(ctx, participantName, {
      x: (width * config.namePosition.x) / 100,
      y: (height * config.namePosition.y) / 100,
      fontSize: Math.round(config.nameFontSize * multipliers.name),
      color: config.primaryColor,
      fontWeight: 'bold',
      align: 'center',
      fontFamily: getFontFamily()
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
    
    // Desenhar texto multilinha (sanitização será decidida internamente)
    drawMultilineText(ctx, bodyText, {
      x: (width * config.bodyPosition.x) / 100,
      y: (height * config.bodyPosition.y) / 100,
      fontSize: Math.round(config.bodyFontSize * multipliers.body),
      color: config.secondaryColor,
      maxWidth: width * 0.8,
      lineHeight: Math.round(config.bodyFontSize * multipliers.lineHeight),
      fontFamily: getFontFamily()
    });
    
    // Footer se presente
    if (config.footer) {
      drawText(ctx, config.footer, {
        x: (width * config.bodyPosition.x) / 100,
        y: (height * config.bodyPosition.y) / 100 + 120,
        fontSize: Math.round(config.bodyFontSize * multipliers.footer),
        color: config.secondaryColor,
        align: 'center',
        fontFamily: getFontFamily()
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
      fontSize: Math.round(config.bodyFontSize * multipliers.timestamp),
      color: config.secondaryColor,
      align: 'left',
      fontFamily: getFontFamily()
    });
    
    return canvas.toBuffer();
    
  } catch (error) {
    console.error('Erro ao gerar certificado como imagem:', error);
    throw new Error('Erro interno ao gerar certificado como imagem. Tente novamente.');
  }
};

// Funções auxiliares
function getFontFamily(): string {
  // Se já testamos uma fonte específica, usar ela
  if (process.env.TESTED_FONT) {
    return process.env.TESTED_FONT;
  }
  
  // Se fontes customizadas foram registradas, usar fonte registrada
  if (fontsRegistered) {
    return 'ProductionFont';
  }
  
  // Em ambientes serverless, usar fontes ultra-seguras
  if (isServerlessEnvironment()) {
    return 'sans-serif'; // Mais básico possível
  }
  
  // Fallback local
  return getSafeFontFamily();
}

// Multiplicadores de tamanho por template
function getFontMultipliers(template: string) {
  // CORREÇÃO AGRESSIVA: Multipliers drasticamente aumentados para garantir visibilidade
  // Compensar redimensionamento, cache e otimizações automáticas do Cloudinary
  const multipliers = {
    elegant: {
      title: 8.0,        // AUMENTADO DRASTICAMENTE: 4.5 → 8.0 (+78%)
      subtitle: 4.5,     // AUMENTADO DRASTICAMENTE: 2.4 → 4.5 (+88%) 
      name: 6.5,         // AUMENTADO DRASTICAMENTE: 3.6 → 6.5 (+81%)
      body: 6.0,         // AUMENTADO DRASTICAMENTE: 3.4 → 6.0 (+76%)
      lineHeight: 7.0,   // AUMENTADO DRASTICAMENTE: 4.0 → 7.0 (+75%)
      footer: 5.0,       // AUMENTADO DRASTICAMENTE: 2.8 → 5.0 (+79%)
      timestamp: 4.0     // AUMENTADO DRASTICAMENTE: 2.2 → 4.0 (+82%)
    },
    modern: {
      title: 7.5,        // AUMENTADO DRASTICAMENTE: 4.2 → 7.5 (+79%)
      subtitle: 4.0,     // AUMENTADO DRASTICAMENTE: 2.2 → 4.0 (+82%)
      name: 6.0,         // AUMENTADO DRASTICAMENTE: 3.4 → 6.0 (+76%)
      body: 5.5,         // AUMENTADO DRASTICAMENTE: 3.2 → 5.5 (+72%)
      lineHeight: 6.5,   // AUMENTADO DRASTICAMENTE: 3.8 → 6.5 (+71%)
      footer: 4.5,       // AUMENTADO DRASTICAMENTE: 2.6 → 4.5 (+73%)
      timestamp: 3.5     // AUMENTADO DRASTICAMENTE: 2.0 → 3.5 (+75%)
    },
    classic: {
      title: 7.0,        // AUMENTADO DRASTICAMENTE: 4.0 → 7.0 (+75%)
      subtitle: 3.8,     // AUMENTADO DRASTICAMENTE: 2.0 → 3.8 (+90%)
      name: 5.8,         // AUMENTADO DRASTICAMENTE: 3.2 → 5.8 (+81%)
      body: 5.3,         // AUMENTADO DRASTICAMENTE: 3.0 → 5.3 (+77%)
      lineHeight: 6.3,   // AUMENTADO DRASTICAMENTE: 3.6 → 6.3 (+75%)
      footer: 4.3,       // AUMENTADO DRASTICAMENTE: 2.4 → 4.3 (+79%)
      timestamp: 3.2     // AUMENTADO DRASTICAMENTE: 1.8 → 3.2 (+78%)
    },
    minimalist: {
      title: 6.5,        // AUMENTADO DRASTICAMENTE: 5.0 → 6.5 (+30%)
      subtitle: 3.5,     // AUMENTADO DRASTICAMENTE: 2.5 → 3.5 (+40%)
      name: 5.2,         // AUMENTADO DRASTICAMENTE: 4.0 → 5.2 (+30%)
      body: 5.0,         // AUMENTADO DRASTICAMENTE: 3.8 → 5.0 (+32%)
      lineHeight: 6.0,   // AUMENTADO DRASTICAMENTE: 4.5 → 6.0 (+33%)
      footer: 4.0,       // AUMENTADO DRASTICAMENTE: 3.0 → 4.0 (+33%)
      timestamp: 3.0     // AUMENTADO DRASTICAMENTE: 2.2 → 3.0 (+36%)
    }
  };
  
  return multipliers[template as keyof typeof multipliers] || multipliers.modern;
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
  const weight = (options.fontWeight || 'normal').toLowerCase() === 'bold' ? 'bold' : 'normal';
  const family = options.fontFamily || getFontFamily();
  
  // SEMPRE usar ASCII em produção para máxima compatibilidade
  const isServerless = isServerlessEnvironment();
  const shouldUseASCII = isServerless || process.env.FORCE_ASCII_ONLY === 'true' || !fontsRegistered;
  
  // Sanitizar texto de forma mais agressiva
  let finalText = shouldUseASCII ? sanitizeTextForPDF(text) : text;
  
  // Em serverless, forçar encoding ainda mais seguro
  if (isServerless) {
    finalText = finalText
      .normalize('NFD')  // Decompor caracteres
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
      .replace(/[^\x00-\x7F]/g, '') // Manter apenas ASCII básico
      .replace(/[^\w\s\-\.\,\!\?\(\)]/g, ' ') // Manter apenas caracteres ultra-seguros
      .replace(/\s+/g, ' ')  // Normalizar espaços
      .trim();
  }
  
  // Estratégias de fonte em ordem de preferência
  const fontStrategies = isServerless ? [
    'sans-serif',                    // Mais básico possível
    'Arial',                         // Fallback comum
    'monospace'                      // Última opção
  ] : [
    family,                          // Fonte preferida
    'Arial',                         // Fallback comum
    'sans-serif'                     // Básico
  ];
  
  let drawn = false;
  
  for (const fontFamily of fontStrategies) {
    try {
      const fontString = `${weight} ${options.fontSize}px ${fontFamily}`;
      ctx.font = fontString;
      ctx.fillStyle = options.color;
      ctx.textAlign = options.align || 'left';
      ctx.textBaseline = 'top';
      
      console.log(`🖍️  [${isServerless ? 'SERVERLESS' : 'LOCAL'}] Tentando: "${finalText}"`);
      console.log(`    📝 Fonte: ${fontString}`);
      console.log(`    🔤 ASCII: ${shouldUseASCII}`);
      
      // Testar se a fonte funciona medindo texto
      const metrics = ctx.measureText(finalText);
      if (metrics.width > 0) {
        ctx.fillText(finalText, options.x, options.y);
        console.log(`    ✅ Sucesso com: ${fontFamily}`);
        drawn = true;
        break;
      }
      
    } catch (drawError) {
      console.warn(`    ❌ Falha com ${fontFamily}:`, drawError);
      continue;
    }
  }
  
  // Se nada funcionou, desenhar caractere por caractere
  if (!drawn) {
    console.error('🆘 FALLBACK EXTREMO: desenhando caractere por caractere');
    ctx.font = `${weight} ${options.fontSize}px monospace`;
    ctx.fillStyle = options.color;
    
    // Converter para apenas letras e números
    const safeText = finalText.replace(/[^a-zA-Z0-9\s]/g, '');
    ctx.fillText(safeText, options.x, options.y);
  }
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
  // Usar a mesma estratégia robusta do drawText
  const isServerless = isServerlessEnvironment();
  const shouldUseASCII = isServerless || process.env.FORCE_ASCII_ONLY === 'true' || !fontsRegistered;
  
  // Sanitizar texto de forma mais agressiva
  let finalText = shouldUseASCII ? sanitizeTextForPDF(text) : text;
  
  if (isServerless) {
    finalText = finalText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^\w\s\-\.\,\!\?\(\)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  const fontStrategies = isServerless ? ['sans-serif', 'Arial', 'monospace'] : [
    options.fontFamily || getFontFamily(),
    'Arial',
    'sans-serif'
  ];
  
  let successfulFont = 'monospace'; // Fallback padrão
  
  // Encontrar uma fonte que funcione
  for (const fontFamily of fontStrategies) {
    try {
      const fontString = `${options.fontSize}px ${fontFamily}`;
      ctx.font = fontString;
      const testMetrics = ctx.measureText('test');
      if (testMetrics.width > 0) {
        successfulFont = fontFamily;
        break;
      }
    } catch {
      continue;
    }
  }
  
  ctx.font = `${options.fontSize}px ${successfulFont}`;
  ctx.fillStyle = options.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const words = finalText.split(' ');
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
  
  console.log(`🖍️  [${isServerless ? 'SERVERLESS' : 'LOCAL'}] Desenhando ${lines.length} linhas`);
  console.log(`    📝 Fonte final: ${successfulFont}, ASCII: ${shouldUseASCII}`);
  
  lines.forEach((line, index) => {
    try {
      // Em caso de falha extrema, usar apenas letras e números
      const safeLine = isServerless ? line.replace(/[^a-zA-Z0-9\s]/g, '') : line;
      ctx.fillText(safeLine, options.x, startY + index * options.lineHeight);
    } catch (drawError) {
      console.error(`❌ Erro linha ${index + 1}, usando fallback extremo:`, drawError);
      ctx.font = `${options.fontSize}px monospace`;
      const ultraSafeLine = line.replace(/[^a-zA-Z0-9\s]/g, '');
      ctx.fillText(ultraSafeLine, options.x, startY + index * options.lineHeight);
    }
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, text: string, opacity: number, color: string) {
  const family = getFontFamily();
  const shouldUseASCII = isServerlessEnvironment() || 
                        process.env.FORCE_ASCII_ONLY === 'true' || 
                        !fontsRegistered;
  
  const finalText = shouldUseASCII ? sanitizeTextForPDF(text) : text;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.globalAlpha = opacity;
  
  try {
    ctx.font = `bold 80px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(finalText, 0, 0);
  } catch (error) {
    console.error('❌ Erro ao desenhar watermark:', error);
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText(sanitizeTextForPDF(text), 0, 0);
  }
  
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
  const family = getFontFamily();
  
  ctx.strokeStyle = options.color;
  ctx.lineWidth = 4;
  ctx.strokeRect(
    options.x - options.size / 2,
    options.y - options.size / 2,
    options.size,
    options.size
  );
  
  try {
    ctx.font = `24px ${family}`;
    ctx.fillStyle = options.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QR', options.x, options.y - 15);
    ctx.fillText('CODE', options.x, options.y + 15);
  } catch (error) {
    console.error('❌ Erro ao desenhar QR placeholder:', error);
    ctx.font = '24px sans-serif';
    ctx.fillText('QR', options.x, options.y - 15);
    ctx.fillText('CODE', options.x, options.y + 15);
  }
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

// ---- Font registration helpers ----
let fontsRegistered = false;

async function ensureFontsRegistered(registerFont: (src: string, options: { family: string }) => void) {
  if (fontsRegistered) return;
  
  console.log('🔤 Iniciando registro de fontes para produção...');
  console.log('🌍 Ambiente serverless:', isServerlessEnvironment());
  
  try {
    // Em ambientes serverless, pular fontes customizadas e usar fontes do sistema
    if (isServerlessEnvironment()) {
      console.log('🏭 Ambiente serverless detectado - usando fontes do sistema');
      process.env.FORCE_ASCII_ONLY = 'true';
      fontsRegistered = false; // Força uso de fontes do sistema
      return;
    }

    const tmpDir = process.env.TEMP || '/tmp';

    // 1) Tentar registrar fontes EMBUTIDAS (OpenSans) como TTF a partir de base64
    try {
      const regularEmbedded = EMBEDDED_FONTS.find(f => f.family === 'OpenSans' && f.weight === 'normal');
      const boldEmbedded = EMBEDDED_FONTS.find(f => f.family === 'OpenSans' && f.weight === 'bold');

      if (regularEmbedded && boldEmbedded) {
        const regularPath = path.join(tmpDir, 'OpenSans-Regular.ttf');
        const boldPath = path.join(tmpDir, 'OpenSans-Bold.ttf');

        await writeEmbeddedFontToPath(regularEmbedded.data, regularPath);
        await writeEmbeddedFontToPath(boldEmbedded.data, boldPath);

        // Registrar famílias embutidas como ProductionFont
        registerFont(regularPath, { family: 'ProductionFont' });
        registerFont(boldPath, { family: 'ProductionFont' });

        fontsRegistered = true;
        console.log('✅ OpenSans (embutida) registrada com sucesso');
        return;
      }
    } catch (embeddedError) {
      console.warn('❌ Falha ao registrar fontes embutidas:', embeddedError);
    }

    // 2) Se não for Windows, tentar baixar e registrar fontes remotas (evitar .woff2 no Windows)
    if (process.platform !== 'win32') {
      const fontSources = [
        RELIABLE_FONT_URLS.notoSans,
        RELIABLE_FONT_URLS.roboto,
        RELIABLE_FONT_URLS.inter
      ];

      let fontLoaded = false;

      // Tentar cada fonte até uma funcionar
      for (let i = 0; i < fontSources.length; i++) {
        const source = fontSources[i];
        const fontName = ['NotoSans', 'Roboto', 'Inter'][i];
        
        if (!source || !fontName) continue; // Pular se não tiver source válida
        
        try {
          console.log(`🔄 Tentando carregar ${fontName}...`);
          
          const regularPath = path.join(tmpDir, `${fontName}-Regular.woff2`);
          const boldPath = path.join(tmpDir, `${fontName}-Bold.woff2`);
          
          await downloadIfMissing(source.regular, regularPath);
          await downloadIfMissing(source.bold, boldPath);

          // Registrar famílias (pode falhar se formato não suportado)
          registerFont(regularPath, { family: 'ProductionFont' });
          registerFont(boldPath, { family: 'ProductionFont' });

          fontsRegistered = true;
          fontLoaded = true;
          console.log(`✅ ${fontName} registrada com sucesso`);
          break;
        } catch (sourceError) {
          console.warn(`❌ Falha com ${fontName}:`, sourceError);
          continue;
        }
      }

      if (!fontLoaded) {
        throw new Error('Nenhuma fonte pôde ser carregada');
      }
    } else {
      console.log('🪟 Windows detectado - pulando tentativa de registrar WOFF2 (não suportado pelo node-canvas).');
    }

  } catch (err) {
    console.warn('⚠️  Falha total no carregamento de fontes. Usando sistema de fallback.', err);
    // Em produção serverless, sempre usar ASCII + fontes do sistema
    process.env.FORCE_ASCII_ONLY = 'true';
    fontsRegistered = false;
  }
}

async function downloadIfMissing(url: string, destPath: string) {
  try {
    // Verifica existência
    await fs.access(destPath);
    return; // Já existe
  } catch {
    // Baixa e salva
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao baixar fonte: ${url} (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(destPath, buffer);
}

/**
 * Grava uma fonte embutida (data URI base64) para um caminho no disco
 */
async function writeEmbeddedFontToPath(dataUri: string, destPath: string) {
  try {
    await fs.access(destPath);
    return; // já existe
  } catch {
    // criar/atualizar arquivo
  }
  const base64 = dataUri.split(',')[1] || '';
  const buffer = Buffer.from(base64, 'base64');
  await fs.writeFile(destPath, buffer);
}

/**
 * Testa se a renderização de fonte está funcionando corretamente
 */
function testFontRendering(ctx: CanvasRenderingContext2D) {
  const isServerless = isServerlessEnvironment();
  
  // Testar múltiplas fontes
  const fontsToTest = isServerless ? 
    ['sans-serif', 'Arial', 'monospace'] : 
    [getFontFamily(), 'Arial', 'sans-serif'];
  
  let workingFont = 'monospace'; // Fallback padrão
  let canRenderAccents = false;
  
  for (const font of fontsToTest) {
    try {
      ctx.font = `16px ${font}`;
      ctx.fillStyle = 'black';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Testar métricas de texto
      const metrics = ctx.measureText('Test');
      if (metrics.width > 0) {
        workingFont = font;
        
        // Testar se consegue renderizar acentos
        try {
          ctx.fillText('Açãí', 0, 0);
          canRenderAccents = true;
          console.log(`✅ Fonte OK: ${font} (acentos: ✓)`);
          break;
        } catch {
          console.log(`⚠️  Fonte ${font} funciona mas sem acentos`);
          break; // Usar esta fonte mas forçar ASCII
        }
      }
    } catch (error) {
      console.warn(`❌ Fonte ${font} falhou:`, error);
      continue;
    }
  }
  
  console.log(`🧪 RESULTADO DO TESTE:`);
  console.log(`   📝 Fonte selecionada: ${workingFont}`);
  console.log(`   🌍 Ambiente: ${isServerless ? 'SERVERLESS' : 'LOCAL'}`);
  console.log(`   🔤 Suporte acentos: ${canRenderAccents ? 'SIM' : 'NÃO'}`);
  
  // Se não suporta acentos ou está em produção, forçar ASCII
  if (!canRenderAccents || isServerless) {
    process.env.FORCE_ASCII_ONLY = 'true';
    console.log(`   ⚠️  ASCII FORÇADO`);
  }
  
  // Se suporta acentos localmente, liberar Unicode e marcar fontes como "registradas"
  if (canRenderAccents && !isServerless) {
    process.env.FORCE_ASCII_ONLY = 'false';
    fontsRegistered = true;
  }
  
  // Salvar fonte testada para usar depois
  process.env.TESTED_FONT = workingFont;
}
