import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import CustomTable from "../../Components/Table/CustomTable";
import { SkeletonTable } from "../../Components/LoadingSpinner";
import { showToast } from "../../Helper/ShowToast";
import useAuth from "../../hooks/useAuth";
import api from "../../api/SubcriptionApis";
import GeneratePaymentLinkModal from "../../Components/ReusableModal/GeneratePaymentLinkModal";
import "./BillingAndPayments.css";

const columns = [
  { key: "organization", header: "Organization" },
  { key: "dateAdded", header: "Date Added" },
  { key: "status", header: "Status", type: "subscription_status" },
];

const filters = [
  {
    key: "filter_type",
    options: [
      { value: "", label: "Filters" },
      { value: "dateAdded", label: "Date Added" },
      { value: "status", label: "Status" },
      { value: "clear_filters", label: "Clear Filters" },
    ],
  },
];

const SubscriberList = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();

  const [subscribers, setSubscribers] = useState([]);
  const [currentPlanLabel, setCurrentPlanLabel] = useState("Plan");
  const [loading, setLoading] = useState(true);
  const [isPaymentLinkModalOpen, setIsPaymentLinkModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  const formatDateStr = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (!planId || !accessToken) return;
    const fetchSubscribers = async () => {
      setLoading(true);
      try {
        const res = await api.GetSubscriptionByPlan({ planId, accessToken, refreshToken });
        const raw = res?.data || res || [];
        const list = Array.isArray(raw) ? raw : (raw.subscriptions || raw.data || []);
        if (raw.plan) setCurrentPlanLabel(raw.plan.name || "Plan");
        setSubscribers(
          list.map((sub) => ({
            id: sub.id,
            planId: sub.planId || sub.plan?.id,
            organization: sub.tenant?.companyName || sub.tenant?.name || "N/A",
            dateAdded: formatDateStr(sub.createdAt || sub.startDate),
            status:
              sub.status
                ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1).toLowerCase()
                : "Inactive",
            tenantId: sub.tenant?.id || sub.tenantId,
            pipelineItemId: sub.tenant?.pipelineItems?.[0]?.id || null,
            pipelineStageId: sub.tenant?.pipelineItems?.[0]?.pipelineStageId || null,
            hasCheckbox: false,
            hasActions: true,
          }))
        );
      } catch (err) {
        showToast(err.message || "Failed to load subscribers", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSubscribers();
  }, [planId, accessToken, refreshToken]);

  const tableActions = [
    {
      label: "View Tenant Details",
      onClick: (row) => {
        if (row.tenantId) {
          navigate(`/tenants/tenant-lists/overview/${row.tenantId}`);
        } else {
          showToast("Tenant ID not found for this subscriber", "error");
        }
      },
    },
    {
      label: "Change Plan",
      onClick: (row) => {
        if (row.tenantId) {
          setSelectedTenantId(row.tenantId);
          setIsPaymentLinkModalOpen(true);
        } else {
          showToast("Tenant ID not available for this subscriber", "error");
        }
      },
    },
  ];

  return (
    <div className="subscriber-list-container">
      <div className="nav-header">
        <button
          onClick={() => navigate("/billing-payments/plans-pricing")}
          className="back-button"
        >
          <FaArrowLeft />
          Back
        </button>
        <div className="subscriber-list-header">
          <h1>Subscriber List</h1>
          <p>
            Plans &amp; Pricing{" "}
            <span className="breadCrumb-active">/ {currentPlanLabel}</span>
          </p>
        </div>
        <button
          className="back-button"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          <FaArrowLeft />
          Back
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={columns.length} />
      ) : (
        <CustomTable
          data={subscribers}
          columns={columns}
          filters={filters}
          actions={tableActions}
          showCheckbox={false}
          showActions={true}
          tableName="Subscribers"
          itemsPerPage={10}
        />
      )}

      <GeneratePaymentLinkModal
        isOpen={isPaymentLinkModalOpen}
        onClose={() => setIsPaymentLinkModalOpen(false)}
        tenantId={selectedTenantId}
      />
    </div>
  );
};

export default SubscriberList;
