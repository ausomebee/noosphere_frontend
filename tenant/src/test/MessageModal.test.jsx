import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The staff-to-client chat modal.
 *
 * Everything interesting here happens off the render path: two APIs are fetched
 * side by side with `Promise.allSettled` and each response is unwrapped through
 * a `?? ?? ??` chain, so a service that answers `{data:{data:[]}}` and one that
 * answers a bare array both work. Four socket subscriptions (message, read
 * receipt, presence, typing) push straight into state, so the tests capture the
 * callbacks the component registers and fire them by hand.
 *
 * The client picker is a react-select in production; it is replaced here with a
 * native `<select>` probe because the only thing the modal cares about is the
 * `{ target: { value } }` it emits. Message sending is optimistic -- a `tmp_`
 * row appears immediately and the socket acknowledgement either replaces it,
 * removes it, or leaves it alone, which is three separate arms to drive.
 */

const h = vi.hoisted(() => ({
  auth: {},
  getStaffClients: vi.fn(),
  getUserMessages: vi.fn(),
  markMessageAsRead: vi.fn(),
  getSocket: vi.fn(),
  sendChatMessage: vi.fn(),
  emitTyping: vi.fn(),
  emitMessagesRead: vi.fn(),
  showToast: vi.fn(),
  // Callbacks the component hands to the socket helpers, captured so a test can
  // play the part of the server.
  cb: {},
  unsub: {
    typing: vi.fn(),
    online: vi.fn(),
    offline: vi.fn(),
    read: vi.fn(),
  },
}));

vi.mock("../hooks/useAuth", () => ({ default: () => h.auth }));
vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ timeFormat: "12-hour", dateFormat: "MM/DD/YYYY", currency: "USD" }),
}));

vi.mock("../api/organisationStaffApis", () => ({
  default: { GetStaffClients: (...a) => h.getStaffClients(...a) },
}));

vi.mock("../api/chatApi", () => ({
  default: {
    GetUserMessages: (...a) => h.getUserMessages(...a),
    MarkMessageAsRead: (...a) => h.markMessageAsRead(...a),
  },
}));

vi.mock("../api/socketService", () => ({
  getSocket: (...a) => h.getSocket(...a),
  sendChatMessage: (...a) => h.sendChatMessage(...a),
  emitTyping: (...a) => h.emitTyping(...a),
  emitMessagesRead: (...a) => h.emitMessagesRead(...a),
  onTyping: (fn) => {
    h.cb.typing = fn;
    return h.unsub.typing;
  },
  onUserOnline: (fn) => {
    h.cb.online = fn;
    return h.unsub.online;
  },
  onUserOffline: (fn) => {
    h.cb.offline = fn;
    return h.unsub.offline;
  },
  onMessagesRead: (fn) => {
    h.cb.read = fn;
    return h.unsub.read;
  },
}));

vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => h.showToast(...a) }));

