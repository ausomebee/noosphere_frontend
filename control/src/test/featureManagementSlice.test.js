import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../Helper/ShowToast', () => ({ showToast: vi.fn() }));

import reducer, {
  addFeatureGroup,
  editFeatureGroup,
  deleteFeatureGroup,
  addFeature,
  editFeature,
  deleteFeature,
  moveFeature,
  toggleFeatureActive,
  assignFeaturePlan,
  toggleSelectFeature,
  toggleSelectAllFeatures,
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
 * Feature groups and the features inside them.
 *
 * Groups are addressed by title rather than id throughout the sync reducers,
 * so most of the branches here are "did we find that group, and the feature
 * inside it". Deleting a group is the one with real behaviour: its features
 * are rehomed into "Extra Features" rather than deleted with it.
 */

const initial = () => reducer(undefined, { type: '@@INIT' });

const withGroups = () => {
  let s = reducer(initial(), addFeatureGroup({ title: 'Billing', id: 'g1' }));
  s = reducer(s, addFeatureGroup({ title: 'Extra Features', id: 'g2' }));
  return s;
};

const withFeature = (over = {}) => {
  let s = withGroups();
  s = reducer(s, addFeature({ groupTitle: 'Billing', feature: { name: 'Invoicing', ...over } }));
  return s;
};

const featureIn = (state, title) =>
  state.featureGroups.find((g) => g.title === title).features[0];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('feature groups', () => {
  it('adds a group with an empty feature list', () => {
    const s = reducer(initial(), addFeatureGroup({ title: 'Billing', id: 'g1' }));
    expect(s.featureGroups).toEqual([{ title: 'Billing', features: [], id: 'g1' }]);
  });

  it('renames a group', () => {
    const s = reducer(withGroups(), editFeatureGroup({ oldTitle: 'Billing', newTitle: 'Payments' }));
    expect(s.featureGroups.map((g) => g.title)).toContain('Payments');
  });

  it('ignores a rename for a group that is not there', () => {
    const before = withGroups();
    expect(reducer(before, editFeatureGroup({ oldTitle: 'nope', newTitle: 'x' }))).toEqual(before);
  });

  it('rehomes a deleted group\'s features into Extra Features', () => {
    const s = reducer(withFeature(), deleteFeatureGroup('Billing'));
    expect(s.featureGroups.map((g) => g.title)).toEqual(['Extra Features']);
    expect(s.featureGroups[0].features).toHaveLength(1);
  });

  it('deletes a group outright when there is nowhere to rehome to', () => {
    let s = reducer(initial(), addFeatureGroup({ title: 'Billing', id: 'g1' }));
    s = reducer(s, addFeature({ groupTitle: 'Billing', feature: { name: 'Invoicing' } }));
    s = reducer(s, deleteFeatureGroup('Billing'));
    expect(s.featureGroups).toEqual([]);
  });

  it('deletes Extra Features itself without trying to rehome into it', () => {
    const s = reducer(withGroups(), deleteFeatureGroup('Extra Features'));
    expect(s.featureGroups.map((g) => g.title)).toEqual(['Billing']);
  });

  it('ignores a delete for a group that is not there', () => {
    const before = withGroups();
    expect(reducer(before, deleteFeatureGroup('nope'))).toEqual(before);
  });
});

describe('features within a group', () => {
  it('adds a feature with an id, an unselected flag and a description', () => {
    const s = withFeature();
    expect(featureIn(s, 'Billing')).toEqual(
      expect.objectContaining({ name: 'Invoicing', selected: false, description: '' })
    );
    expect(featureIn(s, 'Billing').id).toBeTruthy();
  });

  it('keeps a description that was supplied', () => {
    const s = withFeature({ description: 'Send invoices' });
    expect(featureIn(s, 'Billing').description).toBe('Send invoices');
  });

  it('ignores an add for a group that is not there', () => {
    const before = withGroups();
    expect(reducer(before, addFeature({ groupTitle: 'nope', feature: { name: 'x' } }))).toEqual(before);
  });

  it('edits a feature, keeping its old description when the update omits one', () => {
    let s = withFeature({ description: 'Original' });
    const id = featureIn(s, 'Billing').id;
    s = reducer(s, editFeature({ groupTitle: 'Billing', featureId: id, updatedFeature: { name: 'Renamed' } }));
    expect(featureIn(s, 'Billing')).toEqual(
      expect.objectContaining({ name: 'Renamed', description: 'Original' })
    );
  });

  it('takes a new description when the update supplies one', () => {
    let s = withFeature({ description: 'Original' });
    const id = featureIn(s, 'Billing').id;
    s = reducer(s, editFeature({ groupTitle: 'Billing', featureId: id, updatedFeature: { description: 'New' } }));
    expect(featureIn(s, 'Billing').description).toBe('New');
  });

  it('ignores an edit for a feature or group that is not there', () => {
    const before = withFeature();
    expect(
      reducer(before, editFeature({ groupTitle: 'Billing', featureId: 'nope', updatedFeature: {} }))
    ).toEqual(before);
    expect(
      reducer(before, editFeature({ groupTitle: 'nope', featureId: 'x', updatedFeature: {} }))
    ).toEqual(before);
  });

  it('deletes a feature, and ignores a delete for an unknown group', () => {
    let s = withFeature();
    const id = featureIn(s, 'Billing').id;
    const after = reducer(s, deleteFeature({ groupTitle: 'Billing', featureId: id }));
    expect(after.featureGroups.find((g) => g.title === 'Billing').features).toEqual([]);

    expect(reducer(s, deleteFeature({ groupTitle: 'nope', featureId: id }))).toEqual(s);
  });

  it('moves a feature between groups', () => {
    let s = withFeature();
    const id = featureIn(s, 'Billing').id;
    s = reducer(s, moveFeature({ featureId: id, fromGroupTitle: 'Billing', toGroupTitle: 'Extra Features' }));
    expect(s.featureGroups.find((g) => g.title === 'Billing').features).toEqual([]);
    expect(s.featureGroups.find((g) => g.title === 'Extra Features').features).toHaveLength(1);
  });

  it('ignores a move when either group or the feature is missing', () => {
    const before = withFeature();
    const id = featureIn(before, 'Billing').id;
    expect(reducer(before, moveFeature({ featureId: id, fromGroupTitle: 'nope', toGroupTitle: 'Extra Features' }))).toEqual(before);
    expect(reducer(before, moveFeature({ featureId: id, fromGroupTitle: 'Billing', toGroupTitle: 'nope' }))).toEqual(before);
    expect(reducer(before, moveFeature({ featureId: 'nope', fromGroupTitle: 'Billing', toGroupTitle: 'Extra Features' }))).toEqual(before);
  });

  it('toggles a feature active flag, and ignores an unknown feature or group', () => {
    let s = withFeature();
    const id = featureIn(s, 'Billing').id;
    s = reducer(s, toggleFeatureActive({ groupTitle: 'Billing', featureId: id, active: true }));
    expect(featureIn(s, 'Billing').active).toBe(true);

    expect(reducer(s, toggleFeatureActive({ groupTitle: 'Billing', featureId: 'nope', active: false }))).toEqual(s);
    expect(reducer(s, toggleFeatureActive({ groupTitle: 'nope', featureId: id, active: false }))).toEqual(s);
  });

  it('assigns plans to a feature, and ignores an unknown feature or group', () => {
    let s = withFeature();
    const id = featureIn(s, 'Billing').id;
    s = reducer(s, assignFeaturePlan({ groupTitle: 'Billing', featureId: id, plans: ['Pro'] }));
    expect(featureIn(s, 'Billing').plan).toEqual(['Pro']);

    expect(reducer(s, assignFeaturePlan({ groupTitle: 'Billing', featureId: 'nope', plans: [] }))).toEqual(s);
    expect(reducer(s, assignFeaturePlan({ groupTitle: 'nope', featureId: id, plans: [] }))).toEqual(s);
  });

  it('toggles one feature\'s selection, and ignores an unknown feature or group', () => {
    let s = withFeature();
    const id = featureIn(s, 'Billing').id;
    s = reducer(s, toggleSelectFeature({ groupTitle: 'Billing', featureId: id }));
    expect(featureIn(s, 'Billing').selected).toBe(true);

    expect(reducer(s, toggleSelectFeature({ groupTitle: 'Billing', featureId: 'nope' }))).toEqual(s);
    expect(reducer(s, toggleSelectFeature({ groupTitle: 'nope', featureId: id }))).toEqual(s);
  });

  it('selects and clears every feature in a group', () => {
    let s = withFeature();
    s = reducer(s, addFeature({ groupTitle: 'Billing', feature: { name: 'Second' } }));
    s = reducer(s, toggleSelectAllFeatures({ groupTitle: 'Billing', select: true }));
    expect(s.featureGroups[0].features.every((f) => f.selected)).toBe(true);

    s = reducer(s, toggleSelectAllFeatures({ groupTitle: 'Billing', select: false }));
    expect(s.featureGroups[0].features.every((f) => !f.selected)).toBe(true);
  });

  it('ignores a select-all for a group that is not there', () => {
    const before = withFeature();
    expect(reducer(before, toggleSelectAllFeatures({ groupTitle: 'nope', select: true }))).toEqual(before);
  });
});

describe('async lifecycle', () => {
  const thunks = [
    asyncCreateFeatureGroup, asyncUpdateFeatureGroup, asyncDeleteFeatureGroup,
    asyncCreateFeature, asyncUpdateFeature, asyncDeleteFeature,
    asyncMoveFeatureToAnotherGroup, asyncEnableOrDisableFeature,
    asyncAssignFeatureToPlan, asyncFetchAllFeatureGroups, asyncFetchAllFeatures,
  ];

  it.each(thunks.map((t) => [t.typePrefix, t]))('%s marks the slice loading', (_n, thunk) => {
    const s = reducer(initial(), { type: thunk.pending.type });
    expect(s.loading).toBe(true);
    expect(s.error).toBeNull();
  });

  it.each(thunks.map((t) => [t.typePrefix, t]))('%s records the rejection', (_n, thunk) => {
    const s = reducer(initial(), { type: thunk.rejected.type, payload: 'went wrong' });
    expect(s.loading).toBe(false);
    expect(s.error).toBe('went wrong');
  });

  it('adds a created group, and ignores a nameless one', () => {
    let s = reducer(initial(), {
      type: asyncCreateFeatureGroup.fulfilled.type,
      payload: { id: 'g1', name: 'Billing' },
    });
    expect(s.featureGroups).toHaveLength(1);

    s = reducer(s, { type: asyncCreateFeatureGroup.fulfilled.type, payload: {} });
    expect(s.featureGroups).toHaveLength(1);
  });

  it('renames a group on a fulfilled update', () => {
    let s = reducer(initial(), {
      type: asyncCreateFeatureGroup.fulfilled.type,
      payload: { id: 'g1', name: 'Billing' },
    });
    s = reducer(s, {
      type: asyncUpdateFeatureGroup.fulfilled.type,
      payload: { id: 'g1', name: 'Payments' },
    });
    expect(s.featureGroups[0].title).toBe('Payments');
  });

  it('builds groups and their features from a fetched list', () => {
    const s = reducer(initial(), {
      type: asyncFetchAllFeatureGroups.fulfilled.type,
      payload: [
        {
          id: 'g1',
          name: 'Billing',
          features: [
            {
              id: 'f1',
              name: 'Invoicing',
              createdAt: '2026-01-05T00:00:00Z',
              active: true,
              plans: [{ name: 'Pro' }],
            },
          ],
        },
      ],
    });
    expect(s.featureGroups[0].title).toBe('Billing');
    expect(s.featureGroups[0].features[0]).toEqual(
      expect.objectContaining({
        id: 'f1',
        name: 'Invoicing',
        description: '',
        managedBy: 'Admin',
        active: true,
        plans: ['Pro'],
        selected: false,
      })
    );
  });

  it('reads features from the capitalised key some responses use', () => {
    const s = reducer(initial(), {
      type: asyncFetchAllFeatureGroups.fulfilled.type,
      payload: [{ id: 'g1', name: 'Billing', Feature: [{ id: 'f1', name: 'Invoicing' }] }],
    });
    expect(s.featureGroups[0].features).toHaveLength(1);
  });

  it('defaults a feature with no plans to an empty list', () => {
    const s = reducer(initial(), {
      type: asyncFetchAllFeatureGroups.fulfilled.type,
      payload: [{ id: 'g1', name: 'Billing', features: [{ id: 'f1', name: 'Invoicing', plans: 'nope' }] }],
    });
    expect(s.featureGroups[0].features[0].plans).toEqual([]);
  });

  it('skips a fetched group with no name, and a payload that is not a list', () => {
    let s = reducer(initial(), {
      type: asyncFetchAllFeatureGroups.fulfilled.type,
      payload: [{ id: 'g1' }],
    });
    expect(s.featureGroups).toEqual([]);

    s = reducer(initial(), { type: asyncFetchAllFeatureGroups.fulfilled.type, payload: 'nope' });
    expect(s.featureGroups).toEqual([]);
  });

  it('leaves a group that already has features alone on a refetch', () => {
    let s = reducer(initial(), {
      type: asyncFetchAllFeatureGroups.fulfilled.type,
      payload: [{ id: 'g1', name: 'Billing', features: [{ id: 'f1', name: 'First' }] }],
    });
    s = reducer(s, {
      type: asyncFetchAllFeatureGroups.fulfilled.type,
      payload: [{ id: 'g1', name: 'Billing', features: [{ id: 'f2', name: 'Second' }] }],
    });
    expect(s.featureGroups[0].features.map((f) => f.name)).toEqual(['First']);
  });
});
