"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { Minimize2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import type {
  Assistant,
  EvaAckEventPayload,
  EvaErrorEventPayload,
  EvaFlowStage,
  EvaMessageUsage,
  EvaMode,
  EvaPendingAction,
  EvaResponseEventPayload,
  EvaSessionMessage,
  EvaSessionSummary,
  EvaUsageStreamEvent,
  EvaUsageResponse,
} from "@/lib/api-types";
import type { Conversation as DomainConversation } from "@/lib/types";
import { useEvaSse } from "@/hooks/use-eva-sse";
import SearchableSelect from "@/components/shared/searchable-select";
import EvaChatSidebar from "./eva-chat-sidebar";
import EvaChatThread, { type EvaUiMessage } from "./eva-chat-thread";
import EvaUsagePill, { type EvaUsageDisplay } from "./eva-usage-pill";
import styles from "./eva-ui.module.css";

interface EvaWorkspaceProps {
  isOpen: boolean;
  isMinimized: boolean;
  token: string | null;
  canManageActions: boolean;
  userName?: string;
  activeConversationId?: string | null;
  activeConversationLabel?: string | null;
  onClose: () => void;
  onMinimize: () => void;
  onResetUnread: () => void;
  onAssistantReplyWhileMinimized: () => void;
}
type GuidedState =
  | "landing"
  | "awaiting_selection"
  | "awaiting_qa_conversation"
  | "submitting"
  | "completed";
type EvaActionState = "pending" | "confirming" | "canceling" | "rejected" | "applied";

const AUTO_REJECT_MESSAGE = "Rechazar propuesta. Sigamos iterando otra alternativa.";
const AUTO_APPROVE_MESSAGE = "Aprobar";
const QA_CLIENT_DATA_VISIBLE = "¿Cuáles son los datos del cliente?";
const QA_CLIENT_DATA_PROMPT = "Hazme un bullet list de los datos del cliente.";
const QA_SUMMARY_VISIBLE = "Hazme un resumen de la conversación.";
const QA_SUMMARY_PROMPT =
  "Hazme un resumen de la conversación: quién nos habló, para qué, qué agentes intervinieron, etc.";

function getFirstName(name?: string): string {
  if (!name) return "equipo";
  const first = name.trim().split(/\s+/)[0];
  return first || "equipo";
}

function getSessionKey(session: EvaSessionSummary): string | null {
  if (typeof session.sessionId === "string" && session.sessionId.trim()) return session.sessionId;
  if (typeof session.id === "string" && session.id.trim()) return session.id;
  return null;
}

function isSessionReadOnlyStatus(status: unknown): boolean {
  if (typeof status !== "string") return false;
  const normalized = status.trim().toLowerCase();
  return (
    normalized.includes("final") ||
    normalized.includes("closed") ||
    normalized.includes("read_only") ||
    normalized.includes("readonly") ||
    normalized.includes("completed")
  );
}

function parseEvaMode(value: unknown): EvaMode | null {
  if (typeof value !== "string") return null;
  if (
    value === "DISCOVER" ||
    value === "TUNE" ||
    value === "CREATE" ||
    value === "CONVERSATION_QA"
  ) {
    return value;
  }
  return null;
}

function parseEvaStage(value: unknown): EvaFlowStage | undefined {
  if (value === "explorando") return "explorando";
  if (value === "definiendo") return "definiendo";
  if (value === "listo_para_confirmar") return "listo_para_confirmar";
  if (value === "confirmado") return "confirmado";
  return undefined;
}

function readAssistantId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toTimestampMs(value: unknown): number {
  const numeric = readFiniteNumber(value);
  if (numeric !== null) {
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getSsePayload(value: unknown): Record<string, unknown> {
  const record = getRecord(value);
  const nestedPayload = record.payload;
  if (nestedPayload && typeof nestedPayload === "object") {
    return {
      ...record,
      ...(nestedPayload as Record<string, unknown>),
    };
  }
  return record;
}

function getSseRequestId(payload: unknown): string | null {
  const source = getSsePayload(payload);
  const requestId = source.requestId;
  return typeof requestId === "string" && requestId.trim() ? requestId : null;
}

function normalizeRole(message: EvaSessionMessage): EvaUiMessage["role"] {
  const role = String((message.role || (message as any).sender || "assistant")).toLowerCase();
  if (role.includes("user")) return "user";
  if (role.includes("assistant") || role.includes("eva") || role.includes("bot")) {
    return "assistant";
  }
  return "system";
}

function normalizeMessage(message: EvaSessionMessage): EvaUiMessage {
  const contentValue = message.content;
  const contentFromObject =
    contentValue && typeof contentValue === "object" && typeof contentValue.text === "string"
      ? contentValue.text
      : "";
  const content =
    typeof contentValue === "string"
      ? contentValue
      : contentFromObject ||
        (typeof (message as any).message === "string"
          ? (message as any).message
          : typeof (message as any).responseText === "string"
            ? (message as any).responseText
            : "");

  return {
    id: String(message.id || crypto.randomUUID()),
    role: normalizeRole(message),
    text: content,
    createdAt: toTimestampMs(message.createdAt),
    pendingAction: message.pendingAction || null,
    stage: parseEvaStage(message.stage),
    canProposeAction:
      typeof message.canProposeAction === "boolean" ? message.canProposeAction : undefined,
    proposalSummary:
      typeof message.proposalSummary === "string" ? message.proposalSummary : undefined,
  };
}

function extractSseText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  const candidate = getSsePayload(payload);
  const nestedContent =
    candidate.content && typeof candidate.content === "object"
      ? (candidate.content as Record<string, unknown>).text
      : null;
  const values = [
    candidate.responseText,
    candidate.text,
    candidate.chunk,
    candidate.content,
    nestedContent,
    candidate.message,
  ];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function extractPendingAction(payload: unknown): EvaPendingAction | null {
  const source = getSsePayload(payload);
  const maybe = source.pendingAction || source;
  if (!maybe || typeof maybe !== "object") return null;
  const action = maybe as Record<string, unknown>;
  if (typeof action.actionId !== "string") return null;
  return {
    actionId: action.actionId,
    type: (action.type as EvaPendingAction["type"]) || "UPDATE_ASSISTANT",
    targetAssistantId:
      typeof action.targetAssistantId === "string" ? action.targetAssistantId : null,
    draftPayload:
      (action.draftPayload as Record<string, unknown>) || ({} as Record<string, unknown>),
    summary: String(action.summary || "AcciÃ³n propuesta por Eva"),
    expiresAt: String(action.expiresAt || new Date().toISOString()),
  };
}

function extractFlowMeta(payload: unknown): {
  stage?: EvaFlowStage;
  canProposeAction?: boolean;
  proposalSummary?: string;
} {
  const source = getSsePayload(payload);
  return {
    stage: parseEvaStage(source.stage),
    canProposeAction:
      typeof source.canProposeAction === "boolean" ? source.canProposeAction : undefined,
    proposalSummary:
      typeof source.proposalSummary === "string" ? source.proposalSummary : undefined,
  };
}

function extractRawMessageList(response: unknown): EvaSessionMessage[] {
  if (Array.isArray(response)) {
    return response as EvaSessionMessage[];
  }
  const record = getRecord(response);
  const content = record.content;
  if (Array.isArray(content)) {
    return content as EvaSessionMessage[];
  }
  return [];
}

function extractMessageTotalTokens(usage: EvaMessageUsage | null | undefined): number {
  if (!usage || typeof usage !== "object") return 0;
  const direct = readFiniteNumber(usage.totalTokens) ?? readFiniteNumber(usage.total_tokens);
  if (direct !== null && direct > 0) return direct;
  const input = readFiniteNumber(usage.inputTokens) ?? readFiniteNumber(usage.input_tokens) ?? 0;
  const output =
    readFiniteNumber(usage.outputTokens) ?? readFiniteNumber(usage.output_tokens) ?? 0;
  const total = input + output;
  return total > 0 ? total : 0;
}

function sumSessionTokens(messageList: EvaSessionMessage[]): number {
  return messageList.reduce((acc, message) => {
    const usageRecord =
      message.usage && typeof message.usage === "object"
        ? (message.usage as EvaMessageUsage)
        : null;
    return acc + extractMessageTotalTokens(usageRecord);
  }, 0);
}

function calculateUsagePercentage(consumed: number, limit: number): number {
  if (limit <= 0) return consumed > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (consumed / limit) * 100));
}

