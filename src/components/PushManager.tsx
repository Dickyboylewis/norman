'use client';

import { useState, useEffect } from 'react';

// Convert VAPID public key from base64 to Uint8Array
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

// Check if push notifications are supported
function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Check if app is running as a PWA (standalone mode)
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if running in standalone mode (iOS/Android)
  const isStandaloneiOS = (window.navigator as any).standalone === true;
  const isStandaloneAndroid = window.matchMedia('(display-mode: standalone)').matches;
  
  return isStandaloneiOS || isStandaloneAndroid;
}

// Detect if user is on iOS
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export default function PushManager() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  // Check current permission state on mount
  useEffect(() => {
    if (isPushSupported()) {
      setPermissionState(Notification.permission);
    }
  }, []);

  async function enableNotifications() {
    console.log('[PushManager] Enable notifications clicked');
    
    // Check if push is supported
    if (!isPushSupported()) {
      setStatus('❌ Push notifications are not supported in this browser.');
      return;
    }

    // iOS-specific check: Must be running as PWA
    if (isIOS() && !isStandalone()) {
      setStatus('📱 On iOS, please "Add to Home Screen" first, then open the app from your home screen to enable notifications.');
      return;
    }

    setLoading(true);
    setStatus('🔄 Requesting permission...');

    try {
      // Request notification permission
      console.log('[PushManager] Requesting notification permission');
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission !== 'granted') {
        setStatus('❌ Notification permission denied. Please enable notifications in your browser settings.');
        setLoading(false);
        return;
      }

      setStatus('🔄 Registering service worker...');
      
      // Register the service worker
      console.log('[PushManager] Registering service worker');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      console.log('[PushManager] Service worker registered:', registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[PushManager] Service worker ready');

      setStatus('🔄 Subscribing to push notifications...');

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setStatus('❌ VAPID public key is not configured. Please check your .env.local file.');
        setLoading(false);
        return;
      }

      // Subscribe to push notifications
      console.log('[PushManager] Subscribing to push manager');
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log('[PushManager] Push subscription created:', subscription);

      setStatus('🔄 Saving subscription...');

      // Save subscription to server
      const saveResponse = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save subscription to server');
      }

      console.log('[PushManager] Subscription saved to server');

      setStatus('🔄 Sending test notification...');

      // Send a test welcome notification
      const payload = {
        title: 'White Red Hub',
        body: 'Notifications are now active!',
        icon: '/icon-192x192-WR.png',
        url: '/',
      };

      const response = await fetch('/api/web-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, payload }),
      });

      if (response.ok) {
        setStatus('✅ Notifications enabled! Check for your welcome notification.');
        console.log('[PushManager] Test notification sent successfully');
      } else {
        const data = await response.json();
        setStatus(`⚠️ Subscription saved, but test notification failed: ${data.error || 'Unknown error'}`);
        console.error('[PushManager] Test notification failed:', data);
      }
    } catch (error) {
      console.error('[PushManager] Error enabling notifications:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  }

  // Show different UI based on permission state
  const getButtonText = () => {
    if (loading) return 'Enabling...';
    if (permissionState === 'granted') return '🔔 Notifications Enabled';
    if (permissionState === 'denied') return '🔕 Permission Denied';
    return '🔔 Enable Notifications';
  };

  const isButtonDisabled = loading || permissionState === 'denied';

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={enableNotifications}
        disabled={isButtonDisabled}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {getButtonText()}
      </button>
      
      {status && (
        <p className="text-sm text-muted-foreground max-w-md">{status}</p>
      )}
      
      {/* iOS-specific help text */}
      {isIOS() && !isStandalone() && (
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 p-3 rounded-md max-w-md">
          <strong>📱 iOS Users:</strong> To enable notifications, tap the Share button in Safari and select "Add to Home Screen". Then open the app from your home screen.
        </div>
      )}
      
      {/* Permission denied help text */}
      {permissionState === 'denied' && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-3 rounded-md max-w-md">
          <strong>🔕 Permission Denied:</strong> You've blocked notifications. To enable them, go to your browser settings and allow notifications for this site.
        </div>
      )}
    </div>
  );
}
