import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ErrorBoundary from "../Helper/ErrorBoundary";

/**
 * The stale-chunk recovery wrapped around every lazily-loaded route.
 *
 * After a deploy the hashed chunk a running tab still points at is gone, so the
 * dynamic import rejects. `lazyWithReload` reloads the page once to pull a
 * fresh index.html, and remembers that in sessionStorage so a genuinely broken
 * chunk cannot put the tab into a reload loop.
 *
 * Reaching the catch means making a route module fail to import, which is why
 * the login page is mocked with a throwing factory and the module registry is
 * reset around every test. `window.location` is replaced wholesale because
 * jsdom refuses to let `reload` be spied on in place.
 */

const reload = vi.fn();
const realLocation = window.location;

const renderLoginRoute = async () => {
  // The factory throws rather than resolving, which is what a missing chunk
  // looks like to the dynamic import inside `lazyWithReload`.
  vi.doMock("../Pages/Authentication/Login/ClientLogin", () => {
    throw new Error("Failed to fetch dynamically imported module");
  });
  const { default: AllRoutes } = await import("../Components/AllRoutes");
  return render(
    <ErrorBoundary>
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={<div>loading route</div>}>
          <AllRoutes />
        </Suspense>
      </MemoryRouter>
    </ErrorBoundary>
  );
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sessionStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "http://localhost/", pathname: "/", reload },
  });
});

afterEach(() => {
  vi.doUnmock("../Pages/Authentication/Login/ClientLogin");
  vi.resetModules();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: realLocation,
  });
});

describe("a route chunk that no longer exists", () => {
  it("reloads the page once and records the attempt", async () => {
    await renderLoginRoute();

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem("chunkReloadAttempted")).toBe("1");
    // The catch never settles its promise, so the route stays suspended while
    // the browser is on its way to a fresh document.
    expect(screen.getByText("loading route")).toBeInTheDocument();
  });

  it("gives up rather than reloading a second time", async () => {
    sessionStorage.setItem("chunkReloadAttempted", "1");
    // React logs the re-thrown error on its way to the boundary.
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderLoginRoute();

    await waitFor(() =>
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    );
    expect(reload).not.toHaveBeenCalled();
  });
});
