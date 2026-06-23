// src/pages/Dashboard/DashboardCards/SessionInformation.jsx
import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import Button from "../../../Components/Button/Button";
import "../Dashboard.css";
import useAuth from "../../../hooks/useAuth";
import { formatDate } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import api from "../../../api/DashboardApis"; // Adjust path if needed
import ErrorFallback from "../../../Components/ErrorFallback";

const SessionInformation = ({ hasData, sessionType = "completedSessions", sessionPeriod = "month" }) => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { dateFormat } = useFormatSettings();

  const [chartData, setChartData] = useState({
    series: [{ name: "Sessions", data: [] }],
    categories: [],
  });
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map UI values to API values
  const statusMap = {
    completedSessions: "completed",
    canceledSessions: "canceled",
    rescheduledSessions: "rescheduled",
  };

  const periodMap = {
    day: "day",
    month: "month",
    year: "year",
  };

  const currentStatus = statusMap[sessionType] || "completed";
  const currentPeriod = periodMap[sessionPeriod] || "month";

  // Generate full list of periods with zero-filling
  const generateFullPeriods = (data, period) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    let expectedPeriods = [];
    let formatLabel = (dateStr) => dateStr;

    if (period === "year") {
      // Last 12 months (e.g. "2024-12", "2025-01", ..., "2025-11")
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        expectedPeriods.push(`${year}-${month}`);
      }
      formatLabel = (p) => {
        const [y, m] = p.split("-");
        const date = new Date(y, m - 1);
        return date.toLocaleString("default", { month: "short" });
      };
    } else if (period === "month") {
      // All days in current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        expectedPeriods.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      }
      formatLabel = (p) => {
        const date = new Date(p);
        return date.getDate().toString();
      };
    } else if (period === "day") {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        expectedPeriods.push(`${y}-${m}-${day}`);
      }
      formatLabel = (p) => {
        return formatDate(p, dateFormat);
      };
    }

    // Create map from API data
    const dataMap = (data || []).reduce((acc, item) => {
      acc[item.period] = item.count;
      return acc;
    }, {});

    // Fill missing periods with 0
    const filledData = expectedPeriods.map((period) => ({
      period,
      count: dataMap[period] || 0,
    }));

    const labels = filledData.map((item) => formatLabel(item.period));
    const values = filledData.map((item) => item.count);

    const total = values.reduce((sum, v) => sum + v, 0);

    return { labels, values, total };
  };

  // Fetch data
  useEffect(() => {
    if (!tenantId || !hasData) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.GetTenantSessionMetrics({
          tenantId,
          status: currentStatus,
          period: currentPeriod,
          accessToken,
          refreshToken,
        });

        if (!isMounted) return;

        const apiData = response.data?.data || [];
        const { labels, values, total } = generateFullPeriods(apiData, currentPeriod);

        setChartData({
          series: [{ name: "Sessions", data: values }],
          categories: labels,
        });
        setTotalSessions(total);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load session data");
          setChartData({ series: [{ data: [] }], categories: [] });
          setTotalSessions(0);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
    // Token lifecycle is owned by the axios interceptor; depending on it here
    // causes an infinite refetch loop when a 401 triggers a token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, currentStatus, currentPeriod, hasData]);

  const chartOptions = {
    chart: {
      type: "area",
      height: 200,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      },
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" },
      },
    },
    yaxis: {
      labels: { show: false },
    },
    colors: ["#3B82F6"],
    tooltip: {
      x: { format: currentPeriod === "day" ? "dd MMM" : "MMM yyyy" },
      y: { formatter: (val) => `${val} session${val !== 1 ? "s" : ""}` },
    },
    noData: {
      text: loading ? "Loading..." : "No sessions found",
      align: "center",
      verticalAlign: "middle",
    },
  };

  if (!hasData) {
    return (
      <>
        <p className="text-muted text-lg mb-4 text-left">No data to show</p>
        <p className="text-muted text-left mb-16">
          You have not scheduled any sessions. Data from all your sessions will be shown here
        </p>
        <Button label="Schedule a session" variant="primary" className="mx-auto block" />
      </>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading sessions...</div>;
  }

  if (error) {
    return <ErrorFallback message="Something went wrong loading sessions. Please try again." onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <p className="text-lg font-semibold mb-4 text-gray-4B4E54">
        {totalSessions} Session{totalSessions !== 1 ? "s" : ""} {currentPeriod === "year" ? "this year" : currentPeriod === "month" ? "this month" : "last 30 days"}
      </p>

      <Chart
        options={chartOptions}
        series={chartData.series}
        type="area"
        height={200}
      />
    </>
  );
};

export default SessionInformation;