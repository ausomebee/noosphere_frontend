import usePageTitle from "../../hooks/usePageTitle";
import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import useAuth from "../../hooks/useAuth";

import Button from "../../Components/Button/Button";
import { FiSettings } from "react-icons/fi";
import FeatureGroup from "./FeatureSubComps/FeatureGroup";
import CreateFeatureGroupModal from "../../Components/ReusableModal/CreateFeatureGroupModal";
import EditFeatureGroupModal from "../../Components/ReusableModal/EditFeatureGroupModal";
import DeleteConfirmationModal from "../../Components/ReusableModal/SecondDeleteConfirmationModal";
import AddNewFeatureModal from "../../Components/ReusableModal/AddNewFeatureModal";
import FeatureUsageStatistic from "./FeatureSubComps/FeatureUsageStatistic";
import {
  asyncCreateFeatureGroup,
  asyncUpdateFeatureGroup,
  asyncDeleteFeatureGroup,
  asyncCreateFeature,
  asyncFetchAllFeatureGroups,
  asyncFetchAllFeatures,
} from "../../ReduxStore/features/featureManagementSlice";
import { showToast } from "../../Helper/ShowToast";
import "./FeatureManagement.css";
import LoadingSpinner from "../../Components/LoadingSpinner";
import usePersistedTab from "../../hooks/usePersistedTab";

