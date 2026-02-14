import React, { useState, useRef, useEffect, useCallback } from "react";
import { FiBold, FiItalic, FiUnderline } from "react-icons/fi";
import { TfiList } from "react-icons/tfi";
import { GrOrderedList } from "react-icons/gr";
import "./RichTextEditor.css";

const RichTextEditor = ({
  label = "Client Background",
  placeholder = "Enter a description...",
  value = "",
  onChange,
}) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    formatBlock: "p", // 'p' or 'h3'
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  // Initialize content only once on mount
  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Check current formatting when selection changes
  const checkFormatting = useCallback(() => {
    if (!editorRef.current || !document.getSelection().rangeCount) return;

    const selection = document.getSelection();
    if (!selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const parentElement =
        container.nodeType === 3 ? container.parentNode : container;

      // Check text formatting
      setActiveFormats((prev) => ({
        ...prev,
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        formatBlock: parentElement.tagName === "H3" ? "h3" : "p",
        insertUnorderedList: parentElement.closest("ul") !== null,
        insertOrderedList: parentElement.closest("ol") !== null,
      }));
    }
  }, []);

  // Handle selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current?.contains(document.activeElement)) {
        checkFormatting();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [checkFormatting]);

  const execCommand = (command, commandValue = null) => {
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();

    // Update formatting state immediately after command
    setTimeout(checkFormatting, 0);
  };

  const handleInput = (e) => {
    const htmlContent = e.currentTarget.innerHTML;
    if (onChange) {
      onChange(htmlContent);
    }

    // Update formatting on input as well
    checkFormatting();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className="rich-editor-container">
      <label className="editor-label">
        <span className="label-text">{label}</span>
      </label>

      <div className="editor-wrapper">
        {/* Editor Content - FIRST */}
        <div
          ref={editorRef}
          className={`editor-content ${isFocused ? "focused" : ""}`}
          contentEditable
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          onClick={checkFormatting}
          onKeyUp={checkFormatting}
        />

        {/* Toolbar - BELOW content */}
        <div className={`editor-toolbar ${isFocused ? "focused" : ""}`}>
          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-btn text-format-btn ${
                activeFormats.formatBlock === "p" ? "active" : ""
              }`}
              onClick={() => execCommand("formatBlock", "p")}
              title="Body text"
            >
              <span>Body text</span>
            </button>

            <button
              type="button"
              className={`toolbar-btn text-format-btn ${
                activeFormats.formatBlock === "h3" ? "active" : ""
              }`}
              onClick={() => execCommand("formatBlock", "h3")}
              title="Subheading"
            >
              <span>Subheading</span>
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-btn icon-btn ${
                activeFormats.bold ? "active" : ""
              }`}
              onClick={() => execCommand("bold")}
              title="Bold"
            >
              <FiBold size={16} />
            </button>

            <button
              type="button"
              className={`toolbar-btn icon-btn ${
                activeFormats.italic ? "active" : ""
              }`}
              onClick={() => execCommand("italic")}
              title="Italic"
            >
              <FiItalic size={16} />
            </button>

            <button
              type="button"
              className={`toolbar-btn icon-btn ${
                activeFormats.underline ? "active" : ""
              }`}
              onClick={() => execCommand("underline")}
              title="Underline"
            >
              <FiUnderline size={16} />
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button
              type="button"
              className={`toolbar-btn icon-btn ${
                activeFormats.insertUnorderedList ? "active" : ""
              }`}
              onClick={() => execCommand("insertUnorderedList")}
              title="Bulleted List"
            >
              <GrOrderedList size={20} />
            </button>

            <button
              type="button"
              className={`toolbar-btn icon-btn ${
                activeFormats.insertOrderedList ? "active" : ""
              }`}
              onClick={() => execCommand("insertOrderedList")}
              title="Numbered List"
            >
              <TfiList size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
