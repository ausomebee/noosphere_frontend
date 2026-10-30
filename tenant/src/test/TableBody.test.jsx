import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * TableBody is the presentational half of CustomTable: it turns a page of rows
 * and a column list into the `<table>`, and owns every cell renderer -- custom
 * render functions, per-column dropdowns, progress bars, document icons,
 * switches, status pills -- plus the action column and the select-all header.
 *
 * It holds no state of its own; the open dropdown, the selection and the
 * toggles all arrive as props, so these tests drive it directly rather than
 * through CustomTable, and re-render with a different `openDropdown` where a
 * menu needs to be open.
 *
 * Two things are worth knowing. The first column whose header is in the
 * component's own "primary" list becomes the name column, and it renders as a
 * button when the row has actions and one of them looks like a view or an edit
 * -- so fixtures choose their headers deliberately. And a cell renderer that
 * throws is caught and printed as "N/A", which one test provokes on purpose.
 */

const columns = [{ key: "name", header: "Name" }, { key: "status", header: "Status" }];

const rows = [
  { item_id: "r1", name: "Acme Health", status: "Active", hasCheckbox: true },
  { item_id: "r2", name: "Beta Clinic", status: "Paused", hasCheckbox: true },
];

let menuRefs;

const renderBody = (props = {}) =>
  render(
    <MemoryRouter>
      <TableBody
        currentData={rows}
        columns={columns}
        showCheckbox={false}
        showActions={false}
        selectedRows={[]}
        handleCheckboxChange={vi.fn()}
        handleSelectAllChange={vi.fn()}
        toggleDropdown={vi.fn()}
        openDropdown={null}
        menuRefs={menuRefs}
        actions={[]}
        tableName="Clients"
        {...props}
      />
    </MemoryRouter>
  );

const cells = () =>
  Array.from(document.body.querySelectorAll("tbody .table-cell")).map((c) => c.textContent);

const headers = () =>
  Array.from(document.body.querySelectorAll("thead th")).map((th) => th.textContent);

const boxes = () => document.body.querySelectorAll('input[type="checkbox"]');

import TableBody from "../Components/Table/TableBody";

beforeEach(() => {
  menuRefs = { current: {} };
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the header row", () => {
  it("prints one heading per column and no extras", () => {
    renderBody();
    expect(headers()).toEqual(["Name", "Status"]);
    expect(boxes()).toHaveLength(0);
  });

  it("adds the checkbox and action headings when they are switched on", () => {
    renderBody({ showCheckbox: true, showActions: true });
    expect(headers()).toEqual(["", "Name", "Status", "Action"]);
  });

  it("gives a column with its own width a wrapping class and that width", () => {
    renderBody({ columns: [{ key: "name", header: "Name", width: "12rem" }] });
    const th = document.body.querySelector("thead th");
    expect(th).toHaveClass("table-col-wrap");
    expect(th.style.width).toBe("12rem");
  });

  it("leaves a column without one unstyled", () => {
    renderBody();
    expect(document.body.querySelector("thead th")).not.toHaveClass("table-col-wrap");
  });
});

describe("selecting rows", () => {
  it("ticks select-all only once every selectable row is chosen", () => {
    const { rerender } = renderBody({ showCheckbox: true, selectedRows: [0] });
    expect(boxes()[0]).not.toBeChecked();

    rerender(
      <MemoryRouter>
        <TableBody
          currentData={rows}
          columns={columns}
          showCheckbox
          showActions={false}
          selectedRows={[0, 1]}
          handleCheckboxChange={vi.fn()}
          handleSelectAllChange={vi.fn()}
          toggleDropdown={vi.fn()}
          openDropdown={null}
          menuRefs={menuRefs}
          actions={[]}
          tableName="Clients"
        />
      </MemoryRouter>
    );
    expect(boxes()[0]).toBeChecked();
  });

  it("leaves select-all clear when nothing is selected", () => {
    renderBody({ showCheckbox: true, currentData: [] });
    expect(boxes()[0]).not.toBeChecked();
  });

  it("reports a row's own tick with its index and its row", () => {
    const handleCheckboxChange = vi.fn();
    renderBody({ showCheckbox: true, handleCheckboxChange });
    fireEvent.click(boxes()[2]);
    expect(handleCheckboxChange).toHaveBeenCalledWith(1, rows[1]);
  });

  it("reports the select-all tick", () => {
    const handleSelectAllChange = vi.fn();
    renderBody({ showCheckbox: true, handleSelectAllChange });
    fireEvent.click(boxes()[0]);
    expect(handleSelectAllChange).toHaveBeenCalled();
  });

  it("gives no checkbox to a row that cannot be picked", () => {
    renderBody({
      showCheckbox: true,
      currentData: [{ item_id: "r1", name: "Fixed", status: "A" }],
    });
    // Only the header's own box is left.
    expect(boxes()).toHaveLength(1);
  });
});

