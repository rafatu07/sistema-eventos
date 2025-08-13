import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { CertificateConfig } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, eventName, eventDate, eventStartTime, eventEndTime, config } = body;

    console.log('🎯 Gerando certificado via HTML/Puppeteer (método do preview)');
    console.log('🎨 Background configurado:', config.backgroundColor || '#ffffff');
    console.log('📋 Config completa:', JSON.stringify(config, null, 2));

    // HTML completo com estilos inline
    const html = generateCertificateHtml({
      userName,
      eventName,
      eventDate: new Date(eventDate),
      eventStartTime: eventStartTime ? new Date(eventStartTime) : undefined,
      eventEndTime: eventEndTime ? new Date(eventEndTime) : undefined,
      config
    });

    // Iniciar Puppeteer com configuração otimizada
    const browser = await puppeteer.launch({
      headless: true, // Corrigido para compatibilidade com versões mais recentes
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--force-color-profile=srgb',
        '--disable-software-rasterizer'
      ]
    });

    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2 // Alta qualidade
    });

    // Definir conteúdo HTML e aguardar tudo carregar
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
      timeout: 10000 
    });
    
    // Aguardar um pouco mais para garantir que tudo foi renderizado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Forçar fundo da configuração na página
    await page.evaluate((bgColor) => {
      document.body.style.backgroundColor = bgColor;
      document.documentElement.style.backgroundColor = bgColor;
    }, config.backgroundColor || '#ffffff');

    // Capturar como PNG com fundo branco
    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: false, // Manter o fundo definido no CSS
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 800
      }
    });

    await browser.close();

    console.log('✅ Certificado gerado via HTML/Puppeteer com sucesso');

    // Retornar a imagem
    return new NextResponse(screenshot, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': screenshot.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Erro ao gerar certificado via HTML:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar certificado via HTML' },
      { status: 500 }
    );
  }
}

interface CertificateData {
  userName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
  config: CertificateConfig;
}

function generateCertificateHtml(data: CertificateData): string {
  const { config } = data;
  
  // Função de formatação de posição (IDÊNTICA ao preview)
  const formatPosition = (position: { x: number; y: number }) => 
    `left: ${position.x}%; top: ${position.y}%; transform: translate(-50%, -50%);`;
  
  // Substituição de variáveis (IDÊNTICA ao preview)
  const replaceVariables = (text: string) => {
    const formattedDate = data.eventDate.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    const formattedStartTime = data.eventStartTime?.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) || '';
    const formattedEndTime = data.eventEndTime?.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) || '';
    const formattedTimeRange = `${formattedStartTime} às ${formattedEndTime}`;
    
    return text
      .replace(/{userName}/g, data.userName)
      .replace(/{eventName}/g, data.eventName)
      .replace(/{eventDate}/g, formattedDate)
      .replace(/{eventTime}/g, formattedTimeRange)
      .replace(/{eventStartTime}/g, formattedStartTime)
      .replace(/{eventEndTime}/g, formattedEndTime);
  };

  // Font family CSS (IDÊNTICA ao preview)
  const getFontFamily = (fontFamily: string) => {
    switch (fontFamily) {
      case 'helvetica':
        return 'system-ui, -apple-system, Arial, sans-serif';
      case 'times':
        return 'Times, serif';
      case 'courier':
        return 'Courier, monospace';
      default:
        return 'Arial, sans-serif';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          width: 1200px;
          height: 800px;
          overflow: hidden;
          background-color: ${config.backgroundColor || '#ffffff'};
        }
        
        .certificate-container {
          position: relative;
          width: 100%;
          height: 100%;
          background-color: ${config.backgroundColor || '#ffffff'};
          ${config.showBorder ? `border: ${config.borderWidth}px solid ${config.borderColor};` : ''}
          font-family: ${getFontFamily(config.fontFamily)};
          z-index: 1;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        
        <!-- Watermark -->
        ${config.showWatermark ? `
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            opacity: ${config.watermarkOpacity};
            color: ${config.secondaryColor};
            font-size: ${config.titleFontSize * 2}px;
            font-weight: bold;
            pointer-events: none;
            user-select: none;
            z-index: -1;
          ">
            ${config.watermarkText}
          </div>
        ` : ''}
        
        <!-- Logo -->
        ${config.logoUrl ? `
          <div style="
            position: absolute;
            ${formatPosition(config.logoPosition)}
            width: ${config.logoSize}px;
            height: ${config.logoSize}px;
            z-index: 1;
          ">
            <img src="${config.logoUrl}" alt="Logo" style="
              width: 100%;
              height: 100%;
              object-fit: contain;
              filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
            " crossorigin="anonymous" />
          </div>
        ` : ''}
        
        <!-- Título -->
        <div style="
          position: absolute;
          ${formatPosition(config.titlePosition)}
          font-size: ${config.titleFontSize}px;
          color: ${config.primaryColor};
          font-weight: bold;
          text-align: center;
          width: 80%;
          z-index: 1;
        ">
          ${config.title}
        </div>
        
        <!-- Subtítulo -->
        ${config.subtitle ? `
          <div style="
            position: absolute;
            ${formatPosition({ x: config.titlePosition.x, y: config.titlePosition.y + 8 })}
            font-size: ${config.titleFontSize * 0.6}px;
            color: ${config.secondaryColor};
            text-align: center;
            width: 70%;
            z-index: 1;
          ">
            ${config.subtitle}
          </div>
        ` : ''}
        
        <!-- Nome do Participante -->
        <div style="
          position: absolute;
          ${formatPosition(config.namePosition)}
          font-size: ${config.nameFontSize}px;
          color: ${config.primaryColor};
          font-weight: 600;
          text-align: center;
          width: 80%;
          z-index: 1;
        ">
          ${data.userName}
        </div>
        
        <!-- Texto do Corpo -->
        <div style="
          position: absolute;
          ${formatPosition(config.bodyPosition)}
          font-size: ${config.bodyFontSize}px;
          color: ${config.secondaryColor};
          text-align: center;
          width: 80%;
          line-height: 1.5;
          z-index: 1;
        ">
          ${replaceVariables(config.bodyText)}
        </div>
        
        <!-- Footer -->
        ${config.footer ? `
          <div style="
            position: absolute;
            ${formatPosition({ x: config.bodyPosition.x, y: config.bodyPosition.y + 15 })}
            font-size: ${config.bodyFontSize * 0.9}px;
            color: ${config.secondaryColor};
            text-align: center;
            width: 70%;
            z-index: 1;
          ">
            ${config.footer}
          </div>
        ` : ''}
        
        <!-- QR Code Placeholder -->
        ${config.includeQRCode && config.qrCodeText ? `
          <div style="
            position: absolute;
            ${formatPosition(config.qrCodePosition)}
            width: 60px;
            height: 60px;
            border: 2px solid ${config.secondaryColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            text-align: center;
            z-index: 1;
          ">
            QR<br/>CODE
          </div>
        ` : ''}
        
        <!-- Data de Emissão -->
        <div style="
          position: absolute;
          bottom: 40px;
          left: 40px;
          font-size: 8px;
          color: ${config.secondaryColor};
          z-index: 1;
        ">
          Certificado emitido em ${new Date().toLocaleDateString('pt-BR')}
        </div>
        
      </div>
    </body>
    </html>
  `;
}
