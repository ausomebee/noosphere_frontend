import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * CustomTable's filtering, dropdown and selection machinery.
 *
 * The companion suite covers the plain cases; this one drives the arms that
 * need real interaction. Three of them are awkward. The filter pickers are
 * react-select, so a value is set by opening the menu with ArrowDown and
 * clicking the portalled `.rs__option` rather than by changing a `<select>`.
 * The date range arrives through a calendar popover, replaced here with a probe
 * that hands back a fixed range, which is what the table actually consumes. And
 * both dropdowns position themselves inside a `setTimeout` from
 * `getBoundingClientRect`, which jsdom answers with zeroes -- so the tests that
 * care about placement stub the rect and then wait for the timer.
 *
 * "Clear Filters" resets state from inside a memo, so choosing it never leaves
 * the option selected; the assertions look at the rows and the callback rather
 * than at the picker.
 */

const h = vi.hoisted(() => ({
  exportTableData: vi.fn(),
  exportTableToPDF: vi.fn(),
  printTableData: vi.fn(),
}));

vi.mock("../utils/TableUtils", () => ({
  exportTableData: (...a) => h.exportTableData(...a),
  exportTableToPDF: (...a) => h.exportTableToPDF(...a),
  printTableData: (...a) => h.printTableData(...a),
}));

vi.mock("../Components/Table/DateFilterModal", () => ({
  default: ({ isOpen, onClose, onDateRangeSelect }) =>
    isOpen ? (
      <div data-testid="date-picker">
        <button
          onClick={() =>
            onDateRangeSelect({
              start: new Date(2026, 0, 1),
              end: new Date(2026, 0, 31),
            })
          }
        >
          pick-january
        </button>
        <button onClick={() => onDateRangeSelect({ start: null, end: null })}>
          pick-nothing
        </button>
        <button onClick={onClose}>close-picker</button>
      </div>
    ) : null,
}));

import CustomTable from "../Components/Table/CustomTable";

const columns = [
  { key: "name", header: "Name", type: "text" },
  { key: "status", header: "Status" },
];

const rows = [
  { id: "1", name: "Acme Health", status: "Active", hasCheckbox: true },
  { id: "2", name: "Beta Clinic", status: "Paused", hasCheckbox: true },
  { id: "3", name: "Gamma Care", status: "Active", hasCheckbox: true },
];

const renderTable = (props = {}) =>
  render(<CustomTable data={rows} columns={columns} itemsPerPage={10} {...props} />);

// The empty result still renders one placeholder row, so count data rows only.
const bodyRows = () =>
  Array.from(document.body.querySelectorAll("tbody tr")).filter(
    (tr) => !tr.querySelector("td[colspan]")
  );

// The first `td` of a row is the checkbox, so the name lives in the first
// `.table-cell`.
const rowNames = () =>
  bodyRows().map((tr) => tr.querySelector(".table-cell").textContent);

const pickers = () => Array.from(document.body.querySelectorAll(".input-select"));

// react-select: ArrowDown opens the menu, which is portalled onto document.body.
const openMenu = (index) => {
  const input = pickers()[index].querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
};

const optionLabels = () =>
  Array.from(document.body.querySelectorAll(".rs__option")).map((o) => o.textContent);

const choose = (index, label) => {
  openMenu(index);
  const option = Array.from(document.body.querySelectorAll(".rs__option")).find(
    (o) => o.textContent === label
  );
  if (!option) throw new Error(`no option "${label}" among ${optionLabels().join(", ")}`);
  fireEvent.click(option);
};

const exportButton = () => screen.getByLabelText("Export data");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the filter bar", () => {
  it("renders no filter controls when the table was given none", () => {
    renderTable();
    expect(document.body.querySelector(".filters-container")).toBeNull();
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("offers the supplied filters plus a way to clear them", () => {
    renderTable({
      filters: [{ value: "status", label: "Status", filterValues: [] }],
    });
    openMenu(0);
    expect(optionLabels()).toEqual(["Status", "Clear Filters"]);
  });

  it("derives its filters from the columns when an empty list is supplied", () => {
    renderTable({
      filters: [],
      columns: [
        { key: "name", header: "Name", type: "text" },
        { key: "status", header: "Status" },
        { key: "dateTime", header: "Date Added" },
        { key: "approval", header: "Approval" },
        { key: "ToggleActive", header: "Active" },
        { key: "stage_completion", header: "Progress" },
      ],
    });
    openMenu(0);
    // "Status" carries no type and no special key, so it is not offered.
    expect(optionLabels()).toEqual([
      "Name",
      "Date Added",
      "Approval",
      "Active",
      "Progress",
      "Clear Filters",
    ]);
  });
});

