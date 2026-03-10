"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Select, SelectItem, Spinner, Tooltip } from "@heroui/react";
import { Bot, Copy, User } from "lucide-react";
import { toast } from "sonner";
import type { EvaFlowStage, EvaPendingAction } from "@/lib/api-types";
import EvaActionCard from "./eva-action-card";
import styles from "./eva-ui.module.css";

export interface EvaUiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: number;
  pendingAction?: EvaPendingAction | null;
  stage?: EvaFlowStage;
  canProposeAction?: boolean;
  proposalSummary?: string;
}

interface EvaAssistantOption {
  id: string;
  name: string;
}

interface EvaAssistantSelectorConfig {
  messageId: string | null;
  options: EvaAssistantOption[];
  loading: boolean;
  error: string | null;
  submitting: boolean;
  onSelectAssistant: (assistantId: string) => void;
  onUnknownAssistant: () => void;
  onRetryLoadAssistants: () => void;
}

interface EvaChatThreadProps {
  messages: EvaUiMessage[];
  thinking: boolean;
  canManageActions: boolean;
  actionLoadingId: string | null;
  actionStatusById?: Record<
    string,
    "pending" | "confirming" | "canceling" | "rejected" | "applied"
  >;
  onConfirmAction: (actionId: string) => void;
  onCancelAction: (actionId: string) => void;
  assistantSelector?: EvaAssistantSelectorConfig | null;
}

function getStageLabel(stage?: EvaFlowStage): string | null {
  if (stage === "explorando") return "Explorando";
  if (stage === "definiendo") return "Definiendo";
  if (stage === "listo_para_confirmar") return "Listo para confirmar";
  if (stage === "confirmado") return "Confirmado";
  return null;
}

function TypewriterText({ text, enabled }: { text: string; enabled: boolean }) {
  const [value, setValue] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setValue(text);
      return;
    }
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 1;
      setValue(text.slice(0, idx));
      if (idx >= text.length) {
        window.clearInterval(timer);
      }
    }, 12);
    return () => window.clearInterval(timer);
  }, [enabled, text]);

  return (
    <span>
      {value}
      {enabled && value.length < text.length ? (
        <span className={styles.typeCursor} aria-hidden>
          |
        </span>
      ) : null}
    </span>
  );
}

export default function EvaChatThread({
  messages,
  thinking,
  canManageActions,
  actionLoadingId,
  actionStatusById,
  onConfirmAction,
  onCancelAction,
  assistantSelector,
}: EvaChatThreadProps) {
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Respuesta copiada");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className={styles.threadScroller}>
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        const isSystem = message.role === "system";
        const isLatestAssistant = isAssistant && message.id === lastAssistantId;
        const rowClass = isSystem
          ? styles.messageSystem
          : isAssistant
            ? styles.messageAssistant
            : styles.messageUser;
        const bubbleClass = isSystem
          ? styles.systemBubble
          : isAssistant
            ? styles.assistantBubble
            : styles.userBubble;
        const actionId = message.pendingAction?.actionId;
        const actionStatus = actionId ? actionStatusById?.[actionId] || "pending" : "pending";

        return (
          <div
            key={message.id}
            className={`${styles.messageRow} ${rowClass} ${styles.hoverGroup}`}
          >
            {isAssistant && (
              <div className={styles.avatarAssistant}>
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={styles.messageStack}>
              <div className={`${styles.messageBubble} ${bubbleClass}`}>
                {isAssistant && (
                  <Tooltip content="Copiar">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => void copyText(message.text)}
                      className={styles.copyAction}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </Tooltip>
                )}
                {isLatestAssistant ? (
                  <TypewriterText text={message.text} enabled />
                ) : (
                  <span>{message.text}</span>
                )}
                {isAssistant && message.stage && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat" color="primary">
                      {getStageLabel(message.stage) || message.stage}
                    </Chip>
                    {message.canProposeAction && (
                      <Chip size="sm" variant="flat" color="secondary">
                        Puede proponer cambios
                      </Chip>
                    )}
                  </div>
                )}
                {isAssistant && message.proposalSummary && (
                  <p className={styles.proposalText}>
                    {message.proposalSummary}
                  </p>
                )}

                {isAssistant &&
                  assistantSelector &&
                  assistantSelector.messageId === message.id && (
                    <div className={styles.assistantSelectorWrap}>
                      {assistantSelector.loading ? (
                        <div className={styles.assistantSelectorStatus}>
                          <Spinner size="sm" color="primary" />
                          <span>Cargando asistentes...</span>
                        </div>
                      ) : assistantSelector.error ? (
                        <div className={styles.assistantSelectorError}>
                          <p>{assistantSelector.error}</p>
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={assistantSelector.onRetryLoadAssistants}
                          >
                            Reintentar
                          </Button>
                        </div>
                      ) : (
                        <div className={styles.assistantSelectorContent}>
                          <Select
                            aria-label="Seleccionar asistente para modificar"
                            placeholder="Selecciona un asistente"
                            variant="bordered"
                            size="sm"
                            isDisabled={assistantSelector.submitting}
                            onSelectionChange={(keys) => {
                              if (keys === "all") return;
                              const selectedKey = keys.values().next().value;
                              const selected =
                                typeof selectedKey === "string" ? selectedKey : undefined;
                              if (selected) assistantSelector.onSelectAssistant(selected);
                            }}
                            className={styles.assistantSelectorDropdown}
                            classNames={{
                              trigger: styles.assistantSelectorTrigger,
                              value: styles.assistantSelectorValue,
                              listboxWrapper: styles.assistantSelectorListbox,
                            }}
                          >
                            {assistantSelector.options.map((assistant) => (
                              <SelectItem key={assistant.id} textValue={assistant.name}>
                                {assistant.name}
                              </SelectItem>
                            ))}
                          </Select>
                          <Button
                            variant="light"
                            size="sm"
                            isDisabled={assistantSelector.submitting}
                            onPress={assistantSelector.onUnknownAssistant}
                            className={styles.unknownAssistantButton}
                          >
                            No se cual asistente
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {message.pendingAction && actionId && (
                <EvaActionCard
                  action={message.pendingAction}
                  canManageActions={canManageActions}
                  loading={actionLoadingId === actionId}
                  status={actionStatus}
                  onConfirm={onConfirmAction}
                  onCancel={onCancelAction}
                />
              )}
            </div>
            {!isAssistant && !isSystem && (
              <div className={styles.avatarUser}>
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        );
      })}

      {thinking && (
        <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
          <div className={styles.avatarAssistant}>
            <Bot className="h-4 w-4" />
          </div>
          <div className={styles.typingBubble}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingLabel}>Generando respuesta</span>
          </div>
        </div>
      )}
    </div>
  );
}
