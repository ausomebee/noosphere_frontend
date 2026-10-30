import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import formDrafts from "../ReduxStore/features/formDraftsSlice";
import useReduxFormDraft from "../hooks/useReduxFormDraft";

/**
 * The react-hook-form flavour of draft persistence.
 *
 * Instead of watching a values object it subscribes to RHF's `watch`, which
 * calls back with the form values and an `info` describing what caused the
 * change. That distinction is the whole point of the subscribe branch: a
 * programmatic `reset()` -- which the modal runs on open and on Cancel --
 * fires with no `info.type`, and persisting it would overwrite the user's saved
 * draft with the empty defaults at the exact moment they were trying to keep
 * it. Only changes carrying a type are genuine edits.
 *
 * `watch` is faked here rather than driven through a real RHF form, so the
 * tests can emit both kinds of change on demand. Timers are faked because both
 * the hydrate (deferred a tick, to win against the modal's own reset) and the
 * save (debounced 300ms) are timer-driven.
 */

const KEY = "add-prospect";
const HOUR = 60 * 60 * 1000;

let store;

const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

const makeStore = (preloadedState) =>
  configureStore({ reducer: { formDrafts }, preloadedState });

const draftIn = () => store.getState().formDrafts[KEY];

// Stands in for RHF's watch(cb): records the subscriber so a test can push a
// change through it, and reports whether the hook unsubscribed on cleanup.
const makeWatch = (opts = {}) => {
  const unsubscribe = vi.fn();
  const subs = [];
  const bare = "subscription" in opts; // an RHF-like watch that returns nothing
  const watch = vi.fn((cb) => {
    subs.push(cb);
    return bare ? opts.subscription : { unsubscribe };
  });
  // `...rest` rather than a default, so a test can pass `undefined` for info
  // and still have it reach the subscriber as undefined.
  watch.change = (values, ...rest) => {
    const info = rest.length ? rest[0] : { type: "change" };
    return act(() => subs.forEach((cb) => cb(values, info)));
  };
  watch.unsubscribe = unsubscribe;
  return watch;
};

beforeEach(() => {
  vi.useFakeTimers();
  store = makeStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("hydrating on open", () => {
  it("resets the form to a fresh saved draft", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { firstName: "Ada" }, savedAt: Date.now() } },
    });
    const reset = vi.fn();
    renderHook(() => useReduxFormDraft(KEY, { watch: makeWatch(), reset }), { wrapper });

    expect(reset).not.toHaveBeenCalled(); // deferred, so the modal's own reset loses
    act(() => vi.advanceTimersByTime(0));
    expect(reset).toHaveBeenCalledWith({ firstName: "Ada" });
  });

  it("hands react-hook-form a copy it is free to mutate", () => {
    store = makeStore({
      formDrafts: {
        [KEY]: { values: { location: { state: "CA" } }, savedAt: Date.now() },
      },
    });
    let applied;
    renderHook(
      () => useReduxFormDraft(KEY, { watch: makeWatch(), reset: (v) => (applied = v) }),
      { wrapper },
    );
    act(() => vi.advanceTimersByTime(0));

    expect(() => {
      applied.location.state = "NY";
    }).not.toThrow();
    expect(draftIn().values.location.state).toBe("CA");
  });

  it("migrates a draft through transform before applying it", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { phone: "08012345678" }, savedAt: Date.now() } },
    });
    const reset = vi.fn();
    // An encoding that changed after the draft was written.
    const transform = vi.fn((v) => ({ ...v, phone: `+234${v.phone.slice(1)}` }));
    renderHook(
      () => useReduxFormDraft(KEY, { watch: makeWatch(), reset, transform }),
      { wrapper },
    );
    act(() => vi.advanceTimersByTime(0));

    expect(transform).toHaveBeenCalledWith({ phone: "08012345678" });
    expect(reset).toHaveBeenCalledWith({ phone: "+2348012345678" });
  });

  it("applies the draft unchanged when no migration is needed", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { phone: "1" }, savedAt: Date.now() } },
    });
    const reset = vi.fn();
    renderHook(() => useReduxFormDraft(KEY, { watch: makeWatch(), reset }), { wrapper });
    act(() => vi.advanceTimersByTime(0));
    expect(reset).toHaveBeenCalledWith({ phone: "1" });
  });

  it("drops a draft that has passed its lifetime", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { firstName: "Ada" }, savedAt: Date.now() - 8 * HOUR } },
    });
    const reset = vi.fn();
    renderHook(
      () => useReduxFormDraft(KEY, { watch: makeWatch(), reset, ttl: HOUR }),
      { wrapper },
    );
    expect(reset).not.toHaveBeenCalled();
    expect(draftIn()).toBeUndefined();
  });

  it("drops a draft with no timestamp to judge it by", () => {
    store = makeStore({ formDrafts: { [KEY]: { values: { firstName: "Ada" } } } });
    const reset = vi.fn();
    renderHook(() => useReduxFormDraft(KEY, { watch: makeWatch(), reset }), { wrapper });
    expect(reset).not.toHaveBeenCalled();
    expect(draftIn()).toBeUndefined();
  });

  it("leaves the form alone when nothing was saved", () => {
    const reset = vi.fn();
    renderHook(() => useReduxFormDraft(KEY, { watch: makeWatch(), reset }), { wrapper });
    act(() => vi.advanceTimersByTime(0));
    expect(reset).not.toHaveBeenCalled();
  });

  it("hydrates once per opening and again on the next open", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { firstName: "Ada" }, savedAt: Date.now() } },
    });
    const reset = vi.fn();
    const watch = makeWatch();
    const { rerender } = renderHook(
      ({ isOpen }) => useReduxFormDraft(KEY, { watch, reset, isOpen }),
      { wrapper, initialProps: { isOpen: true } },
    );
    act(() => vi.advanceTimersByTime(0));
    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(0));
    expect(reset).toHaveBeenCalledTimes(1);

    rerender({ isOpen: false });
    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(0));
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("does not hydrate a modal that is still closed", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { firstName: "Ada" }, savedAt: Date.now() } },
    });
    const reset = vi.fn();
    renderHook(
      () => useReduxFormDraft(KEY, { watch: makeWatch(), reset, isOpen: false }),
      { wrapper },
    );
    act(() => vi.advanceTimersByTime(0));
    expect(reset).not.toHaveBeenCalled();
    expect(draftIn()).toBeDefined(); // and it is not expired away either
  });
});

