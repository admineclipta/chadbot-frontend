const PRESENCE_SESSION_STORAGE_KEY = "chadbot_presence_session_id";

function createSessionId(): string {
  return crypto.randomUUID();
}

export function getOrCreatePresenceSessionId(): string {
  if (typeof window === "undefined") {
    return createSessionId();
  }

  const existing = sessionStorage.getItem(PRESENCE_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  sessionStorage.setItem(PRESENCE_SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export function rotatePresenceSessionId(): string {
  const sessionId = createSessionId();

  if (typeof window !== "undefined") {
    sessionStorage.setItem(PRESENCE_SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}
