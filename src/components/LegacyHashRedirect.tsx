'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { localizedPath, resolveLegacyRedirect } from '../utils/routes';

/** Sends old `/#admin`-style URLs to their real routes. */
export function LegacyHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();

  useEffect(() => {
    const redirect = () => {
      const target = resolveLegacyRedirect(pathname, window.location.hash);
      if (target) router.replace(localizedPath(language, target));
    };
    redirect();
    window.addEventListener('hashchange', redirect);
    return () => window.removeEventListener('hashchange', redirect);
  }, [pathname, router, language]);

  return null;
}
