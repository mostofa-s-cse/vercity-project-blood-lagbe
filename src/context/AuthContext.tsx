'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabase } from '../lib/supabase/client';
import { ADMIN_AREA_PERMISSIONS, type Permission } from '../lib/permissions';
import { can as claimsCan, canManageHospital as claimsCanManageHospital } from '../lib/roles';
import { announceDonorProfileChange, browserStorage, clearMyDonorProfiles } from '../lib/myDonorProfile';
import { normalizePhoneForAuth } from '../lib/phoneAuth';
import { profileFromMetadata, type SignupProfileInput } from '../lib/signupProfile';
import type { BloodGroupValue } from '../lib/validation';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** From sign-up (see src/lib/signupProfile.ts); null when the person signed up before these were asked. */
  phone: string | null;
  bloodGroup: BloodGroupValue | null;
  age: number | null;
  area: string | null;
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
  /**
   * No confirmation-link wait (see src/lib/emailAuth.ts): creates the account server-side already
   * confirmed, then signs in immediately with the same password. `error` is a short error code, or null.
   */
  signUpWithEmail: (email: string, password: string, profile: SignupProfileInput) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string, password: string) => Promise<{ error: string | null }>;
  /**
   * No SMS, no OTP (see src/lib/phoneAuth.ts): creates the account server-side already phone-confirmed,
   * then signs in with the same password. Never has a "check your phone" step, unlike email sign-up.
   */
  signUpWithPhone: (phone: string, password: string, name?: string) => Promise<{ error: string | null }>;
  /** Always resolves the same way whether or not the email has an account (Supabase's own anti-enumeration behaviour). */
  requestPasswordReset: (email: string, next?: string) => Promise<{ error: string | null }>;
  /** Only works while the browser holds the short-lived recovery session the reset-password link's callback created. */
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const asText = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const stored = profileFromMetadata(meta);
  return {
    id: user.id,
    email: user.email ?? null,
    name: stored.name,
    avatarUrl: asText(meta.avatar_url) ?? asText(meta.picture),
    phone: stored.phone ?? asText(user.phone),
    bloodGroup: stored.bloodGroup,
    age: stored.age,
    area: stored.area,
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
    // A donor registered on this browser stays reachable through the account (or its manage token); drop
    // the local copy so the next person here does not see someone else's "My profile".
    clearMyDonorProfiles(browserStorage());
    announceDonorProfileChange();
    setUser(null);
  }, [supabase]);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, profile: SignupProfileInput) => {
      if (!supabase) return { error: 'not_configured' };
      const response = await fetch('/api/auth/signup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, profile }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const error = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : 'sign_up_failed';
        const field = body && typeof body === 'object' && 'field' in body ? String((body as { field: unknown }).field) : null;
        return { error: error === 'invalid_input' && field ? `invalid_${field}` : error };
      }
      // The sign-in request has been seen to hang after the account was created (the session still lands).
      // Do not leave the form spinning: after a few seconds, trust a session that exists.
      const signedIn = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (signedIn === null) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return { error: 'sign_in_failed' };
        setUser(toAuthUser(data.session.user));
        return { error: null };
      }
      if (signedIn.error) return { error: signedIn.error.code ?? 'sign_in_failed' };
      setUser(toAuthUser(signedIn.data.user));
      return { error: null };
    },
    [supabase]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: 'not_configured' };
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.code ?? 'sign_in_failed' };
      setUser(toAuthUser(data.user));
      return { error: null };
    },
    [supabase]
  );

  const signUpWithPhone = useCallback(
    async (phone: string, password: string, name?: string) => {
      if (!supabase) return { error: 'not_configured' };
      const response = await fetch('/api/auth/signup-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, name }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const error = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : 'sign_up_failed';
        return { error };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ phone: normalizePhoneForAuth(phone), password });
      if (error) return { error: error.code ?? 'sign_in_failed' };
      setUser(toAuthUser(data.user));
      return { error: null };
    },
    [supabase]
  );

  const signInWithPhone = useCallback(
    async (phone: string, password: string) => {
      if (!supabase) return { error: 'not_configured' };
      const { data, error } = await supabase.auth.signInWithPassword({ phone: normalizePhoneForAuth(phone), password });
      if (error) return { error: error.code ?? 'sign_in_failed' };
      setUser(toAuthUser(data.user));
      return { error: null };
    },
    [supabase]
  );

  const requestPasswordReset = useCallback(
    async (email: string, next?: string) => {
      if (!supabase) return { error: 'not_configured' };
      const target = encodeURIComponent(next ?? '/reset-password');
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${target}`,
      });
      // Never surface whether the email has an account — same anti-enumeration behaviour Supabase itself applies.
      return { error: null };
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!supabase) return { error: 'not_configured' };
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.code ?? 'update_password_failed' };
      setUser(toAuthUser(data.user));
      return { error: null };
    },
    [supabase]
  );

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
      value={{
        configured,
        loading,
        user,
        can,
        canManageHospital: canManage,
        signInWithGoogle,
        signOut,
        signUpWithEmail,
        signInWithEmail,
        signInWithPhone,
        signUpWithPhone,
        requestPasswordReset,
        updatePassword,
      }}
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
