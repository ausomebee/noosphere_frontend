import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/clientPanelApis.js';

/**
 * Every wrapper in clientPanelApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetAllTenantsClient', 'get', { id: "id" }, 'Get all tenant client by tenant id failed', 'body'],
  ['UpdateActiveClient', 'patch', { clientTenantId: "clientTenantId", active: "active" }, 'Deleting client failed', 'body'],
  ['GetSingleClientByClientId', 'get', { id: "id" }, 'Get single client by id failed', 'body'],
  ['UpdateClientPortalAccess', 'patch', { clientTenantId: "clientTenantId", documentAccess: "documentAccess", dbAccess: "dbAccess", requestAppointment: "requestAppointment" }, 'client Portal Access update failed', 'body'],
  ['CreateClientDocuments', 'post', { createdBy: "createdBy", tenantClientId: "tenantClientId", name: "name", documentDetails: "documentDetails" }, 'create client document failed', 'body'],
  ['UpdateClientDocuments', 'put', { id: "id", name: "name", documentDetails: "documentDetails" }, 'Update client document failed', 'body'],
  ['GetAllClientDocument', 'get', { id: "id" }, 'Get  all client documents by id failed', 'body'],
  ['CreateClientDocumentsRequest', 'post', { tenantClientId: "tenantClientId", name: "name", description: "description", allowMultiple: "allowMultiple", dueDate: new Date('2026-01-05T00:00:00Z') }, 'create client document failed', 'body'],
  ['NudgeClientDocumentRequest', 'post', { id: "id" }, 'Failed to send nudge to client', 'body'],
  ['CancelClientDocumentRequest', 'patch', { id: "id" }, 'Failed to cancel document request', 'body'],
  ['GetAllClientDocumentRequested', 'get', { id: "id" }, 'Get  all client documents by id failed', 'body'],
  ['GetProgramsByTenantId', 'get', { id: "id" }, 'Get  all tenants program by id failed', 'body'],
  ['GetClientsProgramByClientId', 'get', { id: "id" }, 'Get  client program by id failed', 'body'],
  ['AttachProgramToClient', 'post', { clientId: "clientId", programId: "programId" }, 'Attach client program failed', 'body'],
  ['CreateClientsProgram', 'post', { name: "name", description: "description", clientId: "clientId" }, 'Create client program failed', 'body'],
  ['EditClientsProgram', 'patch', { id: "id", name: "name", description: "description", clientId: "clientId" }, 'Edit client program failed', 'body'],
  ['deleteClientsProgram', 'delete', { id: "id" }, 'Delete program failed', 'body'],
  ['GetProgramsTargetsByProgramId', 'get', { programId: "programId" }, 'Get targets failed', 'body'],
  ['deleteProgramsTarget', 'delete', { id: "id" }, 'Delete target failed', 'body'],
  ['GetProgramsTargetById', 'get', { Id: "Id" }, 'Get single targets failed', 'body'],
  ['GetAllTargetByTenantId', 'get', { Id: "Id" }, 'Get all targets failed', 'body'],
  ['AttachTargetToClient', 'post', { clientId: "clientId", targetId: "targetId", programId: "programId" }, 'Attach client target failed', 'body'],
  ['CreateClientAuthorization', 'post', { tenantClientId: "tenantClientId", title: "title", authorizationNumber: "authorizationNumber", startDate: new Date('2026-01-05T00:00:00Z'), endDate: new Date('2026-01-05T00:00:00Z'), payer: "payer", insuranceType: "insuranceType", serviceCodes: "serviceCodes" }, 'Create client authorization failed', 'body'],
  ['UpdateClientAuthorization', 'put', { id: "id", title: "title", authorizationNumber: "authorizationNumber", startDate: new Date('2026-01-05T00:00:00Z'), endDate: new Date('2026-01-05T00:00:00Z'), payer: "payer", insuranceType: "insuranceType", serviceCodes: "serviceCodes" }, 'Update client authorization failed', 'body'],
  ['GetAllClientAuthorizationByTenantClientId', 'get', { tenantClientId: "tenantClientId" }, 'Get all client Authorization failed', 'body'],
  ['GetSingleClientAuthorizationById', 'get', { id: "id" }, 'Get single client Authorization failed', 'body'],
  ['SetClientAuthorizationActive', 'patch', { id: "id", active: "active" }, 'Set authorization active failed', 'body'],
  ['SoftDeleteClientAuthorization', 'patch', { id: "id" }, 'Delete authorization failed', 'body'],
  ['GetClientUpcomingAppointments', 'get', { id: "id" }, 'Get Client upcoming appointments failed', 'body'],
  ['GetClientPastAppointments', 'get', { id: "id" }, 'Get Client past appointments failed', 'body'],
  ['GetClientCancelAppointments', 'get', { id: "id" }, 'Get Client canceled appointments failed', 'body'],
  ['deleteClientsDocument', 'delete', { id: "id" }, 'Delete client documents failed', 'body'],
  ['AttachFormToClient', 'post', { tenantClientId: "tenantClientId", formId: "formId" }, 'Attach forms failed', 'body'],
  ['GetAllFormsByTenantClientId', 'get', { tenantClientId: "tenantClientId" }, 'Get all client Forms failed', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('clientPanelApis.js', () => {
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
