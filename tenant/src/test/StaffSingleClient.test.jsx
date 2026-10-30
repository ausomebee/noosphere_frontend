import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Clients tab on a single staff member's profile: one fetch and a row
 * transform, nothing else.
 *
 * The transform is the whole subject. Every displayed column falls back through
 * two or three sources because staff-client records reach this endpoint from
 * several shapes -- a full name or first/last parts, a caregiver or an
 * emergency contact, an `active` boolean or a free-text `status` -- so the
 * fixtures below remove one source at a time. The table is a probe that records
 * the rows it was handed.
 *
 * The date column runs through the tenant's configured date format, so the
 * store is preloaded with settings already marked loaded and the settings
 * endpoint never fires.
 */

const api = vi.hoisted(() => ({ GetStaffClients: vi.fn() }));
vi.mock("../api/organisationStaffApis", () => ({ default: api }));

const settingsApi = vi.hoisted(() => ({ GetGeneralSettingsByTenantId: vi.fn() }));
vi.mock("../api/generalSettingsApi", () => ({ default: settingsApi }));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return <div data-testid="table" data-loading={String(received.loading)} />;
  },
}));

import Client from "../Pages/Organisation/StaffAndTeams/StaffSingleTabs/Client";

const makeStore = (dateFormat = "MM/DD/YYYY") =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          role: { roleModuleAccesses: [] },
        },
      },
      generalSettings: {
        dateFormat,
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const props = {
  staffId: "staff-1",
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
};

const renderTab = ({ dateFormat, ...over } = {}) =>
  render(
    <Provider store={makeStore(dateFormat)}>
      <Client {...props} {...over} />
    </Provider>
  );

const settled = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

// Read back the single row the transform produced for one client record.
const rowFor = async (client, options) => {
  api.GetStaffClients.mockResolvedValue({ data: [{ id: "c-1", ...client }] });
  renderTab(options);
  await settled();
  return table.props.data[0];
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  api.GetStaffClients.mockResolvedValue({ data: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the staff member's clients", () => {
  it("asks for the clients assigned to this staff member", async () => {
    renderTab();
    await settled();
    expect(api.GetStaffClients).toHaveBeenCalledWith({
      staffId: "staff-1",
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("accepts a bare array in place of a wrapped response", async () => {
    api.GetStaffClients.mockResolvedValue([{ id: "c-1", fullName: "Ada Lovelace" }]);
    renderTab();
    await settled();
    expect(table.props.data).toHaveLength(1);
  });

  it("shows nothing when the response is not a list at all", async () => {
    api.GetStaffClients.mockResolvedValue({ data: { message: "no clients" } });
    renderTab();
    await settled();
    expect(table.props.data).toEqual([]);
  });

  it("shows nothing when the fetch fails", async () => {
    api.GetStaffClients.mockRejectedValue(new Error("500"));
    renderTab();
    await settled();
    expect(table.props.data).toEqual([]);
  });

  it("never fetches without a staff member", () => {
    renderTab({ staffId: undefined });
    expect(api.GetStaffClients).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false");
  });

  it("never fetches without a tenant", () => {
    renderTab({ tenantId: undefined });
    expect(api.GetStaffClients).not.toHaveBeenCalled();
  });

  it("never fetches without an access token", () => {
    renderTab({ accessToken: undefined });
    expect(api.GetStaffClients).not.toHaveBeenCalled();
  });
});

describe("the row transform", () => {
  it("uses every field a complete client record provides", async () => {
    expect(
      await rowFor({
        fullName: "Ada Lovelace",
        createdAt: "2026-02-14T08:30:00.000Z",
        email: "ada@example.com",
        caregiverName: "Annabella Byron",
        phoneNumber: "555-0100",
        active: true,
      })
    ).toEqual({
      id: "c-1",
      clientName: "Ada Lovelace",
      dateAdded: "02/14/2026",
      email: "ada@example.com",
      emergencyContact: "Annabella Byron",
      phoneNo: "555-0100",
      status: "Active",
    });
  });

  it("builds the name from its parts when there is no full name", async () => {
    expect(
      await rowFor({ firstName: "Grace", lastName: "Hopper" })
    ).toMatchObject({ clientName: "Grace Hopper" });
  });

  it("keeps a half-known name from turning into a stray space", async () => {
    expect(await rowFor({ firstName: "Grace" })).toMatchObject({ clientName: "Grace" });
  });

  it("falls back to a placeholder for a record with no name at all", async () => {
    expect(await rowFor({})).toMatchObject({ clientName: "Unknown Client" });
  });

  it("marks every unknown column as N/A", async () => {
    expect(await rowFor({})).toMatchObject({
      dateAdded: "N/A",
      email: "N/A",
      emergencyContact: "N/A",
      phoneNo: "N/A",
      status: "N/A",
    });
  });

  it("falls back to the alternative contact and phone fields", async () => {
    expect(
      await rowFor({ emergencyContact: "Next of kin", phoneNo: "555-0199" })
    ).toMatchObject({ emergencyContact: "Next of kin", phoneNo: "555-0199" });
  });

  it("reads an inactive client as Inactive", async () => {
    expect(await rowFor({ active: false })).toMatchObject({ status: "Inactive" });
  });

  it("passes a free-text status through when there is no active flag", async () => {
    expect(await rowFor({ status: "Discharged" })).toMatchObject({ status: "Discharged" });
  });

  it("renders the date in the tenant's configured format", async () => {
    expect(
      await rowFor({ createdAt: "2026-02-14T08:30:00.000Z" }, { dateFormat: "DD/MM/YYYY" })
    ).toMatchObject({ dateAdded: "14/02/2026" });
  });
});
