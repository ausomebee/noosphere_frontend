import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The editable authorization table used on the payer screens.
 *
 * Unlike its sibling this one owns nothing: service codes, the row actions and
 * the save handler all arrive as props, and its form state is keyed by the
 * authorization's own id rather than by row position. Three things are worth
 * knowing before reading the tests. The row-action menu positions itself from
 * `getBoundingClientRect`, which jsdom always answers with zeroes, so the tests
 * that care about placement stub it. The menu closes on a `mousedown` anywhere
 * outside `.robust-action-cell`, not on click. And the Save button only appears
 * once react-hook-form has seen a change, so every save test edits a field
 * first.
 *
 * The react-select and text inputs are replaced with native controls so a value
 * can be set with one `fireEvent.change`.
 */

const h = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => h.showToast(...a) }));

vi.mock("../Components/Input/Inputs", () => ({
  SelectInput: ({ label, name, value, onChange, options = [], isDisabled, disabled }) => (
    <select
      aria-label={label}
      data-name={name}
      value={value ?? ""}
      disabled={isDisabled || disabled || false}
      onChange={(e) => onChange?.({ target: { name, value: e.target.value } })}
    >
      <option value="">--</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
  TextInput: ({ label, name, value, onChange, type = "text", disabled, readOnly, placeholder }) => (
    <input
      aria-label={label}
      data-name={name}
      type={type}
      placeholder={placeholder}
      value={value ?? ""}
      disabled={disabled || false}
      readOnly={readOnly || false}
      onChange={onChange || (() => {})}
    />
  ),
}));

import AccordionTableRobust from "../Components/Table/AccordionTableRobust";

const columns = [
  { key: "authNumber", header: "Authorization" },
  { key: "utilization", header: "Utilization" },
];

const rows = [
  { id: "auth-1", authNumber: "A-001", utilization: 40, isActive: true },
  { id: "auth-2", authNumber: "A-002", utilization: 95, isActive: false },
];

const serviceCodes = [
  { value: "sc1", label: "97153 - Adaptive behavior" },
  { value: "sc2", label: "97155 - Protocol modification" },
];

const service = (over = {}) => ({
  serviceCode: "sc1",
  serviceCodeShort: "97153",
  modifier: "HN",
  units: 100,
  usedUnits: 30,
  per: "WEEK",
  utilization: 30,
  ...over,
});

const renderTable = (props = {}) =>
  render(
    <AccordionTableRobust
      data={rows}
      columns={columns}
      serviceCodes={serviceCodes}
      initialServiceData={{ "auth-1": [service()], "auth-2": [service()] }}
      {...props}
    />
  );

const mainRows = () => document.body.querySelectorAll("tr.robust-main-row");
const serviceLines = () => document.body.querySelectorAll(".robust-service-row");
const labelled = (label) =>
  Array.from(document.body.querySelectorAll(`[aria-label="${label}"]`));
const expandFirst = () => fireEvent.click(mainRows()[0]);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rendering", () => {
  it("renders a header per column plus the expander and the action column", () => {
    renderTable();
    expect(document.body.querySelectorAll("thead th")).toHaveLength(4);
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("renders an empty table when it is given nothing", () => {
    render(<AccordionTableRobust />);
    expect(mainRows()).toHaveLength(0);
    expect(document.body.querySelectorAll("thead th")).toHaveLength(2);
  });

  it("prints a plain cell value and lets a column render its own", () => {
    renderTable({
      columns: [
        { key: "authNumber", header: "Authorization" },
        { key: "authNumber", header: "Custom", render: (row) => `<${row.authNumber}>` },
      ],
    });
    expect(screen.getByText("A-001")).toBeInTheDocument();
    expect(screen.getByText("<A-001>")).toBeInTheDocument();
  });

  it.each([
    ["blue below seventy", 40, "rgb(0, 74, 186)"],
    ["amber from seventy", 75, "rgb(247, 144, 9)"],
    ["red from ninety", 95, "rgb(217, 45, 32)"],
  ])("colours the utilization bar %s", (_band, utilization, colour) => {
    renderTable({ data: [{ id: "auth-1", authNumber: "A", utilization }] });
    expect(document.body.querySelector(".robust-utilization-column-fill")).toHaveStyle({
      backgroundColor: colour,
    });
  });

  it("averages the services' utilization when the row carries none", () => {
    renderTable({
      data: [{ id: "auth-1", authNumber: "A", utilization: 0 }],
      initialServiceData: {
        "auth-1": [service({ utilization: 40 }), service({ utilization: 60 })],
      },
    });
    expect(document.body.querySelector(".robust-utilization-column-text")).toHaveTextContent(
      "50%"
    );
  });

  it("falls back to nothing when a row has neither its own figure nor services", () => {
    renderTable({
      data: [{ id: "auth-9", authNumber: "A", utilization: 0 }],
      initialServiceData: {},
    });
    expect(document.body.querySelector(".robust-utilization-column-text")).toHaveTextContent(
      "0%"
    );
  });

  it("treats a service with no utilization figure as zero in the average", () => {
    renderTable({
      data: [{ id: "auth-1", authNumber: "A", utilization: 0 }],
      initialServiceData: {
        "auth-1": [service({ utilization: undefined }), service({ utilization: 80 })],
      },
    });
    expect(document.body.querySelector(".robust-utilization-column-text")).toHaveTextContent(
      "40%"
    );
  });
});

describe("the row action menu", () => {
  const handlers = { onEdit: vi.fn(), onDeactivate: vi.fn(), onDelete: vi.fn() };

  it("offers no menu at all when no action was wired up", () => {
    renderTable();
    expect(document.body.querySelector(".robust-action-dots")).toBeNull();
  });

  it("opens and closes on the same button", () => {
    renderTable(handlers);
    const dots = document.body.querySelectorAll(".robust-action-dots")[0];
    fireEvent.click(dots);
    expect(document.body.querySelector(".robust-dropdown")).toBeInTheDocument();

    fireEvent.click(dots);
    expect(document.body.querySelector(".robust-dropdown")).toBeNull();
  });

  it("does not expand the row underneath it", () => {
    renderTable(handlers);
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    expect(document.body.querySelector(".robust-content-row")).toBeNull();
  });

  it("closes when a mousedown lands outside the cell", () => {
    renderTable(handlers);
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    fireEvent.mouseDown(document.body);
    expect(document.body.querySelector(".robust-dropdown")).toBeNull();
  });

  it("stays open for a mousedown inside the cell", () => {
    renderTable(handlers);
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    fireEvent.mouseDown(document.body.querySelector(".robust-dropdown"));
    expect(document.body.querySelector(".robust-dropdown")).toBeInTheDocument();
  });

  it("drops the menu below the button when there is room", () => {
    renderTable(handlers);
    const dots = document.body.querySelectorAll(".robust-action-dots")[0];
    dots.getBoundingClientRect = () => ({ top: 100, bottom: 120, right: 500, left: 480 });
    fireEvent.click(dots);
    const menu = document.body.querySelector(".robust-dropdown");
    expect(menu).toHaveStyle({ top: "124px", left: "280px" });
  });

  it("flips the menu above the button when it would fall off the bottom", () => {
    renderTable(handlers);
    const dots = document.body.querySelectorAll(".robust-action-dots")[0];
    dots.getBoundingClientRect = () => ({
      top: window.innerHeight - 20,
      bottom: window.innerHeight - 5,
      right: 500,
      left: 480,
    });
    fireEvent.click(dots);
    expect(document.body.querySelector(".robust-dropdown")).toHaveStyle({
      top: `${window.innerHeight - 20 - 130 - 4}px`,
    });
  });

  it("pins the menu to the left edge rather than off-screen", () => {
    renderTable(handlers);
    const dots = document.body.querySelectorAll(".robust-action-dots")[0];
    dots.getBoundingClientRect = () => ({ top: 10, bottom: 30, right: 100, left: 80 });
    fireEvent.click(dots);
    expect(document.body.querySelector(".robust-dropdown")).toHaveStyle({ left: "4px" });
  });

  it("runs edit and closes", () => {
    const onEdit = vi.fn();
    renderTable({ onEdit });
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    fireEvent.click(screen.getByText("Edit Authorization"));
    expect(onEdit).toHaveBeenCalledWith(rows[0]);
    expect(document.body.querySelector(".robust-dropdown")).toBeNull();
  });

  it("offers to deactivate an active authorization and to activate an inactive one", () => {
    const onDeactivate = vi.fn();
    renderTable({ onDeactivate });
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    expect(screen.getByText("Deactivate Authorization")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Deactivate Authorization"));
    expect(onDeactivate).toHaveBeenCalledWith(rows[0]);

    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[1]);
    expect(screen.getByText("Activate Authorization")).toBeInTheDocument();
  });

  it("runs delete and closes", () => {
    const onDelete = vi.fn();
    renderTable({ onDelete });
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    fireEvent.click(screen.getByText("Delete Authorization"));
    expect(onDelete).toHaveBeenCalledWith(rows[0]);
    expect(document.body.querySelector(".robust-dropdown")).toBeNull();
  });

  it("shows only the actions that were wired up", () => {
    renderTable({ onDelete: vi.fn() });
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    expect(screen.queryByText("Edit Authorization")).toBeNull();
    expect(screen.queryByText(/Deactivate/)).toBeNull();
    expect(screen.getByText("Delete Authorization")).toBeInTheDocument();
  });
});

describe("expanding a row", () => {
  it("opens the service list and closes it again", () => {
    renderTable();
    expandFirst();
    expect(screen.getByText("Service Codes (1)")).toBeInTheDocument();

    expandFirst();
    expect(screen.queryByText("Service Codes (1)")).toBeNull();
  });

  it("opens from the chevron", () => {
    renderTable();
    fireEvent.click(document.body.querySelector(".robust-expand-btn"));
    expect(document.body.querySelector(".robust-content-row")).toBeInTheDocument();
  });

  it("keeps only one row open", () => {
    renderTable();
    expandFirst();
    fireEvent.click(mainRows()[1]);
    expect(document.body.querySelectorAll(".robust-content-row")).toHaveLength(1);
  });

  it("says so when an authorization has no service codes", () => {
    renderTable({ initialServiceData: { "auth-1": [] } });
    expandFirst();
    expect(screen.getByText("No service codes assigned")).toBeInTheDocument();
    expect(screen.getByText("Service Codes (0)")).toBeInTheDocument();
  });
});

describe("the read-only service line", () => {
  it("shows the short code, the modifier and the unit counts", () => {
    renderTable();
    expandFirst();
    expect(labelled("Service code")[0]).toHaveValue("97153");
    expect(labelled("Modifiers")[0]).toHaveValue("HN");
    expect(labelled("Units used")[0]).toHaveValue("30");
    expect(labelled("Units left")[0]).toHaveValue("70");
  });

  it("falls back to the long display code when there is no short one", () => {
    renderTable({
      initialServiceData: {
        "auth-1": [service({ serviceCodeShort: undefined, serviceCodeDisplay: "97153 - Long" })],
      },
    });
    expandFirst();
    expect(labelled("Service code")[0]).toHaveValue("97153 - Long");
  });

  it("dashes out a line that carries neither code nor modifier", () => {
    renderTable({
      initialServiceData: {
        "auth-1": [
          service({ serviceCodeShort: undefined, serviceCodeDisplay: undefined, modifier: "" }),
        ],
      },
    });
    expandFirst();
    expect(labelled("Service code")[0]).toHaveValue("—");
    expect(labelled("Modifiers")[0]).toHaveValue("—");
  });

  it("never shows negative units left", () => {
    renderTable({ initialServiceData: { "auth-1": [service({ units: 10, usedUnits: 25 })] } });
    expandFirst();
    expect(labelled("Units left")[0]).toHaveValue("0");
  });

  it("treats missing unit counts as zero", () => {
    renderTable({
      initialServiceData: { "auth-1": [service({ units: undefined, usedUnits: undefined })] },
    });
    expandFirst();
    expect(labelled("Units used")[0]).toHaveValue("0");
    expect(labelled("Units left")[0]).toHaveValue("0");
  });

  it("shows the per-service utilization, defaulting to zero", () => {
    renderTable({
      initialServiceData: {
        "auth-1": [service({ utilization: 85 }), service({ utilization: undefined })],
      },
    });
    expandFirst();
    const texts = Array.from(
      document.body.querySelectorAll(".robust-utilization-text")
    ).map((n) => n.textContent);
    expect(texts).toEqual(["85%", "0%"]);
  });

  it("locks the editable fields and offers no add or remove", () => {
    renderTable();
    expandFirst();
    expect(labelled("Units")[0]).toBeDisabled();
    expect(labelled("Per")[0]).toBeDisabled();
    expect(screen.queryByLabelText("Add Service Code")).toBeNull();
    expect(document.body.querySelector(".robust-remove-btn")).toBeNull();
  });
});

describe("editing the service lines", () => {
  const editable = (props = {}) => renderTable({ isEditMode: true, ...props });

  it("swaps the read-only fields for pickers", () => {
    editable();
    expandFirst();
    expect(labelled("Service code")[0].tagName).toBe("SELECT");
    expect(labelled("Modifiers")[0].tagName).toBe("SELECT");
    expect(labelled("Units")[0]).toBeEnabled();
  });

  it("reports an edited value to the parent", async () => {
    const onServiceDataChange = vi.fn();
    editable({ onServiceDataChange });
    expandFirst();
    fireEvent.change(labelled("Units")[0], { target: { value: "55" } });

    await waitFor(() => {
      const last = onServiceDataChange.mock.calls.at(-1)[0];
      expect(last["auth-1"][0].units).toBe("55");
    });
  });

  it("adds a blank line", () => {
    editable();
    expandFirst();
    fireEvent.click(screen.getByLabelText("Add Service Code"));
    expect(serviceLines()).toHaveLength(2);
    expect(screen.getByText("Service Codes (2)")).toBeInTheDocument();
  });

  it("removes a line once there is more than one", () => {
    editable();
    expandFirst();
    fireEvent.click(screen.getByLabelText("Add Service Code"));
    fireEvent.click(document.body.querySelectorAll(".robust-remove-btn")[1]);
    expect(serviceLines()).toHaveLength(1);
  });

  it("offers no remove control while a single line is left", () => {
    editable();
    expandFirst();
    expect(document.body.querySelector(".robust-remove-btn")).toBeNull();
  });
});

describe("saving", () => {
  const openAndDirty = (props = {}) => {
    renderTable({ isEditMode: true, ...props });
    expandFirst();
    fireEvent.change(labelled("Units")[0], { target: { value: "55" } });
  };

  it("keeps the save button hidden until something changes", () => {
    renderTable({ isEditMode: true });
    expandFirst();
    expect(screen.queryByLabelText("Save Changes")).toBeNull();
  });

  it("keeps the save button hidden outside edit mode", () => {
    renderTable();
    expandFirst();
    fireEvent.change(labelled("Units")[0], { target: { value: "55" } });
    expect(screen.queryByLabelText("Save Changes")).toBeNull();
  });

  it("hands the parent the edited services keyed by authorization", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openAndDirty({ onSave });
    fireEvent.click(await screen.findByLabelText("Save Changes"));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        "auth-1": [expect.objectContaining({ units: "55", serviceCode: "sc1" })],
      })
    );
  });

  it("hides the save button again once the change is saved", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openAndDirty({ onSave });
    fireEvent.click(await screen.findByLabelText("Save Changes"));
    await waitFor(() => expect(screen.queryByLabelText("Save Changes")).toBeNull());
  });

  it("leaves the button in place when the parent's save throws", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    openAndDirty({ onSave });
    fireEvent.click(await screen.findByLabelText("Save Changes"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(await screen.findByLabelText("Save Changes")).toBeInTheDocument();
  });

  it("still clears the change flag when no save handler was given", async () => {
    openAndDirty();
    fireEvent.click(await screen.findByLabelText("Save Changes"));
    await waitFor(() => expect(screen.queryByLabelText("Save Changes")).toBeNull());
  });

  it.each([
    ["no service code is chosen", { serviceCode: "" }],
    ["the units are blank", { units: "" }],
    ["the units are zero", { units: "0" }],
  ])("refuses to save when %s", async (_why, over) => {
    const onSave = vi.fn();
    renderTable({
      isEditMode: true,
      onSave,
      initialServiceData: { "auth-1": [service(over)] },
    });
    expandFirst();
    // Touch a field the guard does not read, so the button appears without
    // repairing the value under test.
    fireEvent.change(labelled("Per")[0], { target: { value: "DAY" } });
    fireEvent.click(await screen.findByLabelText("Save Changes"));

    await waitFor(() =>
      expect(h.showToast).toHaveBeenCalledWith(
        "Please fill service code and units for all rows",
        "warning"
      )
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("paging", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: `auth-${i}`,
    authNumber: `A-${i}`,
    utilization: 0,
  }));

  it("hides the pager while everything fits on one page", () => {
    renderTable();
    expect(document.body.querySelector(".pagination")).toBeNull();
  });

  it("shows one page at a time and moves between them", () => {
    renderTable({ data: many, itemsPerPage: 5, initialServiceData: {} });
    expect(mainRows()).toHaveLength(5);

    fireEvent.click(screen.getByText("3"));
    expect(mainRows()).toHaveLength(2);
    expect(screen.getByText("A-10")).toBeInTheDocument();
  });

  it("collapses the open row and the menu when the page changes", () => {
    renderTable({
      data: many,
      itemsPerPage: 5,
      initialServiceData: {},
      onEdit: vi.fn(),
    });
    expandFirst();
    fireEvent.click(document.body.querySelectorAll(".robust-action-dots")[0]);
    expect(document.body.querySelector(".robust-dropdown")).toBeInTheDocument();

    fireEvent.click(screen.getByText("2"));
    expect(document.body.querySelector(".robust-content-row")).toBeNull();
    expect(document.body.querySelector(".robust-dropdown")).toBeNull();
  });

  it("returns to the first page when the data is swapped out", () => {
    const { rerender } = render(
      <AccordionTableRobust data={many} columns={columns} itemsPerPage={5} />
    );
    fireEvent.click(screen.getByText("3"));
    expect(screen.getByText("A-10")).toBeInTheDocument();

    rerender(<AccordionTableRobust data={[...many]} columns={columns} itemsPerPage={5} />);
    expect(screen.getByText("A-0")).toBeInTheDocument();
  });
});

