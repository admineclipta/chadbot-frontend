"use client";

import { useMemo } from "react";
import { Button } from "@heroui/react";
import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { EvaSessionSummary } from "@/lib/api-types";
import styles from "./eva-ui.module.css";

interface EvaChatSidebarProps {
  sessions: EvaSessionSummary[];
  activeSessionId: string | null;
  collapsed: boolean;
  isReadOnly?: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
}

interface EvaSidebarSessionEntry {
  key: string;
  sessionId: string;
  label: string;
  timestamp: number;
  relativeTime: string;
}

interface EvaSidebarSessionGroup {
  key: string;
  label: string;
  items: EvaSidebarSessionEntry[];
}

function getSessionLabel(session: EvaSessionSummary) {
  return session.title || session.lastMessagePreview || "Nueva conversación Eva";
}

function getSessionKey(session: EvaSessionSummary): string | null {
  if (typeof session.sessionId === "string" && session.sessionId.trim()) {
    return session.sessionId;
  }
  if (typeof session.id === "string" && session.id.trim()) return session.id;
  return null;
}

function toTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      return asNumber < 1_000_000_000_000 ? asNumber * 1000 : asNumber;
    }
    const asDate = new Date(value).getTime();
    if (Number.isFinite(asDate)) return asDate;
  }
  return 0;
}

function getSessionTimestamp(session: EvaSessionSummary): number {
  const updatedAt = toTimestamp(session.updatedAt);
  if (updatedAt > 0) return updatedAt;
  const createdAt = toTimestamp(session.createdAt);
  if (createdAt > 0) return createdAt;
  return 0;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7; // Monday-based
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatWeekLabel(weekStartMs: number): string {
  const date = new Date(weekStartMs);
  return `Semana del ${date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  })}`;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Sin fecha";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return "Hace unos segundos";
  if (diffSeconds < 3600) return `Hace ${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `Hace ${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604800) return `Hace ${Math.floor(diffSeconds / 86400)}d`;
  return `Hace ${Math.floor(diffSeconds / 604800)}sem`;
}

export default function EvaChatSidebar({
  sessions,
  activeSessionId,
  collapsed,
  isReadOnly = false,
  onToggleCollapse,
  onNewChat,
  onSelectSession,
}: EvaChatSidebarProps) {
  const groupedSessions = useMemo<EvaSidebarSessionGroup[]>(() => {
    const entries: EvaSidebarSessionEntry[] = sessions
      .map((session, index) => {
        const sessionId = getSessionKey(session);
        if (!sessionId) return null;
        const timestamp = getSessionTimestamp(session);
        return {
          key: `${sessionId}-${index}`,
          sessionId,
          label: getSessionLabel(session),
          timestamp,
          relativeTime: formatRelativeTime(timestamp),
        };
      })
      .filter((entry): entry is EvaSidebarSessionEntry => entry !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    const now = new Date();
    const thisWeekStart = startOfWeek(now).getTime();
    const lastWeekStart = new Date(thisWeekStart - 7 * 86_400_000).getTime();
    const groupsByKey = new Map<string, EvaSidebarSessionGroup>();

    for (const entry of entries) {
      const weekStart = entry.timestamp
        ? startOfWeek(new Date(entry.timestamp)).getTime()
        : 0;
      const weekKey = String(weekStart);
      if (!groupsByKey.has(weekKey)) {
        let label = formatWeekLabel(weekStart);
        if (weekStart === thisWeekStart) label = "Esta semana";
        if (weekStart === lastWeekStart) label = "Semana pasada";
        groupsByKey.set(weekKey, { key: weekKey, label, items: [] });
      }
      groupsByKey.get(weekKey)?.items.push(entry);
    }

    return Array.from(groupsByKey.values()).sort(
      (a, b) => Number(b.key) - Number(a.key),
    );
  }, [sessions]);

  return (
    <aside
      className={`${styles.sidebarRoot} ${
        collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
      }`}
    >
      <div className={styles.sidebarHeader}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Button
              isIconOnly
              size="sm"
              color="primary"
              variant="solid"
              onPress={onNewChat}
              aria-label="Nuevo chat"
              isDisabled={isReadOnly}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              onPress={onToggleCollapse}
              aria-label="Expandir menu"
              className="text-slate-200 hover:bg-slate-700/60"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              onPress={onToggleCollapse}
              className="text-slate-200 hover:bg-slate-700/60"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              color="primary"
              startContent={<MessageSquarePlus className="h-4 w-4" />}
              onPress={onNewChat}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              isDisabled={isReadOnly}
            >
              Nuevo chat
            </Button>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className={styles.sessionList}>
          <p className={styles.sidebarSectionTitle}>Tus conversaciones</p>
          {groupedSessions.map((group) => (
            <div key={group.key} className={styles.sessionGroup}>
              <p className={styles.sessionGroupTitle}>{group.label}</p>
              {group.items.map((session) => {
                const active = session.sessionId === activeSessionId;
                return (
                  <button
                    key={session.key}
                    onClick={() => onSelectSession(session.sessionId)}
                    className={`${styles.sessionButton} ${active ? styles.sessionButtonActive : ""}`}
                    title={session.relativeTime}
                  >
                    <div className={styles.sessionButtonContent}>
                      <span className={styles.sessionLabel}>{session.label}</span>
                      <span className={styles.sessionMeta}>{session.relativeTime}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
