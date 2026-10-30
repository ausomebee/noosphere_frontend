import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/IssueApi.js';

/**
 * Every wrapper in IssueApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetIssueById', 'get', { id: "id" }, 'Failed to Issue by Id', 'body'],
  ['GetResolutionTime', 'get', {  }, 'Failed to fetch resolution time', 'body'],
  ['GetMetricAndStatusCount', 'get', {  }, 'Failed to fetch metrics and counts', 'body'],
  ['GetStatusPercentageAndCount', 'get', {  }, 'Failed to fetch status percentage and count', 'body'],
  ['GetCategoryPercentageAndCount', 'get', {  }, 'Failed to fetch category percentage and count', 'body'],
  ['GetDateCreatedPercentageAndCount', 'get', {  }, 'Failed to fetch date created percentage and count', 'body'],
  ['GetAssigneePercentageAndCount', 'get', {  }, 'Failed to fetch date created percentage and count', 'body'],
  ['GetPriorityPercentageAndCount', 'get', {  }, 'Failed to fetch priority percentage and count', 'body'],
  ['GetIssuesByStatus', 'get', { status: "status" }, 'Failed to fetch issues', 'body'],
  ['CreateIssue', 'post', { payload: "payload" }, 'Failed to create issue', 'body'],
  ['CreateCommentOnIssue', 'post', { issueId: "issueId", comment: "comment", adminId: "adminId" }, 'Failed to create comment', 'body'],
  ['EditIssue', 'patch', { issueId: "issueId", title: "title", updatedBy: "updatedBy", description: "description" }, 'Failed to Edit Issue', 'body'],
  ['ChangeCategory', 'patch', { issueId: "issueId", category: "category", updatedBy: "updatedBy" }, 'Failed to Edit category', 'body'],
  ['ChangePriority', 'patch', { issueId: "issueId", priority: "priority", updatedBy: "updatedBy" }, 'Failed to Edit priority', 'body'],
  ['ReassignToStaff', 'patch', { issueId: "issueId", adminId: "adminId", updatedBy: "updatedBy" }, 'Failed to reassign to staff', 'body'],
  ['ChangeIssueStatus', 'patch', { issueId: "issueId", status: "status", updatedBy: "updatedBy" }, 'Failed to change status', 'body'],
  ['AddAttachment', 'patch', { payload: "payload" }, 'Failed to add attachment', 'body'],
  ['MarkAsResolved', 'patch', { payload: "payload" }, 'Failed to add attachment', 'body'],
  ['GetTenantManagementOverview', 'get', { tenantId: "tenantId" }, 'Failed to fetch tenant management overview', 'body'],
  ['GetTenantIssuesByStatus', 'get', { tenantId: "tenantId", status: "status" }, 'Failed to fetch tenant issues by status', 'body'],
  ['ContactTenantByMail', 'post', { payload: "payload" }, 'Failed to contact tenant by mail', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('IssueApi.js', () => {
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
