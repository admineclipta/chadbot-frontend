"use client";

export const AUTH_STORAGE_KEYS = {
  TOKEN: "chadbot_token",
  USER: "chadbot_user",
  EXPIRES_AT: "chadbot_token_expires_at",
} as const;

export const AUTH_EXPIRED_EVENT = "chadbot:auth-expired";

interface JwtPayload {
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

function getJwtExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp || Number.isNaN(payload.exp)) return null;
  return payload.exp * 1000;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
}

export function getTokenExpiryMs(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.EXPIRES_AT);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isTokenExpired(options: { skewSeconds?: number } = {}): boolean {
  const { skewSeconds = 30 } = options;
  const token = getAuthToken();
  if (!token) return true;

  const storedExpiry = getTokenExpiryMs();
  const jwtExpiry = getJwtExpiryMs(token);
  const effectiveExpiry = jwtExpiry ?? storedExpiry;

  if (!effectiveExpiry) {
    return false;
  }

  const nowWithSkew = Date.now() + skewSeconds * 1000;
  return nowWithSkew >= effectiveExpiry;
}

export function setAuthSession(params: {
  accessToken: string;
  expiresIn?: number;
  expiresAtMs?: number;
  user?: unknown;
}): void {
  if (typeof window === "undefined") return;

  const { accessToken, expiresIn, expiresAtMs, user } = params;
  localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, accessToken);

  if (user !== undefined) {
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  }

  const expiryFromJwt = getJwtExpiryMs(accessToken);
  const expiryFromExpiresAt = expiresAtMs;
  const expiryFromExpiresIn =
    typeof expiresIn === "number" && Number.isFinite(expiresIn)
      ? Date.now() + expiresIn * 1000
      : null;

  const resolvedExpiry =
    expiryFromJwt ?? expiryFromExpiresAt ?? expiryFromExpiresIn ?? null;

  if (resolvedExpiry) {
    localStorage.setItem(AUTH_STORAGE_KEYS.EXPIRES_AT, String(resolvedExpiry));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.EXPIRES_AT);
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  localStorage.removeItem(AUTH_STORAGE_KEYS.EXPIRES_AT);
}

export function buildSafeNextPath(input: string | null): string | null {
  if (!input) return null;

  const candidate = input.trim();
  if (!candidate) return null;

  try {
    if (candidate.startsWith("//")) return null;
    if (!candidate.startsWith("/")) return null;

    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(candidate, origin);
    if (parsed.origin !== origin) return null;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
