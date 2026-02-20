import React, { useState, useRef, useEffect } from "react";
import { IoClose, IoSend } from "react-icons/io5";
import { FiChevronDown } from "react-icons/fi";
import "./MessageModal.css";

const MessageModal = ({ isOpen, onClose }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);
  const clientDropdownRef = useRef(null);

  // Placeholder clients – replace with API data
  const clients = [
    { id: 1, name: "Orlando Diggs", avatar: null, initials: "OD", online: true },
    { id: 2, name: "Jane Smith", avatar: null, initials: "JS", online: false },
    { id: 3, name: "Michael Brown", avatar: null, initials: "MB", online: true },
  ];

  // Placeholder messages – replace with API data
  const [messages] = useState([
    { id: 1, senderId: 1, senderName: "Orlando Diggs", text: "Hello, I may not be available today", timestamp: "Thursday 10:16am", date: "Thursday" },
    { id: 2, senderId: 1, senderName: "Orlando Diggs", text: "Hello, I have a football game", timestamp: "Thursday 10:16am", date: "Thursday" },
    { id: 3, senderId: "me", senderName: "You", text: "Alright, when will you be available?", timestamp: "Thursday 11:41am", date: "Thursday" },
    { id: 4, senderId: 1, senderName: "Orlando Diggs", text: "Maybe tomorrow", timestamp: "Thursday 10:16am", date: "Today" },
    { id: 5, senderId: "me", senderName: "You", text: "Sure thing, I'll reschedule", timestamp: "Friday 2:20pm", date: "Today" },
  ]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = () => {
    if (!messageText.trim()) return;
    // TODO: Send message via API
    setMessageText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;
    messages.forEach((msg) => {
      if (msg.date !== currentDate) {
        currentDate = msg.date;
        groups.push({ type: "date", date: currentDate });
      }
      groups.push({ type: "message", ...msg });
    });
    return groups;
  };

  if (!isOpen) return null;

  return (
    <div className="msg-modal-overlay" onClick={onClose}>
      <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="msg-modal-header">
          <h2 className="msg-modal-title">Message</h2>
          <div className="msg-modal-header-right">
            <div className="msg-modal-avatar">M</div>
            <button className="msg-modal-close" onClick={onClose}>
              <IoClose size={22} />
            </button>
          </div>
        </div>

        {/* Client selector */}
        <div className="msg-client-selector" ref={clientDropdownRef}>
          <button
            className="msg-client-button"
            onClick={() => setShowClientDropdown(!showClientDropdown)}
          >
            <span>{selectedClient ? selectedClient.name : "Select Client"}</span>
            <FiChevronDown size={16} />
          </button>
          {showClientDropdown && (
            <div className="msg-client-dropdown">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="msg-client-option"
                  onClick={() => {
                    setSelectedClient(client);
                    setShowClientDropdown(false);
                  }}
                >
                  <div className="msg-avatar-sm">
                    {client.initials}
                    {client.online && <span className="msg-online-dot" />}
                  </div>
                  <span>{client.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="msg-messages-area">
          {groupMessagesByDate().map((item, idx) => {
            if (item.type === "date") {
              return (
                <div key={`date-${idx}`} className="msg-date-separator">
                  <span>{item.date}</span>
                </div>
              );
            }
            const isMe = item.senderId === "me";
            return (
              <div
                key={item.id}
                className={`msg-bubble-wrapper ${isMe ? "msg-sent" : "msg-received"}`}
              >
                {!isMe && (
                  <div className="msg-bubble-avatar">
                    <div className="msg-avatar-sm">
                      {clients.find((c) => c.id === item.senderId)?.initials || "?"}
                      {clients.find((c) => c.id === item.senderId)?.online && (
                        <span className="msg-online-dot" />
                      )}
                    </div>
                  </div>
                )}
                <div className="msg-bubble-content">
                  <div className="msg-bubble-meta">
                    <span className="msg-bubble-name">{item.senderName}</span>
                    <span className="msg-bubble-time">{item.timestamp}</span>
                  </div>
                  <div className={`msg-bubble ${isMe ? "msg-bubble-sent" : "msg-bubble-received"}`}>
                    {item.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="msg-input-area">
          <input
            type="text"
            className="msg-input"
            placeholder="Message"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="msg-send-button" onClick={handleSend}>
            <IoSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
