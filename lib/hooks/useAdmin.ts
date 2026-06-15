'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminControllerGetMe } from '@/lib/api/generated/admin/admin';
import { ApiError } from '@/lib/api/client';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useAdmin() {
  const router = useRouter();
  const { data, error, isLoading } = useAdminControllerGetMe();

  useEffect(() => {
    if (error && (error as unknown as ApiError).status === 401) {
      router.push('/');
    }
  }, [error, router]);

  // customInstance unwraps {success,data} so runtime value is the admin object
  const admin = data as unknown as AdminProfile | undefined;

  return { admin, isLoading, error };
}
