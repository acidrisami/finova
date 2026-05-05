'use client';

import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { databases } from '@/lib/appwrite';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;     // True if loading.
  error: Error | null;   // Error object, or null.
}

/**
 * React hook to fetch a single document from an Appwrite collection.
 * Handles nullable references.
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {string | null | undefined} databaseId - Database ID
 * @param {string | null | undefined} collectionId - Collection ID
 * @param {string | null | undefined} documentId - Document ID
 * @returns {UseDocResult<T>} Hook result with data, loading state, and error.
 */
export function useDoc<T = any>(
  databaseId: string | null | undefined,
  collectionId: string | null | undefined,
  documentId: string | null | undefined
): UseDocResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!databaseId || !collectionId || !documentId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchDoc = async () => {
      try {
        const doc = await databases.getDocument({ databaseId, collectionId, documentId });

        if (isMounted) {
          // Transform document to include id field
          const docWithId: WithId<T> = {
            ...doc,
            id: doc.$id,
          } as any;

          setData(docWithId);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    fetchDoc();

    return () => {
      isMounted = false;
    };
  }, [databaseId, collectionId, documentId]);

  return { data, isLoading, error };
}
