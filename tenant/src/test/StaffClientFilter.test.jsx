import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import StaffClientFilter from "../Components/CalendarScheduler/StaffClientFilter";

/**
 * The calendar's sidebar filter. One tab shows staff, the other shows clients,
 * and a single search box narrows whichever list is showing. Ticking a row does
 * two things at once: it tells the parent which id was toggled, and it fires a
 * fetch with the ids as they will be *after* the toggle — which the component
 * works out for itself rather than waiting for the parent to send the new
 * selection back down. Those two calls disagreeing is the thing most worth
 * asserting here.
 *
 * The client rows are wrapped records: the display name is assembled from a
 * nested `client` that may be missing either half of the name, or missing
 * entirely, and the fixtures cover each of those.
 *
 * The component is fully controlled, so the selection never changes on its own;
 * every "already selected" case is set up by passing it in.
 */

const STAFF = [
  { id: "st-1", fullName: "Ada Lovelace", appointmentCount: 3 },
  { id: "st-2", fullName: "Grace Hopper", appointmentCount: 0 },
];

const CLIENTS = [
  {
    clientId: "cl-1",
    appointmentCount: 5,
    client: { firstName: "Rosalind", lastName: "Franklin" },
  },
  {
    clientId: "cl-2",
    appointmentCount: 1,
    client: { firstName: "Katherine", lastName: "Johnson" },
  },
];

const renderFilter = (props = {}) => {
  const onStaffChange = vi.fn();
  const onClientChange = vi.fn();
  const onHideSidebar = vi.fn();
  const fetchAppointmentsByFilter = vi.fn();
  const view = render(
    <StaffClientFilter
      staff={STAFF}
      clients={CLIENTS}
      selectedStaff={[]}
      selectedClients={[]}
      activeTab="staff"
      onStaffChange={onStaffChange}
      onClientChange={onClientChange}
      onHideSidebar={onHideSidebar}
      fetchAppointmentsByFilter={fetchAppointmentsByFilter}
      {...props}
    />
  );
  return { ...view, onStaffChange, onClientChange, onHideSidebar, fetchAppointmentsByFilter };
};

const names = () =>
  Array.from(document.body.querySelectorAll(".staff-client-name")).map((n) => n.textContent);
const counts = () =>
  Array.from(document.body.querySelectorAll(".staff-client-count")).map((n) => n.textContent);
const boxes = () => Array.from(document.body.querySelectorAll(".form-checkbox"));
const searchBox = () => document.body.querySelector(".input-search");
const title = () => document.body.querySelector(".staff-client-title").textContent;

const search = (term) => fireEvent.change(searchBox(), { target: { value: term } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the staff tab", () => {
  it("heads itself for staff and lists them with their counts", () => {
    renderFilter();
    expect(title()).toBe("View by Staff");
    expect(searchBox()).toHaveAttribute("placeholder", "Search staff");
    expect(names()).toEqual(["Ada Lovelace", "Grace Hopper"]);
    expect(counts()).toEqual(["3", "0"]);
  });

  it("shows a zero for a member with no count", () => {
    renderFilter({ staff: [{ id: "st-9", fullName: "Alan Turing" }] });
    expect(counts()).toEqual(["0"]);
  });

  it("ticks the members that are already selected", () => {
    renderFilter({ selectedStaff: ["st-2"] });
    expect(boxes()[0]).not.toBeChecked();
    expect(boxes()[1]).toBeChecked();
  });

  it("says so when there are no staff at all", () => {
    renderFilter({ staff: [] });
    expect(screen.getByText("No staff found")).toBeInTheDocument();
    expect(boxes()).toHaveLength(0);
  });

  it("says so when the staff list was never supplied", () => {
    renderFilter({ staff: undefined });
    expect(screen.getByText("No staff found")).toBeInTheDocument();
  });

  it("hides a member who has no name to match on", () => {
    renderFilter({ staff: [...STAFF, { id: "st-3" }] });
    expect(names()).toEqual(["Ada Lovelace", "Grace Hopper"]);
  });
});

