import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import FormRenderer from "../Pages/CustomForms/FormRender/FormRenderer";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The read-only view of a submitted custom form. It fetches the form and its
 * first response, then renders one block per field — a different shape for each
 * of the nine field types, plus section headers and body text that are skipped
 * when numbering the questions.
 *
 * The same field walk exists twice: once as JSX and once inside the PDF export,
 * which builds the document imperatively through jsPDF. That second pass is
 * where most of the branching lives, so jsPDF is replaced with a recorder that
 * keeps every text/addImage/save call — a test can then assert on what the
 * document would say without a real file ever being written. Everything else
 * the page depends on (the API, the document viewer, the router) is mocked; the
 * settings slice is preloaded as already loaded so no settings fetch fires.
 */

const spies = vi.hoisted(() => ({
  getForm: vi.fn(),
  getResponses: vi.fn(),
  toast: vi.fn(),
  apiError: vi.fn(),
  navigate: vi.fn(),
  openDocument: vi.fn(),
}));

// Mutable knobs the jsPDF stand-in reads at call time, so a test can make the
// constructor or an image insert fail without redefining the mock.
const pdf = vi.hoisted(() => ({ doc: null, failConstruct: false, failImage: false }));

vi.mock("../api/customFormsApi", () => ({
  default: {
    GetFormsByFormId: spies.getForm,
    GetFormResponsesByFormId: spies.getResponses,
  },
}));

vi.mock("../Helper/ShowToast", () => ({
  showToast: spies.toast,
  showApiError: spies.apiError,
}));

vi.mock("../hooks/useDocumentViewer", () => ({
  default: () => ({ openDocument: spies.openDocument }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: pdf.formId }),
    useNavigate: () => spies.navigate,
  };
});

vi.mock("jspdf", () => ({
  jsPDF: function jsPDF() {
    if (pdf.failConstruct) throw new Error("jsPDF unavailable");
    const calls = { text: [], textWithLink: [], addImage: [], save: [] };
    const noop = () => {};
    const doc = {
      calls,
      pages: 1,
      internal: {
        // A4 in millimetres, which is what the exporter's layout maths assumes.
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
        getNumberOfPages: () => doc.pages,
      },
      GState: function GState(options) {
        return options;
      },
      setFillColor: noop,
      setDrawColor: noop,
      setTextColor: noop,
      setFontSize: noop,
      setFont: noop,
      setLineWidth: noop,
      setLineDashPattern: noop,
      setGState: noop,
      setPage: noop,
      rect: noop,
      roundedRect: noop,
      circle: noop,
      triangle: noop,
      line: noop,
      addPage: () => {
        doc.pages += 1;
      },
      splitTextToSize: (text) => String(text).split("\n"),
      text: (...args) => calls.text.push(args),
      textWithLink: (...args) => calls.textWithLink.push(args),
      addImage: (...args) => {
        if (pdf.failImage) throw new Error("bad image data");
        calls.addImage.push(args);
      },
      save: (...args) => calls.save.push(args),
    };
    pdf.doc = doc;
    return doc;
  },
}));

const field = (id, fieldType, label, extra = {}) => ({
  id,
  fieldType,
  label,
  order: extra.order ?? 0,
  ...extra,
});

const answer = (formFieldId, value) => ({ formFieldId, value });

const makeStore = () =>
  configureStore({
    reducer: {
      authentication: authReducer,
      generalSettings: generalSettingsReducer,
    },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        refreshToken: "rt",
        user: {
          id: "u1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
        },
      },
      // Marked loaded so the format hook never reaches for the settings API.
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
    <Provider store={makeStore()}>
      <FormRenderer />
    </Provider>
  );

const loadWith = async ({ name = "Intake Form", fields = [], answers = [] } = {}) => {
  spies.getForm.mockResolvedValue({ data: { data: { name } } });
  spies.getResponses.mockResolvedValue({
    data: {
      data: {
        responses: [{ submittedAt: "2026-01-15T10:30:00.000Z", fields: answers }],
        originalFields: fields,
      },
    },
  });
  const view = renderPage();
  await waitFor(() =>
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  );
  return view;
};

const pdfText = () => pdf.doc.calls.text.map((args) => args[0]).flat();

const download = async () => {
  fireEvent.click(screen.getByText("Download PDF"));
  await waitFor(() => expect(pdf.doc).not.toBeNull());
  await waitFor(() => expect(pdf.doc.calls.save.length).toBeGreaterThan(0));
};

