/**
 * Centralized formatting utilities for the tenant module.
 *
 * Settings-dependent formatters accept the tenant's preferred format as a parameter.
 * Use the useFormatSettings() hook to get { dateFormat, timeFormat, currency }.
 */

// ─── Currency symbols ──────────────────────────────────────────────
const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  CAD: "C$",
};

// ═══════════════════════════════════════════════════════════════════
// DATE FORMATTERS (settings-dependent)
// ═══════════════════════════════════════════════════════════════════

/**
 * Format a date string according to the tenant's chosen date format.
 * @param {string|Date} dateStr
 * @param {string} dateFormat - "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "MMM DD, YYYY"
 * @returns {string}
 */
export const formatDate = (dateStr, dateFormat = "MM/DD/YYYY") => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid date";

    const year = d.getFullYear();
    const month = d.getMonth(); // 0-based
    const day = d.getDate();
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");

    switch (dateFormat) {
      case "DD/MM/YYYY":
        return `${dd}/${mm}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${mm}-${dd}`;
      case "MMM DD, YYYY": {
        const monthName = d.toLocaleDateString("en-US", { month: "short" });
        return `${monthName} ${dd}, ${year}`;
      }
      case "MM/DD/YYYY":
      default:
        return `${mm}/${dd}/${year}`;
    }
  } catch {
    return "Invalid date";
  }
};

/**
 * Format a date+time string according to tenant settings.
 * @param {string|Date} dateStr
 * @param {string} dateFormat
 * @param {string} timeFormat - "12-hour" | "24-hour"
 * @returns {string}
 */
export const formatDateTime = (dateStr, dateFormat = "MM/DD/YYYY", timeFormat = "12-hour") => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Invalid date";
    const datePart = formatDate(dateStr, dateFormat);
    const timePart = formatTimeFromDate(d, timeFormat);
    return `${datePart} ${timePart}`;
  } catch {
    return "Invalid date";
  }
};

/**
 * Convert an ISO string to YYYY-MM-DD for <input type="date">.
 * NOT settings-dependent — always YYYY-MM-DD for HTML inputs.
 */
export const formatDateForInput = (isoStr) => {
  if (!isoStr) return "";
  return isoStr.split("T")[0];
};

/**
 * Format a date range "From — To".
 */
export const formatDateRange = (from, to, dateFormat = "MM/DD/YYYY") => {
  return `${formatDate(from, dateFormat)} — ${formatDate(to, dateFormat)}`;
};

/**
 * Format a date header for chat: "Today", "Yesterday", or weekday label.
 * NOT settings-dependent — these are relative labels.
 */
export const formatDateHeader = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

/**
 * Date to YYYY-MM-DD for API payloads (NOT for display).
 */
export const formatLocalDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ═══════════════════════════════════════════════════════════════════
// TIME FORMATTERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Internal: Format a Date object's time portion.
 */
const formatTimeFromDate = (d, timeFormat = "12-hour") => {
  if (timeFormat === "24-hour") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
};

/**
 * Format a time string (HH:mm or HH:mm:ss) according to tenant time format.
 * @param {string} timeStr - e.g. "14:30:00"
 * @param {string} timeFormat - "12-hour" | "24-hour"
 */
export const formatTime = (timeStr, timeFormat = "12-hour") => {
  if (!timeStr) return "N/A";
  const [hours, minutes, seconds = "00"] = timeStr.split(":");
  const h = parseInt(hours, 10);

  if (timeFormat === "24-hour") {
    return `${String(h).padStart(2, "0")}:${minutes}:${seconds}`;
  }

  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, "0")}:${minutes}:${seconds} ${period}`;
};

/**
 * Format an hour number (0-23) for calendar display.
 * @param {number} hour
 * @param {string} timeFormat - "12-hour" | "24-hour"
 */
export const formatHour = (hour, timeFormat = "12-hour") => {
  if (timeFormat === "24-hour") {
    return `${String(hour).padStart(2, "0")}:00`;
  }
  const period = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12} ${period}`;
};

/**
 * Seconds to HH:MM:SS display. NOT settings-dependent.
 */
export const formatDuration = (secs) => {
  if (secs === undefined || secs === null) return "Not set";
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

/**
 * Seconds to MM:SS for timer displays. NOT settings-dependent.
 */
export const formatTimerDisplay = (s) => {
  const mins = Math.floor(s / 60).toString().padStart(2, "0");
  const secs = (s % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

/**
 * Calculate decimal hours between two ISO timestamps.
 */
export const calculateSessionHours = (startTime, endTime) => {
  if (!startTime || !endTime) return "0.00";
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start) || isNaN(end)) return "0.00";
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours.toFixed(2);
};

/**
 * Convert HH:MM:SS string to total seconds.
 */
export const timeToSeconds = (timeStr) => {
  if (!timeStr || !/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return 0;
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Seconds to "XXhr:XXmm:XXss" for latency display.
 */
export const formatLatency = (seconds) => {
  if (seconds === null || seconds === undefined) return "--:--:--";
  const absSeconds = Math.max(0, seconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  return `${hours.toString().padStart(2, "0")}hr:${minutes
    .toString()
    .padStart(2, "0")}mm:${secs.toString().padStart(2, "0")}ss`;
};

/**
 * Current time as HH:MM:SS string.
 */
export const getCurrentTimestamp = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format message time with optional day label.
 */
export const formatMsgTime = (dateStr, timeFormat = "12-hour") => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const dayLabel =
    d.toDateString() === now.toDateString()
      ? ""
      : d.toLocaleDateString([], { weekday: "short" }) + " ";
  const timePart = formatTimeFromDate(d, timeFormat);
  return dayLabel + timePart;
};

// ═══════════════════════════════════════════════════════════════════
// CURRENCY FORMATTERS (settings-dependent)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get currency symbol for a currency code.
 */
export const getCurrencySymbol = (currencyCode = "USD") => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Format a monetary amount with the tenant's currency symbol.
 * @param {number} amount
 * @param {string} currencyCode - "USD" | "EUR" | "GBP" | "NGN" | "CAD"
 */
export const formatCurrency = (amount, currencyCode = "USD") => {
  const symbol = getCurrencySymbol(currencyCode);
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ═══════════════════════════════════════════════════════════════════
// GENERAL / TEXT FORMATTERS (not settings-dependent)
// ═══════════════════════════════════════════════════════════════════

/**
 * Bytes to human-readable file size (B / KB / MB).
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

/**
 * camelCase to "Title Case" (e.g. "firstName" → "First Name").
 */
export const formatLabel = (text) => {
  if (!text) return "";
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

/**
 * Underscored/snake_case to "Title Case" (e.g. "fixed_bonus" → "Fixed Bonus").
 */
export const formatItemLabel = (name) => {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Capitalize first letter of a string.
 */
export const formatGender = (gender) => {
  if (!gender) return "";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

/**
 * Extract initials from a name ("John Doe" → "JD").
 */
export const getInitials = (name) =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
