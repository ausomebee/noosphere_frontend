import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./TenantList.css";
import CustomTable from "../../../Components/Table/CustomTable";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { SelectInput, TextareaInput, PasswordInput } from "../../../Components/Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";
import tenantApi from "../../../api/TenantApis";
import { SectionSpinner } from "../../../Components/LoadingSpinner";

const deactivationReasons = [
  { value: "", label: "Select an option" },
  { value: "Violation of Terms of Service", label: "Violation of Terms of Service" },
  { value: "Security Risks", label: "Security Risks" },
  { value: "Fraudulent Activity", label: "Fraudulent Activity" },
  { value: "Non-Payment or Billing Failure", label: "Non-Payment or Billing Failure" },
  { value: "Regulatory or Legal Requirement", label: "Regulatory or Legal Requirement" },
  { value: "User-Initiated Request", label: "User-Initiated Request" },
  { value: "Inappropriate or Abusive Behavior", label: "Inappropriate or Abusive Behavior" },
  { value: "Platform Misuse or Abuse", label: "Platform Misuse or Abuse" },
  { value: "Data Privacy Violations", label: "Data Privacy Violations" },
  { value: "Repeated Policy Violations Despite Warnings", label: "Repeated Policy Violations Despite Warnings" },
];

const TenantList = () => {
  const navigate = useNavigate();
  const { userId, accessToken, refreshToken } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [overview, setOverview] = useState({ totalTenants: 0, totalStaffs: 0, totalClients: 0 });
  const [loading, setLoading] = useState(true);

  // Deactivation modal state
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [deactivateTenant, setDeactivateTenant] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateDetails, setDeactivateDetails] = useState("");
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantsRes, overviewRes] = await Promise.allSettled([
        tenantApi.GetActiveTenants({ accessToken, refreshToken }),
        tenantApi.GetManagementOverview({ accessToken, refreshToken }),
      ]);
      if (tenantsRes.status === "fulfilled") {
        setTenants(tenantsRes.value.data || []);
      } else {
        showToast(tenantsRes.reason?.message || "Failed to load tenants", "error");
      }
      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value.data || { totalTenants: 0, totalStaffs: 0, totalClients: 0 });
      } else {
        if (import.meta.env.DEV) console.warn("Overview unavailable:", overviewRes.reason?.message);
      }
    } catch (err) {
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overviewStats = useMemo(
    () => [
      { label: "Total Tenants", value: overview.totalTenants?.toLocaleString() || "0" },
      { label: "Total No of Tenant Clients", value: overview.totalClients?.toLocaleString() || "0" },
      { label: "Total No of Tenant Staff", value: overview.totalStaffs?.toLocaleString() || "0" },
    ],
    [overview]
  );

  const tableData = useMemo(
    () =>
      tenants.map((t) => {
        const officerName = t.accountOfficer
          ? `${t.accountOfficer.firstName || ""} ${t.accountOfficer.lastName || ""}`.trim()
          : "—";
        const plan = t.BillingPlan?.[0]?.name || "—";
        const subStatus = t.Subscription?.[0]?.status || "—";

        return {
          tenantId: t.id,
          name: t.companyName || t.contactPerson || t.email,
          date_created: t.createdAt
            ? new Date(t.createdAt).toLocaleDateString("en-US")
            : "—",
          plan,
          status: t.active ? "Active" : "Inactive",
          subscription_status: subStatus,
          account_officer: officerName,
          hasCheckbox: true,
          hasActions: true,
          _raw: t,
        };
      }),
    [tenants]
  );

  const columns = [
    { key: "name", header: "NAME" },
    { key: "date_created", header: "Date Created" },
    { key: "plan", header: "Plan", type: "plan" },
    { key: "status", header: "Account Status", type: "status" },
    { key: "subscription_status", header: "Subscription Status", type: "subscription_status" },
    { key: "account_officer", header: "Account Officer" },
  ];

  const filters = [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_created", label: "Date Created" },
        { value: "plan", label: "Plan" },
        { value: "status", label: "Account Status" },
        { value: "account_officer", label: "Account Officer" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];

  const actions = [
    {
      label: "View Tenant",
      onClick: (row) => {
        navigate(`/tenants/tenant-lists/overview/${row.tenantId}`);
      },
    },
    {
      label: "Deactivate Tenant",
      className: "remove",
      onClick: (row) => {
        setDeactivateTenant(row._raw);
        setDeactivateStep(1);
        setDeactivateReason("");
        setDeactivateDetails("");
        setDeactivatePassword("");
        setDeactivateModal(true);
      },
    },
  ];

  const [filterValues, setFilterValues] = useState({});
  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  // --- Deactivation modal logic ---
  const handleCloseDeactivate = () => {
    setDeactivateModal(false);
    setDeactivateTenant(null);
    setDeactivateStep(1);
    setDeactivateReason("");
    setDeactivateDetails("");
    setDeactivatePassword("");
  };

  const handleDeactivateNext = async () => {
    if (deactivateStep === 1) {
      if (!deactivateReason) {
        showToast("Please select a deactivation reason", "error");
        return;
      }
      setDeactivateStep(2);
    } else if (deactivateStep === 2) {
      setDeactivateStep(3);
    } else if (deactivateStep === 3) {
      if (!deactivatePassword) {
        showToast("Please enter your password", "error");
        return;
      }
      try {
        setIsDeactivating(true);
        await tenantApi.DeactivateTenant({
          id: deactivateTenant.id,
          active: false,
          deactivatedById: userId,
          password: deactivatePassword,
          reason: deactivateReason,
          details: deactivateDetails,
          accessToken,
          refreshToken,
        });
        showToast("Tenant deactivated successfully", "success");
        handleCloseDeactivate();
        fetchData();
      } catch (err) {
        showToast(err.message || "Failed to deactivate tenant", "error");
      } finally {
        setIsDeactivating(false);
      }
    }
  };

  const getModalTitle = () => {
    if (deactivateStep === 1) return "Deactivate tenant account";
    if (deactivateStep === 2) return "Are you sure?";
    return "Enter password";
  };

  const getPrimaryButtonText = () => {
    if (deactivateStep === 1) return "Deactivate account";
    if (deactivateStep === 2) return "I am sure";
    return "Deactivate account";
  };

  const renderDeactivateBody = () => {
    if (deactivateStep === 1) {
      return (
        <div>
          <SelectInput
            label="Deactivation reason"
            options={deactivationReasons}
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
          />
          <TextareaInput
            label="Provide details"
            placeholder="Type something..."
            value={deactivateDetails}
            onChange={(e) => setDeactivateDetails(e.target.value)}
          />
        </div>
      );
    }
    if (deactivateStep === 2) {
      return (
        <div className="deactivate-confirmation">
          <p>
            Deactivating this tenant will <strong>permanently revoke</strong> their
            access to the NooSphere platform. To regain access in the future, the
            tenant will need to create a new account.
          </p>
          <p className="deactivate-warning">This action cannot be undone.</p>
        </div>
      );
    }
    return (
      <div>
        <p className="deactivate-password-prompt">
          Please provide your account password to continue
        </p>
        <PasswordInput
          label=""
          placeholder="Enter password"
          value={deactivatePassword}
          onChange={(e) => setDeactivatePassword(e.target.value)}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="tenant-page-container">
        <SectionSpinner />
      </div>
    );
  }

  return (
    <div className="tenant-page-container">
      <div className="tenant-page-header">
        <h1 className="tenant-page-title">Tenants</h1>
        <p className="tenant-page-subtitle">
          Manage NooSphere tenants seamlessly
        </p>
      </div>

      <h3 className="tenant-section-label">Overview</h3>
      <div className="overview-card-wrapper">
        {overviewStats.map((stat, idx) => (
          <div className="overview-card" key={idx}>
            <label>{stat.label}</label>
            <p>{stat.value}</p>
          </div>
        ))}
      </div>

      <h3 className="tenant-section-label">All Tenants</h3>
      <CustomTable
        columns={columns}
        data={tableData}
        actions={actions}
        filters={filters}
        onFilterChange={handleFilterChange}
        itemsPerPage={10}
        tableName="Tenant List"
        hasStatusDot={true}
      />

      {/* Deactivation Modal — multi-step */}
      <ReusableModal
        isOpen={deactivateModal}
        onClose={handleCloseDeactivate}
        title={getModalTitle()}
        primaryButtonText={getPrimaryButtonText()}
        secondaryButtonText="Cancel"
        primaryButtonColor="#dc2626"
        onPrimaryButtonClick={handleDeactivateNext}
        onSecondaryButtonClick={handleCloseDeactivate}
        primaryButtonLoading={isDeactivating}
      >
        {renderDeactivateBody()}
      </ReusableModal>
    </div>
  );
};

export default TenantList;
