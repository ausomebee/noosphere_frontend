import { describe, it, expect } from "vitest";
import reducer, { setSettings, resetSettings } from "../ReduxStore/features/generalSettingsSlice";

describe("generalSettingsSlice", () => {
  const initialState = {
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12-hour",
    currency: "USD",
    loaded: false,
  };

  it("returns the initial state", () => {
    expect(reducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  describe("setSettings", () => {
    it("sets all settings and marks loaded", () => {
      const next = reducer(initialState, setSettings({
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24-hour",
        currency: "EUR",
      }));
      expect(next.dateFormat).toBe("DD/MM/YYYY");
      expect(next.timeFormat).toBe("24-hour");
      expect(next.currency).toBe("EUR");
      expect(next.loaded).toBe(true);
    });

    it("only updates provided fields", () => {
      const next = reducer(initialState, setSettings({ dateFormat: "YYYY-MM-DD" }));
      expect(next.dateFormat).toBe("YYYY-MM-DD");
      expect(next.timeFormat).toBe("12-hour");
      expect(next.currency).toBe("USD");
      expect(next.loaded).toBe(true);
    });
  });

  describe("resetSettings", () => {
    it("resets to defaults", () => {
      const modified = {
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24-hour",
        currency: "EUR",
        loaded: true,
      };
      expect(reducer(modified, resetSettings())).toEqual(initialState);
    });
  });
});
