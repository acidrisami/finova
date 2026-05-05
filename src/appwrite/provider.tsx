/**
 * @fileOverview Appwrite authentication context provider.
 * Manages user authentication state and provides hooks for accessing Appwrite services.
 */

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Account, Models } from 'appwrite';
import { account } from '@/lib/appwrite';

/** Props for the AppwriteProvider component. */
interface AppwriteProviderProps {
  children: ReactNode;
}

/** User authentication state shape. */
interface UserAuthState {
  user: Models.User<Models.Preferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/** Combined state interface for the Appwrite context. */
export interface AppwriteContextState {
  account: Account;
  user: Models.User<Models.Preferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/** Return type for the useAppwrite hook. */
export interface AppwriteServicesAndUser {
  account: Account;
  user: Models.User<Models.Preferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/** Return type for the useUser hook. */
export interface UserHookResult {
  user: Models.User<Models.Preferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const AppwriteContext = createContext<AppwriteContextState | null>(null);

/**
 * Provider component that manages Appwrite authentication state.
 * Wrap your application with this to enable authentication hooks.
 */
export function AppwriteProvider({ children }: AppwriteProviderProps) {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    // Check current user session on mount
    const checkAuth = async () => {
      try {
        const currentUser = await account.get();
        setUserAuthState({
          user: currentUser,
          isUserLoading: false,
          userError: null,
        });
      } catch (error: any) {
        // No user session - this is normal for unauthenticated users
        setUserAuthState({
          user: null,
          isUserLoading: false,
          userError: null,
        });
      }
    };

    checkAuth();
  }, []);

  const contextValue: AppwriteContextState = {
    account,
    user: userAuthState.user,
    isUserLoading: userAuthState.isUserLoading,
    userError: userAuthState.userError,
  };

  return (
    <AppwriteContext.Provider value={contextValue}>
      {children}
    </AppwriteContext.Provider>
  );
}

/**
 * Hook to access Appwrite services and current user authentication state.
 * Must be used within an AppwriteProvider.
 * @throws Error if used outside of AppwriteProvider.
 */
export function useAppwrite(): AppwriteServicesAndUser {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error('useAppwrite must be used within an AppwriteProvider');
  }
  return context;
}

/**
 * Hook to get the current user's authentication state.
 * Convenient shorthand for useAppwrite() when only user state is needed.
 */
export function useUser(): UserHookResult {
  const { user, isUserLoading, userError } = useAppwrite();
  return { user, isUserLoading, userError };
}

/**
 * Hook to get the Appwrite Account service instance.
 * Convenient shorthand for useAppwrite() when only the account service is needed.
 */
export function useAccount(): Account {
  const { account } = useAppwrite();
  return account;
}
