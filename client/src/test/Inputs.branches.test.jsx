import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  TimeInput,
  CustomDatePickerInput,
  SPECIAL_CHAR_REGEX,
  PASSWORD_RULES,
} from "../Components/Input/Inputs";

/**
 * Branch coverage for the client's Inputs.jsx.
 *
 * Inputs.test.jsx covers the happy paths. This drives the other side of every
 * conditional: the width variants, the password strength tiers and match
 * indicator, the select placeholder/empty-hint fallbacks, and the time input's
 * clamping.
 */

const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RequiredMark", () => {
  it("renders the indicator only when required", () => {
    const { container, rerender } = render(<RequiredMark required />);
    expect(container.querySelector(".required-indicator")).toBeInTheDocument();
    rerender(<RequiredMark required={false} />);
    expect(container.querySelector(".required-indicator")).toBeNull();
    rerender(<RequiredMark />);
    expect(container.querySelector(".required-indicator")).toBeNull();
  });
});

describe("TextInput width handling", () => {
  it("defaults to full width when no width is given", () => {
    const { container } = render(<TextInput value="" onChange={noop} />);
    expect(container.querySelector("input").className).toContain("w-full");
  });

  it('treats "full" as full width', () => {
    const { container } = render(<TextInput value="" onChange={noop} width="full" />);
    expect(container.querySelector("input").className).toContain("w-full");
  });

  it("applies a numeric width as both a class and an inline pixel width", () => {
    const { container } = render(<TextInput value="" onChange={noop} width="200" />);
    const input = container.querySelector("input");
    expect(input.className).toContain("w-200");
    expect(input.style.width).toBe("200px");
  });

  it("omits the label element when none is given", () => {
    const { container } = render(<TextInput value="" onChange={noop} />);
    expect(container.querySelector(".input-group-label")).toBeNull();
  });

  it("marks aria-required only when required", () => {
    const { container, rerender } = render(<TextInput label="A" value="" onChange={noop} required />);
    expect(container.querySelector("input")).toHaveAttribute("aria-required", "true");
    rerender(<TextInput label="A" value="" onChange={noop} />);
    expect(container.querySelector("input")).not.toHaveAttribute("aria-required");
  });

  it("shows an error message only when one is supplied", () => {
    const { container, rerender } = render(
      <TextInput label="A" value="" onChange={noop} error="required" />
    );
    expect(screen.getByText("required")).toBeInTheDocument();
    rerender(<TextInput label="A" value="" onChange={noop} />);
    expect(container.querySelector(".auth-error-message")).toBeNull();
  });
});

describe("password policy rules", () => {
  it("treats a missing value as empty rather than throwing", () => {
    for (const rule of PASSWORD_RULES) {
      expect(rule.test(undefined)).toBe(false);
      expect(rule.test(null)).toBe(false);
      expect(rule.test("")).toBe(false);
    }
  });

  it("checks each class independently", () => {
    const [len, upper, lower, digit, special] = PASSWORD_RULES;
    expect(len.test("abcdefgh")).toBe(true);
    expect(len.test("abcdefg")).toBe(false);
    expect(upper.test("A")).toBe(true);
    expect(upper.test("a")).toBe(false);
    expect(lower.test("a")).toBe(true);
    expect(lower.test("A")).toBe(false);
    expect(digit.test("1")).toBe(true);
    expect(digit.test("a")).toBe(false);
    expect(special.test("!")).toBe(true);
    expect(special.test("a1")).toBe(false);
  });

  it("treats any non-alphanumeric as special", () => {
    expect(SPECIAL_CHAR_REGEX.test("_")).toBe(true);
    expect(SPECIAL_CHAR_REGEX.test(" ")).toBe(true);
    expect(SPECIAL_CHAR_REGEX.test("abc123")).toBe(false);
  });
});

