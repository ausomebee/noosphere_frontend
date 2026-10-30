import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The clinical report template library: a plain overlay (no ReusableModal) that
 * fetches the tenant's report templates when it opens, lists them ten to a
 * page, and on "Use Template" re-fetches the single template so the caller gets
 * the sections rather than the summary row.
 *
 * Two things shape the tests. The list fetch normalises each record through a
 * chain of fallbacks (`title || name`, `sections || []`), and the single fetch
 * does the same again but with the already-listed row as a last resort, so the
 * fixtures deliberately mix records that carry a title, records that carry only
 * a name, and records missing sections entirely.
 *
 * The pager is the other half. It draws every page number while there are seven
 * or fewer, and otherwise collapses to one of three windows depending on where
 * the current page sits, so the hundred-template fixture below exists purely to
 * get ten pages and walk that window from the front, through the middle, to the
 * back.
 */

const api = vi.hoisted(() => ({ list: vi.fn(), single: vi.fn() }));
vi.mock("../api/TemplateAndReportApi", () => ({
  default: {
    GetClinicalReportTemplateByTenantId: api.list,
    GetSingleClinicalReportTemplateById: api.single,
  },
}));

import TemplateLibraryModal from "../Components/ReusableModal/ClientModal/ClinicalReport/TemplateLibraryModal/TemplateLibraryModal";

const makeStore = (user = {}) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          ...user,
        },
      },
    },
  });

const renderModal = ({ user, ...props } = {}) => {
  const onClose = vi.fn();
  const onSelectTemplate = vi.fn();
  const view = render(
    <Provider store={makeStore(user)}>
      <TemplateLibraryModal
        isOpen
        onClose={onClose}
        onSelectTemplate={onSelectTemplate}
        {...props}
      />
    </Provider>
  );
  return { ...view, onClose, onSelectTemplate };
};

const rows = () => Array.from(document.body.querySelectorAll(".template-name")).map((n) => n.textContent);
const useButtons = () => screen.getAllByRole("button", { name: "Use Template" });
const pageButtons = () =>
  Array.from(document.body.querySelectorAll(".pagination-number"));
const pageLabels = () => pageButtons().map((b) => b.textContent);
const activePage = () =>
  document.body.querySelector(".pagination-active")?.textContent ?? null;
const prevButton = () => screen.getByRole("button", { name: /Previous/ });
const nextButton = () => screen.getByRole("button", { name: /Next/ });

// Ten pages at ten rows a page, which is the only way to reach the collapsed
// pager windows -- they only appear above seven pages.
const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
  id: `t-${i + 1}`,
  title: `Template ${i + 1}`,
  sections: [],
}));

const goToPage = async (label) => {
  fireEvent.click(pageButtons().find((b) => b.textContent === label));
  await waitFor(() => expect(activePage()).toBe(label));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue({ data: [] });
  api.single.mockResolvedValue({ data: {} });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the library shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".template-library-modal")).toBeNull();
    expect(api.list).not.toHaveBeenCalled();
  });

  it("fetches the tenant's templates as it opens", async () => {
    renderModal();
    await waitFor(() =>
      expect(api.list).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "access-1",
        refreshToken: "refresh-1",
      })
    );
  });

  it("fetches nothing without a signed-in tenant", async () => {
    renderModal({ user: { tenantId: null } });
    expect(await screen.findByText("Template Library")).toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
  });

  it("closes from the header button", async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the loader until the fetch settles", async () => {
    let release;
    api.list.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    renderModal();
    expect(await screen.findByRole("status")).toBeInTheDocument();
    release({ data: [{ id: "t-1", title: "Intake" }] });
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(rows()).toEqual(["Intake"]);
  });
});

