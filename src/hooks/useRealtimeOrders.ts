/**
 * useRealtimeOrders
 *
 * Subscribes to Supabase Postgres changes on the `orders` and
 * `service_orders` tables.  When any INSERT or UPDATE arrives the hook
 * re-fetches the full list for the current user's role and patches
 * Zustand so the UI refreshes without a manual reload.
 *
 * Only active when:
 *  - isSupabaseConfigured is true
 *  - A user is logged in
 *  - The user is NOT a customer (customers already see their own orders
 *    immediately via addOrder() in the checkout flow)
 */
import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export function useRealtimeOrders(): void {
  const currentUser   = useAppStore(s => s.currentUser);
  const refreshOrders = useAppStore(s => s.refreshOrders);

  // Debounce rapid-fire events (e.g. bulk inserts) into a single re-fetch
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { refreshOrders(); }, 600);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!currentUser)           return;
    // Customers see their orders immediately via addOrder() — no realtime needed
    if (currentUser.role === 'customer') return;

    const channel = supabase
      .channel(`orders-rt-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'service_orders' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_orders' },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  // Re-subscribe if the logged-in user changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);
}
