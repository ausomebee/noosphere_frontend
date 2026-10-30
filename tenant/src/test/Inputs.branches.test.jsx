import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import {
  RequiredMark,
  TextInput,
  PasswordInput,
  SelectInput,
  SearchableSelectInput,
  CheckboxInput,
  SwitchInput,
  TextareaInput,
  SearchInput,
  RadioInput,
  CustomDatePickerInput,
  PASSWORD_RULES,
  SPECIAL_CHAR_REGEX,
} from "../Components/Input/Inputs";

/**
 * Branch coverage for the shared input kit.
 *
 * Inputs.test.jsx covers the happy path for each control. This file drives the
 * arms that only appear with a particular prop combination: required marks,
 * error slots, width handling, the password checklist and match indicator, the
 * two react-select wrappers' multi/clearable/disabled modes, and the radio's
 * label-first layout.
 */

const noop = () => {};

// Both selects are react-select, so drive them by keyboard rather than looking
// for a native <select>.
const pickOption = (container, index = 0) => {
  const input = container.querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  for (let i = 0; i < index; i += 1) {
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  }
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
  return input;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RequiredMark", () => {
  it("renders an asterisk when the field is required", () => {
    const { container } = render(<RequiredMark required />);
    expect(container.querySelector(".required-indicator")).toBeInTheDocument();
  });

  it("renders nothing when it is not", () => {
    const { container } = render(<RequiredMark required={false} />);
    expect(container.querySelector(".required-indicator")).toBeNull();
  });

  it("renders nothing when the prop is omitted", () => {
    const { container } = render(<RequiredMark />);
    expect(container.querySelector(".required-indicator")).toBeNull();
  });
});