describe("the empty state", () => {
  it("names the table it belongs to and spans every column", () => {
    renderBody({ currentData: [], showCheckbox: true, showActions: true });
    expect(screen.getByText("No Clients data available")).toBeInTheDocument();
    expect(document.body.querySelector("td[colspan]")).toHaveAttribute("colspan", "4");
  });

  it("spans only the data columns when there is nothing else", () => {
    renderBody({ currentData: [] });
    expect(document.body.querySelector("td[colspan]")).toHaveAttribute("colspan", "2");
  });
});

describe("the plain cell", () => {
  it("prints a string as it is", () => {
    renderBody();
    expect(cells()).toEqual(["Acme Health", "Active", "Beta Clinic", "Paused"]);
  });

  it("prints a placeholder for an empty, missing or null value", () => {
    renderBody({
      currentData: [{ item_id: "r1", name: "", status: null }],
      columns: [
        { key: "name", header: "Name" },
        { key: "status", header: "Status" },
        { key: "missing", header: "Missing" },
      ],
    });
    // `null` is coalesced away before it is stringified, so it reads the same
    // as a missing key.
    expect(cells()).toEqual(["N/A", "N/A", "N/A"]);
  });

  it("prints a boolean rather than treating false as empty", () => {
    renderBody({
      currentData: [{ item_id: "r1", name: false, status: true }],
    });
    expect(cells()).toEqual(["false", "true"]);
  });

  it("prints a number, including zero", () => {
    renderBody({
      currentData: [{ item_id: "r1", name: 0, status: 42 }],
    });
    expect(cells()).toEqual(["N/A", "42"]);
  });

  it("serialises an object it has no renderer for", () => {
    renderBody({
      currentData: [{ item_id: "r1", name: { a: 1 }, status: "A" }],
    });
    expect(cells()[0]).toBe('{"a":1}');
  });

  it("marks a primary column apart from the rest", () => {
    renderBody();
    const [first, second] = document.body.querySelectorAll("tbody .table-cell");
    expect(first).toHaveClass("primary-text");
    expect(second).toHaveClass("secondary-text");
  });

  it("truncates and titles a cell that asks for it", () => {
    renderBody({
      columns: [{ key: "name", header: "Name", truncate: true }],
    });
    const cell = document.body.querySelector("tbody .table-cell");
    expect(cell).toHaveClass("table-cell-truncate");
    expect(cell).toHaveAttribute("title", "Acme Health");
  });

  it("leaves a truncated cell untitled when its value is not text", () => {
    renderBody({
      columns: [{ key: "name", header: "Name", truncate: true }],
      currentData: [{ item_id: "r1", name: 12 }],
    });
    expect(document.body.querySelector("tbody .table-cell")).not.toHaveAttribute("title");
  });

  it("carries a column's width down into its cells", () => {
    renderBody({ columns: [{ key: "name", header: "Name", width: "10rem" }] });
    const cell = document.body.querySelector("tbody .table-cell");
    expect(cell).toHaveClass("table-col-wrap");
    expect(cell.style.width).toBe("10rem");
  });
});