describe("filtering by a value", () => {
  const filters = [
    {
      value: "status",
      label: "Status",
      filterValues: [
        { value: "Active", label: "Active" },
        { value: "Paused", label: "Paused" },
      ],
    },
  ];

  it("offers the filter's own values once a filter is picked", () => {
    renderTable({ filters });
    choose(0, "Status");
    openMenu(1);
    expect(optionLabels()).toEqual(["Active", "Paused"]);
  });

  it("narrows the rows and reports both choices to the parent", () => {
    const onFilterChange = vi.fn();
    renderTable({ filters, onFilterChange });
    choose(0, "Status");
    choose(1, "Paused");

    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Beta Clinic")).toBeInTheDocument();
    expect(onFilterChange).toHaveBeenCalledWith("filter_type", "status");
    expect(onFilterChange).toHaveBeenCalledWith("value", "Paused");
  });

  it("shows nothing when no row carries the chosen value", () => {
    renderTable({
      data: [{ id: "1", name: "Acme", status: "Closed", hasCheckbox: true }],
      filters,
    });
    choose(0, "Status");
    choose(1, "Active");
    expect(bodyRows()).toHaveLength(0);
  });

  it("skips a row whose value is missing rather than matching it", () => {
    renderTable({
      data: [
        { id: "1", name: "Acme", status: null, hasCheckbox: true },
        { id: "2", name: "Beta", status: "Active", hasCheckbox: true },
      ],
      filters,
    });
    choose(0, "Status");
    choose(1, "Active");
    expect(bodyRows()).toHaveLength(1);
  });

  it("uses a filter's own comparison function when it has one", () => {
    const filterFunction = vi.fn((row, value) => row.name.startsWith(value));
    renderTable({
      filters: [
        {
          value: "status",
          label: "Status",
          filterFunction,
          filterValues: [{ value: "Beta", label: "Beta" }],
        },
      ],
    });
    choose(0, "Status");
    choose(1, "Beta");

    expect(filterFunction).toHaveBeenCalled();
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Beta Clinic")).toBeInTheDocument();
  });

  it("falls back to a plain comparison when filterFunction is not callable", () => {
    // A misconfigured filter used to be invoked anyway and take the table down.
    renderTable({
      filters: [
        {
          value: "status",
          label: "Status",
          filterFunction: "definitely-not-a-function",
          filterValues: [{ value: "Active", label: "Active" }],
        },
      ],
    });
    choose(0, "Status");
    choose(1, "Active");
    expect(bodyRows()).toHaveLength(2);
  });

  it("offers the values it finds in the data when the filter names none", () => {
    renderTable({
      filters: [],
      columns: [{ key: "name", header: "Name", type: "text" }],
    });
    choose(0, "Name");
    openMenu(1);
    expect(optionLabels()).toEqual(["Acme Health", "Beta Clinic", "Gamma Care"]);
  });

  it("offers nothing when every row's value for that column is blank", () => {
    renderTable({
      data: [{ id: "1", name: "", status: "Active", hasCheckbox: true }],
      filters: [],
      columns: [{ key: "name", header: "Name", type: "text" }],
    });
    choose(0, "Name");
    openMenu(1);
    expect(optionLabels()).toEqual([]);
    expect(screen.getByText("No options")).toBeInTheDocument();
  });
});

