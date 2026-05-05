
'use client';

/**
 * @fileOverview Invoices Management Page.
 * Allows users to create, view, and manage client invoices.
 * Leverages InvoiceItemsManager for line item handling.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarNav, BottomNav } from "@/components/nav-main"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Loader2, Trash2, Wallet } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { StatsSkeleton } from "@/components/loading-states"
import { useUser } from "@/appwrite"
import { InvoiceService, ExpenseService, type InvoiceDocument } from "@/appwrite/database"
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
import { useToast } from "@/hooks/use-toast"
import { cn, formatUGX } from "@/lib/utils"

export default function InvoicesPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [clientName, setClientName] = useState("")
  const [amount, setAmount] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([])
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchInvoices = async () => {
      try {
        setIsInvoicesLoading(true)
        const invoicesData = await InvoiceService.getUserInvoices(user.$id)
        setInvoices(invoicesData)
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
        toast({ variant: "destructive", title: "Failed to load invoices" })
      } finally {
        setIsInvoicesLoading(false)
      }
    }

    fetchInvoices()
  }, [user, toast])

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const handleCreateInvoice = async () => {
    if (!user || !clientName || !amount) return
    setIsAdding(true)
    try {
      const invoiceAmount = parseFloat(amount)

      // Create the invoice (only use fields that exist in schema)
      await InvoiceService.createInvoice({
        userId: user.$id,
        clientName: clientName,
        totalAmount: invoiceAmount,
        issueDate: new Date().toISOString(),
      })

      // Automatically add to expenses
      await ExpenseService.createExpense({
        userId: user.$id,
        source: `Invoice - ${clientName}`,
        amount: invoiceAmount,
        description: `Invoice created for ${clientName}`,
      })

      // Refresh invoices list
      const invoicesData = await InvoiceService.getUserInvoices(user.$id)
      setInvoices(invoicesData)

      setClientName("")
      setAmount("")
      toast({ title: "Invoice created and added to expenses" })
    } catch (error) {
      console.error('Invoice creation error:', error)
      toast({ variant: "destructive", title: "Failed to create invoice" })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    try {
      await InvoiceService.deleteInvoice(id)
      // Refresh the list
      const invoicesData = await InvoiceService.getUserInvoices(user.$id)
      setInvoices(invoicesData)
      toast({ title: "Invoice deleted" })
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete invoice" })
    }
  }

  const toggleStatus = async (invoice: InvoiceDocument) => {
    if (!user) return
    try {
      const newStatus = invoice.status === 'paid' ? 'pending' : 'paid'
      await InvoiceService.updateInvoice(invoice.$id, {
        status: newStatus
      })
      // Refresh the list
      const invoicesData = await InvoiceService.getUserInvoices(user.$id)
      setInvoices(invoicesData)
      toast({ title: `Marked as ${newStatus}` })
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update status" })
    }
  }

  if (isUserLoading || isInvoicesLoading) {
    return (
      <div className="flex min-h-screen bg-background pb-20 md:pb-0">
        <div className="hidden md:block w-16 md:w-64 fixed inset-y-0">
          <SidebarNav />
        </div>
        <main className="flex-1 md:mr-16 md:ml-16 p-4 md:p-8 mt-16 md:mt-0">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-9 w-48 bg-muted rounded animate-pulse mb-2" />
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <StatsSkeleton count={2} />
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background pb-20 md:pb-0">
      <div className="hidden md:block w-64 fixed inset-y-0">
        <SidebarNav />
      </div>

      <main className="flex-1 md:mr-16 md:ml-16 p-4 md:p-8 mt-16 md:mt-0">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
              <p className="text-muted-foreground">Client billing & payments.</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button data-dialog-trigger="invoice">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="md:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>New Invoice</DialogTitle>
                  <DialogDescription>Add client name to start.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client Name</Label>
                    <Input
                      id="client"
                      placeholder="e.g. Acme Corp"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount (UGX)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateInvoice} disabled={isAdding || !clientName || !amount}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {!invoices || invoices.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No invoices yet"
                description="Create your first invoice to start tracking client billing and payments."
                action={{
                  label: 'Create Invoice',
                  onClick: () => document.querySelector<HTMLButtonElement>('[data-dialog-trigger="invoice"]')?.click()
                }}
              />
            ) : (
              invoices.map((invoice) => (
                <Card key={invoice.$id} className="shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-lg flex items-center justify-center transition-colors",
                          invoice.status === 'paid' ? "bg-positive/10" : "bg-primary/5"
                        )}>
                          <FileText className={cn("h-6 w-6", invoice.status === 'paid' ? "text-positive" : "text-primary")} />
                        </div>
                        <div>
                          <h4 className="font-bold">{invoice.clientName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {invoice.invoiceNumber || `INV-${invoice.$id.slice(-6).toUpperCase()}`} • {new Date(invoice.issueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <div className="text-right min-w-[120px]">
                          <p className="font-bold text-lg text-white">{formatUGX(invoice.totalAmount)}</p>
                          <Badge
                            variant={invoice.status === 'paid' ? 'secondary' : 'outline'}
                            className="capitalize cursor-pointer select-none"
                            onClick={() => toggleStatus(invoice)}
                          >
                            {invoice.status || 'pending'}
                          </Badge>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(invoice.$id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
