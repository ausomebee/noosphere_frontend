import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowUpRight, FiEdit3 } from "react-icons/fi";
import { FaArrowLeft } from "react-icons/fa";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput, SelectInput } from "../../../Components/Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";
import tenantApi from "../../../api/TenantApis";
import { SectionSpinner } from "../../../Components/LoadingSpinner";

const orgTypeOptions = [
  { value: "", label: "Select" },
  { value: "Solo Provider / BCBA Private Practice", label: "Solo Provider / BCBA Private Practice" },
  { value: "ABA Clinic or Center", label: "ABA Clinic or Center" },
  { value: "Multi-Disciplinary Therapy Practice", label: "Multi-Disciplinary Therapy Practice" },
  { value: "In-Home / Telehealth ABA Provider", label: "In-Home / Telehealth ABA Provider" },
  { value: "School or Early Intervention Program", label: "School or Early Intervention Program" },
  { value: "Healthcare or Behavioral Health Organization", label: "Healthcare or Behavioral Health Organization" },
  { value: "Nonprofit / Government Program", label: "Nonprofit / Government Program" },
  { value: "Other", label: "Other" },
];

const companySizeOptions = [
  { value: "", label: "Select" },
  { value: "1-5", label: "1–5 Employees" },
  { value: "5-10", label: "5–10 Employees" },
  { value: "10-50", label: "10–50 Employees" },
  { value: "50-100", label: "50–100 Employees" },
  { value: "100-500", label: "100–500 Employees" },
  { value: "500-1000", label: "500–1000 Employees" },
  { value: "1000+", label: "1000+ Employees" },
];

