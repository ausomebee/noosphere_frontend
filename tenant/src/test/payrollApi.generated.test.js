import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/payrollApi.js';

/**
 * Every wrapper in payrollApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetCompensationTypeByTenantId', 'get', { tenantId: "tenantId" }, 'Get Compensation Type by tenant id failed', 'message'],
  ['UpdateCompensationTypeActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['CreateIncomeItems', 'post', { tenantId: "tenantId", name: "name", type: "type", rate: "rate" }, 'Create Income Items failed', 'message'],
  ['UpdateIncomeItems', 'put', { id: "id", tenantId: "tenantId", name: "name", type: "type", rate: "rate", isActive: "isActive", isDeleted: "isDeleted" }, 'Update Income Items failed', 'message'],
  ['GetIncomeItemsByTenantId', 'get', { tenantId: "tenantId" }, 'Get Income Items by tenant id failed', 'message'],
  ['UpdateIncomeItemsActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['CreateDeductions', 'post', { tenantId: "tenantId", name: "name", type: "type", rate: "rate" }, 'Create Deductions failed', 'message'],
  ['UpdateDeductions', 'put', { id: "id", tenantId: "tenantId", name: "name", type: "type", rate: "rate", isActive: "isActive", isDeleted: "isDeleted" }, 'Update Deductions failed', 'message'],
  ['GetDeductionsByTenantId', 'get', { tenantId: "tenantId" }, 'Get Deductions by tenant id failed', 'message'],
  ['UpdateDeductionsActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['CreatePayrollCycles', 'post', { tenantId: "tenantId", name: "name", compensationType: "compensationType", interval: "interval", startDate: new Date('2026-01-05T00:00:00Z'), autoRun: "autoRun" }, 'Create Payroll Cycles failed', 'message'],
  ['UpdatePayrollCycles', 'put', { id: "id", tenantId: "tenantId", name: "name", compensationType: "compensationType", interval: "interval", startDate: new Date('2026-01-05T00:00:00Z'), autoRun: "autoRun", isActive: "isActive", isDeleted: "isDeleted" }, 'Update Payroll Cycles failed', 'message'],
  ['GetPayrollCycleByTenantId', 'get', { tenantId: "tenantId" }, 'Get Payroll Cycle by tenant id failed', 'message'],
  ['UpdatePayrollCycleActiveness', 'patch', { id: "id", isActive: "isActive" }, 'Toggle Active or Inactive failed', 'body'],
  ['GetPayrollCycleStats', 'get', { tenantId: "tenantId" }, 'Get payroll cycle stats failed', 'message'],
  ['GetPayrollCycleStaffs', 'get', { payrollCycleId: "payrollCycleId" }, 'Get payroll cycle staffs failed', 'message'],
  ['GetStaffByPaymentSchedule', 'get', { tenantId: "tenantId", paymentSchedule: "paymentSchedule" }, 'Get staff by payment schedule failed', 'message'],
  ['AddStaffToPayrollCycle', 'post', { payrollCycleId: "payrollCycleId", staffId: "staffId" }, 'Add staff to payroll cycle failed', 'message'],
  ['RemoveStaffFromPayrollCycle', 'delete', { id: "id" }, 'Remove staff from payroll cycle failed', 'message'],
  ['GetStaffWithPayrollByDate', 'get', { tenantId: "tenantId", startDate: new Date('2026-01-05T00:00:00Z'), endDate: new Date('2026-01-05T00:00:00Z'), paymentSchedule: "paymentSchedule" }, 'Get staff with payroll by date failed', 'message'],
  ['EditPayrollBreakdown', 'put', { staffs: "staffs" }, 'Edit payroll breakdown failed', 'message'],
  ['CreateManualPayrollCycle', 'post', { tenantId: "tenantId", compensationType: "compensationType", startDate: new Date('2026-01-05T00:00:00Z'), endDate: new Date('2026-01-05T00:00:00Z'), staffs: "staffs" }, 'Create manual payroll cycle failed', 'message'],
  ['DeleteIncomeItem', 'delete', { id: "id" }, 'Delete income item failed', 'body'],
  ['DeleteDeduction', 'delete', { id: "id" }, 'Delete deduction failed', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('payrollApi.js', () => {
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
