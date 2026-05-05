/**
 * @fileOverview Database service layer for Appwrite integration.
 * Provides typed CRUD operations for all application data models.
 */

import { databases, ID, Query } from '@/lib/appwrite'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'finova'

/** Base database service class providing generic CRUD operations. */
export class DatabaseService {
  protected static databaseId = DATABASE_ID

  /**
   * Create a new document in the specified collection.
   * @param collectionId - The Appwrite collection ID.
   * @param data - The document data to create.
   * @returns The created document with generated ID.
   * @throws Error if creation fails.
   */
  protected static async create<T>(collectionId: string, data: Omit<T, '$id' | '$createdAt' | '$updatedAt'>): Promise<T & { $id: string }> {
    try {
      const document = await databases.createDocument({
        databaseId: this.databaseId,
        collectionId,
        documentId: ID.unique(),
        data
      })
      return document as unknown as T & { $id: string }
    } catch (error: any) {
      throw new Error(error?.message || `Failed to create document in ${collectionId}`)
    }
  }

  /**
   * Retrieve a single document by ID.
   * @param collectionId - The Appwrite collection ID.
   * @param documentId - The document ID to retrieve.
   * @returns The requested document.
   */
  protected static async get<T>(collectionId: string, documentId: string): Promise<T & { $id: string }> {
    const document = await databases.getDocument({
      databaseId: this.databaseId,
      collectionId,
      documentId
    })
    return document as unknown as T & { $id: string }
  }

  /**
   * List documents from a collection with optional filtering.
   * @param collectionId - The Appwrite collection ID.
   * @param queries - Optional query filters.
   * @param userId - Optional user ID to filter by ownership.
   * @returns List of matching documents.
   * @throws Error if the query fails.
   */
  protected static async list<T>(
    collectionId: string,
    queries?: string[] | null,
    userId?: string
  ): Promise<{ documents: (T & { $id: string })[] }> {
    try {
      const finalQueries = queries || []
      if (userId) {
        finalQueries.push(Query.equal('userId', userId))
      }

      const result = await databases.listDocuments({
        databaseId: this.databaseId,
        collectionId,
        queries: finalQueries
      })
      return {
        documents: result.documents as unknown as (T & { $id: string })[]
      }
    } catch (error: any) {
      throw new Error(error?.message || `Failed to list documents from ${collectionId}`)
    }
  }

  /**
   * Update an existing document.
   * @param collectionId - The Appwrite collection ID.
   * @param documentId - The document ID to update.
   * @param data - Partial data to update.
   * @returns The updated document.
   */
  protected static async update<T>(
    collectionId: string,
    documentId: string,
    data: Partial<T>
  ): Promise<T & { $id: string }> {
    const document = await databases.updateDocument({
      databaseId: this.databaseId,
      collectionId,
      documentId,
      data
    })
    return document as unknown as T & { $id: string }
  }

  /**
   * Delete a document from the collection.
   * @param collectionId - The Appwrite collection ID.
   * @param documentId - The document ID to delete.
   */
  protected static async delete(collectionId: string, documentId: string): Promise<void> {
    await databases.deleteDocument({
      databaseId: this.databaseId,
      collectionId,
      documentId
    })
  }
}

/** Represents an income source document. */
export interface IncomeDocument {
  $id: string
  userId: string
  source: string
  amount: number
  $createdAt: string
  $updatedAt: string
}

