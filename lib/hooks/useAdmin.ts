'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { AdminProfile } from '@/lib/api/types/admin';

export type { AdminProfile };

/**
 * Current signed-in admin.
 *
 * The API's GET /v1/admin/auth/me endpoint was removed, so this reads from the
 * app's own BFF route (/api/auth/me), which recovers the identity from the
 * session JWT and enriches it from the admins list. See app/api/auth/me/route.ts.
 */
export function useAdmin() {
  const router = useRouter();

  const { data, error, isLoading } = useQuery<AdminProfile>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        throw new Error('unauthenticated');
      }
      if (!res.ok) {
        throw new Error('Failed to load admin profile');
      }
      const body = await res.json() as { success: boolean; data: AdminProfile };
      return body.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (error?.message === 'unauthenticated') {
      router.push('/');
    }
  }, [error, router]);

  return { admin: data, isLoading, error };
}