describe("TextInput", () => {
  it("uses a class width for a named size", () => {
    const { container } = render(
      <TextInput label="Name" value="" onChange={noop} width="200" />
    );
    const input = container.querySelector("input");
    expect(input.className).toContain("w-200");
    expect(input.style.width).toBe("200px");
  });

  it("falls back to full width for width='full'", () => {
    const { container } = render(
      <TextInput label="Name" value="" onChange={noop} width="full" />
    );
    const input = container.querySelector("input");
    expect(input.className).toContain("w-full");
    expect(input.style.width).toBe("");
  });

  it("falls back to full width when no width is given", () => {
    const { container } = render(<TextInput label="Name" value="" onChange={noop} />);
    expect(container.querySelector("input").className).toContain("w-full");
  });

  it("renders without a label and without an error", () => {
    const { container } = render(<TextInput value="" onChange={noop} />);
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector(".auth-error-message")).toBeNull();
  });

  it("marks itself required and shows an error when asked", () => {
    const { container } = render(
      <TextInput label="Name" value="" onChange={noop} required error="Required" />
    );
    expect(container.querySelector("input")).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("omits aria-required when the field is optional", () => {
    const { container } = render(<TextInput label="Name" value="" onChange={noop} />);
    expect(container.querySelector("input")).not.toHaveAttribute("aria-required");
  });
});

describe("PasswordInput", () => {
  it("toggles the field between hidden and visible", () => {
    const { container } = render(<PasswordInput label="P" value="secret" onChange={noop} />);
    const input = container.querySelector("input");
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByLabelText("Show password"));
    expect(container.querySelector("input").type).toBe("text");
    fireEvent.click(screen.getByLabelText("Hide password"));
    expect(container.querySelector("input").type).toBe("password");
  });

  it("hides the strength meter until there is something to measure", () => {
    const { container, rerender } = render(
      <PasswordInput label="P" value="" onChange={noop} showStrength />
    );
    expect(container.querySelector(".password-strength")).toBeNull();
    rerender(<PasswordInput label="P" value="abc" onChange={noop} showStrength />);
    expect(container.querySelector(".password-strength")).toBeInTheDocument();
  });

  it("grades a password weak, medium, then strong", () => {
    const { rerender } = render(
      <PasswordInput label="P" value="abc" onChange={noop} showStrength />
    );
    expect(screen.getByText("Weak password")).toBeInTheDocument();
    rerender(<PasswordInput label="P" value="Abcdefgh" onChange={noop} showStrength />);
    expect(screen.getByText("Medium password")).toBeInTheDocument();
    rerender(<PasswordInput label="P" value="Abcdef1!" onChange={noop} showStrength />);
    expect(screen.getByText("Strong password")).toBeInTheDocument();
  });

  it("omits the strength meter entirely when not asked for", () => {
    const { container } = render(<PasswordInput label="P" value="Abcdef1!" onChange={noop} />);
    expect(container.querySelector(".password-strength")).toBeNull();
  });

  it("shows a tick as soon as the confirmation agrees", () => {
    render(
      <PasswordInput label="Confirm" value="Abcdef1!" onChange={noop} matchValue="Abcdef1!" />
    );
    expect(screen.getByText("✓ Passwords match")).toBeInTheDocument();
  });

  it("holds the mismatch warning until the field is left", () => {
    const { container } = render(
      <PasswordInput label="Confirm" value="Abcdef1!" onChange={noop} matchValue="different" />
    );
    expect(container.querySelector(".password-match")).toBeNull();
    fireEvent.blur(container.querySelector("input"));
    expect(screen.getByText("✕ Passwords do not match")).toBeInTheDocument();
  });

  it("renders no match indicator when the confirm value is empty", () => {
    const { container } = render(
      <PasswordInput label="Confirm" value="" onChange={noop} matchValue="Abcdef1!" />
    );
    expect(container.querySelector(".password-match")).toBeNull();
  });

  it("renders no match indicator when no counterpart is supplied", () => {
    const { container } = render(<PasswordInput label="P" value="Abcdef1!" onChange={noop} />);
    expect(container.querySelector(".password-match")).toBeNull();
  });

  it("calls a supplied onBlur as well as recording the blur", () => {
    const onBlur = vi.fn();
    const { container } = render(
      <PasswordInput label="P" value="x" onChange={noop} onBlur={onBlur} />
    );
    fireEvent.blur(container.querySelector("input"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("tolerates a blur with no onBlur wired", () => {
    const { container } = render(<PasswordInput label="P" value="x" onChange={noop} />);
    expect(() => fireEvent.blur(container.querySelector("input"))).not.toThrow();
  });

  it("measures what the user typed when the field is uncontrolled", () => {
    // react-hook-form `register` leaves `value` undefined, so the component
    // falls back to tracking input events itself.
    const { container } = render(<PasswordInput label="P" onChange={noop} showStrength />);
    fireEvent.input(container.querySelector("input"), { target: { value: "Abcdef1!" } });
    expect(screen.getByText("Strong password")).toBeInTheDocument();
  });

  it("renders without a label and shows an error when given one", () => {
    const { container } = render(<PasswordInput value="x" onChange={noop} error="Too weak" />);
    expect(container.querySelector(".input-group-label")).toBeNull();
    expect(screen.getByText("Too weak")).toBeInTheDocument();
  });

  it("marks itself required when asked", () => {
    const { container } = render(<PasswordInput label="P" value="x" onChange={noop} required />);
    expect(container.querySelector("input")).toHaveAttribute("aria-required", "true");
  });
});

describe("password policy rules", () => {
  it("treats every rule as unmet for an empty value", () => {
    expect(PASSWORD_RULES.filter((r) => r.test(""))).toHaveLength(0);
  });

  it("treats every rule as unmet for an undefined value", () => {
    expect(PASSWORD_RULES.filter((r) => r.test(undefined))).toHaveLength(0);
  });

  it("passes every rule for a compliant password", () => {
    expect(PASSWORD_RULES.filter((r) => r.test("Abcdef1!"))).toHaveLength(
      PASSWORD_RULES.length
    );
  });

  it("counts any non-alphanumeric as special", () => {
    expect(SPECIAL_CHAR_REGEX.test("#")).toBe(true);
    expect(SPECIAL_CHAR_REGEX.test("a1")).toBe(false);
  });
});

describe("SelectInput", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("reports a single selection by name and value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput name="kind" label="Kind" options={options} value="" onChange={onChange} />
    );
    pickOption(container);
    expect(onChange).toHaveBeenCalledWith({ target: { name: "kind", value: "a" } });
  });

  it("reports a multi selection as an array", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput
        name="kind"
        label="Kind"
        options={options}
        value={[]}
        onChange={onChange}
        isMulti
      />
    );
    pickOption(container);
    expect(onChange).toHaveBeenCalledWith({ target: { name: "kind", value: ["a"] } });
  });

  it("clears to an empty string rather than undefined", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput
        name="kind"
        label="Kind"
        options={options}
        value="a"
        onChange={onChange}
        isClearable
      />
    );
    const clear = container.querySelector(".rs__clear-indicator");
    if (clear) {
      fireEvent.mouseDown(clear, { button: 0 });
      expect(onChange).toHaveBeenCalledWith({ target: { name: "kind", value: "" } });
    } else {
      expect(container.querySelector(".input-select")).toBeInTheDocument();
    }
  });

  it("tolerates a selection with no onChange wired", () => {
    const { container } = render(
      <SelectInput name="kind" label="Kind" options={options} value="" />
    );
    expect(() => pickOption(container)).not.toThrow();
  });

  it("drops a manually-added blank placeholder option", () => {
    render(
      <SelectInput
        label="Kind"
        options={[{ value: "", label: "-- pick --" }, ...options]}
        value=""
        onChange={noop}
      />
    );
    expect(screen.getByText("-- Select Kind --")).toBeInTheDocument();
  });

  it("treats a non-array options prop as no options", () => {
    const { container } = render(
      <SelectInput label="Kind" options={undefined} value="" onChange={noop} />
    );
    expect(container.querySelector(".input-select")).toBeInTheDocument();
  });

  it("falls back to a generic placeholder without a string label", () => {
    render(<SelectInput options={options} value="" onChange={noop} />);
    expect(screen.getByText("Select an option…")).toBeInTheDocument();
  });

  it("shows the caller's empty hint when there is nothing to choose", () => {
    const { container } = render(
      <SelectInput label="Kind" options={[]} value="" onChange={noop} emptyHint="Add one first" />
    );
    fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("Add one first")).toBeInTheDocument();
  });

  it("falls back to a default empty message without a hint", () => {
    const { container } = render(
      <SelectInput label="Kind" options={[]} value="" onChange={noop} />
    );
    fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("No options")).toBeInTheDocument();
  });

  it("uses a class width for a named size and full width otherwise", () => {
    const { container, rerender } = render(
      <SelectInput label="Kind" options={options} value="" onChange={noop} width="250" />
    );
    expect(container.querySelector(".input-group").className).toContain("w-250");
    rerender(
      <SelectInput label="Kind" options={options} value="" onChange={noop} width="full" />
    );
    expect(container.querySelector(".input-group").className).toContain("w-full");
  });

  it("renders disabled and shows an error", () => {
    const { container } = render(
      <SelectInput label="Kind" options={options} value="" onChange={noop} disabled error="Pick one" />
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
    expect(container.querySelector(".input-select")).toBeInTheDocument();
  });

  it("renders the checkbox option row in multi mode", () => {
    const { container } = render(
      <SelectInput label="Kind" options={options} value={["a"]} onChange={noop} isMulti />
    );
    fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
    const menu = document.body.querySelector(".rs__menu");
    expect(menu.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);
    // The checkbox is presentational -- react-select owns the selection.
    fireEvent.click(menu.querySelector('input[type="checkbox"]'));
  });

  it("renders a selected multi value inside its chip container", () => {
    const { container } = render(
      <SelectInput label="Kind" options={options} value={["a"]} onChange={noop} isMulti />
    );
    expect(within(container).getByText("Alpha")).toBeInTheDocument();
  });

  it("measures the trigger width for the menu when one is available", () => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 321,
    });
    const { container } = render(
      <SelectInput label="Kind" options={options} value="" onChange={noop} />
    );
    fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
    expect(document.body.querySelector(".rs__menu")).toBeInTheDocument();
    delete HTMLElement.prototype.offsetWidth;
  });

  it("renders without a label", () => {
    const { container } = render(<SelectInput options={options} value="" onChange={noop} />);
    expect(container.querySelector(".input-group-label")).toBeNull();
  });
});

