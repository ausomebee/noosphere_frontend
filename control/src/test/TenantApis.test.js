import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/TenantApis';

/**
 * Every wrapper in TenantApis follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table, so a wrapper
 * added without its error copy shows up here rather than in production.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message ]
const WRAPPERS = [
  ["GetPipelineByModule", "get", { modules: [] }, "Get Pipeline by module failed"],
  ["getAllAdmins", "get", {  }, "Get All Admins failed"],
  ["getAllTenants", "get", {  }, "Get All Tenants failed"],
  ["CreatePipelineStage", "post", { pipelineId: "pipelineId", name: "name", description: "description", colourCode: "colourCode", requiredTasks: [], requiredDocuments: [] }, "Create Pipeline Stage failed"],
  ["UpdatePipelineStage", "patch", { id: "id", name: "name", description: "description", colourCode: "colourCode" }, "Update Pipeline Stage failed"],
  ["DeletePipelineStage", "delete", { id: "id" }, "Delete Pipeline Stage failed"],
  ["DeletePipelineItem", "delete", { ids: ["i1"] }, "Delete Pipeline Item failed"],
  ["GetPipelineStage", "get", { pipelineId: "pipelineId" }, "Get Pipeline Stage failed"],
  ["ReorderPipelineStage", "patch", { id: "id", order: "order" }, "Reorder Pipeline Stage failed"],
  ["GetSinglePipelineStage", "get", { pipelineStageId: "pipelineStageId" }, "Get Single Pipeline Stage failed"],
  ["GetPipelineItem", "get", { stageId: "stageId" }, "Get Pipeline Stage Item failed"],
  ["GetSinglePipelineItem", "get", { itemId: "itemId" }, "Get Single Pipeline Stage Item failed"],
  ["UpdatePipelineItemActivity", "patch", { ids: ["i1"], pipelineStageId: "pipelineStageId" }, "Update Pipeline Item Activity failed"],
  ["ReassignCandidateToStaff", "patch", { ids: ["i1"], assignToAdmin: "assignToAdmin" }, "Reassign Candidate to Staff failed"],
  ["CreateCandidate", "post", { fullName: "fullName", email: "email", phoneNumber: "phoneNumber", stage: "stage", companyName: "companyName", contactPerson: "contactPerson", companySize: "companySize", organizationType: "organizationType", location: "location", leadSource: "leadSource", subdomain: "subdomain", pipelineStageId: "pipelineStageId", assignToAdmin: "assignToAdmin", createdBy: "createdBy" }, "Create Pipeline Stage failed"],
  ["UpdateCandidate", "patch", { fullName: "fullName", email: "email", phoneNumber: "phoneNumber", stage: "stage", companyName: "companyName", contactPerson: "contactPerson", companySize: "companySize", organizationType: "organizationType", location: "location", leadSource: "leadSource", pipelineStageId: "pipelineStageId", assignToAdmin: "assignToAdmin", subdomain: "subdomain", createdBy: "createdBy", id: "id" }, "Create Pipeline Stage failed"],
  ["UpdateStageTasks", "patch", { pipelineStageId: "pipelineStageId", requiredTasks: [] }, "Update Stage Tasks failed"],
  ["UpdateStageDocuments", "patch", { pipelineStageId: "pipelineStageId", requiredDocuments: [] }, "Update Stage Documents failed"],
  ["UpdateStageDocumentsToDone", "patch", { pipelineItemId: "pipelineItemId", documents: [] }, "Update Stage Documents to done failed"],
  ["UpdateStageTasksToDone", "patch", { pipelineItemId: "pipelineItemId", doneTasks: "doneTasks" }, "Update Stage Tasks to Done failed"],
  ["GetTenantCount", "get", {  }, "Get Tenant Count failed"],
  ["GetManagementOverview", "get", {  }, "Get Management Overview failed"],
  ["GetActiveTenants", "get", {  }, "Get Active Tenants failed"],
  ["DeactivateTenant", "patch", { id: "id", active: "active", deactivatedById: "deactivatedById", password: "password", reason: "reason", details: "details" }, "Deactivate Tenant failed"],
  ["UpdateTenantInfo", "patch", { payload: "payload" }, "Update Tenant Info failed"],
  ["GetSingleTenant", "get", { tenantId: "tenantId" }, "Get Single Tenant failed"],
  ["ChangeAdminPassword", "patch", { tenantId: "tenantId" }, "Change Admin Password failed"],
  ["ResetTenant2FA", "patch", { tenantId: "tenantId" }, "Reset Tenant 2FA login failed"],
  ["ChangeTenantEmail", "patch", { tenantId: "tenantId", email: "email" }, "Change Tenant Email failed"],
  ["ChangeTenantPhoneNumber", "patch", { tenantId: "tenantId", phoneNumber: "phoneNumber" }, "Change Tenant Phone Number failed"],
  ["ChangeAccountOfficer", "patch", { tenantId: "tenantId", adminId: "adminId" }, "Change Account Officer failed"],
  ["GetTenantActivityLog", "get", { tenantId: "tenantId", page: 1, limit: 1 }, "Get Tenant Activity Log failed"],
  ["GetTenantFeatures", "get", { tenantId: "tenantId" }, "Get Tenant Features failed"],
  ["GetTenantUsageStatistics", "get", { tenantId: "tenantId" }, "Get Tenant Usage Statistics failed"],
  ["GetTenantServerRequest", "get", { tenantId: "tenantId", page: 1, limit: 1 }, "Get Tenant Server Request failed"],
  ["GetTenantInvoices", "get", { tenantId: "tenantId" }, "Get Tenant Invoices failed"],
  ["GetTenantInvoicesByStatus", "get", { tenantId: "tenantId", status: "status" }, "Get Tenant Invoices failed"],
  ["GetTenantPayments", "get", { tenantId: "tenantId" }, "Get Tenant Payments failed"],
  ["GetTenantPaymentsByStatus", "get", { tenantId: "tenantId", status: "status" }, "Get Tenant Payments By Status failed"],
  ["GetTenantFeatureActivityLogs", "get", { tenantId: "tenantId", page: 1, limit: 1 }, "Get Tenant Feature Activity Logs failed"],
  ["GetTenantPaymentMethods", "get", { tenantId: "tenantId" }, "Get Tenant Payment Methods failed"],
  ["CreateCustomTask", "post", { pipelineItemId: "pipelineItemId", taskName: "taskName", isRequired: "isRequired" }, "Create custom task failed"],
  ["GetCustomTasks", "get", { pipelineItemId: "pipelineItemId" }, "Get custom tasks failed"],
  ["UpdateCustomTask", "patch", { id: "id", taskName: "taskName", isRequired: "isRequired", isCompleted: "isCompleted" }, "Update custom task failed"],
  ["DeleteCustomTask", "delete", { id: "id" }, "Delete custom task failed"],
  ["CreateCustomDocument", "post", { pipelineItemId: "pipelineItemId", documentName: "documentName", isRequired: "isRequired" }, "Create custom document failed"],
  ["GetCustomDocuments", "get", { pipelineItemId: "pipelineItemId" }, "Get custom documents failed"],
  ["UpdateCustomDocument", "patch", { id: "id", documentName: "documentName", isRequired: "isRequired", isCompleted: "isCompleted" }, "Update custom document failed"],
  ["DeleteCustomDocument", "delete", { id: "id" }, "Delete custom document failed"],
  ["SendProspectEmail", "post", { to: "to", subject: "subject", body: "body" }, "Send prospect email failed"],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('TenantApis', () => {
  it('covers every exported wrapper', () => {
    const exported = Object.keys(api).sort();
    const tested = WRAPPERS.map(([name]) => name).sort();
    expect(tested).toEqual(exported);
  });

  it.each(WRAPPERS)('%s resolves on success', async (name, verb, args) => {
    verbs[verb].mockResolvedValue({ data: { ok: true } });
    await expect(api[name]({ ...args, ...tokens })).resolves.toBeDefined();
    expect(verbs[verb]).toHaveBeenCalled();
  });

  it.each(WRAPPERS)('%s surfaces the message the backend returned', async (name, verb, args) => {
    verbs[verb].mockRejectedValue({ response: { data: { message: 'backend said so' } } });
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow('backend said so');
  });

  it.each(WRAPPERS)('%s falls back to its own copy', async (name, verb, args, fallback) => {
    verbs[verb].mockRejectedValue(new Error('Network Error'));
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow(fallback);
  });
});

describe('the array-shaped arguments', () => {
  // Four wrappers coerce their task/document lists with `Array.isArray(x) ? x : []`.
  // The generated table above always passes an array, so only the coercion arm
  // is driven here -- a caller handing over an object or a string must not put
  // that straight on the wire.
  const COERCING = [
    ["CreatePipelineStage", "post", "requiredTasks", {
      pipelineId: "p1", name: "n", description: "d", colourCode: "#000",
    }],
    ["CreatePipelineStage", "post", "requiredDocuments", {
      pipelineId: "p1", name: "n", description: "d", colourCode: "#000",
    }],
    ["UpdateStageTasks", "patch", "requiredTasks", { pipelineStageId: "s1" }],
    ["UpdateStageDocuments", "patch", "requiredDocuments", { pipelineStageId: "s1" }],
  ];

  beforeEach(() => {
    Object.values(verbs).forEach((v) => v.mockReset().mockResolvedValue({ data: {} }));
  });

  it.each(COERCING)('%s replaces a non-array %s with an empty list', async (name, verb, field, args) => {
    await api[name]({ ...args, ...tokens, [field]: "not-a-list" });
    const [, payload] = verbs[verb].mock.calls[0];
    expect(payload[field]).toEqual([]);
  });

  it.each(COERCING)('%s keeps a real list for %s', async (name, verb, field, args) => {
    await api[name]({ ...args, ...tokens, [field]: ["a", "b"] });
    const [, payload] = verbs[verb].mock.calls[0];
    expect(payload[field]).toEqual(["a", "b"]);
  });

  it.each(COERCING)('%s replaces an omitted %s with an empty list', async (name, verb, field, args) => {
    await api[name]({ ...args, ...tokens });
    const [, payload] = verbs[verb].mock.calls[0];
    expect(payload[field]).toEqual([]);
  });
});

describe('logging in a production build', () => {
  beforeEach(() => {
    Object.values(verbs).forEach((v) => v.mockReset());
  });

  it.each([
    ["CreatePipelineStage", "post", { pipelineId: "p1", name: "n", description: "d", colourCode: "#000" }],
    ["UpdateStageDocumentsToDone", "patch", { pipelineItemId: "i1", documents: {} }],
  ])('%s stays quiet when it fails outside development', async (name, verb, args) => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    verbs[verb].mockRejectedValue(new Error('offline'));

    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow();
    const ours = spy.mock.calls.filter(
      ([first]) => typeof first === 'string' && first.startsWith('TenantApis.')
    );
    expect(ours).toHaveLength(0);

    spy.mockRestore();
    vi.unstubAllEnvs();
  });
});

describe('the tasks-to-done wrapper in a production build', () => {
  it('stays quiet when UpdateStageTasksToDone fails outside development', async () => {
    // This wrapper logs under its own "API ERROR:" prefix rather than the
    // "TenantApis." one the table above filters on.
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    verbs.patch.mockRejectedValue(new Error('offline'));

    await expect(
      api.UpdateStageTasksToDone({ pipelineItemId: 'i1', doneTasks: {}, ...tokens })
    ).rejects.toThrow('Update Stage Tasks to Done failed');
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
    vi.unstubAllEnvs();
  });
});
