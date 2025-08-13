import { NextRequest, NextResponse } from 'next/server';
import { CertificateConfig } from '@/types';
import { getCertificateConfig } from '@/lib/certificate-config';
import { formatDateBrazil, formatTimeRangeBrazil, formatTimeBrazil } from '@/lib/date-utils';

// 🎨 API LIMPA PARA GERAÇÃO DE HTML - TOTALMENTE COMPATÍVEL COM VERCEL
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🎨 INICIANDO geração HTML limpa (sem dependências pesadas)');
  
  try {
    const body = await request.json();
    const { userName, eventName, eventDate, eventStartTime, eventEndTime, eventId } = body;

    console.log('📦 Dados recebidos:', {
      userName: userName?.substring(0, 20),
      eventName: eventName?.substring(0, 30),
      eventDate,
      eventId
    });

    // Buscar configurações do certificado (se disponível)
    let certificateConfig: CertificateConfig | null = null;
    
    try {
      if (eventId) {
        certificateConfig = await getCertificateConfig(eventId);
        console.log('✅ Configurações encontradas:', certificateConfig ? 'Sim' : 'Não');
      }
    } catch (configError) {
      console.warn('⚠️ Erro ao buscar config, usando padrão:', configError);
    }

    // Gerar HTML completo e estilizado
    const html = generateCertificateHTML({
      userName,
      eventName,
      eventDate: new Date(eventDate),
      eventStartTime: eventStartTime ? new Date(eventStartTime) : undefined,
      eventEndTime: eventEndTime ? new Date(eventEndTime) : undefined,
      config: certificateConfig
    });

    console.log('✅ HTML gerado com sucesso (', html.length, 'chars)');

    // Retornar HTML para o cliente processar
    return NextResponse.json({
      success: true,
      html: html,
      config: certificateConfig,
      method: 'HTML_CLEAN'
    });

  } catch (error) {
    console.error('💀 ERRO na API HTML limpa:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Falha na geração HTML',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// 🎨 Gerar HTML completo baseado nas configurações
function generateCertificateHTML(data: CertificateData): string {
  const { config } = data;
  
  // Usar configuração padrão se não houver personalizada
  const finalConfig: CertificateConfig = config || getDefaultConfig();
  
  // Funções auxiliares com fuso horário correto do Brasil
  const formatDate = (date: Date) => formatDateBrazil(date);

  const formatTime = (date?: Date) => 
    date ? formatTimeBrazil(date) : '';

  const formatTimeRange = () => {
    return formatTimeRangeBrazil(data.eventStartTime, data.eventEndTime);
  };

  // Substituir variáveis no texto
  const replaceVariables = (text: string) => {
    return text
      .replace(/{userName}/g, data.userName)
      .replace(/{eventName}/g, data.eventName)
      .replace(/{eventDate}/g, formatDate(data.eventDate))
      .replace(/{eventTime}/g, formatTimeRange())
      .replace(/{eventStartTime}/g, formatTime(data.eventStartTime))
      .replace(/{eventEndTime}/g, formatTime(data.eventEndTime));
  };

  // Obter família de fonte CSS
  const getFontFamily = (fontFamily: string) => {
    const fontMap = {
      'helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
      'times': '"Times New Roman", Times, serif',
      'courier': '"Courier New", Courier, monospace',
      'DejaVuSans': '"DejaVu Sans", "Liberation Sans", Arial, sans-serif'
    };
    return fontMap[fontFamily as keyof typeof fontMap] || fontMap.helvetica;
  };

  // Calcular posição em pixels (base 1200x800)
  const getPixelPosition = (position: { x: number; y: number }, containerWidth = 1200, containerHeight = 800) => ({
    x: (position.x / 100) * containerWidth,
    y: (position.y / 100) * containerHeight
  });

  const titlePos = getPixelPosition(finalConfig.titlePosition);
  const namePos = getPixelPosition(finalConfig.namePosition);
  const bodyPos = getPixelPosition(finalConfig.bodyPosition);
  const logoPos = finalConfig.logoUrl ? getPixelPosition(finalConfig.logoPosition) : null;
  const qrPos = finalConfig.includeQRCode ? getPixelPosition(finalConfig.qrCodePosition) : null;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1200, height=800">
    <title>Certificado - ${data.userName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${getFontFamily(finalConfig.fontFamily)};
            background: ${finalConfig.backgroundColor};
            width: 1200px;
            height: 800px;
            position: relative;
            overflow: hidden;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
        }
        
        .certificate-container {
            width: 100%;
            height: 100%;
            position: relative;
            background: ${finalConfig.backgroundColor};
            ${finalConfig.showBorder ? `border: ${finalConfig.borderWidth}px solid ${finalConfig.borderColor};` : ''}
        }
        
        .certificate-title {
            position: absolute;
            left: ${titlePos.x}px;
            top: ${titlePos.y}px;
            transform: translate(-50%, -50%);
            font-size: ${finalConfig.titleFontSize}px;
            font-weight: bold;
            color: ${finalConfig.primaryColor};
            text-align: center;
            max-width: 900px;
            line-height: 1.2;
        }
        
        .certificate-subtitle {
            position: absolute;
            left: ${titlePos.x}px;
            top: ${titlePos.y + 60}px;
            transform: translate(-50%, -50%);
            font-size: ${Math.floor(finalConfig.titleFontSize * 0.6)}px;
            color: ${finalConfig.secondaryColor};
            text-align: center;
            max-width: 800px;
            line-height: 1.3;
        }
        
        .participant-name {
            position: absolute;
            left: ${namePos.x}px;
            top: ${namePos.y}px;
            transform: translate(-50%, -50%);
            font-size: ${finalConfig.nameFontSize}px;
            font-weight: 600;
            color: ${finalConfig.primaryColor};
            text-align: center;
            max-width: 1000px;
            line-height: 1.2;
            letter-spacing: 1px;
        }
        
        .certificate-body {
            position: absolute;
            left: ${bodyPos.x}px;
            top: ${bodyPos.y}px;
            transform: translate(-50%, -50%);
            font-size: ${finalConfig.bodyFontSize}px;
            color: ${finalConfig.secondaryColor};
            text-align: center;
            max-width: 1000px;
            line-height: 1.6;
            padding: 0 20px;
        }
        
        ${finalConfig.footer ? `
        .certificate-footer {
            position: absolute;
            left: 600px;
            top: ${bodyPos.y + 80}px;
            transform: translate(-50%, -50%);
            font-size: ${Math.floor(finalConfig.bodyFontSize * 0.9)}px;
            color: ${finalConfig.secondaryColor};
            text-align: center;
            max-width: 800px;
            line-height: 1.4;
        }
        ` : ''}
        
        ${logoPos ? `
        .certificate-logo {
            position: absolute;
            left: ${logoPos.x}px;
            top: ${logoPos.y}px;
            transform: translate(-50%, -50%);
            width: ${finalConfig.logoSize}px;
            height: ${finalConfig.logoSize}px;
        }
        
        .certificate-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        ` : ''}
        
        ${finalConfig.showWatermark ? `
        .watermark {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: ${finalConfig.borderColor};
            opacity: ${finalConfig.watermarkOpacity};
            font-weight: bold;
            z-index: 1;
            pointer-events: none;
            user-select: none;
        }
        ` : ''}
        
        ${qrPos ? `
        .qr-code {
            position: absolute;
            left: ${qrPos.x}px;
            top: ${qrPos.y}px;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            border: 2px solid ${finalConfig.secondaryColor};
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            text-align: center;
            color: ${finalConfig.secondaryColor};
            font-weight: bold;
        }
        ` : ''}
        
        .issue-date {
            position: absolute;
            bottom: 20px;
            left: 20px;
            font-size: 10px;
            color: ${finalConfig.secondaryColor};
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        ${finalConfig.showWatermark ? `<div class="watermark">${finalConfig.watermarkText}</div>` : ''}
        
        ${logoPos && finalConfig.logoUrl ? `
        <div class="certificate-logo">
            <img src="${finalConfig.logoUrl}" alt="Logo" crossorigin="anonymous">
        </div>
        ` : ''}
        
        <div class="certificate-title">
            ${finalConfig.title}
        </div>
        
        ${finalConfig.subtitle ? `
        <div class="certificate-subtitle">
            ${finalConfig.subtitle}
        </div>
        ` : ''}
        
        <div class="participant-name">
            ${data.userName}
        </div>
        
        <div class="certificate-body">
            ${replaceVariables(finalConfig.bodyText)}
        </div>
        
        ${finalConfig.footer ? `
        <div class="certificate-footer">
            ${finalConfig.footer}
        </div>
        ` : ''}
        
        ${qrPos && finalConfig.includeQRCode ? `
        <div class="qr-code">
            QR<br>CODE
        </div>
        ` : ''}
        
        <div class="issue-date">
            Certificado emitido em ${new Date().toLocaleDateString('pt-BR')}
        </div>
    </div>
</body>
</html>`;
}

// 🎨 Configuração padrão caso não haja personalização
function getDefaultConfig(): CertificateConfig {
  return {
    id: 'default',
    eventId: '',
    template: 'modern',
    orientation: 'landscape',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    titleFontSize: 28,
    nameFontSize: 20,
    bodyFontSize: 14,
    fontFamily: 'helvetica',
    title: 'Certificado de Participação',
    bodyText: 'Certificamos que {userName} participou com êxito do evento {eventName}, realizado em {eventDate}.',
    titlePosition: { x: 50, y: 25 },
    namePosition: { x: 50, y: 45 },
    bodyPosition: { x: 50, y: 65 },
    logoSize: 80,
    logoPosition: { x: 15, y: 15 },
    showBorder: false,
    borderWidth: 2,
    showWatermark: false,
    watermarkText: 'CERTIFICADO',
    watermarkOpacity: 0.1,
    includeQRCode: false,
    qrCodePosition: { x: 90, y: 90 },
    createdBy: 'system',
    createdAt: new Date(),
  };
}

interface CertificateData {
  userName: string;
  eventName: string;
  eventDate: Date;
  eventStartTime?: Date;
  eventEndTime?: Date;
  config?: CertificateConfig | null;
}
