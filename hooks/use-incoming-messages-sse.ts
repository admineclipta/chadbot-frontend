"use client";

import { useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  ConversationAssignedRealtimeEvent,
  IncomingMessageRealtimeEvent,
  SseConnectionState,
  UserNotificationRealtimeEvent,
} from "@/lib/api-types";
import { apiService } from "@/lib/api";

interface UseIncomingMessagesSseParams {
  enabled: boolean;
  token: string | null;
  reconnectKey?: number;
  streamUrl?: string;
  onIncomingMessage?: (event: IncomingMessageRealtimeEvent) => void;
  onConversationAssigned?: (
    event: ConversationAssignedRealtimeEvent,
  ) => void;
  onNotification?: (event: UserNotificationRealtimeEvent) => void;
  onHeartbeat?: () => void;
}

const BACKOFF_MS = [1000, 2000, 5000, 10000];

export function useIncomingMessagesSse({
  enabled,
  token,
  reconnectKey = 0,
  streamUrl,
  onIncomingMessage,
  onConversationAssigned,
  onNotification,
  onHeartbeat,
}: UseIncomingMessagesSseParams) {
  const [connectionState, setConnectionState] =
    useState<SseConnectionState>("connecting");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIncomingMessageRef = useRef(onIncomingMessage);
  const onConversationAssignedRef = useRef(onConversationAssigned);
  const onNotificationRef = useRef(onNotification);
  const onHeartbeatRef = useRef(onHeartbeat);

  useEffect(() => {
    onIncomingMessageRef.current = onIncomingMessage;
  }, [onIncomingMessage]);

  useEffect(() => {
    onConversationAssignedRef.current = onConversationAssigned;
  }, [onConversationAssigned]);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    onHeartbeatRef.current = onHeartbeat;
  }, [onHeartbeat]);

  useEffect(() => {
    if (!enabled) {
      setConnectionState("connecting");
      return;
    }

    if (!token) {
      setConnectionState("error");
      return;
    }

    let isActive = true;
    let attempt = 0;
    const controller = new AbortController();
    abortRef.current = controller;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = async () => {
      if (!isActive || controller.signal.aborted) return;

      setConnectionState("connecting");

      try {
        await fetchEventSource(
          streamUrl || apiService.getRealtimeIncomingMessagesUrl(),
          {
          method: "GET",
          signal: controller.signal,
          openWhenHidden: true,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          async onopen(response) {
            if (!response.ok) {
              throw new Error(`SSE open failed with ${response.status}`);
            }
            attempt = 0;
            if (isActive) {
              setConnectionState("connected");
            }
          },
          onmessage(message) {
            if (!isActive || controller.signal.aborted) return;

            if (message.event === "heartbeat") {
              const heartbeatAt = new Date();
              setLastHeartbeatAt(heartbeatAt);
              onHeartbeatRef.current?.();
              return;
            }

            if (message.event === "incoming-message") {
              try {
                const parsed = JSON.parse(
                  message.data,
                ) as IncomingMessageRealtimeEvent;
                onIncomingMessageRef.current?.(parsed);
              } catch (error) {
                console.error(
                  "[SSE] Failed parsing incoming-message payload",
                  error,
                );
              }
            }

            if (message.event === "conversation-assigned") {
              try {
                const parsed = JSON.parse(
                  message.data,
                ) as ConversationAssignedRealtimeEvent;
                onConversationAssignedRef.current?.(parsed);
              } catch (error) {
                console.error(
                  "[SSE] Failed parsing conversation-assigned payload",
                  error,
                );
              }
              return;
            }

            if (message.data) {
              try {
                const parsed = JSON.parse(
                  message.data,
                ) as UserNotificationRealtimeEvent;
                onNotificationRef.current?.(parsed);
              } catch (error) {
                if (process.env.NODE_ENV === "development") {
                  console.debug(
                    "[SSE] Ignoring non-JSON notification payload",
                    message.event,
                    message.data,
                  );
                }
              }
            }
          },
          onerror(error) {
            if (!isActive || controller.signal.aborted) return;
            throw error;
          },
          onclose() {
            if (!isActive || controller.signal.aborted) return;
            throw new Error("SSE stream closed by server");
          },
          },
        );
      } catch (error) {
        if (!isActive || controller.signal.aborted) return;

        attempt += 1;
        const backoff =
          BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];

        setConnectionState(attempt >= 4 ? "degraded" : "error");

        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      }
    };

    connect();

    return () => {
      isActive = false;
      clearReconnectTimeout();
      controller.abort();
    };
  }, [
    enabled,
    token,
    reconnectKey,
    streamUrl,
  ]);

  return {
    connectionState,
    lastHeartbeatAt,
  };
}
