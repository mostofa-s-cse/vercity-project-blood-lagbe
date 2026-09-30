'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabase } from '../lib/supabase/client';
import { ADMIN_AREA_PERMISSIONS, type Permission } from '../lib/permissions';
import { can as claimsCan, canManageHospital as claimsCanManageHospital } from '../lib/roles';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** Supabase app_metadata: only the service key or SQL can change it, never the person. */
  appMetadata: Record<string, unknown>;
}

interface AuthContextType {
  /** False when the Supabase keys are not set: sign-in is unavailable and the app runs as a demo. */
  configured: boolean;
  /** True until the first session check finishes. */
  loading: boolean;
  user: AuthUser | null;
  /**
   * Whether this person has a permission. Only used to show or hide things: the proxy and the API check
   * again on the server. In demo mode (no Supabase) the hospital actions are open to everyone, because
   * nothing is saved, and the admin area is open only when `NEXT_PUBLIC_ADMIN_OPEN=true`.
   */
  can: (permission: Permission) => boolean;
  /**
   * Whether this person may change the stock of this hospital (`stock.all`: any; `stock.own`: their own).
   * Without Supabase (demo mode) everyone may, because nothing is saved.
   */
  canManageHospital: (hospitalId: string) => boolean;
  /** `next` is the same-site path to return to after signing in (default: the current page). */
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const asText = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    name: asText(meta.full_name) ?? asText(meta.name),
    avatarUrl: asText(meta.avatar_url) ?? asText(meta.picture),
    appMetadata: user.app_metadata ?? {},
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(toAuthUser(data.session?.user));
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(
    async (next?: string) => {
      if (!supabase) return;
      // Come back to the page the person was on; the callback route checks this path is on our own site.
      const target = encodeURIComponent(next ?? `${window.location.pathname}${window.location.search}`);
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${target}` },
      });
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const configured = supabase !== null;
  const adminOpen = process.env.NEXT_PUBLIC_ADMIN_OPEN === 'true';
  const claims = user ? { sub: user.id, app_metadata: user.appMetadata } : null;

  const can = (permission: Permission): boolean => {
    const inAdminArea = ADMIN_AREA_PERMISSIONS.includes(permission);
    if (adminOpen && inAdminArea) return true;
    if (!configured) return !inAdminArea;
    return claimsCan(claims, permission);
  };
  const canManage = (hospitalId: string) => !configured || claimsCanManageHospital(claims, hospitalId);

  return (
    <AuthContext.Provider
      value={{ configured, loading, user, can, canManageHospital: canManage, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
