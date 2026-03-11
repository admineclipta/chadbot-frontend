"use client";

import { useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { EvaSseEventName, SseConnectionState } from "@/lib/api-types";
import { apiService } from "@/lib/api";

interface UseEvaSseParams {
  enabled: boolean;
  token: string | null;
  sessionId: string | null;
  reconnectKey?: number;
  onEvent?: (eventName: EvaSseEventName, data: unknown) => void;
  onHeartbeat?: () => void;
}

const BACKOFF_MS = [1000, 2000, 5000, 10000];

export function useEvaSse({
  enabled,
  token,
  sessionId,
  reconnectKey = 0,
  onEvent,
  onHeartbeat,
}: UseEvaSseParams) {
  const [connectionState, setConnectionState] =
    useState<SseConnectionState>("connecting");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<Date | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  const onHeartbeatRef = useRef(onHeartbeat);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onHeartbeatRef.current = onHeartbeat;
  }, [onHeartbeat]);

  useEffect(() => {
    if (!enabled || !sessionId) {
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
        await fetchEventSource(apiService.getEvaStreamUrl(sessionId), {
          method: "GET",
          signal: controller.signal,
          openWhenHidden: true,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
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

            const eventName = (message.event || "eva-response") as EvaSseEventName;
            if (eventName === "heartbeat") {
              const heartbeatAt = new Date();
              setLastHeartbeatAt(heartbeatAt);
              onHeartbeatRef.current?.();
              return;
            }

            let parsedData: unknown = message.data;
            if (message.data) {
              try {
                parsedData = JSON.parse(message.data);
              } catch {
                parsedData = message.data;
              }
            }

            onEventRef.current?.(eventName, parsedData);
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
      } catch {
        if (!isActive || controller.signal.aborted) return;

        attempt += 1;
        const backoff = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
        setConnectionState(attempt >= 4 ? "degraded" : "error");

        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          void connect();
        }, backoff);
      }
    };

    void connect();

    return () => {
      isActive = false;
      clearReconnectTimeout();
      controller.abort();
    };
  }, [enabled, token, sessionId, reconnectKey]);

  return { connectionState, lastHeartbeatAt };
}

