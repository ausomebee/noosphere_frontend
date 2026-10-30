import { describe, it, expect, vi, beforeEach } from "vitest";

const verbs = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock("../Helper/AxiosInterceptor", () => ({ default: () => verbs }));

import api from "../api/organisationStaffApis";

/**
 * The three staff wrappers that assemble a payload instead of forwarding one.
 *
 * The add/edit staff modal is a four-step wizard whose later steps are all
 * optional, so what reaches these wrappers is sparse and inconsistently shaped:
 * `payroll` may be absent entirely, its numeric fields arrive as either numbers
 * or strings and are always sent as strings, and `documents`/`licenses` may be
 * missing rather than empty. `minimumHours` is only meaningful for a salaried
 * schedule and is dropped otherwise, since sending it for an hourly staff
 * member makes the backend reject the whole record.
 *
 * Create runs its payload through omitEmpty, so an untouched optional step
 * vanishes from the request rather than being sent as "" or []; update does
 * not, because there an omitted key and an emptied one mean different things.
 * The plain forwarding wrappers are covered by
 * organisationStaffApis.generated.test.js.
 */

const tokens = { accessToken: "at", refreshToken: "rt" };

const staff = (over = {}) => ({
  fullName: "Ada Bello",
  email: "ada@example.com",
  roleId: "r1",
  tenantId: "t1",
  ...over,
  ...tokens,
});

const sent = (verb) => verbs[verb].mock.calls[0][1];

beforeEach(() => {
  Object.values(verbs).forEach((v) => v.mockReset());
  verbs.post.mockResolvedValue({ data: { id: "s1" } });
  verbs.put.mockResolvedValue({ data: { id: "s1" } });
});

describe("creating a staff member", () => {
  it("returns the created record", async () => {
    await expect(api.CreateTenantStaff(staff())).resolves.toEqual({ id: "s1" });
    expect(verbs.post.mock.calls[0][0]).toContain("/organization-staff/staff");
  });

  it("sends an all-empty payroll block when the payroll step was skipped", async () => {
    await api.CreateTenantStaff(staff());
    expect(sent("post").payroll).toEqual({
      paymentSchedule: "",
      ratePerHour: "",
      otherPays: [],
      deductions: [],
      tenantId: "t1",
    });
  });

  it("stringifies a rate that arrived as a number", async () => {
    await api.CreateTenantStaff(
      staff({ payroll: { paymentSchedule: "HOURLY", ratePerHour: 42 } }),
    );
    expect(sent("post").payroll.ratePerHour).toBe("42");
  });

  it("sends an empty rate rather than the string zero", async () => {
    // 0 is falsy, so a zero rate is indistinguishable from an unset one here.
    await api.CreateTenantStaff(staff({ payroll: { ratePerHour: 0 } }));
    expect(sent("post").payroll.ratePerHour).toBe("");
  });

  it("includes minimum hours for a salaried schedule", async () => {
    await api.CreateTenantStaff(
      staff({ payroll: { paymentSchedule: "SALARIED", minimumHours: 30 } }),
    );
    expect(sent("post").payroll.minimumHours).toBe("30");
  });

  it("drops minimum hours for an hourly schedule", async () => {
    await api.CreateTenantStaff(
      staff({ payroll: { paymentSchedule: "HOURLY", minimumHours: 30 } }),
    );
    expect(sent("post").payroll).not.toHaveProperty("minimumHours");
  });

  it("drops minimum hours the user typed as text", async () => {
    await api.CreateTenantStaff(
      staff({ payroll: { paymentSchedule: "SALARIED", minimumHours: "many" } }),
    );
    expect(sent("post").payroll).not.toHaveProperty("minimumHours");
  });

  it("drops minimum hours left blank on a salaried schedule", async () => {
    await api.CreateTenantStaff(
      staff({ payroll: { paymentSchedule: "SALARIED", minimumHours: "" } }),
    );
    expect(sent("post").payroll).not.toHaveProperty("minimumHours");
  });

  it("wraps each chosen pay and deduction id as an object", async () => {
    await api.CreateTenantStaff(
      staff({ payroll: { otherPays: ["p1", "p2"], deductions: ["d1"] } }),
    );
    expect(sent("post").payroll.otherPays).toEqual([{ id: "p1" }, { id: "p2" }]);
    expect(sent("post").payroll.deductions).toEqual([{ id: "d1" }]);
  });

  it("discards blank ids left behind by an emptied picker row", async () => {
    await api.CreateTenantStaff(
      staff({ payroll: { otherPays: ["p1", "", "   ", null], deductions: [""] } }),
    );
    expect(sent("post").payroll.otherPays).toEqual([{ id: "p1" }]);
    expect(sent("post").payroll.deductions).toEqual([]);
  });

  it("sends the date of birth as an instant", async () => {
    await api.CreateTenantStaff(staff({ dob: "1990-04-02" }));
    expect(sent("post").dob).toBe("1990-04-02T00:00:00.000Z");
  });

  it("omits the date of birth when it was left blank", async () => {
    await api.CreateTenantStaff(staff({ dob: "" }));
    expect(sent("post")).not.toHaveProperty("dob");
  });

  it("keeps only the filename and url of each uploaded document", async () => {
    await api.CreateTenantStaff(
      staff({
        documents: [
          { documentName: "Resume", documentsUrl: { filename: "cv.pdf", url: "s3://cv" } },
        ],
      }),
    );
    expect(sent("post").documents).toEqual([
      { documentsUrl: { filename: "cv.pdf", url: "s3://cv" } },
    ]);
  });

  it("substitutes empty strings for a document whose upload has not resolved", async () => {
    await api.CreateTenantStaff(staff({ documents: [{}] }));
    expect(sent("post").documents).toEqual([{ documentsUrl: { filename: "", url: "" } }]);
  });

  it("sends each licence with its expiry as an instant", async () => {
    await api.CreateTenantStaff(
      staff({
        licenses: [
          {
            licenseName: "SLP",
            licenseNumber: "L-1",
            issueState: "CA",
            expiryDate: "2027-01-31",
          },
        ],
      }),
    );
    expect(sent("post").licenses).toEqual([
      {
        licenseName: "SLP",
        licenseNumber: "L-1",
        issueState: "CA",
        expiryDate: "2027-01-31T00:00:00.000Z",
      },
    ]);
  });

  it("leaves a licence expiry undefined when none was entered", async () => {
    await api.CreateTenantStaff(staff({ licenses: [{ licenseName: "SLP" }] }));
    expect(sent("post").licenses[0].expiryDate).toBeUndefined();
  });

  it("drops the optional collections entirely when the wizard skipped them", async () => {
    await api.CreateTenantStaff(staff());
    expect(sent("post")).not.toHaveProperty("documents");
    expect(sent("post")).not.toHaveProperty("licenses");
  });

  it("surfaces the backend message", async () => {
    verbs.post.mockRejectedValue({ response: { data: { message: "email in use" } } });
    await expect(api.CreateTenantStaff(staff())).rejects.toThrow("email in use");
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.post.mockRejectedValue(new Error(""));
    await expect(api.CreateTenantStaff(staff())).rejects.toThrow("Create Tenant Staff failed");
  });
});

