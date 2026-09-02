import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The security-question check that guards the forgot-password flow: one answer
 * field, then a result screen offering either a login link or the role-aware
 * "we cannot verify you" card.
 *
 * Three separate pieces of context -- the user id, the question text and the
 * role -- each come from react-router navigation state first and only fall back
 * to the auth slice, because at this point in the flow the user has not been
 * signed in yet. The role's fallback uses `??` while the other two use `||`, so
 * they are exercised separately: an empty question string falls through to the
 * store, an explicitly null role does not.
 */

const api = vi.hoisted(() => ({ Admin2FAVerifySecretMessage: vi.fn() }));
vi.mock("../api/authApis", () => ({ default: api }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

const routing = vi.hoisted(() => ({ navigate: vi.fn(), location: { state: null } }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => routing.navigate,
  useLocation: () => routing.location,
}));

import ForgotPasswordQuestionVerifier from "../Pages/Authentication/ForgotPassword/ForgotPasswordQuestionVerifier";

const store = (user = null) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: Boolean(user),
        loading: false,
        error: null,
        token: null,
        user,
      },
    },
  });

const renderPage = (user) =>
  render(
    <Provider store={store(user)}>
      <ForgotPasswordQuestionVerifier />
    </Provider>
  );

const answerField = () => screen.getByPlaceholderText("Enter your answer");

const submitForm = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

const answerWith = async (answer = "Rover") => {
  fireEvent.change(answerField(), { target: { value: answer } });
  submitForm();
  await waitFor(() =>
    expect(api.Admin2FAVerifySecretMessage).toHaveBeenCalled()
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  routing.location = {
    state: {
      userId: "state-user",
      authQuestion: "What was your first pet?",
      role: { name: "Admin" },
    },
  };
  api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "ok" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the question being asked", () => {
  it("shows the question the previous step navigated with", () => {
    renderPage();
    expect(screen.getByText("What was your first pet?")).toBeInTheDocument();
  });

  it("falls back to the question on the signed-in user", () => {
    routing.location = { state: { userId: "state-user" } };
    renderPage({ id: "store-user", authQuestion: "Mother's maiden name?" });
    expect(screen.getByText("Mother's maiden name?")).toBeInTheDocument();
  });

  it("says so when no question is available from either source", () => {
    routing.location = { state: null };
    renderPage({ id: "store-user" });
    expect(screen.getByText("No question available")).toBeInTheDocument();
  });
});

describe("validating the answer", () => {
  it("refuses an empty answer", async () => {
    renderPage();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Answer is required", "error")
    );
    expect(api.Admin2FAVerifySecretMessage).not.toHaveBeenCalled();
  });

  it("refuses an answer under three characters", async () => {
    renderPage();
    fireEvent.change(answerField(), { target: { value: "ab" } });
    submitForm();
    expect(
      await screen.findByText("Answer must be at least 3 characters")
    ).toBeInTheDocument();
    expect(answerField()).toHaveClass("input-error");
    expect(api.Admin2FAVerifySecretMessage).not.toHaveBeenCalled();
  });
});

describe("submitting the answer", () => {
  it("sends the answer with the id and question from navigation state", async () => {
    renderPage({ id: "store-user", authQuestion: "Ignored" });
    await answerWith("Rover");
    expect(api.Admin2FAVerifySecretMessage).toHaveBeenCalledWith({
      userId: "state-user",
      secret: "Rover",
      authQuestion: "What was your first pet?",
    });
  });

  it("falls back to the signed-in user when there is no navigation state", async () => {
    routing.location = { state: null };
    renderPage({ id: "store-user", authQuestion: "Mother's maiden name?" });
    await answerWith("Smith");
    expect(api.Admin2FAVerifySecretMessage).toHaveBeenCalledWith({
      userId: "store-user",
      secret: "Smith",
      authQuestion: "Mother's maiden name?",
    });
  });
});

describe("the result screen", () => {
  it("celebrates an accepted answer and offers the login link", async () => {
    renderPage();
    await answerWith();
    expect(await screen.findByText("Verification successful!")).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(
      "Security question verified successfully!",
      "success"
    );
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(routing.navigate).toHaveBeenCalledWith("/");
  });

  it("treats a non-ok response as a failure", async () => {
    api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await answerWith();
    expect(
      await screen.findByText("Unable to verify your identity")
    ).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Verification failed.", "error");
  });

  it("shows the message a failed call returned", async () => {
    api.Admin2FAVerifySecretMessage.mockRejectedValue({
      response: { data: { message: "Too many attempts" } },
    });
    renderPage();
    await answerWith();
    expect(
      await screen.findByText("Unable to verify your identity")
    ).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Too many attempts", "error");
  });

  it("points an admin at the support desk", async () => {
    api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await answerWith();
    expect(await screen.findByText("support@noospherehub.com")).toBeInTheDocument();
  });

  it("points a staff member at their own administrator", async () => {
    routing.location = {
      state: { userId: "state-user", role: { name: "Clinician" } },
    };
    api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await answerWith();
    expect(
      await screen.findByText(/contact your system administrator/)
    ).toBeInTheDocument();
  });

  it("reads the role off the auth slice when navigation state carries none", async () => {
    routing.location = { state: { userId: "state-user" } };
    api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "denied" } });
    renderPage({ id: "store-user", role: "Owner" });
    await answerWith();
    expect(await screen.findByText("support@noospherehub.com")).toBeInTheDocument();
  });

  it("sends a rejected user back to the question to try again", async () => {
    api.Admin2FAVerifySecretMessage.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await answerWith();
    fireEvent.click(await screen.findByRole("button", { name: "Try Again" }));
    expect(screen.getByText("What was your first pet?")).toBeInTheDocument();
    expect(answerField()).toBeInTheDocument();
  });
});
