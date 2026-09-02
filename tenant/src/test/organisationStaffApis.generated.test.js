import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/organisationStaffApis.js';

/**
 * Every wrapper in organisationStaffApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateTenantStaff', 'post', { fullName: "fullName", email: "email", roleId: "roleId", dob: new Date('2026-01-05T00:00:00Z'), gender: "gender", npi: "npi", address: "address", city: "city", state: "state", zip: "zip", country: "country", phoneNumber: "phoneNumber", active: "active", documents: [], licenses: [], payroll: "payroll", tenantId: "tenantId" }, 'Create Tenant Staff failed', 'body'],
  ['UpdateTenantStaffBasicInfo', 'put', { id: "id", fullName: "fullName", email: "email", roleId: "roleId", tenantId: "tenantId", dob: new Date('2026-01-05T00:00:00Z'), gender: "gender", npi: "npi", address: "address", city: "city", state: "state", zip: "zip", country: "country", phoneNumber: "phoneNumber", active: "active" }, 'Update Tenant Staff failed', 'body'],
  ['GetAllStaffByTenantId', 'get', { tenantId: "tenantId" }, 'Get Staffs by tenant id failed', 'body'],
  ['UpdateActiveTenantStaff', 'patch', { id: "id", active: "active" }, 'update active failed', 'body'],
  ['ResetStaffLogin', 'patch', { id: "id" }, 'Reset staff login failed', 'body'],
  ['GetSingleTenantStaffById', 'get', { id: "id" }, 'Get Single Tenant Staff by tenant id failed', 'body'],
  ['GetAllStaffLicenseById', 'get', { id: "id" }, 'Get All License by tenant staff id failed', 'body'],
  ['GetAllStaffDocumentById', 'get', { id: "id" }, 'Get All Document by tenant staff id failed', 'body'],
  ['UpdateTenantStaffLicense', 'put', { id: "id", tenantId: "tenantId", licenseName: "licenseName", licenseNumber: "licenseNumber", issueState: "issueState", expiryDate: "expiryDate", tenantStaffId: "tenantStaffId" }, 'Updating License by tenant staff id failed', 'body'],
  ['DeleteLicenseByTenantStaff', 'patch', { id: "id", isDeleted: "isDeleted" }, 'Updating License by tenant staff id failed', 'body'],
  ['DeleteDocumentByTenantStaff', 'patch', { id: "id", isDeleted: "isDeleted" }, 'Updating License by tenant staff id failed', 'body'],
  ['CreateDocumentForStaff', 'post', { tenantId: "tenantId", documentName: "documentName", document: "document", uploadedBy: "uploadedBy", documentsUrl: "documentsUrl", tenantStaffId: "tenantStaffId" }, 'Create Document failed', 'body'],
  ['CreateLicenseForStaff', 'post', { tenantStaffId: "tenantStaffId", licenseName: "licenseName", licenseNumber: "licenseNumber", issueState: "issueState", expiryDate: "expiryDate" }, 'Create Organization Licenses failed', 'body'],
  ['GetAllStaffPayrollById', 'get', { id: "id" }, 'Get All Payroll by tenant staff id failed', 'body'],
  ['UpdateTenantStaffPayroll', 'put', { payroll: "payroll" }, 'Update Tenant Staff failed', 'body'],
  ['GetStaffUpcomingAppointments', 'get', { staffId: "staffId" }, 'Get staff upcoming appointments failed', 'body'],
  ['GetStaffAppointments', 'get', { staffId: "staffId" }, 'Get staff appointments failed', 'body'],
  ['CreateStaffAvailability', 'post', { staffId: "staffId", availabilityDays: "availabilityDays" }, 'Create staff availability failed', 'body'],
  ['UpdateStaffAvailability', 'put', { id: "id", availabilityDays: "availabilityDays" }, 'Update staff availability failed', 'body'],
  ['GetStaffAvailability', 'get', { staffId: "staffId" }, 'Get staff availability failed', 'body'],
  ['GetStaffClients', 'get', { staffId: "staffId", tenantId: "tenantId" }, 'Get staff clients failed', 'body'],
  ['GetStaffPayrollCycleStats', 'get', { staffId: "staffId" }, 'Get staff payroll cycle stats failed', 'body'],
  ['GetStaffWithTeamAccess', 'get', { tenantId: "tenantId" }, 'Get staff with team access failed', 'body'],
  ['CreateTeam', 'post', { name: "name", tenantId: "tenantId", teamLeadId: "teamLeadId", members: "members" }, 'Create team failed', 'body'],
  ['UpdateTeam', 'put', { id: "id", name: "name", teamLeadId: "teamLeadId", members: "members" }, 'Update team failed', 'body'],
  ['GetAllTeamsByTenantId', 'get', { tenantId: "tenantId" }, 'Get teams by tenant id failed', 'body'],
  ['DeleteTeam', 'delete', { id: "id" }, 'Delete team failed', 'body'],
  ['ToggleTeamActive', 'patch', { id: "id", active: "active" }, 'Update team active status failed', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('organisationStaffApis.js', () => {
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
