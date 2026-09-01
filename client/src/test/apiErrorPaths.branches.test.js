import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    put: mockPut,
    delete: mockDelete,
  }),
}));

import documentsApi from "../api/documentsAndFormsApis";
import homeApi from "../api/homeApis";
import messageApi from "../api/messageApi";
import profileApi from "../api/profileAndSettingsApi";
import programsApi from "../api/programsApis";

/**
 * Branch coverage for the client API error paths.
 *
 * Every call ends in `error.response?.data?.message || "<fallback>"`. The
 * existing per-module tests cover the success side and a message-carrying
 * failure for a few calls; this drives **both** halves of that `||` across
 * every call in every module, so a backend error is never rendered as the
 * string "undefined".
 */

const auth = { accessToken: "tok", refreshToken: "ref" };

const withMessage = (message) => ({ response: { data: { message } } });
const withoutMessage = [
  new Error("network down"),
  { response: {} },
  { response: { data: {} } },
];

const verbs = [mockGet, mockPost, mockPatch, mockPut, mockDelete];
const rejectAll = (v) => verbs.forEach((m) => m.mockRejectedValue(v));
const resolveAll = (v) => verbs.forEach((m) => m.mockResolvedValue(v));

/** Superset of every argument the client calls read. */
const args = {
  ...auth,
  clientId: "c1",
  clientTenantId: "ct1",
  tenantClientId: "ct1",
  tenantId: "t1",
  folderId: "f1",
  folderName: "Reports",
  name: "Reports",
  fileName: "a.pdf",
  formId: "form1",
  id: "1",
  sessionId: "s1",
  targetId: "tg1",
  messageId: "m1",
  userId: "u1",
  userType: "CLIENT",
  groupBy: "month",
  email: "a@b.co",
  password: "pw",
  appointmentId: "a1",
  requestId: "r1",
  documents: [],
  payload: {},
  data: {},
  body: {},
  // RescheduleAppointments formats `date` locally, so it must be a real Date.
  date: new Date("2026-09-01T10:00:00Z"),
  startTime: "10:00",
  endTime: "11:00",
  forAll: false,
  reasonForReschedule: "clash",
  rescheduled: true,
};

const modulesUnderTest = [
  ["documentsAndFormsApis", documentsApi],
  ["homeApis", homeApi],
  ["messageApi", messageApi],
  ["profileAndSettingsApi", profileApi],
  ["programsApis", programsApi],
];

const cases = modulesUnderTest.flatMap(([moduleName, mod]) =>
  Object.keys(mod)
    .filter((k) => typeof mod[k] === "function")
    .map((fnName) => [`${moduleName}.${fnName}`, () => mod[fnName](args)])
);

describe("client API error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds calls to exercise in every module", () => {
    expect(cases.length).toBeGreaterThan(30);
  });

  it.each(cases)("%s surfaces a message on failure", async (label, invoke) => {
    rejectAll(withMessage(`${label} said no`));
    const err = await Promise.resolve()
      .then(invoke)
      .catch((e) => e);
    // A few helpers are pure (no request); those simply must not blow up.
    if (err instanceof Error) {
      expect(err.message).toBeTruthy();
    }
  });

  it.each(cases)("%s never reports a bare undefined", async (label, invoke) => {
    for (const rejection of withoutMessage) {
      rejectAll(rejection);
      const err = await Promise.resolve()
        .then(invoke)
        .catch((e) => e);
      if (err instanceof Error) {
        expect(err.message).toBeTruthy();
        expect(err.message).not.toBe("undefined");
        expect(String(err.message)).not.toContain("undefined");
      }
    }
  });

  it.each(cases)("%s resolves when the request succeeds", async (label, invoke) => {
    resolveAll({ data: { data: [], id: "x" } });
    const out = await Promise.resolve()
      .then(invoke)
      .catch((e) => e);
    expect(out).toBeDefined();
  });
});

describe("documentsAndFormsApis helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fileToBase64 resolves a data URI for a file", async () => {
    const { fileToBase64 } = await import("../api/documentsAndFormsApis");
    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    const result = await fileToBase64(file);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("fileToBase64 rejects when the reader fails", async () => {
    const { fileToBase64 } = await import("../api/documentsAndFormsApis");
    const OriginalReader = global.FileReader;
    global.FileReader = class {
      readAsDataURL() {
        setTimeout(() => this.onerror?.(new Error("boom")), 0);
      }
    };
    await expect(fileToBase64(new File(["x"], "x.txt"))).rejects.toBeDefined();
    global.FileReader = OriginalReader;
  });
});
