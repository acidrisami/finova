/**
 * Authentication hooks and utilities
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/appwrite';
import { UserAuthState } from '@/types';

/**
 * Hook to handle authentication redirects
 */
export function useAuthRedirect() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  return { user, isUserLoading };
}

/**
 * Hook to ensure user is authenticated
 */
export function useRequireAuth() {
  const { user, isUserLoading } = useUser();

  if (!isUserLoading && !user) {
    throw new Error('User must be authenticated');
  }

  return { user, isUserLoading };
}

/**
 * Hook to get user display name
 */
export function useUserDisplayName() {
  const { user } = useUser();

  const displayName = user?.name?.split(' ')[0] || 'User';
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return capitalizedName;
}
