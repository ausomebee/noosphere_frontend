# Noosphere Client Portal

The Client Portal is the patient and caregiver-facing application within the Noosphere platform. It provides clients of ABA therapy clinics with a self-service interface to view their appointments, provide session feedback, manage documents, track their therapy programs, communicate with clinicians, and manage their profile and notification preferences.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Authentication](#authentication)
- [Key Modules in Detail](#key-modules-in-detail)
- [Conventions and Patterns](#conventions-and-patterns)
- [API Layer](#api-layer)
- [State Management](#state-management)
- [Build Optimization](#build-optimization)

## Features

### Home Dashboard

The home page serves as the central hub with multiple data views:

- **Overview Cards** — completed sessions count, average session duration, upcoming session count, and a period-based session chart
- **Authorization Tracker** — service code utilization with progress bars showing authorized vs. completed vs. remaining units
- **Appointment Tabs** — five tab views:
  - **Upcoming** — future appointments with reschedule and view details actions
  - **Awaiting Feedback** — completed sessions pending client review
  - **Reschedule Requests** — submitted reschedule requests with accepted/rejected/pending status badges
  - **Completed** — past sessions with duration and clinician info
  - **Cancelled** — cancelled appointments with reason tracking
- **Awaiting Feedback Count** — badge showing number of sessions needing review

### Session Feedback and Review

When a session is completed and awaiting feedback, the client can:

- View session details (clinician, date, service type, duration)
- Read SOAP notes written by the clinician
- View session data (goals worked on, data collected)
- Rate the service quality (1-5 stars)
- Rate the therapist (1-5 stars)
- Write free-text feedback
- Confirm service delivery via checkbox
- Provide signature (draw, type, or upload)
- Submit approval — triggers notification to the supervising clinician

### Appointment Management

- **View Details** — full appointment information including clinician(s), service types with codes, session type, location, travel requirements, and recurrence patterns
- **Request Reschedule** — modal pre-populated with current appointment data showing:
  - Current appointment summary (session type, clinician, date/time)
  - New date picker
  - New start and end time selection
  - Reason for rescheduling (required)
- **Reschedule Status** — track whether requests are accepted, rejected, or pending

### Programs and Targets

- View assigned ABA programs with descriptions
- Track target performance over time with data visualization
- Session history per target with data collection results
- Performance charts showing progress trends

### Documents and Forms

- **My Documents** — personal document management:
  - Create folders for organization
  - Upload files with drag-and-drop
  - View, download, and delete documents
  - File type icons (PDF, images, Word, Excel)
- **Document Requests** — respond to documents requested by the clinic:
  - View request details with due dates
  - Upload requested documents
  - Track submission status (pending, submitted, overdue)
- **Shared Forms** — fill out forms shared by the clinic:
  - Dynamic form rendering supporting text, number, date, select, checkbox, file upload, signature, rating, and rich text fields
  - Form responses saved and viewable by the clinic
  - PDF export of completed forms

### Real-time Chat

- Socket.IO-based messaging with assigned clinicians
- Message history with date grouping (Today, Yesterday, weekday headers)
- Online/offline presence indicators
- Typing indicators
- Read receipt synchronization across devices

### Notifications

- Real-time push notifications via Socket.IO
- 15 notification types organized by category:
  - Appointments (scheduled, rescheduled, started, cancelled, completed)
  - Documents (requested, nudged)
  - Forms (shared)
  - Authorizations (expiring, expired, units exhausted)
  - Clinical reports (signature requested)
- Mark as read with optimistic UI updates
- Type-based grouping and ordering

### Profile

- View and edit personal information
- Profile photo upload with image type validation (JPEG, PNG, GIF)
- Notification preferences with 13 configurable toggles:
  - Appointment notifications (6 types)
  - Document notifications (2 types)
  - Form notifications (1 type)
  - Authorization alerts (4 types)
  - Signature requests (1 type)

### Success Feedback

- Dynamic success modal with context-specific messaging:
  - Reschedule: "Your reschedule request has been sent!"
  - Session feedback: "Your session feedback has been submitted!"
- Auto-dismisses after 3.5 seconds

## Project Structure

```text
src/
├── api/                         API service files
│   ├── authApis.js              Client authentication (login, password, 2FA)
│   ├── homeApis.js              Dashboard data, appointments, sessions,
│   │                            reschedule, approve, nudge
│   ├── documentsAndFormsApis.js Documents CRUD, forms, folders, file upload
│   ├── messageApi.js            Chat messaging and notifications
│   ├── profileAndSettingsApi.js Profile data, notification preferences
│   ├── programsApis.js          Programs, targets, session data
│   ├── ImageUpload.js           File upload utility with progress tracking
│   └── socketService.js         Socket.IO connection, events, cleanup
│
├── assets/                      Images, logos, SVGs
│   ├── Images/                  Auth page images
│   └── Logo.svg                 App logo
│
├── Components/                  Reusable UI components
│   ├── FormRender/              Dynamic form renderer for shared forms
│   │   ├── FormRenderer.jsx     Field-type-aware rendering (977 lines)
│   │   └── FormRenderer.css
│   ├── Input/                   Input components
│   │   ├── Inputs.jsx           TextInput, SelectInput, TextareaInput,
│   │   │                        CheckboxInput, SwitchInput, TimeInput
│   │   └── Inputs.css
│   ├── Modal/                   All modal dialogs
│   │   ├── DocumentModal/       NewFileModal, NewFolderModal, FolderFileModal,
│   │   │                        DocumentViewer, SelectFromMyDocumentsModal
│   │   ├── UpcomingDashboardModal/
│   │   │   ├── AppointmentDetailsModal.jsx
│   │   │   ├── RescheduleModal.jsx
│   │   │   └── ReviewSessionModal.jsx  (1,364 lines — session review flow)
│   │   ├── MessageModal.jsx     Real-time chat interface
│   │   ├── ReusableModal.jsx    Base modal wrapper with portal rendering
│   │   └── SuccessModal.jsx     Dynamic success feedback with SVG animation
│   ├── NotificationSettings/    Notification preference toggles
│   ├── Table/                   ReusableTable with tabs, pagination, search
│   └── ProtectedRoute.jsx       Auth guard for routes
│
├── Data/                        Centralized static data
│   ├── selectOptions.js         Navigation config, MIME map, file colors,
│   │                            avatar default, image type validation
│   └── notificationConfig.js    TYPE_LABEL mapping, TYPE_ORDER array,
│                                notification preference items (13 toggles)
│
├── Helper/                      Utility modules
│   ├── AxiosInterceptor.jsx     Token refresh with request queuing (30s timeout),
│   │                            device fingerprint header injection
│   ├── ErrorBoundary.jsx        React error boundary with "Refresh Page" button
│   ├── Formatters.js            Centralized date/time formatters (7 exports):
│   │                            formatDate, formatDateShort, formatDateTime,
│   │                            formatTimeFromDate, formatTime, formatDateHeader,
│   │                            formatMsgTime
│   ├── ShowToast.jsx            Toast notification utility with deduplication
│   ├── getSubdomain.jsx         Tenant subdomain extraction from hostname
│   └── fingerprint.js           Device fingerprint UUID for session tracking
│
├── hooks/                       Custom React hooks
│   ├── useAuth.js               Auth state (clientId, tenantClientId, tenantId,
│   │                            accessToken, refreshToken)
│   ├── useIdleTimeout.js        30-min idle auto-logout with event cleanup
│   ├── useNotificationSettings.jsx  Notification preferences CRUD with API sync
│   └── useSocket.js             Socket.IO connection lifecycle with event handlers
│
├── layouts/                     Application shell
│   ├── ClientLayout.jsx         Bottom navigation (mobile), sidebar (desktop),
│   │                            logout, message icon, notification badge
│   └── DashboardLayout.css
│
├── Pages/                       Route-level page components
│   ├── Authentication/          Multi-step login flow:
│   │   ├── Login/               ClientLogin.jsx — email + password
│   │   ├── NewClientLogin/      IntialLogin.jsx — first-time password set
│   │   │                        IntialResetPassword.jsx — token-based reset
│   │   │                        IntialResetSuccessful.jsx — confirmation
│   │   └── ForgotPassword/      ForgotPassword, CheckEmail, ChangePassword
│   ├── DocumentsAndForms/
│   │   ├── DocumentRequest/     DocumentRequests.jsx — clinic-requested docs
│   │   └── MyDocuments/         MyDocuments.jsx — personal file management
│   ├── Home/                    Home.jsx — main dashboard (896 lines) with
│   │                            5 appointment tabs, overview cards, charts
│   ├── Notification/            Notifications.jsx — grouped notification list
│   ├── Profile/                 Profile.jsx — personal info, photo, preferences
│   └── Programs/                Programs.jsx — ABA program tracking
│
├── ReduxStore/                  Redux Toolkit state management
│   ├── features/
│   │   └── authentication.js    Client auth state with token migration support
│   ├── rootReducer.js
│   └── store.js                 Store with redux-persist (v1.0.0),
│                                whitelisted slices: auth, formBuilder, formResponse
│
├── test/                        Unit tests (Vitest + RTL)
│   ├── AuthorizationCard.test.jsx
│   ├── OverviewCard.test.jsx
│   ├── ReusableTable.test.jsx
│   ├── SuccessModal.test.jsx
│   └── ...
│
└── utils/                       (reserved for future utilities)
```

## Environment Variables

Create a `.env` file in the client root directory:

```env
VITE_API_URL=https://your-api-url.com/api/v1
```

The Socket.IO connection URL is automatically derived from the API URL origin.

## Scripts

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5175/client/
npm run build     # Production build (output: dist/)
npm run preview   # Preview production build locally
npm test          # Run unit tests with Vitest
```

## Authentication

### Login Flow

The client module supports two authentication paths:

**Returning clients:**
1. Enter email + password on login page
2. Backend returns JWT access token + refresh token
3. Tokens stored in Redux memory
4. Redirected to dashboard

**First-time clients (invited by clinic):**
1. Click link from invitation email
2. Set initial password
3. Complete first-time setup
4. Redirected to dashboard

### Password Recovery
1. Enter email on forgot password page
2. Check email for reset link
3. Click link and set new password
4. Confirmation page with redirect to login

### Device Fingerprinting

The client module generates a unique device fingerprint (UUID) stored in localStorage. This fingerprint is sent with every API request via the `x-fingerprint` header, allowing the backend to:

- Track sessions across page reloads
- Detect suspicious multi-device activity
- Support device-aware security policies

### Session Security

- 30-minute idle timeout with automatic logout
- Socket.IO disconnection on logout
- `persistor.purge()` clears all persisted Redux state
- Token refresh with concurrent request queuing

## Key Modules in Detail

### Session Review Flow (ReviewSessionModal)

The most complex component in the client module (1,364 lines). It handles:

1. **Data Fetching** — loads full session details from API on modal open
2. **Session Info Display** — clinician names, date/time, service types, location
3. **SOAP Notes Modal** — read-only view of clinician's session notes
4. **Session Data Modal** — goals, targets, and data collected during session
5. **Rating System** — 5-star ratings for service quality and therapist
6. **Feedback Input** — free-text area for written feedback
7. **Delivery Confirmation** — checkbox confirming service was delivered
8. **Signature Capture** — three modes:
   - Draw (react-signature-canvas)
   - Type (text input rendered as cursive)
   - Upload (image file)
9. **Submit** — sends approval to backend, triggers success modal

### Dynamic Form Renderer

Renders clinic-shared forms with full field type support:

- Text, number, email, phone inputs
- Date picker
- Single and multi-select dropdowns
- Checkbox groups and radio buttons
- File upload with type/size validation
- Signature capture
- Star rating
- Rich text with HTML sanitization
- Conditional field visibility

Forms are rendered from a JSON schema defining field types, labels, validation rules, and ordering.

### Notification System

Two-layer notification architecture:

**Real-time layer (Socket.IO):**
- `onNotification` event handler receives new notifications
- Immediately updates UI without page refresh
- `emitNotificationRead` syncs read status across devices

**REST layer (API):**
- Fetch notification history on page load
- Mark individual notifications as read (optimistic UI update)
- Grouped by type with configurable display order

### Chat System

Real-time messaging between clients and their assigned clinicians:

- Clinician list loaded from API (assigned clinicians only)
- Message history fetched and grouped by conversation partner
- New messages arrive via Socket.IO `onChatMessage` event
- Typing indicators via `emitTyping` / `onTyping` events
- Online presence tracking via `onlineUsers` set
- Date headers in conversation (Today, Yesterday, weekday)
- Mounted ref guards prevent state updates on unmounted component

## Conventions and Patterns

| Convention | Detail |
| --- | --- |
| **Formatting** | All date/time formatting via `Helper/Formatters.js` (7 exports) |
| **Static Data** | Select options in `Data/selectOptions.js`, notification config in `Data/notificationConfig.js` |
| **Error Feedback** | Every catch block includes `showToast()` for user-facing feedback |
| **Console Logging** | Production build strips ALL console output via Terser; DEV guards on remaining statements |
| **Form Validation** | React Hook Form + Yup schemas for all input forms |
| **Route Protection** | `ProtectedRoute` redirects unauthenticated users to login |
| **Idle Timeout** | 30-min auto-logout via `useIdleTimeout` hook with full cleanup |
| **Error Boundary** | App wrapped in `ErrorBoundary` with "Refresh Page" fallback |
| **Race Conditions** | Async state updates guarded with `mountedRef` pattern in modals |
| **Success Modal** | Dynamic `title` and `message` props for context-specific feedback |

## API Layer

All API calls use the shared `AxiosInterceptor` pattern with one addition unique to the client module:

```javascript
// Client-specific: device fingerprint header on every request
config.headers["x-fingerprint"] = getFingerprint();
```

The interceptor provides:

- Automatic Bearer token attachment
- Device fingerprint injection
- 401 detection with token refresh and request queuing
- 30-second request timeout
- Error messages thrown with meaningful fallback text

### Key API Endpoints

| API File | Endpoints | Purpose |
| --- | --- | --- |
| `authApis.js` | Login, refresh, forgot password, reset password, initial setup | Authentication |
| `homeApis.js` | Client overview, appointments (upcoming/awaiting/completed/cancelled/rescheduled), single session, approve session, reschedule, nudge | Dashboard and appointments |
| `documentsAndFormsApis.js` | Folders CRUD, files CRUD, document requests, forms, form responses | Documents and forms |
| `messageApi.js` | Messages, notifications, mark read | Chat and notifications |
| `profileAndSettingsApi.js` | Client profile, notification settings | Profile management |
| `programsApis.js` | Programs, targets, sessions | ABA program tracking |

## State Management

Redux Toolkit with 1 primary slice:

| Slice | Purpose |
| --- | --- |
| `authentication` | Client auth state with `clientId`, `tenantClientId`, `tenantId`, `accessToken`, `refreshToken`, user profile data |

Additional slices are whitelisted for persistence: `formBuilder` and `formResponse` (for preserving form state across page reloads).

### Token Migration

The store includes automatic migration from older token structures:

```javascript
// If old structure had 'token', migrate to 'accessToken'
if (state.auth.token && !state.auth.accessToken) {
  state.auth.accessToken = state.auth.token;
}
```

This ensures backward compatibility when upgrading from earlier versions.

## Build Optimization

The client module uses aggressive production optimization:

### Terser Minification

```javascript
minify: 'terser',
terserOptions: {
  compress: {
    drop_console: true,    // Removes ALL console.* calls
    drop_debugger: true,   // Removes all debugger statements
  },
},
```

### Manual Chunk Splitting

| Chunk | Contents | Size (gzip) |
| --- | --- | --- |
| `vendor-react` | React, ReactDOM, React Router | ~16KB |
| `vendor-redux` | Redux Toolkit, React Redux, redux-persist | ~12KB |
| `vendor-charts` | ApexCharts | ~154KB |
| `vendor-pdf` | jsPDF, html2canvas | varies |
| `vendor-forms` | React Hook Form, Yup | ~20KB |
| `vendor-ui` | React Select, React Toastify, React Icons | ~39KB |
| `vendor-payments` | Stripe.js, PayPal SDK | varies |

Vendor chunks are cached long-term by browsers. Only application code chunks change between deployments, minimizing download size for returning users.
