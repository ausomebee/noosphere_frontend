import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The tenant dashboard: a permission-filtered grid of draggable cards, each
 * with an optional count badge, an optional pair of react-select filters and an
 * optional "View more" control that either navigates or opens the card's own
 * modal.
 *
 * All five card bodies are probes -- they record the props the dashboard hands
 * down, which is how the filter selects and the count callback are asserted
 * without dragging five fetching cards into the suite. The selects themselves
 * are the real `SelectInput`, so they are driven the react-select way: open the
 * menu with ArrowDown, then click the option out of the portal react-select
 * mounts on `document.body`.
 *
 * Reordering is done with raw drag events carrying a hand-built `dataTransfer`,
 * since jsdom provides none.
 */

const probes = vi.hoisted(() => {
  const props = {};
  // A card stand-in: records the props it was given and, optionally, renders a
  // control that calls one of them back.
  const probe = (name, extra) => ({
    default: (received) => {
      props[name] = received;
      return <div data-testid={`${name}-card`}>{extra ? extra(received) : null}</div>;
    },
  });
  return { props, probe };
});
vi.mock("../Pages/Dashboard/DashboardCards/IntakePipeline", () => probes.probe("intake"));
vi.mock("../Pages/Dashboard/DashboardCards/SessionInformation", () => probes.probe("session"));
vi.mock("../Pages/Dashboard/DashboardCards/Authorizations", () => probes.probe("auth"));
vi.mock("../Pages/Dashboard/DashboardCards/ProductivityInformation", () =>
  probes.probe("productivity")
);
// The upcoming-appointments card owns the badge count, so its probe exposes a
// way to report one back the way the real card would.
vi.mock("../Pages/Dashboard/DashboardCards/UpcomingAppointments", () =>
  probes.probe("upcoming", (received) => (
    <button onClick={() => received.setCount(3)}>report three</button>
  ))
);

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import Dashboard from "../Pages/Dashboard/TenantDashboard";

const makeStore = (permissions) =>
  configureStore({
    reducer: { authentication: authReducer },
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
          // An empty accesses array is the org-owner case: everything granted.
          role: permissions
            ? { roleModuleAccesses: [{ module: "DASHBOARD", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderDashboard = (permissions) =>
  render(
    <Provider store={makeStore(permissions)}>
      <Dashboard />
    </Provider>
  );

const cardEls = () => Array.from(document.body.querySelectorAll(".dashboard-card"));
const cardTitles = () =>
  cardEls().map((el) => el.querySelector("h3 span").textContent);
const cardNamed = (title) =>
  cardEls().find((el) => el.querySelector("h3 span").textContent === title);

// jsdom gives drag events no dataTransfer, so each one is supplied by hand.
const transfer = (payload) => ({
  dataTransfer: { setData: vi.fn(), getData: () => payload },
});

// react-select: ArrowDown opens the menu, whose options live in a portal on
// document.body rather than inside the card.
const chooseOption = (comboBox, optionLabel) => {
  fireEvent.keyDown(comboBox, { key: "ArrowDown" });
  const option = Array.from(document.body.querySelectorAll(".rs__option")).find(
    (el) => el.textContent === optionLabel
  );
  fireEvent.click(option);
};

const combosIn = (title) => within(cardNamed(title)).queryAllByRole("combobox");

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(probes.props)) delete probes.props[key];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("permission gating", () => {
  it("shows every card to an org owner", () => {
    renderDashboard();
    expect(cardTitles()).toEqual([
      "Intake Pipeline",
      "Session Information",
      "Authorizations",
      "Productivity Information",
      "Upcoming Appointments",
    ]);
  });

  it("shows only the cards a restricted role may see", () => {
    renderDashboard(["dashboard", "view_session_information", "view_authorization_information"]);
    expect(cardTitles()).toEqual(["Session Information", "Authorizations"]);
  });

  it("refuses the page outright to a role with none of the dashboard permissions", () => {
    renderDashboard(["view_appointment"]);
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    expect(cardEls()).toHaveLength(0);
  });

  it("admits a role holding only the bare dashboard permission, with no cards", () => {
    renderDashboard(["dashboard"]);
    expect(screen.queryByText("You don't have permission to view this.")).not.toBeInTheDocument();
    expect(cardEls()).toHaveLength(0);
  });

  it("names the page", () => {
    renderDashboard();
    expect(document.title).toBe("Dashboard | Noosphere");
  });
});

describe("the card bodies", () => {
  it("gives every card its own component", () => {
    renderDashboard();
    for (const name of ["intake", "session", "auth", "productivity", "upcoming"]) {
      expect(screen.getByTestId(`${name}-card`)).toBeInTheDocument();
    }
  });

  it("starts the session card on completed sessions and no chosen period", () => {
    renderDashboard();
    expect(probes.props.session).toMatchObject({
      hasData: true,
      sessionType: "completedSessions",
      // The dashboard seeds this with a value that is not one of the options,
      // so the period select opens showing its placeholder.
      sessionPeriod: "period",
    });
  });

  it("starts the authorizations card on expired, with its modal shut", () => {
    renderDashboard();
    expect(probes.props.auth).toMatchObject({
      selectedStatus: "expired",
      isModalOpen: false,
    });
  });
});

describe("the count badge", () => {
  it("hides the badge while the card reports nothing", () => {
    renderDashboard();
    expect(within(cardNamed("Upcoming Appointments")).queryByText("3")).not.toBeInTheDocument();
  });

  it("shows the count the card reports", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "report three" }));
    expect(within(cardNamed("Upcoming Appointments")).getByText("3")).toBeInTheDocument();
  });

  it("gives no other card a badge", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "report three" }));
    expect(document.body.querySelectorAll(".dashboard-card-header-left .ml-2")).toHaveLength(1);
  });
});

