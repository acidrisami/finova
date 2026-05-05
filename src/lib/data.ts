
/**
 * @fileOverview Data layer shared types.
 * Using Appwrite for data synchronization.
 */

export type TransactionType = 'income' | 'expense';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  currency: string;
  isVerified: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  transactionDate: string;
  type: TransactionType;
  invoiceId?: string;
  createdAt: any;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  startDate?: string;
  endDate?: string;
  updatedAt: any;
}

export interface Invoice {
  id: string;
  userId: string;
  recipientName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'pending' | 'paid';
  categoryName?: string;
  createdAt: any;
}
