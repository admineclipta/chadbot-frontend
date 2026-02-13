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

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = (now - timestamp * 1000) / 1000; // convertir a segundos

  // Minutos
  if (diff < 60) {
    const minutes = Math.floor(diff);
    return minutes <= 1 ? "hace un momento" : `hace ${minutes}m`;
  }

  // Horas
  if (diff < 3600) {
    const hours = Math.floor(diff / 60);
    return hours === 1 ? "hace 1h" : `hace ${hours}h`;
  }

  // Días
  if (diff < 86400) {
    const days = Math.floor(diff / 3600);
    return days === 1 ? "hace 1d" : `hace ${days}d`;
  }

  // Más de una semana, mostrar fecha
  const date = parseApiTimestamp(timestamp);
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
    recentConversations: recentActivity.conversations.map((conv) => ({
      id: conv.id,
      contactName: conv.contactName,
      lastMessageTime: parseApiTimestamp(conv.lastMessageAt),
      timeSince: formatTimeAgo(conv.lastMessageAt),
      status: conv.status,
      unreadCount: conv.unreadCount,
      lastMessagePreview: conv.lastMessagePreview,
    })),
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
