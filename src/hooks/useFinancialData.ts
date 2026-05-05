/**
 * Financial data hooks and utilities
 */

import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/appwrite';
import { IncomeService, ExpenseService, BudgetService, InvoiceService } from '@/appwrite/database';
import { Transaction, Invoice, Income, Budget, MonthlyData } from '@/types';

/**
 * Hook to fetch user transactions (expenses)
 */
export function useTransactions() {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const expenses = await ExpenseService.getUserExpenses(user.$id);
        setData(expenses);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  return { data, loading, error };
}

/**
 * Hook to fetch user invoices
 */
export function useInvoices() {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const invoices = await InvoiceService.getUserInvoices(user.$id);
        setData(invoices);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user]);

  return { data, loading, error };
}

/**
 * Hook to fetch user income sources
 */
export function useIncomeSources() {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchIncome = async () => {
      try {
        setLoading(true);
        const income = await IncomeService.getUserIncome(user.$id);
        setData(income);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncome();
  }, [user]);

  return { data, loading, error };
}

/**
 * Hook to fetch user budgets
 */
export function useBudgets() {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchBudgets = async () => {
      try {
        setLoading(true);
        const budgets = await BudgetService.getUserBudgets(user.$id);
        setData(budgets);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, [user]);

  return { data, loading, error };
}

/**
 * Hook to calculate financial statistics
 */
export function useFinancialStats() {
  const { data: transactions } = useTransactions();
  const { data: invoices } = useInvoices();
  const { data: incomeSources } = useIncomeSources();

  return useMemo(() => {
    if (!transactions) return { currentSpent: 0, expenditureRate: 0 };

    // Calculate all-time expenses (transactions are now expense documents)
    const allExpenses = transactions
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Calculate all-time paid invoices
    const allPaidInvoices = invoices
      ?.filter((inv: Invoice) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0) || 0;

    const totalSpent = allExpenses + allPaidInvoices;

    // Calculate daily rate based on last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentExpenses = transactions
      .filter((t) => {
        const d = new Date(t.createdAt);
        return d >= thirtyDaysAgo;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const recentInvoices = invoices
      ?.filter((inv: Invoice) => {
        const d = new Date(inv.issueDate);
        return d >= thirtyDaysAgo && inv.status === 'paid';
      })
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0) || 0;

    const recentSpent = recentExpenses + recentInvoices;
    const expenditureRate = recentSpent / 30;

    return {
      currentSpent: totalSpent,
      expenditureRate
    };
  }, [transactions, invoices]);
}

/**
 * Hook to calculate total income
 */
export function useTotalIncome() {
  const { data: incomeSources } = useIncomeSources();

  return useMemo(() => {
    return incomeSources?.reduce((sum, inc) =>
      sum + (Number(inc.amount) || 0), 0) || 0;
  }, [incomeSources]);
}

/**
 * Hook to calculate budget goal
 */
export function useBudgetGoal() {
  const { data: budgets } = useBudgets();
  const totalIncome = useTotalIncome();

  return useMemo(() => {
    const general = budgets?.find((b: Budget) => b.categoryId === "general");
    const baseBudget = general ? Number(general.limitAmount) : 0;
    return baseBudget + totalIncome;
  }, [budgets, totalIncome]);
}

/**
 * Hook to generate monthly chart data
 */
export function useMonthlyData() {
  const { data: transactions } = useTransactions();
  const { data: invoices } = useInvoices();
  const { data: incomeSources } = useIncomeSources();

  return useMemo((): MonthlyData[] => {
    if (!transactions && !invoices && !incomeSources) return [];

    // Get last 6 months of data
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        name: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      };
    });

    return months.map(({ year, month, name }) => {
      // Calculate expenses for the month
      const monthExpenses = transactions?.filter((t) => {
        const d = new Date(t.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

      // Calculate paid invoices for the month
      const monthInvoices = invoices?.filter((inv: Invoice) => {
        const d = new Date(inv.issueDate);
        return d.getFullYear() === year && d.getMonth() === month && inv.status === 'paid';
      }).reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0) || 0;

      const totalExpenses = monthExpenses + monthInvoices;

      // Calculate income for the month
      const monthIncome = incomeSources?.reduce((sum, inc) => {
        return sum + (Number(inc.amount) || 0);
      }, 0) || 0;

      // Calculate net trend (income - expenses)
      const netTrend = monthIncome - totalExpenses;

      return {
        year,
        month,
        name,
        income: monthIncome,
        expenses: totalExpenses,
        netTrend
      };
    });
  }, [transactions, invoices, incomeSources]);
}
