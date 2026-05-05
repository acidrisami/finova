'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarNav, BottomNav } from "@/components/nav-main"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Trash2, Plus, Download, MoreHorizontal } from "lucide-react"
import { useUser } from "@/appwrite"
import { IncomeService, BudgetService, type IncomeDocument, type BudgetDocument } from "@/appwrite/database"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatUGX } from "@/lib/utils"

export default function IncomePage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [incomeSources, setIncomeSources] = useState<IncomeDocument[]>([])
  const [isIncomeLoading, setIsIncomeLoading] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [selectedIncomes, setSelectedIncomes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    const fetchIncome = async () => {
      setIsIncomeLoading(true)
      try {
        const sources = await IncomeService.getUserIncome(user.$id)
        setIncomeSources(sources)
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load income sources" })
      } finally {
        setIsIncomeLoading(false)
      }
    }

    fetchIncome()
  }, [user, toast])

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const handleAddIncome = async () => {
    if (!user || !source || !amount) return
    setIsAdding(true)
    try {
      await IncomeService.createIncome({
        userId: user.$id,
        source,
        amount: parseFloat(amount)
      })
      setSource("")
      setAmount("")

      // Refresh the income sources
      const sources = await IncomeService.getUserIncome(user.$id)
      setIncomeSources(sources)

      toast({ title: "Income source added" })
    } catch (error: any) {
      console.error('Failed to add income:', error)
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to add income source" })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return

    try {
      // Fetch budget data to check if deletion would cause issues
      const budgets = await BudgetService.getUserBudgets(user.$id)
      const generalBudget = budgets.find(b => b.categoryId === "general")
      const categoryBudgets = budgets.filter(b => b.categoryId !== "general")

      // Calculate current totals
      const totalAllocated = categoryBudgets.reduce((sum, b) => sum + (Number(b.limitAmount) || 0), 0)
      const currentTotalIncome = incomeSources?.reduce((sum, inc) =>
        sum + (Number(inc.amount) || 0), 0) || 0

      // Find the income being deleted
      const incomeToDelete = incomeSources.find(inc => inc.$id === id)
      if (!incomeToDelete) return

      const incomeAmount = Number(incomeToDelete.amount) || 0

      // Check if this income was likely included in the budget
      // If general budget exists and has income added, we need to check
      if (generalBudget) {
        const baseLimit = Number(generalBudget.limitAmount) || 0
        // Calculate what the new total would be after deleting this income
        const newTotalIncome = currentTotalIncome - incomeAmount
        const newTotalBudget = baseLimit + newTotalIncome

        // Check if deleting would make allocated exceed new total
        if (totalAllocated > newTotalBudget) {
          toast({
            variant: "destructive",
            title: "Cannot Delete Income",
            description: `Deleting this income would leave your budget over-allocated by ${formatUGX(totalAllocated - newTotalBudget)}. Please increase your total budget or reduce category allocations before deleting this income.`,
            duration: 6000
          })
          return
        }
      }

      await IncomeService.deleteIncome(id)

      // Refresh the income sources
      const sources = await IncomeService.getUserIncome(user.$id)
      setIncomeSources(sources)

      toast({ title: "Income source removed" })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove income source" })
    }
  }

  const handleSelectAll = () => {
    if (selectedIncomes.size === incomeSources.length) {
      setSelectedIncomes(new Set())
    } else {
      setSelectedIncomes(new Set(incomeSources.map(i => i.$id)))
    }
  }

  const handleSelectIncome = (id: string) => {
    const newSelected = new Set(selectedIncomes)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIncomes(newSelected)
  }

  const handleBulkDelete = async () => {
    if (!user) return
    try {
      for (const id of selectedIncomes) {
        await IncomeService.deleteIncome(id)
      }
      const sources = await IncomeService.getUserIncome(user.$id)
      setIncomeSources(sources)
      setSelectedIncomes(new Set())
      toast({ title: `${selectedIncomes.size} income sources deleted` })
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete" })
    }
  }

  const handleExportCSV = () => {
    if (incomeSources.length === 0) {
      toast({ variant: "destructive", title: "No records to export" })
      return
    }

    const allRecords = incomeSources.map(income => ({
      Source: income.source,
      Amount: income.amount,
      Date: new Date(income.$createdAt).toLocaleDateString()
    }))

    const headers = ['Source', 'Amount', 'Date']
    const csvContent = [
      headers.join(','),
      ...allRecords.map(row => [
        `"${row.Source}"`,
        row.Amount,
        row.Date
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `income_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast({ title: "CSV exported successfully" })
  }

  const totalIncome = incomeSources?.reduce((sum, inc) =>
    sum + (Number(inc.amount) || 0), 0) || 0

  if (isUserLoading || isIncomeLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />

      <main className="flex-1 md:mr-16 md:ml-16 p-3 md:p-8 mt-16 md:mt-0">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 w-full px-3 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Income</h2>
              <p className="text-sm md:text-base text-muted-foreground">Income sources & earnings.</p>
            </div>
          </div>

          {/* Mobile Stats Summary */}
          <div className="md:hidden space-y-3 p-3 bg-muted/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total Income</span>
              <span className="text-sm font-bold text-primary truncate">{formatUGX(totalIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Sources</span>
              <span className="text-sm font-bold">{incomeSources?.length || 0}</span>
            </div>
          </div>

          {/* Desktop Stats Display - Summary Stats */}
          <div className="hidden md:flex justify-between items-center p-4 bg-muted/20 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-muted-foreground">Total Income</span>
              <span className="text-lg font-bold text-primary truncate">{formatUGX(totalIncome)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold uppercase text-muted-foreground">Sources</span>
              <span className="text-lg font-bold truncate">{incomeSources?.length || 0}</span>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 ml-auto">
              {/* Bulk Actions Buttons */}
              {selectedIncomes.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIncomes.size === incomeSources.length && incomeSources.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {incomeSources.map((income) => (
                  <tr key={income.$id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIncomes.has(income.$id)}
                        onChange={() => handleSelectIncome(income.$id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <span className="text-foreground">{income.source}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(income.$createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-positive">
                        {formatUGX(income.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {incomeSources.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p>No income sources yet. Click the + button to add one.</p>
              </div>
            )}
          </div>

          {/* Mobile View - Expandable Cards */}
          <div className="md:hidden space-y-3">
            {incomeSources.map((income) => (
              <Card key={income.$id} className="overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIncomes.has(income.$id)}
                    onChange={() => handleSelectIncome(income.$id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{income.source}</div>
                    <div className="text-sm text-muted-foreground">{new Date(income.$createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="font-bold text-positive">{formatUGX(income.amount)}</div>
                </div>
              </Card>
            ))}
            {incomeSources.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p>No income sources yet. Click the + button to add one.</p>
              </div>
            )}
          </div>

          {/* Floating Action Button */}
          <div className="fixed bottom-6 right-6 z-20">
            <Dialog open={fabOpen} onOpenChange={setFabOpen}>
              <DialogTrigger asChild>
                <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
                  <Plus className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-[400px] sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Income</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fab-source">Source</Label>
                    <Input
                      id="fab-source"
                      placeholder="e.g. Salary, Freelance"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fab-amount">Amount (UGX)</Label>
                    <Input
                      id="fab-amount"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={async () => { await handleAddIncome(); setFabOpen(false); }} disabled={isAdding || !source || !amount}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Income"}
                </Button>
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
