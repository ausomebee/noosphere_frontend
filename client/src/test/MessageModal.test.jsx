import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const getClinicians = vi.fn();
const getMessages = vi.fn();
const markRead = vi.fn();
vi.mock("../api/messageApi", () => ({
  default: {
    GetAssignedClinicians: (...a) => getClinicians(...a),
    GetUserMessages: (...a) => getMessages(...a),
    MarkMessageAsRead: (...a) => markRead(...a),
  },
}));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

// The socket layer is replaced wholesale: each `on*` registrar stashes its
// callback so a test can push a server event straight into the component, and
// the emitters are plain spies.
const listeners = {};
const socketHandlers = {};
const fakeSocket = {
  on: (event, fn) => { socketHandlers[event] = fn; },
  off: (event) => { delete socketHandlers[event]; },
};
let socketIsUp = true;
const sendChatMessage = vi.fn();
const emitTyping = vi.fn();
const emitMessagesRead = vi.fn();
const register = (name) => (cb) => {
  listeners[name] = cb;
  return () => { delete listeners[name]; };
};
vi.mock("../api/socketService", () => ({
  getSocket: () => (socketIsUp ? fakeSocket : null),
  sendChatMessage: (...a) => sendChatMessage(...a),
  emitTyping: (...a) => emitTyping(...a),
  emitMessagesRead: (...a) => emitMessagesRead(...a),
  onTyping: (cb) => register("typing")(cb),
  onUserOnline: (cb) => register("online")(cb),
  onUserOffline: (cb) => register("offline")(cb),
  onMessagesRead: (cb) => register("read")(cb),
}));

import MessageModal from "../Components/Modal/MessageModal";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client's chat modal.
 *
 * Almost everything here is driven by the socket rather than by clicks, so the
 * socket module is mocked in a way that hands each registered callback back to
 * the test. Sending is optimistic: a `tmp_`-prefixed bubble appears at once and
 * is then either swapped for the server's copy or removed, depending on the ack
 * the send callback receives.
 *
 * Note the API fetch uses `Promise.allSettled`, so one endpoint failing must
 * still leave the other's data on screen.
 */

const ME = "u1";
const DOC = "doc-1";

const msg = (over = {}) => ({
  id: "m1",
  senderId: DOC,
  receiverId: ME,
  content: "Hello there",
  createdAt: "2026-02-01T10:00:00.000Z",
  isRead: false,
  ...over,
});

const clinician = (over = {}) => ({ id: DOC, fullName: "Dr Ada Bell", ...over });

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user: { id: ME, tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }] },
      },
    },
  });

const onClose = vi.fn();

const renderModal = async ({ isOpen = true } = {}) => {
  const view = render(
    <Provider store={makeStore()}>
      <MessageModal isOpen={isOpen} onClose={onClose} />
    </Provider>
  );
  if (isOpen) await waitFor(() => expect(getClinicians).toHaveBeenCalled());
  return view;
};

// A message's text appears twice: once as the sidebar preview and once as the
// chat bubble. These helpers pin assertions to the bubble.
const bubbles = () =>
  Array.from(document.body.querySelectorAll(".msg-bubble")).map((b) => b.textContent);
const hasBubble = (text) => bubbles().some((b) => b.includes(text));

// The clinician picker is react-select, so there is no native <select> to
// change -- open the menu and take the highlighted option by keyboard.
const pickFromDropdown = async () => {
  const input = document.body.querySelector(".msg-search-wrap input");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(document.body.querySelector(".msg-empty, .msg-bubble")).toBeTruthy());
};

