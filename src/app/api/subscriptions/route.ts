import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Path to store subscriptions (in the project root)
const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'subscriptions.json');

// Type for push subscription
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface StoredSubscription {
  subscription: PushSubscription;
  createdAt: string;
  userAgent?: string;
}

// Helper function to read subscriptions from file
async function readSubscriptions(): Promise<StoredSubscription[]> {
  try {
    const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

// Helper function to write subscriptions to file
async function writeSubscriptions(subscriptions: StoredSubscription[]): Promise<void> {
  await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
}

// POST - Save a new subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // Read existing subscriptions
    const subscriptions = await readSubscriptions();

    // Check if this subscription already exists (by endpoint)
    const existingIndex = subscriptions.findIndex(
      (sub) => sub.subscription.endpoint === subscription.endpoint
    );

    const newSubscription: StoredSubscription = {
      subscription,
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || undefined,
    };

    if (existingIndex >= 0) {
      // Update existing subscription
      subscriptions[existingIndex] = newSubscription;
      console.log('[Subscriptions API] Updated existing subscription');
    } else {
      // Add new subscription
      subscriptions.push(newSubscription);
      console.log('[Subscriptions API] Added new subscription');
    }

    // Save to file
    await writeSubscriptions(subscriptions);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Subscription saved successfully',
        total: subscriptions.length 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Subscriptions API] Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

// GET - Retrieve all subscriptions
export async function GET() {
  try {
    const subscriptions = await readSubscriptions();
    
    return NextResponse.json(
      { 
        success: true,
        subscriptions,
        total: subscriptions.length 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Subscriptions API] Error reading subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to read subscriptions' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a subscription by endpoint
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Read existing subscriptions
    const subscriptions = await readSubscriptions();

    // Filter out the subscription with matching endpoint
    const filteredSubscriptions = subscriptions.filter(
      (sub) => sub.subscription.endpoint !== endpoint
    );

    if (filteredSubscriptions.length === subscriptions.length) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Save updated list
    await writeSubscriptions(filteredSubscriptions);

    console.log('[Subscriptions API] Deleted subscription');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Subscription deleted successfully',
        total: filteredSubscriptions.length 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Subscriptions API] Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
