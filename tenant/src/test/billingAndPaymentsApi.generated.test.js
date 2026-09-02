import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/billingAndPaymentsApi.js';

/**
 * Every wrapper in billingAndPaymentsApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateTenantServiceCode', 'post', { tenantId: "tenantId", code: "code", description: "description", modifiers: "modifiers", isActive: "isActive" }, 'Create Service Code failed', 'message'],
  ['UpdateTenantServiceCode', 'put', { id: "id", tenantId: "tenantId", code: "code", description: "description", modifiers: "modifiers", isActive: "isActive" }, 'Update Service Code failed', 'message'],
  ['GetTenantServiceCodeByTenantId', 'get', { tenantId: "tenantId" }, 'Get Service Code by tenant id failed', 'message'],
  ['UpdateServiceCodeActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['CreateTenantRoundingRule', 'post', { tenantId: "tenantId", ruleType: "ruleType", ruleName: "ruleName", description: "description", standardUnit: "standardUnit", roundingRule: "roundingRule", isActive: "isActive" }, 'Create Rounding Rules failed', 'message'],
  ['UpdateTenantRoundingRule', 'put', { id: "id", tenantId: "tenantId", ruleType: "ruleType", description: "description", standardUnit: "standardUnit", roundingRule: "roundingRule", ruleName: "ruleName", isActive: "isActive" }, 'Update Rounding Rules failed', 'message'],
  ['GetRoundingRuleByTenantId', 'get', { tenantId: "tenantId" }, 'Get Rounding Rule by tenant id failed', 'message'],
  ['UpdateRoundingRuleActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['CreateInsuranceType', 'post', { tenantId: "tenantId", name: "name", description: "description", isActive: "isActive" }, 'Create Insurance Type failed', 'message'],
  ['UpdateInsuranceType', 'put', { id: "id", tenantId: "tenantId", name: "name", description: "description", isActive: "isActive" }, 'Update Insurance Type failed', 'message'],
  ['GetInsuranceTypeByTenantId', 'get', { tenantId: "tenantId" }, 'Get Insurance Type by tenant id failed', 'message'],
  ['UpdateInsuranceTypeActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['CreatePayer', 'post', { tenantId: "tenantId", payerName: "payerName", email: "email", phone: "phone", insuranceTypeId: "insuranceTypeId", tplCode: "tplCode", carrierPayerId: "carrierPayerId", address: "address", city: "city", state: "state", zip: "zip", country: "country", serviceCodes: "serviceCodes", isActive: "isActive" }, 'Create Payer failed', 'message'],
  ['UpdatePayer', 'put', { id: "id", tenantId: "tenantId", payerName: "payerName", email: "email", phone: "phone", insuranceTypeId: "insuranceTypeId", tplCode: "tplCode", carrierPayerId: "carrierPayerId", address: "address", city: "city", state: "state", zip: "zip", country: "country", serviceCodes: "serviceCodes", isActive: "isActive" }, 'Update Payer failed', 'message'],
  ['GetSInglePayerById', 'get', { id: "id" }, 'Get Payers by payer id failed', 'message'],
  ['GetPayerByTenantId', 'get', { tenantId: "tenantId" }, 'Get Payers by tenant id failed', 'message'],
  ['UpdatePayerActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['UpdatePayerServiceCodeActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['GetTimeSheetByTenantId', 'get', { tenantId: "tenantId" }, 'Get Timesheets by tenant id failed', 'message'],
  ['GetSingleTimeSheetByTimesheetId', 'get', { timeSheetId: "timeSheetId" }, 'Get Single Timesheets by timesheet id failed', 'message'],
  ['ApproveTimeSheetBySupervisor', 'patch', { timeSheetId: "timeSheetId", supervisorId: "supervisorId" }, 'Approve Timesheet by timesheet id failed', 'message'],
  ['RejectTimeSheetBySupervisor', 'patch', { timeSheetId: "timeSheetId", supervisorId: "supervisorId", reason: "reason" }, 'Approve Timesheet by timesheet id failed', 'message'],
  ['GetSessionsTimesheetHistoryByTimesheetId', 'get', { timeSheetId: "timeSheetId" }, 'Get Sessions Timesheet History by timesheet id failed', 'message'],
  ['GetClaimsByTenantId', 'get', { tenantId: "tenantId" }, 'Get Claims by tenant id failed', 'message'],
  ['NudgeClientForApproval', 'post', { clientId: "clientId", staffId: "staffId" }, 'Failed to send nudge to client', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('billingAndPaymentsApi.js', () => {
  it.each(WRAPPERS)('%s resolves on success', async (name, verb, args) => {
    // Not every wrapper returns a value -- some await and discard -- so assert
    // that the call went out rather than on what came back.
    verbs[verb].mockResolvedValue({ data: { ok: true } });
    await expect(api[name]({ ...args, ...tokens })).resolves.not.toThrow();
    expect(verbs[verb]).toHaveBeenCalled();
  });

  it.each(WRAPPERS)('%s surfaces the message the backend returned', async (name, verb, args, _fb, accessor) => {
    verbs[verb].mockRejectedValue(
      accessor === 'body'
        ? { response: { data: { message: 'backend said so' } } }
        : new Error('backend said so')
    );
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow('backend said so');
  });

  it.each(WRAPPERS)('%s falls back to its own copy', async (name, verb, args, fallback, accessor) => {
    // A rejection carrying nothing the wrapper can read: no body for the ones
    // that look there, and no message for the ones that read error.message.
    verbs[verb].mockRejectedValue(accessor === 'body' ? new Error('') : {});
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow(fallback);
  });
});
