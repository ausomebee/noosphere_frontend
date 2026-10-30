import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/ProgramLibraryApis.js';

/**
 * Every wrapper in ProgramLibraryApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateProgramsDomain', 'post', { name: "name", description: "description", tenantId: "tenantId", domainType: "domainType" }, 'Create Program Domain failed', 'body'],
  ['editProgramsDomain', 'patch', { id: "id", name: "name", description: "description", domainType: "domainType" }, 'Edit Program Domain failed', 'body'],
  ['GetProgramsDomainByTenantId', 'get', { tenantId: "tenantId", domainType: "domainType" }, 'Get program domain by tenant id failed', 'body'],
  ['deleteProgramsDomain', 'delete', { id: "id" }, 'Delete domain failed', 'body'],
  ['CreateProgramsProgram', 'post', { name: "name", description: "description", domainId: "domainId" }, 'Create Programs Domain Program failed', 'body'],
  ['editProgramsProgram', 'patch', { id: "id", name: "name", description: "description", domainId: "domainId" }, 'Edit Program Domain Programs failed', 'body'],
  ['GetProgramsProgramsByDomainId', 'get', { domainId: "domainId" }, 'Get program domain by domain id failed', 'body'],
  ['deleteProgramsProgram', 'delete', { id: "id" }, 'Delete program failed', 'body'],
  ['CreateProgramsTarget', 'post', { formData: "formData" }, 'Create target failed', 'body'],
  ['editProgramsTarget', 'patch', { formData: "formData" }, 'Edit target failed', 'body'],
  ['GetProgramsTargetsByProgramId', 'get', { programId: "programId" }, 'Get targets failed', 'body'],
  ['deleteProgramsTarget', 'delete', { id: "id" }, 'Delete target failed', 'body'],
  ['DuplicateProgramsTarget', 'post', { id: "id" }, 'duplicate target failed', 'body'],
  ['GetProgramsTargetById', 'get', { Id: "Id" }, 'Get single targets failed', 'body'],
  ['GetTargetInfoByTargetIdAndClientId', 'get', { clientId: "clientId", targetId: "targetId" }, 'Get single targets info failed', 'body'],
  ['GetBaselineDataByClientTargetId', 'get', { clientTargetId: "clientTargetId" }, 'Get single BaseLine data failed', 'body'],
  ['CreateClientDataCollectionData', 'post', { clientTargetId: "clientTargetId", data: "data" }, 'Creating a Data collection data failed', 'body'],
  ['GetSessionsByTarget', 'get', { targetId: "targetId", clientId: "clientId", tenantId: "tenantId" }, 'Get sessions by target failed', 'body'],
  ['GetClientTargetPerformance', 'get', { clientId: "clientId", targetId: "targetId" }, 'Get client target performance failed', 'body'],
  ['GetTargetBaselineData', 'get', { targetId: "targetId" }, 'Failed to fetch target baseline data', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('ProgramLibraryApis.js', () => {
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
