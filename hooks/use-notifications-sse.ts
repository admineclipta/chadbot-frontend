"use client";

import { useEffect, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  ConversationAssignedRealtimeEvent,
  UserNotificationRealtimeEvent,
} from "@/lib/api-types";
import { apiService } from "@/lib/api";

interface UseNotificationsSseParams {
  enabled: boolean;
  token: string | null;
  presenceSessionId?: string | null;
  reconnectKey?: number;
  onConversationAssigned?: (event: ConversationAssignedRealtimeEvent) => void;
  onNotification?: (event: UserNotificationRealtimeEvent) => void;
}

const BACKOFF_MS = [1000, 2000, 5000, 10000];

export function useNotificationsSse({
  enabled,
  token,
  presenceSessionId,
  reconnectKey = 0,
  onConversationAssigned,
  onNotification,
}: UseNotificationsSseParams) {
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onConversationAssignedRef = useRef(onConversationAssigned);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onConversationAssignedRef.current = onConversationAssigned;
  }, [onConversationAssigned]);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!enabled || !token) return;

    let isActive = true;
    let attempt = 0;
    const controller = new AbortController();

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = async () => {
      if (!isActive || controller.signal.aborted) return;

      try {
        await fetchEventSource(apiService.getRealtimeNotificationsUrl(), {
          method: "GET",
          signal: controller.signal,
          openWhenHidden: true,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
            ...(presenceSessionId
              ? { "X-Presence-Session-Id": presenceSessionId }
              : {}),
          },
          async onopen(response) {
            if (!response.ok) {
              throw new Error(`SSE open failed with ${response.status}`);
            }
            attempt = 0;
          },
          onmessage(message) {
            if (!isActive || controller.signal.aborted || !message.data) return;

            if (message.event === "heartbeat") {
              return;
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

            try {
              const parsed = JSON.parse(message.data) as UserNotificationRealtimeEvent;
              onNotificationRef.current?.(parsed);
            } catch (error) {
              if (process.env.NODE_ENV === "development") {
                console.debug(
                  "[SSE] Ignoring non-JSON notification payload",
                  message.event,
                  message.data,
                  error,
                );
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
        });
      } catch (error) {
        if (!isActive || controller.signal.aborted) return;

        attempt += 1;
        const backoff = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      }
    };

    void connect();

    return () => {
      isActive = false;
      clearReconnectTimeout();
      controller.abort();
    };
  }, [enabled, token, presenceSessionId, reconnectKey]);
}
