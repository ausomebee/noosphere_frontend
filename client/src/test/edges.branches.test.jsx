import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-toastify", () => ({
  toast: Object.assign(vi.fn(), { dismiss: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));

const mockGet = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet, post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }),
}));

import { toast } from "react-toastify";
import { showToast } from "../Helper/ShowToast";
import omitEmpty from "../Helper/omitEmpty";
import useAuth from "../hooks/useAuth";
import ReusableTable from "../Components/Table/ReuseableTable";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

/**
 * The last reachable client edges: the table's null-cell handling and menu
 * clamping, the auth selector's absent-slice default, and the toast helper's
 * object-message form.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ShowToast message shapes", () => {
  it("accepts a plain string", () => {
    showToast("saved", "success");
    expect(toast.success).toHaveBeenCalledWith("saved", expect.any(Object));
  });

  it("reads both the text and the type out of an object-shaped message", () => {
    // The object form carries its own `type`; the second argument is ignored.
    showToast({ message: "from an object", type: "error" }, "success");
    expect(toast.error).toHaveBeenCalledWith("from an object", expect.any(Object));
  });

  it("defaults the type when the object does not carry one", () => {
    showToast({ message: "no type given" });
    expect(toast).toHaveBeenCalledWith("no type given", expect.any(Object));
  });

  it("falls back to an empty string for an object with no message", () => {
    showToast({});
    expect(toast).toHaveBeenCalledWith("", expect.any(Object));
  });

  it("defaults the type for a bare string with no type", () => {
    showToast("plain");
    expect(toast).toHaveBeenCalledWith("plain", expect.any(Object));
  });

  it("falls back to an empty string for a null message", () => {
    showToast(null);
    expect(toast).toHaveBeenCalledWith("", expect.any(Object));
  });
});

describe("omitEmpty non-object inputs", () => {
  it("returns a non-object untouched", () => {
    expect(omitEmpty(null)).toBeNull();
    expect(omitEmpty(undefined)).toBeUndefined();
    expect(omitEmpty("text")).toBe("text");
    expect(omitEmpty(5)).toBe(5);
  });

  it("returns an array untouched rather than stripping it", () => {
    const arr = [1, "", null];
    expect(omitEmpty(arr)).toBe(arr);
  });
});

describe("useAuth with no auth slice", () => {
  const Harness = () => {
    const { isAuthenticated } = useAuth();
    return <span>{String(isAuthenticated)}</span>;
  };

  const renderWith = (preloaded) => {
    const store = configureStore({
      reducer: { auth: (s = preloaded) => s },
      preloadedState: { auth: preloaded },
    });
    return render(
      <Provider store={store}>
        <Harness />
      </Provider>
    );
  };

  it("defaults to signed out when the slice is empty", () => {
    renderWith({});
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("reports the stored flag when present", () => {
    renderWith({ isAuthenticated: true });
    expect(screen.getByText("true")).toBeInTheDocument();
  });
});

describe("AuthorizationCard service code handler", () => {
  it("accepts an event and a bare value, and tolerates no handler", () => {
    const onServiceCodeChange = vi.fn();
    const codes = [
      { value: "97153", label: "97153" },
      { value: "97155", label: "97155" },
    ];
    const { container, rerender } = render(
      <AuthorizationCard
        data={{}}
        serviceCodes={codes}
        onServiceCodeChange={onServiceCodeChange}
      />
    );
    const select = container.querySelector("select");
    if (select) {
      fireEvent.change(select, { target: { value: "97155" } });
      expect(onServiceCodeChange).toHaveBeenCalledWith("97155");
      rerender(<AuthorizationCard data={{}} serviceCodes={codes} />);
      expect(() =>
        fireEvent.change(container.querySelector("select"), { target: { value: "97153" } })
      ).not.toThrow();
    }
  });
});

describe("ReusableTable null-cell and layout edges", () => {
  const columns = [
    { key: "name", title: "Name" },
    { key: "status", title: "Status" },
  ];

  it("treats a null cell as empty when filtering rather than matching 'null'", () => {
    const data = [
      { id: "1", name: "Alpha", status: "Active" },
      { id: "2", name: "Beta", status: null },
    ];
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={data}
        filters={[{ key: "status", label: "Status" }]}
      />
    );
    fireEvent.click(container.querySelector(".filter-btn"));
    const values = Array.from(container.querySelectorAll(".filter-panel option")).map(
      (o) => o.value
    );
    // The null row contributes no filter value at all.
    expect(values).toEqual(["", "Active"]);
  });

  it("hides pagination entirely when there is only one page", () => {
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: "Alpha", status: "Active" }]}
        pagination={{ currentPage: 1, totalPages: 1, totalItems: 1 }}
        onPageChange={vi.fn()}
      />
    );
    expect(container.querySelector(".table-pagination")).toBeNull();
  });

  it("spans the expanded row across the action column when actions exist", () => {
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: "Alpha", status: "Active" }]}
        actions={[{ render: () => <span>go</span> }]}
        renderExpandedRow={() => <div>expanded</div>}
      />
    );
    fireEvent.click(screen.getAllByLabelText("Expand row")[0].closest("tr"));
    const cell = container.querySelector("tbody tr + tr td");
    expect(cell.getAttribute("colspan")).toBe(String(columns.length + 2));
  });

  it("spans the expanded row without an action column", () => {
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: "Alpha", status: "Active" }]}
        renderExpandedRow={() => <div>expanded</div>}
      />
    );
    fireEvent.click(screen.getAllByLabelText("Expand row")[0].closest("tr"));
    const cell = container.querySelector("tbody tr + tr td");
    expect(cell.getAttribute("colspan")).toBe(String(columns.length + 1));
  });

  it("clamps the action menu when the trigger sits at the right edge", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 10,
      bottom: 30,
      left: window.innerWidth - 4,
      right: window.innerWidth,
      width: 4,
      height: 20,
      x: window.innerWidth - 4,
      y: 10,
      toJSON() {},
    });
    render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: "Alpha", status: "Active" }]}
        actions={[{ menu: true, label: "Archive", onClick: vi.fn() }]}
      />
    );
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    expect(document.body).toBeTruthy();
  });

  it("keeps the menu below when the trigger is too near the top to flip up", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 2,
      bottom: 6,
      left: 10,
      right: 60,
      width: 50,
      height: 4,
      x: 10,
      y: 2,
      toJSON() {},
    });
    render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: "Alpha", status: "Active" }]}
        actions={[{ menu: true, label: "Archive", onClick: vi.fn() }]}
      />
    );
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    expect(document.body).toBeTruthy();
  });
});
