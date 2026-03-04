"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Skeleton,
} from "@heroui/react";
import { BadgeAlert, BarChart3, ChevronDown, Sparkles } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/hooks/use-api";
import { apiService } from "@/lib/api";
import type { MembershipFeatureUsageDto } from "@/lib/api-types";
import type { User } from "@/lib/types";
import { canManageMembershipBilling } from "@/lib/permissions";
import { formatDateTime, parseApiTimestamp } from "@/lib/utils";
import ApiErrorAlert from "@/components/shared/api-error-alert";
import { getFeatureDescription, getFeatureTitle } from "@/lib/membership-features";

interface UsageViewProps {
  currentUser: User | null;
  onOpenPlans: () => void;
}

interface UsageRingProps {
  pct: number;
}

function UsageRing({ pct }: UsageRingProps) {
  const normalized = Math.max(0, Math.min(pct, 100));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;

  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11">
      <circle cx="22" cy="22" r={radius} className="fill-none stroke-slate-200 dark:stroke-slate-700" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        className="fill-none stroke-primary"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

function getUsageColor(pct: number): "danger" | "warning" | "success" {
  if (pct >= 100) return "danger";
  if (pct >= 80) return "warning";
  return "success";
}

export default function UsageView({ currentUser, onOpenPlans }: UsageViewProps) {
  const canManage = canManageMembershipBilling(currentUser);

  const {
    data: membershipCurrent,
    loading: membershipCurrentLoading,
    error: membershipCurrentError,
    refetch: refetchMembershipCurrent,
  } = useApi((signal) => apiService.getMembershipCurrent(signal), []);

  const {
    data: membershipUsage,
    loading: membershipUsageLoading,
    error: membershipUsageError,
    refetch: refetchMembershipUsage,
  } = useApi((signal) => apiService.getMembershipUsage(signal), []);

  const {
    loading: operationsSummaryLoading,
    error: operationsSummaryError,
    refetch: refetchOperationsSummary,
  } = useApi((signal) => apiService.getMembershipOperationsSummary(10, 10, signal), []);

  const {
    data: usageAlerts,
    loading: usageAlertsLoading,
    error: usageAlertsError,
    refetch: refetchUsageAlerts,
  } = useApi((signal) => apiService.getMembershipUsageAlerts(0, 10, signal), []);

  const usageData = useMemo(() => {
    return membershipUsage?.features || membershipCurrent?.features || [];
  }, [membershipCurrent?.features, membershipUsage?.features]);

  const chartData = useMemo(
    () =>
      usageData.map((item) => {
        const consumed = Number(item.consumedValue || 0);
        const limit = Number(item.limitValue || 0);
        const pct = limit > 0 ? (consumed / limit) * 100 : 0;
        const consumedPct = Math.max(0, Math.min(pct, 100));
        const remainingPct = Math.max(0, 100 - consumedPct);

        return {
          name: getFeatureTitle(item),
          consumidoPct: Number(consumedPct.toFixed(2)),
          restantePct: Number(remainingPct.toFixed(2)),
        };
      }),
    [usageData],
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-16 md:pt-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <CardBody className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Membership</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">Consumo y uso del plan</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Visualiza en tiempo real como avanza cada capacidad de tu plan.</p>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="font-semibold text-slate-900 dark:text-white">Tu plan</p>
          </CardHeader>
          <CardBody>
            {membershipCurrentLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-1/3 rounded-lg" />
                <Skeleton className="h-5 w-2/3 rounded-lg" />
              </div>
            ) : membershipCurrentError ? (
              <ApiErrorAlert
                title="No se pudo cargar tu plan"
                description={membershipCurrentError}
                onRetry={refetchMembershipCurrent}
              />
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{membershipCurrent?.planName || "-"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Se renueva el {formatDateTime(parseApiTimestamp(membershipCurrent?.nextRenewalAt))}
                  </p>
                </div>

                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button endContent={<ChevronDown className="h-4 w-4" />} variant="flat" color="primary">
                      Administrar
                    </Button>
                  </DropdownTrigger>
                  {/* Sparkles icon in cambiar plan */}
                  <DropdownMenu aria-label="Plan actions">
                    <DropdownItem key="change-plan" isDisabled={!canManage} onPress={onOpenPlans} startContent={<Sparkles className="h-4 w-4 text-primary" />}>
                      Cambiar plan
                    </DropdownItem>
                    <DropdownItem key="cancel-plan" isDisabled startContent={<BadgeAlert className="h-4 w-4 text-rose-600" />}>
                      Cancelar
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="font-semibold text-slate-900 dark:text-white">Estadisticas de uso</p>
          </CardHeader>
          <CardBody>
            {membershipUsageLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : membershipUsageError ? (
              <ApiErrorAlert
                title="No se pudo cargar el uso"
                description={membershipUsageError}
                onRetry={refetchMembershipUsage}
              />
            ) : usageData.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">No hay datos de uso.</p>
            ) : (
              <div className="space-y-4">
                <div className="h-80 w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 8, left: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="consumidoPct" stackId="usage" fill="#5413ee" radius={[0, 6, 6, 0]} name="Consumido" />
                      <Bar dataKey="restantePct" stackId="usage" fill="#c1fe72" radius={[0, 6, 6, 0]} name="Disponible" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {usageData.map((item: MembershipFeatureUsageDto) => {
                    const pct = Number(item.percentageUsed || 0);
                    return (
                      <div
                        key={item.featureKey}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-700/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <UsageRing pct={pct} />
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{getFeatureTitle(item)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{getFeatureDescription(item)}</p>
                            </div>
                          </div>
                          <Chip color={getUsageColor(pct)} variant="flat" size="sm">
                            {pct.toFixed(1)}%
                          </Chip>
                        </div>
                        <p className="text-xs mt-2 text-slate-600 dark:text-slate-300">
                          {item.consumedValue} de {item.limitValue} {item.limitUnit}
                        </p>
                        {pct > 100 && (
                          <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">Superaste el limite del plan.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader className="flex items-center gap-2">
            <BadgeAlert className="h-4 w-4 text-primary" />
            <p className="font-semibold text-slate-900 dark:text-white">Alertas recientes</p>
          </CardHeader>
          <CardBody>
            {usageAlertsLoading || operationsSummaryLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-12 w-full rounded-xl" />
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
                        {getFeatureTitle({ featureKey: alert.featureKey })} - {alert.thresholdPct}%
                      </p>
                      <Chip color={alert.status === "open" ? "warning" : "success"} variant="flat">
                        {alert.status}
                      </Chip>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Periodo {alert.periodKey}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