// Opening a conversation from the sidebar; the list item carries the name.
const openConversation = async (name = "Dr Ada Bell") => {
  const item = await waitFor(() => {
    const found = document.body.querySelector(".msg-conv-item");
    expect(found).toBeTruthy();
    return found;
  });
  fireEvent.click(item);
  await waitFor(() => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  // jsdom has no layout, so the scroll-to-bottom effect would throw.
  Element.prototype.scrollIntoView = vi.fn();
  Object.keys(listeners).forEach((k) => delete listeners[k]);
  Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
  socketIsUp = true;
  getClinicians.mockResolvedValue({ data: { data: [clinician()] } });
  getMessages.mockResolvedValue({ data: { data: [msg()] } });
  markRead.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("opening and closing", () => {
  it("renders nothing at all while closed", async () => {
    await renderModal({ isOpen: false });
    expect(document.body.querySelector(".msg-modal")).toBeNull();
    expect(getClinicians).not.toHaveBeenCalled();
  });

  it("loads clinicians and history when opened", async () => {
    await renderModal();
    expect(getClinicians).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "cl1", tenantId: "t1" })
    );
    expect(getMessages).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ME, userType: "CLIENT" })
    );
  });

  it("closes from the header button", async () => {
    await renderModal();
    fireEvent.click(screen.getByLabelText("Close messages"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked", async () => {
    await renderModal();
    fireEvent.click(document.body.querySelector(".msg-modal-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open when the dialog itself is clicked", async () => {
    await renderModal();
    fireEvent.click(document.body.querySelector(".msg-modal"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not fetch when the signed-in user has no tenant link", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: { isAuthenticated: true, accessToken: "at", refreshToken: "rt", user: { id: ME } },
      },
    });
    render(
      <Provider store={store}>
        <MessageModal isOpen onClose={onClose} />
      </Provider>
    );
    expect(getClinicians).not.toHaveBeenCalled();
  });
});

describe("the conversation list", () => {
  it("groups history by the other party", async () => {
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(1)
    );
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("groups a message this client sent by its recipient", async () => {
    getMessages.mockResolvedValue({
      data: { data: [msg({ senderId: ME, receiverId: DOC, content: "Mine" })] },
    });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(1)
    );
  });

  it("ignores a message with no other party at all", async () => {
    getMessages.mockResolvedValue({
      data: { data: [msg({ senderId: ME, receiverId: null })] },
    });
    await renderModal();
    await waitFor(() => expect(screen.getByText("No conversations yet")).toBeInTheDocument());
  });

  it("flattens a history delivered as nested arrays", async () => {
    getMessages.mockResolvedValue({ data: { data: [[msg()]] } });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(1)
    );
  });

  it("reads a history handed back unwrapped", async () => {
    getMessages.mockResolvedValue({ data: [msg()] });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(1)
    );
  });

  it("copes with a history that is not a list", async () => {
    getMessages.mockResolvedValue({ data: { data: "nope" } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("No conversations yet")).toBeInTheDocument());
  });

  it("keeps the messages when only the clinician fetch fails", async () => {
    getClinicians.mockRejectedValue(new Error("offline"));
    await renderModal();
    await waitFor(() => expect(screen.getByText("Hello there")).toBeInTheDocument());
    // With no clinician record the name is unresolvable, so it falls back.
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });

  it("keeps the clinicians when only the message fetch fails", async () => {
    getMessages.mockRejectedValue(new Error("offline"));
    await renderModal();
    await waitFor(() => expect(screen.getByText("No conversations yet")).toBeInTheDocument());
  });

  it("copes with a clinician list that is not an array", async () => {
    getClinicians.mockResolvedValue({ data: { data: { id: DOC } } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Hello there")).toBeInTheDocument());
  });

  it("counts unread messages from the other party", async () => {
    getMessages.mockResolvedValue({
      data: { data: [msg({ id: "a" }), msg({ id: "b" })] },
    });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelector(".msg-conv-badge").textContent).toBe("2")
    );
  });

  it("caps a very large unread count", async () => {
    getMessages.mockResolvedValue({
      data: { data: Array.from({ length: 120 }, (_, i) => msg({ id: `m${i}` })) },
    });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelector(".msg-conv-badge").textContent).toBe("99+")
    );
  });

  it("does not count messages this client sent as unread", async () => {
    getMessages.mockResolvedValue({
      data: { data: [msg({ senderId: ME, receiverId: DOC })] },
    });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(1)
    );
    expect(document.body.querySelector(".msg-conv-badge")).toBeNull();
  });

  it("says so when a conversation has no messages yet", async () => {
    getMessages.mockResolvedValue({ data: { data: [] } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("No conversations yet")).toBeInTheDocument());
    await pickFromDropdown();
    expect(screen.getByText("No messages yet — say hello!")).toBeInTheDocument();
  });

  it("initials an unnamed clinician rather than crashing", async () => {
    getClinicians.mockResolvedValue({ data: { data: [clinician({ fullName: "   " })] } });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelector(".msg-conv-avatar").textContent).toContain("U")
    );
  });
});

