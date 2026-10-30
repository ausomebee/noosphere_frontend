import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The super-admin authenticator enrolment flow: a QR step, a code step that has
 * to be satisfied twice, and a success screen.
 *
 * The second code is the interesting part. A TOTP app shows the same six digits
 * for a whole 30-second window and the backend refuses a code it has already
 * spent, so after the first code verifies the screen records which window that
 * code came from and locks the inputs until the clock rolls into the next one.
 * That makes the whole component a function of `Date.now()`, so these tests run
 * on a fake clock pinned to an exact multiple of the 30-second period -- the
 * arithmetic in the countdown copy is then exact rather than off-by-one, and
 * advancing 30s is guaranteed to roll the window.
 *
 * Because the clock is faked, nothing here uses `waitFor`; every state update is
 * flushed with an explicit `act`, which keeps timer advancement under the test's
 * control instead of the query helper's.
 */

const api = vi.hoisted(() => ({
  Admin2FALink: vi.fn(),
  Admin2FAVerify: vi.fn(),
}));
vi.mock("../api/authApis", () => ({ default: api }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

// Imported by the subject but never rendered; stubbed so the real SVG library
// stays out of the module graph.
vi.mock("react-qr-code", () => ({ default: () => null }));

import Authenticator2FA from "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/Authenticator2FA";

// 2026-01-01T00:00:00Z, which is an exact multiple of the 30s TOTP period.
const WINDOW_START = 1767225600000;

const store = () =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: { id: "admin-1", accessToken: "at", refreshToken: "rt" },
      },
    },
  });

const flush = () => act(async () => {});

const renderPage = async () => {
  const view = render(
    <Provider store={store()}>
      <Authenticator2FA />
    </Provider>
  );
  await flush();
  return view;
};

const click = async (element) => {
  await act(async () => {
    fireEvent.click(element);
  });
};

const tick = async (ms) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

const boxes = () => Array.from(document.body.querySelectorAll(".code-input"));

const typeCode = (digits) => {
  const inputs = boxes();
  digits.split("").forEach((digit, index) => {
    fireEvent.change(inputs[index], { target: { value: digit } });
  });
};

const paste = (text) =>
  fireEvent.paste(boxes()[0], { clipboardData: { getData: () => text } });

const continueButton = () => screen.getByRole("button", { name: "Continue" });

const submit = () => click(continueButton());

// Step 1 has no work to do beyond showing the QR, so Continue just advances.
const goToCodeStep = async () => {
  await submit();
};

