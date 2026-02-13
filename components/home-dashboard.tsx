"use client";

import { Card, Skeleton, Button } from "@heroui/react";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Zap,
  Clock,
  MessageCircle,
  MessageCircleHeart,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";
import { CONVERSATION_STATUS_CONFIG } from "@/lib/types";

import type { Conversation } from "@/lib/types";

interface HomeDashboardProps {
  conversationsCount: number;
  onSelectConversation?: (conversation: Conversation) => void;
  onViewChange?: (view: "conversations") => void;
}

export default function HomeDashboard({ 
  conversationsCount, 
  onSelectConversation,
  onViewChange 
}: HomeDashboardProps) {
  const { data, loading, error, refetch } = useDashboard();

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400">
            Error cargando estadísticas: {error}
          </p>
          <Button
            isIconOnly
            variant="light"
            onClick={refetch}
            className="mt-4"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return <HomeDashboardSkeleton />;
  }

  const { metrics, recentConversations } = data;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-16 md:pt-8 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Dashboard 📊
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Resumen de tu actividad y estadísticas en tiempo real
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<MessageSquare className="w-5 h-5" />}
            label="Conversaciones Activas"
            value={metrics.activeConversations}
            trend={{
              value: metrics.activeCountTrend,
              isPositive: metrics.activeCountTrend > 0,
            }}
            bgIcon="bg-blue-100 dark:bg-blue-900/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />

          <StatCard
            icon={<MessageCircleHeart className="w-5 h-5" />}
            label="Intervenidas"
            value={metrics.intervenedsConversations}
            trend={{
              value: metrics.intervenedsCountTrend,
              isPositive: metrics.intervenedsCountTrend < 0, // menos es mejor
            }}
            bgIcon="bg-orange-100 dark:bg-orange-900/40"
            iconColor="text-orange-600 dark:text-orange-400"
          />

          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Tiempo Respuesta Promedio"
            value={`${metrics.averageResponseTime.toFixed(1)} min`}
            trend={{
              value: metrics.responseTimeTrend,
              isPositive: metrics.responseTimeTrend < 0, // menos es mejor
            }}
            bgIcon="bg-purple-100 dark:bg-purple-900/40"
            iconColor="text-purple-600 dark:text-purple-400"
          />

          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Uso Tokens"
            value={`${metrics.tokenUsagePercentage.toFixed(1)}%`}
            trend={{
              value: metrics.tokenConsumptionTrend,
              isPositive: false, // el aumento no es positivo para tokens
            }}
            subtitle={`${(metrics.tokenConsumed / 1000).toFixed(0)}K / ${(metrics.tokenLimit / 1000).toFixed(0)}K`}
            bgIcon="bg-green-100 dark:bg-green-900/40"
            iconColor="text-green-600 dark:text-green-400"
            showProgressBar={true}
            progress={metrics.tokenUsagePercentage}
          />
        </div>

        {/* Recent Activity */}
        <Card className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Actividad Reciente
            </h2>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onClick={refetch}
              className="text-slate-600 dark:text-slate-400"
            >
              ↻
            </Button>
          </div>

          {recentConversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">
                Sin conversaciones recientes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conv) => (
                <ConversationActivityItem 
                  key={conv.id} 
                  conversation={conv}
                  onSelect={() => {
                    if (onSelectConversation && onViewChange) {
                      // Crear un objeto Conversation simulado basado en los datos disponibles
                      const conversation: Conversation = {
                        id: conv.id,
                        status: conv.status,
                        customer: {
                          id: "",
                          name: conv.contactName,
                          phone: "",
                          email: "",
                          createdAt: "",
                          updatedAt: "",
                        },
                        assignedAgentId: "",
                        lastMessageAt: conv.lastMessageTime.toISOString(),
                        unreadCount: conv.unreadCount,
                        lastMessage: conv.lastMessagePreview,
                        createdAt: "",
                        updatedAt: "",
                        messages: [],
                      };
                      onSelectConversation(conversation);
                      onViewChange("conversations");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number | null;
    isPositive: boolean;
  };
  bgIcon?: string;
  iconColor?: string;
  showProgressBar?: boolean;
  progress?: number;
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  bgIcon = "bg-blue-100 dark:bg-blue-900/40",
  iconColor = "text-blue-600 dark:text-blue-400",
  showProgressBar = false,
  progress = 0,
}: StatCardProps) {
  return (
    <Card className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", bgIcon)}>
          <div className={cn("w-5 h-5", iconColor)}>{icon}</div>
        </div>

        {trend && trend.value !== null && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-semibold",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
        {value}
      </p>

      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          {subtitle}
        </p>
      )}

      {showProgressBar && (
        <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </Card>
  );
}

function ConversationActivityItem({
  conversation,
  onSelect,
}: {
  conversation: {
    id: string;
    contactName: string;
    timeSince: string;
    status: any;
    unreadCount: number;
    lastMessagePreview: string;
  };
  onSelect?: () => void;
}) {
  const statusConfig =
    CONVERSATION_STATUS_CONFIG[
      conversation.status.toUpperCase() as keyof typeof CONVERSATION_STATUS_CONFIG
    ];

  return (
    <div 
      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600">
              <MessageCircle className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {conversation.contactName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {conversation.timeSince}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {conversation.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
              {conversation.unreadCount}
            </span>
          )}

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusConfig.color === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : statusConfig.color === "warning"
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                  : statusConfig.color === "danger"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 ml-11">
        {conversation.lastMessagePreview}
      </p>
    </div>
  );
}

function HomeDashboardSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-16 md:pt-8 space-y-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton className="w-40 h-10 mb-2" />
          <Skeleton className="w-60 h-5" />
        </div>

        {/* Tarjetas skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 bg-white dark:bg-slate-800">
              <Skeleton className="w-10 h-10 rounded-lg mb-3" />
              <Skeleton className="w-24 h-4 mb-2" />
              <Skeleton className="w-16 h-8 mb-2" />
              <Skeleton className="w-20 h-3" />
            </Card>
          ))}
        </div>

        {/* Activity skeleton */}
        <Card className="p-6 bg-white dark:bg-slate-800">
          <Skeleton className="w-40 h-6 mb-6" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="w-16 h-6 rounded-full" />
                </div>
                <Skeleton className="w-full h-3" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
