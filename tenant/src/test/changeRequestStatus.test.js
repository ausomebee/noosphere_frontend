import { describe, it, expect } from "vitest";
import {
  isChangeRequestOpen,
  lastSubmittedAtFrom,
  sortNewestFirst,
} from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/changeRequestStatus";

const at = (iso) => new Date(iso).getTime();

describe("lastSubmittedAtFrom", () => {
  it("takes the most recent SUBMITTED event", () => {
    const history = [
      { action: "CREATED", createdAt: "2026-08-01T10:00:00Z" },
      { action: "SUBMITTED", createdAt: "2026-08-02T10:00:00Z" },
      { action: "EDITED", createdAt: "2026-08-03T10:00:00Z" },
      { action: "SUBMITTED", createdAt: "2026-08-04T10:00:00Z" },
    ];
    expect(lastSubmittedAtFrom(history)).toBe(at("2026-08-04T10:00:00Z"));
  });

  it("is null when the report has never been submitted", () => {
    expect(
      lastSubmittedAtFrom([{ action: "DRAFT", createdAt: "2026-08-01T10:00:00Z" }])
    ).toBeNull();
    expect(lastSubmittedAtFrom([])).toBeNull();
    expect(lastSubmittedAtFrom(undefined)).toBeNull();
  });

  it("ignores entries with no timestamp", () => {
    expect(lastSubmittedAtFrom([{ action: "SUBMITTED" }])).toBeNull();
  });
});

// The lifecycle the flow is meant to follow, start to finish.
describe("change request lifecycle", () => {
  const submittedAt = at("2026-08-02T10:00:00Z");
  const request = { createdAt: "2026-08-03T10:00:00Z" }; // raised after it

  it("opens when the supervisor raises it", () => {
    expect(isChangeRequestOpen(request, submittedAt)).toBe(true);
  });

  it("stays open while the report sits back in draft", () => {
    // Reverting to draft adds no SUBMITTED event, so nothing changes.
    expect(isChangeRequestOpen(request, submittedAt)).toBe(true);
  });

  it("closes once the creator resubmits for approval", () => {
    const resubmittedAt = at("2026-08-04T10:00:00Z");
    expect(isChangeRequestOpen(request, resubmittedAt)).toBe(false);
  });

  it("opens again when the supervisor raises a second request", () => {
    const resubmittedAt = at("2026-08-04T10:00:00Z");
    const second = { createdAt: "2026-08-05T10:00:00Z" };
    expect(isChangeRequestOpen(second, resubmittedAt)).toBe(true);
    // the answered one stays closed
    expect(isChangeRequestOpen(request, resubmittedAt)).toBe(false);
  });

  it("closes the second one after the creator resubmits again", () => {
    const second = { createdAt: "2026-08-05T10:00:00Z" };
    expect(isChangeRequestOpen(second, at("2026-08-06T10:00:00Z"))).toBe(false);
  });
});

describe("isChangeRequestOpen fallbacks", () => {
  it("treats a request as open when the report was never submitted", () => {
    expect(isChangeRequestOpen({ createdAt: "2026-08-03T10:00:00Z" }, null)).toBe(
      true
    );
  });

  it("treats an undated or unparseable request as open", () => {
    expect(isChangeRequestOpen({}, at("2026-08-02T10:00:00Z"))).toBe(true);
    expect(isChangeRequestOpen(undefined, at("2026-08-02T10:00:00Z"))).toBe(true);
    expect(
      isChangeRequestOpen({ createdAt: "not a date" }, at("2026-08-02T10:00:00Z"))
    ).toBe(true);
  });
});

describe("sortNewestFirst", () => {
  it("puts the most recent request first", () => {
    const sorted = sortNewestFirst([
      { id: "old", createdAt: "2026-08-01T10:00:00Z" },
      { id: "new", createdAt: "2026-08-05T10:00:00Z" },
      { id: "mid", createdAt: "2026-08-03T10:00:00Z" },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input", () => {
    const input = [
      { id: "a", createdAt: "2026-08-01T10:00:00Z" },
      { id: "b", createdAt: "2026-08-05T10:00:00Z" },
    ];
    sortNewestFirst(input);
    expect(input.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
