import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import "../Dashboard.css";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../../api/DashboardApis";

const Authorizations = ({
  hasData,
  selectedStatus,
  isModalOpen,
  setIsModalOpen,
}) => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const accessToken = useSelector((s) => s.authentication?.user?.token);
  const refreshToken = accessToken;

  const [authorizationData, setAuthorizationData] = useState([
    { label: "Expired", value: 0, color: "#3B82F6" },
    { label: "Expiring", value: 0, color: "#60A5FA" },
    { label: "Active", value: 0, color: "#93C5FD" },
  ]);

  const [authDetails, setAuthDetails] = useState([]);
  const [totalAuthorizations, setTotalAuthorizations] = useState(0);
  const [modalData, setModalData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch metrics on component mount
  useEffect(() => {
    if (tenantId && accessToken) {
      fetchAuthorizationMetrics();
    }
  }, [tenantId, accessToken]);

  // Fetch authorizations when selectedStatus changes
  useEffect(() => {
    if (tenantId && accessToken && selectedStatus) {
      fetchAuthorizationsByStatus(selectedStatus);
    }
  }, [tenantId, accessToken, selectedStatus]);

  const fetchAuthorizationMetrics = async () => {
    try {
      const response = await api.GetTenantClientAuthorizationMetrics({
        tenantId,
        accessToken,
        refreshToken,
      });

      if (response?.data?.data) {
        const { active, expiring, expired, total } = response.data.data;

        setAuthorizationData([
          { label: "Expired", value: expired, color: "#3B82F6" },
          { label: "Expiring", value: expiring, color: "#60A5FA" },
          { label: "Active", value: active, color: "#93C5FD" },
        ]);

        setTotalAuthorizations(total);
      }
    } catch (error) {
      console.error("Error fetching authorization metrics:", error);
    }
  };

  const fetchAuthorizationsByStatus = async (status) => {
    try {
      setLoading(true);
      const response = await api.GetAllTenantClientAuthorization({
        tenantId,
        status,
        accessToken,
        refreshToken,
      });

      if (response?.data?.data?.rows) {
        const formattedData = response.data.data.rows.map((auth) => ({
          id: auth.id,
          name:
            `${auth.tenantClient?.client?.firstName} ${auth.tenantClient?.client?.lastName}` ||
            "Unknown Client",
          details: `${auth.title} - ${auth.authorizationNumber}`,
          date: new Date(auth.startDate).toLocaleDateString(),
          endDate: auth.endDate,
          payer: auth.payerDetails?.payerName || "N/A",
          insuranceType: auth.insurance?.name || "N/A",
        }));

        setAuthDetails(formattedData.slice(0, 3));
        setModalData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching authorizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMore = () => {
    setIsModalOpen(true);
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

  const renderModalContent = () => (
    <div className="auth-modal-content">
      {modalData.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No authorizations found
        </p>
      ) : (
        <div className="auth-list">
          {modalData.map((item, index) => (
            <div
              key={item.id || index}
              className="auth-item flex items-center justify-between py-3 border-b "
            >
              <div className="flex-1">
                <p className="font-bold text-sm font-medium text-gray-600">{item.name}</p>
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
      )}
    </div>
  );

  return (
    <>
      {hasData ? (
        <div className="">
          <div className="flex items-center gap-4 mx-auto w-100p">
            <div className="chart-container">
              <Chart
                options={chartOptions}
                series={authorizationData.map((item) => item.value)}
                type="donut"
                width={300}
              />
            </div>
            <div className="auth-details">
              <p className="text-4xl font-semibold text-primary mb-2">
                {totalAuthorizations}
              </p>
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
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
        subTitle={`${
          selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)
        } Authorizations`}
        size="lg"
        secondaryButtonText="Close"
        onSecondaryButtonClick={() => setIsModalOpen(false)}
      >
        {renderModalContent()}
      </ReusableModal>
    </>
  );
};

export default Authorizations;