// Verifies the first code and leaves the screen in its "wait for a new code"
// state, which is where phase two always begins.
const verifyFirstCode = async (digits = "111111") => {
  await goToCodeStep();
  typeCode(digits);
  await submit();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(WINDOW_START);
  api.Admin2FALink.mockResolvedValue({
    data: { data: { qrcode: "data:image/png;base64,AAA" } },
  });
  api.Admin2FAVerify.mockResolvedValue({ data: { data: true } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the QR step", () => {
  it("asks for the enrolment link for the signed-in admin", async () => {
    await renderPage();
    expect(api.Admin2FALink).toHaveBeenCalledWith({
      id: "admin-1",
      moduleType: "TENANT",
    });
  });

  it("shows the QR image the link request returned", async () => {
    await renderPage();
    expect(screen.getByAltText("QR Code")).toHaveAttribute(
      "src",
      "data:image/png;base64,AAA"
    );
  });

  it("leaves the QR panel empty when the link request fails", async () => {
    api.Admin2FALink.mockRejectedValue(new Error("no link"));
    await renderPage();
    expect(screen.queryByAltText("QR Code")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("sends the admin back to the 2FA settings page", async () => {
    await renderPage();
    await click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledWith("/auth/2fa-settings");
  });

  it("moves on to six code boxes", async () => {
    await renderPage();
    await goToCodeStep();
    expect(boxes()).toHaveLength(6);
    expect(
      screen.getByText(/Enter the code currently showing in your app/)
    ).toBeInTheDocument();
  });
});

describe("filling in the code boxes", () => {
  it("carries focus to the next box as each digit lands", async () => {
    await renderPage();
    await goToCodeStep();
    fireEvent.change(boxes()[0], { target: { value: "7" } });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it("leaves focus alone on the last box", async () => {
    await renderPage();
    await goToCodeStep();
    boxes()[5].focus();
    fireEvent.change(boxes()[5], { target: { value: "9" } });
    expect(boxes()[5]).toHaveValue("9");
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it("does not move on when a box is cleared", async () => {
    await renderPage();
    await goToCodeStep();
    fireEvent.change(boxes()[0], { target: { value: "7" } });
    fireEvent.change(boxes()[0], { target: { value: "" } });
    expect(boxes()[0]).toHaveValue("");
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it("ignores anything that is not a single digit", async () => {
    await renderPage();
    await goToCodeStep();
    fireEvent.change(boxes()[0], { target: { value: "x" } });
    expect(boxes()[0]).toHaveValue("");
  });

  it("steps back a box when backspace is pressed on an empty one", async () => {
    await renderPage();
    await goToCodeStep();
    fireEvent.keyDown(boxes()[2], { key: "Backspace" });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it("stays put when backspace is pressed on a box that still holds a digit", async () => {
    await renderPage();
    await goToCodeStep();
    fireEvent.change(boxes()[0], { target: { value: "4" } });
    boxes()[0].focus();
    fireEvent.keyDown(boxes()[0], { key: "Backspace" });
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it("spreads a pasted code across the boxes and drops its punctuation", async () => {
    await renderPage();
    await goToCodeStep();
    paste("12-34 56");
    expect(boxes().map((b) => b.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it("pads a short paste out to six boxes", async () => {
    await renderPage();
    await goToCodeStep();
    paste("12");
    expect(boxes().map((b) => b.value)).toEqual(["1", "2", "", "", "", ""]);
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it("survives a paste that contains no digits at all", async () => {
    await renderPage();
    await goToCodeStep();
    paste("hello");
    expect(boxes().map((b) => b.value)).toEqual(["", "", "", "", "", ""]);
  });
});

describe("verifying the first code", () => {
  it("refuses to submit fewer than six digits", async () => {
    await renderPage();
    await goToCodeStep();
    typeCode("123");
    await submit();
    expect(toast).toHaveBeenCalledWith("Please enter a 6-digit code.", "error");
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
  });

  it("sends the joined code with the admin id", async () => {
    await renderPage();
    await verifyFirstCode("123456");
    expect(api.Admin2FAVerify).toHaveBeenCalledWith({
      userId: "admin-1",
      token: "123456",
    });
    expect(toast).toHaveBeenCalledWith(
      "OTP first verification successful!",
      "success"
    );
  });

  it("stays on the first code when the verifier denies it", async () => {
    api.Admin2FAVerify.mockResolvedValue({ data: { data: false } });
    await renderPage();
    await verifyFirstCode("123456");
    expect(toast).toHaveBeenCalledWith("Invalid OTP. Please try again.", "error");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports the message the verifier returned for a failed call", async () => {
    api.Admin2FAVerify.mockRejectedValue({
      response: { data: { message: "Token already used" } },
    });
    await renderPage();
    await verifyFirstCode("123456");
    expect(toast).toHaveBeenCalledWith("Token already used", "error");
  });

  it("falls back to generic copy when the failure carries no message", async () => {
    api.Admin2FAVerify.mockRejectedValue(new Error("socket hang up"));
    await renderPage();
    await verifyFirstCode("123456");
    expect(toast).toHaveBeenCalledWith("Verification failed.", "error");
  });
});

describe("waiting out the TOTP window", () => {
  it("locks the boxes and names the seconds left once the first code lands", async () => {
    await renderPage();
    await verifyFirstCode();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your app is still showing the code you just used. A new code appears in 30s."
    );
    expect(boxes()[0]).toBeDisabled();
    expect(continueButton()).toBeDisabled();
  });

  it("counts the wait down every second", async () => {
    await renderPage();
    await verifyFirstCode();
    await tick(1000);
    expect(screen.getByRole("status")).toHaveTextContent("in 29s");
    await tick(4000);
    expect(screen.getByRole("status")).toHaveTextContent("in 25s");
  });

  it("releases the boxes when the window rolls over", async () => {
    await renderPage();
    await verifyFirstCode();
    await tick(30000);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your app is now showing a new code"
    );
    expect(boxes()[0]).toBeEnabled();
    expect(continueButton()).toBeEnabled();
  });

  it("clears the boxes and swaps the prompt for the second code", async () => {
    await renderPage();
    await verifyFirstCode("123456");
    expect(boxes().map((b) => b.value)).toEqual(["", "", "", "", "", ""]);
    expect(
      screen.getByText(/This second code must be a different one/)
    ).toBeInTheDocument();
  });
});

describe("verifying the second code", () => {
  it("rejects a repeat of the code that was just used", async () => {
    await renderPage();
    await verifyFirstCode("123456");
    await tick(30000);
    api.Admin2FAVerify.mockClear();
    typeCode("123456");
    await submit();
    expect(toast).toHaveBeenCalledWith(
      "Please use a different OTP from your authenticator app.",
      "error"
    );
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
    expect(boxes().map((b) => b.value)).toEqual(["", "", "", "", "", ""]);
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it("keeps the admin on the code step when the second code is denied", async () => {
    await renderPage();
    await verifyFirstCode("123456");
    await tick(30000);
    api.Admin2FAVerify.mockResolvedValue({ data: { data: false } });
    typeCode("654321");
    await submit();
    expect(toast).toHaveBeenCalledWith("Invalid OTP. Please try again.", "error");
    expect(boxes()).toHaveLength(6);
  });

  it("labels the second verification distinctly from the first", async () => {
    await renderPage();
    await verifyFirstCode("123456");
    await tick(30000);
    typeCode("654321");
    await submit();
    expect(toast).toHaveBeenCalledWith(
      "OTP second verification successful!",
      "success"
    );
  });

  it("lands on the success screen and then on the app root", async () => {
    await renderPage();
    await verifyFirstCode("123456");
    await tick(30000);
    typeCode("654321");
    await submit();
    expect(screen.getByText("Account creation successful")).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Login" }));
    expect(navigate).toHaveBeenCalledWith("/");
  });
});

describe("stepping back", () => {
  it("returns to the QR step and starts the codes over", async () => {
    await renderPage();
    await verifyFirstCode("123456");
    await tick(30000);
    typeCode("6");
    await click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByAltText("QR Code")).toBeInTheDocument();

    await goToCodeStep();
    // Back to phase one: the wait notice is gone and every box is empty again.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(boxes().map((b) => b.value)).toEqual(["", "", "", "", "", ""]);
    expect(
      screen.getByText(/Enter the code currently showing in your app/)
    ).toBeInTheDocument();
  });
});
