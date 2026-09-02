import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Attendance by Session Type report: one dropdown of active session types,
 * and a second fetch that runs whenever a type is picked and flattens each
 * returned session into a table row.
 *
 * Nearly every branch lives in the row transform's `||` and `?:` chains and in
 * the duration arithmetic, so the shared table is replaced by a probe that
 * serialises the rows it was handed -- that reads a row back exactly as the
 * report built it without fighting the real table's pagination.
 *
 * The dropdown is the real `SelectInput`, i.e. a react-select, so options are
 * chosen by clicking the rendered `.rs__option`. That component collapses a
 * falsy option value to `""`, which is the only way to reach the report's
 * "nothing selected" arm -- the select is not clearable, so a fixture with a
 * null id is what stands in for clearing the field.
 */

const appointmentApi = vi.hoisted(() => ({ GetSessionTypeActiveByTenantId: vi.fn() }));
vi.mock("../api/AppointmentApi", () => ({ default: appointmentApi }));

const reportsApi = vi.hoisted(() => ({ getSessionsBySessionType: vi.fn() }));
vi.mock("../api/reportsApi", () => ({ default: reportsApi }));

const showApiError = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showApiError, showToast: vi.fn() }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            {JSON.stringify(row)}
          </div>
        ))}
      </div>
    );
  },
}));

import AttendanceBySessionTypeReport from "../Pages/Reports/ReportSubs/AttendanceBySessionTypeReport";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: { isAuthenticated: true, loading: false, error: null, token: "at", user },
    },
  });

const signedIn = {
  id: "staff-1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { name: "Admin", roleModuleAccesses: [] },
};

const renderReport = (user = signedIn) =>
  render(
    <Provider store={makeStore(user)}>
      <AttendanceBySessionTypeReport />
    </Provider>
  );

const openMenu = () => fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });

const pick = async (label) => {
  openMenu();
  fireEvent.click(await screen.findByText(label));
};

// The probe serialises each row, so read it back as the object the transform
// produced rather than as scattered cell text.
const row = (id) => JSON.parse(screen.getByTestId(`row-${id}`).textContent);

