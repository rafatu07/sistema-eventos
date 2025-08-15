import { NextRequest, NextResponse } from 'next/server';
import { autoCheckoutEventParticipants, getEvent } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Verify that the event exists and has ended
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    if (now < event.endTime) {
      return NextResponse.json(
        { error: 'Event has not ended yet' },
        { status: 400 }
      );
    }

    // Perform auto checkout
    const checkedOutCount = await autoCheckoutEventParticipants(eventId);

    // ✅ NOVO: Processar certificados e emails automaticamente
    let certificatesGenerated = 0;
    let emailsSent = 0;
    
    if (checkedOutCount > 0) {
      try {
        // Chamar processamento completo para este evento específico
        const processResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auto-process-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (processResponse.ok) {
          const processData = await processResponse.json();
          certificatesGenerated = processData.totalCertificatesGenerated || 0;
          emailsSent = processData.totalEmailsSent || 0;
        }
      } catch (processError) {
        console.warn('Erro no processamento automático pós-checkout:', processError);
        // Não falhar a operação principal por causa disso
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto checkout completed for ${checkedOutCount} participants. ${certificatesGenerated} certificates generated, ${emailsSent} emails sent.`,
      checkedOutCount,
      certificatesGenerated,
      emailsSent,
      eventId,
    });

  } catch (error) {
    console.error('Error in auto checkout API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 