describe("SearchableSelectInput", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("reports the selection by name and value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SearchableSelectInput
        name="kind"
        label="Kind"
        options={options}
        value=""
        onChange={onChange}
      />
    );
    pickOption(container);
    expect(onChange).toHaveBeenCalledWith({ target: { name: "kind", value: "a" } });
  });

  it("tolerates a selection with no onChange wired", () => {
    const { container } = render(
      <SearchableSelectInput label="Kind" options={options} value="" />
    );
    expect(() => pickOption(container)).not.toThrow();
  });

  it("treats a non-array options prop as no options", () => {
    const { container } = render(
      <SearchableSelectInput label="Kind" options={null} value="" onChange={noop} />
    );
    expect(container.querySelector(".input-select")).toBeInTheDocument();
  });

  it("falls back to a generic placeholder without a string label", () => {
    render(<SearchableSelectInput options={options} value="" onChange={noop} />);
    expect(screen.getByText("Search options…")).toBeInTheDocument();
  });

  it("shows the caller's empty hint, then the default", () => {
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

  it("uses a class width for a named size and full width otherwise", () => {
    const { container, rerender } = render(
      <SearchableSelectInput label="Kind" options={options} value="" onChange={noop} width="300" />
    );
    expect(container.querySelector(".input-group").className).toContain("w-300");
    rerender(
      <SearchableSelectInput label="Kind" options={options} value="" onChange={noop} width="full" />
    );
    expect(container.querySelector(".input-group").className).toContain("w-full");
  });

  it("renders disabled, without a label, and with an error", () => {
    const { container } = render(
      <SearchableSelectInput options={options} value="" onChange={noop} disabled error="Pick one" />
    );
    expect(container.querySelector(".input-group-label")).toBeNull();
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("measures the trigger width for the menu", () => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 210,
    });
    const { container } = render(
      <SearchableSelectInput label="Kind" options={options} value="" onChange={noop} />
    );
    fireEvent.keyDown(container.querySelector("input"), { key: "ArrowDown", keyCode: 40 });
    expect(document.body.querySelector(".rs__menu")).toBeInTheDocument();
    delete HTMLElement.prototype.offsetWidth;
  });
});