vi.mock("../Components/Input/Inputs", () => ({
  SelectInput: ({ value, options, onChange, placeholder, disabled }) => (
    <select
      data-testid="client-picker"
      aria-label={placeholder}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange({ target: { value: e.target.value } })}
    >
      <option value="">--</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import MessageModal from "../Components/MessageModal/MessageModal";

const USER_ID = "staff-1";

// `fullName`, first+last, and nothing at all -- the three arms of getClientName.
const ADA = { id: "c1", fullName: "Ada Lovelace" };
const BOB = { id: "c2", firstName: "Bob", lastName: "Stone" };
const NAMELESS = { id: "c3" };

const msg = (over = {}) => ({
  id: "m1",
  senderId: "c1",
  receiverId: USER_ID,
  content: "hello there",
  createdAt: "2026-01-05T10:00:00.000Z",
  isRead: false,
  ...over,
});

const renderModal = (props = {}) =>
  render(<MessageModal isOpen onClose={vi.fn()} {...props} />);

// The picker's placeholder flips to "Loading…" while the two fetches are in
// flight, so its absence is the signal that the modal has settled.
const settled = () => waitFor(() => expect(screen.queryByLabelText("Loading…")).toBeNull());

const picker = () => screen.getByTestId("client-picker");
const messageBox = () => screen.getByPlaceholderText("Message");

// A client's name shows up both in the picker's options and in the sidebar, and
// a message body shows up both in its bubble and as the conversation preview, so
// every assertion about either has to name the region it means.
const convNames = () =>
  Array.from(document.body.querySelectorAll(".msg-conv-name")).map((n) => n.textContent);
const bubbles = () =>
  Array.from(document.body.querySelectorAll(".msg-bubble")).map((n) => n.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = {
    userId: USER_ID,
    tenantId: "t1",
    accessToken: "at",
    refreshToken: "rt",
  };
  h.cb = {};
  h.getStaffClients.mockResolvedValue({ data: { data: [ADA, BOB] } });
  h.getUserMessages.mockResolvedValue({ data: { data: [] } });
  h.markMessageAsRead.mockResolvedValue({});
  h.getSocket.mockReturnValue(null);
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("open and close", () => {
  it("renders nothing at all while closed", () => {
    const { container } = render(<MessageModal isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(h.getStaffClients).not.toHaveBeenCalled();
  });

  it("closes from the header button", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await settled();
    fireEvent.click(screen.getByLabelText("Close messages"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await settled();
    fireEvent.click(document.body.querySelector(".msg-modal-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the modal open when the panel itself is clicked", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await settled();
    fireEvent.click(document.body.querySelector(".msg-modal"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("loading the conversation data", () => {
  it("fetches nothing without a signed-in user", async () => {
    h.auth = { userId: undefined, tenantId: "t1" };
    renderModal();
    await settled();
    expect(h.getStaffClients).not.toHaveBeenCalled();
    expect(h.getUserMessages).not.toHaveBeenCalled();
  });

  it("fetches nothing without a tenant", async () => {
    h.auth = { userId: USER_ID, tenantId: undefined };
    renderModal();
    await settled();
    expect(h.getStaffClients).not.toHaveBeenCalled();
  });

  it("shows a loader and disables the picker while the fetches are in flight", () => {
    h.getStaffClients.mockReturnValue(new Promise(() => {}));
    h.getUserMessages.mockReturnValue(new Promise(() => {}));
    renderModal();
    expect(screen.getByLabelText("Loading…")).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it.each([
    ["nested under data.data", { data: { data: [ADA] } }],
    ["directly under data", { data: [ADA] }],
    ["as the bare response", [ADA]],
  ])("reads the client list held %s", async (_shape, response) => {
    h.getStaffClients.mockResolvedValue(response);
    h.getUserMessages.mockResolvedValue({ data: { data: [msg()] } });
    renderModal();
    await settled();
    await waitFor(() => expect(convNames()).toEqual(["Ada Lovelace"]));
  });

  it("falls back to an empty list when the clients payload is not an array", async () => {
    h.getStaffClients.mockResolvedValue({ data: { data: "not-a-list" } });
    renderModal();
    await settled();
    // No client options beyond the probe's own placeholder entry.
    expect(picker().querySelectorAll("option")).toHaveLength(1);
  });

  it("survives a null clients response", async () => {
    h.getStaffClients.mockResolvedValue(null);
    renderModal();
    await settled();
    expect(picker().querySelectorAll("option")).toHaveLength(1);
  });

  it("logs and carries on when the client fetch rejects", async () => {
    h.getStaffClients.mockRejectedValue(new Error("clients down"));
    renderModal();
    await settled();
    expect(console.error).toHaveBeenCalledWith(
      "[MessageModal] Failed to load clients:",
      expect.any(Error)
    );
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("logs and carries on when the message fetch rejects", async () => {
    h.getUserMessages.mockRejectedValue(new Error("chat down"));
    renderModal();
    await settled();
    expect(console.error).toHaveBeenCalledWith(
      "[MessageModal] Failed to load messages:",
      expect.any(Error)
    );
  });

  it("flattens a paged message response into one conversation", async () => {
    // The chat service answers with an array of pages, not an array of messages.
    h.getUserMessages.mockResolvedValue({
      data: { data: [[msg({ id: "m1" })], [msg({ id: "m2", content: "second" })]] },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    await waitFor(() => expect(bubbles()).toEqual(["hello there", "second"]));
  });

  it("ignores a message with no partner on either side", async () => {
    h.getUserMessages.mockResolvedValue({
      data: { data: [{ id: "orphan", senderId: USER_ID, content: "into the void" }] },
    });
    renderModal();
    await settled();
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("treats a malformed message payload as no messages", async () => {
    h.getUserMessages.mockResolvedValue({ data: { data: { nope: true } } });
    renderModal();
    await settled();
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });
});

describe("the conversation list", () => {
  it("names a client from first and last name when there is no full name", async () => {
    h.getUserMessages.mockResolvedValue({
      data: { data: [msg({ senderId: "c2", id: "m9" })] },
    });
    renderModal();
    await settled();
    await waitFor(() => expect(convNames()).toEqual(["Bob Stone"]));
  });

  it("falls back to Unknown for a partner it has no client record for", async () => {
    h.getStaffClients.mockResolvedValue({ data: { data: [NAMELESS] } });
    h.getUserMessages.mockResolvedValue({ data: { data: [msg({ senderId: "c9" })] } });
    renderModal();
    await settled();
    await waitFor(() => expect(convNames()).toEqual(["Unknown"]));
  });

  it("shows the newest conversation first", async () => {
    h.getUserMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "old", senderId: "c1", createdAt: "2026-01-01T09:00:00.000Z" }),
          msg({ id: "new", senderId: "c2", createdAt: "2026-06-01T09:00:00.000Z" }),
        ],
      },
    });
    renderModal();
    await settled();
    const names = Array.from(document.body.querySelectorAll(".msg-conv-name")).map(
      (n) => n.textContent
    );
    expect(names).toEqual(["Bob Stone", "Ada Lovelace"]);
  });

  it("counts unread received messages in a badge", async () => {
    h.getUserMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "a" }),
          msg({ id: "b" }),
          // Sent by us, so it never counts towards the partner's unread badge.
          msg({ id: "c", senderId: USER_ID, receiverId: "c1" }),
        ],
      },
    });
    renderModal();
    await settled();
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("caps a very large unread count at 99+", async () => {
    const many = Array.from({ length: 101 }, (_, i) => msg({ id: `m${i}` }));
    h.getUserMessages.mockResolvedValue({ data: { data: many } });
    renderModal();
    await settled();
    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("shows no badge when everything has been read", async () => {
    h.getUserMessages.mockResolvedValue({ data: { data: [msg({ isRead: true })] } });
    renderModal();
    await settled();
    expect(document.body.querySelector(".msg-conv-badge")).toBeNull();
  });

  it("shows a placeholder for a conversation with no message yet", async () => {
    renderModal();
    await settled();
    // Selecting a client with no history puts them in the list on their own.
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
    expect(document.body.querySelector(".msg-conv-time")).toBeNull();
  });

  it("opens a conversation when its row is clicked", async () => {
    h.getUserMessages.mockResolvedValue({ data: { data: [msg({ isRead: true })] } });
    renderModal();
    await settled();
    await waitFor(() => expect(convNames()).toEqual(["Ada Lovelace"]));
    fireEvent.click(document.body.querySelector(".msg-conv-item"));
    expect(document.body.querySelector(".msg-conv-item.active")).toBeInTheDocument();
  });
});

describe("selecting a client", () => {
  it("marks each unread received message read on the server and tells the partner", async () => {
    h.getUserMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "unread-1" }),
          msg({ id: "already", isRead: true }),
          msg({ id: "mine", senderId: USER_ID, receiverId: "c1" }),
        ],
      },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });

    await waitFor(() => expect(h.markMessageAsRead).toHaveBeenCalledTimes(1));
    expect(h.markMessageAsRead).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "unread-1" })
    );
    expect(h.emitMessagesRead).toHaveBeenCalledWith({
      readerId: USER_ID,
      partnerId: "c1",
    });
  });

  it("never marks an optimistic message read -- it has no server id yet", async () => {
    h.getUserMessages.mockResolvedValue({
      data: { data: [msg({ id: "tmp_123" })] },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(h.markMessageAsRead).not.toHaveBeenCalled();
    expect(h.emitMessagesRead).not.toHaveBeenCalled();
  });

  it("does nothing on the server when the conversation is already read", async () => {
    h.getUserMessages.mockResolvedValue({ data: { data: [msg({ isRead: true })] } });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(h.markMessageAsRead).not.toHaveBeenCalled();
  });

  it("clears the selection when the picker is emptied", async () => {
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(screen.queryByText("Select a client to start messaging")).toBeNull();

    fireEvent.change(picker(), { target: { value: "" } });
    expect(screen.getByText("Select a client to start messaging")).toBeInTheDocument();
    expect(h.markMessageAsRead).not.toHaveBeenCalled();
  });
});

describe("the message thread", () => {
  it("prompts for a client before anything else", async () => {
    renderModal();
    await settled();
    expect(screen.getByText("Select a client")).toBeInTheDocument();
    expect(screen.getByText("Select a client to start messaging")).toBeInTheDocument();
  });

  it("invites the first message when a client has no history", async () => {
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(screen.getByText("No messages yet — say hello!")).toBeInTheDocument();
  });

  it("labels our own messages You and the partner's by name", async () => {
    h.getUserMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "theirs", isRead: true }),
          msg({ id: "mine", senderId: USER_ID, receiverId: "c1", isRead: true }),
        ],
      },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    const names = Array.from(document.body.querySelectorAll(".msg-bubble-name")).map(
      (n) => n.textContent
    );
    expect(names).toEqual(["Ada Lovelace", "You"]);
  });

  it("marks a delivered message differently from a read one", async () => {
    h.getUserMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "d", senderId: USER_ID, receiverId: "c1", isRead: false }),
          msg({ id: "r", senderId: USER_ID, receiverId: "c1", isRead: true }),
        ],
      },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(document.body.querySelectorAll(".msg-receipt-delivered")).toHaveLength(1);
    expect(document.body.querySelectorAll(".msg-receipt-read")).toHaveLength(1);
  });

  it("groups messages under a date separator per day", async () => {
    h.getUserMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "d1", createdAt: "2026-01-05T10:00:00.000Z", isRead: true }),
          msg({ id: "d2", createdAt: "2026-02-11T10:00:00.000Z", isRead: true }),
        ],
      },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(document.body.querySelectorAll(".msg-date-separator")).toHaveLength(2);
  });

  it("files a message with no timestamp under today", async () => {
    h.getUserMessages.mockResolvedValue({
      data: { data: [msg({ id: "no-date", createdAt: undefined, isRead: true })] },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});

describe("sending", () => {
  const openThread = async () => {
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
  };

  it("keeps the send button disabled until there is a client and some text", async () => {
    renderModal();
    await settled();
    expect(screen.getByLabelText("Send message")).toBeDisabled();

    fireEvent.change(messageBox(), { target: { value: "  " } });
    expect(screen.getByLabelText("Send message")).toBeDisabled();

    fireEvent.change(picker(), { target: { value: "c1" } });
    fireEvent.change(messageBox(), { target: { value: "hi" } });
    expect(screen.getByLabelText("Send message")).toBeEnabled();
  });

  it("shows the message immediately and clears the box", async () => {
    await openThread();
    fireEvent.change(messageBox(), { target: { value: "on my way" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(bubbles()).toEqual(["on my way"]);
    expect(messageBox()).toHaveValue("");
    expect(document.body.querySelector(".msg-receipt-pending")).toBeInTheDocument();
    expect(h.emitTyping).toHaveBeenCalledWith({ userId: USER_ID, isTyping: false });
  });

  it("sends on Enter but not on shift-Enter", async () => {
    await openThread();
    fireEvent.change(messageBox(), { target: { value: "first" } });
    fireEvent.keyDown(messageBox(), { key: "Enter", shiftKey: true });
    expect(h.sendChatMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(messageBox(), { key: "Enter" });
    expect(h.sendChatMessage).toHaveBeenCalledTimes(1);
  });

  it("ignores an Enter with nothing typed", async () => {
    await openThread();
    fireEvent.keyDown(messageBox(), { key: "Enter" });
    expect(h.sendChatMessage).not.toHaveBeenCalled();
  });

  it("ignores a send with no client chosen", async () => {
    renderModal();
    await settled();
    fireEvent.change(messageBox(), { target: { value: "nowhere to go" } });
    fireEvent.keyDown(messageBox(), { key: "Enter" });
    expect(h.sendChatMessage).not.toHaveBeenCalled();
  });

  it("swaps the optimistic row for the server's copy on acknowledgement", async () => {
    await openThread();
    fireEvent.change(messageBox(), { target: { value: "draft copy" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    const ack = h.sendChatMessage.mock.calls[0][1];
    act(() => {
      ack({
        success: true,
        message: {
          id: "server-1",
          senderId: USER_ID,
          receiverId: "c1",
          content: "server copy",
          createdAt: "2026-01-05T11:00:00.000Z",
          isRead: false,
        },
      });
    });

    expect(bubbles()).toEqual(["server copy"]);
  });

  it("leaves the optimistic row alone when the acknowledgement carries no message", async () => {
    await openThread();
    fireEvent.change(messageBox(), { target: { value: "still mine" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    act(() => h.sendChatMessage.mock.calls[0][1]({ success: true }));
    expect(bubbles()).toEqual(["still mine"]);
  });

  it("rolls the message back and warns when the send fails", async () => {
    await openThread();
    fireEvent.change(messageBox(), { target: { value: "doomed" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    act(() => h.sendChatMessage.mock.calls[0][1]({ success: false }));
    expect(h.showToast).toHaveBeenCalledWith("Failed to send message", "error");
    expect(bubbles()).toEqual([]);
  });

  it("rolls back on an acknowledgement that is missing entirely", async () => {
    await openThread();
    fireEvent.change(messageBox(), { target: { value: "silence" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    act(() => h.sendChatMessage.mock.calls[0][1](undefined));
    expect(h.showToast).toHaveBeenCalledWith("Failed to send message", "error");
  });
});

describe("typing", () => {
  it("announces typing and then stops after the idle delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderModal();
      await settled();
      fireEvent.change(picker(), { target: { value: "c1" } });
      fireEvent.change(messageBox(), { target: { value: "typ" } });

      expect(h.emitTyping).toHaveBeenCalledWith({ userId: USER_ID, isTyping: true });
      act(() => vi.advanceTimersByTime(1600));
      expect(h.emitTyping).toHaveBeenLastCalledWith({ userId: USER_ID, isTyping: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it("stays quiet while no client is selected", async () => {
    renderModal();
    await settled();
    fireEvent.change(messageBox(), { target: { value: "nobody listening" } });
    expect(h.emitTyping).not.toHaveBeenCalled();
  });

  it("shows the partner's typing indicator and drops it after three seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderModal();
      await settled();
      fireEvent.change(picker(), { target: { value: "c1" } });

      act(() => h.cb.typing({ userId: "c1", isTyping: true }));
      expect(screen.getByText("Ada Lovelace is typing…")).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(3100));
      expect(screen.queryByText("Ada Lovelace is typing…")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides the indicator when the partner stops typing", async () => {
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });

    act(() => h.cb.typing({ userId: "c1", isTyping: true }));
    act(() => h.cb.typing({ userId: "c1", isTyping: false }));
    expect(screen.queryByText("Ada Lovelace is typing…")).toBeNull();
  });

  it("ignores typing from somebody other than the open conversation", async () => {
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });

    act(() => h.cb.typing({ userId: "c2", isTyping: true }));
    expect(document.body.querySelector(".msg-typing-indicator")).toBeNull();
  });

  it("does not subscribe to typing until a conversation is open", async () => {
    renderModal();
    await settled();
    expect(h.cb.typing).toBeUndefined();
  });
});

describe("incoming socket traffic", () => {
  it("survives having no socket at all", async () => {
    h.getSocket.mockReturnValue(null);
    renderModal();
    await settled();
    expect(screen.getByText("Chats")).toBeInTheDocument();
  });

  it("appends a message pushed over the socket", async () => {
    const handlers = {};
    h.getSocket.mockReturnValue({
      on: (event, fn) => {
        handlers[event] = fn;
      },
      off: vi.fn(),
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });

    act(() => handlers.chatMessage(msg({ id: "pushed", content: "just in" })));
    expect(bubbles()).toEqual(["just in"]);
  });

  it("drops a pushed message with no partner id", async () => {
    const handlers = {};
    h.getSocket.mockReturnValue({
      on: (event, fn) => {
        handlers[event] = fn;
      },
      off: vi.fn(),
    });
    renderModal();
    await settled();

    act(() => handlers.chatMessage({ id: "x", senderId: USER_ID, content: "void" }));
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("unsubscribes from the socket when the modal closes", async () => {
    const off = vi.fn();
    h.getSocket.mockReturnValue({ on: vi.fn(), off });
    const { rerender } = renderModal();
    await settled();
    rerender(<MessageModal isOpen={false} onClose={vi.fn()} />);
    expect(off).toHaveBeenCalledWith("chatMessage", expect.any(Function));
    expect(h.unsub.read).toHaveBeenCalled();
    expect(h.unsub.online).toHaveBeenCalled();
    expect(h.unsub.offline).toHaveBeenCalled();
  });

  it("turns our delivered ticks into read ticks on a read receipt", async () => {
    h.getUserMessages.mockResolvedValue({
      data: { data: [msg({ id: "mine", senderId: USER_ID, receiverId: "c1" })] },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    expect(document.body.querySelector(".msg-receipt-delivered")).toBeInTheDocument();

    act(() => h.cb.read({ readerId: "c1" }));
    expect(document.body.querySelector(".msg-receipt-read")).toBeInTheDocument();
  });

  it("ignores a read receipt for a conversation it does not hold", async () => {
    h.getUserMessages.mockResolvedValue({
      data: { data: [msg({ id: "mine", senderId: USER_ID, receiverId: "c1" })] },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });

    act(() => h.cb.read({ readerId: "somebody-else" }));
    expect(document.body.querySelector(".msg-receipt-delivered")).toBeInTheDocument();
  });

  it("shows and then removes a presence dot", async () => {
    h.getUserMessages.mockResolvedValue({ data: { data: [msg({ isRead: true })] } });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });

    act(() => h.cb.online({ userId: "c1" }));
    // The dot appears beside the conversation row, the chat header and the
    // partner's own bubble avatar.
    expect(document.body.querySelectorAll(".msg-online-dot").length).toBeGreaterThan(0);

    act(() => h.cb.offline({ userId: "c1" }));
    expect(document.body.querySelector(".msg-online-dot")).toBeNull();
  });

  it("ignores an offline event for someone who was never online", async () => {
    h.getUserMessages.mockResolvedValue({ data: { data: [msg({ isRead: true })] } });
    renderModal();
    await settled();

    act(() => h.cb.offline({ userId: "c2" }));
    expect(document.body.querySelector(".msg-online-dot")).toBeNull();
  });
});

describe("a modal that goes away mid-flight", () => {
  // A promise the test settles by hand, so the unmount lands between the
  // request and its answer.
  const deferred = () => {
    let resolve;
    const promise = new Promise((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  it("drops a history that arrives after the modal has been torn down", async () => {
    const pending = deferred();
    h.getUserMessages.mockReturnValue(pending.promise);
    const { unmount } = renderModal();
    await waitFor(() => expect(h.getUserMessages).toHaveBeenCalled());
    unmount();

    await act(async () => {
      pending.resolve({ data: { data: [msg()] } });
    });

    expect(document.body.querySelector(".msg-modal")).toBeNull();
    expect(screen.queryByText("hello there")).not.toBeInTheDocument();
  });
});

describe("message histories in the other shapes the service answers with", () => {
  it("accepts a list held directly under `data`", async () => {
    h.getUserMessages.mockResolvedValue({ data: [msg()] });
    renderModal();
    await settled();
    expect(convNames()).toEqual(["Ada Lovelace"]);
  });

  it("accepts a bare list with no envelope at all", async () => {
    h.getUserMessages.mockResolvedValue([msg()]);
    renderModal();
    await settled();
    expect(convNames()).toEqual(["Ada Lovelace"]);
  });

  it("treats a response with nothing in it as no history", async () => {
    h.getUserMessages.mockResolvedValue(undefined);
    renderModal();
    await settled();
    expect(convNames()).toEqual([]);
  });
});

describe("a thread with messages from both sides", () => {
  const bothSides = () => {
    h.getUserMessages.mockResolvedValue({
      data: {
        data: [
          msg({ id: "theirs", senderId: "c1", receiverId: USER_ID }),
          msg({
            id: "mine",
            senderId: USER_ID,
            receiverId: "c1",
            content: "on it",
          }),
        ],
      },
    });
  };

  it("ticks only our own message when the partner reads the thread", async () => {
    bothSides();
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });

    act(() => h.cb.read({ readerId: "c1" }));

    expect(bubbles()).toEqual(["hello there", "on it"]);
    // One receipt in the thread, and it belongs to the message we sent.
    expect(document.body.querySelectorAll(".msg-receipt-read")).toHaveLength(1);
  });

  it("replaces only the pending row when the server acknowledges a send", async () => {
    bothSides();
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c1" } });
    fireEvent.change(messageBox(), { target: { value: "draft copy" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    act(() =>
      h.sendChatMessage.mock.calls[0][1]({
        success: true,
        message: {
          id: "server-1",
          senderId: USER_ID,
          receiverId: "c1",
          content: "server copy",
          createdAt: "2026-01-05T11:00:00.000Z",
          isRead: false,
        },
      })
    );

    expect(bubbles()).toEqual(["hello there", "on it", "server copy"]);
  });
});

describe("ordering the conversation list", () => {
  it("copes with a thread that has no last message and one with no timestamp", async () => {
    // c1 has a message the service sent without a createdAt; c2 is only in the
    // list because it is the client currently selected, so it has none at all.
    h.getUserMessages.mockResolvedValue({
      data: { data: [msg({ createdAt: undefined })] },
    });
    renderModal();
    await settled();
    fireEvent.change(picker(), { target: { value: "c2" } });

    expect(convNames()).toEqual(["Ada Lovelace", "Bob Stone"]);
  });
});
