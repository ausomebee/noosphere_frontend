import { describe, it, expect, vi, beforeEach } from "vitest";

const axiosGet = vi.fn();
const axiosPost = vi.fn();
const axiosPatch = vi.fn();

vi.mock("axios", () => ({
  default: {
    get: (...a) => axiosGet(...a),
    post: (...a) => axiosPost(...a),
    patch: (...a) => axiosPatch(...a),
  },
}));

const fetchGet = vi.fn();
const fetchPost = vi.fn();
const fetchPatch = vi.fn();
const fetchDelete = vi.fn();
const fetchPut = vi.fn();

vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({
    get: fetchGet,
    post: fetchPost,
    patch: fetchPatch,
    delete: fetchDelete,
    put: fetchPut,
  }),
}));

import authApi, { refreshAccessToken } from "../api/authApis";
import tenantApi from "../api/TenantApis";

/**
 * Every API wrapper rethrows as `new Error(body.message || <its own copy>)`.
 * The existing api suites cover the body-message arm; this file takes the
 * fallback arm of each wrapper that still had one uncovered, so a caller that
 * gets a bare network failure still shows something meaningful.
 */

const tokens = { accessToken: "at", refreshToken: "rt" };
const bare = () => new Error("Network Error");
const withBody = (message) => ({ response: { data: { message } } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authApis fallback messages", () => {
  const cases = [
    ["AdminVerifyToken", axiosPost, () => authApi.AdminVerifyToken({ userId: "u", token: "t" }), "Verification failed"],
    ["AdminOnboarding", axiosPatch, () => authApi.AdminOnboarding({ id: "u", password: "p" }), "Admin Onboarding failed"],
    ["Admin2FALink", axiosGet, () => authApi.Admin2FALink({ id: "u", moduleType: "m" }), "error in 2FA link"],
    ["SuperAdminChoices", axiosPatch, () => authApi.SuperAdminChoices({ tenantId: "t" }), "error in super admin choices"],
    ["GetSuperAdminChoices", axiosGet, () => authApi.GetSuperAdminChoices({ id: "t" }), "error in getting super admin choices"],
    ["Admin2FACreateSecretMessage", axiosPost, () => authApi.Admin2FACreateSecretMessage({ userId: "u" }), "error in creating secret message"],
    ["Admin2FAVerifySecretMessage", axiosPost, () => authApi.Admin2FAVerifySecretMessage({ userId: "u" }), "error verifying secret message"],
    ["Admin2FAVerify", axiosPost, () => authApi.Admin2FAVerify({ userId: "u", token: "t" }), "error in 2FA verify"],
  ];

  it.each(cases)("%s falls back to its own copy", async (_name, mock, call, expected) => {
    mock.mockRejectedValue(bare());
    await expect(call()).rejects.toThrow(expected);
  });

  it.each(cases)("%s prefers the backend's message", async (_name, mock, call) => {
    mock.mockRejectedValue(withBody("backend said so"));
    await expect(call()).rejects.toThrow("backend said so");
  });

  it.each(cases)("%s resolves on success", async (_name, mock, call) => {
    mock.mockResolvedValue({ data: { ok: true } });
    await expect(call()).resolves.toBeDefined();
  });
});

describe("refreshAccessToken", () => {
  it("returns the new access token and reports both tokens", async () => {
    const onSuccess = vi.fn();
    axiosPost.mockResolvedValue({
      data: { data: { accessToken: "new-at", refreshToken: "new-rt" } },
    });
    await expect(refreshAccessToken("rt", onSuccess)).resolves.toBe("new-at");
    expect(onSuccess).toHaveBeenCalledWith({
      accessToken: "new-at",
      refreshToken: "new-rt",
    });
  });

  it("works without a callback", async () => {
    axiosPost.mockResolvedValue({ data: { data: { accessToken: "new-at" } } });
    await expect(refreshAccessToken("rt")).resolves.toBe("new-at");
  });

  it("returns null when the response carries no access token", async () => {
    axiosPost.mockResolvedValue({ data: { data: {} } });
    await expect(refreshAccessToken("rt")).resolves.toBeNull();
  });

  it.each([401, 403])("returns null when the server rejects the token with %i", async (status) => {
    axiosPost.mockRejectedValue({ response: { status } });
    await expect(refreshAccessToken("rt")).resolves.toBeNull();
  });

  it("rethrows when the refresh never reached the server", async () => {
    const err = { response: { status: 503 } };
    axiosPost.mockRejectedValue(err);
    await expect(refreshAccessToken("rt")).rejects.toBe(err);
  });

  it("rethrows a transport failure with no response at all", async () => {
    const err = bare();
    axiosPost.mockRejectedValue(err);
    await expect(refreshAccessToken("rt")).rejects.toBe(err);
  });
});

