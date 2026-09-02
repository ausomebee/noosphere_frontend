import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * The first step of the clinical-report document flow: a two-card chooser that
 * hands off to either the document builder or the template library, then back
 * into the builder once a template has been picked.
 *
 * All three modals live in the same tree at once and the chooser hides itself
 * by ANDing its own `isOpen` against the other two, so "closed" here means the
 * chooser's own markup is absent while the component is still mounted. The two
 * downstream modals are probes that record their props, which is how the
 * template hand-off and the builder's completion callback are driven -- neither
 * has a control of its own in this file's scope.
 */

const build = vi.hoisted(() => ({ props: null }));
vi.mock(
  "../Components/ReusableModal/ClientModal/ClinicalReport/BuildDocumentModal/BuildDocumentModal",
  () => ({
    default: (received) => {
      build.props = received;
      return received.isOpen ? <div data-testid="build-modal" /> : null;
    },
  })
);

const library = vi.hoisted(() => ({ props: null }));
vi.mock(
  "../Components/ReusableModal/ClientModal/ClinicalReport/TemplateLibraryModal/TemplateLibraryModal",
  () => ({
    default: (received) => {
      library.props = received;
      return received.isOpen ? <div data-testid="library-modal" /> : null;
    },
  })
);

import CreateAReportDocumentModal from "../Components/ReusableModal/ClientModal/ClinicalReport/CreateAReportDocumentModal";

const CLIENT = { id: "c-1", name: "Sam Okafor" };

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onStartCreating = vi.fn();
  const view = render(
    <CreateAReportDocumentModal
      isOpen
      onClose={onClose}
      onStartCreating={onStartCreating}
      clientData={CLIENT}
      {...props}
    />
  );
  return { ...view, onClose, onStartCreating };
};

const chooser = () => document.body.querySelector(".create-document-content");
const cards = () => Array.from(document.body.querySelectorAll(".document-option-card"));
const freshCard = () => cards()[0];
const templateCard = () => cards()[1];
const selectedLabels = () =>
  cards()
    .filter((c) => c.classList.contains("option-selected"))
    .map((c) => c.querySelector(".option-label").textContent);
const next = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const cancel = () => document.body.querySelector(".modal-btn-secondary");

const submit = () =>
  act(() => {
    fireEvent.click(next());
  });

// The two option cards are plain `<button>`s inside ReusableModal's `<form>`,
// so they default to type="submit": clicking the template card both records the
// choice and submits the chooser, which lands on the builder because handleNext
// still reads the pre-click option. Backing out of that builder is the only way
// to reach the chooser with "template" actually pending.
const chooseTemplate = () => {
  act(() => {
    fireEvent.click(templateCard());
  });
  act(() => {
    build.props.onClose();
  });
  // That accidental submit left ReusableModal's double-click guard armed, and
  // it only releases on a 600ms timer -- without this the deliberate Next press
  // that follows is swallowed.
  act(() => {
    vi.advanceTimersByTime(700);
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  build.props = null;
  library.props = null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the chooser", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(chooser()).toBeNull();
    expect(screen.queryByTestId("build-modal")).toBeNull();
    expect(screen.queryByTestId("library-modal")).toBeNull();
  });

  it("opens on the fresh-document card", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Create a document"
    );
    expect(next()).toHaveTextContent("Next");
    expect(selectedLabels()).toEqual(["Start a fresh document"]);
  });

  // Current behaviour, not intended behaviour: the untyped card button submits
  // the enclosing form, so a click on the template card opens the builder even
  // though the user never pressed Next.
  it("submits the chooser when the template card is clicked", () => {
    renderModal();
    act(() => {
      fireEvent.click(templateCard());
    });
    expect(screen.getByTestId("build-modal")).toBeInTheDocument();
    expect(chooser()).toBeNull();
  });

  it("moves the tick to the template card and back", () => {
    renderModal();
    chooseTemplate();
    expect(selectedLabels()).toEqual(["Select from Template Library"]);
    // Same accidental submit in the other direction: the stale option sends
    // this one to the library, so that is what has to be dismissed.
    act(() => {
      fireEvent.click(freshCard());
    });
    act(() => {
      library.props.onClose();
    });
    expect(selectedLabels()).toEqual(["Start a fresh document"]);
  });

  it("closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.click(cancel());
    expect(onClose).toHaveBeenCalled();
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  // Closing resets the chooser, so the next open starts on the fresh card
  // rather than on whatever was picked last time.
  it("forgets a template choice that was abandoned", () => {
    renderModal();
    chooseTemplate();
    fireEvent.click(cancel());
    expect(selectedLabels()).toEqual(["Start a fresh document"]);
  });
});

