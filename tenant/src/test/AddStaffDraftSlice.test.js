import { describe, it, expect } from "vitest";
import reducer, { setDraftField, resetDraft } from "../ReduxStore/features/AddStaffDraftSlice";

describe("AddStaffDraftSlice", () => {
  const getInitial = () => reducer(undefined, { type: "unknown" });

  it("returns the initial state", () => {
    const state = getInitial();
    expect(state.formData.fullName).toBe("");
    expect(state.formData.email).toBe("");
    expect(state.formData.licenses).toHaveLength(1);
    expect(state.formData.otherPays).toEqual([]);
    expect(state.formData.deductions).toEqual([]);
    expect(state.formData.documents).toEqual([]);
  });

  describe("setDraftField", () => {
    it("updates a single field", () => {
      const state = reducer(getInitial(), setDraftField({ fullName: "John Doe" }));
      expect(state.formData.fullName).toBe("John Doe");
    });

    it("updates multiple fields", () => {
      const state = reducer(getInitial(), setDraftField({
        email: "john@test.com",
        gender: "male",
        city: "Lagos",
      }));
      expect(state.formData.email).toBe("john@test.com");
      expect(state.formData.gender).toBe("male");
      expect(state.formData.city).toBe("Lagos");
    });

    it("updates array fields", () => {
      const licenses = [{ licenseName: "RN", licenseNumber: "123", expiryDate: "2027-01-01", state: "NY" }];
      const state = reducer(getInitial(), setDraftField({ licenses }));
      expect(state.formData.licenses).toEqual(licenses);
    });

    it("preserves other fields", () => {
      const state = reducer(getInitial(), setDraftField({ fullName: "Jane" }));
      expect(state.formData.email).toBe("");
      expect(state.formData.licenses).toHaveLength(1);
    });
  });

  describe("resetDraft", () => {
    it("resets to initial state", () => {
      let state = reducer(getInitial(), setDraftField({ fullName: "John", email: "j@t.com" }));
      state = reducer(state, resetDraft());
      expect(state.formData.fullName).toBe("");
      expect(state.formData.email).toBe("");
    });
  });
});
