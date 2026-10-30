import { describe, it, expect } from 'vitest';
import reducer, { setSubdomain, setLoading } from '../ReduxStore/features/tenantSlice';

const initialState = {
  subdomain: null,
  loading: true,
};

describe('tenantSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setSubdomain sets subdomain and stops loading', () => {
    const state = reducer(initialState, setSubdomain('mypractice'));
    expect(state.subdomain).toBe('mypractice');
    expect(state.loading).toBe(false);
  });

  it('setSubdomain can set null', () => {
    const state = reducer(initialState, setSubdomain(null));
    expect(state.subdomain).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('setLoading updates loading state', () => {
    const state = reducer(initialState, setLoading(false));
    expect(state.loading).toBe(false);
  });

  it('setLoading can set back to true', () => {
    let state = reducer(initialState, setLoading(false));
    state = reducer(state, setLoading(true));
    expect(state.loading).toBe(true);
  });
});