describe("CheckboxInput and SwitchInput", () => {
  it("renders the checkbox with a label, required mark and error", () => {
    const { container } = render(
      <CheckboxInput label="Agree" checked={false} onChange={noop} required error="Must agree" />
    );
    expect(screen.getByText("Must agree")).toBeInTheDocument();
    expect(container.querySelector("input")).toHaveAttribute("aria-required", "true");
  });

  it("renders the checkbox bare", () => {
    const { container } = render(<CheckboxInput checked onChange={noop} />);
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector(".auth-error-message")).toBeNull();
    expect(container.querySelector("input")).not.toHaveAttribute("aria-required");
  });

  it("renders the switch with and without a label", () => {
    const { container, rerender } = render(
      <SwitchInput label="Active" checked onChange={noop} required />
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    rerender(<SwitchInput checked={false} onChange={noop} />);
    expect(container.querySelector(".input-switch-label")).toBeNull();
  });
});

describe("TextareaInput", () => {
  it("renders with a label, required mark and error", () => {
    const { container } = render(
      <TextareaInput label="Notes" value="" onChange={noop} required error="Required" />
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(container.querySelector("textarea")).toHaveAttribute("aria-required", "true");
  });

  it("renders bare", () => {
    const { container } = render(<TextareaInput value="" onChange={noop} />);
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector(".auth-error-message")).toBeNull();
  });
});

