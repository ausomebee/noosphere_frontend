import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const h = vi.hoisted(() => ({
  dispatch: vi.fn(),
  navigate: vi.fn(),
  purge: vi.fn(),
  disconnectSocket: vi.fn(),
}));

vi.mock("react-redux", () => ({ useDispatch: () => h.dispatch }));
vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("../ReduxStore/store", () => ({ persistor: { purge: (...a) => h.purge(...a) } }));
vi.mock("../ReduxStore/features/authentication", () => ({
  logout: () => ({ type: "authentication/logout" }),
}));
vi.mock("../api/socketService", () => ({
  disconnectSocket: (...a) => h.disconnectSocket(...a),
}));

import useIdleTimeout from "../hooks/useIdleTimeout";
import { pauseIdleLogout } from "../Helper/liveSessionGuard";

/**
 * The idle auto-logout. A live appointment session pauses it: a clinician
 * running a session hands-off for half an hour must not be logged out of it.
 */

const TIMEOUT = 1000;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useIdleTimeout", () => {
  it("logs out after the idle period", () => {
    renderHook(() => useIdleTimeout(TIMEOUT));
    act(() => vi.advanceTimersByTime(TIMEOUT));
    expect(h.dispatch).toHaveBeenCalledWith({ type: "authentication/logout" });
    expect(h.disconnectSocket).toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalledWith("/");
  });

  it("restarts the clock on activity", () => {
    renderHook(() => useIdleTimeout(TIMEOUT));
    act(() => vi.advanceTimersByTime(TIMEOUT - 100));
    act(() => window.dispatchEvent(new Event("keydown")));
    act(() => vi.advanceTimersByTime(TIMEOUT - 100));
    expect(h.dispatch).not.toHaveBeenCalled();
  });

  it("does not log out while a live session holds it paused", () => {
    const resume = pauseIdleLogout();
    renderHook(() => useIdleTimeout(TIMEOUT));
    act(() => vi.advanceTimersByTime(TIMEOUT * 5));
    expect(h.dispatch).not.toHaveBeenCalled();

    // Once the session is over, the next idle period logs out as usual.
    resume();
    act(() => vi.advanceTimersByTime(TIMEOUT));
    expect(h.dispatch).toHaveBeenCalledWith({ type: "authentication/logout" });
  });
});
