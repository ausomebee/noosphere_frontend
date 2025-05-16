import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Layout from "../Layout/ControlLayout";
import Button from "../../Components/Button/Button";
import { FiSettings } from "react-icons/fi";
import FeatureGroup from "./FeatureSubComps/FeatureGroup";

import CreateFeatureGroupModal from "../../Components/ReusableModal/CreateFeatureGroupModal";
import EditFeatureGroupModal from "../../Components/ReusableModal/EditFeatureGroupModal";
import DeleteConfirmationModal from "../../Components/ReusableModal/SecondDeleteConfirmationModal";
import AddNewFeatureModal from "../../Components/ReusableModal/AddNewFeatureModal";
import {
    addFeatureGroup,
    editFeatureGroup,
    deleteFeatureGroup,
    addFeature,
  } from "../../ReduxStore/features/featureManagementSlice";
  import "./FeatureManagement.css";
  
  const FeatureManagement = () => {
    const dispatch = useDispatch();
    const featureGroups = useSelector((state) => state.featureManagement.featureGroups);
  
    const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);
    const [modalState, setModalState] = useState({
      createFeatureGroup: false,
      editFeatureGroup: false,
      deleteFeatureGroup: false,
      createFeature: false,
      targetGroup: null,
    });
  
    const headerDropdownRef = useRef(null);
  
    const handleAddNewFeatureGroup = (newGroup) => {
      dispatch(addFeatureGroup({ title: newGroup.title }));
      setModalState({ ...modalState, createFeatureGroup: false });
    };
  
    const handleEditFeatureGroup = ({ oldTitle, newTitle }) => {
      dispatch(editFeatureGroup({ oldTitle, newTitle }));
      setModalState({ ...modalState, editFeatureGroup: false, targetGroup: null });
    };
  
    const handleDeleteFeatureGroup = (selectedGroup) => {
      dispatch(deleteFeatureGroup(selectedGroup));
      setModalState({ ...modalState, deleteFeatureGroup: false, targetGroup: null });
    };
  
    const handleAddNewFeature = ({ groupTitle, feature }) => {
      dispatch(addFeature({ groupTitle, feature }));
      setModalState({ ...modalState, createFeature: false });
    };
  
    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (headerDropdownRef.current && !headerDropdownRef.current.contains(event.target)) {
          setIsHeaderDropdownOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    return (
      <Layout>
        <div className="board-header">
          <div className="board-title">
            <h1>Feature Management</h1>
            <p>Manage all features and add-ons on the NooSphere platform</p>
          </div>
  
          {/* Custom Dropdown for Manage Features */}
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
  
        {/* Feature Groups */}
        <div className="feature-groups">
          {featureGroups.map((group, index) => (
            <FeatureGroup
              key={group.title}
              title={group.title}
              features={group.features}
            />
          ))}
        </div>
  
        {/* Modals */}
        {modalState.createFeatureGroup && (
          <CreateFeatureGroupModal
            onSave={handleAddNewFeatureGroup}
            onClose={() => setModalState({ ...modalState, createFeatureGroup: false })}
            isOpen={modalState.createFeatureGroup}
          />
        )}
        {modalState.editFeatureGroup && (
          <EditFeatureGroupModal
            onSave={handleEditFeatureGroup}
            onClose={() => setModalState({ ...modalState, editFeatureGroup: false, targetGroup: null })}
            isOpen={modalState.editFeatureGroup}
          />
        )}
        {modalState.deleteFeatureGroup && (
          <DeleteConfirmationModal
            title="SERVICE DISRUPTION ALERT!"
            message={`Are you sure you want to remove this feature group? Removing this feature group will disable all the features under it for all customers of the NooSphere platform. This can cause serious service disruption. All the features WILL be moved to the Extra Features group.`}
            onConfirm={handleDeleteFeatureGroup}
            onCancel={() => setModalState({ ...modalState, deleteFeatureGroup: false, targetGroup: null })}
            isOpen={modalState.deleteFeatureGroup}
          />
        )}
        {modalState.createFeature && (
          <AddNewFeatureModal
            onSave={handleAddNewFeature}
            onClose={() => setModalState({ ...modalState, createFeature: false })}
            isOpen={modalState.createFeature}
          />
        )}
      </Layout>
  );
};

export default FeatureManagement;