'use client';

/**
 * @fileOverview Invoice Viewer Component.
 * Displays invoice details without editing capabilities.
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUGX } from "@/lib/utils";
import { InvoiceService, type InvoiceDocument } from "@/appwrite/database";

interface InvoiceItemsManagerProps {
  invoiceId: string;
  userId: string;
}

export function InvoiceItemsManager({ invoiceId, userId }: InvoiceItemsManagerProps) {
  const [invoice, setInvoice] = useState<InvoiceDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setIsLoading(true);
        const invoiceData = await InvoiceService.getUserInvoices(userId).then(
          invoices => invoices.find(inv => inv.$id === invoiceId) || null
        );
        setInvoice(invoiceData);
      } catch (error) {
        console.error("Failed to load invoice:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Invoice not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Invoice Details</h3>
        <Badge variant={invoice.status === 'paid' ? 'secondary' : 'outline'}>
          {invoice.status}
        </Badge>
      </div>

      <div className="grid gap-4">
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">Client</h4>
          <p className="font-semibold">{invoice.clientName}</p>
        </div>

        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">Invoice Number</h4>
          <p className="font-mono">{invoice.invoiceNumber}</p>
        </div>

        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">Amount</h4>
          <p className="text-2xl font-bold">{formatUGX(invoice.totalAmount)}</p>
        </div>

        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">Date</h4>
          <p>{new Date(invoice.$createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