/** Service for managing income documents. */
export class IncomeService extends DatabaseService {
  /**
   * Create a new income record.
   * @param data - Income data excluding system fields.
   * @returns The created income document.
   */
  static async createIncome(data: Omit<IncomeDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<IncomeDocument> {
    return await this.create<IncomeDocument>('income', data)
  }

  /**
   * Get all income records for a user, sorted by creation date descending.
   * @param userId - The user ID to filter by.
   * @returns Array of income documents.
   */
  static async getUserIncome(userId: string): Promise<IncomeDocument[]> {
    const result = await this.list<IncomeDocument>('income', [Query.orderDesc('$createdAt')], userId)
    return result.documents
  }

  /**
   * Update an existing income record.
   * @param id - The income document ID.
   * @param data - Partial data to update.
   * @returns The updated income document.
   */
  static async updateIncome(id: string, data: Partial<IncomeDocument>): Promise<IncomeDocument> {
    return await this.update<IncomeDocument>('income', id, data)
  }

  /**
   * Delete an income record.
   * @param id - The income document ID to delete.
   */
  static async deleteIncome(id: string): Promise<void> {
    await this.delete('income', id)
  }
}

/** Represents an expense document. */
export interface ExpenseDocument {
  $id: string
  userId: string
  source: string
  amount: number
  description?: string
  $createdAt: string
  $updatedAt: string
}

/** Service for managing expense documents. */
export class ExpenseService extends DatabaseService {
  /**
   * Create a new expense record.
   * @param data - Expense data excluding system fields.
   * @returns The created expense document.
   */
  static async createExpense(data: Omit<ExpenseDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<ExpenseDocument> {
    return await this.create<ExpenseDocument>('expenses', data)
  }

  /**
   * Get all expense records for a user, sorted by creation date descending.
   * @param userId - The user ID to filter by.
   * @returns Array of expense documents.
   */
  static async getUserExpenses(userId: string): Promise<ExpenseDocument[]> {
    const result = await this.list<ExpenseDocument>('expenses', [Query.orderDesc('$createdAt')], userId)
    return result.documents
  }

  /**
   * Update an existing expense record.
   * @param id - The expense document ID.
   * @param data - Partial data to update.
   * @returns The updated expense document.
   */
  static async updateExpense(id: string, data: Partial<ExpenseDocument>): Promise<ExpenseDocument> {
    return await this.update<ExpenseDocument>('expenses', id, data)
  }

  /**
   * Delete an expense record.
   * @param id - The expense document ID to delete.
   */
  static async deleteExpense(id: string): Promise<void> {
    await this.delete('expenses', id)
  }
}

/** Represents a budget document for expense categories. */
export interface BudgetDocument {
  $id: string
  userId: string
  category: string
  categoryId: string
  limitAmount: number
  $createdAt: string
  $updatedAt: string
}

/** Service for managing budget documents. */
export class BudgetService extends DatabaseService {
  /**
   * Create a new budget record.
   * @param data - Budget data excluding system fields.
   * @returns The created budget document.
   */
  static async createBudget(data: Omit<BudgetDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<BudgetDocument> {
    return await this.create<BudgetDocument>('budgets', data)
  }

  /**
   * Get all budget records for a user.
   * @param userId - The user ID to filter by.
   * @returns Array of budget documents.
   */
  static async getUserBudgets(userId: string): Promise<BudgetDocument[]> {
    const result = await this.list<BudgetDocument>('budgets', [], userId)
    return result.documents
  }

  /**
   * Update an existing budget record.
   * @param id - The budget document ID.
   * @param data - Partial data to update.
   * @returns The updated budget document.
   */
  static async updateBudget(id: string, data: Partial<BudgetDocument>): Promise<BudgetDocument> {
    return await this.update<BudgetDocument>('budgets', id, data)
  }

  /**
   * Delete a budget record.
   * @param id - The budget document ID to delete.
   */
  static async deleteBudget(id: string): Promise<void> {
    await this.delete('budgets', id)
  }

  /**
   * Get a budget by its category ID for a specific user.
   * @param userId - The user ID to filter by.
   * @param categoryId - The category ID to search for.
   * @returns The budget document or null if not found.
   */
  static async getBudgetByCategory(userId: string, categoryId: string): Promise<BudgetDocument | null> {
    const result = await this.list<BudgetDocument>('budgets', [Query.equal('categoryId', categoryId)], userId)
    return result.documents.length > 0 ? result.documents[0] as BudgetDocument : null
  }
}

/** Represents an invoice document. */
export interface InvoiceDocument {
  $id: string
  userId: string
  clientName: string
  recipientName?: string
  totalAmount: number
  issueDate: string
  dueDate?: string
  status?: string
  invoiceNumber?: string
  categoryName?: string
  $createdAt: string
  $updatedAt: string
}

/** Represents a user document in the database. */
export interface UserDocument {
  $id: string
  email: string
  name?: string
  $createdAt: string
  $updatedAt: string
}

/** Service for managing user documents and syncing with authentication. */
export class UserService extends DatabaseService {
  /**
   * Create a new user document.
   * @param data - User data excluding system fields.
   * @returns The created user document.
   */
  static async createUser(data: Omit<UserDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<UserDocument> {
    return await this.create<UserDocument>('users', data)
  }

  /**
   * Get a user by their ID.
   * @param userId - The user document ID.
   * @returns The user document or null if not found.
   */
  static async getUserById(userId: string): Promise<UserDocument | null> {
    try {
      return await this.get<UserDocument>('users', userId)
    } catch (error) {
      return null
    }
  }

  /**
   * Get a user by their email address.
   * @param email - The email to search for.
   * @returns The user document or null if not found.
   */
  static async getUserByEmail(email: string): Promise<UserDocument | null> {
    try {
      const result = await this.list<UserDocument>('users', [Query.equal('email', email)])
      return result.documents.length > 0 ? result.documents[0] as UserDocument : null
    } catch (error) {
      return null
    }
  }

  /**
   * Update an existing user document.
   * @param id - The user document ID.
   * @param data - Partial data to update.
   * @returns The updated user document.
   */
  static async updateUser(id: string, data: Partial<UserDocument>): Promise<UserDocument> {
    return await this.update<UserDocument>('users', id, data)
  }

  /**
   * Delete a user document.
   * @param id - The user document ID to delete.
   */
  static async deleteUser(id: string): Promise<void> {
    await this.delete('users', id)
  }

  /**
   * Synchronize an Appwrite auth user with the database.
   * Creates the user if they don't exist, or updates their info if they do.
   * @param authUser - The Appwrite authentication user object.
   * @returns The synced user document.
   */
  static async syncUserFromAuth(authUser: any): Promise<UserDocument> {
    const existingUser = await this.getUserByEmail(authUser.email)

    if (existingUser) {
      return await this.updateUser(existingUser.$id, {
        name: authUser.name,
        email: authUser.email
      })
    } else {
      return await this.createUser({
        email: authUser.email,
        name: authUser.name
      })
    }
  }
}

/** Service for managing invoice documents. */
export class InvoiceService extends DatabaseService {
  /**
   * Create a new invoice record.
   * @param data - Invoice data excluding system fields.
   * @returns The created invoice document.
   */
  static async createInvoice(data: Omit<InvoiceDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<InvoiceDocument> {
    return await this.create<InvoiceDocument>('invoices', data)
  }

  /**
   * Get all invoice records for a user, sorted by creation date descending.
   * @param userId - The user ID to filter by.
   * @returns Array of invoice documents.
   */
  static async getUserInvoices(userId: string): Promise<InvoiceDocument[]> {
    const result = await this.list<InvoiceDocument>('invoices', [Query.orderDesc('$createdAt')], userId)
    return result.documents
  }


  /**
   * Update an existing invoice record.
   * @param id - The invoice document ID.
   * @param data - Partial data to update.
   * @returns The updated invoice document.
   */
  static async updateInvoice(id: string, data: Partial<InvoiceDocument>): Promise<InvoiceDocument> {
    return await this.update<InvoiceDocument>('invoices', id, data)
  }

  /**
   * Delete an invoice record.
   * @param id - The invoice document ID to delete.
   */
  static async deleteInvoice(id: string): Promise<void> {
    await this.delete('invoices', id)
  }
}
