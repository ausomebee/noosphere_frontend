import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The contenteditable rich text box: a sanitised initial value, a toolbar of
 * `document.execCommand` buttons, and a highlight on whichever of those formats
 * the caret currently sits inside.
 *
 * jsdom implements neither `execCommand` nor `queryCommandState`, so both are
 * installed as spies for the run; the editing commands therefore never actually
 * change the markup, and each test that cares about a format sets the document
 * selection over hand-written HTML instead.
 *
 * The format check bails on a collapsed selection, which is what a bare caret
 * is, so every test that expects the toolbar to light up selects a range first.
 * It also reads the block type off the selection's common ancestor, which is
 * the text node itself for a partial selection and the element for a whole one
 * — both arms are exercised below.
 *
 * The initial value is written straight into the DOM once and only while the
 * box is still empty, so a later change to `value` deliberately does not show.
 */

import RichTextEditor from "../Components/Input/RichTextEditor/RichTextEditorInput";

const editor = () => document.querySelector(".editor-content");
const toolbarButton = (title) => screen.getByTitle(title);

// Selecting the whole of an element leaves the element as the common ancestor;
// selecting part of its text leaves the text node. The two take different
// routes to the parent the format check inspects.
const selectContentsOf = (node) => {
  const selection = document.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
};

const selectInsideText = (textNode) => {
  const selection = document.getSelection();
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, textNode.length);
  selection.removeAllRanges();
  selection.addRange(range);
};

const isActive = (title) => toolbarButton(title).className.includes("active");

beforeEach(() => {
  vi.clearAllMocks();
  document.execCommand = vi.fn();
  document.queryCommandState = vi.fn(() => false);
  document.getSelection().removeAllRanges();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete document.execCommand;
  delete document.queryCommandState;
});

describe("how it is labelled", () => {
  it("carries its default label and placeholder", () => {
    render(<RichTextEditor onChange={vi.fn()} />);
    expect(screen.getByText("Client Background")).toBeInTheDocument();
    expect(editor()).toHaveAttribute("data-placeholder", "Enter a description...");
    expect(document.querySelector(".required-indicator")).toBeNull();
  });

  it("takes a label, a placeholder and a required marker from its caller", () => {
    render(<RichTextEditor label="Session Notes" placeholder="Type here" required onChange={vi.fn()} />);
    expect(screen.getByText("Session Notes")).toBeInTheDocument();
    expect(editor()).toHaveAttribute("data-placeholder", "Type here");
    expect(document.querySelector(".required-indicator")).not.toBeNull();
  });
});

describe("the value it opens with", () => {
  it("writes the supplied markup into the box", () => {
    render(<RichTextEditor value="<p>Existing notes</p>" onChange={vi.fn()} />);
    expect(editor().innerHTML).toBe("<p>Existing notes</p>");
  });

  it("strips anything dangerous out of that markup", () => {
    render(
      <RichTextEditor value='<p>Safe</p><img src="x" onerror="alert(1)">' onChange={vi.fn()} />
    );
    expect(editor().innerHTML).toContain("Safe");
    expect(editor().innerHTML).not.toContain("onerror");
  });

  it("starts empty when it is given no value", () => {
    render(<RichTextEditor onChange={vi.fn()} />);
    expect(editor().innerHTML).toBe("");
  });

  it("leaves what the user has typed alone when the value prop changes later", () => {
    // The write is guarded on the box still being empty, so a controlled parent
    // pushing a new value down never overwrites live typing.
    const { rerender } = render(<RichTextEditor value="<p>First</p>" onChange={vi.fn()} />);
    rerender(<RichTextEditor value="<p>Second</p>" onChange={vi.fn()} />);
    expect(editor().innerHTML).toBe("<p>First</p>");
  });
});

