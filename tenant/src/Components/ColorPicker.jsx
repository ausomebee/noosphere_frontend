import React from "react";
import PropTypes from "prop-types";
import { ChromePicker } from "react-color";
import Button from "./Button/Button"; // Adjust path as needed

const ColorPicker = ({ color, onChange, onClose }) => {
  return (
    <div
      className="color-picker-modal"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        zIndex: 1000,
      }}
    >
      <h3>Select Color</h3>
      <ChromePicker
        color={color}
        onChange={(color) => onChange(color.hex)}
        disableAlpha={true} // Optional: disable alpha for simpler hex codes
      />
      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <Button label="Confirm" variant="primary" onClick={onClose} />
        <Button label="Cancel" variant="outline" onClick={onClose} />
      </div>
    </div>
  );
};

ColorPicker.propTypes = {
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ColorPicker;
