import { describe, it, expect, vi, beforeEach } from 'vitest';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

// Only the two fetch thunks are ever really run (see the last describe); the
// rest of the API surface is left off so an accidental call would be obvious.
const featureApi = vi.hoisted(() => ({
  GetAllFeatures: vi.fn(),
  GetAllFeatureGroups: vi.fn(),
}));
vi.mock('../api/FeatureApis', () => ({ default: featureApi }));

import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  addFeatureGroup,
  addFeature,
  editFeature,
  asyncCreateFeatureGroup,
  asyncUpdateFeatureGroup,
  asyncDeleteFeatureGroup,
  asyncCreateFeature,
  asyncUpdateFeature,
  asyncDeleteFeature,
  asyncMoveFeatureToAnotherGroup,
  asyncEnableOrDisableFeature,
  asyncAssignFeatureToPlan,
  asyncFetchAllFeatureGroups,
  asyncFetchAllFeatures,
} from '../ReduxStore/features/featureManagementSlice';

/**
 * The server-driven half of the feature-management slice.
 *
 * featureManagementSlice.test.js covers the local reducers, which address
 * groups by title. The extraReducers here address them by id instead, because
 * that is what the API returns, so a group created locally and the same group
 * as the backend knows it are only linked by that id -- most of the branches
 * below are "did the id match anything already in state".
 *
 * The thunks are mostly not run at all: RTK's `.fulfilled`/`.rejected` action
 * creators produce the actions directly, which keeps the API layer out of it.
 * The exception is the last describe, where what a thunk does with a thrown API
 * error is itself the thing being pinned down.
 */

const initial = () => reducer(undefined, { type: '@@INIT' });

// Two groups, because rehoming on delete needs somewhere to rehome to, and
// "Extra Features" is that destination by title.
const withGroups = () => {
  let s = reducer(initial(), addFeatureGroup({ title: 'Billing', id: 'g1' }));
  s = reducer(s, addFeatureGroup({ title: 'Extra Features', id: 'g2' }));
  return s;
};

const groupById = (state, id) => state.featureGroups.find((g) => g.id === id);

// The fulfilled action creators take (payload, requestId, arg); rejected takes
// (error, requestId, arg, payload) and it is the last slot the slice reads.
const rejectedWith = (thunk, payload) => thunk.rejected(new Error('x'), 'req', {}, payload);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pending and rejected handling', () => {
  const thunks = [
    ['asyncCreateFeatureGroup', asyncCreateFeatureGroup],
    ['asyncUpdateFeatureGroup', asyncUpdateFeatureGroup],
    ['asyncDeleteFeatureGroup', asyncDeleteFeatureGroup],
    ['asyncCreateFeature', asyncCreateFeature],
    ['asyncUpdateFeature', asyncUpdateFeature],
    ['asyncDeleteFeature', asyncDeleteFeature],
    ['asyncMoveFeatureToAnotherGroup', asyncMoveFeatureToAnotherGroup],
    ['asyncEnableOrDisableFeature', asyncEnableOrDisableFeature],
    ['asyncAssignFeatureToPlan', asyncAssignFeatureToPlan],
    ['asyncFetchAllFeatureGroups', asyncFetchAllFeatureGroups],
    ['asyncFetchAllFeatures', asyncFetchAllFeatures],
  ];

  it.each(thunks)('%s clears the last error while it is in flight', (_name, thunk) => {
    const state = reducer({ ...initial(), error: 'stale' }, thunk.pending('req', {}));
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it.each(thunks)('%s records the rejection message it was given', (_name, thunk) => {
    const state = reducer({ ...initial(), loading: true }, rejectedWith(thunk, 'server said no'));
    expect(state.loading).toBe(false);
    expect(state.error).toBe('server said no');
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('server said no') })
    );
  });

  it.each(thunks)('%s falls back to "Unknown error" with no message', (_name, thunk) => {
    const state = reducer(initial(), rejectedWith(thunk, undefined));
    expect(state.error).toBeUndefined();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Unknown error') })
    );
  });
});

