import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ApexCharts needs a real layout engine, so the probe stands in for it and
// keeps the options object — the tooltip formatter is only reachable there.
const chart = vi.hoisted(() => ({ props: null }));
vi.mock('react-apexcharts', () => ({
  default: (props) => {
    chart.props = props;
    return <div data-testid="chart" />;
  },
}));

import ResourceUtilizationChart from '../Components/ResourceUtilizationUsage/ResourceUtilizationUsage';

/**
 * The three-series resource chart.
 *
 * Each of CPU, memory and storage is looked up through an optional chain into
 * the period currently selected, so a map missing a metric, missing that
 * metric's period, or missing entirely all collapse to an empty series. The
 * chart itself is rendered only when at least one of the three has points —
 * which means an all-empty map leaves the period tabs standing with nothing
 * underneath them.
 */

const point = (y) => ({ x: 1735689600000, y });

const fullMap = {
  cpu: { year: [point(10)], month: [point(11)], week: [point(12)], day: [point(13)] },
  memory: { year: [point(20)], month: [], week: [], day: [] },
  storage: { year: [point(30)], month: [], week: [], day: [] },
};

const seriesData = () =>
  Object.fromEntries(chart.props.series.map((s) => [s.name, s.data]));

beforeEach(() => {
  chart.props = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the period tabs', () => {
  it('opens on the year with only that tab marked active', () => {
    render(<ResourceUtilizationChart periodDataMap={fullMap} />);
    expect(document.body.querySelectorAll('.period-tab')).toHaveLength(4);
    const active = document.body.querySelectorAll('.period-tab.active');
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe('Year');
  });

  it('swaps in the data for the period that was picked', () => {
    render(<ResourceUtilizationChart periodDataMap={fullMap} />);
    fireEvent.click(screen.getByText('Month'));
    expect(seriesData().CPU).toEqual([point(11)]);
    // Only CPU carries monthly points, so the other two go empty.
    expect(seriesData().Memory).toEqual([]);
    expect(document.body.querySelector('.period-tab.active').textContent).toBe('Month');
  });

  it('offers every configured period', () => {
    render(<ResourceUtilizationChart periodDataMap={fullMap} />);
    expect(
      [...document.body.querySelectorAll('.period-tab')].map((b) => b.textContent)
    ).toEqual(['Year', 'Month', 'Week', 'Day']);
  });
});

describe('assembling the series', () => {
  it('names the three metrics and fills each from the active period', () => {
    render(<ResourceUtilizationChart periodDataMap={fullMap} />);
    expect(chart.props.series.map((s) => s.name)).toEqual([
      'CPU',
      'Memory',
      'Storage',
    ]);
    expect(seriesData()).toEqual({
      CPU: [point(10)],
      Memory: [point(20)],
      Storage: [point(30)],
    });
  });

  it('empties a metric the map does not carry at all', () => {
    render(
      <ResourceUtilizationChart periodDataMap={{ cpu: { year: [point(10)] } }} />
    );
    expect(seriesData().Memory).toEqual([]);
    expect(seriesData().Storage).toEqual([]);
  });

  it('empties a metric that has no points for the chosen period', () => {
    render(<ResourceUtilizationChart periodDataMap={{ cpu: { month: [point(1)] } }} />);
    // The default period is the year, which this map does not describe.
    expect(screen.queryByTestId('chart')).toBeNull();
    fireEvent.click(screen.getByText('Month'));
    expect(seriesData().CPU).toEqual([point(1)]);
  });
});

describe('the empty state', () => {
  it('draws no chart when every series is empty', () => {
    render(
      <ResourceUtilizationChart
        periodDataMap={{ cpu: { year: [] }, memory: { year: [] }, storage: { year: [] } }}
      />
    );
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
  });

  it('draws no chart when no map was supplied at all', () => {
    render(<ResourceUtilizationChart />);
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(document.body.querySelectorAll('.period-tab')).toHaveLength(4);
  });

  it('draws the chart as soon as one metric has points', () => {
    render(<ResourceUtilizationChart periodDataMap={{ storage: { year: [point(1)] } }} />);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });
});

describe('the tooltip', () => {
  it('renders a value to two decimal places with a percent sign', () => {
    render(<ResourceUtilizationChart periodDataMap={fullMap} />);
    expect(chart.props.options.tooltip.y.formatter(12.345)).toBe('12.35%');
  });

  it('renders a gap in the series as N/A', () => {
    render(<ResourceUtilizationChart periodDataMap={fullMap} />);
    expect(chart.props.options.tooltip.y.formatter(null)).toBe('N/A%');
    expect(chart.props.options.tooltip.y.formatter(undefined)).toBe('N/A%');
  });

  it('still formats a genuine zero rather than calling it missing', () => {
    render(<ResourceUtilizationChart periodDataMap={fullMap} />);
    expect(chart.props.options.tooltip.y.formatter(0)).toBe('0.00%');
  });
});
