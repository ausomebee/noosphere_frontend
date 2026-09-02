# Backend WebSocket & Chat/Notification Implementation Guide

> **Status: original proposal, superseded in places.** This document was written to
> specify the backend socket layer before it was built. The implementation that
> shipped diverges from it, so treat the code blocks below as background rather
> than as the current contract. The event names the frontend actually uses are in
> `src/api/socketService.js`; the table below is the authoritative summary.
>
> | Event | Direction | Notes |
> | --- | --- | --- |
> | `register` | client -> server | Sent on connect with the user and tenant ids. The guide below assumes a JWT handshake instead. |
> | `chatMessage` | both | As described below. |
> | `createConversation` | client -> server | Replaces the guide's `joinConversation` / `leaveConversation` pair. |
> | `typing` | both | As described below. |
> | `messagesRead` | both | Replaces the guide's `markAsRead`. |
> | `newNotification` | server -> client | The guide calls this `notification`. |
> | `notificationRead` | both | As described below. |
> | `userOnline` / `userOffline` | server -> client | As described below. |
>
> The guide's `newMessageNotification` and `error` events are not used by any of
> the three frontends.

## Current State

You have a basic `SocketService` class. Below is the **complete upgraded version** with all the socket events needed for **Chat** and **Notifications**, plus the **REST endpoints** and **database schemas** required.

---

## 1. Complete SocketService (Replace Existing)

```js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId → socketId
  }

  init(server) {
    this.io = new Server(server, {
      cors: { origin: "*" },
      path: "/api/v1/socket.io",
    });

    // ─── Auth Middleware ───
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id || decoded.userId;
        socket.tenantId = socket.handshake.query?.tenantId || decoded.tenantId;
        next();
      } catch (err) {
        next(new Error("Invalid token"));
      }
    });

    this.io.on("connection", (socket) => {
      const { userId, tenantId } = socket;
      console.log(`User connected: ${userId} (socket: ${socket.id})`);

      // ─── Track Online Status ───
      this.onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);     // personal room
      socket.join(`tenant:${tenantId}`); // tenant-wide room

      // Broadcast online status to tenant
      socket.to(`tenant:${tenantId}`).emit("userOnline", { userId });

      // ─── Chat: Join Conversation Room ───
      socket.on("joinConversation", ({ conversationId }) => {
        socket.join(`conversation:${conversationId}`);
      });

      // ─── Chat: Leave Conversation Room ───
      socket.on("leaveConversation", ({ conversationId }) => {
        socket.leave(`conversation:${conversationId}`);
      });

      // ─── Chat: Send Message ───
      socket.on("chatMessage", async (data) => {
        try {
          // data = { conversationId, receiverId, message }

          // 1. Save message to DB
          const saved = await this.saveMessage({
            conversationId: data.conversationId,
            senderId: userId,
            receiverId: data.receiverId,
            message: data.message,
            tenantId,
          });

          // 2. Update conversation's lastMessage + updatedAt
          await this.updateConversationLastMessage(data.conversationId, saved);

          // 3. Broadcast to conversation room (all participants)
          this.io.to(`conversation:${data.conversationId}`).emit("chatMessage", {
            id: saved.id,
            conversationId: data.conversationId,
            senderId: userId,
            receiverId: data.receiverId,
            message: data.message,
            read: false,
            createdAt: saved.createdAt,
          });

          // 4. Also emit to receiver's personal room (for unread badge updates)
          this.io.to(`user:${data.receiverId}`).emit("newMessageNotification", {
            conversationId: data.conversationId,
            senderId: userId,
            message: data.message,
            createdAt: saved.createdAt,
          });
        } catch (err) {
          console.error("chatMessage error:", err);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // ─── Chat: Typing Indicator ───
      socket.on("typing", ({ conversationId, isTyping }) => {
        socket.to(`conversation:${conversationId}`).emit("typing", {
          conversationId,
          userId,
          isTyping,
        });
      });

      // ─── Chat: Mark Messages as Read ───
      socket.on("markAsRead", async ({ conversationId }) => {
        try {
          await this.markMessagesRead(conversationId, userId);
          // Notify sender their messages were read
          socket.to(`conversation:${conversationId}`).emit("messagesRead", {
            conversationId,
            readBy: userId,
          });
        } catch (err) {
          console.error("markAsRead error:", err);
        }
      });

      // ─── Notifications: Mark as Read ───
      socket.on("notificationRead", async ({ notificationId }) => {
        try {
          await this.markNotificationRead(notificationId);
        } catch (err) {
          console.error("notificationRead error:", err);
        }
      });

      // ─── Disconnect ───
      socket.on("disconnect", () => {
        this.onlineUsers.delete(userId);
        socket.to(`tenant:${tenantId}`).emit("userOffline", { userId });
        console.log(`User disconnected: ${userId}`);
      });
    });
  }

  // ─── Helper: Send Notification (call from anywhere in backend) ───
  sendNotification({ userId, notification }) {
    this.io.to(`user:${userId}`).emit("notification", notification);
  }

  // ─── Helper: Broadcast to Tenant ───
  sendToTenant({ tenantId, event, data }) {
    this.io.to(`tenant:${tenantId}`).emit(event, data);
  }

  getIO() {
    if (!this.io) throw new Error("Socket.IO not initialized");
    return this.io;
  }

  // ─── DB Methods (implement with your ORM — Prisma examples below) ───

  async saveMessage({ conversationId, senderId, receiverId, message, tenantId }) {
    // TODO: Implement with Prisma/TypeORM
    // return await prisma.message.create({
    //   data: { conversationId, senderId, receiverId, message, tenantId, read: false }
    // });
  }

  async updateConversationLastMessage(conversationId, message) {
    // TODO: Update conversation.updatedAt and optionally store lastMessage
  }

  async markMessagesRead(conversationId, userId) {
    // TODO: Mark all messages in conversation where receiverId = userId as read
    // await prisma.message.updateMany({
    //   where: { conversationId, receiverId: userId, read: false },
    //   data: { read: true }
    // });
  }

  async markNotificationRead(notificationId) {
    // TODO: Mark notification as read
    // await prisma.notification.update({
    //   where: { id: notificationId },
    //   data: { read: true }
    // });
  }
}

export default new SocketService();
```