describe('creating a group', () => {
  it('appends the created group with an empty feature list', () => {
    const state = reducer(
      initial(),
      asyncCreateFeatureGroup.fulfilled({ id: 'g9', name: 'Reporting' }, 'req', {})
    );
    expect(state.featureGroups).toEqual([{ id: 'g9', title: 'Reporting', features: [] }]);
    expect(state.loading).toBe(false);
  });

  it('ignores a response with no name', () => {
    const state = reducer(initial(), asyncCreateFeatureGroup.fulfilled({ id: 'g9' }, 'req', {}));
    expect(state.featureGroups).toEqual([]);
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('updating a group', () => {
  it('renames the group that matches the returned id', () => {
    const state = reducer(
      withGroups(),
      asyncUpdateFeatureGroup.fulfilled({ id: 'g1', name: 'Billing & Tax' }, 'req', {})
    );
    expect(groupById(state, 'g1').title).toBe('Billing & Tax');
  });

  it('still reports success when the id matches nothing in state', () => {
    const before = withGroups();
    const state = reducer(
      before,
      asyncUpdateFeatureGroup.fulfilled({ id: 'nope', name: 'Ghost' }, 'req', {})
    );
    expect(state.featureGroups.map((g) => g.title)).toEqual(['Billing', 'Extra Features']);
    expect(showToast).toHaveBeenCalled();
  });
});

describe('deleting a group', () => {
  const populated = () => {
    let s = withGroups();
    s = reducer(s, addFeature({ groupTitle: 'Billing', feature: { name: 'Invoicing' } }));
    return s;
  };

  it('rehomes the deleted group\'s features into Extra Features', () => {
    const state = reducer(populated(), asyncDeleteFeatureGroup.fulfilled({ id: 'g1' }, 'req', {}));
    expect(groupById(state, 'g1')).toBeUndefined();
    expect(groupById(state, 'g2').features.map((f) => f.name)).toEqual(['Invoicing']);
  });

  it('deletes Extra Features itself rather than rehoming into it', () => {
    const state = reducer(withGroups(), asyncDeleteFeatureGroup.fulfilled({ id: 'g2' }, 'req', {}));
    expect(state.featureGroups.map((g) => g.id)).toEqual(['g1']);
  });

  it('deletes a group outright when there is no Extra Features group', () => {
    const only = reducer(initial(), addFeatureGroup({ title: 'Billing', id: 'g1' }));
    const state = reducer(only, asyncDeleteFeatureGroup.fulfilled({ id: 'g1' }, 'req', {}));
    expect(state.featureGroups).toEqual([]);
  });

  it('leaves state alone when the id matches nothing', () => {
    const state = reducer(withGroups(), asyncDeleteFeatureGroup.fulfilled({ id: 'nope' }, 'req', {}));
    expect(state.featureGroups).toHaveLength(2);
  });
});

describe('creating a feature', () => {
  const created = (over = {}) =>
    asyncCreateFeature.fulfilled(
      {
        id: 'f1',
        featureGroupId: 'g1',
        name: 'Invoicing',
        active: true,
        createdAt: '2025-01-02T00:00:00.000Z',
        ...over,
      },
      'req',
      {}
    );

  it('adds the feature to its group with the fields the table shows', () => {
    const state = reducer(withGroups(), created({ description: 'Bill them', managedBy: 'Ops' }));
    expect(groupById(state, 'g1').features[0]).toEqual(
      expect.objectContaining({
        id: 'f1',
        name: 'Invoicing',
        description: 'Bill them',
        managedBy: 'Ops',
        active: true,
        selected: false,
      })
    );
  });

  it('defaults a missing description and owner', () => {
    const state = reducer(withGroups(), created());
    expect(groupById(state, 'g1').features[0].description).toBe('');
    expect(groupById(state, 'g1').features[0].managedBy).toBe('Admin');
  });

  it('drops a feature whose group is not loaded yet', () => {
    const state = reducer(withGroups(), created({ featureGroupId: 'missing' }));
    expect(groupById(state, 'g1').features).toEqual([]);
  });
});

describe('updating a feature', () => {
  const withOne = (over = {}) => {
    const s = withGroups();
    return reducer(
      s,
      asyncCreateFeature.fulfilled(
        {
          id: 'f1',
          featureGroupId: 'g1',
          name: 'Invoicing',
          active: true,
          description: 'Bill them',
          managedBy: 'Ops',
          ...over,
        },
        'req',
        {}
      )
    );
  };

  const updated = (over = {}) =>
    asyncUpdateFeature.fulfilled(
      { id: 'f1', name: 'Invoicing v2', active: false, ...over },
      'req',
      {}
    );

  it('replaces the fields the response carries', () => {
    const state = reducer(withOne(), updated({ description: 'New copy', managedBy: 'Finance' }));
    expect(groupById(state, 'g1').features[0]).toEqual(
      expect.objectContaining({
        name: 'Invoicing v2',
        description: 'New copy',
        managedBy: 'Finance',
        active: false,
      })
    );
  });

  it('keeps the stored description and owner when the response omits them', () => {
    const state = reducer(withOne(), updated());
    expect(groupById(state, 'g1').features[0].description).toBe('Bill them');
    expect(groupById(state, 'g1').features[0].managedBy).toBe('Ops');
  });

  it('settles on an empty description when neither side has one', () => {
    const state = reducer(withOne({ description: '' }), updated());
    expect(groupById(state, 'g1').features[0].description).toBe('');
  });

  it('touches nothing when no group holds that feature', () => {
    const state = reducer(withGroups(), updated());
    expect(groupById(state, 'g1').features).toEqual([]);
    expect(showToast).toHaveBeenCalled();
  });
});

describe('deleting a feature', () => {
  it('removes the feature from whichever group holds it', () => {
    let s = withGroups();
    s = reducer(
      s,
      asyncCreateFeature.fulfilled({ id: 'f1', featureGroupId: 'g1', name: 'Invoicing' }, 'req', {})
    );
    const state = reducer(s, asyncDeleteFeature.fulfilled({ id: 'f1' }, 'req', {}));
    expect(groupById(state, 'g1').features).toEqual([]);
  });
});

describe('moving a feature between groups', () => {
  const withOne = () =>
    reducer(
      withGroups(),
      asyncCreateFeature.fulfilled({ id: 'f1', featureGroupId: 'g1', name: 'Invoicing' }, 'req', {})
    );

  it('takes the feature out of its old group and into the new one', () => {
    const state = reducer(
      withOne(),
      asyncMoveFeatureToAnotherGroup.fulfilled({ id: 'f1', featureGroupId: 'g2' }, 'req', {})
    );
    expect(groupById(state, 'g1').features).toEqual([]);
    expect(groupById(state, 'g2').features.map((f) => f.id)).toEqual(['f1']);
  });

  it('does nothing when the destination group is unknown', () => {
    const state = reducer(
      withOne(),
      asyncMoveFeatureToAnotherGroup.fulfilled({ id: 'f1', featureGroupId: 'nope' }, 'req', {})
    );
    expect(groupById(state, 'g1').features).toHaveLength(1);
  });

  it('does nothing when no group holds the feature', () => {
    const state = reducer(
      withOne(),
      asyncMoveFeatureToAnotherGroup.fulfilled({ id: 'ghost', featureGroupId: 'g2' }, 'req', {})
    );
    expect(groupById(state, 'g2').features).toEqual([]);
  });
});

describe('enabling and disabling a feature', () => {
  const withOne = () =>
    reducer(
      withGroups(),
      asyncCreateFeature.fulfilled(
        { id: 'f1', featureGroupId: 'g1', name: 'Invoicing', active: true },
        'req',
        {}
      )
    );

  it('turns a feature off and says so', () => {
    const state = reducer(
      withOne(),
      asyncEnableOrDisableFeature.fulfilled({ id: 'f1', active: false }, 'req', {})
    );
    expect(groupById(state, 'g1').features[0].active).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Feature disabled successfully' })
    );
  });

  it('turns a feature back on and says so', () => {
    const state = reducer(
      withOne(),
      asyncEnableOrDisableFeature.fulfilled({ id: 'f1', active: true }, 'req', {})
    );
    expect(groupById(state, 'g1').features[0].active).toBe(true);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Feature enabled successfully' })
    );
  });

  it('leaves state alone for a feature it cannot find', () => {
    const state = reducer(
      withOne(),
      asyncEnableOrDisableFeature.fulfilled({ id: 'ghost', active: false }, 'req', {})
    );
    expect(groupById(state, 'g1').features[0].active).toBe(true);
  });
});

describe('assigning a feature to plans', () => {
  const withOne = () =>
    reducer(
      withGroups(),
      asyncCreateFeature.fulfilled({ id: 'f1', featureGroupId: 'g1', name: 'Invoicing' }, 'req', {})
    );

  it('stores the plan list on the feature', () => {
    const state = reducer(
      withOne(),
      asyncAssignFeatureToPlan.fulfilled({ id: 'f1', applicablePlans: ['Pro'] }, 'req', {})
    );
    expect(groupById(state, 'g1').features[0].plan).toEqual(['Pro']);
  });

  it('leaves state alone for a feature it cannot find', () => {
    const state = reducer(
      withOne(),
      asyncAssignFeatureToPlan.fulfilled({ id: 'ghost', applicablePlans: ['Pro'] }, 'req', {})
    );
    expect(groupById(state, 'g1').features[0].plan).toBeUndefined();
  });
});

describe('fetching groups', () => {
  const fetched = (groups) => asyncFetchAllFeatureGroups.fulfilled(groups, 'req', {});

  it('fills in a group that was created locally with no features yet', () => {
    const state = reducer(
      withGroups(),
      fetched([
        {
          id: 'g1',
          name: 'Billing',
          features: [
            {
              id: 'f1',
              name: 'Invoicing',
              active: true,
              createdAt: '2025-01-02T00:00:00.000Z',
              plans: [{ name: 'Pro' }],
            },
          ],
        },
      ])
    );
    expect(groupById(state, 'g1').features[0]).toEqual(
      expect.objectContaining({ id: 'f1', plans: ['Pro'], managedBy: 'Admin', description: '' })
    );
  });

  it('reads a known group\'s features from the capitalised key too', () => {
    // Some endpoints serialise the Prisma relation as `Feature`, singular and
    // capitalised, rather than `features`.
    const state = reducer(
      withGroups(),
      fetched([{ id: 'g1', name: 'Billing', Feature: [{ id: 'f1', name: 'Invoicing' }] }])
    );
    expect(groupById(state, 'g1').features.map((f) => f.id)).toEqual(['f1']);
  });

  it('leaves a known group empty when neither feature key is present', () => {
    const state = reducer(withGroups(), fetched([{ id: 'g1', name: 'Billing' }]));
    expect(groupById(state, 'g1').features).toEqual([]);
  });

  it('accepts a new group whose features arrive under neither key', () => {
    const state = reducer(initial(), fetched([{ id: 'g9', name: 'Reporting' }]));
    expect(groupById(state, 'g9').features).toEqual([]);
  });

  it('creates a new group from the capitalised feature key', () => {
    const state = reducer(
      initial(),
      fetched([{ id: 'g9', name: 'Reporting', Feature: [{ id: 'f9', name: 'Charts' }] }])
    );
    expect(groupById(state, 'g9').features.map((f) => f.id)).toEqual(['f9']);
  });
});

describe('fetching features', () => {
  const fetched = (features) => asyncFetchAllFeatures.fulfilled(features, 'req', {});

  it('adds a feature to the group it belongs to', () => {
    const state = reducer(
      withGroups(),
      fetched([
        {
          id: 'f1',
          featureGroupId: 'g1',
          name: 'Invoicing',
          active: true,
          description: 'Bill them',
          managedBy: 'Ops',
          plans: [{ name: 'Pro' }, { name: 'Enterprise' }],
        },
      ])
    );
    expect(groupById(state, 'g1').features[0]).toEqual(
      expect.objectContaining({
        description: 'Bill them',
        managedBy: 'Ops',
        plans: ['Pro', 'Enterprise'],
        selected: false,
      })
    );
  });

  it('defaults description, owner and plans when the response omits them', () => {
    const state = reducer(
      withGroups(),
      fetched([{ id: 'f1', featureGroupId: 'g1', name: 'Invoicing', active: true }])
    );
    expect(groupById(state, 'g1').features[0]).toEqual(
      expect.objectContaining({ description: '', managedBy: 'Admin', plans: [] })
    );
  });

  it('overwrites a feature it already holds rather than duplicating it', () => {
    let s = withGroups();
    s = reducer(
      s,
      asyncCreateFeature.fulfilled(
        { id: 'f1', featureGroupId: 'g1', name: 'Invoicing', active: true },
        'req',
        {}
      )
    );
    const state = reducer(
      s,
      fetched([{ id: 'f1', featureGroupId: 'g1', name: 'Invoicing v2', active: false }])
    );
    expect(groupById(state, 'g1').features).toHaveLength(1);
    expect(groupById(state, 'g1').features[0].name).toBe('Invoicing v2');
  });

  it('skips a feature whose group is not loaded', () => {
    const state = reducer(
      withGroups(),
      fetched([{ id: 'f1', featureGroupId: 'missing', name: 'Invoicing' }])
    );
    expect(groupById(state, 'g1').features).toEqual([]);
  });

  it('tolerates a payload that is not a list', () => {
    const state = reducer(withGroups(), fetched({ data: 'unexpected' }));
    expect(state.featureGroups).toHaveLength(2);
    expect(state.loading).toBe(false);
  });
});

describe('editing a feature locally', () => {
  it('settles on an empty description when neither the edit nor the row has one', () => {
    let s = reducer(initial(), addFeatureGroup({ title: 'Billing', id: 'g1' }));
    s = reducer(s, addFeature({ groupTitle: 'Billing', feature: { name: 'Invoicing' } }));
    const { id } = s.featureGroups[0].features[0];

    const state = reducer(
      s,
      editFeature({ groupTitle: 'Billing', featureId: id, updatedFeature: { name: 'Renamed' } })
    );
    expect(state.featureGroups[0].features[0].description).toBe('');
    expect(state.featureGroups[0].features[0].name).toBe('Renamed');
  });
});

describe('what a failing request reports', () => {
  const dispatchThunk = (thunk) => {
    const store = configureStore({ reducer: { featureManagement: reducer } });
    return store.dispatch(thunk({ accessToken: 'at', refreshToken: 'rt' }));
  };

  it('passes the API layer\'s message through when fetching groups', async () => {
    featureApi.GetAllFeatureGroups.mockRejectedValue(new Error('Feature group retrieval failed'));
    const action = await dispatchThunk(asyncFetchAllFeatureGroups);
    expect(action.payload).toBe('Feature group retrieval failed');
  });

  it('loses the API layer\'s message when fetching features', async () => {
    // KNOWN DEFECT: this thunk alone reads error.response.data.message, but the
    // API layer rethrows a plain Error with no `response`, so the read throws a
    // TypeError inside the catch and rejectWithValue is never reached. The user
    // is told "Unknown error" whatever the backend actually said.
    featureApi.GetAllFeatures.mockRejectedValue(new Error('Feature retrieval failed'));
    const action = await dispatchThunk(asyncFetchAllFeatures);
    expect(action.payload).toBeUndefined();
    expect(action.error.message).toMatch(/Cannot read properties of undefined/);
  });
});
