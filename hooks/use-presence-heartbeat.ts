"use client";

import { useEffect, useRef } from "react";
import { apiService } from "@/lib/api";

interface UsePresenceHeartbeatParams {
  enabled: boolean;
  token: string | null;
  presenceSessionId: string | null;
  intervalMs?: number;
  onSuccess?: () => void;
  onFailure?: () => void;
}

export function usePresenceHeartbeat({
  enabled,
  token,
  presenceSessionId,
  intervalMs = 30000,
  onSuccess,
  onFailure,
}: UsePresenceHeartbeatParams) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHeartbeatRunningRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onFailureRef.current = onFailure;
  }, [onFailure]);

  useEffect(() => {
    if (!enabled || !token || !presenceSessionId) {
      return;
    }

    let isActive = true;

    const clearHeartbeat = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isHeartbeatRunningRef.current = false;
    };

    const sendHeartbeat = async () => {
      try {
        await apiService.sendPresenceHeartbeat(presenceSessionId);
        onSuccessRef.current?.();
      } catch (error) {
        onFailureRef.current?.();
        if (process.env.NODE_ENV === "development") {
          console.debug("[Presence] Heartbeat failed", error);
        }
      }
    };

    const startHeartbeat = () => {
      if (!isActive || isHeartbeatRunningRef.current) {
        return;
      }

      void sendHeartbeat();
      intervalRef.current = setInterval(() => {
        void sendHeartbeat();
      }, intervalMs);
      isHeartbeatRunningRef.current = true;
    };

    const stopHeartbeat = () => {
      clearHeartbeat();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startHeartbeat();
        return;
      }
      stopHeartbeat();
    };

    if (document.visibilityState === "visible") {
      startHeartbeat();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearHeartbeat();
    };
  }, [enabled, token, presenceSessionId, intervalMs]);
}
