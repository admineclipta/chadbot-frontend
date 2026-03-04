import type {
  MembershipFeatureUsageDto,
  MembershipPlanFeatureDto,
} from "@/lib/api-types";

type MembershipFeatureLike = Pick<
  MembershipFeatureUsageDto,
  "featureKey" | "featureName" | "featureDescription"
> &
  Partial<Pick<MembershipPlanFeatureDto, "featureName" | "featureDescription">>;

const FEATURE_FALLBACK_LABELS: Record<string, string> = {
  "ai.tokens.monthly": "Mensajes IA por mes",
  "assistant.specialized.active": "Asistentes especializados",
  "messaging.credentials.active": "Canales de mensajeria activos",
};

const FEATURE_FALLBACK_DESCRIPTIONS: Record<string, string> = {
  "ai.tokens.monthly": "Cantidad mensual de consumo de IA incluida en tu plan.",
  "assistant.specialized.active": "Cantidad maxima de asistentes especializados activos.",
  "messaging.credentials.active": "Cantidad maxima de credenciales/canales conectados.",
};

export function getFeatureTitle(feature: MembershipFeatureLike): string {
  return (
    feature.featureName ||
    FEATURE_FALLBACK_LABELS[feature.featureKey] ||
    feature.featureKey
  );
}

export function getFeatureDescription(feature: MembershipFeatureLike): string {
  return (
    feature.featureDescription ||
    FEATURE_FALLBACK_DESCRIPTIONS[feature.featureKey] ||
    "Capacidad incluida en tu plan."
  );
}

export function formatFeatureLimit(limitValue: number, limitUnit: string): string {
  const normalizedUnit = (limitUnit || "").toLowerCase();

  if (normalizedUnit === "count") {
    return new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 0,
    }).format(Math.round(limitValue));
  }

  if (normalizedUnit === "tokens") {
    const formatted = new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 0,
    }).format(Math.round(limitValue));
    return `${formatted} ${limitUnit}`;
  }

  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(limitValue);
  return limitUnit ? `${formatted} ${limitUnit}` : formatted;
}
