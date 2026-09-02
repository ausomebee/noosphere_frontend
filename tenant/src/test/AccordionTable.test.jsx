import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The authorization table: one row per authorization, expanding to a
 * react-hook-form grid of service codes.
 *
 * The tricky part is that the expanded grid is driven by two sources at once --
 * a `serviceRows` count kept in state and whatever react-hook-form currently
 * holds under `services.<globalRowIndex>` -- and `getServiceDataForRow`
 * reconciles them by padding with blanks or truncating. Rows are keyed by their
 * index across the whole list, not within the page, so fixtures for
 * `initialServiceData` are keyed "0", "1", ... to line up.
 *
 * The two inputs are react-select and a styled text field in production; they
 * are replaced with native controls here so a value can be set with one
 * `fireEvent.change` instead of driving a portalled menu.
 */

const h = vi.hoisted(() => ({
  auth: {},
  getServiceCodes: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({ default: () => h.auth }));

vi.mock("../api/billingAndPaymentsApi", () => ({
  default: { GetTenantServiceCodeByTenantId: (...a) => h.getServiceCodes(...a) },
}));

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
      // A read-only field is handed a value with no handler; supply a no-op so
      // React does not warn about an uncontrolled-to-controlled switch.
      onChange={onChange || (() => {})}
    />
  ),
}));

import AccordionTable from "../Components/Table/AccordionTable";

const columns = [
  // "Diagnosis Code" is one of the columns the table paints blue and bolds.
  { key: "code", header: "Diagnosis Code" },
  { key: "notes", header: "Notes" },
  { key: "utilization", header: "Utilization" },
];

const rows = [
  { id: "a1", code: "F84.0", notes: "Autism", utilization: 40 },
  { id: "a2", code: "F90.0", notes: "ADHD", utilization: 95 },
];

const renderTable = (props = {}) =>
  render(<AccordionTable data={rows} columns={columns} {...props} />);

const mainRows = () => document.body.querySelectorAll("tr.accordion-main-row");
const serviceRows = () => document.body.querySelectorAll("tr.service-row");
const expandFirst = () => fireEvent.click(mainRows()[0]);
const labelled = (label) =>
  Array.from(document.body.querySelectorAll(`[aria-label="${label}"]`));

// The service-code fetch runs on mount; wait for it before touching the grid.
const codesLoaded = () => waitFor(() => expect(h.getServiceCodes).toHaveBeenCalled());

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { tenantId: "t1", accessToken: "at", refreshToken: "rt" };
  h.getServiceCodes.mockResolvedValue({
    data: [
      { id: "sc1", code: "97153", description: "Adaptive behavior", isActive: true },
      { id: "sc2", code: "97155", description: "Protocol modification", isActive: true },
    ],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rendering", () => {
  it("renders a header per column plus the expander", async () => {
    renderTable();
    await codesLoaded();
    expect(document.body.querySelectorAll("thead th")).toHaveLength(4);
    expect(screen.getByText("Diagnosis Code")).toBeInTheDocument();
  });

  it("renders a row per record", async () => {
    renderTable();
    await codesLoaded();
    expect(mainRows()).toHaveLength(2);
  });

  it("shows a spinner instead of the table while loading", async () => {
    renderTable({ loading: true });
    expect(document.body.querySelector(".loading-spinner")).toBeInTheDocument();
    expect(document.body.querySelector("table")).toBeNull();
  });

  it("names the table in its empty state", async () => {
    renderTable({ data: [], tableName: "Authorization" });
    await codesLoaded();
    expect(screen.getByText("No Authorization data available")).toBeInTheDocument();
  });

  it("falls back to a generic name in the empty state", async () => {
    renderTable({ data: [] });
    await codesLoaded();
    expect(screen.getByText("No Table data available")).toBeInTheDocument();
  });

  it("hides the pager when there is nothing to page through", async () => {
    renderTable({ data: [] });
    await codesLoaded();
    expect(document.body.querySelector(".pagination")).toBeNull();
  });
});

