// src/components/modals/ClientPortalSettingsModal.jsx
import React, { useState } from "react";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal"; // adjust path
import { SwitchInput, TextInput } from "../../../Components/Input/Inputs"; // your SwitchInput
import { HiOutlineLink } from "react-icons/hi";

const ClientPortalSettingsModal = ({ isOpen, onClose }) => {
  const [enablePortal, setEnablePortal] = useState(false);
  const [allowReschedule, setAllowReschedule] = useState(true);
  const [allowDocumentSharing, setAllowDocumentSharing] = useState(false);

  const handleSave = () => {
    console.log("Portal Settings Saved:", {
      enablePortal,
      allowReschedule,
      allowDocumentSharing,
    });
    onClose();
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
      size="md"
    >
      <div className="space-y-6 py-4">
        {/* Enable Client Portal */}
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

        {/* Portal Address - Only show when enabled */}
        {enablePortal && (
          <div className="my-4">
            <label className="block text-sm font-medium text-gray-600 mb-3">
              Client Portal Address
            </label>

            <div className="flex items-center gap-3  ">
              {/* Read-only Input Field */}
              <div className=" relative pr-4">
                <div style={{ marginBottom: "-15px" }}>
                  <TextInput
                    type="text"
                    readOnly
                    value="https://noosphere/client-org.com"
                    width={300}
                  />
                </div>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    "https://noosphere/client-org.com"
                  );
                  // Optional: add toast later
                  alert("Copied to clipboard!");
                }}
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

        {/* Additional Permissions - Only show when portal is enabled */}
        {enablePortal && (
          <>
            <div className=" pt-6 space-y-5">
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
                      onChange={(e) =>
                        setAllowDocumentSharing(e.target.checked)
                      }
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
          </>
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
