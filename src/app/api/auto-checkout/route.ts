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

    return NextResponse.json({
      success: true,
      message: `Auto checkout completed for ${checkedOutCount} participants`,
      checkedOutCount,
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