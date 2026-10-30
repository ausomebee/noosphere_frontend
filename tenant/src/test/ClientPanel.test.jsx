import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

/**
 * ClientPanel is the shell around a single client: a header with the client's
 * name, a row of permission-gated tabs, and whichever tab component is showing.
 * It owns two fetches -- the client record and the count behind the
 * Authorization badge -- and remembers the chosen tab in sessionStorage through
 * usePersistedTab, which is left real here so the remembering is covered.
 *
 * Each tab is a probe that prints the props it was given, because the panel's
 * only job is to pick one and hand it the client. The router is mocked so
 * `useParams`, `useLocation` and `useNavigate` can be moved per test: the
 * pathname decides view mode, and `location.state.focusTab` (how a notification
 * deep-links into a tab) is validated against a fixed list.
 */

const auth = vi.hoisted(() => ({ accessToken: "at", refreshToken: "rt" }));
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));

const permissions = vi.hoisted(() => ({ granted: null }));
vi.mock("../hooks/usePermissions", () => ({
  default: () => ({
    hasPermission: (name) =>
      permissions.granted === null || permissions.granted.includes(name),
  }),
}));

const route = vi.hoisted(() => ({
  params: { clientId: "client-1", tenantClientId: "tc-1" },
  location: { pathname: "/client/client-single/stage-1/client-1", state: null },
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => route.params,
  useLocation: () => route.location,
}));

const api = vi.hoisted(() => ({
  GetSingleClientByClientId: vi.fn(),
  GetAllClientAuthorizationByTenantClientId: vi.fn(),
}));
vi.mock("../api/clientPanelApis", () => ({ default: api }));

// Hoisted so the mock factories below can reach it: each tab probe simply
// prints the props it was handed, since choosing and feeding a tab is all the
// panel does.
const probe = vi.hoisted(() => (name) => (received) => (
  <div data-testid={name}>
    {JSON.stringify(received, (_key, value) =>
      typeof value === "function" ? "[fn]" : value
    )}
  </div>
));

vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClientInfo", () => ({
  default: (received) => {
    return (
      <div data-testid="tab-clientInformation">
        {JSON.stringify({
          clientData: received.clientData,
          isViewMode: received.isViewMode,
        })}
        <button onClick={received.onUpdated}>refresh-client</button>
      </div>
    );
  },
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/Programs", () => ({
  default: probe("tab-programs"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/AppointmentsAndSchedules", () => ({
  default: probe("tab-appointments"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/Authorization", () => ({
  default: probe("tab-authorization"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalReports", () => ({
  default: probe("tab-clinicalReports"),
}));

import ClientPanel from "../Pages/Client/Pipeline/ClientPanel/ClientPanel";

const CLIENT = { client: { firstName: "Ada", lastName: "Lovelace" } };

const renderPanel = async () => {
  const result = render(<ClientPanel />);
  await act(async () => {});
  return result;
};

const tabButton = (label) => screen.getByRole("button", { name: new RegExp(label) });

const name = () => document.body.querySelector(".breadcrumb-segment").textContent;

const badge = () => document.body.querySelector(".auth-badge");

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  permissions.granted = null;
  route.params = { clientId: "client-1", tenantClientId: "tc-1" };
  route.location = { pathname: "/client/client-single/stage-1/client-1", state: null };
  api.GetSingleClientByClientId.mockResolvedValue({ data: { data: CLIENT } });
  api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
    data: { data: [{ id: "a1" }, { id: "a2" }] },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the client", () => {
  it("shows a loader until the client arrives", async () => {
    let release;
    api.GetSingleClientByClientId.mockReturnValue(new Promise((r) => (release = r)));
    render(<ClientPanel />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("tab-clientInformation")).toBeNull();

    await act(async () => {
      release({ data: { data: CLIENT } });
    });
    expect(screen.getByTestId("tab-clientInformation")).toBeInTheDocument();
  });

  it("hands the client record to the first tab", async () => {
    await renderPanel();
    expect(api.GetSingleClientByClientId).toHaveBeenCalledWith({
      id: "client-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByTestId("tab-clientInformation")).toHaveTextContent("Lovelace");
  });

  it("fetches nothing without a client id, and stays on the loader", async () => {
    route.params = { tenantClientId: "tc-1" };
    await renderPanel();
    expect(api.GetSingleClientByClientId).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("stops loading and shows an empty tab when the fetch fails", async () => {
    api.GetSingleClientByClientId.mockRejectedValue(new Error("no such client"));
    await renderPanel();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByTestId("tab-clientInformation")).toHaveTextContent(
      '{"clientData":null,"isViewMode":false}'
    );
  });

  it("refetches when a tab reports the client changed", async () => {
    await renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByText("refresh-client"));
    });
    expect(api.GetSingleClientByClientId).toHaveBeenCalledTimes(2);
    expect(api.GetAllClientAuthorizationByTenantClientId).toHaveBeenCalledTimes(2);
  });
});