describe("a column with its own renderer", () => {
  it("uses the string it returns", () => {
    renderBody({
      columns: [{ key: "name", header: "Name", render: (row) => `${row.name}!` }],
    });
    expect(cells()).toEqual(["Acme Health!", "Beta Clinic!"]);
  });

  it("uses a number it returns", () => {
    renderBody({
      columns: [{ key: "name", header: "Name", render: () => 7 }],
    });
    expect(cells()[0]).toBe("7");
  });

  it("uses an element it returns", () => {
    renderBody({
      columns: [{ key: "name", header: "Name", render: () => <em>custom</em> }],
    });
    expect(document.body.querySelector("tbody em")).toHaveTextContent("custom");
  });

  it("serialises anything else it returns", () => {
    renderBody({
      columns: [{ key: "name", header: "Name", render: () => ({ shape: "odd" }) }],
    });
    expect(cells()[0]).toBe('{"shape":"odd"}');
  });

  it("prints a placeholder and logs when a renderer throws", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    renderBody({
      columns: [
        {
          key: "name",
          header: "Name",
          render: () => {
            throw new Error("bad renderer");
          },
        },
      ],
    });
    expect(cells()).toEqual(["N/A", "N/A"]);
    expect(logged).toHaveBeenCalledWith(
      "Error rendering cell (Name):",
      expect.any(Error)
    );
  });
});

describe("the special cell types", () => {
  it("draws a progress bar and colours a high one differently", () => {
    renderBody({
      columns: [{ key: "progress", header: "Progress", type: "stage_completion" }],
      currentData: [
        { item_id: "r1", progress: 40 },
        { item_id: "r2", progress: 90 },
      ],
    });
    const fills = document.body.querySelectorAll(".progress-fills");
    expect(fills[0]).not.toHaveClass("high");
    expect(fills[0].style.width).toBe("40%");
    expect(fills[1]).toHaveClass("high");
    expect(fills[1].style.backgroundColor).toBe("rgb(217, 45, 32)");
    expect(
      Array.from(document.body.querySelectorAll(".progress-texts")).map((s) => s.textContent)
    ).toEqual(["40%", "90%"]);
  });

  it("gives a document cell an icon that follows the extension", () => {
    renderBody({
      columns: [{ key: "file", header: "File", type: "document" }],
      currentData: [
        { item_id: "r1", file: "report.pdf" },
        { item_id: "r2", file: "photo.png" },
        { item_id: "r3", file: undefined },
      ],
    });
    const icons = document.body.querySelectorAll(".document-cell > span");
    expect(icons[0].style.color).toBe("rgb(255, 0, 0)");
    expect(icons[1].style.color).toBe("rgb(136, 136, 136)");
    expect(icons[2].style.color).toBe("rgb(136, 136, 136)");
  });

  it("recognises every office extension as a document", () => {
    renderBody({
      columns: [{ key: "file", header: "File", type: "document" }],
      currentData: ["a.doc", "b.docx", "c.xls", "d.xlsx"].map((file, i) => ({
        item_id: String(i),
        file,
      })),
    });
    const icons = document.body.querySelectorAll(".document-cell > span");
    expect(Array.from(icons).every((i) => i.style.color === "rgb(255, 0, 0)")).toBe(true);
  });

  it("offers a live switch only when the table can handle a toggle", () => {
    const handleToggleActive = vi.fn();
    renderBody({
      columns: [{ key: "active", header: "Active", type: "active" }],
      currentData: [{ item_id: "r1", active: true }],
      handleToggleActive,
    });
    const box = document.body.querySelector('input[type="checkbox"]');
    expect(box).toBeChecked();
    expect(box).not.toBeDisabled();

    fireEvent.click(box);
    expect(handleToggleActive).toHaveBeenCalledWith({ item_id: "r1", active: true });
  });

  it("disables the switch when nothing is listening", () => {
    renderBody({
      columns: [{ key: "active", header: "Active", type: "active" }],
      currentData: [{ item_id: "r1", active: false }],
    });
    expect(document.body.querySelector('input[type="checkbox"]')).toBeDisabled();
  });

  it("colours an accent cell and fills in a blank one", () => {
    renderBody({
      columns: [{ key: "ref", header: "Ref", type: "accent" }],
      currentData: [
        { item_id: "r1", ref: "AB-1" },
        { item_id: "r2", ref: "" },
      ],
    });
    expect(
      Array.from(document.body.querySelectorAll(".table-accent-cell")).map(
        (s) => s.textContent
      )
    ).toEqual(["AB-1", "N/A"]);
  });

  it("splits a day-and-time cell in two, with a placeholder for each half", () => {
    renderBody({
      columns: [{ key: "when", header: "When", type: "day_time" }],
      currentData: [
        { item_id: "r1", when: { date: "Mon", time: "09:00" } },
        { item_id: "r2", when: { date: "Tue" } },
        { item_id: "r3" },
      ],
    });
    expect(
      Array.from(document.body.querySelectorAll(".day-time-cell")).map((d) => d.textContent)
    ).toEqual(["Mon09:00", "TueN/A", "N/AN/A"]);
  });

  it("labels an approval by its own value", () => {
    renderBody({
      columns: [{ key: "approval", header: "Approval", type: "approval" }],
      currentData: [
        { item_id: "r1", approval: "Approved" },
        { item_id: "r2" },
      ],
    });
    const labels = document.body.querySelectorAll(".approval-label");
    expect(labels[0]).toHaveClass("approval-approved");
    expect(labels[0]).toHaveTextContent("Approved");
    expect(labels[1]).toHaveClass("approval-undefined");
  });

  it("labels a status and adds a dot only when the table asks for one", () => {
    renderBody({
      columns: [{ key: "status", header: "Status", type: "statusText" }],
      currentData: [{ item_id: "r1", status: "Active" }],
      hasStatusDot: true,
    });
    expect(document.body.querySelector(".status-label")).toHaveClass("status-active");
    expect(document.body.querySelector(".status-label .status-dot")).toBeInTheDocument();
  });

  it("leaves the dot out by default", () => {
    renderBody({
      columns: [{ key: "status", header: "Status", type: "statusText" }],
      currentData: [{ item_id: "r1", status: "Active" }],
    });
    expect(document.body.querySelector(".status-label .status-dot")).toBeNull();
  });
});

