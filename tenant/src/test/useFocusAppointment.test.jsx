import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const navigate = vi.fn();
let location = { pathname: "/appointments", search: "", state: null };

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useLocation: () => location,
}));

import useFocusAppointment from "../hooks/useFocusAppointment";

/**
 * Opening one appointment's modal after the user clicks a notification.
 *
 * The notification navigation leaves the appointment id in `location.state`,
 * and the hook has two ways to turn that into a row: fetch it by id, or find it
 * in the tab's already-loaded list. It prefers the fetch, because the list can
 * be missing, thin, or on another tab entirely. Matching is done on the *base*
 * id: recurring appointments are expanded into rows keyed `masterId_timestamp`
 * while the notification only ever carries the master id.
 *
 * Whichever route opens the modal, the hook then replaces the history entry
 * with a stateless one, so remounting the tab cannot re-open the modal from the
 * state still sitting in history -- and the one-shot guard is only re-armed by
 * a genuinely new navigation.
 */

const setState = (state) => {
  location = { ...location, state };
};

beforeEach(() => {
  navigate.mockReset();
  location = { pathname: "/appointments", search: "?tab=upcoming", state: null };
});

describe("with nothing to focus", () => {
  it("does nothing on an ordinary navigation", () => {
    const openFn = vi.fn();
    renderHook(() => useFocusAppointment([{ id: "a1" }], openFn));
    expect(openFn).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does nothing when the caller has no open handler yet", () => {
    setState({ focusId: "a1" });
    renderHook(() => useFocusAppointment([{ id: "a1" }], undefined));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("waits when the list has not loaded", () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const { rerender } = renderHook(({ list }) => useFocusAppointment(list, openFn), {
      initialProps: { list: [] },
    });
    expect(openFn).not.toHaveBeenCalled();

    // The rows arrive on a later render and the hook picks them up then.
    rerender({ list: [{ id: "a1" }] });
    expect(openFn).toHaveBeenCalledWith({ id: "a1" });
  });

  it("does nothing when the list is not an array", () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    renderHook(() => useFocusAppointment(null, openFn));
    expect(openFn).not.toHaveBeenCalled();
  });

  it("does nothing when no row matches", () => {
    setState({ focusId: "a9" });
    const openFn = vi.fn();
    renderHook(() => useFocusAppointment([{ id: "a1" }, { id: "a2" }], openFn));
    expect(openFn).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("finding the row in the loaded list", () => {
  it("opens the row whose id matches", () => {
    setState({ focusId: "a2" });
    const openFn = vi.fn();
    renderHook(() => useFocusAppointment([{ id: "a1" }, { id: "a2" }], openFn));
    expect(openFn).toHaveBeenCalledWith({ id: "a2" });
  });

  it("matches an expanded recurring row against the master id", () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const row = { id: "a1_1767225600000" };
    renderHook(() => useFocusAppointment([row], openFn));
    expect(openFn).toHaveBeenCalledWith(row);
  });

  it("matches when the notification itself carries an expanded id", () => {
    setState({ focusId: "a1_1767225600000" });
    const openFn = vi.fn();
    const row = { id: "a1" };
    renderHook(() => useFocusAppointment([row], openFn));
    expect(openFn).toHaveBeenCalledWith(row);
  });

  it.each([
    ["appointmentId", { appointmentId: "a1" }],
    ["rawData.id", { rawData: { id: "a1" } }],
    ["rawData.appointmentId", { rawData: { appointmentId: "a1" } }],
  ])("matches a row that only carries %s", (_label, row) => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    renderHook(() => useFocusAppointment([row], openFn));
    expect(openFn).toHaveBeenCalledWith(row);
  });

  it("matches a numeric id, which has no underscore to split on", () => {
    setState({ focusId: 7 });
    const openFn = vi.fn();
    renderHook(() => useFocusAppointment([{ id: 7 }], openFn));
    expect(openFn).toHaveBeenCalledWith({ id: 7 });
  });

  it("skips rows with no usable id rather than matching them to nothing", () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const row = { id: "a1" };
    renderHook(() => useFocusAppointment([{ rawData: {} }, row], openFn));
    expect(openFn).toHaveBeenCalledTimes(1);
    expect(openFn).toHaveBeenCalledWith(row);
  });

  it("clears the navigation state once it has opened the modal", () => {
    setState({ focusId: "a1" });
    renderHook(() => useFocusAppointment([{ id: "a1" }], vi.fn()));
    expect(navigate).toHaveBeenCalledWith("/appointments?tab=upcoming", {
      replace: true,
      state: null,
    });
  });

  it("opens the modal only once as the list keeps re-rendering", () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const { rerender } = renderHook(({ list }) => useFocusAppointment(list, openFn), {
      initialProps: { list: [{ id: "a1" }] },
    });
    rerender({ list: [{ id: "a1" }, { id: "a2" }] });
    rerender({ list: [{ id: "a1" }, { id: "a2" }, { id: "a3" }] });
    expect(openFn).toHaveBeenCalledTimes(1);
  });

  it("re-arms when a fresh notification navigates in", () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const list = [{ id: "a1" }, { id: "a2" }];
    const { rerender } = renderHook(() => useFocusAppointment(list, openFn));
    expect(openFn).toHaveBeenCalledTimes(1);

    setState({ focusId: "a2" });
    rerender();
    expect(openFn).toHaveBeenCalledTimes(2);
    expect(openFn).toHaveBeenLastCalledWith({ id: "a2" });
  });
});