describe("persisting edits", () => {
  it("saves a genuine edit after it settles", () => {
    const watch = makeWatch();
    renderHook(() => useReduxFormDraft(KEY, { watch, reset: vi.fn() }), { wrapper });

    watch.change({ firstName: "Ada" });
    expect(draftIn()).toBeUndefined();
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn().values).toEqual({ firstName: "Ada" });
  });

  it("ignores a programmatic reset, so Cancel cannot wipe the draft", () => {
    store = makeStore({
      formDrafts: { [KEY]: { values: { firstName: "Ada" }, savedAt: Date.now() } },
    });
    const watch = makeWatch();
    renderHook(() => useReduxFormDraft(KEY, { watch, reset: vi.fn() }), { wrapper });

    // RHF reports a reset with an info object carrying no type.
    watch.change({ firstName: "" }, { name: undefined, type: undefined });
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn().values).toEqual({ firstName: "Ada" });
  });

  it("ignores a change reported with no info at all", () => {
    const watch = makeWatch();
    renderHook(() => useReduxFormDraft(KEY, { watch, reset: vi.fn() }), { wrapper });
    watch.change({ firstName: "Ada" }, undefined);
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn()).toBeUndefined();
  });

  it("keeps only the last edit of a burst", () => {
    const watch = makeWatch();
    renderHook(() => useReduxFormDraft(KEY, { watch, reset: vi.fn() }), { wrapper });

    watch.change({ firstName: "Ad" });
    act(() => vi.advanceTimersByTime(200));
    watch.change({ firstName: "Ada" });
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn().values).toEqual({ firstName: "Ada" });
  });

  it("never persists an excluded field", () => {
    const watch = makeWatch();
    renderHook(
      () =>
        useReduxFormDraft(KEY, {
          watch,
          reset: vi.fn(),
          exclude: ["password", "attachment"],
        }),
      { wrapper },
    );
    watch.change({ email: "ada@example.com", password: "hunter2", attachment: "f" });
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn().values).toEqual({ email: "ada@example.com" });
  });

  it("stores a copy, so freezing it cannot break the live form", () => {
    const watch = makeWatch();
    renderHook(() => useReduxFormDraft(KEY, { watch, reset: vi.fn() }), { wrapper });
    const live = { location: { state: "CA" } };
    watch.change(live);
    act(() => vi.advanceTimersByTime(300));

    expect(() => {
      live.location.state = "NY";
    }).not.toThrow();
    expect(draftIn().values.location.state).toBe("CA");
  });

  it("does not subscribe while the modal is closed", () => {
    const watch = makeWatch();
    renderHook(
      () => useReduxFormDraft(KEY, { watch, reset: vi.fn(), isOpen: false }),
      { wrapper },
    );
    expect(watch).not.toHaveBeenCalled();
  });

  it("does not subscribe when the caller passed no watch", () => {
    const { result } = renderHook(() => useReduxFormDraft(KEY, { reset: vi.fn() }), {
      wrapper,
    });
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn()).toBeUndefined();
    expect(typeof result.current).toBe("function");
  });

  it("unsubscribes and drops a pending save when the modal closes", () => {
    const watch = makeWatch();
    const { rerender } = renderHook(
      ({ isOpen }) => useReduxFormDraft(KEY, { watch, reset: vi.fn(), isOpen }),
      { wrapper, initialProps: { isOpen: true } },
    );
    watch.change({ firstName: "Ada" });
    rerender({ isOpen: false });

    expect(watch.unsubscribe).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn()).toBeUndefined();
  });

  it("tolerates a watch that returns no subscription to unsubscribe from", () => {
    const watch = makeWatch({ subscription: undefined });
    const { unmount } = renderHook(
      () => useReduxFormDraft(KEY, { watch, reset: vi.fn() }),
      { wrapper },
    );
    expect(watch).toHaveBeenCalled();
    expect(() => unmount()).not.toThrow();
  });
});

describe("clearing after a successful submit", () => {
  it("removes the draft when the returned function is called", () => {
    const watch = makeWatch();
    const { result } = renderHook(
      () => useReduxFormDraft(KEY, { watch, reset: vi.fn() }),
      { wrapper },
    );
    watch.change({ firstName: "Ada" });
    act(() => vi.advanceTimersByTime(300));
    expect(draftIn()).toBeDefined();

    act(() => result.current());
    expect(draftIn()).toBeUndefined();
  });

  it("hands back a clear function even when called with no options", () => {
    const { result } = renderHook(() => useReduxFormDraft(KEY), { wrapper });
    act(() => result.current());
    expect(draftIn()).toBeUndefined();
  });
});
