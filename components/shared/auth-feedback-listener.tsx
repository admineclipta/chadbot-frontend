"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AUTH_EXPIRED_EVENT } from "@/lib/auth-session";

type AuthExpiredReason = "expired" | "unauthorized";

interface AuthExpiredEventDetail {
  reason?: AuthExpiredReason;
  at?: number;
}

export default function AuthFeedbackListener() {
  const lastToastAtRef = useRef(0);
  const lastReasonRef = useRef<AuthExpiredReason | null>(null);

  useEffect(() => {
    const onAuthExpired = (event: Event) => {
      const customEvent = event as CustomEvent<AuthExpiredEventDetail>;
      const reason = customEvent.detail?.reason ?? "unauthorized";
      const now = Date.now();
      const isDuplicate =
        lastReasonRef.current === reason && now - lastToastAtRef.current < 1500;

      if (isDuplicate) {
        return;
      }

      lastReasonRef.current = reason;
      lastToastAtRef.current = now;

      toast.error("Tu sesión expiró. Inicia sesión nuevamente.", {
        id: "auth-expired-toast",
      });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired as EventListener);
    return () => {
      window.removeEventListener(
        AUTH_EXPIRED_EVENT,
        onAuthExpired as EventListener,
      );
    };
  }, []);

  return null;
}