describe("typing", () => {
  it("hands the caller the box's markup on every input", () => {
    const onChange = vi.fn();
    render(<RichTextEditor onChange={onChange} />);
    editor().innerHTML = "<p>Half a sentence</p>";
    fireEvent.input(editor());
    expect(onChange).toHaveBeenCalledWith("<p>Half a sentence</p>");
  });

  it("survives an input with no listener attached", () => {
    render(<RichTextEditor />);
    editor().innerHTML = "<p>Orphaned</p>";
    fireEvent.input(editor());
    expect(editor().innerHTML).toBe("<p>Orphaned</p>");
  });

  it("marks itself focused while the caret is in the box", () => {
    render(<RichTextEditor onChange={vi.fn()} />);
    expect(editor().className).not.toContain("focused");
    fireEvent.focus(editor());
    expect(editor().className).toContain("focused");
    expect(document.querySelector(".editor-toolbar").className).toContain("focused");
    fireEvent.blur(editor());
    expect(editor().className).not.toContain("focused");
  });
});

describe("the toolbar commands", () => {
  const renderWithText = () => {
    render(<RichTextEditor value="<p>Some notes</p>" onChange={vi.fn()} />);
  };

  it("asks the document to turn the block into a heading", () => {
    renderWithText();
    fireEvent.click(toolbarButton("Subheading"));
    expect(document.execCommand).toHaveBeenCalledWith("formatBlock", false, "h3");
  });

  it("asks the document to turn the block back into body text", () => {
    renderWithText();
    fireEvent.click(toolbarButton("Body text"));
    expect(document.execCommand).toHaveBeenCalledWith("formatBlock", false, "p");
  });

  it("passes no argument for the character formats", () => {
    renderWithText();
    fireEvent.click(toolbarButton("Bold"));
    fireEvent.click(toolbarButton("Italic"));
    fireEvent.click(toolbarButton("Underline"));
    expect(document.execCommand).toHaveBeenNthCalledWith(1, "bold", false, null);
    expect(document.execCommand).toHaveBeenNthCalledWith(2, "italic", false, null);
    expect(document.execCommand).toHaveBeenNthCalledWith(3, "underline", false, null);
  });

  it("asks for either kind of list", () => {
    renderWithText();
    fireEvent.click(toolbarButton("Bulleted List"));
    fireEvent.click(toolbarButton("Numbered List"));
    expect(document.execCommand).toHaveBeenNthCalledWith(1, "insertUnorderedList", false, null);
    expect(document.execCommand).toHaveBeenNthCalledWith(2, "insertOrderedList", false, null);
  });

  it("puts the caret back in the box after a command", () => {
    renderWithText();
    fireEvent.click(toolbarButton("Bold"));
    expect(document.activeElement).toBe(editor());
  });

  it("re-reads the formats once the command has landed", async () => {
    // The re-read is deferred to a macrotask so the browser has applied the
    // command first; here it is only observable through the state it sets.
    // jsdom collapses the document selection when the box takes focus back, so
    // the range is laid down again after the click and before the timer runs.
    renderWithText();
    document.queryCommandState.mockReturnValue(true);
    fireEvent.click(toolbarButton("Bold"));
    selectContentsOf(editor().querySelector("p"));
    await waitFor(() => expect(isActive("Bold")).toBe(true));
  });
});

