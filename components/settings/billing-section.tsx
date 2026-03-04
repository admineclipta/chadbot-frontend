"use client";

import { Card, CardBody, CardHeader, Chip, Skeleton } from "@heroui/react";
import { FileText } from "lucide-react";
import { useState } from "react";
import type { User } from "@/lib/types";
import type { BillingInvoiceDto } from "@/lib/api-types";
import { canViewBilling } from "@/lib/permissions";
import { useApi } from "@/hooks/use-api";
import { apiService } from "@/lib/api";
import { formatDateTime, parseApiTimestamp } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ApiErrorAlert from "@/components/shared/api-error-alert";

interface BillingSectionProps {
  currentUser: User | null;
}

function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined) return "-";
  return formatDateTime(parseApiTimestamp(value));
}

export default function BillingSection({ currentUser }: BillingSectionProps) {
  const isMobile = useIsMobile();
  const [invoicesPage] = useState(0);
  const canSeeBilling = canViewBilling(currentUser);

  const {
    data: billingInvoices,
    loading: billingInvoicesLoading,
    error: billingInvoicesError,
    refetch: refetchBillingInvoices,
  } = useApi(
    (signal) =>
      canSeeBilling
        ? apiService.getBillingInvoices(invoicesPage, 20, signal)
        : Promise.resolve([]),
    [canSeeBilling, invoicesPage],
  );

  if (!canSeeBilling) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardBody className="py-8 text-center text-slate-600 dark:text-slate-300">
          Solo owner/admin pueden acceder a la facturación.
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <p className="font-semibold text-slate-900 dark:text-white">Facturación</p>
      </CardHeader>
      <CardBody>
        {billingInvoicesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : billingInvoicesError ? (
          <ApiErrorAlert
            title="No se pudieron cargar las facturas"
            description={billingInvoicesError}
            onRetry={refetchBillingInvoices}
          />
        ) : (billingInvoices?.length || 0) === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No hay facturas disponibles.
          </p>
        ) : isMobile ? (
          <div className="space-y-2">
            {(billingInvoices || []).map((invoice: BillingInvoiceDto) => (
              <div
                key={invoice.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-700/30"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </p>
                  <Chip
                    color={
                      invoice.status === "paid"
                        ? "success"
                        : invoice.status === "overdue"
                          ? "danger"
                          : "warning"
                    }
                    variant="flat"
                  >
                    {invoice.status}
                  </Chip>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {formatCurrency(invoice.total, invoice.currencyCode)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vence: {formatDate(invoice.dueAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pb-2">Factura</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {(billingInvoices || []).map((invoice: BillingInvoiceDto) => (
                  <tr key={invoice.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2 text-slate-900 dark:text-white">{invoice.invoiceNumber}</td>
                    <td className="py-2">
                      <Chip
                        color={
                          invoice.status === "paid"
                            ? "success"
                            : invoice.status === "overdue"
                              ? "danger"
                              : "warning"
                        }
                        variant="flat"
                      >
                        {invoice.status}
                      </Chip>
                    </td>
                    <td className="py-2 text-slate-700 dark:text-slate-300">
                      {formatCurrency(invoice.total, invoice.currencyCode)}
                    </td>
                    <td className="py-2 text-slate-700 dark:text-slate-300">
                      {formatDate(invoice.dueAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

