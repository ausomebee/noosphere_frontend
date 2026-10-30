import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The super-admin security-question enrolment screen: pick a question from a
 * fixed list, answer it twice, and land on a confirmation.
 *
 * The picker is react-select rather than a native dropdown, so it is driven with
 * arrow keys on its combobox. Its option list also carries a leading blank
 * "Select an option" entry that `SelectInput` strips out, which means the first
 * option reachable by keyboard is the first *real* question.
 *
 * Unlike the sibling screens, this form is submitted without a validation-error
 * handler, so a failed submit produces no toast at all -- only inline messages.
 * A failed *save*, on the other hand, is reported twice: once as a toast and
 * once as a paragraph kept in component state.
 */

const api = vi.hoisted(() => ({ Admin2FACreateSecretMessage: vi.fn() }));
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

import QuestionAndAnswer2FA from "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/QuestionAndAnswer2FA";

const FIRST_QUESTION = "What is the name of your first pet?";
const SECOND_QUESTION = "What was the make of your first car?";

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

const renderPage = () =>
  render(
    <Provider store={store()}>
      <QuestionAndAnswer2FA />
    </Provider>
  );

const questionPicker = () =>
  document.body.querySelector("input[role='combobox']");

// react-select opens on the first ArrowDown with the first option highlighted,
// so reaching option `index` takes that press plus `index` more.
const chooseQuestion = (index = 0) => {
  const combobox = questionPicker();
  fireEvent.keyDown(combobox, { key: "ArrowDown" });
  for (let i = 0; i < index; i += 1) {
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
  }
  fireEvent.keyDown(combobox, { key: "Enter" });
};

const typeAnswers = (answer = "Rover", confirm = answer) => {
  fireEvent.change(screen.getByPlaceholderText("Type your answer"), {
    target: { value: answer },
  });
  fireEvent.change(screen.getByPlaceholderText("Confirm your answer"), {
    target: { value: confirm },
  });
};

const submitForm = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

const enrol = async ({ index = 0, answer = "Rover", confirm } = {}) => {
  chooseQuestion(index);
  typeAnswers(answer, confirm);
  submitForm();
  await waitFor(() =>
    expect(api.Admin2FACreateSecretMessage).toHaveBeenCalled()
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  // react-select scrolls its highlighted option into view, which jsdom has no
  // implementation for.
  Element.prototype.scrollIntoView = vi.fn();
  api.Admin2FACreateSecretMessage.mockResolvedValue({ data: { status: "ok" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the enrolment form", () => {
  it("opens on the question step with nothing chosen", () => {
    renderPage();
    expect(screen.getByText("Secure your account with 2FA")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type your answer")).toHaveValue("");
  });

  it("offers the fixed list of questions, without the blank placeholder entry", () => {
    renderPage();
    fireEvent.keyDown(questionPicker(), { key: "ArrowDown" });
    const options = Array.from(document.body.querySelectorAll(".rs__option"));
    expect(options).toHaveLength(20);
    expect(options[0]).toHaveTextContent(FIRST_QUESTION);
    expect(
      options.some((o) => o.textContent === "Select an option")
    ).toBe(false);
  });

  it("goes back to the 2FA settings page", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledWith("/auth/2fa-settings");
  });
});

describe("validation", () => {
  it("refuses a submission with nothing filled in", async () => {
    renderPage();
    submitForm();
    expect(
      await screen.findByText("Please select a security question")
    ).toBeInTheDocument();
    expect(screen.getByText("Answer is required")).toBeInTheDocument();
    expect(screen.getByText("Please confirm your answer")).toBeInTheDocument();
    expect(api.Admin2FACreateSecretMessage).not.toHaveBeenCalled();
    // This form is submitted without a validation-error handler, so nothing is
    // toasted -- the inline messages are the only feedback.
    expect(toast).not.toHaveBeenCalled();
  });

  it("marks the offending fields", async () => {
    renderPage();
    submitForm();
    await screen.findByText("Answer is required");
    expect(screen.getByPlaceholderText("Type your answer")).toHaveClass(
      "input-error"
    );
    expect(screen.getByPlaceholderText("Confirm your answer")).toHaveClass(
      "input-error"
    );
  });

  it("refuses an answer under three characters", async () => {
    renderPage();
    chooseQuestion();
    typeAnswers("ab");
    submitForm();
    expect(
      await screen.findByText("Answer must be at least 3 characters")
    ).toBeInTheDocument();
    expect(api.Admin2FACreateSecretMessage).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match", async () => {
    renderPage();
    chooseQuestion();
    typeAnswers("Rover", "Fido");
    submitForm();
    expect(await screen.findByText("Answers must match")).toBeInTheDocument();
    expect(api.Admin2FACreateSecretMessage).not.toHaveBeenCalled();
  });
});

describe("saving the question", () => {
  it("sends the chosen question and answer for the signed-in admin", async () => {
    renderPage();
    await enrol();
    expect(api.Admin2FACreateSecretMessage).toHaveBeenCalledWith({
      userId: "admin-1",
      secret: "Rover",
      authQuestion: FIRST_QUESTION,
      module: "TENANT",
    });
  });

  it("sends whichever question was picked further down the list", async () => {
    renderPage();
    await enrol({ index: 1 });
    expect(api.Admin2FACreateSecretMessage).toHaveBeenCalledWith(
      expect.objectContaining({ authQuestion: SECOND_QUESTION })
    );
  });

  it("moves on to the confirmation step", async () => {
    renderPage();
    await enrol();
    expect(await screen.findByText("Verification Successful")).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(
      "Security question set successfully!",
      "success"
    );
  });

  it("sends the admin to the app root from the confirmation", async () => {
    renderPage();
    await enrol();
    await screen.findByText("Verification Successful");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });
});

describe("when the save is refused", () => {
  it("treats a non-ok response as a failure and stays on the form", async () => {
    api.Admin2FACreateSecretMessage.mockResolvedValue({ data: { status: "no" } });
    renderPage();
    await enrol();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "Failed to set security question.",
        "error"
      )
    );
    expect(
      screen.queryByText("Verification Successful")
    ).not.toBeInTheDocument();
  });

  it("keeps the message on screen as well as toasting it", async () => {
    api.Admin2FACreateSecretMessage.mockRejectedValue({
      response: { data: { message: "That answer is too common" } },
    });
    renderPage();
    await enrol();
    expect(
      await screen.findByText("That answer is too common")
    ).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("That answer is too common", "error");
  });

  it("falls back to generic copy when the failure carried no message", async () => {
    api.Admin2FACreateSecretMessage.mockRejectedValue(new Error("socket hang up"));
    renderPage();
    await enrol();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "Failed to set security question.",
        "error"
      )
    );
  });

  it("clears the previous failure when the form is submitted again", async () => {
    api.Admin2FACreateSecretMessage.mockRejectedValueOnce({
      response: { data: { message: "That answer is too common" } },
    });
    renderPage();
    await enrol();
    await screen.findByText("That answer is too common");

    submitForm();
    await screen.findByText("Verification Successful");
    expect(
      screen.queryByText("That answer is too common")
    ).not.toBeInTheDocument();
  });
});
