/**
 * Financial data service layer
 */

import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, INVOICE_CONFIG } from '@/constants';
import { Transaction, Invoice, InvoiceItem, Income, Budget } from '@/types';
import { generateInvoiceNumber } from '@/utils/formatting';

/**
 * Service class for managing financial data
 */
export class FinancialService {
  private databaseId: string;
  private userId: string;

  constructor(databaseId: string, userId: string) {
    this.databaseId = databaseId;
    this.userId = userId;
  }

  private async createDocument(collectionName: string, data: any) {
    return await databases.createDocument(
      this.databaseId,
      collectionName,
      ID.unique(),
      {
        ...data,
        userId: this.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  private async updateDocument(collectionName: string, documentId: string, data: any) {
    return await databases.updateDocument(
      this.databaseId,
      collectionName,
      documentId,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  private async deleteDocument(collectionName: string, documentId: string) {
    return await databases.deleteDocument(
      this.databaseId,
      collectionName,
      documentId
    );
  }

  private async listDocuments(collectionName: string, queries?: string[]) {
    const finalQueries = queries || [];
    finalQueries.push(Query.equal('userId', this.userId));

    return await databases.listDocuments(
      this.databaseId,
      collectionName,
      finalQueries
    );
  }

  /**
   * Transaction operations
   */
  async createTransaction(transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const docRef = await this.createDocument(COLLECTIONS.TRANSACTIONS, transaction);
    return docRef.$id;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>) {
    await this.updateDocument(COLLECTIONS.TRANSACTIONS, id, updates);
  }

  async deleteTransaction(id: string) {
    await this.deleteDocument(COLLECTIONS.TRANSACTIONS, id);
  }

  /**
   * Invoice operations
   */
  async createInvoice(invoice: Omit<Invoice, 'id' | 'userId' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) {
    const docRef = await this.createDocument(COLLECTIONS.INVOICES, {
      ...invoice,
      invoiceNumber: generateInvoiceNumber(),
    });
    return docRef.$id;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>) {
    await this.updateDocument(COLLECTIONS.INVOICES, id, updates);
  }

  async deleteInvoice(id: string) {
    await this.deleteDocument(COLLECTIONS.INVOICES, id);
  }

  async toggleInvoiceStatus(id: string, currentStatus: 'pending' | 'paid') {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    await this.updateInvoice(id, { status: newStatus });
    return newStatus;
  }

  /**
   * Invoice item operations
   */
  async createInvoiceItem(invoiceId: string, item: Omit<InvoiceItem, 'id' | 'userId' | 'invoiceId' | 'createdAt' | 'updatedAt'>) {
    const docRef = await this.createDocument(COLLECTIONS.INVOICE_ITEMS, {
      ...item,
      invoiceId,
    });

    // Update invoice total
    await this.updateInvoiceTotal(invoiceId);
    return docRef.$id;
  }

  async updateInvoiceTotal(invoiceId: string) {
    const itemsResult = await this.listDocuments(COLLECTIONS.INVOICE_ITEMS, [
      Query.equal('invoiceId', invoiceId)
    ]);

    const totalAmount = itemsResult.documents.reduce((sum: number, doc: any) => {
      const item = doc;
      return sum + (Number(item.totalPrice) || 0);
    }, 0);

    await this.updateDocument(COLLECTIONS.INVOICES, invoiceId, { totalAmount });
  }

  async deleteInvoiceItem(invoiceId: string, itemId: string) {
    await this.deleteDocument(COLLECTIONS.INVOICE_ITEMS, itemId);

    // Update invoice total
    await this.updateInvoiceTotal(invoiceId);
  }

  /**
   * Income operations
   */
  async createIncome(income: Omit<Income, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const docRef = await this.createDocument(COLLECTIONS.INCOME, income);
    return docRef.$id;
  }

  async updateIncome(id: string, updates: Partial<Income>) {
    await this.updateDocument(COLLECTIONS.INCOME, id, updates);
  }

  async deleteIncome(id: string) {
    await this.deleteDocument(COLLECTIONS.INCOME, id);
  }

  async toggleIncomeStatus(id: string, currentStatus: 'active' | 'inactive') {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await this.updateIncome(id, { status: newStatus });
    return newStatus;
  }

  /**
   * Budget operations
   */
  async createBudget(budget: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const docRef = await this.createDocument(COLLECTIONS.BUDGETS, budget);
    return docRef.$id;
  }

  async updateBudget(id: string, updates: Partial<Budget>) {
    await this.updateDocument(COLLECTIONS.BUDGETS, id, updates);
  }

  async deleteBudget(id: string) {
    await this.deleteDocument(COLLECTIONS.BUDGETS, id);
  }

  /**
   * Analytics operations
   */
  async getTransactionsByDateRange(startDate: Date, endDate: Date, type?: 'income' | 'expense') {
    const queries = [
      Query.greaterThanEqual('transactionDate', startDate.toISOString()),
      Query.lessThanEqual('transactionDate', endDate.toISOString()),
      Query.orderDesc('transactionDate')
    ];

    if (type) {
      queries.push(Query.equal('type', type));
    }

    const result = await this.listDocuments(COLLECTIONS.TRANSACTIONS, queries);
    return result.documents.map((doc: any) => ({
      id: doc.$id,
      userId: doc.userId,
      amount: doc.amount,
      description: doc.description,
      category: doc.category,
      type: doc.type,
      transactionDate: doc.transactionDate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })) as Transaction[];
  }

  async getInvoicesByDateRange(startDate: Date, endDate: Date, status?: 'pending' | 'paid') {
    const queries = [
      Query.greaterThanEqual('issueDate', startDate.toISOString()),
      Query.lessThanEqual('issueDate', endDate.toISOString()),
      Query.orderDesc('issueDate')
    ];

    if (status) {
      queries.push(Query.equal('status', status));
    }

    const result = await this.listDocuments(COLLECTIONS.INVOICES, queries);
    return result.documents.map((doc: any) => ({
      id: doc.$id,
      userId: doc.userId,
      recipientName: doc.recipientName,
      invoiceNumber: doc.invoiceNumber,
      issueDate: doc.issueDate,
      dueDate: doc.dueDate,
      totalAmount: doc.totalAmount,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })) as Invoice[];
  }

  async getMonthlyExpenses(year: number, month: number) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return this.getTransactionsByDateRange(startDate, endDate, 'expense');
  }

  async getMonthlyIncome(year: number, month: number) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return this.getTransactionsByDateRange(startDate, endDate, 'income');
  }
}

/**
 * Hook to get financial service instance
 */
export function useFinancialService(databaseId: string, userId: string): FinancialService {
  return new FinancialService(databaseId, userId);
}
