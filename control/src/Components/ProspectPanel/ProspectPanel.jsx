import React, { useState, useEffect, useCallback } from "react";
import {
  FiMail,
  FiRefreshCw,
  FiEdit3,
  FiEye,
  FiTrash2,
} from "react-icons/fi";
import { IoMdMove } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { LuCloudUpload } from "react-icons/lu";
import { CheckboxInput, RadioInput, SelectInput } from "../Input/Inputs";
import Button from "../Button/Button";
import { SectionSpinner } from "../LoadingSpinner";
import "./ProspectPanel.css";
import "../ReusableModal/ReusableModal.css";
import { frequencyOptions } from "../../Data/selectOptions";

import { useNavigate, useParams } from "react-router-dom";
import EditProspectModal from "../ReusableModal/EditProspectModal";
import CustomTaskModal from "../ReusableModal/CustomTaskModal";
import CustomDocumentModal from "../ReusableModal/CustomDocumentModal";
import UploadDocumentModal from "../ReusableModal/UploadDocumentModal";
import MoveCandidateModal from "../ReusableModal/MoveCandidateModal";
import AssignCandidateModal from "../ReusableModal/AssignCandidateModal";
import ReusableModal from "../ReusableModal/ReusableModal";
import DeleteConfirmationModal from "../ReusableModal/DeleteConfirmationModal";
import SendEmailModal from "../ReusableModal/SendEmailModal";
import { FaArrowLeft, FaDollarSign } from "react-icons/fa";
import Alert from "../Alert/Alert";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../hooks/useAuth";
import usePermission from "../../hooks/usePermission";
import {
  fetchSinglePipelineItem,
  fetchSinglePipelineStages,
  fetchPipelineStages,
  updateStageDocuments,
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
  addDocumentToDraft,
} from "../../ReduxStore/features/PipelineSlice";
import api from "../../api/TenantApis";
import billingApi from "../../api/BillingApis";
import invoiceApi from "../../api/InvoiceApi";
import { showToast, showApiError } from "../../Helper/ShowToast";
import { v4 as uuidv4 } from "uuid";

const getFrequencyPayload = (freq) => {
  if (freq === "monthly") return { billingFrequency: "Monthly", quantity: 1 };
  const match = freq.match(/^(\d+)_years?$/);
  if (match) return { billingFrequency: "Yearly", quantity: parseInt(match[1], 10) };
  return { billingFrequency: "Monthly", quantity: 1 };
};

const formatEventLabel = (event) => {
  switch (event) {
    case "PAYMENT_LINK_GENERATED": return "Payment link generated";
    case "PAYMENT_LINK_REGENERATED": return "Payment link regenerated";
    case "PAYMENT_LINK_EXPIRED": return "Payment link expired";
    case "PAYMENT_LINK_PAID": return "Plan purchase payment made on";
    default: return event;
  }
};

