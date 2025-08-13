import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { CertificateConfig } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, eventName, eventDate, eventStartTime, eventEndTime, config } = body;

    console.log('🎯 INICIANDO geração certificado HTML/Puppeteer');
    console.log('📦 Dados recebidos:', {
      userName: userName?.substring(0, 20),
      eventName: eventName?.substring(0, 30),
      eventDate,
      configExists: !!config,
      configKeys: config ? Object.keys(config).slice(0, 5) : []
    });
    console.log('🎨 Background configurado:', config.backgroundColor || '#ffffff');

    // PASSO 1: Gerar HTML
    console.log('📄 PASSO 1: Gerando HTML...');
    let html: string;
    try {
      html = generateCertificateHtml({
        userName,
        eventName,
        eventDate: new Date(eventDate),
        eventStartTime: eventStartTime ? new Date(eventStartTime) : undefined,
        eventEndTime: eventEndTime ? new Date(eventEndTime) : undefined,
        config
      });
      console.log('✅ HTML gerado com sucesso (tamanho:', html.length, 'chars)');
    } catch (htmlGenError) {
      console.error('❌ FALHA ao gerar HTML:', htmlGenError);
      throw new Error(`Falha na geração HTML: ${(htmlGenError as Error).message}`);
    }

    // PASSO 2: Configurar Puppeteer  
    console.log('🤖 PASSO 2: Configurando Puppeteer...');
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    console.log('🔍 DEBUG Ambiente:', {
      isProduction,
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    });
    
    // PASSO 3: Inicializar Chromium
    console.log('🚀 PASSO 3: Inicializando browser...');
    let browser;
    try {
      if (isProduction) {
        console.log('🏭 PRODUÇÃO: Configurando @sparticuz/chromium...');
        const executablePath = await chromium.executablePath();
        console.log('📍 Chromium path:', executablePath);
        
        const launchConfig = {
          headless: true,
          executablePath: executablePath,
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
          timeout: 60000 // 60 segundos
        };
        
        console.log('⚙️ Config produção:', JSON.stringify(launchConfig.args.slice(0, 5), null, 2));
        browser = await puppeteer.launch(launchConfig);
        
      } else {
        console.log('💻 LOCAL: Usando Chrome nativo...');
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          timeout: 30000
        });
      }
      
      console.log(`✅ Browser iniciado com sucesso (${isProduction ? 'PRODUÇÃO' : 'LOCAL'})`);
      
    } catch (browserError) {
      console.error('❌ FALHA CRÍTICA ao iniciar browser:', browserError);
      throw new Error(`Falha browser: ${(browserError as Error).message}`);
    }

    // PASSO 4: Configurar página
    console.log('📄 PASSO 4: Criando nova página...');
    let page;
    try {
      page = await browser.newPage();
      console.log('✅ Página criada');
      
      // Configurar viewport
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2
      });
      console.log('✅ Viewport configurado (1200x800, scale=2)');
      
    } catch (pageError) {
      await browser.close();
      console.error('❌ FALHA ao criar página:', pageError);
      throw new Error(`Falha página: ${(pageError as Error).message}`);
    }

    // PASSO 5: Renderizar HTML
    console.log('🎨 PASSO 5: Renderizando HTML...');
    try {
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      console.log('✅ HTML renderizado');
      
      // Aguardar estabilização
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Renderização estabilizada');
      
    } catch (renderError) {
      await browser.close();
      console.error('❌ FALHA na renderização:', renderError);
      throw new Error(`Falha renderização: ${(renderError as Error).message}`);
    }

    // PASSO 6: Capturar screenshot
    console.log('📸 PASSO 6: Capturando screenshot...');
    let screenshot;
    try {
      screenshot = await page.screenshot({
        type: 'png',
        omitBackground: false,
        clip: { x: 0, y: 0, width: 1200, height: 800 }
      });
      console.log('✅ Screenshot capturado (tamanho:', screenshot.length, 'bytes)');
      
    } catch (screenshotError) {
      await browser.close();
      console.error('❌ FALHA no screenshot:', screenshotError);
      throw new Error(`Falha screenshot: ${(screenshotError as Error).message}`);
    }

    // PASSO 7: Finalizar
    console.log('🔚 PASSO 7: Finalizando...');
    await browser.close();
    console.log('✅ Browser fechado');
    console.log('🎉 Certificado HTML/Puppeteer gerado com SUCESSO TOTAL!');

    // Retornar a imagem
    return new NextResponse(screenshot, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': screenshot.length.toString(),
      },
    });

  } catch (error) {
    console.error('💀 ERRO FATAL na geração HTML/Puppeteer:', error);
    console.error('📊 Stack trace completo:', (error as Error).stack);
    console.error('🔍 Detalhes do erro:', {
      message: (error as Error).message,
      name: (error as Error).name,
      toString: (error as Error).toString()
    });
    console.error('🌍 Estado do sistema:', {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      version: process.version
    });
    
    return NextResponse.json(
      { 
        error: 'Falha crítica na geração de certificado HTML/Puppeteer',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
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
