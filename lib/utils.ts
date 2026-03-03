import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Genera un color pastel consistente basado en un string (ID, nombre, etc.)
 * Usa un hash simple para generar valores HSL consistentes
 * @param seed - String para generar el color (ID del agente, nombre, etc.)
 * @returns Color HSL en formato string "hsl(h, s%, l%)"
 */
export function generatePastelColor(seed: string): string {
  // Hash simple del string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generar hue (0-360) basado en el hash
  const hue = Math.abs(hash % 360);

  // Valores fijos para pastel: saturación moderada y luminosidad alta
  const saturation = 70;
  const lightness = 85;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Funciones de formateo de fecha centralizadas para Argentina
const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";

function getDayKeyInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayKeyToUtcTimestamp(dayKey: string): number {
  return new Date(`${dayKey}T00:00:00.000Z`).getTime();
}

export function formatMessageTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: ARGENTINA_TIMEZONE,
  }).format(date);

  // Convertir formato "dd/mm, hh:mm a.m." a "dd/mm - hh:mm a.m."
  return formatted.replace(
    /(\d{2}\/\d{2}),?\s*(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/,
    "$1 - $2",
  );
}

export function formatConversationTime(date: Date): string {
  // Validar que la fecha sea valida
  if (!date || isNaN(date.getTime())) {
    return "--";
  }

  const todayKey = getDayKeyInTimezone(new Date(), ARGENTINA_TIMEZONE);
  const messageKey = getDayKeyInTimezone(date, ARGENTINA_TIMEZONE);
  const dayDiff = Math.floor(
    (dayKeyToUtcTimestamp(todayKey) - dayKeyToUtcTimestamp(messageKey)) /
      86_400_000,
  );

  if (dayDiff === 0) {
    // Hoy: mostrar solo la hora en 24h
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: ARGENTINA_TIMEZONE,
    }).format(date);
  }

  if (dayDiff === 1) {
    return "Ayer";
  }

  if (dayDiff >= 2 && dayDiff <= 6) {
    const weekday = new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      timeZone: ARGENTINA_TIMEZONE,
    }).format(date);

    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  const parts = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    timeZone: ARGENTINA_TIMEZONE,
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "--";
  const month = parts.find((part) => part.type === "month")?.value ?? "--";
  const year = parts.find((part) => part.type === "year")?.value ?? "----";

  return `${day}/${month}/${year}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: ARGENTINA_TIMEZONE,
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ARGENTINA_TIMEZONE,
  }).format(date);
}

export function parseApiTimestamp(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(millis);
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      const millis =
        numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
      return new Date(millis);
    }

    return new Date(value);
  }

  return new Date();
}

// Función helper para manejar fechas que pueden ser null/undefined
export function safeFormatDate(
  date: Date | string | null | undefined,
  formatter: (d: Date) => string,
): string {
  if (!date) return "Sin fecha";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "Fecha inválida";
    return formatter(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Error en fecha";
  }
}

// Función para validar si han pasado más de 24 horas desde el último mensaje del cliente
// WhatsApp Business requiere que los mensajes de texto libre se envíen dentro de las 24 horas
// siguientes al último mensaje del cliente. Después de ese período, solo se pueden enviar plantillas.
export function isOutside24HourWindow(
  messages: Array<{ sender: string; timestamp: Date }>,
): boolean {
  // Validación de ventana de 24 horas desactivada temporalmente.
  // Mantener esta firma para poder restaurar la lógica sin afectar llamados.
  void messages;
  return false;

  /*
  if (!messages || messages.length === 0) {
    return true; // Si no hay mensajes, está fuera de la ventana
  }

  // Encontrar el último mensaje del cliente
  const lastClientMessage = [...messages]
    .reverse()
    .find((message) => message.sender === "client");

  if (!lastClientMessage) {
    return true; // Si no hay mensajes del cliente, está fuera de la ventana
  }

  // Calcular la diferencia en milisegundos
  const now = new Date();
  const timeDifference = now.getTime() - lastClientMessage.timestamp.getTime();

  // 24 horas en milisegundos = 24 * 60 * 60 * 1000
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return timeDifference > twentyFourHours;
  */
}

// Función para obtener el tiempo restante en la ventana de 24 horas
export function getRemainingTimeIn24HourWindow(
  messages: Array<{ sender: string; timestamp: Date }>,
): string | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  const lastClientMessage = [...messages]
    .reverse()
    .find((message) => message.sender === "client");

  if (!lastClientMessage) {
    return null;
  }

  const now = new Date();
  const timeDifference = now.getTime() - lastClientMessage.timestamp.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const remaining = twentyFourHours - timeDifference;

  if (remaining <= 0) {
    return null;
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

