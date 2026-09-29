'use client';

import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const META_SELECTORS = {
  description: 'meta[name="description"]',
  ogTitle: 'meta[property="og:title"]',
  ogDescription: 'meta[property="og:description"]',
};

function setMeta(selector: string, content: string) {
  document.querySelector(selector)?.setAttribute('content', content);
}

/** Keeps <html lang>, the tab title and the meta descriptions in step with the chosen language. */
export function DocumentLocale() {
  const { language, t } = useLanguage();
  const title = t.common.metaTitle;
  const description = t.common.metaDescription;

  useEffect(() => {
    document.documentElement.lang = language;
    setMeta(META_SELECTORS.description, description);
    setMeta(META_SELECTORS.ogTitle, title);
    setMeta(META_SELECTORS.ogDescription, description);

    // Next re-applies its server-rendered <title> after hydration and on navigation,
    // so keep re-asserting the chosen language's title.
    const applyTitle = () => {
      if (document.title !== title) document.title = title;
    };
    applyTitle();
    const observer = new MutationObserver(applyTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language, title, description]);

  return null;
}