const FeatureManagement = () => {
  const dispatch = useDispatch();
  const { featureGroups, loading, error } = useSelector(
    (state) => state.featureManagement
  );

  usePageTitle("Features");
  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);
  const [modalState, setModalState] = useState({
    createFeatureGroup: false,
    editFeatureGroup: false,
    deleteFeatureGroup: false,
    createFeature: false,
    targetGroup: null,
  });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isCreatingFeature, setIsCreatingFeature] = useState(false);
  const [viewMode, setViewMode] = usePersistedTab("control:featureManagement", "management");
  const [selectedFeature, setSelectedFeature] = useState(null);

  const headerDropdownRef = useRef(null);

  const { accessToken, refreshToken } = useAuth();

  useEffect(() => {
    if (accessToken && refreshToken) {
      dispatch(asyncFetchAllFeatureGroups({ accessToken, refreshToken }));
      dispatch(asyncFetchAllFeatures({ accessToken, refreshToken }));
    }
  }, [dispatch, accessToken, refreshToken]);

  const handleAddNewFeatureGroup = ({ title }) => {
    setIsCreatingGroup(true);
    dispatch(asyncCreateFeatureGroup({ name: title, accessToken, refreshToken }))
      .unwrap()
      .then(() =>
        dispatch(asyncFetchAllFeatureGroups({ accessToken, refreshToken })).unwrap()
      )
      .then(() => {
        setModalState({ ...modalState, createFeatureGroup: false });
        showToast(`Feature group "${title}" created successfully`, "success");
      })
      .catch((err) =>
        showToast(
          `Failed to create feature group: ${err.message || "Unknown error"}`,
          "error"
        )
      )
      .finally(() => setIsCreatingGroup(false));
  };

  const handleEditFeatureGroup = ({ oldTitle, newTitle }) => {
    const group = featureGroups.find((g) => g.title === oldTitle);
    if (group) {
      setIsUpdatingGroup(true);
      dispatch(
        asyncUpdateFeatureGroup({
          id: group.id,
          name: newTitle,
          accessToken,
          refreshToken,
        })
      )
        .unwrap()
        .then(() =>
          dispatch(asyncFetchAllFeatureGroups({ accessToken, refreshToken })).unwrap()
        )
        .then(() => {
          setModalState({
            ...modalState,
            editFeatureGroup: false,
            targetGroup: null,
          });
          showToast(`Feature group updated to "${newTitle}" successfully`, "success");
        })
        .catch((err) =>
          showToast(
            `Failed to update feature group: ${err.message || "Unknown error"}`,
            "error"
          )
        )
        .finally(() => setIsUpdatingGroup(false));
    }
  };

  const handleDeleteFeatureGroup = ({ selectedGroup, administratorPassword }) => {
    const group = featureGroups.find((g) => g.title === selectedGroup);
    if (group) {
      setIsDeletingGroup(true);
      dispatch(
        asyncDeleteFeatureGroup({
          id: group.id,
          administratorPassword,
          accessToken,
          refreshToken,
        })
      )
        .unwrap()
        .then(() =>
          dispatch(asyncFetchAllFeatureGroups({ accessToken, refreshToken })).unwrap()
        )
        .then(() => {
          setModalState({
            ...modalState,
            deleteFeatureGroup: false,
            targetGroup: null,
          });
          showToast(`Feature group "${selectedGroup}" deleted successfully`, "success");
        })
        .catch((err) =>
          showToast(
            `Failed to delete feature group: ${err.message || "Unknown error"}`,
            "error"
          )
        )
        .finally(() => setIsDeletingGroup(false));
    }
  };

  const handleAddNewFeature = ({ groupTitle, feature }) => {
    const group = featureGroups.find((g) => g.title === groupTitle);
    if (group) {
      setIsCreatingFeature(true);
      dispatch(
        asyncCreateFeature({
          featureGroupId: group.id,
          name: feature.name,
          description: feature.description || "",
          active: feature.active || true,
          applicablePlans: feature.plan || ["Basic"],
          managedBy: feature.managedBy || "Admin",
          accessToken,
          refreshToken,
        })
      )
        .unwrap()
        .then(() =>
          dispatch(asyncFetchAllFeatures({ accessToken, refreshToken })).unwrap()
        )
        .then(() => {
          setModalState({ ...modalState, createFeature: false });
          showToast(`Feature "${feature.name}" created successfully`, "success");
        })
        .catch((err) =>
          showToast(
            `Failed to create feature: ${err.message || "Unknown error"}`,
            "error"
          )
        )
        .finally(() => setIsCreatingFeature(false));
    }
  };

  const handleViewStatistics = ({ featureId, featureName, groupTitle }) => {
    setSelectedFeature({ featureId, featureName, groupTitle });
    setViewMode("statistics");
  };

  const handleBack = () => {
    setViewMode("management");
    setSelectedFeature(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        headerDropdownRef.current &&
        !headerDropdownRef.current.contains(event.target)
      ) {
        setIsHeaderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {viewMode === "management" ? (
        <>
          <div className="board-header">
            <div className="board-title">
              <h1>Feature Management</h1>
              <p>Manage all features and add-ons on the NooSphere platform</p>
            </div>
            <div className="dropdown-container" ref={headerDropdownRef}>
              <Button
                label="Manage Features"
                icon={<FiSettings />}
                variant="primary"
                iconPosition="left"
                width="200px"
                onClick={() => setIsHeaderDropdownOpen(!isHeaderDropdownOpen)}
              />
              {isHeaderDropdownOpen && (
                <div className="dropdown-menu dropdown-menu-header">
                  <div className="dropdown-items">
                    <button
                      onClick={() => {
                        setModalState({ ...modalState, createFeatureGroup: true });
                        setIsHeaderDropdownOpen(false);
                      }}
                      className="dropdown-item"
                    >
                      Add New Feature Group
                    </button>
                    <button
                      onClick={() => {
                        setModalState({ ...modalState, createFeature: true });
                        setIsHeaderDropdownOpen(false);
                      }}
                      className="dropdown-item"
                    >
                      Add New Feature
                    </button>
                    <button
                      onClick={() => {
                        setModalState({ ...modalState, editFeatureGroup: true });
                        setIsHeaderDropdownOpen(false);
                      }}
                      className="dropdown-item"
                      disabled={featureGroups.length === 0}
                    >
                      Edit Feature Group
                    </button>
                    <button
                      onClick={() => {
                        setModalState({ ...modalState, deleteFeatureGroup: true });
                        setIsHeaderDropdownOpen(false);
                      }}
                      className="dropdown-item dropdown-item-danger"
                      disabled={featureGroups.length === 0}
                    >
                      Remove Feature Group
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading && featureGroups.length === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh",
                width: "100%",
              }}
            >
              <LoadingSpinner />
            </div>
          ) : featureGroups.length > 0 ? (
            <div className="feature-groups">
              {featureGroups.map((group) => (
                <FeatureGroup
                  key={group.id}
                  title={group.title}
                  features={group.features}
                  onViewStatistics={handleViewStatistics}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh",
                width: "100%",
              }}
            >
              No feature groups available.
            </div>
          )}

          {modalState.createFeatureGroup && (
            <CreateFeatureGroupModal
              onSave={handleAddNewFeatureGroup}
              onClose={() =>
                setModalState({ ...modalState, createFeatureGroup: false })
              }
              isOpen={modalState.createFeatureGroup}
              isLoading={isCreatingGroup}
            >
              {isCreatingGroup && <LoadingSpinner />}
            </CreateFeatureGroupModal>
          )}
          {modalState.editFeatureGroup && (
            <EditFeatureGroupModal
              onSave={handleEditFeatureGroup}
              onClose={() =>
                setModalState({
                  ...modalState,
                  editFeatureGroup: false,
                  targetGroup: null,
                })
              }
              isOpen={modalState.editFeatureGroup}
              isLoading={isUpdatingGroup}
            >
              {isUpdatingGroup && <LoadingSpinner />}
            </EditFeatureGroupModal>
          )}
          {modalState.deleteFeatureGroup && (
            <DeleteConfirmationModal
              title="SERVICE DISRUPTION ALERT!"
              message={`Are you sure you want to remove this feature group? Removing this feature group will disable all the features under it for all customers of the NooSphere platform. This can cause serious service disruption. All the features WILL be moved to the Extra Features group.`}
              onConfirm={handleDeleteFeatureGroup}
              onCancel={() =>
                setModalState({
                  ...modalState,
                  deleteFeatureGroup: false,
                  targetGroup: null,
                })
              }
              isOpen={modalState.deleteFeatureGroup}
              requirePassword={true}
              isLoading={isDeletingGroup}
            >
              {isDeletingGroup && <LoadingSpinner />}
            </DeleteConfirmationModal>
          )}
          {modalState.createFeature && (
            <AddNewFeatureModal
              onSave={handleAddNewFeature}
              onClose={() => setModalState({ ...modalState, createFeature: false })}
              isOpen={modalState.createFeature}
              isLoading={isCreatingFeature}
            >
              {isCreatingFeature && <LoadingSpinner />}
            </AddNewFeatureModal>
          )}
        </>
      ) : (
        <FeatureUsageStatistic
          featureId={selectedFeature.featureId}
          featureName={selectedFeature.featureName}
          groupTitle={selectedFeature.groupTitle}
          onBack={handleBack}
        />
      )}
    </>
  );
};

export default FeatureManagement;