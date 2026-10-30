import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// The five endpoints are the page's whole input surface; each is settled
// independently by `Promise.allSettled`, so every one gets its own spy.
const { api } = vi.hoisted(() => ({
  api: {
    GetGeneralMetrics: vi.fn(),
    GetGeneralTimeseries: vi.fn(),
    GetApiErrorRate: vi.fn(),
    GetResourceMetrics: vi.fn(),
    GetResourceTimeseries: vi.fn(),
  },
}));
vi.mock('../api/performanceApi', () => ({ default: api }));

// Every chart is an ApexCharts wrapper that jsdom cannot lay out, so each one
// becomes a probe that records the props the page handed it.
const { charts } = vi.hoisted(() => {
  const charts = { gauge: [], speed: [], bar: [], resource: [] };
  return { charts };
});

vi.mock('../Components/Guages/Gauge', () => ({
  default: (props) => {
    charts.gauge.push(props);
    return <div data-testid={`gauge-${props.label}`}>{String(props.value)}</div>;
  },
}));
vi.mock('../Components/SpeedChart/SpeedChart', () => ({
  default: (props) => {
    charts.speed.push(props);
    return <div data-testid={`speed-${props.title}`} />;
  },
}));
vi.mock('../Components/BarChart/StackedBarChart', () => ({
  default: (props) => {
    charts.bar.push(props);
    return <div data-testid="stacked-bar" />;
  },
}));
vi.mock('../Components/ResourceUtilizationUsage/ResourceUtilizationUsage', () => ({
  default: (props) => {
    charts.resource.push(props);
    return <div data-testid="resource-chart" />;
  },
}));
vi.mock('../Components/LoadingSpinner', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

import MainPerformance from '../Pages/Performance/MainPerformance';

/**
 * The general performance dashboard.
 *
 * It fires five independent requests through `Promise.allSettled` and folds
 * each result in on its own terms: a rejection, or a fulfilment whose payload
 * carries no `data`, simply leaves that slice of state on the zeroed defaults
 * the page was built with. That is why the interesting cases here are the ones
 * where a call fails while its neighbours succeed.
 *
 * `loading` gates six separate blocks of the page at once, so the skeleton
 * count is a reliable proxy for the loading arm as a whole. Because the effect
 * is declared above the permission guard it still runs for an admin who is
 * denied the page, which is worth knowing when reading the call counts.
 *
 * Note that the error-rate chart is handed `undefined` rather than an empty
 * array when the backend reports no buckets, so that the chart falls back to
 * its own demo series.
 */

const PERIODS = { year: [1], month: [2], week: [3], day: [4] };

const makeStore = (user) =>
  configureStore({
    reducer: {
      // useAuth reads the tokens off the slice itself, not off the user.
      authentication: (state = { user, accessToken: 'at', refreshToken: 'rt' }) => state,
    },
  });

// An admin with an explicit role grant; anything not listed is denied.
const restricted = (permissions) => ({
  id: 'u1',
  role: { roleModuleAccesses: [{ module: 'PERFORMANCE', permissions }] },
});

const renderPage = (user = restricted(['view_performance'])) =>
  render(
    <Provider store={makeStore(user)}>
      <MainPerformance />
    </Provider>
  );

// A settled dashboard: wait for the skeletons to be replaced by real charts.
const renderSettled = async (user) => {
  const result = renderPage(user);
  await waitFor(() => expect(screen.getByTestId('resource-chart')).toBeInTheDocument());
  return result;
};

const resolvesTo = (data) => Promise.resolve({ data });

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(charts).forEach((list) => { list.length = 0; });
  api.GetGeneralMetrics.mockResolvedValue({ data: null });
  api.GetGeneralTimeseries.mockResolvedValue({ data: null });
  api.GetApiErrorRate.mockResolvedValue({ data: null });
  api.GetResourceMetrics.mockResolvedValue({ data: null });
  api.GetResourceTimeseries.mockResolvedValue({ data: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the permission gate', () => {
  it('refuses an admin granted neither performance permission', async () => {
    renderPage(restricted(['view_invoice']));
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    expect(screen.queryByText('Monitor system-wide performance')).not.toBeInTheDocument();
    // The effect sits above the guard, so the requests still went out.
    await waitFor(() => expect(api.GetGeneralMetrics).toHaveBeenCalled());
  });

  it('admits an admin granted only the module-level permission', async () => {
    await renderSettled(restricted(['performance_monitoring']));
    expect(screen.getByText('Monitor system-wide performance')).toBeInTheDocument();
  });

  it('admits a super admin, who has no role at all', async () => {
    await renderSettled({ id: 'u1' });
    expect(screen.getByText('Monitor system-wide performance')).toBeInTheDocument();
  });
});

describe('while the dashboard is loading', () => {
  it('draws a skeleton in place of every chart', async () => {
    // A request that never settles holds `allSettled` open indefinitely.
    api.GetGeneralMetrics.mockReturnValue(new Promise(() => {}));
    renderPage();

    // Four gauges, four line charts, the stacked bar, three resource gauges
    // and the utilization chart.
    expect(screen.getAllByTestId('skeleton')).toHaveLength(13);
    expect(screen.queryByTestId('stacked-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resource-chart')).not.toBeInTheDocument();
  });

  it('replaces every skeleton once the last request settles', async () => {
    await renderSettled();
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    expect(screen.getByTestId('stacked-bar')).toBeInTheDocument();
    expect(screen.getByTestId('resource-chart')).toBeInTheDocument();
  });

  it('stops loading even when every request is rejected', async () => {
    Object.values(api).forEach((fn) => fn.mockRejectedValue(new Error('down')));
    await renderSettled();
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
  });

  it('asks each endpoint for the credentials on the auth slice', async () => {
    await renderSettled();
    Object.values(api).forEach((fn) =>
      expect(fn).toHaveBeenCalledWith({ accessToken: 'at', refreshToken: 'rt' })
    );
  });
});

describe('the general metric gauges', () => {
  it('shows the values the backend reported', async () => {
    api.GetGeneralMetrics.mockReturnValue(
      resolvesTo({
        systemSpeed: { value: 420, maxValue: 900 },
        latency: { value: 31, maxValue: 200 },
        uptime: { value: 99, maxValue: 100 },
        apiResponseTime: { value: 120, maxValue: 500 },
      })
    );
    await renderSettled();

    expect(screen.getByTestId('gauge-System Speed')).toHaveTextContent('420');
    expect(screen.getByTestId('gauge-Latency')).toHaveTextContent('31');
    expect(screen.getByTestId('gauge-Uptime')).toHaveTextContent('99');
    expect(screen.getByTestId('gauge-API Response Time')).toHaveTextContent('120');
  });

  it('keeps its zeroed defaults when the request is rejected', async () => {
    api.GetGeneralMetrics.mockRejectedValue(new Error('down'));
    await renderSettled();
    expect(screen.getByTestId('gauge-System Speed')).toHaveTextContent('0');
    // The other four calls still landed, so only this slice fell back.
    expect(api.GetGeneralTimeseries).toHaveBeenCalled();
  });

  it('keeps its zeroed defaults when the response carries no data', async () => {
    api.GetGeneralMetrics.mockResolvedValue({ meta: 'no data key here' });
    await renderSettled();
    expect(screen.getByTestId('gauge-Uptime')).toHaveTextContent('0');
  });

  it('draws uptime as a percentage and the rest as raw numbers', async () => {
    await renderSettled();
    const byLabel = Object.fromEntries(charts.gauge.map((p) => [p.label, p]));
    expect(byLabel.Uptime.isPercentage).toBe(true);
    expect(byLabel['System Speed'].isPercentage).toBe(false);
    expect(byLabel.Latency.isPercentage).toBe(false);
    expect(byLabel['API Response Time'].isPercentage).toBe(false);
  });
});

describe('the general timeseries charts', () => {
  it('hands each chart the period map for its own metric', async () => {
    api.GetGeneralTimeseries.mockReturnValue(
      resolvesTo({
        systemSpeed: { ...PERIODS, day: ['speed'] },
        latency: { ...PERIODS, day: ['latency'] },
        uptime: { ...PERIODS, day: ['uptime'] },
        apiResponseTime: { ...PERIODS, day: ['api'] },
      })
    );
    await renderSettled();

    const byTitle = Object.fromEntries(charts.speed.map((p) => [p.title, p]));
    expect(byTitle.Uptime.periodDataMap.day).toEqual(['uptime']);
    expect(byTitle.Latency.periodDataMap.day).toEqual(['latency']);
    expect(byTitle['System Speed'].periodDataMap.day).toEqual(['speed']);
    expect(byTitle['API Response Time'].periodDataMap.day).toEqual(['api']);
  });

  it('falls back to four empty period maps when the request is rejected', async () => {
    api.GetGeneralTimeseries.mockRejectedValue(new Error('down'));
    await renderSettled();
    expect(charts.speed).toHaveLength(4);
    charts.speed.forEach((p) =>
      expect(p.periodDataMap).toEqual({ year: [], month: [], week: [], day: [] })
    );
  });

  it('falls back the same way when the response carries no data', async () => {
    api.GetGeneralTimeseries.mockResolvedValue({});
    await renderSettled();
    expect(charts.speed[0].periodDataMap.year).toEqual([]);
  });
});

describe('the api error-rate chart', () => {
  it('passes the reported buckets straight through', async () => {
    api.GetApiErrorRate.mockReturnValue(
      resolvesTo({
        categories: ['Mon', 'Tue'],
        series: [{ name: '5xx', data: [1, 2] }],
      })
    );
    await renderSettled();
    expect(charts.bar[0].categories).toEqual(['Mon', 'Tue']);
    expect(charts.bar[0].series).toEqual([{ name: '5xx', data: [1, 2] }]);
  });

  it('withholds empty arrays so the chart uses its own defaults', async () => {
    api.GetApiErrorRate.mockReturnValue(resolvesTo({ categories: [], series: [] }));
    await renderSettled();
    expect(charts.bar[0].categories).toBeUndefined();
    expect(charts.bar[0].series).toBeUndefined();
  });

  it('withholds them just the same when the payload omits both keys', async () => {
    api.GetApiErrorRate.mockReturnValue(resolvesTo({ somethingElse: true }));
    await renderSettled();
    expect(charts.bar[0].categories).toBeUndefined();
    expect(charts.bar[0].series).toBeUndefined();
  });

  it('can report buckets with no series, and series with no buckets', async () => {
    api.GetApiErrorRate.mockReturnValue(resolvesTo({ categories: ['Mon'], series: [] }));
    await renderSettled();
    expect(charts.bar[0].categories).toEqual(['Mon']);
    expect(charts.bar[0].series).toBeUndefined();
  });

  it('keeps the empty chart when the request is rejected', async () => {
    api.GetApiErrorRate.mockRejectedValue(new Error('down'));
    await renderSettled();
    expect(charts.bar[0].categories).toBeUndefined();
  });
});

describe('the resource utilization section', () => {
  it('shows the reported cpu, memory and storage figures', async () => {
    api.GetResourceMetrics.mockReturnValue(
      resolvesTo({
        cpu: { value: 61, maxValue: 100 },
        memory: { value: 72, maxValue: 100 },
        storage: { value: 83, maxValue: 100 },
      })
    );
    await renderSettled();
    expect(screen.getByTestId('gauge-CPU Usage')).toHaveTextContent('61');
    expect(screen.getByTestId('gauge-Memory Usage')).toHaveTextContent('72');
    expect(screen.getByTestId('gauge-Storage Usage')).toHaveTextContent('83');
  });

  it('keeps its zeroed defaults when the metrics request is rejected', async () => {
    api.GetResourceMetrics.mockRejectedValue(new Error('down'));
    await renderSettled();
    expect(screen.getByTestId('gauge-CPU Usage')).toHaveTextContent('0');
  });

  it('keeps its zeroed defaults when the metrics response carries no data', async () => {
    api.GetResourceMetrics.mockResolvedValue(undefined);
    await renderSettled();
    expect(screen.getByTestId('gauge-Storage Usage')).toHaveTextContent('0');
  });

  it('draws all three resource gauges as percentages', async () => {
    await renderSettled();
    charts.gauge
      .filter((p) => p.label.endsWith('Usage'))
      .forEach((p) => expect(p.isPercentage).toBe(true));
  });

  it('hands the utilization chart the reported timeseries', async () => {
    api.GetResourceTimeseries.mockReturnValue(
      resolvesTo({
        cpu: { ...PERIODS, day: ['cpu'] },
        memory: PERIODS,
        storage: PERIODS,
      })
    );
    await renderSettled();
    expect(charts.resource[0].periodDataMap.cpu.day).toEqual(['cpu']);
  });

  it('falls back to three empty period maps when that request is rejected', async () => {
    api.GetResourceTimeseries.mockRejectedValue(new Error('down'));
    await renderSettled();
    expect(charts.resource[0].periodDataMap).toEqual({
      cpu: { year: [], month: [], week: [], day: [] },
      memory: { year: [], month: [], week: [], day: [] },
      storage: { year: [], month: [], week: [], day: [] },
    });
  });
});
