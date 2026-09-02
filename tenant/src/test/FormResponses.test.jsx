import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The read-only Form Responses page: one fetch for a form's submissions, then
 * a list of collapsible cards, each rendering its answers with a renderer per
 * field type -- text, radio, checkbox, star rating, file upload and signature.
 *
 * The one structural wrinkle is file uploads: before rendering, the page
 * regroups every `fileUpload` answer by its `formFieldId` into a single entry
 * carrying a `values` array, and the card renders anything with `values`
 * through its own multi-file block. That happens even for a lone file, so the
 * grouped block -- not `renderFieldValue`'s `fileUpload` case -- is what these
 * tests drive.
 *
 * The document viewer hook is mocked because the real one throws outside its
 * provider, and the tenant's date/time formats are preloaded into redux so the
 * settings hook never reaches for the network.
 */

const api = vi.hoisted(() => ({ GetFormResponsesByFormId: vi.fn() }));
vi.mock("../api/customFormsApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showApiError: (...a) => toast.showApiError(...a),
  showToast: vi.fn(),
}));

const routeParams = vi.hoisted(() => ({ current: { formId: "form-1" } }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => routeParams.current,
}));

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

vi.mock("../api/generalSettingsApi", () => ({
  default: { GetGeneralSettingsByTenantId: vi.fn().mockResolvedValue({ data: null }) },
}));

import FormResponses from "../Pages/CustomForms/FormResponses/FormResponses";

const store = configureStore({
  reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
  preloadedState: {
    authentication: {
      isAuthenticated: true,
      loading: false,
      error: null,
      token: "at",
      user: {
        id: "u1",
        tenantId: "tenant-1",
        accessToken: "at",
        refreshToken: "rt",
        role: { roleModuleAccesses: [] },
      },
    },
    generalSettings: {
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12-hour",
      currency: "USD",
      loaded: true,
    },
  },
});

const renderPage = () =>
  render(
    <Provider store={store}>
      <FormResponses />
    </Provider>
  );

// One answer: `formField` describes the question, `value` is what was given.
const answer = (formField, value, over = {}) => ({
  id: `f-${formField.label}-${over.formFieldId ?? formField.label}`,
  formFieldId: formField.label,
  value,
  formField,
  ...over,
});

const submission = (fields, over = {}) => ({
  id: "r1",
  submittedAt: "2026-03-10T09:30:00.000Z",
  fields,
  ...over,
});

const load = async (responses, rest = {}) => {
  api.GetFormResponsesByFormId.mockResolvedValue({
    data: { data: { responses, ...rest } },
  });
  const view = renderPage();
  await waitFor(() => expect(screen.getByText("Form Responses")).toBeInTheDocument());
  return view;
};

// Loads one submission and opens its card.
const openOne = async (fields) => {
  await load([submission(fields)]);
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  return screen.getByRole("button", { expanded: true }).parentElement;
};

