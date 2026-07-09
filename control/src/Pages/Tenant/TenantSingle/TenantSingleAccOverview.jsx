import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowUpRight, FiEdit3 } from "react-icons/fi";
import { FaArrowLeft } from "react-icons/fa";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput, SelectInput } from "../../../Components/Input/Inputs";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { formatDateShortMonth as formatDate } from "../../../Helper/Formatters";
import useAuth from "../../../hooks/useAuth";
import tenantApi from "../../../api/TenantApis";
import invoiceApi from "../../../api/InvoiceApi";
import SubscriptionInvoice from "../../../Components/Invoice/SubscriptionInvoice";
import { SectionSpinner } from "../../../Components/LoadingSpinner";
import GeneratePaymentLinkModal from "../../../Components/ReusableModal/GeneratePaymentLinkModal";
import { orgTypeOptions, companySizeOptions } from "../../../Data/selectOptions";
import {
  countryOptions,
  getCountryLabel,
  normalizeCountry,
} from "../../../Helper/geoOptions";

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

  // Invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [isPaymentLinkModalOpen, setIsPaymentLinkModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantRes, adminsRes] = await Promise.allSettled([
        tenantApi.GetSingleTenant({ tenantId, accessToken, refreshToken }),
        tenantApi.getAllAdmins({ accessToken, refreshToken }),
      ]);
      if (tenantRes.status === "fulfilled") {
        const data = tenantRes.value.data || tenantRes.value;
        setTenant(data || null);
      } else {
        showApiError(tenantRes.reason, "LOAD_TENANT");
      }
      if (adminsRes.status === "fulfilled") {
        const adminData = adminsRes.value.data?.data || adminsRes.value.data || [];
        setAdmins(Array.isArray(adminData) ? adminData : []);
      }
    } catch (err) {
      showApiError(err, "LOAD_TENANT_DATA");
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      showApiError(err, "CHANGE_ACCOUNT_OFFICER");
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
      country: normalizeCountry(loc.country),
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
      showApiError(err, "UPDATE_TENANT");
    } finally {
      setEditSaving(false);
    }
  };

  const formatCurrency = (value) => {
    if (value == null) return "$0";
    return `$${Number(value).toLocaleString()}`;
  };

  const buildInvoiceItems = (items, billingFrequency) => {
    const rows = [];
    let rowNum = 1;
    (items || []).forEach((item) => {
      rows.push({ id: `${rowNum++}`, description: item.description, rate: formatCurrency(item.rate?.price || 0), quantity: item.quantity, price: formatCurrency(item.price || 0) });
      (item.extraFeaturesWithPrice || []).forEach((feature) => {
        const isYearly = billingFrequency?.toLowerCase() === "yearly";
        const featurePrice = isYearly ? feature.pricePerYear?.price || 0 : feature.pricePerMonth?.price || 0;
        const qty = item.quantity || 1;
        rows.push({ id: `${rowNum++}`, description: "Add-on Feature", rate: formatCurrency(featurePrice), quantity: qty, price: formatCurrency(featurePrice * qty) });
      });
    });
    return rows;
  };

  const handleViewInvoice = async () => {
    const invoiceId = tenant?.Invoice?.[0]?.id;
    if (!invoiceId) { showToast("No invoice available", "error"); return; }
    try {
      setInvoiceLoading(true);
      const response = await invoiceApi.GetInvoiceById({ id: invoiceId, accessToken, refreshToken });
      const invoiceData = response.data || {};
      setSelectedInvoice({
        companyName: "noosphere",
        companyAddress: invoiceData.companyAddress,
        invoiceId: invoiceData.invoiceId || invoiceId,
        dueDate: formatDate(invoiceData.dueDate),
        billingFrequency: invoiceData.billingFrequency,
        customerInfo: invoiceData.customerInfo,
        items: buildInvoiceItems(invoiceData.items, invoiceData.billingFrequency),
        total: formatCurrency(invoiceData.total || 0),
      });
      setShowInvoiceModal(true);
    } catch (err) {
      showApiError(err, "LOAD_INVOICE");
    } finally {
      setInvoiceLoading(false);
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

  const subscription = tenant.Subscription?.[0] || null;
  const plan = subscription?.plan || null;
  const planTypeBadge = plan?.planType ? plan.planType.charAt(0) + plan.planType.slice(1).toLowerCase() : "—";
  const planDisplayName = plan?.name || "—";
  const clientSeatsUsed = tenant._count?.clientLinks ?? 0;
  const clientSeatsTotal = plan?.forClient ?? 0;
  const seatsPercent = clientSeatsTotal > 0 ? Math.min((clientSeatsUsed / clientSeatsTotal) * 100, 100) : 0;
  const nextPaymentDate = formatDate(subscription?.endDate);
  const pipelineItem = tenant.pipelineItems?.[0];
  const hasInvoice = !!tenant.Invoice?.[0]?.id;

  return (
    <div className="tenant-list-container">
      <div className="tenant-header">
        <div onClick={() => navigate(-1)} className="back-link" role="button" tabIndex={0} aria-label="Go back">
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
            <p>{getCountryLabel(loc.country) || "—"}</p>
          </div>
          <div className="info-item">
            <label>Subdomain</label>
            <p>{tenant.subdomain || "—"}</p>
          </div>
        </div>
      </div>

      {/* Plan Info */}
      <h3 className="tenant-header-gen">Plan Info</h3>
      <div className="plan-info">
        <div className="plan-details">
          <div className="plan-item">
            <p>
              <span className="plan-badge">{planTypeBadge}</span>
              {planDisplayName}
            </p>
            <Button
              label="Change plan"
              iconPosition="right"
              icon={<FiArrowUpRight size={20} />}
              width="auto"
              onClick={() => setIsPaymentLinkModalOpen(true)}
            />
          </div>
          <div className="plan-item">
            <label>Usage</label>
            <p>Client seats</p>
            <div className="usage-bar">
              <div className="usage-filled" style={{ width: `${seatsPercent}%` }} />
            </div>
            <p>{clientSeatsUsed} out of {clientSeatsTotal} used</p>
          </div>
          <div className="plan-item next-payment-item">
            <label>Next Payment</label>
            <p style={{ fontWeight: 600, color: "#004aba" }}>{nextPaymentDate}</p>
            <Button
              label="View invoice"
              iconPosition="right"
              icon={<FiArrowUpRight size={16} />}
              variant="outline"
              width="auto"
              onClick={handleViewInvoice}
              loading={invoiceLoading}
              disabled={!hasInvoice}
            />
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
          emptyHint="No account officers found. Create one in Settings → Staff."
        />
        <SelectInput
          label="Change to"
          options={adminOptions}
          value={officerTo}
          onChange={(e) => setOfficerTo(e.target.value)}
          emptyHint="No account officers found. Create one in Settings → Staff."
        />
      </ReusableModal>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100000 }}
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "8px", maxWidth: "900px", width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative", padding: "20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
              onClick={() => setShowInvoiceModal(false)}
            >
              ✕
            </button>
            <SubscriptionInvoice {...selectedInvoice} />
          </div>
        </div>
      )}

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
          onChange={(e) =>
            handleEditChange(
              "subdomain",
              // Only lowercase letters and hyphens — block ".,<>", digits, etc.
              (e.target.value || "").toLowerCase().replace(/[^a-z-]/g, "")
            )
          }
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

      <GeneratePaymentLinkModal
        isOpen={isPaymentLinkModalOpen}
        onClose={() => setIsPaymentLinkModalOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
};

export default TenantSingleAccOverview;
