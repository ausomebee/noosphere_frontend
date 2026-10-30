/**
 * Centralized formatting utilities for the control module.
 */

/**
 * Format a date string as "M/D/YYYY" (e.g. "1/5/2024").
 * Most common date-only format used across the control module.
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid date";
    return d.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Format a date string as "MM/DD/YYYY" (e.g. "01/05/2024").
 * Zero-padded variant used in table columns.
 */
export const formatDatePadded = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid date";
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Format a date string as "Jan 1, 2024" (short month name).
 * Used for display-friendly date labels.
 */
export const formatDateShortMonth = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

/**
 * Format a date string as "MM/DD/YYYY, HH:MM AM/PM" (e.g. "01/05/2024, 02:45 PM").
 * Used for log entries and audit trails.
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid date";
    return d.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Format a date string as "Nov 25, 2023 (02:45 PM)".
 * Parenthesized time variant used in issue management.
 */
export const formatDateTimeParenthesized = (dateStr) => {
  if (!dateStr || dateStr === "N/A") return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "N/A";
    return d
      .toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", " (")
      .replace(/(\d+:\d+ [AP]M)/, "$1)");
  } catch {
    return "N/A";
  }
};

/**
 * Format a date string as "January 2024" (long month + year only).
 * Used for card added-date displays.
 */
export const formatDateMonthYear = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

/**
 * Format a date string to time only — "H:MM AM/PM" (e.g. "2:45 PM").
 */
export const formatTime = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid time";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Invalid time";
  }
};
