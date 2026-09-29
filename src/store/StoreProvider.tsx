'use client';

import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from './index';

/** Gives every screen access to the Redux store. The store is created once per browser session. */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = makeStore();
  return <Provider store={storeRef.current}>{children}</Provider>;
}
