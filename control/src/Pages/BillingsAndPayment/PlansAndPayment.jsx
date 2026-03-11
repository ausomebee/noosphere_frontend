import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

import Button from "../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import PlanCard from "./PlanCard";
import Table from "./EnterpriseTable";
import PricingPlanModal from "../../Components/ReusableModal/PricingModal";
import StatusChangeModal from "../../Components/ReusableModal/StatusChangeModal";
import EditPricingModal from "../../Components/ReusableModal/EditPricingModal";
import DeletePlanModal from "../../Components/ReusableModal/DeletePlanModal";
import "./BillingAndPayments.css";
import { SearchInput, SelectInput } from "../../Components/Input/Inputs";
import { showToast } from "../../Helper/ShowToast";
import api1 from "../../api/FeatureApis";
import api2 from "../../api/TenantApis";
import api from "../../api/BillingApis";
import LoadingSpinner from "../../Components/LoadingSpinner";

const PlansAndPayment = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("standard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [statusAction, setStatusAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [standardPlans, setStandardPlans] = useState([]);
  const [enterprisePlans, setEnterprisePlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { accessToken, refreshToken } = useAuth();

  useEffect(() => {
    if (accessToken && refreshToken) {
      fetchData();
    } else {
      setErrors({ auth: "Authentication token is missing" });
      showToast("Authentication token is missing", "error");
    }
  }, [activeTab, accessToken, refreshToken]);

  // Reset filters when plans are empty
  useEffect(() => {
    if (
      !loading &&
      (standardPlans.length === 0 || enterprisePlans.length === 0)
    ) {
      setSearchQuery("");
      setFilterStatus("all");
    }
  }, [loading, standardPlans, enterprisePlans]);

  const fetchData = async () => {
    setLoading(true);
    setErrors({});

    try {
      const planType = activeTab === "standard" ? "STANDARD" : "ENTERPRISE";

      const promises = [
        api
          .GetPlanByPlanType({ planType, accessToken, refreshToken })
          .then((response) => ({ type: "plans", response }))
          .catch((err) => {
            throw new Error(`Failed to fetch plans: ${err.message}`);
          }),
        api1
          .GetAllFeatures({ accessToken, refreshToken })
          .then((response) => ({ type: "features", response }))
          .catch((err) => {
            throw new Error(`Failed to fetch features: ${err.message}`);
          }),
        api2
          .getAllAdmins({ accessToken, refreshToken })
          .then((response) => ({ type: "admins", response }))
          .catch((err) => {
            throw new Error(`Failed to fetch admins: ${err.message}`);
          }),
        api2
          .getAllTenants({ accessToken, refreshToken })
          .then((response) => ({ type: "tenants", response }))
          .catch((err) => {
            throw new Error(`Failed to fetch tenants: ${err.message}`);
          }),
      ];

      const results = await Promise.allSettled(promises);
      const newErrors = {};

      results.forEach((result, index) => {
        const promiseTypes = ["plans", "features", "admins", "tenants"];
        const promiseType = promiseTypes[index] || "unknown";

        if (result.status === "fulfilled") {
          const { type, response } = result.value;
          switch (type) {
            case "plans":
              if (!Array.isArray(response?.data)) {
                setStandardPlans([]);
                setEnterprisePlans([]);
                newErrors.plans = "Invalid plans data received from API";
                showToast("Failed to load plans: Invalid data format", "error");
                break;
              }
              const plans = response.data
                .filter((plan) => plan.id)
                .map((plan) => {
                  const tenant = tenants.find((t) => t.id === plan.tenantId);
                  const admin = admins.find((a) => a.id === plan.adminId);
                  const mappedPlan = {
                    id: plan.id,
                    name: plan.name || plan.organization || "Unnamed Plan",
                    status: plan.active ? "active" : "inactive",
                    subscriberCount:
                      plan._count?.subscriptions?.toString() || "0",
                    colourCode: /^#[0-9A-Fa-f]{6}$/.test(plan.colourCode)
                      ? plan.colourCode
                      : "#ffffff",
                    pricing: {
                      cost: plan.pricePerMonth
                        ? `${plan.pricePerMonth.currency || "$"}${
                            plan.pricePerMonth.price || 0
                          } PER MONTH`
                        : "USD0 PER MONTH",
                      storage: plan.forStorage
                        ? `${plan.forStorage} DATA STORAGE`
                        : "unlimited DATA STORAGE",
                      extra:
                        plan.extraFeaturesWithPrice?.length > 0
                          ? `$${
                              plan.extraFeaturesWithPrice[0]?.pricePerMonth
                                ?.price || 0
                            } FOR EVERY EXTRA CLIENT`
                          : "$0 FOR EVERY EXTRA CLIENT",
                      userType: plan.forClient
                        ? "clients"
                        : plan.forStaff
                        ? "staffs"
                        : "clients",
                    },
                    features: Array.isArray(plan.features)
                      ? plan.features.map((f) => f.name || "Unnamed Feature")
                      : [],
                    extraFeatures: Array.isArray(plan.extraFeatures)
                      ? plan.extraFeatures.map((f) => ({
                          id: f.id || "",
                          name: f.name || "Unnamed Extra Feature",
                        }))
                      : [],
                    tenantId: plan.tenantId || null,
                    tenantName: tenant ? tenant.name : "Unassigned",
                    accountManager: plan.adminId || null,
                    accountManagerName: admin ? admin.name : "Unassigned",
                    organization:
                      plan.organization || plan.name || "Unnamed Organization",
                    dateAdded: plan.createdAt
                      ? new Date(plan.createdAt).toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                          year: "numeric",
                        })
                      : new Date().toLocaleDateString("en-US"),
                  };
                  return mappedPlan;
                });

              if (activeTab === "standard") {
                setStandardPlans(plans);
              } else {
                setEnterprisePlans(plans);
              }
              if (plans.length === 0 && response?.data?.length > 0) {
                newErrors.plans =
                  "No valid plans could be mapped from the response";
                showToast("No valid plans found in the response", "error");
              }
              break;
            case "features":
              if (!response?.data || !Array.isArray(response?.data?.data)) {
                setFeatures([]);
                newErrors.features = "Invalid features data received from API";
                showToast(
                  "Failed to load features: Invalid data format",
                  "error"
                );
                break;
              }
              const featuresData = response.data.data
                .filter((f) => f.id && f.name)
                .map((f) => ({
                  id: f.id,
                  name: f.name || "Unnamed Feature",
                }));
              if (featuresData.length === 0) {
                newErrors.features = "No valid features found";
                showToast("No valid features found", "error");
              }
              setFeatures(featuresData);
              break;
            case "admins":
              if (!Array.isArray(response.data?.data)) {
                setAdmins([]);
                newErrors.admins = "Invalid admins data received from API";
                showToast(
                  "Failed to load admins: Invalid data format",
                  "error"
                );
                break;
              }
              const adminsData = response.data.data.map((a) => ({
                id: a.id || "",
                name: `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.id || "Unnamed Admin",
              }));
              setAdmins(adminsData);
              break;
            case "tenants":
              if (!Array.isArray(response.data?.data)) {
                setTenants([]);
                newErrors.tenants = "Invalid tenants data received from API";
                showToast(
                  "Failed to load tenants: Invalid data format",
                  "error"
                );
                break;
              }
              const tenantsData = response.data.data.map((t) => ({
                id: t.id || "",
                name: t.companyName || t.id || "Unnamed Tenant",
              }));
              setTenants(tenantsData);
              break;
            default:
              break;
          }
        } else {
          const errorMsg =
            result.reason.message || `Failed to fetch ${promiseType}`;
          newErrors[promiseType] = errorMsg;
          showToast(`Failed to load ${promiseType}: ${errorMsg}`, "error");
          if (import.meta.env.DEV) console.error(`Error in ${promiseType}:`, result.reason);
        }
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      }
    } catch (err) {
      const errorMsg =
        err.message || "Unexpected error occurred while fetching data";
      setErrors((prev) => ({
        ...prev,
        general: errorMsg,
      }));
      showToast(errorMsg, "error");
      if (import.meta.env.DEV) console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewPlan = () => {
    if (loading) {
      showToast("Please wait, data is still loading.", "warning");
      return;
    }
    if (
      !Array.isArray(features) ||
      features.length === 0 ||
      !features.every((f) => f.id && f.name)
    ) {
      showToast(
        "Cannot add plan: Features are not loaded or invalid.",
        "error"
      );
      return;
    }
    setSearchQuery("");
    setFilterStatus("all");
    setIsModalOpen(true);
  };

const handleSavePlan = async (planData) => {
  if (!planData?.name || !planData?.pricing) {
    showToast("Invalid plan data provided.", "error");
    return;
  }
  setLoading(true);
  try {
    const payload = {
      name: planData.name || "Unnamed Plan",
      description: `Includes all features for ${planData.name || "Unnamed Plan"}`,
      pricePerMonth: {
        price: parseFloat(planData.pricing?.pricePerMonth?.amount) || 0,
        currency: planData.pricing?.pricePerMonth?.currency || "USD",
      },
      pricePerYear: {
        price: parseFloat(planData.pricing?.pricePerYear?.amount) || 0,
        currency: planData.pricing?.pricePerYear?.currency || "USD",
      },
      features: {
        connect: Array.isArray(planData.features)
          ? planData.features.map((f) => ({ id: f.id }))
          : [],
      },
      planType: planData.type === "Standard" ? "STANDARD" : "ENTERPRISE",
      colourCode: planData.colourCode || "#ffffff",
      forClient:
        planData.pricing?.userOption === "clients" &&
        planData.pricing?.clients !== "unlimited"
          ? parseInt(planData.pricing.clients, 10) || 0
          : 0,
      forStaff:
        planData.pricing?.userOption === "staffs" &&
        planData.pricing?.clients !== "unlimited"
          ? parseInt(planData.pricing.clients, 10) || 0
          : 0,
      forStorage:
        planData.pricing?.storage === "unlimited"
          ? 0
          : parseFloat(planData.pricing?.storage) || 0,
      extraFeaturesEnabled:
        Array.isArray(planData.extraPricing) && planData.extraPricing.length > 0,
      tenantId: planData.assignedTo || null,
      adminId: planData.accountManager || null,
      accessToken,
      refreshToken,
    };

    // Conditionally add extraFeatures and extraFeaturesWithPrice only if extraFeaturesEnabled is true
    if (payload.extraFeaturesEnabled) {
      payload.extraFeatures = {
        connect: Array.isArray(planData.extraPricing)
          ? planData.extraPricing.map((e) => ({ id: e.id }))
          : [],
      };
      payload.extraFeaturesWithPrice = Array.isArray(planData.extraPricing)
        ? planData.extraPricing.map((e) => ({
            id: e.id,
            pricePerMonth: {
              price: parseFloat(e.pricePerMonth?.price) || 0,
              currency: e.pricePerMonth?.currency || "USD",
            },
            pricePerYear: {
              price: parseFloat(e.pricePerYear?.price) || 0,
              currency: e.pricePerYear?.currency || "USD",
            },
          }))
        : [];
    }

    await api.CreateBillingPlan(payload);
    showToast("Plan created successfully", "success");
    setIsModalOpen(false);
    await fetchData();
  } catch (err) {
    const errorMsg = err.message || "Failed to create plan";
    showToast(errorMsg, "error");
    if (import.meta.env.DEV) console.error("Create plan error:", err);
    throw err;
  } finally {
    setLoading(false);
  }
};

 const handleSaveEditedPlan = async (planData) => {
  if (!selectedPlan?.id || !planData?.name || !planData?.pricing) {
    showToast("Invalid plan data or missing plan ID.", "error");
    return;
  }
  setLoading(true);
  try {
    const payload = {
      id: selectedPlan.id,
      name: planData.name || "Unnamed Plan",
      description: `Includes all features for ${planData.name || "Unnamed Plan"}`,
      pricePerMonth: {
        price: parseFloat(planData.pricing?.pricePerMonth?.amount) || 0,
        currency: planData.pricing?.pricePerMonth?.currency || "USD",
      },
      pricePerYear: {
        price: parseFloat(planData.pricing?.pricePerYear?.amount) || 0,
        currency: planData.pricing?.pricePerYear?.currency || "USD",
      },
      features: {
        connect: Array.isArray(planData.features)
          ? planData.features.map((f) => ({ id: f.id }))
          : [],
      },
      planType: planData.type === "Standard" ? "STANDARD" : "ENTERPRISE",
      colourCode: planData.colourCode || "#ffffff",
      forClient:
        planData.pricing?.userOption === "clients" &&
        planData.pricing?.clients !== "unlimited"
          ? parseInt(planData.pricing.clients, 10) || 0
          : 0,
      forStaff:
        planData.pricing?.userOption === "staffs" &&
        planData.pricing?.clients !== "unlimited"
          ? parseInt(planData.pricing.clients, 10) || 0
          : 0,
      forStorage:
        planData.pricing?.storage === "unlimited"
          ? 0
          : parseFloat(planData.pricing?.storage) || 0,
      extraFeaturesEnabled:
        Array.isArray(planData.extraPricing) && planData.extraPricing.length > 0,
      tenantId: planData.assignedTo || null,
      adminId: planData.accountManager || null,
      accessToken,
      refreshToken,
    };

    // Conditionally add extraFeatures and extraFeaturesWithPrice only if extraFeaturesEnabled is true
    if (payload.extraFeaturesEnabled) {
      payload.extraFeatures = {
        connect: Array.isArray(planData.extraPricing)
          ? planData.extraPricing.map((e) => ({ id: e.id }))
          : [],
      };
      payload.extraFeaturesWithPrice = Array.isArray(planData.extraPricing)
        ? planData.extraPricing.map((e) => ({
            id: e.id,
            pricePerMonth: {
              price: parseFloat(e.pricePerMonth?.price) || 0,
              currency: e.pricePerMonth?.currency || "USD",
            },
            pricePerYear: {
              price: parseFloat(e.pricePerYear?.price) || 0,
              currency: e.pricePerYear?.currency || "USD",
            },
          }))
        : [];
    }

    await api.UpdateBillingPlan(payload);
    showToast("Plan updated successfully", "success");
    setIsEditModalOpen(false);
    setSelectedPlan(null);
    await fetchData();
  } catch (err) {
    const errorMsg = err.message || "Failed to update plan";
    showToast(errorMsg, "error");
    if (import.meta.env.DEV) console.error("Update plan error:", err);
    throw err;
  } finally {
    setLoading(false);
  }
};

  const handleDuplicatePlan = async (plan, type) => {
    if (!plan?.id) {
      showToast("Invalid plan selected for duplication.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await api.DuplicateBillingPlan({
        planId: plan.id,
        accessToken,
        refreshToken,
      });
      const newPlan = {
        id: response.data.id,
        name: `${plan.name} (Copy)`,
        status: response.data.active ? "active" : "inactive",
        subscriberCount: "0",
        colourCode: plan.colourCode || "#ffffff",
        pricing: plan.pricing,
        features: plan.features,
        extraFeatures: plan.extraFeatures,
        tenantId:
          type === "enterprise"
            ? `${plan.tenantId || "copy"}_${Date.now()}`
            : null,
        organization:
          type === "enterprise"
            ? `${plan.organization} (Copy)`
            : `${plan.name} (Copy)`,
        dateAdded: new Date().toLocaleDateString("en-US"),
        accountManager: plan.accountManager,
      };

      if (type === "standard") {
        setStandardPlans((prev) => [...prev, newPlan]);
      } else {
        setEnterprisePlans((prev) => [...prev, newPlan]);
      }
      showToast("Plan duplicated successfully", "success");
      await fetchData();
    } catch (err) {
      const errorMsg = err.message || "Failed to duplicate plan";
      showToast(errorMsg, "error");
      if (import.meta.env.DEV) console.error("Duplicate plan error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (plan, action, type) => {
    if (!plan?.id) {
      showToast("Invalid plan selected for status change.", "error");
      return;
    }
    setSelectedPlan({ ...plan, type });
    setStatusAction(action);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async ({
    plan,
    action,
    administratorPassword,
  }) => {
    if (!plan?.id || !administratorPassword) {
      showToast("Missing plan ID or administrator password.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.TogglePlanActivity({
        id: plan.id,
        active: action === "activate",
        administratorPassword,
        accessToken,
        refreshToken,
      });

      if (plan.type === "standard") {
        setStandardPlans((prev) =>
          prev.map((p) =>
            p.id === plan.id
              ? { ...p, status: action === "activate" ? "active" : "inactive" }
              : p
          )
        );
      } else {
        setEnterprisePlans((prev) =>
          prev.map((p) =>
            p.id === plan.id
              ? { ...p, status: action === "activate" ? "active" : "inactive" }
              : p
          )
        );
      }
      showToast(`Plan ${action}d successfully`, "success");
      setIsStatusModalOpen(false);
      setSelectedPlan(null);
      setStatusAction("");
      await fetchData();
    } catch (err) {
      const errorMsg = err.message || "Invalid administrator password";
      showToast(errorMsg, "error");
      if (import.meta.env.DEV) console.error("Status change error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (plan, type) => {
    if (!plan?.id) {
      showToast("Invalid plan selected for editing.", "error");
      return;
    }
    setSelectedPlan({ ...plan, type });
    setIsEditModalOpen(true);
  };

  const handleDeletePlan = (plan, type) => {
    if (!plan?.id) {
      showToast("Invalid plan selected for deletion.", "error");
      return;
    }
    setSelectedPlan({ ...plan, type });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async ({ plan, administratorPassword }) => {
    if (!plan?.id || !administratorPassword) {
      showToast("Missing plan ID or administrator password.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.DeleteBillingPlan({
        id: plan.id,
        administratorPassword,
        accessToken,
        refreshToken,
      });

      if (plan.type === "standard") {
        setStandardPlans((prev) => prev.filter((p) => p.id !== plan.id));
      } else {
        setEnterprisePlans((prev) => prev.filter((p) => p.id !== plan.id));
      }
      showToast("Plan deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setSelectedPlan(null);
      await fetchData();
    } catch (err) {
      const errorMsg = err.message || "Invalid administrator password";
      showToast(errorMsg, "error");
      if (import.meta.env.DEV) console.error("Delete plan error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrganizationProfile = (plan) => {
    if (!plan?.tenantId) {
      showToast("Tenant ID not found for this organization.", "error");
      return;
    }
    navigate(`/tenants/tenant-lists/overview/${plan.tenantId}`);
  };

  const filteredStandardPlans = standardPlans.filter(
    (plan) =>
      plan.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterStatus === "all" ||
        (filterStatus === "active" && plan.status === "active") ||
        (filterStatus === "inactive" && plan.status === "inactive"))
  );

  const filteredEnterprisePlans = enterprisePlans.filter(
    (plan) =>
      plan.organization?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterStatus === "all" ||
        (filterStatus === "active" && plan.status === "active") ||
        (filterStatus === "inactive" && plan.status === "inactive"))
  );

  const filterOptions = [
    { value: "all", label: "All Plans" },
    { value: "active", label: "Active Plans" },
    { value: "inactive", label: "Inactive Plans" },
  ];

  const FallbackUI = () => (
    <div
      className="flex flex-col items-center justify-center h-full w-full text-center"
      style={{ color: "#666" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="table-empty-state-icon"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <div className="text-lg" style={{ marginBottom: "10px" }}>
        No {activeTab} plans have been created yet.
      </div>
      <div className="text-sm" style={{ marginBottom: "20px" }}>
        You haven't configured any plans. Create your first plan to begin.
      </div>
      <Button
        label="Add new plan"
        icon={<FaPlus />}
        iconPosition="left"
        variant="primary"
        onClick={handleAddNewPlan}
        width="auto"
        disabled={loading}
      />
    </div>
  );

  return (
    <>
      <div className="billing-board-header">
        <div className="billing-board-title">
          <h1>Billing & Payment</h1>
          <p>Plans & Pricing</p>
        </div>
      </div>
      <div className="billing-board-buttons">
        <Button
          label="Add New Plan"
          icon={<FaPlus />}
          iconPosition="left"
          width="200px"
          variant="primary"
          onClick={handleAddNewPlan}
          aria-label="Add a new billing plan"
          disabled={loading}
        />
      </div>

      <div className="tabs">
        <div
          className={`tab ${activeTab === "standard" ? "active" : ""}`}
          onClick={() => !loading && setActiveTab("standard")}
        >
          Standard Plans
        </div>
        <div
          className={`tab ${activeTab === "enterprise" ? "active" : ""}`}
          onClick={() => !loading && setActiveTab("enterprise")}
        >
          Enterprise Plans
        </div>
      </div>

      <div
        className="flex justify-start gap-5"
        style={{
          margin: "20px 0",
          width: "60%",
        }}
      >
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "standard"
                ? "Search plans"
                : "Search enterprise plans"
            }
            disabled={loading}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center" style={{ gap: "10px" }}>
            <h2 className="filter-text">Filters:</h2>
            <div className="plan-filter-select">
              <SelectInput
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={filterOptions}
                disabled={loading}
                className="plan-filter-select-input"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="flex justify-center items-center w-full"
          style={{ height: "50vh" }}
        >
          <LoadingSpinner />
        </div>
      ) : Object.keys(errors).length > 0 ? (
        <div className="text-center" style={{ color: "red" }}>
          {errors.general && <p>{errors.general}</p>}
          {errors.plans && <p>{errors.plans}</p>}
          {errors.features && <p>{errors.features}</p>}
          {errors.admins && <p>{errors.admins}</p>}
          {errors.tenants && <p>{errors.tenants}</p>}
          {(activeTab === "standard" && standardPlans.length === 0) ||
          (activeTab === "enterprise" && enterprisePlans.length === 0) ? (
            <FallbackUI />
          ) : null}
        </div>
      ) : (
        <div
          className={`plans-container no-scrollbar no-scrollbar::-webkit-scrollbar ${
            activeTab === "enterprise" && filteredEnterprisePlans.length === 0
              ? "fallback-active"
              : activeTab === "enterprise"
              ? "table-active"
              : ""
          }`}
        >
          {activeTab === "standard" &&
            (filteredStandardPlans.length === 0 ? (
              <FallbackUI />
            ) : (
              filteredStandardPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onDuplicate={() => handleDuplicatePlan(plan, "standard")}
                  onStatusChange={(action) =>
                    handleStatusChange(plan, action, "standard")
                  }
                  onEdit={() => handleEditPlan(plan, "standard")}
                  onDelete={() => handleDeletePlan(plan, "standard")}
                  disabled={loading}
                />
              ))
            ))}

          {activeTab === "enterprise" &&
            (filteredEnterprisePlans.length === 0 ? (
              <FallbackUI />
            ) : (
              <div className="billing-table-container">
                <Table
                  plans={filteredEnterprisePlans}
                  onDuplicate={(plan) =>
                    handleDuplicatePlan(plan, "enterprise")
                  }
                  onStatusChange={(plan, action) =>
                    handleStatusChange(plan, action, "enterprise")
                  }
                  onEdit={(plan) => handleEditPlan(plan, "enterprise")}
                  onDelete={(plan) => handleDeletePlan(plan, "enterprise")}
                  onViewProfile={handleViewOrganizationProfile}
                  disabled={loading}
                />
              </div>
            ))}
        </div>
      )}

      <PricingPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
        initialPlanType={activeTab === "standard" ? "Standard" : "Enterprise"}
        features={Array.isArray(features) ? features : []}
        admins={Array.isArray(admins) ? admins : []}
        tenants={Array.isArray(tenants) ? tenants : []}
        primaryButtonLoading={loading}
      />

      <StatusChangeModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleConfirmStatusChange}
        plan={selectedPlan}
        action={statusAction}
        primaryButtonLoading={loading}
      />

      <EditPricingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEditedPlan}
        plan={selectedPlan}
        features={Array.isArray(features) ? features : []}
        admins={Array.isArray(admins) ? admins : []}
        tenants={Array.isArray(tenants) ? tenants : []}
        primaryButtonLoading={loading}
      />

      <DeletePlanModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        plan={selectedPlan}
        primaryButtonLoading={loading}
      />
    </>
  );
};

export default PlansAndPayment;
