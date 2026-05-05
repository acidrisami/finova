'use client';

/**
 * @fileOverview Dashboard - Overview of spending trends and metrics.
 */

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { SidebarNav, BottomNav } from "@/components/nav-main"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts'
import { formatUGX } from "@/lib/utils"
import { useUser } from "@/appwrite"
import { IncomeService, ExpenseService, BudgetService, InvoiceService, type IncomeDocument, type ExpenseDocument, type BudgetDocument, type InvoiceDocument } from "@/appwrite/database"
export default function Dashboard() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [incomeSources, setIncomeSources] = useState<IncomeDocument[]>([])
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([])
  const [budgets, setBudgets] = useState<BudgetDocument[]>([])
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [income, expenseData, budgetData, invoiceData] = await Promise.all([
          IncomeService.getUserIncome(user.$id),
          ExpenseService.getUserExpenses(user.$id),
          BudgetService.getUserBudgets(user.$id),
          InvoiceService.getUserInvoices(user.$id)
        ])

        setIncomeSources(income)
        setExpenses(expenseData)
        setBudgets(budgetData)
        setInvoices(invoiceData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const stats = useMemo(() => {
    if (!expenses || !isMounted) return { currentSpent: 0, expenditureRate: 0 }
    const now = new Date()
    const daysPassed = now.getDate()

    // Calculate all-time expenses (not just current month)
    const allExpenses = expenses
      ?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0

    // Calculate all-time invoices
    const allPaidInvoices = invoices
      ?.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0) || 0

    const totalSpent = allExpenses + allPaidInvoices

    // Calculate average expenditure across categories
    const categorySpending: { [key: string]: number } = {}

    // Group expenses by category/source
    expenses
      ?.forEach(e => {
        const category = e.source || 'Uncategorized'
        categorySpending[category] = (categorySpending[category] || 0) + (Number(e.amount) || 0)
      })

    // Group invoices by category (if they have categories, otherwise group as 'Invoices')
    invoices
      ?.forEach(inv => {
        const category = 'Invoices'
        categorySpending[category] = (categorySpending[category] || 0) + (Number(inv.totalAmount) || 0)
      })

    // Calculate average expenditure across categories
    const categories = Object.keys(categorySpending)
    const totalCategorySpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0)
    const numberOfCategories = Math.max(categories.length, 1) // At least 1 category to avoid division by zero
    const expenditureRate = totalCategorySpending / numberOfCategories

    return {
      currentSpent: totalSpent,
      expenditureRate: expenditureRate
    }
  }, [expenses, invoices, isMounted])

  const totalIncome = useMemo(() => {
    return incomeSources?.reduce((sum, inc) =>
      sum + (Number(inc.amount) || 0), 0) || 0
  }, [incomeSources])

  const budgetGoal = useMemo(() => {
    const general = budgets?.find(b => b.categoryId === "general")
    const baseBudget = general ? Number(general.limitAmount) : 0
    return baseBudget + totalIncome
  }, [budgets, totalIncome])


  const pieChartData = useMemo(() => {
    if (!isMounted) return []

    return [
      {
        name: 'Income',
        value: totalIncome,
        color: '#22c55e'
      },
      {
        name: 'Expenses',
        value: stats.currentSpent,
        color: '#ef4444'
      }
    ]
  }, [isMounted, totalIncome, stats.currentSpent])

  if (isUserLoading || isLoading || !isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const greetingName = user.name?.split(' ')[0] || 'User'
  const capitalizedName = greetingName.charAt(0).toUpperCase() + greetingName.slice(1)

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />

      <main className="flex-1 md:mr-16 md:ml-16 p-3 md:p-8 mt-16 md:mt-0">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 w-full px-3 md:px-8">
          <header className="space-y-1 text-left px-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h2>
            <p className="text-sm md:text-base text-muted-foreground">Welcome back, {capitalizedName}.</p>
          </header>

          {/* Mobile Stats Display - Words Only */}
          <div className="md:hidden space-y-3 p-3 bg-muted/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Available</span>
              <span className="text-sm font-bold truncate">{formatUGX(Math.max(0, budgetGoal - stats.currentSpent))}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total Spent</span>
              <span className="text-sm font-bold truncate">{formatUGX(stats.currentSpent)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Income</span>
              <span className="text-sm font-bold text-positive truncate">{formatUGX(totalIncome)}</span>
            </div>
          </div>

          {/* Desktop Stats Display - Summary Stats */}
          <div className="hidden md:flex justify-between items-center p-4 bg-muted/20 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-muted-foreground">Available</span>
              <span className="text-lg font-bold truncate">{formatUGX(Math.max(0, budgetGoal - stats.currentSpent))}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-muted-foreground">Total Spent</span>
              <span className="text-lg font-bold truncate">{formatUGX(stats.currentSpent)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-muted-foreground">Income</span>
              <span className="text-lg font-bold text-positive truncate">{formatUGX(totalIncome)}</span>
            </div>
          </div>

          {/* Mobile Charts Display */}
          <div className="md:hidden space-y-4">
            {pieChartData.length > 0 && (
              <div className="w-full">
                <h3 className="text-m font-semibold mb-2 px-1">Income vs Expenses</h3>
                <div className="w-full aspect-[4/3] min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="45%"
                        outerRadius="65%"
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [formatUGX(value), 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom 2-column legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 px-2">
                  {pieChartData.map((item, index) => {
                    const total = pieChartData.reduce((sum, i) => sum + i.value, 0)
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
                    return (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}: {percent}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Charts Display */}
          {pieChartData.length > 0 && (
            <div className="hidden md:block w-full">
              <h3 className="text-base lg:text-lg font-semibold mb-2">Income vs Expenses</h3>
              <div className="w-full aspect-[16/9] min-h-[300px] lg:min-h-[400px] max-h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="40%"
                      outerRadius="55%"
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [formatUGX(value), 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom 2-column legend */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 max-w-md mx-auto">
                {pieChartData.map((item, index) => {
                  const total = pieChartData.reduce((sum, i) => sum + i.value, 0)
                  const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}: {percent}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}