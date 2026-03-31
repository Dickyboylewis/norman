'use client';

import { useState } from 'react';

export default function TestNotificationButton() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function sendTestNotification() {
    console.log('[TestNotification] Button clicked - starting test notification');
    setLoading(true);
    setStatus('🔄 Sending test notification...');

    try {
      // Get all subscriptions from the server
      console.log('[TestNotification] Fetching subscriptions from /api/subscriptions');
      const subsResponse = await fetch('/api/subscriptions');
      console.log('[TestNotification] Subscriptions response status:', subsResponse.status);
      
      if (!subsResponse.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const subsData = await subsResponse.json();
      console.log('[TestNotification] Subscriptions data:', subsData);
      
      if (!subsData.subscriptions || subsData.subscriptions.length === 0) {
        setStatus('❌ No subscriptions found. Please enable notifications first.');
        setLoading(false);
        return;
      }

      // Send notification to all subscriptions
      const payload = {
        title: 'New Lead Alert',
        body: 'Joe Bloggs just signed up!',
        icon: '/icon-192x192-WR.png',
        url: '/',
      };

      // Send to the first subscription (or you could loop through all)
      const subscription = subsData.subscriptions[0].subscription;
      console.log('[TestNotification] Sending to /api/web-push with subscription:', subscription);
      
      const response = await fetch('/api/web-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, payload }),
      });
      
      console.log('[TestNotification] Web-push response status:', response.status);

      if (response.ok) {
        setStatus('✅ Test notification sent! Check your device.');
        console.log('[TestNotification] Notification sent successfully');
      } else {
        const data = await response.json();
        setStatus(`❌ Failed to send notification: ${data.error || 'Unknown error'}`);
        console.error('[TestNotification] Failed:', data);
      }
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