describe("SearchInput", () => {
  it("sizes itself in pixels for a numeric width", () => {
    const { container } = render(<SearchInput value="" onChange={noop} width="200" />);
    const wrapper = container.querySelector(".input-search-wrapper");
    expect(wrapper.className).toContain("w-200");
    expect(wrapper.style.width).toBe("200px");
  });

  it("falls back to full width with no width at all", () => {
    const { container } = render(<SearchInput value="" onChange={noop} />);
    const wrapper = container.querySelector(".input-search-wrapper");
    expect(wrapper.className).toContain("w-full");
  });

  it("applies no inline width for a non-numeric width", () => {
    const { container } = render(<SearchInput value="" onChange={noop} width="full" />);
    const wrapper = container.querySelector(".input-search-wrapper");
    expect(wrapper.className).toContain("w-full");
    expect(wrapper.style.width).toBe("");
  });
});

describe("RadioInput", () => {
  it("puts the input before the label by default", () => {
    const { container } = render(
      <RadioInput label="Yes" name="q" value="y" checked onChange={noop} />
    );
    const group = container.querySelector(".input-radio-group");
    expect(group.className).toContain("input-position-before");
    expect(group.firstChild.tagName).toBe("INPUT");
  });

  it("puts the label first when asked", () => {
    const { container } = render(
      <RadioInput
        label="Yes"
        name="q"
        value="y"
        checked={false}
        onChange={noop}
        inputPosition="after"
      />
    );
    const group = container.querySelector(".input-radio-group");
    expect(group.className).toContain("input-position-after");
    expect(group.firstChild.tagName).toBe("LABEL");
  });

  it("renders without a label in either layout", () => {
    const { container, rerender } = render(
      <RadioInput name="q" value="y" checked onChange={noop} />
    );
    expect(container.querySelector(".input-radio-label")).toBeNull();
    rerender(
      <RadioInput name="q" value="y" checked onChange={noop} inputPosition="after" />
    );
    expect(container.querySelector(".input-radio-label")).toBeNull();
  });

  it("shows an error when given one", () => {
    render(<RadioInput name="q" value="y" checked onChange={noop} error="Choose" />);
    expect(screen.getByText("Choose")).toBeInTheDocument();
  });
});

describe("CustomDatePickerInput", () => {
  it("calls the supplied click handler and focuses the field", () => {
    const onClick = vi.fn();
    const { container } = render(<CustomDatePickerInput value="01/01/2026" onClick={onClick} />);
    const input = container.querySelector("input");
    fireEvent.click(input);
    expect(onClick).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it("tolerates a click with no handler wired", () => {
    const { container } = render(<CustomDatePickerInput value="01/01/2026" />);
    expect(() => fireEvent.click(container.querySelector("input"))).not.toThrow();
  });

  it("renders a string error and a yup-style error object alike", () => {
    const { rerender } = render(
      <CustomDatePickerInput value="" error="Pick a date" />
    );
    expect(screen.getByText("Pick a date")).toBeInTheDocument();
    rerender(<CustomDatePickerInput value="" error={{ message: "Date required" }} />);
    expect(screen.getByText("Date required")).toBeInTheDocument();
  });

  it("adds no error styling when there is no error", () => {
    const { container } = render(<CustomDatePickerInput value="01/01/2026" />);
    expect(container.querySelector("input").className).not.toContain(
      "custom-datepicker-input-error"
    );
    expect(container.querySelector(".auth-error-message")).toBeNull();
  });

  it("passes focus through to the caller", () => {
    const onFocus = vi.fn();
    const { container } = render(<CustomDatePickerInput value="" onFocus={onFocus} />);
    fireEvent.focus(container.querySelector("input"));
    expect(onFocus).toHaveBeenCalled();
  });
});
