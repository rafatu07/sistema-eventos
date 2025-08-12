import { NextRequest, NextResponse } from 'next/server';
import { updateCertificateConfig } from '@/lib/certificate-config';

export async function POST(request: NextRequest) {
  try {
    const { eventId, configData } = await request.json();
    
    if (!eventId || !configData) {
      return NextResponse.json(
        { error: 'eventId e configData são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('🧪 TEST-SAVE: Salvando configuração de teste...');
    console.log('📋 TEST-SAVE: eventId:', eventId);
    console.log('📋 TEST-SAVE: configData:', configData);

    await updateCertificateConfig(eventId, configData);
    
    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso!',
      eventId,
      configData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TEST-SAVE: Erro:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
