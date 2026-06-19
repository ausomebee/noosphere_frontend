import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../../hooks/useAuth";
import { createPortal } from "react-dom";
import { SwitchInput } from "../../../Components/Input/Inputs";
import { FiMoreVertical } from "react-icons/fi";
import MoveToFeatureGroupModal from "../../../Components/ReusableModal/MoveFeatureModal";
import AssignToPlanModal from "../../../Components/ReusableModal/AssignPlanModal";
import DeleteConfirmationModal from "../../../Components/ReusableModal/SecondDeleteConfirmationModal";
import ToggleActiveModal from "../../../Components/ReusableModal/ToggleActiveModal";
import EditFeatureModal from "../../../Components/ReusableModal/EditFeatureModal";
import {
  asyncMoveFeatureToAnotherGroup,
  asyncEnableOrDisableFeature,
  asyncAssignFeatureToPlan,
  asyncDeleteFeature,
  asyncUpdateFeature,
  asyncFetchAllFeatures,
} from "../../../ReduxStore/features/featureManagementSlice";
import { showToast } from "../../../Helper/ShowToast";
import "../FeatureManagement.css";

const FeatureRow = ({ feature, groupTitle, onViewStatistics }) => {
  const dispatch = useDispatch();
  const { accessToken, refreshToken } = useAuth();
  const featureGroups = useSelector((state) => state.featureManagement.featureGroups);
  const [isRowDropdownOpen, setIsRowDropdownOpen] = useState(false);
  const [modalState, setModalState] = useState({
    moveFeature: false,
    assignPlan: false,
    toggleActive: false,
    deleteFeature: false,
    editFeature: false,
  });
  const [isMoving, setIsMoving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const rowDropdownRef = useRef(null);

  const handleMoveFeature = ({ featureId, fromGroupTitle, toGroupTitle }) => {
    const toGroup = featureGroups.find((g) => g.title === toGroupTitle);
    if (toGroup) {
      setIsMoving(true);
      dispatch(
        asyncMoveFeatureToAnotherGroup({
          id: featureId,
          featureGroupId: toGroup.id,
          accessToken,
          refreshToken,
        })
      )
        .unwrap()
        .then(() => {
          dispatch(asyncFetchAllFeatures({ accessToken, refreshToken }));
          setModalState({ ...modalState, moveFeature: false });
          showToast(
            `Feature "${feature.name}" moved to "${toGroupTitle}" successfully`,
            "success"
          );
        })
        .catch((err) => {
          showToast(
            `Failed to move feature: ${err.message || "Unknown error"}`,
            "error"
          );
        })
        .finally(() => {
          setIsMoving(false);
        });
    } else {
      showToast(`Target group "${toGroupTitle}" not found`, "error");
    }
  };

  const handleToggleActive = (newActiveState) => {
    setIsToggling(true);
    dispatch(
      asyncEnableOrDisableFeature({
        id: feature.id,
        active: newActiveState,
        accessToken,
        refreshToken,
      })
    )
      .unwrap()
      .then(() => {
        dispatch(asyncFetchAllFeatures({ accessToken, refreshToken }));
        setModalState({ ...modalState, toggleActive: false });
        showToast(
          `Feature "${feature.name}" ${
            newActiveState ? "enabled" : "disabled"
          } successfully`,
          "success"
        );
      })
      .catch((err) => {
        showToast(
          `Failed to toggle feature: ${err.message || "Unknown error"}`,
          "error"
        );
      })
      .finally(() => {
        setIsToggling(false);
      });
  };

  const handleAssignPlan = ({ featureId, plans }) => {
    setIsAssigning(true);
    dispatch(
      asyncAssignFeatureToPlan({
        id: featureId,
        applicablePlans: plans,
        accessToken,
        refreshToken,
      })
    )
      .unwrap()
      .then(() => {
        dispatch(asyncFetchAllFeatures({ accessToken, refreshToken }));
        setModalState({ ...modalState, assignPlan: false });
        showToast(
          `Feature "${feature.name}" assigned to plan(s) successfully`,
          "success"
        );
      })
      .catch((err) => {
        showToast(
          `Failed to assign plans: ${err.message || "Unknown error"}`,
          "error"
        );
      })
      .finally(() => {
        setIsAssigning(false);
      });
  };

  const handleDeleteFeature = ({ groupTitle, featureId, administratorPassword }) => {
    setIsDeleting(true);
    dispatch(
      asyncDeleteFeature({
        id: featureId,
        administratorPassword,
        accessToken,
        refreshToken,
      })
    )
      .unwrap()
      .then(() => {
        dispatch(asyncFetchAllFeatures({ accessToken, refreshToken }));
        setModalState({ ...modalState, deleteFeature: false });
        showToast(`Feature "${feature.name}" deleted successfully`, "success");
      })
      .catch((err) => {
        showToast(
          `Failed to delete feature: ${err.message || "Unknown error"}`,
          "error"
        );
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const handleEditFeature = (updatedFeature) => {
    setIsEditing(true);
    dispatch(
      asyncUpdateFeature({
        id: feature.id,
        name: updatedFeature.name,
        description: updatedFeature.description || "",
        active: updatedFeature.active,
        applicablePlans: updatedFeature.plan || feature.plan,
        managedBy: updatedFeature.managedBy || feature.managedBy || "Admin",
        accessToken,
        refreshToken,
      })
    )
      .unwrap()
      .then(() => {
        dispatch(asyncFetchAllFeatures({ accessToken, refreshToken }));
        setModalState({ ...modalState, editFeature: false });
        showToast(
          `Feature "${updatedFeature.name}" updated successfully`,
          "success"
        );
      })
      .catch((err) => {
        showToast(
          `Failed to edit feature: ${err.message || "Unknown error"}`,
          "error"
        );
      })
      .finally(() => {
        setIsEditing(false);
      });
  };

  const handleViewStatisticsClick = () => {
    onViewStatistics({ featureId: feature.id, featureName: feature.name, groupTitle });
    setIsRowDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rowDropdownRef.current && !rowDropdownRef.current.contains(event.target)) {
        setIsRowDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <tr className="feature-row">
        <td>{feature.name}</td>
        <td>{feature.dateAdded}</td>
        <td>{feature.managedBy}</td>
        <td>
          <div className="active-cell">
            <SwitchInput
              checked={feature.active}
              onChange={() => setModalState({ ...modalState, toggleActive: true })}
            />
            <span className="active-status">{feature.active ? "Yes" : "No"}</span>
          </div>
        </td>
       <td>
 <div className="plan-tags flex flex-wrap gap-1">
  {(Array.isArray(feature.plans) && feature.plans.length > 0 ? feature.plans : ["Unassigned"]).map((plan, index) => (
    <span
      key={index}
      className={`plan-tag ${plan !== "Unassigned" ? `plan-tag-${plan.toLowerCase().replace(/\s+/g, '-')}` : "plan-tag-unassigned"}`}
    >
      {plan}
    </span>
  ))}
</div>

</td>

        <td className="action-cell">
          <div className="dropdown-container" ref={rowDropdownRef}>
            <button
              className="feature-action-icon"
              onClick={() => setIsRowDropdownOpen(!isRowDropdownOpen)}
              aria-label="Feature actions"
              aria-expanded={isRowDropdownOpen}
            >
              <FiMoreVertical aria-hidden="true" />
            </button>
            {isRowDropdownOpen && (
              <div className="dropdown-menu dropdown-menu-row">
                <div className="dropdown-items">
                  {/* Hidden for now: Feature Statistics page shows dummy data
                      and the graph table view is unresponsive.
                  <button
                    onClick={handleViewStatisticsClick}
                    className="dropdown-item"
                  >
                    View Feature Statistics
                  </button>
                  */}
                  <button
                    onClick={() => {
                      setModalState({ ...modalState, moveFeature: true });
                      setIsRowDropdownOpen(false);
                    }}
                    className="dropdown-item"
                  >
                    Move to Feature Group
                  </button>
                  <button
                    onClick={() => {
                      setModalState({ ...modalState, editFeature: true });
                      setIsRowDropdownOpen(false);
                    }}
                    className="dropdown-item"
                  >
                    Edit Feature
                  </button>
                  <button
                    onClick={() => {
                      setModalState({ ...modalState, toggleActive: true });
                      setIsRowDropdownOpen(false);
                    }}
                    className={`dropdown-item ${feature.active ? "blurred" : ""}`}
                  >
                    Enable Feature
                  </button>
                  <button
                    onClick={() => {
                      setModalState({ ...modalState, toggleActive: true });
                      setIsRowDropdownOpen(false);
                    }}
                    className={`dropdown-item ${!feature.active ? "blurred" : ""}`}
                  >
                    Disable Feature
                  </button>
                  <button
                    onClick={() => {
                      setModalState({ ...modalState, assignPlan: true });
                      setIsRowDropdownOpen(false);
                    }}
                    className="dropdown-item"
                  >
                    Assign to Plan
                  </button>
                  <button
                    onClick={() => {
                      setModalState({ ...modalState, deleteFeature: true });
                      setIsRowDropdownOpen(false);
                    }}
                    className="dropdown-item dropdown-item-danger"
                  >
                    Remove Feature
                  </button>
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
      {modalState.moveFeature &&
        createPortal(
          <MoveToFeatureGroupModal
            isOpen={modalState.moveFeature}
            onClose={() => setModalState({ ...modalState, moveFeature: false })}
            onSave={handleMoveFeature}
            featureId={feature.id}
            currentGroupTitle={groupTitle}
            isLoading={isMoving}
          />,
          document.body
        )}
      {modalState.assignPlan &&
        createPortal(
          <AssignToPlanModal
            isOpen={modalState.assignPlan}
            onClose={() => setModalState({ ...modalState, assignPlan: false })}
            onSave={handleAssignPlan}
            featureId={feature.id}
            currentGroupTitle={groupTitle}
            currentPlans={feature.plan}
            isLoading={isAssigning}
          />,
          document.body
        )}
      {modalState.deleteFeature &&
        createPortal(
          <DeleteConfirmationModal
            isOpen={modalState.deleteFeature}
            onCancel={() => setModalState({ ...modalState, deleteFeature: false })}
            onConfirm={handleDeleteFeature}
            featureId={feature.id}
            groupTitle={groupTitle}
            title="SERVICE DISRUPTION ALERT!"
            message={`Are you sure you want to remove the feature '${feature.name}'? Removing this feature will disable it for all customers of the NooSphere platform. This can cause serious service disruption.`}
            isLoading={isDeleting}
            isFeatureDeletion={true}
            requirePassword={true}
          />,
          document.body
        )}
      {modalState.toggleActive &&
        createPortal(
          <ToggleActiveModal
            isOpen={modalState.toggleActive}
            featureName={feature.name}
            currentState={feature.active}
            onConfirm={handleToggleActive}
            onClose={() => setModalState({ ...modalState, toggleActive: false })}
            isLoading={isToggling}
          />,
          document.body
        )}
      {modalState.editFeature &&
        createPortal(
          <EditFeatureModal
            isOpen={modalState.editFeature}
            onClose={() => setModalState({ ...modalState, editFeature: false })}
            onSave={handleEditFeature}
            featureId={feature.id}
            currentName={feature.name}
            currentDescription={feature.description}
            currentManagedBy={feature.managedBy}
            currentPlans={feature.plan}
            currentActive={feature.active}
            isLoading={isEditing}
          />,
          document.body
        )}
    </>
  );
};

export default FeatureRow;