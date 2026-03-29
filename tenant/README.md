# Noosphere Tenant Portal

The Tenant Portal is the primary application for ABA (Applied Behavior Analysis) therapy clinics and behavioral health organizations. It is used by clinic staff, clinicians (BCBAs, RBTs, therapists), supervisors, and tenant administrators to manage every aspect of their practice — from client intake to billing and payroll.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Authentication and Authorization](#authentication-and-authorization)
- [Tenant Format Settings](#tenant-format-settings)
- [Key Modules in Detail](#key-modules-in-detail)
- [Conventions and Patterns](#conventions-and-patterns)
- [API Layer](#api-layer)
- [State Management](#state-management)
- [Real-time Features](#real-time-features)

## Features

### Dashboard
- Session overview cards (completed sessions, average duration, upcoming count)
- Authorization utilization metrics with donut charts
- Productivity and availability information
- Upcoming appointments list with quick actions
- Period-based session charts (weekly, monthly, yearly)

### Scheduler
- Interactive calendar with day, week, and month views
- Appointment creation with service type selection, clinician assignment, and recurrence patterns (daily, weekly, monthly)
- Appointment rescheduling and cancellation with reason tracking
- Start appointment flow with travel time tracking, session timer, and data collection
- Cancelled and rescheduled appointment reports

### Client Management
- Client pipeline with Kanban-style board (customizable stages)
- Client intake forms with demographics, insurance, caregiver information
- Clinical panel with multiple tabs:
  - **Info** — basic information, documents, and document requests
  - **Authorization** — insurance authorization tracking with utilization bars and expiry alerts
  - **Appointments and Schedules** — client-specific calendar view
  - **Clinical Reports** — report builder with template library, SOAP notes, consent signatures, and version history
  - **Audit Trails** — change history for compliance

### Organization
- Staff and teams management with invite, edit, and deactivation
- Single staff view with tabs: payroll, clients, appointments, upcoming schedules, licenses, and documents
- Roles and permissions with granular module-level access control (11 modules, 3 data access levels)
- Session types with categories, location options, service codes, and modifiers
- License management per staff member
- Service type configuration

### Billing and Payments
- Timesheet management with session approval workflows (client approval + supervisor approval)
- Claims generation from approved timesheets
- Payer/insurance management with service code rates and modifiers
- Rounding rules (8-minute rule, midpoint rule, exact time)
- PDF export for timesheets and claims
- Billing settings configuration

### Payroll
- Employee payment schedules (hourly, salaried)
- Income items and deductions management
- Payroll cycle processing with breakdown views
- Compensation type configuration
- Preview payroll with gross/net calculations

### Program Library
- ABA program and target management
- Teaching procedures (DTT, NET, incidental teaching, chaining, shaping, etc.)
- Prompt strategies (most-to-least, least-to-most, time delay, etc.)
- Data collection types:
  - **Frequency** — event counting
  - **Rate** — events per time unit with timer
  - **Duration** — session timing with start/stop
  - **Latency** — response time measurement
  - **Percentage Correct** — correct/incorrect trial tracking
  - **Trials/Opportunities** — discrete trial data with prompt levels
  - **Task Analysis** — step-by-step performance tracking
- Mastery criteria with configurable thresholds
- Session data visualization with charts and graphs

### Custom Forms
- Drag-and-drop form builder with field types: text, number, date, select, checkbox, file upload, signature, rating, rich text
- Template library for reusable form structures
- Form drafts with auto-save
- Form responses with inline viewing and PDF export
- Form sharing with clients

### Clinical Reports
- Report builder with configurable sections
- Template library (create, edit, clone templates)
- Auto-populated client data (demographics, diagnoses, authorizations)
- Consent and signature sections
- Change request workflow
- Version tracking with created/updated metadata
- PDF export with professional formatting

### Reports
- Cancelled appointments report with filtering
- Rescheduled appointments report
- Audit logs (login history, system events)
- Filterable and exportable tables

### Settings
- **General Settings** — configurable date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, MMM DD YYYY), time format (12-hour, 24-hour), and currency (USD, EUR, GBP, NGN, CAD)
- **Notification Settings** — granular notification preferences across 6 categories (calendar, client management, organization, billing, payroll, support)
- **Security** — password change, 2FA configuration (security questions, authenticator app), security question management
- **Clinical Reports** — template library management

### Help and Support
- Support request submission and tracking
- Issue detail views with status updates

### Real-time Features
- Socket.IO messaging between staff and clients
- Push notifications for appointments, documents, and authorizations
- Online/offline user presence indicators
- Typing indicators in chat

## Project Structure

```text
src/
├── api/                         API service files (one per domain)
│   ├── AppointmentApi.js        Appointment CRUD, recurrence, reschedule
│   ├── authApis.js              Login, token refresh, password management
│   ├── billingAndPaymentsApi.js Timesheets, claims, payers, service codes
│   ├── clientPanelApis.js       Client authorization, clinical reports
│   ├── customFormsApi.js        Form builder, responses, templates
│   ├── DashboardApis.js         Overview metrics, charts
│   ├── generalSettingsApi.js    Tenant settings, security questions, 2FA
│   ├── notificationApi.js       Notification fetch, read, settings
│   ├── organisationApis.js      Staff, teams, pipeline
│   ├── organisationStaffApis.js Staff CRUD, documents, licenses
│   ├── payrollApis.js           Payroll cycles, income, deductions
│   ├── programLibraryApis.js    Programs, targets, session data
│   ├── roleApi.js               Roles, permissions, module access
│   ├── socketService.js         Socket.IO connection and event handlers
│   └── TenantApis.js            Tenant info, service types
│
├── assets/                      Static images, logos, SVGs
│
├── Components/                  Reusable UI components
│   ├── Button/                  Primary/secondary/danger button variants
│   ├── CalendarScheduler/       Day, Week, Month views with event rendering
│   ├── FileUpload/              Drag-and-drop file upload with progress
│   ├── Input/                   TextInput, SelectInput, CheckboxInput,
│   │                            SwitchInput, RadioInput, TimeInput,
│   │                            RichTextEditor, ReportBuilderInputs
│   ├── JiraBoard/               Kanban board with drag-and-drop columns
│   ├── LoadingSpinner.jsx       Full-page and inline loading indicators
│   ├── ManageColumn/            Column configuration and filtering
│   ├── MessageModal/            Real-time chat modal
│   ├── ProtectedRoute.jsx       Auth guard for routes
│   ├── ReusableModal/           All modal dialogs organized by domain:
│   │   ├── BillingAndPaymentModal/
│   │   ├── ClientModal/
│   │   ├── DataCollectionModal/
│   │   ├── OrganizationModal/
│   │   ├── PayrollModal/
│   │   ├── PricingModal.jsx
│   │   ├── ProgramLibraryModal/
│   │   ├── SchedulerModal/
│   │   └── ReusableModal.jsx    Base modal wrapper
│   └── Table/                   CustomTable, AccordionTable,
│                                AccordionTableRobust, Pagination,
│                                TableBody, TableHeader, TableFilters
│
├── Data/                        Centralized static data constants
│   ├── selectOptions.js         All dropdown/select option arrays
│   ├── permissionsConfig.js     Role permission structure (11 modules)
│   ├── mockData.js              Development mock data
│   └── schemas.js               Shared Yup validation schemas
│
├── Helper/                      Utility modules
│   ├── AxiosInterceptor.jsx     Axios with token refresh queue (30s timeout)
│   ├── ErrorBoundary.jsx        React error boundary with fallback UI
│   ├── Formatters.js            20+ formatting functions (date, time,
│   │                            currency, duration, file size, labels)
│   ├── ShowToast.jsx            Toast notification utility (react-toastify)
│   └── getSubdomain.jsx         Tenant subdomain extraction with validation
│
├── hooks/                       Custom React hooks
│   ├── useAuth.js               Authentication state (user, tokens, tenant)
│   ├── useFormatSettings.js     Tenant format preferences from Redux/API
│   ├── useIdleTimeout.js        30-min idle auto-logout with cleanup
│   ├── usePermissions.js        Role-based permission checking
│   ├── usePortal.jsx            DOM portal for modals/popups
│   └── useSocket.js             Socket.IO connection lifecycle
│
├── Layout/                      Application shell
│   ├── DashboardLayout.css
│   └── TenantLayout.jsx         Sidebar nav, header, profile dropdown,
│                                notification bell, message icon
│
├── Pages/                       Route-level page components
│   ├── BillingAndPayment/       TimeSheet, Claims, Settings (payers, etc.)
│   ├── Client/                  ClientList, Pipeline, ClientPanel (6 tabs)
│   ├── ClientReportView/        Read-only report viewer with PDF export
│   ├── CustomForms/             Forms list, FormBuilder, FormResponses,
│   │                            FormRenderer, TemplateLibrary
│   ├── Dashboard/               DashboardCards (5 widget components)
│   ├── HelpAndSupport/          SupportRequests, ViewRequestDetails
│   ├── Notifications/           Notification list with type grouping
│   ├── Organisation/            General, StaffAndTeams, RoleAndPermissions
│   ├── Payroll/                 Payroll list, ViewBreakDown, PayrollSettings
│   ├── ProgramLibrary/          TargetLibrary, TargetSingle (data collection)
│   ├── Reports/                 CancelledAppointments, Rescheduled, AuditLogs
│   ├── Scheduler/               Calendar, StartAppointment, sub-views
│   └── Settings/                GeneralSettings, NotificationSettings,
│                                ClinicalReports (template library)
│
├── ReduxStore/                  Redux Toolkit state management
│   ├── features/
│   │   ├── authentication.js    User auth state, login/logout actions
│   │   ├── generalSettingsSlice.js  Date/time/currency format preferences
│   │   ├── PipelineSlice.js     Client pipeline stages
│   │   ├── AddTargetDraftSlice.js
│   │   ├── AddStaffDraftSlice.js
│   │   ├── clientDraftSlice.js
│   │   ├── clinicalReportSlice.js
│   │   ├── clinicalReportTemplateSlice.js
│   │   ├── formBuilderSlice.js
│   │   ├── roleDraftSlice.js
│   │   └── tenantSlice.js       Subdomain state
│   ├── rootReducer.js           Combined reducers
│   └── store.js                 Store config with redux-persist
│
├── styles/                      Global and shared CSS files
├── test/                        Unit tests (Vitest + RTL)
└── utils/
    ├── expand.js                Appointment recurrence expansion
    ├── expandForAppointments.js Wrapper for date range expansion
    └── TableUtils.jsx           CSV, PDF, and print export utilities
```

## Environment Variables

Create a `.env` file in the tenant root directory:

```env
VITE_API_URL=https://your-api-url.com/api/v1
```

## Scripts

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173/tenant/
npm run build     # Production build (output: dist/)
npm run preview   # Preview production build locally
npm test          # Run unit tests with Vitest
```

## Authentication and Authorization

### Authentication Flow

1. User enters email + password on login page
2. Backend returns JWT access token + refresh token
3. Tokens stored in Redux memory (NOT localStorage)
4. `AxiosInterceptor` attaches Bearer token to every API request
5. On 401 response, interceptor automatically refreshes the token
6. Concurrent requests during refresh are queued and replayed with the new token
7. On refresh failure, user is redirected to login

### Authorization (RBAC)

The tenant module implements role-based access control with three levels:

1. **Module access** — which modules a role can see (Dashboard, Scheduler, Clients, etc.)
2. **Data access level** — Global (all data), Team (team data only), or Individual (own data only)
3. **Granular permissions** — specific actions within each module (view, create, edit, delete, approve)

Enforced via:

- `ModuleGuard` component in routes — blocks access to unauthorized modules
- `usePermissions()` hook — checks specific permissions for UI elements
- Backend validation — all API calls verified server-side

## Tenant Format Settings

The Settings page allows tenants to configure display preferences that apply across the entire application:

| Setting | Options | Default |
| --- | --- | --- |
| Date Format | MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, MMM DD, YYYY | MM/DD/YYYY |
| Time Format | 12-hour (AM/PM), 24-hour | 12-hour |
| Currency | USD ($), EUR, GBP, NGN, CAD | USD |

### How It Works

1. Settings stored via API endpoint (`/tenant-general-settings`)
2. On app load, `useFormatSettings()` hook fetches settings and caches in Redux (`generalSettingsSlice`)
3. All formatting functions in `Helper/Formatters.js` accept the format as a parameter
4. Components call: `formatDate(dateStr, dateFormat)`, `formatTime(timeStr, timeFormat)`, `formatCurrency(amount, currency)`
5. When settings change in the Settings page, Redux store is updated and all components re-render with the new format

## Key Modules in Detail

### Calendar Scheduler

Three view modes rendering appointments:

- **DayView** — hourly timeline with appointment blocks
- **WeekView** — 7-day grid with hourly rows
- **MonthView** — traditional monthly calendar with event dots

Appointments support recurrence patterns: daily, weekly (with day selection), and monthly (by date or day-of-week). The `utils/expand.js` utility generates recurring instances within a 6-month window.

### Data Collection

Six specialized modals for ABA session data recording:

- **FrequencyModal** — simple event counter with increment/decrement
- **RateModal** — events per time unit with built-in timer
- **DurationModal** — session duration with start/stop/pause timer
- **LatencyModal** — stimulus-to-response time measurement per trial
- **PercentageCorrectModal** — correct/incorrect recording per trial with prompt levels
- **TrialsOpportunitiesModal** — discrete trial data with prompt hierarchy
- **TaskAnalysisModal** — step-by-step task performance with independence levels

### Clinical Report Builder

A rich document builder that supports:

- Configurable sections (demographics, diagnoses, goals, treatment plans, etc.)
- Auto-populated client data from the system
- Rich text editing with DOMPurify sanitization
- Consent signature capture
- Template library for reusable report structures
- Change request workflow between clinicians
- PDF export with professional formatting

## Conventions and Patterns

| Convention | Detail |
| --- | --- |
| **Formatting** | All date/time/currency formatting via `Helper/Formatters.js` — never inline `toLocaleDateString()` |
| **Static Data** | All dropdown options in `Data/selectOptions.js` — never hardcode arrays in components |
| **Error Feedback** | Every catch block includes `showToast("message", "error")` for user-facing feedback |
| **Console Logging** | All `console.warn`/`console.info`/`console.log` guarded with `import.meta.env.DEV` |
| **Form Validation** | React Hook Form + Yup schemas for all user-input forms |
| **Route Protection** | `ProtectedRoute` for auth, `ModuleGuard` for role-based module access |
| **Idle Timeout** | 30-minute inactivity auto-logout via `useIdleTimeout` hook |
| **Token Security** | Tokens in Redux memory only; `persistor.purge()` on logout |

## API Layer

All API calls follow the same pattern:

```javascript
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetSomething = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/endpoint/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Fallback error message");
  }
};
```

The `AxiosInterceptor` provides:

- Automatic Bearer token attachment
- 401 detection with token refresh
- Request queuing during refresh (prevents race conditions)
- 30-second request timeout

## State Management

Redux Toolkit with 11 slices:

| Slice | Purpose |
| --- | --- |
| `authentication` | User auth state, tokens, login/logout |
| `generalSettings` | Date/time/currency format preferences |
| `pipeline` | Client pipeline stages and items |
| `addTargetDraft` | Target creation form draft |
| `staffFormDraft` | Staff creation form draft |
| `addClient` | Client creation form draft |
| `clinicalReport` | Report builder state |
| `clinicalReportTemplate` | Template builder state |
| `formBuilder` | Custom form builder state |
| `roleDraft` | Role/permissions creation draft |
| `subDomain` | Tenant subdomain |

All slices are persisted via `redux-persist` to survive page reloads. On logout, `persistor.purge()` clears all persisted data.

## Real-time Features

Socket.IO integration provides:

- **Chat messaging** between staff and clients with message history
- **Notifications** for appointments, documents, authorizations, and signatures
- **Online presence** — real-time online/offline user tracking
- **Typing indicators** in chat conversations
- **Notification read sync** — marking notifications as read syncs across devices

Connection lifecycle managed by `useSocket` hook with automatic reconnection (10 attempts, 2-second delay). Socket disconnected cleanly on logout and idle timeout.