function mergeAssistantText(existing: string, incoming: string): string {
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (incoming.startsWith(existing)) return incoming;
  if (existing.startsWith(incoming)) return existing;
  return `${existing}${incoming}`;
}

function parseUsageStreamEvent(payload: unknown): {
  monthlyUsage?: EvaUsageResponse;
  sessionId?: string | null;
  requestId?: string | null;
  totalTokens?: number;
} {
  const eventPayload = getSsePayload(payload);
  const payloadRecord = getRecord((payload as EvaUsageStreamEvent)?.payload);
  const mergedPayload = {
    ...eventPayload,
    ...payloadRecord,
  };

  const looksLikeMonthlyUsage =
    mergedPayload.clientId &&
    mergedPayload.featureKey &&
    mergedPayload.limitValue !== undefined &&
    mergedPayload.consumedValue !== undefined &&
    mergedPayload.remainingValue !== undefined &&
    mergedPayload.percentageUsed !== undefined;

  const totalTokens =
    readFiniteNumber(mergedPayload.totalTokens) ??
    readFiniteNumber(mergedPayload.total_tokens);
  const sessionId = readAssistantId(mergedPayload.sessionId);
  const requestId =
    typeof mergedPayload.requestId === "string" && mergedPayload.requestId.trim()
      ? mergedPayload.requestId
      : null;

  if (looksLikeMonthlyUsage) {
    return {
      monthlyUsage: {
        clientId: String(mergedPayload.clientId),
        featureKey: String(mergedPayload.featureKey),
        periodKey: String(mergedPayload.periodKey || ""),
        limitValue: Number(mergedPayload.limitValue) || 0,
        consumedValue: Number(mergedPayload.consumedValue) || 0,
        remainingValue: Number(mergedPayload.remainingValue) || 0,
        percentageUsed: Number(mergedPayload.percentageUsed) || 0,
      },
      sessionId,
      requestId,
      totalTokens: totalTokens ?? undefined,
    };
  }

  return {
    sessionId,
    requestId,
    totalTokens: totalTokens ?? undefined,
  };
}

function extractAssistantIdFromSession(session: EvaSessionSummary | null): string | null {
  if (!session) return null;
  const record = session as Record<string, unknown>;
  const nestedMeta =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};
  return (
    readAssistantId(session.assistantId) ||
    readAssistantId(record.targetAssistantId) ||
    readAssistantId(nestedMeta.assistantId) ||
    null
  );
}

function extractAssistantIdFromMessages(messageList: EvaSessionMessage[]): string | null {
  for (let index = messageList.length - 1; index >= 0; index -= 1) {
    const message = messageList[index];
    const record = message as Record<string, unknown>;
    const direct = readAssistantId(message.assistantId) || readAssistantId(record.targetAssistantId);
    if (direct) return direct;
    if (message.pendingAction?.targetAssistantId) {
      return message.pendingAction.targetAssistantId;
    }
  }
  return null;
}

function extractConversationIdFromSession(session: EvaSessionSummary | null): string | null {
  if (!session) return null;
  const record = session as Record<string, unknown>;
  const nestedMeta =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};
  return (
    readAssistantId(record.conversationId) ||
    readAssistantId(nestedMeta.conversationId) ||
    null
  );
}

function extractConversationIdFromMessages(messageList: EvaSessionMessage[]): string | null {
  for (let index = messageList.length - 1; index >= 0; index -= 1) {
    const message = messageList[index];
    const record = message as Record<string, unknown>;
    const nestedMeta =
      record.metadata && typeof record.metadata === "object"
        ? (record.metadata as Record<string, unknown>)
        : {};
    const direct =
      readAssistantId(record.conversationId) || readAssistantId(nestedMeta.conversationId);
    if (direct) return direct;
  }
  return null;
}

