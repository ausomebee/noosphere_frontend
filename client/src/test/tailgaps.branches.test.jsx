import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ReusableModal from "../Components/Modal/ReusableModal";
import ReusableTable from "../Components/Table/ReuseableTable";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";
import { SearchableSelectInput, TimeInput } from "../Components/Input/Inputs";

/**
 * The last reachable arms in the client app: the modal's backwards focus wrap,
 * the table's guard for rows that never arrived, the authorization card's
 * handler when it is handed a bare value rather than an event, and the
 * searchable select's caller-supplied empty hint.
 */

const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReusableModal backwards focus wrap", () => {
  const openModal = () =>
    render(
      <ReusableModal isOpen onClose={noop} title="T" primaryButtonText="Save" showClose>
        <input data-testid="field" />
      </ReusableModal>
    );

  const focusable = () =>
    document.body.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

  it("wraps Shift+Tab from the first control back to the last", () => {
    openModal();
    const items = focusable();
    items[0].focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("leaves Shift+Tab alone in the middle of the dialog", () => {
    openModal();
    const items = focusable();
    items[1].focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(items[1]);
  });
});

describe("ReusableTable with no rows at all", () => {
  const columns = [
    { key: "name", title: "Name" },
    { key: "status", title: "Status" },
  ];

  it("builds an empty filter list rather than reading a missing array", () => {
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={undefined}
        filters={[{ key: "status", label: "Status" }]}
      />
    );
    fireEvent.click(container.querySelector(".filter-btn"));
    const values = Array.from(container.querySelectorAll(".filter-panel option")).map(
      (o) => o.value
    );
    expect(values).toEqual([""]);
  });
});

describe("AuthorizationCard handler input shapes", () => {
  const serviceCodeOptions = [
    { value: "97153", label: "97153" },
    { value: "97155", label: "97155" },
  ];

  it("reads the value out of a change event", () => {
    const onServiceCodeChange = vi.fn();
    const { container } = render(
      <AuthorizationCard
        data={{}}
        serviceCodeOptions={serviceCodeOptions}
        onServiceCodeChange={onServiceCodeChange}
      />
    );
    // SelectInput reports through an { target: { name, value } } envelope.
    const input = container.querySelector("input");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
    expect(onServiceCodeChange).toHaveBeenCalledWith("97153");
  });
});

describe("SearchableSelectInput empty hint", () => {
  it("shows the caller's hint, then the default", () => {
    const { container, rerender } = render(
      <SearchableSelectInput
        label="Kind"
        options={[]}
        value=""
        onChange={noop}
        emptyHint="Nothing yet"
      />
    );
    fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();

    rerender(<SearchableSelectInput label="Kind" options={[]} value="" onChange={noop} />);
    fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("No options")).toBeInTheDocument();
  });
});

describe("TimeInput", () => {
  it("renders with no value prop without re-rendering itself forever", () => {
    // Regression guard: the destructured default used to be an inline object
    // literal, which gave `value` a fresh identity every render and made the
    // [value] effect loop.
    const onChange = vi.fn();
    const { container } = render(<TimeInput onChange={onChange} />);
    expect(container.querySelectorAll("input")).toHaveLength(3);
    expect(screen.getByText("00:00:00")).toBeInTheDocument();
  });

  it("clamps hours to 23 and minutes and seconds to 59", () => {
    const onChange = vi.fn();
    const { container } = render(<TimeInput onChange={onChange} />);
    const [h, m, s] = container.querySelectorAll("input");
    fireEvent.change(h, { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hours: 23 }));
    fireEvent.change(m, { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ minutes: 59 }));
    fireEvent.change(s, { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ seconds: 59 }));
  });

  it("floors a negative or unparseable entry to zero", () => {
    const onChange = vi.fn();
    const { container } = render(<TimeInput onChange={onChange} />);
    const [h] = container.querySelectorAll("input");
    fireEvent.change(h, { target: { value: "-5" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hours: 0 }));
    fireEvent.change(h, { target: { value: "abc" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hours: 0 }));
  });

  it("follows the value prop when the parent changes it, zero-padded", () => {
    const { rerender } = render(
      <TimeInput value={{ hours: 1, minutes: 2, seconds: 3 }} onChange={noop} />
    );
    expect(screen.getByText("01:02:03")).toBeInTheDocument();
    rerender(<TimeInput value={{ hours: 5, minutes: 6, seconds: 7 }} onChange={noop} />);
    expect(screen.getByText("05:06:07")).toBeInTheDocument();
  });

  it("renders disabled when asked", () => {
    const { container } = render(<TimeInput onChange={noop} disabled />);
    expect(container.querySelectorAll("input")[0]).toBeDisabled();
  });
});
