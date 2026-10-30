import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountAccessMessage, {
  SUPPORT_EMAIL,
  getRoleName,
  isAdminRole,
} from "../Helper/accountAccessMessage";

/**
 * The card shown when identity verification fails at login.
 *
 * Who the user is told to contact depends entirely on their role, and the role
 * arrives in two shapes depending on which login response produced it: an
 * object with a `name`, or a bare string. Admins and owners are handed our
 * support mailbox; everyone else is sent to their own administrator, because
 * we don't know that person's address. The "I understand" button only exists
 * when the caller passes a way back to the login view.
 */

const adminCopy = /contact/i;
const staffCopy = /contact your system administrator/i;

describe("reading the role name", () => {
  it("takes the name off a role object", () => {
    expect(getRoleName({ name: "Admin", id: "r1" })).toBe("Admin");
  });

  it("passes a bare string role straight through", () => {
    expect(getRoleName("Owner")).toBe("Owner");
  });

  it("returns the falsy value untouched when there is no role", () => {
    expect(getRoleName(null)).toBe(null);
    expect(getRoleName(undefined)).toBe(undefined);
    expect(getRoleName("")).toBe("");
  });
});

describe("admin detection", () => {
  it.each([
    ["Admin", true],
    ["Owner", true],
    ["Therapist", false],
    ["admin", false], // the list is case-sensitive, so a lowercased role is staff
  ])("treats the string role %s as admin=%s", (role, expected) => {
    expect(isAdminRole(role)).toBe(expected);
  });

  it("unwraps a role object before matching", () => {
    expect(isAdminRole({ name: "Owner" })).toBe(true);
    expect(isAdminRole({ name: "Billing Clerk" })).toBe(false);
  });

  it("treats an unknown role as staff", () => {
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole({})).toBe(false);
  });
});

describe("the message card", () => {
  it("gives an admin a mailto link to support", () => {
    render(<AccountAccessMessage role={{ name: "Admin" }} />);
    const link = screen.getByRole("link", { name: SUPPORT_EMAIL });
    expect(link).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
    expect(screen.getByText(adminCopy)).toBeInTheDocument();
  });

  it("gives an owner the same support link, read from a string role", () => {
    render(<AccountAccessMessage role="Owner" />);
    expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toBeInTheDocument();
  });

  it("sends a non-admin to their own administrator instead", () => {
    render(<AccountAccessMessage role={{ name: "Therapist" }} />);
    expect(screen.getByText(staffCopy)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("sends a user with no role at all to their administrator", () => {
    render(<AccountAccessMessage />);
    expect(screen.getByText(staffCopy)).toBeInTheDocument();
  });

  it("always names the failure so the user knows why they are stuck", () => {
    render(<AccountAccessMessage role="Admin" />);
    expect(
      screen.getByRole("heading", { name: "Unable to verify your identity" }),
    ).toBeInTheDocument();
  });

  it("omits the button when there is nowhere to go back to", () => {
    render(<AccountAccessMessage role="Admin" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("calls onBack when the user acknowledges the message", () => {
    const onBack = vi.fn();
    render(<AccountAccessMessage role="Admin" onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "I understand" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
