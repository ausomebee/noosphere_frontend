import React, { useState, useEffect, useCallback } from "react";
import {
  FiMail,
  FiRefreshCw,
  FiEdit3,
  FiEye,
} from "react-icons/fi";
import { IoMdMove } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { LuCloudUpload } from "react-icons/lu";
import { CheckboxInput } from "../Input/Inputs";
import Button from "../Button/Button";
import "./ProspectPanel.css";
import "../ReusableModal/ReusableModal.css";
import Layout from "../../Pages/Layout/ControlLayout";
import { useNavigate, useParams } from "react-router-dom";
import EditProspectModal from "../ReusableModal/EditProspectModal";
import CustomTaskModal from "../ReusableModal/CustomTaskModal";
import CustomDocumentModal from "../ReusableModal/CustomDocumentModal";
import UploadDocumentModal from "../ReusableModal/UploadDocumentModal";
import MoveCandidateModal from "../ReusableModal/MoveCandidateModal";
import AssignCandidateModal from "../ReusableModal/AssignCandidateModal";
import { FaArrowLeft, FaDollarSign } from "react-icons/fa";
import Alert from "../Alert/Alert";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSinglePipelineItem,
  fetchSinglePipelineStages,
  fetchPipelineStages,
  updateStageDocuments,
  updateStageTasks,
  updatePipelineItemTaskToDone,
  updatePipelineItemDocumentToDone,
  selectPipelineItem,
  selectDraft,
  selectStatus,
  selectStages,
  selectColumns,
  updatePipelineItemActivity,
  reassignCandidateToStaff,
  deletePipelineItem,
  addTaskToDraft,
  addDocumentToDraft,
} from "../../ReduxStore/features/PipelineSlice";
import { FaCircleCheck } from "react-icons/fa6";
import api from "../../api/TenantApis";
import { showToast } from "../../Helper/ShowToast";
import { v4 as uuidv4 } from "uuid";

const PaymentLinkGeneratedModal = ({ isOpen, onClose, link }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copied to clipboard!", "success");
    } catch (err) {
      showToast("Failed to copy link", "error");
    }
  };

  return (
    <div className={`prospect-modal ${isOpen ? "open" : ""}`}>
      <div className="prospect-modal-content payment-link-modal">
        <div className="prospect-modal-icon">
          <FaCircleCheck size={48} color="#22c55e" />
        </div>
        <h3>Payment link generated</h3>
        <p>
          This link directs the recipient to the payment page to purchase a plan
        </p>
        <div className="payment-link-container">
          <span className="payment-link">{link}</span>
          <button className="copy-link-button" onClick={copyToClipboard}>
            Copy link
          </button>
        </div>
        <p className="expiry-note">
          This link expires in <strong>24 hours</strong>. You'll need to create
          a new one afterward.
        </p>
        <div className="prospect-modal-actions">
          <Button
            label="Send Payment Link"
            variant="primary"
            onClick={onClose}
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};

const PaymentActionsModal = ({
  isOpen,
  onClose,
  onRegenerate,
  generatedDate,
  paymentDate,
  expiryDate,
}) => {
  const paymentHistoryItems = [
    {
      text: `Payment link generated ${generatedDate || "N/A"}`,
      showButton: false,
    },
    {
      text: `Plan purchase payment made on ${paymentDate || "Not yet paid"}`,
      showButton: false,
    },
    {
      text: `Payment link expired ${expiryDate || "N/A"}`,
      showButton: true,
    },
  ];

  return (
    <div className={`prospect-modal ${isOpen ? "open" : ""}`}>
      <div className="prospect-modal-content payment-actions-modal">
        <h3>Payment Actions</h3>
        <div className="payment-history">
          {paymentHistoryItems.map((item, index) => (
            <div key={index} className="payment-history-item">
              <p>{item.text}</p>
              {item.showButton && (
                <Button
                  label="Regenerate link"
                  variant="primary"
                  onClick={onRegenerate}
                  width="auto"
                  className="history-button"
                />
              )}
            </div>
          ))}
        </div>
        <div className="payment-modal-actions">
          <Button
            label="Close"
            variant="outline"
            onClick={onClose}
            width="300px"
          />
        </div>
      </div>
    </div>
  );
};

