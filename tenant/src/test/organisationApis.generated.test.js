import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/organisationApis.js';

/**
 * Every wrapper in organisationApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateDiagnosisCode', 'post', { code: "code", description: "description", tenantId: "tenantId", isActive: "isActive" }, 'Create Diagnosis code failed', 'body'],
  ['UpdateDiagnosisCode', 'put', { id: "id", code: "code", description: "description", tenantId: "tenantId", isActive: "isActive" }, 'Update Diagnosis code failed', 'body'],
  ['GetDiagnosisCodeByTenantId', 'get', { tenantId: "tenantId" }, 'Get Diagnosis code by tenant id failed', 'body'],
  ['GetSingleDiagnosisCodeById', 'get', { id: "id" }, 'Get Single Diagnosis code by tenant id failed', 'body'],
  ['UpdateActiveDiagnosisCode', 'patch', { id: "id", active: "active" }, 'Deleting diagnosis code failed', 'body'],
  ['CreateOrganizationSessionType', 'post', { tenantId: "tenantId", name: "name", category: "category", service: "service", staffRolesAllowed: "staffRolesAllowed", locationsAllowed: "locationsAllowed", defaultDuration: "defaultDuration", isActive: "isActive", isBillable: "isBillable" }, 'Create Session Type failed', 'body'],
  ['UpdateOrganizationSessionType', 'put', { id: "id", tenantId: "tenantId", name: "name", category: "category", service: "service", staffRolesAllowed: "staffRolesAllowed", locationsAllowed: "locationsAllowed", defaultDuration: "defaultDuration", isActive: "isActive", isBillable: "isBillable" }, 'Update Session Type failed', 'body'],
  ['GetSessionTypeByTenantId', 'get', { tenantId: "tenantId" }, 'Get session types by tenant id failed', 'body'],
  ['GetSingleSessionTypeByTenantId', 'get', { id: "id" }, 'Get Single session types by tenant id failed', 'body'],
  ['UpdateActiveSessionTypeByTenantId', 'patch', { id: "id", active: "active" }, 'Get Single session types by tenant id failed', 'body'],
  ['CreateDocument', 'post', { formData: "formData" }, 'Create Document failed', 'body'],
  ['GetSingleDocumentByTenantId', 'get', { tenantId: "tenantId" }, 'Get Single Document by tenant id failed', 'body'],
  ['GetSingleDocumentById', 'get', { id: "id" }, 'Get Single Document by id failed', 'body'],
  ['DeleteDocument', 'delete', { id: "id" }, 'Deleting document failed', 'body'],
  ['CreateOrganizationInformation', 'post', { tenantId: "tenantId", name: "name", email: "email", phoneNumber: "phoneNumber", website: "website", practiceNPI: "practiceNPI", streetAddress: "streetAddress", city: "city", state: "state", country: "country", zipCode: "zipCode" }, 'Create Organization Information failed', 'body'],
  ['UpdateOrganizationInformation', 'patch', { id: "id", name: "name", email: "email", phoneNumber: "phoneNumber", website: "website", practiceNPI: "practiceNPI", streetAddress: "streetAddress", city: "city", active: "active", state: "state", country: "country", zipCode: "zipCode" }, 'Update Organization Information failed', 'body'],
  ['GetOrganizationInformationByTenantId', 'get', { tenantId: "tenantId" }, 'Get organization inform by tenant id failed', 'body'],
  ['CreateOrganizationLicense', 'post', { tenantId: "tenantId", licenseName: "licenseName", licenseNumber: "licenseNumber", issueState: "issueState", expiryDate: "expiryDate" }, 'Create Organization Licenses failed', 'body'],
  ['UpdateOrganizationLicense', 'put', { id: "id", tenantId: "tenantId", licenseName: "licenseName", licenseNumber: "licenseNumber", issueState: "issueState", expiryDate: "expiryDate" }, 'Update Organization Licenses failed', 'body'],
  ['GetLicenseByTenantId', 'get', { tenantId: "tenantId" }, 'Get License by tenant id failed', 'body'],
  ['GetSingleLicenseById', 'get', { id: "id" }, 'Get Single License by id failed', 'body'],
  ['DeleteLicense', 'delete', { id: "id" }, 'Delete license failed', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('organisationApis.js', () => {
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
