
import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../../../Layout/TenantLayout";
import { FaArrowLeft, FaEdit, FaUserPlus } from "react-icons/fa";
import { Menu } from "@headlessui/react";
import { FiChevronDown, FiEdit3 } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import "./ClientPanel.css";
import { CheckboxInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import { LuEye } from "react-icons/lu";
import { FaRegTrashCan } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSinglePipelineItem,
  fetchSinglePipelineStages,
  fetchPipelineStages,
  updateStageDocuments,
  updateStageTasks,
  updatePipelineItemTaskToDone,
  selectPipelineItem,
  selectDraft,
  selectStatus,
  selectStages,
  selectColumns,
  updatePipelineItemActivity,
  addTaskToDraft,
  addDocumentToDraft,
} from "../../../../ReduxStore/features/PipelineSlice";
import api from "../../../../api/TenantApis";
import { showToast } from "../../../../Helper/ShowToast";
import { v4 as uuidv4 } from "uuid";
import EditProspectModal from "../../../../Components/ReusableModal/PipelineModal/EditProspectModal";
import CustomTaskModal from "../../../../Components/ReusableModal/PipelineModal/CustomTaskModal";
import CustomDocumentModal from "../../../../Components/ReusableModal/PipelineModal/CustomDocumentModal";
import UploadDocumentModal from "../../../../Components/ReusableModal/PipelineModal/UploadDocumentModal";


