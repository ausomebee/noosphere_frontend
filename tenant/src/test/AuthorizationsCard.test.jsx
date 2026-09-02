import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Authorizations dashboard card: a donut of active / expiring / expired
 * counts, a headline number that follows whichever status the dashboard is
 * filtered to, the first three matching authorizations, and a "+N more" link
 * that opens a three-tab modal.
 *
 * Two endpoints feed it. The metrics call runs once on mount and owns the
 * card-level error state; the list call runs again for every status the card
 * or the modal asks about, and has shipped three different envelope shapes
 * (bare array, `{ rows }`, `{ authorizations }`) which the card normalises.
 *
 * The modal is the awkward part: each tab owns its own request, tracked in a
 * ref so a tab fetches once per open, and the first fetch resolves its status
 * from `selectedStatus` locally rather than from state. Closing the modal
 * clears that ref, so reopening refetches. Tests drive it through the real
 * ReusableModal, whose tab buttons carry role="tab".
 *
 * react-apexcharts is stubbed -- it needs a real layout engine -- and echoes
 * its series so the donut's numbers can still be asserted.
 */

const api = vi.hoisted(() => ({
  GetTenantClientAuthorizationMetrics: vi.fn(),
  GetAllTenantClientAuthorization: vi.fn(),
}));
vi.mock("../api/DashboardApis", () => ({ default: api }));

vi.mock("react-apexcharts", () => ({
  default: ({ series, options }) => (
    <div data-testid="donut" data-series={JSON.stringify(series)}>
      {options.labels.join(",")}
    </div>
  ),
}));

// The settings hook fires its own request when the slice is unloaded; the
// store below is preloaded as loaded, but the module is still mocked away so
// this suite never depends on that endpoint.
vi.mock("../api/generalSettingsApi", () => ({
  default: { GetGeneralSettingsByTenantId: vi.fn().mockResolvedValue({ data: null }) },
}));

import Authorizations from "../Pages/Dashboard/DashboardCards/Authorizations";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user,
      },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const signedIn = {
  id: "u1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { roleModuleAccesses: [] },
};

const setIsModalOpen = vi.fn();

// The card is a controlled child: the dashboard owns `isModalOpen`, so the
// harness re-renders with the flag the card asked for.
const renderCard = ({
  hasData = true,
  selectedStatus = "active",
  isModalOpen = false,
  user = signedIn,
} = {}) => {
  const store = makeStore(user);
  const ui = (open) => (
    <Provider store={store}>
      <MemoryRouter>
        <Authorizations
          hasData={hasData}
          selectedStatus={selectedStatus}
          isModalOpen={open}
          setIsModalOpen={setIsModalOpen}
        />
      </MemoryRouter>
    </Provider>
  );
  const view = render(ui(isModalOpen));
  return { ...view, setOpen: (open) => view.rerender(ui(open)) };
};

const authorization = (over = {}) => ({
  id: "a1",
  title: "ABA Therapy",
  authorizationNumber: "AUTH-1",
  startDate: "2026-01-15T00:00:00.000Z",
  endDate: "2026-06-15T00:00:00.000Z",
  tenantClient: { client: { firstName: "Ada", lastName: "Lovelace" } },
  payerDetails: { payerName: "Blue Shield" },
  insurance: { name: "PPO" },
  ...over,
});

const metrics = (data) =>
  api.GetTenantClientAuthorizationMetrics.mockResolvedValue({ data: { data } });

const list = (rows) =>
  api.GetAllTenantClientAuthorization.mockResolvedValue({ data: { data: rows } });

const openModal = async (view) => {
  view.setOpen(true);
  await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
};

const tab = (name) => screen.getByRole("tab", { name });

// A preview row interleaves the name, the details span and the date span in one
// paragraph, so it is read as a whole line rather than by its parts.
const previewRows = () =>
  Array.from(document.body.querySelectorAll(".auth-details p.text-sm")).map((p) =>
    p.textContent.replace(/\s+/g, " ").trim()
  );