---

## 2. Database Schemas (Prisma)

```prisma
model Conversation {
  id           String    @id @default(uuid())
  tenantId     String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  participants ConversationParticipant[]
  messages     Message[]
}

model ConversationParticipant {
  id             String       @id @default(uuid())
  conversationId String
  userId         String
  joinedAt       DateTime     @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id])

  @@unique([conversationId, userId])
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  senderId       String
  receiverId     String
  message        String
  read           Boolean      @default(false)
  tenantId       String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  conversation   Conversation @relation(fields: [conversationId], references: [id])
}

model Notification {
  id          String   @id @default(uuid())
  type        String   // "appointment" | "document" | "client" | "system" | "alert"
  title       String
  description String
  userId      String
  tenantId    String
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 3. REST Endpoints to Implement

### Conversations

| Method | Endpoint                                | Body / Params                          | Description                                  |
|--------|-----------------------------------------|----------------------------------------|----------------------------------------------|
| POST   | `/api/v1/conversations`                 | `{ participants: [userId1, userId2], tenantId }` | Create a new conversation                    |
| GET    | `/api/v1/conversations/user/:userId`    | Query: `?tenantId=`                    | Get all conversations for user (with last message, unread count, participant names) |

**GET response shape:**

```json
{
  "data": [
    {
      "id": "uuid",
      "participants": [
        { "userId": "uuid", "fullName": "John Doe" }
      ],
      "lastMessage": {
        "message": "Hello",
        "senderId": "uuid",
        "createdAt": "2026-02-20T12:00:00Z"
      },
      "unreadCount": 2,
      "updatedAt": "2026-02-20T12:00:00Z"
    }
  ]
}
```

---

### Messages

| Method | Endpoint                                         | Body / Params             | Description                           |
|--------|--------------------------------------------------|---------------------------|---------------------------------------|
| GET    | `/api/v1/messages/conversation/:conversationId`  | Query: `?page=1&limit=50` | Paginated message history (newest first) |
| PATCH  | `/api/v1/messages/read/:conversationId/:userId`  | —                         | Mark all messages as read for user    |

**GET response shape:**

```json
{
  "data": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "senderId": "uuid",
      "receiverId": "uuid",
      "message": "Hello there",
      "read": false,
      "createdAt": "2026-02-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

---

### Notifications

| Method | Endpoint                                          | Body / Params        | Description                     |
|--------|---------------------------------------------------|----------------------|---------------------------------|
| GET    | `/api/v1/notifications/user/:userId`              | Query: `?tenantId=`  | Get all notifications for user  |
| PATCH  | `/api/v1/notifications/:notificationId/read`      | —                    | Mark single notification as read |
| GET    | `/api/v1/notifications/unread-count/:userId`      | Query: `?tenantId=`  | Get unread notification count   |

**GET response shape:**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "appointment",
      "title": "New Appointment Scheduled",
      "description": "Orlando Diggs has been scheduled for Friday 3:00 PM.",
      "userId": "uuid",
      "tenantId": "uuid",
      "read": false,
      "createdAt": "2026-02-20T12:00:00Z"
    }
  ]
}
```

**Unread count response:**

```json
{
  "data": { "count": 5 }
}
```

---

## 4. Socket Events Summary

### Client → Server

| Event              | Payload                                             | Description                      |
|--------------------|-----------------------------------------------------|----------------------------------|
| `joinConversation` | `{ conversationId }`                                | Join a conversation room         |
| `leaveConversation`| `{ conversationId }`                                | Leave a conversation room        |
| `chatMessage`      | `{ conversationId, receiverId, message }`           | Send a message                   |
| `typing`           | `{ conversationId, isTyping }`                      | Typing indicator                 |
| `markAsRead`       | `{ conversationId }`                                | Mark messages as read            |
| `notificationRead` | `{ notificationId }`                                | Mark notification as read        |

### Server → Client

| Event                    | Payload                                                           | Description                        |
|--------------------------|-------------------------------------------------------------------|------------------------------------|
| `chatMessage`            | `{ id, conversationId, senderId, receiverId, message, read, createdAt }` | New message in conversation        |
| `newMessageNotification` | `{ conversationId, senderId, message, createdAt }`                | Badge/alert for receiver           |
| `typing`                 | `{ conversationId, userId, isTyping }`                            | Someone is typing                  |
| `messagesRead`           | `{ conversationId, readBy }`                                     | Messages were read by user         |
| `notification`           | `{ id, type, title, description, userId, tenantId, read, createdAt }` | Real-time notification             |
| `userOnline`             | `{ userId }`                                                     | User came online                   |
| `userOffline`            | `{ userId }`                                                     | User went offline                  |

---

## 5. How to Send Notifications from Backend

Anywhere in your backend (e.g., after creating an appointment, uploading a document):

```js
import socketService from "./socketService.js";

// Send to a specific user
socketService.sendNotification({
  userId: "target-user-id",
  notification: {
    id: "generated-uuid",
    type: "appointment",
    title: "New Appointment Scheduled",
    description: "Session scheduled for Friday 3:00 PM.",
    userId: "target-user-id",
    tenantId: "tenant-uuid",
    read: false,
    createdAt: new Date().toISOString(),
  },
});

// Broadcast to entire tenant
socketService.sendToTenant({
  tenantId: "tenant-uuid",
  event: "notification",
  data: { type: "system", title: "System Maintenance", description: "..." },
});
```

---

## 6. Connection Auth

The frontend connects with:

```js
socket = io(SOCKET_URL, {
  auth: { token: accessToken },       // JWT Bearer token
  query: { userId, tenantId },
  transports: ["websocket"],
});
```

The backend middleware should:

1. Extract `token` from `socket.handshake.auth.token`
2. Verify with `jwt.verify(token, JWT_SECRET)`
3. Attach `userId` and `tenantId` to the socket instance
4. Reject connection if token is invalid/expired