// A session as the endpoint returns it: the report reads the nested
// `appointment` for the scheduled slot and the top level for the actual one.
const session = (over = {}) => ({
  id: "sess-1",
  startTime: "2026-04-01T09:00:00",
  endTime: "2026-04-01T10:30:00",
  supervisorApprovalStatus: "APPROVED",
  clientApprovalStatus: "PENDING",
  appointment: {
    date: "2026-04-01",
    startTime: "09:00",
    endTime: "10:00",
    serviceLocation: "Clinic",
    isBillable: true,
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  appointmentApi.GetSessionTypeActiveByTenantId.mockResolvedValue({
    data: { data: [{ id: "type-1", name: "Direct Therapy" }] },
  });
  reportsApi.getSessionsBySessionType.mockResolvedValue([session()]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the session type dropdown", () => {
  it("asks for the tenant's active session types on mount", async () => {
    renderReport();
    await waitFor(() =>
      expect(appointmentApi.GetSessionTypeActiveByTenantId).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("skips the fetch entirely when nobody is signed in", async () => {
    renderReport({});
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(appointmentApi.GetSessionTypeActiveByTenantId).not.toHaveBeenCalled();
    // The placeholder stays on "Loading..." because the effect never ran.
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("skips the fetch when a tenant is known but the token is not", async () => {
    renderReport({ ...signedIn, accessToken: undefined });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(appointmentApi.GetSessionTypeActiveByTenantId).not.toHaveBeenCalled();
  });

  it("swaps the loading placeholder for the real one once the types land", async () => {
    renderReport();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(await screen.findByText("Select a session type")).toBeInTheDocument();
  });

  it("accepts a bare array on the response body", async () => {
    appointmentApi.GetSessionTypeActiveByTenantId.mockResolvedValue({
      data: [{ id: "type-9", name: "Assessment" }],
    });
    renderReport();
    await screen.findByText("Select a session type");
    openMenu();
    expect(await screen.findByText("Assessment")).toBeInTheDocument();
  });

  it("falls back to the id when a session type carries no name", async () => {
    appointmentApi.GetSessionTypeActiveByTenantId.mockResolvedValue({
      data: { data: [{ id: "type-unnamed" }] },
    });
    renderReport();
    await screen.findByText("Select a session type");
    openMenu();
    expect(await screen.findByText("type-unnamed")).toBeInTheDocument();
  });

  it("offers the empty hint when the response carries nothing at all", async () => {
    appointmentApi.GetSessionTypeActiveByTenantId.mockResolvedValue(undefined);
    renderReport();
    await screen.findByText("Select a session type");
    openMenu();
    expect(
      await screen.findByText(
        "No session types found. Create one in Organisation → Practice Settings."
      )
    ).toBeInTheDocument();
  });

  it("leaves the dropdown empty and silent when the types fetch fails", async () => {
    appointmentApi.GetSessionTypeActiveByTenantId.mockRejectedValue(new Error("500"));
    renderReport();
    await screen.findByText("Select a session type");
    openMenu();
    expect(await screen.findByText(/No session types found/)).toBeInTheDocument();
    expect(showApiError).not.toHaveBeenCalled();
  });

  it("goes back to the reports index", async () => {
    renderReport();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith("/reports");
  });
});

describe("loading sessions for a type", () => {
  it("fetches the picked type's sessions and fills the table", async () => {
    renderReport();
    await screen.findByText("Select a session type");
    await pick("Direct Therapy");
    await waitFor(() =>
      expect(reportsApi.getSessionsBySessionType).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        sessionTypeId: "type-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(await screen.findByTestId("row-sess-1")).toBeInTheDocument();
  });

  it("clears the table without a fetch when the picked type has no id", async () => {
    // SelectInput turns a null option value into "", which is the report's
    // "nothing selected" arm -- the field itself is not clearable.
    appointmentApi.GetSessionTypeActiveByTenantId.mockResolvedValue({
      data: { data: [{ id: null, name: "Unsaved type" }] },
    });
    renderReport();
    await screen.findByText("Select a session type");
    await pick("Unsaved type");
    expect(reportsApi.getSessionsBySessionType).not.toHaveBeenCalled();
    expect(screen.queryByTestId("row-sess-1")).not.toBeInTheDocument();
  });

  it("flags the table as loading while the sessions are in flight", async () => {
    let release;
    reportsApi.getSessionsBySessionType.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve([]);
      })
    );
    renderReport();
    await screen.findByText("Select a session type");
    await pick("Direct Therapy");
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true")
    );
    release();
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
  });

  it("empties the table and reports a failed sessions fetch", async () => {
    const boom = new Error("nope");
    reportsApi.getSessionsBySessionType.mockRejectedValue(boom);
    renderReport();
    await screen.findByText("Select a session type");
    await pick("Direct Therapy");
    await waitFor(() => expect(showApiError).toHaveBeenCalledWith(boom, "LOAD_SESSIONS"));
    expect(screen.queryByTestId("row-sess-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false");
  });
});

describe("the row transform", () => {
  const rowFor = async (over) => {
    reportsApi.getSessionsBySessionType.mockResolvedValue([session(over)]);
    renderReport();
    await screen.findByText("Select a session type");
    await pick("Direct Therapy");
    await screen.findByTestId("row-sess-1");
    return row("sess-1");
  };

  it("formats the appointment date, slot and session start", async () => {
    expect(await rowFor({})).toMatchObject({
      date: "04/01/2026",
      appointmentTime: "09:00 – 10:00",
      sessionStart: { date: "04/01/2026", time: "09:00AM" },
      location: "Clinic",
      billable: "Yes",
      supervisorStatus: "APPROVED",
      clientStatus: "PENDING",
    });
  });

  it("dashes out every field a session without an appointment cannot fill", async () => {
    expect(
      await rowFor({
        appointment: undefined,
        startTime: null,
        endTime: null,
        supervisorApprovalStatus: null,
        clientApprovalStatus: "",
      })
    ).toMatchObject({
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

  it("dashes the slot when only one end of it is known", async () => {
    const only = await rowFor({
      appointment: { date: "2026-04-01", startTime: "09:00", endTime: null },
    });
    expect(only.appointmentTime).toBe("—");
  });

  it("reads a non-billable appointment as No", async () => {
    expect((await rowFor({ appointment: { isBillable: false } })).billable).toBe("No");
  });
});

describe("session duration", () => {
  const durationFor = async (over) => {
    reportsApi.getSessionsBySessionType.mockResolvedValue([session(over)]);
    renderReport();
    await screen.findByText("Select a session type");
    await pick("Direct Therapy");
    await screen.findByTestId("row-sess-1");
    return row("sess-1").duration;
  };

  it("spells out hours and minutes for a session over an hour", async () => {
    expect(await durationFor({})).toBe("1h 30m");
  });

  it("gives minutes only for a session under an hour", async () => {
    expect(
      await durationFor({
        startTime: "2026-04-01T09:00:00",
        endTime: "2026-04-01T09:45:00",
      })
    ).toBe("45m");
  });

  it("dashes a session with no end time", async () => {
    expect(await durationFor({ endTime: null })).toBe("—");
  });

  it("dashes a session that ends before it starts", async () => {
    expect(
      await durationFor({
        startTime: "2026-04-01T10:00:00",
        endTime: "2026-04-01T09:00:00",
      })
    ).toBe("—");
  });

  it("dashes a session whose start and end are the same instant", async () => {
    expect(
      await durationFor({
        startTime: "2026-04-01T09:00:00",
        endTime: "2026-04-01T09:00:00",
      })
    ).toBe("—");
  });
});
