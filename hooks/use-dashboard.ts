"use client";

import { useApi } from "./use-api";
import { apiService } from "@/lib/api";
import type { DashboardSummary } from "@/lib/api-types";
import type { ConversationStatus } from "@/lib/api-types";
import { parseApiTimestamp } from "@/lib/utils";

export interface DashboardMetrics {
  activeConversations: number;
  intervenedsConversations: number;
  averageResponseTime: number; // minutos
  activeCountTrend: number; // % cambio
  intervenedsCountTrend: number; // % cambio
  responseTimeTrend: number; // % cambio
  tokenUsagePercentage: number;
  tokenConsumed: number;
  tokenLimit: number;
  tokenConsumptionTrend: number | null; // % cambio, puede ser null
}

export interface RecentConversationCard {
  id: string;
  contactName: string;
  lastMessageTime: Date;
  timeSince: string; // "hace 5 min", "hace 2 horas", etc.
  status: ConversationStatus;
  unreadCount: number;
  lastMessagePreview: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentConversations: RecentConversationCard[];
}

function formatTimeAgo(timestamp: number | string | null | undefined): string {
  const date = parseApiTimestamp(timestamp ?? Date.now());
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );

  if (diffSeconds < 60) {
    return "hace un momento";
  }

  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return minutes === 1 ? "hace 1m" : `hace ${minutes}m`;
  }

  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return hours === 1 ? "hace 1h" : `hace ${hours}h`;
  }

  const days = Math.floor(diffSeconds / 86400);
  if (days <= 6) {
    return days === 1 ? "hace 1d" : `hace ${days}d`;
  }

  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function mapDashboardData(rawData: DashboardSummary): DashboardData {
  const { conversationStats, tokenUsage, recentActivity } = rawData;

  return {
    metrics: {
      activeConversations: conversationStats.activeCount,
      intervenedsConversations: conversationStats.intervenedsCount,
      averageResponseTime: conversationStats.averageResponseTimeMinutes,
      activeCountTrend: conversationStats.trends.activeCountChange,
      intervenedsCountTrend: conversationStats.trends.intervenedsCountChange,
      responseTimeTrend: conversationStats.trends.responseTimeChange,
      tokenUsagePercentage: tokenUsage.percentageUsed,
      tokenConsumed: tokenUsage.consumed,
      tokenLimit: tokenUsage.total,
      tokenConsumptionTrend: tokenUsage.consumedChangePercent,
    },
    recentConversations: recentActivity.conversations.map((conv) => {
      const activityTimestamp = conv.activityAt ?? conv.lastMessageAt;

      return {
        id: conv.id,
        contactName: conv.contactName,
        lastMessageTime: parseApiTimestamp(activityTimestamp),
        timeSince: formatTimeAgo(activityTimestamp),
        status: conv.status,
        unreadCount: conv.unreadCount,
        lastMessagePreview: conv.lastMessagePreview,
      };
    }),
  };
}

export function useDashboard() {
  const {
    data: rawData,
    loading,
    error,
    refetch,
  } = useApi(() => apiService.getDashboardSummary(), []);

  const data = rawData ? mapDashboardData(rawData) : null;

  return { data, loading, error, refetch };
}
