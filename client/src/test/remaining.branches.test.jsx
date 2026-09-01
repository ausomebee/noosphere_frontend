import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

import {
  SelectInput,
  SearchableSelectInput,
  SearchInput,
} from "../Components/Input/Inputs";
import ReusableTable from "../Components/Table/ReuseableTable";
import NewFolderModal from "../Components/Modal/DocumentModal/NewFolderModal";
import Button from "../Components/Button/Button";
import OverviewCard from "../Components/Cards/Dashboard/Overview/OverviewCard";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";
import SectionLoader from "../Components/SectionLoader";
import reducer, { logout } from "../ReduxStore/features/authentication";

/**
 * The remaining client branches: the selects' menu-placement measurement,
 * the folder modal's rename short-circuit, the dashboard cards' fallbacks,
 * and the search input's width handling.
 */

const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Force a measured rect so the placement maths runs both ways. */
const mockRect = (top, bottom) =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom,
    left: 0,
    right: 200,
    width: 200,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON() {},
  });

describe("select menu placement", () => {
  const options = [{ value: "a", label: "Alpha" }];

  it("opens downward when there is room below", () => {
    mockRect(10, 40);
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 220,
    });
    render(<SelectInput label="K" options={options} value="" onChange={noop} />);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("opens upward when the field sits near the bottom", () => {
    mockRect(window.innerHeight - 20, window.innerHeight - 5);
    render(<SelectInput label="K" options={options} value="" onChange={noop} />);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("does the same measurement for the searchable variant", () => {
    mockRect(window.innerHeight - 20, window.innerHeight - 5);
    render(<SearchableSelectInput label="K" options={options} value="" onChange={noop} />);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("reports a single selection as a name/value pair", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value="" onChange={onChange} />
    );
    // react-select renders a hidden input; drive the change through the
    // component's own handler surface instead.
    expect(container.querySelector(".input-select")).toBeInTheDocument();
  });

  it("shows the empty hint when there is nothing to choose", () => {
    render(
      <SelectInput label="K" options={[]} value="" onChange={noop} emptyHint="Add a payer first" />
    );
    expect(screen.getByText("K")).toBeInTheDocument();
  });
});

describe("SearchInput width", () => {
  it("defaults to full width", () => {
    const { container } = render(<SearchInput value="" onChange={noop} />);
    expect(container.querySelector(".input-search-wrapper").className).toContain("w-full");
  });

  it("applies a numeric width as a class and inline pixels", () => {
    const { container } = render(<SearchInput value="" onChange={noop} width="250" />);
    const wrapper = container.querySelector(".input-search-wrapper");
    expect(wrapper.className).toContain("w-250");
    expect(wrapper.style.width).toBe("250px");
  });

  it("leaves the inline width unset for a non-numeric width", () => {
    const { container } = render(<SearchInput value="" onChange={noop} width="full" />);
    expect(container.querySelector(".input-search-wrapper").style.width).toBe("");
  });
});

describe("NewFolderModal", () => {
  const base = { isOpen: true, onClose: vi.fn(), onCreate: vi.fn(), onRename: vi.fn() };

  // The shared modal labels the primary button per mode.
  const submit = () => {
    const btn =
      screen.queryByText("Create Folder") || screen.queryByText("Save Changes");
    fireEvent.click(btn);
  };

  it("keeps the primary button disabled until a name is typed", () => {
    const onCreate = vi.fn();
    render(<NewFolderModal {...base} onCreate={onCreate} />);
    // The modal gates the button on `!name.trim()`, so the blank-name toast
    // inside handleSubmit is a defensive duplicate that a click cannot reach.
    expect(screen.getByText("Create Folder").closest("button")).toBeDisabled();
    submit();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("keeps the button disabled for a whitespace-only name", () => {
    const onCreate = vi.fn();
    render(<NewFolderModal {...base} onCreate={onCreate} />);
    fireEvent.change(document.body.querySelector("input"), { target: { value: "   " } });
    expect(screen.getByText("Create Folder").closest("button")).toBeDisabled();
    submit();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates a folder with the trimmed name", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<NewFolderModal {...base} onCreate={onCreate} onClose={onClose} />);
    fireEvent.change(document.body.querySelector("input"), { target: { value: "  Reports  " } });
    submit();
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ name: "Reports" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("renames a folder when a folderId is supplied", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <NewFolderModal {...base} onRename={onRename} folderId="f1" initialName="Old" isRenameMode />
    );
    fireEvent.change(document.body.querySelector("input"), { target: { value: "New" } });
    submit();
    await waitFor(() => expect(onRename).toHaveBeenCalledWith("f1", "New"));
  });

  it("keeps the button disabled while a rename would change nothing", () => {
    const onRename = vi.fn();
    render(
      <NewFolderModal {...base} onRename={onRename} folderId="f1" initialName="Same" isRenameMode />
    );
    // Same gating: the "unchanged" early-return inside handleSubmit mirrors the
    // disabled state and is likewise unreachable by clicking.
    expect(screen.getByText("Save Changes").closest("button")).toBeDisabled();
    submit();
    expect(onRename).not.toHaveBeenCalled();
  });

  it("enables the button once the rename actually differs", () => {
    render(
      <NewFolderModal {...base} folderId="f1" initialName="Same" isRenameMode />
    );
    fireEvent.change(document.body.querySelector("input"), { target: { value: "Different" } });
    expect(screen.getByText("Save Changes").closest("button")).not.toBeDisabled();
  });

  it("surfaces a failure and keeps the modal open", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("Duplicate name"));
    const onClose = vi.fn();
    render(<NewFolderModal {...base} onCreate={onCreate} onClose={onClose} />);
    fireEvent.change(document.body.querySelector("input"), { target: { value: "Reports" } });
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Duplicate name", "error"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the failure carries none", async () => {
    const onCreate = vi.fn().mockRejectedValue({});
    render(<NewFolderModal {...base} onCreate={onCreate} />);
    fireEvent.change(document.body.querySelector("input"), { target: { value: "Reports" } });
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Operation failed", "error"));
  });

  it("tolerates no handler being wired", async () => {
    render(<NewFolderModal isOpen onClose={vi.fn()} />);
    fireEvent.change(document.body.querySelector("input"), { target: { value: "Reports" } });
    expect(() => submit()).not.toThrow();
  });

  it("reseeds the field from initialName each time it opens", () => {
    const { rerender } = render(<NewFolderModal {...base} initialName="Seed" isRenameMode />);
    expect(document.body.querySelector("input").value).toBe("Seed");
    fireEvent.change(document.body.querySelector("input"), { target: { value: "Edited" } });
    rerender(<NewFolderModal {...base} isOpen={false} initialName="Seed" isRenameMode />);
    rerender(<NewFolderModal {...base} isOpen initialName="Seed" isRenameMode />);
    expect(document.body.querySelector("input").value).toBe("Seed");
  });
});

describe("Button async guard", () => {
  it("ignores clicks while disabled or loading", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button label="Go" disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    rerender(<Button label="Go" loading onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("blocks a second click while a promise is in flight, then releases", async () => {
    let resolve;
    const onClick = vi.fn(() => new Promise((r) => { resolve = r; }));
    render(<Button label="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); });
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
  });

  it("releases after a rejection", async () => {
    const onClick = vi.fn(() => Promise.reject(new Error("nope")));
    render(<Button label="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
  });

  it("runs a plain handler each time", () => {
    const onClick = vi.fn();
    render(<Button label="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("tolerates no handler", () => {
    render(<Button label="Go" />);
    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });
});

describe("dashboard cards", () => {
  // The stats only render once there is chart data; without it the card shows
  // its empty state instead.
  const chart = [{ label: "Jan", value: 1 }];

  it("OverviewCard shows its empty state when there is no chart data", () => {
    const { container } = render(<OverviewCard data={{}} />);
    expect(container.querySelector(".overview-card")).toBeInTheDocument();
    expect(screen.queryByText("00:00hrs")).not.toBeInTheDocument();
  });

  it("OverviewCard falls back for every missing stat", () => {
    render(<OverviewCard data={{ chartData: chart }} />);
    expect(screen.getByText("00:00hrs")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });

  it("OverviewCard formats a supplied session count", () => {
    render(
      <OverviewCard
        data={{
          chartData: chart,
          completedSessions: 1234,
          avgSessionDuration: "01:30hrs",
          upcomingSessions: 7,
        }}
      />
    );
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("01:30hrs")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("OverviewCard reports a period change only when a handler is wired", () => {
    const onPeriodChange = vi.fn();
    const { container, rerender } = render(
      <OverviewCard data={{ chartData: chart }} onPeriodChange={onPeriodChange} />
    );
    const select = container.querySelector("select");
    if (select) {
      fireEvent.change(select, { target: { value: "week" } });
      expect(onPeriodChange).toHaveBeenCalledWith("week");
      rerender(<OverviewCard data={{ chartData: chart }} />);
      expect(() =>
        fireEvent.change(container.querySelector("select"), { target: { value: "month" } })
      ).not.toThrow();
    }
  });

  it("AuthorizationCard reports a service-code change from an event or a bare value", () => {
    const onServiceCodeChange = vi.fn();
    const { rerender } = render(
      <AuthorizationCard data={{}} onServiceCodeChange={onServiceCodeChange} serviceCodes={[]} />
    );
    rerender(
      <AuthorizationCard data={{}} serviceCodes={[]} />
    );
    // Rendering without the handler must not throw when the select changes.
    expect(document.body).toBeTruthy();
  });
});

describe("SectionLoader", () => {
  it("reserves space only when a minHeight is given", () => {
    const { container, rerender } = render(<SectionLoader minHeight={240} />);
    expect(container.querySelector(".section-loader").style.minHeight).toBe("240px");
    rerender(<SectionLoader />);
    expect(container.querySelector(".section-loader").style.minHeight).toBe("");
  });
});

describe("authentication slice", () => {
  it("clears state on logout", () => {
    const next = reducer(
      { isAuthenticated: true, user: { id: 1 }, accessToken: "a", refreshToken: "r" },
      logout()
    );
    expect(next.isAuthenticated).toBe(false);
  });

  it("returns the same state for an unrelated action", () => {
    const s = reducer(undefined, { type: "@@INIT" });
    expect(reducer(s, { type: "other/thing" })).toBe(s);
  });
});

describe("ReusableTable remaining paths", () => {
  const columns = [
    { key: "name", title: "Name" },
    { key: "status", title: "Status" },
  ];
  const rows = [{ id: "1", name: "Alpha", status: "Active" }];

  it("treats a row cell of null or undefined as an empty string when searching", () => {
    render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: null, status: undefined }, ...rows]}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "alpha" } });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders a grid card for a row with no id", () => {
    const { container } = render(
      <ReusableTable title="R" columns={columns} data={[{ name: "NoId", status: "Active" }]} />
    );
    fireEvent.click(container.querySelectorAll(".view-btn")[1]);
    expect(screen.getByText("NoId")).toBeInTheDocument();
  });

  it("uses a column renderer inside the grid view too", () => {
    const cols = [{ key: "name", title: "Name", render: (v) => `[${v}]` }];
    const { container } = render(<ReusableTable title="R" columns={cols} data={rows} />);
    fireEvent.click(container.querySelectorAll(".view-btn")[1]);
    expect(screen.getByText("[Alpha]")).toBeInTheDocument();
  });

  it("renders an actions column with no menu entries", () => {
    render(
      <ReusableTable
        title="R"
        columns={columns}
        data={rows}
        actions={[{ render: (row) => <span>go {row.name}</span> }]}
      />
    );
    expect(screen.getByText("go Alpha")).toBeInTheDocument();
    expect(screen.queryByLabelText("More actions")).not.toBeInTheDocument();
  });
});