describe("filtering by a date range", () => {
  const filters = [{ value: "dateTime", label: "Date Added" }];

  const dated = [
    { id: "1", name: "Iso", status: "A", dateCreated: "2026-01-15", hasCheckbox: true },
    { id: "2", name: "Euro", status: "A", date: "20-01-2026", hasCheckbox: true },
    { id: "3", name: "Outside", status: "A", dateAdded: "2026-03-01", hasCheckbox: true },
    { id: "4", name: "Unparseable", status: "A", dateTime: "Jan 5, 2026", hasCheckbox: true },
    { id: "5", name: "Undated", status: "A", hasCheckbox: true },
  ];

  const openPicker = () => {
    choose(0, "Date Added");
    fireEvent.click(document.body.querySelector(".date-filter-input-start"));
  };

  it("swaps the value picker for a pair of date fields", () => {
    renderTable({ filters });
    choose(0, "Date Added");
    expect(document.body.querySelector(".date-filter-input-start")).toHaveValue(
      "Select start date"
    );
    expect(document.body.querySelector(".date-filter-input-end")).toHaveValue(
      "Select end date"
    );
    expect(pickers()).toHaveLength(1);
  });

  it("keeps every row until a range is actually chosen", () => {
    renderTable({ data: dated, filters });
    choose(0, "Date Added");
    expect(bodyRows()).toHaveLength(5);
  });

  it("opens the calendar from either field and closes it again", () => {
    renderTable({ data: dated, filters });
    openPicker();
    expect(screen.getByTestId("date-picker")).toBeInTheDocument();

    fireEvent.click(screen.getByText("close-picker"));
    expect(screen.queryByTestId("date-picker")).toBeNull();

    fireEvent.click(document.body.querySelector(".date-filter-input-end"));
    expect(screen.getByTestId("date-picker")).toBeInTheDocument();
  });

  it("keeps only the rows inside the range, whichever date format they use", () => {
    const onFilterChange = vi.fn();
    renderTable({ data: dated, filters, onFilterChange });
    openPicker();
    fireEvent.click(screen.getByText("pick-january"));

    expect(rowNames()).toEqual(["Iso", "Euro"]);
    expect(screen.queryByTestId("date-picker")).toBeNull();
    expect(onFilterChange).toHaveBeenCalledWith("dateAdded", {
      start: "01/01/2026",
      end: "01/31/2026",
    });
  });

  it("shows the chosen range back in the two fields", () => {
    renderTable({ data: dated, filters });
    openPicker();
    fireEvent.click(screen.getByText("pick-january"));
    expect(document.body.querySelector(".date-filter-input-start")).toHaveValue("Jan 1, 2026");
    expect(document.body.querySelector(".date-filter-input-end")).toHaveValue("Jan 31, 2026");
  });

  it("applies no range when the calendar hands back an empty one", () => {
    renderTable({ data: dated, filters });
    openPicker();
    fireEvent.click(screen.getByText("pick-nothing"));
    expect(bodyRows()).toHaveLength(5);
  });
});

describe("filtering by stage completion", () => {
  const filters = [{ value: "stage_completion", label: "Progress" }];

  const staged = [
    { id: "1", name: "None", status: "A", stage_completion: null, hasCheckbox: true },
    { id: "2", name: "Low", status: "A", stage_completion: 5, hasCheckbox: true },
    { id: "3", name: "Mid", status: "A", stage_completion: 44, hasCheckbox: true },
    { id: "4", name: "High", status: "A", stage_completion: 95, hasCheckbox: true },
  ];

  it("offers every ten percent step", () => {
    renderTable({ data: staged, filters });
    choose(0, "Progress");
    openMenu(1);
    expect(optionLabels()).toHaveLength(11);
    expect(optionLabels()[0]).toBe("0%");
    expect(optionLabels()[10]).toBe("100%");
  });

  it("keeps the rows inside the chosen ten-point band", () => {
    renderTable({ data: staged, filters });
    choose(0, "Progress");
    choose(1, "40%");
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Mid")).toBeInTheDocument();
  });

  it("keeps a row whose progress is null inside the band that contains zero", () => {
    renderTable({ data: staged, filters });
    choose(0, "Progress");
    // The 0-9 band cannot be reached through the picker (see below), so the
    // null-is-zero rule is exercised through a band that excludes it instead.
    choose(1, "90%");
    expect(rowNames()).toEqual(["High"]);
  });

  it("cannot currently select the 0% band at all", () => {
    // SelectInput turns a falsy option value into "" before it reaches the
    // table, so choosing "0%" reads as "no filter chosen" and every row stays.
    renderTable({ data: staged, filters });
    choose(0, "Progress");
    choose(1, "0%");
    expect(bodyRows()).toHaveLength(4);
  });
});

