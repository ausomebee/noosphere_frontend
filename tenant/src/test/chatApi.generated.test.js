import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/chatApi.js';

/**
 * Every wrapper in chatApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['GetConversations', 'get', { userId: "userId", tenantId: "tenantId" }, 'Get conversations failed', 'body'],
  ['CreateConversation', 'post', { participants: "participants", tenantId: "tenantId" }, 'Create conversation failed', 'body'],
  ['GetUserMessages', 'get', { userId: "userId", userType: "userType" }, 'Get user messages failed', 'body'],
  ['GetMessages', 'get', { conversationId: "conversationId", page: 1, limit: 1 }, 'Get messages failed', 'body'],
  ['MarkMessagesAsRead', 'patch', { conversationId: "conversationId", userId: "userId" }, 'Mark messages as read failed', 'body'],
  ['MarkMessageAsRead', 'patch', { messageId: "messageId" }, 'Mark message as read failed', 'body'],
  ['GetNotifications', 'get', { userId: "userId", tenantId: "tenantId" }, 'Get notifications failed', 'body'],
  ['MarkNotificationAsRead', 'patch', { notificationId: "notificationId" }, 'Mark notification as read failed', 'body'],
  ['GetUnreadNotificationCount', 'get', { userId: "userId", tenantId: "tenantId" }, 'Get unread count failed', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('chatApi.js', () => {
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
