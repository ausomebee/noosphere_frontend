/**
 * Centralized formatting utilities for the client module.
 */

/**
 * Format a date string as "Mon dd, yyyy" (e.g., "Jan 5, 2025").
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid date";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Format a date string as "Mon dd" (e.g., "Jan 5") — no year.
 */
export const formatDateShort = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid date";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Format a time-only string as "Mon dd, yyyy hh:mm AM/PM".
 * Used when only the time portion of a Date is needed.
 */
export const formatTimeFromDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/**
 * Convert "HH:mm" or "HH:mm:ss" to "h:mm AM/PM".
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m.padStart(2, "0")} ${period}`;
};

/**
 * Format a date string as a chat date-header label ("Today", "Yesterday", or "Monday, Jan 5").
 */
export const formatDateHeader = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format a message timestamp — short weekday prefix + time (e.g., "Mon 2:30 PM").
 * If the message is from today, omits the weekday.
 */
export const formatMsgTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const dayLabel =
    d.toDateString() === now.toDateString()
      ? ""
      : d.toLocaleDateString([], { weekday: "short" }) + " ";
  return dayLabel + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
