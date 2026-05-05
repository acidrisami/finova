/**
 * Core type definitions for the Finova application
 */

// User and Authentication Types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Financial Entity Types
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  transactionDate: string;
  createdAt: any;
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
  createdAt: any;
  updatedAt: any;
}

export interface InvoiceItem {
  id: string;
  userId: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: any;
  updatedAt: any;
}

export interface Income {
  id: string;
  userId: string;
  source: string;
  amount: number;
  status: 'active' | 'inactive';
  createdAt: any;
  updatedAt: any;
}

export interface Expense {
  id: string;
  userId: string;
  source: string;
  amount: number;
  status: 'active' | 'inactive';
  createdAt: any;
  updatedAt: any;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  spentAmount: number;
  createdAt: any;
  updatedAt: any;
}

// UI and Component Types
export interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ComponentType<any>;
}

export interface ChartDataPoint {
  name: string;
  income: number;
  expenses: number;
  netTrend: number;
}

export interface MonthlyData {
  year: number;
  month: number;
  name: string;
  income: number;
  expenses: number;
  netTrend: number;
}

// Form Types
export interface InvoiceFormData {
  recipientName: string;
  amount: string;
}

export interface IncomeFormData {
  source: string;
  amount: string;
}

export interface ExpenseFormData {
  source: string;
  amount: string;
}

export interface TransactionFormData {
  amount: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  transactionDate: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface CollectionResponse<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
}

// Configuration Types
export interface AppConfig {
  allowedDomains: string[];
  defaultCurrency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
}

// Utility Types
export type WithId<T> = T & { id: string };
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
