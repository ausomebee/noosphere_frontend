import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import formDrafts from "../ReduxStore/features/formDraftsSlice";
import useReduxStateDraft from "../hooks/useReduxStateDraft";

/**
 * Draft persistence for modals that hold their form in plain useState.
 *
 * Two effects with opposite jobs: one hydrates a saved draft when the modal
 * opens, the other mirrors the live values back into redux 300ms after they
 * settle. Both are timer-driven -- the restore is deferred a tick so it lands
 * after whatever the modal itself does on open -- so these tests run on fake
 * timers and advance them deliberately.
 *
 * The hook deep-clones in both directions. That is not tidiness: redux state is
 * frozen by Immer, and a modal that mutates a restored object (or a store that
 * freezes an object the modal still holds in useState) throws "Cannot assign to
 * read only property" at runtime. Several tests below mutate on purpose to keep
 * that guarantee honest.
 */

const KEY = "add-authorization";
const HOUR = 60 * 60 * 1000;

let store;

const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

const makeStore = (preloadedState) =>
  configureStore({ reducer: { formDrafts }, preloadedState });

const draftIn = (state) => state.getState().formDrafts[KEY];

beforeEach(() => {
  vi.useFakeTimers();
  store = makeStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("restoring a saved draft", () => {
  it("hands a fresh draft to restore when the modal opens", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { units: "12" }, savedAt: Date.now() } },
    });
    const restore = vi.fn();
    renderHook(() => useReduxStateDraft(KEY, { values: {}, restore }), { wrapper });

    expect(restore).not.toHaveBeenCalled(); // deferred a tick on purpose
    act(() => vi.advanceTimersByTime(0));
    expect(restore).toHaveBeenCalledWith({ units: "12" });
  });

  it("hands over a copy the modal is free to mutate", () => {
    store = makeStore({
      formDrafts: {
        [KEY]: { values: { payer: { id: "p1" } }, savedAt: Date.now() },
      },
    });
    let restored;
    renderHook(
      () => useReduxStateDraft(KEY, { values: {}, restore: (v) => (restored = v) }),
      { wrapper },
    );
    act(() => vi.advanceTimersByTime(0));

    expect(() => {
      restored.payer.id = "p2";
    }).not.toThrow();
    // The store's own copy is untouched by that mutation.
    expect(draftIn(store).values.payer.id).toBe("p1");
  });

  it("throws away a draft that has passed its lifetime", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { units: "12" }, savedAt: Date.now() - 8 * HOUR } },
    });
    const restore = vi.fn();
    renderHook(() => useReduxStateDraft(KEY, { values: {}, restore, ttl: HOUR }), {
      wrapper,
    });

    expect(restore).not.toHaveBeenCalled();
    expect(draftIn(store)).toBeUndefined();
  });

  it("keeps a draft that is still inside a custom lifetime", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { units: "12" }, savedAt: Date.now() - 30 * 1000 } },
    });
    const restore = vi.fn();
    renderHook(() => useReduxStateDraft(KEY, { values: {}, restore, ttl: HOUR }), {
      wrapper,
    });
    act(() => vi.advanceTimersByTime(0));
    expect(restore).toHaveBeenCalled();
  });

  it("throws away a malformed draft rather than restoring it", () => {
    // A draft written by an older version of the hook, with no timestamp.
    store = makeStore({ formDrafts: { [KEY]: { values: { units: "12" } } } });
    const restore = vi.fn();
    renderHook(() => useReduxStateDraft(KEY, { values: {}, restore }), { wrapper });

    expect(restore).not.toHaveBeenCalled();
    expect(draftIn(store)).toBeUndefined();
  });

  it("does nothing when there is no draft to restore", () => {
    const restore = vi.fn();
    renderHook(() => useReduxStateDraft(KEY, { values: {}, restore }), { wrapper });
    act(() => vi.advanceTimersByTime(0));
    expect(restore).not.toHaveBeenCalled();
  });

  it("survives a caller that saved drafts but never passed a restore handler", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { units: "12" }, savedAt: Date.now() } },
    });
    renderHook(() => useReduxStateDraft(KEY, { values: {} }), { wrapper });
    expect(() => act(() => vi.advanceTimersByTime(0))).not.toThrow();
  });

  it("restores once per opening, not on every render", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { units: "12" }, savedAt: Date.now() } },
    });
    const restore = vi.fn();
    const { rerender } = renderHook(
      ({ values }) => useReduxStateDraft(KEY, { values, restore }),
      { wrapper, initialProps: { values: { units: "1" } } },
    );
    act(() => vi.advanceTimersByTime(0));
    rerender({ values: { units: "2" } });
    act(() => vi.advanceTimersByTime(0));
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("restores again the next time the modal is opened", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { units: "12" }, savedAt: Date.now() } },
    });
    const restore = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen }) => useReduxStateDraft(KEY, { values: {}, restore, isOpen }),
      { wrapper, initialProps: { isOpen: true } },
    );
    act(() => vi.advanceTimersByTime(0));

    rerender({ isOpen: false });
    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(0));
    expect(restore).toHaveBeenCalledTimes(2);
  });

  it("cancels a pending restore if the modal closes first", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { units: "12" }, savedAt: Date.now() } },
    });
    const restore = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen }) => useReduxStateDraft(KEY, { values: {}, restore, isOpen }),
      { wrapper, initialProps: { isOpen: true } },
    );
    rerender({ isOpen: false });
    act(() => vi.advanceTimersByTime(0));
    expect(restore).not.toHaveBeenCalled();
  });
});

