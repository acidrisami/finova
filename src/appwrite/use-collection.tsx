'use client';

import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { databases } from '@/lib/appwrite';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: Error | null;     // Error object, or null.
}

/**
 * React hook to fetch and subscribe to an Appwrite collection.
 * Handles nullable references/queries.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {string | null | undefined} databaseId - Database ID
 * @param {string | null | undefined} collectionId - Collection ID
 * @param {string[] | null | undefined} queries - Optional query strings to filter/sort data
 * @returns {UseCollectionResult<T>} Hook result with data, loading state, and error.
 */
export function useCollection<T = any>(
  databaseId: string | null | undefined,
  collectionId: string | null | undefined,
  queries: string[] | null | undefined = null
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!databaseId || !collectionId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        let response: Models.DocumentList<Models.Document>;

        response = await databases.listDocuments({
          databaseId,
          collectionId,
          queries: queries || undefined
        });

        if (isMounted) {
          // Transform documents to include id field
          const documentsWithId: WithId<T>[] = response.documents.map(doc => ({
            ...doc,
            id: doc.$id,
          } as any));

          setData(documentsWithId);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [databaseId, collectionId, JSON.stringify(queries)]);

  return { data, isLoading, error };
}

/**
 * Hook for creating memoized Appwrite query strings
 * @param queries - Array of query strings or null
 * @returns Memoized queries array
 */
export function useMemoQuery(queries: string[] | null | undefined): string[] | null {
  return queries || null;
}
