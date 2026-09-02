import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/AutoBillingPandAApis.js';

/**
 * Every wrapper in AutoBillingPandAApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetPaymentAccessManagementAllField', 'get', {  }, 'Failed to fetch AutoBilling payment and access management', 'body'],
  ['UpdateChargeOnDueDateToggle', 'patch', { id: "id", chargeOnDueDate: "chargeOnDueDate" }, 'Failed to charge on Due date', 'body'],
  ['UpdateChargeLastUsedFirstToggle', 'patch', { id: "id", chargeLastUsedFirst: "chargeLastUsedFirst" }, 'Failed to charge last first used', 'body'],
  ['UpdateChargeAlternativeToggle', 'patch', { id: "id", chargeAlternative: "chargeAlternative" }, 'Failed to charge alternative', 'body'],
  ['UpdateRetryBeforeCount', 'patch', { id: "id", retryBefore: "retryBefore" }, 'Failed to change retry before', 'body'],
  ['UpdateRetryAfterCount', 'patch', { id: "id", retryAfter: "retryAfter" }, 'Failed to change retry after', 'body'],
  ['UpdateNotifyTenantToggle', 'patch', { id: "id", notifyTenant: "notifyTenant" }, 'Failed to change notify Tenant', 'body'],
  ['NotificationEmail', 'patch', { id: "id", notificationEmailHeader: "notificationEmailHeader", notificationEmailBody: "notificationEmailBody" }, 'Failed to update notification email', 'body'],
  ['UpdateCancelAfter', 'patch', { id: "id", cancelAfter: "cancelAfter" }, 'Failed to cancel after', 'body'],
  ['UpdateManualCancel', 'patch', { id: "id", manualCancel: "manualCancel" }, 'Failed to manual cancel', 'body'],
  ['UpdateEmailAfterAttempts', 'patch', { id: "id", emailAfterAttempts: "emailAfterAttempts" }, 'Failed to email after attempts', 'body'],
  ['WarningEmail', 'patch', { id: "id", warningMailHeader: "warningMailHeader", warningMailBody: "warningMailBody" }, 'Failed to update warning mail', 'body'],
  ['SendOnSubCancel', 'patch', { id: "id", sendOnSubscriptionCancel: "sendOnSubscriptionCancel" }, 'Failed to update send on sub cancel', 'body'],
  ['CancelEmail', 'patch', { id: "id", cancelMailHeader: "cancelMailHeader", cancelMailBody: "cancelMailBody" }, 'Failed to update cancel mail', 'body'],
  ['UpdateSuspensionAction', 'patch', { id: "id", suspensionAction: "suspensionAction", errorMessage: "errorMessage" }, 'Failed to update suspension action mail', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('AutoBillingPandAApis.js', () => {
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