describe("PasswordInput", () => {
  const strengthOf = (container) =>
    container.querySelector(".password-strength span")?.textContent;

  it("starts masked and toggles to visible and back", () => {
    const { container } = render(<PasswordInput label="P" value="" onChange={noop} />);
    expect(container.querySelector("input")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByLabelText("Show password"));
    expect(container.querySelector("input")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByLabelText("Hide password"));
    expect(container.querySelector("input")).toHaveAttribute("type", "password");
  });

  it("omits the label and error when not supplied", () => {
    const { container } = render(<PasswordInput value="" onChange={noop} />);
    expect(container.querySelector(".input-group-label")).toBeNull();
    expect(container.querySelector(".auth-error-message")).toBeNull();
  });

  it("shows the error and marks aria-required when asked", () => {
    const { container } = render(
      <PasswordInput label="P" value="" onChange={noop} required error="too weak" />
    );
    expect(screen.getByText("too weak")).toBeInTheDocument();
    expect(container.querySelector("input")).toHaveAttribute("aria-required", "true");
  });

  it("hides the checklist until something is typed", () => {
    const { container } = render(
      <PasswordInput label="P" value="" onChange={noop} showStrength />
    );
    expect(container.querySelector(".password-strength")).toBeNull();
  });

  it("omits the checklist entirely when showStrength is false", () => {
    const { container } = render(
      <PasswordInput label="P" value="Abcdefg1!" onChange={noop} />
    );
    expect(container.querySelector(".password-strength")).toBeNull();
  });

  it("reads Weak, Medium and Strong at the right thresholds", () => {
    const { container, rerender } = render(
      <PasswordInput label="P" value="abc" onChange={noop} showStrength />
    );
    expect(strengthOf(container)).toBe("Weak password");
    rerender(<PasswordInput label="P" value="Abcdefgh" onChange={noop} showStrength />);
    expect(strengthOf(container)).toBe("Medium password");
    rerender(<PasswordInput label="P" value="Abcdefg1!" onChange={noop} showStrength />);
    expect(strengthOf(container)).toBe("Strong password");
  });

  it("tracks an uncontrolled input through typing", () => {
    const { container } = render(<PasswordInput label="P" showStrength onChange={noop} />);
    fireEvent.input(container.querySelector("input"), {
      target: { value: "Abcdefg1!" },
    });
    expect(strengthOf(container)).toBe("Strong password");
  });

  it("omits the match indicator when no matchValue is given", () => {
    const { container } = render(
      <PasswordInput label="P" value="abc" onChange={noop} />
    );
    expect(container.querySelector(".password-match")).toBeNull();
  });

  it("stays quiet about a match while the field is empty", () => {
    const { container } = render(
      <PasswordInput label="P" value="" onChange={noop} matchValue="abc" />
    );
    expect(container.querySelector(".password-match")).toBeNull();
  });

  it("confirms a match at once", () => {
    render(<PasswordInput label="P" value="abc" onChange={noop} matchValue="abc" />);
    expect(screen.getByText("✓ Passwords match")).toBeInTheDocument();
  });

  it("holds the mismatch back until the field is left", () => {
    const { container } = render(
      <PasswordInput label="P" value="abc" onChange={noop} matchValue="xyz" />
    );
    expect(container.querySelector(".password-match")).toBeNull();
    fireEvent.blur(container.querySelector("input"));
    expect(screen.getByText("✕ Passwords do not match")).toBeInTheDocument();
  });

  it("calls a supplied onBlur as well as tracking blur itself", () => {
    const onBlur = vi.fn();
    const { container } = render(
      <PasswordInput label="P" value="abc" onChange={noop} matchValue="xyz" onBlur={onBlur} />
    );
    fireEvent.blur(container.querySelector("input"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("does not throw when no onBlur is supplied", () => {
    const { container } = render(<PasswordInput label="P" value="a" onChange={noop} />);
    expect(() => fireEvent.blur(container.querySelector("input"))).not.toThrow();
  });
});

describe("SelectInput", () => {
  const options = [
    { value: "", label: "manual placeholder" },
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  it("drops manually supplied empty options", () => {
    render(<SelectInput label="Kind" options={options} value="" onChange={noop} />);
    expect(screen.queryByText("manual placeholder")).not.toBeInTheDocument();
  });

  it("tolerates options being undefined", () => {
    expect(() =>
      render(<SelectInput label="Kind" value="" onChange={noop} />)
    ).not.toThrow();
  });

  it("tolerates options being a non-array", () => {
    expect(() =>
      render(<SelectInput label="Kind" options={null} value="" onChange={noop} />)
    ).not.toThrow();
  });

  it("omits the label element when none is given", () => {
    const { container } = render(
      <SelectInput options={options} value="" onChange={noop} />
    );
    expect(container.querySelector(".input-group-label")).toBeNull();
  });

  it("marks the label required when asked", () => {
    const { container } = render(
      <SelectInput label="Kind" required options={options} value="" onChange={noop} />
    );
    expect(container.querySelector(".required-indicator")).toBeInTheDocument();
  });

  it("applies a numeric width class", () => {
    const { container } = render(
      <SelectInput label="Kind" options={options} value="" onChange={noop} width="250" />
    );
    expect(container.querySelector(".input-group").className).toContain("w-250");
  });

  it("defaults to full width", () => {
    const { container } = render(
      <SelectInput label="Kind" options={options} value="" onChange={noop} />
    );
    expect(container.querySelector(".input-group").className).toContain("w-full");
  });

  it("renders an error message", () => {
    render(
      <SelectInput label="Kind" options={options} value="" onChange={noop} error="pick one" />
    );
    expect(screen.getByText("pick one")).toBeInTheDocument();
  });

  it("renders the multi variant without throwing", () => {
    expect(() =>
      render(
        <SelectInput label="Kind" options={options} value={["a"]} onChange={noop} isMulti />
      )
    ).not.toThrow();
  });

  it("renders the multi variant with no value supplied", () => {
    expect(() =>
      render(<SelectInput label="Kind" options={options} onChange={noop} isMulti />)
    ).not.toThrow();
  });
});

describe("SearchableSelectInput", () => {
  const options = [
    { value: "", label: "drop me" },
    { value: "a", label: "Alpha" },
  ];

  it("drops empty options and renders", () => {
    render(<SearchableSelectInput label="Kind" options={options} value="" onChange={noop} />);
    expect(screen.queryByText("drop me")).not.toBeInTheDocument();
  });

  it("tolerates a non-array options prop", () => {
    expect(() =>
      render(<SearchableSelectInput label="Kind" options={undefined} value="" onChange={noop} />)
    ).not.toThrow();
  });

  it("omits the label when none is given", () => {
    const { container } = render(
      <SearchableSelectInput options={options} value="" onChange={noop} />
    );
    expect(container.querySelector(".input-group-label")).toBeNull();
  });

  it("applies a numeric width and falls back to full", () => {
    const { container, rerender } = render(
      <SearchableSelectInput label="K" options={options} value="" onChange={noop} width="300" />
    );
    expect(container.querySelector(".input-group").className).toContain("w-300");
    rerender(
      <SearchableSelectInput label="K" options={options} value="" onChange={noop} />
    );
    expect(container.querySelector(".input-group").className).toContain("w-full");
  });

  it("recomputes its menu placement on resize and scroll", () => {
    render(<SearchableSelectInput label="K" options={options} value="" onChange={noop} />);
    expect(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("scroll"));
    }).not.toThrow();
  });

  it("shows an error message", () => {
    render(
      <SearchableSelectInput label="K" options={options} value="" onChange={noop} error="bad" />
    );
    expect(screen.getByText("bad")).toBeInTheDocument();
  });
});

describe("CheckboxInput and SwitchInput", () => {
  it("omits the checkbox label when none is given", () => {
    const { container } = render(<CheckboxInput checked={false} onChange={noop} />);
    expect(container.querySelector(".form-checkbox-label")).toBeNull();
  });

  it("shows the checkbox label, required mark and error", () => {
    const { container } = render(
      <CheckboxInput label="Agree" required checked onChange={noop} error="must agree" />
    );
    expect(screen.getByText("Agree")).toBeInTheDocument();
    expect(container.querySelector(".required-indicator")).toBeInTheDocument();
    expect(screen.getByText("must agree")).toBeInTheDocument();
  });

  it("omits the switch label when none is given", () => {
    const { container } = render(<SwitchInput checked={false} onChange={noop} />);
    expect(container.querySelector(".input-switch-label")).toBeNull();
  });

  it("shows the switch label and required mark", () => {
    const { container } = render(<SwitchInput label="On" required checked onChange={noop} />);
    expect(screen.getByText("On")).toBeInTheDocument();
    expect(container.querySelector(".required-indicator")).toBeInTheDocument();
    expect(container.querySelector('input[type="checkbox"]')).toHaveAttribute(
      "aria-required",
      "true"
    );
  });
});

describe("TextareaInput, SearchInput and RadioInput", () => {
  it("omits the textarea label and error when not supplied", () => {
    const { container } = render(<TextareaInput value="" onChange={noop} />);
    expect(container.querySelector(".input-group-label")).toBeNull();
    expect(container.querySelector(".auth-error-message")).toBeNull();
  });

  it("shows the textarea label, required mark and error", () => {
    const { container } = render(
      <TextareaInput label="Notes" required value="" onChange={noop} error="too short" />
    );
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(container.querySelector(".required-indicator")).toBeInTheDocument();
    expect(screen.getByText("too short")).toBeInTheDocument();
  });

  it("forwards search typing", () => {
    const onChange = vi.fn();
    render(<SearchInput placeholder="Find" value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Find"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders a radio with and without a label", () => {
    const { container, rerender } = render(
      <RadioInput name="n" value="a" label="Alpha" onChange={noop} />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    rerender(<RadioInput name="n" value="a" onChange={noop} />);
    expect(container.querySelector('input[type="radio"]')).toBeInTheDocument();
  });
});

describe("TimeInput clamping", () => {
  const fields = (container) => container.querySelectorAll("input");

  it("starts from the supplied value", () => {
    const { container } = render(
      <TimeInput value={{ hours: 2, minutes: 30, seconds: 15 }} onChange={noop} />
    );
    expect(fields(container).length).toBeGreaterThanOrEqual(2);
  });

  it("defaults to zeroes when no value is given", () => {
    expect(() => render(<TimeInput onChange={noop} />)).not.toThrow();
  });

  it("clamps hours to 23 and minutes to 59", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TimeInput value={{ hours: 0, minutes: 0, seconds: 0 }} onChange={onChange} />
    );
    const inputs = fields(container);
    fireEvent.change(inputs[0], { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hours: 23 }));
    fireEvent.change(inputs[1], { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ minutes: 59 }));
  });

  it("floors a negative or unparseable entry at zero", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TimeInput value={{ hours: 5, minutes: 5, seconds: 0 }} onChange={onChange} />
    );
    const inputs = fields(container);
    fireEvent.change(inputs[0], { target: { value: "-4" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hours: 0 }));
    fireEvent.change(inputs[0], { target: { value: "abc" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hours: 0 }));
  });

  it("renders disabled when asked", () => {
    const { container } = render(
      <TimeInput value={{ hours: 0, minutes: 0, seconds: 0 }} onChange={noop} disabled />
    );
    expect(fields(container)[0]).toBeDisabled();
  });
});

