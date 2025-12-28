import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Funciones de formateo de fecha centralizadas para Argentina
const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";

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
    "$1 - $2"
  );
}

export function formatConversationTime(date: Date): string {
  // Validar que la fecha sea válida
  if (!date || isNaN(date.getTime())) {
    return "--";
  }

  const now = new Date();

  // Obtener fecha de hoy en Argentina
  const todayInArgentina = new Date().toLocaleDateString("en-CA", {
    timeZone: ARGENTINA_TIMEZONE,
  }); // formato YYYY-MM-DD
  const messageDateInArgentina = date.toLocaleDateString("en-CA", {
    timeZone: ARGENTINA_TIMEZONE,
  });

  const isSameDay = todayInArgentina === messageDateInArgentina;

  if (isSameDay) {
    // Si es hoy, mostrar solo la hora
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: ARGENTINA_TIMEZONE,
    }).format(date);
  } else {
    // Si es otro día, mostrar día/mes
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: ARGENTINA_TIMEZONE,
    }).format(date);
  }
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

// Función helper para manejar fechas que pueden ser null/undefined
export function safeFormatDate(
  date: Date | string | null | undefined,
  formatter: (d: Date) => string
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
  messages: Array<{ sender: string; timestamp: Date }>
): boolean {
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
}

// Función para obtener el tiempo restante en la ventana de 24 horas
export function getRemainingTimeIn24HourWindow(
  messages: Array<{ sender: string; timestamp: Date }>
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
