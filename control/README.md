# Noosphere Control Panel

The Control Panel is the super admin application for managing the Noosphere platform. It is used by platform operators and super administrators to onboard tenants, manage subscriptions, track issues, control feature availability, and monitor system performance.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Authentication](#authentication)
- [Key Modules in Detail](#key-modules-in-detail)
- [Payment Integrations](#payment-integrations)
- [Conventions and Patterns](#conventions-and-patterns)
- [API Layer](#api-layer)
- [State Management](#state-management)

## Features

### Dashboard

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
- **Staff** — platform admin management with roles and departments
- **Departments** — organizational structure for support staff

### Authentication

- Super admin login with email and password
- Two-factor authentication (security questions or authenticator app)
- Forgot password flow with email verification
- Password reset with token validation

## Project Structure

```text
src/
├── api/                         API service files
│   ├── authApis.js              Super admin authentication
│   ├── TenantApis.js            Tenant CRUD, logs, usage statistics
│   ├── BillingApis.js           Subscription and billing operations
│   ├── InvoiceApi.js            Invoice generation, payment links
│   ├── IssueApis.js             Issue management CRUD
│   ├── FeatureApis.js           Feature flag management
│   ├── StaffApis.js             Platform staff management
│   └── ...
├── assets/                      Logos, images
├── Components/                  Reusable UI components
│   ├── BarChart/                Stacked bar chart with ApexCharts
│   ├── ErrorTypeChart/          Error distribution visualization
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
│   ├── LoadingSpinner.jsx       Full-page, section, and skeleton loaders
│   └── ProtectedRoute.jsx       Auth guard
├── Data/                        Centralized static data
│   ├── selectOptions.js         All dropdown options (org types, priorities,
│   │                            statuses, plans, chart periods, etc.)
│   ├── RandomDatas.js           Development mock table data
│   ├── resourceData.js          Resource utilization chart data
│   ├── speedChartData.js        Speed metrics chart data
│   └── permissionsConfig.js     Super admin permission structure
├── Helper/                      Utility modules
│   ├── AxiosInterceptor.jsx     Token refresh with request queuing (30s timeout)
│   ├── ErrorBoundary.jsx        React error boundary with refresh button
│   ├── Formatters.js            Centralized date/time formatters (7 exports)
│   └── ShowToast.jsx            Toast notification utility
├── hooks/                       Custom React hooks
│   ├── useAuth.js               Authentication state
│   └── useIdleTimeout.js        30-min idle session timeout
├── Pages/                       Route-level page components
│   ├── Authentication/          Login, ForgotPassword, SetNewPassword,
│   │                            2FA flows (security questions, authenticator)
│   ├── BillingsAndPayment/      BillingManager, BillingReports,
│   │                            SubscriptionManager, InvoiceManagement,
│   │                            PaymentManagement, PlansAndPayment,
│   │                            SubscriberList
│   ├── Dashboard/               Platform metrics dashboard
│   ├── IssueManagement/         IssueManagement list, ViewIssue detail
│   ├── Layout/                  ControlLayout with sidebar, secondary nav,
│   │                            and tenant-context navigation
│   ├── Payment/                 Stripe + PayPal payment page (public)
│   ├── Settings/                SecuritySettings, Staff, Departments
│   └── Tenant/                  TenantList, TenantSingle (overview, billing,
│                                issues, user logs, usage statistics)
├── ReduxStore/                  Redux Toolkit state management
│   ├── features/
│   │   ├── authentication.js    Super admin auth state
│   │   └── featureManagementSlice.js  Feature flags state
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
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5174/control/
npm run build     # Production build (output: dist/)
npm run preview   # Preview production build locally
npm test          # Run unit tests with Vitest
```

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
| **Static Data** | All dropdown options in `Data/selectOptions.js` (14 exports) |
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

Redux Toolkit with 2 slices:

| Slice | Purpose |
| --- | --- |
| `authentication` | Super admin auth state with tokens and user info |
| `featureManagement` | Feature flags and feature groups state |

Persisted via redux-persist (version 0.1.0) with automatic migration on version changes.

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
