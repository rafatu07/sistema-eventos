import { NextRequest, NextResponse } from 'next/server';

// 🚨 API ULTRA-SIMPLES - GARANTIDA PARA FUNCIONAR
// Esta API é chamada pela API principal como fallback

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🔥 INICIANDO API ULTRA-SIMPLES (texto puro)');
  
  try {
    const body = await request.json();
    const { userName, eventName, eventDate } = body;

    console.log('📦 Dados recebidos (API Simples):', { userName, eventName, eventDate });

    // Gerar SVG simples sem dependências externas
    const svgCertificate = generateTextOnlyySVG({
      userName: userName || 'Participante',
      eventName: eventName || 'Evento',
      eventDate: formatDate(eventDate)
    });

    console.log('✅ SVG texto gerado:', svgCertificate.length, 'chars');

    // Retornar SVG como PNG simulado (Vercel pode fazer a conversão)
    const svgBuffer = Buffer.from(svgCertificate, 'utf8');

    return new NextResponse(svgBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Length': svgBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('💀 ERRO na API ULTRA-SIMPLES:', error);
    
    // ÚLTIMO RECURSO: Certificado em texto puro
    const textCertificate = `
      CERTIFICADO DE PARTICIPACAO
      
      Certificamos que PARTICIPANTE
      participou do evento EVENTO
      em ${new Date().toLocaleDateString('pt-BR')}
      
      Certificado digital valido
    `.replace(/PARTICIPANTE/g, 'Participante').replace(/EVENTO/g, 'Evento');

    return new NextResponse(textCertificate, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

// 🎨 Gerador de SVG ultra-simples
function generateTextOnlyySVG(data: { userName: string; eventName: string; eventDate: string }): string {
  return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background branco -->
  <rect width="800" height="600" fill="#ffffff"/>
  
  <!-- Borda simples -->
  <rect x="20" y="20" width="760" height="560" 
        stroke="#333333" stroke-width="2" fill="none"/>
  
  <!-- Título -->
  <text x="400" y="100" text-anchor="middle" 
        font-family="Arial" font-size="32" font-weight="bold" 
        fill="#2C3E50">
    CERTIFICADO
  </text>
  
  <!-- Subtítulo -->
  <text x="400" y="140" text-anchor="middle" 
        font-family="Arial" font-size="16" 
        fill="#7F8C8D">
    DE PARTICIPAÇÃO
  </text>
  
  <!-- Texto principal -->
  <text x="400" y="220" text-anchor="middle" 
        font-family="Arial" font-size="18" 
        fill="#34495E">
    Certificamos que
  </text>
  
  <!-- Nome participante -->
  <text x="400" y="280" text-anchor="middle" 
        font-family="Arial" font-size="28" font-weight="bold" 
        fill="#2C3E50">
    ${escapeXml(data.userName)}
  </text>
  
  <!-- Texto evento -->
  <text x="400" y="340" text-anchor="middle" 
        font-family="Arial" font-size="16" 
        fill="#34495E">
    participou do evento
  </text>
  
  <!-- Nome evento -->
  <text x="400" y="380" text-anchor="middle" 
        font-family="Arial" font-size="20" font-weight="bold" 
        fill="#2980B9">
    ${escapeXml(data.eventName)}
  </text>
  
  <!-- Data -->
  <text x="400" y="440" text-anchor="middle" 
        font-family="Arial" font-size="14" 
        fill="#7F8C8D">
    Realizado em ${data.eventDate}
  </text>
  
  <!-- Rodapé -->
  <text x="50" y="550" 
        font-family="Arial" font-size="10" 
        fill="#95A5A6">
    Certificado digital - ${new Date().toLocaleDateString('pt-BR')}
  </text>
  
</svg>`;
}

// 🔒 Escapa caracteres especiais XML
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 📅 Formatar data
function formatDate(dateString: string | Date): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch {
    return new Date().toLocaleDateString('pt-BR');
  }
}
