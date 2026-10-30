# Noosphere Control Panel

The Control Panel is the super admin application for managing the Noosphere platform. It is used by platform operators and super administrators to onboard tenants, manage subscriptions, track issues, control feature availability, and monitor system performance.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Authentication](#authentication)
- [Key Modules in Detail](#key-modules-in-detail)
- [Payment Integrations](#payment-integrations)
- [Conventions and Patterns](#conventions-and-patterns)
- [API Layer](#api-layer)
- [State Management](#state-management)
- [Real-time Features](#real-time-features)

## Features

### Performance Dashboard

Served at `/performance` from `Pages/Performance/MainPerformance.jsx`. There is no separate `Pages/Dashboard/`.

- Platform-wide metrics and overview statistics
- Session speed charts with period filtering (year, month, week, day)
- Resource utilization monitoring (CPU, memory, storage)
- Error distribution analysis by category, severity, and frequency
- Stacked bar charts for success/error rate tracking

### Tenant Management

- **Tenant List** — searchable, filterable table of all tenants with status indicators
- **Account Overview** — organization details, company size, country, contact info with inline editing
- **Billing History** — per-tenant billing records and payment status
- **Issue Management** — tenant-specific issue tracking with priority and status
- **User Logs** — detailed audit trail of tenant admin activities (login, settings changes, data modifications)
- **Usage Statistics** — per-tenant platform usage metrics

### Prospect Pipeline

- Kanban-style drag-and-drop board with customizable stages
- Prospect creation with organization type, company size, and contact details
- Stage movement tracking with history
- Candidate assignment to sales staff
- Renewal frequency and plan selection
- Payment link generation for prospect conversion

### Billing and Payments

- **Subscription Manager** — manage active subscriptions with plan changes and renewals
- **Invoice Management** — generate, view, and track invoices
- **Payment Management** — retry failed payments, configure payment settings
- **Billing Reports** — revenue reports with date filtering and export
- **Auto-Billing Settings** — automated invoice and renewal configuration
- **Plans and Payment** — plan catalog management (Basic, Standard, Pro, Enterprise)
- **Subscriber List** — all paying tenants with subscription status
- **Payment Link Generation** — Stripe and PayPal payment links for tenant onboarding

### Issue Management

- Create and track support issues with 17 categories (Account and Access, Billing, Bug Report, Performance, Compliance, etc.)
- Priority levels: P1-Critical, P2-High, P3-Medium, P4-Low (plus EP1/EP2 for Enterprise)
- Status workflow: Unassigned, Not Started, In Progress, Resolved
- Issue detail view with notes, priority changes, and status updates
- Assignment to support staff

### Feature Management

- Enable/disable platform features per tenant
- Feature groups with hierarchical organization
- Active/Disabled status toggles
- Feature configuration and metadata management

### Settings

- **Security** — 2FA configuration (security questions, authenticator app), password policies
- **Roles and Permissions** — role list plus a `RoleConfiguration` editor for creating and editing roles
- **Staff** — platform admin management with roles and departments
- **Departments** — organizational structure for support staff

### Notifications and Real-time

- Socket.IO connection opened on login, registered as an `ADMIN` client
- Real-time notification delivery with duplicate-id merging
- Notification centre with per-type labels and deep links into the app
- Connection status surfaced in the layout; the socket is disconnected on logout **and** on idle timeout

### Authentication

- Super admin login with email and password
- Two-factor authentication (security questions or authenticator app)
- Forgot password flow with email verification
- Password reset with token validation
- Administrator password re-entry gates destructive actions (plan deletion, feature-group deletion, plan activation and deactivation) and enforces a 12-character minimum

## Project Structure

```text
src/
├── api/                         API service files
│   ├── authApis.js              Super admin authentication, token refresh
│   ├── TenantApis.js            Tenant CRUD, logs, usage statistics
│   ├── BillingApis.js           Subscription and billing operations
│   ├── SubcriptionApis.js       Subscription plans and renewals
│   ├── InvoiceApi.js            Invoice generation, payment links
│   ├── AutoBillingInvoiceAPIs.js  Automated invoice runs
│   ├── AutoBillingPandAApis.js  Automated plans-and-agreements billing
│   ├── IssueApi.js              Issue management CRUD
│   ├── FeatureApis.js           Feature flag management
│   ├── staffApis.js             Platform staff management
│   ├── departmentApis.js        Support departments
│   ├── roleApis.js              Roles and permissions
│   ├── notificationApi.js       Notification fetch, read, settings
│   ├── performanceApi.js        Platform performance metrics
│   └── socketService.js         Socket.IO connection and event handlers
├── assets/                      Logos, images
├── Components/                  Reusable UI components
│   ├── BarChart/                Stacked bar chart with ApexCharts
│   ├── ManageColumn/            Column configuration, drag-and-drop
│   ├── ProspectPanel/           Prospect detail panel (1,349 lines)
│   ├── ResourceUtilizationUsage/  System resource monitoring
│   ├── ReusableModal/           Modal dialogs:
│   │   ├── AddAnIssueModal.jsx
│   │   ├── AddNewFeatureModal.jsx
│   │   ├── AddProspectModal.jsx
│   │   ├── AssignCandidateModal.jsx
│   │   ├── AssignPlanModal.jsx
│   │   ├── ChangePlanModal.jsx
│   │   ├── EditFeatureModal.jsx
│   │   ├── EditProspectModal.jsx
│   │   ├── GeneratePaymentLinkModal.jsx
│   │   ├── IssueViewModals/     ChangePriority, ChangeStatus
│   │   ├── MoveCandidateModal.jsx
│   │   └── ReusableModal.jsx    Base modal wrapper
│   ├── Table/                   CustomTable with filtering, export
│   ├── LoadingSpinner.jsx       Full-page loader plus Skeleton, SkeletonText
│   │                            and SkeletonTable placeholders
│   └── ProtectedRoute.jsx       Auth guard
├── Data/                        Centralized static data
│   ├── selectOptions.js         All dropdown options (org types, priorities,
│   │                            statuses, plans, chart periods, etc.)
│   ├── notificationConfig.js    NOTIFICATION_ENTITY_TYPE and the deep-link map
│   │                            behind getNotificationAction
│   └── permissionsConfig.js     Super admin permission structure
├── Helper/                      Utility modules
│   ├── AxiosInterceptor.jsx     Token refresh with request queuing (30s timeout)
│   ├── ErrorBoundary.jsx        React error boundary with refresh button
│   ├── Formatters.js            Centralized date/time formatters (7 exports)
│   ├── ShowToast.jsx            Toast notification utility
│   ├── errorMessages.js         Fallback copy keyed by failure type
│   ├── formErrors.js            Field-level error extraction for forms
│   ├── passwordPolicy.js        Shared password rules, so the strength
│   │                            checklist and the yup schema cannot drift
│   ├── passwordValidation.js    Yup password + confirm-password schemas
│   ├── colorContrast.js         Keeps label text legible on a chosen colour
│   ├── geoOptions.js            Country/region option data
│   └── storeRef.js              Lazy store/persistor refs, so non-React
│                                modules can dispatch without a cycle
├── hooks/                       Custom React hooks
│   ├── useAuth.js               Authentication state
│   ├── useIdleTimeout.js        30-min idle session timeout
│   ├── useSocket.js             Socket.IO connection lifecycle
│   ├── usePermission.js         Permission checks for UI gating
│   ├── useDocumentViewer.jsx    Shared document preview/download context
│   ├── usePageTitle.js          Per-route document title
│   ├── usePersistedTab.js       Remembers the active tab across reloads
│   ├── useReduxFormDraft.js     Auto-saving form drafts into Redux
│   └── modalRegistry.js         Tracks open modals so the board goes inert
├── Pages/                       Route-level page components
│   ├── Authentication/          Login, ForgotPassword, SetNewPassword,
│   │                            2FA flows (security questions, authenticator)
│   ├── BillingsAndPayment/      BillingManager, BillingReports,
│   │                            SubscriptionManager, InvoiceManagement,
│   │                            PaymentManagement, PlansAndPayment,
│   │                            SubscriberList
│   ├── Performance/             MainPerformance — the platform metrics
│   │                            dashboard, served at `/performance`
│   ├── FeatureManagement/       Feature flags and feature groups
│   ├── IssueManagement/         IssueManagement list, ViewIssue detail
│   ├── Notifications/           Notification centre
│   ├── Layout/                  ControlLayout with sidebar, secondary nav,
│   │                            and tenant-context navigation
│   ├── Payment/                 Stripe + PayPal payment page (public)
│   ├── Settings/                SecuritySettings, Staff, Departments,
│   │                            roles and permissions with RoleConfiguration
│   └── Tenant/                  TenantList, TenantSingle (overview, billing,
│                                issues, user logs, security, usage statistics)
├── ReduxStore/                  Redux Toolkit state management
│   ├── features/
│   │   ├── authentication.js    Super admin auth state
│   │   ├── featureManagementSlice.js  Feature flags state
│   │   ├── PipelineSlice.js     Prospect pipeline stages and cards
│   │   └── formDraftsSlice.js   Auto-saved form drafts, keyed per form
│   ├── rootReducer.js
│   └── store.js                 Store with redux-persist (v0.1.0)
├── styles/                      Global CSS
├── test/                        Unit tests (Vitest + RTL)
└── utils/
    └── TableUtils.jsx           CSV, PDF, and print export utilities
```

## Environment Variables

Create a `.env` file in the control root directory:

```env
VITE_API_URL=https://your-api-url.com/api/v1
VITE_STRIPE_PK=pk_live_your_stripe_publishable_key
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
```

**Important:** The Stripe key must be the publishable key (starts with `pk_`), never the secret key. The app gracefully handles missing payment keys by returning null for the Stripe instance and an empty string for PayPal.

## Scripts

```bash
npm install            # Install dependencies
npm run dev            # Start dev server at http://localhost:5174/control/
npm run build          # Production build (output: dist/)
npm run preview        # Preview production build locally
npm run lint           # ESLint
npm test               # Vitest in WATCH mode (unlike tenant and client)
npm run test:run       # Single run — this is the one CI-equivalent command
npm run test:coverage  # Single run with a coverage report
```

Note that `npm test` here starts a watcher, where the same command in tenant and client runs once and exits. Use `npm run test:run` for a one-shot run. CI still gets a single run from `npm test` because Vitest falls back to run mode without a TTY.

The dev server port is not pinned; Vite starts at 5173 and takes the next free port, so 5174 is only what you get when the tenant module is already running.

## Testing

Unit and component tests use Vitest with React Testing Library and live in `src/test/`. Run `npm run test:coverage` for a coverage report.

Branch coverage sits at **97.74%** (7,476/7,649) across 4,720 tests in 167 files, measured against every source file — `vite.config.js` sets `coverage.include: ['src/**/*.{js,jsx}']` so the denominator does not move when someone adds an import. Every layer is covered: redux slices and API wrappers at 100%, hooks 98%, helpers 99%, shared components 97%, pages 97%.

The ~173 remaining branches have each been resolved to their source line and are, in the main, unreachable — guards behind a `disabled` button, `||` fallbacks after a normaliser has already run, and `if (ref.current)` checks where the ref is always attached. Raising the figure further means removing dead code rather than writing tests.

Manual QA cases live in [`QA_TEST_PLAN.md`](./QA_TEST_PLAN.md), whose Appendix A maps every source file in this module to the cases that cover it.

## Authentication

### Login Flow

1. Super admin enters email + password
2. Backend validates credentials and returns JWT tokens
3. 2FA challenge presented (security question or authenticator code)
4. On successful 2FA, user is granted full access
5. Tokens stored in Redux memory with redux-persist backup

### Session Security

- 30-minute idle timeout with automatic logout
- Token refresh with request queuing for concurrent calls
- `persistor.purge()` on logout clears all persisted state
- DEV-guarded console statements (no production logging)

## Key Modules in Detail

### Prospect Pipeline (Kanban Board)

The prospect pipeline uses `@dnd-kit` for drag-and-drop functionality:

- Customizable columns representing sales stages
- Prospect cards with organization details and contact info
- Drag to move prospects between stages
- Click to open detailed prospect panel with:
  - Edit prospect information
  - Assign sales staff
  - Select subscription plan
  - Set renewal frequency
  - Generate payment link (Stripe or PayPal)
  - View invoice history

### Tenant Single View

When viewing an individual tenant, a secondary navigation provides:

- **Account Overview** — editable organization profile
- **Billing** — payment history, subscription status, plan details
- **Issue Management** — tenant-specific issues with filters
- **User Logs** — paginated audit trail (20 logs per page) with action type, details, user, and timestamp
- **Usage Statistics** — resource consumption metrics

### Billing Reports

Comprehensive billing analytics with:

- Revenue overview by period
- Transaction details with date, amount, status
- Filterable by date range
- Export to CSV/PDF

## Payment Integrations

### Stripe

- Stripe Elements integration for credit card payments
- Payment link generation via backend API
- Publishable key loaded from `VITE_STRIPE_PK` environment variable
- Graceful fallback if key is missing (returns null instead of loading Stripe)

### PayPal

- PayPal SDK integration for alternative payments
- Client ID loaded from `VITE_PAYPAL_CLIENT_ID` environment variable
- PayPal button rendering via `@paypal/react-paypal-js`

## Conventions and Patterns

| Convention | Detail |
| --- | --- |
| **Formatting** | All date/time formatting via `Helper/Formatters.js` with 7 format variants |
| **Static Data** | All dropdown options in `Data/selectOptions.js` (16 exports) |
| **Error Feedback** | Every catch block includes `showToast()` or state-based error display |
| **Console Logging** | All console statements guarded with `import.meta.env.DEV` |
| **Form Validation** | React Hook Form + Yup schemas |
| **Route Protection** | `ProtectedRoute` component for authenticated routes |
| **Idle Timeout** | 30-min auto-logout via `useIdleTimeout` hook |
| **Error Boundary** | App wrapped in `ErrorBoundary` with professional fallback UI |

## API Layer

All API calls use the shared `AxiosInterceptor` pattern:

- Automatic Bearer token attachment
- 401 detection with token refresh and request queuing
- 30-second request timeout
- Error messages thrown with meaningful fallback text
- DEV-guarded error logging

## State Management

Redux Toolkit with 4 slices:

| Slice | Purpose |
| --- | --- |
| `authentication` | Super admin auth state with tokens and user info |
| `featureManagement` | Feature flags and feature groups state |
| `pipeline` | Prospect pipeline stages and cards |
| `formDrafts` | Auto-saved form drafts, keyed per form |

Persisted via redux-persist under the namespaced key `control-root`, so it cannot collide with the tenant and client stores when all three are served from the same origin. `APP_VERSION` is `0.1.0`; the migration wipes persisted state whenever that string changes, and distinguishes a cold cache from a genuine version mismatch so a first-time visitor is not treated as an upgrade.

## Real-time Features

Socket.IO integration provides:

- **Notifications** for tenant, billing, and issue events, delivered without a page refresh
- **Duplicate-id merging** so a notification that arrives over both the socket and the initial fetch is shown once
- **Deep links** from a notification to the screen it refers to, via `Data/notificationConfig.js`
- **Connection status** shown in the layout

The connection lifecycle is owned by the `useSocket` hook over `api/socketService.js`. The socket is torn down first on both logout paths — the layout's Log out button and `useIdleTimeout` — before Redux state is cleared, so an idle session cannot keep a live connection registered as `ADMIN` and go on receiving notifications after logout.

### Build Optimization

Manual chunk splitting separates vendor libraries for optimal browser caching:

- `vendor-react` — React, ReactDOM, React Router
- `vendor-redux` — Redux Toolkit, React Redux, redux-persist
- `vendor-charts` — ApexCharts (~578KB, largest chunk)
- `vendor-dnd` — @dnd-kit drag-and-drop
- `vendor-pdf` — jsPDF, html2canvas (~593KB)
- `vendor-forms` — React Hook Form, Yup
- `vendor-ui` — React Select, React Toastify, React Icons
- `vendor-payments` — Stripe, PayPal SDKs
- `vendor-geo` — country-region-data (control only)
