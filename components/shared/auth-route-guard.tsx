"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AUTH_STORAGE_KEYS,
  buildSafeNextPath,
  getAuthToken,
  isTokenExpired,
} from "@/lib/auth-session";

interface AuthRouteGuardProps {
  children: ReactNode;
}

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/reset-password");
}

function buildCurrentPath(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

export default function AuthRouteGuard({ children }: AuthRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    const search = window.location.search.replace(/^\?/, "");
    const nextFromQuery = new URLSearchParams(window.location.search).get("next");

    const publicPath = isPublicPath(pathname);
    const token = getAuthToken();
    const hasValidSession = Boolean(token) && !isTokenExpired();

    if (publicPath) {
      if (pathname === "/login" && hasValidSession) {
        const requestedNext = buildSafeNextPath(nextFromQuery);
        router.replace(requestedNext ?? "/");
        return;
      }

      setChecked(true);
      return;
    }

    if (!hasValidSession) {
      const next = buildSafeNextPath(buildCurrentPath(pathname, search));
      const loginUrl = next
        ? `/login?next=${encodeURIComponent(next)}`
        : "/login";
      router.replace(loginUrl);
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== AUTH_STORAGE_KEYS.TOKEN &&
        event.key !== AUTH_STORAGE_KEYS.EXPIRES_AT
      ) {
        return;
      }

      const currentPath = window.location.pathname;
      if (isPublicPath(currentPath)) {
        return;
      }

      const token = getAuthToken();
      const hasValidSession = Boolean(token) && !isTokenExpired();
      if (!hasValidSession) {
        const candidate = `${window.location.pathname}${window.location.search}`;
        const next = buildSafeNextPath(candidate);
        const loginUrl = next
          ? `/login?next=${encodeURIComponent(next)}`
          : "/login";
        router.replace(loginUrl);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [router]);

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
