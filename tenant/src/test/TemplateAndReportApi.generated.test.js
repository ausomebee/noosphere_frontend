import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/TemplateAndReportApi.js';

/**
 * Every wrapper in TemplateAndReportApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateClinicalReportTemplate', 'post', { tenantId: "tenantId", title: "title", sections: [] }, 'Create Clinical report templates failed', 'message'],
  ['UpdateClinicalReportTemplate', 'put', { id: "id", isDraft: "isDraft", tenantId: "tenantId", title: "title", sections: [] }, 'update Clinical report templates failed', 'message'],
  ['GetClinicalReportTemplateByTenantId', 'get', { tenantId: "tenantId" }, 'Get Clinical Report Template by tenantId failed', 'message'],
  ['GetSingleClinicalReportTemplateById', 'get', { Id: "Id" }, 'Get Single Clinical Report Template by id failed', 'message'],
  ['DuplicateClinicalReportTemplate', 'post', { Id: "Id" }, 'Duplicate Clinical Report Template failed', 'message'],
  ['DeleteClinicalReportTemplate', 'delete', { Id: "Id" }, 'Delete Clinical Report Template failed', 'message'],
  ['CreateClinicalReport', 'post', { tenantId: "tenantId", clientTenantId: "clientTenantId", creatorId: "creatorId", approverId: "approverId", title: "title", status: "status" }, 'Create Clinical report failed', 'message'],
  ['UpdateClinicalReport', 'put', { id: "id", clientTenantId: "clientTenantId", approverId: "approverId", title: "title", status: "status" }, 'Update Clinical report failed', 'message'],
  ['GetSingleClinicalReportById', 'get', { Id: "Id" }, 'Get Single Clinical Report by id failed', 'message'],
  ['GeClinicalReportByTenantIdAndStatus', 'get', { clientTenantId: "clientTenantId", status: "status" }, 'Get Clinical Report by tenantId and status failed', 'message'],
  ['GetClinicalReportByApproverId', 'get', { approverId: "approverId", clientTenantId: "clientTenantId" }, 'Get Clinical Report Approver failed', 'message'],
  ['DeleteClinicalReport', 'delete', { Id: "Id" }, 'Delete Clinical Report failed', 'message'],
  ['DuplicateClinicalReport', 'post', { Id: "Id" }, 'Duplicate Clinical Report failed', 'message'],
  ['GetClinicalReportAuditTrails', 'get', { reportId: "reportId" }, 'Get Clinical Report Audit Trails failed', 'message'],
  ['GetAllClinicalReportChangeRequests', 'get', { reportId: "reportId" }, 'Get Clinical Report Change Requests failed', 'message'],
  ['UpdateClinicalReportStatus', 'patch', { reportId: "reportId", status: "status" }, 'Update Clinical Report Status failed', 'message'],
  ['CreateClinicalReportChangeRequest', 'post', { clinicalReportId: "clinicalReportId", description: "description", approverId: "approverId", clientTenantId: "clientTenantId" }, 'Create Clinical report change requests failed', 'message'],
  ['GetClinicalReportChangeRequests', 'get', { clinicalReportId: "clinicalReportId" }, 'Get Clinical report change requests failed', 'message'],
  ['MarkClinicalReportChangeRequestViewed', 'patch', { changeRequestId: "changeRequestId" }, 'Mark Clinical Report Change Request Viewed failed', 'message'],
  ['GetClinicalReportChangeRequestById', 'get', { changeRequestId: "changeRequestId" }, 'Get Clinical Report Change Request By Id failed', 'message'],
  ['WithdrawClientClinicalReport', 'patch', { clinicalReportId: "clinicalReportId" }, 'Withdraw Clinical Report failed', 'message'],
  ['NudgeClientForReport', 'post', { clinicalReportId: "clinicalReportId" }, 'Nudge client for report failed', 'message'],
  ['ApproveClinicalReport', 'patch', { clinicalReportId: "clinicalReportId" }, 'Approve Clinical Report failed', 'message'],
  ['ValidateClientReportToken', 'post', { token: "token" }, 'Token validation failed', 'message'],
  ['ResubmitClinicalReport', 'patch', { clinicalReportId: "clinicalReportId" }, 'Resubmit Clinical Report failed', 'message'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('TemplateAndReportApi.js', () => {
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