const countryOptions = [
  { value: "", label: "Select" },
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Australia", label: "Australia" },
  { value: "India", label: "India" },
  { value: "Other", label: "Other" },
];

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const TenantSingleAccOverview = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();

  const [tenant, setTenant] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Change officer modal
  const [officerModal, setOfficerModal] = useState(false);
  const [officerFrom, setOfficerFrom] = useState("");
  const [officerTo, setOfficerTo] = useState("");
  const [officerSaving, setOfficerSaving] = useState(false);

  // Edit tenant modal
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantRes, adminsRes, statsRes] = await Promise.allSettled([
        tenantApi.GetSingleTenant({ tenantId, accessToken, refreshToken }),
        tenantApi.getAllAdmins({ accessToken, refreshToken }),
        tenantApi.GetTenantUsageStatistics({ accessToken, refreshToken, tenantId }),
      ]);
      if (tenantRes.status === "fulfilled") {
        const data = tenantRes.value.data || tenantRes.value;
        setTenant(data || null);
      } else {
        showToast(tenantRes.reason?.message || "Failed to load tenant", "error");
      }
      if (adminsRes.status === "fulfilled") {
        const adminData = adminsRes.value.data?.data || adminsRes.value.data || [];
        setAdmins(Array.isArray(adminData) ? adminData : []);
      }
      if (statsRes.status === "fulfilled") {
        setUsageStats(statsRes.value?.data || statsRes.value);
      }
    } catch (err) {
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const adminOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      ...admins.map((a) => ({
        value: a.id,
        label: `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.fullName || a.email,
      })),
    ],
    [admins]
  );

  const officerName = tenant?.accountOfficer
    ? `${tenant.accountOfficer.firstName || ""} ${tenant.accountOfficer.lastName || ""}`.trim()
    : "Unassigned";

  const loc = tenant?.location || {};

  // --- Change Account Officer ---
  const handleOpenOfficerModal = () => {
    setOfficerFrom(tenant?.assignToAdmin || "");
    setOfficerTo("");
    setOfficerModal(true);
  };

  const handleCloseOfficerModal = () => {
    setOfficerModal(false);
    setOfficerFrom("");
    setOfficerTo("");
  };

  const handleSaveOfficer = async () => {
    if (!officerTo) {
      showToast("Please select an admin to assign", "error");
      return;
    }
    try {
      setOfficerSaving(true);
      await tenantApi.ChangeAccountOfficer({
        tenantId: tenant.id,
        adminId: officerTo,
        accessToken,
        refreshToken,
      });
      showToast("Account officer changed successfully", "success");
      handleCloseOfficerModal();
      fetchData();
    } catch (err) {
      showToast(err.message || "Failed to change account officer", "error");
    } finally {
      setOfficerSaving(false);
    }
  };

  // --- Edit Tenant Info ---
  const handleOpenEditModal = () => {
    setEditForm({
      companyName: tenant?.companyName || "",
      contactPerson: tenant?.contactPerson || "",
      email: tenant?.email || "",
      phoneNumber: tenant?.phoneNumber || "",
      companySize: tenant?.companySize || "",
      organizationType: tenant?.organizationType || "",
      subdomain: tenant?.subdomain || "",
      address: loc.address || "",
      city: loc.city || "",
      stateProvince: loc.stateProvince || loc.state || "",
      zip: loc.zip || "",
      country: loc.country || "",
    });
    setEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditModal(false);
    setEditForm({});
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editForm.companyName) {
      showToast("Company name is required", "error");
      return;
    }
    try {
      setEditSaving(true);
      await tenantApi.UpdateTenantInfo({
        payload: {
          id: tenant.id,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          companyName: editForm.companyName,
          contactPerson: editForm.contactPerson,
          companySize: editForm.companySize,
          organizationType: editForm.organizationType,
          subdomain: editForm.subdomain,
          location: {
            address: editForm.address,
            city: editForm.city,
            stateProvince: editForm.stateProvince,
            zip: editForm.zip,
            country: editForm.country,
          },
        },
        accessToken,
        refreshToken,
      });
      showToast("Tenant information updated successfully", "success");
      handleCloseEditModal();
      fetchData();
    } catch (err) {
      showToast(err.message || "Failed to update tenant", "error");
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="tenant-list-container">
        <SectionSpinner />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="tenant-list-container">
        <div className="settings-placeholder">Tenant not found.</div>
      </div>
    );
  }

  const planName = tenant.BillingPlan?.[0]?.name || "—";

  return (
    <div className="tenant-list-container">
      <div className="tenant-header">
        <div onClick={() => navigate(-1)} className="back-link">
          <FaArrowLeft /> Back
        </div>
        <div className="tenant-title-container">
          <h1 className="tenant-title">Tenants</h1>
          <h2 className="tenant-title-breadcrumbs">
            Tenants /{" "}
            <span className="tenant-title-breadcrumbs-org">
              {tenant.companyName || tenant.contactPerson}
            </span>
          </h2>
        </div>
      </div>

      {/* Account Status Badge */}
      <div className="tenant-status-section">
        <div className="tenant-status-badge-wrapper">
          <span className="tenant-status-label">Account Status</span>
          <span className={`tenant-status-badge ${tenant.active ? "active" : "inactive"}`}>
            <span className="tenant-status-dot" />
            {tenant.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Account Officer */}
      <div className="account-officer">
        <div className="officer-avatar">{getInitials(officerName)}</div>
        <div className="officer-info">
          <span className="officer-role">Account Officer</span>
          <span className="officer-name">{officerName}</span>
        </div>
        <button className="change-button" onClick={handleOpenOfficerModal}>
          Change
        </button>
      </div>

      {/* General Information */}
      <h3 className="tenant-header-gen">General Information</h3>
      <div className="tenant-info">
        <div className="tenant-org-header">
          <h4 className="tenant-org-name">{tenant.companyName}</h4>
          <button className="edit-button" onClick={handleOpenEditModal}>
            <FiEdit3 size={14} style={{ marginRight: "5px" }} />
            Edit
          </button>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <label>Contact Person</label>
            <p>{tenant.contactPerson || "—"}</p>
          </div>
          <div className="info-item">
            <label>Email</label>
            <p>{tenant.email || "—"}</p>
          </div>
          <div className="info-item">
            <label>Phone</label>
            <p>{tenant.phoneNumber || "—"}</p>
          </div>
          <div className="info-item">
            <label>Org Type</label>
            <p>{tenant.organizationType || "—"}</p>
          </div>
          <div className="info-item">
            <label>Company Size</label>
            <p>{tenant.companySize || "—"}</p>
          </div>
          <div className="info-item">
            <label>Street Address</label>
            <p>{loc.address || "—"}</p>
          </div>
          <div className="info-item">
            <label>City</label>
            <p>{loc.city || "—"}</p>
          </div>
          <div className="info-item">
            <label>State/Province</label>
            <p>{loc.stateProvince || loc.state || "—"}</p>
          </div>
          <div className="info-item">
            <label>ZIP</label>
            <p>{loc.zip || "—"}</p>
          </div>
          <div className="info-item">
            <label>Country</label>
            <p>{loc.country || "—"}</p>
          </div>
          <div className="info-item">
            <label>Subdomain</label>
            <p>{tenant.subdomain || "—"}</p>
          </div>
        </div>
      </div>

      {/* Plan Info (static UI for now) */}
      <h3 className="tenant-header-gen">Plan Info</h3>
      <div className="plan-info">
        <div className="plan-details">
          <div className="plan-item">
            <p>
              <span className="plan-badge">{planName !== "—" ? planName : "Enterprise"}</span>
              Plan
            </p>
            <Button
              label="Change plan"
              iconPosition="right"
              icon={<FiArrowUpRight size={20} />}
              width="auto"
            />
          </div>
          <div className="plan-item">
            <label>Usage</label>
            <p>Client seats</p>
            {usageStats?.tenantClientsCount != null ? (
              <>
                <div className="usage-bar">
                  <div
                    className="usage-filled"
                    style={{ width: `${Math.min(usageStats.tenantClientsCount * 10, 100)}%` }}
                  />
                </div>
                <p>{usageStats.tenantClientsCount} clients</p>
              </>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>Usage data unavailable</p>
            )}
          </div>
          <div className="plan-item">
            <label>Sessions</label>
            <p style={{ fontWeight: 600, color: "#004aba" }}>
              {usageStats?.tenantSessionCount != null
                ? usageStats.tenantSessionCount.toLocaleString()
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Change Account Officer Modal */}
      <ReusableModal
        isOpen={officerModal}
        onClose={handleCloseOfficerModal}
        title="Change account officer"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveOfficer}
        onSecondaryButtonClick={handleCloseOfficerModal}
        primaryButtonLoading={officerSaving}
      >
        <SelectInput
          label="Change from"
          options={adminOptions}
          value={officerFrom}
          onChange={(e) => setOfficerFrom(e.target.value)}
        />
        <SelectInput
          label="Change to"
          options={adminOptions}
          value={officerTo}
          onChange={(e) => setOfficerTo(e.target.value)}
        />
      </ReusableModal>

      {/* Edit Tenant Information Modal */}
      <ReusableModal
        isOpen={editModal}
        onClose={handleCloseEditModal}
        title="Edit tenant information"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveEdit}
        onSecondaryButtonClick={handleCloseEditModal}
        primaryButtonLoading={editSaving}
      >
        <TextInput
          label="Company Name"
          placeholder="Enter company name"
          value={editForm.companyName || ""}
          onChange={(e) => handleEditChange("companyName", e.target.value)}
        />
        <TextInput
          label="Contact Person"
          placeholder="Enter contact person"
          value={editForm.contactPerson || ""}
          onChange={(e) => handleEditChange("contactPerson", e.target.value)}
        />
        <TextInput
          label="Email"
          type="email"
          placeholder="Enter email"
          value={editForm.email || ""}
          onChange={(e) => handleEditChange("email", e.target.value)}
        />
        <TextInput
          label="Phone"
          placeholder="Enter phone number"
          value={editForm.phoneNumber || ""}
          onChange={(e) => handleEditChange("phoneNumber", e.target.value)}
        />
        <SelectInput
          label="Company Size"
          options={companySizeOptions}
          value={editForm.companySize || ""}
          onChange={(e) => handleEditChange("companySize", e.target.value)}
        />
        <SelectInput
          label="Organization Type"
          options={orgTypeOptions}
          value={editForm.organizationType || ""}
          onChange={(e) => handleEditChange("organizationType", e.target.value)}
        />
        <TextInput
          label="Subdomain"
          placeholder="e.g. mycompany"
          value={editForm.subdomain || ""}
          onChange={(e) => handleEditChange("subdomain", e.target.value)}
        />
        <TextInput
          label="Street Address"
          placeholder="Enter street address"
          value={editForm.address || ""}
          onChange={(e) => handleEditChange("address", e.target.value)}
        />
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <TextInput
              label="City"
              placeholder="City"
              value={editForm.city || ""}
              onChange={(e) => handleEditChange("city", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <TextInput
              label="State/Province"
              placeholder="State"
              value={editForm.stateProvince || ""}
              onChange={(e) => handleEditChange("stateProvince", e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <TextInput
              label="ZIP"
              placeholder="ZIP"
              value={editForm.zip || ""}
              onChange={(e) => handleEditChange("zip", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <SelectInput
              label="Country"
              options={countryOptions}
              value={editForm.country || ""}
              onChange={(e) => handleEditChange("country", e.target.value)}
            />
          </div>
        </div>
      </ReusableModal>
    </div>
  );
};

export default TenantSingleAccOverview;