describe("the format highlight", () => {
  const renderMarkup = (markup) => {
    render(<RichTextEditor value={markup} onChange={vi.fn()} />);
  };

  it("starts with body text selected and nothing else lit", () => {
    renderMarkup("<p>Some notes</p>");
    expect(isActive("Body text")).toBe(true);
    expect(isActive("Subheading")).toBe(false);
    expect(isActive("Bold")).toBe(false);
    expect(isActive("Bulleted List")).toBe(false);
    expect(isActive("Numbered List")).toBe(false);
  });

  it("lights up the character formats the document reports as on", () => {
    renderMarkup("<p>Some notes</p>");
    document.queryCommandState.mockReturnValue(true);
    selectContentsOf(editor().querySelector("p"));
    fireEvent.click(editor());
    expect(isActive("Bold")).toBe(true);
    expect(isActive("Italic")).toBe(true);
    expect(isActive("Underline")).toBe(true);
  });

  it("switches to the subheading when the caret sits in one", () => {
    renderMarkup("<h3>A heading</h3>");
    selectInsideText(editor().querySelector("h3").firstChild);
    fireEvent.keyUp(editor());
    expect(isActive("Subheading")).toBe(true);
    expect(isActive("Body text")).toBe(false);
  });

  it("lights the bulleted list when the caret sits inside one", () => {
    renderMarkup("<ul><li>First point</li></ul>");
    selectInsideText(editor().querySelector("li").firstChild);
    fireEvent.click(editor());
    expect(isActive("Bulleted List")).toBe(true);
    expect(isActive("Numbered List")).toBe(false);
  });

  it("lights the numbered list when the caret sits inside one", () => {
    renderMarkup("<ol><li>First step</li></ol>");
    selectInsideText(editor().querySelector("li").firstChild);
    fireEvent.click(editor());
    expect(isActive("Numbered List")).toBe(true);
    expect(isActive("Bulleted List")).toBe(false);
  });

  it("leaves the highlight alone for a bare caret", () => {
    // A collapsed selection is a caret rather than a selection, and the check
    // deliberately skips it, so a format reported as on is never picked up.
    renderMarkup("<h3>A heading</h3>");
    document.queryCommandState.mockReturnValue(true);
    const selection = document.getSelection();
    const range = document.createRange();
    range.setStart(editor().querySelector("h3").firstChild, 2);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.click(editor());
    expect(isActive("Subheading")).toBe(false);
    expect(isActive("Bold")).toBe(false);
  });

  it("leaves the highlight alone when there is no selection at all", () => {
    renderMarkup("<h3>A heading</h3>");
    document.queryCommandState.mockReturnValue(true);
    document.getSelection().removeAllRanges();
    fireEvent.click(editor());
    expect(isActive("Body text")).toBe(true);
    expect(isActive("Bold")).toBe(false);
  });

  it("re-reads the formats when the document's selection moves inside the box", () => {
    renderMarkup("<h3>A heading</h3>");
    editor().focus();
    selectInsideText(editor().querySelector("h3").firstChild);
    fireEvent(document, new Event("selectionchange"));
    expect(isActive("Subheading")).toBe(true);
  });

  it("ignores a selection change that happens outside the box", () => {
    renderMarkup("<h3>A heading</h3>");
    selectInsideText(editor().querySelector("h3").firstChild);
    document.body.focus();
    fireEvent(document, new Event("selectionchange"));
    expect(isActive("Subheading")).toBe(false);
  });
});

/**
 * `onBlur` and `readOnly` used to be dropped on the floor: the component
 * destructured a fixed prop list with no rest, so every consumer that passed
 * them -- the clinical report sections all do -- got neither. A read-only
 * report was fully editable and no field could ever be marked touched.
 */
describe("leaving the box", () => {
  it("tells the caller when focus goes", () => {
    const onBlur = vi.fn();
    render(<RichTextEditor value="" onChange={vi.fn()} onBlur={onBlur} />);
    fireEvent.blur(editor());
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("still drops the focus ring without a handler to call", () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    fireEvent.focus(editor());
    expect(editor().className).toContain("focused");
    fireEvent.blur(editor());
    expect(editor().className).not.toContain("focused");
  });
});

describe("a read-only box", () => {
  const renderReadOnly = (props = {}) =>
    render(
      <RichTextEditor value="<p>On file</p>" onChange={vi.fn()} readOnly {...props} />
    );

  it("is not editable and says so in its class", () => {
    renderReadOnly();
    expect(editor()).toHaveAttribute("contenteditable", "false");
    expect(editor().className).toContain("read-only");
  });

  it("shows the stored content", () => {
    renderReadOnly();
    expect(editor().innerHTML).toContain("On file");
  });

  it("renders no toolbar at all", () => {
    renderReadOnly();
    expect(document.querySelector(".editor-toolbar")).toBeNull();
    expect(screen.queryByTitle("Bold")).not.toBeInTheDocument();
  });

  it("reports nothing when an edit is forced through anyway", () => {
    const onChange = vi.fn();
    renderReadOnly({ onChange });
    editor().innerHTML = "<p>Tampered</p>";
    fireEvent.input(editor());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still reports being left, so the field can be marked touched", () => {
    const onBlur = vi.fn();
    renderReadOnly({ onBlur });
    fireEvent.blur(editor());
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
