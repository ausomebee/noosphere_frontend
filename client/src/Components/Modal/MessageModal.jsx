import React, { useState, useEffect, useRef, useCallback } from "react";
import { IoClose, IoSend, IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import "./MessageModal.css";
import useAuth from "../../hooks/useAuth";
import messageApi from "../../api/messageApi";
import { SelectInput } from "../Input/Inputs";
import {
  getSocket,
  sendChatMessage,
  emitTyping,
  onTyping,
  onUserOnline,
  onUserOffline,
  emitMessagesRead,
  onMessagesRead,
} from "../../api/socketService";
import { showToast } from "../../Helper/ShowToast";
import { formatMsgTime, formatDateHeader } from "../../Helper/Formatters";
import SectionLoader from "../SectionLoader";
const getClinicianName = (c) => c?.fullName?.trim() || "Unknown";

const getInitials = (name) =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const MessageModal = ({ isOpen, onClose }) => {
  const { userId, clientId, tenantId, accessToken, refreshToken } = useAuth();

  const [clinicians, setClinicians] = useState([]);
  const [messages, setMessages] = useState({});
  const [selectedClinicianId, setSelectedClinicianId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // ─── On open: load clinicians + message history ───────────────────
  const fetchData = useCallback(async () => {
    if (!userId || !clientId || !tenantId) return;
    setLoading(true);
    try {
      const [clinicianRes, msgRes] = await Promise.allSettled([
        messageApi.GetAssignedClinicians({ clientId, tenantId, accessToken, refreshToken }),
        messageApi.GetUserMessages({ userId, userType: "CLIENT", accessToken, refreshToken }),
      ]);

      if (!mountedRef.current) return;

      if (clinicianRes.status === "fulfilled") {
        const raw = clinicianRes.value?.data?.data ?? [];
        setClinicians(Array.isArray(raw) ? raw : []);
      } else {
        console.error("[MessageModal] Failed to load clinicians:", clinicianRes.reason);
      }

      if (!mountedRef.current) return;

      if (msgRes.status === "fulfilled") {
        const rawMsgs = msgRes.value?.data?.data ?? msgRes.value?.data ?? [];
        const list = Array.isArray(rawMsgs) ? rawMsgs.flat() : [];
        const grouped = list.reduce((acc, msg) => {
          const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
          if (!partnerId) return acc;
          (acc[partnerId] = acc[partnerId] || []).push(msg);
          return acc;
        }, {});
        setMessages(grouped);
      } else {
        console.error("[MessageModal] Failed to load messages:", msgRes.reason);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId, clientId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    if (isOpen) fetchData();
    return () => { mountedRef.current = false; };
  }, [isOpen, fetchData]);

  // ─── Scroll to bottom on new messages ────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedClinicianId]);

  // ─── Listen for incoming socket messages ─────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = (msg) => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!partnerId) return;
      setMessages((prev) => ({
        ...prev,
        [partnerId]: [...(prev[partnerId] || []), msg],
      }));
    };

    socket.on("chatMessage", handleMessage);
    return () => socket.off("chatMessage", handleMessage);
  }, [isOpen, userId]);

  // ─── Listen for read receipts (partner read our messages) ─────────
  useEffect(() => {
    if (!isOpen) return;
    const unsub = onMessagesRead(({ readerId }) => {
      // readerId is the partner who just read our messages
      setMessages((prev) => {
        const conv = prev[readerId];
        if (!conv) return prev;
        return {
          ...prev,
          [readerId]: conv.map((m) =>
            m.senderId === userId ? { ...m, isRead: true } : m
          ),
        };
      });
    });
    return () => unsub();
  }, [isOpen, userId]);

  // ─── Track online/offline presence ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const unsubOnline = onUserOnline(({ userId: uid }) => {
      setOnlineUsers((prev) => new Set([...prev, uid]));
    });
    const unsubOffline = onUserOffline(({ userId: uid }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    });
    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [isOpen]);

  // ─── Listen for typing indicators ────────────────────────────────
  useEffect(() => {
    if (!isOpen || !selectedClinicianId) return;
    const unsub = onTyping(({ userId: uid, isTyping }) => {
      if (uid !== selectedClinicianId) return;
      setIsPartnerTyping(isTyping);
      if (isTyping) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
      }
    });
    return () => {
      unsub();
      clearTimeout(typingTimeoutRef.current);
    };
  }, [isOpen, selectedClinicianId]);

  // ─── Select clinician → mark their messages as read ──────────────
  const handleSelectClinician = (clinicianId) => {
    setSelectedClinicianId(clinicianId || null);
    setIsPartnerTyping(false);
    if (!clinicianId) return;

    // Collect unread received messages before updating state
    const unread = (messages[clinicianId] || []).filter(
      (m) => m.senderId !== userId && !m.isRead && !String(m.id).startsWith("tmp_")
    );

    // Mark local state as read immediately
    if (unread.length > 0) {
      setMessages((prev) => ({
        ...prev,
        [clinicianId]: (prev[clinicianId] || []).map((m) =>
          m.senderId !== userId && !m.isRead ? { ...m, isRead: true } : m
        ),
      }));

      // Persist each message to server
      Promise.allSettled(
        unread.map((m) =>
          messageApi.MarkMessageAsRead({ messageId: m.id, accessToken, refreshToken })
        )
      );

      // Notify partner their messages were read
      emitMessagesRead({ readerId: userId, partnerId: clinicianId });
    }
  };

  // ─── Send message ─────────────────────────────────────────────────
  const handleSend = () => {
    const content = messageText.trim();
    if (!content || !selectedClinicianId) return;
    setMessageText("");
    clearTimeout(typingTimeoutRef.current);
    emitTyping({ userId, isTyping: false });

    const tmpId = `tmp_${Date.now()}`;
    const optimistic = {
      id: tmpId,
      senderId: userId,
      senderType: "CLIENT",
      receiverId: selectedClinicianId,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedClinicianId]: [...(prev[selectedClinicianId] || []), optimistic],
    }));

    sendChatMessage(
      {
        senderId: userId,
        senderType: "CLIENT",
        receiverId: selectedClinicianId,
        receiverType: "TENANT_STAFF",
        content,
      },
      (ack) => {
        if (!ack?.success) {
          showToast("Failed to send message", "error");
          setMessages((prev) => ({
            ...prev,
            [selectedClinicianId]: (prev[selectedClinicianId] || []).filter(
              (m) => m.id !== tmpId
            ),
          }));
        } else if (ack.message) {
          setMessages((prev) => ({
            ...prev,
            [selectedClinicianId]: (prev[selectedClinicianId] || []).map((m) =>
              m.id === tmpId ? ack.message : m
            ),
          }));
        }
      }
    );
  };

  // ─── Derived ──────────────────────────────────────────────────────
  const selectedClinician = clinicians.find(
    (c) => (c.id || c._id) === selectedClinicianId
  );
  const currentMessages = (selectedClinicianId && messages[selectedClinicianId]) || [];

  const groupedMessages = currentMessages.reduce((acc, msg) => {
    const key = new Date(msg.createdAt || Date.now()).toDateString();
    (acc[key] = acc[key] || []).push(msg);
    return acc;
  }, {});

  // Build conversation list from all known partners + currently selected
  const allPartnerIds = new Set([
    ...Object.keys(messages),
    ...(selectedClinicianId ? [selectedClinicianId] : []),
  ]);

  const conversationList = [...allPartnerIds]
    .map((partnerId) => {
      const clinician = clinicians.find((c) => (c.id || c._id) === partnerId);
      const msgs = messages[partnerId] || [];
      const lastMsg = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => !m.isRead && m.senderId !== userId).length;
      return { partnerId, clinician, lastMsg, unread };
    })
    .sort((a, b) => new Date(b.lastMsg?.createdAt || 0) - new Date(a.lastMsg?.createdAt || 0));

  if (!isOpen) return null;

  return (
    <div className="msg-modal-overlay" onClick={onClose}>
      <div className="msg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

        {/* ── LEFT SIDEBAR ── */}
        <div className="msg-sidebar">
          <div className="msg-sidebar-header">
            <h2 className="msg-modal-title">Chats</h2>
          </div>

          {/* Search / select clinician */}
          <div className="msg-search-wrap">
            <SelectInput
              placeholder={loading ? "Loading…" : "Search Clinician"}
              value={selectedClinicianId || ""}
              options={clinicians.map((c) => ({
                value: c.id || c._id,
                label: getClinicianName(c),
              }))}
              onChange={(e) => handleSelectClinician(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Conversation list */}
          <div className="msg-conv-list">
            {loading ? (
              <SectionLoader />
            ) : conversationList.length === 0 ? (
              <div className="msg-conv-loading">No conversations yet</div>
            ) : (
              conversationList.map(({ partnerId, clinician, lastMsg, unread }) => (
                <div
                  key={partnerId}
                  className={`msg-conv-item${selectedClinicianId === partnerId ? " active" : ""}`}
                  onClick={() => handleSelectClinician(partnerId)}
                >
                  <div className="msg-conv-avatar">
                    {getInitials(getClinicianName(clinician))}
                    {onlineUsers.has(partnerId) && <span className="msg-online-dot" />}
                  </div>
                  <div className="msg-conv-info">
                    <span className="msg-conv-name">{getClinicianName(clinician)}</span>
                    <span className="msg-conv-last">
                      {lastMsg?.content || "No messages yet"}
                    </span>
                  </div>
                  <div className="msg-conv-meta">
                    {lastMsg?.createdAt && (
                      <span className="msg-conv-time">{formatMsgTime(lastMsg.createdAt)}</span>
                    )}
                    {unread > 0 && (
                      <span className="msg-conv-badge">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT CHAT PANEL ── */}
        <div className="msg-chat-panel">
          {/* Chat header */}
          <div className="msg-chat-header">
            {selectedClinician ? (
              <>
                <div className="msg-chat-avatar">
                  {getInitials(getClinicianName(selectedClinician))}
                  {onlineUsers.has(selectedClinicianId) && <span className="msg-online-dot" />}
                </div>
                <span className="msg-chat-name">{getClinicianName(selectedClinician)}</span>
              </>
            ) : (
              <span className="msg-chat-name msg-chat-placeholder">Select a clinician</span>
            )}
            <button className="msg-modal-close" onClick={onClose} aria-label="Close messages">
              <IoClose size={20} />
            </button>
          </div>

          {/* Messages area */}
          <div className="msg-messages-area">
            {!selectedClinicianId ? (
              <div className="msg-empty">Select a clinician to start messaging</div>
            ) : (
              <>
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                  <React.Fragment key={date}>
                    <div className="msg-date-separator">
                      <span>{formatDateHeader(date)}</span>
                    </div>
                    {msgs.map((msg) => {
                      const isMe = msg.senderId === userId;
                      const isPending = String(msg.id).startsWith("tmp_");
                      return (
                        <div
                          key={msg.id}
                          className={`msg-bubble-wrapper ${isMe ? "msg-sent" : "msg-received"}`}
                        >
                          {!isMe && (
                            <div className="msg-avatar">
                              {getInitials(getClinicianName(selectedClinician))}
                              {onlineUsers.has(selectedClinicianId) && (
                                <span className="msg-online-dot" />
                              )}
                            </div>
                          )}
                          <div className="msg-bubble-content">
                            <div className="msg-bubble-meta">
                              <span className="msg-bubble-name">
                                {isMe ? "You" : getClinicianName(selectedClinician)}
                              </span>
                              <span className="msg-bubble-time">
                                {formatMsgTime(msg.createdAt)}
                              </span>
                            </div>
                            <div
                              className={`msg-bubble ${
                                isMe ? "msg-bubble-sent" : "msg-bubble-received"
                              }`}
                            >
                              {msg.content}
                              {isMe && (
                                <span
                                  className={`msg-receipt ${
                                    msg.isRead
                                      ? "msg-receipt-read"
                                      : isPending
                                      ? "msg-receipt-pending"
                                      : "msg-receipt-delivered"
                                  }`}
                                >
                                  {isPending ? (
                                    <IoCheckmark size={13} />
                                  ) : msg.isRead ? (
                                    <IoCheckmarkDone size={13} />
                                  ) : (
                                    <IoCheckmarkDone size={13} />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
                {currentMessages.length === 0 && (
                  <div className="msg-empty">No messages yet — say hello!</div>
                )}
                {isPartnerTyping && (
                  <div className="msg-typing-indicator">
                    <span className="msg-typing-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="msg-typing-name">
                      {getClinicianName(selectedClinician)} is typing…
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="msg-input-area">
            <input
              type="text"
              className="msg-input"
              placeholder="Message"
              aria-label="Type a message"
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (selectedClinicianId) {
                  emitTyping({ userId, isTyping: true });
                  clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    emitTyping({ userId, isTyping: false });
                  }, 1500);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              className="msg-send-button"
              onClick={handleSend}
              disabled={!messageText.trim() || !selectedClinicianId}
            >
              <IoSend size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MessageModal;
