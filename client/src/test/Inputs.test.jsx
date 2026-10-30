import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextInput, PasswordInput, CheckboxInput, SwitchInput, TextareaInput, SearchInput, RadioInput, CustomDatePickerInput, SelectInput, SearchableSelectInput } from "../Components/Input/Inputs";

describe("TextInput", () => {
  it("renders with label", () => {
    render(<TextInput label="Email" onChange={vi.fn()} />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });
  it("renders with placeholder", () => {
    render(<TextInput placeholder="Enter email" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Enter email")).toBeInTheDocument();
  });
  it("calls onChange when typing", () => {
    const handleChange = vi.fn();
    render(<TextInput onChange={handleChange} placeholder="Type" />);
    fireEvent.change(screen.getByPlaceholderText("Type"), { target: { value: "hello" } });
    expect(handleChange).toHaveBeenCalled();
  });
  it("displays error message", () => {
    render(<TextInput onChange={vi.fn()} error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
  });
  it("does not show error when none provided", () => {
    const { container } = render(<TextInput onChange={vi.fn()} />);
    expect(container.querySelector(".auth-error-message")).not.toBeInTheDocument();
  });
});

describe("PasswordInput", () => {
  it("renders as password type by default", () => {
    render(<PasswordInput label="Password" onChange={vi.fn()} placeholder="Enter" />);
    expect(screen.getByPlaceholderText("Enter")).toHaveAttribute("type", "password");
  });
  it("toggles visibility", () => {
    render(<PasswordInput onChange={vi.fn()} placeholder="Enter" />);
    const input = screen.getByPlaceholderText("Enter");
    const toggle = document.querySelector(".password-toggle-icon");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "password");
  });
  it("displays error", () => {
    render(<PasswordInput onChange={vi.fn()} error="Too short" />);
    expect(screen.getByText("Too short")).toBeInTheDocument();
  });
});

describe("CheckboxInput", () => {
  it("renders with label", () => {
    render(<CheckboxInput label="Accept terms" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText("Accept terms")).toBeInTheDocument();
  });
  it("calls onChange", () => {
    const fn = vi.fn();
    render(<CheckboxInput label="Accept" checked={false} onChange={fn} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(fn).toHaveBeenCalled();
  });
  it("reflects checked state", () => {
    render(<CheckboxInput label="Accept" checked={true} onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});

describe("SwitchInput", () => {
  it("renders with label", () => {
    render(<SwitchInput label="Notifications" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });
  it("calls onChange", () => {
    const fn = vi.fn();
    render(<SwitchInput label="Toggle" checked={false} onChange={fn} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(fn).toHaveBeenCalled();
  });
});

describe("TextareaInput", () => {
  it("renders with label and placeholder", () => {
    render(<TextareaInput label="Notes" placeholder="Enter notes" onChange={vi.fn()} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter notes")).toBeInTheDocument();
  });
  it("calls onChange", () => {
    const fn = vi.fn();
    render(<TextareaInput placeholder="Type" onChange={fn} />);
    fireEvent.change(screen.getByPlaceholderText("Type"), { target: { value: "test" } });
    expect(fn).toHaveBeenCalled();
  });
  it("displays error", () => {
    render(<TextareaInput onChange={vi.fn()} error="Too long" />);
    expect(screen.getByText("Too long")).toBeInTheDocument();
  });
});

describe("SearchInput", () => {
  it("renders with placeholder", () => {
    render(<SearchInput placeholder="Search..." onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });
  it("renders search icon", () => {
    const { container } = render(<SearchInput onChange={vi.fn()} />);
    expect(container.querySelector(".search-icon")).toBeInTheDocument();
  });
  it("calls onChange", () => {
    const fn = vi.fn();
    render(<SearchInput placeholder="Search" onChange={fn} />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "test" } });
    expect(fn).toHaveBeenCalled();
  });
});

describe("RadioInput", () => {
  it("renders with label before input (default)", () => {
    render(<RadioInput label="Option A" name="choice" value="a" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByRole("radio")).not.toBeChecked();
  });

  it("renders with label after input", () => {
    render(<RadioInput label="Option B" name="choice" value="b" checked={true} onChange={vi.fn()} inputPosition="after" />);
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByRole("radio")).toBeChecked();
  });

  it("calls onChange", () => {
    const fn = vi.fn();
    render(<RadioInput label="Option" name="choice" value="a" checked={false} onChange={fn} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(fn).toHaveBeenCalled();
  });

  it("shows error message", () => {
    render(<RadioInput label="X" name="c" value="a" checked={false} onChange={vi.fn()} error="Pick one" />);
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("renders without label", () => {
    const { container } = render(<RadioInput name="c" value="a" checked={false} onChange={vi.fn()} />);
    expect(container.querySelector(".input-radio-label")).not.toBeInTheDocument();
  });
});

describe("CustomDatePickerInput", () => {
  it("renders with value and placeholder", () => {
    render(<CustomDatePickerInput value="2026-01-01" placeholder="Pick date" onClick={vi.fn()} />);
    expect(screen.getByDisplayValue("2026-01-01")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const fn = vi.fn();
    render(<CustomDatePickerInput value="" onClick={fn} placeholder="Pick" />);
    fireEvent.click(screen.getByPlaceholderText("Pick"));
    expect(fn).toHaveBeenCalled();
  });

  it("shows string error", () => {
    render(<CustomDatePickerInput value="" error="Required" placeholder="Pick" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("shows error.message from object error", () => {
    render(<CustomDatePickerInput value="" error={{ message: "Invalid date" }} placeholder="Pick" />);
    expect(screen.getByText("Invalid date")).toBeInTheDocument();
  });

  it("adds error class when error present", () => {
    const { container } = render(<CustomDatePickerInput value="" error="Bad" placeholder="Pick" />);
    expect(container.querySelector(".custom-datepicker-input-error")).toBeInTheDocument();
  });

  it("calls onFocus", () => {
    const fn = vi.fn();
    render(<CustomDatePickerInput value="" onFocus={fn} placeholder="Pick" />);
    fireEvent.focus(screen.getByPlaceholderText("Pick"));
    expect(fn).toHaveBeenCalled();
  });
});

describe("SelectInput", () => {
  const options = [
    { value: "a", label: "Apple" },
    { value: "b", label: "Banana" },
  ];

  it("renders with label", () => {
    render(<SelectInput label="Fruit" options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Fruit")).toBeInTheDocument();
  });

  it("renders placeholder", () => {
    render(<SelectInput options={options} onChange={vi.fn()} placeholder="Choose..." />);
    expect(screen.getByText("Choose...")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<SelectInput options={options} onChange={vi.fn()} error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders with selected value", () => {
    render(<SelectInput options={options} value="a" onChange={vi.fn()} />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  it("renders multi-select", () => {
    render(<SelectInput options={options} value={["a", "b"]} onChange={vi.fn()} isMulti />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });
});

describe("SearchableSelectInput", () => {
  const options = [
    { value: "us", label: "United States" },
    { value: "uk", label: "United Kingdom" },
  ];

  it("renders with label", () => {
    render(<SearchableSelectInput label="Country" options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Country")).toBeInTheDocument();
  });

  it("renders placeholder", () => {
    render(<SearchableSelectInput options={options} onChange={vi.fn()} placeholder="Select country..." />);
    expect(screen.getByText("Select country...")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<SearchableSelectInput options={options} onChange={vi.fn()} error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders with selected value", () => {
    render(<SearchableSelectInput options={options} value="us" onChange={vi.fn()} />);
    expect(screen.getByText("United States")).toBeInTheDocument();
  });

  it("renders without label", () => {
    const { container } = render(<SearchableSelectInput options={options} onChange={vi.fn()} />);
    expect(container.querySelector(".input-group-label")).not.toBeInTheDocument();
  });

  it("renders with disabled state", () => {
    render(<SearchableSelectInput options={options} onChange={vi.fn()} disabled />);
    expect(screen.getByText("Search options…")).toBeInTheDocument();
  });

  it("renders with custom width", () => {
    const { container } = render(<SearchableSelectInput options={options} onChange={vi.fn()} width="200" />);
    expect(container.querySelector(".w-200")).toBeInTheDocument();
  });
});
