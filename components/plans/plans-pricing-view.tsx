"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
} from "@heroui/react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { apiService } from "@/lib/api";
import type { MembershipPlanCatalogItemDto } from "@/lib/api-types";
import type { User } from "@/lib/types";
import { canManageMembershipBilling } from "@/lib/permissions";
import ApiErrorAlert from "@/components/shared/api-error-alert";
import {
  formatFeatureLimit,
  getFeatureDescription,
  getFeatureTitle,
} from "@/lib/membership-features";

interface PlansPricingViewProps {
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

export default function PlansPricingView({ currentUser }: PlansPricingViewProps) {
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [planToChange, setPlanToChange] = useState<MembershipPlanCatalogItemDto | null>(null);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const canManage = canManageMembershipBilling(currentUser);

  const {
    data: membershipPlans,
    loading: membershipPlansLoading,
    error: membershipPlansError,
    refetch: refetchMembershipPlans,
  } = useApi((signal) => apiService.getMembershipPlans(currency, signal), [currency]);

  const planList = membershipPlans?.plans || [];

  const displayPlans = useMemo(() => {
    if (planList.length <= 2) return planList;

    const currentIndex = planList.findIndex((plan) => plan.isCurrent);
    if (currentIndex === -1) return planList;

    const targetIndex = Math.floor(planList.length / 2);
    if (currentIndex === targetIndex) return planList;

    const next = [...planList];
    const [currentPlan] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, currentPlan);
    return next;
  }, [planList]);

  const plansGridClassName = useMemo(() => {
    if (displayPlans.length <= 1) {
      return "grid grid-cols-1 gap-4 max-w-xl mx-auto";
    }
    if (displayPlans.length === 2) {
      return "grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto";
    }
    return "grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch";
  }, [displayPlans.length]);

  const comparisonFeatures = useMemo(() => {
    const map = new Map<string, { key: string; name: string; description: string }>();

    planList.forEach((plan) => {
      plan.features.forEach((feature) => {
        if (map.has(feature.featureKey)) return;
        map.set(feature.featureKey, {
          key: feature.featureKey,
          name: getFeatureTitle(feature),
          description: getFeatureDescription(feature),
        });
      });
    });

    return Array.from(map.values());
  }, [planList]);

  const handlePlanChangeConfirm = async () => {
    if (!planToChange) return;
    try {
      setChangePlanLoading(true);
      await apiService.requestMembershipPlanChange({
        targetPlanCode: planToChange.planCode,
        reason: "Cambio solicitado desde frontend",
      });
      toast.success("Cambio de plan solicitado. Se aplicara en el proximo ciclo.");
      setPlanToChange(null);
      await refetchMembershipPlans();
    } catch (error) {
      console.error("Error requesting plan change:", error);
      toast.error("No se pudo solicitar el cambio de plan");
    } finally {
      setChangePlanLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-16 md:pt-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative isolate overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-8 md:px-8 md:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(84,19,238,0.18),_transparent_45%),radial-gradient(circle_at_top_left,_rgba(193,254,114,0.15),_transparent_35%)]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Membership
              </p>
              <h1 className="mt-3 text-3xl md:text-5xl font-bold text-slate-900 dark:text-white">
                Planes para cada etapa de crecimiento
              </h1>
              <p className="mt-3 text-sm md:text-base text-slate-600 dark:text-slate-300">
                Compara capacidades y precio mensual. Los cambios se programan automaticamente para tu proximo ciclo.
              </p>
            </div>

            <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
              <Button
                size="sm"
                radius="lg"
                color={currency === "ARS" ? "primary" : "default"}
                variant={currency === "ARS" ? "solid" : "light"}
                onPress={() => setCurrency("ARS")}
              >
                ARS
              </Button>
              <Button
                size="sm"
                radius="lg"
                color={currency === "USD" ? "primary" : "default"}
                variant={currency === "USD" ? "solid" : "light"}
                onPress={() => setCurrency("USD")}
              >
                USD
              </Button>
            </div>
          </div>
        </section>

