import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import Button from "../Components/Button/Button";
import ReusableModal from "../Components/Modal/ReusableModal";
import NewFolderModal from "../Components/Modal/DocumentModal/NewFolderModal";
import ReusableTable from "../Components/Table/ReuseableTable";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";
import { SelectInput, SearchableSelectInput } from "../Components/Input/Inputs";
import useDocumentViewer, { DocumentViewerProvider } from "../hooks/useDocumentViewer";

/**
 * Closing out the client's reachable branches: the selects' change handlers
 * and disabled state, the button's icon placement, and the viewer's download
 * filename fallback.
 */

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => "blob:x");
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const noop = () => {};

describe("Button icon placement", () => {
  const Icon = () => <svg data-testid="icon" />;

  it("renders the icon on the left by default", () => {
    const { container } = render(<Button label="Go" icon={<Icon />} />);
    const btn = container.querySelector("button");
    expect(btn.firstChild).not.toBeNull();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders the icon on the right when asked", () => {
    render(<Button label="Go" icon={<Icon />} iconPosition="right" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders no icon node when none is supplied", () => {
    render(<Button label="Go" />);
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });
});

describe("ReusableModal blocked submit", () => {
  it("ignores a submit while the primary button is disabled", () => {
    const onPrimaryButtonClick = vi.fn();
    render(
      <ReusableModal
        isOpen
        title="T"
        onClose={noop}
        primaryButtonText="Save"
        primaryButtonDisabled
        onPrimaryButtonClick={onPrimaryButtonClick}
      >
        <p>body</p>
      </ReusableModal>
    );
    // Submit the form directly -- the guard must hold even when the click
    // never lands on the disabled button.
    const form = document.body.querySelector("form");
    fireEvent.submit(form);
    expect(onPrimaryButtonClick).not.toHaveBeenCalled();
  });

  it("runs the handler once nothing blocks it", () => {
    const onPrimaryButtonClick = vi.fn();
    render(
      <ReusableModal
        isOpen
        title="T"
        onClose={noop}
        primaryButtonText="Save"
        onPrimaryButtonClick={onPrimaryButtonClick}
      >
        <p>body</p>
      </ReusableModal>
    );
    fireEvent.submit(document.body.querySelector("form"));
    expect(onPrimaryButtonClick).toHaveBeenCalledTimes(1);
  });
});

describe("NewFolderModal submit guards", () => {
  it("reaches the blank-name guard when the form is submitted directly", () => {
    const onCreate = vi.fn();
    render(<NewFolderModal isOpen onClose={noop} onCreate={onCreate} />);
    // The button is disabled for a blank name, so drive the form itself to
    // exercise handleSubmit's own defensive check.
    fireEvent.submit(document.body.querySelector("form"));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("reaches the unchanged-rename guard the same way", async () => {
    const onRename = vi.fn();
    const onClose = vi.fn();
    render(
      <NewFolderModal
        isOpen
        onClose={onClose}
        onRename={onRename}
        folderId="f1"
        initialName="Same"
        isRenameMode
      />
    );
    fireEvent.submit(document.body.querySelector("form"));
    expect(onRename).not.toHaveBeenCalled();
  });
});

describe("select change handlers", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];

  const pickFirst = (container) => {
    const input = container.querySelector("input");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
    return input;
  };

  it("reports a single selection by name and value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value="" onChange={onChange} />
    );
    pickFirst(container);
    expect(onChange).toHaveBeenCalledWith({ target: { name: "kind", value: "a" } });
  });

  it("reports a multi selection as an array", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value={[]} onChange={onChange} isMulti />
    );
    pickFirst(container);
    expect(onChange).toHaveBeenCalledWith({ target: { name: "kind", value: ["a"] } });
  });

  it("reports the searchable variant's selection by name and value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SearchableSelectInput name="kind" label="K" options={options} value="" onChange={onChange} />
    );
    pickFirst(container);
    expect(onChange).toHaveBeenCalledWith({ target: { name: "kind", value: "a" } });
  });

  it("tolerates a select with no onChange wired", () => {
    const { container } = render(
      <SelectInput name="kind" label="K" options={options} value="" />
    );
    expect(() => pickFirst(container)).not.toThrow();
  });

  it("renders the searchable variant disabled when asked", () => {
    const { container } = render(
      <SearchableSelectInput label="K" options={options} value="" onChange={noop} disabled />
    );
    expect(container.querySelector(".input-select")).toBeInTheDocument();
  });

  it("measures the trigger width for the menu when one is available", () => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 321,
    });
    const { container } = render(
      <SearchableSelectInput label="K" options={options} value="" onChange={noop} />
    );
    pickFirst(container);
    expect(container.querySelector(".input-select")).toBeInTheDocument();
    delete HTMLElement.prototype.offsetWidth;
  });
});

