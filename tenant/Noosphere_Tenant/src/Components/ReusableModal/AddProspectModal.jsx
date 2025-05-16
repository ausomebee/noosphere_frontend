import React, { useState } from "react";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput } from "../Input/Inputs";
import "./ReusableModal.css";
import Button from "../Button/Button";

const AddProspectModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    companySize: "",
    organizationType: "",
    location: "",
    leadSource: "",
    assignToStaff: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const organizationTypeOptions = [
    { value: "", label: "Select" },
    { value: "type1", label: "Type 1" },
    { value: "type2", label: "Type 2" },
  ];

  const staffOptions = [
    { value: "", label: "Select" },
    { value: "staff1", label: "Staff 1" },
    { value: "staff2", label: "Staff 2" },
  ];

  return (
    <>
      <Button
        label="Open Add Prospect Modal"
        variant="primary"
        onClick={() => setIsOpen(true)}
      />
      <ReusableModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add a new prospect"
        primaryButtonText="Save candidate"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={() => {
          console.log("Saving prospect...", formData);
          setIsOpen(false);
        }}
      >
        <form>
          <TextInput
            label="Company Name"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder="Type something"
          />
          <TextInput
            label="Contact person"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleInputChange}
            placeholder="Type something"
          />
          <TextInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Type something"
          />
          <TextInput
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Type something"
          />
          <TextInput
            label="Company Size"
            name="companySize"
            value={formData.companySize}
            onChange={handleInputChange}
            placeholder="Type something"
          />
          <SelectInput
            label="Organization Type"
            name="organizationType"
            value={formData.organizationType}
            onChange={handleInputChange}
            options={organizationTypeOptions}
          />
          <TextInput
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Type something"
          />
          <TextInput
            label="Lead Source"
            name="leadSource"
            value={formData.leadSource}
            onChange={handleInputChange}
            placeholder="Type something"
          />
          <SelectInput
            label="Assign to Staff"
            name="assignToStaff"
            value={formData.assignToStaff}
            onChange={handleInputChange}
            options={staffOptions}
          />
        </form>
      </ReusableModal>
    </>
  );
};

export default AddProspectModal;
