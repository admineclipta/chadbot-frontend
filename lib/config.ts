interface Config {
  apiUrl: string;
  wsUrl: string; // WebSocket URL
  environment: "development" | "staging" | "production";
  environmentName: string;
  chadminUrl: string;
}

function getConfig(): Config {
  const defaultChadminDevUrl = "https://chadmin-admin-panel-20r4.bolt.host/";

  if (typeof window === "undefined") {
    // Server-side: default to development
    return {
      apiUrl:
        "https://chadbot-backend-914352408266.us-central1.run.app/api/v1/",
      wsUrl: "http://localhost:8080/ws",
      environment: "development",
      environmentName: "localhost",
      chadminUrl: process.env.NEXT_PUBLIC_CHADMIN_URL || defaultChadminDevUrl,
    };
  }

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return {
      apiUrl:
        "https://chadbot-backend-914352408266.us-central1.run.app/api/v1/",
      wsUrl: "http://localhost:8080/ws",
      environment: "development",
      environmentName: "localhost",
      chadminUrl: process.env.NEXT_PUBLIC_CHADMIN_URL || defaultChadminDevUrl,
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
      chadminUrl: process.env.NEXT_PUBLIC_CHADMIN_URL || "",
    };
  }

  return {
    apiUrl: "http://localhost:8080/api/v1/",
    wsUrl: "http://localhost:8080/ws",
    environment: "production",
    environmentName: "prod",
    chadminUrl: process.env.NEXT_PUBLIC_CHADMIN_URL || "",
  };
}

export const config = getConfig();

// Debounce constants for API calls
export const DEBOUNCE_NONE = 0; // No debounce - immediate fetch
export const DEBOUNCE_FILTER_MS = 150; // For filters and pagination
export const DEBOUNCE_SEARCH_MS = 300; // For search inputs
