import { describe, it, expect } from 'vitest';
import reducer, {
  setFormName,
  addElement,
  updateElement,
  deleteElement,
  toggleRequired,
  addOption,
  removeOption,
  updateOption,
  loadForm,
  resetForm,
  reorderElements,
} from '../ReduxStore/features/formBuilderSlice';

const initialState = {
  formName: 'Untitled Form',
  elements: [],
  status: 'draft',
};

describe('formBuilderSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setFormName updates form name', () => {
    const state = reducer(initialState, setFormName('My Form'));
    expect(state.formName).toBe('My Form');
  });

  it('addElement adds a new element', () => {
    const state = reducer(initialState, addElement({ type: 'shortText', label: 'Name' }));
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0].type).toBe('shortText');
    expect(state.elements[0].label).toBe('Name');
  });

  it('addElement generates string id', () => {
    const state = reducer(initialState, addElement({ type: 'paragraph' }));
    expect(typeof state.elements[0].id).toBe('string');
  });

  it('updateElement modifies an existing element', () => {
    let state = reducer(initialState, addElement({ id: '1', type: 'shortText', label: 'Old' }));
    state = reducer(state, updateElement({ id: '1', updates: { label: 'New' } }));
    expect(state.elements[0].label).toBe('New');
  });

  it('deleteElement removes element by id', () => {
    let state = reducer(initialState, addElement({ id: '1', type: 'shortText' }));
    state = reducer(state, addElement({ id: '2', type: 'paragraph' }));
    expect(state.elements).toHaveLength(2);
    state = reducer(state, deleteElement('1'));
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0].id).toBe('2');
  });

  it('toggleRequired flips required flag', () => {
    let state = reducer(initialState, addElement({ id: '1', type: 'shortText', required: false }));
    expect(state.elements[0].required).toBe(false);
    state = reducer(state, toggleRequired('1'));
    expect(state.elements[0].required).toBe(true);
    state = reducer(state, toggleRequired('1'));
    expect(state.elements[0].required).toBe(false);
  });

  it('addOption adds option to element', () => {
    let state = reducer(initialState, addElement({ id: '1', type: 'shortText', options: [] }));
    state = reducer(state, addOption({ id: '1', option: 'Option A' }));
    expect(state.elements[0].options).toEqual(['Option A']);
  });

  it('removeOption removes option by index', () => {
    let state = reducer(initialState, addElement({ id: '1', type: 'shortText', options: ['A', 'B', 'C'] }));
    state = reducer(state, removeOption({ id: '1', index: 1 }));
    expect(state.elements[0].options).toEqual(['A', 'C']);
  });

  it('updateOption modifies option at index', () => {
    let state = reducer(initialState, addElement({ id: '1', type: 'shortText', options: ['A', 'B'] }));
    state = reducer(state, updateOption({ id: '1', index: 0, value: 'Z' }));
    expect(state.elements[0].options).toEqual(['Z', 'B']);
  });

  it('loadForm replaces entire state', () => {
    const formData = {
      formName: 'Loaded Form',
      elements: [{ id: 'e1', type: 'shortText', label: 'Q1' }],
      status: 'published',
    };
    const state = reducer(initialState, loadForm(formData));
    expect(state.formName).toBe('Loaded Form');
    expect(state.elements).toHaveLength(1);
    expect(state.status).toBe('published');
  });

  it('loadForm normalizes element ids to strings', () => {
    const formData = {
      formName: 'Test',
      elements: [{ id: 123, type: 'shortText' }],
    };
    const state = reducer(initialState, loadForm(formData));
    expect(state.elements[0].id).toBe('123');
  });

  it('resetForm returns to initial state', () => {
    let state = reducer(initialState, setFormName('Custom'));
    state = reducer(state, addElement({ type: 'shortText' }));
    state = reducer(state, resetForm());
    expect(state).toEqual(initialState);
  });

  it('reorderElements replaces elements array', () => {
    let state = reducer(initialState, addElement({ id: '1', type: 'shortText' }));
    state = reducer(state, addElement({ id: '2', type: 'paragraph' }));
    const reversed = [...state.elements].reverse();
    state = reducer(state, reorderElements(reversed));
    expect(state.elements[0].id).toBe('2');
    expect(state.elements[1].id).toBe('1');
  });
});