describe("updating a staff member", () => {
  const edit = (over = {}) => staff({ id: "s1", ...over });

  it("returns the updated record", async () => {
    await expect(api.UpdateTenantStaff(edit())).resolves.toEqual({ id: "s1" });
    expect(verbs.put.mock.calls[0][0]).toContain("/organization-staff/staff");
  });

  it("keeps the payroll row's id so the backend updates rather than inserts", async () => {
    await api.UpdateTenantStaff(edit({ payroll: { id: "pr1", paymentSchedule: "HOURLY" } }));
    expect(sent("put").payroll.id).toBe("pr1");
  });

  it("leaves the payroll id undefined for a staff member who had none", async () => {
    await api.UpdateTenantStaff(edit({ payroll: { paymentSchedule: "HOURLY" } }));
    expect(sent("put").payroll.id).toBeUndefined();
  });

  it("does not send the tenant on the payroll block, unlike create", async () => {
    await api.UpdateTenantStaff(edit({ payroll: { paymentSchedule: "HOURLY" } }));
    expect(sent("put").payroll).not.toHaveProperty("tenantId");
  });

  it("includes minimum hours only for a salaried schedule", async () => {
    await api.UpdateTenantStaff(
      edit({ payroll: { paymentSchedule: "SALARIED", minimumHours: "20" } }),
    );
    expect(sent("put").payroll.minimumHours).toBe("20");

    verbs.put.mockClear();
    await api.UpdateTenantStaff(
      edit({ payroll: { paymentSchedule: "HOURLY", minimumHours: "20" } }),
    );
    expect(sent("put").payroll).not.toHaveProperty("minimumHours");
  });

  it("wraps pay and deduction ids and discards the blanks", async () => {
    await api.UpdateTenantStaff(
      edit({ payroll: { otherPays: [" ", "p1"], deductions: ["d1", ""] } }),
    );
    expect(sent("put").payroll.otherPays).toEqual([{ id: "p1" }]);
    expect(sent("put").payroll.deductions).toEqual([{ id: "d1" }]);
  });

  it("sends empty collections rather than omitting them", async () => {
    // Update has no omitEmpty pass: an empty array is how the caller says
    // "the user removed everything", which must reach the backend.
    await api.UpdateTenantStaff(edit());
    expect(sent("put").documents).toEqual([]);
    expect(sent("put").licenses).toEqual([]);
    expect(sent("put").payroll.otherPays).toEqual([]);
  });

  it("attaches an existing document to the staff member it already belonged to", async () => {
    await api.UpdateTenantStaff(
      edit({
        documents: [
          {
            id: "doc1",
            tenantStaffId: "otherStaff",
            documentsUrl: { filename: "cv.pdf", url: "s3://cv" },
          },
        ],
      }),
    );
    expect(sent("put").documents).toEqual([
      {
        id: "doc1",
        documentsUrl: { filename: "cv.pdf", url: "s3://cv" },
        tenantStaffId: "otherStaff",
      },
    ]);
  });

  it("attaches a newly added document to the staff member being edited", async () => {
    await api.UpdateTenantStaff(edit({ documents: [{}] }));
    expect(sent("put").documents).toEqual([
      { id: undefined, documentsUrl: { filename: "", url: "" }, tenantStaffId: "s1" },
    ]);
  });

  it("keeps an existing licence's id and expiry", async () => {
    await api.UpdateTenantStaff(
      edit({
        licenses: [
          {
            id: "lic1",
            licenseName: "SLP",
            licenseNumber: "L-1",
            issueState: "CA",
            expiryDate: "2027-01-31",
            tenantStaffId: "s1",
          },
        ],
      }),
    );
    expect(sent("put").licenses[0]).toMatchObject({
      id: "lic1",
      expiryDate: "2027-01-31T00:00:00.000Z",
      tenantStaffId: "s1",
    });
  });

  it("attaches a newly added licence with no expiry to the staff member being edited", async () => {
    await api.UpdateTenantStaff(edit({ licenses: [{ licenseName: "SLP" }] }));
    expect(sent("put").licenses[0]).toMatchObject({
      id: undefined,
      expiryDate: undefined,
      tenantStaffId: "s1",
    });
  });

  it("sends the date of birth as an instant, or undefined when cleared", async () => {
    await api.UpdateTenantStaff(edit({ dob: "1990-04-02" }));
    expect(sent("put").dob).toBe("1990-04-02T00:00:00.000Z");

    verbs.put.mockClear();
    await api.UpdateTenantStaff(edit({ dob: null }));
    expect(sent("put").dob).toBeUndefined();
  });

  it("surfaces the backend message", async () => {
    verbs.put.mockRejectedValue({ response: { data: { message: "role no longer exists" } } });
    await expect(api.UpdateTenantStaff(edit())).rejects.toThrow("role no longer exists");
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.put.mockRejectedValue({});
    await expect(api.UpdateTenantStaff(edit())).rejects.toThrow("Update Tenant Staff failed");
  });
});

