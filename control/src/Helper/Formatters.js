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

/**
 * Format a money amount for a table row or invoice line, e.g. "$1,234.50" or
 * "-$20.00". Always two decimals and keeps the sign. Uses the record's own
 * currency code when it has one, else USD. (The abbreviated "$1.2k" style is
 * only for the KPI summary tiles.)
 */
export const formatMoney = (value, currency) => {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  const format = (code) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  try {
    return format(currency || "USD");
  } catch {
    // An unrecognised currency code makes Intl throw; fall back to USD.
    return format("USD");
  }
};