beforeEach(() => {
  vi.clearAllMocks();
  routeParams.current = { formId: "form-1" };
  api.GetFormResponsesByFormId.mockResolvedValue({ data: { data: { responses: [] } } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the responses", () => {
  it("asks for the form named in the route", async () => {
    await load([]);
    expect(api.GetFormResponsesByFormId).toHaveBeenCalledWith({
      formId: "form-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("stays on the loader and never fetches when the route carries no form id", async () => {
    routeParams.current = {};
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await waitFor(() => expect(api.GetFormResponsesByFormId).not.toHaveBeenCalled());
    expect(screen.queryByText("Form Responses")).not.toBeInTheDocument();
  });

  it("shows the loader until the fetch settles", async () => {
    let release;
    api.GetFormResponsesByFormId.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    release({ data: { data: { responses: [] } } });
    await waitFor(() => expect(screen.getByText("Form Responses")).toBeInTheDocument());
  });

  it("reports a rejected fetch and still leaves the page usable", async () => {
    const failure = new Error("500");
    api.GetFormResponsesByFormId.mockRejectedValue(failure);
    renderPage();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(failure, "LOAD_FORM_RESPONSES")
    );
    expect(screen.getByText("No responses have been submitted yet.")).toBeInTheDocument();
  });

  it("treats an envelope with no data at all as no responses", async () => {
    api.GetFormResponsesByFormId.mockResolvedValue({});
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No responses have been submitted yet.")).toBeInTheDocument()
    );
  });

  it("treats a data envelope missing its response list as no responses", async () => {
    api.GetFormResponsesByFormId.mockResolvedValue({ data: { data: { originalFields: null } } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No responses have been submitted yet.")).toBeInTheDocument()
    );
  });

  it("counts one submission in the singular", async () => {
    await load([submission([])]);
    expect(screen.getByText("1 response submitted")).toBeInTheDocument();
  });

  it("counts several submissions in the plural", async () => {
    await load([submission([]), submission([], { id: "r2" })]);
    expect(screen.getByText("2 responses submitted")).toBeInTheDocument();
  });

  it("goes back through the router history", async () => {
    await load([]);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});

describe("a response card", () => {
  it("shows its position and its formatted submission stamp", async () => {
    await load([submission([]), submission([], { id: "r2" })]);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getAllByText(/Submitted: 03\/10\/2026/)).toHaveLength(2);
  });

  it("says N/A for a submission with no timestamp", async () => {
    await load([submission([], { submittedAt: null })]);
    expect(screen.getByText("Submitted: N/A")).toBeInTheDocument();
  });

  it("expands on click and collapses on a second click", async () => {
    const label = { label: "Your name", fieldType: "shortText" };
    await load([submission([answer(label, "Ada")])]);
    const header = screen.getByRole("button", { expanded: false });
    fireEvent.click(header);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  it("only ever holds one card open", async () => {
    const label = { label: "Your name", fieldType: "shortText" };
    await load([
      submission([answer(label, "Ada")]),
      submission([answer(label, "Grace")], { id: "r2" }),
    ]);
    const [first, second] = screen.getAllByRole("button", { expanded: false });
    fireEvent.click(first);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    fireEvent.click(second);
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
    expect(screen.getByText("Grace")).toBeInTheDocument();
  });

  it("copes with a submission that carries no fields key", async () => {
    await load([submission(undefined)]);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
  });

  it("orders the answers by their field order, treating an unordered field as first", async () => {
    const body = await openOne([
      answer({ label: "Third", fieldType: "shortText", order: 5 }, "c"),
      answer({ label: "First", fieldType: "shortText" }, "a"),
      answer({ label: "Second", fieldType: "shortText", order: 2 }, "b"),
    ]);
    expect(
      Array.from(body.querySelectorAll(".fr-field-label")).map((l) => l.textContent)
    ).toEqual(["First", "Second", "Third"]);
  });

  it("marks a required question with an asterisk and leaves an optional one bare", async () => {
    const body = await openOne([
      answer({ label: "Required one", fieldType: "shortText", isRequired: true }, "a"),
      answer({ label: "Optional one", fieldType: "shortText", isRequired: false }, "b"),
    ]);
    expect(body.querySelectorAll(".required-indicator")).toHaveLength(1);
  });

  it("leaves out section headers and body text entirely", async () => {
    const body = await openOne([
      answer({ label: "A heading", fieldType: "sectionHeader" }, ""),
      answer({ label: "Some prose", fieldType: "bodyText" }, ""),
      answer({ label: "Your name", fieldType: "shortText" }, "Ada"),
    ]);
    expect(within(body).queryByText("A heading")).not.toBeInTheDocument();
    expect(within(body).queryByText("Some prose")).not.toBeInTheDocument();
    expect(within(body).getByText("Ada")).toBeInTheDocument();
  });
});

describe("the field renderers", () => {
  it.each(["shortText", "paragraph", "dropdown", "somethingNew"])(
    "renders a %s answer as plain text",
    async (fieldType) => {
      const body = await openOne([answer({ label: "Q", fieldType }, "the answer")]);
      expect(within(body).getByText("the answer")).toBeInTheDocument();
    }
  );

  it("checks only the chosen radio option", async () => {
    const body = await openOne([
      answer({ label: "Colour", fieldType: "radio", options: ["Red", "Blue"] }, "Blue"),
    ]);
    const radios = body.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
  });

  it("renders nothing inside a radio question that lists no options", async () => {
    const body = await openOne([answer({ label: "Colour", fieldType: "radio" }, "Blue")]);
    expect(body.querySelectorAll('input[type="radio"]')).toHaveLength(0);
  });

  it("checks every option named in a comma-separated checkbox answer", async () => {
    const body = await openOne([
      answer(
        { label: "Days", fieldType: "checkbox", options: ["Mon", "Tue", "Wed"] },
        "Mon, Wed"
      ),
    ]);
    const boxes = body.querySelectorAll('input[type="checkbox"]');
    expect([...boxes].map((b) => b.checked)).toEqual([true, false, true]);
  });

  it("renders nothing inside a checkbox question that lists no options", async () => {
    const body = await openOne([answer({ label: "Days", fieldType: "checkbox" }, "Mon")]);
    expect(body.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("fills as many stars as the rating out of the configured maximum", async () => {
    const body = await openOne([
      answer({ label: "Rate us", fieldType: "starRating", starRating: [10] }, "4"),
    ]);
    expect(within(body).getByText("4/10")).toBeInTheDocument();
    expect(body.querySelectorAll(".fr-star")).toHaveLength(10);
    expect(body.querySelectorAll(".fr-star-filled")).toHaveLength(4);
  });

  it("defaults a star rating to five stars when the field never configured a maximum", async () => {
    const body = await openOne([answer({ label: "Rate us", fieldType: "starRating" }, "3")]);
    expect(within(body).getByText("3/5")).toBeInTheDocument();
    expect(body.querySelectorAll(".fr-star")).toHaveLength(5);
  });

  it("shows a drawn signature as an image", async () => {
    const body = await openOne([
      answer({ label: "Sign", fieldType: "signature" }, "data:image/png;base64,AAA"),
    ]);
    expect(within(body).getByAltText("Signature")).toHaveAttribute(
      "src",
      "data:image/png;base64,AAA"
    );
  });

  it("shows a typed signature as text", async () => {
    const body = await openOne([
      answer({ label: "Sign", fieldType: "signature" }, "Ada Lovelace"),
    ]);
    expect(body.querySelector(".fr-signature-typed")).toHaveTextContent("Ada Lovelace");
  });

  it("shows an unsigned signature field as empty text rather than an image", async () => {
    const body = await openOne([answer({ label: "Sign", fieldType: "signature" }, null)]);
    expect(body.querySelector(".fr-signature-typed")).toBeInTheDocument();
    expect(within(body).queryByAltText("Signature")).not.toBeInTheDocument();
  });
});

describe("uploaded files", () => {
  const upload = (value, formFieldId = "docs") =>
    answer({ label: "Documents", fieldType: "fileUpload" }, value, {
      formFieldId,
      id: `${formFieldId}-${value}`,
    });

  it("previews an image upload inline, naming it without its timestamp prefix", async () => {
    const body = await openOne([upload("https://files/1770815330358-scan%20one.png")]);
    expect(within(body).getByAltText("Upload")).toBeInTheDocument();
    expect(within(body).getByText("scan one.png")).toBeInTheDocument();
  });

  it("offers a non-image upload as a button that opens the viewer", async () => {
    const body = await openOne([upload("https://files/report.pdf")]);
    fireEvent.click(within(body).getByRole("button", { name: "Open report.pdf" }));
    expect(viewer.openDocument).toHaveBeenCalledWith("https://files/report.pdf", "report.pdf");
  });

  it("calls an upload with no url at all a File", async () => {
    const body = await openOne([upload(undefined)]);
    expect(within(body).getByText("File")).toBeInTheDocument();
  });

  it("collects several uploads for the same question under one label", async () => {
    const body = await openOne([
      upload("https://files/a.pdf"),
      upload("https://files/b.png"),
      upload("https://files/other.pdf", "extra"),
    ]);
    // Two questions, three files: the repeated formFieldId groups into one block.
    expect(body.querySelectorAll(".fr-field-block")).toHaveLength(2);
    expect(body.querySelectorAll(".fr-value-file")).toHaveLength(3);
    expect(within(body).getByAltText("Upload")).toBeInTheDocument();
    expect(within(body).getByRole("button", { name: "Open a.pdf" })).toBeInTheDocument();
    expect(within(body).getByRole("button", { name: "Open other.pdf" })).toBeInTheDocument();
  });
});
