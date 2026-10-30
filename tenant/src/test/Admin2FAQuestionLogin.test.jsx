import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The security-question challenge that stands between a password login and the
 * dashboard: the question itself comes off the auth slice, the answer is
 * checked by the API, and a "forgot your security answer?" link swaps the whole
 * panel for the role-aware recovery message.
 *
 * Everything the screen needs is already in redux -- the question, the user id
 * it verifies against and the tokens the socket is opened with -- so the store
 * is real rather than a mocked hook. The API is mocked at the module, and the
 * console error the failure path writes is silenced so a rejected verification
 * does not look like a broken test.
 *
 * Note that the API is only trusted when it answers `status: "ok"`; anything
 * else, including a perfectly successful HTTP response, is turned into a thrown
 * error and lands on the same toast as a network failure.
 */

const api = vi.hoisted(() => ({ Admin2FAVerifySecretMessage: vi.fn() }));
vi.mock("../api/authApis", () => ({ default: api }));

const socket = vi.hoisted(() => ({ connectSocket: vi.fn() }));
vi.mock("../api/socketService", () => ({
  connectSocket: (...args) => socket.connectSocket(...args),
}));

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

import Admin2FAQuestionLogin from "../Pages/Authentication/Login/Admin2FAQuestionLogin";

const signedInUser = (over = {}) => ({
  id: "u-1",
  tenantId: "t-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { name: "Admin" },
  authQuestion: "What was your first pet's name?",
  ...over,
});

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user,
      },
    },
  });

const renderPage = (user = signedInUser()) =>
  render(
    <Provider store={makeStore(user)}>
      <Admin2FAQuestionLogin />
    </Provider>
  );

const answerBox = () => screen.getByPlaceholderText("Enter your answer");
const continueButton = () => screen.getByRole("button", { name: "Continue" });
const question = () => document.body.querySelector(".security-question").textContent;

const answerWith = (value) => {
  fireEvent.change(answerBox(), { target: { value } });
  fireEvent.blur(answerBox());
};

const submit = () => fireEvent.click(continueButton());

beforeEach(() => {
  vi.clearAllMocks();
  api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "ok" } });
  // The failure path logs the raw error; keep the run readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the challenge screen", () => {
  it("shows the question stored on the signed-in user", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Two-Factor Authentication" })).toBeInTheDocument();
    expect(question()).toBe("What was your first pet's name?");
    expect(answerBox()).toHaveValue("");
  });

  // A user whose question never made it onto the login response still gets a
  // usable screen rather than a blank line.
  it("falls back to a placeholder when no question is stored", () => {
    renderPage(signedInUser({ authQuestion: undefined }));
    expect(question()).toBe("No question available");
  });
});

describe("validating the answer", () => {
  it("refuses a blank answer", async () => {
    renderPage();
    submit();
    expect(await screen.findByText("Answer is required")).toBeInTheDocument();
    expect(api.Admin2FAVerifySecretMessage).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Answer is required", "error");
  });

  it("refuses an answer shorter than three characters", async () => {
    renderPage();
    answerWith("ab");
    submit();
    expect(
      await screen.findByText("Answer must be at least 3 characters")
    ).toBeInTheDocument();
    expect(api.Admin2FAVerifySecretMessage).not.toHaveBeenCalled();
  });

  it("marks the field as errored while it is invalid", async () => {
    renderPage();
    submit();
    await screen.findByText("Answer is required");
    expect(answerBox().className).toContain("input-error");
  });

  it("clears the error once a long enough answer is typed", async () => {
    renderPage();
    submit();
    await screen.findByText("Answer is required");
    answerWith("Rufus");
    await waitFor(() => expect(screen.queryByText("Answer is required")).toBeNull());
    expect(answerBox().className).not.toContain("input-error");
  });
});

describe("verifying", () => {
  it("sends the answer with the user id and the question", async () => {
    renderPage();
    answerWith("Rufus");
    submit();
    await waitFor(() => expect(api.Admin2FAVerifySecretMessage).toHaveBeenCalled());
    expect(api.Admin2FAVerifySecretMessage).toHaveBeenCalledWith({
      userId: "u-1",
      secret: "Rufus",
      authQuestion: "What was your first pet's name?",
    });
  });

  it("opens the socket and lands on the dashboard when the answer is accepted", async () => {
    renderPage();
    answerWith("Rufus");
    submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(toast).toHaveBeenCalledWith(
      "Security question verified successfully!",
      "success"
    );
    expect(socket.connectSocket).toHaveBeenCalledWith({
      accessToken: "at",
      userId: "u-1",
      tenantId: "t-1",
    });
  });

  // Anything other than "ok" is thrown internally, so a wrong answer that
  // returns HTTP 200 still stops the login.
  it("refuses to continue when the response is not ok", async () => {
    api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "failed" } });
    renderPage();
    answerWith("Rufus");
    submit();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Verification failed.", "error"));
    expect(navigate).not.toHaveBeenCalled();
    expect(socket.connectSocket).not.toHaveBeenCalled();
  });

  it("surfaces the server's own message when the call is rejected", async () => {
    api.Admin2FAVerifySecretMessage.mockRejectedValue({
      response: { data: { message: "That answer is incorrect" } },
    });
    renderPage();
    answerWith("Rufus");
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("That answer is incorrect", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    api.Admin2FAVerifySecretMessage.mockRejectedValue(new Error("network down"));
    renderPage();
    answerWith("Rufus");
    submit();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Verification failed.", "error"));
  });

  it("locks the button while the check is in flight and releases it after", async () => {
    let release;
    api.Admin2FAVerifySecretMessage.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPage();
    answerWith("Rufus");
    submit();
    await waitFor(() => expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled());
    release({ data: { status: "ok" } });
    await waitFor(() => expect(continueButton()).not.toBeDisabled());
  });
});

describe("the recovery escape hatch", () => {
  it("swaps the form for the role-aware recovery message", () => {
    renderPage();
    fireEvent.click(screen.getByText("Forgot your security answer?"));
    expect(screen.queryByPlaceholderText("Enter your answer")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Two-Factor Authentication" })).toBeNull();
  });

  it("brings the challenge back from the recovery message", () => {
    renderPage();
    fireEvent.click(screen.getByText("Forgot your security answer?"));
    fireEvent.click(screen.getByRole("button", { name: "I understand" }));
    expect(screen.getByPlaceholderText("Enter your answer")).toBeInTheDocument();
    expect(question()).toBe("What was your first pet's name?");
  });
});