describe("reloading from the parent", () => {
  it("takes on a new set of services when the parent hands one down", () => {
    const { rerender } = render(
      <AccordionTableRobust
        data={rows}
        columns={columns}
        initialServiceData={{ "auth-1": [service({ serviceCodeShort: "97153" })] }}
      />
    );
    expandFirst();
    expect(labelled("Service code")[0]).toHaveValue("97153");

    rerender(
      <AccordionTableRobust
        data={rows}
        columns={columns}
        initialServiceData={{
          "auth-1": [service({ serviceCodeShort: "97155" }), service({ serviceCodeShort: "97156" })],
        }}
      />
    );
    expect(serviceLines()).toHaveLength(2);
    expect(labelled("Service code")[0]).toHaveValue("97155");
  });

  it("ignores a re-render that carries the same services", () => {
    const { rerender } = render(
      <AccordionTableRobust
        data={rows}
        columns={columns}
        isEditMode
        initialServiceData={{ "auth-1": [service()] }}
      />
    );
    expandFirst();
    fireEvent.change(labelled("Units")[0], { target: { value: "55" } });
    expect(screen.getByLabelText("Save Changes")).toBeInTheDocument();

    // Same content, new object identity -- the guard compares by value, so the
    // pending edit must survive.
    rerender(
      <AccordionTableRobust
        data={rows}
        columns={columns}
        isEditMode
        initialServiceData={{ "auth-1": [service()] }}
      />
    );
    expect(screen.getByLabelText("Save Changes")).toBeInTheDocument();
    expect(labelled("Units")[0]).toHaveValue(55);
  });

  it("renders happily with no change listener attached", () => {
    renderTable({ onServiceDataChange: undefined });
    expect(mainRows()).toHaveLength(2);
  });
});
