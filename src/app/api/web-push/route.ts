import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, payload } = body;

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription object is required' },
        { status: 400 }
      );
    }

    if (!payload) {
      return NextResponse.json(
        { error: 'Payload is required' },
        { status: 400 }
      );
    }

    // Ensure payload is properly formatted as JSON string
    const notificationPayload = JSON.stringify({
      title: payload.title || 'White Red Hub',
      body: payload.body || 'You have a new notification',
      icon: payload.icon || '/icon-192x192-WR.png',
      badge: payload.badge || '/icon-192x192-WR.png',
      url: payload.url || '/',
      tag: payload.tag || 'default-notification',
      requireInteraction: payload.requireInteraction || false,
    });

    console.log('[Web Push API] Sending notification with payload:', notificationPayload);
    
    await webpush.sendNotification(subscription, notificationPayload);

    console.log('[Web Push API] Notification sent successfully');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification' },
      { status: 500 }
    );
  }
}
