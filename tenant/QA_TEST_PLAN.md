# Noosphere Tenant Portal — QA Test Plan

**Application:** Noosphere Tenant Portal
**Module:** Tenant (`/tenant`)
**Version:** 1.1.0
**Date:** September 1, 2026
**Prepared By:** QA Team
**Environment:** https://noospherehub.net/tenant

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Environment & Prerequisites](#2-test-environment--prerequisites)
3. [Test Scope](#3-test-scope)
4. [Module 1: Authentication & Onboarding](#module-1-authentication--onboarding)
5. [Module 2: Dashboard](#module-2-dashboard)
6. [Module 3: Scheduler](#module-3-scheduler)
7. [Module 4: Clients](#module-4-clients)
8. [Module 5: Program Library](#module-5-program-library)
9. [Module 6: My Organization](#module-6-my-organization)
10. [Module 7: Billing & Payments](#module-7-billing--payments)
11. [Module 8: Payroll](#module-8-payroll)
12. [Module 9: Custom Forms](#module-9-custom-forms)
13. [Module 10: Reports](#module-10-reports)
14. [Module 11: Help & Support](#module-11-help--support)
15. [Module 12: Settings](#module-12-settings)
16. [Module 13: Notifications](#module-13-notifications)
17. [Module 14: Layout, Navigation & Permissions](#module-14-layout-navigation--permissions)
18. [Module 15: Real-Time Features](#module-15-real-time-features)
19. [Module 16: Security & Session Management](#module-16-security--session-management)
20. [Module 17: Cross-Browser & Responsive Testing](#module-17-cross-browser--responsive-testing)
21. [Module 18: Performance & Error Handling](#module-18-performance--error-handling)
22. [Module 19: Accessibility](#module-19-accessibility)
23. [Defect Severity Classification](#defect-severity-classification)
24. [Sign-Off](#sign-off)

---

## 1. Overview

The Noosphere Tenant Portal is the primary application used by ABA therapy practice owners, supervisors, and clinical staff. It supports:

- Multi-role authentication with 2FA (Authenticator app and Security Question)
- Dashboard with session analytics, authorization tracking, and pipeline overview
- Full-featured scheduler with calendar, appointment management, and session data collection
- Client management with pipeline (Kanban), detailed client profiles, authorizations, programs, documents, and clinical reports
- Program library with domains, programs, targets, and performance tracking
- Organization management (staff, teams, roles, permissions, licenses, practice settings)
- Billing & payments (timesheets, claims, service codes, payers, rounding rules)
- Payroll (cycles, income items, deductions, employee schedules, breakdown views)
- Custom form builder with drag-and-drop, templates, responses, and form renderer
- Reports (cancelled/rescheduled appointments, attendance, audit logs, login logs)
- Help & support (ticket system, knowledge base)
- Settings (general settings with date/time/currency format, notification preferences, clinical report templates)
- Real-time notifications and in-app messaging via Socket.IO
- Role-based module access control

---

## 2. Test Environment & Prerequisites

### 2.1 Environment

| Item | Value |
|------|-------|
| **Production URL** | `https://noospherehub.net/tenant` |
| **Staging URL** | `https://staging.noospherehub.net/tenant` |
| **Backend API** | `https://noospherehub.net/api/v1` |
| **Supported Browsers** | Chrome 100+, Firefox 100+, Safari 16+, Edge 100+ |
| **Mobile Browsers** | Chrome Mobile, Safari iOS |

### 2.2 Test Accounts Required

| Role | Description |
|------|-------------|
| **Super Admin** | First-time login (onboarding flow) |
| **Super Admin** | Existing account with full access |
| **Admin** | Staff member with admin role |
| **Clinician** | Staff with limited module access |
| **Staff (new)** | Staff that needs onboarding |
| **Staff with 2FA (Authenticator)** | For authenticator 2FA login testing |
| **Staff with 2FA (Security Question)** | For security question 2FA login testing |

### 2.3 Test Data Prerequisites

- Active tenant with organization details configured
- At least 5 staff members (various roles)
- At least 10 clients across different pipeline stages
- At least 5 upcoming appointments, 3 completed sessions, 2 cancelled, 2 rescheduled
- Active programs with targets (all 7 data collection types)
- Active authorizations with service codes
- Timesheets in various approval states (pending, approved, rejected)
- Claims in various states
- At least 2 custom forms (published, draft)
- Support tickets (open, resolved)
- Payroll cycles with income items and deductions

---

## 3. Test Scope

### In Scope
- All tenant-facing UI pages, modals, and components
- Authentication flows (login, 2FA, onboarding, forgot password)
- All 12 modules with CRUD operations
- Role-based access control and module guards
- Data formatting (dates, times, currency based on tenant settings)
- Real-time features (notifications, messaging)
- Responsive design

### Out of Scope
- Backend API unit tests
- Database integrity
- Load/stress testing
- Client and Control module testing (separate QA documents)

---

## Module 1: Authentication & Onboarding

### TC-AUTH-001: Admin Login — Valid Credentials

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Staff account exists, no 2FA configured |

**Steps:**
1. Navigate to `/tenant`
2. Enter valid email and password
3. Click "Login"

**Expected Results:**
- Toast: "Login successful"
- Redirect to `/dashboard`
- User data stored in Redux (name, tokens, permissions, modules)

---

### TC-AUTH-002: Admin Login — Invalid Credentials

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | None |

**Steps:**
1. Enter valid email with wrong password
2. Click "Login"

**Expected Results:**
- Error toast with message from API
- User stays on login page
- No tokens stored

---

### TC-AUTH-003: Admin Login — Empty Fields

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Leave email and/or password empty
2. Click "Login"

**Expected Results:**
- Inline validation errors: "Email is required", "Password is required"
- No API call made

---

### TC-AUTH-004: Admin Login — Invalid Email Format

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Enter "notanemail" in email field
2. Click "Login"

**Expected Results:**
- Inline error: "Please enter a valid email"

---

### TC-AUTH-005: 2FA — Authenticator App Login

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Staff has authenticator 2FA configured |

**Steps:**
1. Login with email/password
2. Redirected to `/auth/2fa/login-authenticator`
3. Open authenticator app, get 6-digit code
4. Enter code
5. Click "Verify"

**Expected Results:**
- Code validates against backend
- Redirect to `/dashboard` on success
- Error toast on invalid code
- Code expires after time window

---

### TC-AUTH-006: 2FA — Security Question Login

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Staff has security question 2FA configured |

**Steps:**
1. Login with email/password
2. Redirected to `/auth/2fa/login-question`
3. Security question is displayed
4. Enter correct answer
5. Click "Verify"

**Expected Results:**
- Correct answer → redirect to `/dashboard`
- Wrong answer → error toast
- Question text matches what was set during onboarding

---

### TC-AUTH-007: Super Admin — Initial Login (First Time)

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Brand new super admin account |

**Steps:**
1. Navigate to `/auth/initial-login`
2. Enter email and temporary password
3. Click "Login"

**Expected Results:**
- Redirect to `/auth/change-password`
- User must set new password before accessing dashboard

---

### TC-AUTH-008: Super Admin — Change Password (Onboarding)

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Completed TC-AUTH-007 |

**Steps:**
1. On `/auth/change-password`
2. Enter new password meeting requirements (8+ chars, uppercase, lowercase, number, special char)
3. Enter matching confirm password
4. Click "Change Password"

**Expected Results:**
- Toast: "Password changed successfully"
- Redirect to `/auth/2fa-settings`

---

### TC-AUTH-009: Super Admin — 2FA Choice

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Completed TC-AUTH-008 |

**Steps:**
1. On `/auth/2fa-settings`
2. Choose "Authenticator App" OR "Security Question"
3. Proceed to setup

**Expected Results:**
- Authenticator: shows QR code, user scans, enters verification code
- Security Question: shows question selection and answer input
- The super-admin screen includes an "enable for all admins" option
- After successful setup → redirect to `/dashboard`

---

### TC-AUTH-009a: Admin — Self-Choice 2FA (`/auth/2fa/choice`)

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | The organization has **not** set 2FA for all (`setForAll = false`), and the admin has no 2FA method of their own yet |

A separate screen from the super-admin's `/auth/2fa-settings`: each admin picks their own method, and there is no organization-wide write.

**Steps:**
1. Log in as an admin meeting the precondition
2. Inspect the default selection
3. Choose "Authenticator App" and submit
4. Repeat, choosing "Security Question"
5. Attempt to submit with no method selected
6. Inspect the page for an "enable for all" control
7. Complete the setup page and check the admin's record

**Expected Results:**
- `AdminLogin` routes the user to `/auth/2fa/choice`
- The authenticator (`qrCode`) option is pre-selected by default
- Choosing the authenticator navigates to `/auth/2fa/authenticator`
- Choosing the security question navigates to `/auth/2fa/security-question`
- Submitting with no selection shows "Please select a 2FA method"; a value other than `qrCode` or `securityQuestion` is rejected as "Invalid 2FA method"
- There is **no** "enable for all admins" toggle on this screen
- Completing setup sets only that admin's own `authType` and `auth2FADone`; no organization-wide setting is written

---

### TC-AUTH-010: Authenticator 2FA Setup

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User chose Authenticator on 2FA choice page |

**Steps:**
1. Navigate to `/auth/2fa/authenticator`
2. QR code is displayed
3. Scan QR with authenticator app (Google Authenticator, Authy, etc.)
4. Enter the 6-digit code from the app
5. Click "Verify"

**Expected Results:**
- QR code renders correctly
- Valid code → 2FA enabled, redirect to dashboard
- Invalid code → error toast, user can retry

---

### TC-AUTH-011: Security Question 2FA Setup

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User chose Security Question on 2FA choice page |

**Steps:**
1. Navigate to `/auth/2fa/security-question`
2. Select a security question from dropdown
3. Enter answer
4. Click "Save"

**Expected Results:**
- Question saved, 2FA enabled
- Redirect to dashboard
- Answer is case-insensitive on future logins

---

### TC-AUTH-012: Staff Onboarding via Email Link

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Admin invited a new staff member |

**Steps:**
1. New staff receives email with onboarding link
2. Click link → navigates to `/auth/staff/onboarding/:email/:userId`
3. Set password
4. Choose and configure 2FA
5. Complete onboarding

**Expected Results:**
- Onboarding page loads with email pre-filled
- Password must meet all requirements
- 2FA setup is mandatory
- After completion → redirect to login page
- Staff can now log in normally

---

### TC-AUTH-013: Forgot Password — Request Reset

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. From login page, click "Forgot Password"
2. Navigate to `/auth/forgot-password`
3. Page displays heading "Forgot Password" and subtitle "Please enter your email to reset your password"
4. Enter registered email in the Email field (placeholder: "olivia@therapyco.com")
5. Click "Continue" button

**Expected Results:**
- Form validates email field: "Email is required" if empty, "Please enter a valid email address" if invalid format
- API call: `api.AdminForgetPassword({ email })` is made
- On success: checks if `response.data.message === "Reset link sent to email"`, then shows toast "Password reset email sent successfully!"
- On error: extracts message from `error?.response?.data?.message` or defaults to "Failed to send password reset email.", displays error message both inline on the page (below the email field) AND as an error toast
- Loading spinner on button while API call is in progress
- Page does NOT navigate anywhere on success or error — the user stays on `/auth/forgot-password`
- A reset link is sent via email to the user
- "Remember Password?" link at the bottom navigates back to `/` (login page)

---

### TC-AUTH-014: Forgot Password — Reset Password (via Email Link)

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User received reset link email from TC-AUTH-013 |

**Steps:**
1. User clicks the reset link from their email
2. Navigates to `/auth/reset-password/:userId` (userId is embedded in the link)
3. Page displays heading "Set a new Password" and subtitle "Please create a new password"
4. Enter new password in "Password" field (placeholder: "Enter new password")
5. Enter matching password in "Confirm password" field (placeholder: "Confirm new password")
6. Click "Continue" button

**Expected Results:**
- Yup validation enforces:
  - "New password is required" if empty
  - "Password must be at least 8 characters"
  - "Password must contain upper/lowercase, number, and special character" (regex: at least one lowercase, one uppercase, one digit, one of `!@#$%^&*`)
  - "Confirm password is required" if empty
  - "Passwords must match" if confirm does not match new password
- Inline error messages appear under each field when validation fails
- No API call is made until validation passes
- On submit, two sequential API calls are made:
  1. `api.AdminSetPassword({ id: userId, password: newPassword })`
  2. `api.GetSuperAdminChoices({ id: tenantId })` (tenantId extracted from the set-password response)
- On success: toast with `response?.data?.message` or "Password updated successfully!"
- After success, CONDITIONAL navigation based on `setForAll`, `auth2FADone`, and `authType` from the responses:
  - If `setForAll === true` AND `auth2FADone === false` AND `authType === "AUTHENTICATOR"` → navigate to `/auth/2fa/authenticator` with state `{ userId }`
  - If `setForAll === true` AND `auth2FADone === false` AND `authType === "SECRETMESSAGE"` → navigate to `/auth/2fa/security-question` with state `{ userId, authQuestion }`
  - If `setForAll === false` AND `auth2FADone === false` → navigate to `/` (login page)
  - If `setForAll === true` AND `auth2FADone === true` AND `authType === "AUTHENTICATOR"` → navigate to `/auth/forgot-password/2fa-auth-verify` with state `{ userId }`
  - If `setForAll === true` AND `auth2FADone === true` AND `authType === "SECRETMESSAGE"` → navigate to `/auth/forgot-password/2fa-question-verify` with state `{ userId, authQuestion }`
  - If `authType` is neither "AUTHENTICATOR" nor "SECRETMESSAGE" → error toast "Unknown authentication type"
- On API error: toast with `error?.response?.data?.message` or "Failed to update password."
- Loading spinner on button while submitting

---

### TC-AUTH-015: Forgot Password — 2FA Authenticator Verification

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User was navigated here from TC-AUTH-014 (setForAll=true, auth2FADone=true, authType=AUTHENTICATOR) |

**Steps:**
1. On `/auth/forgot-password/2fa-auth-verify`
2. Page displays heading "Two-Factor Authentication" and subtitle "Please generate a 6-digit code from your authenticator app and input it below"
3. Six individual digit input boxes are displayed with a dash separator between the 3rd and 4th inputs
4. Enter 6-digit code from authenticator app
5. Click "Continue" button

**Expected Results:**
- userId is obtained from `location.state?.userId` or falls back to `useAuth()` hook's userId
- OTP input behavior:
  - Each input accepts only a single digit (`/^\d?$/` regex)
  - Typing a digit auto-advances focus to the next input
  - Backspace on an empty input moves focus to the previous input
  - Paste extracts digits only (strips non-digit chars), fills up to 6 inputs, and focuses the last filled input
- Yup validation: "OTP is required" if empty, "OTP must be a 6-digit number" if not exactly 6 digits
- Validation error message displays below the input boxes
- API call: `api.Admin2FAVerify({ userId, token: code })`
- After API call (success or failure), moves to Step 2 (result screen)
- **On success** (`response.data.status === "ok"`):
  - Toast: "OTP verification successful!"
  - Step 2 displays: green checkmark icon, heading "Verification successful!", message "You can now proceed to login", and a "Login" button
  - Clicking "Login" button navigates to `/` (login page)
- **On failure**:
  - Toast with `error?.response?.data?.message` or "Verification failed."
  - Step 2 displays: red X icon, heading "Unable to verify your identity", message "Unfortunately we cannot verify your identity. Please contact the support team for further assistance", support email "Email: support@noosphere.com", and a "Try Again" button
  - Clicking "Try Again" returns to Step 1 (code entry form) to allow retry
- Loading spinner on button while API call is in progress

---

### TC-AUTH-016: Forgot Password — 2FA Security Question Verification

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User was navigated here from TC-AUTH-014 (setForAll=true, auth2FADone=true, authType=SECRETMESSAGE) |

**Steps:**
1. On `/auth/forgot-password/2fa-question-verify`
2. Page displays heading "Two-Factor Authentication" and subtitle "Please answer your security question"
3. Security question text is displayed (from `location.state?.authQuestion` or Redux store's `authQuestion`, or "No question available" if missing)
4. Enter answer in "Your Answer" text field (placeholder: "Enter your answer")
5. Click "Continue" button

**Expected Results:**
- userId is obtained from `location.state?.userId` or falls back to `useAuth()` hook's userId
- authQuestion is obtained from `location.state?.authQuestion` or falls back to `useAuth()` hook's `authQuestion`
- Yup validation: "Answer is required" if empty, "Answer must be at least 3 characters" if fewer than 3 chars
- Inline error message below the input when validation fails
- API call: `api.Admin2FAVerifySecretMessage({ userId, secret: answer, authQuestion })`
- After API call (success or failure), moves to Step 2 (result screen)
- **On success** (`response.data.status === "ok"`):
  - Toast: "Security question verified successfully!"
  - Step 2 displays: green checkmark icon, heading "Verification successful!", message "You can now proceed to login", and a "Login" button
  - Clicking "Login" button navigates to `/` (login page)
- **On failure**:
  - Toast with `error?.response?.data?.message` or "Verification failed."
  - Step 2 displays: red X icon, heading "Unable to verify your identity", message "Unfortunately we cannot verify your identity. Please try again.", and a "Try Again" button
  - Clicking "Try Again" returns to Step 1 (answer entry form) to allow retry
- Loading spinner on button while API call is in progress

---

### TC-AUTH-017: Protected Route — Unauthenticated Access

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Clear all storage
2. Navigate directly to `/tenant/dashboard`, `/tenant/billing/timesheets`, etc.

**Expected Results:**
- All protected routes redirect to login page
- No data is exposed

---

---

## Module 2: Dashboard

### TC-DASH-001: Dashboard Page Load

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User has DASHBOARD module access |

**Steps:**
1. Navigate to `/dashboard`
2. Wait for all cards to load

**Expected Results:**
- Five dashboard cards render:
  - **Session Information** (completed, pending, approved counts + chart)
  - **Productivity Information** (hours worked, sessions per day)
  - **Authorizations** (service code usage with progress bars)
  - **Upcoming Appointments** (next 5 appointments with details)
  - **Intake Pipeline** (pipeline stage counts)
- Loading spinners during data fetch
- No "undefined", "NaN", or empty values

---

### TC-DASH-002: Session Information Card — Chart Interaction

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. View Session Information card
2. Toggle chart period (week/month/year)

**Expected Results:**
- Chart updates with correct data for selected period
- Session counts (completed, pending, approved) update
- Dates are formatted per tenant settings

---

### TC-DASH-003: Authorization Card — Service Code Selection

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. View Authorizations card
2. Click different authorization/service code cards

**Expected Results:**
- Selected card is highlighted
- Usage details update (units used / total, modifiers, per unit type)
- Progress bar reflects usage percentage

---

### TC-DASH-004: Upcoming Appointments Card

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. View Upcoming Appointments card
2. Click "View All" to go to scheduler

**Expected Results:**
- Shows next 5 upcoming appointments
- Each shows: client name, date, time, session type, location
- "View All" navigates to `/scheduler/appointments`

---

### TC-DASH-005: Intake Pipeline Card

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. View Intake Pipeline card
2. Observe stage counts

**Expected Results:**
- Pipeline stages shown with client counts per stage
- Click navigates to `/clients/pipeline`

---

### TC-DASH-006: Dashboard — Empty State (New Tenant)

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Login to a tenant with no data

**Expected Results:**
- All cards show "0" or appropriate empty states
- No errors, no crashes

---

---

## Module 3: Scheduler

### TC-SCHED-001: Calendar View Load

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | SCHEDULER module access, appointments exist |

**Steps:**
1. Navigate to `/scheduler/calendar`
2. Wait for calendar to render

**Expected Results:**
- Calendar displays in month/week/day view (default view is responsive: day on mobile <=640px, week on tablet <=992px, month on desktop)
- Appointments show as colored blocks
- Each block shows client name, time, session type
- Color codes match appointment `colourCode` settings

---

### TC-SCHED-002: Calendar — Switch Views (Month/Week/Day)

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Month" view
2. Click "Week" view
3. Click "Day" view
4. Navigate forward/backward with arrows

**Expected Results:**
- Each view renders correctly
- Appointments are positioned at correct times
- Navigation updates the date range displayed (day +/-1, week +/-7, month +/-30)
- "Today" button returns to current date

---

### TC-SCHED-003: Calendar — Day View Time Slots

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Switch to Day view
2. Observe time slots from start to end of day

**Expected Results:**
- Hourly time slots displayed
- Appointments span correct time ranges
- Overlapping appointments are displayed side by side
- Times formatted per tenant settings

---

### TC-SCHED-004: Calendar — Week View

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Switch to Week view
2. Observe 7 columns (one per day)

**Expected Results:**
- All 7 days of the week visible
- Appointments positioned in correct day columns
- Time axis on the left

---

### TC-SCHED-005: Create New Appointment

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "New Appointment" button (or click a time slot on calendar)
2. Appointment modal opens
3. Fill in, in the order the form presents them:
   - Client (searchable dropdown)
   - Session Type
   - Date
   - Recurrence (recurring-event box, directly under Date)
   - Start Time, End Time
   - Clinician(s)
   - Location
   - Is Billable (toggle)
   - Requires Travel (toggle)
   - Colour Code
4. If recurring: set recurrence type (daily/weekly), end type (on date / after N occurrences)
5. Click "Create Appointment"

**Expected Results:**
- Field order reads Date -> recurrence -> Start/End Time -> Clinician(s). The recurring-event box sits directly under Date, not after the service codes
- All fields validate (required fields, time conflicts)
- Toast: success
- Appointment appears on calendar
- If recurring, multiple appointments are created
- Modal closes after success

---

### TC-SCHED-005a: Appointment Modal — Availability-Filtered Clinicians

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | At least two clinicians, one of whom is already booked for the slot under test |

The Clinician(s) field lists only clinicians actually free for the chosen slot, fetched from `GET /tenant/tenant/staff/:tenantId/available?date&startTime&endTime` rather than the full tenant staff list.

**Steps:**
1. Open the appointment modal and leave the date and/or times blank
2. Fill in Date, Start Time, and End Time
3. Change the date, then change the time window
4. Choose a slot for which one clinician is already booked
5. Open an existing appointment for edit without changing its slot
6. Open an existing appointment for edit and move it to a slot where its assigned clinician is not free

**Expected Results:**
- While the slot is incomplete, the clinician select is **disabled** and the note explains that the slot must be picked first
- Once date, start time, and end time are all present, the availability request fires and the select is enabled
- The note shows a loading state during the request, an error state if it fails, and "N clinicians free on `<date>`" on success
- The request is re-issued whenever the date or the time window changes
- A clinician already booked for that slot is **not** listed
- When editing an appointment that stays on its original slot, its own assigned clinicians remain selectable -- their own booking must not read as a conflict against them
- When the slot moves and an assigned clinician is no longer available, that selection is dropped from the field
- Date and time are sent in the same format the slot comparison uses, so a clinician is never wrongly shown as unavailable because of a format mismatch

---

### TC-SCHED-006: Appointment Modal — Validation

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Open appointment modal
2. Leave required fields empty
3. Set end time before start time
4. Click "Create"

**Expected Results:**
- Inline errors for each required field
- "End time must be after start time" validation
- No API call on invalid form

---

### TC-SCHED-007: Appointments List — Upcoming Tab

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/scheduler/appointments`
2. Click "Upcoming" tab

**Expected Results:**
- Table shows upcoming appointments with: Client, Date, Time, Session Type, Location, Clinician, Actions
- Dates/times formatted per tenant settings
- Actions: View Details, Start, Cancel, Reschedule
- Pagination works

---

### TC-SCHED-008: Appointments List — Past Tab

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Past" tab

**Expected Results:**
- Shows completed past appointments
- Status indicators (completed, cancelled)

---

### TC-SCHED-009: Appointments List — Cancelled Tab

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Cancelled" tab

**Expected Results:**
- Shows cancelled appointments with: reason, cancelled by, cancel time
- Dates formatted per tenant settings

---

### TC-SCHED-010: Appointments List — Reschedule Requests Tab

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Reschedule Requests" tab

**Expected Results:**
- Shows reschedule requests from clients and staff
- Previous date/time vs. new requested date/time
- Accept/Reject actions

---

### TC-SCHED-011: Cancel Appointment

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Cancel" on an upcoming appointment
2. Cancel modal opens
3. Enter cancellation reason
4. Click "Cancel Appointment"

**Expected Results:**
- Toast: success
- Appointment moves to "Cancelled" tab
- Reason is saved and displayed

---

### TC-SCHED-012: Reschedule Appointment

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Reschedule" on an upcoming appointment
2. Reschedule modal opens
3. Change date, start time, end time
4. Enter reason
5. Click "Submit"

**Expected Results:**
- Toast: success
- Appointment updated or moved to reschedule requests
- Original date/time preserved for reference

---

### TC-SCHED-013: Start Appointment — Session Data Collection

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Start" on an upcoming appointment (via the AppointmentDetailsModal "Start Appointment" button)
2. Navigate to `/appointments/start/:appointmentId/:clientId` (appointmentId is the UUID portion, split from any `id_timestamp` composite ID)
3. Session timer starts
4. Select targets for data collection
5. Collect data for each target type:
   - **Frequency**: enter occurrence count
   - **Duration**: start/stop timer
   - **Rate**: occurrences + duration
   - **Latency**: stimulus time + behaviour start time
   - **Trials/Opportunities**: prompt level + performance per trial
   - **Percentage Correct**: trials with correct/incorrect + prompt level
   - **Task Analysis**: steps with performance + prompt level
6. Add session note
7. Click "End Session"

**Expected Results:**
- Timer runs and displays elapsed time
- Each data collection modal works correctly for its type
- Data is saved per target
- Session note is saved
- End session creates a timesheet record
- Travel time modal appears if appointment requires travel

---

### TC-SCHED-014: Start Appointment — Travel Time

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Start an appointment that `requiresTravel: true`
2. Travel time modal appears
3. Enter travel start/end time
4. Continue to session

**Expected Results:**
- Travel times saved with session
- Travel duration calculated correctly

---

### TC-SCHED-015: Start Appointment — Confirm Cancel Mid-Session

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. During an active session, click "Cancel"
2. Confirm cancel modal appears

**Expected Results:**
- Confirmation dialog: "Are you sure you want to cancel?"
- Confirm → session discarded, return to scheduler
- Cancel → continue session

---

### TC-SCHED-016: Start Appointment — Confirm Leave Mid-Session

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. During an active session, try to navigate away (click sidebar link)
2. Confirm leave modal appears

**Expected Results:**
- Warning: unsaved session data will be lost
- Confirm → navigate away
- Cancel → stay on session page

---

### TC-SCHED-017: Appointment Details Modal (Scheduler — Full CRUD)

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Component** | `AppointmentDetailsModal` in `Components/ReusableModal/SchedulerModal/AppointmentDetailsModal.jsx` |
| **Used in** | `CalendarScheduler.jsx` (main Scheduler page) |

**Steps:**
1. On the Scheduler calendar view, click on any appointment block
2. AppointmentDetailsModal appears positioned near the click location

**Expected Results:**
- Modal is positioned dynamically based on click coordinates with viewport boundary detection (flips left/above if it would overflow right/bottom edge)
- Modal header displays "Appointment Details" with a close (X) button
- Modal body shows:
  - **Client**: client name (or "Unknown Client")
  - **Appointment Frequency**: recurrence description — "Does not repeat", "Every N days", "Weekly on Mon, Wed", "Monthly on day N", with optional end date or occurrence count
  - **Therapist**: clinician name(s) joined by comma (or "Unknown Therapist")
  - **Service Location**: location string (or "Not specified")
  - **Service Type**: each service's `serviceType` with optional `(modifierType)` suffix, joined by comma (or "Not specified")
  - **Session Type**: session name (or "Unknown Session")
- Modal footer has 4 action buttons:
  - **Cancel** (secondary-danger variant, red X icon) — calls `onCancel(appointment)`, opens CancelModal
  - **Reschedule** (secondary variant, refresh icon) — calls `onReschedule(appointment)`, opens RescheduleModal
  - **Edit** (secondary variant, edit icon) — calls `onEdit(appointment)`, opens AppointmentModal in edit mode
  - **Start Appointment** (primary variant) — navigates to `/appointments/start/:appointmentUuid/:clientId` (splits composite `id_timestamp` to extract UUID only; alerts "Missing appointment or client ID" if either is missing, "Invalid appointment ID" if UUID extraction fails)
- Close button (X) closes the modal

---

### TC-SCHED-018: Calendar — StaffClientFilter Sidebar

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Component** | `StaffClientFilter` in `Components/CalendarScheduler/StaffClientFilter.jsx` |
| **Used in** | `CalendarScheduler.jsx` (main Scheduler calendar page) |
| **Precondition** | User has `view_calendar_filter` permission |

**Steps:**
1. On the Scheduler calendar view, observe the sidebar (auto-shows if user has `view_calendar_filter` permission)
2. Click "View by Staff" tab header
3. Search for a staff member by name
4. Check/uncheck staff checkboxes
5. Click "View by Clients" tab header
6. Search for a client by name
7. Check/uncheck client checkboxes
8. Click the close (X) button on the sidebar

**Expected Results:**
- Sidebar auto-opens on page load if user has `view_calendar_filter` permission
- Tab switcher at top: clicking tab sets `activeTab` to "staff" or "client"
  - If user has `view_staff_list` but NOT `view_client_list`, the effective tab is always "staff"
- **Header** displays "View by Staff" or "View by Clients" depending on the active tab, plus a close (X) button
- **Search input** filters the list by name in real-time (case-insensitive `includes` match)
  - Staff tab: filters by `member.fullName`
  - Client tab: filters by `firstName + lastName` of the client object
- **List items** each show:
  - Full name (staff: `fullName`; client: `firstName lastName`)
  - Appointment count badge (`appointmentCount`, defaults to 0)
  - Checkbox (checked state reflects `selectedStaff.includes(member.id)` or `selectedClients.includes(client.clientId)`)
- **Checkbox toggling**:
  - Staff: toggles the staff ID in the selectedStaff array, then immediately calls `fetchAppointmentsByFilter({ clientIds: [], staffIds: newStaffIds })` to reload calendar data
  - Client: toggles the client ID in the selectedClients array, then immediately calls `fetchAppointmentsByFilter({ clientIds: newClientIds, staffIds: [] })` to reload calendar data
  - Calendar appointments update instantly after each checkbox toggle
- **Empty state**: shows "No staff found" or "No clients found" when search yields no results
- Close button hides the sidebar; calendar expands to full width
- **Permission gating**: users without `view_staff_list` cannot see the staff tab; users without `view_client_list` cannot see the client tab; users without `view_calendar_filter` do not see the sidebar at all

---

### TC-SCHED-019: Calendar — Search Filter

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Used in** | `CalendarScheduler.jsx` |

**Steps:**
1. On the Scheduler calendar view, type in the search input field
2. Enter a client name, clinician name, or service type

**Expected Results:**
- Search is client-side (instant, no API call)
- Filters appointments where client name, clinician names, or service type includes the search term (case-insensitive)
- Calendar view updates to show only matching appointments
- Clearing the search restores all appointments

---

---

## Module 4: Clients

### TC-CLIENT-001: Pipeline (Kanban) View

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | CLIENTS module access |

**Steps:**
1. Navigate to `/clients/pipeline`
2. Observe Kanban board

**Expected Results:**
- Pipeline columns display (e.g., New Referral, Assessment, Active, Discharged)
- Client cards in each column show: name, avatar, contact info
- Drag-and-drop between columns works
- Column counts update

---

### TC-CLIENT-002: Pipeline — Add New Client

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Add Client"
2. Add Client modal opens
3. Fill in all required fields:
   - First Name, Last Name, Email, Phone
   - DOB, Gender
   - Address (street, city, state, country, zip)
   - Primary Payer
   - Caregiver info (optional)
4. Click "Create Client"

**Expected Results:**
- All fields validate (email format, required fields, phone format)
- Toast: success
- Client appears in the first pipeline column
- Modal closes

---

### TC-CLIENT-003: Pipeline — Drag Client Between Stages

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Drag a client card from "New Referral" to "Assessment"

**Expected Results:**
- Card moves to new column
- API call updates client pipeline stage
- Column counts update
- Toast: success (or silent update)

---

### TC-CLIENT-004: Pipeline — Manage Columns

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Manage Columns" or navigate to column management
2. Add a new pipeline column
3. Rename a column
4. Reorder columns

**Expected Results:**
- New column appears on pipeline
- Renamed column updates everywhere
- Column order persists

---

### TC-CLIENT-005: Client List View

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/clients/client-list`

**Expected Results:**
- Table with all clients: Name, Email, Phone, Pipeline Stage, Created Date
- Search works
- Pagination works
- Click client → navigates to client panel

---

### TC-CLIENT-006: Client Panel — Info Tab

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Navigate to `/client/client-single/:clientId/:tenantClientId`
2. View "Client Info" tab

**Expected Results:**
- Personal information displayed: name, DOB, gender, contact, address
- Caregiver information (if any)
- Insurance/payer information
- Edit capability for each section
- Avatar displayed

---

### TC-CLIENT-007: Client Panel — Authorization Tab

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Authorization" tab on client panel
2. View authorization list

**Expected Results:**
- Authorizations listed with: title, authorization number, start/end date, payer, status
- Each authorization expandable to show service codes:
  - Service code, modifiers, units, used units, per (session/hour)
- Add new authorization button
- Dates formatted per tenant settings

---

### TC-CLIENT-008: Client Panel — Add Authorization

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Add Authorization"
2. Fill in: title, authorization number, start date, end date, payer, insurance type
3. Add service codes with modifiers, units, per
4. Click "Save"

**Expected Results:**
- All fields validate
- Authorization created with service codes
- Appears in authorization list

---

### TC-CLIENT-009: Client Panel — Programs Tab

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Programs" tab
2. View assigned programs and targets

**Expected Results:**
- Programs listed with targets
- Assign program from library
- View target details and performance data

---

### TC-CLIENT-010: Client Panel — Appointments & Schedules Tab

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Appointments & Schedules" tab

**Expected Results:**
- Client's upcoming and past appointments listed
- Create new appointment for this client
- View appointment details

---

### TC-CLIENT-011: Client Panel — Clinical Reports Tab

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Clinical Reports" tab
2. View list of clinical reports

**Expected Results:**
- Reports listed with: title, date created, status
- "Create Report" button
- View/edit existing reports

---

### TC-CLIENT-011a: Clinical Report — Change Request Lifecycle

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | A report that has been submitted for approval and had at least one change requested by a supervisor |

The API carries no status field on a change request, so open/closed is derived from timestamps: a request is open from the moment it is raised until the creator next submits the report for approval.

**Steps:**
1. As a supervisor, raise a change request on a submitted report
2. As the creator, view the report while it sits back in draft
3. As the creator, resubmit the report for approval
4. As the supervisor, raise a second change request after that resubmission
5. Inspect a change request with no `createdAt`
6. Inspect a report that has never been submitted
7. View a list of several change requests

**Expected Results:**
- The request shows as **open** from the moment it is raised, and stays open while the report sits in draft
- Resubmitting the report **closes** the outstanding change request
- A request raised after the last submission opens as a new outstanding request
- An undated request, an unparseable date, and a never-submitted report all count as **open** -- it is better to surface a request that may be live than to hide one
- Requests are listed newest first, so the one most in need of attention leads

---

### TC-CLIENT-011b: Clinical Report — Change Request Author and Viewed State

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Raise a change request as a **supervisor/approver** and view it on the report
2. Raise a change request as a **client** and view it on the report
3. Open the change-request details modal, close it, and reload the report

**Expected Results:**
- A supervisor-raised request shows the approver's name with the role "Approver"
- A **client-raised request shows the client's own name**, with the role "Client" -- not the literal word "Approver". The client's name is nested under `client.client`, and `requester` is a plain string on the payload rather than an object
- A request with neither resolvable falls back to "Unknown"
- A request carries either a `clientTenantId` or an `approverId`, never both, and the role reflects whichever is present
- Opening the details modal marks the requests as viewed, and they remain marked after a reload

---

### TC-CLIENT-012: Clinical Report Builder

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Navigate to `/clinical-report/report-builder`
2. Fill in clinical report sections:
   - Client Information (auto-populated)
   - Assessments
   - Target Behaviours
   - Goals & Targets
   - Behaviour Strategies
   - Implementation Notes
   - Monitoring Data
   - Crisis & Safety
   - Generalization
   - Consent & Signatures
   - Review
   - Discharge
3. Save/submit report

**Expected Results:**
- All 12 document sections render correctly
- Auto-populated fields pull from client data
- Rich text/formatting where applicable
- Save as draft
- Submit for review
- PDF export capability

---

### TC-CLIENT-013: Template Builder

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/clinical-report/template-builder`
2. Create or edit a report template
3. Add/remove sections, reorder

**Expected Results:**
- Drag-and-drop section ordering
- Template saved and available for use in report builder
- Default sections pre-loaded

---

### TC-CLIENT-014: Audit Trails (Clinical)

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate to `/clinical-report/audit-trails`

**Expected Results:**
- All clinical report changes logged
- Shows: who, what, when
- Dates formatted per tenant settings
- Searchable/filterable

---

### TC-CLIENT-015: Client Panel — Documents

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. On client panel, view documents section
2. Upload a document
3. Request a document from client
4. View uploaded documents

**Expected Results:**
- File upload works (S3)
- Document request sent to client portal
- Download existing documents
- Delete documents

---

### TC-CLIENT-016: Client Access Modal

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Client Access" on a client
2. Send client portal access invitation

**Expected Results:**
- Email sent to client with login credentials/link
- Status updated to show client has access

---

### TC-CLIENT-017: Client Report View (Public)

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Open the shared report link, `/report/client-view/:token` (no login required)
2. Inspect the URL
3. Open a link whose token has expired
4. Open a link with a malformed token

**Expected Results:**
- Clinical report renders in read-only mode
- No authentication required (link-based access)
- The URL segment is a **signed JWT, not the report id**. The report id is the token's `id` claim, so it never appears in the URL and cannot be edited to reach another report
- The page decodes the payload for the report id and expiry, validates the token via `ValidateClientReportToken`, and then uses the token itself as both access and refresh token for the report fetch
- An expired token is refused and the report is not fetched
- A malformed token yields no report id and the page shows its error state rather than a blank screen
- Professional formatting for viewing/printing

---

---

## Module 5: Program Library

### TC-PROG-001: Program Library — Domain List

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | PROGRAM_LIBRARY module access |

**Steps:**
1. Navigate to `/program-library`
2. View domains list

**Expected Results:**
- Domains listed (e.g., Communication, Social Skills, Daily Living)
- Each domain shows program count
- Add/edit/delete domain

---

### TC-PROG-002: Add Domain

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Add Domain"
2. Enter domain name and description
3. Click "Create"

**Expected Results:**
- Domain created and appears in list
- Toast: success

---

### TC-PROG-003: Add Program

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Select a domain
2. Click "Add Program"
3. Enter program name and description
4. Click "Create"

**Expected Results:**
- Program created under the selected domain
- Toast: success

---

### TC-PROG-004: Add Target

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Select a program
2. Click "Add Target"
3. Fill in target details:
   - Name, Description, SD, Expected Response
   - Teaching Procedure
   - Prompting Strategy (multi-select)
   - Data Collection Type (dropdown)
   - Baseline Data Required (toggle)
   - Mastery Metric, Mastery Criteria
   - Notes
   - Attachment (optional)
4. Click "Create"

**Expected Results:**
- All fields validate (Yup schema validation)
- Data collection type-specific fields appear when type is selected
- Target created under the program
- Toast: success

---

### TC-PROG-005: Target Single — Performance View

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/target-single/:programName/:targetName`
2. View target details and performance data

**Expected Results:**
- Target metadata displayed
- Performance chart with session data over time
- Session history table with dates and data points
- Chart type matches data collection type (e.g., bar chart for frequency, line chart for rate)
- Dates/times formatted per tenant settings

---

### TC-PROG-006: Delete Program/Target/Domain

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click delete on a domain/program/target
2. Confirm deletion

**Expected Results:**
- Confirmation modal appears
- Delete succeeds if no dependencies
- Error if item is in use by clients
- Item removed from list

---

---

## Module 6: My Organization

### TC-ORG-001: General — Organization Info

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | MY_ORGANIZATION module access |

**Steps:**
1. Navigate to `/organization/general`
2. View organization details

**Expected Results:**
- Organization name, address, phone, email, NPI displayed
- Edit basic info button
- Organization logo/avatar

---

### TC-ORG-002: Edit Basic Info Modal

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Edit Basic Info"
2. Modal opens with current data pre-populated
3. Update fields (name, address, phone, etc.)
4. Select role from API-fetched roles dropdown
5. Click "Save"

**Expected Results:**
- Roles dropdown fetches from API (not dummy data)
- All fields validate
- Toast: success
- Updated info displayed

---

### TC-ORG-003: General — Add Licenses

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Add License"
2. Fill in license details
3. Click "Save"

**Expected Results:**
- License saved and displayed in list
- Expiry date tracking

---

### TC-ORG-004: General — Add Session Type

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Add Session Type"
2. Enter: name, category, duration, allowed staff roles, allowed locations, billable toggle
3. Click "Create"

**Expected Results:**
- Session type created
- Available in scheduler appointment modal
- Toast: success

---

### TC-ORG-005: General — Add Service Type

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Add Service Type"
2. Enter details
3. Click "Create"

**Expected Results:**
- Service type saved and listed

---

### TC-ORG-006: General — Add Diagnosis Code

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Add Diagnosis Code"
2. Enter code and description
3. Click "Save"

**Expected Results:**
- Code saved, available for client records

---

### TC-ORG-007: Staff & Teams — Staff List

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Navigate to `/organization/staff-and-teams`

**Expected Results:**
- Table with all staff: Name, Email, Role, Status (Active/Inactive), NPI, Created Date
- Search works
- Pagination works
- "Add Staff" button

---

### TC-ORG-008: Add Staff

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Add Staff"
2. Fill in all required fields:
   - Full Name, Email, DOB, Gender
   - NPI, Phone, Role
   - Address (street, city, state, zip, country)
3. Click "Create"

**Expected Results:**
- Multi-tab form validates all fields (Yup schema)
- Staff created with status "Active"
- Onboarding email sent to staff
- Toast: success

---

### TC-ORG-009: Single Staff — Profile Tab

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click on a staff member
2. Navigate to `/organization/staff-and-teams/single-staff/:tenantStaffId`
3. View profile tab

**Expected Results:**
- Personal info, contact, address displayed
- Edit capability
- Document upload for staff documents

---

### TC-ORG-010: Single Staff — Client Tab

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Clients" tab on staff profile

**Expected Results:**
- Clients assigned to this staff member listed
- Navigation to client panel

---

### TC-ORG-011: Single Staff — Appointment Tab (Calendar Sub-Tab)

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Component** | `Appointment.jsx` in `Pages/Organisation/StaffAndTeams/StaffSingleTabs/Appointment.jsx` |

**Steps:**
1. Navigate to a single staff member's profile
2. Click "Appointment" tab (or equivalent)
3. The tab has two sub-tabs: "Calendar" and "Upcoming Appointments"
4. On the "Calendar" sub-tab, observe the calendar view
5. Switch between Day/Week/Month views using the view switcher buttons
6. Navigate dates using the back/forward arrows and "Today" button
7. Click on the date text to open the DatePickerModal
8. Use the search input to filter appointments by client name, therapist name, or service type
9. Click on an appointment block on the calendar

**Expected Results:**
- Calendar loads staff-specific appointments via `api.GetStaffAppointments({ staffId })` — merges past and upcoming arrays
- DayView, WeekView, and MonthView components render correctly with the staff's appointments
- View switcher buttons (Day/Week/Month) toggle the active view with visual highlight on active button
- Date navigation: back arrow subtracts 1 day (day view), 7 days (week view), or 30 days (month view); forward arrow adds the same
- "Today" button resets to current date
- Date text is clickable and opens a DatePickerModal for quick date selection
- Search input filters appointments client-side (instant, no API call) by client name, therapist name, or service type (case-insensitive `includes`)
- Loading state shows an animated spinner while fetching data
- Toolbar also has Export, Print, and Settings icon buttons
- Clicking an appointment opens the **StaffAppointmentDetailsModal** (view-only, see TC-ORG-011b)
- If user has `set_staff_availability` permission, a "Set availability" button with a plus icon appears in the toolbar (opens AvailabilityModal, see TC-ORG-011c)

---

### TC-ORG-011a: Single Staff — Appointment Tab (Upcoming Appointments Sub-Tab)

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. On the staff Appointment tab, click "Upcoming Appointments" sub-tab
2. Observe the upcoming appointments count badge on the tab

**Expected Results:**
- Upcoming appointments loaded via `api.GetStaffUpcomingAppointments({ staffId })`
- Badge on the tab shows the count of upcoming appointments (only displayed if count > 0)
- The `UpcomingAppointments` component renders the list with loading state support
- Each appointment transformed to show: client name, therapist, time, service type, session type, service location, color

---

### TC-ORG-011b: Single Staff — Appointment Details Modal (View-Only)

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Component** | `StaffAppointmentDetailsModal` (inline in `Appointment.jsx`) |
| **Used in** | Organization > Staff & Teams > Single Staff > Appointment Tab (Calendar sub-tab) |

**Steps:**
1. On the single staff calendar view, click on any appointment block
2. The StaffAppointmentDetailsModal appears positioned near the click location

**Expected Results:**
- Modal is positioned dynamically based on click coordinates with viewport boundary detection (same algorithm as the Scheduler's AppointmentDetailsModal)
- Modal header displays "Appointment Details" with a close (X) button
- Modal body shows:
  - **Client**: `appointment.clientName` or `appointment.client` or "Unknown Client"
  - **Therapist**: `appointment.therapist` or joined `clinicianNames` or "N/A"
  - **Date**: formatted as `MM/dd/yyyy` from `appointment.start` (or "N/A")
  - **Time**: formatted as `h:mm a - h:mm a` from `appointment.start` and `appointment.end` (or "N/A")
  - **Service Type**: `appointment.serviceType` or joined service array or "N/A"
  - **Session Type**: `appointment.sessionType` or `appointment.sessionName` or "N/A"
  - **Location**: `appointment.serviceLocation` (only shown if present)
- Modal footer has ONLY a single "Close" button (secondary variant) — NO Edit, Reschedule, Cancel, or Start buttons
- This is strictly view-only; it does not provide any mutation actions
- Close button calls `onClose` which clears both `selectedAppointment` and `appointmentPosition` state

---

### TC-ORG-011c: Single Staff — Availability Modal

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Component** | `AvailabilityModal` in `Components/ReusableModal/SchedulerModal/AvailabilityModal.jsx` |
| **Used in** | Organization > Staff & Teams > Single Staff > Appointment Tab (Calendar sub-tab) |
| **Precondition** | User has `set_staff_availability` permission |

**Steps:**
1. On the single staff calendar view, click "Set availability" button (visible only with `set_staff_availability` permission)
2. AvailabilityModal opens with title "Set your availability"
3. Observe the 7 day rows (Monday through Sunday)
4. Toggle a day's availability using the switch
5. When a day is toggled ON, set start time and end time using the time inputs
6. When a day is toggled OFF, the time inputs are replaced with a disabled "Not Available" text field
7. Click "Save"

**Expected Results:**
- Modal title: "Set your availability"
- Props: `isOpen`, `onClose`, `onSave`, `initialValues`, `isLoading`
- 7 day rows (Monday through Sunday), each with:
  - **SwitchInput** toggle for available/unavailable
  - When **available**: two time inputs (start time with "AM" label, end time with "PM" label) with "to" separator
  - When **unavailable**: a disabled TextInput showing "Not Available" (width 320)
  - Default values: all days unavailable, default times 09:00-17:00
- Time enforcement:
  - Start time is capped to AM range (if hours >= 12, enforced to "11:59")
  - End time is capped to PM range (if hours < 12, enforced to "12:00")
  - Time inputs use `step="3600"` (1-hour steps)
- Form state managed by react-hook-form with `isDirty` tracking
- "Save" button (primary) is disabled when `isLoading` is true OR form is not dirty; shows "Saving..." label during loading
- "Cancel" button (secondary) resets the form and closes the modal
- On modal open, form resets to merge `defaultAvailability` with `initialValues`
- On save: calls `onSave(availability)` with the availability object
- On save error: toast "Failed to save availability"
- In the parent (`Appointment.jsx`), saving triggers:
  - If availability record exists (has `availabilityId`): `api.UpdateStaffAvailability({ id, availabilityDays })` (updates existing days that have IDs)
  - If no record exists: `api.CreateStaffAvailability({ staffId, availabilityDays })` (creates all 7 days)
  - On success: closes modal, toast "Availability saved successfully", re-fetches availability data
  - On error: toast "Failed to save availability"
- Availability data is fetched on page load via `api.GetStaffAvailability({ staffId })` and converted from array format (API: `dayOfWeek`, `available`, `from`, `to`) to object format (modal: day key with `available`, `startTime`, `endTime`)

---

### TC-ORG-012: Single Staff — Payroll Tab

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Payroll" tab

**Expected Results:**
- Staff payroll information displayed
- Payment history

---

### TC-ORG-013: Add Team

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Add Team"
2. Enter team name, select team members
3. Click "Create"

**Expected Results:**
- Team created
- Members assigned

---

### TC-ORG-014: Practice Settings

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate to `/organization/practice-settings`
2. View and edit practice settings

**Expected Results:**
- Settings load and display correctly
- Editable and saveable

---

### TC-ORG-014a: Practice Settings — Tab Set and Permissions

| Field | Value |
|-------|-------|
| **Priority** | High |

Practice Settings now hosts the three panels that previously lived on the removed Billing Settings page.

**Steps:**
1. Log in as a user holding all five view permissions and open `/organization/practice-settings`
2. Log in again as users holding only some of them
3. Log in as a user holding none of them

**Expected Results:**
- Five tabs are available, in this order: **Diagnosis Codes** (`view_diagnosis_codes`), **Session Types** (`view_session_types`), **Service Codes** (`view_service_codes_list`), **Rounding Rules** (`view_rounding_rules_list`), **Payers & Insurance** (`view_payers_list`)
- Each tab is shown only when the user holds its permission; the others are absent, not merely disabled
- The first tab the user can see is selected by default
- A user holding none of the five permissions sees the page render nothing at all

---

### TC-ORG-014b: Practice Settings — Tab Persistence

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Open `/organization/practice-settings` and select the "Rounding Rules" tab
2. Refresh the page
3. Close the browser tab entirely, then reopen the page
4. On the same browser, log in as a user who lacks `view_rounding_rules_list` and open the page

**Expected Results:**
- After the refresh, the "Rounding Rules" tab is still selected (stored in `sessionStorage` under `tab:tenant:practiceSettings`)
- After closing and reopening the browser tab, the selection resets to the first visible tab -- `sessionStorage` does not survive a tab close
- For the user lacking the permission, the stored tab is **not** restored; the page falls back to the first tab they can see

---

### TC-ORG-015: Role & Permissions

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Navigate to `/organization/role-and-permissions`
2. View existing roles
3. Create new role
4. Configure module permissions (toggle on/off)

**Expected Results:**
- Roles listed with permission summary
- Create role → shows permission configuration
- Each module can be toggled (DASHBOARD, SCHEDULER, CLIENTS, etc.)
- Granular permissions within modules
- Save persists permissions
- Staff with this role sees only permitted modules

---

### TC-ORG-016: Upload Organization Documents

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Upload organization file (logo, documents)

**Expected Results:**
- File uploaded to S3
- Displayed in organization profile

---

### TC-ORG-017: Upload Staff Documents

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. On staff profile, upload a document (certification, license, etc.)

**Expected Results:**
- File uploaded
- Appears in staff document list
- Downloadable

---

---

## Module 7: Billing & Payments

### TC-BILL-001: Timesheets List

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | BILLINGS_PAYMENTS module access, completed sessions exist |

**Steps:**
1. Navigate to `/billing/timesheets`

**Expected Results:**
- Table with timesheets: Client, Clinician, Date, Start/End Time, Duration, Supervisor Approval, Client Approval, Actions
- Filter by date range, status
- Search by client/clinician
- Pagination works
- Dates/times formatted per tenant settings

---

### TC-BILL-002: Single Timesheet View

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click on a timesheet → `/billing/timesheets/:timesheetId`

**Expected Results:**
- Session details: client name/avatar, clinician, date, start time, end time, travel times, location, session type
- Approval status badges (supervisor + client)
- Program data section renders ALL data collection types correctly:
  - Frequency: occurrence count, notes
  - Duration: duration in seconds/minutes, notes
  - Rate: occurrences + duration, rate calculation, notes
  - Latency: stimulus time, behaviour start time, latency seconds per trial, notes
  - Trials/Opportunities: trial list with performance + prompt level, notes
  - Percentage Correct: trial list + percentage calculation, notes
  - Task Analysis: steps with performance + prompt level, notes
- Target IDs are NOT displayed (only target names if available)
- Session note displayed
- Authorization used section with service codes (code, modifiers, units, used units, per)
- Client approval section with signature, ratings, feedback
- Timesheet history (created, approved, rejected actions with timestamps and staff names)
- Approve/Reject buttons for supervisor
- PDF export

---

### TC-BILL-003: Approve Timesheet

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. On a pending timesheet, click "Approve"
2. Approve modal opens
3. Click "Confirm Approval"

**Expected Results:**
- Toast: success
- Status updates to "APPROVED"
- Timesheet history updated with approval entry

---

### TC-BILL-004: Reject Timesheet

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Reject" on a pending timesheet
2. Enter rejection reason
3. Click "Confirm Rejection"

**Expected Results:**
- Toast: success
- Status updates to "REJECTED"
- Reason saved in history

---

### TC-BILL-005: Request Timesheet Change

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click "Request Change" on a timesheet
2. Enter change request details
3. Submit

**Expected Results:**
- Change request sent
- Status updates accordingly

---

### TC-BILL-006: Claims List

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Navigate to `/billing/claims`

**Expected Results:**
- Claims table with: Client, Date, Service Code, Modifiers, Units, Status, Actions
- Filter by status, date range
- Pagination
- Dates formatted per tenant settings

---

### TC-BILL-007: Single Claim View

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click on a claim → `/billing/claims/view/:claimId`

**Expected Results:**
- All claim data renders correctly (same structure as timesheet but with claim-specific fields)
- Program data renders all data collection types
- Authorization service codes displayed with: code, description, modifiers, units, used units, per
- Approval statuses
- History trail

---

### TC-BILL-008: Create Claim

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Create Claim"
2. Fill in claim details
3. Submit

**Expected Results:**
- Claim created from approved timesheet
- Service codes and modifiers populated

---

### TC-BILL-009: Practice Settings — Service Codes

> **Moved.** Billing settings are no longer a page of their own. The standalone `BillingSettings` page has been removed and `/billing/settings` now redirects to `/organization/practice-settings`, where Service Codes, Rounding Rules, and Payers & Insurance appear as tabs alongside Diagnosis Codes and Session Types. The panels themselves are unchanged.

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/billing/settings`
2. Confirm the redirect to `/organization/practice-settings`
3. Open the "Service Codes" tab
4. Add a new service code

**Expected Results:**
- `/billing/settings` redirects to `/organization/practice-settings` (replace, so Back does not bounce), keeping old links and bookmarks working
- Service codes listed
- Add modal: code, description, modifiers (modifier1-4)
- Created code available in authorizations
- The tab is shown only to users holding `view_service_codes_list`

---

### TC-BILL-010: Practice Settings — Add Single Service Code

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Add Service Code"
2. Fill in: code, description, modifiers, rate
3. Click "Create"

**Expected Results:**
- Validation (Yup schema)
- Code saved
- Toast: success

---

### TC-BILL-011: Practice Settings — Payers & Insurance

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. View "Payers & Insurance" tab
2. Add a new payer

**Expected Results:**
- Payers listed
- Add payer modal with: name, identifier, address, insurance types, fee schedules
- Complex nested form for insurance types and fee schedules validates correctly

---

### TC-BILL-012: Single View Payer

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. From the Payers & Insurance tab of `/organization/practice-settings`, click on a payer → `/organization/practice-settings/view-payer/:id/:payerName`

**Expected Results:**
- Payer details displayed
- Insurance types listed
- Fee schedules per service code

---

### TC-BILL-013: Practice Settings — Rounding Rules

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. View "Rounding Rules" tab
2. Add a rounding rule

**Expected Results:**
- Rules listed
- Add modal: rule type, parameters
- Rules applied to billing calculations

---

### TC-BILL-014: Practice Settings — Insurance Types

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Add a new insurance type

**Expected Results:**
- Insurance type created
- Available in payer configuration and client authorizations

---

---

## Module 8: Payroll

### TC-PAY-001: Payroll Setup

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | PAYROLL module access |

**Steps:**
1. Navigate to `/payroll/payroll-setup`
2. View payroll runs

**Expected Results:**
- Payroll runs listed with: cycle name, period, status, total
- Create new payroll run
- View breakdown

---

### TC-PAY-002: Create New Payroll

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Create New Payroll"
2. Select cycle, period dates
3. Select employees
4. Review income items and deductions per employee
5. Preview totals
6. Click "Create"

**Expected Results:**
- Employee rows render with income/deduction calculations
- Preview modal shows grand totals
- Payroll created
- Toast: success

---

### TC-PAY-003: View Payroll Breakdown

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "View Breakdown" → `/payroll/payroll/view-breakdown/:id`

**Expected Results:**
- Per-employee breakdown: hours, rate, gross, deductions, net
- Dates formatted per tenant settings
- Currency formatted per tenant settings (USD, etc.)
- PDF/export capability

---

### TC-PAY-004: Payroll Settings — Payroll Cycles

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/payroll/payroll-settings`
2. View "Payroll Cycles" tab
3. Create new cycle (weekly, bi-weekly, monthly)

**Expected Results:**
- Cycles listed
- Create modal works
- Cycle available when creating payroll

---

### TC-PAY-005: Payroll Settings — Income Items

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. View "Income Items" tab
2. Add a new income item (e.g., "Regular Hours", "Overtime")

**Expected Results:**
- Income items listed
- Create modal: name, type, rate
- Available in payroll creation

---

### TC-PAY-006: Payroll Settings — Deductions

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. View "Deductions" tab
2. Add a deduction (e.g., "Tax", "Insurance")

**Expected Results:**
- Deductions listed
- Create modal works
- Applied in payroll calculations

---

### TC-PAY-007: Payroll Settings — Employee Payment Schedules

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. View "Employee Payment Schedules" tab
2. Assign schedules to employees

**Expected Results:**
- Per-employee schedule configuration
- Links to payroll cycles

---

---

## Module 9: Custom Forms

### TC-FORM-001: Forms List

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | CUSTOM_FORMS module access |

**Steps:**
1. Navigate to `/custom-forms/forms`

**Expected Results:**
- Forms listed with: name, status (draft/published), created date, response count, actions
- Tabs: All, Published, Drafts
- Search works
- "Create Form" button

---

### TC-FORM-002: Create Form — Form Builder

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Create Form" → `/custom-forms/forms/create`
2. Enter form name
3. Add fields via drag-and-drop or click:
   - Text Input
   - Textarea
   - Dropdown
   - Checkbox
   - Radio
   - Date
   - File Upload
   - Signature
   - Section Header
4. Configure each field (label, required, placeholder, options)
5. Add multiple pages
6. Click "Save as Draft" or "Publish"

**Expected Results:**
- Drag-and-drop works for field ordering
- Each field type renders correctly in the builder
- Field configuration panel opens when clicking a field
- Multi-page support with page navigation
- Save as draft → form saved but not available to clients
- Publish → form available for assignment to clients

---

### TC-FORM-003: Edit Existing Form

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Edit" on a draft form → `/custom-forms/forms/create/:formId`
2. Modify fields
3. Save

**Expected Results:**
- Existing fields pre-loaded
- Modifications saved
- Published form shows warning about editing

---

### TC-FORM-004: Form Renderer (Staff Preview)

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Preview" on a form → `/custom-forms/forms/renderer/:id`

**Expected Results:**
- Form renders as client would see it
- All field types functional
- Multi-page navigation works
- Submit button works (or shows preview-only mode)

---

### TC-FORM-005: Form Responses

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/custom-forms/forms/responses/:formId`

**Expected Results:**
- All client submissions listed
- Each response shows: client name, submitted date, status
- Click to view individual response
- Response data displayed correctly for each field type

---

### TC-FORM-006: Templates Library

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate to `/custom-forms/templates-library`

**Expected Results:**
- Pre-built form templates listed
- Clone template to create new form
- Preview template

---

### TC-FORM-007: Form Drafts

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Start creating a form
2. Save as draft
3. Close browser
4. Return to forms list
5. Click "Edit" on draft

**Expected Results:**
- Draft is saved with all field configurations
- Resumes editing where left off

---

---

## Module 10: Reports

### TC-RPT-001: Reports Dashboard

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | REPORTS module access |

**Steps:**
1. Navigate to `/reports`

**Expected Results:**
- Report types listed as cards/links:
  - Cancelled Appointments
  - Rescheduled Appointments
  - Attendance by Service Type
  - Attendance by Session Type
  - Audit Logs
  - Login Logs

---

### TC-RPT-002: Cancelled Appointments Report

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/reports/cancelled-appointments`
2. Select date range
3. Click "Generate"

**Expected Results:**
- Table with: Client, Clinician, Date, Time, Reason, Cancelled By, Cancel Time
- Dates/times formatted per tenant settings
- Export to CSV/PDF
- Pagination

---

### TC-RPT-003: Rescheduled Appointments Report

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/reports/rescheduled-appointments`
2. Select date range

**Expected Results:**
- Table with: Client, Clinician, Original Date/Time, New Date/Time, Reason
- Dates formatted per settings

---

### TC-RPT-004: Attendance by Service Type Report

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate to `/reports/attendance-service-type`

**Expected Results:**
- Report showing session counts grouped by service type
- Date range filter
- Chart visualization

---

### TC-RPT-005: Attendance by Session Type Report

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate to `/reports/attendance-session-type`

**Expected Results:**
- Report showing session counts grouped by session type

---

### TC-RPT-006: Audit Logs Report

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/reports/audit-logs`

**Expected Results:**
- All system actions logged: who, what, when
- Filterable by date, user, action type
- Timestamps formatted per settings

---

### TC-RPT-007: Login Logs Report

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate to `/reports/login-logs`

**Expected Results:**
- All login attempts logged: user, timestamp, IP, success/failure
- Filterable

---

---

## Module 11: Help & Support

### TC-HELP-001: Support Requests List

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | HELP_SUPPORT module access |

**Steps:**
1. Navigate to `/help/support-requests`

**Expected Results:**
- Support tickets listed: subject, priority, status, created date
- Create new ticket
- Filter by status (open, in progress, resolved, closed)
- Pagination

---

### TC-HELP-002: Create Support Request

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click "Create Request"
2. Fill in: subject, description, priority, category
3. Attach files (optional)
4. Submit

**Expected Results:**
- Ticket created
- Toast: success
- Appears in requests list
- Confirmation email (optional)

---

### TC-HELP-003: View Request Details

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Click on a ticket → `/help/support-requests/:requestId`

**Expected Results:**
- Full ticket details: subject, description, priority, status, timestamps
- Conversation thread (replies from support team)
- Reply capability
- Status updates
- Dates formatted per settings

---

### TC-HELP-003a: Support Request — Progress Track

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | A support request with several activity-log entries, including at least one whose action text embeds a record UUID |

**Steps:**
1. Open a support request and open its Progress Track
2. Read each entry's action text
3. Inspect an entry for an issue whose name is not known to the client
4. Inspect the person shown against each entry
5. Inspect the entries for any internal or agent-specific data
6. Open a track with more than five entries

**Expected Results:**
- Action text shows the **issue's name** where the API embedded a raw UUID (e.g. "updated issue 7ad4d5f8-…" reads as "updated issue `<name>`")
- Where the name is not known, the UUID is **dropped entirely** rather than displayed, and the leftover whitespace is collapsed
- An entry with no usable action text falls back to "Updated"
- Person names are title-cased for display even though the API returns them lowercase (e.g. "ajibola oluwagbemileke" reads as "Ajibola Oluwagbemileke")
- The person is read from `accessedBy`, falling back to the admin's first and last name
- **None of the following are visible anywhere in the track:** `ipAddress` or `userAgent` (they belong to the support agent, not the tenant), `location` (an internal endpoint path such as `/api/v1/issue/issue/reassign`), `feature` (the same string on every row), or `details` (which only repeats `action`)
- The track is paginated inside the modal at 5 entries per page; reopening the modal returns to the first page
- A filtered or shortened list never leaves the view stranded on an out-of-range page

---

### TC-HELP-003b: Support Requests — "Logged By" Fallback

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Open the support requests list
2. Locate a request with no admin recorded against it

**Expected Results:**
- The "Logged By" column falls back to the tenant's own name rather than rendering blank
- Requests that do have an admin still show that admin's name

---

### TC-HELP-004: Knowledge Base

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate to `/help/knowledge-base`

**Expected Results:**
- Articles/guides listed by category
- Search functionality
- Article detail view
- Helpful content for tenant users

---

---

## Module 12: Settings

### TC-SET-001: General Settings — Date/Time/Currency Format

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | SETTINGS module access |

**Steps:**
1. Navigate to `/settings`
2. View General Settings tab
3. Change Date Format (e.g., MM/DD/YYYY → DD/MM/YYYY)
4. Change Time Format (e.g., 12-hour → 24-hour)
5. Change Currency (e.g., USD → EUR)
6. Click "Save"

**Expected Results:**
- Settings saved to Redux and API
- **ALL dates across the entire app** now display in the new format
- **ALL times across the entire app** now display in the new format
- **ALL currency values** display with the new currency symbol
- Settings persist on page refresh
- Settings persist across sessions (saved to backend)

---

### TC-SET-002: Verify Settings Propagation — Dates

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Date format changed in settings |

**Steps:**
1. Check dates on: Dashboard, Timesheets, Claims, Appointments, Reports, Staff profiles, Client profiles, Notifications, Support requests

**Expected Results:**
- Every date on every page uses the configured format
- No hardcoded date formats remain

---

### TC-SET-003: Verify Settings Propagation — Times

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Check times on: Calendar, Appointments, Timesheets, Claims, Start Appointment

**Expected Results:**
- All times use configured format (12h with AM/PM or 24h)

---

### TC-SET-004: Verify Settings Propagation — Currency

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Check currency on: Payroll, Billing, Claims, Payer fee schedules

**Expected Results:**
- All monetary values prefixed with correct currency symbol

---

### TC-SET-005: Notification Settings

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. View "Notification Settings" tab
2. Toggle notification categories on/off
3. Save

**Expected Results:**
- Toggle states saved
- Only enabled notifications are received
- Persists across sessions

---

### TC-SET-006: Clinical Report Settings

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. View "Clinical Reports" tab
2. Create new report template
3. Configure default sections

**Expected Results:**
- Template saved
- Available in clinical report builder

---

---

## Module 13: Notifications

### TC-NOTIF-001: Notifications Page

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to `/notifications`

**Expected Results:**
- Notifications listed with: title, content, timestamp, read/unread indicator
- Grouped by type
- Mark as read
- Relative timestamps ("2 hours ago")

---

### TC-NOTIF-002: Real-Time Notification Arrival

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Stay on any page
2. Trigger a notification (e.g., client submits feedback)

**Expected Results:**
- Notification badge increments in sidebar
- New notification appears without page refresh

---

### TC-NOTIF-003: Mark Notification as Read

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click on an unread notification

**Expected Results:**
- Notification marked as read (visual change)
- Badge count decrements

---

### TC-NOTIF-004: Notifications Page — Access, Pagination and Mark All

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Log in as a user whose role grants no modules and navigate to `/notifications`
2. Load an account with 25 notifications
3. Click "Mark all as read"
4. Load an account with no notifications

**Expected Results:**
- The page loads for the module-less user -- `/notifications` sits outside every `ModuleGuard` and raises no "You don't have access to this module" toast
- `SectionLoader` shows while the list loads
- Pagination appears at 10 per page; each page is grouped by date within that page ("Today", "Yesterday", "Weekday, Mon D", or "Earlier" for an undated item)
- "Mark all as read" updates every card immediately, fires one request per unread item, then refetches so the list reflects the persisted state
- With nothing unread, neither the count badge nor the "Mark all as read" button is rendered
- The empty account shows the empty state and no pagination

---

### TC-NOTIF-005: Appointment Notifications Open a Modal in Place

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Appointments exist in the upcoming, past, reschedule-request, and cancelled states |

Appointment notifications navigate to `/scheduler/appointments` carrying `focusTab` and `focusId` in navigation state; the destination tab then opens the row's modal via `useFocusAppointment`.

**Steps:**
1. From `/notifications`, click the action on each appointment notification type in turn
2. After a modal opens, switch to another sub-tab and back
3. Trigger a notification for an appointment that is not present in the destination tab's loaded list

**Expected Results:**

| Notification type | Sub-tab focused | Modal opened |
|-------------------|-----------------|--------------|
| `UPCOMING_APPOINTMENT`, `APPOINTMENT_START_REMINDER`, `APPOINTMENT_STARTED`, `RESCHEDULED_APPOINTMENT` | Upcoming | `AppointmentViewModal` |
| `NEW_RESCHEDULE_REQUEST` | Reschedule Requests | `RescheduleRequestActionModal` |
| `COMPLETED_APPOINTMENT` | Past | `PastAppointmentDetailsModal` |
| `CANCELLED_APPOINTMENT` | Cancelled | The tab's own details view |

- The modal opens **exactly once**; switching sub-tabs and returning does not re-open it, because the navigation state is cleared after the first open
- On the Upcoming and Reschedule Requests tabs, a fallback fetch resolves the row so the modal still opens when it is absent from the loaded list (the list endpoint 404'd, or the appointment lives on another tab)
- Normal navigation to `/scheduler/appointments` without a notification opens no modal at all

---

### TC-NOTIF-006: Appointment Modals Opened From Notifications

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Open `AppointmentViewModal` from an Upcoming notification and from a Past notification
2. Inspect a row whose previous/new date and time arrive as objects
3. Inspect a row with missing values
4. Dismiss via the close control, then repeat and dismiss by clicking the backdrop
5. Repeat as a user lacking start / edit / reschedule / cancel permissions
6. From `PastAppointmentDetailsModal`, follow the onward action
7. From `RescheduleRequestActionModal`, use Accept, Modify, and Reject in turn

**Expected Results:**
- `AppointmentViewModal` renders correctly for both row shapes, never a half-populated edit form
- Object-valued date/time fields render as `date · time`, not as a React child error
- Missing values render as an em dash
- Both the close control and the backdrop dismiss the modal
- Only the action buttons the caller supplies are rendered; permission-gated actions are absent for users who lack them
- `PastAppointmentDetailsModal` leads onward to the timesheet, and formats dates as `MMM dd, yyyy`
- `RescheduleRequestActionModal`'s Accept, Modify, and Reject behave identically to the same actions on a Reschedule Requests table row

---

### TC-NOTIF-007: Client-Scoped Notification Deep-Links

| Field | Value |
|-------|-------|
| **Priority** | High |

The client panel needs two ids, so a client-scoped notification deep-links only when the payload carries both.

**Steps:**
1. Click the action on notifications carrying both `clientId` and `tenantClientId`, for each group below
2. Repeat with a payload missing one of the two ids

**Expected Results:**

| Notification types | Label | Client panel tab |
|--------------------|-------|------------------|
| `CLIENT_PROFILE_CREATION` | View client | Client Information |
| `DOCUMENT_REQUEST_CREATED`, `DOCUMENT_REQUEST_COMPLETED`, `DOCUMENT_REQUEST_NUDGE` | View documents | Client Information |
| `AUTHORIZATION_CREATION`, `AUTHORIZATION_EXPIRY_1_MONTH`, `AUTHORIZATION_EXPIRY_1_WEEK`, `AUTHORIZATION_UTILIZATION_80_PERCENT`, `AUTHORIZATION_UTILIZATION_ZERO` | View authorization | Authorization |
| `REPORT_APPROVAL_REQUEST_TO_SUPERVISOR`, `REPORT_CHANGE_REQUESTED_BY_SUPERVISOR`, `REPORT_APPROVED_BY_SUPERVISOR`, `CLIENT_REPORT_SIGNED`, `CLIENT_REPORT_CHANGE_REQUEST` | View report | Clinical Reports |

- With both ids present, the action navigates to `/client/client-single/{clientId}/{tenantClientId}` and focuses the listed tab
- With either id missing, it falls back to `/clients/client-list` rather than producing a broken URL

---

### TC-NOTIF-008: Single-Id and Fallback Notification Deep-Links

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Click the action on each single-id notification type, first with an `entityId` and then without one
2. Send a notification with an unrecognized `type` but a valid `entityType`
3. Send a notification with `entityType: "TENANT"`, `"PLAN"`, `"SUBSCRIPTION"`, or `"INVOICE"`
4. Run the app in development and watch the console

**Expected Results:**

| Notification types | With an id | Without an id |
|--------------------|-----------|---------------|
| `FORM_FILLED` | `/custom-forms/forms/responses/{id}` | `/custom-forms/forms` |
| `FORM_CREATED` | -- | `/custom-forms/forms` |
| `TIMESHEET_CREATED`, `TIMESHEET_CHANGE_REQUESTED`, `TIMESHEET_APPROVED`, `TIMESHEET_REJECTED` | `/billing/timesheets/{id}` | `/billing/timesheets` |
| `TICKET_SUBMITTED`, `TICKET_STATUS_IN_PROGRESS`, `TICKET_STATUS_RESOLVED`, `TICKET_WITHDRAWN` | `/help/support-requests/{id}` | `/help/support-requests` |
| `ORGANIZATION_LICENSE_EXPIRY_SOON`, `ORGANIZATION_LICENSE_EXPIRED` | -- | `/organization/general` |
| `PAYER_AUTHORIZATION_EXPIRY_SOON` | -- | `/organization/practice-settings` |
| `UPCOMING_PAYROLL`, `NEW_PAYROLL_RUN` | -- | `/payroll/payroll-setup` |

- An unrecognized `type` still resolves an action through its `entityType` fallback (`APPOINTMENT`, `CLIENT`, `DOCUMENT_REQUEST`, `AUTHORIZATION`, `CLINICAL_REPORT`, `FORM`, `LICENSE`, `TIMESHEET`, `PAYER`, `PAYROLL`, `ISSUE`); an `ISSUE` resolves to the tenant's own support request
- `TENANT`, `PLAN`, `SUBSCRIPTION`, and `INVOICE` resolve **no** action -- the tenant app has no route for them. The card marks read without navigating
- No `[notificationConfig] ENTITY_FALLBACK key "..." is not a NotificationEntityType` errors appear in the dev console
- Every configured destination matches a route in `Components/Allroutes.jsx`; none lands on the 404 page

---

---

## Module 14: Layout, Navigation & Permissions

### TC-NAV-001: Sidebar — All Modules Visible (Full Access)

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Login as super admin with all modules

**Expected Results:**
- Sidebar shows all modules: Dashboard, Scheduler, Clients, Program Library, My Organization, Billing & Payments, Payroll, Custom Forms, Reports, Help & Support, Settings, Notifications

---

### TC-NAV-002: Module Guard — Restricted Access

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Login as staff with only DASHBOARD and SCHEDULER access
2. Try navigating to `/billing/timesheets`

**Expected Results:**
- Toast: "You don't have access to this module"
- Page does NOT render -- `ModuleGuard` returns nothing; it does not redirect
- Only permitted modules visible in sidebar
- `/notifications` remains reachable, as it sits outside every `ModuleGuard`

---

### TC-NAV-002a: View Permission — AccessDenied Within a Module

| Field | Value |
|-------|-------|
| **Priority** | Critical |

Hiding a nav link is only half of view gating. Content the user may not view must be blocked too, so a direct URL cannot reveal it.

**Steps:**
1. Log in as a user who has access to a module but lacks a specific `view_*` permission within it
2. Confirm the corresponding nav link or tab is hidden
3. Paste the direct URL for that page into the address bar
4. Repeat for several permission-gated pages and panels across the app

**Expected Results:**
- The nav link or tab is absent
- The direct URL loads the page shell but the content is replaced by the `AccessDenied` panel: a centred lock icon above "You don't have permission to view this."
- **No table rows, record details, or client data are rendered behind or around the panel**
- Where a page passes a custom `message`, that wording is shown instead of the default

---

### TC-NAV-003: Sidebar — Navigation Works

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click each sidebar item

**Expected Results:**
- Active item highlighted
- Correct page loads
- SPA routing (no full reload)
- Sub-menus expand/collapse correctly

---

### TC-NAV-004: Logout

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Click "Logout"

**Expected Results:**
- Socket disconnected
- Redux store cleared, persisted state purged
- Redirect to login
- Cannot access protected routes after logout

---

### TC-NAV-005: Mobile Responsive Layout

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. View on mobile (<768px)
2. Toggle sidebar hamburger menu

**Expected Results:**
- Sidebar collapses
- Hamburger menu toggle works
- Content area uses full width
- Tables scroll horizontally

---

### TC-NAV-006: Online/Offline Detection

| Field | Value |
|-------|-------|
| **Priority** | Low |

**Steps:**
1. Disconnect internet → offline banner
2. Reconnect → online banner for 3 seconds

**Expected Results:**
- Offline banner reads "You are offline — check your connection" and stays for as long as the browser reports offline
- Online banner reads "Back online" and auto-dismisses after 3 seconds
- Going offline again clears any pending online-banner timer
- Nothing is shown in the normal connected case

---

### TC-NAV-006a: Socket Presence Badge (ConnectionStatus)

| Field | Value |
|-------|-------|
| **Priority** | Medium |

The socket's state is shown passively on the avatar rather than as a toast. The former "Connection lost" / "Connection restored" toasts were removed because they fired on every tab switch.

**Steps:**
1. Log in and locate the presence badge on the user avatar in the header
2. Hover it, then reach it with the keyboard alone
3. Drop the network briefly and watch the badge
4. Switch to another browser tab for several minutes, then return
5. Use a screen reader on the badge

**Expected Results:**
- Online tooltip reads "You're online. Messages and notifications arrive live."
- Offline tooltip reads "You're offline. Reconnecting now — nothing is lost, and updates resume on their own."
- The badge is focusable (`tabIndex={0}`) so the tooltip is reachable by keyboard, not hover alone
- **No toast is raised on either disconnect or reconnect**, including after backgrounding the tab
- On returning to the tab the socket reconnects on its own (`visibilitychange` → `ensureConnected()`) and the badge returns to online
- The badge exposes `role="status"` and `aria-live="polite"` with a screen-reader-only copy of the tooltip text
- This badge is distinct from the network banner: the banner reports the browser's connectivity, the badge reports the socket

---

### TC-NAV-007: Modal Draft Persistence

| Field | Value |
|-------|-------|
| **Priority** | High |

An accidental Cancel or close must not lose in-progress input. Drafts are held in the persisted `formDrafts` Redux slice.

**Steps:**
1. Open a modal form (for example Add Prospect, Add Client, Add Staff, or Add Authorization) and fill in several fields
2. Close the modal with Cancel, then reopen it
3. Repeat, but reload the browser before reopening
4. Fill the form in fully and submit successfully, then reopen the modal
5. Fill in a password or attach a file, close, and reopen
6. Leave a draft untouched for longer than 7 days, then reopen the modal

**Expected Results:**
- Reopening restores what was typed
- The draft survives a page reload (it rides through `redux-persist`)
- After a **successful submit** the draft is cleared and the modal reopens empty
- Password fields and file attachments are **never** persisted
- A draft older than its 7-day TTL is not restored
- Each modal keeps its own draft under its own key; drafts do not leak between modals

---

### TC-NAV-008: Stale Chunk Recovery After Deploy

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Load the app, then deploy a new build so the hashed chunk filenames change
2. Without refreshing, navigate to a route whose chunk has not yet been loaded
3. Simulate a genuine, persistent chunk failure (for example by blocking the asset) and navigate again

**Expected Results:**
- The failed dynamic import triggers a single page reload, which pulls the fresh `index.html` and the route then loads -- the user does not see a blank screen
- A genuine failure does **not** loop: the `chunkReloadAttempted` flag in `sessionStorage` allows only one reload, after which the error surfaces
- The flag is cleared once an import succeeds

---

---

## Module 15: Real-Time Features

### TC-RT-001: Socket.IO Connection

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Login and verify WebSocket connection in DevTools

**Expected Results:**
- Active WebSocket connection
- No repeated connect/disconnect cycles

---

### TC-RT-002: In-App Messaging

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Open message modal
2. Send message to a client/staff
3. Receive reply

**Expected Results:**
- Messages sent/received in real-time
- Message count badge updates
- Conversation threads persist

---

### TC-RT-003: Socket Disconnect on Logout

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Logout

**Expected Results:**
- WebSocket closed cleanly
- No reconnection attempts

---

---

## Module 16: Security & Session Management

### TC-SEC-001: Idle Timeout

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Leave app idle for configured timeout period

**Expected Results:**
- Auto-logout after timeout
- State purged, redirect to login

---

### TC-SEC-002: Idle Reset on Activity

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Interact before timeout expires

**Expected Results:**
- Timer resets, user stays logged in

---

### TC-SEC-003: Token Persistence

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Login, close tab, reopen

**Expected Results:**
- User still authenticated
- Dashboard loads without re-login

---

### TC-SEC-004: XSS Prevention

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Enter `<script>alert('xss')</script>` in any text field
2. Submit and view saved data

**Expected Results:**
- Script NOT executed
- Rendered as plain text

---

### TC-SEC-005: Axios Timeout

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Simulate slow network
2. Make API call

**Expected Results:**
- Request times out after 30 seconds
- User-friendly error message

---

---

## Module 17: Cross-Browser & Responsive Testing

### TC-CB-001: Chrome Desktop

| **Priority:** Critical |

Test all key workflows (login, create appointment, create client, view timesheet) in Chrome.

---

### TC-CB-002: Firefox Desktop

| **Priority:** High |

Same as TC-CB-001 in Firefox.

---

### TC-CB-003: Safari Desktop

| **Priority:** High |

Same as TC-CB-001 in Safari.

---

### TC-CB-004: Edge Desktop

| **Priority:** Medium |

Same as TC-CB-001 in Edge.

---

### TC-CB-005: Mobile — iPhone Safari

| **Priority:** High |

Test login, dashboard, calendar, appointment creation, modals on iPhone.

---

### TC-CB-006: Mobile — Android Chrome

| **Priority:** High |

Same as TC-CB-005 on Android.

---

### TC-CB-007: Tablet — iPad

| **Priority:** Medium |

Landscape and portrait testing of key pages.

---

---

## Module 18: Performance & Error Handling

### TC-PERF-001: Initial Load Time

| **Priority:** High |

**Expected:** Login page loads in < 3 seconds on broadband. Lazy loading means only login chunk loaded initially.

---

### TC-PERF-002: Dashboard Load Time

| **Priority:** High |

**Expected:** All 5 dashboard cards load within 3 seconds. Parallel API calls for each card.

---

### TC-PERF-003: Error Boundary

| **Priority:** Medium |

**Expected:** Runtime errors caught by ErrorBoundary. User-friendly error screen, not white/blank page.

---

### TC-PERF-004: API Error Handling

| **Priority:** High |

**Expected:** 500/network errors show user-friendly toasts. App remains functional. Retry possible.

---

### TC-PERF-005: Large Data Sets

| **Priority:** Medium |

**Expected:** Pages with 100+ items in tables render without lag. Pagination works correctly.

---

---

## Module 19: Accessibility

### TC-A11Y-001: Keyboard Navigation

| **Priority:** Medium |

All interactive elements reachable via Tab. Focus visible. Enter activates buttons. Escape closes modals.

---

### TC-A11Y-002: Screen Reader Labels

| **Priority:** Medium |

Form inputs have labels. Buttons have descriptive text. Images have alt text.

---

### TC-A11Y-003: Color Contrast

| **Priority:** Low |

Text meets WCAG AA ratio (4.5:1). Status badges distinguishable.

---

---

## Defect Severity Classification

| Severity | Definition | Example |
|----------|-----------|---------|
| **Critical** | App unusable, data loss, security breach | Login broken, data not saving, timesheet approval not working, XSS |
| **High** | Major feature broken, no workaround | Cannot create appointment, cannot add client, claims not rendering |
| **Medium** | Feature partially broken, workaround exists | Chart wrong for one period, pagination off by one, formatting issue |
| **Low** | Cosmetic, minor UX | Alignment off, wrong color, typo |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Project Manager | | | |
| Development Lead | | | |
| Product Owner | | | |

---

**Total Test Cases: 155**

| Module | Count | Critical | High | Medium | Low |
|--------|-------|----------|------|--------|-----|
| Authentication & Onboarding | 17 | 9 | 5 | 2 | 1 |
| Dashboard | 6 | 1 | 3 | 2 | 0 |
| Scheduler | 19 | 2 | 9 | 6 | 2 |
| Clients | 17 | 4 | 7 | 4 | 2 |
| Program Library | 6 | 1 | 3 | 2 | 0 |
| My Organization | 20 | 3 | 7 | 8 | 2 |
| Billing & Payments | 14 | 4 | 6 | 3 | 1 |
| Payroll | 7 | 1 | 4 | 1 | 1 |
| Custom Forms | 7 | 1 | 4 | 2 | 0 |
| Reports | 7 | 0 | 3 | 3 | 1 |
| Help & Support | 4 | 0 | 3 | 1 | 0 |
| Settings | 6 | 2 | 1 | 2 | 1 |
| Notifications | 3 | 0 | 2 | 1 | 0 |
| Layout & Permissions | 6 | 3 | 1 | 1 | 1 |
| Real-Time | 3 | 0 | 3 | 0 | 0 |
| Security | 5 | 3 | 1 | 1 | 0 |
| Cross-Browser | 7 | 1 | 3 | 2 | 1 |
| Performance | 5 | 0 | 2 | 2 | 1 |
| Accessibility | 3 | 0 | 0 | 2 | 1 |

---

*Document generated for Noosphere Tenant Portal QA. All test cases should be executed for each release cycle.*
