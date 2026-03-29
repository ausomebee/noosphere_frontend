import React, { useState, useEffect } from "react";
import useAuth from "../../../../../hooks/useAuth";
import ReusableModal from "../../../ReusableModal";
import { TextInput, SelectInput } from "../../../../Input/Inputs";
import "./BuildDocumentModal.css";
import api from "../../../../../api/AppointmentApi";
import { useParams } from "react-router-dom";
import { showToast } from "../../../../../Helper/ShowToast";

const SECTIONS_CONFIG = [
  { id: "clientInformation", label: "Client Information" },
  { id: "assessments", label: "Assessments" },
  { id: "targetBehaviours", label: "Target Behaviours" },
  { id: "behaviourStrategies", label: "Behaviour Strategies" },
  { id: "goalsTargets", label: "Goals & Targets" },
  { id: "monitoringData", label: "Monitoring & Data Collection" },
  { id: "implementationNotes", label: "Implementation Notes" },
  { id: "crisisSafety", label: "Crisis & Safety Plan" },
  { id: "generalization", label: "Generalization & Maintenance" },
  { id: "review", label: "Review" },
  { id: "discharge", label: "Discharge" },
  { id: "consentSignatures", label: "Consent & Signatures" },
];

const BuildDocumentModal = ({
  isOpen,
  onClose,
  templateData,
  onStartCreating,
  clientData,
}) => {
  const { tenantId, userId, accessToken, refreshToken } = useAuth();
    const { tenantClientId } = useParams();

  const [formData, setFormData] = useState({
    title: "",
    clientId: "",
    clientName: "",
    creatorId: "",
    creatorName: "",
    approverId: "",
    approverName: "",
  });

 
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Determine mode based on whether templateData is provided
  const mode = templateData ? "fromTemplate" : "fromScratch";

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchStaff();
    }
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (templateData) {
      // Case 3: Using template from library
      setFormData((prev) => ({
        ...prev,
        title: templateData.name || "",
      }));
    } else {
      // Case 2: Building new document from scratch
      setFormData((prev) => ({
        ...prev,
        title: "",
      }));
    }
  }, [templateData, isOpen]);

  // Auto-populate client info
  useEffect(() => {
    if (clientData) {
      const clientNames =
        `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim();
      const initials =
        `${clientData.firstName?.[0] || ""}${clientData.lastName?.[0] || ""}`.toUpperCase();

      setFormData((prev) => ({
        ...prev,
        clientId: tenantClientId || clientData.id,
        clientName: clientNames,
        clientInitials: initials,
      }));
    }
  }, [clientData]);

  // Auto-populate creator based on logged-in user
  useEffect(() => {
    if (userId && staffList.length > 0) {
      const currentUser = staffList.find((staff) => staff.id === userId);
      if (currentUser) {
        setFormData((prev) => ({
          ...prev,
          creatorId: currentUser.id,
          creatorName: `${currentUser.fullName}`,
        }));
      }
    }
  }, [userId, staffList]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await api.GetTenantStaffByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const staff = response.data?.data || [];
      setStaffList(staff);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      showToast("Failed to load staff list", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // If approver changed, update approver name
      if (field === "approverId") {
        const selectedStaff = staffList.find((s) => s.id === value);
        updated.approverName = selectedStaff ? `${selectedStaff.fullName}` : "";
      }

      return updated;
    });
  };


  const handleStartCreating = () => {
    // Collect the initial metadata
    const metadata = {
      documentTitle: formData.title,
      approver: formData.approverName,
      approverId: formData.approverId,
      createdBy: formData.creatorName,
      creatorId: formData.creatorId,
      client: {
        name: `${formData.clientName}`,
        initials: formData.clientInitials || "??",
      },
      clientTenantId: formData.clientId,
      tenantId: tenantId,
      // Wrap in { client: ... } so ClinicalReportBuilder can access clientData.client.firstName etc.
      clientData: clientData ? { client: clientData } : {},
    };

    // Transform template sections if available
    let activeSections = [];
    let sectionData = {};

    if (templateData?.sections) {
      templateData.sections.forEach((section) => {
        // Find section ID from label
        const sectionConfig = SECTIONS_CONFIG.find(
          (s) => s.label === section.section,
        );
        const sectionId =
          sectionConfig?.id ||
          section.section.toLowerCase().replace(/\s+/g, "");

        activeSections.push(sectionId);

        // Template sections store data in .content, unwrap .items for array-based sections
        let content = section.content || {};
        if (content.items) content = content.items;
        sectionData[sectionId] = content;
      });
    }

    const dataToSend = {
      formData: {
        activeSections,
        sectionData,
      },
      metadata,
      mode,
    };

    onStartCreating(dataToSend);
    onClose();
  };

  const approverOptions = [
    { value: "", label: "Select" },
    ...staffList.map((staff) => ({
      value: staff.id,
      label: `${staff.fullName}`,
    })),
  ];

  const isFormValid = formData.title && formData.approverId;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Build a new document"
      primaryButtonText="Start Creating"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleStartCreating}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={loading}
      primaryButtonDisabled={!isFormValid || loading}
      size="lg"
    >
      <div className="build-document-content">
        <TextInput
          label="Document/Report Title"
          placeholder="Type something"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />

        <TextInput
          label="Client"
          value={formData.clientName || "Auto-populated"}
          disabled
        />

        <TextInput
          label="Creator"
          value={formData.creatorName || "Auto-populated"}
          disabled
        />

        <SelectInput
          label="Approver/Supervisor"
          placeholder="Select"
          value={formData.approverId}
          onChange={(e) => handleChange("approverId", e.target.value)}
          options={approverOptions}
          required
          disabled={loading}
        />
      </div>
    </ReusableModal>
  );
};

export default BuildDocumentModal;
