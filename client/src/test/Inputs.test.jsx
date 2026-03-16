import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextInput, PasswordInput, CheckboxInput, SwitchInput, TextareaInput, SearchInput } from "../Components/Input/Inputs";

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