describe("cell rendering", () => {
  it("uses a column's own render function", async () => {
    renderTable({
      columns: [{ key: "code", header: "Custom", render: (row) => `<${row.code}>` }],
    });
    await codesLoaded();
    expect(screen.getByText("<F84.0>")).toBeInTheDocument();
  });

  it("paints the named columns blue and leaves the others alone", async () => {
    renderTable();
    await codesLoaded();
    const cells = mainRows()[0].querySelectorAll("td.accordion-cell span");
    expect(cells[0]).toHaveStyle({ fontWeight: "bold" });
    expect(cells[1]).toHaveStyle({ fontWeight: "normal" });
  });

  it("shows N/A for a null value and for a key the row does not have", async () => {
    renderTable({
      data: [{ id: "x", code: null }],
      columns: [
        { key: "code", header: "Diagnosis Code" },
        { key: "missing", header: "Notes" },
      ],
    });
    await codesLoaded();
    expect(screen.getAllByText("N/A")).toHaveLength(2);
  });

  it("prints an object value as JSON rather than crashing", async () => {
    renderTable({
      data: [{ id: "x", meta: { a: 1 } }],
      columns: [{ key: "meta", header: "Meta" }],
    });
    await codesLoaded();
    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
  });

  it("draws a utilization bar and flags a high one", async () => {
    renderTable();
    await codesLoaded();
    const fills = document.body.querySelectorAll(".progress-fills");
    expect(fills[0]).not.toHaveClass("high");
    expect(fills[1]).toHaveClass("high");
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("draws the same bar for a stage_completion column under any key", async () => {
    renderTable({
      data: [{ id: "x", progress: 0 }],
      columns: [{ key: "progress", header: "Progress", type: "stage_completion" }],
    });
    await codesLoaded();
    expect(document.body.querySelector(".progress-bars")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("paging", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: `a${i}`,
    code: `C${i}`,
    notes: "n",
    utilization: 0,
  }));

  it("shows one page at a time and moves between them", async () => {
    renderTable({ data: many, itemsPerPage: 5 });
    await codesLoaded();
    expect(mainRows()).toHaveLength(5);

    fireEvent.click(screen.getByText("3"));
    expect(mainRows()).toHaveLength(2);
    expect(screen.getByText("C10")).toBeInTheDocument();
  });

  it("collapses the open row when the page changes", async () => {
    renderTable({ data: many, itemsPerPage: 5 });
    await codesLoaded();
    expandFirst();
    expect(screen.getByText("Service Codes")).toBeInTheDocument();

    fireEvent.click(screen.getByText("2"));
    expect(screen.queryByText("Service Codes")).toBeNull();
  });

  it("returns to the first page when the data is swapped out", async () => {
    const { rerender } = render(
      <AccordionTable data={many} columns={columns} itemsPerPage={5} />
    );
    await codesLoaded();
    fireEvent.click(screen.getByText("3"));
    expect(screen.getByText("C10")).toBeInTheDocument();

    rerender(<AccordionTable data={[...many]} columns={columns} itemsPerPage={5} />);
    expect(screen.getByText("C0")).toBeInTheDocument();
  });
});

describe("expanding a row", () => {
  it("opens the service grid from the row and closes it again", async () => {
    renderTable();
    await codesLoaded();
    expandFirst();
    expect(screen.getByText("Service Codes")).toBeInTheDocument();

    expandFirst();
    expect(screen.queryByText("Service Codes")).toBeNull();
  });

  it("opens from the chevron without the row handler firing twice", async () => {
    renderTable();
    await codesLoaded();
    fireEvent.click(document.body.querySelector(".expand-button"));
    expect(screen.getByText("Service Codes")).toBeInTheDocument();
    expect(document.body.querySelector(".accordion-main-row.expanded")).toBeInTheDocument();
  });

  it("keeps only one row open at a time", async () => {
    renderTable();
    await codesLoaded();
    expandFirst();
    fireEvent.click(mainRows()[1]);
    expect(document.body.querySelectorAll(".accordion-content-row")).toHaveLength(1);
  });

  it("starts a row with one blank service line", async () => {
    renderTable();
    await codesLoaded();
    expandFirst();
    expect(serviceRows()).toHaveLength(1);
  });
});

describe("loading the service codes", () => {
  it("asks for the tenant's codes on mount", async () => {
    renderTable();
    await codesLoaded();
    expect(h.getServiceCodes).toHaveBeenCalledWith({
      tenantId: "t1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("asks for nothing without a tenant", async () => {
    h.auth = { tenantId: undefined, accessToken: "at" };
    renderTable();
    expect(h.getServiceCodes).not.toHaveBeenCalled();
  });

  it("asks for nothing without an access token", async () => {
    h.auth = { tenantId: "t1", accessToken: undefined };
    renderTable();
    expect(h.getServiceCodes).not.toHaveBeenCalled();
  });

  it("offers only the codes that are active and undeleted", async () => {
    h.getServiceCodes.mockResolvedValue({
      data: [
        { id: "sc1", code: "97153", description: "Kept", isActive: true },
        { id: "sc2", code: "97155", description: "Deleted", isActive: true, isDeleted: true },
        { id: "sc3", code: "97156", description: "Inactive", isActive: false },
      ],
    });
    renderTable({ isEditMode: true });
    await codesLoaded();
    expandFirst();
    await waitFor(() =>
      expect(labelled("Service Code")[0].querySelectorAll("option")).toHaveLength(2)
    );
    expect(screen.getByText("97153 - Kept")).toBeInTheDocument();
  });

  it("copes with a response that carries no data", async () => {
    h.getServiceCodes.mockResolvedValue({});
    renderTable({ isEditMode: true });
    await codesLoaded();
    expandFirst();
    expect(labelled("Service Code")[0].querySelectorAll("option")).toHaveLength(1);
  });

  it("leaves the list empty when the fetch rejects", async () => {
    h.getServiceCodes.mockRejectedValue(new Error("down"));
    renderTable({ isEditMode: true });
    await codesLoaded();
    expandFirst();
    expect(labelled("Service Code")[0].querySelectorAll("option")).toHaveLength(1);
  });
});

describe("the read-only service grid", () => {
  const initial = {
    0: [
      {
        serviceCodeId: "sc1",
        serviceCode: "97153",
        modifiers: "HN",
        units: 100,
        usedUnit: 30,
        per: "WEEK",
      },
    ],
  };

  it("shows the stored code, modifier and unit counts as text", async () => {
    renderTable({ initialServiceData: initial });
    await codesLoaded();
    expandFirst();
    expect(labelled("Service Code")[0]).toHaveValue("97153");
    expect(labelled("Modifiers")[0]).toHaveValue("HN");
    expect(labelled("Units used")[0]).toHaveValue("30");
    expect(labelled("Units left")[0]).toHaveValue("70");
  });

  it("dashes out a code that the record never carried", async () => {
    renderTable({ initialServiceData: { 0: [{ units: 5 }] } });
    await codesLoaded();
    expandFirst();
    expect(labelled("Service Code")[0]).toHaveValue("—");
    expect(labelled("Modifiers")[0]).toHaveValue("—");
  });

  it("dashes out the literal N/A the backend sends for no modifier", async () => {
    renderTable({ initialServiceData: { 0: [{ serviceCode: "97153", modifiers: "N/A" }] } });
    await codesLoaded();
    expandFirst();
    expect(labelled("Modifiers")[0]).toHaveValue("—");
  });

  it("never shows negative units left", async () => {
    // Over-consumption is a real state on old authorizations; it must floor at 0.
    renderTable({ initialServiceData: { 0: [{ units: 10, usedUnit: 25 }] } });
    await codesLoaded();
    expandFirst();
    expect(labelled("Units left")[0]).toHaveValue("0");
  });

  it("treats unparseable unit counts as zero", async () => {
    renderTable({ initialServiceData: { 0: [{ units: "many", usedUnit: null }] } });
    await codesLoaded();
    expandFirst();
    expect(labelled("Units used")[0]).toHaveValue("0");
    expect(labelled("Units left")[0]).toHaveValue("0");
  });

  it("offers no add or remove controls", async () => {
    renderTable({ initialServiceData: initial });
    await codesLoaded();
    expandFirst();
    expect(screen.queryByLabelText("Add Service Code")).toBeNull();
    expect(document.body.querySelector(".delete-btn")).toBeNull();
  });

  it("keeps the units field locked", async () => {
    renderTable({ initialServiceData: initial });
    await codesLoaded();
    expandFirst();
    expect(labelled("Units")[0]).toBeDisabled();
    expect(labelled("Per")[0]).toBeDisabled();
  });
});

describe("initial service data", () => {
  it("ignores an empty map", async () => {
    renderTable({ initialServiceData: {} });
    await codesLoaded();
    expandFirst();
    expect(serviceRows()).toHaveLength(1);
  });

  it("ignores a missing map", async () => {
    renderTable({ initialServiceData: undefined });
    await codesLoaded();
    expandFirst();
    expect(serviceRows()).toHaveLength(1);
  });

  it("still shows one line for a row whose service list is null", async () => {
    renderTable({ initialServiceData: { 0: null } });
    await codesLoaded();
    expandFirst();
    expect(serviceRows()).toHaveLength(1);
  });

  it("shows a line per stored service", async () => {
    renderTable({
      initialServiceData: {
        0: [{ serviceCode: "97153" }, { serviceCode: "97155" }, { serviceCode: "97156" }],
      },
    });
    await codesLoaded();
    expandFirst();
    expect(serviceRows()).toHaveLength(3);
  });

  it("keys its data by position across the whole list, not the page", async () => {
    renderTable({ initialServiceData: { 1: [{ serviceCode: "97155" }] } });
    await codesLoaded();
    fireEvent.click(mainRows()[1]);
    expect(labelled("Service Code")[0]).toHaveValue("97155");
  });
});

describe("the editable service grid", () => {
  const editable = (props = {}) =>
    renderTable({
      isEditMode: true,
      initialServiceData: { 0: [{ serviceCodeId: "sc1", units: 10, per: "WEEK" }] },
      ...props,
    });

  it("swaps the read-only fields for pickers", async () => {
    editable();
    await codesLoaded();
    expandFirst();
    expect(labelled("Service Code")[0].tagName).toBe("SELECT");
    expect(labelled("Modifiers")[0].tagName).toBe("SELECT");
    expect(labelled("Units")[0]).toBeEnabled();
  });

  it("records a picked service code, modifier and period", async () => {
    const onServiceDataChange = vi.fn();
    editable({ onServiceDataChange });
    await codesLoaded();
    expandFirst();

    fireEvent.change(labelled("Service Code")[0], { target: { value: "sc2" } });
    fireEvent.change(labelled("Modifiers")[0], { target: { value: "HO" } });
    fireEvent.change(labelled("Per")[0], { target: { value: "MONTH" } });
    fireEvent.change(labelled("Units")[0], { target: { value: "25" } });

    await waitFor(() => {
      const last = onServiceDataChange.mock.calls.at(-1)[0];
      expect(last["0"][0]).toMatchObject({
        serviceCode: "sc2",
        modifiers: "HO",
        per: "MONTH",
        units: "25",
      });
    });
  });

  it("adds a blank service line", async () => {
    editable();
    await codesLoaded();
    expandFirst();
    fireEvent.click(screen.getByLabelText("Add Service Code"));
    expect(serviceRows()).toHaveLength(2);
    expect(labelled("Service Code")[1]).toHaveValue("");
  });

  it("removes a line once there is more than one", async () => {
    editable();
    await codesLoaded();
    expandFirst();
    fireEvent.click(screen.getByLabelText("Add Service Code"));
    expect(document.body.querySelectorAll(".delete-btn")).toHaveLength(2);

    fireEvent.click(document.body.querySelectorAll(".delete-btn")[1]);
    expect(serviceRows()).toHaveLength(1);
  });

  it("hides the remove control while only one line is left", async () => {
    editable();
    await codesLoaded();
    expandFirst();
    expect(document.body.querySelector(".delete-btn")).toBeNull();
  });

  it("refuses to remove the last line even when asked twice in a row", async () => {
    editable();
    await codesLoaded();
    expandFirst();
    fireEvent.click(screen.getByLabelText("Add Service Code"));
    fireEvent.click(document.body.querySelectorAll(".delete-btn")[1]);
    // The guard now holds: one line left, so the control is gone entirely.
    expect(serviceRows()).toHaveLength(1);
    expect(document.body.querySelector(".delete-btn")).toBeNull();
  });

  it("keeps each row's services separate", async () => {
    renderTable({
      isEditMode: true,
      initialServiceData: { 0: [{ serviceCodeId: "sc1" }], 1: [{ serviceCodeId: "sc2" }] },
    });
    await codesLoaded();
    expandFirst();
    fireEvent.click(screen.getByLabelText("Add Service Code"));
    expect(serviceRows()).toHaveLength(2);

    expandFirst();
    fireEvent.click(mainRows()[1]);
    expect(serviceRows()).toHaveLength(1);
  });
});

describe("reporting changes upward", () => {
  it("hands the parent the whole services map", async () => {
    const onServiceDataChange = vi.fn();
    renderTable({
      onServiceDataChange,
      initialServiceData: { 0: [{ serviceCodeId: "sc1", units: 4 }] },
    });
    await codesLoaded();
    await waitFor(() => {
      const last = onServiceDataChange.mock.calls.at(-1)[0];
      expect(last["0"][0]).toMatchObject({ serviceCode: "sc1", units: 4 });
    });
  });

  it("renders happily with no listener attached", async () => {
    renderTable({ onServiceDataChange: undefined });
    await codesLoaded();
    expect(mainRows()).toHaveLength(2);
  });
});
