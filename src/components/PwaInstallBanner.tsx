import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | null;

const DISMISSED_KEY = 'pwa-install-dismissed';

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return null;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed this session
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const detectedPlatform = getPlatform();
    if (!detectedPlatform) return;
    setPlatform(detectedPlatform);

    if (detectedPlatform === 'ios') {
      // iOS: no beforeinstallprompt, show instructions right away
      setVisible(true);
      return;
    }

    // Android/Chrome: listen for the install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  }, []);

  if (!visible) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 mt-1">
      <div className="relative flex items-center justify-center gap-2 bg-white bg-opacity-80 rounded-xl border border-amber-300 shadow px-3 py-1.5">
        <button
          onClick={handleDismiss}
          className="absolute top-1 right-2 text-amber-400 hover:text-amber-600 text-sm leading-none font-bold"
          aria-label="Dismiss"
        >
          &times;
        </button>

        <span className="text-xs font-semibold text-amber-800">Add to home screen</span>

        {platform === 'ios' ? (
          <span className="text-amber-600 text-xs">
            Tap{' '}
            <svg className="inline w-3.5 h-3.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7-7 7 7" />
              <rect x="4" y="18" width="16" height="2" rx="1" />
            </svg>
            {' '}→ <strong>Add to Home Screen</strong>
          </span>
        ) : (
          <button
            onClick={handleInstall}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-0.5 rounded-full border border-amber-600 transition-colors"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
