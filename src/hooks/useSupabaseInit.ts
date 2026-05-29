/**
 * useSupabaseInit — Bootstrap hook for Supabase session + data loading.
 *
 * Call once inside <App /> (or a top-level layout). It:
 *  1. Listens for Supabase auth state changes (handles tab-focus token refresh,
 *     magic-link sign-in, OAuth callbacks, etc.)
 *  2. On SIGNED_IN: fetches the user's profile + all relevant Supabase data
 *     and populates the Zustand store.
 *  3. On SIGNED_OUT: clears currentUser.
 *  4. When Supabase is NOT configured (env vars missing / placeholder), it
 *     immediately marks the app as ready so mock auth continues to work.
 */

import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../lib/dataService';
import { useAppStore } from '../store/useAppStore';

export function useSupabaseInit(): void {
  useEffect(() => {
    // ── Mock mode — no async init needed ─────────────────────────────────────
    if (!isSupabaseConfigured) {
      useAppStore.setState({ supabaseReady: true });
      return;
    }

    // ── Real Supabase mode ────────────────────────────────────────────────────
    // onAuthStateChange fires immediately with the current session state,
    // so we don't need a separate getSession() call on mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          try {
            // Fetch the profile row (gives us role, storeId, etc.)
            const user = await authService.getSession();
            if (user) {
              const { setCurrentUser, loadFromSupabase } = useAppStore.getState();
              setCurrentUser(user);
              await loadFromSupabase(user.id, user.role, user.storeId ?? null);
            } else {
              useAppStore.setState({ supabaseReady: true });
            }
          } catch (err) {
            console.error('[useSupabaseInit] Failed to restore session:', err);
            useAppStore.setState({ supabaseReady: true });
          }
        } else if (event === 'SIGNED_OUT') {
          useAppStore.getState().setCurrentUser(null);
          useAppStore.setState({ supabaseReady: true });
        } else if (event === 'INITIAL_SESSION' && !session) {
          // No existing session — app is ready for guest / login
          useAppStore.setState({ supabaseReady: true });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
