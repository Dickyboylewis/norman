'use client';
import { useState, useEffect } from 'react';

interface StoredSubscription {
  id: string;
  subscription: {
    endpoint: string;
    keys: {
      auth: string;
      p256dh: string;
    };
  };
  createdAt?: string;
}

function getDeviceType(endpoint: string): { label: string; emoji: string } {
  if (endpoint.includes('apple') || endpoint.includes('web.push.apple.com')) {
    return { label: 'iPhone / Safari', emoji: '🍎' };
  }
  if (endpoint.includes('fcm.googleapis.com') || endpoint.includes('google')) {
    return { label: 'Chrome / Android', emoji: '🌐' };
  }
  if (endpoint.includes('wns') || endpoint.includes('microsoft') || endpoint.includes('windows')) {
    return { label: 'Edge / Windows', emoji: '🪟' };
  }
  if (endpoint.includes('mozilla') || endpoint.includes('push.services.mozilla.com')) {
    return { label: 'Firefox', emoji: '🦊' };
  }
  return { label: 'Unknown', emoji: '❓' };
}

export default function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<StoredSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function fetchSubscriptions() {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      if (data.subscriptions) {
        setSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      setMessage('❌ Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }

  async function deleteSubscription(id: string) {
    setDeleting(id);
    setMessage('');
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        setMessage('✅ Subscription removed');
      } else {
        setMessage('❌ Failed to delete subscription');
      }
    } catch {
      setMessage('❌ Failed to delete subscription');
    } finally {
      setDeleting(null);
    }
  }

  async function deleteAllSubscriptions() {
    if (!confirm('Delete ALL subscriptions? Everyone will need to re-enable notifications.')) return;
    setMessage('');
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setSubscriptions([]);
        setMessage('✅ All subscriptions cleared');
      } else {
        setMessage('❌ Failed to clear subscriptions');
      }
    } catch {
      setMessage('❌ Failed to clear subscriptions');
    }
  }

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading subscriptions...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Push Subscriptions ({subscriptions.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchSubscriptions}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            ↻ Refresh
          </button>
          {subscriptions.length > 0 && (
            <button
              onClick={deleteAllSubscriptions}
              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              🗑 Clear All
            </button>
          )}
        </div>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subscriptions found. Users need to click "Enable Notifications" first.</p>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub, index) => {
            const device = getDeviceType(sub.subscription.endpoint);
            const shortEndpoint = sub.subscription.endpoint.slice(0, 80) + '...';
            return (
              <div
                key={sub.id || index}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{device.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{device.label}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{shortEndpoint}</p>
                    {sub.createdAt && (
                      <p className="text-xs text-gray-400">Added: {new Date(sub.createdAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteSubscription(sub.id)}
                  disabled={deleting === sub.id}
                  className="flex-shrink-0 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {deleting === sub.id ? 'Removing...' : '✕ Remove'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
