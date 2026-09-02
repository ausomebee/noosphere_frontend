import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import formDraftsReducer, { setFormDraft } from '../ReduxStore/features/formDraftsSlice';
import useReduxFormDraft from '../hooks/useReduxFormDraft';

/**
 * The edges of the modal draft bridge, driven without react-hook-form.
 *
 * useReduxFormDraft.int.test.jsx runs the happy path through a real RHF form.
 * Here `watch` and `reset` are plain spies instead, which is the only way to
 * see what the hook does when the modal is closed, when a stored draft has
 * aged out, or when it is handed a form it cannot subscribe to -- all cases a
 * live form would paper over.
 *
 * `watch(cb)` returns a subscription in RHF; the fake below hands back the same
 * shape and keeps the callback so tests can fire it as RHF would.
 */

const TTL = 1000;

const makeStore = () => configureStore({ reducer: { formDrafts: formDraftsReducer } });

const makeWatch = () => {
  const fake = vi.fn((cb) => {
    fake.callback = cb;
    return { unsubscribe: fake.unsubscribe };
  });
  fake.unsubscribe = vi.fn();
  return fake;
};

// `isOpen` is passed as a render prop rather than a fixed option so a test can
// open and close the modal with rerender.
const setup = (store, { isOpen = true, ...opts } = {}) => {
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return renderHook((props) => useReduxFormDraft('modal', { ...opts, isOpen: props.isOpen }), {
    wrapper,
    initialProps: { isOpen },
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a modal that is closed', () => {
  it('neither restores nor subscribes while it stays closed', () => {
    const store = makeStore();
    store.dispatch(setFormDraft({ key: 'modal', values: { name: 'Acme' }, savedAt: Date.now() }));
    const reset = vi.fn();
    const watch = makeWatch();

    setup(store, { watch, reset, isOpen: false });

    act(() => vi.advanceTimersByTime(50));
    expect(reset).not.toHaveBeenCalled();
    expect(watch).not.toHaveBeenCalled();
    // The draft is left where it is -- a closed modal must not discard it.
    expect(store.getState().formDrafts.modal.values).toEqual({ name: 'Acme' });
  });

  it('restores once it opens, and again after it is closed and reopened', () => {
    const store = makeStore();
    store.dispatch(setFormDraft({ key: 'modal', values: { name: 'Acme' }, savedAt: Date.now() }));
    const reset = vi.fn();
    const { rerender } = setup(store, { watch: makeWatch(), reset, isOpen: false });

    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(50));
    expect(reset).toHaveBeenCalledWith({ name: 'Acme' });

    rerender({ isOpen: false });
    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(50));
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('restores only once while it stays open', () => {
    const store = makeStore();
    store.dispatch(setFormDraft({ key: 'modal', values: { name: 'Acme' }, savedAt: Date.now() }));
    const reset = vi.fn();
    const { rerender } = setup(store, { watch: makeWatch(), reset });

    act(() => vi.advanceTimersByTime(50));
    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(50));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe('a stored draft that has aged out', () => {
  it('is dropped instead of restored', () => {
    const store = makeStore();
    store.dispatch(
      setFormDraft({ key: 'modal', values: { name: 'Acme' }, savedAt: Date.now() - TTL * 2 })
    );
    const reset = vi.fn();

    setup(store, { watch: makeWatch(), reset, ttl: TTL });

    act(() => vi.advanceTimersByTime(50));
    expect(reset).not.toHaveBeenCalled();
    expect(store.getState().formDrafts.modal).toBeUndefined();
  });

  it('leaves an empty store alone when there is nothing saved', () => {
    const store = makeStore();
    const reset = vi.fn();

    setup(store, { watch: makeWatch(), reset });

    act(() => vi.advanceTimersByTime(50));
    expect(reset).not.toHaveBeenCalled();
    expect(store.getState().formDrafts).toEqual({});
  });
});

describe('persisting what the user types', () => {
  it('saves a genuine edit once the debounce elapses, minus excluded fields', async () => {
    const store = makeStore();
    const watch = makeWatch();
    setup(store, { watch, reset: vi.fn(), exclude: ['password'] });

    act(() => {
      watch.callback({ name: 'Acme', password: 'hunter2' }, { type: 'change', name: 'name' });
      vi.advanceTimersByTime(400);
    });

    await waitFor(() => expect(store.getState().formDrafts.modal).toBeDefined());
    expect(store.getState().formDrafts.modal.values).toEqual({ name: 'Acme' });
  });

  it('ignores a programmatic reset, which arrives with no change type', () => {
    const store = makeStore();
    const watch = makeWatch();
    setup(store, { watch, reset: vi.fn() });

    act(() => {
      watch.callback({ name: '' }, {});
      watch.callback({ name: '' }, undefined);
      vi.advanceTimersByTime(400);
    });

    expect(store.getState().formDrafts).toEqual({});
  });

  it('unsubscribes from the form when the modal closes', () => {
    const store = makeStore();
    const watch = makeWatch();
    const { rerender } = setup(store, { watch, reset: vi.fn() });

    rerender({ isOpen: false });
    expect(watch.unsubscribe).toHaveBeenCalled();
  });

  it('does nothing when it is handed no watch at all', () => {
    const store = makeStore();
    expect(() => setup(store, { reset: vi.fn() })).not.toThrow();
    expect(store.getState().formDrafts).toEqual({});
  });
});

describe('the clear function it returns', () => {
  it('drops the draft, which is what a successful submit calls', () => {
    const store = makeStore();
    store.dispatch(setFormDraft({ key: 'modal', values: { name: 'Acme' }, savedAt: Date.now() }));
    const { result } = setup(store, { watch: makeWatch(), reset: vi.fn() });

    act(() => result.current());
    expect(store.getState().formDrafts.modal).toBeUndefined();
  });
});