const ProspectPanel = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pipelineStageId, pipelineItemId } = useParams();
  const token = useSelector((state) => state.authentication?.user?.token);

  const pipelineItem = useSelector(selectPipelineItem);
  const pipelineId = useSelector((state) => state.pipeline.pipeline?.id);
  const draft = useSelector(selectDraft);
  const status = useSelector(selectStatus);
  const stages = useSelector(selectStages);
  const columns = useSelector(selectColumns);

  const [candidate, setCandidate] = useState({
    id: "",
    company: "",
    contactPerson: "",
    email: "",
    phone: "",
    companySize: "",
    organizationType: "",
    location: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    leadSource: "",
    staff: null,
    progress: "0/0",
    paymentVerified: false,
  });

  const [fetchError, setFetchError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [doneTasks, setDoneTasks] = useState({});
  const [sentDocuments, setSentDocuments] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
  const [isCustomDocModalOpen, setIsCustomDocModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPaymentLinkGeneratedModalOpen, setIsPaymentLinkGeneratedModalOpen] =
    useState(false);
  const [isManagePaymentModalOpen, setIsManagePaymentModalOpen] =
    useState(false);
  const [isMoveCandidateModalOpen, setIsMoveCandidateModalOpen] =
    useState(false);
  const [isAssignCandidateModalOpen, setIsAssignCandidateModalOpen] =
    useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentLinkExpiry, setPaymentLinkExpiry] = useState(null);
  const [hasGeneratedPaymentBefore, setHasGeneratedPaymentBefore] =
    useState(false);
  const [staffList, setStaffList] = useState([]);
  const [localStages, setLocalStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const stageName = React.useMemo(() => {
    if (columns[pipelineStageId]) return columns[pipelineStageId].title;
    if (stages && pipelineStageId) {
      const foundStage = stages.find(
        (stage) => String(stage.stageId) === String(pipelineStageId)
      );
      return foundStage?.name || "Unknown";
    }
    return "Unknown";
  }, [columns, stages, pipelineStageId]);

  const fetchStaffAndStages = useCallback(async () => {
    if (!token) {
      setFetchError("Authentication token not available.");
      showToast("Authentication token not available.", "error");
      return;
    }

    try {
      const [adminsResponse, stagesResponse] = await Promise.all([
        api.getAllAdmins({
          accessToken: token,
          refreshToken: token,
        }),
        pipelineId
          ? api.GetPipelineStage({
              pipelineId,
              accessToken: token,
              refreshToken: token,
            })
          : Promise.resolve({ data: { data: [] } }),
      ]);

      const admins = adminsResponse.data?.data || [];
      setStaffList(
        admins.map((admin) => ({
          staffId: admin.id || `admin-${uuidv4()}`,
          name: admin.fullName || "Unknown Admin",
        }))
      );

      const stagesData = stagesResponse.data?.data || [];
      setLocalStages(
        stagesData.map((stage) => ({
          stageId: stage.id || `stage-${uuidv4()}`,
          name: stage.name || "Unnamed Stage",
        }))
      );
    } catch (err) {
      console.error("Failed to fetch staff or stages:", err);
      setFetchError("Failed to load staff or stages.");
      showToast("Failed to load staff or stages.", "error");
    }
  }, [token, pipelineId]);

  useEffect(() => {
    const hasGenerated = localStorage.getItem(
      `hasGeneratedPayment_${pipelineItemId}`
    );
    if (hasGenerated) {
      setHasGeneratedPaymentBefore(true);
    }

    const fetchData = async () => {
      if (!pipelineItemId || !pipelineStageId || !token) {
        setFetchError("Missing required parameters or authentication token.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        await Promise.all([
          dispatch(
            fetchSinglePipelineItem({
              itemId: pipelineItemId,
              accessToken: token,
              refreshToken: token,
            })
          ).unwrap(),
          dispatch(
            fetchSinglePipelineStages({
              pipelineStageId,
              accessToken: token,
              refreshToken: token,
            })
          ).unwrap(),
          dispatch(
            fetchPipelineStages({
              pipelineId,
              accessToken: token,
              refreshToken: token,
            })
          ).unwrap(),
          fetchStaffAndStages(),
        ]);
      } catch (err) {
        console.error("Failed to fetch pipeline data:", err);
        setFetchError("Failed to load pipeline data.");
        showToast("Failed to load pipeline data.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    dispatch,
    pipelineItemId,
    pipelineStageId,
    token,
    pipelineId,
    fetchStaffAndStages,
  ]);

  useEffect(() => {
    if (
      status !== "succeeded" ||
      !pipelineItem ||
      !pipelineItem.tenant ||
      !columns[pipelineStageId]
    ) {
      return;
    }

    try {
      const currentStage = columns[pipelineStageId];
      const requiredTasks = Array.isArray(currentStage?.requiredTasks)
        ? currentStage.requiredTasks.map((task) => task.name)
        : [];
      const requiredDocuments = Array.isArray(currentStage?.requiredDocuments)
        ? currentStage.requiredDocuments.map((doc) => doc.name)
        : [];
      const totalRequiredItems = requiredTasks.length + requiredDocuments.length;

      const doneTasksObj = requiredTasks.reduce(
        (acc, task) => ({
          ...acc,
          [task]: pipelineItem?.doneTasks?.[task] || false,
        }),
        {}
      );
      const sentDocumentsObj = requiredDocuments.reduce(
        (acc, doc) => ({
          ...acc,
          [doc]: pipelineItem?.sentDocuments?.[doc] || false,
        }),
        {}
      );

      const doneTasksCount = Object.values(doneTasksObj).filter(Boolean).length;
      const sentDocumentsCount = Object.values(sentDocumentsObj).filter(
        Boolean
      ).length;
      const progress = `${doneTasksCount + sentDocumentsCount}/${totalRequiredItems}`;

      setCandidate({
        id: pipelineItem?.tenant?.id || pipelineItemId,
        company: pipelineItem?.tenant?.companyName || "Unknown",
        contactPerson: pipelineItem?.tenant?.contactPerson || "N/A",
        email: pipelineItem?.tenant?.email || "N/A",
        phone: pipelineItem?.tenant?.phoneNumber || "N/A",
        companySize: pipelineItem?.tenant?.companySize || "N/A",
        organizationType: pipelineItem?.tenant?.organizationType || "N/A",
        location: pipelineItem?.tenant?.location?.address || "N/A",
        city: pipelineItem?.tenant?.location?.city || "",
        state: pipelineItem?.tenant?.location?.stateProvince|| "",
        zipCode: pipelineItem?.tenant?.location?.zip || "",
        country: pipelineItem?.tenant?.location?.country || "",
        leadSource: pipelineItem?.tenant?.leadSource || "N/A",
        staff: pipelineItem?.admin
          ? {
              staffId: pipelineItem.admin.id,
              name: pipelineItem.admin.fullName,
            }
          : null,
        progress,
        paymentVerified: pipelineItem?.paymentVerified || false,
      });

      setDoneTasks(doneTasksObj);
      setSentDocuments(sentDocumentsObj);
      setTasks(requiredTasks);
      setDocuments(requiredDocuments);
    } catch (err) {
      console.error("Error updating candidate state:", err);
      setFetchError("Failed to process candidate data.");
      showToast("Failed to process candidate data.", "error");
    }
  }, [pipelineItem, status, pipelineStageId, columns, pipelineItemId]);

  const handleGeneratePaymentLink = () => {
    const newLink = `https://pay.noosphere.com/subscriptionplans_${uuidv4()}`;
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    setPaymentLink(newLink);
    setPaymentLinkExpiry(expiryDate);
    setHasGeneratedPaymentBefore(true);
    localStorage.setItem(`hasGeneratedPayment_${pipelineItemId}`, "true");
    setIsPaymentLinkGeneratedModalOpen(true);
  };

  const handleRegenerateLink = () => {
    handleGeneratePaymentLink();
    setIsManagePaymentModalOpen(false);
  };

  const handleBackButtonClick = () => {
    navigate("/tenants/pipeline");
  };

  const handleEditProspect = (updatedCandidate) => {
    setCandidate((prev) => ({
      ...prev,
      company: updatedCandidate.companyName || updatedCandidate.company,
      contactPerson: updatedCandidate.contactPerson || prev.contactPerson,
      email: updatedCandidate.email || prev.email,
      phone: updatedCandidate.phone || prev.phone,
      companySize: updatedCandidate.companySize || prev.companySize,
      organizationType:
        updatedCandidate.organizationType || prev.organizationType,
      location: updatedCandidate.location || prev.location,
      city: updatedCandidate.city || prev.city,
      state: updatedCandidate.state || prev.state,
      zipCode: updatedCandidate.zipCode || prev.zipCode,
      country: updatedCandidate.country || prev.country,
      leadSource: updatedCandidate.leadSource || prev.leadSource,
    }));
    setIsEditModalOpen(false);
  };

  const handleAddTask = async (newTask) => {
    try {
      console.log("Adding task:", newTask);
      dispatch(
        addTaskToDraft({ name: newTask.name, required: newTask.required })
      );
      const updatedTasks = [...tasks, newTask.name];

      await dispatch(
        updateStageTasks({
          pipelineStageId,
          tasks: updatedTasks.map((name, i) => ({
            id: draft.requiredTasks[i]?.id || uuidv4(),
            name,
            required: draft.requiredTasks[i]?.required || false,
          })),
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      setTasks(updatedTasks);
      setDoneTasks((prev) => ({ ...prev, [newTask.name]: false }));
      setCandidate((prev) => ({
        ...prev,
        progress: `${
          Object.values(doneTasks).filter(Boolean).length
        }/${updatedTasks.length + documents.length}`,
      }));
      setIsCustomTaskModalOpen(false);
      showToast("Task added successfully!", "success");
    } catch (err) {
      console.error("Error adding task:", err);
      showToast("Failed to add task", "error");
    }
  };

  const handleAddDocument = async (newDocument) => {
    try {
      dispatch(
        addDocumentToDraft({
          name: newDocument.name,
          required: newDocument.required,
        })
      );
      const updatedDocuments = [...documents, newDocument.name];

      await dispatch(
        updateStageDocuments({
          pipelineStageId,
          documents: updatedDocuments.map((name, i) => ({
            id: draft.requiredDocuments[i]?.id || uuidv4(),
            name,
            required: draft.requiredDocuments[i]?.required || false,
          })),
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      setDocuments(updatedDocuments);
      setSentDocuments((prev) => ({ ...prev, [newDocument.name]: false }));
      setCandidate((prev) => ({
        ...prev,
        progress: `${
          Object.values(sentDocuments).filter(Boolean).length
        }/${tasks.length + updatedDocuments.length}`,
      }));
      setIsCustomDocModalOpen(false);
      showToast("Document added successfully!", "success");
    } catch (err) {
      showToast("Failed to add document", "error");
    }
  };

  const handleUploadFiles = async (files) => {
    if (!files.length) return;

    try {
      const newDocName = files[0].name;
      dispatch(addDocumentToDraft({ name: newDocName, required: false }));
      const updatedDocuments = [...documents, newDocName];

      await dispatch(
        updateStageDocuments({
          pipelineStageId,
          documents: updatedDocuments.map((name, i) => ({
            id: draft.requiredDocuments[i]?.id || uuidv4(),
            name,
            required: draft.requiredDocuments[i]?.required || false,
          })),
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      const updatedSentDocuments = {
        ...sentDocuments,
        [newDocName]: true,
      };

      await dispatch(
        updatePipelineItemDocumentToDone({
          pipelineItemId,
          documents: updatedSentDocuments,
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      setDocuments(updatedDocuments);
      setSentDocuments(updatedSentDocuments);
      setCandidate((prev) => ({
        ...prev,
        progress: `${
          Object.values(updatedSentDocuments).filter(Boolean).length +
          Object.values(doneTasks).filter(Boolean).length
        }/${tasks.length + updatedDocuments.length}`,
      }));
      setIsUploadModalOpen(false);
      showToast("Document uploaded successfully!", "success");
    } catch (err) {
      showToast("Failed to upload document", "error");
    }
  };

  const handleTaskDoneToggle = async (taskName) => {
    try {
      const updatedDoneTasks = {
        ...doneTasks,
        [taskName]: !doneTasks[taskName],
      };

      await dispatch(
        updatePipelineItemTaskToDone({
          pipelineItemId,
          doneTasks: updatedDoneTasks,
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      setDoneTasks(updatedDoneTasks);
      setCandidate((prev) => ({
        ...prev,
        progress: `${
          Object.values(updatedDoneTasks).filter(Boolean).length +
          Object.values(sentDocuments).filter(Boolean).length
        }/${tasks.length + documents.length}`,
      }));
    } catch (err) {
      showToast("Failed to update task status", "error");
    }
  };

  const handleDocumentSentToggle = async (docName) => {
    try {
      const updatedSentDocuments = {
        ...sentDocuments,
        [docName]: !sentDocuments[docName],
      };

      await dispatch(
        updatePipelineItemDocumentToDone({
          pipelineItemId,
          documents: updatedSentDocuments,
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      setSentDocuments(updatedSentDocuments);
      setCandidate((prev) => ({
        ...prev,
        progress: `${
          Object.values(doneTasks).filter(Boolean).length +
          Object.values(updatedSentDocuments).filter(Boolean).length
        }/${tasks.length + documents.length}`,
      }));
    } catch (err) {
      showToast("Failed to update document status", "error");
    }
  };

  const handleMoveCandidate = async (targetStageId) => {
    if (targetStageId === pipelineStageId) return;

    setIsLoading(true);
    try {
      const targetColumn = columns[targetStageId];
      const totalRequiredItems =
        (targetColumn?.requiredTasks?.length || 0) +
        (targetColumn?.requiredDocuments?.length || 0);

      const response = await dispatch(
        updatePipelineItemActivity({
          ids: [pipelineItemId],
          pipelineStageId: targetStageId,
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      if (response.status === "ok") {
        setCandidate((prev) => ({
          ...prev,
          progress: `0/${totalRequiredItems}`,
        }));
        setTasks(targetColumn?.requiredTasks?.map((task) => task.name) || []);
        setDocuments(
          targetColumn?.requiredDocuments?.map((doc) => doc.name) || []
        );
        setDoneTasks(
          targetColumn?.requiredTasks?.reduce(
            (acc, task) => ({
              ...acc,
              [task.name]: false,
            }),
            {}
          ) || {}
        );
        setSentDocuments(
          targetColumn?.requiredDocuments?.reduce(
            (acc, doc) => ({
              ...acc,
              [doc.name]: false,
            }),
            {}
          ) || {}
        );
        showToast("Candidate moved successfully!", "success");
        navigate(
          `/tenants/candidate-single/${targetStageId}/${pipelineItemId}`
        );
        // Notify JiraBoard to refresh
        dispatch({ type: "pipeline/refreshBoard" });
      }
    } catch (error) {
      console.error("Failed to move candidate:", error);
      showToast(error?.message || "Failed to move candidate", "error");
    } finally {
      setIsLoading(false);
      setIsMoveCandidateModalOpen(false);
    }
  };

  const handleAssignToStaff = async (staffId) => {
    setIsLoading(true);
    try {
      const staff = staffList.find((s) => s.staffId === staffId) || null;
      const response = await dispatch(
        reassignCandidateToStaff({
          ids: [pipelineItemId],
          assignToAdmin: staffId,
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      if (response.status === "ok") {
        setCandidate((prev) => ({
          ...prev,
          staff: staff ? { staffId: staff.staffId, name: staff.name } : null,
        }));
        showToast("Staff assigned successfully!", "success");
      }
    } catch (error) {
      console.error("Failed to assign staff:", error);
      showToast(error?.message || "Failed to assign staff", "error");
    } finally {
      setIsLoading(false);
      setIsAssignCandidateModalOpen(false);
    }
  };

  const handleDeleteProspect = async () => {
    setIsLoading(true);
    try {
      const response = await dispatch(
        deletePipelineItem({
          ids: [pipelineItemId],
          accessToken: token,
          refreshToken: token,
        })
      ).unwrap();

      if (response.status === "ok") {
        showToast("Prospect deleted successfully!", "success");
        navigate("/tenants/pipeline");
      }
    } catch (error) {
      console.error("Failed to delete prospect:", error);
      showToast(error?.message || "Failed to delete prospect", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return <div>Please log in to view this page.</div>;
  }

  const title =
    candidate.company && stageName
      ? `${candidate.company} - ${stageName}`
      : "Prospecting";

  const doneTasksCount = Object.values(doneTasks).filter(Boolean).length;
  const totalTasksCount = tasks.length;
  const sentDocumentsCount = Object.values(sentDocuments).filter(Boolean).length;
  const totalDocumentsCount = documents.length;

  console.log(candidate)

  return (
    <Layout>
      <div className="prospect-panel">
        <div className="top-bar-container">
          <div className="top-bar">
            <button
              onClick={handleBackButtonClick}
              className="back-button"
              disabled={isLoading}
            >
              <FaArrowLeft /> Back
            </button>
            <h2 className="prospect-title">{title}</h2>
          </div>
        </div>
        {fetchError && (
          <Alert
            message={fetchError}
            variant="error"
            primaryAction={{
              label: "Retry",
              onClick: () => window.location.reload(),
            }}
          />
        )}
        {hasGeneratedPaymentBefore ? (
          <Alert
            message="Payment link has been generated for this candidate"
            variant="info"
            primaryAction={{
              label: "See More",
              icon: <FiEye size={16} />,
              onClick: () => setIsManagePaymentModalOpen(true),
            }}
          />
        ) : (
          <Alert
            message="No Payment has been recorded for this candidate"
            variant="warning"
            primaryAction={{
              label: "Generate payment link",
              onClick: handleGeneratePaymentLink,
            }}
          />
        )}
        <div className="prospect-layout">
          <div className="prospect-left">
            <div className="org-header">
              <h3>{candidate.company}</h3>
              <div
                className="org-edit"
                onClick={() => setIsEditModalOpen(true)}
              >
                <FiEdit3 size={20} />
                <button className="edit-link">Edit</button>
              </div>
            </div>
            <div className="org-info">
              <div className="org-info-item">
                <span>Payment Status</span>
                <span
                  className={`payment-status ${
                    candidate.paymentVerified ? "Verified" : "Unverified"
                  }`}
                >
                  <span className="status-dot"></span>
                  {candidate.paymentVerified ? "Verified" : "Unverified"}
                </span>
              </div>
              <div className="org-info-item">
                <span>Assign to</span>
                <span>{candidate.staff?.name || "Unassigned"}</span>
              </div>
              <div className="org-info-item">
                <span>Onboard Stage</span>
                <span>{stageName}</span>
              </div>
              <div className="org-info-item">
                <span>Contact Person</span>
                <span>{candidate.contactPerson || "N/A"}</span>
              </div>
              <div className="org-info-item">
                <span>Email</span>
                <span>{candidate.email || "N/A"}</span>
              </div>
              <div className="org-info-item">
                <span>Phone</span>
                <span>{candidate.phone || "N/A"}</span>
              </div>
              <div className="org-info-item">
                <span>Company size</span>
                <span>{candidate.companySize || "N/A"}</span>
              </div>
              <div className="org-info-item">
                <span>Org. Type</span>
                <span>{candidate.organizationType || "N/A"}</span>
              </div>
              {candidate.location && (
                <div className="org-info-item">
                  <span>Street</span>
                  <span>{candidate.location}</span>
                </div>
              )}
              {candidate.city && (
                <div className="org-info-item">
                  <span>City</span>
                  <span>{candidate.city}</span>
                </div>
              )}
              {candidate.state && (
                <div className="org-info-item">
                  <span>State/Province</span>
                  <span>{candidate.state}</span>
                </div>
              )}
              {candidate.zipCode && (
                <div className="org-info-item">
                  <span>ZIP</span>
                  <span>{candidate.zipCode}</span>
                </div>
              )}
              {candidate.country && (
                <div className="org-info-item">
                  <span>Country</span>
                  <span>{candidate.country}</span>
                </div>
              )}
            </div>
            <div className="org-actions">
              <p className="org-actions-title">Actions</p>
              <div className="org-action-item">
                <Button
                  label={
                    hasGeneratedPaymentBefore
                      ? "Manage Payment Actions"
                      : "Generate payment link"
                  }
                  icon={<FaDollarSign size={20} />}
                  variant="important"
                  iconPosition="left"
                  onClick={
                    hasGeneratedPaymentBefore
                      ? () => setIsManagePaymentModalOpen(true)
                      : handleGeneratePaymentLink
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="org-action-item">
                <Button
                  label="Move Candidate"
                  icon={<IoMdMove size={20} />}
                  variant="action"
                  iconPosition="left"
                  onClick={() => setIsMoveCandidateModalOpen(true)}
                  disabled={isLoading}
                />
              </div>
              <div className="org-action-item">
                <Button
                  label="Send an email"
                  icon={<FiMail size={20} />}
                  variant="action"
                  iconPosition="left"
                  disabled={isLoading}
                />
              </div>
              <div className="org-action-item">
                <Button
                  label="Reassign to Staff"
                  icon={<FiRefreshCw size={20} />}
                  variant="action"
                  iconPosition="left"
                  onClick={() => setIsAssignCandidateModalOpen(true)}
                  disabled={isLoading}
                />
              </div>
              <div className="org-action-item no-border">
                <Button
                  label="Delete prospect"
                  icon={<RxCross2 size={20} />}
                  variant="action-danger"
                  iconPosition="left"
                  iconSize={24}
                  onClick={handleDeleteProspect}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
          <div className="prospect-right">
            <div className="tasks-docs">
              <div className="section">
                <div className="section-header">
                  <h4>Tasks</h4>
                  <span className="section-subtext">
                    {doneTasksCount}/{totalTasksCount} tasks done
                  </span>
                </div>
                {tasks.length === 0 && status === "succeeded" && (
                  <p>No tasks assigned.</p>
                )}
                <div className="section-list">
                  {tasks.map((task, index) => (
                    <div key={`${task}-${index}`} className="section-item">
                      <label>{task}</label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <CheckboxInput
                          label="Done"
                          checked={doneTasks[task] || false}
                          onChange={() => handleTaskDoneToggle(task)}
                          disabled={isLoading}
                        />
                        <span>
                          {draft.requiredTasks?.[index]?.required
                            ? "Required"
                            : "Not Required"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="section-footer">
                  <Button
                    label="Add a custom task"
                    variant="outline"
                    onClick={() => setIsCustomTaskModalOpen(true)}
                    width="auto"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="section">
                <div className="section-header">
                  <h4>Documents</h4>
                  <span className="section-subtext">
                    {sentDocumentsCount}/{totalDocumentsCount} uploaded
                  </span>
                </div>
                {documents.length === 0 && status === "succeeded" && (
                  <p>No documents required.</p>
                )}
                <div className="section-list">
                  {documents.map((doc, index) => (
                    <div key={`${doc}-${index}`} className="section-item">
                      <label>{doc}</label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <CheckboxInput
                          label="Uploaded"
                          checked={sentDocuments[doc] || false}
                          onChange={() => handleDocumentSentToggle(doc)}
                          disabled={isLoading}
                        />
                        <span>
                          {draft.requiredDocuments?.[index]?.required
                            ? "Required"
                            : "Not Required"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="doc-actions">
                  <Button
                    label="Add custom document request"
                    variant="outline"
                    onClick={() => setIsCustomDocModalOpen(true)}
                    width="auto"
                    disabled={isLoading}
                  />
                  {/* <Button
                    icon={<LuCloudUpload size={20} />}
                    iconPosition="left"
                    label="Upload a document"
                    variant="dark"
                    onClick={() => setIsUploadModalOpen(true)}
                    width="auto"
                    disabled={isLoading}
                  /> */}
                </div>
              </div>
            </div>
          </div>
        </div>
        <EditProspectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEditProspect}
          formData={candidate}
          staffList={staffList}
          stages={localStages}
        />
        <CustomTaskModal
          isOpen={isCustomTaskModalOpen}
          onClose={() => setIsCustomTaskModalOpen(false)}
          onSave={handleAddTask}
        />
        <CustomDocumentModal
          isOpen={isCustomDocModalOpen}
          onClose={() => setIsCustomDocModalOpen(false)}
          onSave={handleAddDocument}
        />
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleUploadFiles}
        />
        <PaymentLinkGeneratedModal
          isOpen={isPaymentLinkGeneratedModalOpen}
          onClose={() => setIsPaymentLinkGeneratedModalOpen(false)}
          link={paymentLink}
        />
        <PaymentActionsModal
          isOpen={isManagePaymentModalOpen}
          onClose={() => setIsManagePaymentModalOpen(false)}
          onRegenerate={handleRegenerateLink}
          generatedDate={
            paymentLinkExpiry
              ? new Date(
                  paymentLinkExpiry.getTime() - 24 * 60 * 60 * 1000
                ).toLocaleString()
              : "N/A"
          }
          paymentDate="Not yet paid"
          expiryDate={
            paymentLinkExpiry ? paymentLinkExpiry.toLocaleString() : "N/A"
          }
        />
        <MoveCandidateModal
          isOpen={isMoveCandidateModalOpen}
          onClose={() => setIsMoveCandidateModalOpen(false)}
          onSave={handleMoveCandidate}
          columns={Object.keys(columns).map((colId) => ({
            id: colId,
            title: columns[colId].title,
          }))}
          currentColumnId={pipelineStageId}
          taskIds={[pipelineItemId]}
          accessToken={token}
          refreshToken={token}
          dispatch={dispatch}
        />
        <AssignCandidateModal
          isOpen={isAssignCandidateModalOpen}
          onClose={() => setIsAssignCandidateModalOpen(false)}
          onSave={handleAssignToStaff}
          taskIds={[pipelineItemId]}
          tasks={{ [pipelineItemId]: candidate }}
          staffList={staffList}
        />
      </div>
    </Layout>
  );
};

export default ProspectPanel;