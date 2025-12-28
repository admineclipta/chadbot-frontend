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
    hostname.includes("chadbot-backend.azurewebsites.net") ||
    hostname.includes("dev") ||
    hostname.includes("staging")
  ) {
    return {
      apiUrl: "https://chadbot-backend-dev.azurewebsites.net/api/v1/",
      wsUrl: "https://chadbot-backend-dev.azurewebsites.net/ws",
      environment: "staging",
      environmentName: "staging",
    };
  }

  return {
    apiUrl: "https://chadbot-backend.azurewebsites.net/api/v1/",
    wsUrl: "https://chadbot-backend.azurewebsites.net/ws",
    environment: "production",
    environmentName: "prod",
  };
}

export const config = getConfig();
