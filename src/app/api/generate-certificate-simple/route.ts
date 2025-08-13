import { NextRequest, NextResponse } from 'next/server';

// 🚨 API ULTRA SIMPLES - BYPASS TOTAL DE TODAS AS DEPENDÊNCIAS
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🚨 SUPER SIMPLES - Iniciando...');
  
  try {
    console.log('📝 Passo 1: Lendo body...');
    const body = await request.json();
    
    console.log('📝 Passo 2: Extraindo dados...');
    const { userName = 'Usuário', eventName = 'Evento', eventDate } = body;
    
    console.log('📝 Passo 3: Dados extraídos:', { userName, eventName, eventDate });
    
    // Criar certificado simples como texto
    const certificateText = `
CERTIFICADO DE PARTICIPAÇÃO

Certificamos que

${userName}

participou do evento

${eventName}

realizado em ${new Date(eventDate).toLocaleDateString('pt-BR')}

Certificado digital válido
Emitido em ${new Date().toLocaleDateString('pt-BR')}
    `.trim();
    
    console.log('📝 Passo 4: Texto criado com', certificateText.length, 'chars');
    
    // Converter para buffer
    const textBuffer = Buffer.from(certificateText, 'utf-8');
    
    console.log('📝 Passo 5: Buffer criado com', textBuffer.length, 'bytes');
    
    // Upload DIRETO no Cloudinary (sem outras APIs)
    console.log('📝 Passo 6: Fazendo upload direto...');
    
    // Por enquanto, vamos só retornar o texto para ver se funciona
    return new NextResponse(textBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': textBuffer.length.toString(),
        'Content-Disposition': 'attachment; filename="certificado.txt"'
      },
    });
    
  } catch (error) {
    console.error('💀 ERRO TOTAL na API simples:', error);
    console.error('📊 Detalhes:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    });
    
    return NextResponse.json({
      error: 'Falhou até na API mais simples',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
