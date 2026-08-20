import { describe, it, expect } from "vitest";
import { toProgressEntry } from "../Pages/HelpAndSupport/SupportRequests/progressTrack";

// Shapes taken from a live issue-with-Logs response.
const log = {
  action: "updated issue 7ad4d5f8-bd19-48cc-8c98-b2b6f9cdc684",
  reason: "Issue management",
  accessedBy: "ajibola oluwagbemileke",
  outcome: "SUCCESS",
  createdAt: "2026-08-20T15:01:29.694Z",
};

describe("toProgressEntry", () => {
  it("puts the issue name where the raw id was", () => {
    const entry = toProgressEntry(log, "MM/DD/YYYY", "12-hour", "RGEGFG");
    expect(entry.action).toBe("updated issue RGEGFG");
    expect(entry.action).not.toMatch(/7ad4d5f8/);
  });

  it("drops the id entirely when the name is unknown", () => {
    const entry = toProgressEntry(log, "MM/DD/YYYY", "12-hour");
    expect(entry.action).toBe("updated issue");
    expect(entry.action).not.toMatch(/7ad4d5f8/);
  });

  it("leaves an action with no id untouched", () => {
    const entry = toProgressEntry(
      { ...log, action: "added a comment" },
      "MM/DD/YYYY",
      "12-hour",
      "RGEGFG"
    );
    expect(entry.action).toBe("added a comment");
  });

  it("title-cases the actor", () => {
    expect(toProgressEntry(log, "MM/DD/YYYY", "12-hour").person).toBe(
      "Ajibola Oluwagbemileke"
    );
  });

  it("falls back to the admin relation when accessedBy is null", () => {
    const entry = toProgressEntry(
      { ...log, accessedBy: null, admin: { firstName: "ajibola", lastName: "oluwagbemileke" } },
      "MM/DD/YYYY",
      "12-hour"
    );
    expect(entry.person).toBe("Ajibola Oluwagbemileke");
  });

  it("flags only a non-successful outcome", () => {
    expect(toProgressEntry(log, "MM/DD/YYYY", "12-hour").failed).toBe(false);
    expect(
      toProgressEntry({ ...log, outcome: "FAILED" }, "MM/DD/YYYY", "12-hour").failed
    ).toBe(true);
    // A null outcome is not a failure.
    expect(
      toProgressEntry({ ...log, outcome: null }, "MM/DD/YYYY", "12-hour").failed
    ).toBe(false);
  });

  it("never renders an empty action", () => {
    expect(toProgressEntry({}, "MM/DD/YYYY", "12-hour").action).toBe("Updated");
  });
});
