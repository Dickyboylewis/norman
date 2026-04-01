'use client';
import { useState } from 'react';
export default function TestNotificationButton() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  async function sendTestNotification() {
    console.log('[TestNotification] Button clicked');
    setLoading(true);
    setStatus('🔄 Sending test notification...');
    try {
      const subsResponse = await fetch('/api/subscriptions');
      if (!subsResponse.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      const subsData = await subsResponse.json();
      console.log('[TestNotification] Found subscriptions:', subsData.total);
      if (!subsData.subscriptions || subsData.subscriptions.length === 0) {
        setStatus('❌ No subscriptions found. Please enable notifications first.');
        setLoading(false);
        return;
      }
      const payload = {
        title: 'New Lead Alert',
        body: 'Joe Bloggs just signed up!',
        icon: '/icon-192x192-WR.png',
        url: '/',
      };
      let successCount = 0;
      let failCount = 0;
      for (const sub of subsData.subscriptions) {
        try {
          console.log('[TestNotification] Sending to endpoint:', sub.subscription.endpoint.slice(0, 60) + '...');
          const response = await fetch('/api/web-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.subscription, payload }),
          });
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      setStatus(`✅ Sent to ${successCount} device${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`);
    } catch (error) {
      console.error('[TestNotification] Error:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={sendTestNotification}
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending...' : '🧪 Send Test Notification'}
      </button>
      {status && (
        <p className="text-sm text-muted-foreground max-w-md">{status}</p>
      )}
    </div>
  );
}