describe("selecting a clinician", () => {
  it("marks their unread messages read on both sides", async () => {
    await renderModal();
    await openConversation();
    await waitFor(() => expect(markRead).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "m1" })
    ));
    expect(emitMessagesRead).toHaveBeenCalledWith({ readerId: ME, partnerId: DOC });
  });

  it("never tries to persist a read receipt for an unsent message", async () => {
    getMessages.mockResolvedValue({ data: { data: [msg({ id: "tmp_9" })] } });
    await renderModal();
    await openConversation();
    expect(markRead).not.toHaveBeenCalled();
  });

  it("prompts for a clinician before anything is selected", async () => {
    await renderModal();
    expect(markRead).not.toHaveBeenCalled();
    expect(screen.getByText("Select a clinician to start messaging")).toBeInTheDocument();
    expect(screen.getByText("Select a clinician")).toBeInTheDocument();
  });

  it("opens the conversation chosen from the dropdown", async () => {
    await renderModal();
    await pickFromDropdown();
    await waitFor(() => expect(hasBubble("Hello there")).toBe(true));
  });

  it("sends no read receipt when everything is already read", async () => {
    getMessages.mockResolvedValue({ data: { data: [msg({ isRead: true })] } });
    await renderModal();
    await openConversation();
    expect(emitMessagesRead).not.toHaveBeenCalled();
  });
});

