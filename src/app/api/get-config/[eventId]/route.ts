import { NextRequest, NextResponse } from 'next/server';
import { getCertificateConfig } from '@/lib/certificate-config';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🧪 GET-CONFIG: Carregando configuração para eventId:', eventId);

    const config = await getCertificateConfig(eventId);
    
    return NextResponse.json({
      success: !!config,
      eventId,
      config,
      timestamp: new Date().toISOString(),
      found: !!config
    });

  } catch (error) {
    console.error('❌ GET-CONFIG: Erro:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
