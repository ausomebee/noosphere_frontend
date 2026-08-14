import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import Pagination from "../../../Components/Table/Pagination";
import "../Dashboard.css";
import { Link } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { formatDate } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import api from "../../../api/DashboardApis";
import DashboardEmptyState from "./DashboardEmptyState";
import SectionLoader from "../../../Components/SectionLoader";

const Authorizations = ({
  hasData,
  selectedStatus,
  isModalOpen,
  setIsModalOpen,
}) => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { dateFormat } = useFormatSettings();

  const [authorizationData, setAuthorizationData] = useState([
    { label: "Expired", value: 0, color: "#3B82F6" },
    { label: "Expiring", value: 0, color: "#60A5FA" },
    { label: "Active", value: 0, color: "#93C5FD" },
  ]);

  const [authDetails, setAuthDetails] = useState([]);
  const [totalAuthorizations, setTotalAuthorizations] = useState(0);
  const [modalData, setModalData] = useState([]);
  // The modal shows every status in its own tab, so keep a list per status
  // plus the page each tab is on.
  const [modalLists, setModalLists] = useState({
    active: [],
    expiring: [],
    expired: [],
  });
  const [modalTab, setModalTab] = useState("Active");
  const [tabPages, setTabPages] = useState({
    Active: 1,
    Expiring: 1,
    Expired: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Fetch metrics on component mount
  useEffect(() => {
    if (tenantId && accessToken) {
      fetchAuthorizationMetrics();
    }
    // Token lifecycle is owned by the axios interceptor; depending on it here
    // causes an infinite refetch loop when a 401 triggers a token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Fetch authorizations when selectedStatus changes
  useEffect(() => {
    if (tenantId && accessToken && selectedStatus) {
      fetchAuthorizationsByStatus(selectedStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedStatus]);

  const fetchAuthorizationMetrics = async () => {
    try {
      setError(false);
      const response = await api.GetTenantClientAuthorizationMetrics({
        tenantId,
        accessToken,
        refreshToken,
      });

      if (response?.data?.data) {
        const { active, expiring, expired, total } = response.data.data;

        setAuthorizationData([
          { label: "Expired", value: Number(expired) || 0, color: "#3B82F6" },
          { label: "Expiring", value: Number(expiring) || 0, color: "#60A5FA" },
          { label: "Active", value: Number(active) || 0, color: "#93C5FD" },
        ]);

        setTotalAuthorizations(Number(total) || 0);
      }
    } catch (error) {
      console.error("Error fetching authorization metrics:", error);
      setError(true);
    }
  };

  const toAuthRow = (auth) => ({
    id: auth.id,
    name:
      [auth.tenantClient?.client?.firstName, auth.tenantClient?.client?.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown Client",
    details: `${auth.title} - ${auth.authorizationNumber}`,
    date: formatDate(auth.startDate, dateFormat),
    endDate: auth.endDate,
    payer: auth.payerDetails?.payerName || "N/A",
    insuranceType: auth.insurance?.name || "N/A",
  });

  const loadAuthorizations = async (status) => {
    const response = await api.GetAllTenantClientAuthorization({
      tenantId,
      status,
      accessToken,
      refreshToken,
    });
    return (response?.data?.data?.rows || []).map(toAuthRow);
  };

  const fetchAuthorizationsByStatus = async (status) => {
    try {
      setLoading(true);
      const formattedData = await loadAuthorizations(status);
      setAuthDetails(formattedData.slice(0, 3));
      setModalData(formattedData);
      setModalLists((prev) => ({ ...prev, [status]: formattedData }));
    } catch (error) {
      console.error("Error fetching authorizations:", error);
    } finally {
      setLoading(false);
    }
  };

  // The modal shows all three statuses, so load the ones we don't have yet.
  const fetchAllStatusesForModal = async () => {
    try {
      const statuses = ["active", "expiring", "expired"];
      const results = await Promise.all(
        statuses.map((s) => loadAuthorizations(s).catch(() => [])),
      );
      setModalLists({
        active: results[0],
        expiring: results[1],
        expired: results[2],
      });
    } catch (error) {
      console.error("Error fetching authorizations for modal:", error);
    }
  };

  const handleViewMore = () => {
    const label =
      selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);
    setModalTab(["Active", "Expiring", "Expired"].includes(label) ? label : "Active");
    setTabPages({ Active: 1, Expiring: 1, Expired: 1 });
    setIsModalOpen(true);
    fetchAllStatusesForModal();
  };

  const chartOptions = {
    chart: {
      id: "auth-chart",
      toolbar: { show: false },
    },
    labels: authorizationData.map((item) => item.label),
    plotOptions: { pie: { donut: { size: "50%" } } },
    colors: authorizationData.map((item) => item.color),
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "left",
      fontSize: "12px",
      itemMargin: { horizontal: 15, vertical: 5 },
      height: "auto",
      offsetY: 0,
    },
  };

  // Headline count follows the selected filter rather than always showing the
  // grand total.
  const filteredCount = (() => {
    const label =
      selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);
    const match = authorizationData.find((d) => d.label === label);
    return Number(match?.value ?? totalAuthorizations) || 0;
  })();

  const MODAL_PAGE_SIZE = 10;

  // One tab's list: paginated, with its own page state.
  const renderStatusList = (label, items) => {
    const page = tabPages[label] || 1;
    const totalPages = Math.max(1, Math.ceil(items.length / MODAL_PAGE_SIZE));
    const current = Math.min(page, totalPages);
    const pageItems = items.slice(
      (current - 1) * MODAL_PAGE_SIZE,
      current * MODAL_PAGE_SIZE,
    );

    if (!items.length) {
      return (
        <p className="text-center text-gray-500 py-8">
          No {label.toLowerCase()} authorizations found
        </p>
      );
    }

    return (
      <div className="auth-modal-content">
        <p className="text-sm text-gray-500 pb-2">
          {items.length} {label.toLowerCase()} authorization
          {items.length === 1 ? "" : "s"}
        </p>
        <div className="auth-list">
          {pageItems.map((item, index) => (
            <div
              key={item.id || index}
              className="auth-item flex items-center justify-between py-3 border-b "
            >
              <div className="flex-1">
                <p className="font-bold text-sm font-medium text-gray-600">
                  {item.name}
                </p>
              </div>
              <div className="flex-1">
                <p className="font-bold text-blue-primary">{item.details}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700">{item.date}</p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#003A9B"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ cursor: "pointer" }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={current}
            totalPages={totalPages}
            onPageChange={(next) =>
              setTabPages((prev) => ({ ...prev, [label]: next }))
            }
          />
        )}
      </div>
    );
  };

  const MODAL_TABS = [
    { label: "Active", key: "active" },
    { label: "Expiring", key: "expiring" },
    { label: "Expired", key: "expired" },
  ];

  return (
    <>
      {error ? (
        <DashboardEmptyState description="We couldn't load your authorizations. Please try again.">
          <Button
            label="Try again"
            variant="primary"
            className="mx-auto block px-6 py-2"
            onClick={fetchAuthorizationMetrics}
          />
        </DashboardEmptyState>
      ) : hasData ? (
        <div className="">
          <div className="auth-layout">
            <div className="chart-container">
              <Chart
                options={chartOptions}
                series={authorizationData.map((item) => Number(item.value) || 0)}
                type="donut"
                width="100%"
              />
            </div>
            <div className="auth-details">
              <p className="text-4xl font-semibold text-primary mb-2">
                {filteredCount}
              </p>
              {loading ? (
                <SectionLoader minHeight={80} />
              ) : (
                <>
                  {authDetails.map((item, index) => (
                    <p key={index} className="text-sm text-gray-700">
                      {item.name}{" "}
                      <span className="text-gray-500">{item.details}</span>{" "}
                      <span className="text-gray-700">{item.date}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="#003A9B"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        style={{ marginLeft: "8px" }}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </p>
                  ))}
                  {modalData.length > 3 && (
                    <Link
                      to="#"
                      className="text-blue-600 text-sm mt-2"
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewMore();
                      }}
                    >
                      +{modalData.length - 3} more
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-muted text-lg mb-4 text-left">No data to show</p>
          <p className="text-muted text-left mb-16">
            You have not scheduled any sessions. Data from all your sessions
            will be shown here
          </p>
          <Button
            label="Set up authorization"
            variant="primary"
            className="mx-auto block px-6 py-2"
          />
        </div>
      )}

      <ReusableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Authorizations"
        size="lg"
        secondaryButtonText="Close"
        onSecondaryButtonClick={() => setIsModalOpen(false)}
        activeTab={modalTab}
        onTabChange={setModalTab}
        tabs={MODAL_TABS.map(({ label, key }) => ({
          name: label,
          content: renderStatusList(label, modalLists[key] || []),
        }))}
      >
        {null}
      </ReusableModal>
    </>
  );
};

export default Authorizations;
