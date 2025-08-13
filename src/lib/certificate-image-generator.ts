import { CertificateConfig } from '@/types';
import type { CanvasRenderingContext2D } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import { 
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
      // Produção: configuração simples e confiável
      console.log('🏭 PRODUÇÃO: usando configuração simples');
      fontsRegistered = false; // Não registrar fontes customizadas em produção
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
      ctx.lineWidth = config.borderWidth; // ✅ CORREÇÃO: Usar valor exato da configuração
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
    
    // 🎯 NOVA LÓGICA: Replicar exatamente o preview (sem multipliers)
    const fontSizes = getFontSizes(config);
    
    console.log('🎯 REPLICANDO PREVIEW - Tamanhos exatos:', {
      title: fontSizes.title,
      name: fontSizes.name, 
      body: fontSizes.body,
      subtitle: fontSizes.subtitle
    });
    
    // Título - EXATAMENTE como no preview
    const titlePos = formatPosition(config.titlePosition, width, height);
    drawText(ctx, config.title, {
      x: titlePos.x,
      y: titlePos.y,
      fontSize: fontSizes.title,
      color: config.primaryColor,
      fontWeight: 'bold',
      align: 'center',
      fontFamily: getFontFamily()
    });
    
    // Subtítulo - EXATAMENTE como no preview
    if (config.subtitle) {
      const subtitlePos = formatPosition({
        x: config.titlePosition.x,
        y: config.titlePosition.y + 8  // EXATO mesmo offset do preview
      }, width, height);
      
      drawText(ctx, config.subtitle, {
        x: subtitlePos.x,
        y: subtitlePos.y,
        fontSize: fontSizes.subtitle,
        color: config.secondaryColor,
        fontWeight: 'normal',
        align: 'center',
        fontFamily: getFontFamily()
      });
    }
    
    // Nome do participante - EXATAMENTE como no preview
    const participantName = data.userName;
    const namePos = formatPosition(config.namePosition, width, height);
    drawText(ctx, participantName, {
      x: namePos.x,
      y: namePos.y,
      fontSize: fontSizes.name,
      color: config.primaryColor,
      fontWeight: 'semibold',  // Preview usa font-semibold
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
    
    // Texto do corpo - EXATAMENTE como no preview
    const bodyPos = formatPosition(config.bodyPosition, width, height);
    drawMultilineText(ctx, bodyText, {
      x: bodyPos.x,
      y: bodyPos.y,
      fontSize: fontSizes.body,
      color: config.secondaryColor,
      maxWidth: width * 0.8,          // Preview usa width: '80%'
      lineHeight: fontSizes.body * 1.5, // Preview usa lineHeight: '1.5'
      fontFamily: getFontFamily()
    });
    
    // Footer - EXATAMENTE como no preview
    if (config.footer) {
      const footerPos = formatPosition({
        x: config.bodyPosition.x,
        y: config.bodyPosition.y + 15  // EXATO mesmo offset do preview
      }, width, height);
      
      drawText(ctx, config.footer, {
        x: footerPos.x,
        y: footerPos.y,
        fontSize: fontSizes.footer,
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
        
        // Logo - EXATAMENTE como no preview (centralizada na posição)
        const logoPos = formatPosition(config.logoPosition, width, height);
        const logoX = logoPos.x - logoWidth / 2;
        const logoY = logoPos.y - logoHeight / 2;
        
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
        
        // Placeholder da logo - EXATAMENTE como no preview
        const logoSize = config.logoSize;  // Usar tamanho exato da configuração
        const logoPos = formatPosition(config.logoPosition, width, height);
        const logoX = logoPos.x - logoSize / 2;
        const logoY = logoPos.y - logoSize / 2;
        
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
        
        // Carregar QR Code como imagem - EXATAMENTE como no preview
        const qrImage = await loadImage(qrDataURL);
        const qrSize = 60;  // Preview usa width: '60px', height: '60px'
        const qrPos = formatPosition(config.qrCodePosition, width, height);
        const qrX = qrPos.x - qrSize / 2;  // Centralizar como no preview
        const qrY = qrPos.y - qrSize / 2;
        
        console.log('🖼️  Desenhando QR Code:', { qrSize, qrX, qrY });
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        console.log('✅ QR Code desenhado com sucesso');
        
      } catch (qrError) {
        console.error('❌ Erro ao gerar QR Code:', qrError);
        
        // Fallback para placeholder - usar posicionamento correto
        const qrPos = formatPosition(config.qrCodePosition, width, height);
        drawQRPlaceholder(ctx, {
          x: qrPos.x,
          y: qrPos.y,
          size: 60,  // Mesmo tamanho do preview
          color: config.secondaryColor
        });
        }
      }
    }
    
    // Data de geração - posição fixa como no preview
    const currentDate = new Date().toLocaleDateString('pt-BR');
    drawText(ctx, `Certificado emitido em ${currentDate}`, {
      x: 40,
      y: height - 40,
      fontSize: fontSizes.timestamp,  // Usar tamanho exato
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

// 🎯 NOVA ABORDAGEM: REPLICAR EXATAMENTE O PREVIEW
// O preview usa tamanhos EXATOS da configuração (sem multipliers)
// Função de formatação de posição idêntica ao preview
function formatPosition(position: { x: number; y: number }, width: number, height: number) {
  return {
    x: (width * position.x) / 100,
    y: (height * position.y) / 100
  };
}

// 🚨 REMOVENDO MULTIPLIERS - usar tamanhos EXATOS como no preview
// O preview usa: fontSize: `${config.titleFontSize}px` (SEM multipliers!)
function getFontSizes(config: CertificateConfig) {
  return {
    title: config.titleFontSize,                    // EXATO: 24px
    subtitle: config.titleFontSize * 0.6,          // EXATO: 24 * 0.6 = 14.4px 
    name: config.nameFontSize,                      // EXATO: 18px
    body: config.bodyFontSize,                      // EXATO: 12px
    footer: config.bodyFontSize * 0.9,              // EXATO: 12 * 0.9 = 10.8px
    timestamp: 8                                    // FIXO: 8px
  };
}

// 🚀 CACHE para configuração de renderização - FORÇAR RESET para aplicar correções críticas
let _renderConfig: { isServerless: boolean; shouldUseASCII: boolean; fontStrategies: string[] } | null = null;

// 🚨 RESET FORÇADO do cache para garantir que as correções sejam aplicadas
export function resetRenderConfig() {
  _renderConfig = null;
  console.log('🔄 Cache de renderização resetado - correções serão aplicadas');
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
  const family = options.fontFamily || getFontFamily();
  
  // 🎯 Cache da configuração de renderização (resetar para aplicar correções)
  if (!_renderConfig) {
    const isServerless = isServerlessEnvironment();
    const shouldUseASCII = process.env.FORCE_ASCII_ONLY === 'true' && isServerless;
    
    // Estratégias de fonte simples e confiáveis
    const fontStrategies = [
      family,                          // Fonte preferida
      'Arial',                         // Fallback confiável
      'sans-serif'                     // Universal
    ];

    _renderConfig = { isServerless, shouldUseASCII, fontStrategies };
    
    console.log('🎯 CONFIGURAÇÃO DE RENDERIZAÇÃO:', {
      isServerless,
      shouldUseASCII,
      forcedASCII: process.env.FORCE_ASCII_ONLY,
      message: shouldUseASCII ? '⚠️  ASCII será forçado' : '✅ Acentos preservados'
    });
  }
  
  // ✅ CORREÇÃO: Manter caracteres portugueses em produção
  let finalText = text;
  
  // 🚨 CORREÇÃO CRÍTICA: Usar AND (&&) em vez de OR (||)
  // Só processar texto se REALMENTE precisar forçar ASCII
  if (_renderConfig.shouldUseASCII) {
    // MODO CONSERVATIVO: Apenas remover caracteres realmente problemáticos
    finalText = text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove apenas caracteres de controle
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
      .replace(/\s+/g, ' ')                       // Normalizar espaços
      .trim();
    
    console.log('✅ TEXTO PRESERVADO:', {
      original: `"${text.substring(0, 30)}"`,
      preservado: `"${finalText.substring(0, 30)}"`,
      manteuAcentos: /[àáâãäåæçèéêëìíîïñòóôõöøùúûüý]/i.test(finalText),
      forcedASCII: _renderConfig.shouldUseASCII
    });
  } else {
    console.log('✅ TEXTO INTACTO (produção):', {
      texto: `"${text.substring(0, 30)}"`,
      ambiente: _renderConfig.isServerless ? 'SERVERLESS' : 'LOCAL',
      preservandoAcentos: true
    });
  }
  
  let drawn = false;
  
  // 🎯 RENDERIZAÇÃO COM DEBUG COMPLETO
  for (const fontFamily of _renderConfig.fontStrategies) {
    try {
      const weight = options.fontWeight || 'normal';
      const fontString = `${weight} ${options.fontSize}px ${fontFamily}`;
      
      console.log(`🔤 Tentativa fonte: ${fontString}`);
      
      ctx.font = fontString;
      ctx.fillStyle = options.color;
      ctx.textAlign = options.align || 'left';
      ctx.textBaseline = 'top';
      
      const metrics = ctx.measureText(finalText);
      console.log(`📏 Métricas: width=${metrics.width}, height=${options.fontSize}`);
      
      if (metrics.width > 0) {
        ctx.fillText(finalText, options.x, options.y);
        console.log(`✅ SUCESSO renderização: "${finalText}" com ${fontFamily}`);
        drawn = true;
        break;
      }
      
    } catch (fontError) {
      console.error(`❌ Erro fonte ${fontFamily}:`, fontError);
      continue;
    }
  }
  
  // 🆘 FALLBACK ULTRA-ROBUSTO
  if (!drawn) {
    console.error('🆘 TODAS as fontes falharam - usando fallback extremo');
    
    const ultraSafeFonts = ['Arial', 'sans-serif', 'monospace', 'serif'];
    
    for (const fallbackFont of ultraSafeFonts) {
      try {
        ctx.font = `normal ${options.fontSize}px ${fallbackFont}`;
        ctx.fillStyle = options.color;
        ctx.textAlign = options.align || 'left';
        ctx.textBaseline = 'top';
        
        // ✅ CORREÇÃO: Preservar caracteres portugueses no fallback
        const ultraSafeText = finalText
          .replace(/[^\w\sàáâãäåæçèéêëìíîïñòóôõöøùúûüýÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ\.\,\!\?\-\(\)]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || 'TEXTO';
        
        console.log(`🆘 Tentativa fallback: ${fallbackFont} -> "${ultraSafeText}"`);
        
        ctx.fillText(ultraSafeText, options.x, options.y);
        console.log(`✅ FALLBACK funcionou com ${fallbackFont}`);
        drawn = true;
        break;
        
      } catch (fallbackError) {
        console.error(`❌ Fallback ${fallbackFont} falhou:`, fallbackError);
        continue;
      }
    }
    
    if (!drawn) {
      console.error('💀 FALHA TOTAL: nem o fallback extremo funcionou');
    }
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
  const fontFamily = options.fontFamily || getFontFamily();
  const shouldUseASCII = process.env.FORCE_ASCII_ONLY === 'true' && isServerlessEnvironment();
  
  // ✅ CORREÇÃO: Preservar texto com acentos em produção
  const finalText = shouldUseASCII ? text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ').trim() : text;
  
  console.log('🔤 drawMultilineText - preservando acentos:', {
    shouldUseASCII,
    isServerless: isServerlessEnvironment(),
    textPreview: `"${text.substring(0, 20)}"`
  });
  
  ctx.font = `${options.fontSize}px ${fontFamily}`;
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
  
  lines.forEach((line, index) => {
    ctx.fillText(line, options.x, startY + index * options.lineHeight);
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, text: string, opacity: number, color: string) {
  const family = getFontFamily();
  const shouldUseASCII = process.env.FORCE_ASCII_ONLY === 'true' && isServerlessEnvironment();
  
  const finalText = shouldUseASCII ? text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ').trim() : text;

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
    ctx.fillText(text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ').trim(), 0, 0);
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
  
  console.log('🔤 Iniciando registro de fontes...');
  
  // 🚨 CORREÇÃO: Em ambiente de desenvolvimento Windows, pular registro de fontes
  if (isServerlessEnvironment()) {
    console.log('🏭 Serverless: usando fontes do sistema');
    // ✅ REMOVIDO: process.env.FORCE_ASCII_ONLY = 'true'; - não forçar ASCII em produção
    fontsRegistered = false; // Força uso de fontes do sistema
    return;
  }

  if (process.platform === 'win32') {
    console.log('🪟 Windows: usando fontes do sistema (fontes customizadas desabilitadas)');
    fontsRegistered = false; // Não registrar fontes customizadas no Windows
    return;
  }

  // 🔄 Apenas tentar registrar fontes em Linux/macOS em produção
  const tmpDir = process.env.TEMP || '/tmp';
  
  try {
    console.log('🐧 Linux/macOS: tentando registrar fontes customizadas...');
    
    // Tentar apenas fontes confiáveis em produção
    const fontSources = [
      { url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', name: 'Inter-Regular' },
      { url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2', name: 'Inter-Bold' }
    ];

    for (const font of fontSources) {
      try {
        const fontPath = path.join(tmpDir, `${font.name}.woff2`);
        await downloadIfMissing(font.url, fontPath);
        registerFont(fontPath, { family: 'Inter' });
      } catch (fontError) {
        console.log(`⚠️ Fonte ${font.name} falhou: ${(fontError as Error).message}`);
        continue; // Continua para próxima fonte
      }
    }
    
    fontsRegistered = true;
    console.log('✅ Fontes customizadas registradas (Linux/macOS)');
    
  } catch (generalError) {
    console.log('⚠️ Falha geral no registro de fontes, usando fontes do sistema:', (generalError as Error).message);
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
  
  // ✅ CORREÇÃO: Apenas forçar ASCII se realmente não conseguir renderizar acentos
  if (!canRenderAccents && !isServerless) {
    process.env.FORCE_ASCII_ONLY = 'true';
    console.log(`   ⚠️  ASCII FORÇADO (apenas localmente se fontes falharem)`);
  }
  
  // Se suporta acentos localmente, liberar Unicode e marcar fontes como "registradas"
  if (canRenderAccents && !isServerless) {
    process.env.FORCE_ASCII_ONLY = 'false';
    fontsRegistered = true;
  }
  
  // Salvar fonte testada para usar depois
  process.env.TESTED_FONT = workingFont;
}
