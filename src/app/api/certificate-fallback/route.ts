import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextForPDF } from '@/lib/text-utils';

/**
 * API de fallback para gerar certificados simples quando a geração principal falha
 * Retorna um SVG simples que pode ser convertido para PNG ou PDF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, eventName, eventDate, eventStartTime, eventEndTime } = body;

    if (!userName || !eventName || !eventDate) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando: userName, eventName, eventDate' },
        { status: 400 }
      );
    }

    // Sanitizar todos os textos
    const sanitizedUserName = sanitizeTextForPDF(userName);
    const sanitizedEventName = sanitizeTextForPDF(eventName);
    
    // Formatar data
    const formattedDate = new Date(eventDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Formatar horários se disponíveis
    let timeRange = '';
    if (eventStartTime && eventEndTime) {
      const startTime = new Date(eventStartTime).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const endTime = new Date(eventEndTime).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      timeRange = ` das ${startTime} as ${endTime}`;
    }

    // Gerar SVG simples e compatível
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">
  <!-- Borda decorativa -->
  <rect x="40" y="40" width="1120" height="720" fill="none" stroke="#2563eb" stroke-width="4"/>
  <rect x="60" y="60" width="1080" height="680" fill="none" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- Linhas de destaque (template moderno) -->
  <rect x="0" y="0" width="1200" height="20" fill="#2563eb"/>
  <rect x="0" y="780" width="1200" height="20" fill="#2563eb"/>
  
  <!-- Título -->
  <text x="600" y="180" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
        text-anchor="middle" fill="#2563eb">
    Certificado de Participacao
  </text>
  
  <!-- Subtítulo -->
  <text x="600" y="240" font-family="Arial, sans-serif" font-size="24" 
        text-anchor="middle" fill="#64748b">
    Curso de Capacitacao Profissional
  </text>
  
  <!-- Nome do participante -->
  <text x="600" y="340" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
        text-anchor="middle" fill="#2563eb">
    ${sanitizedUserName}
  </text>
  
  <!-- Texto principal -->
  <text x="600" y="420" font-family="Arial, sans-serif" font-size="20" 
        text-anchor="middle" fill="#64748b">
    Certificamos que o participante acima mencionado
  </text>
  <text x="600" y="450" font-family="Arial, sans-serif" font-size="20" 
        text-anchor="middle" fill="#64748b">
    concluiu com exito o evento
  </text>
  <text x="600" y="480" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
        text-anchor="middle" fill="#2563eb">
    ${sanitizedEventName}
  </text>
  <text x="600" y="520" font-family="Arial, sans-serif" font-size="20" 
        text-anchor="middle" fill="#64748b">
    realizado em ${formattedDate}${timeRange}
  </text>
  
  <!-- Rodapé -->
  <text x="600" y="620" font-family="Arial, sans-serif" font-size="16" 
        text-anchor="middle" fill="#64748b">
    Valido em todo territorio nacional
  </text>
  
  <!-- Data de emissão -->
  <text x="100" y="760" font-family="Arial, sans-serif" font-size="14" 
        text-anchor="start" fill="#64748b">
    Certificado emitido em ${new Date().toLocaleDateString('pt-BR')}
  </text>
  
  <!-- QR Code placeholder -->
  <rect x="1050" y="150" width="100" height="100" fill="none" stroke="#64748b" stroke-width="2"/>
  <text x="1100" y="190" font-family="Arial, sans-serif" font-size="14" 
        text-anchor="middle" fill="#64748b">QR</text>
  <text x="1100" y="210" font-family="Arial, sans-serif" font-size="14" 
        text-anchor="middle" fill="#64748b">CODE</text>
</svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Erro na API de fallback de certificado:', error);
    return NextResponse.json(
      { error: 'Erro interno na geração do certificado de fallback' },
      { status: 500 }
    );
  }
}
