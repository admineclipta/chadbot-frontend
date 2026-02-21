"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiService } from "@/lib/api";
import type { PushSubscriptionUpsertRequest } from "@/lib/api-types";

type PushPermissionState = NotificationPermission | "unsupported";

interface UsePushNotificationsParams {
  enabled: boolean;
  token: string | null;
}

function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isSecureContextForPush(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || isLocalhostHost(window.location.hostname);
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function mapSubscriptionToRequest(
  subscription: PushSubscription,
): PushSubscriptionUpsertRequest {
  const p256dhKey = subscription.getKey("p256dh");
  const authKey = subscription.getKey("auth");

  if (!p256dhKey || !authKey) {
    throw new Error("Push subscription keys are missing");
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: toBase64(p256dhKey),
      auth: toBase64(authKey),
    },
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    deviceLabel:
      typeof navigator !== "undefined"
        ? `${navigator.platform} - ${navigator.language}`
        : undefined,
  };
}

export function usePushNotifications({
  enabled,
  token,
}: UsePushNotificationsParams) {
  const [permissionState, setPermissionState] =
    useState<PushPermissionState>("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  }, []);

  const isSecureContextValue = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isSecureContextForPush();
  }, []);

  const registerServiceWorker = useCallback(async () => {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  const refreshState = useCallback(async () => {
    if (!isSupported || !isSecureContextValue) {
      setPermissionState("unsupported");
      setIsSubscribed(false);
      return;
    }

    setPermissionState(Notification.permission);

    if (Notification.permission !== "granted") {
      setIsSubscribed(false);
      return;
    }

    try {
      const registration = await registerServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(subscription));
    } catch {
      setIsSubscribed(false);
    }
  }, [isSecureContextValue, isSupported, registerServiceWorker]);

  const syncCurrentSubscription = useCallback(async () => {
    if (!enabled || !token || !isSupported || !isSecureContextValue) return;
    if (Notification.permission !== "granted") return;

    const registration = await registerServiceWorker();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setIsSubscribed(false);
      return;
    }

    await apiService.registerPushSubscription(
      mapSubscriptionToRequest(subscription),
    );
    setIsSubscribed(true);
  }, [
    enabled,
    isSecureContextValue,
    isSupported,
    registerServiceWorker,
    token,
  ]);

  const enablePushNotifications = useCallback(async () => {
    if (!enabled || !token) return;
    if (!isSupported) {
      setPermissionState("unsupported");
      setError("Este navegador no soporta Web Push.");
      return;
    }
    if (!isSecureContextValue) {
      setPermissionState("unsupported");
      setError("Web Push requiere HTTPS o localhost.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;

      setPermissionState(permission);

      if (permission !== "granted") {
        localStorage.setItem("chadbot_notifications", "false");
        setIsSubscribed(false);
        return;
      }

      const registration = await registerServiceWorker();
      const { publicKey } = await apiService.getPushPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));

      await apiService.registerPushSubscription(
        mapSubscriptionToRequest(subscription),
      );
      localStorage.setItem("chadbot_notifications", "true");
      setIsSubscribed(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo activar notificaciones push.";
      setError(message);
      setIsSubscribed(false);
    } finally {
      setIsBusy(false);
    }
  }, [
    enabled,
    isSecureContextValue,
    isSupported,
    registerServiceWorker,
    token,
  ]);

  const disablePushNotifications = useCallback(async () => {
    if (!isSupported || !isSecureContextValue) {
      setPermissionState("unsupported");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const registration = await registerServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiService.deletePushSubscription({
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }

      localStorage.setItem("chadbot_notifications", "false");
      setIsSubscribed(false);
      setPermissionState(Notification.permission);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo desactivar notificaciones push.";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }, [isSecureContextValue, isSupported, registerServiceWorker]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (!enabled || !token) return;
    if (!isSupported || !isSecureContextValue) return;
    if (Notification.permission !== "granted") return;
    if (localStorage.getItem("chadbot_notifications") !== "true") return;

    void syncCurrentSubscription().catch((err) => {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo sincronizar la suscripcion push.";
      setError(message);
    });
  }, [
    enabled,
    isSecureContextValue,
    isSupported,
    syncCurrentSubscription,
    token,
  ]);

  return {
    permissionState,
    isSupported,
    isSecureContext: isSecureContextValue,
    isSubscribed,
    isBusy,
    error,
    enablePushNotifications,
    disablePushNotifications,
    refreshState,
  };
}

