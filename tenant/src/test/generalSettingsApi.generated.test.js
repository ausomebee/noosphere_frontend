import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/generalSettingsApi.js';

/**
 * Every wrapper in generalSettingsApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateGeneralSettings', 'post', { tenantId: "tenantId", dateFormat: "dateFormat", timeFormat: "timeFormat", currency: "currency" }, 'Create general settings failed', 'message'],
  ['UpdateGeneralSettings', 'put', { tenantId: "tenantId", dateFormat: "dateFormat", timeFormat: "timeFormat", currency: "currency" }, 'Update general settings failed', 'message'],
  ['GetGeneralSettingsByTenantId', 'get', { tenantId: "tenantId" }, 'Get general settings failed', 'message'],
  ['TenantSecurityQuestions', 'post', { tenantId: "tenantId", question: "question" }, 'Set tenant security questions failed', 'message'],
  ['UpdateTenantSecurityQuestions', 'put', { id: "id", question: "question" }, 'Update tenant security questions failed', 'message'],
  ['GetTenantSecurityQuestionsByTenantId', 'get', { tenantId: "tenantId" }, 'Get tenant security questions failed', 'message'],
  ['GetTenantSecurityQuestionsById', 'get', { id: "id" }, 'Get tenant security questions failed', 'message'],
  ['Set2FASetDefault', 'patch', { tenantId: "tenantId", Authenticator2FA: "Authenticator2FA", securityQuestion: "securityQuestion", setForAll: "setForAll" }, 'Set 2FA default failed', 'message'],
  ['ChangePassword', 'patch', { currentPassword: "currentPassword", newPassword: "newPassword", staffId: "staffId" }, 'Change password failed', 'message'],
  ['GetTenantAdminChoices', 'get', { tenantId: "tenantId" }, 'Get tenant admin choices failed', 'message'],
  ['SetTenantAdminEnabled', 'patch', { tenantId: "tenantId", isEnabled: "isEnabled" }, 'Update 2FA status failed', 'message'],
  ['GetTenantById', 'get', { tenantId: "tenantId" }, 'Get tenant failed', 'message'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('generalSettingsApi.js', () => {
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
