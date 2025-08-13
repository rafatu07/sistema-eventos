import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { CertificateConfig } from '@/types';

export async function POST(request: NextRequest) {
  console.log('🎭 INICIANDO geração com PLAYWRIGHT (alternativa Puppeteer)');
  
  try {
    const body = await request.json();
    const { userName, eventName, eventDate, eventStartTime, eventEndTime, config } = body;

    console.log('📦 Dados recebidos:', {
      userName: userName?.substring(0, 20),
      eventName: eventName?.substring(0, 30),
      eventDate,
      configExists: !!config
    });

    // PASSO 1: Gerar HTML
    console.log('📄 PASSO 1: Gerando HTML...');
    const html = generateCertificateHtml({
      userName,
      eventName,
      eventDate: new Date(eventDate),
      eventStartTime: eventStartTime ? new Date(eventStartTime) : undefined,
      eventEndTime: eventEndTime ? new Date(eventEndTime) : undefined,
      config
    });
    console.log('✅ HTML gerado (tamanho:', html.length, 'chars)');

    // PASSO 2: Inicializar Playwright
    console.log('🎭 PASSO 2: Inicializando Playwright...');
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    let browser;
    try {
      // Playwright é mais simples - ele gerencia o browser automaticamente
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });
      console.log(`✅ Playwright browser iniciado (${isProduction ? 'PRODUÇÃO' : 'LOCAL'})`);
    } catch (browserError) {
      console.error('❌ Falha Playwright browser:', browserError);
      throw new Error(`Playwright browser: ${(browserError as Error).message}`);
    }

    // PASSO 3: Criar página e renderizar
    console.log('📄 PASSO 3: Criando página...');
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    
    console.log('🎨 PASSO 4: Renderizando HTML...');
    await page.setContent(html);
    await page.waitForTimeout(1000); // Aguardar renderização
    
    console.log('📸 PASSO 5: Capturando screenshot...');
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 800 }
    });
    
    await browser.close();
    console.log('🎉 PLAYWRIGHT: Certificado gerado com sucesso!');

    return new NextResponse(screenshot, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': screenshot.length.toString(),
      },
    });

  } catch (error) {
    console.error('💀 ERRO Playwright:', error);
    console.error('📊 Stack:', (error as Error).stack);
    
    return NextResponse.json(
      { 
        error: 'Falha Playwright na geração',
        details: (error as Error).message
      },
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
  
  const formatPosition = (position: { x: number; y: number }) => 
    `left: ${position.x}%; top: ${position.y}%; transform: translate(-50%, -50%);`;
  
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
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 1200px;
          height: 800px;
          background-color: ${config.backgroundColor || '#ffffff'};
          font-family: ${getFontFamily(config.fontFamily)};
        }
        .certificate-container {
          position: relative;
          width: 100%;
          height: 100%;
          background-color: ${config.backgroundColor || '#ffffff'};
          ${config.showBorder ? `border: ${config.borderWidth}px solid ${config.borderColor};` : ''}
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        
        ${config.logoUrl ? `
          <div style="
            position: absolute;
            left: 50%; top: 10%;
            transform: translate(-50%, -50%);
            width: ${config.logoSize || 80}px;
            height: ${config.logoSize || 80}px;
          ">
            <img src="${config.logoUrl}" alt="Logo" style="
              width: 100%;
              height: 100%;
              object-fit: contain;
            " />
          </div>
        ` : ''}
        
        <div style="
          position: absolute;
          left: 50%; top: 20%;
          transform: translate(-50%, -50%);
          font-size: ${config.titleFontSize || 48}px;
          color: ${config.primaryColor || '#000'};
          font-weight: bold;
          text-align: center;
          width: 80%;
        ">
          ${config.title || 'CERTIFICADO'}
        </div>
        
        ${config.subtitle ? `
          <div style="
            position: absolute;
            left: 50%; top: 28%;
            transform: translate(-50%, -50%);
            font-size: ${(config.titleFontSize || 48) * 0.6}px;
            color: ${config.secondaryColor || '#666'};
            text-align: center;
            width: 70%;
          ">
            ${config.subtitle}
          </div>
        ` : ''}
        
        <div style="
          position: absolute;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          font-size: ${config.nameFontSize || 36}px;
          color: ${config.primaryColor || '#000'};
          font-weight: 600;
          text-align: center;
          width: 80%;
        ">
          ${data.userName}
        </div>
        
        <div style="
          position: absolute;
          left: 50%; top: 70%;
          transform: translate(-50%, -50%);
          font-size: ${config.bodyFontSize || 18}px;
          color: ${config.secondaryColor || '#666'};
          text-align: center;
          width: 80%;
          line-height: 1.5;
        ">
          ${replaceVariables(config.bodyText || 'Certificamos que {userName} participou do evento {eventName}')}
        </div>
        
        ${config.footer ? `
          <div style="
            position: absolute;
            ${formatPosition({ x: config.bodyPosition.x, y: config.bodyPosition.y + 15 })}
            font-size: ${config.bodyFontSize * 0.9}px;
            color: ${config.secondaryColor};
            text-align: center;
            width: 70%;
          ">
            ${config.footer}
          </div>
        ` : ''}
        
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
          ">
            QR<br/>CODE
          </div>
        ` : ''}
        
        <div style="
          position: absolute;
          bottom: 40px;
          left: 40px;
          font-size: 8px;
          color: ${config.secondaryColor};
        ">
          Certificado emitido em ${new Date().toLocaleDateString('pt-BR')}
        </div>
        
      </div>
    </body>
    </html>
  `;
}
