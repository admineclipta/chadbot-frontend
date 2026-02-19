"use client";

import { useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  IncomingMessageRealtimeEvent,
  SseConnectionState,
} from "@/lib/api-types";
import { apiService } from "@/lib/api";

interface UseIncomingMessagesSseParams {
  enabled: boolean;
  token: string | null;
  reconnectKey?: number;
  onIncomingMessage: (event: IncomingMessageRealtimeEvent) => void;
  onHeartbeat?: () => void;
}

const BACKOFF_MS = [1000, 2000, 5000, 10000];

export function useIncomingMessagesSse({
  enabled,
  token,
  reconnectKey = 0,
  onIncomingMessage,
  onHeartbeat,
}: UseIncomingMessagesSseParams) {
  const [connectionState, setConnectionState] =
    useState<SseConnectionState>("connecting");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        await fetchEventSource(apiService.getRealtimeIncomingMessagesUrl(), {
          method: "GET",
          signal: controller.signal,
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
              onHeartbeat?.();
              return;
            }

            if (message.event === "incoming-message") {
              try {
                const parsed = JSON.parse(
                  message.data,
                ) as IncomingMessageRealtimeEvent;
                onIncomingMessage(parsed);
              } catch (error) {
                console.error(
                  "[SSE] Failed parsing incoming-message payload",
                  error,
                );
              }
            }
          },
          onerror(error) {
            if (!isActive || controller.signal.aborted) return;
            throw error;
          },
        });
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
  }, [enabled, token, reconnectKey, onIncomingMessage, onHeartbeat]);

  return {
    connectionState,
    lastHeartbeatAt,
  };
}