describe("sending", () => {
  const type = (text) =>
    fireEvent.change(screen.getByLabelText("Type a message"), { target: { value: text } });
  const sendButton = () => document.body.querySelector(".msg-send-button");

  it("keeps the send button disabled until there is both a message and a recipient", async () => {
    await renderModal();
    expect(sendButton()).toBeDisabled();
    await openConversation();
    expect(sendButton()).toBeDisabled();
    type("Hi");
    expect(sendButton()).not.toBeDisabled();
  });

  it("shows the message optimistically before the server answers", async () => {
    await renderModal();
    await openConversation();
    type("Hi doctor");
    fireEvent.click(sendButton());
    expect(hasBubble("Hi doctor")).toBe(true);
    expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: ME, receiverId: DOC, receiverType: "TENANT_STAFF" }),
      expect.any(Function)
    );
  });

  it("swaps the optimistic bubble for the server's copy", async () => {
    await renderModal();
    await openConversation();
    type("Hi doctor");
    fireEvent.click(sendButton());
    const ack = sendChatMessage.mock.calls[0][1];
    act(() => ack({ success: true, message: msg({ id: "real", senderId: ME, content: "Hi doctor" }) }));
    await waitFor(() => expect(hasBubble("Hi doctor")).toBe(true));
    expect(document.body.querySelector(".msg-receipt-pending")).toBeNull();
  });

  it("leaves the bubble alone when the ack carries no message", async () => {
    await renderModal();
    await openConversation();
    type("Hi doctor");
    fireEvent.click(sendButton());
    act(() => sendChatMessage.mock.calls[0][1]({ success: true }));
    await waitFor(() => expect(hasBubble("Hi doctor")).toBe(true));
  });

  it("removes the bubble and complains when the send is refused", async () => {
    await renderModal();
    await openConversation();
    type("Hi doctor");
    fireEvent.click(sendButton());
    act(() => sendChatMessage.mock.calls[0][1]({ success: false }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Failed to send message", "error")
    );
    expect(hasBubble("Hi doctor")).toBe(false);
  });

  it("treats a missing ack as a failure", async () => {
    await renderModal();
    await openConversation();
    type("Hi doctor");
    fireEvent.click(sendButton());
    act(() => sendChatMessage.mock.calls[0][1](undefined));
    await waitFor(() => expect(showToast).toHaveBeenCalled());
  });

  it("sends on Enter but not on shift-Enter", async () => {
    await renderModal();
    await openConversation();
    const input = screen.getByLabelText("Type a message");
    type("Hi doctor");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(sendChatMessage).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(sendChatMessage).toHaveBeenCalled();
  });

  it("ignores a keypress that is not Enter", async () => {
    await renderModal();
    await openConversation();
    fireEvent.keyDown(screen.getByLabelText("Type a message"), { key: "a" });
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("refuses to send whitespace", async () => {
    await renderModal();
    await openConversation();
    type("   ");
    fireEvent.keyDown(screen.getByLabelText("Type a message"), { key: "Enter" });
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("refuses to send with nobody selected", async () => {
    await renderModal();
    type("Hi");
    fireEvent.keyDown(screen.getByLabelText("Type a message"), { key: "Enter" });
    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});

describe("typing indicators", () => {
  it("announces typing while the client types, then stops", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderModal();
    await openConversation();
    fireEvent.change(screen.getByLabelText("Type a message"), { target: { value: "H" } });
    expect(emitTyping).toHaveBeenCalledWith({ userId: ME, isTyping: true });

    await act(async () => { vi.advanceTimersByTime(1600); });
    expect(emitTyping).toHaveBeenLastCalledWith({ userId: ME, isTyping: false });
  });

  it("announces nothing while no conversation is open", async () => {
    await renderModal();
    fireEvent.change(screen.getByLabelText("Type a message"), { target: { value: "H" } });
    expect(emitTyping).not.toHaveBeenCalled();
  });

  it("shows the partner typing and clears it after a lull", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderModal();
    await openConversation();
    act(() => listeners.typing({ userId: DOC, isTyping: true }));
    await waitFor(() => expect(screen.getByText(/is typing/)).toBeInTheDocument());

    await act(async () => { vi.advanceTimersByTime(3100); });
    await waitFor(() => expect(screen.queryByText(/is typing/)).not.toBeInTheDocument());
  });

  it("ignores a typing event from someone else", async () => {
    await renderModal();
    await openConversation();
    act(() => listeners.typing({ userId: "someone-else", isTyping: true }));
    expect(screen.queryByText(/is typing/)).not.toBeInTheDocument();
  });

  it("hides the indicator when the partner stops", async () => {
    await renderModal();
    await openConversation();
    act(() => listeners.typing({ userId: DOC, isTyping: true }));
    await waitFor(() => expect(screen.getByText(/is typing/)).toBeInTheDocument());
    act(() => listeners.typing({ userId: DOC, isTyping: false }));
    await waitFor(() => expect(screen.queryByText(/is typing/)).not.toBeInTheDocument());
  });
});

describe("presence", () => {
  it("marks a clinician online and then offline again", async () => {
    await renderModal();
    await openConversation();
    act(() => listeners.online({ userId: DOC }));
    await waitFor(() =>
      expect(document.body.querySelector(".msg-online-dot")).toBeInTheDocument()
    );
    act(() => listeners.offline({ userId: DOC }));
    await waitFor(() =>
      expect(document.body.querySelector(".msg-online-dot")).toBeNull()
    );
  });
});

describe("incoming socket traffic", () => {
  it("appends a message pushed by the server", async () => {
    await renderModal();
    await openConversation();
    act(() => socketHandlers.chatMessage(msg({ id: "m2", content: "Second" })));
    await waitFor(() => expect(hasBubble("Second")).toBe(true));
  });

  it("files a pushed message this client sent under its recipient", async () => {
    await renderModal();
    await openConversation();
    act(() =>
      socketHandlers.chatMessage(msg({ id: "m3", senderId: ME, receiverId: DOC, content: "Echo" }))
    );
    await waitFor(() => expect(hasBubble("Echo")).toBe(true));
  });

  it("drops a pushed message with no other party", async () => {
    await renderModal();
    await openConversation();
    act(() => socketHandlers.chatMessage(msg({ id: "m4", senderId: ME, receiverId: null })));
    expect(bubbles()).toHaveLength(1);
  });

  it("ticks our messages read when the partner opens them", async () => {
    getMessages.mockResolvedValue({
      data: { data: [msg({ senderId: ME, receiverId: DOC, content: "Mine" })] },
    });
    await renderModal();
    await openConversation();
    act(() => listeners.read({ readerId: DOC }));
    await waitFor(() =>
      expect(document.body.querySelector(".msg-receipt-read")).toBeInTheDocument()
    );
  });

  it("ignores a read receipt for a conversation it does not know", async () => {
    await renderModal();
    await openConversation();
    act(() => listeners.read({ readerId: "nobody" }));
    expect(hasBubble("Hello there")).toBe(true);
  });

  it("registers no chat handler when the socket is down", async () => {
    socketIsUp = false;
    await renderModal();
    expect(socketHandlers.chatMessage).toBeUndefined();
  });
});

describe("shapes the API and the socket can also deliver", () => {
  it("initials a clinician with no name at all", async () => {
    getClinicians.mockResolvedValue({ data: { data: [{ id: DOC }] } });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelector(".msg-conv-avatar").textContent).toContain("U")
    );
  });

  it("reads a clinician keyed on _id rather than id", async () => {
    getClinicians.mockResolvedValue({
      data: { data: [{ _id: DOC, fullName: "Dr Ada Bell" }] },
    });
    await renderModal();
    await waitFor(() =>
      expect(screen.getAllByText("Dr Ada Bell").length).toBeGreaterThan(0)
    );
  });

  it("copes with a clinician response carrying no data envelope", async () => {
    getClinicians.mockResolvedValue({});
    await renderModal();
    await waitFor(() => expect(screen.getByText("Hello there")).toBeInTheDocument());
  });

  it("copes with a message response carrying no data envelope", async () => {
    getMessages.mockResolvedValue({});
    await renderModal();
    await waitFor(() => expect(screen.getByText("No conversations yet")).toBeInTheDocument());
  });

  it("dates a message the server sent without a timestamp", async () => {
    getMessages.mockResolvedValue({ data: { data: [msg({ createdAt: null })] } });
    await renderModal();
    await openConversation();
    // Undated messages are grouped under today rather than dropped.
    await waitFor(() => expect(hasBubble("Hello there")).toBe(true));
  });

  it("sorts a conversation with no messages last", async () => {
    getClinicians.mockResolvedValue({
      data: { data: [clinician(), clinician({ id: "doc-2", fullName: "Dr Second" })] },
    });
    getMessages.mockResolvedValue({ data: { data: [msg({ senderId: "doc-2", receiverId: ME })] } });
    await renderModal();
    await waitFor(() => expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(1));

    await pickFromDropdown();
    // Picking the other clinician adds an empty conversation to the list.
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item").length).toBe(2)
    );
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("appends a pushed message to a conversation it has never seen", async () => {
    getMessages.mockResolvedValue({ data: { data: [] } });
    await renderModal();
    await waitFor(() => expect(screen.getByText("No conversations yet")).toBeInTheDocument());
    act(() => socketHandlers.chatMessage(msg({ id: "m9", content: "First ever" })));
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(1)
    );
  });

  it("marks a read receipt against a conversation that has just started", async () => {
    getMessages.mockResolvedValue({ data: { data: [] } });
    await renderModal();
    await pickFromDropdown();
    act(() => listeners.read({ readerId: DOC }));
    // Nothing to tick, but the receipt must not throw the conversation away.
    expect(screen.getByText("No messages yet — say hello!")).toBeInTheDocument();
  });

  it("sends into a conversation that has no history yet", async () => {
    getMessages.mockResolvedValue({ data: { data: [] } });
    await renderModal();
    await pickFromDropdown();
    fireEvent.change(screen.getByLabelText("Type a message"), {
      target: { value: "Hello for the first time" },
    });
    fireEvent.click(document.body.querySelector(".msg-send-button"));
    expect(hasBubble("Hello for the first time")).toBe(true);
  });

  it("removes a failed first message, leaving the conversation empty", async () => {
    getMessages.mockResolvedValue({ data: { data: [] } });
    await renderModal();
    await pickFromDropdown();
    fireEvent.change(screen.getByLabelText("Type a message"), { target: { value: "Hi" } });
    fireEvent.click(document.body.querySelector(".msg-send-button"));
    act(() => sendChatMessage.mock.calls[0][1]({ success: false }));
    await waitFor(() => expect(hasBubble("Hi")).toBe(false));
  });

  it("stops listening once the modal closes", async () => {
    const { rerender } = render(
      <Provider store={makeStore()}>
        <MessageModal isOpen onClose={onClose} />
      </Provider>
    );
    await waitFor(() => expect(getClinicians).toHaveBeenCalled());
    expect(socketHandlers.chatMessage).toBeTypeOf("function");

    rerender(
      <Provider store={makeStore()}>
        <MessageModal isOpen={false} onClose={onClose} />
      </Provider>
    );
    await waitFor(() => expect(socketHandlers.chatMessage).toBeUndefined());
    expect(listeners.typing).toBeUndefined();
  });
});

describe("a modal that goes away mid-flight", () => {
  it("drops the results of a fetch that lands after unmount", async () => {
    let settleClinicians;
    getClinicians.mockReturnValue(new Promise((r) => { settleClinicians = r; }));
    const { unmount } = render(
      <Provider store={makeStore()}>
        <MessageModal isOpen onClose={onClose} />
      </Provider>
    );
    await waitFor(() => expect(getClinicians).toHaveBeenCalled());
    unmount();

    // The mounted flag is checked between each half of the fetch, so nothing
    // here may reach into a component that is no longer on screen.
    await act(async () => {
      settleClinicians({ data: { data: [clinician()] } });
      await Promise.resolve();
    });
    expect(document.body.querySelector(".msg-modal")).toBeNull();
  });

  it("drops a message fetch that lands after unmount", async () => {
    let settleMessages;
    getMessages.mockReturnValue(new Promise((r) => { settleMessages = r; }));
    const { unmount } = render(
      <Provider store={makeStore()}>
        <MessageModal isOpen onClose={onClose} />
      </Provider>
    );
    await waitFor(() => expect(getMessages).toHaveBeenCalled());
    unmount();
    await act(async () => {
      settleMessages({ data: { data: [msg()] } });
      await Promise.resolve();
    });
    expect(document.body.querySelector(".msg-modal")).toBeNull();
  });
});

describe("mixed conversations", () => {
  // Both directions in one thread: the read-receipt and mark-as-read maps each
  // have to leave the other party's messages alone.
  const mixed = [
    msg({ id: "theirs", senderId: DOC, receiverId: ME, content: "From them" }),
    msg({ id: "mine", senderId: ME, receiverId: DOC, content: "From me" }),
  ];

  it("ticks only this client's messages when the partner reads", async () => {
    getMessages.mockResolvedValue({ data: { data: mixed } });
    await renderModal();
    await openConversation();
    act(() => listeners.read({ readerId: DOC }));
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-receipt-read")).toHaveLength(1)
    );
  });

  it("marks only the partner's messages read when the thread is opened", async () => {
    getMessages.mockResolvedValue({ data: { data: mixed } });
    await renderModal();
    await openConversation();
    await waitFor(() => expect(markRead).toHaveBeenCalledTimes(1));
    expect(markRead).toHaveBeenCalledWith(expect.objectContaining({ messageId: "theirs" }));
  });
});

