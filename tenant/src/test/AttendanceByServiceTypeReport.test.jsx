import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Attendance by Service Type report: a service-code picker that loads its
 * own options, and a table that stays empty until a code is chosen and then
 * shows every session billed under it.
 *
 * The picker is the real `SelectInput` (a react-select whose menu is portalled
 * onto document.body), because its `handleChange` is what turns a chosen option
 * into the string the page fetches with -- including the quirk that an option
 * whose value is `0` collapses to `""` and reads as "nothing selected". The
 * table is a probe so each transformed row can be read back directly.
 *
 * Session timestamps are written without a zone offset so they are parsed as
 * local time and the formatted output is stable wherever the suite runs.
 */

const billingApi = vi.hoisted(() => ({ GetTenantServiceCodeByTenantId: vi.fn() }));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: billingApi }));

const reportsApi = vi.hoisted(() => ({ getSessionsByServiceCode: vi.fn() }));
vi.mock("../api/reportsApi", () => ({ default: reportsApi }));

const toast = vi.hoisted(() => ({ showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showApiError: (...a) => toast.showApiError(...a),
  showToast: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return <div data-testid="table" data-loading={String(received.loading)} />;
  },
}));

import AttendanceByServiceTypeReport from "../Pages/Reports/ReportSubs/AttendanceByServiceTypeReport";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: { isAuthenticated: true, loading: false, error: null, token: "at", user },
    },
  });

const signedIn = {
  id: "u1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { roleModuleAccesses: [] },
};

const renderReport = (user = signedIn) =>
  render(
    <Provider store={makeStore(user)}>
      <AttendanceByServiceTypeReport />
    </Provider>
  );

const rows = () => table.props.data;
const picker = () => screen.getByRole("combobox");

// react-select mounts its menu in a portal on document.body.
const openMenu = () => fireEvent.keyDown(picker(), { key: "ArrowDown" });
const optionEls = () => Array.from(document.body.querySelectorAll(".rs__option"));
const choose = (label) => {
  openMenu();
  fireEvent.click(optionEls().find((el) => el.textContent === label));
};

const session = (over = {}) => ({
  id: "s1",
  // Written without a zone so it parses as local time and formats predictably.
  startTime: "2026-03-10T09:00:00",
  endTime: "2026-03-10T10:30:00",
  supervisorApprovalStatus: "APPROVED",
  clientApprovalStatus: "PENDING",
  appointment: {
    date: "2026-03-10",
    startTime: "09:00",
    endTime: "10:30",
    serviceLocation: "Clinic",
    isBillable: true,
  },
  ...over,
});

const withCodes = (codes) =>
  billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({ data: { data: codes } });

const ready = async () => {
  const view = renderReport();
  await waitFor(() => expect(billingApi.GetTenantServiceCodeByTenantId).toHaveBeenCalled());
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  withCodes([{ id: "sc-1", code: "97153" }]);
  reportsApi.getSessionsByServiceCode.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the service codes", () => {
  it("asks for the tenant's service codes on mount", async () => {
    await ready();
    expect(billingApi.GetTenantServiceCodeByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("never asks when the user has no tenant or no token", async () => {
    renderReport({ ...signedIn, accessToken: undefined });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(billingApi.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("swaps the placeholder from Loading once the codes land", async () => {
    await ready();
    await waitFor(() => expect(screen.getByText("Select a service code")).toBeInTheDocument());
  });

  it("labels each option by its code", async () => {
    withCodes([{ id: "sc-1", code: "97153" }, { id: "sc-2", code: "97155" }]);
    await ready();
    openMenu();
    expect(optionEls().map((el) => el.textContent)).toEqual(["97153", "97155"]);
  });

  it("falls back through the name to the bare id for a code with no code string", async () => {
    withCodes([{ id: "sc-1", name: "Assessment" }, { id: "sc-2" }]);
    await ready();
    openMenu();
    expect(optionEls().map((el) => el.textContent)).toEqual(["Assessment", "sc-2"]);
  });

  it("accepts a bare list under data as well as the nested envelope", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [{ id: "sc-9", code: "H0032" }],
    });
    await ready();
    openMenu();
    expect(optionEls().map((el) => el.textContent)).toEqual(["H0032"]);
  });

  it("offers no options when the response carries nothing usable", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({});
    await ready();
    openMenu();
    expect(optionEls()).toHaveLength(0);
    expect(
      screen.getByText(
        "No service codes found. Create one in Billing & Payments → Settings → Service Codes."
      )
    ).toBeInTheDocument();
  });

  it("stays quiet and offers no options when the codes cannot be fetched", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockRejectedValue(new Error("500"));
    await ready();
    await waitFor(() => expect(screen.getByText("Select a service code")).toBeInTheDocument());
    openMenu();
    expect(optionEls()).toHaveLength(0);
    expect(toast.showApiError).not.toHaveBeenCalled();
  });
});

