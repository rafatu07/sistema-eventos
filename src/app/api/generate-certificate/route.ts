import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { uploadPDFToCloudinary } from '@/lib/upload';
import { updateRegistration } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationId, eventId, userId, userName, eventName, eventDate } = body;

    if (!registrationId || !eventId || !userId || !userName || !eventName || !eventDate) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBytes = await generateCertificatePDF({
      userName,
      eventName,
      eventDate: new Date(eventDate),
    });

    // Convert Uint8Array to Buffer for upload
    const pdfBuffer = Buffer.from(pdfBytes);

    // Upload PDF to Cloudinary
    const certificateUrl = await uploadPDFToCloudinary(pdfBuffer, `certificate_${userId}_${eventId}`);

    // Update registration to mark certificate as generated
    await updateRegistration(registrationId, {
      certificateGenerated: true,
    });

    return NextResponse.json({
      success: true,
      certificateUrl,
      message: 'Certificado gerado com sucesso!',
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

