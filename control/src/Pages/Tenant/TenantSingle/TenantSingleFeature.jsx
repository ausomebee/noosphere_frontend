import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import { FiArrowUpRight } from "react-icons/fi";
import tenantApi from "../../../api/TenantApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import { SectionSpinner } from "../../../Components/LoadingSpinner";
import GeneratePaymentLinkModal from "../../../Components/ReusableModal/GeneratePaymentLinkModal";

const TenantSingleFeature = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [isPaymentLinkModalOpen, setIsPaymentLinkModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tenantApi.GetTenantFeatures({ accessToken, refreshToken, tenantId });
      const data = res?.data?.data || res?.data || [];
      const sub = Array.isArray(data) ? data[0] : data;
      setSubscription(sub || null);
    } catch (err) {
      showToast(err.message || "Failed to load features", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="tenant-list-container">
        <SectionSpinner />
      </div>
    );
  }

  const plan = subscription?.plan || null;
  const planTypeBadge = plan?.planType
    ? plan.planType.charAt(0) + plan.planType.slice(1).toLowerCase()
    : "—";
  const planDisplayName = plan?.name || "—";
  const clientSeatsUsed = subscription?.clientCount ?? 0;
  const clientSeatsTotal = plan?.forClient ?? 0;
  const seatsPercent = clientSeatsTotal > 0
    ? Math.min((clientSeatsUsed / clientSeatsTotal) * 100, 100)
    : 0;

  const pipelineItem = subscription?.tenant?.pipelineItems?.[0];
  const features = plan?.features || [];
  const extraFeatures = plan?.extraFeatures || [];

  const handleChangePlan = () => {
    setIsPaymentLinkModalOpen(true);
  };

  const renderFeaturesTable = (featureList) => (
    <div className="features-table-container">
      <table className="features-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Active</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {featureList.map((feature, index) => (
            <tr key={feature.id || index}>
              <td>{feature.name || "—"}</td>
              <td>
                <span className="active-label">
                  {feature.active ? "Yes" : "No"}
                </span>
              </td>
              <td>
                <Button
                  label="View usage statistics"
                  variant="outline"
                  width="auto"
                  onClick={() => navigate(`/tenants/tenant-lists/usage-statistics/${tenantId}`)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="tenant-list-container">
      {/* Plan Info Section */}
      <h3 className="tenant-header-gen">Plan Info</h3>
      <div className="plan-info">
        <div className="plan-details-col2">
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
              onClick={handleChangePlan}
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
        </div>
      </div>

      {/* Features Table Section */}
      <h3 className="tenant-header-gen">Features</h3>
      {features.length === 0 ? (
        <div className="settings-placeholder">No features found for this plan.</div>
      ) : (
        renderFeaturesTable(features)
      )}

      {/* Extra Features */}
      {extraFeatures.length > 0 && (
        <>
          <h4 className="tenant-header-sub">Extra Features</h4>
          {renderFeaturesTable(extraFeatures)}
        </>
      )}
      <GeneratePaymentLinkModal
        isOpen={isPaymentLinkModalOpen}
        onClose={() => setIsPaymentLinkModalOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
};

export default TenantSingleFeature;
