import { configureStore } from '@reduxjs/toolkit';
import { api } from './api.ts';

/** A new store per browser session (never a module-level singleton, so nothing is shared between server requests). */
export function makeStore() {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