export default function EvaWorkspace({
  isOpen,
  isMinimized,
  token,
  canManageActions,
  userName,
  activeConversationId,
  activeConversationLabel,
  onClose,
  onMinimize,
  onResetUnread,
  onAssistantReplyWhileMinimized,
}: EvaWorkspaceProps) {
  const [sessions, setSessions] = useState<EvaSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EvaUiMessage[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<EvaUsageResponse | null>(null);
  const [sessionTokensById, setSessionTokensById] = useState<Record<string, number>>({});
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [assistantsLoadError, setAssistantsLoadError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionStatusById, setActionStatusById] = useState<Record<string, EvaActionState>>({});
  const [readOnlySessionIds, setReadOnlySessionIds] = useState<Record<string, true>>({});
  const [sseReconnectKey, setSseReconnectKey] = useState(0);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<EvaMode>("TUNE");
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const [selectedQaConversationId, setSelectedQaConversationId] = useState<string | null>(null);
  const [selectedQaConversationLabel, setSelectedQaConversationLabel] = useState<string | null>(null);
  const [qaConversations, setQaConversations] = useState<DomainConversation[]>([]);
  const [qaConversationsLoading, setQaConversationsLoading] = useState(false);
  const [qaConversationsError, setQaConversationsError] = useState<string | null>(null);
  const [qaSessionRequiresFreshSelection, setQaSessionRequiresFreshSelection] = useState(false);
  const [qaConversationLockedToContext, setQaConversationLockedToContext] = useState(false);
  const [guidedState, setGuidedState] = useState<GuidedState>("landing");
  const [guidedPromptMessageId, setGuidedPromptMessageId] = useState<string | null>(null);

  const didLoadSessionsOnceRef = useRef(false);
  const didLoadUsageOnceRef = useRef(false);
  const didLoadAssistantsOnceRef = useRef(false);
  const activeSessionIdRef = useRef<string | null>(null);
  const messageLoadRequestIdRef = useRef(0);
  const lastSseMessageIdRef = useRef<string | null>(null);
  const pendingActionBufferRef = useRef<EvaPendingAction | null>(null);
  const assistantMessageByRequestRef = useRef<Record<string, string>>({});
  const completedRequestIdsRef = useRef<Set<string>>(new Set());
  const processedUsageRequestIdsRef = useRef<Set<string>>(new Set());
  const canceledActionIdsRef = useRef<Set<string>>(new Set());
  const lastTerminalResponseSignatureRef = useRef<string | null>(null);
  const skipNextSessionHydrationRef = useRef<string | null>(null);
  const wasVisibleRef = useRef(false);
  const autoQaTriggeredRef = useRef(false);
  const qaConversationBySessionRef = useRef<Record<string, string>>({});
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const playReplySound = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      if (context.state === "suspended") {
        await context.resume();
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(900, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.18);
      oscillator.onended = () => {
        void context.close();
      };
    } catch {
      // noop
    }
  }, []);

  const applySessionContext = useCallback(
    (
      session: EvaSessionSummary | null,
      messageList: EvaSessionMessage[] = [],
      contextSessionId?: string | null,
    ) => {
      const nextMode = parseEvaMode(session?.mode) || parseEvaMode(messageList[0]?.mode) || "TUNE";
      setMode(nextMode);

      const inferredAssistantId =
        extractAssistantIdFromSession(session) || extractAssistantIdFromMessages(messageList);
      setSelectedAssistantId(inferredAssistantId);

      if (nextMode === "CONVERSATION_QA") {
        const sessionId = contextSessionId || getSessionKey(session);
        const inferredConversationId =
          extractConversationIdFromSession(session) || extractConversationIdFromMessages(messageList);
        const rememberedConversationId =
          sessionId && qaConversationBySessionRef.current[sessionId]
            ? qaConversationBySessionRef.current[sessionId]
            : null;
        const resolvedConversationId = inferredConversationId || rememberedConversationId;
        if (sessionId && resolvedConversationId) {
          qaConversationBySessionRef.current[sessionId] = resolvedConversationId;
        }
        setQaConversationLockedToContext(false);
        setSelectedQaConversationId(resolvedConversationId);
        if (!resolvedConversationId) {
          setSelectedQaConversationLabel(null);
        }
        setQaSessionRequiresFreshSelection(!resolvedConversationId);
        return;
      }

      setSelectedQaConversationId(null);
      setSelectedQaConversationLabel(null);
      setQaSessionRequiresFreshSelection(false);
      setQaConversationLockedToContext(false);
    },
    [],
  );

  const loadSessions = useCallback(async (force = false) => {
    if (!isOpen) return;
    if (!force && didLoadSessionsOnceRef.current) return;
    try {
      const response = await apiService.getEvaSessions(0, 30);
      const sessionList = Array.isArray(response?.content)
        ? response.content
        : Array.isArray(response)
          ? response
          : [];

      setSessions(sessionList);
      setReadOnlySessionIds((prev) => {
        const next = { ...prev };
        for (const session of sessionList) {
          const sessionId = getSessionKey(session);
          if (!sessionId) continue;
          const sessionMode = parseEvaMode(session.mode);
          if (sessionMode === "CONVERSATION_QA") {
            const summaryConversationId = extractConversationIdFromSession(session);
            if (summaryConversationId) {
              qaConversationBySessionRef.current[sessionId] = summaryConversationId;
            }
          }
          if (isSessionReadOnlyStatus(session.status)) {
            next[sessionId] = true;
          }
        }
        return next;
      });
      didLoadSessionsOnceRef.current = true;
    } catch (error) {
      console.error("Error loading Eva sessions", error);
    }
  }, [isOpen]);

  const loadUsage = useCallback(async (force = false) => {
    if (!isOpen) return;
    if (!force && didLoadUsageOnceRef.current) return;
    try {
      const response = await apiService.getEvaUsage();
      setMonthlyUsage(response);
      didLoadUsageOnceRef.current = true;
    } catch {
      // noop
    }
  }, [isOpen]);

  const loadAssistants = useCallback(async (force = false) => {
    if (!isOpen) return;
    if (!force && didLoadAssistantsOnceRef.current) return;
    try {
      setAssistantsLoading(true);
      setAssistantsLoadError(null);
      const response = await apiService.getAssistants({ page: 0, size: 200 });
      setAssistants(response.content || []);
      didLoadAssistantsOnceRef.current = true;
    } catch (error) {
      console.error("Error loading Eva assistants", error);
      setAssistantsLoadError("No se pudieron cargar los asistentes.");
    } finally {
      setAssistantsLoading(false);
    }
  }, [isOpen]);

  const loadQaConversations = useCallback(async (force = false) => {
    if (!isOpen) return;
    if (!force && qaConversations.length > 0) return;
    try {
      setQaConversationsLoading(true);
      setQaConversationsError(null);
      const response = await apiService.getConversations(
        0,
        200,
        undefined,
        undefined,
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        "updatedAt",
        "ASC",
      );
      setQaConversations(response.content || []);
    } catch (error) {
      console.error("Error loading conversations for Eva QA", error);
      setQaConversationsError("No se pudieron cargar las conversaciones.");
    } finally {
      setQaConversationsLoading(false);
    }
  }, [isOpen, qaConversations.length]);

  const resetToGuidedLanding = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
    setSending(false);
    setThinking(false);
    setPendingRequestId(null);
    setActionLoadingId(null);
    setActionStatusById({});
    setMode("TUNE");
    setSelectedAssistantId(null);
    setSelectedQaConversationId(null);
    setSelectedQaConversationLabel(null);
    setQaSessionRequiresFreshSelection(false);
    setQaConversationLockedToContext(false);
    setGuidedState("landing");
    setGuidedPromptMessageId(null);
    pendingActionBufferRef.current = null;
    lastSseMessageIdRef.current = null;
    assistantMessageByRequestRef.current = {};
    completedRequestIdsRef.current.clear();
    processedUsageRequestIdsRef.current.clear();
    canceledActionIdsRef.current.clear();
    lastTerminalResponseSignatureRef.current = null;
    skipNextSessionHydrationRef.current = null;
  }, []);

  useEffect(() => {
    const isVisible = isOpen && !isMinimized;
    if (!isVisible) {
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;

    resetToGuidedLanding();
    onResetUnread();
    void loadSessions();
    void loadUsage();
    void loadAssistants();
    autoQaTriggeredRef.current = false;
  }, [
    isMinimized,
    isOpen,
    loadAssistants,
    loadSessions,
    loadUsage,
    onResetUnread,
    resetToGuidedLanding,
  ]);

  const beginGuidedConversationQaFlow = useCallback(
    (options?: { forceContextConversation?: boolean }) => {
      const monthlyLimitReached = Boolean(
        monthlyUsage &&
          (monthlyUsage.percentageUsed >= 100 || monthlyUsage.remainingValue <= 0),
      );
      if (monthlyLimitReached) return;
      setMode("CONVERSATION_QA");
      setSelectedAssistantId(null);
      setGuidedPromptMessageId(null);
      setMessages([]);

      const shouldUseContextConversation =
        options?.forceContextConversation && typeof activeConversationId === "string" && activeConversationId.trim();

      if (shouldUseContextConversation) {
        setQaConversationLockedToContext(true);
        setSelectedQaConversationId(activeConversationId!);
        setSelectedQaConversationLabel(
          typeof activeConversationLabel === "string" && activeConversationLabel.trim()
            ? activeConversationLabel
            : null,
        );
        setQaSessionRequiresFreshSelection(false);
        setGuidedState("completed");
        return;
      }

      setQaConversationLockedToContext(false);
      setSelectedQaConversationId(null);
      setSelectedQaConversationLabel(null);
      setQaSessionRequiresFreshSelection(false);
      setGuidedState("awaiting_qa_conversation");
      void loadQaConversations(true);
    },
    [activeConversationId, activeConversationLabel, loadQaConversations, monthlyUsage],
  );

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    if (guidedState !== "landing") return;
    if (autoQaTriggeredRef.current) return;
    if (!activeConversationId || !activeConversationId.trim()) return;
    autoQaTriggeredRef.current = true;
    beginGuidedConversationQaFlow({ forceContextConversation: true });
  }, [activeConversationId, beginGuidedConversationQaFlow, guidedState, isMinimized, isOpen]);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!sessionId || !isOpen) return;
    const requestId = ++messageLoadRequestIdRef.current;
    try {
      setLoading(true);
      const response = await apiService.getEvaSessionMessages(sessionId, 0, 100);
      if (requestId !== messageLoadRequestIdRef.current) return;
      if (activeSessionIdRef.current !== sessionId) return;
      const rawMessages = extractRawMessageList(response);
      const mapped = rawMessages.map(normalizeMessage);
      const activeSession = sessions.find((session) => getSessionKey(session) === sessionId) || null;
      const resolvedMode =
        parseEvaMode(activeSession?.mode) || parseEvaMode(rawMessages[0]?.mode) || "TUNE";
      const resolvedConversationId =
        extractConversationIdFromSession(activeSession) || extractConversationIdFromMessages(rawMessages);
      if (resolvedMode === "CONVERSATION_QA" && resolvedConversationId) {
        qaConversationBySessionRef.current[sessionId] = resolvedConversationId;
      }
      applySessionContext(activeSession, rawMessages, sessionId);
      setMessages(mapped);
      setSessionTokensById((prev) => ({
        ...prev,
        [sessionId]: sumSessionTokens(rawMessages),
      }));
      setActionStatusById((prev) => {
        const next = { ...prev };
        for (const message of mapped) {
          const actionId = message.pendingAction?.actionId;
          if (!actionId) continue;
          next[actionId] = "pending";
        }
        return next;
      });
      if (resolvedMode === "CONVERSATION_QA" && !resolvedConversationId) {
        setQaSessionRequiresFreshSelection(true);
        setGuidedState("awaiting_qa_conversation");
        void loadQaConversations(true);
      } else {
        setQaSessionRequiresFreshSelection(false);
        setGuidedState("completed");
      }
      setGuidedPromptMessageId(null);
    } catch (error) {
      if (requestId !== messageLoadRequestIdRef.current) return;
      console.error("Error loading Eva messages", error);
      toast.error("No se pudo cargar el historial de Eva");
    } finally {
      if (requestId === messageLoadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applySessionContext, isOpen, loadQaConversations, sessions]);

  useEffect(() => {
    if (!isOpen) return;
    if (!activeSessionId) {
      setLoading(false);
      setMessages([]);
      return;
    }
    if (skipNextSessionHydrationRef.current === activeSessionId) {
      skipNextSessionHydrationRef.current = null;
      return;
    }
    void loadSessionMessages(activeSessionId);
  }, [activeSessionId, isOpen, loadSessionMessages]);

  useEvaSse({
    enabled: isOpen && Boolean(activeSessionId) && !readOnlySessionIds[activeSessionId || ""],
    token,
    sessionId: activeSessionId,
    reconnectKey: sseReconnectKey,
    onEvent: (eventName, payload) => {
      const eventPayload = getSsePayload(payload);
      const payloadRequestId = getSseRequestId(payload);
      const requestMatches =
        !pendingRequestId || !payloadRequestId || pendingRequestId === payloadRequestId;

      if (eventName === "eva-thinking") {
        if (requestMatches) {
          setThinking(true);
        }
        return;
      }

      if (eventName === "eva-usage") {
        const usageEvent = parseUsageStreamEvent(payload);
        if (usageEvent.monthlyUsage) {
          setMonthlyUsage(usageEvent.monthlyUsage);
          if (usageEvent.totalTokens !== undefined) {
            const tokenSessionId = usageEvent.sessionId || activeSessionIdRef.current;
            if (tokenSessionId) {
              setSessionTokensById((prev) => ({
                ...prev,
                [tokenSessionId]: (prev[tokenSessionId] || 0) + usageEvent.totalTokens!,
              }));
            }
          }
          return;
        }

        if (usageEvent.totalTokens !== undefined) {
          const usageKey = `${usageEvent.requestId || "no-request"}:${usageEvent.sessionId || activeSessionIdRef.current || "no-session"}:${usageEvent.totalTokens}`;
          if (processedUsageRequestIdsRef.current.has(usageKey)) {
            return;
          }
          processedUsageRequestIdsRef.current.add(usageKey);

          const tokenSessionId = usageEvent.sessionId || activeSessionIdRef.current;
          if (tokenSessionId) {
            setSessionTokensById((prev) => ({
              ...prev,
              [tokenSessionId]: (prev[tokenSessionId] || 0) + usageEvent.totalTokens!,
            }));
          }

          setMonthlyUsage((prev) => {
            if (!prev) return prev;
            const nextConsumed = prev.consumedValue + usageEvent.totalTokens!;
            const nextRemaining = Math.max(0, prev.limitValue - nextConsumed);
            return {
              ...prev,
              consumedValue: nextConsumed,
              remainingValue: nextRemaining,
              percentageUsed: calculateUsagePercentage(nextConsumed, prev.limitValue),
            };
          });
        } else {
          void loadUsage(true);
        }
        return;
      }

      if (eventName === "eva-action-proposed") {
        const pendingAction = extractPendingAction(payload);
        if (pendingAction) {
          pendingActionBufferRef.current = pendingAction;
          setActionStatusById((prev) => ({
            ...prev,
            [pendingAction.actionId]: "pending",
          }));
          const flowMeta = extractFlowMeta(payload);
          const liveId =
            (payloadRequestId && assistantMessageByRequestRef.current[payloadRequestId]) ||
            lastSseMessageIdRef.current;
          if (liveId) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === liveId
                  ? {
                      ...message,
                      pendingAction,
                    }
                  : message,
              ),
            );
          } else {
            const id = crypto.randomUUID();
            lastSseMessageIdRef.current = id;
            if (payloadRequestId) {
              assistantMessageByRequestRef.current[payloadRequestId] = id;
            }
            setMessages((prev) => [
              ...prev,
              {
                id,
                role: "assistant",
                text: flowMeta.proposalSummary || pendingAction.summary || "Accion propuesta por Eva",
                createdAt: Date.now(),
                pendingAction,
                stage: flowMeta.stage,
                canProposeAction:
                  flowMeta.canProposeAction === undefined ? true : flowMeta.canProposeAction,
                proposalSummary: flowMeta.proposalSummary || pendingAction.summary,
              },
            ]);
            if (isMinimized) onAssistantReplyWhileMinimized();
            void playReplySound();
          }
        }
        return;
      }

      if (eventName === "eva-action-applied") {
        const appliedActionId = readAssistantId(eventPayload.actionId);
        if (appliedActionId && canceledActionIdsRef.current.has(appliedActionId)) {
          canceledActionIdsRef.current.delete(appliedActionId);
          return;
        }
        if (appliedActionId) {
          setActionStatusById((prev) => ({
            ...prev,
            [appliedActionId]: "applied",
          }));
        }
        const sessionId =
          readAssistantId(eventPayload.sessionId) || activeSessionIdRef.current;
        if (sessionId) {
          setReadOnlySessionIds((prev) => ({
            ...prev,
            [sessionId]: true,
          }));
        }
        setThinking(false);
        setSending(false);
        toast.success("Cambios aplicados");
        return;
      }

      if (eventName === "eva-action-failed") {
        const failedActionId = readAssistantId(eventPayload.actionId);
        if (failedActionId && canceledActionIdsRef.current.has(failedActionId)) {
          canceledActionIdsRef.current.delete(failedActionId);
          return;
        }
        if (!failedActionId && Object.values(actionStatusById).includes("canceling")) {
          return;
        }
        setThinking(false);
        toast.error("No se pudo aplicar la accion de Eva");
        return;
      }

      if (eventName === "eva-error") {
        if (!requestMatches) return;
        const errorPayload = eventPayload as EvaErrorEventPayload;
        const message =
          errorPayload.message ||
          errorPayload.reason ||
          "Eva no pudo completar la solicitud";

        toast.error(message);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "system",
            text: message,
            createdAt: Date.now(),
          },
        ]);

        setThinking(false);
        setSending(false);
        setPendingRequestId(null);
        pendingActionBufferRef.current = null;
        lastSseMessageIdRef.current = null;
        if (payloadRequestId) {
          completedRequestIdsRef.current.add(payloadRequestId);
          delete assistantMessageByRequestRef.current[payloadRequestId];
        }
        return;
      }

      if (eventName === "eva-response") {
        if (!requestMatches) return;

        const responsePayload = eventPayload as Partial<EvaResponseEventPayload>;
        const responseStatus = responsePayload.status;
        const requestId = payloadRequestId || pendingRequestId || null;
        const isTerminalStatus =
          responseStatus === "COMPLETED" ||
          responseStatus === "LIMIT_REACHED" ||
          responseStatus === "AI_ERROR";

        if (requestId && isTerminalStatus && completedRequestIdsRef.current.has(requestId)) {
          return;
        }

        const text = extractSseText(payload);
        const flowMeta = extractFlowMeta(payload);
        const pendingAction = extractPendingAction(payload) || pendingActionBufferRef.current;
        if (!requestId && isTerminalStatus) {
          const signature = `${responseStatus || "unknown"}|${text}|${pendingAction?.actionId || "no-action"}`;
          if (lastTerminalResponseSignatureRef.current === signature) {
            return;
          }
          lastTerminalResponseSignatureRef.current = signature;
        }
        let liveId = requestId ? assistantMessageByRequestRef.current[requestId] : null;
        if (!liveId) {
          liveId = lastSseMessageIdRef.current;
        }

        if (text || pendingAction) {
          if (!liveId) {
            const id = crypto.randomUUID();
            lastSseMessageIdRef.current = id;
            if (requestId) {
              assistantMessageByRequestRef.current[requestId] = id;
            }
            setMessages((prev) => [
              ...prev,
              {
                id,
                role: "assistant",
                text: text || "",
                createdAt: Date.now(),
                pendingAction: pendingAction || null,
                stage: flowMeta.stage,
                canProposeAction: flowMeta.canProposeAction,
                proposalSummary: flowMeta.proposalSummary,
              },
            ]);
            if (pendingAction) {
              setActionStatusById((prev) => ({
                ...prev,
                [pendingAction.actionId]: "pending",
              }));
            }
            if (text) {
              if (isMinimized) onAssistantReplyWhileMinimized();
              void playReplySound();
            }
          } else {
            const resolvedLiveId = liveId;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === resolvedLiveId
                  ? {
                      ...message,
                      text: text ? mergeAssistantText(message.text, text) : message.text,
                      pendingAction: pendingAction || message.pendingAction || null,
                      stage: flowMeta.stage || message.stage,
                      canProposeAction:
                        flowMeta.canProposeAction === undefined
                          ? message.canProposeAction
                          : flowMeta.canProposeAction,
                      proposalSummary: flowMeta.proposalSummary || message.proposalSummary,
                    }
                  : message,
              ),
            );
            lastSseMessageIdRef.current = resolvedLiveId;
            if (requestId) {
              assistantMessageByRequestRef.current[requestId] = resolvedLiveId;
            }
            if (pendingAction) {
              setActionStatusById((prev) => ({
                ...prev,
                [pendingAction.actionId]: "pending",
              }));
            }
          }
        }

        if (responsePayload.status === "LIMIT_REACHED") {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "system",
              text: "Limite de consumo de Eva alcanzado para este periodo.",
              createdAt: Date.now(),
            },
          ]);
          setMonthlyUsage((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              consumedValue: Math.max(prev.limitValue, prev.consumedValue),
              remainingValue: 0,
              percentageUsed: 100,
            };
          });
          void loadUsage(true);
        } else if (responsePayload.status === "AI_ERROR") {
          const aiErrorMessage =
            (typeof responsePayload.responseText === "string" &&
              responsePayload.responseText.trim()) ||
            "Eva tuvo un error al generar la respuesta.";
          toast.error(aiErrorMessage);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "system",
              text: aiErrorMessage,
              createdAt: Date.now(),
            },
          ]);
        }

        if (isTerminalStatus) {
          setPendingRequestId(null);
          setSending(false);
          setThinking(false);
          pendingActionBufferRef.current = null;
          lastSseMessageIdRef.current = null;
          if (requestId) {
            completedRequestIdsRef.current.add(requestId);
            delete assistantMessageByRequestRef.current[requestId];
          }
        }
        return;
      }

      if (eventName === "eva-ack") {
        if (!requestMatches) return;
        const ackPayload = eventPayload as EvaAckEventPayload;
        if (ackPayload.requestId && pendingRequestId && pendingRequestId !== ackPayload.requestId) {
          return;
        }
        const ackRequestId =
          (typeof ackPayload.requestId === "string" && ackPayload.requestId) || payloadRequestId;
        if (ackRequestId) {
          completedRequestIdsRef.current.delete(ackRequestId);
        }
        pendingActionBufferRef.current = null;
        lastTerminalResponseSignatureRef.current = null;
        lastSseMessageIdRef.current =
          (ackRequestId && assistantMessageByRequestRef.current[ackRequestId]) || null;
        setThinking(true);
      }
    },
    onHeartbeat: () => {
      // noop
    },
  });

  const guidedQuestionText = useMemo(() => {
    const firstName = getFirstName(userName);
    return `Excelente ${firstName}, que asistente te gustaria modificar?`;
  }, [userName]);

  const isMonthlyLimitReached = useMemo(() => {
    if (!monthlyUsage) return false;
    return monthlyUsage.percentageUsed >= 100 || monthlyUsage.remainingValue <= 0;
  }, [monthlyUsage]);

  useEffect(() => {
    if (!selectedQaConversationId) return;
    if (selectedQaConversationLabel) return;
    const selected = qaConversations.find((conversation) => conversation.id === selectedQaConversationId);
    if (!selected) return;
    const label = selected.customer?.name || selected.customer?.phone || selected.id;
    setSelectedQaConversationLabel(label);
  }, [qaConversations, selectedQaConversationId, selectedQaConversationLabel]);

  useEffect(() => {
    if (mode !== "CONVERSATION_QA") return;
    if (!activeConversationId || !activeConversationId.trim()) return;
    if (selectedQaConversationId !== activeConversationId) return;
    setQaConversationLockedToContext(true);
  }, [activeConversationId, mode, selectedQaConversationId]);

  const activeSessionIsReadOnly = useMemo(() => {
    if (!activeSessionId) return false;
    if (readOnlySessionIds[activeSessionId]) return true;
    const activeSession = sessions.find((session) => getSessionKey(session) === activeSessionId);
    return isSessionReadOnlyStatus(activeSession?.status);
  }, [activeSessionId, readOnlySessionIds, sessions]);

  const isGuidedBlockingInput = !activeSessionId && guidedState !== "completed";
  const isQaConversationMissing = mode === "CONVERSATION_QA" && !selectedQaConversationId;

  const hasBlockingPendingAction = useMemo(() => {
    return messages.some((message) => {
      const actionId = message.pendingAction?.actionId;
      if (!actionId) return false;
      return actionStatusById[actionId] !== "rejected";
    });
  }, [messages, actionStatusById]);

  const usageDisplay = useMemo<EvaUsageDisplay | null>(() => {
    if (!monthlyUsage) return null;

    if (activeSessionId) {
      const conversationConsumed = sessionTokensById[activeSessionId] || 0;
      const limit = monthlyUsage.limitValue || 0;
      const remaining = Math.max(0, limit - conversationConsumed);
      return {
        consumedValue: conversationConsumed,
        remainingValue: remaining,
        limitValue: limit,
        percentageUsed: calculateUsagePercentage(conversationConsumed, limit),
        tooltipLabel: "Tokens utilizados en esta conversación",
      };
    }

    return {
      consumedValue: monthlyUsage.consumedValue,
      remainingValue: monthlyUsage.remainingValue,
      limitValue: monthlyUsage.limitValue,
      percentageUsed: monthlyUsage.percentageUsed,
      tooltipLabel: "Tokens utilizados en EVA (mensual)",
    };
  }, [activeSessionId, monthlyUsage, sessionTokensById]);

  const qaSuggestionChips = useMemo(
    () => [
      { visibleText: QA_CLIENT_DATA_VISIBLE, promptText: QA_CLIENT_DATA_PROMPT },
      { visibleText: QA_SUMMARY_VISIBLE, promptText: QA_SUMMARY_PROMPT },
    ],
    [],
  );

  const showQaPanel =
    guidedState !== "landing" &&
    mode === "CONVERSATION_QA" &&
    !loading;

  useEffect(() => {
    if (!isOpen) return;
    if (mode !== "CONVERSATION_QA") return;
    if (qaConversationLockedToContext) return;
    if (qaConversationsLoading || qaConversations.length > 0) return;
    void loadQaConversations(true);
  }, [
    isOpen,
    loadQaConversations,
    mode,
    qaConversationLockedToContext,
    qaConversations.length,
    qaConversationsLoading,
  ]);

  const canSend = useMemo(() => {
    if (isGuidedBlockingInput) return false;
    if (isQaConversationMissing) return false;
    if (isMonthlyLimitReached) return false;
    if (activeSessionIsReadOnly) return false;
    if (hasBlockingPendingAction) return false;
    if (sending || !input.trim()) return false;
    return true;
  }, [
    activeSessionIsReadOnly,
    hasBlockingPendingAction,
    input,
    isQaConversationMissing,
    isGuidedBlockingInput,
    isMonthlyLimitReached,
    sending,
  ]);

  const syncComposerHeight = useCallback(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 128);
    textarea.style.height = `${Math.max(24, nextHeight)}px`;
  }, []);

  useEffect(() => {
    syncComposerHeight();
  }, [input, syncComposerHeight]);

  const sendMessage = useCallback(async () => {
    if (!canSend) return;
    if (isMonthlyLimitReached) return;
    const text = input.trim();
    const modeAssistantId = mode === "TUNE" ? selectedAssistantId || undefined : undefined;
    const qaConversationId = mode === "CONVERSATION_QA" ? selectedQaConversationId || undefined : undefined;
    if (mode === "CONVERSATION_QA" && !qaConversationId) {
      toast.error("Selecciona una conversación para consultar.");
      return;
    }
    const shouldReuseSessionId =
      mode !== "CONVERSATION_QA" ||
      (!qaSessionRequiresFreshSelection && Boolean(activeSessionId));

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        text,
        createdAt: Date.now(),
      },
    ]);
    setInput("");
    setSending(true);
    setThinking(true);
    lastSseMessageIdRef.current = null;
    pendingActionBufferRef.current = null;
    lastTerminalResponseSignatureRef.current = null;

    try {
      const response = await apiService.sendEvaMessage({
        sessionId: shouldReuseSessionId ? activeSessionId || undefined : undefined,
        mode,
        message: text,
        assistantId: modeAssistantId,
        conversationId: qaConversationId,
      });

      setPendingRequestId(response.requestId);
      completedRequestIdsRef.current.delete(response.requestId);
      setQaSessionRequiresFreshSelection(false);
      if (mode === "CONVERSATION_QA" && qaConversationId) {
        qaConversationBySessionRef.current[response.sessionId] = qaConversationId;
      }

      const createdOrSwitchedSession = !activeSessionId || activeSessionId !== response.sessionId;
      if (createdOrSwitchedSession) {
        skipNextSessionHydrationRef.current = response.sessionId;
        setActiveSessionId(response.sessionId);
        void loadSessions(true);
        setSseReconnectKey((prev) => prev + 1);
      }
    } catch (error: any) {
      const message = error?.message || "Error enviando mensaje a Eva";
      toast.error(message);
      setSending(false);
      setThinking(false);
      setPendingRequestId(null);

      if (message.toLowerCase().includes("limit")) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "system",
            text: "Limite de consumo de Eva alcanzado para este periodo.",
            createdAt: Date.now(),
          },
        ]);
        setMonthlyUsage((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            consumedValue: Math.max(prev.limitValue, prev.consumedValue),
            remainingValue: 0,
            percentageUsed: 100,
          };
        });
        void loadUsage(true);
      }
    }
  }, [
    activeSessionId,
    canSend,
    input,
    isMonthlyLimitReached,
    loadSessions,
    loadUsage,
    mode,
    qaSessionRequiresFreshSelection,
    selectedAssistantId,
    selectedQaConversationId,
  ]);

  const beginGuidedModifyFlow = useCallback(() => {
    if (isMonthlyLimitReached) return;
    setMode("TUNE");
    setSelectedAssistantId(null);
    setSelectedQaConversationId(null);
    setSelectedQaConversationLabel(null);
    setQaSessionRequiresFreshSelection(false);
    setQaConversationLockedToContext(false);
    setGuidedState("awaiting_selection");
    const assistantPromptId = crypto.randomUUID();
    setGuidedPromptMessageId(assistantPromptId);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "user",
        text: "Modificar asistentes",
        createdAt: Date.now(),
      },
      {
        id: assistantPromptId,
        role: "assistant",
        text: guidedQuestionText,
        createdAt: Date.now() + 1,
      },
    ]);
    if (assistants.length === 0 && !assistantsLoading) {
      void loadAssistants(true);
    }
  }, [assistants.length, assistantsLoading, guidedQuestionText, isMonthlyLimitReached, loadAssistants]);

  const handleQaConversationChange = useCallback(
    (conversationId: string) => {
      setQaConversationLockedToContext(false);
      const trimmedId = conversationId.trim();
      if (!trimmedId) {
        setSelectedQaConversationId(null);
        setSelectedQaConversationLabel(null);
        setGuidedState("awaiting_qa_conversation");
        return;
      }
      const selected = qaConversations.find((conversation) => conversation.id === trimmedId) || null;
      setSelectedQaConversationId(trimmedId);
      setSelectedQaConversationLabel(
        selected?.customer?.name || selected?.customer?.phone || trimmedId,
      );
      setQaSessionRequiresFreshSelection(true);
      if (!activeSessionId || mode === "CONVERSATION_QA") {
        setGuidedState("completed");
      }
    },
    [activeSessionId, mode, qaConversations],
  );

  const sendQaSuggestion = useCallback(
    async (visibleText: string, promptText: string) => {
      if (isMonthlyLimitReached) return;
      if (!selectedQaConversationId) {
        toast.error("Selecciona una conversación para consultar.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          text: visibleText,
          createdAt: Date.now(),
        },
      ]);
      setSending(true);
      setThinking(true);
      setInput("");
      pendingActionBufferRef.current = null;
      lastSseMessageIdRef.current = null;
      lastTerminalResponseSignatureRef.current = null;

      const shouldReuseSessionId =
        !qaSessionRequiresFreshSelection && Boolean(activeSessionIdRef.current);

      try {
        const response = await apiService.sendEvaMessage({
          sessionId: shouldReuseSessionId ? activeSessionIdRef.current || undefined : undefined,
          mode: "CONVERSATION_QA",
          conversationId: selectedQaConversationId,
          message: promptText,
        });
        setPendingRequestId(response.requestId);
        completedRequestIdsRef.current.delete(response.requestId);
        setGuidedState("completed");
        setGuidedPromptMessageId(null);
        setQaSessionRequiresFreshSelection(false);
        qaConversationBySessionRef.current[response.sessionId] = selectedQaConversationId;
        if (!activeSessionIdRef.current || activeSessionIdRef.current !== response.sessionId) {
          skipNextSessionHydrationRef.current = response.sessionId;
          setActiveSessionId(response.sessionId);
          void loadSessions(true);
          setSseReconnectKey((prev) => prev + 1);
        }
      } catch (error: any) {
        const message = error?.message || "Error enviando consulta de conversación";
        toast.error(message);
        setSending(false);
        setThinking(false);
        setPendingRequestId(null);
      }
    },
    [isMonthlyLimitReached, loadSessions, qaSessionRequiresFreshSelection, selectedQaConversationId],
  );

  const sendGuidedPromptToEva = useCallback(
    async (text: string, assistantId?: string) => {
      if (isMonthlyLimitReached) return;
      setGuidedState("submitting");
      setSelectedAssistantId(assistantId || null);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          text,
          createdAt: Date.now(),
        },
      ]);
      setSending(true);
      setThinking(true);
      setInput("");
      pendingActionBufferRef.current = null;
      lastSseMessageIdRef.current = null;
      lastTerminalResponseSignatureRef.current = null;

      try {
        const response = await apiService.sendEvaMessage({
          mode: "TUNE",
          message: text,
          assistantId,
        });
        setPendingRequestId(response.requestId);
        completedRequestIdsRef.current.delete(response.requestId);
        setGuidedState("completed");
        setGuidedPromptMessageId(null);
        skipNextSessionHydrationRef.current = response.sessionId;
        setActiveSessionId(response.sessionId);
        void loadSessions(true);
        setSseReconnectKey((prev) => prev + 1);
      } catch (error: any) {
        const errorMessage = error?.message || "Error iniciando la conversacion con Eva";
        toast.error(errorMessage);
        setSending(false);
        setThinking(false);
        setPendingRequestId(null);
        setGuidedState("awaiting_selection");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "system",
            text: `No se pudo iniciar la modificacion: ${errorMessage}`,
            createdAt: Date.now(),
          },
        ]);
      }
    },
    [isMonthlyLimitReached, loadSessions],
  );

  const handleGuidedAssistantSelect = useCallback(
    (assistantId: string) => {
      if (guidedState !== "awaiting_selection") return;
      const selected = assistants.find((assistant) => assistant.id === assistantId);
      if (!selected) return;
      void sendGuidedPromptToEva(
        `Quiero modificar el prompt del ${selected.name}`,
        selected.id,
      );
    },
    [assistants, guidedState, sendGuidedPromptToEva],
  );

  const handleGuidedUnknownAssistant = useCallback(() => {
    if (guidedState !== "awaiting_selection") return;
    void sendGuidedPromptToEva(
      "Quiero modificar un asistetne pero no se cuales hay disponibles, cuales son?",
    );
  }, [guidedState, sendGuidedPromptToEva]);

  const handleConfirmAction = useCallback(async (actionId: string) => {
    if (!canManageActions || isMonthlyLimitReached) {
      toast.error("No tienes permisos para confirmar acciones de Eva.");
      return;
    }
    try {
      setActionStatusById((prev) => ({ ...prev, [actionId]: "confirming" }));
      setActionLoadingId(actionId);
      const result = await apiService.confirmEvaAction(actionId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          text: AUTO_APPROVE_MESSAGE,
          createdAt: Date.now(),
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `Cambios aplicados: ${result.summary || "Accion aplicada"}`,
          createdAt: Date.now(),
        },
      ]);
      setActionStatusById((prev) => ({ ...prev, [actionId]: "applied" }));
    } catch (error: any) {
      setActionStatusById((prev) => ({ ...prev, [actionId]: "pending" }));
      toast.error(error?.message || "No se pudo confirmar la accion");
    } finally {
      setActionLoadingId(null);
    }
  }, [canManageActions, isMonthlyLimitReached]);

  const handleCancelAction = useCallback(async (actionId: string) => {
    if (!canManageActions || isMonthlyLimitReached) {
      return;
    }
    try {
      canceledActionIdsRef.current.add(actionId);
      setActionStatusById((prev) => ({ ...prev, [actionId]: "canceling" }));
      setActionLoadingId(actionId);
      await apiService.cancelEvaAction(actionId);
      setActionStatusById((prev) => ({ ...prev, [actionId]: "rejected" }));

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          text: AUTO_REJECT_MESSAGE,
          createdAt: Date.now(),
        },
      ]);

      setInput("");
      setSending(true);
      setThinking(true);
      pendingActionBufferRef.current = null;
      lastSseMessageIdRef.current = null;
      lastTerminalResponseSignatureRef.current = null;

      const currentSessionId = activeSessionIdRef.current || undefined;
      const response = await apiService.sendEvaMessage({
        sessionId: currentSessionId,
        mode,
        message: AUTO_REJECT_MESSAGE,
        assistantId: mode === "TUNE" ? selectedAssistantId || undefined : undefined,
        conversationId:
          mode === "CONVERSATION_QA" ? selectedQaConversationId || undefined : undefined,
      });

      setPendingRequestId(response.requestId);
      completedRequestIdsRef.current.delete(response.requestId);

      if (!currentSessionId || currentSessionId !== response.sessionId) {
        skipNextSessionHydrationRef.current = response.sessionId;
        setActiveSessionId(response.sessionId);
        void loadSessions(true);
        setSseReconnectKey((prev) => prev + 1);
      }
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          canceledActionIdsRef.current.delete(actionId);
        }, 8000);
      }
    } catch (error: any) {
      canceledActionIdsRef.current.delete(actionId);
      setActionStatusById((prev) => ({ ...prev, [actionId]: "pending" }));
      setSending(false);
      setThinking(false);
      setPendingRequestId(null);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "system",
          text:
            error?.message ||
            "No se pudo rechazar la propuesta. Intenta nuevamente.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setActionLoadingId(null);
    }
  }, [
    canManageActions,
    isMonthlyLimitReached,
    loadSessions,
    mode,
    selectedAssistantId,
    selectedQaConversationId,
  ]);

  const handleBeginConversationQaFlow = useCallback(() => {
    beginGuidedConversationQaFlow({
      forceContextConversation: Boolean(
        typeof activeConversationId === "string" && activeConversationId.trim(),
      ),
    });
  }, [activeConversationId, beginGuidedConversationQaFlow]);

  const startNewChat = () => {
    if (isMonthlyLimitReached) return;
    resetToGuidedLanding();
    void loadAssistants(true);
    void loadQaConversations(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.workspaceOverlay} ${
        isMinimized ? "hidden" : styles.workspaceEnter
      }`}
    >
      <div className={styles.workspaceShell}>
        <EvaChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          collapsed={sidebarCollapsed}
          isReadOnly={isMonthlyLimitReached}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onNewChat={startNewChat}
          onSelectSession={(sessionId) => {
            const selectedSession =
              sessions.find((session) => getSessionKey(session) === sessionId) || null;
            applySessionContext(selectedSession, [], sessionId);
            setActiveSessionId(sessionId);
            skipNextSessionHydrationRef.current = null;
            setLoading(true);
            setMessages([]);
            setPendingRequestId(null);
            setSending(false);
            setThinking(false);
            setActionLoadingId(null);
            pendingActionBufferRef.current = null;
            lastSseMessageIdRef.current = null;
            lastTerminalResponseSignatureRef.current = null;
            assistantMessageByRequestRef.current = {};
            setGuidedState("completed");
            setGuidedPromptMessageId(null);
            onResetUnread();
          }}
        />

        <div className={styles.workspaceMain}>
          <div className={styles.workspaceHeader}>
            <div>
              <p className={styles.headerTitle}>EVA</p>
              <p className={styles.headerSubtitle}>
                Asistente para consultas de conversaciones y gestión de asistentes
              </p>
            </div>
            <div className={styles.headerActions}>
              <Tooltip content="Minimizar">
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={onMinimize}
                  className="text-slate-600 hover:bg-emerald-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Cerrar">
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {guidedState === "landing" && (
            <div className={styles.guidedLanding}>
              <div className={styles.guidedLandingIcon}>AI</div>
              <h2 className={styles.guidedLandingTitle}>Que queres hacer hoy?</h2>
              <p className={styles.guidedLandingText}>
                Empecemos con una acción: ajustar asistentes o consultar una conversación.
              </p>
              <div className={styles.guidedLandingActions}>
                <Button
                  onPress={beginGuidedModifyFlow}
                  className={styles.guidedLandingButton}
                  isDisabled={isMonthlyLimitReached || (assistantsLoading && assistants.length === 0)}
                >
                  Modificar asistentes
                </Button>
                <Button
                  onPress={handleBeginConversationQaFlow}
                  className={styles.guidedLandingButton}
                  isDisabled={isMonthlyLimitReached}
                >
                  Consultas sobre una conversación
                </Button>
              </div>
              {(assistantsLoadError || qaConversationsError) && (
                <p className={styles.guidedLandingError}>
                  {assistantsLoadError || qaConversationsError}
                </p>
              )}
            </div>
          )}

          {showQaPanel && (
            <div className={styles.qaPanel}>
              <div className={styles.qaPanelHeader}>
                <p className={styles.qaPanelTitle}>Consultas sobre una conversación</p>
                {qaConversationLockedToContext && selectedQaConversationId && (
                  <p className={styles.qaPanelContext}>
                    Conversación: {selectedQaConversationLabel || selectedQaConversationId}
                  </p>
                )}
              </div>

              {!qaConversationLockedToContext && (
                <div className={styles.qaSelectArea}>
                  <SearchableSelect<DomainConversation>
                    label="¿De qué conversación quieres preguntar?"
                    items={qaConversations}
                    selectedKey={selectedQaConversationId || ""}
                    placeholder="Selecciona una conversación"
                    searchPlaceholder="Buscar conversación..."
                    isLoading={qaConversationsLoading}
                    getKey={(conversation) => conversation.id}
                    getTextValue={(conversation) =>
                      `${conversation.customer?.name || "Sin nombre"} ${conversation.customer?.phone || ""} ${conversation.lastMessage || ""}`
                    }
                    renderItem={(conversation) => (
                      <div className="flex flex-col gap-0.5 py-0.5">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {conversation.customer?.name || "Sin nombre"}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {conversation.customer?.phone || conversation.id}
                        </span>
                      </div>
                    )}
                    onChange={handleQaConversationChange}
                    emptyLabel="Selecciona una conversación"
                  />
                  {!selectedQaConversationId && (
                    <p className={styles.qaRequiredHint}>Este campo es obligatorio.</p>
                  )}
                  {qaConversationsError && (
                    <p className={styles.qaError}>{qaConversationsError}</p>
                  )}
                </div>
              )}

              {selectedQaConversationId && (
                <div className={styles.qaChips}>
                  {qaSuggestionChips.map((chip) => (
                    <Button
                      key={chip.visibleText}
                      size="sm"
                      variant="flat"
                      onPress={() => void sendQaSuggestion(chip.visibleText, chip.promptText)}
                      isDisabled={sending || isMonthlyLimitReached || activeSessionIsReadOnly}
                      className={styles.qaChipButton}
                    >
                      {chip.visibleText}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className={styles.loadingArea}>
              <Spinner color="primary" />
            </div>
          ) : (
            <EvaChatThread
              messages={messages}
              thinking={thinking}
              canManageActions={
                canManageActions && !isMonthlyLimitReached && !activeSessionIsReadOnly
              }
              actionLoadingId={actionLoadingId}
              actionStatusById={actionStatusById}
              onConfirmAction={handleConfirmAction}
              onCancelAction={handleCancelAction}
              assistantSelector={
                guidedPromptMessageId &&
                (guidedState === "awaiting_selection" || guidedState === "submitting")
                  ? {
                      messageId: guidedPromptMessageId,
                      options: assistants.map((assistant) => ({
                        id: assistant.id,
                        name: assistant.name,
                      })),
                      loading: assistantsLoading,
                      error: assistantsLoadError,
                      submitting: guidedState === "submitting" || isMonthlyLimitReached,
                      onSelectAssistant: handleGuidedAssistantSelect,
                      onUnknownAssistant: handleGuidedUnknownAssistant,
                      onRetryLoadAssistants: () => {
                        void loadAssistants(true);
                      },
                    }
                  : null
              }
            />
          )}

          {isMonthlyLimitReached && (
            <div className={styles.limitOverlay}>
              <Alert
                color="danger"
                variant="faded"
                title="Límite mensual de EVA alcanzado"
                description="EVA está en modo solo lectura. Para seguir creando o modificando asistentes, pasate a un plan superior."
                className={styles.limitAlert}
              />
            </div>
          )}

          {messages.length === 0 && !loading && guidedState !== "landing" && (
            <div className={styles.emptyOverlay}>
              <Card className={styles.emptyCard}>
                <CardBody className="text-center text-sm text-slate-600 dark:text-slate-300">
                  Inicia un chat con Eva para consultar conversaciones o ajustar asistentes.
                </CardBody>
              </Card>
            </div>
          )}

          <div className={styles.composerRoot}>
            <div className={styles.composerRow}>
              <div className={styles.composerIcon}>
                <Sparkles className="h-4 w-4" />
              </div>
              <textarea
                ref={composerTextareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  isMonthlyLimitReached
                    ? "Límite de EVA alcanzado."
                    : activeSessionIsReadOnly
                      ? "Chat finalizado. Crea un nuevo chat para seguir conversando con Eva."
                    : isQaConversationMissing
                      ? "Primero selecciona una conversación para consultar."
                    : hasBlockingPendingAction
                      ? "Resuelve la propuesta pendiente para continuar."
                    : isGuidedBlockingInput
                    ? "Primero completa el paso guiado para continuar."
                    : "Escribe tu mensaje para Eva..."
                }
                disabled={
                  isGuidedBlockingInput ||
                  isQaConversationMissing ||
                  sending ||
                  hasBlockingPendingAction ||
                  activeSessionIsReadOnly ||
                  isMonthlyLimitReached
                }
                rows={1}
                className={styles.composerTextarea}
                onInput={syncComposerHeight}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button
                color="primary"
                isDisabled={!canSend}
                isLoading={sending}
                onPress={() => void sendMessage()}
                isIconOnly
                className={styles.composerSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className={styles.usageRow}>
              <EvaUsagePill usage={usageDisplay} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

