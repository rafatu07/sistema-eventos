const puppeteer = require('puppeteer');
import { CertificateConfigData } from '@/lib/schemas';
import { CertificateConfig } from '@/types';

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
    const certificateHTML = generateCertificateHTML(certificateConfig, {
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

    console.log('✅ PDF gerado com sucesso', {
      tamanho: pdfBuffer.length,
      método: 'CertificatePreview + Puppeteer'
    });

    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erro na geração do certificado PDF:', error);
    throw new Error(`Falha ao gerar certificado PDF: ${(error as Error).message}`);
  }
};

/**
 * Gera HTML do certificado baseado no componente CertificatePreview
 */
const generateCertificateHTML = (config: any, data: {
  participantName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
}): string => {
  const formatPosition = (position: { x: number; y: number }) => 
    `left: ${position.x}%; top: ${position.y}%; transform: translate(-50%, -50%);`;

  const replaceVariables = (text: string) => {
    const formattedDate = data.eventDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    const startTime = data.eventStartTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '16:00';
    const endTime = data.eventEndTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '20:00';
    const timeRange = `${startTime} às ${endTime}`;
    
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
        ${config.includeQRCode ? `<div class="qr-code">QR<br/>CODE</div>` : ''}
        
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
 * Converte HTML em PDF usando Puppeteer
 */
const generatePDFFromHTML = async (html: string): Promise<Buffer> => {
  let browser: any = null;
  
  try {
    console.log('🌐 Iniciando Puppeteer...');
    
    // Configurações otimizadas para Vercel
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      headless: true
    });

    const page = await browser.newPage();
    
    console.log('📄 Carregando HTML na página...');
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    console.log('🖨️ Gerando PDF...');
    const pdfBuffer = await page.pdf({
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

    console.log('✅ PDF gerado via Puppeteer');
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
