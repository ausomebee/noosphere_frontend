import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FiType, FiEdit, FiImage, FiTrash2, FiX } from "react-icons/fi";
import { showToast } from "../../Helper/ShowToast";
import "./SignatureCapture.css";

export const SIGNATURE_TYPES = [
  { value: "type", label: "Type", icon: <FiType size={20} /> },
  { value: "draw", label: "Draw", icon: <FiEdit size={20} /> },
  { value: "image", label: "Image", icon: <FiImage size={20} /> },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Freehand pad. Emits a base64 PNG data URI on every stroke end, matching what
 * the image upload produces so both modes store the same shape.
 */
const SignaturePad = ({ value, onChange }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2937";
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="sig-draw">
      <canvas
        ref={canvasRef}
        className="sig-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button type="button" className="sig-clear-btn" onClick={handleClear}>
        <FiTrash2 size={14} /> Clear
      </button>
      {value ? <span className="sig-hint">Signature captured</span> : null}
    </div>
  );
};

SignaturePad.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

/**
 * Signature capture with the three modes used across clinical reports: typed,
 * drawn, or an uploaded image. Draw and image both resolve to a base64 data
 * URI; typed stays plain text, so a consumer can render it in a script face.
 *
 * Read-only renders the stored signature rather than a control — an approver
 * views a signature, they don't re-sign it.
 */
const SignatureCapture = ({
  signatureType,
  value,
  onTypeChange,
  onChange,
  readOnly = false,
  label = "Signature",
  required = false,
}) => {
  const [uploadError, setUploadError] = useState("");

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file");
      showToast("Please choose an image file", "error");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image must be under 5MB");
      showToast("Image must be under 5MB", "error");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    // Stored as base64 so the signature travels inside the report's section
    // data — there's no separate upload endpoint for it.
    reader.onload = (ev) => onChange(ev.target.result);
    reader.onerror = () => {
      setUploadError("Couldn't read that file");
      showToast("Couldn't read that file", "error");
    };
    reader.readAsDataURL(file);
  };

  const isImageValue = typeof value === "string" && value.startsWith("data:");

  if (readOnly) {
    return (
      <div className="sig-capture sig-readonly">
        <span className="sig-label">{label}</span>
        {!value ? (
          <div className="sig-empty">Not signed</div>
        ) : isImageValue ? (
          <img src={value} alt="Signature" className="sig-image" />
        ) : (
          <div className="sig-typed-preview">{value}</div>
        )}
      </div>
    );
  }

  return (
    <div className="sig-capture">
      <span className="sig-label">
        {label}
        {required && <span className="sig-required"> *</span>}
      </span>

      <div className="sig-types">
        {SIGNATURE_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            className={`sig-type-btn ${signatureType === type.value ? "active" : ""}`}
            onClick={() => {
              // Switching method clears the previous signature — keeping a
              // drawn image while "Type" is selected would save one thing and
              // display another.
              if (signatureType !== type.value) onChange("");
              onTypeChange(type.value);
            }}
          >
            {type.icon}
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {signatureType === "type" && (
        <div className="sig-input-area">
          <input
            type="text"
            className="sig-typed-input"
            placeholder="Type your full name"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {value ? <div className="sig-typed-preview">{value}</div> : null}
        </div>
      )}

      {signatureType === "draw" && (
        <div className="sig-input-area">
          <SignaturePad value={value} onChange={onChange} />
        </div>
      )}

      {signatureType === "image" && (
        <div className="sig-input-area">
          <div className="sig-upload-area">
            {isImageValue ? (
              <div className="sig-upload-preview">
                <img src={value} alt="Signature" loading="lazy" />
                <button
                  type="button"
                  className="sig-remove-upload"
                  onClick={() => onChange("")}
                  aria-label="Remove signature image"
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <label className="sig-upload-label">
                <FiImage size={24} />
                <span>Click to upload a signature image</span>
                <span className="sig-upload-hint">PNG or JPG, up to 5MB</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
              </label>
            )}
          </div>
          {uploadError && <div className="sig-error">{uploadError}</div>}
        </div>
      )}
    </div>
  );
};

SignatureCapture.propTypes = {
  signatureType: PropTypes.oneOf(["type", "draw", "image", ""]),
  value: PropTypes.string,
  onTypeChange: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  label: PropTypes.string,
  required: PropTypes.bool,
};

export default SignatureCapture;
