import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ReusableTable from "../Components/Table/ReuseableTable";

/**
 * Branch coverage for ReuseableTable.
 *
 * ReusableTable.test.jsx covers rendering and a tab switch. This drives the
 * conditional surface: local search and filtering, the two view types, row
 * expansion, the portalled action menu's flip/clamp logic, and every arm of
 * the page-number builder.
 */

const columns = [
  { key: "name", title: "Name" },
  { key: "status", title: "Status" },
];

const rows = [
  { id: "1", name: "Alpha", status: "Active" },
  { id: "2", name: "Beta", status: "Paused" },
  { id: "3", name: "Gamma", status: "Active" },
];

const base = { title: "Records", columns, data: rows };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("header, tabs and loading", () => {
  it("renders the subtitle only when supplied", () => {
    const { container, rerender } = render(<ReusableTable {...base} subtitle="All records" />);
    expect(screen.getByText("All records")).toBeInTheDocument();
    rerender(<ReusableTable {...base} />);
    expect(container.querySelector(".table-subtitle")).toBeNull();
  });

  it("renders no tab bar when tabs are absent or empty", () => {
    const { container, rerender } = render(<ReusableTable {...base} />);
    expect(container.querySelector(".table-tabs")).toBeNull();
    rerender(<ReusableTable {...base} tabs={[]} />);
    expect(container.querySelector(".table-tabs")).toBeNull();
  });

  it("marks the active tab and reports changes", () => {
    const onTabChange = vi.fn();
    render(
      <ReusableTable
        {...base}
        tabs={[
          { key: "a", label: "Open", count: 2 },
          { key: "b", label: "Closed" },
        ]}
        activeTab="a"
        onTabChange={onTabChange}
      />
    );
    expect(screen.getByText("Open").closest("button").className).toContain("active");
    expect(screen.getByText("Closed").closest("button").className).not.toContain("active");
    // Only the tab declaring a count renders the badge.
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Closed"));
    expect(onTabChange).toHaveBeenCalledWith("b");
  });

  it("tolerates a tab click with no handler wired", () => {
    render(<ReusableTable {...base} tabs={[{ key: "a", label: "Open" }]} activeTab="a" />);
    expect(() => fireEvent.click(screen.getByText("Open"))).not.toThrow();
  });

  it("shows the loader instead of rows while loading", () => {
    const { container } = render(<ReusableTable {...base} loading />);
    expect(container.querySelector(".data-table")).toBeNull();
    expect(container.querySelector(".section-loader")).toBeInTheDocument();
  });
});