describe("the clients tab", () => {
  const asClients = (props = {}) => renderFilter({ activeTab: "clients", ...props });

  it("heads itself for clients and lists them with their counts", () => {
    asClients();
    expect(title()).toBe("View by Clients");
    expect(searchBox()).toHaveAttribute("placeholder", "Search clients");
    expect(names()).toEqual(["Rosalind Franklin", "Katherine Johnson"]);
    expect(counts()).toEqual(["5", "1"]);
  });

  it("shows a zero for a client with no count", () => {
    asClients({ clients: [{ clientId: "cl-9", client: { firstName: "Solo" } }] });
    expect(counts()).toEqual(["0"]);
  });

  // Half a name is still a name; nothing at all falls back to a placeholder.
  it("assembles a name out of whichever half the record has", () => {
    asClients({
      clients: [
        { clientId: "cl-3", client: { firstName: "Onlyfirst" } },
        { clientId: "cl-4", client: { lastName: "Onlylast" } },
        { clientId: "cl-5", client: {} },
        { clientId: "cl-6" },
      ],
    });
    expect(names()).toEqual([
      "Onlyfirst",
      "Onlylast",
      "Unknown Client",
      "Unknown Client",
    ]);
  });

  it("ticks the clients that are already selected", () => {
    asClients({ selectedClients: ["cl-1"] });
    expect(boxes()[0]).toBeChecked();
    expect(boxes()[1]).not.toBeChecked();
  });

  it("says so when there are no clients at all", () => {
    asClients({ clients: [] });
    expect(screen.getByText("No clients found")).toBeInTheDocument();
  });

  it("says so when the client list was never supplied", () => {
    asClients({ clients: undefined });
    expect(screen.getByText("No clients found")).toBeInTheDocument();
  });
});

describe("the search box", () => {
  it("narrows the staff list, ignoring case", () => {
    renderFilter();
    search("ADA");
    expect(names()).toEqual(["Ada Lovelace"]);
  });

  it("says so when no member matches", () => {
    renderFilter();
    search("nobody");
    expect(screen.getByText("No staff found")).toBeInTheDocument();
  });

  it("narrows the client list on the assembled full name", () => {
    renderFilter({ activeTab: "clients" });
    search("johnson");
    expect(names()).toEqual(["Katherine Johnson"]);
  });

  it("says so when no client matches", () => {
    renderFilter({ activeTab: "clients" });
    search("nobody");
    expect(screen.getByText("No clients found")).toBeInTheDocument();
  });

  it("puts the whole list back when the search is cleared", () => {
    renderFilter();
    search("ada");
    expect(names()).toHaveLength(1);
    search("");
    expect(names()).toEqual(["Ada Lovelace", "Grace Hopper"]);
  });
});

describe("toggling a row", () => {
  it("adds a member to the fetch and reports the toggle to the parent", () => {
    const { onStaffChange, fetchAppointmentsByFilter } = renderFilter();
    fireEvent.click(boxes()[0]);
    expect(onStaffChange).toHaveBeenCalledWith("st-1");
    expect(fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: [],
      staffIds: ["st-1"],
    });
  });

  it("adds a member alongside the ones already selected", () => {
    const { fetchAppointmentsByFilter } = renderFilter({ selectedStaff: ["st-2"] });
    fireEvent.click(boxes()[0]);
    expect(fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: [],
      staffIds: ["st-2", "st-1"],
    });
  });

  // The fetch is sent the selection as it will be, not as it is, so unticking
  // a member has to leave them out of the ids while still reporting the toggle.
  it("drops a member from the fetch when they are unticked", () => {
    const { onStaffChange, fetchAppointmentsByFilter } = renderFilter({
      selectedStaff: ["st-1", "st-2"],
    });
    fireEvent.click(boxes()[0]);
    expect(onStaffChange).toHaveBeenCalledWith("st-1");
    expect(fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: [],
      staffIds: ["st-2"],
    });
  });

  it("adds a client to the fetch and reports the toggle to the parent", () => {
    const { onClientChange, fetchAppointmentsByFilter } = renderFilter({
      activeTab: "clients",
    });
    fireEvent.click(boxes()[1]);
    expect(onClientChange).toHaveBeenCalledWith("cl-2");
    expect(fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: ["cl-2"],
      staffIds: [],
    });
  });

  it("drops a client from the fetch when they are unticked", () => {
    const { onClientChange, fetchAppointmentsByFilter } = renderFilter({
      activeTab: "clients",
      selectedClients: ["cl-1", "cl-2"],
    });
    fireEvent.click(boxes()[0]);
    expect(onClientChange).toHaveBeenCalledWith("cl-1");
    expect(fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: ["cl-2"],
      staffIds: [],
    });
  });

  it("keeps a filtered-out row's selection out of the way of the toggle", () => {
    const { fetchAppointmentsByFilter } = renderFilter({ selectedStaff: ["st-2"] });
    search("ada");
    fireEvent.click(boxes()[0]);
    expect(fetchAppointmentsByFilter).toHaveBeenCalledWith({
      clientIds: [],
      staffIds: ["st-2", "st-1"],
    });
  });
});

describe("the sidebar", () => {
  it("hides itself from the close button", () => {
    const { onHideSidebar } = renderFilter();
    fireEvent.click(screen.getByRole("button", { name: "Close sidebar" }));
    expect(onHideSidebar).toHaveBeenCalledTimes(1);
  });
});
