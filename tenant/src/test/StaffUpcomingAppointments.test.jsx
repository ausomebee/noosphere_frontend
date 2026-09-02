import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * The Upcoming Appointments tab on a staff member's profile: a pure mapper from
 * the appointment records it is handed onto the five columns of a read-only
 * table.
 *
 * It owns no state and fetches nothing, so every test here feeds it one record
 * and reads the row the table probe was handed. What is worth pinning down is
 * the fallback chain on each column -- the client name comes from either of two
 * fields before falling back to "Unknown Client", the session type likewise --
 * and the time column, which pulls a wall-clock string out of the ISO start and
 * end before formatting, and degrades from "start - end" to just the start to
 * "N/A" as those go missing.
 *
 * The timestamps in the fixtures carry no zone suffix so they parse as local
 * time; a `Z` would make the rendered hour depend on the machine's timezone.
 * `useFormatSettings` is stubbed through a mutable holder so the 12- and
 * 24-hour arms can both be driven.
 */

const settings = vi.hoisted(() => ({
  current: { dateFormat: "MM/DD/YYYY", timeFormat: "12-hour", currency: "USD" },
}));
vi.mock("../hooks/useFormatSettings", () => ({
  default: () => settings.current,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return <div data-testid="table" data-loading={String(received.loading)} />;
  },
}));

import UpcomingAppointments from "../Pages/Organisation/StaffAndTeams/StaffSingleTabs/UpcomingAppointments";

const appointment = (over = {}) => ({
  id: "appt-1",
  clientName: "Ada Obi",
  serviceType: "ABA Therapy",
  sessionType: "Direct Service",
  start: "2024-03-15T09:30:00",
  end: "2024-03-15T11:05:00",
  ...over,
});

const renderTab = (appointments, props = {}) =>
  render(<UpcomingAppointments appointments={appointments} {...props} />);

const rowFor = (over) => {
  renderTab([appointment(over)]);
  return table.props.data[0];
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  settings.current = { dateFormat: "MM/DD/YYYY", timeFormat: "12-hour", currency: "USD" };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the table it builds", () => {
  it("maps a complete appointment onto every column", () => {
    expect(rowFor({})).toEqual({
      id: "appt-1",
      clientName: "Ada Obi",
      serviceType: "ABA Therapy",
      sessionType: "Direct Service",
      date: "03/15/2024",
      time: "09:30 AM - 11:05 AM",
    });
  });

  it("hands the table an empty list when there is nothing scheduled", () => {
    renderTab([]);
    expect(table.props.data).toEqual([]);
  });

  it("maps every appointment it is given", () => {
    renderTab([appointment(), appointment({ id: "appt-2", clientName: "Bo Eze" })]);
    expect(table.props.data.map((r) => r.clientName)).toEqual(["Ada Obi", "Bo Eze"]);
  });

  it("headers the five read-only columns and hides the table's own controls", () => {
    renderTab([]);
    expect(table.props.columns.map((c) => c.header)).toEqual([
      "Client",
      "Service Type(s)",
      "Session Type",
      "Date",
      "Time",
    ]);
    expect(table.props.showActions).toBe(false);
    expect(table.props.showCheckbox).toBe(false);
    expect(table.props.hideSearch).toBe(true);
    expect(table.props.hideTableActions).toBe(true);
  });

  it("passes the loading flag straight through", () => {
    renderTab([], { loading: true });
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });

  it("is not loading unless it is told so", () => {
    renderTab([]);
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false");
  });
});

describe("the client and session columns", () => {
  it("falls back to the shorter client field", () => {
    expect(rowFor({ clientName: undefined, client: "Chi Nwosu" }).clientName).toBe("Chi Nwosu");
  });

  it("names an appointment with no client at all", () => {
    expect(rowFor({ clientName: null, client: null }).clientName).toBe("Unknown Client");
  });

  it("falls back to the session name when there is no session type", () => {
    expect(rowFor({ sessionType: undefined, sessionName: "Parent Training" }).sessionType).toBe(
      "Parent Training"
    );
  });

  it("marks a missing session type and service type as unavailable", () => {
    const row = rowFor({ sessionType: null, sessionName: null, serviceType: "" });
    expect(row.sessionType).toBe("N/A");
    expect(row.serviceType).toBe("N/A");
  });
});

describe("the date and time columns", () => {
  it("marks an appointment with no start as undated", () => {
    const row = rowFor({ start: null, end: null });
    expect(row.date).toBe("N/A");
    expect(row.time).toBe("N/A");
  });

  it("shows only the start when there is no end", () => {
    expect(rowFor({ end: null }).time).toBe("09:30 AM");
  });

  it("shows only the end's absence when there is no start", () => {
    // Without a start there is nothing to anchor the range to, so the whole
    // column reads as unavailable even though an end is present.
    expect(rowFor({ start: null }).time).toBe("N/A");
  });

  it("pads the hours and minutes of an early appointment", () => {
    expect(rowFor({ start: "2024-03-15T07:05:00", end: "2024-03-15T08:09:00" }).time).toBe(
      "07:05 AM - 08:09 AM"
    );
  });

  it("turns midday and midnight into twelves", () => {
    expect(rowFor({ start: "2024-03-15T00:15:00", end: "2024-03-15T12:45:00" }).time).toBe(
      "12:15 AM - 12:45 PM"
    );
  });

  it("uses the tenant's 24-hour clock when that is the setting", () => {
    settings.current = { dateFormat: "DD/MM/YYYY", timeFormat: "24-hour", currency: "USD" };
    const row = rowFor({ start: "2024-03-15T14:30:00", end: "2024-03-15T16:00:00" });
    expect(row.time).toBe("14:30 - 16:00");
    expect(row.date).toBe("15/03/2024");
  });

  it("reads an unparseable timestamp as an unavailable time on both ends", () => {
    // getHours() on an invalid date yields NaN, which formatTime rejects -- so
    // the column shows the placeholder on each side rather than falling through
    // to the single "N/A".
    expect(rowFor({ start: "not a date", end: "also not a date" }).time).toBe("N/A - N/A");
  });
});
