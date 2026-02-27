"use client";

import { useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  MessageCreatedRealtimeEvent,
  SseConnectionState,
} from "@/lib/api-types";
import { apiService } from "@/lib/api";

interface UseMessagesRealtimeSseParams {
  enabled: boolean;
  token: string | null;
  presenceSessionId?: string | null;
  reconnectKey?: number;
  onMessageCreated?: (event: MessageCreatedRealtimeEvent) => void;
  onHeartbeat?: () => void;
}

const BACKOFF_MS = [1000, 2000, 5000, 10000];

export function useMessagesRealtimeSse({
  enabled,
  token,
  presenceSessionId,
  reconnectKey = 0,
  onMessageCreated,
  onHeartbeat,
}: UseMessagesRealtimeSseParams) {
  const [connectionState, setConnectionState] =
    useState<SseConnectionState>("connecting");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<Date | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageCreatedRef = useRef(onMessageCreated);
  const onHeartbeatRef = useRef(onHeartbeat);

  useEffect(() => {
    onMessageCreatedRef.current = onMessageCreated;
  }, [onMessageCreated]);

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
        await fetchEventSource(apiService.getRealtimeIncomingMessagesUrl(), {
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
            if (response.status === 401 || response.status === 403) {
              apiService.handleAuthFailure("unauthorized");
              isActive = false;
              controller.abort();
              throw new Error("SSE unauthorized");
            }

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

            if (!message.data) return;

            try {
              const parsed = JSON.parse(message.data) as MessageCreatedRealtimeEvent;
              if (parsed.eventType === "MESSAGE_CREATED") {
                onMessageCreatedRef.current?.(parsed);
              }
            } catch (error) {
              if (process.env.NODE_ENV === "development") {
                console.debug(
                  "[SSE] Ignoring non-JSON message payload",
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
        setConnectionState(attempt >= 4 ? "degraded" : "error");

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

  return {
    connectionState,
    lastHeartbeatAt,
  };
}