describe("the template list", () => {
  it("names a template by its title", async () => {
    api.list.mockResolvedValue({ data: [{ id: "t-1", title: "Intake", sections: [{ id: "s-1" }] }] });
    renderModal();
    await waitFor(() => expect(rows()).toEqual(["Intake"]));
  });

  // Older records were stored under `name`, so the list falls back to it.
  it("names a template by its name when it has no title", async () => {
    api.list.mockResolvedValue({ data: [{ id: "t-1", name: "Discharge" }] });
    renderModal();
    await waitFor(() => expect(rows()).toEqual(["Discharge"]));
  });

  it("says so when the tenant has no templates", async () => {
    renderModal();
    expect(await screen.findByText("No templates available")).toBeInTheDocument();
    expect(document.body.querySelector(".template-table")).toBeNull();
  });

  it("treats a response with no data envelope as an empty library", async () => {
    api.list.mockResolvedValue({});
    renderModal();
    expect(await screen.findByText("No templates available")).toBeInTheDocument();
  });

  it("empties the library when the fetch fails", async () => {
    api.list.mockRejectedValue(new Error("500"));
    renderModal();
    expect(await screen.findByText("No templates available")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("choosing a template", () => {
  beforeEach(() => {
    api.list.mockResolvedValue({ data: [{ id: "t-1", title: "Intake" }] });
  });

  it("hands back the freshly fetched template", async () => {
    const { onSelectTemplate } = renderModal();
    await waitFor(() => expect(rows()).toEqual(["Intake"]));
    api.single.mockResolvedValue({
      data: { id: "t-1", title: "Intake (full)", sections: [{ id: "s-1" }] },
    });
    fireEvent.click(useButtons()[0]);
    await waitFor(() =>
      expect(onSelectTemplate).toHaveBeenCalledWith({
        id: "t-1",
        name: "Intake (full)",
        sections: [{ id: "s-1" }],
      })
    );
    expect(api.single).toHaveBeenCalledWith({
      Id: "t-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("reads a single template that is not wrapped in a data envelope", async () => {
    const { onSelectTemplate } = renderModal();
    await waitFor(() => expect(rows()).toEqual(["Intake"]));
    api.single.mockResolvedValue({ id: "t-1", name: "Flat intake", sections: [] });
    fireEvent.click(useButtons()[0]);
    await waitFor(() =>
      expect(onSelectTemplate).toHaveBeenCalledWith({
        id: "t-1",
        name: "Flat intake",
        sections: [],
      })
    );
  });

  // The single fetch may answer with a record carrying neither title nor name,
  // in which case the row's own label is the last thing left to use.
  it("keeps the listed name when the fetched record has none", async () => {
    const { onSelectTemplate } = renderModal();
    await waitFor(() => expect(rows()).toEqual(["Intake"]));
    api.single.mockResolvedValue({ data: { id: "t-1" } });
    fireEvent.click(useButtons()[0]);
    await waitFor(() =>
      expect(onSelectTemplate).toHaveBeenCalledWith({
        id: "t-1",
        name: "Intake",
        sections: [],
      })
    );
  });

  it("falls back to the listed row when the single fetch fails", async () => {
    const { onSelectTemplate } = renderModal();
    await waitFor(() => expect(rows()).toEqual(["Intake"]));
    api.single.mockRejectedValue(new Error("404"));
    fireEvent.click(useButtons()[0]);
    await waitFor(() =>
      expect(onSelectTemplate).toHaveBeenCalledWith({
        id: "t-1",
        name: "Intake",
        sections: [],
      })
    );
  });

  it("spins and locks the row while the single fetch is in flight", async () => {
    let release;
    api.single.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    renderModal();
    await waitFor(() => expect(rows()).toEqual(["Intake"]));
    fireEvent.click(useButtons()[0]);
    await waitFor(() =>
      expect(document.body.querySelector(".use-template-btn")).toBeDisabled()
    );
    expect(document.body.querySelector(".use-template-btn .spinner")).toBeInTheDocument();
    release({ data: { id: "t-1", title: "Intake" } });
    await waitFor(() =>
      expect(document.body.querySelector(".use-template-btn")).not.toBeDisabled()
    );
    expect(document.body.querySelector(".use-template-btn .spinner")).toBeNull();
  });
});

describe("paging through the library", () => {
  it("draws no pager for a single page", async () => {
    api.list.mockResolvedValue({
      data: manyTemplates.slice(0, 10).map((t) => ({ ...t })),
    });
    renderModal();
    await waitFor(() => expect(rows()).toHaveLength(10));
    expect(document.body.querySelector(".template-pagination")).toBeNull();
  });

  it("draws every page number while there are seven or fewer", async () => {
    api.list.mockResolvedValue({ data: manyTemplates.slice(0, 61) });
    renderModal();
    await waitFor(() => expect(pageLabels()).toEqual(["1", "2", "3", "4", "5", "6", "7"]));
    expect(activePage()).toBe("1");
    expect(prevButton()).toBeDisabled();
    expect(nextButton()).not.toBeDisabled();
  });

  it("shows only the first page's ten templates", async () => {
    api.list.mockResolvedValue({ data: manyTemplates });
    renderModal();
    await waitFor(() => expect(rows()).toHaveLength(10));
    expect(rows()[0]).toBe("Template 1");
    expect(rows()[9]).toBe("Template 10");
  });

  it("collapses the pager to the front window on the opening page", async () => {
    api.list.mockResolvedValue({ data: manyTemplates });
    renderModal();
    await waitFor(() => expect(pageLabels()).toEqual(["1", "2", "3", "...", "10"]));
    // The gap is a button too, so it has to be inert rather than merely styled.
    expect(pageButtons()[3]).toBeDisabled();
  });

  it("keeps the front window through the third page", async () => {
    api.list.mockResolvedValue({ data: manyTemplates });
    renderModal();
    await waitFor(() => expect(pageLabels()).toHaveLength(5));
    await goToPage("3");
    expect(pageLabels()).toEqual(["1", "2", "3", "...", "10"]);
    expect(rows()[0]).toBe("Template 21");
  });

  it("centres the window once the current page leaves the front", async () => {
    api.list.mockResolvedValue({ data: manyTemplates });
    renderModal();
    await waitFor(() => expect(pageLabels()).toHaveLength(5));
    await goToPage("3");
    fireEvent.click(nextButton());
    await waitFor(() => expect(activePage()).toBe("4"));
    expect(pageLabels()).toEqual(["1", "...", "4", "...", "10"]);
    expect(rows()[0]).toBe("Template 31");
  });

  it("collapses the pager to the back window on the last pages", async () => {
    api.list.mockResolvedValue({ data: manyTemplates });
    renderModal();
    await waitFor(() => expect(pageLabels()).toHaveLength(5));
    await goToPage("10");
    expect(pageLabels()).toEqual(["1", "...", "8", "9", "10"]);
    expect(rows()[0]).toBe("Template 91");
    expect(nextButton()).toBeDisabled();
    expect(prevButton()).not.toBeDisabled();
  });

  it("steps back a page from Previous", async () => {
    api.list.mockResolvedValue({ data: manyTemplates });
    renderModal();
    await waitFor(() => expect(pageLabels()).toHaveLength(5));
    await goToPage("10");
    fireEvent.click(prevButton());
    await waitFor(() => expect(activePage()).toBe("9"));
    expect(rows()[0]).toBe("Template 81");
  });

  it("leaves a short last page short", async () => {
    api.list.mockResolvedValue({ data: manyTemplates.slice(0, 73) });
    renderModal();
    await waitFor(() => expect(pageLabels()).toHaveLength(5));
    await goToPage("8");
    expect(rows()).toHaveLength(3);
  });
});
