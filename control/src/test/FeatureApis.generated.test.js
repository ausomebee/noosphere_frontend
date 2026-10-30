import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/FeatureApis.js';

/**
 * Every wrapper in FeatureApis.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateFeature', 'post', { featureGroupId: "featureGroupId", name: "name", description: "description", active: "active", applicablePlans: "applicablePlans", managedBy: "managedBy" }, 'Feature creation failed', 'body'],
  ['UpdateFeature', 'patch', { id: "id", name: "name", description: "description", active: "active", applicablePlans: "applicablePlans", managedBy: "managedBy" }, 'Feature update failed', 'body'],
  ['DeleteFeature', 'delete', { id: "id", administratorPassword: "administratorPassword" }, 'Feature deletion failed', 'body'],
  ['GetSingleFeature', 'get', { id: "id" }, 'Feature retrieval failed', 'body'],
  ['GetAllFeatures', 'get', {  }, 'Feature retrieval failed', 'body'],
  ['CreateFeatureGroup', 'post', { name: "name" }, 'Feature group creation failed', 'body'],
  ['GetSingleFeatureGroup', 'get', { id: "id" }, 'Feature retrieval failed', 'body'],
  ['GetAllFeatureGroups', 'get', {  }, 'Feature group retrieval failed', 'body'],
  ['UpdateFeatureGroup', 'patch', { id: "id", name: "name" }, 'Feature group update failed', 'body'],
  ['DeleteFeatureGroup', 'delete', { id: "id", administratorPassword: "administratorPassword" }, 'Feature group deletion failed', 'body'],
  ['MoveFeatureToAnotherGroup', 'patch', { id: "id", featureGroupId: "featureGroupId" }, 'Feature group update failed', 'body'],
  ['EnableOrDisableFeature', 'patch', { id: "id", active: "active" }, 'Feature group update failed', 'body'],
  ['AssignFeatureToPlan', 'patch', { id: "id", applicablePlans: "applicablePlans" }, 'Assign Feature to another plan failed', 'body'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('FeatureApis.js', () => {
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
