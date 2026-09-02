import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * The form builder page: a back button over two tabs, one holding the builder
 * itself and one holding the draft list, with a count badge on the Drafts tab
 * that the draft list pushes up as it loads.
 *
 * Both children are probes here, which is the only way to drive the two
 * callbacks the page hands down — the count that feeds the badge and the
 * edit-a-draft signal that flips the page back to the builder. The route's
 * `formId` is the other input: arriving with one means the user opened a draft
 * for editing, so the effect forces the builder tab even if the drafts tab was
 * showing.
 */

const routeParams = vi.hoisted(() => ({ current: {} }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => routeParams.current,
}));

vi.mock("../Pages/CustomForms/Forms/SubFormBuilder/NewFormBuilder", () => ({
  default: () => <div data-testid="new-form-builder" />,
}));

const drafts = vi.hoisted(() => ({ props: null }));
vi.mock("../Pages/CustomForms/Forms/SubFormBuilder/FormDrafts", () => ({
  default: (received) => {
    drafts.props = received;
    return <div data-testid="form-drafts" />;
  },
}));

import FormBuilder from "../Pages/CustomForms/Forms/FormBuilder";

const tabs = () => Array.from(document.body.querySelectorAll(".tabs .tab"));
const newFormTab = () => tabs()[0];
const draftsTab = () => tabs()[1];
const badge = () => draftsTab().querySelector("span.rounded-full");
const activeTabNames = () =>
  tabs()
    .filter((t) => t.classList.contains("active"))
    .map((t) => t.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  routeParams.current = {};
  drafts.props = null;
});

describe("the page shell", () => {
  it("opens on the builder tab", () => {
    render(<FormBuilder />);
    expect(screen.getByRole("heading", { name: "Form Builder" })).toBeInTheDocument();
    expect(activeTabNames()).toEqual(["New Form"]);
    expect(screen.getByTestId("new-form-builder")).toBeInTheDocument();
    expect(screen.queryByTestId("form-drafts")).toBeNull();
  });

  it("goes back a step in history from the back button", () => {
    render(<FormBuilder />);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});

describe("switching tabs", () => {
  it("swaps the builder for the draft list", () => {
    render(<FormBuilder />);
    fireEvent.click(draftsTab());
    expect(activeTabNames()).toEqual(["Drafts"]);
    expect(screen.getByTestId("form-drafts")).toBeInTheDocument();
    expect(screen.queryByTestId("new-form-builder")).toBeNull();
  });

  it("swaps back again", () => {
    render(<FormBuilder />);
    fireEvent.click(draftsTab());
    fireEvent.click(newFormTab());
    expect(activeTabNames()).toEqual(["New Form"]);
    expect(screen.getByTestId("new-form-builder")).toBeInTheDocument();
    expect(screen.queryByTestId("form-drafts")).toBeNull();
  });

  // The draft list asks to be swapped out once the user picks a draft to edit,
  // so the builder can take over the same screen.
  it("returns to the builder when a draft is opened for editing", () => {
    render(<FormBuilder />);
    fireEvent.click(draftsTab());
    act(() => {
      drafts.props.onEditDraft();
    });
    expect(activeTabNames()).toEqual(["New Form"]);
    expect(screen.getByTestId("new-form-builder")).toBeInTheDocument();
  });
});

describe("the draft count badge", () => {
  it("shows no badge before the draft list has reported a count", () => {
    render(<FormBuilder />);
    expect(badge()).toBeNull();
  });

  it("shows the count the draft list reports", () => {
    render(<FormBuilder />);
    fireEvent.click(draftsTab());
    act(() => {
      drafts.props.onCountChange(4);
    });
    expect(badge()).toHaveTextContent("4");
  });

  // The badge survives leaving the drafts tab, since the count lives on the
  // page rather than in the unmounted list.
  it("keeps the badge after the tab is left", () => {
    render(<FormBuilder />);
    fireEvent.click(draftsTab());
    act(() => {
      drafts.props.onCountChange(2);
    });
    fireEvent.click(newFormTab());
    expect(badge()).toHaveTextContent("2");
  });

  it("drops the badge again when the count falls to zero", () => {
    render(<FormBuilder />);
    fireEvent.click(draftsTab());
    act(() => {
      drafts.props.onCountChange(3);
    });
    expect(badge()).not.toBeNull();
    act(() => {
      drafts.props.onCountChange(0);
    });
    expect(badge()).toBeNull();
  });
});

describe("arriving on a draft's route", () => {
  it("opens straight on the builder when the route carries a form id", () => {
    routeParams.current = { formId: "form-9" };
    render(<FormBuilder />);
    expect(activeTabNames()).toEqual(["New Form"]);
    expect(screen.getByTestId("new-form-builder")).toBeInTheDocument();
  });

  // The route can change while the page is already mounted, which is what
  // happens when a draft is opened from the Drafts tab.
  it("forces the builder tab when a form id turns up later", () => {
    const { rerender } = render(<FormBuilder />);
    fireEvent.click(draftsTab());
    expect(activeTabNames()).toEqual(["Drafts"]);

    routeParams.current = { formId: "form-9" };
    rerender(<FormBuilder />);
    expect(activeTabNames()).toEqual(["New Form"]);
  });

  it("leaves the drafts tab alone when the route has no form id", () => {
    const { rerender } = render(<FormBuilder />);
    fireEvent.click(draftsTab());
    rerender(<FormBuilder />);
    expect(activeTabNames()).toEqual(["Drafts"]);
  });
});
