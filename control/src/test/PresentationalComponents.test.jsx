import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ApexCharts needs a real layout engine, so it is stood in — but the charts'
// own formatters and axis settings only run because Apex calls them, so the
// stand-in records what it was handed and calls the value formatter itself.
const { chart } = vi.hoisted(() => ({ chart: { renders: [] } }));
vi.mock('react-apexcharts', () => ({
  default: ({ options, series, type, height }) => {
    const formatter =
      options?.plotOptions?.radialBar?.dataLabels?.value?.formatter;
    chart.renders.push({
      options,
      series,
      type,
      height,
      formatted: formatter ? formatter(series?.[0]) : undefined,
    });
    return <div data-testid="chart" />;
  },
}));

const state = { authentication: { isAuthenticated: true, user: { id: 'u1' } } };
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import ErrorFallback from '../Components/ErrorFallback';
import ProtectedRoute from '../Components/ProtectedRoute';
import SectionLoader from '../Components/SectionLoader';
import ConnectionStatus from '../Components/ConnectionStatus/ConnectionStatus';
import Gauge from '../Components/Guages/Gauge';
import StackedBarChart from '../Components/BarChart/StackedBarChart';
import SystemSpeedChart from '../Components/SpeedChart/SpeedChart';
import ExportPrintActions from '../Components/ExportPrintActions/ExportPrintActions';

/**
 * The small presentational pieces the dashboards and tables share.
 *
 * Each one's branching is entirely in its defaults and its optional props, so
 * these tests render them both ways round rather than driving any flow. The two
 * charts are the exception: their axis windows and value formatters are real
 * logic that only runs when ApexCharts calls back, so the stand-in above calls
 * them and the tests read what came out.
 */