describe("updating payroll on its own", () => {
  const payroll = (p) => api.UpdateTenantStaffPayroll({ payroll: p, ...tokens });

  it("stringifies every numeric field", async () => {
    await payroll({ id: "pr1", paymentSchedule: "SALARIED", ratePerHour: 42, minimumHours: 30 });
    expect(sent("put")).toMatchObject({
      id: "pr1",
      paymentSchedule: "SALARIED",
      ratePerHour: "42",
      minimumHours: "30",
    });
  });

  it("keeps minimum hours whatever the schedule, unlike the wizard wrappers", async () => {
    await payroll({ paymentSchedule: "HOURLY", minimumHours: 12 });
    expect(sent("put").minimumHours).toBe("12");
  });

  it("sends empty strings for fields the payroll tab has never had filled", async () => {
    await payroll({});
    expect(sent("put")).toEqual({
      id: undefined,
      paymentSchedule: "",
      ratePerHour: "",
      minimumHours: "",
      otherPays: [],
      deductions: [],
    });
  });

  it("survives being called with no payroll object at all", async () => {
    await payroll(undefined);
    expect(sent("put").otherPays).toEqual([]);
    expect(sent("put").deductions).toEqual([]);
  });

  it("sends pays and deductions as type/rate pairs, not ids", async () => {
    await payroll({
      otherPays: [{ type: "Bonus", rate: 100 }],
      deductions: [{ type: "Tax", rate: 15 }],
    });
    expect(sent("put").otherPays).toEqual([{ type: "Bonus", rate: "100" }]);
    expect(sent("put").deductions).toEqual([{ type: "Tax", rate: "15" }]);
  });

  it("drops a half-filled pay or deduction row", async () => {
    await payroll({
      otherPays: [{ type: "Bonus" }, { rate: 100 }, { type: "Stipend", rate: 5 }],
      deductions: [{ type: "Tax" }],
    });
    expect(sent("put").otherPays).toEqual([{ type: "Stipend", rate: "5" }]);
    expect(sent("put").deductions).toEqual([]);
  });

  it("surfaces the backend message", async () => {
    verbs.put.mockRejectedValue({ response: { data: { message: "rate out of range" } } });
    await expect(payroll({ ratePerHour: 1 })).rejects.toThrow("rate out of range");
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.put.mockRejectedValue(new Error(""));
    await expect(payroll({ ratePerHour: 1 })).rejects.toThrow("Update Tenant Staff failed");
  });
});
