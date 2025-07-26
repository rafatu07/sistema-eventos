import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/pdf-generator';
import { uploadPDFToCloudinary } from '@/lib/upload';
import { updateRegistration, createCertificate } from '@/lib/firestore';

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

    // Upload to Cloudinary
    const fileName = `certificate_${registrationId}_${Date.now()}`;
    const uploadResult = await uploadPDFToCloudinary(
      Buffer.from(pdfBytes),
      fileName,
      'certificates'
    );

    // Update registration with certificate info
    await updateRegistration(registrationId, {
      certificateGenerated: true,
      certificateUrl: uploadResult.secureUrl,
    });

    // Create certificate record
    await createCertificate({
      registrationId,
      eventId,
      userId,
      userName,
      eventName,
      eventDate: new Date(eventDate),
      cloudinaryUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    });

    return NextResponse.json({
      success: true,
      certificateUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