beforeEach(() => {
  vi.clearAllMocks();
  chart.renders.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the error fallback', () => {
  it('shows its own wording when the caller gives none', () => {
    render(<ErrorFallback />);
    expect(screen.getByText('Oops!')).toBeInTheDocument();
    expect(
      screen.getByText('Something went wrong. Please try again.')
    ).toBeInTheDocument();
  });

  it('shows the caller wording instead', () => {
    render(<ErrorFallback message="The billing service is unreachable." />);
    expect(
      screen.getByText('The billing service is unreachable.')
    ).toBeInTheDocument();
  });

  it('offers a retry only when the caller can handle one', () => {
    const { unmount } = render(<ErrorFallback />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    unmount();

    const onRetry = vi.fn();
    render(<ErrorFallback onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('the protected route', () => {
  const renderAt = (path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div>Sign in</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

  it('lets a signed-in admin through', () => {
    state.authentication.isAuthenticated = true;
    renderAt('/dashboard');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('sends anyone else back to the sign-in page', () => {
    state.authentication.isAuthenticated = false;
    renderAt('/dashboard');
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    state.authentication.isAuthenticated = true;
  });
});

describe('the section loader', () => {
  it('announces itself to a screen reader', () => {
    render(<SectionLoader />);
    const loader = document.body.querySelector('.section-loader');
    expect(loader).toHaveAttribute('role', 'status');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('leaves its height to the stylesheet by default', () => {
    render(<SectionLoader />);
    expect(document.body.querySelector('.section-loader').style.minHeight).toBe('');
  });

  it('honours a height the caller reserves for it', () => {
    render(<SectionLoader minHeight="240px" />);
    expect(document.body.querySelector('.section-loader').style.minHeight).toBe('240px');
  });
});

describe('the connection badge', () => {
  it.each([
    [true, 'is-online', /You're online/],
    [false, 'is-offline', /You're offline/],
  ])('reads %s to the user', (isConnected, className, wording) => {
    render(<ConnectionStatus isConnected={isConnected} />);
    const badge = document.body.querySelector('.conn-status');
    expect(badge.className).toContain(className);
    expect(badge.getAttribute('data-tip')).toMatch(wording);
    expect(screen.getByText(wording)).toBeInTheDocument();
  });

  it('is reachable by keyboard so the tooltip is not hover-only', () => {
    render(<ConnectionStatus isConnected />);
    expect(document.body.querySelector('.conn-status')).toHaveAttribute('tabindex', '0');
  });

  it('takes an extra class from its caller', () => {
    render(<ConnectionStatus isConnected className="in-sidebar" />);
    expect(document.body.querySelector('.conn-status').className).toContain('in-sidebar');
  });

  it('reads as offline when the caller says nothing', () => {
    render(<ConnectionStatus />);
    expect(document.body.querySelector('.conn-status').className).toContain('is-offline');
  });
});

describe('the gauge', () => {
  it('renders a percentage as a percentage', () => {
    render(<Gauge value={62} maxValue={100} label="CPU" color="#000" isPercentage />);
    expect(chart.renders[0].formatted).toBe('62%');
  });

  it('reads a percentage against its own maximum, not a hundred', () => {
    render(<Gauge value={40} maxValue={80} label="Disk" color="#000" isPercentage />);
    // 40 of 80 is half the gauge, and the percentage label shows the position.
    expect(chart.renders[0].formatted).toBe('50%');
  });

  it('scales a non-percentage back onto its own range, in milliseconds', () => {
    // The series carries the value as a 0-100 position, and the label undoes
    // that against maxValue — so the reading round-trips to what was passed in.
    render(<Gauge value={50} maxValue={400} label="Latency" color="#000" />);
    expect(chart.renders[0].series).toEqual(['12.50']);
    expect(chart.renders[0].formatted).toBe('50ms');
  });

  it('rounds a fractional reading', () => {
    render(<Gauge value={62.6} maxValue={100} label="CPU" color="#000" isPercentage />);
    expect(chart.renders[0].formatted).toBe('63%');
  });

  it('treats a gauge with no percentage flag as a duration', () => {
    render(<Gauge value={120} maxValue={200} label="Latency" color="#000" />);
    expect(chart.renders[0].formatted).toBe('120ms');
  });
});

describe('the stacked bar chart', () => {
  it('falls back to its own title, series and categories', () => {
    render(<StackedBarChart />);
    expect(screen.getByText('API Error Rate')).toBeInTheDocument();
    expect(chart.renders[0].series).toHaveLength(2);
    expect(chart.renders[0].options.xaxis.categories.length).toBeGreaterThan(0);
    expect(chart.renders[0].height).toBe(200);
  });

  it('uses everything the caller supplies instead', () => {
    render(
      <StackedBarChart
        title="Signup rate"
        series={[{ name: 'Signups', data: [1, 2] }]}
        categories={['Jan', 'Feb']}
        dropdownOptions={['Weekly']}
        height={320}
      />
    );
    expect(screen.getByText('Signup rate')).toBeInTheDocument();
    expect(chart.renders[0].series).toEqual([{ name: 'Signups', data: [1, 2] }]);
    expect(chart.renders[0].options.xaxis.categories).toEqual(['Jan', 'Feb']);
    expect(chart.renders[0].height).toBe(320);
  });
});

describe('the system speed chart', () => {
  const now = new Date();
  const inRange = (offsetHours = 0) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12 + offsetHours).getTime();

  const dataMap = {
    year: [{ x: inRange(), y: 120 }],
    month: [{ x: inRange(), y: 110 }],
    week: [{ x: inRange(), y: 100 }],
    day: [{ x: inRange(), y: 90 }],
  };

  const periodSelect = () => document.body.querySelector('select');

  it('opens on the year, showing that year\'s readings', () => {
    render(<SystemSpeedChart periodDataMap={dataMap} title="Speed" />);
    expect(chart.renders.at(-1).series[0].data).toEqual([{ x: inRange(), y: 120 }]);
  });

  it.each(['Month', 'Week', 'Day'])('narrows to the %s window', (period) => {
    render(<SystemSpeedChart periodDataMap={dataMap} title="Speed" />);
    fireEvent.change(periodSelect(), { target: { value: period } });

    const last = chart.renders.at(-1);
    expect(last.series[0].data).toHaveLength(1);
    expect(last.options.xaxis.min).toBeLessThanOrEqual(inRange());
    expect(last.options.xaxis.max).toBeGreaterThanOrEqual(inRange());
  });

  it('drops readings that fall outside the chosen window', () => {
    const outOfRange = { x: new Date(2000, 0, 1).getTime(), y: 500 };
    render(
      <SystemSpeedChart
        periodDataMap={{ ...dataMap, year: [...dataMap.year, outOfRange] }}
        title="Speed"
      />
    );
    expect(chart.renders.at(-1).series[0].data).toEqual([{ x: inRange(), y: 120 }]);
  });

  it('charts nothing for a period the caller supplied no data for', () => {
    render(<SystemSpeedChart periodDataMap={{}} title="Speed" />);
    expect(chart.renders.at(-1).series[0].data).toEqual([]);
  });
});

describe('the export and print actions', () => {
  const onExportCSV = vi.fn();
  const onExportPDF = vi.fn();
  const onPrint = vi.fn();

  const renderActions = () =>
    render(
      <ExportPrintActions
        onExportCSV={onExportCSV}
        onExportPDF={onExportPDF}
        onPrint={onPrint}
      />
    );

  const exportButton = () => document.body.querySelector('.action-menu button');

  it('opens and closes its menu on the same button', () => {
    renderActions();
    fireEvent.click(exportButton());
    expect(screen.getByText(/CSV/i)).toBeInTheDocument();

    fireEvent.click(exportButton());
    expect(screen.queryByText(/CSV/i)).not.toBeInTheDocument();
  });

  it('exports as CSV', () => {
    renderActions();
    fireEvent.click(exportButton());
    fireEvent.click(screen.getByText(/CSV/i));
    expect(onExportCSV).toHaveBeenCalled();
  });

  it('exports as PDF', () => {
    renderActions();
    fireEvent.click(exportButton());
    fireEvent.click(screen.getByText(/PDF/i));
    expect(onExportPDF).toHaveBeenCalled();
  });

  it('closes when a click lands outside it', async () => {
    renderActions();
    fireEvent.click(exportButton());
    expect(screen.getByText(/CSV/i)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText(/CSV/i)).toBeNull());
  });

  it('stays open while a click lands inside it', () => {
    renderActions();
    fireEvent.click(exportButton());
    fireEvent.mouseDown(screen.getByText(/CSV/i));
    expect(screen.getByText(/CSV/i)).toBeInTheDocument();
  });
});