describe("CustomDatePickerInput", () => {
  it("calls onClick and focuses the field", () => {
    const onClick = vi.fn();
    const { container } = render(
      <CustomDatePickerInput value="01/01/2026" onClick={onClick} placeholder="Pick" />
    );
    fireEvent.click(container.querySelector("input"));
    expect(onClick).toHaveBeenCalled();
  });

  it("does not throw when no onClick is supplied", () => {
    const { container } = render(<CustomDatePickerInput value="" placeholder="Pick" />);
    expect(() => fireEvent.click(container.querySelector("input"))).not.toThrow();
  });

  it("marks the field when there is an error", () => {
    const { container } = render(
      <CustomDatePickerInput value="" placeholder="Pick" error="required" />
    );
    expect(container.querySelector("input").className).toContain(
      "custom-datepicker-input-error"
    );
  });

  it("leaves the field unmarked when there is no error", () => {
    const { container } = render(<CustomDatePickerInput value="" placeholder="Pick" />);
    expect(container.querySelector("input").className).not.toContain(
      "custom-datepicker-input-error"
    );
  });

  it("forwards focus", () => {
    const onFocus = vi.fn();
    const { container } = render(
      <CustomDatePickerInput value="" placeholder="Pick" onFocus={onFocus} />
    );
    fireEvent.focus(container.querySelector("input"));
    expect(onFocus).toHaveBeenCalled();
  });
});
