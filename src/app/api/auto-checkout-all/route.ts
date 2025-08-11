import { NextRequest, NextResponse } from 'next/server';
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

    return NextResponse.json({
      success: true,
      message: `Auto checkout completed for ${endedEvents.length} events`,
      processedEvents,
      totalCheckedOut,
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