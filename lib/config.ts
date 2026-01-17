interface Config {
  apiUrl: string;
  wsUrl: string; // WebSocket URL
  environment: "development" | "staging" | "production";
  environmentName: string;
}

function getConfig(): Config {
  if (typeof window === "undefined") {
    // Server-side: default to development
    return {
      apiUrl: "http://localhost:8080/api/v1/",
      wsUrl: "http://localhost:8080/ws",
      environment: "development",
      environmentName: "localhost",
    };
  }

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return {
      apiUrl: "http://localhost:8080/api/v1/",
      wsUrl: "http://localhost:8080/ws",
      environment: "development",
      environmentName: "localhost",
    };
  }

  if (
    hostname.includes(".run.app") ||
    hostname.includes("dev") ||
    hostname.includes("staging")
  ) {
    return {
      apiUrl:
        "https://chadbot-backend-914352408266.us-central1.run.app/api/v1/",
      wsUrl: "https://chadbot-backend-914352408266.us-central1.run.app/ws",
      environment: "staging",
      environmentName: "staging",
    };
  }

  return {
    apiUrl: "http://localhost:8080/api/v1/",
    wsUrl: "http://localhost:8080/ws",
    environment: "production",
    environmentName: "prod",
  };
}

export const config = getConfig();

// Debounce constants for API calls
export const DEBOUNCE_NONE = 0; // No debounce - immediate fetch
export const DEBOUNCE_FILTER_MS = 150; // For filters and pagination
export const DEBOUNCE_SEARCH_MS = 300; // For search inputs

// UI Version Configuration
export const UI_VERSION_KEY = "chadbot_ui_version";

export function getUIVersion(): "original" | "restyled" {
  if (typeof window === "undefined") return "restyled"; // Default para SSR

  const saved = localStorage.getItem(UI_VERSION_KEY);
  return saved === "original" ? "original" : "restyled"; // Default: restyled
}

export function setUIVersion(version: "original" | "restyled"): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(UI_VERSION_KEY, version);
    window.location.reload(); // Recargar para aplicar cambios
  }
}
