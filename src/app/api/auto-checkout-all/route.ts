import { NextResponse } from 'next/server';
import { getAllEvents, autoCheckoutEventParticipants } from '@/lib/firestore';

export async function POST() {
  try {
    // Get all events
    const events = await getAllEvents();
    const now = new Date();
    
    // Filter events that have ended
    const endedEvents = events.filter(event => now >= event.endTime);
    
    if (endedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events need auto checkout',
        processedEvents: 0,
        totalCheckedOut: 0,
      });
    }

    let totalCheckedOut = 0;
    const processedEvents = [];

    // Process each ended event
    for (const event of endedEvents) {
      try {
        const checkedOutCount = await autoCheckoutEventParticipants(event.id);
        
        if (checkedOutCount > 0) {
          processedEvents.push({
            eventId: event.id,
            eventName: event.name,
            endTime: event.endTime.toISOString(),
            checkedOutCount,
          });
          totalCheckedOut += checkedOutCount;
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        processedEvents.push({
          eventId: event.id,
          eventName: event.name,
          error: (error as Error).message,
        });
      }
    }

    // ✅ NOVO: Processar certificados e emails automaticamente após checkout
    let totalCertificatesGenerated = 0;
    let totalEmailsSent = 0;
    
    if (totalCheckedOut > 0) {
      try {
        // Chamar processamento completo automático
        const processResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auto-process-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (processResponse.ok) {
          const processData = await processResponse.json();
          totalCertificatesGenerated = processData.totalCertificatesGenerated || 0;
          totalEmailsSent = processData.totalEmailsSent || 0;
        }
      } catch (processError) {
        console.warn('Erro no processamento automático pós-checkout:', processError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto checkout completed for ${endedEvents.length} events. ${totalCheckedOut} participants checked out, ${totalCertificatesGenerated} certificates generated, ${totalEmailsSent} emails sent.`,
      processedEvents,
      totalCheckedOut,
      totalCertificatesGenerated,
      totalEmailsSent,
      eventsProcessed: endedEvents.length,
    });

  } catch (error) {
    console.error('Error in auto checkout all API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow GET requests for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Auto checkout service is running',
    timestamp: new Date().toISOString(),
  });
} 