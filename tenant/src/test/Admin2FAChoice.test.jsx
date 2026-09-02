import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The admin's own 2FA choice, shown when the organisation has not mandated a
 * method for everyone. It is the super-admin screen with the "enable for all"
 * switch and the API call taken out: a pair of radios, and a route decided by
 * which one is picked.
 *
 * Nothing is persisted here -- the method is written when the setup page it
 * routes to is completed -- so the whole subject is the routing switch plus
 * the schema that guarantees only its two known values reach it. The radio
 * labels carry no `htmlFor`, so the inputs are clicked directly.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import Admin2FAChoice from "../Pages/Authentication/AuthOnboarding/Admin/Admin2FAChoice";

const radios = () =>
  Array.from(document.body.querySelectorAll(".radio-group input[type='radio']"));
const authenticatorRadio = () => radios()[0];
const questionRadio = () => radios()[1];
const continueButton = () => screen.getByRole("button", { name: "Continue" });

const submit = () => fireEvent.click(continueButton());

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the choice", () => {
  it("opens with the authenticator preselected", () => {
    render(<Admin2FAChoice />);
    expect(
      screen.getByRole("heading", { name: "Set up Two-Factor Authentication (2FA)" })
    ).toBeInTheDocument();
    expect(authenticatorRadio()).toBeChecked();
    expect(questionRadio()).not.toBeChecked();
  });

  it("offers no organisation-wide switch, unlike the super-admin screen", () => {
    render(<Admin2FAChoice />);
    expect(document.body.querySelector("input[type='checkbox']")).toBeNull();
  });

  it("moves the choice to the security question", () => {
    render(<Admin2FAChoice />);
    fireEvent.click(questionRadio());
    expect(questionRadio()).toBeChecked();
    expect(authenticatorRadio()).not.toBeChecked();
  });

  it("moves the choice back to the authenticator", () => {
    render(<Admin2FAChoice />);
    fireEvent.click(questionRadio());
    fireEvent.click(authenticatorRadio());
    expect(authenticatorRadio()).toBeChecked();
    expect(questionRadio()).not.toBeChecked();
  });
});

describe("where the choice leads", () => {
  it("sends an authenticator choice on to the QR enrolment", async () => {
    render(<Admin2FAChoice />);
    submit();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it("sends a security-question choice on to the question setup", async () => {
    render(<Admin2FAChoice />);
    fireEvent.click(questionRadio());
    submit();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/security-question")
    );
  });

  // The screen never writes anything itself; the method is recorded by the
  // setup page it hands off to.
  it("routes without recording anything of its own", async () => {
    render(<Admin2FAChoice />);
    submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  });

  it("routes again when the choice is changed and resubmitted", async () => {
    render(<Admin2FAChoice />);
    submit();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
    fireEvent.click(questionRadio());
    submit();
    await waitFor(() =>
      expect(navigate).toHaveBeenLastCalledWith("/auth/2fa/security-question")
    );
  });
});
