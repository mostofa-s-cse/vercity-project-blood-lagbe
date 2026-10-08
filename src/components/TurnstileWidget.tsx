'use client';

import React, { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  /** Called with the verified token, or `null` when it expires/errors (the form should re-require it). */
  onVerify: (token: string | null) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

/**
 * Cloudflare Turnstile's widget, rendered only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set (the owner's
 * own Cloudflare account, same "needs your own keys" boundary as Supabase/email/SMS). Without it, this
 * renders nothing and the form just submits with no token — matching the server skipping verification
 * (`src/lib/turnstile.ts`) when `TURNSTILE_SECRET_KEY` is unset too.
 */
export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onVerify }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onVerifyRef.current(token),
        'expired-callback': () => onVerifyRef.current(null),
        'error-callback': () => onVerifyRef.current(null),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', render, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', render, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="flex justify-center" />;
};