describe("view more", () => {
  const viewMoreIn = (title) =>
    within(cardNamed(title)).queryByRole("button", { name: "View more" });

  it("navigates to the route the card names", () => {
    renderDashboard();
    fireEvent.click(viewMoreIn("Intake Pipeline"));
    expect(navigate).toHaveBeenCalledWith("/clients/pipeline");
  });

  it("opens the authorizations modal instead of navigating", () => {
    renderDashboard();
    fireEvent.click(viewMoreIn("Authorizations"));
    expect(probes.props.auth.isModalOpen).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("lets the authorizations card shut its own modal again", () => {
    renderDashboard();
    fireEvent.click(viewMoreIn("Authorizations"));
    act(() => probes.props.auth.setIsModalOpen(false));
    expect(probes.props.auth.isModalOpen).toBe(false);
  });

  it("withholds the control from the productivity card, which has nowhere to go", () => {
    renderDashboard();
    expect(viewMoreIn("Productivity Information")).not.toBeInTheDocument();
  });

  it("offers it on every other card", () => {
    renderDashboard();
    for (const title of [
      "Intake Pipeline",
      "Session Information",
      "Authorizations",
      "Upcoming Appointments",
    ]) {
      expect(viewMoreIn(title)).toBeInTheDocument();
    }
  });
});

describe("the card filters", () => {
  it("gives the session card two selects and the authorizations card one", () => {
    renderDashboard();
    expect(combosIn("Session Information")).toHaveLength(2);
    expect(combosIn("Authorizations")).toHaveLength(1);
  });

  it("gives the other cards no selects at all", () => {
    renderDashboard();
    expect(combosIn("Intake Pipeline")).toHaveLength(0);
    expect(combosIn("Productivity Information")).toHaveLength(0);
    expect(combosIn("Upcoming Appointments")).toHaveLength(0);
  });

  it("passes a newly chosen session type down to the card", () => {
    renderDashboard();
    chooseOption(combosIn("Session Information")[0], "Canceled Sessions");
    expect(probes.props.session.sessionType).toBe("canceledSessions");
  });

  it("passes a newly chosen session period down to the card", () => {
    renderDashboard();
    chooseOption(combosIn("Session Information")[1], "This Year");
    expect(probes.props.session.sessionPeriod).toBe("year");
  });

  it("passes a newly chosen authorization status down to the card", () => {
    renderDashboard();
    chooseOption(combosIn("Authorizations")[0], "Active Authorizations");
    expect(probes.props.auth.selectedStatus).toBe("active");
  });
});

describe("rearranging the grid", () => {
  it("marks a card as dragging and clears it again", () => {
    renderDashboard();
    const card = cardNamed("Intake Pipeline");
    fireEvent.dragStart(card, transfer("0"));
    expect(card).toHaveClass("dragging");
    fireEvent.dragEnd(card);
    expect(card).not.toHaveClass("dragging");
  });

  it("moves the dropped card to the position it was dropped on", () => {
    renderDashboard();
    fireEvent.dragStart(cardNamed("Intake Pipeline"), transfer("0"));
    fireEvent.drop(cardNamed("Authorizations"), transfer("0"));
    expect(cardTitles()).toEqual([
      "Session Information",
      "Authorizations",
      "Intake Pipeline",
      "Productivity Information",
      "Upcoming Appointments",
    ]);
  });

  it("leaves the order alone when a card is dropped on itself", () => {
    renderDashboard();
    const before = cardTitles();
    fireEvent.drop(cardNamed("Authorizations"), transfer("2"));
    expect(cardTitles()).toEqual(before);
  });

  it("allows the drop by cancelling the dragover default", () => {
    renderDashboard();
    const event = new Event("dragover", { bubbles: true, cancelable: true });
    fireEvent(cardNamed("Intake Pipeline"), event);
    expect(event.defaultPrevented).toBe(true);
  });
});
