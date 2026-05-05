'use client';

import { ID, Models } from 'appwrite';
import { databases } from '@/lib/appwrite';

/**
 * Non-blocking document creation/update for Appwrite
 * Similar to Firebase's setDocumentNonBlocking
 */
export async function setDocumentNonBlocking(
  databaseId: string,
  collectionId: string,
  documentId: string,
  data: any,
  options?: { merge?: boolean }
): Promise<Models.Document> {
  try {
    if (options?.merge) {
      // For merge behavior, first try to get the document
      try {
        const existingDoc = await databases.getDocument({ databaseId, collectionId, documentId });
        // If document exists, update it
        return await databases.updateDocument({
          databaseId,
          collectionId,
          documentId,
          data: {
            ...existingDoc,
            ...data,
          }
        });
      } catch (error) {
        // If document doesn't exist, create it
        return await databases.createDocument({
          databaseId,
          collectionId,
          documentId,
          data
        });
      }
    } else {
      // For set behavior, try to update first, then create if it doesn't exist
      try {
        return await databases.updateDocument({ databaseId, collectionId, documentId, data });
      } catch (error) {
        return await databases.createDocument({ databaseId, collectionId, documentId, data });
      }
    }
  } catch (error) {
    console.error('Error setting document:', error);
    throw error;
  }
}

/**
 * Non-blocking document creation for Appwrite
 * Similar to Firebase's addDocumentNonBlocking
 */
export async function addDocumentNonBlocking(
  databaseId: string,
  collectionId: string,
  data: any
): Promise<Models.Document> {
  try {
    return await databases.createDocument({
      databaseId,
      collectionId,
      documentId: ID.unique(),
      data
    });
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
}

/**
 * Non-blocking document deletion for Appwrite
 * Similar to Firebase's deleteDocumentNonBlocking
 */
export async function deleteDocumentNonBlocking(
  databaseId: string,
  collectionId: string,
  documentId: string
): Promise<void> {
  try {
    await databases.deleteDocument({ databaseId, collectionId, documentId });
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}