beforeEach(() => {
  vi.clearAllMocks();
  metrics({ active: 5, expiring: 2, expired: 1, total: 8 });
  list([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the metrics fetch", () => {
  it("feeds the donut and the headline from the metrics envelope", async () => {
    renderCard();
    await waitFor(() =>
      expect(screen.getByTestId("donut")).toHaveAttribute("data-series", "[1,2,5]")
    );
    expect(screen.getByTestId("donut")).toHaveTextContent("Expired,Expiring,Active");
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("sends the signed-in tenant's credentials", async () => {
    renderCard();
    await waitFor(() =>
      expect(api.GetTenantClientAuthorizationMetrics).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("zeroes any count the endpoint returns as unparseable", async () => {
    metrics({ active: "many", expiring: null, expired: undefined, total: "n/a" });
    renderCard({ selectedStatus: "unknown" });
    await waitFor(() =>
      expect(screen.getByTestId("donut")).toHaveAttribute("data-series", "[0,0,0]")
    );
    // No label matches "Unknown", so the headline falls through to the total,
    // which is itself unparseable and lands on zero.
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("keeps the seeded zeroes when the response carries no data envelope", async () => {
    api.GetTenantClientAuthorizationMetrics.mockResolvedValue({ data: {} });
    renderCard();
    await waitFor(() => expect(api.GetTenantClientAuthorizationMetrics).toHaveBeenCalled());
    expect(screen.getByTestId("donut")).toHaveAttribute("data-series", "[0,0,0]");
  });

  it("replaces the whole card with an error state when the metrics fetch rejects", async () => {
    api.GetTenantClientAuthorizationMetrics.mockRejectedValue(new Error("500"));
    renderCard();
    expect(
      await screen.findByText("We couldn't load your authorizations. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("donut")).not.toBeInTheDocument();
  });

  it("restores the card when the retry succeeds", async () => {
    api.GetTenantClientAuthorizationMetrics.mockRejectedValueOnce(new Error("500"));
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByTestId("donut")).toBeInTheDocument());
  });

  it("skips both fetches entirely when nobody is signed in", async () => {
    renderCard({ user: { role: { roleModuleAccesses: [] } } });
    await waitFor(() => expect(screen.getByTestId("donut")).toBeInTheDocument());
    expect(api.GetTenantClientAuthorizationMetrics).not.toHaveBeenCalled();
    expect(api.GetAllTenantClientAuthorization).not.toHaveBeenCalled();
  });
});

describe("the filtered headline", () => {
  it("shows the count for the status the dashboard is filtered to", async () => {
    metrics({ active: 5, expiring: 2, expired: 1, total: 8 });
    renderCard({ selectedStatus: "expiring" });
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });

  it("falls back to the grand total for a status that is not one of the three", async () => {
    metrics({ active: 5, expiring: 2, expired: 1, total: 8 });
    renderCard({ selectedStatus: "everything" });
    await waitFor(() => expect(screen.getByText("8")).toBeInTheDocument());
  });
});

describe("the three-row preview", () => {
  it("names a client from both halves and formats the start date", async () => {
    list([authorization()]);
    renderCard();
    await waitFor(() =>
      expect(previewRows()).toEqual(["Ada Lovelace ABA Therapy - AUTH-1 01/15/2026"])
    );
  });

  it("calls an authorization with no client name an unknown client", async () => {
    list([authorization({ tenantClient: {} })]);
    renderCard();
    await waitFor(() => expect(previewRows()[0]).toMatch(/^Unknown Client /));
  });

  it("uses whichever half of the name exists", async () => {
    list([authorization({ tenantClient: { client: { lastName: "Lovelace" } } })]);
    renderCard();
    await waitFor(() => expect(previewRows()[0]).toMatch(/^Lovelace /));
  });

  it("shows at most three rows and offers the rest behind a link", async () => {
    list(Array.from({ length: 7 }, (_, i) => authorization({ id: `a${i}`, title: `T${i}` })));
    renderCard();
    expect(await screen.findByText("+4 more")).toBeInTheDocument();
    expect(previewRows()).toHaveLength(3);
  });

  it("offers no link when there are exactly three authorizations", async () => {
    list(Array.from({ length: 3 }, (_, i) => authorization({ id: `a${i}` })));
    renderCard();
    await waitFor(() => expect(previewRows()).toHaveLength(3));
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  it("asks the dashboard to open the modal when the link is followed", async () => {
    list(Array.from({ length: 4 }, (_, i) => authorization({ id: `a${i}` })));
    renderCard();
    fireEvent.click(await screen.findByText("+1 more"));
    expect(setIsModalOpen).toHaveBeenCalledWith(true);
  });

  it("shows a loader while the list request is in flight", async () => {
    let release;
    api.GetAllTenantClientAuthorization.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderCard();
    expect(await screen.findByText("Loading...")).toBeInTheDocument();
    release({ data: { data: [] } });
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
  });

  it("leaves the preview empty when the list request rejects", async () => {
    api.GetAllTenantClientAuthorization.mockRejectedValue(new Error("503"));
    renderCard();
    await waitFor(() => expect(api.GetAllTenantClientAuthorization).toHaveBeenCalled());
    expect(previewRows()).toHaveLength(0);
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("does not ask for a list at all when no status is selected", async () => {
    renderCard({ selectedStatus: "" });
    await waitFor(() => expect(api.GetTenantClientAuthorizationMetrics).toHaveBeenCalled());
    expect(api.GetAllTenantClientAuthorization).not.toHaveBeenCalled();
  });
});

describe("the list envelope shapes", () => {
  const previewNames = async () => {
    renderCard();
    await waitFor(() => expect(api.GetAllTenantClientAuthorization).toHaveBeenCalled());
  };

  it("accepts a bare array under data.data", async () => {
    list([authorization()]);
    await previewNames();
    await waitFor(() => expect(previewRows()).toHaveLength(1));
  });

  it("accepts a paginated rows envelope", async () => {
    list({ rows: [authorization()] });
    await previewNames();
    await waitFor(() => expect(previewRows()).toHaveLength(1));
  });

  it("accepts an authorizations envelope", async () => {
    list({ authorizations: [authorization()] });
    await previewNames();
    await waitFor(() => expect(previewRows()).toHaveLength(1));
  });

  it("falls back to the top-level data when there is no nested data", async () => {
    api.GetAllTenantClientAuthorization.mockResolvedValue({ data: [authorization()] });
    await previewNames();
    await waitFor(() => expect(previewRows()).toHaveLength(1));
  });

  it("treats an envelope it does not recognise as an empty list", async () => {
    list({ unexpected: true });
    await previewNames();
    expect(previewRows()).toHaveLength(0);
  });

  it("survives a response with no body at all", async () => {
    api.GetAllTenantClientAuthorization.mockResolvedValue(undefined);
    await previewNames();
    expect(previewRows()).toHaveLength(0);
  });
});

describe("the authorizations modal", () => {
  it("opens on the tab matching the dashboard filter and fetches only that status", async () => {
    const view = renderCard({ selectedStatus: "expiring" });
    await waitFor(() => expect(api.GetAllTenantClientAuthorization).toHaveBeenCalled());
    api.GetAllTenantClientAuthorization.mockClear();
    await openModal(view);
    await waitFor(() => expect(tab("Expiring")).toHaveClass("active"));
    expect(api.GetAllTenantClientAuthorization).toHaveBeenCalledTimes(1);
    expect(api.GetAllTenantClientAuthorization.mock.calls[0][0].status).toBe("expiring");
  });

  it("lands on Active for a filter that is not one of the three tabs", async () => {
    const view = renderCard({ selectedStatus: "everything" });
    await openModal(view);
    await waitFor(() => expect(tab("Active")).toHaveClass("active"));
  });

  it("fetches a tab the first time it is chosen and not again", async () => {
    const view = renderCard();
    await openModal(view);
    await waitFor(() => expect(api.GetAllTenantClientAuthorization).toHaveBeenCalled());
    api.GetAllTenantClientAuthorization.mockClear();
    fireEvent.click(tab("Expired"));
    await waitFor(() =>
      expect(api.GetAllTenantClientAuthorization.mock.calls[0][0].status).toBe("expired")
    );
    fireEvent.click(tab("Active"));
    fireEvent.click(tab("Expired"));
    await waitFor(() => expect(tab("Expired")).toHaveClass("active"));
    expect(api.GetAllTenantClientAuthorization).toHaveBeenCalledTimes(1);
  });

  it("refetches after the modal is closed and reopened", async () => {
    const view = renderCard();
    await openModal(view);
    await waitFor(() => expect(api.GetAllTenantClientAuthorization).toHaveBeenCalled());
    view.setOpen(false);
    api.GetAllTenantClientAuthorization.mockClear();
    await openModal(view);
    await waitFor(() => expect(api.GetAllTenantClientAuthorization).toHaveBeenCalledTimes(1));
  });

  it("says a tab is empty when its status has no authorizations", async () => {
    const view = renderCard();
    await openModal(view);
    expect(await screen.findByText("No active authorizations found")).toBeInTheDocument();
  });

  it("counts the rows, using the singular for one", async () => {
    list([authorization()]);
    const view = renderCard();
    await openModal(view);
    expect(await screen.findByText("1 active authorization")).toBeInTheDocument();
  });

  it("counts the rows in the plural for more than one", async () => {
    list([authorization(), authorization({ id: "a2" })]);
    const view = renderCard();
    await openModal(view);
    expect(await screen.findByText("2 active authorizations")).toBeInTheDocument();
  });

  it("shows a loader for a tab whose request has not landed", async () => {
    api.GetAllTenantClientAuthorization.mockReturnValue(new Promise(() => {}));
    const view = renderCard();
    await openModal(view);
    expect(await within(screen.getByRole("dialog")).findByText("Loading...")).toBeInTheDocument();
  });

  it("offers a retry for a tab whose request failed, and recovers on the second try", async () => {
    const view = renderCard();
    await waitFor(() => expect(api.GetAllTenantClientAuthorization).toHaveBeenCalled());
    // Only the modal's own request is made to fail; the card already has its
    // (empty) preview by now.
    api.GetAllTenantClientAuthorization.mockRejectedValueOnce(new Error("500"));
    await openModal(view);
    expect(
      await screen.findByText("We couldn't load active authorizations.")
    ).toBeInTheDocument();
    list([authorization()]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1 active authorization")).toBeInTheDocument();
  });

  it("pages a tab holding more than ten rows", async () => {
    list(
      Array.from({ length: 12 }, (_, i) =>
        authorization({ id: `a${i}`, authorizationNumber: `AUTH-${i}` })
      )
    );
    const view = renderCard();
    await openModal(view);
    const dialog = () => within(screen.getByRole("dialog"));
    expect(await dialog().findByText("ABA Therapy - AUTH-0")).toBeInTheDocument();
    expect(dialog().queryByText("ABA Therapy - AUTH-11")).not.toBeInTheDocument();
    fireEvent.click(dialog().getByRole("button", { name: "2" }));
    expect(dialog().getByText("ABA Therapy - AUTH-11")).toBeInTheDocument();
    expect(dialog().queryByText("ABA Therapy - AUTH-0")).not.toBeInTheDocument();
  });

  it("shows no pager for a tab that fits on one page", async () => {
    list([authorization()]);
    const view = renderCard();
    await openModal(view);
    await screen.findByText("1 active authorization");
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("closes on the footer button", async () => {
    const view = renderCard();
    await openModal(view);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("closes on the header cross", async () => {
    const view = renderCard();
    await openModal(view);
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });
});

describe("the card without data", () => {
  it("invites the user to set up an authorization", async () => {
    renderCard({ hasData: false });
    await waitFor(() => expect(api.GetTenantClientAuthorizationMetrics).toHaveBeenCalled());
    expect(screen.getByText("No data to show")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set up authorization" })).toBeInTheDocument();
    expect(screen.queryByTestId("donut")).not.toBeInTheDocument();
  });

  it("still opens the modal and fetches, even with an empty card", async () => {
    const view = renderCard({ hasData: false });
    await openModal(view);
    expect(await screen.findByText("No active authorizations found")).toBeInTheDocument();
  });
});
