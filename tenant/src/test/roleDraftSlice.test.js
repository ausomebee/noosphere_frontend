import { describe, it, expect } from 'vitest';
import reducer, {
  setBasicSettings,
  togglePermission,
  setGrantAll,
  loadDraft,
  resetDraft,
} from '../ReduxStore/features/roleDraftSlice';

describe('roleDraftSlice', () => {
  const getInitialState = () => reducer(undefined, { type: 'unknown' });

  it('returns initial state with blank permissions', () => {
    const state = getInitialState();
    expect(state.roleName).toBe('');
    expect(state.selectedModules).toEqual([]);
    expect(state.dataAccessLevel).toBe('');
    expect(state.permissions).toBeDefined();
  });

  it('setBasicSettings updates role name, modules, and access level', () => {
    const state = reducer(getInitialState(), setBasicSettings({
      roleName: 'Admin',
      selectedModules: ['DASHBOARD', 'CLIENTS'],
      dataAccessLevel: 'ALL',
    }));
    expect(state.roleName).toBe('Admin');
    expect(state.selectedModules).toEqual(['DASHBOARD', 'CLIENTS']);
    expect(state.dataAccessLevel).toBe('ALL');
  });

  it('togglePermission flips a permission on', () => {
    let state = getInitialState();
    state = reducer(state, togglePermission({
      moduleKey: 'DASHBOARD',
      subcatKey: 'dashboard',
      permKey: 'view_dashboard',
    }));
    expect(state.permissions.DASHBOARD.dashboard.view_dashboard).toBe(true);
  });

  it('togglePermission flips a permission off', () => {
    let state = getInitialState();
    state = reducer(state, togglePermission({
      moduleKey: 'DASHBOARD',
      subcatKey: 'dashboard',
      permKey: 'view_dashboard',
    }));
    state = reducer(state, togglePermission({
      moduleKey: 'DASHBOARD',
      subcatKey: 'dashboard',
      permKey: 'view_dashboard',
    }));
    expect(state.permissions.DASHBOARD.dashboard.view_dashboard).toBe(false);
  });

  it('setGrantAll sets all permissions in a subcategory', () => {
    let state = getInitialState();
    state = reducer(state, setGrantAll({
      moduleKey: 'CLIENTS',
      subcatKey: 'pipeline',
      permKeys: ['view_pipeline', 'edit_pipeline', 'delete_pipeline'],
      value: true,
    }));
    expect(state.permissions.CLIENTS.pipeline.view_pipeline).toBe(true);
    expect(state.permissions.CLIENTS.pipeline.edit_pipeline).toBe(true);
    expect(state.permissions.CLIENTS.pipeline.delete_pipeline).toBe(true);
  });

  it('setGrantAll can revoke all permissions', () => {
    let state = getInitialState();
    state = reducer(state, setGrantAll({
      moduleKey: 'CLIENTS',
      subcatKey: 'pipeline',
      permKeys: ['view_pipeline', 'edit_pipeline'],
      value: true,
    }));
    state = reducer(state, setGrantAll({
      moduleKey: 'CLIENTS',
      subcatKey: 'pipeline',
      permKeys: ['view_pipeline', 'edit_pipeline'],
      value: false,
    }));
    expect(state.permissions.CLIENTS.pipeline.view_pipeline).toBe(false);
    expect(state.permissions.CLIENTS.pipeline.edit_pipeline).toBe(false);
  });

  it('loadDraft replaces state with loaded data', () => {
    const draft = {
      roleName: 'Therapist',
      selectedModules: ['SCHEDULER'],
      dataAccessLevel: 'OWN',
    };
    const state = reducer(getInitialState(), loadDraft(draft));
    expect(state.roleName).toBe('Therapist');
    expect(state.selectedModules).toEqual(['SCHEDULER']);
  });

  it('resetDraft returns to blank state', () => {
    let state = reducer(getInitialState(), setBasicSettings({
      roleName: 'Modified',
      selectedModules: ['DASHBOARD'],
      dataAccessLevel: 'ALL',
    }));
    state = reducer(state, resetDraft());
    expect(state.roleName).toBe('');
    expect(state.selectedModules).toEqual([]);
  });
});
