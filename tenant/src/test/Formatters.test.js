import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDateForInput,
  formatDateRange,
  formatDateHeader,
  formatLocalDate,
  formatTime,
  formatHour,
  formatDuration,
  formatTimerDisplay,
  calculateSessionHours,
  timeToSeconds,
  formatLatency,
  getCurrentTimestamp,
  formatMsgTime,
  getCurrencySymbol,
  formatCurrency,
  formatFileSize,
  formatLabel,
  formatItemLabel,
  formatGender,
  getInitials,
} from "../Helper/Formatters";

describe("Formatters", () => {
  // ── Date Formatters ──
  describe("formatDate", () => {
    it("returns N/A for falsy input", () => {
      expect(formatDate(null)).toBe("N/A");
      expect(formatDate("")).toBe("N/A");
      expect(formatDate(undefined)).toBe("N/A");
    });

    it("returns Invalid date for bad input", () => {
      expect(formatDate("not-a-date")).toBe("Invalid date");
    });

    it("formats MM/DD/YYYY (default)", () => {
      expect(formatDate("2026-01-15")).toMatch(/01\/15\/2026/);
    });

    it("formats DD/MM/YYYY", () => {
      expect(formatDate("2026-01-15", "DD/MM/YYYY")).toMatch(/15\/01\/2026/);
    });

    it("formats YYYY-MM-DD", () => {
      expect(formatDate("2026-01-15", "YYYY-MM-DD")).toMatch(/2026-01-15/);
    });

    it("formats MMM DD, YYYY", () => {
      const result = formatDate("2026-01-15", "MMM DD, YYYY");
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/2026/);
    });
  });

  describe("formatDateTime", () => {
    it("returns N/A for falsy input", () => {
      expect(formatDateTime(null)).toBe("N/A");
    });

    it("returns Invalid date for bad input", () => {
      expect(formatDateTime("bad")).toBe("Invalid date");
    });

    it("returns date and time string", () => {
      const result = formatDateTime("2026-01-15T14:30:00Z");
      expect(result).toBeTruthy();
      expect(result).not.toBe("N/A");
    });
  });

  describe("formatDateForInput", () => {
    it("returns empty string for falsy", () => {
      expect(formatDateForInput("")).toBe("");
      expect(formatDateForInput(null)).toBe("");
    });

    it("extracts YYYY-MM-DD from ISO string", () => {
      expect(formatDateForInput("2026-01-15T14:30:00Z")).toBe("2026-01-15");
    });
  });

  describe("formatDateRange", () => {
    it("formats from-to range", () => {
      const result = formatDateRange("2026-01-01", "2026-01-31");
      expect(result).toContain("—");
    });
  });

  describe("formatDateHeader", () => {
    it("returns Today for today", () => {
      expect(formatDateHeader(new Date().toISOString())).toBe("Today");
    });

    it("returns Yesterday for yesterday", () => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      expect(formatDateHeader(y.toISOString())).toBe("Yesterday");
    });

    it("returns weekday label for older dates", () => {
      const old = new Date();
      old.setDate(old.getDate() - 5);
      const result = formatDateHeader(old.toISOString());
      expect(result).not.toBe("Today");
      expect(result).not.toBe("Yesterday");
    });
  });

  describe("formatLocalDate", () => {
    it("formats date as YYYY-MM-DD", () => {
      expect(formatLocalDate("2026-03-05")).toMatch(/2026-03-05/);
    });
  });

  // ── Time Formatters ──
  describe("formatTime", () => {
    it("returns N/A for falsy", () => {
      expect(formatTime(null)).toBe("N/A");
      expect(formatTime("")).toBe("N/A");
    });

    it("formats 12-hour", () => {
      const result = formatTime("14:30:00", "12-hour");
      expect(result).toMatch(/02:30:00 PM/);
    });

    it("formats 24-hour", () => {
      const result = formatTime("14:30:00", "24-hour");
      expect(result).toBe("14:30:00");
    });

    it("handles midnight", () => {
      const result = formatTime("00:00:00", "12-hour");
      expect(result).toMatch(/12:00:00 AM/);
    });
  });

  describe("formatHour", () => {
    it("formats 12-hour", () => {
      expect(formatHour(0, "12-hour")).toBe("12 am");
      expect(formatHour(13, "12-hour")).toBe("1 pm");
    });

    it("formats 24-hour", () => {
      expect(formatHour(9, "24-hour")).toBe("09:00");
      expect(formatHour(23, "24-hour")).toBe("23:00");
    });
  });

  describe("formatDuration", () => {
    it("returns Not set for null/undefined", () => {
      expect(formatDuration(null)).toBe("Not set");
      expect(formatDuration(undefined)).toBe("Not set");
    });

    it("formats seconds to HH:MM:SS", () => {
      expect(formatDuration(3661)).toBe("01:01:01");
      expect(formatDuration(0)).toBe("00:00:00");
    });
  });

  describe("formatTimerDisplay", () => {
    it("formats MM:SS", () => {
      expect(formatTimerDisplay(90)).toBe("01:30");
      expect(formatTimerDisplay(0)).toBe("00:00");
    });
  });

  describe("calculateSessionHours", () => {
    it("returns 0.00 for missing inputs", () => {
      expect(calculateSessionHours(null, null)).toBe("0.00");
    });

    it("returns 0.00 for invalid dates", () => {
      expect(calculateSessionHours("bad", "bad")).toBe("0.00");
    });

    it("calculates hours between two times", () => {
      const result = calculateSessionHours(
        "2026-01-15T10:00:00Z",
        "2026-01-15T12:30:00Z"
      );
      expect(parseFloat(result)).toBe(2.5);
    });
  });

  describe("timeToSeconds", () => {
    it("returns 0 for invalid input", () => {
      expect(timeToSeconds(null)).toBe(0);
      expect(timeToSeconds("bad")).toBe(0);
    });

    it("converts HH:MM:SS to seconds", () => {
      expect(timeToSeconds("01:30:00")).toBe(5400);
      expect(timeToSeconds("00:01:01")).toBe(61);
    });
  });

  describe("formatLatency", () => {
    it("returns --:--:-- for null", () => {
      expect(formatLatency(null)).toBe("--:--:--");
      expect(formatLatency(undefined)).toBe("--:--:--");
    });

    it("formats seconds to hr:mm:ss", () => {
      expect(formatLatency(3661)).toBe("01hr:01mm:01ss");
      expect(formatLatency(0)).toBe("00hr:00mm:00ss");
    });
  });

  describe("getCurrentTimestamp", () => {
    it("returns HH:MM:SS format", () => {
      expect(getCurrentTimestamp()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("formatMsgTime", () => {
    it("returns empty for falsy", () => {
      expect(formatMsgTime("")).toBe("");
      expect(formatMsgTime(null)).toBe("");
    });

    it("returns time for today", () => {
      const result = formatMsgTime(new Date().toISOString());
      expect(result).toBeTruthy();
    });
  });

  // ── Currency Formatters ──
  describe("getCurrencySymbol", () => {
    it("returns $ for USD", () => {
      expect(getCurrencySymbol("USD")).toBe("$");
    });

    it("returns € for EUR", () => {
      expect(getCurrencySymbol("EUR")).toBe("€");
    });

    it("returns code for unknown", () => {
      expect(getCurrencySymbol("XYZ")).toBe("XYZ");
    });
  });

  describe("formatCurrency", () => {
    it("formats with USD symbol", () => {
      expect(formatCurrency(1000, "USD")).toContain("$");
      expect(formatCurrency(1000, "USD")).toContain("1,000.00");
    });

    it("handles 0", () => {
      expect(formatCurrency(0)).toContain("0.00");
    });
  });

  // ── Text Formatters ──
  describe("formatFileSize", () => {
    it("returns Unknown for falsy", () => {
      expect(formatFileSize(0)).toBe("Unknown");
      expect(formatFileSize(null)).toBe("Unknown");
    });

    it("formats bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("formats KB", () => {
      expect(formatFileSize(2048)).toBe("2 KB");
    });

    it("formats MB", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
    });
  });

  describe("formatLabel", () => {
    it("returns empty for falsy", () => {
      expect(formatLabel("")).toBe("");
    });

    it("converts camelCase to Title Case", () => {
      expect(formatLabel("firstName")).toBe("First Name");
    });
  });

  describe("formatItemLabel", () => {
    it("returns empty for falsy", () => {
      expect(formatItemLabel("")).toBe("");
    });

    it("converts snake_case to Title Case", () => {
      expect(formatItemLabel("fixed_bonus")).toBe("Fixed Bonus");
    });
  });

  describe("formatGender", () => {
    it("returns empty for falsy", () => {
      expect(formatGender("")).toBe("");
    });

    it("capitalizes first letter", () => {
      expect(formatGender("male")).toBe("Male");
    });
  });

  describe("getInitials", () => {
    it("returns ? for falsy", () => {
      expect(getInitials("")).toBe("?");
    });

    it("extracts initials", () => {
      expect(getInitials("John Doe")).toBe("JD");
      expect(getInitials("Alice Bob Charlie")).toBe("AB");
    });
  });
});
