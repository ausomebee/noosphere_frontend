import { describe, it, expect } from 'vitest';
import reducer, { setDraftField, resetDraft } from '../ReduxStore/features/clientDraftSlice';

const initialState = { formData: {} };

describe('clientDraftSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setDraftField merges fields', () => {
    const state = reducer(initialState, setDraftField({ firstName: 'John' }));
    expect(state.formData.firstName).toBe('John');
  });

  it('setDraftField preserves existing fields', () => {
    let state = reducer(initialState, setDraftField({ firstName: 'John' }));
    state = reducer(state, setDraftField({ lastName: 'Doe' }));
    expect(state.formData.firstName).toBe('John');
    expect(state.formData.lastName).toBe('Doe');
  });

  it('setDraftField overwrites existing field', () => {
    let state = reducer(initialState, setDraftField({ firstName: 'John' }));
    state = reducer(state, setDraftField({ firstName: 'Jane' }));
    expect(state.formData.firstName).toBe('Jane');
  });

  it('resetDraft clears all form data', () => {
    let state = reducer(initialState, setDraftField({ firstName: 'John', lastName: 'Doe' }));
    state = reducer(state, resetDraft());
    expect(state.formData).toEqual({});
  });

  it('setDraftField with multiple fields at once', () => {
    const state = reducer(initialState, setDraftField({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
    }));
    expect(state.formData).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
    });
  });
});