describe("TenantApis fallback messages", () => {
  const cases = [
    ["GetPipelineByTenantId", fetchGet, () => tenantApi.GetPipelineByTenantId({ tenantId: "t", ...tokens }), "Get Pipeline by tenant failed"],
    ["UpdatePipelineStage", fetchPatch, () => tenantApi.UpdatePipelineStage({ id: "s", ...tokens }), "Update Pipeline Stage failed"],
    ["UpdateStageTasks", fetchPatch, () => tenantApi.UpdateStageTasks({ pipelineStageId: "s", tasks: [], ...tokens }), "Update Stage Tasks failed"],
    ["UpdateStageDocuments", fetchPatch, () => tenantApi.UpdateStageDocuments({ pipelineStageId: "s", documents: [], ...tokens }), "Update Stage Documents failed"],
    ["UpdateStageDocumentsToDone", fetchPatch, () => tenantApi.UpdateStageDocumentsToDone({ pipelineItemId: "i", documents: [], ...tokens }), "Update Stage Documents to done failed"],
    ["UpdateStageTasksToDone", fetchPatch, () => tenantApi.UpdateStageTasksToDone({ pipelineItemId: "i", doneTasks: [], ...tokens }), "Update Stage Tasks to Done failed"],
    ["UploadDocumentForPipelineItem", fetchPost, () => tenantApi.UploadDocumentForPipelineItem({ pipelineItemId: "i", docName: "d", files: [], ...tokens }), "Upload Document for Pipeline Item failed"],
    ["MoveCandidateToClient", fetchDelete, () => tenantApi.MoveCandidateToClient({ pipelineItemId: "i", ...tokens }), "Move Candidate to Client failed"],
  ];

  it.each(cases)("%s falls back to its own copy", async (_name, mock, call, expected) => {
    mock.mockRejectedValue(bare());
    await expect(call()).rejects.toThrow(expected);
  });

  it.each(cases)("%s prefers the backend's message", async (_name, mock, call) => {
    mock.mockRejectedValue(withBody("backend said so"));
    await expect(call()).rejects.toThrow("backend said so");
  });

  it.each(cases)("%s resolves on success", async (_name, mock, call) => {
    mock.mockResolvedValue({ data: { ok: true } });
    await expect(call()).resolves.toBeDefined();
  });

  it("defaults a non-array task list to empty", async () => {
    fetchPatch.mockResolvedValue({ data: { ok: true } });
    await tenantApi.UpdateStageTasks({ pipelineStageId: "s", tasks: "nope", ...tokens });
    expect(fetchPatch.mock.calls[0][1].tasks).toEqual([]);
  });

  it("defaults a non-array document list to empty", async () => {
    fetchPatch.mockResolvedValue({ data: { ok: true } });
    await tenantApi.UpdateStageDocuments({ pipelineStageId: "s", documents: null, ...tokens });
    expect(fetchPatch.mock.calls[0][1].documents).toEqual([]);
  });

  it("passes a real task list straight through", async () => {
    fetchPatch.mockResolvedValue({ data: { ok: true } });
    await tenantApi.UpdateStageTasks({ pipelineStageId: "s", tasks: ["a"], ...tokens });
    expect(fetchPatch.mock.calls[0][1].tasks).toEqual(["a"]);
  });
});
