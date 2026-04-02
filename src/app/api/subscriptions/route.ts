import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'subscriptions.json');

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface StoredSubscription {
  id: string;
  subscription: PushSubscription;
  createdAt: string;
  userAgent?: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function readSubscriptions(): Promise<StoredSubscription[]> {
  try {
    const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.map((sub: any) => ({
      ...sub,
      id: sub.id || generateId(),
    }));
  } catch (error) {
    return [];
  }
}

async function writeSubscriptions(subscriptions: StoredSubscription[]): Promise<void> {
  await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
}

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

    const subscriptions = await readSubscriptions();

    const existingIndex = subscriptions.findIndex(
      (sub) => sub.subscription.endpoint === subscription.endpoint
    );

    const newSubscription: StoredSubscription = {
      id: generateId(),
      subscription,
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || undefined,
    };

    if (existingIndex >= 0) {
      newSubscription.id = subscriptions[existingIndex].id;
      subscriptions[existingIndex] = newSubscription;
      console.log('[Subscriptions API] Updated existing subscription');
    } else {
      subscriptions.push(newSubscription);
      console.log('[Subscriptions API] Added new subscription');
    }

    await writeSubscriptions(subscriptions);

    return NextResponse.json(
      { success: true, message: 'Subscription saved successfully', total: subscriptions.length },
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

export async function GET() {
  try {
    const subscriptions = await readSubscriptions();

    return NextResponse.json(
      { success: true, subscriptions, total: subscriptions.length },
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, endpoint, all } = body;

    if (all === true) {
      await writeSubscriptions([]);
      console.log('[Subscriptions API] Deleted all subscriptions');
      return NextResponse.json(
        { success: true, message: 'All subscriptions deleted', total: 0 },
        { status: 200 }
      );
    }

    if (!id && !endpoint) {
      return NextResponse.json(
        { error: 'Either id or endpoint is required' },
        { status: 400 }
      );
    }

    const subscriptions = await readSubscriptions();

    const filteredSubscriptions = subscriptions.filter((sub) => {
      if (id) return sub.id !== id;
      if (endpoint) return sub.subscription.endpoint !== endpoint;
      return true;
    });

    if (filteredSubscriptions.length === subscriptions.length) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    await writeSubscriptions(filteredSubscriptions);
    console.log('[Subscriptions API] Deleted subscription');

    return NextResponse.json(
      { success: true, message: 'Subscription deleted', total: filteredSubscriptions.length },
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