describe("the last few edges", () => {
  it("offers no way to unpick a clinician once one is chosen", async () => {
    await renderModal();
    await openConversation();
    expect(screen.queryByText("Select a clinician to start messaging")).toBeNull();

    // The picker is not clearable, so react-select ignores Backspace and
    // `handleSelectClinician` can never be called with an empty id — the empty
    // state is only ever the one the modal opens on.
    fireEvent.keyDown(document.body.querySelector(".msg-search-wrap input"), {
      key: "Backspace",
    });
    await waitFor(() => expect(hasBubble("Hello there")).toBe(true));
    expect(screen.queryByText("Select a clinician to start messaging")).toBeNull();
  });

  it("leaves two undated conversations in the order they arrived", async () => {
    getClinicians.mockResolvedValue({
      data: {
        data: [clinician(), clinician({ id: "doc-2", fullName: "Dr Second" })],
      },
    });
    getMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "m1", senderId: DOC, content: "From first", createdAt: null }),
          msg({ id: "m2", senderId: "doc-2", content: "From second", createdAt: null }),
        ],
      },
    });
    await renderModal();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".msg-conv-item")).toHaveLength(2)
    );
    // Both sides of the comparator fall back to zero, so the sort is a no-op.
    const names = Array.from(document.body.querySelectorAll(".msg-conv-name")).map(
      (n) => n.textContent
    );
    expect(names).toEqual(["Dr Ada Bell", "Dr Second"]);
  });

  it("drops a message fetch that lands after the clinician fetch and an unmount", async () => {
    let settleMessages;
    getClinicians.mockResolvedValue({ data: { data: [clinician()] } });
    getMessages.mockReturnValue(new Promise((r) => { settleMessages = r; }));

    const { unmount } = render(
      <Provider store={makeStore()}>
        <MessageModal isOpen onClose={onClose} />
      </Provider>
    );
    await waitFor(() => expect(getMessages).toHaveBeenCalled());
    unmount();

    // The mounted flag is re-checked between the two halves, so a message
    // payload arriving after the modal is gone must not be applied.
    await act(async () => {
      settleMessages({ data: { data: [msg()] } });
      await Promise.resolve();
    });
    expect(document.body.querySelector(".msg-modal")).toBeNull();
  });
});

describe("a clinician the directory sent without an id", () => {
  it("stays on the empty pane when the picked option carries no id", async () => {
    // The option's value is built from `c.id || c._id`; with neither present
    // react-select hands back an option whose value is undefined, which the
    // picker turns into an empty string before the modal sees it.
    getClinicians.mockResolvedValue({ data: { data: [{ fullName: "Dr No Id" }] } });
    getMessages.mockResolvedValue({ data: { data: [] } });
    await renderModal();
    await waitFor(() =>
      expect(screen.getByText("Select a clinician to start messaging")).toBeInTheDocument()
    );

    const input = document.body.querySelector(".msg-search-wrap input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("Select a clinician to start messaging")).toBeInTheDocument();
    expect(emitMessagesRead).not.toHaveBeenCalled();
  });
});