        {membershipPlansLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-96 w-full rounded-2xl" />
            ))}
          </div>
        ) : membershipPlansError ? (
          <ApiErrorAlert
            title="No se pudieron cargar los planes"
            description={membershipPlansError}
            onRetry={refetchMembershipPlans}
          />
        ) : (
          <div className={plansGridClassName}>
            {displayPlans.map((plan) => {
              const selectedPrice = plan.prices.find((price) => price.currencyCode === currency);
              const featured = plan.isCurrent || plan.isScheduled;

              return (
                <Card
                  key={plan.planId}
                  className={`relative border bg-white dark:bg-slate-900 transition-transform ${featured ? "border-primary shadow-[0_0_0_1px_rgba(84,19,238,0.2)]" : "border-slate-200 dark:border-slate-700"} ${plan.isCurrent ? "lg:scale-[1.04] lg:-translate-y-2 z-10" : ""}`}
                >
                  <CardBody className="p-6 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{plan.planName}</p>
                        <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                          {plan.planCode}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {plan.isCurrent && (
                          <Chip color="primary" variant="flat" size="sm">
                            Actual
                          </Chip>
                        )}
                        {plan.isScheduled && (
                          <Chip color="secondary" variant="flat" size="sm">
                            Programado
                          </Chip>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 min-h-10">
                      {plan.description || "Plan sin descripcion disponible."}
                    </p>

                    <div className="mt-5">
                      <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {selectedPrice
                          ? formatCurrency(selectedPrice.amount, selectedPrice.currencyCode)
                          : "N/D"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        por {selectedPrice?.billingPeriod || "mes"}
                      </p>
                    </div>

                    <Divider className="my-5" />

                    <ul className="space-y-3 flex-1">
                      {plan.features.slice(0, 5).map((feature) => (
                        <li key={feature.featureKey} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {formatFeatureLimit(feature.limitValue, feature.limitUnit)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {getFeatureTitle(feature)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="mt-6 w-full"
                      color={featured ? "primary" : "default"}
                      variant={featured ? "solid" : "flat"}
                      isDisabled={
                        !canManage ||
                        !plan.canSelect ||
                        plan.isCurrent ||
                        plan.isScheduled ||
                        changePlanLoading
                      }
                      onPress={() => setPlanToChange(plan)}
                    >
                      {plan.isCurrent ? "Tu plan actual" : "Solicitar cambio"}
                    </Button>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <CardBody className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Comparativa de capacidades</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Los limites se muestran por plan para cada feature disponible.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 pr-3">Feature</th>
                    {planList.map((plan) => (
                      <th key={plan.planId} className="pb-2 pr-3">
                        {plan.planName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.key} className="border-b border-slate-100 dark:border-slate-800 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-900 dark:text-white">{feature.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{feature.description}</p>
                      </td>
                      {planList.map((plan) => {
                        const planFeature = plan.features.find((item) => item.featureKey === feature.key);
                        return (
                          <td key={`${plan.planId}-${feature.key}`} className="py-3 pr-3 text-slate-700 dark:text-slate-300">
                            {planFeature
                              ? formatFeatureLimit(planFeature.limitValue, planFeature.limitUnit)
                              : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={Boolean(planToChange)} onClose={() => setPlanToChange(null)}>
        <ModalContent>
          <ModalHeader>Confirmar cambio de plan</ModalHeader>
          <ModalBody>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Vas a solicitar el cambio al plan <span className="font-semibold">{planToChange?.planName}</span>.
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              El cambio se aplicara en el proximo ciclo.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setPlanToChange(null)} isDisabled={changePlanLoading}>
              Cancelar
            </Button>
            <Button color="primary" onPress={handlePlanChangeConfirm} isDisabled={changePlanLoading || !canManage}>
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
