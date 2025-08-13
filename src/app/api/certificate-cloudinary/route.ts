import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { CertificateConfig } from '@/types';

// ⚡ SOLUÇÃO CLOUDINARY PARA VERCEL - SEM VERCEL.JSON
// Esta é a abordagem usando Cloudinary para serverless functions

export const runtime = 'nodejs';
export const maxDuration = 45; // 45s para Cloudinary
export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  console.log('☁️ INICIANDO geração via CLOUDINARY (100% compatível Vercel)');
  
  try {
    const body = await request.json();
    const { userName, eventName, eventDate, eventStartTime, eventEndTime, config } = body;

    console.log('📦 Dados recebidos:', {
      userName: userName?.substring(0, 20),
      eventName: eventName?.substring(0, 30),
      eventDate,
      configExists: !!config
    });

    // Formatar data
    const formattedDate = new Date(eventDate).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    // MÉTODO CLOUDINARY: Usar transformações de texto para gerar certificado
    const certificateUrl = buildCloudinaryCertificate({
      userName,
      eventName,
      eventDate: formattedDate,
      config
    });

    console.log('🌐 URL Cloudinary gerada:', certificateUrl.substring(0, 100) + '...');

    // Baixar a imagem do Cloudinary
    const response = await fetch(certificateUrl);
    
    if (!response.ok) {
      throw new Error(`Cloudinary falhou: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log('✅ Certificado baixado do Cloudinary:', imageBuffer.length, 'bytes');

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('💀 ERRO na API Cloudinary:', error);
    
    return NextResponse.json(
      { 
        error: 'Falha na geração via Cloudinary',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// 🎨 Construir URL de certificado usando Cloudinary Transformations SIMPLES
function buildCloudinaryCertificate(data: CertificateData): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    throw new Error('Cloudinary cloud name não configurado');
  }
  
  // VERSÃO SUPER SIMPLES - sem transformações complexas
  const transformations = [
    'w_1200,h_800',
    'c_pad',
    'b_white',
    // Título simples
    `l_text:Arial_48_bold:CERTIFICADO,co_rgb:2C3E50,g_north,y_100`,
    // Nome 
    `l_text:Arial_32_bold:${encodeURIComponent(data.userName)},co_rgb:34495E,g_center,y_-40`,
    // Evento
    `l_text:Arial_20_normal:participou do evento,co_rgb:7F8C8D,g_center,y_20`,
    `l_text:Arial_24_bold:${encodeURIComponent(data.eventName)},co_rgb:2980B9,g_center,y_60`,
    // Data
    `l_text:Arial_16_normal:${encodeURIComponent(data.eventDate)},co_rgb:7F8C8D,g_center,y_120`,
  ];

  // Usar imagem sample padrão do Cloudinary (sempre disponível)
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join('/')}/sample.jpg`;
}

// 🎯 Versão simplificada usando template pré-definido
function buildSimpleCloudinaryCertificate(data: CertificateData): string {
  // Usar um template simples mais confiável
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  // Criar certificado simples mas elegante
  const transformations = [
    // Dimensões
    'w_1200,h_800',
    
    // Fundo branco
    'b_white',
    'c_pad',
    
    // Título principal
    'l_text:Arial_48_bold:CERTIFICADO,co_rgb:2C3E50,g_north,y_80',
    
    // Nome do participante (destacado)
    `l_text:Arial_36_bold:${encodeURIComponent(data.userName)},co_rgb:34495E,g_center,y_-50`,
    
    // Texto de participação
    `l_text:Arial_18:Participou do evento,co_rgb:7F8C8D,g_center,y_20`,
    
    // Nome do evento
    `l_text:Arial_24_bold:${encodeURIComponent(data.eventName)},co_rgb:2980B9,g_center,y_60`,
    
    // Data
    `l_text:Arial_16:Realizado em ${data.eventDate},co_rgb:7F8C8D,g_center,y_120`,
    
    // Rodapé
    `l_text:Arial_12:Certificado digital válido,co_rgb:95A5A6,g_south,y_40`
  ];

  // Usar imagem de template ou criar do zero
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join('/')}/sample.jpg`;
}

interface CertificateData {
  userName: string;
  eventName: string;
  eventDate: string;
  config?: CertificateConfig;
}
