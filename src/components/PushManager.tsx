'use client';

import { useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export default function PushManager() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function enableNotifications() {
    if (!isPushSupported()) {
      setStatus('Push notifications are not supported in this browser.');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('Notification permission denied.');
        setLoading(false);
        return;
      }

      // Register the service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe the user to push notifications
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setStatus('VAPID public key is not configured.');
        setLoading(false);
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send a test welcome notification via the API
      const payload = {
        title: 'Welcome to White Red Hub!',
        body: 'You have successfully enabled push notifications.',
        icon: '/icon-192x192-WR.png',
        url: '/',
      };

      const response = await fetch('/api/web-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, payload }),
      });

      if (response.ok) {
        setStatus('Notifications enabled! Check for your welcome notification.');
      } else {
        const data = await response.json();
        setStatus(`Failed to send test notification: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={enableNotifications}
        disabled={loading}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Enabling...' : 'Enable Notifications'}
      </button>
      {status && (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
    </div>
  );
}
