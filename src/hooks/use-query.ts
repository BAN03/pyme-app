import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getBusiness } from '@/db/repos/business';
import type { Business } from '@/db/types';

export type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Runs a read query against the local database and reloads it every time the
 * screen gains focus (so returning from a form always shows fresh data).
 */
export function useQuery<T>(query: (db: SQLiteDatabase) => Promise<T>): QueryState<T> {
  const db = useSQLiteContext();
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  });

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await queryRef.current(db);
      setData(result);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const result = await queryRef.current(db);
          if (!active) return;
          setData(result);
          setError(null);
        } catch (cause) {
          if (!active) return;
          setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [db]),
  );

  return { data, loading, error, refresh };
}

export type WithBusiness<T> = {
  business: Business;
  data: T;
};

/** Same as useQuery but resolves the business row first. */
export function useBusinessQuery<T>(
  query: (db: SQLiteDatabase, business: Business) => Promise<T>,
): QueryState<WithBusiness<T>> {
  return useQuery(async (db) => {
    const business = await getBusiness(db);
    const data = await query(db, business);
    return { business, data };
  });
}
