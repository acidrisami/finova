"use client"

/**
 * @fileoverview Budgets Page - Implements hierarchical budgeting logic.
 * Allows users to set a General Total Budget and split it into category-specific pools.
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { SidebarNav, BottomNav } from "@/components/nav-main"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, Trash2, Plus } from "lucide-react"
import { useUser } from "@/appwrite"
import { BudgetService, ExpenseService, IncomeService, InvoiceService, type BudgetDocument, type ExpenseDocument, type IncomeDocument, type InvoiceDocument } from "@/appwrite/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { cn, formatUGX } from "@/lib/utils"
import { format } from "date-fns"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts'

export default function BudgetsPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [budgets, setBudgets] = useState<BudgetDocument[]>([])
  const [isBudgetsLoading, setIsBudgetsLoading] = useState(false)

  const fetchBudgets = async () => {
    if (!user) return
    setIsBudgetsLoading(true)
    try {
      const userBudgets = await BudgetService.getUserBudgets(user.$id)
      setBudgets(userBudgets)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load budgets" })
    } finally {
      setIsBudgetsLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [user])

  const [expenses, setExpenses] = useState<ExpenseDocument[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeDocument[]>([])
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([])

  useEffect(() => {
    if (!user) return

    const fetchAdditionalData = async () => {
      try {
        const [expenseData, incomeData, invoiceData] = await Promise.all([
          ExpenseService.getUserExpenses(user.$id),
          IncomeService.getUserIncome(user.$id),
          InvoiceService.getUserInvoices(user.$id)
        ])

        setExpenses(expenseData)
        setIncomeSources(incomeData)
        setInvoices(invoiceData)
      } catch (error) {
        console.error('Failed to fetch additional data:', error)
      }
    }

    fetchAdditionalData()
  }, [user])

  const [category, setCategory] = useState("")
  const [limit, setLimit] = useState("")
  const [generalLimit, setGeneralLimit] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const [isMounted, setIsMounted] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [fabView, setFabView] = useState<"menu" | "budget" | "category">("menu")

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const generalBudget = budgets?.find(b => b.categoryId === "general")
  const categoryBudgets = budgets?.filter(b => b.categoryId !== "general") || []

  const [includeIncome, setIncludeIncome] = useState(false)
  const [selectedIncomeIds, setSelectedIncomeIds] = useState<string[]>([])

  const totalIncome = useMemo(() => {
    if (!includeIncome) return 0
    return incomeSources?.reduce((sum, inc) =>
      selectedIncomeIds.includes(inc.$id) ? sum + (Number(inc.amount) || 0) : sum, 0) || 0
  }, [incomeSources, includeIncome, selectedIncomeIds])

  const budgetMetrics = useMemo(() => {
    const baseLimit = generalBudget ? (Number(generalBudget.limitAmount) || 0) : 0
    const totalLimit = baseLimit + totalIncome
    const totalAllocated = categoryBudgets.reduce((sum, b) => sum + (Number(b.limitAmount) || 0), 0)

    return {
      totalLimit,
      totalAllocated,
      unallocated: totalLimit - totalAllocated
    }
  }, [generalBudget, categoryBudgets, totalIncome])

  // Calculate pie chart data for category budgets
  const categoryPieChartData = useMemo(() => {
    if (!categoryBudgets || categoryBudgets.length === 0) return []

    return categoryBudgets.map(budget => ({
      name: budget.category,
      value: Number(budget.limitAmount) || 0
    }))
  }, [categoryBudgets])

  // Colors for pie chart
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0',
    '#87CEEB', '#F4A460', '#98D8C8', '#FFD700', '#DDA0DD'
  ]

  const handleSetGeneralBudget = async () => {
    if (!user || !generalLimit) return
    const amount = parseFloat(generalLimit)
    if (isNaN(amount)) return

    // Calculate what the new total budget would be
    const newBaseLimit = amount
    const newTotalLimit = newBaseLimit + totalIncome

    // Check if new total would be less than currently allocated
    if (newTotalLimit < budgetMetrics.totalAllocated) {
      toast({
        variant: "destructive",
        title: "Insufficient Budget",
        description: `You have ${formatUGX(budgetMetrics.totalAllocated)} allocated to categories. Increase your total budget to at least ${formatUGX(budgetMetrics.totalAllocated)} or reduce category allocations first.`,
        duration: 5000
      })
      return
    }

    setIsAdding(true)
    try {
      // Check if general budget already exists
      const existingBudget = await BudgetService.getBudgetByCategory(user.$id, "general")

      const budgetData = {
        userId: user.$id,
        category: "general",
        categoryId: "general",
        limitAmount: amount
      }

      if (existingBudget) {
        await BudgetService.updateBudget(existingBudget.$id, budgetData)
      } else {
        await BudgetService.createBudget(budgetData)
      }

      setGeneralLimit("")
      await fetchBudgets()
      toast({ title: "General budget updated successfully" })
    } catch (error) {
      toast({
        title: "Error updating budget",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddCategoryBudget = async () => {
    if (!user || !category || !limit) return
    const amount = parseFloat(limit)
    if (isNaN(amount)) return

    // Check if allocation exceeds available amount
    const currentAllocated = categoryBudgets.reduce((sum, b) => sum + (Number(b.limitAmount) || 0), 0)
    const existingBudgetForCategory = categoryBudgets.find(b => b.category.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase().replace(/\s+/g, '-'))
    const existingAmount = existingBudgetForCategory ? Number(existingBudgetForCategory.limitAmount) || 0 : 0

    const newTotalAllocated = currentAllocated - existingAmount + amount
    const availableAmount = budgetMetrics.totalLimit

    if (newTotalAllocated > availableAmount) {
      const shortfall = newTotalAllocated - availableAmount
      toast({
        variant: "destructive",
        title: "Cannot Allocate - Insufficient Budget",
        description: `You need ${formatUGX(shortfall)} more. Increase your total budget or reduce other allocations. Currently available: ${formatUGX(availableAmount)}`,
        duration: 5000
      })
      return
    }

    setIsAdding(true)
    try {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-')

      // Check if budget for this category already exists
      const existingBudget = await BudgetService.getBudgetByCategory(user.$id, categoryId)

      const budgetData = {
        userId: user.$id,
        category: category,
        categoryId: categoryId,
        limitAmount: amount
      }

      if (existingBudget) {
        await BudgetService.updateBudget(existingBudget.$id, budgetData)
        toast({ title: "Budget updated successfully" })
      } else {
        await BudgetService.createBudget(budgetData)
        toast({ title: "Budget created successfully" })
      }

      setCategory("")
      setLimit("")
      await fetchBudgets()
    } catch (error) {
      toast({
        title: "Error creating budget",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    try {
      await BudgetService.deleteBudget(id)
      await fetchBudgets()
      toast({ title: "Budget deleted" })
    } catch (error) {
      toast({
        title: "Error deleting budget",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    }
  }

  if (isUserLoading || isBudgetsLoading || !isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const coveragePercentage = budgetMetrics.totalLimit > 0
    ? (budgetMetrics.totalAllocated / budgetMetrics.totalLimit) * 100
    : 0

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />

      <main className="flex-1 md:mr-16 md:ml-16 p-3 md:p-8 mt-16 md:mt-0">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 w-full px-3 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Budgets</h2>
            </div>
          </div>

          {/* Mobile Stats Summary */}
          <div className="md:hidden space-y-3 p-3 bg-muted/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total Budget</span>
              <span className="text-sm font-bold text-primary truncate">{formatUGX(budgetMetrics.totalLimit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Allocated</span>
              <span className="text-sm font-bold truncate">{formatUGX(budgetMetrics.totalAllocated)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Unallocated</span>
              <span className={cn("text-sm font-bold truncate", budgetMetrics.unallocated < 0 ? "text-destructive" : "text-positive")}>
                {budgetMetrics.unallocated < 0 ? `-${formatUGX(Math.abs(budgetMetrics.unallocated))}` : formatUGX(budgetMetrics.unallocated)}
              </span>
            </div>
            {budgetMetrics.unallocated < 0 && (
              <p className="text-xs text-destructive text-center">Over-allocated! Increase total budget.</p>
            )}
          </div>

          {/* Desktop Stats Display - Summary Stats */}
          <div className="hidden md:flex justify-between items-center p-4 bg-muted/20 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-muted-foreground">Total Budget</span>
              <span className="text-lg font-bold text-primary truncate">{formatUGX(budgetMetrics.totalLimit)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-muted-foreground">Allocated</span>
              <span className="text-lg font-bold truncate">{formatUGX(budgetMetrics.totalAllocated)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-muted-foreground">Unallocated</span>
              <span className="text-lg font-bold truncate">{formatUGX(Math.max(0, budgetMetrics.unallocated))}</span>
            </div>
          </div>

          {categoryPieChartData.length > 0 && (
            <div className="w-full px-0">
              <h3 className="text-m font-semibold mb-2 pt-2">Budget Allocation by Category</h3>
              <div className="w-full h-[200px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="40%"
                      outerRadius="70%"
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {categoryPieChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatUGX(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom 2-column legend */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                {categoryPieChartData.map((item, index) => {
                  const total = categoryPieChartData.reduce((sum, i) => sum + i.value, 0)
                  const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
                  return (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate">{item.name}: {percent}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          <div className="fixed bottom-6 right-6 z-20">
            <Dialog open={fabOpen} onOpenChange={setFabOpen}>
              <DialogTrigger asChild>
                <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setFabView("menu")}>
                  <Plus className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-[400px] mx-auto rounded-1xl">
                {fabView === "menu" && (
                  <>
                    <DialogHeader><DialogTitle>Add New</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-4">
                      <Button variant="outline" className="w-full justify-start h-12" onClick={() => { setGeneralLimit(generalBudget ? String(generalBudget.limitAmount) : ""); setFabView("budget"); }}>
                        <div className="text-left">
                          <p className="font-medium">Edit Total Budget</p>
                          {/* <p className="text-xs text-muted-foreground">Set your base spending limit</p> */}
                        </div>
                      </Button>

                      <Button variant="outline" className="w-full justify-start h-12" disabled={budgetMetrics.unallocated <= 0} onClick={() => setFabView("category")}>
                        <div className="text-left">
                          <p className="font-medium">Create Category</p>

                        </div>
                      </Button>
                      <div>

                        <p className="text-xs text-muted-foreground pt-2">
                          <strong>Note: </strong>
                          {budgetMetrics.unallocated <= 0
                            ? (budgetMetrics.totalAllocated > budgetMetrics.totalLimit
                              ? "Over-allocated! Increase total budget first"
                              : "No budget remaining")
                            : `Available allocatable amount ${formatUGX(budgetMetrics.unallocated)}`}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {fabView === "budget" && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Set General Budget</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fab-total-limit">Base Budget (UGX)</Label>
                        <Input id="fab-total-limit" type="number" placeholder="0" value={generalLimit} onChange={(e) => setGeneralLimit(e.target.value)} />
                        {generalBudget && (
                          <p className="text-xs text-muted-foreground">Current: {formatUGX(Number(generalBudget.limitAmount) || 0)}</p>
                        )}
                      </div>

                      {incomeSources && incomeSources.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="fab-include-income" checked={includeIncome} onCheckedChange={(checked) => { setIncludeIncome(checked as boolean); if (!checked) setSelectedIncomeIds([]); }} />
                            <Label htmlFor="fab-include-income" className="text-sm font-medium">Add income sources to budget</Label>
                          </div>
                          {includeIncome && (
                            <div className="space-y-2 pl-6">
                              {incomeSources.map((income) => (
                                <div key={income.$id} className="flex items-center space-x-2">
                                  <Checkbox id={`fab-income-${income.$id}`} checked={selectedIncomeIds.includes(income.$id)} onCheckedChange={(checked) => { if (checked) setSelectedIncomeIds([...selectedIncomeIds, income.$id]); else setSelectedIncomeIds(selectedIncomeIds.filter(id => id !== income.$id)); }} />
                                  <Label htmlFor={`fab-income-${income.$id}`} className="text-sm">{income.source}: {formatUGX(income.amount)}</Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                        Total Budget: {formatUGX((parseFloat(generalLimit) || 0) + totalIncome)}
                      </div>
                    </div>
                    <Button className="w-full" onClick={async () => { await handleSetGeneralBudget(); setFabOpen(false); setFabView("menu"); }} disabled={isAdding}>
                      {isAdding ? "Saving..." : "Save Budget"}
                    </Button>
                  </>
                )}

                {fabView === "category" && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Add Category Budget</DialogTitle>
                      <DialogDescription className="text-xs">
                        {budgetMetrics.unallocated > 0
                          ? `Allocate from ${formatUGX(budgetMetrics.unallocated)} remaining.`
                          : (budgetMetrics.totalAllocated > budgetMetrics.totalLimit
                            ? "Budget is over-allocated. Increase total budget before allocating more."
                            : "No budget remaining to allocate.")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fab-category">Category Name</Label>
                        <Input id="fab-category" placeholder="e.g. Food, Transport" value={category} onChange={(e) => setCategory(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="fab-limit">Budget Limit (UGX)</Label>
                        <Input id="fab-limit" type="number" placeholder="0" value={limit} onChange={(e) => setLimit(e.target.value)} />
                      </div>
                    </div>
                    <Button className="w-full" onClick={async () => { await handleAddCategoryBudget(); setFabOpen(false); setFabView("menu"); }} disabled={isAdding}>
                      {isAdding ? "Allocating..." : "Allocate Budget"}
                    </Button>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Spacer for mobile bottom actions */}
          <div className="md:hidden h-24" />

        </div>
      </main>
    </div>
  )
}
