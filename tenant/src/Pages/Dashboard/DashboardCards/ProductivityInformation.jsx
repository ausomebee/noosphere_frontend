import React, { useEffect, useState } from "react";
import LoadingSpinner from "../../../Components/LoadingSpinner";
import Chart from "react-apexcharts";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import useAuth from "../../../hooks/useAuth";
import api from "../../../api/DashboardApis";
import DashboardEmptyState from "./DashboardEmptyState";

const ProductivityInformation = ({ hasData }) => {
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [productivityRate, setProductivityRate] = useState(null);
  const [averageSatisfaction, setAverageSatisfaction] = useState(null);
  const [availability, setAvailability] = useState({
    totalStaff: null,
    availableStaff: null,
  });
  const [averageCaseload, setAverageCaseload] = useState(null);

  useEffect(() => {
    if (!tenantId || !accessToken) return;

    setLoading(true);
    setError(false);

    const fetchProductivity = async () => {
      try {
        const res = await api.GetTenantSessionOverviewMetrics({
          tenantId,
          accessToken,
          refreshToken,
        });

        const data = res?.data?.data;

        setProductivityRate(Number(data?.sessionSatisfactionPercentage) || 0);
        setAverageSatisfaction(
          Number(data?.averageSessionSatisfactionScore) || 0,
        );
      } catch (err) {
        console.error("Productivity fetch failed", err);
        throw err;
      }
    };

    const fetchAvailability = async () => {
      try {
        const res = await api.GetTenantAvailabilityCount({
          tenantId,
          accessToken,
          refreshToken,
        });

        const data = res?.data?.data;

        setAvailability({
          totalStaff: Number(data?.totalStaff) || 0,
          availableStaff: Number(data?.availableStaff) || 0,
        });
      } catch (err) {
        console.error("Availability fetch failed", err);
        throw err;
      }
    };

    const fetchCaseload = async () => {
      try {
        const res = await api.GetTenantCaseloadCount({
          tenantId,
          accessToken,
          refreshToken,
        });

        setAverageCaseload(Number(res?.data?.data?.average) || 0);
      } catch (err) {
        console.error("Caseload fetch failed", err);
        throw err;
      }
    };

    Promise.allSettled([
      fetchProductivity(),
      fetchAvailability(),
      fetchCaseload(),
    ]).then((results) => {
      // Only surface an error state if every metric failed (fully blank card);
      // partial failures still render with "--" placeholders.
      if (results.every((r) => r.status === "rejected")) {
        setError(true);
      }
      setLoading(false);
    });
    // Token lifecycle is owned by the axios interceptor; depending on it here
    // causes an infinite refetch loop when a 401 triggers a token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  if (!hasData) {
    return (
      <>
        <p className="text-muted text-lg mb-4 text-left">No data to show</p>
        <p className="text-muted text-left mb-16">
          You have not scheduled any sessions. Data from all your sessions will
          be shown here
        </p>
      </>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <DashboardEmptyState description="We couldn't load your productivity data. Please refresh to try again." />
    );
  }

  const availabilityText =
    availability.totalStaff !== null
      ? `${Number(availability.availableStaff) || 0}/${Number(availability.totalStaff) || 0}`
      : "--";

  const productivityChartData = {
    series: [Number(productivityRate) || 0],
    options: {
      chart: {
        id: "prod-chart",
        toolbar: { show: false },
      },
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          dataLabels: {
            name: {
              show: true,
              fontSize: "14px",
              fontWeight: 400,
              color: "#4B4E54",
              offsetY: -10,
              formatter: () => "Therapist Productivity",
            },
            value: {
              show: true,
              fontSize: "36px",
              fontWeight: 600,
              color: "#4B4E54",
              offsetY: 15,
              formatter: (val) => `${val}%`,
            },
          },
        },
      },
      colors: ["#004ABA"],
    },
  };

  return (
    <div className="productivity-grid">
      {/* LEFT */}
      <div className="flex flex-col gap-4">
        {/* Availability */}
        <div className="dashboard-card rounded-lg px-24 py-10">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">Therapist Availability</p>
          </div>
          <div className="flex justify-between items-center mb-4 mt-20">
            <p className="text-4xl font-semibold text-blue-600">
              {availabilityText}
            </p>
          </div>
        </div>

        {/* Caseload */}
        <div className="dashboard-card rounded-lg px-24 py-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-600">Client Caseload Overview</p>
              <p className="text-sm text-gray-600">
                Average client per therapist
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4 mt-20">
            <p className="text-4xl font-semibold text-blue-600">
              {averageCaseload ?? "--"}
            </p>
          </div>
        </div>

        {/* Satisfaction */}
        <div className="dashboard-card rounded-lg px-24 py-10">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              Average Session Satisfaction Scores
            </p>
          </div>
          <div className="flex justify-between items-center mb-4 mt-20">
            <p className="text-4xl font-semibold text-blue-600">
              {averageSatisfaction !== null ? `${averageSatisfaction}/5` : "--"}
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col h-full">
        <p className="text-sm text-gray-333 font-bold">
          Average Productivity Rate
        </p>
        <p className="text-lg text-gray-600">
          Percentage of scheduled sessions vs that are completed
        </p>

        <div className="relative flex items-center justify-center mt-4">
          <Chart
            options={productivityChartData.options}
            series={productivityChartData.series}
            type="radialBar"
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductivityInformation;
