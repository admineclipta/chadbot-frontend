/**
 * Messaging Channels Configuration
 *
 * Centralizes the configuration for all messaging service types
 * including display names, icons, and metadata.
 */

export interface MessagingChannelConfig {
  /** Internal service type name (matches API) */
  type: string;
  /** Display name for UI */
  displayName: string;
  /** Path to icon (SVG preferred) */
  icon: string;
  /** Alternative icon format (if available) */
  iconPng?: string;
  /** Brand color for theming */
  color: string;
  /** Whether this channel is currently active/supported */
  enabled: boolean;
}

/**
 * Messaging channels configuration map
 * Key: service type name (lowercase, matches API)
 */
export const MESSAGING_CHANNELS: Record<string, MessagingChannelConfig> = {
  whatsapp: {
    type: "whatsapp",
    displayName: "WhatsApp",
    icon: "/whatsapp.svg",
    iconPng: "/WhatsApp.png",
    color: "#25D366",
    enabled: true,
  },
  "whatsapp business": {
    type: "whatsapp business",
    displayName: "WhatsApp Business",
    icon: "/whatsapp.svg",
    iconPng: "/WhatsApp.png",
    color: "#25D366",
    enabled: true,
  },
  "evolution api": {
    type: "evolution api",
    displayName: "Evolution API",
    icon: "/whatsapp.svg",
    iconPng: "/WhatsApp.png",
    color: "#25D366",
    enabled: true,
  },
  telegram: {
    type: "telegram",
    displayName: "Telegram",
    icon: "/telegram.svg",
    iconPng: "/Telegram_2019_Logo.png",
    color: "#0088cc",
    enabled: true,
  },
  instagram: {
    type: "instagram",
    displayName: "Instagram",
    icon: "/instagram.svg",
    color: "#E4405F",
    enabled: true,
  },
  facebook: {
    type: "facebook",
    displayName: "Facebook Messenger",
    icon: "/facebook-messengersvg.svg",
    color: "#0084FF",
    enabled: true,
  },
  messenger: {
    type: "messenger",
    displayName: "Messenger",
    icon: "/facebook-messengersvg.svg",
    color: "#0084FF",
    enabled: true,
  },
};

/**
 * Get messaging channel configuration by service type
 * Returns default config if not found
 */
export function getMessagingChannelConfig(
  serviceType: string | undefined,
): MessagingChannelConfig {
  if (!serviceType) {
    return {
      type: "unknown",
      displayName: "Desconocido",
      icon: "/placeholder.svg",
      color: "#6B7280",
      enabled: false,
    };
  }

  const normalizedType = serviceType.toLowerCase().trim();
  return (
    MESSAGING_CHANNELS[normalizedType] || {
      type: normalizedType,
      displayName: serviceType,
      icon: "/placeholder.svg",
      color: "#6B7280",
      enabled: false,
    }
  );
}

/**
 * Get all enabled messaging channels
 */
export function getEnabledChannels(): MessagingChannelConfig[] {
  return Object.values(MESSAGING_CHANNELS).filter((channel) => channel.enabled);
}

/**
 * Get messaging channel display name
 */
export function getChannelDisplayName(serviceType: string | undefined): string {
  return getMessagingChannelConfig(serviceType).displayName;
}

/**
 * Get messaging channel icon path
 */
export function getChannelIcon(
  serviceType: string | undefined,
  preferSvg: boolean = true,
): string {
  const config = getMessagingChannelConfig(serviceType);
  if (preferSvg) {
    return config.icon;
  }
  return config.iconPng || config.icon;
}

/**
 * Get messaging channel color
 */
export function getChannelColor(serviceType: string | undefined): string {
  return getMessagingChannelConfig(serviceType).color;
}