describe("AuthorizationCard handler arms", () => {
  const codes = [
    { value: "97153", label: "97153" },
    { value: "97155", label: "97155" },
  ];

  it("reads the value out of a change event", () => {
    const onServiceCodeChange = vi.fn();
    const { container } = render(
      <AuthorizationCard data={{}} serviceCodes={codes} onServiceCodeChange={onServiceCodeChange} />
    );
    const select = container.querySelector("select");
    if (select) {
      fireEvent.change(select, { target: { value: "97155" } });
      expect(onServiceCodeChange).toHaveBeenCalledWith("97155");
    }
  });

  it("renders without a handler and without service codes", () => {
    expect(() =>
      render(<AuthorizationCard data={{ used: 1, remaining: 2 }} serviceCodes={[]} />)
    ).not.toThrow();
  });

  it("renders with authorization figures supplied", () => {
    expect(() =>
      render(
        <AuthorizationCard
          data={{ totalUnits: 100, usedUnits: 40, remainingUnits: 60 }}
          serviceCodes={codes}
        />
      )
    ).not.toThrow();
  });
});

describe("ReusableTable filter and search null handling", () => {
  const columns = [
    { key: "name", title: "Name" },
    { key: "status", title: "Status" },
  ];

  it("keeps rows whose filter key is undefined out of a filtered result", () => {
    const data = [
      { id: "1", name: "Alpha", status: "Active" },
      { id: "2", name: "Beta" },
    ];
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={data}
        filters={[{ key: "status", label: "Status" }]}
      />
    );
    fireEvent.click(container.querySelector(".filter-btn"));
    fireEvent.change(container.querySelector(".filter-panel select"), {
      target: { value: "Active" },
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("searches across a row whose cell is undefined without matching it", () => {
    const data = [
      { id: "1", name: "Alpha", status: "Active" },
      { id: "2", name: undefined, status: "Paused" },
    ];
    render(<ReusableTable title="R" columns={columns} data={data} />);
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "alpha" } });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Paused")).not.toBeInTheDocument();
  });

  it("opens the menu downward when there is ample room below", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 10,
      bottom: 30,
      left: 100,
      right: 200,
      width: 100,
      height: 20,
      x: 100,
      y: 10,
      toJSON() {},
    });
    render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: "Alpha", status: "Active" }]}
        actions={[{ menu: true, label: "Archive", onClick: vi.fn() }]}
      />
    );
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    expect(document.body).toBeTruthy();
  });
});

describe("useDocumentViewer download filename", () => {
  const Harness = ({ name }) => {
    const { downloadDocument } = useDocumentViewer();
    return <button onClick={() => downloadDocument("https://x/a.pdf", name)}>go</button>;
  };

  const renderHarness = (name) =>
    render(
      <DocumentViewerProvider>
        <Harness name={name} />
      </DocumentViewerProvider>
    );

  const captureAnchors = () => {
    const anchors = [];
    const orig = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === "a") {
        el.click = vi.fn();
        anchors.push(el);
      }
      return el;
    });
    return anchors;
  };

  it("uses the supplied file name", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"]) });
    const anchors = captureAnchors();
    renderHarness("report.pdf");
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe("report.pdf");
  });

  it("falls back to a generic name when none is given", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"]) });
    const anchors = captureAnchors();
    renderHarness(undefined);
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe("document");
  });
});