let errorSpy;

beforeEach(() => {
  vi.clearAllMocks();
  pdf.doc = null;
  pdf.failConstruct = false;
  pdf.failImage = false;
  pdf.formId = "form-1";
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  spies.getForm.mockResolvedValue({ data: { data: { name: "Intake Form" } } });
  spies.getResponses.mockResolvedValue({ data: { data: {} } });
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("loading the response", () => {
  it("shows a loader until both requests land", () => {
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("asks for the form and its responses by id", async () => {
    await loadWith();
    expect(spies.getForm).toHaveBeenCalledWith(
      expect.objectContaining({ formId: "form-1" })
    );
    expect(spies.getResponses).toHaveBeenCalledWith(
      expect.objectContaining({ formId: "form-1" })
    );
  });

  it("never fetches without a form id in the route", () => {
    pdf.formId = undefined;
    renderPage();
    expect(spies.getForm).not.toHaveBeenCalled();
  });

  it("shows the form name and when it was submitted", async () => {
    await loadWith();
    expect(screen.getByText("Intake Form")).toBeInTheDocument();
    expect(screen.getByText(/01\/15\/2026/)).toBeInTheDocument();
  });

  it("falls back to a placeholder title", async () => {
    await loadWith({ name: "" });
    expect(screen.getByText("Untitled Form")).toBeInTheDocument();
  });

  it("says so when the form has no response yet", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("No Response Yet")).toBeInTheDocument()
    );
    expect(screen.queryByText("Download PDF")).not.toBeInTheDocument();
  });

  it("reports a failed load", async () => {
    spies.getForm.mockRejectedValue(new Error("form gone"));
    renderPage();
    await waitFor(() =>
      expect(spies.apiError).toHaveBeenCalledWith(
        expect.any(Error),
        "LOAD_FORM"
      )
    );
  });

  it("goes back on the back button", async () => {
    await loadWith();
    fireEvent.click(screen.getByText("Back"));
    expect(spies.navigate).toHaveBeenCalledWith(-1);
  });
});

describe("field rendering", () => {
  it("renders a section header and its body text without numbering them", async () => {
    await loadWith({
      fields: [
        field("f1", "sectionHeader", "About you", { order: 1 }),
        field("f2", "bodyText", "Please answer honestly.", { order: 2 }),
        field("f3", "shortText", "Your name", { order: 3 }),
      ],
      answers: [answer("f3", "Ada")],
    });

    expect(screen.getByText("About you")).toBeInTheDocument();
    expect(screen.getByText("Please answer honestly.")).toBeInTheDocument();
    // The first answerable field is question 1 even though two blocks precede it.
    expect(document.querySelector(".fr-q-num").textContent).toBe("1");
  });

  it("orders the fields by their order value", async () => {
    await loadWith({
      fields: [
        field("f2", "shortText", "Second", { order: 2 }),
        field("f1", "shortText", "First", { order: 1 }),
        // No order at all sorts as zero, ahead of both.
        field("f0", "shortText", "Zeroth"),
      ],
      answers: [],
    });

    const labels = Array.from(document.querySelectorAll(".fr-label")).map(
      (l) => l.textContent
    );
    expect(labels).toEqual(["Zeroth", "First", "Second"]);
  });

  it("marks a required field", async () => {
    await loadWith({
      fields: [field("f1", "shortText", "Your name", { isRequired: true })],
      answers: [],
    });
    expect(document.querySelector(".required-indicator")).toBeTruthy();
  });

  it("shows a dash for a field nobody answered", async () => {
    await loadWith({
      fields: [field("f1", "shortText", "Your name")],
      answers: [],
    });
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("renders short text and paragraphs in an answer box", async () => {
    await loadWith({
      fields: [
        field("f1", "shortText", "Name"),
        field("f2", "paragraph", "Notes", { order: 1 }),
      ],
      answers: [answer("f1", "Ada"), answer("f2", "Some notes")],
    });
    expect(document.querySelectorAll(".fr-answer-box")).toHaveLength(2);
  });

  it("renders a dropdown answer as a chip", async () => {
    await loadWith({
      fields: [field("f1", "dropdown", "Referral")],
      answers: [answer("f1", "Website")],
    });
    expect(document.querySelector(".fr-answer-chip").textContent).toBe("Website");
  });

  it("marks the chosen radio option and leaves the rest plain", async () => {
    await loadWith({
      fields: [field("f1", "radio", "Contact by", { options: ["Email", "Phone"] })],
      answers: [answer("f1", "Phone")],
    });

    const items = document.querySelectorAll(".fr-option-item");
    expect(items[0].className).not.toContain("fr-option-selected");
    expect(items[1].className).toContain("fr-option-selected");
    expect(document.querySelector(".fr-radio-dot")).toBeTruthy();
  });

  it("ticks every chosen checkbox option", async () => {
    await loadWith({
      fields: [
        field("f1", "checkbox", "Days", { options: ["Mon", "Tue", "Wed"] }),
      ],
      answers: [answer("f1", "Mon, Wed")],
    });

    expect(document.querySelectorAll(".fr-check-checked")).toHaveLength(2);
  });

  it("fills as many stars as the rating", async () => {
    await loadWith({
      fields: [field("f1", "starRating", "Satisfaction", { starRating: [4] })],
      answers: [answer("f1", "3")],
    });

    expect(document.querySelectorAll(".fr-star-active")).toHaveLength(3);
    expect(screen.getByText("3 out of 4")).toBeInTheDocument();
  });

  it("defaults to five stars when the field carries no maximum", async () => {
    await loadWith({
      fields: [field("f1", "starRating", "Satisfaction")],
      answers: [answer("f1", "2")],
    });
    expect(screen.getByText("2 out of 5")).toBeInTheDocument();
  });

  it("shows a drawn signature as an image", async () => {
    await loadWith({
      fields: [field("f1", "signature", "Sign here")],
      answers: [answer("f1", "data:image/png;base64,AAAA")],
    });
    expect(document.querySelector(".fr-sig-img")).toBeTruthy();
  });

  it("shows a typed signature as text", async () => {
    await loadWith({
      fields: [field("f1", "signature", "Sign here")],
      answers: [answer("f1", "Ada Lovelace")],
    });
    expect(document.querySelector(".fr-sig-typed").textContent).toBe(
      "Ada Lovelace"
    );
  });

  it("falls back to an answer box for a field type it does not know", async () => {
    await loadWith({
      fields: [field("f1", "colourPicker", "Favourite colour")],
      answers: [answer("f1", "blue")],
    });
    expect(document.querySelector(".fr-answer-box").textContent).toBe("blue");
  });
});

describe("uploaded files", () => {
  it("shows a dash when nothing was uploaded", async () => {
    await loadWith({
      fields: [field("f1", "fileUpload", "Insurance card")],
      answers: [],
    });
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("thumbnails an uploaded image", async () => {
    await loadWith({
      fields: [field("f1", "fileUpload", "Insurance card")],
      answers: [answer("f1", "https://files/1700-card.PNG")],
    });

    expect(document.querySelector(".fr-file-thumb")).toBeTruthy();
    // The upload timestamp prefix is stripped from the displayed name.
    expect(screen.getByText("card.PNG")).toBeInTheDocument();
  });

  it("opens a non-image upload in the document viewer", async () => {
    await loadWith({
      fields: [field("f1", "fileUpload", "Referral letter")],
      answers: [answer("f1", "https://files/1700-referral.pdf")],
    });

    fireEvent.click(screen.getByLabelText("Open referral.pdf"));
    expect(spies.openDocument).toHaveBeenCalledWith(
      "https://files/1700-referral.pdf",
      "referral.pdf"
    );
  });

  it("lists every file on a multi-file question", async () => {
    await loadWith({
      fields: [field("f1", "fileUpload", "Documents")],
      answers: [
        answer("f1", "https://files/a.pdf"),
        answer("f1", "https://files/b.pdf"),
      ],
    });
    expect(document.querySelectorAll(".fr-file-card")).toHaveLength(2);
  });
});

describe("pdf export", () => {
  it("writes a file named after the form", async () => {
    await loadWith({
      fields: [field("f1", "shortText", "Name")],
      answers: [answer("f1", "Ada")],
    });
    await download();

    expect(pdf.doc.calls.save[0][0]).toBe("Intake_Form.pdf");
    expect(pdfText()).toContain("Intake Form");
    expect(pdfText()).toContain("Ada");
  });

  it("falls back to a generic filename for an unnamed form", async () => {
    await loadWith({
      name: "",
      fields: [field("f1", "shortText", "Name")],
      answers: [answer("f1", "Ada")],
    });
    await download();

    // The sanitiser runs over the fallback too, so its hyphen becomes an
    // underscore like any other non-alphanumeric character.
    expect(pdf.doc.calls.save[0][0]).toBe("form_response.pdf");
    expect(pdfText()).toContain("Untitled Form");
  });

  it("marks a question nobody answered", async () => {
    await loadWith({
      fields: [field("f1", "shortText", "Name")],
      answers: [],
    });
    await download();
    expect(pdfText()).toContain("-- No response --");
  });

  it("writes section headers and body text without numbering them", async () => {
    await loadWith({
      fields: [
        field("f1", "sectionHeader", "About you", { order: 1 }),
        field("f2", "bodyText", "Please answer honestly.", { order: 2 }),
        field("f3", "shortText", "Name", { order: 3 }),
      ],
      answers: [answer("f3", "Ada")],
    });
    await download();

    const text = pdfText();
    expect(text).toContain("About you");
    expect(text).toContain("Please answer honestly.");
    expect(text).toContain("1");
  });

  it("writes every option of a radio and a checkbox question", async () => {
    await loadWith({
      fields: [
        field("f1", "radio", "Contact by", { options: ["Email", "Phone"] }),
        field("f2", "checkbox", "Days", {
          options: ["Mon", "Tue"],
          order: 1,
        }),
      ],
      answers: [answer("f1", "Phone"), answer("f2", "Tue")],
    });
    await download();

    const text = pdfText();
    expect(text).toEqual(expect.arrayContaining(["Email", "Phone", "Mon", "Tue"]));
  });

  it("writes the rating out of its maximum", async () => {
    await loadWith({
      fields: [field("f1", "starRating", "Satisfaction", { starRating: [4] })],
      answers: [answer("f1", "3")],
    });
    await download();
    expect(pdfText()).toContain("3 / 4");
  });

  it("links each uploaded file and truncates a long name", async () => {
    const longName = `https://files/1700-${"a".repeat(60)}.pdf`;
    await loadWith({
      fields: [field("f1", "fileUpload", "Documents")],
      answers: [answer("f1", "https://files/1700-card.pdf"), answer("f1", longName)],
    });
    await download();

    const links = pdf.doc.calls.textWithLink.map((args) => args[0]);
    expect(links).toContain("card.pdf");
    expect(links.some((name) => name.endsWith("..."))).toBe(true);
  });

  it("embeds a drawn signature", async () => {
    await loadWith({
      fields: [field("f1", "signature", "Sign here")],
      answers: [answer("f1", "data:image/png;base64,AAAA")],
    });
    await download();

    expect(pdf.doc.calls.addImage).toHaveLength(1);
    expect(pdfText()).toContain("SIGNATURE");
  });

  it("notes a signature it could not embed", async () => {
    pdf.failImage = true;
    await loadWith({
      fields: [field("f1", "signature", "Sign here")],
      answers: [answer("f1", "data:image/png;base64,AAAA")],
    });
    await download();

    expect(pdfText()).toContain("(Signature attached)");
  });

  it("writes a typed signature as text", async () => {
    await loadWith({
      fields: [field("f1", "signature", "Sign here")],
      answers: [answer("f1", "Ada Lovelace")],
    });
    await download();
    expect(pdfText()).toContain("Ada Lovelace");
  });

  it("breaks onto a second page for a long form", async () => {
    const fields = Array.from({ length: 30 }, (_, i) =>
      field(`f${i}`, "shortText", `Question ${i}`, { order: i })
    );
    await loadWith({
      fields,
      answers: fields.map((f) => answer(f.id, `Answer ${f.id}`)),
    });
    await download();

    expect(pdf.doc.pages).toBeGreaterThan(1);
    expect(pdfText()).toContain(`Page 1 of ${pdf.doc.pages}`);
  });

  it("reports a failure instead of writing anything", async () => {
    pdf.failConstruct = true;
    await loadWith({
      fields: [field("f1", "shortText", "Name")],
      answers: [answer("f1", "Ada")],
    });
    fireEvent.click(screen.getByText("Download PDF"));

    await waitFor(() =>
      expect(spies.toast).toHaveBeenCalledWith("Failed to generate PDF", "error")
    );
    expect(pdf.doc).toBeNull();
  });

  it("re-enables the button once the export finishes", async () => {
    await loadWith({
      fields: [field("f1", "shortText", "Name")],
      answers: [answer("f1", "Ada")],
    });
    await download();

    await waitFor(() =>
      expect(screen.getByText("Download PDF")).toBeInTheDocument()
    );
    expect(document.querySelector(".fr-download-btn").disabled).toBe(false);
  });
});

describe("responses the endpoints answer with in thinner shapes", () => {
  const loadRaw = async (form, responses) => {
    spies.getForm.mockResolvedValue(form);
    spies.getResponses.mockResolvedValue(responses);
    const view = renderPage();
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
    );
    return view;
  };

  it("titles the page as untitled when the form record carries no body", async () => {
    await loadRaw({}, { data: { data: {} } });
    expect(screen.getByText("Untitled Form")).toBeInTheDocument();
  });

  it("shows the empty state when the responses record carries no body", async () => {
    await loadRaw({ data: { data: { name: "Intake Form" } } }, {});
    expect(screen.getByText("No Response Yet")).toBeInTheDocument();
  });

  it("offers no PDF at all when there is no response to print", async () => {
    await loadRaw({ data: { data: { name: "Intake Form" } } }, {});
    expect(screen.queryByText("Download PDF")).not.toBeInTheDocument();
  });

  it("renders a response that carries no answers at all", async () => {
    // `fields` missing rather than empty: the page has to default it before
    // building its lookup, both on screen and on the PDF pass.
    await loadRaw(
      { data: { data: { name: "Intake Form" } } },
      {
        data: {
          data: {
            responses: [{ submittedAt: "2026-01-15T10:30:00.000Z" }],
            originalFields: [
              { id: "f1", fieldType: "shortText", label: "Your name" },
            ],
          },
        },
      }
    );

    expect(screen.getByText("Your name")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Download PDF"));
    await waitFor(() => expect(pdf.doc.calls.save.length).toBeGreaterThan(0));
    expect(pdfText()).toContain("-- No response --");
  });
});

describe("fields the builder never gave an order to", () => {
  it("keeps them in the order they arrived, on screen and in the PDF", async () => {
    // No `order` key anywhere, so both sorts fall back to zero and the
    // comparator leaves the list as it found it.
    await loadWith({
      fields: [
        { id: "f1", fieldType: "shortText", label: "First question" },
        { id: "f2", fieldType: "shortText", label: "Second question" },
      ],
      answers: [answer("f1", "one"), answer("f2", "two")],
    });

    const labels = Array.from(
      document.body.querySelectorAll(".fr-label")
    ).map((n) => n.textContent);
    expect(labels).toEqual(["First question", "Second question"]);

    await download();
    expect(pdfText()).toContain("First question");
  });
});

describe("choice fields that were saved without their options", () => {
  it("prints the answer without listing any option rows", async () => {
    await loadWith({
      fields: [
        { id: "f1", fieldType: "radio", label: "Preferred contact", order: 1 },
        { id: "f2", fieldType: "checkbox", label: "Days available", order: 2 },
        { id: "f3", fieldType: "starRating", label: "How was it", order: 3 },
      ],
      answers: [
        answer("f1", "Email"),
        answer("f2", "Mon, Tue"),
        answer("f3", "4"),
      ],
    });

    await download();
    const text = pdfText();
    expect(text).toContain("Preferred contact");
    expect(text).toContain("Days available");
    // No option list survived, so neither choice's own value is printed as a row.
    expect(text).not.toContain("Email");
    expect(text).not.toContain("Mon");
    // The rating still draws its default five stars.
    expect(text).toContain("4 / 5");
  });
});

describe("a field type the exporter has no special case for", () => {
  it("prints its answer as plain text", async () => {
    await loadWith({
      fields: [{ id: "f1", fieldType: "date", label: "Date of birth", order: 1 }],
      answers: [answer("f1", "1980-12-09")],
    });

    await download();
    expect(pdfText()).toContain("1980-12-09");
  });
});

describe("uploaded files", () => {
  it("marks a required upload and names a file whose url will not decode", async () => {
    await loadWith({
      fields: [
        {
          id: "f1",
          fieldType: "fileUpload",
          label: "Proof of address",
          order: 1,
          isRequired: true,
        },
      ],
      // A lone "%" is not a valid escape sequence, so decodeURIComponent throws
      // and the card falls back to a generic name.
      answers: [answer("f1", "https://files.example.com/100%-broken")],
    });

    expect(document.body.querySelector(".required-indicator")).toBeInTheDocument();
    expect(screen.getByText("File")).toBeInTheDocument();
  });
});