// Utility function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const ClientPanel = () => {
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

  const [client, setClient] = useState({
    id: "",
    name: "",
    gender: "",
    dateOfBirth: "",
    email: "",
    address: "",
    phoneNumber: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    dbAccess: false,
  });
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [doneTasks, setDoneTasks] = useState({});
  const [sentDocuments, setSentDocuments] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
  const [isCustomDocModalOpen, setIsCustomDocModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState(null);
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

  const fetchData = useCallback(async () => {
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
      ]);
    } catch (err) {
      console.error("Failed to fetch pipeline data:", err);
      setFetchError("Failed to load pipeline data.");
      showToast("Failed to load pipeline data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pipelineItemId, pipelineStageId, token, pipelineId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (status !== "succeeded" || !pipelineItem || !columns[pipelineStageId]) {
      return;
    }

    const currentStage = columns[pipelineStageId];
    const requiredTasks = Array.isArray(currentStage?.requiredTasks)
      ? currentStage.requiredTasks.map((task) => task.name)
      : [];
    const requiredDocuments = Array.isArray(currentStage?.requiredDocuments)
      ? currentStage.requiredDocuments.map((doc) => doc.name)
      : [];

    setClient({
      id: pipelineItem?.client?.id || pipelineItemId,
      name: pipelineItem?.client?.fullName || "N/A",
      gender: pipelineItem?.client?.gender || "",
      dateOfBirth: pipelineItem?.client?.DOB || "",
      email: pipelineItem?.client?.email || "",
      address: pipelineItem?.client?.streetAddress || "",
      phoneNumber: pipelineItem?.client?.phoneNumber || "",
      city: pipelineItem?.client?.city || "",
      state: pipelineItem?.client?.state || "",
      country: pipelineItem?.client?.country || "",
      zipCode: pipelineItem?.client?.zipCode || "",
      dbAccess: pipelineItem?.client?.dbAccess || false,
    });

    setDoneTasks(
      requiredTasks.reduce(
        (acc, task) => ({
          ...acc,
          [task]: pipelineItem?.doneTasks?.[task] || false,
        }),
        {}
      )
    );
    setSentDocuments(
      requiredDocuments.reduce(
        (acc, doc) => ({
          ...acc,
          [doc]: pipelineItem?.sentDocuments?.[doc] || false,
        }),
        {}
      )
    );
    setTasks(requiredTasks);
    setDocuments(requiredDocuments);
  }, [pipelineItem, status, pipelineStageId, columns]);

  const handleMoveClient = async (targetStageId) => {
    if (targetStageId === pipelineStageId) return;

    setIsLoading(true);
    try {
      if (targetStageId === "client-list") {
        // Move to Client list using DELETE endpoint
        const response = await api.MoveCandidateToClient({
          pipelineItemId,
          accessToken: token,
          refreshToken: token,
        });
        if (response.status === 200) {
          showToast("Candidate moved to client list successfully!", "success");
          navigate(`/tenants/client-list/${pipelineItemId}`); // Adjust navigation path
        } else {
          throw new Error("Failed to move candidate to client list");
        }
      } else {
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
          setTasks(targetColumn?.requiredTasks?.map((task) => task.name) || []);
          setDocuments(
            targetColumn?.requiredDocuments?.map((doc) => doc.name) || []
          );
          setDoneTasks(
            targetColumn?.requiredTasks?.reduce(
              (acc, task) => ({ ...acc, [task.name]: false }),
              {}
            ) || {}
          );
          setSentDocuments(
            targetColumn?.requiredDocuments?.reduce(
              (acc, doc) => ({ ...acc, [doc.name]: false }),
              {}
            ) || {}
          );
          showToast("Client moved successfully!", "success");
          navigate(`/tenants/client-single/${targetStageId}/${pipelineItemId}`);
        }
      }
    } catch (error) {
      console.error("Failed to move client:", error);
      showToast(error?.message || "Failed to move client", "error");
    } finally {
      setIsLoading(false);
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
    } catch (err) {
      showToast("Failed to update task status", "error");
    }
  };

  const handleAddTask = async (newTask) => {
    try {
      dispatch(addTaskToDraft({ name: newTask.name, required: newTask.required }));
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
      setIsCustomTaskModalOpen(false);
      showToast("Task added successfully!", "success");
    } catch (err) {
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
      setIsCustomDocModalOpen(false);
      showToast("Document added successfully!", "success");
    } catch (err) {
      showToast("Failed to add document", "error");
    }
  };

  const handleUploadFiles = async (files) => {
    if (!files.length) return;

    setIsLoading(true);
    try {
      const docName = draft.requiredDocuments.find((doc) => !sentDocuments[doc.name])?.name || files[0].name; // Use first file name as fallback
      const formData = new FormData();
      files.forEach((file) => {
        formData.append(docName, file); // Append all files under the same docName
      });

      await api.UploadDocumentForPipelineItem({
        pipelineItemId,
        docName,
        files,
        accessToken: token,
        refreshToken: token,
      });

      const updatedSentDocuments = {
        ...sentDocuments,
        [docName]: true, // Mark as sent after upload
      };

      setSentDocuments(updatedSentDocuments);
      setIsUploadModalOpen(false);
      showToast("Documents uploaded successfully!", "success");
    } catch (err) {
      console.error("Upload failed:", err);
      showToast("Failed to upload documents: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSentToggle = async (docName) => {
    try {
      const updatedSentDocuments = {
        ...sentDocuments,
        [docName]: !sentDocuments[docName],
      };

      setSentDocuments(updatedSentDocuments);
    } catch (err) {
      showToast("Failed to update document status", "error");
    }
  };

  const handleEditProspect = async (updatedClient) => {
    setIsLoading(true);
    try {
      const response = await api.UpdateCandidate({
        id: client.id,
        fullName: updatedClient.fullName,
        email: updatedClient.email,
        phoneNumber: updatedClient.phoneNumber,
        gender: updatedClient.gender,
        DOB: updatedClient.DOB,
        streetAddress: updatedClient.streetAddress,
        city: updatedClient.city,
        state: updatedClient.state,
        country: updatedClient.country,
        zipCode: updatedClient.zipCode,
        pipelineStageId: updatedClient.pipelineStageId,
        dbAccess: updatedClient.dbAccess,
        accessToken: token,
        refreshToken: token,
      });

      if (response.data.status === "ok") {
        setClient({
          id: client.id,
          name: updatedClient.fullName,
          gender: updatedClient.gender,
          dateOfBirth: updatedClient.DOB,
          email: updatedClient.email,
          address: updatedClient.streetAddress,
          phoneNumber: updatedClient.phoneNumber,
          city: updatedClient.city,
          state: updatedClient.state,
          country: updatedClient.country,
          zipCode: updatedClient.zipCode,
          dbAccess: updatedClient.dbAccess,
        });
        showToast("Client updated successfully!", "success");
        setIsEditModalOpen(false);
      } else {
        throw new Error(response.data.message || "Failed to update client");
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || err.message || "Failed to update client",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return <div>Please log in to view this page.</div>;
  }

  return (
    <DashboardLayout>
      <div className="manage-column-header" onClick={() => navigate(-1)}>
        <button className="manage-back-button">
          <FaArrowLeft />
          Back
        </button>
        <h1 style={{ color: "#9097A1" }}>{stageName || "Pipeline Stage"}</h1>
        <button
          className="manage-back-button"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          <FaArrowLeft />
          Back
        </button>
      </div>
      <div className="pipeline-stage-selector">
        <div className="flex gap-4 items-center">
          <div>
            <h2 className="client-name">{client.name || "N/A"}</h2>
          </div>
          <div>
            <Menu as="div" className="dropdown-container">
              <Menu.Button className="dropdown-icon gap-4 text-base font-bold">
                Move to <FiChevronDown />
              </Menu.Button>
              <Menu.Items className="menu-items" style={{ maxHeight: "300px", overflowY: "auto" }}>
                <div>
                  {Object.keys(columns).map((colId) => (
                    <Menu.Item key={colId}>
                      {({ active }) => (
                        <button
                          className={`menu-item ${active ? "menu-item-active" : ""}`}
                          onClick={() => handleMoveClient(colId)}
                        >
                          {columns[colId].title}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`menu-item ${active ? "menu-item-active" : ""}`}
                        onClick={() => handleMoveClient("client-list")}
                      >
                        <FaUserPlus className="menu-item-icon" />
                        Move to client list
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </div>

      <div className="general-info" style={{ overflow: "auto", maxHeight: "300px" }}>
        <div className="flex justify-between">
          <div>
            <h2>General Information</h2>
          </div>
          <div className="edit-icon" onClick={() => setIsEditModalOpen(true)}>
            <FiEdit3 size={20} />
          </div>
        </div>
        <div className="flex gap-2">
          <p className="general-lead">Name</p>
          <p className="general-info-value">{client.name}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <p className="general-lead">Gender</p>
          <p className="general-info-value">{client.gender}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <p className="general-lead">Date of Birth</p>
          <p className="general-info-value">{formatDate(client.dateOfBirth)}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <p className="general-lead">Email</p>
          <p className="general-info-value">{client.email}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <p className="general-lead">Address</p>
          <p className="general-info-value">{client.address}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <p className="general-lead">Phone Number</p>
          <p className="general-info-value">{client.phoneNumber}</p>
        </div>
      </div>

      <div className="task-progress" style={{ overflow: "auto", maxHeight: "300px" }}>
        <h2>Task Progress</h2>
        {tasks.map((task, index) => (
          <div key={index} className="task-item">
            <span>{task}</span>
            <CheckboxInput
              checked={doneTasks[task] || false}
              onChange={() => handleTaskDoneToggle(task)}
              disabled={isLoading}
            />
          </div>
        ))}
        <Button
          label="Add a custom task"
          variant="outline"
          iconPosition="left"
          onClick={() => setIsCustomTaskModalOpen(true)}
          width="auto"
          disabled={isLoading}
        />
      </div>

      <div className="required-documents" style={{ overflow: "auto", maxHeight: "300px" }}>
        <h2>
          Required documents
          <span className="document-count">
            {documents.filter((doc) => !sentDocuments[doc]).length} documents
            pending
          </span>
        </h2>
        <table className="custom-table mb-24">
          <thead>
            <tr>
              <th>Document Name</th>
              <th></th>
              <th>Status</th>
              <th>Date Uploaded</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr key={index}>
                <td className="">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#004aba"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>{" "}
                    {doc}
                  </div>
                </td>
                <td>
                  <Button
                    variant="secondary"
                    label="Upload"
                    onClick={() => setIsUploadModalOpen(true)}
                    disabled={sentDocuments[doc] || isLoading}
                    style={{ opacity: sentDocuments[doc] ? 0.5 : 1 }}
                  />
                </td>
                <td>{sentDocuments[doc] ? "Uploaded" : "Pending"}</td>
                <td>{sentDocuments[doc] ? "N/A" : "N/A"}</td>
                <td>
                  <div className="flex gap-2">
                    <button
                      role="img"
                      aria-label="view"
                      disabled={isLoading || !sentDocuments[doc]}
                      style={{ opacity: !sentDocuments[doc] ? 0.5 : 1 }}
                    >
                      <LuEye size={20} />
                    </button>
                    <button
                      role="img"
                      aria-label="delete"
                      disabled={isLoading || !sentDocuments[doc]}
                      style={{ opacity: !sentDocuments[doc] ? 0.5 : 1 }}
                    >
                      <FaRegTrashCan size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          label="Add a required document"
          variant="outline"
          iconPosition="left"
          onClick={() => setIsCustomDocModalOpen(true)}
          width="auto"
          disabled={isLoading}
        />
      </div>

      <EditProspectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditProspect}
        formData={{
          id: client.id,
          fullName: client.name,
          gender: client.gender,
          DOB: client.dateOfBirth,
          email: client.email,
          phoneNumber: client.phoneNumber,
          streetAddress: client.address,
          city: client.city,
          state: client.state,
          country: client.country,
          zipCode: client.zipCode,
          pipelineStageId: pipelineStageId,
          dbAccess: client.dbAccess,
        }}
        stages={stages}
      />
      <CustomTaskModal
        isOpen={isCustomTaskModalOpen}
        onClose={() => setIsCustomTaskModalOpen(false)}
        onSave={handleAddTask}
        pipelineStageId={pipelineStageId}
        accessToken={token}
        refreshToken={token}
      />
      <CustomDocumentModal
        isOpen={isCustomDocModalOpen}
        onClose={() => setIsCustomDocModalOpen(false)}
        onSave={handleAddDocument}
        pipelineStageId={pipelineStageId}
        accessToken={token}
        refreshToken={token}
      />
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadFiles}
        pipelineItemId={pipelineItemId}
        pipelineStageId={pipelineStageId}
        accessToken={token}
        refreshToken={token}
      />
      
    </DashboardLayout>
  );
};

export default ClientPanel;
