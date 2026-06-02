import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const ColorPicker = ({ color, onChange, onClose }) => {
  const [selectedColor, setSelectedColor] = useState(color);

  // Create modal using vanilla DOM manipulation to avoid React event conflicts
  useEffect(() => {
    const modalId = `color-picker-${Date.now()}`;
    
    // Create modal HTML
    const modalHTML = `
      <div id="${modalId}" style="
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.5) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
        font-family: system-ui, sans-serif !important;
      ">
        <div style="
          background: white !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
          padding: 24px !important;
          min-width: 300px !important;
          max-width: 90vw !important;
        ">
          <h3 style="
            margin: 0 0 20px 0 !important;
            font-size: 18px !important;
            font-weight: 600 !important;
            text-align: center !important;
            color: #333 !important;
          ">Select Color</h3>
          
          <!-- Current Color Preview -->
          <div style="
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin-bottom: 20px !important;
          ">
            <div id="preview-${modalId}" style="
              width: 60px !important;
              height: 60px !important;
              background-color: ${selectedColor} !important;
              border: 3px solid #ddd !important;
              border-radius: 8px !important;
              margin-right: 12px !important;
            "></div>
            <div>
              <div style="
                font-family: monospace !important;
                font-size: 14px !important;
                font-weight: bold !important;
                color: #333 !important;
              " id="hex-display-${modalId}">${selectedColor}</div>
            </div>
          </div>

          <!-- Native Color Picker -->
          <div style="margin-bottom: 20px !important;">
            <label style="
              display: block !important;
              margin-bottom: 12px !important;
              font-size: 14px !important;
              font-weight: 500 !important;
              color: #333 !important;
            ">Choose Color:</label>
            <div style="
              position: relative !important;
              width: 100% !important;
              height: 150px !important;
              border: 2px solid #ddd !important;
              border-radius: 8px !important;
              overflow: hidden !important;
              cursor: pointer !important;
              background-color: ${selectedColor} !important;
            " id="color-container-${modalId}">
              <input 
                type="color" 
                id="color-input-${modalId}"
                value="${selectedColor}"
                style="
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                  border: none !important;
                  cursor: pointer !important;
                  opacity: 0 !important;
                  z-index: 2 !important;
                "
              />
              <div style="
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                background: rgba(0, 0, 0, 0.7) !important;
                color: white !important;
                padding: 8px 16px !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                pointer-events: none !important;
                z-index: 1 !important;
              ">
                Click to choose color
              </div>
            </div>
          </div>

          <!-- Manual Hex Input -->
          <div style="margin-bottom: 20px !important;">
            <label style="
              display: block !important;
              margin-bottom: 8px !important;
              font-size: 14px !important;
              font-weight: 500 !important;
              color: #333 !important;
            ">Or enter hex color:</label>
            <input 
              type="text" 
              id="hex-input-${modalId}"
              value="${selectedColor}"
              placeholder="#000000"
              style="
                width: 100% !important;
                padding: 10px 12px !important;
                border: 2px solid #ddd !important;
                border-radius: 6px !important;
                font-family: monospace !important;
                font-size: 14px !important;
                box-sizing: border-box !important;
              "
            />
          </div>

          <!-- Buttons -->
          <div style="
            display: flex !important;
            gap: 12px !important;
            justify-content: flex-end !important;
            border-top: 1px solid #eee !important;
            padding-top: 16px !important;
          ">
            <button id="cancel-${modalId}" style="
              padding: 10px 20px !important;
              border: 2px solid #ddd !important;
              background: white !important;
              color: #666 !important;
              border-radius: 6px !important;
              cursor: pointer !important;
              font-size: 14px !important;
              font-weight: 500 !important;
            ">Cancel</button>
            <button id="confirm-${modalId}" style="
              padding: 10px 20px !important;
              border: none !important;
              background: #007bff !important;
              color: white !important;
              border-radius: 6px !important;
              cursor: pointer !important;
              font-size: 14px !important;
              font-weight: 500 !important;
            ">Confirm</button>
          </div>
        </div>
      </div>
    `;

    // Insert modal into body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById(modalId);
    const colorInput = document.getElementById(`color-input-${modalId}`);
    const colorContainer = document.getElementById(`color-container-${modalId}`);
    const hexInput = document.getElementById(`hex-input-${modalId}`);
    const preview = document.getElementById(`preview-${modalId}`);
    const hexDisplay = document.getElementById(`hex-display-${modalId}`);
    const cancelBtn = document.getElementById(`cancel-${modalId}`);
    const confirmBtn = document.getElementById(`confirm-${modalId}`);

    let currentColor = selectedColor;

    // Update color preview
    const updatePreview = (color) => {
      currentColor = color;
      preview.style.backgroundColor = color;
      colorContainer.style.backgroundColor = color;
      hexDisplay.textContent = color;
      colorInput.value = color;
      hexInput.value = color;
    };

    // Color input change
    colorInput.addEventListener('change', (e) => {
      updatePreview(e.target.value);
    });

    colorInput.addEventListener('input', (e) => {
      updatePreview(e.target.value);
    });

    // Hex input change
    hexInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        updatePreview(value);
      }
    });

    // Button handlers
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      modal.remove();
      onClose();
    });

    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(currentColor);
      modal.remove();
      onClose();
    });

    // Backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        onClose();
      }
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Cleanup
    return () => {
      if (modal && document.body.contains(modal)) {
        modal.remove();
      }
      document.body.style.overflow = 'unset';
    };
  }, [selectedColor, onChange, onClose]);

  return null; // Component renders nothing - everything handled in useEffect
};

ColorPicker.propTypes = {
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ColorPicker;