describe("choosing a service code", () => {
  it("shows an empty table until a code is picked", async () => {
    await ready();
    expect(rows()).toEqual([]);
    expect(reportsApi.getSessionsByServiceCode).not.toHaveBeenCalled();
  });

  it("fetches that code's sessions", async () => {
    await ready();
    choose("97153");
    await waitFor(() =>
      expect(reportsApi.getSessionsByServiceCode).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        serviceCodeId: "sc-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("holds the table in its loading state while the sessions are on the way", async () => {
    let release;
    reportsApi.getSessionsByServiceCode.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    await ready();
    choose("97153");
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true")
    );
    release([]);
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
  });

  it("reports a failed session fetch and leaves the table empty", async () => {
    const failure = new Error("500");
    reportsApi.getSessionsByServiceCode.mockRejectedValue(failure);
    await ready();
    choose("97153");
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(failure, "LOAD_SESSIONS")
    );
    expect(rows()).toEqual([]);
  });

  it("empties the table again when the picker collapses its value to nothing", async () => {
    // SelectInput's handleChange reads `newVal?.value || ""`, so an option whose
    // value is 0 arrives as "nothing selected" and clears the report.
    withCodes([{ id: "sc-1", code: "97153" }, { id: 0, code: "ZERO" }]);
    reportsApi.getSessionsByServiceCode.mockResolvedValue([session()]);
    await ready();
    choose("97153");
    await waitFor(() => expect(rows()).toHaveLength(1));
    choose("ZERO");
    await waitFor(() => expect(rows()).toEqual([]));
    // The second choice never reaches the endpoint at all.
    expect(reportsApi.getSessionsByServiceCode).toHaveBeenCalledTimes(1);
  });
});

describe("the session rows", () => {
  const load = async (sessions) => {
    reportsApi.getSessionsByServiceCode.mockResolvedValue(sessions);
    await ready();
    choose("97153");
    await waitFor(() => expect(rows()).toHaveLength(sessions.length));
  };

  it("flattens a fully recorded session", async () => {
    await load([session()]);
    expect(rows()[0]).toEqual({
      id: "s1",
      date: "03/10/2026",
      appointmentTime: "09:00 – 10:30",
      sessionStart: { date: "03/10/2026", time: "09:00AM" },
      duration: "1h 30m",
      location: "Clinic",
      billable: "Yes",
      supervisorStatus: "APPROVED",
      clientStatus: "PENDING",
    });
  });

  it("dashes out everything a session with no appointment cannot show", async () => {
    await load([
      {
        id: "s2",
        appointment: null,
        startTime: null,
        endTime: null,
        supervisorApprovalStatus: null,
        clientApprovalStatus: null,
      },
    ]);
    expect(rows()[0]).toEqual({
      id: "s2",
      date: "—",
      appointmentTime: "—",
      sessionStart: { date: "—", time: "—" },
      duration: "—",
      location: "—",
      billable: "No",
      supervisorStatus: "—",
      clientStatus: "—",
    });
  });

  it("dashes the appointment slot when only one half of it is known", async () => {
    await load([
      session({ id: "a", appointment: { date: "2026-03-10", startTime: "09:00" } }),
    ]);
    expect(rows()[0].appointmentTime).toBe("—");
  });

  it("marks a non-billable appointment as such", async () => {
    await load([session({ appointment: { isBillable: false } })]);
    expect(rows()[0].billable).toBe("No");
  });

  it("shows a sub-hour session in minutes alone", async () => {
    await load([session({ endTime: "2026-03-10T09:45:00" })]);
    expect(rows()[0].duration).toBe("45m");
  });

  it("shows a whole-hour session with a zero minute part", async () => {
    await load([session({ endTime: "2026-03-10T11:00:00" })]);
    expect(rows()[0].duration).toBe("2h 0m");
  });

  it("dashes a session that ends before it starts", async () => {
    await load([session({ endTime: "2026-03-10T08:00:00" })]);
    expect(rows()[0].duration).toBe("—");
  });

  it("dashes a session with a start but no end", async () => {
    await load([session({ endTime: null })]);
    expect(rows()[0].duration).toBe("—");
    // The start is still known, so only the duration is missing.
    expect(rows()[0].sessionStart.date).toBe("03/10/2026");
  });

  it("reports a payload that is not a list as a failure", async () => {
    reportsApi.getSessionsByServiceCode.mockResolvedValue({ message: "none" });
    await ready();
    choose("97153");
    await waitFor(() => expect(toast.showApiError).toHaveBeenCalled());
    expect(toast.showApiError.mock.calls[0][1]).toBe("LOAD_SESSIONS");
    expect(rows()).toEqual([]);
  });
});

describe("the page chrome", () => {
  it("returns to the reports index", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith("/reports");
  });

  it("names the report and its parent section", async () => {
    await ready();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Attendance by Service Types")).toBeInTheDocument();
  });

  it("gives the table its eight columns", async () => {
    await ready();
    expect(table.props.columns.map((c) => c.key)).toEqual([
      "date",
      "appointmentTime",
      "sessionStart",
      "duration",
      "location",
      "billable",
      "supervisorStatus",
      "clientStatus",
    ]);
  });
});
