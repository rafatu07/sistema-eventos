import { NextRequest, NextResponse } from 'next/server';
import { CertificateConfig } from '@/types';

// ⚡ API OTIMIZADA PARA VERCEL - SEM DEPENDÊNCIAS PESADAS
// Esta API usa apenas tecnologias web nativas compatíveis com serverless

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minuto é suficiente
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🚀 INICIANDO geração VERCEL-OPTIMIZED (sem dependências pesadas)');
  
  try {
    const body = await request.json();
    const { userName, eventName, eventDate, eventStartTime, eventEndTime, config } = body;

    console.log('📦 Dados recebidos:', {
      userName: userName?.substring(0, 20),
      eventName: eventName?.substring(0, 30),
      eventDate,
      configExists: !!config
    });

    // MÉTODO 1: Gerar HTML otimizado que pode ser convertido por serviços externos
    const html = generateOptimizedHtml({
      userName,
      eventName,
      eventDate: new Date(eventDate),
      eventStartTime: eventStartTime ? new Date(eventStartTime) : undefined,
      eventEndTime: eventEndTime ? new Date(eventEndTime) : undefined,
      config
    });

    console.log('✅ HTML otimizado gerado (', html.length, 'chars)');

    // MÉTODO 2: Usar serviço de conversão HTML->PNG compatível com Vercel
    const imageBuffer = await convertHtmlToImage(html);
    
    if (!imageBuffer) {
      throw new Error('Falha na conversão HTML para imagem');
    }

    console.log('🎉 Certificado PNG gerado com sucesso!');

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      },
    });

  } catch (error) {
    console.error('💀 ERRO na API Vercel-optimized:', error);
    console.error('📊 Stack:', (error as Error).stack);
    
    return NextResponse.json(
      { 
        error: 'Falha na geração otimizada para Vercel',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// 🎨 Gerador de HTML otimizado (sem dependências externas)
function generateOptimizedHtml(data: CertificateData): string {
  const { config } = data;
  
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

  // HTML otimizado para conversão por APIs externas
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1200, height=800">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      width: 1200px;
      height: 800px;
      background: ${config?.backgroundColor || '#ffffff'};
      font-family: 'Arial', sans-serif;
      position: relative;
      overflow: hidden;
    }
    
    .certificate-container {
      width: 100%;
      height: 100%;
      position: relative;
      ${config?.showBorder ? `border: ${config.borderWidth || 2}px solid ${config.borderColor || '#000'};` : ''}
      background: ${config?.backgroundColor || '#ffffff'};
    }
    
    .logo {
      position: absolute;
      left: 50%; top: 12%;
      transform: translate(-50%, -50%);
      width: ${config?.logoSize || 80}px;
      height: ${config?.logoSize || 80}px;
    }
    
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .title {
      position: absolute;
      left: 50%; top: 25%;
      transform: translate(-50%, -50%);
      font-size: ${config?.titleFontSize || 48}px;
      font-weight: bold;
      color: ${config?.primaryColor || '#000'};
      text-align: center;
      width: 80%;
    }
    
    .subtitle {
      position: absolute;
      left: 50%; top: 33%;
      transform: translate(-50%, -50%);
      font-size: ${(config?.titleFontSize || 48) * 0.6}px;
      color: ${config?.secondaryColor || '#666'};
      text-align: center;
      width: 70%;
    }
    
    .participant-name {
      position: absolute;
      left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      font-size: ${config?.nameFontSize || 36}px;
      font-weight: 600;
      color: ${config?.primaryColor || '#000'};
      text-align: center;
      width: 80%;
      line-height: 1.2;
    }
    
    .description {
      position: absolute;
      left: 50%; top: 68%;
      transform: translate(-50%, -50%);
      font-size: ${config?.bodyFontSize || 18}px;
      color: ${config?.secondaryColor || '#666'};
      text-align: center;
      width: 80%;
      line-height: 1.5;
    }
    
    .footer {
      position: absolute;
      left: 50%; top: 85%;
      transform: translate(-50%, -50%);
      font-size: ${(config?.bodyFontSize || 18) * 0.9}px;
      color: ${config?.secondaryColor || '#666'};
      text-align: center;
      width: 70%;
    }
    
    .timestamp {
      position: absolute;
      bottom: 20px;
      left: 20px;
      font-size: 10px;
      color: ${config?.secondaryColor || '#666'};
    }
    
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    
    ${config?.logoUrl ? `
      <div class="logo">
        <img src="${config.logoUrl}" alt="Logo do evento" crossorigin="anonymous" />
      </div>
    ` : ''}
    
    <div class="title">
      ${config?.title || 'CERTIFICADO'}
    </div>
    
    ${config?.subtitle ? `
      <div class="subtitle">
        ${config.subtitle}
      </div>
    ` : ''}
    
    <div class="participant-name">
      ${data.userName}
    </div>
    
    <div class="description">
      ${replaceVariables(config?.bodyText || 'Certificamos que {userName} participou do evento {eventName} em {eventDate}')}
    </div>
    
    ${config?.footer ? `
      <div class="footer">
        ${config.footer}
      </div>
    ` : ''}
    
    <div class="timestamp">
      Certificado emitido em ${new Date().toLocaleDateString('pt-BR')}
    </div>
    
  </div>
</body>
</html>`;
}

// 🔄 Conversor HTML para Imagem (usando serviços compatíveis com Vercel)
async function convertHtmlToImage(html: string): Promise<Buffer | null> {
  try {
    // OPÇÃO 1: API do htmlcsstoimage.com (mais confiável para Vercel)
    const htmlCssApiKey = process.env.HTML_CSS_API_KEY;
    
    if (htmlCssApiKey) {
      console.log('🎯 Tentando HTML/CSS to Image API...');
      
      const response = await fetch('https://hcti.io/v1/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${htmlCssApiKey}`
        },
        body: JSON.stringify({
          html: html,
          css: '', // CSS já está inline
          google_fonts: 'Arial',
          device_scale: 2,
          viewport_width: 1200,
          viewport_height: 800
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Baixar a imagem gerada
        const imageResponse = await fetch(result.url);
        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          console.log('✅ HTML/CSS to Image API funcionou!');
          return imageBuffer;
        }
      }
    }
    
    // OPÇÃO 2: Fallback usando Canvas API (mais simples)
    console.log('🎨 Usando fallback Canvas API...');
    return await generateSimpleCertificateCanvas(html);
    
  } catch (error) {
    console.error('❌ Erro na conversão:', error);
    return null;
  }
}

// 🎨 Fallback simples usando conceitos de Canvas (texto puro)
async function generateSimpleCertificateCanvas(_html: string): Promise<Buffer> {
  // Fallback muito simples - gera uma imagem básica em formato PNG
  // usando apenas tecnologias web padrão
  
  // Para implementação completa, poderíamos usar:
  // 1. node-canvas (mas é pesado para Vercel)
  // 2. Serviços externos como htmlcsstoimage.com
  // 3. Cloudinary Transformations
  
  // Por enquanto, retornamos um placeholder que pode ser melhorado
  /* 
  const placeholderImage = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    // ... resto do PNG mínimo seria muito complexo para implementar aqui
  ]);
  */
  
  // TODO: Implementar geração real de imagem ou usar serviço externo
  throw new Error('Canvas fallback não implementado - use HTML/CSS API');
}

interface CertificateData {
  userName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
  config?: CertificateConfig;
}