describe("saving as the user types", () => {
  it("writes the values once they settle", () => {
    const { rerender } = renderHook(
      ({ values }) => useReduxStateDraft(KEY, { values }),
      { wrapper, initialProps: { values: { units: "1" } } },
    );
    rerender({ values: { units: "12" } });

    expect(draftIn(store)).toBeUndefined(); // still inside the debounce
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn(store).values).toEqual({ units: "12" });
    expect(typeof draftIn(store).savedAt).toBe("number");
  });

  it("only writes the last of a burst of keystrokes", () => {
    const { rerender } = renderHook(
      ({ values }) => useReduxStateDraft(KEY, { values }),
      { wrapper, initialProps: { values: { units: "1" } } },
    );
    rerender({ values: { units: "12" } });
    act(() => vi.advanceTimersByTime(200));
    rerender({ values: { units: "123" } });
    act(() => vi.advanceTimersByTime(300));

    expect(draftIn(store).values).toEqual({ units: "123" });
  });

  it("stores a copy, so redux freezing it cannot break the modal's own state", () => {
    const values = { payer: { id: "p1" } };
    renderHook(() => useReduxStateDraft(KEY, { values }), { wrapper });
    act(() => vi.advanceTimersByTime(300));

    expect(() => {
      values.payer.id = "p2";
    }).not.toThrow();
    expect(draftIn(store).values.payer.id).toBe("p1");
  });

  it("saves nothing while the modal is closed", () => {
    renderHook(() => useReduxStateDraft(KEY, { values: { units: "1" }, isOpen: false }), {
      wrapper,
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(draftIn(store)).toBeUndefined();
  });
});

describe("clearing after a successful submit", () => {
  it("removes the draft when the returned function is called", () => {
    const { result } = renderHook(
      () => useReduxStateDraft(KEY, { values: { units: "12" } }),
      { wrapper },
    );
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn(store)).toBeDefined();

    act(() => result.current());
    expect(draftIn(store)).toBeUndefined();
  });

  it("hands back a clear function even when called with no options at all", () => {
    const { result } = renderHook(() => useReduxStateDraft(KEY), { wrapper });
    expect(typeof result.current).toBe("function");
    act(() => result.current());
    expect(draftIn(store)).toBeUndefined();
  });
});
