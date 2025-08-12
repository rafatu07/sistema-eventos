import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { generateCertificateImage } from '@/lib/certificate-image-generator';
import { uploadPDFToCloudinary, uploadImageToCloudinary } from '@/lib/upload';
import { getCertificateConfig } from '@/lib/certificate-config';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 DEBUG: Testing certificate generation...');
    
    // Aceitar eventId opcional do body
    const body = await request.json().catch(() => ({}));
    const eventIdFromBody = body.eventId || 'OOCTF7tEKs5D2i9CjUMG'; // Usar o eventId padrão se não fornecido
    
    console.log('🔍 Event ID recebido:', eventIdFromBody);
    
    // Buscar configuração real se eventId fornecido
    let realConfig = null;
    if (eventIdFromBody) {
      console.log('🔍 Buscando configuração real para evento:', eventIdFromBody);
      realConfig = await getCertificateConfig(eventIdFromBody);
      
      if (realConfig) {
        console.log('✅ Configuração real encontrada:', {
          template: realConfig.template,
          hasLogo: !!realConfig.logoUrl,
          logoUrl: realConfig.logoUrl ? realConfig.logoUrl.substring(0, 50) + '...' : 'none',
          includeQRCode: realConfig.includeQRCode
        });
      } else {
        console.log('⚠️  Nenhuma configuração encontrada para o evento');
      }
    }
    
    // Dados de teste
    const testData = {
      userName: 'João Silva (TESTE)',
      eventName: 'Evento de Teste (DEBUG)',
      eventDate: new Date(),
      eventStartTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hora a partir de agora
      eventEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas a partir de agora
      eventId: eventIdFromBody || 'test-event',
      config: realConfig || {
        id: 'test',
        eventId: eventIdFromBody || 'test-event', 
        template: 'elegant' as const,
        orientation: 'landscape' as const,
        primaryColor: '#7c3aed',
        secondaryColor: '#6b7280',
        backgroundColor: '#ffffff',
        borderColor: '#c4b5fd',
        titleFontSize: 24,
        nameFontSize: 18,
        bodyFontSize: 12,
        fontFamily: 'times' as const,
        title: 'Certificado de Excelência',
        subtitle: 'Reconhecimento de Participação',
        bodyText: 'Por meio deste, certificamos que {userName} participou com distinção do evento {eventName}, demonstrando dedicação e comprometimento, realizado em {eventDate} das {eventTime}.',
        footer: 'Organização Certificada',
        titlePosition: { x: 50, y: 22 },
        namePosition: { x: 50, y: 42 },
        bodyPosition: { x: 50, y: 62 },
        logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample',
        logoSize: 75,
        logoPosition: { x: 12, y: 18 },
        showBorder: true,
        borderWidth: 2,
        showWatermark: false,
        watermarkText: 'ELEGANTE',
        watermarkOpacity: 0.08,
        includeQRCode: true,
        qrCodeText: `https://sistema-eventos.vercel.app/validate/${eventIdFromBody || 'test-event'}/joao-silva`,
        qrCodePosition: { x: 88, y: 18 },
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    };

    let certificateUrl: string;
    let certificateType: 'image' | 'pdf' = 'image';
    let fileSize = 0;
    
    try {
      // Tentar gerar como imagem primeiro
      console.log('🔧 DEBUG: Generating test certificate as PNG image...');
      const imageBuffer = await generateCertificateImage(testData);
      console.log('✅ DEBUG: Image generated, size:', imageBuffer.length);
      
      fileSize = imageBuffer.length;
      
      // Upload imagem para Cloudinary
      console.log('🔧 DEBUG: Uploading image to Cloudinary...');
      const uploadResult = await uploadImageToCloudinary(
        imageBuffer, 
        `test_certificate_img_${Date.now()}`,
        'test-certificates'
      );
      
      certificateUrl = uploadResult.secureUrl;
      console.log('✅ DEBUG: Image upload successful!');
      
    } catch (imageError) {
      console.warn('⚠️ DEBUG: Image generation failed, trying PDF fallback:', imageError);
      
      // Fallback para PDF
      console.log('🔧 DEBUG: Generating test PDF as fallback...');
      const pdfBytes = await generateCertificatePDF(testData);
      console.log('✅ DEBUG: PDF generated, size:', pdfBytes.length);

      if (pdfBytes.length === 0) {
        throw new Error('Both image and PDF generation failed');
      }

      fileSize = pdfBytes.length;
      certificateType = 'pdf';

      // Converter para Buffer
      const pdfBuffer = Buffer.from(pdfBytes);
      console.log('🔧 DEBUG: Converted to buffer, size:', pdfBuffer.length);

      // Upload para Cloudinary
      console.log('🔧 DEBUG: Uploading PDF to Cloudinary...');
      const uploadResult = await uploadPDFToCloudinary(
        pdfBuffer, 
        `test_certificate_pdf_${Date.now()}`,
        'test-certificates'
      );
      
      certificateUrl = uploadResult.secureUrl;
      console.log('✅ DEBUG: PDF upload successful!');
    }
    
    console.log('📋 DEBUG: Final result:', {
      type: certificateType,
      url: certificateUrl.substring(0, 100) + '...',
      urlLength: certificateUrl.length
    });

    return NextResponse.json({
      success: true,
      message: `Certificado de teste gerado com sucesso como ${certificateType === 'image' ? 'imagem PNG' : 'PDF'}!`,
      certificateUrl: certificateUrl,
      certificateType: certificateType,
      publicId: `test_certificate_${certificateType}_${Date.now()}`,
      [certificateType === 'image' ? 'imageSize' : 'pdfSize']: fileSize,
      debug: {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
        timestamp: new Date().toISOString(),
        generationType: certificateType
      }
    });

  } catch (error) {
    console.error('❌ DEBUG: Error in certificate generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro no teste de certificado',
        details: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}