describe("fetching the appointment by id", () => {
  it("prefers the fetch over a row already in the list", async () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const fresh = { id: "a1", startTime: "09:00" };
    const fetchById = vi.fn().mockResolvedValue(fresh);
    renderHook(() => useFocusAppointment([{ id: "a1" }], openFn, fetchById));

    expect(fetchById).toHaveBeenCalledWith("a1");
    await waitFor(() => expect(openFn).toHaveBeenCalledWith(fresh));
  });

  it("asks for the master id, not the expanded occurrence id", async () => {
    setState({ focusId: "a1_1767225600000" });
    const fetchById = vi.fn().mockResolvedValue({ id: "a1" });
    renderHook(() => useFocusAppointment([], vi.fn(), fetchById));
    expect(fetchById).toHaveBeenCalledWith("a1");
  });

  it("accepts a synchronous fetch", async () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    renderHook(() => useFocusAppointment([], openFn, () => ({ id: "a1" })));
    await waitFor(() => expect(openFn).toHaveBeenCalledWith({ id: "a1" }));
  });

  it("opens nothing when the appointment no longer exists", async () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const fetchById = vi.fn().mockResolvedValue(null);
    renderHook(() => useFocusAppointment([{ id: "a1" }], openFn, fetchById));
    await waitFor(() => expect(fetchById).toHaveBeenCalled());
    expect(openFn).not.toHaveBeenCalled();
  });

  it("swallows a failed fetch rather than breaking the page", async () => {
    setState({ focusId: "a1" });
    const openFn = vi.fn();
    const fetchById = vi.fn().mockRejectedValue(new Error("404"));
    renderHook(() => useFocusAppointment([{ id: "a1" }], openFn, fetchById));
    await waitFor(() => expect(fetchById).toHaveBeenCalled());
    expect(openFn).not.toHaveBeenCalled();
  });

  it("clears the navigation state without waiting for the fetch", () => {
    setState({ focusId: "a1" });
    renderHook(() => useFocusAppointment([], vi.fn(), () => new Promise(() => {})));
    expect(navigate).toHaveBeenCalledWith("/appointments?tab=upcoming", {
      replace: true,
      state: null,
    });
  });

  it("fetches only once across re-renders", async () => {
    setState({ focusId: "a1" });
    const fetchById = vi.fn().mockResolvedValue({ id: "a1" });
    const { rerender } = renderHook(({ list }) => useFocusAppointment(list, vi.fn(), fetchById), {
      initialProps: { list: [] },
    });
    rerender({ list: [{ id: "a1" }] });
    await waitFor(() => expect(fetchById).toHaveBeenCalledTimes(1));
  });
});
