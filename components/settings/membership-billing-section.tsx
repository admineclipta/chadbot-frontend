"use client";

import { useMemo, useState } from "react";
import {
  BadgeAlert,
  CalendarClock,
  CreditCard,
  FileText,
  Loader2,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
} from "@heroui/react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import type {
  BillingInvoiceDto,
  MembershipPlanCatalogItemDto,
} from "@/lib/api-types";
import type { User } from "@/lib/types";
import {
  canManageMembershipBilling,
  canViewBilling,
  canViewMembership,
} from "@/lib/permissions";
import { useApi } from "@/hooks/use-api";
import { useIsMobile } from "@/hooks/use-mobile";
import ApiErrorAlert from "@/components/shared/api-error-alert";
import { formatDateTime, parseApiTimestamp } from "@/lib/utils";
import {
  formatFeatureLimit,
  getFeatureDescription,
  getFeatureTitle,
} from "@/lib/membership-features";

interface MembershipBillingSectionProps {
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

function getUsageColor(pct: number): string {
  if (pct >= 120) return "bg-red-600";
  if (pct >= 100) return "bg-orange-500";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function MembershipBillingSection({
  currentUser,
}: MembershipBillingSectionProps) {
  const isMobile = useIsMobile();
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [alertsPage, setAlertsPage] = useState(0);
  const [invoicesPage, setInvoicesPage] = useState(0);
  const [planToChange, setPlanToChange] = useState<MembershipPlanCatalogItemDto | null>(null);
  const [changePlanLoading, setChangePlanLoading] = useState(false);

  const canSeeMembership = canViewMembership(currentUser);
  const canManage = canManageMembershipBilling(currentUser);
  const canSeeBilling = canViewBilling(currentUser);

  const {
    data: membershipCurrent,
    loading: membershipCurrentLoading,
    error: membershipCurrentError,
    refetch: refetchMembershipCurrent,
  } = useApi(
    (signal) =>
      canSeeMembership
        ? apiService.getMembershipCurrent(signal)
        : Promise.resolve(null),
    [canSeeMembership],
  );

  const {
    data: membershipUsage,
    loading: membershipUsageLoading,
    error: membershipUsageError,
    refetch: refetchMembershipUsage,
  } = useApi(
    (signal) =>
      canSeeMembership ? apiService.getMembershipUsage(signal) : Promise.resolve(null),
    [canSeeMembership],
  );

  const {
    data: operationsSummary,
    loading: operationsSummaryLoading,
    error: operationsSummaryError,
    refetch: refetchOperationsSummary,
  } = useApi(
    (signal) =>
      canSeeMembership
        ? apiService.getMembershipOperationsSummary(10, 10, signal)
        : Promise.resolve(null),
    [canSeeMembership],
  );

  const {
    data: usageAlerts,
    loading: usageAlertsLoading,
    error: usageAlertsError,
    refetch: refetchUsageAlerts,
  } = useApi(
    (signal) =>
      canSeeMembership
        ? apiService.getMembershipUsageAlerts(alertsPage, 20, signal)
        : Promise.resolve([]),
    [canSeeMembership, alertsPage],
  );

  const {
    data: membershipPlans,
    loading: membershipPlansLoading,
    error: membershipPlansError,
    refetch: refetchMembershipPlans,
  } = useApi(
    (signal) =>
      canManage
        ? apiService.getMembershipPlans(currency, signal)
        : Promise.resolve(null),
    [canManage, currency],
  );

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

  const featureUsage = useMemo(() => {
    if (membershipUsage?.features?.length) return membershipUsage.features;
    return membershipCurrent?.features || [];
  }, [membershipCurrent?.features, membershipUsage?.features]);

  const openAlertsCount = operationsSummary?.openAlertsCount ?? 0;

  const handlePlanChangeConfirm = async () => {
    if (!planToChange) return;
    try {
      setChangePlanLoading(true);
      await apiService.requestMembershipPlanChange({
        targetPlanCode: planToChange.planCode,
        reason: "Cambio solicitado desde frontend",
      });
      toast.success("Cambio de plan solicitado. Se aplicará en el próximo ciclo.");
      setPlanToChange(null);
      await Promise.all([
        refetchMembershipCurrent(),
        refetchMembershipUsage(),
        refetchMembershipPlans(),
        refetchUsageAlerts(),
        refetchOperationsSummary(),
      ]);
    } catch (error) {
      console.error("Error requesting plan change:", error);
      toast.error("No se pudo solicitar el cambio de plan");
    } finally {
      setChangePlanLoading(false);
    }
  };

  if (!canSeeMembership) {
    return (
      <div className="space-y-4">
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardBody className="py-8 text-center text-slate-600 dark:text-slate-300">
            No tienes permisos para visualizar membresía y facturación.
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Membresía y Facturación
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Estado de tu plan, consumo de features, alertas y facturación del tenant.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={currency === "ARS" ? "solid" : "flat"}
                color={currency === "ARS" ? "primary" : "default"}
                onPress={() => setCurrency("ARS")}
              >
                ARS
              </Button>
              <Button
                size="sm"
                variant={currency === "USD" ? "solid" : "flat"}
                color={currency === "USD" ? "primary" : "default"}
                onPress={() => setCurrency("USD")}
              >
                USD
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <p className="font-semibold text-slate-900 dark:text-white">Plan actual</p>
        </CardHeader>
        <CardBody>
          {membershipCurrentLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-1/3 rounded-lg" />
              <Skeleton className="h-5 w-2/3 rounded-lg" />
              <Skeleton className="h-5 w-1/2 rounded-lg" />
            </div>
          ) : membershipCurrentError ? (
            <ApiErrorAlert
              title="No se pudo cargar la membresía actual"
              description={membershipCurrentError}
              onRetry={refetchMembershipCurrent}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-slate-500 dark:text-slate-400">Plan</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {membershipCurrent?.planName || "-"} ({membershipCurrent?.planCode || "-"})
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-slate-500 dark:text-slate-400">Versión / Estado</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  v{membershipCurrent?.planVersion ?? "-"} - {membershipCurrent?.subscriptionStatus || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-slate-500 dark:text-slate-400">Periodo actual</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(membershipCurrent?.periodStartAt)} a {formatDate(membershipCurrent?.periodEndAt)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-slate-500 dark:text-slate-400">Próxima renovación</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(membershipCurrent?.nextRenewalAt)}
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <p className="font-semibold text-slate-900 dark:text-white">Consumo por feature</p>
        </CardHeader>
        <CardBody>
          {membershipUsageLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : membershipUsageError ? (
            <ApiErrorAlert
              title="No se pudo cargar el consumo"
              description={membershipUsageError}
              onRetry={refetchMembershipUsage}
            />
          ) : featureUsage.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Sin datos de consumo para este periodo.</p>
          ) : (
            <div className="space-y-3">
              {featureUsage.map((feature) => {
                const pct = feature.percentageUsed ?? 0;
                const width = Math.max(0, Math.min(pct, 140));
                return (
                  <div
                    key={feature.featureKey}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-700/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{getFeatureTitle(feature)}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {feature.consumedValue} / {feature.limitValue} {feature.limitUnit}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{getFeatureDescription(feature)}</p>
                      </div>
                      <Chip color={pct >= 100 ? "danger" : pct >= 80 ? "warning" : "success"} variant="flat">
                        {pct.toFixed(2)}%
                      </Chip>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className={`h-full ${getUsageColor(pct)}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardHeader className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BadgeAlert className="h-4 w-4 text-primary" />
            <p className="font-semibold text-slate-900 dark:text-white">Alertas de uso</p>
          </div>
          {operationsSummaryLoading ? (
            <Skeleton className="h-6 w-16 rounded-full" />
          ) : (
            <Chip color={openAlertsCount > 0 ? "warning" : "success"} variant="flat">
              Abiertas: {openAlertsCount}
            </Chip>
          )}
        </CardHeader>
        <CardBody>
          {usageAlertsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : usageAlertsError || operationsSummaryError ? (
            <ApiErrorAlert
              title="No se pudieron cargar las alertas"
              description={usageAlertsError || operationsSummaryError || "Error desconocido"}
              onRetry={() => {
                void refetchUsageAlerts();
                void refetchOperationsSummary();
              }}
            />
          ) : (usageAlerts?.length || 0) === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No hay alertas recientes.</p>
          ) : (
            <div className="space-y-2">
              {usageAlerts?.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-700/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {getFeatureTitle({
                        featureKey: alert.featureKey,
                      })}{" "}
                      - {alert.thresholdPct}%
                    </p>
                    <Chip color={alert.status === "open" ? "warning" : "success"} variant="flat">
                      {alert.status}
                    </Chip>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Periodo: {alert.periodKey} | Creada: {formatDate(alert.createdAt)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setAlertsPage((prev) => Math.max(0, prev - 1))}
                  isDisabled={alertsPage === 0}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setAlertsPage((prev) => prev + 1)}
                  isDisabled={(usageAlerts?.length || 0) < 20}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {canManage && (
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <p className="font-semibold text-slate-900 dark:text-white">
              Catálogo de planes ({currency})
            </p>
          </CardHeader>
          <CardBody>
            {membershipPlansLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-52 w-full rounded-xl" />
                ))}
              </div>
            ) : membershipPlansError ? (
              <ApiErrorAlert
                title="No se pudieron cargar los planes"
                description={membershipPlansError}
                onRetry={refetchMembershipPlans}
              />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {(membershipPlans?.plans || []).map((plan) => {
                  const selectedPrice = plan.prices.find((price) => price.currencyCode === currency);
                  return (
                    <div
                      key={plan.planId}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-700/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{plan.planName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{plan.planCode}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {plan.isCurrent && <Chip color="primary" variant="flat">Actual</Chip>}
                          {plan.isScheduled && <Chip color="secondary" variant="flat">Programado</Chip>}
                          {plan.visibilityScope === "internal" && (
                            <Chip color="default" variant="flat">Interno</Chip>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {plan.description || "Sin descripción"}
                      </p>
                      <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                        {selectedPrice
                          ? formatCurrency(selectedPrice.amount, selectedPrice.currencyCode)
                          : "Precio no disponible"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedPrice?.billingPeriod || "monthly"}
                      </p>
                      <div className="mt-3 space-y-1">
                        {plan.features.slice(0, 3).map((feature) => (
                          <p key={feature.featureKey} className="text-xs text-slate-600 dark:text-slate-300">
                            {formatFeatureLimit(feature.limitValue, feature.limitUnit)} - {getFeatureTitle(feature)}
                          </p>
                        ))}
                      </div>
                      <Button
                        className="mt-4 w-full"
                        color="primary"
                        variant="flat"
                        isDisabled={!plan.canSelect || plan.isCurrent || plan.isScheduled || changePlanLoading}
                        onPress={() => setPlanToChange(plan)}
                      >
                        Solicitar cambio de plan
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {canSeeBilling && (
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
              <p className="text-sm text-slate-600 dark:text-slate-300">No hay facturas disponibles.</p>
            ) : isMobile ? (
              <div className="space-y-2">
                {(billingInvoices || []).map((invoice: BillingInvoiceDto) => (
                  <div
                    key={invoice.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-700/30"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900 dark:text-white">{invoice.invoiceNumber}</p>
                      <Chip
                        color={invoice.status === "paid" ? "success" : invoice.status === "overdue" ? "danger" : "warning"}
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
                            color={invoice.status === "paid" ? "success" : invoice.status === "overdue" ? "danger" : "warning"}
                            variant="flat"
                          >
                            {invoice.status}
                          </Chip>
                        </td>
                        <td className="py-2 text-slate-700 dark:text-slate-300">
                          {formatCurrency(invoice.total, invoice.currencyCode)}
                        </td>
                        <td className="py-2 text-slate-700 dark:text-slate-300">{formatDate(invoice.dueAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(billingInvoices?.length || 0) > 0 && (
              <div className="flex items-center justify-end gap-2 pt-3">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setInvoicesPage((prev) => Math.max(0, prev - 1))}
                  isDisabled={invoicesPage === 0}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setInvoicesPage((prev) => prev + 1)}
                  isDisabled={(billingInvoices?.length || 0) < 20}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {canManage && (
        <Card className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="font-semibold text-amber-800 dark:text-amber-200">Mercado Pago</p>
          </CardHeader>
          <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Integración en construcción. Próximamente podrás adherir métodos de pago desde esta pantalla.
            </p>
            <Button color="warning" variant="flat" isDisabled>
              En construcción
            </Button>
          </CardBody>
        </Card>
      )}

      <Modal isOpen={Boolean(planToChange)} onClose={() => setPlanToChange(null)}>
        <ModalContent>
          <ModalHeader>Confirmar cambio de plan</ModalHeader>
          <ModalBody>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Vas a solicitar el cambio al plan{" "}
              <span className="font-semibold">{planToChange?.planName}</span>.
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              El cambio se aplicará en el próximo ciclo.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setPlanToChange(null)} isDisabled={changePlanLoading}>
              Cancelar
            </Button>
            <Button color="primary" onPress={handlePlanChangeConfirm} isDisabled={changePlanLoading}>
              {changePlanLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Solicitando...
                </span>
              ) : (
                "Confirmar"
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