const formatHistoryDate = (isoString) => {
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yy}, ${hh}:${min}`;
};

const ProspectPanel = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pipelineStageId, pipelineItemId } = useParams();
  const { accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermission();
  const canGeneratePayment = hasPermission("generate_payment_link");

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
    subdomain: "",
    staff: null,
    progress: "0/0",
    paymentVerified: false,
  });

  const [fetchError, setFetchError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [doneTasks, setDoneTasks] = useState({});
  const [sentDocuments, setSentDocuments] = useState({});
  const [customTasks, setCustomTasks] = useState([]);
  const [customDocuments, setCustomDocuments] = useState([]);
  const [editingCustomTask, setEditingCustomTask] = useState(null);
  const [editingCustomDocument, setEditingCustomDocument] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
  const [isCustomDocModalOpen, setIsCustomDocModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState("Plan Settings");
  const [isMoveCandidateModalOpen, setIsMoveCandidateModalOpen] =
    useState(false);
  const [isAssignCandidateModalOpen, setIsAssignCandidateModalOpen] =
    useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [hasGeneratedPaymentBefore, setHasGeneratedPaymentBefore] =
    useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState("STANDARD");
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [renewalFrequency, setRenewalFrequency] = useState("");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
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
    if (!accessToken) {
      setFetchError("Authentication token not available.");
      showToast("Authentication token not available.", "error");
      return;
    }

    try {
      const [adminsResponse, stagesResponse] = await Promise.all([
        api.getAllAdmins({
          accessToken,
          refreshToken,
        }),
        pipelineId
          ? api.GetPipelineStage({
              pipelineId,
              accessToken,
              refreshToken,
            })
          : Promise.resolve({ data: { data: [] } }),
      ]);

      const admins = adminsResponse.data?.data || [];
      setStaffList(
        admins.map((admin) => ({
          staffId: admin.id || `admin-${uuidv4()}`,
          name: `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Unknown Admin",
          active: admin.active,
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
      if (import.meta.env.DEV) console.error("Failed to fetch staff or stages:", err);
      setFetchError("Failed to load staff or stages.");
    }
  }, [accessToken, refreshToken, pipelineId]);

  const fetchPlans = useCallback(async (planType) => {
    try {
      setLoadingPlans(true);
      const response = await billingApi.GetPlanByPlanType({
        planType,
        accessToken,
        refreshToken,
      });
      const activePlans = (response.data || []).filter((p) => p.active);
      setPlans(activePlans);
      setSelectedPlanId("");
      setSelectedPlan(null);
    } catch (err) {
      showApiError(err, "LOAD_PLANS");
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, [accessToken, refreshToken]);

  useEffect(() => {
    if (isPaymentModalOpen) {
      fetchPlans(selectedPlanType);
    }
  }, [selectedPlanType, isPaymentModalOpen, fetchPlans]);

  useEffect(() => {
    const hasGenerated = localStorage.getItem(
      `hasGeneratedPayment_${pipelineItemId}`
    );
    if (hasGenerated) {
      setHasGeneratedPaymentBefore(true);
    }

    const fetchData = async () => {
      if (!pipelineItemId || !pipelineStageId || !accessToken) {
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
              accessToken,
              refreshToken,
            })
          ).unwrap(),
          dispatch(
            fetchSinglePipelineStages({
              pipelineStageId,
              accessToken,
              refreshToken,
            })
          ).unwrap(),
          dispatch(
            fetchPipelineStages({
              pipelineId,
              accessToken,
              refreshToken,
            })
          ).unwrap(),
          fetchStaffAndStages(),
        ]);
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to fetch pipeline data:", err);
        setFetchError("Failed to load pipeline data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    dispatch,
    pipelineItemId,
    pipelineStageId,
    accessToken,
    refreshToken,
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
        subdomain: pipelineItem?.tenant?.subdomain || "",
        staff: pipelineItem?.admin
          ? {
              staffId: pipelineItem.admin.id,
              name: `${pipelineItem.admin.firstName || ""} ${pipelineItem.admin.lastName || ""}`.trim(),
            }
          : null,
        progress,
        paymentVerified: pipelineItem?.paymentVerified || false,
        subscriptionStatus: pipelineItem?.tenant?.Subscription?.[0]?.status || null,
        paymentStatus: pipelineItem?.tenant?.Subscription?.[0]?.payment?.status || null,
      });

      setDoneTasks(doneTasksObj);
      setSentDocuments(sentDocumentsObj);
      setTasks(requiredTasks);
      setDocuments(requiredDocuments);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error updating candidate state:", err);
      setFetchError("Failed to process candidate data.");
      showToast("Failed to process candidate data.", "error");
    }
  }, [pipelineItem, status, pipelineStageId, columns, pipelineItemId]);

  // --- Fetch custom tasks & documents for this pipeline item ---
  useEffect(() => {
    if (!pipelineItemId || !accessToken) return;
    const fetchCustomItems = async () => {
      try {
        const [tasksRes, docsRes] = await Promise.all([
          api.GetCustomTasks({ pipelineItemId, accessToken, refreshToken }),
          api.GetCustomDocuments({ pipelineItemId, accessToken, refreshToken }),
        ]);
        setCustomTasks(Array.isArray(tasksRes?.data) ? tasksRes.data : []);
        setCustomDocuments(Array.isArray(docsRes?.data) ? docsRes.data : []);
      } catch (err) {
        if (import.meta.env.DEV) console.error("Error fetching custom items:", err);
      }
    };
    fetchCustomItems();
  }, [pipelineItemId, accessToken, refreshToken]);

  // --- Payment Modal Logic ---
  const handleOpenPaymentModal = (tab = "Plan Settings") => {
    setPaymentModalTab(tab);
    if (!hasGeneratedPaymentBefore) {
      setSelectedPlanType("STANDARD");
      setSelectedPlanId("");
      setSelectedPlan(null);
    }
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    setSelectedPlan(plan || null);
  };

  const handleGenerateLinks = async () => {
    if (!selectedPlanId) {
      showToast("Please select a plan", "error");
      return;
    }
    if (!renewalFrequency) {
      showToast("Please select a renewal frequency", "error");
      return;
    }
    setIsGeneratingLink(true);
    try {
      const { billingFrequency, quantity } = getFrequencyPayload(renewalFrequency);
      const res = await invoiceApi.GeneratePaymentLink({
        tenantId: candidate.id,
        planId: selectedPlanId,
        billingFrequency,
        quantity,
        accessToken,
        refreshToken,
      });
      setGeneratedLink(res.data || null);
      setHasGeneratedPaymentBefore(true);
      localStorage.setItem(`hasGeneratedPayment_${pipelineItemId}`, "true");
      setPaymentModalTab("Payment Link");
      showToast("Payment link generated successfully!", "success");
    } catch (err) {
      showApiError(err, "GENERATE_PAYMENT_LINK");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async (url) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast("Link copied to clipboard!", "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  const fetchInvoiceHistory = useCallback(async () => {
    if (!candidate?.id) return;
    try {
      setIsLoadingHistory(true);
      const res = await invoiceApi.GetInvoiceHistory({
        tenantId: candidate.id,
        accessToken,
        refreshToken,
      });
      setInvoiceHistory(res.data || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to fetch invoice history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [candidate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isPaymentModalOpen && paymentModalTab === "Payment Link") {
      fetchInvoiceHistory();
    }
  }, [isPaymentModalOpen, paymentModalTab, fetchInvoiceHistory]);

  const handleRegenerateLink = async () => {
    if (!candidate?.id) return;
    try {
      setIsGeneratingLink(true);
      const res = await invoiceApi.RegeneratePaymentLink({
        tenantId: candidate.id,
        accessToken,
        refreshToken,
      });
      setGeneratedLink(res.data || null);
      showToast("Payment link regenerated!", "success");
      fetchInvoiceHistory();
    } catch (err) {
      showApiError(err, "REGENERATE_PAYMENT_LINK");
    } finally {
      setIsGeneratingLink(false);
    }
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
      subdomain: updatedCandidate.subdomain || prev.subdomain,
    }));
    setIsEditModalOpen(false);
  };

  const handleAddTask = async (newTask) => {
    try {
      const result = await api.CreateCustomTask({
        pipelineItemId,
        taskName: newTask.name,
        isRequired: newTask.required,
        accessToken,
        refreshToken,
      });
      const created = result?.data || { id: Date.now(), taskName: newTask.name, isRequired: newTask.required, isCompleted: false };
      setCustomTasks((prev) => [...prev, created]);
      setIsCustomTaskModalOpen(false);
      showToast("Task added successfully!", "success");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error adding task:", err);
      showToast("Failed to add task", "error");
    }
  };

  const handleAddDocument = async (newDocument) => {
    try {
      const result = await api.CreateCustomDocument({
        pipelineItemId,
        documentName: newDocument.name,
        isRequired: newDocument.required,
        accessToken,
        refreshToken,
      });
      const created = result?.data || { id: Date.now(), documentName: newDocument.name, isRequired: newDocument.required };
      setCustomDocuments((prev) => [...prev, created]);
      setIsCustomDocModalOpen(false);
      showToast("Document added successfully!", "success");
    } catch {
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
          requiredDocuments: updatedDocuments.map((name, i) => ({
            id: draft.requiredDocuments[i]?.id || uuidv4(),
            name,
            required: draft.requiredDocuments[i]?.required || false,
          })),
          accessToken,
          refreshToken,
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
          accessToken,
          refreshToken,
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
    } catch {
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
          accessToken,
          refreshToken,
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
    } catch {
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
          accessToken,
          refreshToken,
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
    } catch {
      showToast("Failed to update document status", "error");
    }
  };

  const handleCustomTaskToggle = async (customTask) => {
    try {
      await api.UpdateCustomTask({
        id: customTask.id,
        taskName: customTask.taskName,
        isRequired: customTask.isRequired,
        isCompleted: !customTask.isCompleted,
        accessToken,
        refreshToken,
      });
      setCustomTasks((prev) =>
        prev.map((t) => t.id === customTask.id ? { ...t, isCompleted: !t.isCompleted } : t)
      );
    } catch {
      showToast("Failed to update custom task", "error");
    }
  };

  const handleDeleteCustomTask = async (customTaskId) => {
    try {
      await api.DeleteCustomTask({ id: customTaskId, accessToken, refreshToken });
      setCustomTasks((prev) => prev.filter((t) => t.id !== customTaskId));
      showToast("Custom task deleted", "success");
    } catch {
      showToast("Failed to delete custom task", "error");
    }
  };

  const handleDeleteCustomDocument = async (customDocId) => {
    try {
      await api.DeleteCustomDocument({ id: customDocId, accessToken, refreshToken });
      setCustomDocuments((prev) => prev.filter((d) => d.id !== customDocId));
      showToast("Custom document deleted", "success");
    } catch {
      showToast("Failed to delete custom document", "error");
    }
  };

  const handleCustomDocumentToggle = async (customDoc) => {
    try {
      await api.UpdateCustomDocument({
        id: customDoc.id,
        documentName: customDoc.documentName,
        isRequired: customDoc.isRequired,
        isCompleted: !customDoc.isCompleted,
        accessToken,
        refreshToken,
      });
      setCustomDocuments((prev) =>
        prev.map((d) => d.id === customDoc.id ? { ...d, isCompleted: !d.isCompleted } : d)
      );
    } catch {
      showToast("Failed to update custom document", "error");
    }
  };

  const handleUpdateCustomTask = async (updated) => {
    if (!editingCustomTask) return;
    try {
      await api.UpdateCustomTask({
        id: editingCustomTask.id,
        taskName: updated.name,
        isRequired: updated.required,
        isCompleted: editingCustomTask.isCompleted,
        accessToken,
        refreshToken,
      });
      setCustomTasks((prev) =>
        prev.map((t) => t.id === editingCustomTask.id
          ? { ...t, taskName: updated.name, isRequired: updated.required }
          : t)
      );
      setEditingCustomTask(null);
      showToast("Custom task updated", "success");
    } catch {
      showToast("Failed to update custom task", "error");
    }
  };

  const handleUpdateCustomDocument = async (updated) => {
    if (!editingCustomDocument) return;
    try {
      await api.UpdateCustomDocument({
        id: editingCustomDocument.id,
        documentName: updated.name,
        isRequired: updated.required,
        accessToken,
        refreshToken,
      });
      setCustomDocuments((prev) =>
        prev.map((d) => d.id === editingCustomDocument.id
          ? { ...d, documentName: updated.name, isRequired: updated.required }
          : d)
      );
      setEditingCustomDocument(null);
      showToast("Custom document updated", "success");
    } catch {
      showToast("Failed to update custom document", "error");
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
          accessToken,
          refreshToken,
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
      if (import.meta.env.DEV) console.error("Failed to move candidate:", error);
      showApiError(error, "MOVE_CANDIDATE");
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
          accessToken,
          refreshToken,
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
      if (import.meta.env.DEV) console.error("Failed to assign staff:", error);
      showApiError(error, "ASSIGN_STAFF");
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
          accessToken,
          refreshToken,
        })
      ).unwrap();

      if (response.status === "ok") {
        showToast("Prospect deleted successfully!", "success");
        navigate("/tenants/pipeline");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to delete prospect:", error);
      showApiError(error, "DELETE_PROSPECT");
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (!accessToken) {
    return <div>Please log in to view this page.</div>;
  }

  const title =
    candidate.company && stageName
      ? `${candidate.company} - ${stageName}`
      : "Prospecting";

  const completedCustomTasksCount = customTasks.filter((t) => t.isCompleted).length;
  const doneTasksCount = Object.values(doneTasks).filter(Boolean).length + completedCustomTasksCount;
  const totalTasksCount = tasks.length + customTasks.length;
  const completedCustomDocsCount = customDocuments.filter((d) => d.isCompleted).length;
  const sentDocumentsCount = Object.values(sentDocuments).filter(Boolean).length + completedCustomDocsCount;
  const totalDocumentsCount = documents.length + customDocuments.length;


  return (
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
              onClick: () => handleOpenPaymentModal("Payment Link"),
            }}
          />
        ) : (
          <Alert
            message="No Payment has been recorded for this candidate"
            variant="warning"
            primaryAction={
              canGeneratePayment
                ? {
                    label: "Generate payment link",
                    onClick: () => handleOpenPaymentModal("Plan Settings"),
                  }
                : undefined
            }
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
                {candidate.paymentStatus ? (
                  <span className={`prospect-status-badge prospect-payment-${candidate.paymentStatus.toLowerCase()}`}>
                    {candidate.paymentStatus}
                  </span>
                ) : (
                  <span className={`payment-status ${candidate.paymentVerified ? "Verified" : "Unverified"}`}>
                    <span className="status-dot"></span>
                    {candidate.paymentVerified ? "Verified" : "Unverified"}
                  </span>
                )}
              </div>
              <div className="org-info-item">
                <span>Subscription Status</span>
                {candidate.subscriptionStatus ? (
                  <span className={`prospect-status-badge prospect-sub-${candidate.subscriptionStatus.toLowerCase()}`}>
                    {candidate.subscriptionStatus}
                  </span>
                ) : (
                  <span>—</span>
                )}
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
              {canGeneratePayment && (
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
                    onClick={() =>
                      handleOpenPaymentModal(
                        hasGeneratedPaymentBefore ? "Payment Link" : "Plan Settings"
                      )
                    }
                    disabled={isLoading}
                  />
                </div>
              )}
              {hasPermission("move_prospect") && (
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
              )}
              <div className="org-action-item">
                <Button
                  label="Send an email"
                  icon={<FiMail size={20} />}
                  variant="action"
                  iconPosition="left"
                  onClick={() => setIsEmailModalOpen(true)}
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
              {hasPermission("remove_prospect") && (
                <div className="org-action-item no-border">
                  <Button
                    label="Delete prospect"
                    icon={<RxCross2 size={20} />}
                    variant="action-danger"
                    iconPosition="left"
                    iconSize={24}
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={isLoading}
                  />
                </div>
              )}
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
                {tasks.length === 0 && customTasks.length === 0 && status === "succeeded" && (
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
                        <span
                          className={
                            draft.requiredTasks?.[index]?.required
                              ? "requirement-badge required"
                              : "requirement-badge optional"
                          }
                        >
                          {draft.requiredTasks?.[index]?.required
                            ? "Required"
                            : "Optional"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {customTasks.map((ct) => (
                    <div key={ct.id} className="section-item">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label>{ct.taskName}</label>
                        <span className="requirement-badge custom">Custom</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          className="custom-item-delete"
                          onClick={() => setEditingCustomTask(ct)}
                          disabled={isLoading}
                          aria-label="Edit custom task"
                        >
                          <FiEdit3 size={17} />
                        </button>
                        <button
                          className="custom-item-delete"
                          onClick={() => handleDeleteCustomTask(ct.id)}
                          disabled={isLoading}
                          aria-label="Delete custom task"
                        >
                          <FiTrash2 size={17} />
                        </button>
                        <CheckboxInput
                          label="Done"
                          checked={ct.isCompleted || false}
                          onChange={() => handleCustomTaskToggle(ct)}
                          disabled={isLoading}
                        />
                        <span className={ct.isRequired ? "requirement-badge required" : "requirement-badge optional"}>
                          {ct.isRequired ? "Required" : "Optional"}
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
                {documents.length === 0 && customDocuments.length === 0 && status === "succeeded" && (
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
                        <span
                          className={
                            draft.requiredDocuments?.[index]?.required
                              ? "requirement-badge required"
                              : "requirement-badge optional"
                          }
                        >
                          {draft.requiredDocuments?.[index]?.required
                            ? "Required"
                            : "Optional"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {customDocuments.map((cd) => (
                    <div key={cd.id} className="section-item">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label>{cd.documentName}</label>
                        <span className="requirement-badge custom">Custom</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          className="custom-item-delete"
                          onClick={() => setEditingCustomDocument(cd)}
                          disabled={isLoading}
                          aria-label="Edit custom document"
                        >
                          <FiEdit3 size={17} />
                        </button>
                        <button
                          className="custom-item-delete"
                          onClick={() => handleDeleteCustomDocument(cd.id)}
                          disabled={isLoading}
                          aria-label="Delete custom document"
                        >
                          <FiTrash2 size={17} />
                        </button>
                        <CheckboxInput
                          label="Uploaded"
                          checked={cd.isCompleted || false}
                          onChange={() => handleCustomDocumentToggle(cd)}
                          disabled={isLoading}
                        />
                        <span className={cd.isRequired ? "requirement-badge required" : "requirement-badge optional"}>
                          {cd.isRequired ? "Required" : "Optional"}
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
        <CustomTaskModal
          isOpen={editingCustomTask !== null}
          onClose={() => setEditingCustomTask(null)}
          onSave={handleUpdateCustomTask}
          initialValues={editingCustomTask ? { name: editingCustomTask.taskName, required: editingCustomTask.isRequired } : null}
        />
        <CustomDocumentModal
          isOpen={isCustomDocModalOpen}
          onClose={() => setIsCustomDocModalOpen(false)}
          onSave={handleAddDocument}
        />
        <CustomDocumentModal
          isOpen={editingCustomDocument !== null}
          onClose={() => setEditingCustomDocument(null)}
          onSave={handleUpdateCustomDocument}
          initialValues={editingCustomDocument ? { name: editingCustomDocument.documentName, required: editingCustomDocument.isRequired } : null}
        />
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleUploadFiles}
        />
        <ReusableModal
          isOpen={isPaymentModalOpen}
          onClose={handleClosePaymentModal}
          title="Generate Payment Link"
          tabs={[
            {
              name: "Plan Settings",
              content: (
                <div className="plan-settings-tab">
                  <div className="plan-type-section">
                    <label className="plan-type-section-label">Select Plan Type</label>
                    <div className="plan-type-radios">
                      <label className="plan-type-radio-label">
                        <RadioInput
                          name="planType"
                          value="STANDARD"
                          checked={selectedPlanType === "STANDARD"}
                          onChange={(e) => setSelectedPlanType(e.target.value)}
                        />
                        Standard
                      </label>
                      <label className="plan-type-radio-label">
                        <RadioInput
                          name="planType"
                          value="ENTERPRISE"
                          checked={selectedPlanType === "ENTERPRISE"}
                          onChange={(e) => setSelectedPlanType(e.target.value)}
                        />
                        Enterprise
                      </label>
                    </div>
                  </div>

                  <SelectInput
                    label="Renewal Frequency"
                    value={renewalFrequency}
                    onChange={(e) => setRenewalFrequency(e.target.value)}
                    options={frequencyOptions}
                  />

                  <SelectInput
                    label="Select Plan"
                    value={selectedPlanId}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                    options={[
                      {
                        value: "",
                        label: loadingPlans
                          ? "Loading plans..."
                          : "Select a plan",
                      },
                      ...plans.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                    disabled={loadingPlans}
                    emptyHint="No plans found. Create one in Billing & Payments → Plans & Pricing."
                  />

                  {selectedPlan && (
                    <div className="modal-plan-card">
                      <div
                        className="modal-plan-header"
                        style={{ backgroundColor: selectedPlan.colourCode || "#003A9B" }}
                      >
                        <h3 className="modal-plan-title">{selectedPlan.name}</h3>
                      </div>
                      <div className="modal-plan-pricing">
                        <h4>Pricing</h4>
                        <p>
                          {selectedPlan.pricePerMonth?.currency || "$"}
                          {selectedPlan.pricePerMonth?.price || 0} PER MONTH
                        </p>
                        <p>
                          {selectedPlan.forStorage
                            ? `${selectedPlan.forStorage} DATA STORAGE`
                            : "Unlimited DATA STORAGE"}
                        </p>
                        {selectedPlan.extraFeaturesWithPrice?.length > 0 && (
                          <p>
                            ${selectedPlan.extraFeaturesWithPrice[0]?.pricePerMonth?.price || 0}{" "}
                            FOR EVERY EXTRA CLIENT
                          </p>
                        )}
                      </div>
                      <div className="modal-plan-features">
                        <h4>PLAN FEATURES</h4>
                        <ul>
                          {selectedPlan.features?.map((f, i) => (
                            <li key={f.id || i}>{f.name || f}</li>
                          ))}
                          {(!selectedPlan.features || selectedPlan.features.length === 0) && (
                            <li>No features available</li>
                          )}
                        </ul>
                      </div>
                      {selectedPlanType === "ENTERPRISE" &&
                        selectedPlan.extraFeatures?.length > 0 && (
                          <div className="modal-plan-extras">
                            <h4>PLAN EXTRAS</h4>
                            <ul>
                              {selectedPlan.extraFeatures.map((f, i) => (
                                <li key={f.id || i}>{f.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ),
            },
            {
              name: "Payment Link",
              content: (
                <div className="payment-link-tab">
                  {generatedLink && (
                    <div className="payment-link-row active">
                      <div className="payment-link-url-container">
                        <span className="payment-link-url">{generatedLink}</span>
                        <button
                          className="copy-link-btn"
                          onClick={() => handleCopyLink(generatedLink)}
                        >
                          Copy link
                        </button>
                      </div>
                    </div>
                  )}
                  {isLoadingHistory ? (
                    <SectionSpinner />
                  ) : invoiceHistory.length === 0 && !generatedLink ? (
                    <p className="no-links-message">
                      No payment link generated yet. Go to Plan Settings to generate a link.
                    </p>
                  ) : (
                    <div className="payment-links-list">
                      {(() => {
                        const lastExpiredIdx = invoiceHistory.reduce(
                          (last, entry, i) => entry.event === "PAYMENT_LINK_EXPIRED" ? i : last,
                          -1
                        );
                        return invoiceHistory.map((entry, idx) => (
                          <div key={entry.tokenId || idx} className="history-entry">
                            <span className="history-entry-text">
                              {formatEventLabel(entry.event)} {formatHistoryDate(entry.time)}
                            </span>
                            {entry.event === "PAYMENT_LINK_EXPIRED" && idx === lastExpiredIdx && canGeneratePayment && (
                              <Button
                                label="Regenerate link"
                                variant="primary"
                                onClick={handleRegenerateLink}
                                width="auto"
                                loading={isGeneratingLink}
                              />
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              ),
            },
          ]}
          activeTab={paymentModalTab}
          onTabChange={setPaymentModalTab}
          primaryButtonText={
            paymentModalTab === "Plan Settings"
              ? "Generate payment link"
              : "Close"
          }
          secondaryButtonText={paymentModalTab === "Plan Settings" ? "Cancel" : null}
          onPrimaryButtonClick={
            paymentModalTab === "Plan Settings"
              ? handleGenerateLinks
              : handleClosePaymentModal
          }
          onSecondaryButtonClick={paymentModalTab === "Plan Settings" ? handleClosePaymentModal : null}
          primaryButtonLoading={isGeneratingLink}
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
          accessToken={accessToken}
          refreshToken={refreshToken}
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

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteProspect}
          title="Delete prospect?"
          message="This will permanently remove this prospect and all of its data. This action cannot be undone."
          confirmButtonText={isLoading ? "Deleting..." : "Delete"}
          confirmButtonColor="#dc2626"
        />

        <SendEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipientEmail={candidate.email}
          recipientName={candidate.company}
        />
      </div>
  );
};

export default ProspectPanel;