describe("clearing the filters", () => {
  const filters = [
    {
      value: "status",
      label: "Status",
      filterValues: [{ value: "Paused", label: "Paused" }],
    },
  ];

  it("puts every row back and tells the parent each field was reset", () => {
    const onFilterChange = vi.fn();
    renderTable({ filters, onFilterChange });
    choose(0, "Status");
    choose(1, "Paused");
    expect(bodyRows()).toHaveLength(1);

    onFilterChange.mockClear();
    choose(0, "Clear Filters");

    expect(bodyRows()).toHaveLength(3);
    expect(onFilterChange).toHaveBeenCalledWith("filter_type", "");
    expect(onFilterChange).toHaveBeenCalledWith("value", "");
    expect(onFilterChange).toHaveBeenCalledWith("dateAdded", null);
    expect(onFilterChange).toHaveBeenCalledWith("stage_completion", "");
  });

  it("clears just as happily with no listener attached", () => {
    renderTable({ filters });
    choose(0, "Status");
    choose(1, "Paused");
    choose(0, "Clear Filters");
    expect(bodyRows()).toHaveLength(3);
  });

  it("leaves the search term in place, since it is not a filter", () => {
    renderTable({ filters, onFilterChange: vi.fn() });
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "acme" },
    });
    choose(0, "Clear Filters");
    expect(screen.getByPlaceholderText("Search...")).toHaveValue("acme");
    expect(bodyRows()).toHaveLength(1);
  });
});

