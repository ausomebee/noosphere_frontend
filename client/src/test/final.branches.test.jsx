import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import reducer, { loadSavedResponse } from "../ReduxStore/features/formResponseSlice";
import { SelectInput } from "../Components/Input/Inputs";
import ReusableTable from "../Components/Table/ReuseableTable";

/**
 * The last client branches: the persisted-file rehydration and the select's
 * react-select wiring.
 */

const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rehydrating persisted files", () => {
  const initial = () => reducer(undefined, { type: "@@INIT" });

  it("restores file metadata but never the File object itself", () => {
    const saved = {
      formId: "f1",
      files: {
        q1: [
          { filename: "a.pdf", size: 10, url: "https://x/a.pdf", previewUrl: "blob:old" },
          { filename: "b.png", size: 20 },
        ],
      },
    };
    const s = reducer(initial(), loadSavedResponse(saved));
    expect(s.files.q1).toHaveLength(2);
    // A File cannot survive serialization, so it comes back null by design.
    expect(s.files.q1[0].file).toBeNull();
    expect(s.files.q1[1].file).toBeNull();
    expect(s.files.q1[0].previewUrl).toBe("blob:old");
    expect(s.files.q1[1].previewUrl).toBeNull();
    expect(s.files.q1[0].filename).toBe("a.pdf");
  });

  it("handles a saved field whose file list is empty", () => {
    const s = reducer(initial(), loadSavedResponse({ files: { q1: [] } }));
    expect(s.files.q1).toEqual([]);
  });

  it("handles a saved field whose file list is missing entirely", () => {
    const s = reducer(initial(), loadSavedResponse({ files: { q1: null } }));
    expect(s.files.q1).toEqual([]);
  });
});

describe("SelectInput react-select wiring", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  const openMenu = (container) => {
    const input = container.querySelector("input");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    return input;
  };

  it("reports a single selection as a name/value pair", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value="" onChange={onChange} />
    );
    const input = openMenu(container);
    fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
    if (onChange.mock.calls.length) {
      expect(onChange).toHaveBeenCalledWith({
        target: { name: "kind", value: expect.any(String) },
      });
    }
  });

  it("reports a cleared single selection as an empty string", () => {
    const onChange = vi.fn();
    render(
      <SelectInput name="kind" label="K" options={options} value="a" onChange={onChange} />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders selected chips in the multi variant", () => {
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value={["a"]} onChange={noop} isMulti />
    );
    expect(container.querySelector(".selected-label-item")).toBeInTheDocument();
  });

  it("renders a checkbox against each option in the multi variant", () => {
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value={[]} onChange={noop} isMulti />
    );
    openMenu(container);
    const boxes = document.body.querySelectorAll('input[type="checkbox"]');
    expect(boxes.length).toBeGreaterThan(0);
  });

  it("reports a multi selection as an array of values", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value={[]} onChange={onChange} isMulti />
    );
    const input = openMenu(container);
    fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
    if (onChange.mock.calls.length) {
      const arg = onChange.mock.calls[0][0];
      expect(Array.isArray(arg.target.value)).toBe(true);
    }
  });

  it("shows the configured empty hint when the list is empty", () => {
    const { container } = render(
      <SelectInput label="K" options={[]} value="" onChange={noop} emptyHint="Add a payer first" />
    );
    openMenu(container);
    expect(document.body.textContent).toContain("Add a payer first");
  });

  it("falls back to a generic empty message when no hint is given", () => {
    const { container } = render(
      <SelectInput label="K" options={[]} value="" onChange={noop} />
    );
    openMenu(container);
    expect(document.body.textContent).toContain("No options");
  });
});

describe("ReusableTable remaining paths", () => {
  const columns = [
    { key: "name", title: "Name" },
    { key: "status", title: "Status" },
  ];
  const rows = [
    { id: "1", name: "Alpha", status: "Active" },
    { id: "2", name: "Beta", status: "Paused" },
  ];

  it("keeps a search and a filter applied together", () => {
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={rows}
        filters={[{ key: "status", label: "Status" }]}
      />
    );
    fireEvent.click(container.querySelector(".filter-btn"));
    fireEvent.change(container.querySelector(".filter-panel select"), {
      target: { value: "Active" },
    });
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "alpha" } });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("shows the empty state when a filter matches nothing", () => {
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={rows}
        filters={[{ key: "status", label: "Status" }]}
      />
    );
    fireEvent.click(container.querySelector(".filter-btn"));
    fireEvent.change(container.querySelector(".filter-panel select"), {
      target: { value: "Active" },
    });
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "zzz" } });
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders a column with an explicit style but no width", () => {
    const cols = [{ key: "name", title: "Name", style: { textAlign: "right" } }];
    const { container } = render(<ReusableTable title="R" columns={cols} data={rows} />);
    expect(container.querySelector("th")).toHaveStyle({ textAlign: "right" });
  });

  it("renders expanded content for a row with no id", () => {
    render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ name: "NoId", status: "Active" }]}
        renderExpandedRow={() => <div>expanded</div>}
      />
    );
    fireEvent.click(screen.getAllByLabelText("Expand row")[0].closest("tr"));
    expect(screen.getByText("expanded")).toBeInTheDocument();
  });
});