describe("a column that carries its own menu", () => {
  const columnActions = (onClick = vi.fn()) => [
    { label: "Rename", onClick, className: "warn", icon: <i data-testid="icon" /> },
    { onClick },
  ];

  const withMenu = (onClick) => [
    { key: "name", header: "Name", hasColumnActions: true, columnActions: columnActions(onClick) },
  ];

  it("turns the cell into a button that asks for its menu", () => {
    const toggleDropdown = vi.fn();
    renderBody({ columns: withMenu(), toggleDropdown });
    fireEvent.click(document.body.querySelectorAll(".action-menu .action-button")[1]);
    expect(toggleDropdown).toHaveBeenCalledWith(1, "name");
  });

  it("keeps the menu closed until the table says which one is open", () => {
    renderBody({ columns: withMenu() });
    expect(document.body.querySelector(".action-dropdown")).toBeNull();
  });

  it("shows the open menu's items, with an icon where there is one", () => {
    renderBody({ columns: withMenu(), openDropdown: "0-name" });
    expect(document.body.querySelectorAll(".action-dropdown")).toHaveLength(1);
    expect(screen.getByText("Rename")).toHaveClass("warn");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("runs an item against its own row and closes the menu", () => {
    const onClick = vi.fn();
    const toggleDropdown = vi.fn();
    renderBody({ columns: withMenu(onClick), openDropdown: "1-name", toggleDropdown });
    fireEvent.click(screen.getByText("Rename"));
    expect(onClick).toHaveBeenCalledWith(rows[1]);
    expect(toggleDropdown).toHaveBeenCalledWith(null);
  });

  it("keeps a reference to the button and to the open menu", () => {
    renderBody({ columns: withMenu(), openDropdown: "0-name" });
    expect(menuRefs.current["0-name"].button).toBeInstanceOf(HTMLElement);
    expect(menuRefs.current["0-name"].dropdown).toBeInstanceOf(HTMLElement);
  });

  it("ignores a column that claims a menu but supplies no list", () => {
    renderBody({
      columns: [{ key: "name", header: "Name", hasColumnActions: true }],
    });
    expect(document.body.querySelector(".action-menu")).toBeNull();
    expect(cells()[0]).toBe("Acme Health");
  });
});

describe("the action column", () => {
  const actionable = [
    { item_id: "r1", name: "Acme Health", status: "Active", hasActions: true },
    { item_id: "r2", name: "Beta Clinic", status: "Paused" },
  ];

  it("gives the column only to the rows that asked for it", () => {
    renderBody({ showActions: true, currentData: actionable, actions: [] });
    expect(document.body.querySelectorAll(".action-cell")).toHaveLength(1);
  });

  it("links to the row's own page when a prefix was given", () => {
    renderBody({
      showActions: true,
      currentData: actionable,
      actionLinkPrefix: "/clients/",
      actionText: "Open",
    });
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("href", "/clients/r1");
  });

  it("falls back to the row's index when it has no id of its own", () => {
    renderBody({
      showActions: true,
      currentData: [{ name: "Acme", hasActions: true }],
      actionLinkPrefix: "/clients/",
    });
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/clients/0");
  });

  it("prefers a click handler over a link", () => {
    const onActionClick = vi.fn();
    renderBody({ showActions: true, currentData: actionable, onActionClick });
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(onActionClick).toHaveBeenCalledWith(actionable[0]);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers neither when there is no prefix and no handler", () => {
    renderBody({ showActions: true, currentData: actionable });
    expect(screen.queryByRole("link")).toBeNull();
    expect(document.body.querySelector(".action-link")).toBeNull();
  });

  it("drops the view link entirely when the row has a dropdown", () => {
    renderBody({
      showActions: true,
      currentData: actionable,
      actionLinkPrefix: "/clients/",
      actions: [{ type: "dropdown", items: [{ label: "Edit", onClick: vi.fn() }] }],
    });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("drops it too when the table asks for no action text", () => {
    renderBody({
      showActions: true,
      currentData: actionable,
      actionLinkPrefix: "/clients/",
      actionText: "",
    });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders an icon action and runs it against its row", () => {
    const onClick = vi.fn();
    renderBody({
      showActions: true,
      currentData: actionable,
      actions: [
        { type: "icon", label: "Delete", className: "danger", icon: <i data-testid="bin" />, onClick },
      ],
    });
    const button = document.body.querySelector(".action-icon");
    expect(button).toHaveClass("danger");
    expect(button).toHaveAttribute("title", "Delete");

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(actionable[0]);
  });

  it("renders an icon action that brought no class of its own", () => {
    renderBody({
      showActions: true,
      currentData: actionable,
      actions: [{ type: "icon", label: "Delete", icon: <i />, onClick: vi.fn() }],
    });
    expect(document.body.querySelector(".action-icon").className.trim()).toBe("action-icon");
  });

  it("ignores an action of a type it does not know", () => {
    renderBody({
      showActions: true,
      currentData: actionable,
      actions: [{ type: "mystery", label: "?", onClick: vi.fn() }],
    });
    expect(document.body.querySelector(".action-group").children).toHaveLength(0);
  });

  it("asks for a row's dropdown by index", () => {
    const toggleDropdown = vi.fn();
    renderBody({
      showActions: true,
      currentData: actionable,
      actions: [{ type: "dropdown", items: [] }],
      toggleDropdown,
    });
    fireEvent.click(document.body.querySelector(".action-cell .action-button"));
    expect(toggleDropdown).toHaveBeenCalledWith(0, "action-0");
  });

  it("shows the open dropdown's items and closes after one is used", () => {
    const onClick = vi.fn();
    const toggleDropdown = vi.fn();
    renderBody({
      showActions: true,
      currentData: actionable,
      actions: [
        {
          type: "dropdown",
          items: [{ label: "Edit", className: "warn", icon: <i data-testid="pen" />, onClick }],
        },
      ],
      openDropdown: "0-action-0",
      toggleDropdown,
    });
    expect(screen.getByText("Edit")).toHaveClass("warn");
    expect(screen.getByTestId("pen")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Edit"));
    expect(onClick).toHaveBeenCalledWith(actionable[0]);
    expect(toggleDropdown).toHaveBeenCalledWith(null);
  });

  it("accepts a dropdown whose items and labels are computed per row", () => {
    renderBody({
      showActions: true,
      currentData: actionable,
      actions: [
        {
          type: "dropdown",
          items: (row) => [
            {
              label: (r) => `Edit ${r.name}`,
              className: (r) => `for-${r.item_id}`,
              onClick: vi.fn(),
            },
            ...(row.status === "Active" ? [{ label: "Pause", onClick: vi.fn() }] : []),
          ],
        },
      ],
      openDropdown: "0-action-0",
    });
    expect(screen.getByText("Edit Acme Health")).toHaveClass("for-r1");
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  it("accepts an action list computed per row", () => {
    const actions = vi.fn((row) =>
      row.status === "Active" ? [{ type: "icon", label: "Pause", icon: <i />, onClick: vi.fn() }] : []
    );
    renderBody({ showActions: true, currentData: actionable, actions });
    expect(document.body.querySelectorAll(".action-icon")).toHaveLength(1);
    expect(actions).toHaveBeenCalledWith(actionable[0]);
  });

  it("copes with a table that was given no actions at all", () => {
    renderBody({ showActions: true, currentData: actionable, actions: undefined });
    expect(document.body.querySelector(".action-group").children).toHaveLength(0);
  });

  it("copes with a dropdown that was given no items", () => {
    renderBody({
      showActions: true,
      currentData: actionable,
      actions: [{ type: "dropdown" }],
      openDropdown: "0-action-0",
    });
    expect(document.body.querySelector(".action-dropdown").children).toHaveLength(0);
  });
});

describe("the clickable name cell", () => {
  const withActions = [{ item_id: "r1", name: "Acme Health", status: "Active", hasActions: true }];

  it("opens the row from its name when a View action exists", () => {
    const onClick = vi.fn();
    renderBody({
      currentData: withActions,
      actions: [{ type: "dropdown", items: [{ label: "View profile", onClick }] }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Acme Health" }));
    expect(onClick).toHaveBeenCalledWith(withActions[0]);
  });

  it("settles for an Edit action when there is no View", () => {
    const edit = vi.fn();
    renderBody({
      currentData: withActions,
      actions: [{ type: "icon", label: "Edit", icon: <i />, onClick: edit }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Acme Health" }));
    expect(edit).toHaveBeenCalledWith(withActions[0]);
  });

  it("prefers the table's own action handler over any action", () => {
    const onActionClick = vi.fn();
    const view = vi.fn();
    renderBody({
      currentData: withActions,
      actions: [{ type: "icon", label: "View", icon: <i />, onClick: view }],
      onActionClick,
    });
    fireEvent.click(screen.getByRole("button", { name: "Acme Health" }));
    expect(onActionClick).toHaveBeenCalledWith(withActions[0]);
    expect(view).not.toHaveBeenCalled();
  });

  it("leaves the name as text when no action looks like an opener", () => {
    renderBody({
      currentData: withActions,
      actions: [{ type: "icon", label: "Delete", icon: <i />, onClick: vi.fn() }],
    });
    expect(screen.queryByRole("button", { name: "Acme Health" })).toBeNull();
  });

  it("leaves the name as text when the matching action cannot be called", () => {
    renderBody({
      currentData: withActions,
      actions: [{ type: "icon", label: "View", icon: <i /> }],
    });
    expect(screen.queryByRole("button", { name: "Acme Health" })).toBeNull();
  });

  it("leaves the name as text on a row that has no actions", () => {
    renderBody({
      currentData: [{ item_id: "r1", name: "Acme Health", status: "Active" }],
      actions: [{ type: "icon", label: "View", icon: <i />, onClick: vi.fn() }],
    });
    expect(screen.queryByRole("button", { name: "Acme Health" })).toBeNull();
  });

  it("falls back to the first column when no header is a known primary one", () => {
    const onClick = vi.fn();
    renderBody({
      columns: [
        { key: "ref", header: "Reference" },
        { key: "name", header: "Something" },
      ],
      currentData: [{ item_id: "r1", ref: "AB-1", name: "Acme", hasActions: true }],
      actions: [{ type: "icon", label: "View", icon: <i />, onClick }],
    });
    fireEvent.click(screen.getByRole("button", { name: "AB-1" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("does not let the row underneath see the click", () => {
    const onActionClick = vi.fn();
    const rowClick = vi.fn();
    render(
      <MemoryRouter>
        <div onClick={rowClick}>
          <TableBody
            currentData={withActions}
            columns={columns}
            showCheckbox={false}
            showActions={false}
            selectedRows={[]}
            handleCheckboxChange={vi.fn()}
            handleSelectAllChange={vi.fn()}
            toggleDropdown={vi.fn()}
            openDropdown={null}
            menuRefs={menuRefs}
            actions={[]}
            tableName="Clients"
            onActionClick={onActionClick}
          />
        </div>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Acme Health" }));
    expect(onActionClick).toHaveBeenCalled();
    expect(rowClick).not.toHaveBeenCalled();
  });
});
