/**
 * Application constants and configuration
 */

// Authentication Constants
export const ALLOWED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'company.com',
  'example.org'
] as const;

// Currency and Formatting
export const CURRENCY = {
  CODE: 'UGX',
  SYMBOL: 'UGX',
  LOCALE: 'en-UG'
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  CHART: 'MMM yyyy'
} as const;

// Navigation Constants
export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/' },
  { name: 'Income', href: '/income' },
  { name: 'Budgets', href: '/budgets' },
  { name: 'Records', href: '/transactions' }
] as const;

// Chart Configuration
export const CHART_CONFIG = {
  COLORS: {
    INCOME: '#22c55e',
    EXPENSE: '#ef4444',
    NET_TREND: '#3b82f6',
    PRIMARY: 'hsl(var(--primary))'
  },
  GRADIENTS: {
    INCOME: {
      START: '#22c55e',
      END: '#22c55e33'
    },
    EXPENSE: {
      START: '#ef4444',
      END: '#ef444433'
    }
  },
  MONTHS_TO_DISPLAY: 6,
  DAYS_TO_DISPLAY: 7
} as const;

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'items',
  INCOME: 'income',
  EXPENSES: 'expenses',
  BUDGETS: 'budgets'
} as const;

// Invoice Configuration
export const INVOICE_CONFIG = {
  NUMBER_PREFIX: 'INV-',
  DEFAULT_DUE_DAYS: 14,
  NUMBER_LENGTH: 6
} as const;

// UI Constants
export const UI = {
  LOADING_STATES: {
    INITIAL: 'initial',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
  },
  ANIMATIONS: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500
    }
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px'
  }
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_AMOUNT: 0,
  MAX_AMOUNT: 999999999,
  MIN_DESCRIPTION_LENGTH: 1,
  MAX_DESCRIPTION_LENGTH: 255,
  MIN_SOURCE_LENGTH: 2,
  MAX_SOURCE_LENGTH: 100
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_DOMAIN: 'Email domain is not allowed',
    WEAK_PASSWORD: 'Password should be at least 6 characters',
    LOGIN_FAILED: 'Login failed. Please check your credentials.',
    SIGNUP_FAILED: 'Sign up failed. Please try again.'
  },
  FORM: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_AMOUNT: 'Please enter a valid amount',
    INVALID_EMAIL: 'Please enter a valid email address',
    MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
    MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`
  },
  NETWORK: {
    GENERIC: 'Something went wrong. Please try again.',
    OFFLINE: 'You appear to be offline. Please check your connection.'
  }
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  INVOICE: {
    CREATED: 'Invoice created successfully',
    DELETED: 'Invoice deleted successfully',
    UPDATED: 'Invoice updated successfully'
  },
  INCOME: {
    CREATED: 'Income source added successfully',
    DELETED: 'Income source removed successfully',
    UPDATED: 'Income source updated successfully'
  },
  EXPENSE: {
    CREATED: 'Expense source added successfully',
    DELETED: 'Expense source removed successfully',
    UPDATED: 'Expense source updated successfully'
  },
  TRANSACTION: {
    CREATED: 'Transaction added successfully',
    DELETED: 'Transaction deleted successfully',
    UPDATED: 'Transaction updated successfully'
  },
  BUDGET: {
    CREATED: 'Budget created successfully',
    DELETED: 'Budget deleted successfully',
    UPDATED: 'Budget updated successfully'
  },
  USER: {
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_UPDATED: 'Password updated successfully'
  }
} as const;
