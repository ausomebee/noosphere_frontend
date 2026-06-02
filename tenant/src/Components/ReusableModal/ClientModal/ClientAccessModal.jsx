// src/components/ReusableModal/ClientModal/ClientPortalSettingsModal.jsx

import React, { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { SwitchInput, TextInput } from "../../Input/Inputs";
import { HiOutlineLink } from "react-icons/hi";
import api2 from "../../../api/clientPanelApis";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { useSelector } from "react-redux";

const ClientPortalSettingsModal = ({
  isOpen,
  onClose,
  clientTenantId,
  initialData = {}, // contains: clientPortalAccess, documentAccess, requestAppointment
}) => {
  const [enablePortal, setEnablePortal] = useState(false);
  const [allowReschedule, setAllowReschedule] = useState(true);
  const [allowDocumentSharing, setAllowDocumentSharing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { accessToken, refreshToken } = useSelector(
    (s) => s.authentication?.user || {}
  );

  // Sync with backend data when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setEnablePortal(!!initialData.clientPortalAccess);
      setAllowReschedule(initialData.requestAppointment !== false); // default true
      setAllowDocumentSharing(!!initialData.documentAccess);
    }
  }, [isOpen, initialData]);

  const portalUrl = `https://noosphere/client-org.com/${clientTenantId || "login"}`;

  const handleSave = async () => {
    if (!clientTenantId) {
      showToast("Client not found", "error");
      return;
    }

    setLoading(true);
    try {
      await api2.UpdateClientPortalAccess({
        clientTenantId,
        documentAccess: allowDocumentSharing,
        dbAccess: enablePortal, // reserved for future
        requestAppointment: allowReschedule,
        accessToken,
        refreshToken,
      });

      showToast("Portal settings saved successfully", "success");
      onClose();
    } catch (err) {
      showApiError(err, "SAVE_CLIENT_SETTINGS");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    showToast("Link copied to clipboard!", "success");
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Client Portal Settings"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={loading}
      size="md"
    >
      <div className="space-y-6 py-4">
        {/* MAIN SWITCH: Enable Portal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div style={{ marginBottom: "-15px" }}>
              <SwitchInput
                checked={enablePortal}
                onChange={(e) => setEnablePortal(e.target.checked)}
                id="enable-portal"
              />
            </div>
            <label
              htmlFor="enable-portal"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Enable Client Portal
            </label>
          </div>
        </div>

        {/* Portal Link */}
        {enablePortal && (
          <div className="my-4">
            <label className="block text-sm font-medium text-gray-600 mb-3">
              Client Portal Address
            </label>
            <div className="flex items-center gap-3">
              <div className="relative pr-4">
                <div style={{ marginBottom: "-15px" }}>
                  <TextInput
                    type="text"
                    readOnly
                    value={portalUrl}
                    width={300}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="p-6 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                aria-label="Copy portal link"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-600"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Permissions - shown only when portal is enabled */}
        {enablePortal && (
          <div className="pt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 my-2">
                <div style={{ marginBottom: "-15px" }}>
                  <SwitchInput
                    checked={allowReschedule}
                    onChange={(e) => setAllowReschedule(e.target.checked)}
                    id="allow-reschedule"
                  />
                </div>
                <label
                  htmlFor="allow-reschedule"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Allow clients to request appointment rescheduling
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 my-2">
                <div style={{ marginBottom: "-15px" }}>
                  <SwitchInput
                    checked={allowDocumentSharing}
                    onChange={(e) => setAllowDocumentSharing(e.target.checked)}
                    id="allow-documents"
                  />
                </div>
                <label
                  htmlFor="allow-documents"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Allow document sharing with client
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Message when portal is disabled */}
        {!enablePortal && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Enable the client portal to configure access and permissions
          </div>
        )}
      </div>
    </ReusableModal>
  );
};

export default ClientPortalSettingsModal;