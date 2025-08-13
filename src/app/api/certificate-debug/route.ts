import { NextRequest, NextResponse } from 'next/server';

// 🔍 API DE DEBUG ULTRA SIMPLES - PARA IDENTIFICAR O PROBLEMA
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🔍 DEBUG API - Iniciando...');
  
  try {
    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));
    
    const { userName, eventName, eventDate } = body;
    
    // Teste 1: Apenas JSON
    console.log('✅ Teste 1: JSON funcionando');
    
    // Teste 2: Buffer simples
    const simpleText = `Certificado para: ${userName}\nEvento: ${eventName}\nData: ${eventDate}`;
    const textBuffer = Buffer.from(simpleText, 'utf-8');
    console.log('✅ Teste 2: Buffer criado com', textBuffer.length, 'bytes');
    
    // Teste 3: Response simples
    return new NextResponse(textBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': textBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('💀 ERRO no Debug:', error);
    console.error('📊 Stack:', (error as Error).stack);
    
    return NextResponse.json({
      error: 'Debug falhou',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