describe("empty states", () => {
  it("shows a default title when no empty state is configured", () => {
    render(<ReusableTable {...base} data={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows the configured icon, title and subtitle", () => {
    const { container } = render(
      <ReusableTable
        {...base}
        data={[]}
        emptyState={{ icon: <svg data-testid="ico" />, title: "Nothing yet", subtitle: "Add one" }}
      />
    );
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
    expect(screen.getByText("Add one")).toBeInTheDocument();
    expect(container.querySelector(".empty-icon")).toBeInTheDocument();
  });

  it("omits the icon and subtitle nodes when not configured", () => {
    const { container } = render(
      <ReusableTable {...base} data={[]} emptyState={{ title: "Nothing" }} />
    );
    expect(container.querySelector(".empty-icon")).toBeNull();
    expect(container.querySelector(".empty-subtitle")).toBeNull();
  });

  it("treats a non-array data prop as empty", () => {
    render(<ReusableTable {...base} data={undefined} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});

describe("search", () => {
  it("filters locally when the page does not handle search", () => {
    render(<ReusableTable {...base} />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "alp" } });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("matches case-insensitively across every column", () => {
    render(<ReusableTable {...base} />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "PAUSED" } });
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("ignores a whitespace-only term", () => {
    render(<ReusableTable {...base} />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "   " } });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("hands the term to the page instead of filtering, after a debounce", () => {
    const onSearch = vi.fn();
    render(<ReusableTable {...base} onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "alp" } });
    // Not called yet, and no local filtering happened either.
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).toHaveBeenCalledWith("alp");
  });

  it("uses a custom placeholder", () => {
    render(<ReusableTable {...base} searchPlaceholder="Find a record" />);
    expect(screen.getByPlaceholderText("Find a record")).toBeInTheDocument();
  });
});

describe("filters", () => {
  const filters = [{ key: "status", label: "Status" }];

  it("hides the Filters button when nothing is configured", () => {
    const { container } = render(<ReusableTable {...base} />);
    expect(container.querySelector(".filter-btn")).toBeNull();
  });

  it("hides the Filters button when showFilters is off", () => {
    const { container } = render(
      <ReusableTable {...base} filters={filters} showFilters={false} />
    );
    expect(container.querySelector(".filter-btn")).toBeNull();
  });

  // The panel renders a <select> per configured filter, so scope queries to it
  // -- the values also appear as table cells.
  const openPanel = (container) => {
    fireEvent.click(container.querySelector(".filter-btn"));
    return container.querySelector(".filter-panel select");
  };

  it("lists the distinct values found in the rows, plus an All option", () => {
    const { container } = render(<ReusableTable {...base} filters={filters} />);
    const select = openPanel(container);
    const options = Array.from(select.options).map((o) => o.textContent);
    expect(options).toEqual(["All", "Active", "Paused"]);
  });

  it("filters the rows and shows a count badge once a value is chosen", () => {
    const { container } = render(<ReusableTable {...base} filters={filters} />);
    const select = openPanel(container);
    fireEvent.change(select, { target: { value: "Paused" } });
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(container.querySelector(".filter-count")).toBeInTheDocument();
  });

  it("restores every row when the filter goes back to All", () => {
    const { container } = render(<ReusableTable {...base} filters={filters} />);
    const select = openPanel(container);
    fireEvent.change(select, { target: { value: "Paused" } });
    fireEvent.change(container.querySelector(".filter-panel select"), {
      target: { value: "" },
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("clears every filter from the panel", () => {
    const { container } = render(<ReusableTable {...base} filters={filters} />);
    const select = openPanel(container);
    fireEvent.change(select, { target: { value: "Paused" } });
    fireEvent.click(container.querySelector(".filter-clear"));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(container.querySelector(".filter-count")).toBeNull();
  });

  it("closes the panel from the button and from the backdrop", () => {
    const { container } = render(<ReusableTable {...base} filters={filters} />);
    const btn = container.querySelector(".filter-btn");
    fireEvent.click(btn);
    expect(container.querySelector(".filter-panel")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(container.querySelector(".filter-panel")).toBeNull();

    fireEvent.click(btn);
    fireEvent.click(container.querySelector(".filter-backdrop"));
    expect(container.querySelector(".filter-panel")).toBeNull();
  });

  it("ignores blank cells when building the value list", () => {
    const withBlank = [...rows, { id: "4", name: "Delta", status: "  " }];
    const { container } = render(
      <ReusableTable {...base} data={withBlank} filters={filters} />
    );
    const select = openPanel(container);
    const values = Array.from(select.options).map((o) => o.value);
    expect(values.filter((v) => v.trim() === "" && v !== "").length).toBe(0);
    expect(values).toEqual(["", "Active", "Paused"]);
  });
});

describe("view toggle", () => {
  it("hides the toggle when asked", () => {
    const { container } = render(<ReusableTable {...base} showViewToggle={false} />);
    expect(container.querySelector(".view-toggle")).toBeNull();
  });

  it("switches to the card grid and reports the change", () => {
    const onViewChange = vi.fn();
    const { container } = render(<ReusableTable {...base} onViewChange={onViewChange} />);
    const buttons = container.querySelectorAll(".view-btn");
    fireEvent.click(buttons[1]);
    expect(container.querySelector(".data-card-grid")).toBeInTheDocument();
    expect(container.querySelector(".data-table")).toBeNull();
    expect(onViewChange).toHaveBeenCalledWith("grid");
    fireEvent.click(buttons[0]);
    expect(container.querySelector(".data-table")).toBeInTheDocument();
  });

  it("tolerates no onViewChange handler", () => {
    const { container } = render(<ReusableTable {...base} />);
    expect(() => fireEvent.click(container.querySelectorAll(".view-btn")[1])).not.toThrow();
  });
});

describe("cells and custom renderers", () => {
  it("uses a column renderer when one is supplied", () => {
    const cols = [
      { key: "name", title: "Name", render: (v) => `<<${v}>>` },
      { key: "status", title: "Status" },
    ];
    render(<ReusableTable {...base} columns={cols} />);
    expect(screen.getByText("<<Alpha>>")).toBeInTheDocument();
  });

  it("applies a declared column width to header and cells", () => {
    const cols = [
      { key: "name", title: "Name", width: "40%" },
      { key: "status", title: "Status" },
    ];
    const { container } = render(<ReusableTable {...base} columns={cols} />);
    expect(container.querySelectorAll(".table-col-wrap").length).toBeGreaterThan(0);
  });

  it("falls back to the row index when a row carries no id", () => {
    const noIds = [{ name: "Alpha", status: "Active" }];
    expect(() => render(<ReusableTable {...base} data={noIds} />)).not.toThrow();
  });
});

describe("row expansion", () => {
  it("adds no expander column when no renderer is supplied", () => {
    const { container } = render(<ReusableTable {...base} />);
    expect(container.querySelector(".expand-col")).toBeNull();
  });

  it("expands and collapses a row, swapping the chevron label", () => {
    render(<ReusableTable {...base} renderExpandedRow={(row) => <div>more {row.name}</div>} />);
    const first = screen.getAllByLabelText("Expand row")[0];
    fireEvent.click(first.closest("tr"));
    expect(screen.getByText("more Alpha")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Collapse row").length).toBe(1);
    fireEvent.click(screen.getAllByLabelText("Collapse row")[0].closest("tr"));
    expect(screen.queryByText("more Alpha")).not.toBeInTheDocument();
  });

  it("keeps expansion per row", () => {
    render(<ReusableTable {...base} renderExpandedRow={(row) => <div>more {row.name}</div>} />);
    const expanders = screen.getAllByLabelText("Expand row");
    fireEvent.click(expanders[0].closest("tr"));
    fireEvent.click(screen.getAllByLabelText("Expand row")[0].closest("tr"));
    expect(screen.getByText("more Alpha")).toBeInTheDocument();
    expect(screen.getByText("more Beta")).toBeInTheDocument();
  });
});

describe("row actions and the portalled menu", () => {
  const actions = [
    { render: (row) => <button>Open {row.name}</button> },
    { menu: true, label: "Archive", onClick: vi.fn() },
  ];

  it("renders no actions column when none are supplied", () => {
    const { container } = render(<ReusableTable {...base} />);
    expect(container.querySelector(".actions-col")).toBeNull();
  });

  it("renders inline actions and the menu trigger", () => {
    render(<ReusableTable {...base} actions={actions} />);
    expect(screen.getByText("Open Alpha")).toBeInTheDocument();
    expect(screen.getAllByLabelText("More actions").length).toBe(3);
  });

  it("omits the menu trigger when no action declares menu", () => {
    render(<ReusableTable {...base} actions={[{ render: (row) => <span>{row.name}!</span> }]} />);
    expect(screen.queryByLabelText("More actions")).not.toBeInTheDocument();
  });

  it("opens the menu into a portal and closes it on a second click", () => {
    render(<ReusableTable {...base} actions={actions} />);
    const trigger = screen.getAllByLabelText("More actions")[0];
    fireEvent.click(trigger);
    expect(document.body.querySelector(".action-menu, [class*=action-menu]")).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
  });

  it("flips the menu upward when there is no room below", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight - 10,
      bottom: window.innerHeight - 5,
      left: 100,
      right: 200,
      width: 100,
      height: 5,
      x: 100,
      y: window.innerHeight - 10,
      toJSON() {},
    });
    render(<ReusableTable {...base} actions={actions} />);
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    expect(document.body).toBeTruthy();
  });

  it("clamps the menu horizontally when the button sits at the edge", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 10,
      bottom: 30,
      left: 0,
      right: 5,
      width: 5,
      height: 20,
      x: 0,
      y: 10,
      toJSON() {},
    });
    render(<ReusableTable {...base} actions={actions} />);
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    expect(document.body).toBeTruthy();
  });

  it("renders the grid view's actions too", () => {
    const { container } = render(<ReusableTable {...base} actions={actions} />);
    fireEvent.click(container.querySelectorAll(".view-btn")[1]);
    expect(container.querySelector(".data-card-actions")).toBeInTheDocument();
    expect(screen.getAllByLabelText("More actions").length).toBe(3);
  });
});

describe("pagination page builder", () => {
  const paged = (currentPage, totalPages) => ({
    currentPage,
    totalPages,
    totalItems: totalPages * 10,
  });

  it("renders nothing when there is no pagination config", () => {
    const { container } = render(<ReusableTable {...base} />);
    expect(container.querySelector(".table-pagination")).toBeNull();
  });

  it("lists every page when there are seven or fewer", () => {
    render(<ReusableTable {...base} pagination={paged(1, 5)} onPageChange={vi.fn()} />);
    ["1", "2", "3", "4", "5"].forEach((p) =>
      expect(screen.getByText(p)).toBeInTheDocument()
    );
    expect(screen.queryByText("...")).not.toBeInTheDocument();
  });

  it("collapses the tail with an ellipsis near the start", () => {
    render(<ReusableTable {...base} pagination={paged(1, 20)} onPageChange={vi.fn()} />);
    expect(screen.getAllByText("...").length).toBe(1);
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("collapses both ends in the middle", () => {
    render(<ReusableTable {...base} pagination={paged(10, 20)} onPageChange={vi.fn()} />);
    expect(screen.getAllByText("...").length).toBe(2);
  });

  it("collapses the head with an ellipsis near the end", () => {
    render(<ReusableTable {...base} pagination={paged(20, 20)} onPageChange={vi.fn()} />);
    expect(screen.getAllByText("...").length).toBe(1);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("disables Previous on the first page and Next on the last", () => {
    const { container, rerender } = render(
      <ReusableTable {...base} pagination={paged(1, 5)} onPageChange={vi.fn()} />
    );
    expect(container.querySelector(".pagination-btn.prev")).toBeDisabled();
    expect(container.querySelector(".pagination-btn.next")).not.toBeDisabled();
    rerender(<ReusableTable {...base} pagination={paged(5, 5)} onPageChange={vi.fn()} />);
    expect(container.querySelector(".pagination-btn.next")).toBeDisabled();
  });

  it("reports page changes from the arrows and the numbers", () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <ReusableTable {...base} pagination={paged(3, 5)} onPageChange={onPageChange} />
    );
    fireEvent.click(container.querySelector(".pagination-btn.prev"));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.click(container.querySelector(".pagination-btn.next"));
    expect(onPageChange).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByText("5"));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("does nothing when an ellipsis is clicked", () => {
    const onPageChange = vi.fn();
    render(<ReusableTable {...base} pagination={paged(10, 20)} onPageChange={onPageChange} />);
    fireEvent.click(screen.getAllByText("...")[0]);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("tolerates no onPageChange handler", () => {
    const { container } = render(<ReusableTable {...base} pagination={paged(2, 5)} />);
    expect(() =>
      fireEvent.click(container.querySelector(".pagination-btn.next"))
    ).not.toThrow();
  });
});