describe("the client's name in the header", () => {
  it("shows both names once the client is loaded", async () => {
    await renderPanel();
    expect(name()).toBe("Ada Lovelace");
  });

  it("says Unknown while there is no client yet", async () => {
    api.GetSingleClientByClientId.mockRejectedValue(new Error("boom"));
    await renderPanel();
    expect(name()).toBe("Unknown");
  });

  it("copes with a client who has only one of the two names", async () => {
    api.GetSingleClientByClientId.mockResolvedValue({
      data: { data: { client: { firstName: "Ada" } } },
    });
    await renderPanel();
    expect(name()).toBe("Ada");
  });

  it("falls back to a generic word for a client with no name at all", async () => {
    api.GetSingleClientByClientId.mockResolvedValue({ data: { data: { client: {} } } });
    await renderPanel();
    expect(name()).toBe("Client");
  });

  it("goes back a page from the Back button", async () => {
    await renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});

describe("the authorization badge", () => {
  it("counts the authorizations it was given", async () => {
    await renderPanel();
    expect(badge()).toHaveTextContent("2");
  });

  it("hides itself when the client has none", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: { data: [] },
    });
    await renderPanel();
    expect(badge()).toBeNull();
  });

  it("hides itself when the payload is malformed", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({
      data: { data: { nope: true } },
    });
    await renderPanel();
    expect(badge()).toBeNull();
  });

  it("hides itself when the payload is empty", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockResolvedValue({});
    await renderPanel();
    expect(badge()).toBeNull();
  });

  it("hides itself when the count cannot be fetched", async () => {
    api.GetAllClientAuthorizationByTenantClientId.mockRejectedValue(new Error("boom"));
    await renderPanel();
    expect(badge()).toBeNull();
  });

  it("does not ask for a count without a tenant client id", async () => {
    route.params = { clientId: "client-1" };
    await renderPanel();
    expect(api.GetAllClientAuthorizationByTenantClientId).not.toHaveBeenCalled();
    expect(badge()).toBeNull();
  });

  it("drops a count that arrives after the panel has moved on", async () => {
    let release;
    api.GetAllClientAuthorizationByTenantClientId.mockReturnValue(
      new Promise((r) => (release = r))
    );
    const { unmount } = await renderPanel();
    unmount();
    await act(async () => {
      release({ data: { data: [{ id: "a1" }] } });
    });
    expect(document.body.querySelector(".auth-badge")).toBeNull();
  });
});

describe("switching tabs", () => {
  it("opens each tab in turn", async () => {
    await renderPanel();

    fireEvent.click(tabButton("Programs"));
    expect(screen.getByTestId("tab-programs")).toHaveTextContent("Ada Lovelace");

    fireEvent.click(tabButton("Appointments & Schedule"));
    expect(screen.getByTestId("tab-appointments")).toHaveTextContent("Ada Lovelace");

    fireEvent.click(tabButton("Authorization"));
    expect(screen.getByTestId("tab-authorization")).toBeInTheDocument();

    fireEvent.click(tabButton("Clinical Reports"));
    expect(screen.getByTestId("tab-clinicalReports")).toHaveTextContent("Lovelace");

    fireEvent.click(tabButton("Client Information"));
    expect(screen.getByTestId("tab-clientInformation")).toBeInTheDocument();
  });

  it("marks the open tab as the active one", async () => {
    await renderPanel();
    expect(tabButton("Client Information")).toHaveClass(
      "appointment-sched-view-button-active"
    );
    expect(tabButton("Programs")).toHaveClass("appointment-sched-view-button-inactive");

    fireEvent.click(tabButton("Programs"));
    expect(tabButton("Programs")).toHaveClass("appointment-sched-view-button-active");
  });

  it("remembers the tab for that client across a remount", async () => {
    const { unmount } = await renderPanel();
    fireEvent.click(tabButton("Authorization"));
    unmount();

    await renderPanel();
    expect(screen.getByTestId("tab-authorization")).toBeInTheDocument();
  });

  it("falls back to the client tab for a remembered tab it does not know", async () => {
    sessionStorage.setItem("tab:tenant:clientPanel:client-1", "somethingElse");
    await renderPanel();
    expect(screen.getByTestId("tab-clientInformation")).toBeInTheDocument();
  });

  it("opens the tab a notification asked for", async () => {
    route.location = { pathname: "/client/client-single/x", state: { focusTab: "programs" } };
    await renderPanel();
    expect(screen.getByTestId("tab-programs")).toBeInTheDocument();
  });

  it("ignores a requested tab that is not one of its own", async () => {
    route.location = { pathname: "/client/client-single/x", state: { focusTab: "billing" } };
    await renderPanel();
    expect(screen.getByTestId("tab-clientInformation")).toBeInTheDocument();
  });

  it("ignores an empty navigation state", async () => {
    route.location = { pathname: "/client/client-single/x", state: {} };
    await renderPanel();
    expect(screen.getByTestId("tab-clientInformation")).toBeInTheDocument();
  });
});

describe("permissions", () => {
  it("shows only the tabs the user is allowed to see", async () => {
    permissions.granted = ["view_client_program_list"];
    await renderPanel();

    expect(tabButton("Client Information")).toBeInTheDocument();
    expect(tabButton("Programs")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Appointments/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Authorization/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Clinical Reports/ })).toBeNull();
  });

  it("leaves the client tab in place for a user with no permissions at all", async () => {
    permissions.granted = [];
    await renderPanel();
    expect(tabButton("Client Information")).toBeInTheDocument();
    expect(document.body.querySelectorAll(".appointment-sched-view-button")).toHaveLength(1);
  });

  it("still shows a remembered tab whose button has been taken away", async () => {
    // usePersistedTab is given no allow-list here, so a stored tab survives a
    // permission change and its content keeps rendering without a button.
    sessionStorage.setItem("tab:tenant:clientPanel:client-1", "programs");
    permissions.granted = [];
    await renderPanel();
    expect(screen.getByTestId("tab-programs")).toBeInTheDocument();
  });
});

describe("view mode", () => {
  it("tells the client tab it is read-only on the view route", async () => {
    route.location = { pathname: "/client/view-client/client-1", state: null };
    await renderPanel();
    await waitFor(() =>
      expect(screen.getByTestId("tab-clientInformation")).toHaveTextContent(
        '"isViewMode":true'
      )
    );
  });

  it("leaves it editable everywhere else", async () => {
    await renderPanel();
    expect(screen.getByTestId("tab-clientInformation")).toHaveTextContent(
      '"isViewMode":false'
    );
  });
});
