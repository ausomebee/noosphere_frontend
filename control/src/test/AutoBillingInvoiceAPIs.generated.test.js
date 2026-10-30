import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/AutoBillingInvoiceAPIs.js';

/**
 * Every wrapper in AutoBillingInvoiceAPIs.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetInvoiceManagementAllField', 'get', {  }, 'Failed to fetch AutoBilling invoice management', 'body'],
  ['UpdatePlanPurchaseToggle', 'patch', { id: "id", onPlanPurchase: "onPlanPurchase" }, 'Failed to update plan purchase', 'body'],
  ['UpdateDayBeforeDueNumber', 'patch', { id: "id", daysBeforeDueDate: "daysBeforeDueDate", isDaysBeforeDueDate: "isDaysBeforeDueDate" }, 'Failed to update days before due', 'body'],
  ['UpcomingInvoiceEmail', 'patch', { id: "id", upcomingInvoiceHeader: "upcomingInvoiceHeader", upcomingInvoiceBody: "upcomingInvoiceBody" }, 'Failed to create upcoming invoice email', 'body'],
  ['UpdateOnDueDateToggle', 'patch', { id: "id", onDueDate: "onDueDate" }, 'Failed to update plan purchase', 'body'],
  ['DueInvoiceEmail', 'patch', { id: "id", dueInvoiceHeader: "dueInvoiceHeader", dueInvoiceBody: "dueInvoiceBody" }, 'Failed to update due invoice email', 'body'],
  ['MarkOverDueCount', 'patch', { id: "id", markOverDue: "markOverDue" }, 'Failed to update mark to overdue', 'body'],
  ['ReminderTimesBefore', 'patch', { id: "id", unpaidReminderTimesBefore: "unpaidReminderTimesBefore" }, 'Failed to update time before', 'body'],
  ['UpdateAttachToReminderToggle', 'patch', { id: "id", attachInvoiceToReminder: "attachInvoiceToReminder" }, 'Failed to update attach to reminder', 'body'],
  ['ReminderEmail', 'patch', { id: "id", reminderEmail: "reminderEmail" }, 'Failed to update reminder email', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('AutoBillingInvoiceAPIs.js', () => {
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

describe('the optional days-before-due flag', () => {
  it('leaves the on/off flag out of the body when the caller omits it', async () => {
    verbs.patch.mockResolvedValue({ data: { ok: true } });
    await api.UpdateDayBeforeDueNumber({ id: 'i1', daysBeforeDueDate: 3, ...tokens });
    expect(verbs.patch).toHaveBeenCalledWith(expect.any(String), {
      id: 'i1',
      daysBeforeDueDate: 3,
    });
  });
});
