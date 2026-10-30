import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The dashboard's intake pipeline card: one fetch on mount, then a row of at
 * most six stages sorted by their `order`, or one of three fallback states.
 *
 * The `hasData` prop short-circuits the fetch entirely, so the card has two
 * separate routes into its empty state — never asked, and asked but given no
 * stages — and both land on the same "Set up intake pipeline" call to action.
 * The transform is where the rest of the branches live: it coerces a missing or
 * unparseable `order` to zero before sorting, names an unnamed stage, and reads
 * the candidate count out of a nested `_count` that may not be there.
 *
 * The card logs the failure it catches, so console.error is silenced per test
 * rather than left to clutter the run.
 */

const api = vi.hoisted(() => ({ intake: vi.fn() }));
vi.mock("../api/DashboardApis", () => ({
  default: { GetDashboardIntakeByTenantId: api.intake },
}));

import IntakePipeline from "../Pages/Dashboard/DashboardCards/IntakePipeline";

const store = configureStore({
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
      },
    },
  },
});

const renderCard = (props = {}) =>
  render(
    <Provider store={store}>
      <IntakePipeline hasData {...props} />
    </Provider>
  );

// The endpoint's payload is nested three deep, so the fixtures build it from
// the stage list rather than repeating the wrapper in every test.
const stagesResponse = (pipelineStages) => ({ data: { data: { pipelineStages } } });

const stageNames = () => [...document.querySelectorAll(".stage-name")].map((n) => n.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the fetch", () => {
  it("shows a loading line until the stages land", () => {
    api.intake.mockReturnValue(new Promise(() => {}));
    renderCard();
    expect(screen.getByText("Loading pipeline...")).toBeInTheDocument();
  });

  it("asks the endpoint for the signed-in tenant", async () => {
    api.intake.mockResolvedValue(stagesResponse([]));
    renderCard();
    await waitFor(() => expect(api.intake).toHaveBeenCalledTimes(1));
    expect(api.intake).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("never asks at all when the dashboard says there is nothing to show", async () => {
    renderCard({ hasData: false });
    await screen.findByText(/have not set up your intake pipeline/);
    expect(api.intake).not.toHaveBeenCalled();
  });
});

describe("the stages it draws", () => {
  it("lists each stage with its candidate count", async () => {
    api.intake.mockResolvedValue(
      stagesResponse([
        { name: "Enquiry", order: 1, _count: { pipelineItem: 4 } },
        { name: "Assessment", order: 2, _count: { pipelineItem: 2 } },
      ])
    );
    renderCard();
    expect(await screen.findByText("Enquiry")).toBeInTheDocument();
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getAllByText("Candidates")).toHaveLength(2);
  });

  it("puts a lone candidate in the singular", async () => {
    api.intake.mockResolvedValue(
      stagesResponse([{ name: "Enquiry", order: 1, _count: { pipelineItem: 1 } }])
    );
    renderCard();
    expect(await screen.findByText("Candidate")).toBeInTheDocument();
    expect(screen.queryByText("Candidates")).not.toBeInTheDocument();
  });

  it("orders the stages by their order field", async () => {
    api.intake.mockResolvedValue(
      stagesResponse([
        { name: "Third", order: 3, _count: { pipelineItem: 0 } },
        { name: "First", order: 1, _count: { pipelineItem: 0 } },
        { name: "Second", order: 2, _count: { pipelineItem: 0 } },
      ])
    );
    renderCard();
    await screen.findByText("First");
    expect(stageNames()).toEqual(["First", "Second", "Third"]);
  });

  it("sorts a stage with no usable order to the front", async () => {
    // `Number(order) || 0` turns both a missing and an unparseable order into
    // zero, so either sinks below a stage that carries a real one.
    api.intake.mockResolvedValue(
      stagesResponse([
        { name: "Numbered", order: 2, _count: { pipelineItem: 0 } },
        { name: "Unordered", _count: { pipelineItem: 0 } },
        { name: "Nonsense", order: "later", _count: { pipelineItem: 0 } },
      ])
    );
    renderCard();
    await screen.findByText("Numbered");
    expect(stageNames().at(-1)).toBe("Numbered");
    expect(stageNames()).toHaveLength(3);
  });

  it("keeps only the first six stages", async () => {
    api.intake.mockResolvedValue(
      stagesResponse(
        Array.from({ length: 8 }, (_, i) => ({
          name: `Stage ${i + 1}`,
          order: i + 1,
          _count: { pipelineItem: i },
        }))
      )
    );
    renderCard();
    await screen.findByText("Stage 1");
    expect(stageNames()).toEqual([
      "Stage 1",
      "Stage 2",
      "Stage 3",
      "Stage 4",
      "Stage 5",
      "Stage 6",
    ]);
  });

  it("names a stage that arrives without one", async () => {
    api.intake.mockResolvedValue(stagesResponse([{ order: 1, _count: { pipelineItem: 3 } }]));
    renderCard();
    expect(await screen.findByText("Unnamed Stage")).toBeInTheDocument();
  });

  it("counts a stage with no count block as empty", async () => {
    api.intake.mockResolvedValue(
      stagesResponse([
        { name: "No block", order: 1 },
        { name: "Unparseable", order: 2, _count: { pipelineItem: "many" } },
      ])
    );
    renderCard();
    await screen.findByText("No block");
    expect([...document.querySelectorAll(".stage-count")].map((n) => n.textContent)).toEqual([
      "0 Candidates",
      "0 Candidates",
    ]);
  });
});

describe("the empty state", () => {
  it("offers the setup call to action when the tenant has no stages", async () => {
    api.intake.mockResolvedValue(stagesResponse([]));
    renderCard();
    expect(await screen.findByText(/have not set up your intake pipeline/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set up intake pipeline" })).toBeInTheDocument();
  });

  it("treats a response with no pipeline stages key as no stages", async () => {
    api.intake.mockResolvedValue({ data: { data: {} } });
    expect(await renderAndFindEmpty()).toBeInTheDocument();
  });

  it("treats a response with no body at all as no stages", async () => {
    api.intake.mockResolvedValue(undefined);
    expect(await renderAndFindEmpty()).toBeInTheDocument();
  });

  it("treats a null payload as no stages", async () => {
    api.intake.mockResolvedValue({ data: null });
    expect(await renderAndFindEmpty()).toBeInTheDocument();
  });

  const renderAndFindEmpty = async () => {
    renderCard();
    return screen.findByText(/have not set up your intake pipeline/);
  };
});

describe("the error state", () => {
  it("explains the failure and offers a retry", async () => {
    api.intake.mockRejectedValue(new Error("boom"));
    renderCard();
    expect(await screen.findByText(/couldn't load your intake pipeline/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it("draws the stages once the retry succeeds", async () => {
    api.intake.mockRejectedValueOnce(new Error("boom"));
    renderCard();
    const retry = await screen.findByRole("button", { name: "Try again" });
    api.intake.mockResolvedValue(
      stagesResponse([{ name: "Enquiry", order: 1, _count: { pipelineItem: 5 } }])
    );
    fireEvent.click(retry);
    expect(await screen.findByText("Enquiry")).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load/)).not.toBeInTheDocument();
  });

  it("falls back to the empty state when the retry succeeds with nothing", async () => {
    api.intake.mockRejectedValueOnce(new Error("boom"));
    renderCard();
    const retry = await screen.findByRole("button", { name: "Try again" });
    api.intake.mockResolvedValue(stagesResponse([]));
    fireEvent.click(retry);
    expect(await screen.findByText(/have not set up your intake pipeline/)).toBeInTheDocument();
  });
});