describe("starting a fresh document", () => {
  it("hands straight to the builder and hides the chooser", () => {
    renderModal();
    submit();
    expect(screen.getByTestId("build-modal")).toBeInTheDocument();
    expect(chooser()).toBeNull();
    expect(build.props.templateData).toBeNull();
    expect(build.props.clientData).toBe(CLIENT);
    expect(screen.queryByTestId("library-modal")).toBeNull();
  });

  it("brings the chooser back when the builder is dismissed", () => {
    renderModal();
    submit();
    act(() => {
      build.props.onClose();
    });
    expect(screen.queryByTestId("build-modal")).toBeNull();
    expect(chooser()).not.toBeNull();
  });
});

describe("starting from a template", () => {
  const openLibrary = () => {
    chooseTemplate();
    submit();
  };

  it("opens the library instead of the builder", () => {
    renderModal();
    openLibrary();
    expect(screen.getByTestId("library-modal")).toBeInTheDocument();
    expect(screen.queryByTestId("build-modal")).toBeNull();
    expect(chooser()).toBeNull();
  });

  it("brings the chooser back when the library is dismissed", () => {
    renderModal();
    openLibrary();
    act(() => {
      library.props.onClose();
    });
    expect(screen.queryByTestId("library-modal")).toBeNull();
    expect(selectedLabels()).toEqual(["Select from Template Library"]);
  });

  it("carries the chosen template into the builder", () => {
    const template = { id: "tpl-1", name: "Progress report" };
    renderModal();
    openLibrary();
    act(() => {
      library.props.onSelectTemplate(template);
    });
    expect(screen.queryByTestId("library-modal")).toBeNull();
    expect(screen.getByTestId("build-modal")).toBeInTheDocument();
    expect(build.props.templateData).toBe(template);
  });

  it("drops the template when the builder is dismissed", () => {
    renderModal();
    openLibrary();
    act(() => {
      library.props.onSelectTemplate({ id: "tpl-1" });
    });
    act(() => {
      build.props.onClose();
    });
    expect(build.props.templateData).toBeNull();
    expect(chooser()).not.toBeNull();
  });
});

describe("finishing", () => {
  const document_ = { title: "Q3 progress", sections: [] };

  it("passes the built document up and closes everything", () => {
    const { onClose, onStartCreating } = renderModal();
    submit();
    act(() => {
      build.props.onStartCreating(document_);
    });
    expect(onStartCreating).toHaveBeenCalledWith(document_);
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId("build-modal")).toBeNull();
  });

  // The callback is optional -- the modal is also mounted where the caller only
  // wants the close -- so completion still has to tear the flow down.
  it("closes even with no completion callback wired up", () => {
    const { onClose } = renderModal({ onStartCreating: undefined });
    submit();
    act(() => {
      build.props.onStartCreating(document_);
    });
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId("build-modal")).toBeNull();
  });

  it("resets the chooser back to fresh after a template run", () => {
    const { onStartCreating } = renderModal();
    chooseTemplate();
    submit();
    act(() => {
      library.props.onSelectTemplate({ id: "tpl-1" });
    });
    act(() => {
      build.props.onStartCreating(document_);
    });
    expect(onStartCreating).toHaveBeenCalledWith(document_);
    expect(selectedLabels()).toEqual(["Start a fresh document"]);
  });
});

describe("the option cards submit the modal", () => {
  /**
   * Neither card carries `type="button"`, so each is a submit button inside
   * ReusableModal's form. Clicking one both records the choice and fires Next,
   * using the option from before the click -- which is why the Template Library
   * cannot be reached in a single click, and the blank builder opens instead.
   */
  it("opens the builder on the very first click of the template card", () => {
    renderModal();
    act(() => {
      fireEvent.click(templateCard());
    });
    expect(screen.getByTestId("build-modal")).toBeInTheDocument();
    expect(screen.queryByTestId("library-modal")).not.toBeInTheDocument();
    expect(chooser()).toBeNull();
  });

  it("opens the builder on a click of the fresh card too", () => {
    renderModal();
    act(() => {
      fireEvent.click(freshCard());
    });
    expect(screen.getByTestId("build-modal")).toBeInTheDocument();
  });

  it("does hold the template choice underneath, once the builder is dismissed", () => {
    renderModal();
    chooseTemplate();
    expect(selectedLabels()).toEqual(["Select from Template Library"]);
  });

  it("only then reaches the library, on a second press of Next", () => {
    renderModal();
    chooseTemplate();
    submit();
    expect(screen.getByTestId("library-modal")).toBeInTheDocument();
  });
});
