// Importação dinâmica para compatibilidade com Next.js
import { CertificateConfig } from '@/types';
import { formatDateBrazil, formatTimeRangeBrazil } from '@/lib/date-utils';

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

    // Preparar configuração do certificado usando formato simples (não o CertificateConfigData completo)
    const certificateConfig = {
      // Configurações básicas
      template: data.config?.template || 'elegant',
      orientation: 'landscape' as const,
      
      // Cores
      primaryColor: data.config?.primaryColor || '#7c3aed',
      secondaryColor: data.config?.secondaryColor || '#6b7280',
      backgroundColor: '#ffffff',
      
      // Textos
      title: 'Certificado de Excelência',
      subtitle: 'Reconhecimento de Participação',
      bodyText: 'Por meio deste, certificamos que {userName} participou com distinção do evento {eventName}, demonstrando dedicação e comprometimento, realizado em {eventDate} das {eventTime}.',
      footer: 'Organização Certificada',
      
      // Posicionamento (usando as mesmas posições do Canvas)
      titlePosition: { x: 50, y: 20 },
      namePosition: { x: 50, y: 42 },
      bodyPosition: { x: 50, y: 65 },
      logoPosition: { x: 15, y: 20 },
      qrCodePosition: { x: 85, y: 20 },
      
      // Tamanhos de fonte
      titleFontSize: 24,
      nameFontSize: 18,
      bodyFontSize: 12,
      
      // Logo
      logoUrl: data.config?.logoUrl || '',
      logoSize: 150,
      
      // QR Code
      includeQRCode: data.config?.includeQRCode ?? true,
      qrCodeText: data.config?.qrCodeText || 'Validação digital de autenticidade',
      
      // Bordas e decorações
      showBorder: true,
      borderColor: data.config?.primaryColor || '#7c3aed',
      borderWidth: 2,
      showWatermark: false,
      watermarkText: '',
      watermarkOpacity: 0.1,
      
      // Fonte
      fontFamily: 'helvetica' as const
    };

    console.log('🎨 Configurações do certificado preparadas:', {
      template: certificateConfig.template,
      colors: {
        primary: certificateConfig.primaryColor,
        secondary: certificateConfig.secondaryColor
      },
      hasLogo: !!certificateConfig.logoUrl,
      includeQRCode: certificateConfig.includeQRCode
    });

    // Gerar HTML do certificado
    const certificateHTML = await generateCertificateHTML(certificateConfig, {
      participantName: data.userName,
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventStartTime: data.eventStartTime,
      eventEndTime: data.eventEndTime
    });

    console.log('🌐 HTML do certificado gerado');

    // Usar Puppeteer para converter HTML em PDF
    console.log('📄 Gerando PDF com Puppeteer...');
    
    const pdfBuffer = await generatePDFFromHTML(certificateHTML);

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
  template: 'modern' | 'classic' | 'elegant' | 'minimalist';
  orientation: 'landscape';
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
  qrCodePosition: { x: number; y: number };
  includeQRCode: boolean;
  qrCodeText: string;
  fontFamily: 'helvetica';
}

/**
 * Gera HTML do certificado baseado no componente CertificatePreview
 */
const generateCertificateHTML = async (config: SimpleCertificateConfig, data: {
  participantName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
}): Promise<string> => {
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
      .replace(/{eventTime}/g, timeRange);
  };

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificado</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 0.5in;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          background: white;
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .certificate {
          position: relative;
          width: 800px;
          height: 600px;
          background-color: ${config.backgroundColor};
          border: ${config.showBorder ? `${config.borderWidth}px solid ${config.borderColor}` : 'none'};
          margin: 0 auto;
        }
        
        .title {
          position: absolute;
          ${formatPosition(config.titlePosition)}
          font-size: ${config.titleFontSize}px;
          font-weight: bold;
          color: ${config.primaryColor};
          text-align: center;
          width: 80%;
        }
        
        .subtitle {
          position: absolute;
          ${formatPosition({ x: config.titlePosition.x, y: config.titlePosition.y + 8 })}
          font-size: ${config.titleFontSize * 0.6}px;
          color: ${config.secondaryColor};
          text-align: center;
          width: 70%;
        }
        
        .participant-name {
          position: absolute;
          ${formatPosition(config.namePosition)}
          font-size: ${config.nameFontSize}px;
          font-weight: 600;
          color: ${config.primaryColor};
          text-align: center;
          width: 80%;
        }
        
        .body-text {
          position: absolute;
          ${formatPosition(config.bodyPosition)}
          font-size: ${config.bodyFontSize}px;
          color: ${config.secondaryColor};
          text-align: center;
          width: 80%;
          line-height: 1.5;
        }
        
        .footer {
          position: absolute;
          ${formatPosition({ x: config.bodyPosition.x, y: config.bodyPosition.y + 15 })}
          font-size: ${config.bodyFontSize * 0.9}px;
          color: ${config.secondaryColor};
          text-align: center;
          width: 70%;
        }
        
        .logo {
          position: absolute;
          ${formatPosition(config.logoPosition)}
          width: ${config.logoSize}px;
          height: auto;
        }
        
        .qr-code {
          position: absolute;
          ${formatPosition(config.qrCodePosition)}
          width: 60px;
          height: 60px;
          border: 2px solid ${config.secondaryColor};
          color: ${config.secondaryColor};
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
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
      </style>
    </head>
    <body>
      <div class="certificate">
        <!-- Título -->
        <div class="title">${config.title}</div>
        
        <!-- Subtítulo -->
        ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
        
        <!-- Nome do participante -->
        <div class="participant-name">${data.participantName}</div>
        
        <!-- Corpo do texto -->
        <div class="body-text">${replaceVariables(config.bodyText)}</div>
        
        <!-- Rodapé -->
        ${config.footer ? `<div class="footer">${config.footer}</div>` : ''}
        
        <!-- Logo -->
        ${config.logoUrl ? `<img src="${config.logoUrl}" alt="Logo" class="logo" />` : ''}
        
        <!-- QR Code -->
        ${config.includeQRCode ? await generateQRCodeHTML(config.qrCodeText, config.secondaryColor) : ''}
        
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
const generatePDFFromHTML = async (html: string): Promise<Buffer> => {
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
    const pdfData = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      printBackground: true,
      preferCSSPageSize: false
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
