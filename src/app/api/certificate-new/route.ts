import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary } from '@/lib/upload';
import { updateRegistration } from '@/lib/firestore';
import { rateLimit, getUserIdentifier, RATE_LIMIT_CONFIGS, createRateLimitHeaders } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/validators';
import { logError, logInfo, logAudit, AuditAction } from '@/lib/logger';

// 🚀 API PRINCIPAL NOVA - OTIMIZADA PARA VERCEL
export const runtime = 'nodejs';
export const maxDuration = 45;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const userId: string = '';
  
  try {
    const body = await request.json();
    
    // Dois modos: gerar HTML ou receber PNG do cliente
    const { mode = 'generate-html' } = body;
    
    if (mode === 'generate-html') {
      return await generateCertificateHTML(request, body);
    } else if (mode === 'upload-png') {
      return await uploadCertificatePNG(request, body);
    } else {
      return NextResponse.json({ error: 'Modo inválido' }, { status: 400 });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Erro na nova API de certificado', error as Error, {
      userId,
      duration
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Interface para os dados de certificado
interface CertificateRequestData {
  registrationId: string;
  eventId: string;
  userId: string;
  userName: string;
  eventName: string;
  eventDate: string;
  eventStartTime?: string;
  eventEndTime?: string;
}

// 🎨 MODO 1: Gerar HTML para o cliente
async function generateCertificateHTML(request: NextRequest, body: Record<string, unknown>) {
  // Cast para o tipo adequado (com cast duplo para evitar erros de type-check)
  const data = body as unknown as CertificateRequestData;
  const { registrationId, eventId, userId: bodyUserId, userName, eventName, eventDate, eventStartTime, eventEndTime } = data;
  
  // Validação básica
  if (!registrationId || !eventId || !bodyUserId || !userName || !eventName || !eventDate) {
    return NextResponse.json({ error: 'Dados obrigatórios não fornecidos' }, { status: 400 });
  }

  // Rate limiting
  const identifier = getUserIdentifier(bodyUserId, request);
  const rateLimitResult = rateLimit(identifier, RATE_LIMIT_CONFIGS.CERTIFICATE);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Muitas tentativas de geração de certificado. Tente novamente em alguns minutos.' },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  logInfo('Gerando HTML de certificado', { registrationId, eventId, userId: bodyUserId });

  try {
    // Chamar API HTML limpa
    const htmlResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/certificate-html-clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: sanitizeInput(userName),
        eventName: sanitizeInput(eventName),
        eventDate,
        eventStartTime,
        eventEndTime,
        eventId
      })
    });

    if (!htmlResponse.ok) {
      throw new Error(`HTML generation failed: ${htmlResponse.status}`);
    }

    const htmlData = await htmlResponse.json();
    
    if (!htmlData.success) {
      throw new Error(htmlData.details || 'HTML generation failed');
    }

    // Retornar HTML + metadados para o cliente
    return NextResponse.json({
      success: true,
      mode: 'html-ready',
      html: htmlData.html,
      config: htmlData.config,
      certificateData: {
        registrationId,
        eventId,
        userId: bodyUserId,
        userName: sanitizeInput(userName),
        eventName: sanitizeInput(eventName),
        eventDate,
        eventStartTime,
        eventEndTime
      }
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    });

  } catch (error) {
    logError('Erro na geração HTML', error as Error, { eventId, userId: bodyUserId });
    return NextResponse.json({ error: 'Falha na geração do HTML' }, { status: 500 });
  }
}

// Interface para dados de upload de PNG
interface PNGUploadData {
  imageDataURL: string;
  registrationId: string;
  eventId: string;
  userId: string;
}

// 📤 MODO 2: Receber PNG do cliente e finalizar processo
async function uploadCertificatePNG(request: NextRequest, body: Record<string, unknown>) {
  // Cast para o tipo adequado (com cast duplo para evitar erros de type-check)
  const data = body as unknown as PNGUploadData;
  const { 
    imageDataURL, 
    registrationId, 
    eventId, 
    userId
  } = data;

  if (!imageDataURL || !registrationId || !eventId || !userId) {
    return NextResponse.json({ error: 'Dados de upload incompletos' }, { status: 400 });
  }

  logInfo('Processando upload de PNG do certificado', { registrationId, eventId, userId });

  try {
    // Converter data URL para buffer
    const base64Data = imageDataURL.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log('📊 PNG recebido:', imageBuffer.length, 'bytes');

    // Upload para Cloudinary
    const cacheBreaker = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `certificate_${userId}_${eventId}_${cacheBreaker}`;
    
    const uploadResult = await uploadImageToCloudinary(imageBuffer, fileName);
    
    logInfo('Certificado PNG enviado para Cloudinary', { 
      userId, 
      eventId, 
      publicId: uploadResult.publicId,
      imageSize: imageBuffer.length
    });

    // Atualizar registro no Firestore
    await updateRegistration(registrationId, {
      certificateGenerated: true,
      certificateUrl: uploadResult.secureUrl,
    });

    // Log de auditoria
    logAudit(AuditAction.CERTIFICATE_GENERATE, userId, true, {
      eventId,
      registrationId,
      certificateUrl: uploadResult.secureUrl,
      generationType: 'client-side-png'
    });

    logInfo('Certificado processado com sucesso', {
      userId,
      eventId,
      registrationId,
      certificateUrl: uploadResult.secureUrl
    });

    return NextResponse.json({
      success: true,
      certificateUrl: uploadResult.secureUrl,
      certificateType: 'png',
      message: 'Certificado gerado com sucesso!',
    });

  } catch (error) {
    logError('Erro no upload do PNG', error as Error, { eventId, userId });
    
    // Log de auditoria para falha
    logAudit(AuditAction.CERTIFICATE_GENERATE, userId, false, {
      error: (error as Error).message
    });

    return NextResponse.json({ error: 'Erro no processamento do certificado' }, { status: 500 });
  }
}
