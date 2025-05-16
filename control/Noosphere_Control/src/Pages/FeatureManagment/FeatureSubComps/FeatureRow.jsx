import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { SwitchInput, CheckboxInput } from "../../../Components/Input/Inputs";
import { FiMoreVertical } from "react-icons/fi";
import MoveToFeatureGroupModal from "../../../Components/ReusableModal/MoveFeatureModal";
import AssignToPlanModal from "../../../Components/ReusableModal/AssignPlanModal";
import DeleteConfirmationModal from "../../../Components/ReusableModal/SecondDeleteConfirmationModal";
import ToggleActiveModal from "../../../Components/ReusableModal/ToggleActiveModal";
import {
  toggleSelectFeature,
  moveFeature,
  toggleFeatureActive,
  assignFeaturePlan,
  deleteFeature,
  editFeature,
} from "../../../ReduxStore/features/featureManagementSlice";
import "../FeatureManagement.css";

const FeatureRow = ({ feature, groupTitle }) => {
  const dispatch = useDispatch();
  const [isRowDropdownOpen, setIsRowDropdownOpen] = useState(false);
  const [modalState, setModalState] = useState({
    moveFeature: false,
    assignPlan: false,
    toggleActive: false,
    deleteFeature: false,
    editFeature: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const rowDropdownRef = useRef(null);

  const handleSelectFeature = () => {
    dispatch(toggleSelectFeature({ groupTitle, featureId: feature.id }));
  };

  const handleMoveFeature = ({ featureId, fromGroupTitle, toGroupTitle }) => {
    dispatch(moveFeature({ featureId, fromGroupTitle, toGroupTitle }));
    setModalState({ ...modalState, moveFeature: false });
  };

  const handleToggleActive = (newActiveState) => {
    dispatch(toggleFeatureActive({ groupTitle, featureId: feature.id, active: newActiveState }));
    setModalState({ ...modalState, toggleActive: false });
  };

  const handleAssignPlan = ({ featureId, groupTitle, plans }) => {
    dispatch(assignFeaturePlan({ groupTitle, featureId, plans }));
    setModalState({ ...modalState, assignPlan: false });
  };

  const handleDeleteFeature = ({ groupTitle, featureId }) => {
    setIsDeleting(true);
    try {
      dispatch(deleteFeature({ groupTitle, featureId }));
      setModalState({ ...modalState, deleteFeature: false });
    } catch (error) {
      console.error("Failed to delete feature:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditFeature = (updatedFeature) => {
    dispatch(editFeature({ groupTitle, featureId: feature.id, updatedFeature }));
    setModalState({ ...modalState, editFeature: false });
  };

  // Close dropdown when clicking outside
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
        <td>
          <CheckboxInput
            checked={feature.selected}
            onChange={handleSelectFeature}
          />
        </td>
        <td>{feature.name}</td>
        <td>{feature.dateAdded}</td>
        <td>{feature.addedBy}</td>
        <td>
          <div className="active-cell">
            <SwitchInput
              checked={feature.active} // Reflects the Redux state
              onChange={() => setModalState({ ...modalState, toggleActive: true })}
            />
            <span className="active-status">{feature.active ? "Yes" : "No"}</span>
          </div>
        </td>
        <td>
          <div className="plan-tags">
            {feature.plan.map((plan, index) => (
              <span key={index} className={`plan-tag plan-tag-${plan.toLowerCase()}`}>{plan}</span>
            ))}
          </div>
        </td>
        <td className="action-cell">
          <div className="dropdown-container" ref={rowDropdownRef}>
            <button
              className="feature-action-icon"
              onClick={() => setIsRowDropdownOpen(!isRowDropdownOpen)}
            >
              <FiMoreVertical />
            </button>
            {isRowDropdownOpen && (
              <div className="dropdown-menu dropdown-menu-row">
                <div className="dropdown-items">
                  <button
                    onClick={() => console.log(`View Feature Statistics for ${feature.name}`)}
                    className="dropdown-item"
                  >
                    View Feature Statistics
                  </button>
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
                    className={`dropdown-item ${feature.active ? "blurred" : ""}`} // Blur if already enabled
                  >
                    Enable Feature
                  </button>
                  <button
                    onClick={() => {
                      setModalState({ ...modalState, toggleActive: true });
                      setIsRowDropdownOpen(false);
                    }}
                    className={`dropdown-item ${!feature.active ? "blurred" : ""}`} // Blur if already disabled
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

      {/* Modals */}
      {modalState.moveFeature && (
        <MoveToFeatureGroupModal
          isOpen={modalState.moveFeature}
          onClose={() => setModalState({ ...modalState, moveFeature: false })}
          onSave={handleMoveFeature}
          featureId={feature.id}
          currentGroupTitle={groupTitle}
        />
      )}
      {modalState.assignPlan && (
        <AssignToPlanModal
          isOpen={modalState.assignPlan}
          onClose={() => setModalState({ ...modalState, assignPlan: false })}
          onConfirm={handleAssignPlan}
          featureId={feature.id}
          currentGroupTitle={groupTitle}
          currentPlans={feature.plan}
        />
      )}
      {modalState.deleteFeature && (
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
        />
      )}
      {modalState.toggleActive && (
        <ToggleActiveModal
          isOpen={modalState.toggleActive}
          featureName={feature.name}
          currentState={feature.active}
          onConfirm={handleToggleActive}
          onClose={() => setModalState({ ...modalState, toggleActive: false })}
        />
      )}
      {/* {modalState.editFeature && (
        <EditFeatureModal
          feature={feature}
          onSave={handleEditFeature}
          onClose={() => setModalState({ ...modalState, editFeature: false })}
        />
      )} */}
    </>
  );
};

export default FeatureRow;