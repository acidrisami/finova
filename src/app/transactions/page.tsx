'use client';

/**
 * @fileOverview Records - Central hub for tracking expenses and invoices.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarNav, BottomNav } from "@/components/nav-main"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Filter, Loader2, Trash2, FileText, Plus, Download, MoreHorizontal } from "lucide-react"
import { cn, formatUGX } from "@/lib/utils"
import { useUser } from "@/appwrite"
import { BudgetService, ExpenseService, InvoiceService } from "@/appwrite/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ExpenseDocument, InvoiceDocument, BudgetDocument } from "@/appwrite/database"

// Record Card Component for mobile expandable list
function RecordCard({ record, isSelected, onToggle }: {
  record: any,
  isSelected: boolean,
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const isExpense = record.type === 'expense'
  const name = isExpense ? record.source : record.clientName
  const description = isExpense ? (record.description || "None") : (record.invoiceNumber || "None")
  const amount = isExpense ? record.amount : record.totalAmount

  return (
    <Card className="overflow-hidden">
      <div
        className="p-3 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="h-4 w-4 rounded border-gray-300"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
              {isExpense ? 'Expense' : 'Invoice'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">{formatUGX(amount)}</div>
        </div>
        <div className="text-muted-foreground">
          {expanded ? '▲' : '▼'}
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-0 text-sm space-y-1 border-t bg-muted/20">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Client:</span>
            <span>None</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Description:</span>
            <span>{description}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Date:</span>
            <span>{new Date(record.$createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function TransactionsPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [isMounted, setIsMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [isAddingInvoice, setIsAddingInvoice] = useState(false)

  // Desktop dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogView, setDialogView] = useState<"menu" | "expense" | "invoice">("menu")

  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [clientName, setClientName] = useState("")
  const [invoiceAmount, setInvoiceAmount] = useState("")

  useEffect(() => {
    setIsMounted(true)
    const now = new Date()
  }, [])

  const [transactions, setTransactions] = useState<ExpenseDocument[]>([])
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([])
  const [budgets, setBudgets] = useState<BudgetDocument[]>([])
  const [isTransLoading, setIsTransLoading] = useState(true)
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(true)
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set())
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        setIsTransLoading(true)
        setIsInvoicesLoading(true)

        const [expensesData, invoicesData, budgetsData] = await Promise.all([
          ExpenseService.getUserExpenses(user.$id),
          InvoiceService.getUserInvoices(user.$id),
          BudgetService.getUserBudgets(user.$id)
        ])

        setTransactions(expensesData)
        setInvoices(invoicesData)
        setBudgets(budgetsData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast({ variant: "destructive", title: "Failed to load data" })
      } finally {
        setIsTransLoading(false)
        setIsInvoicesLoading(false)
      }
    }

    fetchData()
  }, [user, toast])

  const categories = Array.from(new Set(budgets?.filter(b => b.categoryId !== 'general').map(b => b.category) || []))

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const filteredTransactions = transactions?.filter(t => {
    const matchesSearch = t.source?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(t.source)
    return matchesSearch && matchesCategory
  }) || []

  const filteredInvoices = invoices?.filter(i => {
    const matchesSearch = i.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      i.$id?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(i.categoryName || 'Invoices')
    return matchesSearch && matchesCategory
  }) || []

  const handleAddTransaction = async () => {
    if (!user || !amount || !category) return
    setIsAddingExpense(true)

    try {
      await ExpenseService.createExpense({
        userId: user.$id,
        source: category,
        amount: parseFloat(amount),
        description: description || undefined,
      })

      // Check if there's a budget for this category and reduce it
      const categoryId = category.toLowerCase().replace(/\s+/g, '-')
      const existingBudget = await BudgetService.getBudgetByCategory(user.$id, categoryId)

      if (existingBudget) {
        const currentLimit = Number(existingBudget.limitAmount) || 0
        const expenseAmount = parseFloat(amount)
        const newLimit = Math.max(0, currentLimit - expenseAmount)

        if (newLimit < currentLimit) {
          await BudgetService.updateBudget(existingBudget.$id, {
            userId: user.$id,
            category: existingBudget.category,
            categoryId: existingBudget.categoryId,
            limitAmount: newLimit
          })
          toast({
            title: "Expense recorded",
            description: `Budget for ${category} reduced by ${formatUGX(expenseAmount)}`
          })
        } else {
          toast({ title: "Expense recorded" })
        }
      } else {
        toast({ title: "Expense recorded" })
      }

      setAmount("")
      setCategory("")
      setDescription("")

      // Refresh expenses and budgets list
      const [expensesData, budgetsData] = await Promise.all([
        ExpenseService.getUserExpenses(user.$id),
        BudgetService.getUserBudgets(user.$id)
      ])
      setTransactions(expensesData)
      setBudgets(budgetsData)
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to record expense" })
    } finally {
      setIsAddingExpense(false)
    }
  }

  const handleCreateInvoice = async () => {
    if (!user || !clientName || !invoiceAmount) return
    setIsAddingInvoice(true)

    try {
      await InvoiceService.createInvoice({
        userId: user.$id,
        clientName: clientName,
        totalAmount: parseFloat(invoiceAmount),
        issueDate: new Date().toISOString(),
      })
      setClientName("")
      setInvoiceAmount("")
      toast({ title: "Invoice created" })
      // Refresh invoices list
      const invoicesData = await InvoiceService.getUserInvoices(user.$id)
      setInvoices(invoicesData)
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to create invoice" })
    } finally {
      setIsAddingInvoice(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return
    try {
      await ExpenseService.deleteExpense(id)
      toast({ title: "Expense deleted" })
      // Refresh expenses list
      const expensesData = await ExpenseService.getUserExpenses(user.$id)
      setTransactions(expensesData)
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete expense" })
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    if (!user) return
    try {
      await InvoiceService.deleteInvoice(id)
      toast({ title: "Invoice deleted" })
      // Refresh invoices list
      const invoicesData = await InvoiceService.getUserInvoices(user.$id)
      setInvoices(invoicesData)
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete invoice" })
    }
  }

  // Expenses selection handlers
  const handleSelectAllExpenses = () => {
    if (selectedExpenses.size === filteredTransactions.length) {
      setSelectedExpenses(new Set())
    } else {
      setSelectedExpenses(new Set(filteredTransactions.map(t => t.$id)))
    }
  }

  const handleSelectExpense = (id: string) => {
    const newSelected = new Set(selectedExpenses)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedExpenses(newSelected)
  }

  const handleBulkDeleteExpenses = async () => {
    if (!user) return
    try {
      for (const id of selectedExpenses) {
        await ExpenseService.deleteExpense(id)
      }
      const expensesData = await ExpenseService.getUserExpenses(user.$id)
      setTransactions(expensesData)
      setSelectedExpenses(new Set())
      toast({ title: `${selectedExpenses.size} expenses deleted` })
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete expenses" })
    }
  }

  // Invoices selection handlers
  const handleSelectAllInvoices = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(i => i.$id)))
    }
  }

  const handleSelectInvoice = (id: string) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedInvoices(newSelected)
  }

  const handleBulkDeleteInvoices = async () => {
    if (!user) return
    try {
      for (const id of selectedInvoices) {
        await InvoiceService.deleteInvoice(id)
      }
      const invoicesData = await InvoiceService.getUserInvoices(user.$id)
      setInvoices(invoicesData)
      setSelectedInvoices(new Set())
      toast({ title: `${selectedInvoices.size} invoices deleted` })
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete invoices" })
    }
  }

  const handleExportCSV = () => {
    const allRecords = [
      ...filteredTransactions.map(t => ({
        Type: 'Expense',
        Source: t.source,
        Description: t.description,
        Amount: t.amount,
        Date: new Date(t.$createdAt).toLocaleDateString()
      })),
      ...filteredInvoices.map(i => ({
        Type: 'Invoice',
        Source: i.clientName,
        Description: i.invoiceNumber,
        Amount: i.totalAmount,
        Date: new Date(i.$createdAt).toLocaleDateString()
      }))
    ]

    if (allRecords.length === 0) {
      toast({ variant: "destructive", title: "No records to export" })
      return
    }

    const headers = ['Type', 'Source', 'Description', 'Amount', 'Date']
    const csvContent = [
      headers.join(','),
      ...allRecords.map(row => [
        row.Type,
        `"${row.Source}"`,
        `"${row.Description}"`,
        row.Amount,
        row.Date
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `records_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast({ title: "CSV exported successfully" })
  }

  if (isUserLoading || isTransLoading || isInvoicesLoading || !isMounted) {
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Records</h2>
          </div>

          {/* Mobile Top Bar - Search and Filter */}
          <div className="md:hidden flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-9 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className={cn("h-9 w-9 relative", selectedCategories.length > 0 && "border-primary")}>
                  <Filter className="h-4 w-4" />
                  {selectedCategories.length > 0 && <Badge className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px]">{selectedCategories.length}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Filters</p>
                    {selectedCategories.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])} className="text-xs">Clear</Button>}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat - ${cat}`}
                          checked={selectedCategories.includes(cat)}
                          onCheckedChange={checked => {
                            setSelectedCategories(prev => checked ? [...prev, cat] : prev.filter(c => c !== cat))
                          }}
                        />
                        <label htmlFor={`cat - ${cat}`} className="text-sm font-medium leading-none cursor-pointer">{cat}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Desktop View - Expenses and Invoices Tables */}
          <div className="hidden md:block space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search records..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className={cn("relative", selectedCategories.length > 0 && "border-primary")}>
                    <Filter className="h-4 w-4" />
                    {selectedCategories.length > 0 && <Badge className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px]">{selectedCategories.length}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">Filters</p>
                      {selectedCategories.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])} className="text-xs">Clear</Button>}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {categories.map(cat => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`desktop-cat-${cat}`}
                            checked={selectedCategories.includes(cat)}
                            onCheckedChange={checked => {
                              setSelectedCategories(prev => checked ? [...prev, cat] : prev.filter(c => c !== cat))
                            }}
                          />
                          <label htmlFor={`desktop-cat-${cat}`} className="text-sm font-medium leading-none cursor-pointer">{cat}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {/* Bulk Actions Buttons */}
            {(selectedExpenses.size > 0 || selectedInvoices.size > 0) && (
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { handleBulkDeleteExpenses(); handleBulkDeleteInvoices(); }}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}

            {/* Combined Records Table */}
            <div className="space-y-4">
              <div className="rounded-lg border overflow-x-auto md:overflow-hidden">
                <table className="w-full text-sm min-w-[600px] md:min-w-0">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={(selectedExpenses.size + selectedInvoices.size) === (filteredTransactions.length + filteredInvoices.length) && (filteredTransactions.length + filteredInvoices.length) > 0}
                          onChange={() => { handleSelectAllExpenses(); handleSelectAllInvoices(); }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Client</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Expenses */}
                    {filteredTransactions.map((t) => (
                      <tr key={`exp-${t.$id}`} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.has(t.$id)}
                            onChange={() => handleSelectExpense(t.$id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3">{t.source}</td>
                        <td className="p-3">Expense</td>
                        <td className="p-3">None</td>
                        <td className="p-3">{t.description || "None"}</td>
                        <td className="p-3">{formatUGX(t.amount)}</td>
                        <td className="p-3">{new Date(t.$createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {/* Invoices */}
                    {filteredInvoices.map((invoice) => (
                      <tr key={`inv-${invoice.$id}`} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.has(invoice.$id)}
                            onChange={() => handleSelectInvoice(invoice.$id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3">{invoice.clientName}</td>
                        <td className="p-3">Invoice</td>
                        <td className="p-3">None</td>
                        <td className="p-3">{invoice.invoiceNumber || "None"}</td>
                        <td className="p-3">{formatUGX(invoice.totalAmount)}</td>
                        <td className="p-3">{new Date(invoice.$createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && filteredInvoices.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No records found. Click the + button to add one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile View - Expandable Cards */}
          <div className="md:hidden space-y-3">
            {/* Mobile Action Buttons */}
            {(selectedExpenses.size > 0 || selectedInvoices.size > 0) && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { handleBulkDeleteExpenses(); handleBulkDeleteInvoices(); }}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
            {/* All Records */}
            {[...filteredTransactions.map(t => ({ ...t, type: 'expense', id: t.$id })), ...filteredInvoices.map(i => ({ ...i, type: 'invoice', id: i.$id }))].map((record) => (
              <RecordCard
                key={`${record.type}-${record.id}`}
                record={record}
                isSelected={record.type === 'expense' ? selectedExpenses.has(record.id) : selectedInvoices.has(record.id)}
                onToggle={() => record.type === 'expense' ? handleSelectExpense(record.id) : handleSelectInvoice(record.id)}
              />
            ))}
            {filteredTransactions.length === 0 && filteredInvoices.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p>No records found. Click the + button to add one.</p>
              </div>
            )}
          </div>

          {/* Floating Action Button - Add Expense/Invoice */}
          <Button size="icon" className="h-14 w-14 rounded-full shadow-lg fixed right-6 bottom-6 z-50" onClick={() => { setDialogOpen(true); setDialogView('menu'); }}>
            <Plus className="h-6 w-6" />
          </Button>

          {/* Desktop Add Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-[400px] sm:max-w-[425px]">
              {dialogView === 'menu' && (
                <>
                  <DialogHeader><DialogTitle>Add New</DialogTitle></DialogHeader>
                  <div className="grid gap-3 py-4">
                    <Button variant="outline" className="w-full justify-start h-12" onClick={() => setDialogView('expense')}>
                      <div className="text-left">
                        <div className="font-medium">Expense</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-12" onClick={() => setDialogView('invoice')}>
                      <div className="text-left">
                        <div className="font-medium">Invoice</div>
                      </div>
                    </Button>
                  </div>
                </>
              )}

              {dialogView === 'expense' && (
                <>
                  <DialogHeader>
                    <DialogTitle>New Expense</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dlg-amount">Amount (UGX)</Label>
                      <Input id="dlg-amount" type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dlg-category">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="dlg-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dlg-desc">Description</Label>
                      <Input id="dlg-desc" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={async () => { await handleAddTransaction(); setDialogOpen(false); setDialogView('menu'); }} disabled={isAddingExpense}>Save</Button>
                </>
              )}

              {dialogView === 'invoice' && (
                <>
                  <DialogHeader>
                    <DialogTitle>New Invoice</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    <div className="grid gap-2">
                      <Label>Client</Label>
                      <Input value={clientName} onChange={e => setClientName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Amount (UGX)</Label>
                      <Input type="number" placeholder="0" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={async () => { await handleCreateInvoice(); setDialogOpen(false); setDialogView('menu'); }} disabled={isAddingInvoice || !clientName || !invoiceAmount}>Create</Button>
                </>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </div>
  )
}