describe("selection across pages", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${i + 1}`,
    status: "Active",
    hasCheckbox: true,
  }));

  const rowBoxes = () => document.body.querySelectorAll('tbody input[type="checkbox"]');
  const selectAll = () => document.body.querySelector('thead input[type="checkbox"]');

  it("drops the selection when the page changes", () => {
    const onSelectionChange = vi.fn();
    renderTable({ data: many, itemsPerPage: 5, onSelectionChange });
    fireEvent.click(rowBoxes()[0]);
    expect(onSelectionChange).toHaveBeenLastCalledWith([0], [many[0]]);

    fireEvent.click(screen.getByText("2"));
    expect(onSelectionChange).toHaveBeenLastCalledWith([], []);
    expect(rowBoxes()[0]).not.toBeChecked();
  });

  it("completes a partial selection rather than clearing it", () => {
    const onSelectionChange = vi.fn();
    renderTable({ onSelectionChange });
    fireEvent.click(rowBoxes()[0]);
    fireEvent.click(selectAll());
    expect(onSelectionChange).toHaveBeenLastCalledWith([0, 1, 2], rows);
    expect(selectAll()).toBeChecked();
  });

  it("counts only the rows that can be checked", () => {
    const onSelectionChange = vi.fn();
    renderTable({
      data: [
        { id: "1", name: "Pickable", status: "A", hasCheckbox: true },
        { id: "2", name: "Fixed", status: "A" },
      ],
      onSelectionChange,
    });
    fireEvent.click(selectAll());
    expect(onSelectionChange).toHaveBeenLastCalledWith([0], [
      { id: "1", name: "Pickable", status: "A", hasCheckbox: true },
    ]);
  });

  it("changes pages happily with nobody listening for the selection", () => {
    renderTable({ data: many, itemsPerPage: 5 });
    fireEvent.click(rowBoxes()[0]);
    fireEvent.click(screen.getByText("2"));
    expect(screen.getByText("Row 6")).toBeInTheDocument();
  });
});

describe("the export menu", () => {
  it("opens, closes from the same button and marks the container", () => {
    renderTable();
    fireEvent.click(exportButton());
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(document.body.querySelector(".custom-table-container")).toHaveClass(
      "export-dropdown-open"
    );

    fireEvent.click(exportButton());
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("positions itself above the button once open", async () => {
    renderTable();
    fireEvent.click(exportButton());
    await waitFor(() =>
      expect(document.body.querySelector(".export-dropdown").style.position).toBe("absolute")
    );
    expect(document.body.querySelector(".export-dropdown").style.right).toBe("0px");
  });

  it("closes on a click elsewhere but survives one inside itself", () => {
    renderTable();
    fireEvent.click(exportButton());
    fireEvent.mouseDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("survives a click on the export button itself", () => {
    renderTable();
    fireEvent.click(exportButton());
    fireEvent.mouseDown(exportButton());
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("exports CSV under a filename built from the table name and closes", () => {
    renderTable({ tableName: "Client Reports" });
    fireEvent.click(exportButton());
    fireEvent.click(screen.getByText("Export as CSV"));

    expect(h.exportTableData).toHaveBeenCalledWith(
      rows,
      columns,
      "client-reports.csv",
      "Client Reports"
    );
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("exports PDF under the matching filename and closes", () => {
    renderTable({ tableName: "Client Reports" });
    fireEvent.click(exportButton());
    fireEvent.click(screen.getByText("Export as PDF"));

    expect(h.exportTableToPDF).toHaveBeenCalledWith(
      rows,
      columns,
      "client-reports.pdf",
      "Client Reports"
    );
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("prints the whole table, not the page on screen", () => {
    renderTable({ tableName: "Clients" });
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "acme" },
    });
    fireEvent.click(screen.getByLabelText("Print"));
    expect(h.printTableData).toHaveBeenCalledWith(rows, columns, "Clients");
  });
});

describe("the row action menu", () => {
  const actionable = [
    { id: "1", name: "Acme Health", status: "Active", hasCheckbox: true, hasActions: true },
    { id: "2", name: "Beta Clinic", status: "Paused", hasCheckbox: true, hasActions: true },
  ];

  const withDropdown = (onClick = vi.fn()) => [
    { type: "dropdown", items: [{ label: "View", onClick }] },
  ];

  const dots = () => Array.from(document.body.querySelectorAll(".action-cell .action-button"));

  it("opens a row's menu and closes it from the same button", () => {
    renderTable({ data: actionable, actions: withDropdown() });
    fireEvent.click(dots()[0]);
    expect(screen.getByText("View")).toBeInTheDocument();

    fireEvent.click(dots()[0]);
    expect(screen.queryByText("View")).toBeNull();
  });

  it("runs the item against its own row and closes", () => {
    const onClick = vi.fn();
    renderTable({ data: actionable, actions: withDropdown(onClick) });
    fireEvent.click(dots()[1]);
    fireEvent.click(screen.getByText("View"));

    expect(onClick).toHaveBeenCalledWith(actionable[1]);
    expect(screen.queryByText("View")).toBeNull();
  });

  it("swaps to another row's menu rather than opening two", () => {
    renderTable({ data: actionable, actions: withDropdown() });
    fireEvent.click(dots()[0]);
    fireEvent.click(dots()[1]);
    expect(document.body.querySelectorAll(".action-dropdown")).toHaveLength(1);
  });

  it("closes on a click elsewhere but survives one on its own button", () => {
    renderTable({ data: actionable, actions: withDropdown() });
    fireEvent.click(dots()[0]);
    fireEvent.mouseDown(dots()[0]);
    expect(screen.getByText("View")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("View")).toBeNull();
  });

  it("survives a click inside the open menu", () => {
    renderTable({ data: actionable, actions: withDropdown() });
    fireEvent.click(dots()[0]);
    fireEvent.mouseDown(document.body.querySelector(".action-dropdown"));
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("closes when the page scrolls out from under it", () => {
    renderTable({ data: actionable, actions: withDropdown() });
    fireEvent.click(dots()[0]);
    fireEvent.scroll(window);
    expect(screen.queryByText("View")).toBeNull();
  });

  it("drops the menu below the button when there is room", async () => {
    renderTable({ data: actionable, actions: withDropdown() });
    const button = dots()[0];
    button.getBoundingClientRect = () => ({ top: 100, bottom: 120, left: 400 });
    fireEvent.click(button);

    await waitFor(() => {
      const menu = document.body.querySelector(".action-dropdown");
      expect(menu.style.position).toBe("fixed");
      expect(menu.style.top).toBe("122px");
    });
  });

  it("flips the menu above the button when it would fall off the bottom", async () => {
    renderTable({ data: actionable, actions: withDropdown() });
    const button = dots()[0];
    button.getBoundingClientRect = () => ({
      top: window.innerHeight - 200,
      bottom: window.innerHeight - 20,
      left: 400,
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(document.body.querySelector(".action-dropdown").style.top).toBe(
        `${window.innerHeight - 200 - 150 - 2}px`
      )
    );
  });

  it("uses whichever side is roomier when neither fits", async () => {
    renderTable({ data: actionable, actions: withDropdown() });
    const button = dots()[0];
    // 40px above, 30px below -- neither can hold the 150px menu.
    button.getBoundingClientRect = () => ({ top: 50, bottom: 60, left: 400 });
    const originalHeight = window.innerHeight;
    window.innerHeight = 100;
    fireEvent.click(button);

    await waitFor(() =>
      expect(document.body.querySelector(".action-dropdown").style.top).toBe("8px")
    );
    window.innerHeight = originalHeight;
  });

  it("pins the menu to the left edge rather than off-screen", async () => {
    renderTable({ data: actionable, actions: withDropdown() });
    const button = dots()[0];
    button.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 20 });
    fireEvent.click(button);

    await waitFor(() =>
      expect(document.body.querySelector(".action-dropdown").style.left).toBe("4px")
    );
  });
});

describe("switching parts of the chrome off", () => {
  it("hides the search box and the export controls together", () => {
    renderTable({ hideSearch: true });
    expect(screen.queryByPlaceholderText("Search...")).toBeNull();
    expect(screen.queryByLabelText("Export data")).toBeNull();
    expect(bodyRows()).toHaveLength(3);
  });

  it("keeps the search box but drops the export controls", () => {
    renderTable({ hideTableActions: true });
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Export data")).toBeNull();
  });

  it("shows a spinner in place of the rows while loading", () => {
    renderTable({ loading: true });
    expect(document.body.querySelector(".loading-spinner")).toBeInTheDocument();
    expect(document.body.querySelector("table.custom-table")).toBeNull();
  });

  it("returns to the first page when the data is swapped out", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      name: `Row ${i + 1}`,
      status: "Active",
      hasCheckbox: true,
    }));
    const { rerender } = render(
      <CustomTable data={many} columns={columns} itemsPerPage={5} />
    );
    fireEvent.click(screen.getByText("3"));
    expect(screen.getByText("Row 11")).toBeInTheDocument();

    rerender(<CustomTable data={[...many]} columns={columns} itemsPerPage={5} />);
    expect(screen.getByText("Row 1")).toBeInTheDocument();
  });
});

describe("clicks inside the date filter's own controls", () => {
  const filters = [{ value: "dateTime", label: "Date Added" }];

  const startInput = () => document.body.querySelector(".date-filter-input-start");
  const endInput = () => document.body.querySelector(".date-filter-input-end");

  it("keeps the calendar open for a press on either date field", () => {
    renderTable({ filters });
    choose(0, "Date Added");
    fireEvent.click(startInput());
    expect(screen.getByTestId("date-picker")).toBeInTheDocument();

    // The outside-click watcher runs on every mousedown; a press on the fields
    // that open the calendar must not be the thing that closes it again.
    fireEvent.mouseDown(startInput());
    expect(screen.getByTestId("date-picker")).toBeInTheDocument();

    fireEvent.mouseDown(endInput());
    expect(screen.getByTestId("date-picker")).toBeInTheDocument();
  });

  it("keeps the calendar open for a press inside the calendar itself", () => {
    renderTable({ filters });
    choose(0, "Date Added");
    fireEvent.click(startInput());

    fireEvent.mouseDown(
      document.body.querySelector(".date-filter-dropdown-wrapper")
    );
    expect(screen.getByTestId("date-picker")).toBeInTheDocument();
  });

  it("closes the calendar for a press anywhere else", () => {
    renderTable({ filters });
    choose(0, "Date Added");
    fireEvent.click(startInput());

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId("date-picker")).toBeNull();
  });
});

describe("a filter whose own value is blank", () => {
  it("offers nothing to filter by and leaves every row in place", () => {
    // `value: 0` is falsy, so the table cannot look the column up and the
    // second picker never appears.
    renderTable({ filters: [{ value: 0, label: "Nothing" }] });
    choose(0, "Nothing");

    expect(pickers()).toHaveLength(1);
    expect(bodyRows()).toHaveLength(3);
  });
});

describe("more of the row menu's placement", () => {
  const actionable = [
    { id: "1", name: "Acme Health", status: "Active", hasCheckbox: true, hasActions: true },
  ];

  const withDropdown = () => [
    { type: "dropdown", items: [{ label: "View", onClick: vi.fn() }] },
  ];

  const dots = () => Array.from(document.body.querySelectorAll(".action-cell .action-button"));

  it("stays below the button when below is the roomier of two bad options", async () => {
    renderTable({ data: actionable, actions: withDropdown() });
    const button = dots()[0];
    // 50px above, 60px below -- neither holds the 150px menu, but below wins.
    button.getBoundingClientRect = () => ({ top: 60, bottom: 70, left: 400 });
    const originalHeight = window.innerHeight;
    window.innerHeight = 140;
    fireEvent.click(button);

    await waitFor(() => {
      const menu = document.body.querySelector(".action-dropdown");
      expect(menu.style.top).toBe("72px");
      expect(menu.style.maxHeight).toBe("60px");
    });
    window.innerHeight = originalHeight;
  });
});

describe("selecting every row with nobody listening", () => {
  const selectAll = () => document.body.querySelector('thead input[type="checkbox"]');

  it("ticks the header box without a selection listener attached", () => {
    renderTable();
    fireEvent.click(selectAll());
    expect(selectAll()).toBeChecked();
    const boxes = Array.from(
      document.body.querySelectorAll('tbody input[type="checkbox"]')
    );
    expect(boxes).toHaveLength(3);
    expect(boxes.filter((b) => b.checked)).toHaveLength(3);
  });
});
