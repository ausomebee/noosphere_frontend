# Noosphere Client Portal — QA Test Plan

**Application:** Noosphere Client Portal
**Module:** Client (`/client`)
**Version:** 1.1.0
**Date:** September 1, 2026
**Prepared By:** QA Team
**Environment:** https://noospherehub.net/client

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Environment & Prerequisites](#2-test-environment--prerequisites)
3. [Test Scope](#3-test-scope)
4. [Module 1: Authentication](#module-1-authentication)
5. [Module 2: Dashboard (Home)](#module-2-dashboard-home)
6. [Module 3: Programs](#module-3-programs)
7. [Module 4: Documents & Forms](#module-4-documents--forms)
8. [Module 5: Notifications](#module-5-notifications)
9. [Module 6: Profile & Settings](#module-6-profile--settings)
10. [Module 7: Layout & Navigation](#module-7-layout--navigation)
11. [Module 8: Real-Time Features](#module-8-real-time-features)
12. [Module 9: Security & Session Management](#module-9-security--session-management)
13. [Module 10: Cross-Browser & Responsive Testing](#module-10-cross-browser--responsive-testing)
14. [Module 11: Performance & Error Handling](#module-11-performance--error-handling)
15. [Module 12: Accessibility](#module-12-accessibility)
16. [Defect Severity Classification](#defect-severity-classification)
17. [Sign-Off](#sign-off)

---

## 1. Overview

The Noosphere Client Portal is a simple web portal used by clients (patients/caregivers) of ABA therapy tenants. It provides clients with the ability to:

- View their dashboard with session overview cards, authorization data, and appointment management across five tabs (upcoming, awaiting, completed, reschedule, cancelled)
- Review completed sessions awaiting their feedback (star ratings, confirm delivery, signature)
- Request appointment reschedules
- View therapy programs and target performance data
- Manage personal documents (upload, download, organize in folders)
- Complete forms assigned by the tenant
- Manage profile and notification preferences

The client portal has NO scheduler, NO organization management, and NO billing features. It is a read-and-respond portal for clients.

**Client Pages:** Login, InitialLogin, InitialResetPassword, InitialResetSuccessful, ForgotPassword, CheckEmail, ChangePassword, Dashboard (Home), Profile, Notifications, Programs, DocumentsAndForms, FormRenderer.

This document provides a comprehensive test plan for all features of the Client Portal module.

---

## 2. Test Environment & Prerequisites

### 2.1 Environment

| Item | Value |
|------|-------|
| **Production URL** | `https://noospherehub.net/client` |
| **Staging URL** | `https://staging.noospherehub.net/client` |
| **Backend API** | `https://noospherehub.net/api/v1` |
| **Supported Browsers** | Chrome 100+, Firefox 100+, Safari 16+, Edge 100+ |
| **Mobile Browsers** | Chrome Mobile, Safari iOS |
| **Minimum Screen Width** | 320px (mobile), 768px (tablet), 1024px (desktop) |

### 2.2 Test Accounts Required

| Role | Description |
|------|-------------|
| **New Client** | A client account that has never logged in (for initial login flow) |
| **Existing Client** | A client with existing appointments, sessions, and programs |
| **Client with Approvals Pending** | A client with sessions awaiting feedback/approval |
| **Client with Documents** | A client with document requests and uploaded files |
| **Client with Forms** | A client with assigned custom forms |

### 2.3 Test Data Prerequisites

- At least 3 upcoming appointments scheduled for the client
- At least 2 completed sessions awaiting client approval
- At least 1 cancelled appointment
- At least 1 rescheduled appointment
- At least 2 programs with targets assigned to the client
- At least 3 document requests (1 pending, 1 overdue, 1 completed)
- At least 1 custom form assigned to the client
- Active authorizations with service codes
- Notification history (appointment reminders, session completions, etc.)

---

## 3. Test Scope

### 3.1 In Scope

- All client-facing UI pages and components
- Authentication flows (login, initial login, forgot password, reset password)
- Dashboard data rendering and interactions
- Appointment management (view details, request reschedule, review session feedback)
- Programs and target performance viewing
- Document management (upload, download, folders, form filling)
- Profile management and password changes
- Notification display and real-time updates
- Session timeout and idle detection
- Responsive design across screen sizes
- Error handling and edge cases

### 3.2 Out of Scope

- Backend API unit tests (separate test plan)
- Database integrity tests
- Load/stress testing (separate test plan)
- Third-party service availability (S3, Socket.IO server)
- Tenant/Control module testing (separate QA documents)
- Scheduler features (not present in client portal)
- Organization management (not present in client portal)
- Billing features (not present in client portal)

---

## Module 1: Authentication

### TC-AUTH-001: Client Login — Valid Credentials

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client account exists with verified credentials |

**Steps:**
1. Navigate to `/client`
2. Verify the login page loads with "Welcome to your Client Portal!" heading and "Please login to your account" subheading
3. Enter a valid email in the email field
4. Enter the correct password in the password field
5. Click the "Login" button

**Expected Results:**
- Loading spinner appears on the button during API call
- Toast notification: "Login successful"
- User is redirected to `/dashboard`
- User data is persisted in Redux store (firstName, lastName, tokens, etc.)

---

### TC-AUTH-002: Client Login — Invalid Email Format

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | None |

**Steps:**
1. Navigate to `/client`
2. Enter "invalidemail" (no @ symbol) in the email field
3. Enter any password (at least 8 characters)
4. Click "Login"

**Expected Results:**
- Form does NOT submit
- Inline error message: "Please enter a valid email address" appears below email field
- No API call is made

---

### TC-AUTH-003: Client Login — Empty Fields

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | None |

**Steps:**
1. Navigate to `/client`
2. Leave both email and password fields empty
3. Click "Login"

**Expected Results:**
- Inline error "Email is required" below email field
- Inline error "Password is required" below password field
- No API call is made

---

### TC-AUTH-004: Client Login — Wrong Password

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Valid client account exists |

**Steps:**
1. Navigate to `/client`
2. Enter a valid email
3. Enter an incorrect password (at least 8 characters to pass client validation)
4. Click "Login"

**Expected Results:**
- Toast notification with error message from API (e.g., "Invalid credentials" or "Login failed")
- User remains on login page
- Password field is NOT cleared (user can retry)

---

### TC-AUTH-005: Client Login — Password Too Short

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | None |

**Steps:**
1. Enter a valid email
2. Enter a password with fewer than 8 characters (e.g., "abc")
3. Click "Login"

**Expected Results:**
- Inline error: "Password must be at least 8 characters"
- No API call is made

---

### TC-AUTH-006: Initial Login — First-Time Client

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | New client account that has never logged in |

**Steps:**
1. Navigate to `/client/intialLogin`
2. Enter the client's email and temporary password
3. Click "Login"

**Expected Results:**
- Toast notification: "Login successful"
- User is redirected to `/intialResetPassword` (password reset page)
- User is NOT redirected to dashboard

---

### TC-AUTH-007: Initial Password Reset

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User completed initial login (TC-AUTH-006) |

**Steps:**
1. On `/intialResetPassword` page, enter a new password meeting all requirements:
   - At least 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character
2. Enter the same password in "Confirm Password" field
3. Click "Reset Password"

**Expected Results:**
- Toast notification: "Password updated successfully!"
- User is redirected to `/intialResetSuccessful`
- Success page displays with confirmation message

---

### TC-AUTH-008: Initial Password Reset — Validation Errors

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is on `/intialResetPassword` |

**Steps:**
1. Enter "password" (no uppercase, no number, no special char)
2. Enter "differentpassword" in confirm field
3. Click "Reset Password"

**Expected Results:**
- Inline errors for each failed validation rule:
  - "Password must contain at least one uppercase letter"
  - "Password must contain at least one number"
  - "Password must contain at least one special character"
  - "Passwords must match"

---

### TC-AUTH-009: Forgot Password Flow

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client account exists |

**Steps:**
1. From login page, click "Forgot Password" link
2. Verify navigation to `/forgotPassword`
3. Enter the client's registered email
4. Click "Send Reset Link" (or equivalent)

**Expected Results:**
- Toast notification: "Password reset email sent successfully!"
- User is redirected to `/checkEmail` page
- Check Email page displays with the email address shown
- "Resend Email" button is available

---

### TC-AUTH-010: Forgot Password — Invalid Email

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | None |

**Steps:**
1. Navigate to `/forgotPassword`
2. Enter an invalid email format
3. Click submit

**Expected Results:**
- Inline error: "Please enter a valid email address"
- No API call is made

---

### TC-AUTH-011: Change Password via Email Link

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User received password reset email |

**Steps:**
1. Click the reset link from the email (navigates to `/changePassword/:clientTenantId`)
2. Enter a new password meeting all requirements
3. Enter matching confirm password
4. Click "Change Password"

**Expected Results:**
- Toast notification: "Password updated successfully!"
- User is redirected to login page (`/`)

---

### TC-AUTH-012: Protected Route — Unauthenticated Access

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is NOT logged in |

**Steps:**
1. Clear all cookies/localStorage
2. Navigate directly to `/client/dashboard`
3. Try `/client/programs`, `/client/profile`, `/client/documents`, `/client/notifications`
4. Try `/client/forms/renderer/some-id`

**Expected Results:**
- Each protected route redirects to login page (`/`)
- No dashboard content is visible
- No API calls are made with stale tokens

---

### TC-AUTH-013: Unknown Route — Catch-All Redirect

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | None |

**Steps:**
1. Navigate to `/client/nonexistent-page`
2. Navigate to `/client/some/random/path`

**Expected Results:**
- User is redirected to login page (`/`)

---

## Module 2: Dashboard (Home)

### TC-DASH-001: Dashboard Overview Cards Load

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client is logged in with existing session data |

**Steps:**
1. Navigate to `/dashboard`
2. Observe the overview section at the top

**Expected Results:**
- Three overview cards display:
  - **Completed Sessions** — shows count (e.g., "5")
  - **Avg. Session Duration** — shows formatted time (e.g., "01:30hrs")
  - **Upcoming Sessions** — shows count (mapped from awaitingApproval API field)
- Loading spinners appear while data is fetching
- No "NaN" or "undefined" values displayed

---

### TC-DASH-002: Session Chart Renders

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client has completed sessions |

**Steps:**
1. On the dashboard, observe the session chart section in the OverviewCard
2. Toggle chart period (month/week/day via the period selector)

**Expected Results:**
- Chart renders with session counts per period
- Chart updates when period is changed (triggers new API call with groupBy parameter)
- Empty state message if no data for selected period
- No console errors

---

### TC-DASH-003: Authorization Service Codes Display

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client has active authorizations with service codes |

**Steps:**
1. On the dashboard, observe the AuthorizationCard section
2. Use the service code dropdown to select different service codes

**Expected Results:**
- Service code dropdown populates with options formatted as "code - description"
- Selecting a service code displays:
  - Total authorized units
  - Total completed/used units
  - Total remaining units
  - Service code and description
- Selected service code updates the displayed authorization data

---

### TC-DASH-004: Upcoming Appointments Tab

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client has upcoming appointments |

**Steps:**
1. On the dashboard, verify the "Upcoming" tab is active by default
2. Observe the appointments table

**Expected Results:**
- Table title: "My Appointments" with subtitle "See and manage all your appointments here"
- Table displays with columns: Session Type, Service Type(s), Date & Time, Clinician(s)
- Each row shows date and time on separate lines (pre-line formatted)
- Service types show as "code - description..." (truncated to 20 chars)
- Dates and times are formatted correctly (not raw ISO strings)
- Pagination works if more than 10 appointments
- Each row has a three-dot menu with two actions:
  - "Request Reschedule" (with calendar icon)
  - "View appointment details" (with eye icon)

---

### TC-DASH-005: Awaiting Feedback Tab

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client has completed sessions awaiting their feedback |

**Steps:**
1. Click the "Awaiting feedback" tab (shows count badge of pending items)
2. Observe the appointments listed

**Expected Results:**
- Only sessions awaiting client feedback are shown
- Service Type column shows "Pending Review" for all rows
- Each row has a "Review Session" link (blue, underlined, styled as a button)
- Clicking "Review Session" opens the Session Feedback modal

---

### TC-DASH-006: Completed Appointments Tab

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client has completed and approved sessions |

**Steps:**
1. Click the "Completed" tab

**Expected Results:**
- Completed sessions are listed
- Date & Time column may show date, time, and duration on separate lines (e.g., "01/15/2026\n2:00 PM\n1h 30m")
- Client approval status and supervisor approval status are available in the data
- No action buttons on completed rows (actions array is empty)

---

### TC-DASH-007: Reschedule Requests Tab

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client has rescheduled appointments |

**Steps:**
1. Click the "Reschedule Requests" tab

**Expected Results:**
- Rescheduled appointments are listed with standard columns (Session Type, Service Type(s), Date & Time, Clinician(s))
- Each row shows a status badge:
  - Green "Accepted" badge if `rescheduleAccepted` is true
  - Red "Rejected" badge if `rescheduleRejected` is true
  - Yellow/amber "Pending" badge otherwise
- Each row has a three-dot menu with "View details" action (eye icon)
- Clicking "View details" opens the Appointment Details modal

---

### TC-DASH-008: Cancelled Appointments Tab

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client has cancelled appointments |

**Steps:**
1. Click the "Cancelled" tab

**Expected Results:**
- Cancelled appointments are listed with standard columns
- Cancel reason is stored in row data (`reasonForCancel` or "No reason provided")
- Cancelled by info is stored in row data (`canceledBy` or "Unknown")
- No action buttons on cancelled rows (actions array is empty)

---

### TC-DASH-009: Appointment Details Modal

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client has upcoming appointments |

**Steps:**
1. On the "Upcoming" tab, click the three-dot menu on an appointment row
2. Click "View appointment details"
3. Observe the Appointment Details modal

**Expected Results:**
- Modal opens with title "Appointment details"
- Close button (X icon, RxCross2) in header works
- Modal body shows:
  - **Client section:** Client name (with preferred name in parentheses if present), and Appointment Frequency (recurrence description such as "Does not repeat", "Weekly on Mon, Wed", "Every 2 days", etc.)
  - **Details grid** with bullet-pointed rows:
    - Clinician(s) — comma-separated list of clinician fullNames
    - Date and Time — formatted as "MM/dd/yyyy" followed by "h:mm a - h:mm a" (e.g., "02/20/2026 . 1:54 PM - 3:39 PM")
    - Service Type — service codes formatted as "code - description"
    - Service Location (e.g., "Clinic")
    - Session Type (e.g., "Group Training")
    - Requires Travel ("Yes"/"No") — only shown if the field is defined
- Footer has a single "Request Reschedule" button (secondary variant, full width, with FiRefreshCw icon)
- No edit button, no cancel button, no start button
- Clicking outside the modal (overlay) closes it

---

### TC-DASH-010: Appointment Details Modal — Request Reschedule Flow

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Appointment Details modal is open |

**Steps:**
1. Click "Request Reschedule" in the Appointment Details modal footer

**Expected Results:**
- Appointment Details modal closes
- Reschedule modal opens with the same appointment data
- The selected appointment is passed to the Reschedule modal

---

### TC-DASH-011: Reschedule Modal — Pre-populate and Display

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Reschedule modal is opened from Upcoming tab or from Appointment Details modal |

**Steps:**
1. Open the Reschedule modal via either:
   - Three-dot menu "Request Reschedule" on an upcoming appointment, OR
   - "Request Reschedule" button in the Appointment Details modal
2. Observe the Reschedule modal

**Expected Results:**
- Modal title: "Reschedule appointment"
- Subtitle text: "Let's find a time that works for everyone"
- Current appointment summary box shows (if data available):
  - Session name
  - Clinician name(s)
  - Date & Time
- Form fields:
  - "Choose a new date" (date input, pre-populated with current appointment date)
  - "Start time" (time input, pre-populated with current start time)
  - "End time" (time input, pre-populated with current end time)
  - "Reason for rescheduling" (textarea, empty, placeholder: "Enter your reason for rescheduling")
- Primary button: "Reschedule" (changes to "Rescheduling..." when loading)
- Secondary button: "Cancel"

---

### TC-DASH-012: Reschedule Modal — Submit Valid Request

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Reschedule modal is open |

**Steps:**
1. Change the date to a future date
2. Adjust start and end times (ensuring end time is after start time)
3. Enter a reason for rescheduling (e.g., "Doctor appointment conflict")
4. Click "Reschedule"

**Expected Results:**
- Button text changes to "Rescheduling..." with loading state
- On success:
  - Reschedule modal closes
  - Success modal opens with title "Awesome" and message "Your reschedule request has been sent!"
  - Success modal auto-closes after 3.5 seconds
  - Appointments table refreshes (refreshKey increments)

---

### TC-DASH-013: Reschedule Modal — Validation Errors

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Reschedule modal is open |

**Steps:**
1. Clear the date field
2. Clear the start time
3. Clear the end time
4. Leave the reason empty
5. Click "Reschedule"

**Expected Results:**
- Toast: "Please fill in all required fields"
- Inline errors:
  - "Date is required"
  - "Start time is required"
  - "End time is required"
  - "Reason is required"
- No API call is made

---

### TC-DASH-014: Reschedule Modal — End Time Before Start Time

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Reschedule modal is open |

**Steps:**
1. Set start time to "14:00"
2. Set end time to "13:00"
3. Fill in date and reason
4. Click "Reschedule"

**Expected Results:**
- Toast: "Please fill in all required fields"
- Inline error on end time: "End time must be after start time"
- No API call is made

---

### TC-DASH-015: Reschedule Modal — API Error

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Reschedule modal is open with valid data |

**Steps:**
1. Fill in all fields correctly
2. Simulate an API failure (e.g., network disconnect)
3. Click "Reschedule"

**Expected Results:**
- Error toast with message from API or "Failed to reschedule appointment. Please try again."
- Modal remains open so user can retry
- Loading state is cleared (button returns to "Reschedule")

---

### TC-DASH-016: Session Feedback / Review Modal

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client has sessions awaiting feedback |

**Steps:**
1. On the "Awaiting feedback" tab, click "Review Session" on a session
2. Observe the Session Feedback modal

**Expected Results:**
- Modal opens with title "Session Information"
- Loading spinner shown while fetching full session details via `GetSingleSessionBySessionId`
- After loading, session info section displays:
  - Date (MM/dd/yyyy format)
  - Client name and insurance ID
  - Clinician name and NPI
  - Session start time and end time (h:mm a format)
  - Session type
  - Location
  - Duration (e.g., "1h 30m")
- "View SOAP Notes" button (if SOAP notes exist)
- "View Session Data" button (if session data exists)
- Star ratings (1-5 stars):
  - "Rate Service"
  - "Rate Therapist"
- "Confirm Delivery" checkbox
- Feedback textarea
- Signature section with mode toggle (draw/type/image):
  - Draw mode: canvas for drawing signature
  - Type mode: text input for typed signature
  - Image mode: upload a signature image
- Primary button: "Save and Close" (disabled until "Confirm Delivery" is checked)
- Secondary button: "Cancel"

---

### TC-DASH-017: Session Feedback — Submit with Signature

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Session Feedback modal is open |

**Steps:**
1. Check "Confirm Delivery"
2. Rate service: 4 stars
3. Rate therapist: 5 stars
4. Enter feedback text: "Great session, very helpful"
5. Draw a signature on the canvas
6. Click "Save and Close"

**Expected Results:**
- Button text changes to "Saving..." with loading state
- API call sends: sessionId, confirmDelivery, rateService, rateTherapist, feedback, signature (base64 data URL)
- On success:
  - Feedback modal closes
  - Success modal opens with title "Thank you!" and message "Your session feedback has been submitted!"
  - Success modal auto-closes after 3.5 seconds
  - Appointments table refreshes
  - Session moves from "Awaiting feedback" to "Completed" tab

---

### TC-DASH-018: Session Feedback — Validation

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Session Feedback modal is open |

**Steps:**
1. Do NOT check "Confirm Delivery"
2. Click "Save and Close"

**Expected Results:**
- "Save and Close" button is disabled when "Confirm Delivery" is not checked (button has `primaryButtonDisabled` when `!confirmed`)
- If somehow clicked without confirm: Toast "Please confirm that the session was delivered"

**Additional validation:**
1. Check "Confirm Delivery" but do NOT provide a signature
2. Click "Save and Close"

**Expected Results:**
- Toast: "Please provide your signature"
- No API call is made

---

### TC-DASH-019: Session Feedback — Clear Signature

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Signature has been drawn on the canvas |

**Steps:**
1. Draw a signature
2. Click the "Clear" button on the signature pad

**Expected Results:**
- Signature canvas is cleared
- User can draw a new signature

---

### TC-DASH-020: Session Feedback — Upload Signature Image

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Session Feedback modal is open |

**Steps:**
1. Switch signature mode to "image" (upload toggle)
2. Click the upload area or drag an image file
3. Select a PNG/JPG image of a signature

**Expected Results:**
- Image is stored as the signature for submission
- Only image file types are accepted

---

### TC-DASH-021: SOAP Notes Modal

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Session has SOAP notes from clinician |

**Steps:**
1. In the Session Feedback modal, click "View SOAP Notes"

**Expected Results:**
- SOAP Notes modal opens as a portal overlay (rendered via ReactDOM.createPortal)
- Title: "SOAP Notes"
- Body shows "Session Notes" heading followed by the note content (or "No notes available for this session." if empty)
- Close button (RxCross2 icon) in header works
- Blue "Close" button in footer works
- Clicking outside the modal (overlay) closes it

---

### TC-DASH-022: Session Data Modal

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Session has target data collected |

**Steps:**
1. In the Session Feedback modal, click "View Session Data"

**Expected Results:**
- Session Data modal opens as a portal overlay
- Title: "Session Data"
- Displays target-by-target data including:
  - Target number and Target ID
  - Notes (if present)
  - Number of Occurrences (if present)
  - Duration in seconds (if present)
  - Data Collection Type (if present)
  - Percentage Correct (if present)
  - Trials table (if trials data exists)
- Close button works
- Clicking outside the modal closes it

---

### TC-DASH-023: Dashboard — Empty State

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client with no appointments or sessions |

**Steps:**
1. Log in as a client with no data
2. Observe dashboard

**Expected Results:**
- Overview cards show "0" or appropriate defaults (not "NaN", "undefined")
- Appointment table shows empty state with SVG illustration, title "No appointments", and subtitle "You don't have any appointments yet. New appointments will appear here"
- Chart shows empty state
- No errors in console

---

### TC-DASH-024: Dashboard — Pagination

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client has more than 10 appointments in any tab |

**Steps:**
1. View a tab with 10+ appointments
2. Click "Next" page
3. Click "Previous" page

**Expected Results:**
- Table updates with next/previous page data (client-side pagination, 10 items per page)
- Current page number is highlighted
- "Previous" is disabled on page 1
- "Next" is disabled on the last page
- Page resets to 1 when switching tabs

---

### TC-DASH-025: Dashboard — Tab Switching

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client is on dashboard |

**Steps:**
1. Click through all five tabs: Upcoming, Awaiting feedback, Reschedule Requests, Completed, Cancelled
2. Observe loading state and data for each tab

**Expected Results:**
- Loading spinner ("Loading appointments...") appears while fetching data for each tab
- Each tab triggers a separate API call for its data
- Page number resets to 1 on tab change
- Awaiting feedback tab shows count badge with number of pending items
- No data leakage between tabs

---

### TC-DASH-025a: Dashboard — Tab Selection Persists Across Refresh

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Select a tab other than the default (for example "Completed")
2. Refresh the page
3. Close the browser tab entirely, then reopen the dashboard
4. Open the dashboard in a private window

**Expected Results:**
- After the refresh the same tab is still selected (stored in `sessionStorage` under a `tab:` key)
- After closing and reopening the browser tab, the selection resets to the default -- `sessionStorage` does not survive a tab close
- In a private window, or with site data blocked, the page still loads and simply falls back to the default tab; storage errors do not break the page

---

### TC-DASH-026: Success Modal Display

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Successfully submitted a reschedule request or session feedback |

**Steps:**
1. Complete a reschedule submission (TC-DASH-012) or session feedback (TC-DASH-017)
2. Observe the success modal

**Expected Results:**
- Success modal displays with:
  - For reschedule: Title "Awesome", message "Your reschedule request has been sent!"
  - For feedback: Title "Thank you!", message "Your session feedback has been submitted!"
  - Close button
- Modal auto-closes after approximately 3.5 seconds
- Clicking close button also closes the modal

---

## Module 3: Programs

### TC-PROG-001: Programs Page Load

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client has programs with targets assigned |

**Steps:**
1. Navigate to `/programs`
2. Wait for page to load

**Expected Results:**
- Loading spinner while data fetches
- Programs listed with:
  - Program name
  - Description
  - Number of targets
- Each program shows its targets

---

### TC-PROG-002: Program Tabs — Filter by Status

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Programs page is loaded |

**Steps:**
1. Click "All" tab
2. Click other available tabs (if filtering by active/completed status)

**Expected Results:**
- Table filters to show only matching programs/targets
- Count updates in tab labels
- Empty state if no programs match the filter

---

### TC-PROG-003: Search Programs

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Programs page loaded with multiple programs |

**Steps:**
1. Type a program name in the search field
2. Type a target name
3. Clear the search field

**Expected Results:**
- Results filter in real-time as user types
- Only matching programs/targets are shown
- Clearing search shows all results again

---

### TC-PROG-004: View Target Performance

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Programs with targets exist |

**Steps:**
1. Click the "View" action on a specific target
2. Observe the performance modal

**Expected Results:**
- Performance modal opens with:
  - Target name and program name
  - Data collection type (e.g., "Rate", "Trials/Opportunities", etc.)
  - Performance chart/graph
  - Session history data
- Loading spinner while performance data fetches
- Close button works

---

### TC-PROG-005: Target Performance — Different Data Collection Types

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Targets exist with different data collection types |

**Steps:**
1. View performance for a "Rate" type target
2. View performance for a "Trials/Opportunities" type target
3. View performance for a "Duration" type target
4. View performance for a "Task Analysis" type target
5. View performance for a "Percentage Correct" type target
6. View performance for a "Frequency" type target
7. View performance for a "Latency" type target

**Expected Results:**
- Each type renders an appropriate chart/visualization
- Data is correctly formatted for each type:
  - Rate: occurrences per duration
  - Trials: correct/incorrect/prompt levels
  - Duration: time in seconds/minutes
  - Task Analysis: steps completed
  - Percentage Correct: % value
  - Frequency: count of occurrences
  - Latency: time between stimulus and response

---

### TC-PROG-006: Programs Page — Empty State

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Client has no programs assigned |

**Steps:**
1. Log in as a client with no programs
2. Navigate to `/programs`

**Expected Results:**
- Empty state message displayed (not a blank page)
- No console errors

---

### TC-PROG-007: Programs — Pagination

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client has many targets |

**Steps:**
1. Verify pagination appears when more items than page size
2. Navigate between pages

**Expected Results:**
- Pagination controls work correctly
- Page numbers update

---

## Module 4: Documents & Forms

### TC-DOC-001: Document Requests Section Load

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client has document requests from tenant |

**Steps:**
1. Navigate to `/documents`
2. Observe the "Document Requests" section

**Expected Results:**
- Table displays with columns: Name, Description, Status, Due Date, Created Date, Actions
- Status badges show correct colors:
  - PENDING — warning (yellow/orange)
  - OVERDUE — danger (red)
  - COMPLETED — success (green)
- Dates are formatted correctly (not raw ISO)
- Pagination works

---

### TC-DOC-002: Upload Document to a Request

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | A pending document request exists |

**Steps:**
1. Click the upload action on a pending document request
2. Upload modal opens
3. Select a file from the computer (PDF, DOC, JPG, PNG)
4. Click "Upload" / "Submit"

**Expected Results:**
- File upload progress indicator
- Toast notification: success message
- Document request status updates (may change to "COMPLETED" or show attached file)
- File size and type are validated before upload

---

### TC-DOC-003: Upload Document — File Type Validation

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Upload modal is open |

**Steps:**
1. Try to upload an unsupported file type (e.g., .exe, .bat)

**Expected Results:**
- Error message: file type not allowed
- File is NOT uploaded

---

### TC-DOC-004: Select From My Documents

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client has files in My Documents and a pending request |

**Steps:**
1. Click the action to attach from "My Documents" on a request
2. Select From My Documents modal opens
3. Browse existing documents
4. Select a document
5. Click "Attach"

**Expected Results:**
- Existing documents are listed
- Selected document is attached to the request
- Toast notification: success
- Modal closes

---

### TC-DOC-005: Forms Section Load

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client has assigned forms |

**Steps:**
1. On `/documents` page, observe the forms section
2. Verify forms table renders

**Expected Results:**
- Forms table shows: Form Name, Description, Status, Due Date, Actions
- "Fill Out" or "View" action button on each form
- Pagination works

---

### TC-DOC-006: Fill Out a Form — Navigate to Form Renderer

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | An assigned form exists |

**Steps:**
1. Click "Fill Out" on an assigned form
2. Observe navigation to `/forms/renderer/:id`

**Expected Results:**
- Form renderer page loads with form name displayed
- All form fields render correctly based on field type
- Multi-page forms show page navigation

---

### TC-DOC-007: Form Renderer — Text Fields

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Form with text input fields |

**Steps:**
1. Fill in text input fields
2. Fill in textarea fields
3. Verify required field validation

**Expected Results:**
- Text inputs accept and display typed text
- Textarea allows multi-line input
- Required fields show error if left empty on submission

---

### TC-DOC-008: Form Renderer — File Upload Fields

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Form with file upload fields |

**Steps:**
1. Click on a file upload field
2. Select a file
3. Verify file size limit validation
4. Verify file type validation
5. Try drag and drop upload

**Expected Results:**
- File is attached with name and size displayed
- Delete/remove button available for uploaded files
- File size limit is enforced (shows error if exceeded)
- Only allowed file types are accepted
- Drag and drop works correctly
- Upload status indicator shows progress

---

### TC-DOC-009: Form Renderer — Signature Field

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Form with signature field |

**Steps:**
1. Draw a signature on the canvas
2. Clear the signature
3. Redraw
4. Toggle to upload mode
5. Upload a signature image

**Expected Results:**
- Signature canvas works with mouse/touch
- Clear button resets the canvas
- Upload mode accepts image files
- Signature is saved in form responses

---

### TC-DOC-010: Form Renderer — Multi-Page Navigation

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Form with multiple pages |

**Steps:**
1. Fill in fields on page 1
2. Click "Next" to go to page 2
3. Click "Previous" to go back to page 1
4. Verify data is preserved when navigating

**Expected Results:**
- Page transitions smoothly
- Previously entered data is preserved
- Page indicator shows current page / total pages
- "Previous" is hidden/disabled on page 1
- "Submit" appears on the last page

---

### TC-DOC-011: Form Renderer — Submit Form

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | All form fields are filled |

**Steps:**
1. Fill out all required fields across all pages
2. Click "Submit" on the last page

**Expected Results:**
- Loading spinner during submission
- Toast notification: success
- Form is marked as submitted
- User cannot re-submit (submitted state is displayed)
- User is navigated back to documents page

---

### TC-DOC-011a: Form Renderer — Clear All Responses

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | A multi-page form with several answered fields and at least one signature |

Confirmation is a styled in-product dialog (`ConfirmModal`), not a native `window.confirm`.

**Steps:**
1. Fill in fields across several pages, including a signature
2. Navigate to the last page and locate the Clear button
3. Click it and read the dialog
4. Cancel the dialog
5. Click it again and confirm
6. Force the clear action to fail, and confirm again

**Expected Results:**
- The Clear button is shown on the **last page only**
- The dialog is an in-product modal, not a browser confirm box: it is styled like the rest of the product and dismisses with the rest of the UI
- Title reads "Clear all responses?"
- Message reads "Everything you've entered on this form will be removed, including signatures. This can't be undone."
- The confirm button is labelled "Clear all"
- Cancelling leaves every answer and signature intact
- Confirming clears all responses, resets the signature canvases, and shows an info toast
- If the confirm action **fails**, the modal stays open with its message on screen rather than dismissing as though it had worked

---

### TC-DOC-012: My Documents — Create Folder

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client is on Documents page |

**Steps:**
1. Click "New" button
2. Select "New Folder"
3. Enter folder name: "Medical Records"
4. Click "Create"

**Expected Results:**
- New folder appears in the folders list
- Toast notification: success
- Folder icon displays with name

---

### TC-DOC-013: My Documents — Upload File

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client is on Documents page |

**Steps:**
1. Click "New" button
2. Select "Upload File"
3. Select a file from computer
4. Choose a folder (optional)
5. Click "Upload"

**Expected Results:**
- File appears in the recent files list and all files table
- File metadata shown: name, size, date, type icon
- Toast notification: success
- File is downloadable after upload

---

### TC-DOC-014: My Documents — View Folder Contents

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Folder exists with files |

**Steps:**
1. Click on a folder
2. Observe the folder contents modal

**Expected Results:**
- Modal opens showing all files in the folder
- Each file shows name, size, date
- Download and delete actions available
- Close button works

---

### TC-DOC-015: My Documents — Rename Folder

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Folder exists |

**Steps:**
1. Click the edit/rename action on a folder
2. Enter new name
3. Click "Save"

**Expected Results:**
- Folder name updates in the UI
- Toast notification: success

---

### TC-DOC-016: My Documents — Download File

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Files exist in My Documents |

**Steps:**
1. Click download button on a file

**Expected Results:**
- Browser downloads the file
- File is not corrupted
- Original filename is preserved

---

### TC-DOC-017: My Documents — Search

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Multiple files exist |

**Steps:**
1. Type in the search field
2. Verify results filter

**Expected Results:**
- Files filter by name as user types
- No results shows appropriate empty state

---

### TC-DOC-018: My Documents — Toggle View (List/Grid)

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Files exist |

**Steps:**
1. Click the grid view toggle
2. Click the list view toggle

**Expected Results:**
- View switches between list and grid layout
- All data is preserved during switch
- Active view is highlighted

---

## Module 5: Notifications

### TC-NOTIF-001: Notifications Page Load

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client has notifications |

**Steps:**
1. Navigate to `/notifications`
2. Wait for page to load

**Expected Results:**
- Loading spinner while fetching
- Notifications grouped by type (e.g., "Appointment Completed", "Reschedule", etc.)
- Each notification card shows:
  - Title
  - Content/description
  - Relative timestamp (e.g., "2 hours ago", "3 days ago")
  - Read/unread visual indicator
- Unread notifications have a distinct style (e.g., highlighted background)

---

### TC-NOTIF-002: Mark Notification as Read

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Unread notifications exist |

**Steps:**
1. Click the action button on an unread notification
2. Observe the notification card

**Expected Results:**
- Notification card style changes from unread to read
- Optimistic UI update (immediately changes, doesn't wait for API)
- Socket event `notificationRead` is emitted
- API call to mark as read succeeds (no error toast)

---

### TC-NOTIF-003: Notification Types Display Correctly

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Multiple notification types exist |

**Steps:**
1. Verify each notification type has appropriate label:
   - `APPOINTMENT_COMPLETED_AWAITING_FEEDBACK` — shows "Review" action
   - Other types — shows "View details" action
2. Verify type grouping headers

**Expected Results:**
- Notifications are grouped correctly by type
- Group headers show human-readable labels (not raw enum values)
- Groups appear in a consistent order
- Unknown types are appended at the end

---

### TC-NOTIF-004: Notifications — Empty State

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Client with no notifications |

**Steps:**
1. Log in as client with no notifications
2. Navigate to `/notifications`

**Expected Results:**
- Empty state message (not blank page)
- No console errors

---

### TC-NOTIF-005: Relative Time Formatting

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Notifications with various timestamps |

**Steps:**
1. Verify timestamp formatting for:
   - Notification created < 1 minute ago — "Just now"
   - Created 5 minutes ago — "5 minutes ago"
   - Created 3 hours ago — "3 hours ago"
   - Created 2 days ago — "2 days ago"
   - Created 1 hour ago — "1 hour ago" (singular)

**Expected Results:**
- All relative times display correctly with proper singular/plural

---

## Module 6: Profile & Settings

### TC-PROF-001: Profile Page Load

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client is logged in |

**Steps:**
1. Navigate to `/profile`
2. Observe the profile form

**Expected Results:**
- Profile fields pre-populated from API:
  - First Name, Last Name
  - Email (read-only or editable based on design)
  - Phone Number
  - Gender
  - Date of Birth
  - Preferred Name
- Avatar image displayed (or default avatar if none)
- Loading indicator while data fetches

---

### TC-PROF-002: Update Profile Information

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Profile page is loaded |

**Steps:**
1. Change the phone number
2. Change the preferred name
3. Click "Save" / "Update Profile"

**Expected Results:**
- Loading indicator on save button
- Toast notification: success message
- Updated data persists on page refresh
- Profile data in sidebar/header updates (if name changed)

---

### TC-PROF-003: Upload Profile Avatar

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Profile page loaded |

**Steps:**
1. Click on the avatar image or upload button
2. Select an image file (JPG, PNG)
3. Observe the upload

**Expected Results:**
- Only valid image types accepted (JPG, JPEG, PNG, GIF)
- Image uploads to S3 and URL is saved
- Avatar updates immediately in profile
- Avatar updates in the sidebar navigation
- Toast notification: success

---

### TC-PROF-004: Upload Avatar — Invalid File Type

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Profile page loaded |

**Steps:**
1. Click upload
2. Select a non-image file (e.g., .pdf, .exe)

**Expected Results:**
- Error toast: invalid file type
- File is NOT uploaded
- Current avatar remains unchanged

---

### TC-PROF-005: Change Password

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Profile page loaded |

**Steps:**
1. Click "Change Password" button
2. Password form/modal appears
3. Enter current password
4. Enter new password meeting all requirements
5. Enter matching confirm password
6. Click "Update Password"

**Expected Results:**
- Loading indicator during API call
- Toast notification: success
- Password fields are cleared after success
- User can log in with new password
- Old password no longer works

---

### TC-PROF-006: Change Password — Validation

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Password form is visible |

**Steps:**
1. Enter new password "weak" (doesn't meet requirements)
2. Enter mismatched confirm password
3. Click "Update"

**Expected Results:**
- Inline errors for failed validation rules
- Error message if current password is incorrect
- Form does NOT submit

---

### TC-PROF-007: Notification Settings

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Profile page loaded |

**Steps:**
1. Scroll to the Notification Settings section
2. Toggle individual notification preferences on/off
3. Observe loading states during toggle

**Expected Results:**
- Each toggle has a loading indicator while saving
- Toggle state updates optimistically
- Changes persist on page refresh
- "Reset to Saved" button reverts unsaved changes
- Categories of notifications are clearly labeled

---

### TC-PROF-008: Default Avatar Fallback

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Client with no uploaded avatar |

**Steps:**
1. Log in as a client without an avatar
2. Navigate to profile

**Expected Results:**
- Initials-based avatar is displayed (e.g., "SM" for Samuel Makinde)
- OR default placeholder avatar is shown
- No broken image icon

---

## Module 7: Layout & Navigation

### TC-NAV-001: Sidebar Navigation

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client is logged in |

**Steps:**
1. Verify sidebar shows all navigation items:
   - Dashboard (Home icon)
   - Programs
   - Notifications
   - Documents
   - Profile
2. Click each item

**Expected Results:**
- Active page is highlighted in the sidebar
- Clicking navigates to the correct page:
  - Dashboard -> `/dashboard`
  - Programs -> `/programs`
  - Notifications -> `/notifications`
  - Documents -> `/documents`
  - Profile -> `/profile`
- No page reload (SPA routing)
- User name and avatar display in sidebar

---

### TC-NAV-002: Mobile Sidebar Toggle

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Screen width < 768px |

**Steps:**
1. Observe sidebar is collapsed/hidden on mobile
2. Click the hamburger menu icon
3. Sidebar opens as overlay
4. Click a navigation item
5. Sidebar closes

**Expected Results:**
- Hamburger menu toggle works
- Sidebar opens as an overlay on mobile
- Clicking a nav item closes the sidebar
- Close button (X) also closes the sidebar
- Background overlay is present when sidebar is open

---

### TC-NAV-003: Logout

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client is logged in |

**Steps:**
1. Click the "Logout" button in the sidebar
2. Observe the result

**Expected Results:**
- Socket connection is disconnected
- Redux store is cleared
- Persisted state is purged
- User is redirected to login page (`/`)
- Attempting to navigate to `/dashboard` redirects back to login
- No stale tokens remain in storage

---

### TC-NAV-004: Online/Offline Banner

| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Client is logged in |

**Steps:**
1. Disconnect from the internet (disable WiFi/network)
2. Observe the offline banner
3. Reconnect to the internet
4. Observe the online banner

**Expected Results:**
- Offline: banner shows "You are offline" (or similar)
- Online: banner shows "You are back online" for 3 seconds, then disappears
- Banners are non-intrusive

---

### TC-NAV-005: Message Modal

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client is logged in |

**Steps:**
1. Click the chat/message icon in the layout
2. Message modal opens
3. View conversation threads
4. Send a message

**Expected Results:**
- Message modal opens with conversations
- Messages display with timestamps
- New messages can be typed and sent
- Message count badge updates
- Real-time messages appear without refresh

---

## Module 8: Real-Time Features

### TC-RT-001: Socket.IO Connection

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client is logged in |

**Steps:**
1. Open browser DevTools > Network > WS tab
2. Verify WebSocket connection is established

**Expected Results:**
- WebSocket connection to `/socket.io/` is active
- Connection upgrades from polling to WebSocket
- No repeated connection/disconnection cycles

---

### TC-RT-002: Real-Time Notifications

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client is logged in, staff performs an action |

**Steps:**
1. Have a staff member complete a session for this client
2. Observe the client portal (without refreshing)

**Expected Results:**
- Notification count updates in real-time
- New notification appears in the notifications page (if currently viewing)
- No page refresh required

---

### TC-RT-003: Real-Time Messages

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client and staff both online |

**Steps:**
1. Open message modal on client side
2. Have staff send a message
3. Observe client-side message modal

**Expected Results:**
- New message appears in real-time
- Message count badge increments
- No manual refresh needed

---

### TC-RT-004: Socket Disconnection on Logout

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client is logged in with active socket |

**Steps:**
1. Click "Logout"
2. Check WebSocket connections in DevTools

**Expected Results:**
- WebSocket connection is closed
- No reconnection attempts after logout

---

### TC-RT-005: Connection Status Presence Badge

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Client is logged in |

Socket state is shown passively on the avatar. The former "Connection lost" / "Connection restored" toasts were removed because they fired on every tab switch -- browsers throttle background timers, so the heartbeat misses and the socket drops as a matter of course.

**Steps:**
1. Locate the presence badge on the avatar in the header
2. Hover it, then reach it using the keyboard alone
3. Disconnect the network briefly and watch the badge
4. Switch to another browser tab for several minutes, then return
5. Use a screen reader on the badge

**Expected Results:**
- Online tooltip reads "You're online. Messages and notifications arrive live."
- Offline tooltip reads "You're offline. Reconnecting now — nothing is lost, and updates resume on their own."
- The badge is focusable, so the tooltip is reachable by keyboard rather than hover alone
- **No toast appears on disconnect or reconnect**, including after backgrounding the tab
- Returning to the tab reconnects the socket automatically and the badge returns to online
- The badge exposes `role="status"` and `aria-live="polite"` with a screen-reader-only copy of the text
- This is distinct from the offline banner, which reports the browser's connectivity rather than the socket

---

## Module 9: Security & Session Management

### TC-SEC-001: Idle Timeout

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client is logged in |

**Steps:**
1. Log in and go to dashboard
2. Do NOT interact with the page for the configured timeout period (e.g., 15 minutes)
3. Observe the result

**Expected Results:**
- After the idle timeout, user is automatically logged out
- Socket is disconnected
- Redux store is purged
- User is redirected to login page
- Toast or notification indicating session expired

---

### TC-SEC-002: Idle Timeout Reset on Activity

| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Client is logged in |

**Steps:**
1. Wait until just before the idle timeout
2. Move the mouse or press a key
3. Continue waiting

**Expected Results:**
- Idle timer resets on user activity (mouse move, click, keypress)
- User is NOT logged out if they interact before the timeout

---

### TC-SEC-003: Token Persistence

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client is logged in |

**Steps:**
1. Log in successfully
2. Close the browser tab
3. Open a new tab and navigate to `/client/dashboard`

**Expected Results:**
- User is still logged in (tokens persisted via redux-persist)
- Dashboard loads without re-authentication
- User data (name, avatar) is displayed correctly

---

### TC-SEC-004: Axios Request Timeout

| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Backend is slow or unreachable |

**Steps:**
1. Simulate slow network (DevTools > Network > Slow 3G)
2. Perform an action that makes an API call
3. Wait for timeout

**Expected Results:**
- Request times out after configured duration (e.g., 30 seconds)
- User-friendly error message is shown
- App does not hang indefinitely

---

### TC-SEC-005: XSS Prevention

| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Client is logged in |

**Steps:**
1. In any text input field, enter: `<script>alert('XSS')</script>`
2. Submit the form
3. View the saved data on page reload

**Expected Results:**
- Script is NOT executed
- Text is displayed as plain text (escaped)
- No JavaScript execution from user input

---

## Module 10: Cross-Browser & Responsive Testing

### TC-CB-001: Chrome Desktop

| Field | Value |
|-------|-------|
| **Priority** | Critical |

**Steps:**
1. Open the entire client portal in Chrome (latest)
2. Navigate through all pages
3. Perform key actions (login, reschedule, upload, form fill)

**Expected Results:**
- All pages render correctly
- All interactions work
- No layout issues

---

### TC-CB-002: Firefox Desktop

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:** Same as TC-CB-001 in Firefox

**Expected Results:** Same as TC-CB-001

---

### TC-CB-003: Safari Desktop

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:** Same as TC-CB-001 in Safari

**Expected Results:** Same as TC-CB-001

---

### TC-CB-004: Edge Desktop

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:** Same as TC-CB-001 in Edge

**Expected Results:** Same as TC-CB-001

---

### TC-CB-005: Mobile — iPhone Safari

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Open client portal on iPhone (Safari)
2. Test login, dashboard, reschedule modal, signature pad, file upload

**Expected Results:**
- Responsive layout adapts correctly
- Touch interactions work (signature canvas, buttons, toggles)
- Modals are properly sized for mobile screen
- No horizontal scrolling on any page

---

### TC-CB-006: Mobile — Android Chrome

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:** Same as TC-CB-005 on Android Chrome

**Expected Results:** Same as TC-CB-005

---

### TC-CB-007: Tablet — iPad

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Open on iPad (landscape and portrait)
2. Test all pages

**Expected Results:**
- Layout adapts for tablet width
- Sidebar may be collapsible
- Tables are readable without horizontal scroll

---

## Module 11: Performance & Error Handling

### TC-PERF-001: Initial Page Load Time

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Clear browser cache
2. Navigate to login page
3. Measure load time (DevTools > Network)

**Expected Results:**
- Initial load < 3 seconds on standard broadband
- Lazy loading means only login chunk is loaded initially (all pages use React.lazy)
- Vendor chunks are cacheable

---

### TC-PERF-002: Dashboard Load Time

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Navigate to dashboard after login
2. Measure time until all data is displayed

**Expected Results:**
- Loading spinners appear immediately for each section
- Data populates within 2-3 seconds
- Parallel API calls (overview, chart, authorization load in parallel; appointments load based on active tab)

---

### TC-PERF-003: Error Boundary

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Simulate a runtime error (e.g., component crash)

**Expected Results:**
- ErrorBoundary component catches the error
- User-friendly error message displayed
- App does NOT show a white/blank screen
- Error details logged to console

---

### TC-PERF-004: API Error Handling

| Field | Value |
|-------|-------|
| **Priority** | High |

**Steps:**
1. Simulate a 500 server error (or disconnect backend)
2. Perform various actions (login, load dashboard, submit form)

**Expected Results:**
- User-friendly error toast notifications via showToast
- No raw error objects shown to user
- App remains functional (doesn't crash)
- User can retry the action

---

### TC-PERF-005: Network Interruption During Action

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Start uploading a file
2. Disconnect network midway
3. Reconnect

**Expected Results:**
- Error message shown on failure
- User can retry the upload
- No data corruption

---

### TC-PERF-006: Loading Indicator Tiers

| Field | Value |
|-------|-------|
| **Priority** | Low |

**Steps:**
1. Throttle the network and navigate between routes
2. Throttle the network and load a page whose individual cards fetch separately (the dashboard)
3. Observe a table while its rows load

**Expected Results:**
- A route transition shows the full-page loader (the animated logo)
- A section within a page shows `SectionLoader` -- a ring with a "Loading..." label -- not a full-page loader
- The section loader reserves its space, so the surrounding layout does not jump when content arrives
- A table renders its own row-level indicator
- Loaders expose `role="status"` and `aria-live="polite"`

---

### TC-PERF-007: Inline Fetch Failure (ErrorFallback)

| Field | Value |
|-------|-------|
| **Priority** | High |

An error boundary catches *render* errors; a failed fetch does not throw during render and is handled separately.

**Steps:**
1. Force a section's data request to fail
2. Read the panel that replaces the section
3. Click "Try Again" after restoring the connection
4. Force a failure on a section whose retry handler is not supplied

**Expected Results:**
- The failed section is replaced inline by the error panel: a red warning icon, an "Oops!" heading, and the message
- The rest of the page keeps working -- one failed section does not blank the route
- Where a retry handler exists, a "Try Again" button is shown and re-runs the fetch successfully
- Where none is supplied, no "Try Again" button is rendered
- With no message supplied, the panel falls back to "Something went wrong. Please try again."

---

### TC-PERF-008: Stale Chunk Recovery After Deploy

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Load the app, then deploy a new build so the hashed chunk filenames change
2. Without refreshing, navigate to a route whose chunk has not yet loaded
3. Simulate a genuine, persistent chunk failure and navigate again

**Expected Results:**
- The failed dynamic import triggers a single page reload that pulls the fresh `index.html`, and the route then loads -- the client does not see a blank screen
- A genuine failure does **not** loop: the `chunkReloadAttempted` flag in `sessionStorage` permits only one reload, after which the error surfaces
- The flag is cleared once an import succeeds
- The form renderer route is eagerly imported and is unaffected

---

## Module 12: Accessibility

### TC-A11Y-001: Keyboard Navigation

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Navigate the entire app using only Tab, Shift+Tab, Enter, and Escape
2. Test login form, navigation, modals, buttons, dropdowns

**Expected Results:**
- All interactive elements are reachable via Tab
- Focus order follows visual layout
- Focused element has a visible outline/ring
- Enter activates buttons and links
- Escape closes modals

---

### TC-A11Y-002: Screen Reader Labels

| Field | Value |
|-------|-------|
| **Priority** | Medium |

**Steps:**
1. Use a screen reader (NVDA, VoiceOver, or browser extension)
2. Navigate through key pages

**Expected Results:**
- Form inputs have associated labels
- Buttons have descriptive text
- Images have alt text
- Navigation landmarks are present
- Modal focus is trapped when open

---

### TC-A11Y-003: Color Contrast

| Field | Value |
|-------|-------|
| **Priority** | Low |

**Steps:**
1. Use a contrast checker tool (Lighthouse, axe DevTools)
2. Check key UI elements

**Expected Results:**
- Text meets WCAG AA contrast ratio (4.5:1 for normal text)
- Status badges are distinguishable
- Error states are not indicated by color alone

---

## Defect Severity Classification

| Severity | Definition | Example |
|----------|-----------|---------|
| **Critical** | Application unusable, data loss, security breach | Login broken, data not saving, XSS vulnerability |
| **High** | Major feature broken, no workaround | Cannot reschedule, cannot upload documents, form submission fails |
| **Medium** | Feature partially broken, workaround exists | Chart not rendering for one period, pagination off by one |
| **Low** | Cosmetic issue, minor UX problem | Alignment off, wrong hover color, typo in label |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Project Manager | | | |
| Development Lead | | | |
| Product Owner | | | |

---

**Total Test Cases: 82**

| Module | Count | Critical | High | Medium | Low |
|--------|-------|----------|------|--------|-----|
| Authentication | 13 | 4 | 5 | 2 | 2 |
| Dashboard (Home) | 26 | 5 | 6 | 11 | 4 |
| Programs | 7 | 1 | 3 | 2 | 1 |
| Documents & Forms | 18 | 3 | 7 | 5 | 3 |
| Notifications | 5 | 0 | 2 | 2 | 1 |
| Profile & Settings | 8 | 2 | 3 | 2 | 1 |
| Layout & Navigation | 5 | 2 | 1 | 1 | 1 |
| Real-Time Features | 4 | 0 | 3 | 1 | 0 |
| Security & Session | 5 | 3 | 1 | 1 | 0 |
| Cross-Browser | 7 | 1 | 3 | 2 | 0 |
| Performance & Error | 5 | 0 | 2 | 2 | 0 |
| Accessibility | 3 | 0 | 0 | 2 | 1 |

---

*Document generated for Noosphere Client Portal QA. All test cases should be executed for each release cycle.*
