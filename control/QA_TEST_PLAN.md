# Noosphere Control Module -- Comprehensive QA Test Plan

**Module:** Control (Super Admin Panel)
**Last Updated:** 2026-09-01
**Version:** 1.1

---

## Table of Contents

1. [Authentication & Access Control](#1-authentication--access-control)
2. [Tenant Management -- Tenant List](#2-tenant-management----tenant-list)
3. [Tenant Management -- Pipeline (Prospect Tenants)](#3-tenant-management----pipeline-prospect-tenants)
4. [Tenant Single -- Detail Views](#4-tenant-single----detail-views)
5. [Billing & Payments -- Plans & Pricing](#5-billing--payments----plans--pricing)
6. [Billing & Payments -- Invoice & Payment Manager](#6-billing--payments----invoice--payment-manager)
7. [Billing & Payments -- Subscription Manager](#7-billing--payments----subscription-manager)
8. [Billing & Payments -- Auto-Billing Settings](#8-billing--payments----auto-billing-settings)
9. [Billing & Payments -- Reports](#9-billing--payments----reports)
10. [Payment Page (Stripe & PayPal)](#10-payment-page-stripe--paypal)
11. [Issue Management](#11-issue-management)
12. [Feature Management](#12-feature-management)
13. [Performance Monitoring](#13-performance-monitoring)
14. [Settings -- Roles & Permissions](#14-settings----roles--permissions)
15. [Settings -- Staff Management](#15-settings----staff-management)
16. [Settings -- Departments](#16-settings----departments)
17. [Settings -- Security Settings](#17-settings----security-settings)
18. [Shared Components & Utilities](#18-shared-components--utilities)
19. [Permission & Authorization Guards](#19-permission--authorization-guards)
20. [Session, Token & Idle Timeout](#20-session-token--idle-timeout)
21. [Cross-Cutting Concerns](#21-cross-cutting-concerns)
22. [Notifications](#22-notifications)

---

## 1. Authentication & Access Control

### 1.1 Super Admin Login (`/`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1.1 | Successful login with valid credentials | Enter valid email and password, click Login | User is redirected to the dashboard (`/tenants/tenant-list` or default protected route). Access token and refresh token are stored in Redux state. |
| 1.1.2 | Login with invalid email | Enter a non-existent email, valid password, click Login | Error toast displays "Login failed" or server-provided message. User remains on login page. |
| 1.1.3 | Login with wrong password | Enter valid email, incorrect password, click Login | Error toast displays server-provided error message. User remains on login page. |
| 1.1.4 | Login with empty fields | Leave email and/or password empty, click Login | Form validation prevents submission. Inline validation messages appear on empty fields. |
| 1.1.5 | Login with malformed email | Enter "notanemail" as email, click Login | Form validation rejects the input. Inline error message indicates invalid email format. |
| 1.1.6 | 2FA redirect after login | Login with credentials for an account that has 2FA enabled and already completed (`auth2FADone`) | After successful credential check, user is redirected to the appropriate 2FA route (`/SA/2fa-question/login` or `/SA/2fa-authentication/login`) based on the effective 2FA method. |
| 1.1.7 | 2FA master switch disabled | Configure super-admin choices with `isEnabled: false`, then log in | 2FA is skipped entirely. User goes straight to `/tenants/pipeline` regardless of `auth2FADone` or configured method. |
| 1.1.8 | Forced setup when "set for all" is on | With `setForAll: true` and the org method set to Authenticator, log in as an admin whose `auth2FADone` is false | User is redirected to `/2fa/authenticator` for forced setup, using the organization's method rather than their own `authType`. |
| 1.1.9 | Forced setup after the method changes for all | Complete 2FA as an admin, then have the super admin change the org 2FA method for all; log in again | `auth2FADone` is false again, so the user is routed back into setup for the new method. |
| 1.1.10 | New super admin with no method chosen | Log in as a brand-new super admin (`superAdmin` true, `auth2FADone` false, no effective type) | User is redirected to `/SA/change-password` for password onboarding, not to a 2FA route. |
| 1.1.11 | Non-privileged admin picks their own method | With `setForAll: false`, log in as a regular admin who has no `authType` yet | User is redirected to `/2fa/choice` to choose their own method. |
| 1.1.12 | Completed 2FA with no effective type | Log in as a user with `auth2FADone` true but no effective 2FA type | User goes straight to `/tenants/pipeline`. |
| 1.1.13 | Backend error message is surfaced | Trigger a login rejection that returns a specific backend message | The toast shows the backend's message rather than a generic one; a rejection with no message falls back to "Login failed". |

### 1.2 Change Password (`/SA/change-password`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.2.1 | Successful password change | Enter valid old administrator password, valid new administrator password, confirm new password, submit | API call to `/admin/setadministratorpassword` succeeds. Success toast displayed. User is redirected to login or dashboard. |
| 1.2.2 | Wrong old password | Enter incorrect old password, valid new password, submit | Error message "Adminstrator password failed" or server message displayed. Password is not changed. |
| 1.2.3 | New passwords do not match | Enter valid old password, mismatched new password and confirm password | Form validation prevents submission. Error message indicates passwords must match. |
| 1.2.4 | Weak new password | Enter a new password that does not meet complexity requirements | Validation error shown indicating password requirements. |

### 1.3 2FA Settings (`/SA/2fa-settings`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.3.1 | View current 2FA choices | Navigate to 2FA settings page | Page loads and displays current settings fetched from `GET /admin/superadminchoices`. Shows Authenticator2FA toggle, securityQuestion toggle, and setForAll toggle. |
| 1.3.2 | Enable authenticator 2FA | Toggle Authenticator2FA on, save | `POST /admin/superadminchoices` is called with `Authenticator2FA: true`. Success toast displayed. Setting persists on page reload. |
| 1.3.3 | Enable security question 2FA | Toggle securityQuestion on, save | `POST /admin/superadminchoices` called with `securityQuestion: true`. Success toast displayed. |
| 1.3.4 | Set 2FA for all admins | Toggle setForAll on, save | `POST /admin/superadminchoices` called with `setForAll: true`. All admin accounts now require 2FA. |
| 1.3.5 | Disable all 2FA | Toggle both methods off, save | Settings saved. 2FA no longer required for login (unless setForAll was previously enforced). |

### 1.4 Microsoft Authenticator 2FA Setup (`/2fa/authenticator`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.4.1 | Load QR code for authenticator | Navigate to authenticator setup page | Page calls `GET /auth/{id}/{moduleType}` and displays a QR code or setup key for scanning with Microsoft Authenticator or compatible TOTP app. |
| 1.4.2 | Submit valid TOTP code | Scan QR, enter 6-digit code from authenticator app, submit | `POST /auth/createsecretemessage` is called with the secret. Success toast displayed. User redirected to dashboard or 2FA confirmation page. |
| 1.4.3 | Submit invalid TOTP code | Enter an incorrect code, submit | Error toast "error in creating secret message" or server message displayed. User remains on page. |

### 1.5 Security Question 2FA Setup (`/2fa/security-question`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.5.1 | Set security question and answer | Select a question, enter an answer, submit | `POST /auth/createsecretemessage` called with `authQuestion` data. Success toast displayed. |
| 1.5.2 | Submit empty answer | Leave answer blank, submit | Validation prevents submission. Error message displayed. |

### 1.6 2FA Login -- Security Question (`/SA/2fa-question/login`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.6.1 | Correct answer to security question | Enter the correct answer, submit | `POST /auth/verifysecretmessage` succeeds. User receives access token and is redirected to dashboard. |
| 1.6.2 | Incorrect answer | Enter a wrong answer, submit | Error toast displayed. User remains on 2FA login page. |

### 1.7 2FA Login -- Authenticator (`/SA/2fa-authentication/login`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.7.1 | Correct TOTP code | Enter valid 6-digit code from authenticator app, submit | `POST /auth/verify` succeeds with userId and token. Access/refresh tokens stored. User redirected to dashboard. |
| 1.7.2 | Expired TOTP code | Enter a code that has expired (older than 30 seconds), submit | Verification fails. Error toast displayed. |
| 1.7.3 | Invalid TOTP code | Enter random digits, submit | Error toast "error in 2FA verify" or server message. User stays on page. |

### 1.8 Forgot Password Flow

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.8.1 | Request password reset (`/forgot-password`) | Enter registered email, submit | `GET /admin/forgotpassword/{email}` called. User redirected to `/password-reset-confirmation`. |
| 1.8.2 | Request reset with unregistered email | Enter non-existent email, submit | Error toast "Forget Password Email failed" or server message. User remains on page. |
| 1.8.3 | Confirmation page displays (`/password-reset-confirmation`) | Navigate after successful reset request | Page shows confirmation message instructing user to check their email. |
| 1.8.4 | Reset password via link (`/SA/reset-password/:userId`) | Click link from email, arrive at reset form | Form loads with userId from URL params. Two password fields (new + confirm) displayed. |
| 1.8.5 | Submit new password | Enter matching new passwords, submit | `PATCH /admin/setpassword` called with id and password. On success, redirected to `/password-reset-successful`. |
| 1.8.6 | Submit mismatched passwords | Enter different passwords in the two fields, submit | Validation error displayed. Form does not submit. |
| 1.8.7 | Password reset success page (`/password-reset-successful`) | Redirected after successful reset | Success message displayed. Link or button to navigate back to login page. |
| 1.8.8 | Password reset failure page (`/password-reset-failed`) | Reset fails due to expired/invalid token | Failure message displayed. Link to request a new reset. |

### 1.9 Admin Onboarding (`/admin/onboarding/:email/:userId`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.9.1 | Load onboarding page | Navigate with valid email and userId params | Form loads showing the admin's email (read-only). Password field and confirm password field displayed. |
| 1.9.2 | Set initial password | Enter valid password and confirm, submit | `PATCH /admin/setpassword` called with id and password. Success toast. User redirected to login page. |
| 1.9.3 | Password validation | Enter a password that does not meet requirements | Inline validation error. Form does not submit. |
| 1.9.4 | Invalid userId in URL | Navigate with a non-existent userId | `AdminVerifyToken` or initial load fails. Error message displayed. |

### 1.10 Administrative Password (`/SA/administrative-password`)

A standalone onboarding step reached from `/SA/change-password`, kept separate from the 2FA setup flow so that changing the 2FA type never re-triggers it.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.10.1 | Reached from change password | Complete the form at `/SA/change-password` | User is redirected to `/SA/administrative-password`, not to `/SA/2fa-settings`. |
| 1.10.2 | Successful administrative password set | Enter the correct old administrator password, a new password of 12+ characters, and a matching confirmation, submit | `SuperAdministrativePassword` is called with `id`, `oldAdministratorPassword`, and `newAdministratorPassword`. Success toast "Administrator password set successfully!" displayed. |
| 1.10.3 | New password below 12 characters | Enter an 11-character new password, submit | Validation error "New password must be at least 12 characters". Form does not submit. Note this is stricter than the shared 8-character policy used elsewhere. |
| 1.10.4 | Confirmation below 12 characters | Enter a valid 12+ character new password but an 11-character confirmation | The confirm field raises its own length error, not only a "must match" error -- it is held to the same rule as the password it confirms. |
| 1.10.5 | Mismatched confirmation | Enter a valid new password and a different, also-valid confirmation | Validation error "Passwords must match". Form does not submit. |
| 1.10.6 | Missing old password | Leave the old administrator password blank, submit | Validation error "Password is required". |
| 1.10.7 | Wrong old password | Enter an incorrect old administrator password, submit | Server error surfaced. Password is not changed. |
| 1.10.8 | Not re-triggered by a 2FA change | Complete this step, then change the 2FA method and log in again | The administrative password step is not shown again. |
| 1.10.9 | Strength checklist states the real minimum | Start typing in the New Administrator Password field | A strength checklist appears and its first rule reads **"At least 12 characters"**, not 8. |
| 1.10.10 | Checklist agrees with the schema | Enter an 11-character password satisfying every other rule | The length rule shows as unmet and the meter does **not** read Strong. Submitting is rejected with the same 12-character message. The checklist and the schema never disagree. |
| 1.10.11 | Full policy enforced, not length alone | Enter a 12+ character password missing an uppercase letter, then one missing a digit, then one missing a special character | Each is rejected. The screen enforces uppercase, lowercase, digit, and special character in addition to the 12-character minimum. |
| 1.10.12 | Meter reaches Strong only at the real threshold | Enter a password satisfying all five rules at 12+ characters | All five rules show as met and the meter reads Strong. |

### 1.11 Admin 2FA Choice (`/2fa/choice`)

The admin self-choice screen, shown when the organization has not set 2FA for all admins and the admin has no method yet.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.11.1 | Page reached under the right conditions | Log in with `setForAll: false` as an admin with no `authType` | User lands on `/2fa/choice`. |
| 1.11.2 | Default selection | Load the page | The `qrCode` (Authenticator) option is pre-selected. |
| 1.11.3 | Choose authenticator | Select the authenticator option, submit | User is navigated to `/2fa/authenticator`. |
| 1.11.4 | Choose security question | Select the security question option, submit | User is navigated to `/2fa/security-question`. |
| 1.11.5 | No "set for all" option | Inspect the page | There is no "enable for all admins" toggle -- unlike `/SA/2fa-settings`. Completing setup sets only this admin's own `authType` and `auth2FADone`, with no global write. |
| 1.11.6 | Submit with no method selected | Clear the selection if possible and submit | Validation error "Please select a 2FA method". Form does not submit. |
| 1.11.7 | Invalid method value rejected | Attempt to submit a value other than `qrCode` or `securityQuestion` | Validation rejects it with "Invalid 2FA method". |

---

## 2. Tenant Management -- Tenant List

**Route:** `/tenants/tenant-list`
**Component:** TenantList
**APIs:** `TenantApis.getAllTenants`, `TenantApis.GetTenantCount`, `TenantApis.GetManagementOverview`, `TenantApis.GetActiveTenants`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1 | Load tenant list | Navigate to `/tenants/tenant-list` | Page loads. API calls `getAllTenants` and `GetTenantCount`. Table displays all tenants with columns for name, company, email, status (active/inactive), plan, and creation date. Tenant count metrics shown. |
| 2.2 | View management overview metrics | Observe top-of-page metrics area | `GetManagementOverview` data displayed: total tenants, active tenants, inactive tenants, new tenants (time period). |
| 2.3 | Search tenants | Type a tenant name in the search field | Table filters in real-time to show only tenants matching the search query. |
| 2.4 | Filter tenants by status | Use the table filter to select "Active" or "Inactive" | Only tenants matching the selected status are displayed. |
| 2.5 | Sort tenants by column | Click on a column header (e.g., company name) | Table rows reorder in ascending order. Clicking again toggles to descending. |
| 2.6 | Paginate tenant list | With more tenants than the page size, click "Next" or a page number | Table updates to show the next page of tenants. Pagination component shows correct page info. |
| 2.7 | Navigate to tenant overview | Click on a tenant row or "View" action | Browser navigates to `/tenants/tenant-lists/overview/:tenantId`. TenantSingleAccOverview page loads. |
| 2.8 | Table filter modal | Click the filter icon on the table | TableFilterModal opens. User can select filter criteria (status, plan type, date range). Applying filters updates the table. |
| 2.9 | Date filter modal | Click date filter option | TableFilterDateModal opens. User selects a date range. Applying the filter shows tenants created within that range. |
| 2.10 | Export tenant list | Click export action button | ExportPrintActions component triggers. Data is exported as CSV or PDF (whichever is implemented). File downloads successfully with correct data. |
| 2.11 | Print tenant list | Click print action button | Browser print dialog opens with the table formatted for printing. |
| 2.12 | Empty state | Navigate with no tenants in the system | Table shows an empty state message. No errors in console. Metrics show zero counts. |

---

## 3. Tenant Management -- Pipeline (Prospect Tenants)

**Route:** `/tenants/pipeline`
**Component:** TenantPipeline (Kanban Board)
**APIs:** `TenantApis.GetPipelineByModule`, `TenantApis.GetPipelineStage`, `TenantApis.GetPipelineItem`, `TenantApis.CreatePipelineStage`, `TenantApis.CreateCandidate`, etc.

### 3.1 Pipeline Board

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1.1 | Load pipeline board | Navigate to `/tenants/pipeline` | `GetPipelineByModule` called with module "TENANT". Board renders with columns for each pipeline stage. Each column shows its stage name, color code, and prospect cards. |
| 3.1.2 | Empty pipeline | Navigate with no stages created | EmptyState component displayed with a prompt to create the first pipeline stage. |
| 3.1.3 | Drag and drop prospect between stages | Drag a prospect card from one column to another | `UpdatePipelineItemActivity` called with the prospect's id and new `pipelineStageId`. Prospect card moves to the target column. Toast confirms success. |
| 3.1.4 | Reorder pipeline stages | Drag a column to a new position | `ReorderPipelineStage` called with id and new order. Board re-renders with updated column order. |
| 3.1.5 | View prospect count per stage | Observe each column header | Each column displays the count of prospects in that stage. |

### 3.2 Add Prospect (AddProspectModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.2.1 | Open add prospect modal | Click "Add Prospect" button | AddProspectModal opens with fields: fullName, email, phoneNumber, companyName, contactPerson, companySize, organizationType, location, leadSource, subdomain, pipelineStageId (dropdown), assignToAdmin (dropdown). |
| 3.2.2 | Create prospect with valid data | Fill all required fields, select stage and assigned admin, click Save | `CreateCandidate` API called with all fields. Modal closes. New prospect card appears in the selected stage column. Success toast displayed. |
| 3.2.3 | Create prospect with missing required fields | Leave fullName and email empty, click Save | Validation errors displayed on required fields. API is not called. |
| 3.2.4 | Create prospect with duplicate email | Enter an email that already exists in the system | API returns error. Error toast displays "Create Pipeline Stage failed" or server message. Modal remains open. |
| 3.2.5 | Create prospect with invalid email format | Enter "bademail" in email field, submit | Client-side validation rejects the input. Error message shown. |

### 3.3 Edit Prospect (EditProspectModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.3.1 | Open edit prospect modal | Click edit action on a prospect card | EditProspectModal opens pre-populated with the prospect's current data. |
| 3.3.2 | Update prospect info | Change companyName and location, click Save | `UpdateCandidate` API called with updated fields and prospect id. Modal closes. Prospect card reflects updated info. |
| 3.3.3 | Cancel edit | Click Cancel or close modal | No API call made. Prospect data unchanged. |

### 3.4 Assign/Move/Delete Prospects

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.4.1 | Assign prospect to staff (AssignCandidateModal) | Select prospect(s), open assign modal, select admin from dropdown, confirm | `ReassignCandidateToStaff` called with ids array and assignToAdmin. Success toast. Prospect's assigned admin updates. |
| 3.4.2 | Move prospect to different stage (MoveCandidateModal) | Select prospect(s), open move modal, select target stage, confirm | `UpdatePipelineItemActivity` called with ids and target pipelineStageId. Prospects move to new column. |
| 3.4.3 | Bulk move multiple prospects | Select multiple prospect checkboxes, open move modal, select stage, confirm | All selected prospects are moved. API called once with array of ids. |
| 3.4.4 | Delete prospect | Select prospect, click delete, confirm in DeleteConfirmationModal | `DeletePipelineItem` called with ids array. Prospect removed from board. Success toast. |
| 3.4.5 | Bulk delete prospects | Select multiple prospects, click delete, confirm | All selected prospects deleted in single API call. Board updates. |
| 3.4.6 | Second delete confirmation | Delete a prospect that triggers SecondDeleteConfirmationModal | Second modal appears requiring additional confirmation (e.g., type "DELETE"). After confirmation, deletion proceeds. |

### 3.5 Pipeline Stage Management

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.5.1 | Create new column (NewPipelineColumnModal) | Click "Add Column", fill name, description, select color, submit | `CreatePipelineStage` called with pipelineId, name, description, colourCode. New column appears on board. |
| 3.5.2 | Create column with custom tasks | Add tasks in the required tasks section when creating column | `CreatePipelineStage` called with requiredTasks array. Column created with task requirements. |
| 3.5.3 | Create column with required documents | Add documents in required documents section | `CreatePipelineStage` called with requiredDocuments array. Column created with document requirements. |
| 3.5.4 | Edit pipeline stage | Navigate to column-single page, edit name/description/color | `UpdatePipelineStage` called. Changes reflected on board. |
| 3.5.5 | Delete pipeline stage | Click delete on a column, confirm | `DeletePipelineStage` called with id. Column and all its prospects removed from board (or error if non-empty, depending on backend). |
| 3.5.6 | Add color code to stage | Select a color from ColorPicker when creating/editing stage | Selected hex color is sent as colourCode. Column header displays the chosen color. |

### 3.6 Prospect Panel (`/tenants/candidate-single/:pipelineStageId/:pipelineItemId`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.6.1 | View prospect detail | Click on a prospect card to navigate | ProspectPanel loads with `GetSinglePipelineItem` data. Shows prospect info, assigned admin, stage, tasks, documents. |
| 3.6.2 | Mark task as done | Click checkbox next to a required task | `UpdateStageTasksToDone` called with pipelineItemId and updated doneTasks object. Checkbox persists as checked. |
| 3.6.3 | Upload document (UploadDocumentModal) | Click upload document, select file, submit | `UpdateStageDocumentsToDone` called with pipelineItemId and document data. Document appears in the documents list. |
| 3.6.4 | Custom document (CustomDocumentModal) | Click add custom document, fill details, submit | Custom document added to the prospect's documents. API call succeeds. |
| 3.6.5 | Custom task (CustomTaskModal) | Click add custom task, fill name, submit | `UpdateStageTasks` called. Custom task added to stage requirements. |
| 3.6.6 | Edit prospect from panel | Click edit button on prospect panel | Navigates to edit route (`/tenants/candidate-single/:pipelineStageId/:pipelineItemId/edit`) or opens EditProspectModal. |

### 3.7 Manage Column (`/tenants/column-single/:pipelineStageId`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.7.1 | View column details | Navigate to manage column page | `GetSinglePipelineStage` called. Shows stage name, description, color, required tasks, required documents. |
| 3.7.2 | Update column tasks | Add/remove required tasks, save | `UpdateStageTasks` called with updated requiredTasks array. Changes persist. |
| 3.7.3 | Update column documents | Add/remove required documents, save | `UpdateStageDocuments` called with updated requiredDocuments array. Changes persist. |
| 3.7.4 | Delete column from manage page | Click delete, confirm | `DeletePipelineStage` called. User redirected back to pipeline board. |

---

## 4. Tenant Single -- Detail Views

### 4.1 Account Overview (`/tenants/tenant-lists/overview/:tenantId`)

**Component:** TenantSingleAccOverview
**APIs:** `TenantApis.GetSingleTenant`, `TenantApis.UpdateTenantInfo`, `TenantApis.DeactivateTenant`, `TenantApis.ChangeAdminPassword`, `TenantApis.ChangeTenantEmail`, `TenantApis.ChangeTenantPhoneNumber`, `TenantApis.ChangeAccountOfficer`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1.1 | Load tenant overview | Navigate with valid tenantId | `GetSingleTenant` called. Page displays tenant name, company, email, phone, subdomain, plan, status (active/inactive), account officer, creation date. |
| 4.1.2 | Edit tenant information | Click edit, modify fields, save | `UpdateTenantInfo` called with payload. Success toast. Updated info reflected on page. |
| 4.1.3 | Deactivate tenant (ToggleActiveModal) | Click deactivate, enter admin password, reason, details, confirm | `DeactivateTenant` called with id, active=false, deactivatedById, password, reason, details. Tenant status changes to inactive. Success toast. |
| 4.1.4 | Reactivate tenant | Click activate on an inactive tenant, confirm | `DeactivateTenant` called with active=true. Tenant status changes to active. |
| 4.1.5 | Deactivate with wrong admin password | Enter incorrect password in deactivation modal | API returns error. Error toast displayed. Tenant remains active. |
| 4.1.6 | Change admin password | Click "Change Admin Password" action | `ChangeAdminPassword` called with tenantId. Success toast. Password reset email sent to tenant. |
| 4.1.7 | Change tenant email | Click change email, enter new email, submit | `ChangeTenantEmail` called with tenantId and new email. Email field updates. |
| 4.1.8 | Change email to invalid format | Enter "invalid" as email, submit | Validation prevents submission. Error displayed. |
| 4.1.9 | Change tenant phone number | Click change phone, enter new number, submit | `ChangeTenantPhoneNumber` called with tenantId and phoneNumber. Phone field updates. |
| 4.1.10 | Change account officer | Select different admin from dropdown, confirm | `ChangeAccountOfficer` called with tenantId and adminId. Account officer field updates on page. |
| 4.1.11 | Navigate to sub-sections | Click Features, Billing, Issues, Logs, Security, Usage Statistics tabs/links | Browser navigates to the corresponding route (e.g., `/tenants/tenant-lists/features/:tenantId`). |
| 4.1.12 | Invalid tenantId in URL | Navigate with non-existent tenantId | Error handling: error message displayed or redirect to tenant list. No crash. |

### 4.2 Tenant Features (`/tenants/tenant-lists/features/:tenantId`)

**Component:** TenantSingleFeature
**APIs:** `TenantApis.GetTenantFeatures`, `TenantApis.GetTenantFeatureActivityLogs`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.2.1 | View tenant features | Navigate to features page | `GetTenantFeatures` called with tenantId (fetches subscription data). Displays list of features grouped by their plan, showing feature name, active/inactive status. |
| 4.2.2 | View feature activity logs | Scroll to or click activity logs section | `GetTenantFeatureActivityLogs` called with tenantId, page, limit. Logs displayed with timestamps, actions, and admin who made changes. |
| 4.2.3 | Paginate activity logs | Click next page on logs | API called with incremented page. New log entries displayed. |
| 4.2.4 | Tenant with no features | View features for a tenant with no active subscription | Empty state message: "No features found" or equivalent. No errors. |

### 4.3 Tenant Billing (`/tenants/tenant-lists/billing/:tenantId`)

**Component:** TenantSingleBilling
**APIs:** `TenantApis.GetTenantInvoices`, `TenantApis.GetTenantInvoicesByStatus`, `TenantApis.GetTenantPayments`, `TenantApis.GetTenantPaymentsByStatus`, `TenantApis.GetTenantPaymentMethods`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.3.1 | View all invoices | Navigate to billing page | `GetTenantInvoices` called. Table displays invoice ID, amount, status (paid/unpaid/overdue), due date, created date. |
| 4.3.2 | Filter invoices by status | Click on a status filter tab (e.g., "Paid", "Unpaid") | `GetTenantInvoicesByStatus` called with status. Table updates to show only matching invoices. |
| 4.3.3 | View all payments | Switch to payments tab/view | `GetTenantPayments` called. Table shows payment ID, amount, date, method, status. |
| 4.3.4 | Filter payments by status | Select a payment status filter | `GetTenantPaymentsByStatus` called with status. Table filters. |
| 4.3.5 | View payment methods | Switch to payment methods tab | `GetTenantPaymentMethods` called. Displays saved payment methods (card type, last four digits, holder name). |
| 4.3.6 | Generate payment link (GeneratePaymentLinkModal) | Click "Generate Payment Link", select plan, billing frequency, quantity, submit | `GeneratePaymentLink` API called with tenantId, planId, billingFrequency, quantity. Modal displays the generated link. Link can be copied. |
| 4.3.7 | Generate link with missing fields | Leave planId empty, submit | Validation prevents submission. Error displayed. |
| 4.3.8 | Tenant with no billing history | View billing for new tenant | Empty state for invoices and payments. Payment methods section empty. |

### 4.4 Tenant Issues (`/tenants/tenant-lists/issues/:tenantId`)

**Component:** TenantSingleIssueManagement
**APIs:** `IssueApi.GetTenantManagementOverview`, `IssueApi.GetTenantIssuesByStatus`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.4.1 | View tenant issues overview | Navigate to issues page | `GetTenantManagementOverview` called with tenantId. Displays issue metrics: total, open, in-progress, resolved counts. |
| 4.4.2 | Filter issues by status | Click on a status card (e.g., "Open") | `GetTenantIssuesByStatus` called with tenantId and status. Issue table updates. |
| 4.4.3 | Navigate to issue detail | Click on an issue row | Issue detail view (ViewIssue) loads for the selected issue. |

### 4.5 Tenant User Logs (`/tenants/tenant-lists/logs/:tenantId`)

**Component:** TenantSingleUserLogs
**APIs:** `TenantApis.GetTenantActivityLog`, `TenantApis.GetTenantServerRequest`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.5.1 | View activity logs | Navigate to logs page | `GetTenantActivityLog` called with tenantId, page=1, limit. Table displays logs with timestamp, action, user, details. |
| 4.5.2 | Paginate activity logs | Click next page | API called with page=2. New log entries displayed. |
| 4.5.3 | View server requests | Switch to server requests tab | `GetTenantServerRequest` called with tenantId, page, limit. Displays request logs with endpoint, method, status code, timestamp. |
| 4.5.4 | Paginate server requests | Click next page | API called with incremented page. New entries shown. |

### 4.6 Tenant Security Settings (`/tenants/tenant-lists/security/:tenantId`)

**Component:** TenantSingleSecuritySettings

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.6.1 | View tenant security settings | Navigate to security page | Displays current security configuration for the tenant (2FA settings, password policies, session settings). |
| 4.6.2 | Modify security settings | Change a setting (e.g., enforce 2FA), save | API call to update tenant security. Success toast. Changes persist on reload. |

### 4.7 Tenant Usage Statistics (`/tenants/tenant-lists/usage-statistics/:tenantId`)

**Component:** TenantListUsageStatistics
**APIs:** `TenantApis.GetTenantUsageStatistics`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.7.1 | View usage statistics | Navigate to usage stats page | `GetTenantUsageStatistics` called with tenantId. Displays storage usage, active users, API calls, client count, staff count metrics. |
| 4.7.2 | Data visualization | Observe charts on page | Usage data rendered in charts (gauges, bar charts) without rendering errors. |

---

## 5. Billing & Payments -- Plans & Pricing

**Route:** `/billing-payments/plans-pricing`
**Component:** PlansAndPayment
**APIs:** `BillingApis.GetAllPlans`, `BillingApis.CreateBillingPlan`, `BillingApis.UpdateBillingPlan`, `BillingApis.DeleteBillingPlan`, `BillingApis.TogglePlanActivity`, `BillingApis.DuplicateBillingPlan`

### 5.1 Plan Listing

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1.1 | Load all plans | Navigate to plans page | `GetAllPlans` called. PlanCard components render for each plan showing: name, planType, pricePerMonth, pricePerYear, colour code, active status, feature count. |
| 5.1.2 | Filter by plan type | Select a plan type tab (e.g., "STANDARD", "ENTERPRISE") | `GetPlanByPlanType` called. Only plans of selected type displayed. |
| 5.1.3 | Empty state | No plans exist | Empty state message displayed with "Create your first plan" prompt. |

### 5.2 Create Plan (PricingModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.2.1 | Open create plan modal | Click "Create Plan" | PricingModal opens with fields: name, description, planType dropdown, colourCode (ColorPicker), pricePerMonth (price + currency), pricePerYear (price + currency), forClient, forStaff, forStorage, extraFeaturesEnabled toggle, features multi-select, extraFeatures, extraFeaturesWithPrice. |
| 5.2.2 | Create plan with all fields | Fill all fields with valid data, submit | `CreateBillingPlan` called with full payload. Modal closes. New PlanCard appears. Success toast. |
| 5.2.3 | Create plan with minimum required fields | Fill only name, planType, at least one price, submit | API call succeeds. Plan created with defaults for optional fields (features=[], colourCode defaults). |
| 5.2.4 | Create plan with zero prices | Enter 0 for both monthly and yearly price, submit | Plan created with price 0 (free tier). API accepts `price: 0`. |
| 5.2.5 | Duplicate plan name | Enter a name that already exists | API returns error. Error toast displayed. Modal remains open. |
| 5.2.6 | Add extra features with prices | Enable extraFeaturesEnabled, add features with individual prices | `extraFeaturesWithPrice` array populated in API call. Plan created with extra features listed separately. |

### 5.3 Edit Plan (EditPricingModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.3.1 | Open edit modal | Click edit action on a plan card | EditPricingModal opens pre-populated with plan data from `GetSinglePlan`. |
| 5.3.2 | Update plan price | Change pricePerMonth to new value, save | `UpdateBillingPlan` called with updated payload including id. Success toast. PlanCard reflects new price. |
| 5.3.3 | Update plan features | Add/remove features from the plan, save | API called with updated features array. Changes persist. |
| 5.3.4 | Cancel edit | Click cancel | Modal closes. No API call. No changes. |

### 5.4 Plan Actions

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.4.1 | Activate plan | Click activate on an inactive plan, enter administrator password, confirm | `TogglePlanActivity` called with id, active=true, administratorPassword. Plan card shows active status. |
| 5.4.2 | Deactivate plan | Click deactivate on an active plan, enter admin password, confirm | `TogglePlanActivity` called with active=false. Plan card shows inactive status. |
| 5.4.3 | Activate/deactivate with wrong password | Enter incorrect administrator password | API returns error. Error toast. Plan status unchanged. |
| 5.4.4 | Delete plan (DeletePlanModal) | Click delete, enter administrator password, confirm | `DeleteBillingPlan` called with id and administratorPassword. Plan removed from list. Success toast. |
| 5.4.5 | Delete plan with wrong password | Enter incorrect password in delete modal | API error. Plan not deleted. Error toast. |
| 5.4.6 | Duplicate plan | Click duplicate action on a plan | `DuplicateBillingPlan` called with planId. New plan appears in list with "(Copy)" appended to name or similar. |
| 5.4.7 | Assign plan to tenant (AssignPlanModal) | Open assign modal, select tenant, confirm | Subscription created linking tenant to plan. Success toast. |
| 5.4.8 | Change plan for tenant (ChangePlanModal) | Open change plan modal, select new plan, confirm | Tenant's subscription updated to new plan. Old subscription handled (cancelled/migrated). |

### 5.5 Subscriber List (`/plans/subscribers/:planId`)

**Component:** SubscriberList

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.5.1 | View subscribers for a plan | Navigate with valid planId | `GetSubscriptionByPlan` or `GetSubscriptionByPlanType` called. Table lists all tenants subscribed to this plan with tenant name, subscription status, start date, end date. |
| 5.5.2 | Empty subscriber list | View subscribers for plan with no subscriptions | Empty state message. No errors. |
| 5.5.3 | Navigate to tenant from subscriber list | Click on a subscriber row | Navigates to tenant overview (`/tenants/tenant-lists/overview/:tenantId`). |

---

## 6. Billing & Payments -- Invoice & Payment Manager

**Route:** `/billing-payments/invoice-payments`
**Component:** BillingManager
**APIs:** `InvoiceApi.GetBillingTotalMetric`, `InvoiceApi.GetBillingDueMetric`, `InvoiceApi.GetInvoiceByAllAndStatus`, `InvoiceApi.GetPaymentByAllAndStatus`, `InvoiceApi.GetCountForInvoice`, `InvoiceApi.GetCountForPayment`

### 6.1 Invoices

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1.1 | View billing metrics | Navigate to invoice-payments page | `GetBillingTotalMetric` and `GetBillingDueMetric` called with date range (from/to). Displays total billed, total due, total paid amounts. |
| 6.1.2 | View invoice status counts | Observe status count cards | `GetCountForInvoice` called. Cards show count for each status: paid, unpaid, overdue, cancelled, etc. |
| 6.1.3 | View all invoices | Default view or "All" tab | `GetInvoiceByAllAndStatus` called with status "all" (or equivalent). Table shows invoice ID, tenant, amount, status, due date. |
| 6.1.4 | Filter invoices by status | Click on a status tab (Paid, Unpaid, Overdue) | `GetInvoiceByAllAndStatus` called with selected status. Table filters to matching invoices. |
| 6.1.5 | View single invoice detail | Click on an invoice row | `GetInvoiceById` called. SubscriptionInvoice component renders showing full invoice details: line items, amounts, tenant info, dates. |

### 6.2 Payments

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.2.1 | View payment status counts | Observe payment count cards | `GetCountForPayment` called. Displays counts per status: successful, failed, pending, refunded. |
| 6.2.2 | View all payments | Select payments tab | `GetPaymentByAllAndStatus` called. Table displays payment ID, tenant, amount, method, status, date. |
| 6.2.3 | Filter payments by status | Click status filter | API called with selected status. Table updates. |
| 6.2.4 | View single payment detail | Click on a payment row | `GetPaymentById` called. Payment detail displayed with transaction ID, reference, amount, gateway, card info. |

---

## 7. Billing & Payments -- Subscription Manager

**Route:** `/billing-payments/subscription-manager`
**Component:** SubscriptionManager
**APIs:** `SubcriptionApis.GetSubscriptionByStatus`, `SubcriptionApis.GetCountForSubscription`, `SubcriptionApis.CancelSubscriptionNow`, `SubcriptionApis.CancelSubscriptionLater`, `SubcriptionApis.PauseSubscriptionNow`, `SubcriptionApis.PauseSubscriptionUntil`, `SubcriptionApis.PauseSubscriptionSchedule`, `SubcriptionApis.ResumeSubscriptionNow`, `SubcriptionApis.ResumeSubscriptionLater`

### 7.1 Subscription Listing

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.1.1 | View subscription counts | Navigate to subscription manager | `GetCountForSubscription` called. Status cards display counts: active, paused, cancelled, expired. |
| 7.1.2 | View subscriptions by status | Click on a status card (e.g., "Active") | `GetSubscriptionByStatus` called with status. Table shows subscription ID, tenant, plan name, status, start date, end date, auto-renew flag. |
| 7.1.3 | View all subscriptions | Select "All" tab | Full subscription list displayed. |

### 7.2 Cancel Subscription (CancelSubscriptionModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.2.1 | Cancel subscription immediately | Select subscription, open cancel modal, choose "Cancel Now", enter reason and comment, toggle mail notification, confirm | `CancelSubscriptionNow` called with status, id, adminId, comment, reason, mailNotification. Subscription status changes to "cancelled". autoRenew set to false. |
| 7.2.2 | Cancel subscription at end of period | Choose "Cancel at end of billing period", enter reason, confirm | `CancelSubscriptionLater` called. Subscription remains active until end date, then cancels. Status shows "pending cancellation". |
| 7.2.3 | Bulk cancel subscriptions | Select multiple subscriptions, open cancel modal | `normalizeSubscriptionIds` processes array. All selected subscriptions cancelled in single API call. |
| 7.2.4 | Cancel with mail notification enabled | Toggle mail notification ON before confirming | API called with `mailNotification: true`. Tenant receives cancellation email. |
| 7.2.5 | Cancel with empty reason | Leave reason and comment blank, confirm | Validation may allow or block (depends on UI). If allowed, API called with empty strings. |

### 7.3 Pause Subscription (PauseSubscriptionModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.3.1 | Pause subscription immediately | Select subscription, open pause modal, choose "Pause Now", enter reason, confirm | `PauseSubscriptionNow` called. Subscription status changes to "paused". Tenant's access is suspended. |
| 7.3.2 | Pause until specific date | Choose "Pause Until", select a future date, confirm | `PauseSubscriptionUntil` called with resumeShedule date. Subscription pauses and will auto-resume on specified date. |
| 7.3.3 | Schedule pause for future date | Choose "Schedule Pause", select future pause date, confirm | `PauseSubscriptionSchedule` called with pauseSchedule date. Subscription will pause on the scheduled date. |
| 7.3.4 | Pause with past date | Select a date in the past for "Pause Until" | Validation rejects the date. Error message: date must be in the future. |
| 7.3.5 | Bulk pause subscriptions | Select multiple subscriptions, pause | All selected subscriptions paused via single API call. |

### 7.4 Resume Subscription (ResumeSubscriptionModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.4.1 | Resume subscription immediately | Select paused subscription, open resume modal, choose "Resume Now", confirm | `ResumeSubscriptionNow` called. Subscription status changes to "active". Tenant's access is restored. |
| 7.4.2 | Schedule resume for later | Choose "Resume Later", select future date, confirm | `ResumeSubscriptionLater` called with resumeShedule date. Subscription will resume on specified date. |
| 7.4.3 | Resume an active subscription | Attempt to resume a subscription that is already active | UI should prevent this action (resume button disabled for active subscriptions) or API returns error. |

---

## 8. Billing & Payments -- Auto-Billing Settings

**Route:** `/billing-payments/auto-billing-settings`
**Component:** AutoBilling
**APIs:** `AutoBillingInvoiceAPIs.*`, `AutoBillingPandAApis.*`

### 8.1 Invoice Management Settings

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.1.1 | Load invoice management settings | Navigate to auto-billing page | `GetInvoiceManagementAllField` called. Displays all toggle and field values: onPlanPurchase, daysBeforeDueDate, onDueDate, markOverDue, unpaidReminderTimesBefore, attachInvoiceToReminder. |
| 8.1.2 | Toggle "On Plan Purchase" | Toggle onPlanPurchase switch | `UpdatePlanPurchaseToggle` called with id and new boolean value. Toggle persists on page reload. |
| 8.1.3 | Set days before due date | Enter number in daysBeforeDueDate field, save | `UpdateDayBeforeDueNumber` called. Value persists. |
| 8.1.4 | Configure upcoming invoice email | Edit header and body text, save | `UpcomingInvoiceEmail` called with id, upcomingInvoiceHeader, upcomingInvoiceBody. Success toast. |
| 8.1.5 | Toggle "On Due Date" | Toggle onDueDate switch | `UpdateOnDueDateToggle` called. Invoice generated/emailed on due date if enabled. |
| 8.1.6 | Configure due invoice email | Edit due invoice email header and body, save | `DueInvoiceEmail` called. Success toast. |
| 8.1.7 | Set mark overdue count | Enter number of days after due date to mark as overdue | `MarkOverDueCount` called with markOverDue value. |
| 8.1.8 | Set unpaid reminder times | Enter number of reminders before overdue | `ReminderTimesBefore` called with unpaidReminderTimesBefore. |
| 8.1.9 | Toggle attach invoice to reminder | Toggle attachInvoiceToReminder | `UpdateAttachToReminderToggle` called. When enabled, invoice PDF attached to reminder emails. |
| 8.1.10 | Configure reminder email | Edit reminder email template, save | `ReminderEmail` called with reminderEmail content. Success toast. |

### 8.2 Payment & Access Management Settings

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.2.1 | Load payment access settings | Observe payment management section | `GetPaymentAccessManagementAllField` called. Displays: chargeOnDueDate, chargeLastUsedFirst, chargeAlternative, retryBefore, retryAfter, notifyTenant, cancelAfter, manualCancel, emailAfterAttempts, sendOnSubscriptionCancel, suspensionAction. |
| 8.2.2 | Toggle charge on due date | Toggle chargeOnDueDate | `UpdateChargeOnDueDateToggle` called. When enabled, saved payment method is charged automatically on due date. |
| 8.2.3 | Toggle charge last used first | Toggle chargeLastUsedFirst | `UpdateChargeLastUsedFirstToggle` called. Payment attempts use most recently used method first. |
| 8.2.4 | Toggle charge alternative | Toggle chargeAlternative | `UpdateChargeAlternativeToggle` called. If primary payment method fails, alternative is charged. |
| 8.2.5 | Set retry before count | Enter number of retry attempts before due date | `UpdateRetryBeforeCount` called with retryBefore value. |
| 8.2.6 | Set retry after count | Enter number of retry attempts after due date | `UpdateRetryAfterCount` called with retryAfter value. |
| 8.2.7 | Toggle notify tenant | Toggle notifyTenant | `UpdateNotifyTenantToggle` called. Tenant receives notification emails about payment attempts. |
| 8.2.8 | Configure notification email | Edit notification email header and body, save | `NotificationEmail` called with notificationEmailHeader and notificationEmailBody. |
| 8.2.9 | Set cancel after count | Enter number of failed attempts before auto-cancel | `UpdateCancelAfter` called with cancelAfter value. |
| 8.2.10 | Toggle manual cancel | Toggle manualCancel | `UpdateManualCancel` called. When enabled, subscriptions require manual cancellation instead of auto-cancel. |
| 8.2.11 | Set email after attempts count | Enter count | `UpdateEmailAfterAttempts` called. Warning email sent after this many failed attempts. |
| 8.2.12 | Configure warning email | Edit warning mail header and body, save | `WarningEmail` called with warningMailHeader and warningMailBody. |
| 8.2.13 | Toggle send on subscription cancel | Toggle sendOnSubscriptionCancel | `SendOnSubCancel` called. Cancellation confirmation email sent when subscription is cancelled. |
| 8.2.14 | Configure cancel email | Edit cancel email header and body, save | `CancelEmail` called with cancelMailHeader and cancelMailBody. |
| 8.2.15 | Configure suspension action | Select suspension action (e.g., "Suspend Access"), enter error message, save | `UpdateSuspensionAction` called with suspensionAction and errorMessage. Suspended tenants see the configured error message. |

---

## 9. Billing & Payments -- Reports

**Route:** `/billing-payments/Reports`
**Component:** BillingReports
**APIs:** `InvoiceApi.GetReportInvoices`, `InvoiceApi.GetReportPayments`, `InvoiceApi.GetDeactivationLogs`, `InvoiceApi.GetActivationLogs`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 9.1 | View invoice report | Navigate to reports page, select invoices tab | `GetReportInvoices` called with page=1, pageSize=100. BillingReportTable renders with invoice data. |
| 9.2 | Paginate invoice report | Click next page | API called with incremented page. New data displayed. |
| 9.3 | View payment report | Select payments tab | `GetReportPayments` called. Table shows payment transactions. |
| 9.4 | View deactivation logs | Select deactivation logs tab | `GetDeactivationLogs` called. Table shows tenant deactivation history: tenant name, reason, details, deactivated by, date. |
| 9.5 | View activation logs | Select activation logs tab | `GetActivationLogs` called. Table shows tenant activation history. |
| 9.6 | Export report | Click export button | Report data exported as CSV/PDF. |
| 9.7 | Print report | Click print button | Print dialog opens with formatted report. |

---

## 10. Payment Page (Stripe & PayPal)

**Route:** `/payment/:token`
**Component:** PaymentPage, StripeForm, PayPalForm
**APIs:** `InvoiceApi.ValidatePaymentToken`, `InvoiceApi.CreateStripePaymentIntent`, `InvoiceApi.ConfirmPayment`, `InvoiceApi.RecordPayment`

Card payments run through a real Stripe PaymentIntent. The browser never asserts that a payment succeeded; the server re-reads the intent and performs the recording, subscription creation, and tenant activation. **PayPal is currently disabled** behind `PAYPAL_ENABLED = false`.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 10.1 | Validate payment token | Navigate to `/payment/:token` | `ValidatePaymentToken` called with token from URL. On success, payment form loads showing invoice details (amount, plan, tenant info). |
| 10.2 | Invalid payment token | Navigate with expired/invalid token | `ValidatePaymentToken` throws error. Error message "Invalid or expired payment token" displayed. Payment form not shown. |
| 10.3 | Pay with Stripe (credit card) | Select Stripe payment option, enter card number, expiry, CVC, cardholder name, submit | `POST /billing/stripe/create-payment-intent` returns a client secret; `stripe.confirmCardPayment` performs the charge; on `succeeded`, `POST /billing/stripe/confirm-payment` is called with `{ token, paymentIntentId }`. Success confirmation page shown. |
| 10.4 | The charge appears in Stripe | Complete a successful card payment, then open the Stripe dashboard | A real PaymentIntent (`pi_…`) exists for the correct amount. The receipt's Transaction ID matches that `pi_…` identifier and resolves in the dashboard. |
| 10.5 | Amount cannot be tampered with client-side | Intercept the request and attempt to alter the charge amount from the browser | The amount is derived server-side from the invoice behind the token. The attempted change has no effect on what is charged. |
| 10.6 | Intent is created before the card is touched | Use a payment link for an invoice that is already paid, or a dead link | The create-intent call fails first and no card authorization is attempted. |
| 10.7 | 3-D Secure challenge | Use a Stripe test card that requires authentication (`requires_action`) | `confirmCardPayment` presents the 3-D Secure challenge. On successful authentication the payment completes; on failure it does not. |
| 10.8 | Non-succeeded status is never reported as success | Force an intent that ends in any status other than `succeeded` | Error "Payment was not completed (status: ...). You have not been charged." No confirm call is made, no invoice is marked paid, and no tenant is activated. |
| 10.9 | Stripe payment failure | Enter a declined card number, submit | Stripe returns an error and the message is shown inline and as a toast. **`RecordPayment` is not called from the browser** -- Stripe failures are recorded server-side by the `payment_intent.payment_failed` webhook. |
| 10.10 | Cardholder name required | Leave the cardholder name blank, submit | "Cardholder name is required." No intent is created and no charge is attempted. |
| 10.11 | Card brand and last 4 on the receipt | Complete a successful payment | The receipt shows the correct card brand (capitalized) and last four digits, taken from the tokenized PaymentMethod. |
| 10.12 | PayPal is not offered | Load the payment page | The PayPal method tile, its "Popular" badge, and the PayPal form are all absent. Only the card option is selectable. |
| 10.13 | Legacy PayPal record endpoint is retired | Attempt to record a payment through `/billing/pay-payment-link` | The endpoint answers **410 Gone**. This is why PayPal is disabled: a payer would be charged and never activated, with no webhook to reconcile it. |
| 10.14 | Test-card hint hidden on live keys | Configure a live publishable key (not starting with `pk_test`) and load the page | The 4242 test-card hint is not rendered. With a `pk_test` key it is shown. |
| 10.15 | Payment for specific invoice | Token resolves to a specific invoiceId and planId | After server-side confirmation the payment is recorded against the correct invoiceId, planId, billingCycle, and endDate. Invoice status updated to "paid" and the tenant activated. |
| 10.16 | Network error during payment | Lose connection during payment submission | Error handling catches the failure. User sees a network error message. No duplicate charges -- the primary button is locked for the duration of the submit. |
| 10.17 | Double-click protection | Double-click the pay button rapidly | Only one charge is attempted. The primary button locks on the first click and stays locked until the request settles. |
| 10.18 | Stripe key not configured | Unset `VITE_STRIPE_PK` and load the page | `stripePromise` is `null`; the card form does not initialize. |

---

## 11. Issue Management

**Route:** `/issues`
**Component:** IssueManagement, ViewIssue
**APIs:** `IssueApi.*`

### 11.1 Issue Dashboard

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.1.1 | Load issue dashboard | Navigate to `/issues` | Multiple API calls: `GetMetricAndStatusCount`, `GetResolutionTime`, `GetStatusPercentageAndCount`, `GetCategoryPercentageAndCount`, `GetPriorityPercentageAndCount`, `GetAssigneePercentageAndCount`, `GetDateCreatedPercentageAndCount`. Dashboard displays: total issues, status distribution, category breakdown, priority breakdown, average resolution time, assignee workload. |
| 11.1.2 | View issues by status | Click on a status card (Open, In Progress, Resolved, Closed) | `GetIssuesByStatus` called with selected status. Table displays filtered issues. |
| 11.1.3 | View all issues | Select "All" tab | Full issue list displayed in table with columns: title, tenant, category, priority, status, assignee, created date. |
| 11.1.4 | Search issues | Type in search field | Table filters by issue title or tenant name. |

### 11.2 Create Issue (AddAnIssueModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.2.1 | Open create issue modal | Click "Add Issue" button | AddAnIssueModal opens with fields: title, description, category, priority, assignee, tenant, file attachments. |
| 11.2.2 | Create issue with all fields | Fill all fields, attach a file, submit | `CreateIssue` called with FormData payload (multipart/form-data). Modal closes. New issue appears in list. Success toast. |
| 11.2.3 | Create issue without attachments | Fill required text fields only, submit | `CreateIssue` called without file attachments. Issue created successfully. |
| 11.2.4 | Create issue with empty required fields | Leave title empty, submit | Validation prevents submission. Error on required fields. |

### 11.3 View Issue Detail

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.3.1 | View issue details | Click on an issue row | ViewIssue component loads. `GetIssueById` called. Displays: title, description, category, priority, status, assignee, reporter, tenant, created date, attachments, comments history, activity log. |
| 11.3.2 | Issue with no comments | View a new issue with no comments | Comments section shows empty state. "Add Comment" button visible. |
| 11.3.3 | Issue with attachments | View issue that has file attachments | Attachments listed with file names and download links. |

### 11.4 Issue Actions

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.4.1 | Edit issue (EditIssueModal) | Click edit, modify title and description, save | `EditIssue` called with issueId, title, description, updatedBy. Changes reflected. Success toast. |
| 11.4.2 | Change priority (ChangePriorityModal) | Open change priority modal, select new priority (Low/Medium/High/Critical), confirm | `ChangePriority` called with issueId, new priority, updatedBy. Priority badge updates. |
| 11.4.3 | Change status (ChangeStatusModal) | Open change status modal, select new status, confirm | `ChangeIssueStatus` called with issueId, new status, updatedBy. Status badge updates. Activity log updated. |
| 11.4.4 | Change category (ChangeCategoryModal) | Open change category modal, select new category, confirm | `ChangeCategory` called with issueId, new category, updatedBy. Category updates. |
| 11.4.5 | Add comment (AddCommentModal) | Open add comment modal, type comment text, submit | `CreateCommentOnIssue` called with issueId, comment, adminId. Comment appears in comment history with timestamp and admin name. |
| 11.4.6 | Add empty comment | Open add comment modal, leave blank, submit | Validation prevents empty comment submission. |
| 11.4.7 | Add attachment (AddAttachmentModal) | Open attachment modal, select file, submit | `AddAttachment` called with FormData (multipart/form-data). New attachment appears in attachments list. |
| 11.4.8 | Reassign issue (ReassignModal) | Open reassign modal, select different admin, confirm | `ReassignToStaff` called with issueId, new adminId, updatedBy. Assignee field updates. |
| 11.4.9 | Mark as resolved (MarkAsResolvedModal) | Open resolve modal, optionally add resolution notes/file, confirm | `MarkAsResolved` called with FormData payload. Issue status changes to "Resolved". Resolution timestamp recorded. |
| 11.4.10 | Contact tenant (ContactTenantModal) | Open contact modal, compose email (subject, body, optional attachment), send | `ContactTenantByMail` called with FormData payload (multipart/form-data). Success toast: email sent. |
| 11.4.11 | Contact tenant with empty fields | Leave email subject and body empty, send | Validation prevents sending. Error displayed. |

---

## 12. Feature Management

**Route:** `/features`
**Component:** FeatureManagement
**APIs:** `FeatureApis.*`

### 12.1 Feature Dashboard

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 12.1.1 | Load feature management page | Navigate to `/features` | `GetAllFeatureGroups` and `GetAllFeatures` called. Page displays feature groups as collapsible sections. Each group shows its features as FeatureRow components. |
| 12.1.2 | Expand/collapse feature group | Click on a feature group header | Group toggles between expanded (showing features) and collapsed states. |
| 12.1.3 | Empty state | No feature groups or features exist | Empty state with prompt to create first feature group. |

### 12.2 Feature Groups

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 12.2.1 | Create feature group (CreateFeatureGroupModal) | Click "Create Group", enter name, submit | `CreateFeatureGroup` called with name. New group section appears. Success toast. |
| 12.2.2 | Create group with empty name | Leave name blank, submit | Validation prevents submission. Error displayed. |
| 12.2.3 | Edit feature group (EditFeatureGroupModal) | Click edit on group, change name, save | `UpdateFeatureGroup` called with id and new name. Group header updates. |
| 12.2.4 | Delete feature group | Click delete on group, enter administrator password, confirm | `DeleteFeatureGroup` called with id and administratorPassword. Group and all its features removed. |
| 12.2.5 | Delete group with wrong password | Enter incorrect admin password | API error. Group not deleted. Error toast. |
| 12.2.6 | Delete group with existing features | Delete a group that contains features | Depends on backend behavior: either cascading delete (all features deleted) or error requiring features be moved/deleted first. |

### 12.3 Features

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 12.3.1 | Add feature to group (AddNewFeatureModal) | Click "Add Feature" on a group, fill name, description, select applicable plans (multi-select), set managedBy, submit | `CreateFeature` called with featureGroupId, name, description, active, applicablePlans, managedBy. Feature row appears in the group. |
| 12.3.2 | Add feature (AddFeatureModal -- existing feature) | Open AddFeatureModal, select existing feature to add to plan | `AssignFeatureToPlan` called. Feature's applicablePlans updated. |
| 12.3.3 | Edit feature (EditFeatureModal) | Click edit on a feature row, modify fields, save | `UpdateFeature` called with id and updated fields. Feature row updates. |
| 12.3.4 | Delete feature | Click delete, enter admin password, confirm | `DeleteFeature` called with id and administratorPassword. Feature removed from list. |
| 12.3.5 | Enable/disable feature toggle | Click the active/inactive toggle on a feature row | `EnableOrDisableFeature` called with id and new active boolean. Toggle state updates. All tenants on applicable plans gain/lose access to the feature. |
| 12.3.6 | Move feature to another group (MoveFeatureModal) | Open move modal, select target group, confirm | `MoveFeatureToAnotherGroup` called with id and new featureGroupId. Feature disappears from current group and appears in target group. |
| 12.3.7 | Assign feature to plan | Select plans in the applicable plans field, save | `AssignFeatureToPlan` called with id and applicablePlans array. Feature now available to tenants on selected plans. |
| 12.3.8 | View feature usage statistics | Click on usage stats for a feature | FeatureUsageStatistic component loads. Shows which tenants are using the feature, usage counts. |

---

## 13. Performance Monitoring

**Route:** `/performance`
**Component:** MainPerformance
**APIs:** `performanceApi.GetGeneralMetrics`, `performanceApi.GetGeneralTimeseries`, `performanceApi.GetApiErrorRate`, `performanceApi.GetResourceMetrics`, `performanceApi.GetResourceTimeseries`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 13.1 | Load performance dashboard | Navigate to `/performance` | All five API calls made. Dashboard renders with: general metrics (response time, throughput, uptime), API error rate, resource utilization (CPU, memory, disk, bandwidth). |
| 13.2 | View general metrics | Observe top metrics section | SpeedChart/Gauge components display response time, request throughput. Values match API data. |
| 13.3 | View general timeseries | Observe line chart section | StackedBarChart or line chart renders historical performance data over time. X-axis shows time intervals. |
| 13.4 | View API error rate | Observe error rate section | ErrorTypeChart displays error categories (4xx, 5xx) with counts and percentages. |
| 13.5 | View resource utilization | Observe resource section | ResourceUtilizationUsage component shows CPU usage %, memory usage %, disk usage, bandwidth. Gauges or progress bars reflect values. |
| 13.6 | View resource timeseries | Observe resource trends chart | Historical resource usage rendered in chart format. |
| 13.7 | API failure handling | One or more performance APIs fail | Failed sections display error state or fallback UI. Other sections still render. No page crash. |

---

## 14. Settings -- Roles & Permissions

**Route:** `/settings/roles-permissions`
**Component:** ControlSettings (Roles tab, Permissions tab)
**APIs:** `roleApis.CreateRole`, `roleApis.UpdateRole`, `roleApis.GetRolesByModule`, `roleApis.GetRoleById`, `roleApis.DeactivateRole`

### 14.1 Roles Tab

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 14.1.1 | View roles list | Navigate to settings, click Roles tab | `GetRolesByModule` called (module "ADMIN"). Table lists roles with name, data access level, status (active/inactive), creation date. |
| 14.1.2 | Create new role | Click "Create Role", fill name, select data access level (GLOBAL/TEAM/INDIVIDUAL), select module accesses (Tenant, Billing, Issue Management, Feature Management, Settings), submit | `CreateRole` called with name, dataAccessLevel, createdByAdminId, moduleAccesses. New role appears in list. |
| 14.1.3 | Create role with duplicate name | Enter a name that already exists | API returns error. Error toast. |
| 14.1.4 | Edit role name and access level | Click edit on a role, modify name and dataAccessLevel, save | `UpdateRole` called with id and updated fields. Changes reflected. |
| 14.1.5 | Deactivate role | Click deactivate action on a role | `DeactivateRole` called with role id. Role status changes to inactive. Staff assigned to this role may lose permissions. |
| 14.1.6 | Configure role permissions (`/settings/roles-permissions/configure/:roleId`) | Click "Configure" on a role, navigate to RoleConfiguration page | `GetRoleById` called. RoleConfiguration page loads showing all permission sections from `permissionsConfig`: Tenant (Pipeline, Tenant List), Billing (Plans, Invoices, Subscriptions, Auto-billing, Reports), Issue Management, Feature Management, Performance Monitoring, Settings (Roles & Permissions, Security). Each permission has a toggle. |
| 14.1.7 | Toggle individual permissions | Toggle specific permissions on/off (e.g., "create_plan", "delete_tenant"), save | `UpdateRole` called with updated moduleAccesses containing the new permission states. |
| 14.1.8 | Select all permissions in a section | Click "Select All" for a section (e.g., Pipeline) | All permissions in that section toggle to enabled. |
| 14.1.9 | Deselect all permissions in a section | Click "Deselect All" for a section | All permissions in that section toggle to disabled. |
| 14.1.10 | Save role configuration | After configuring permissions, click Save | `UpdateRole` called with full permission set. Success toast. Permissions take effect for all staff with this role. |

### 14.2 Permissions Tab

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 14.2.1 | View permissions matrix | Click Permissions tab | Displays a read-only matrix of all available permissions organized by module and section from `permissionsConfig`. Shows which permissions exist for reference. |

---

## 15. Settings -- Staff Management

**Route:** `/settings/roles-permissions` (Staff tab)
**Component:** Staff (within ControlSettings)
**APIs:** `staffApis.GetAllAdmins`, `staffApis.GetAdmin`, `staffApis.CreateAdmin`, `staffApis.UpdateAdmin`, `staffApis.ToggleAdminActive`, `staffApis.GetAllRoles`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 15.1 | View staff list | Click Staff tab | `GetAllAdmins` called. Table shows: firstName, lastName, email, phoneNumber, role, department, active status. |
| 15.2 | Create new staff member | Click "Add Staff", fill firstName, lastName, email, phoneNumber, select roleId (dropdown from `GetAllRoles`), select departmentId, submit | `CreateAdmin` called. New staff appears in table. Onboarding email sent to the staff member's email (via `/admin/onboarding/:email/:userId` link). |
| 15.3 | Create staff with duplicate email | Enter email that already exists | API error. Error toast "Failed to create staff" or server message. |
| 15.4 | Edit staff member | Click edit on staff row, modify fields, save | `UpdateAdmin` called with id and updated fields. Changes reflected. |
| 15.5 | Activate staff member | Toggle active status to "active" on an inactive staff | `ToggleAdminActive` called with id and active=true. Staff can now log in and access the control panel. |
| 15.6 | Deactivate staff member | Toggle active status to "inactive" | `ToggleAdminActive` called with active=false. Staff loses access. Active sessions invalidated (if implemented). |
| 15.7 | View staff details | Click on a staff row | `GetAdmin` called with id. Detail view shows full info including assigned role with permissions, department. |
| 15.8 | Filter staff by role | Use role filter dropdown | Table filters to staff members with selected role. |
| 15.9 | Search staff | Type name in search field | Table filters by first name or last name match. |

---

## 16. Settings -- Departments

**Route:** `/settings/roles-permissions` (Departments tab)
**Component:** Departments (within ControlSettings)
**APIs:** `departmentApis.GetAllDepartments`, `departmentApis.CreateDepartment`, `departmentApis.UpdateDepartment`, `departmentApis.DeleteDepartment`, `departmentApis.ToggleDepartmentActive`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 16.1 | View departments list | Click Departments tab | `GetAllDepartments` called. Table shows: name, team lead, member count, active status. |
| 16.2 | Create department | Click "Add Department", fill name, select teamLeadId (from admin list), select members (multi-select from admin list), submit | `CreateDepartment` called with name, createdByAdminId, teamLeadId, members. New department appears. |
| 16.3 | Create with empty name | Leave name blank, submit | Validation error. Department not created. |
| 16.4 | Edit department | Click edit, modify name/team lead/members, save | `UpdateDepartment` called with id and updated fields. Changes reflected. |
| 16.5 | Delete department | Click delete on a department, confirm | `DeleteDepartment` called with id. Department removed from list. Staff members in this department have their departmentId cleared (or depends on backend). |
| 16.6 | Activate department | Toggle active on inactive department | `ToggleDepartmentActive` called with id and active=true. |
| 16.7 | Deactivate department | Toggle active off | `ToggleDepartmentActive` called with active=false. Department becomes inactive. |

---

## 17. Settings -- Security Settings

**Route:** `/settings/securitySettings`
**Component:** SecuritySettings

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 17.1 | Load security settings | Navigate to security settings page | Page loads with platform-wide security configurations: password policies, session timeout settings, 2FA enforcement, IP restrictions (if applicable). |
| 17.2 | Update password policy | Change minimum password length, complexity requirements, save | Settings saved. All new password changes must comply with updated policy. |
| 17.3 | Update session settings | Change idle timeout duration, max concurrent sessions, save | Settings saved. useIdleTimeout hook respects new values. |
| 17.4 | Enforce 2FA for all admins | Toggle 2FA enforcement, save | All admin accounts prompted to set up 2FA on next login. |

---

## 18. Shared Components & Utilities

### 18.1 CustomTable

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.1.1 | Render table with data | Pass data array to CustomTable | TableHeader renders column headers. TableBody renders rows. Pagination renders if data exceeds page size. |
| 18.1.2 | Sort by column | Click column header | Rows sort ascending/descending. Sort indicator icon updates. |
| 18.1.3 | Paginate | Click page numbers or next/prev buttons | Table shows correct subset of data. Current page highlighted. |
| 18.1.4 | Change page size | Select different page size from dropdown | Table re-renders with new number of rows per page. Pagination recalculates. |
| 18.1.5 | Empty table | Pass empty data array | Table renders with headers but no rows. Empty state message displayed. |
| 18.1.6 | Select rows | Click row checkboxes | Selected rows highlighted. Selection state available for bulk actions. |

### 18.2 TableFilterModal

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.2.1 | Open filter modal | Click filter icon | Modal opens with available filter options for the current table context. |
| 18.2.2 | Apply single filter | Select one filter criterion, apply | Table data filtered. Active filter badge shown. |
| 18.2.3 | Apply multiple filters | Select multiple criteria, apply | Table shows intersection of all filters. |
| 18.2.4 | Clear all filters | Click "Clear" or "Reset" | All filters removed. Table shows full dataset. |

### 18.3 TableFilterDateModal

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.3.1 | Filter by date range | Open date filter, select start date and end date, apply | Table shows only records within the selected date range. |
| 18.3.2 | End date before start date | Select end date earlier than start date | Validation error or automatic swap. No invalid data displayed. |

### 18.4 ExportPrintActions

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.4.1 | Export as CSV | Click CSV export | CSV file downloads with current table data (respecting active filters). File has correct headers and data. |
| 18.4.2 | Export as PDF | Click PDF export | PDF file downloads with formatted table data. |
| 18.4.3 | Print | Click print button | Browser print dialog opens. Table formatted for printing. |

### 18.5 DeleteConfirmationModal & SecondDeleteConfirmationModal

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.5.1 | Confirm delete | Click "Delete" to confirm | Deletion proceeds. Modal closes. Item removed. |
| 18.5.2 | Cancel delete | Click "Cancel" | Modal closes. No deletion occurs. |
| 18.5.3 | Second confirmation | For high-risk deletes, second modal appears | User must type confirmation text or enter admin password. Only then does deletion proceed. |
| 18.5.4 | Second confirmation wrong input | Enter incorrect confirmation text | Delete button remains disabled. Deletion does not proceed. |

### 18.6 StatusChangeModal

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.6.1 | Change status | Select new status, confirm | API called to update status. Item reflects new status. |
| 18.6.2 | Cancel status change | Click cancel | No change made. Modal closes. |

### 18.7 ReusableModal

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.7.1 | Open modal | Trigger modal open | Modal renders with overlay, content area, and close button. |
| 18.7.2 | Close modal via X button | Click X/close button | Modal closes. No action taken. |
| 18.7.3 | Close modal via overlay click | Click outside modal content (on overlay) | Modal closes (if configured to close on overlay click). |
| 18.7.4 | Close via Escape key | Press Escape while modal is open | Modal closes. |

### 18.8 Alert Component

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.8.1 | Success alert | Trigger success notification | Green alert displayed with success message. Auto-dismisses after timeout. |
| 18.8.2 | Error alert | Trigger error notification | Red alert displayed with error message. |
| 18.8.3 | Dismiss alert manually | Click dismiss/X on alert | Alert removed immediately. |

### 18.9 Inputs Component

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.9.1 | Text input | Type text | Value updates. onChange callback fires. |
| 18.9.2 | Input with validation error | Submit form with invalid input | Error styling applied (red border). Error message displayed below input. |
| 18.9.3 | Disabled input | Render input with disabled prop | Input is not editable. Appears grayed out. |

### 18.10 LoadingSpinner

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 18.10.1 | Show loading spinner | Trigger lazy-loaded route | LoadingSpinner renders as Suspense fallback. Spinner animation visible. |
| 18.10.2 | Component loads | Lazy component finishes loading | Spinner disappears. Component renders. |

---

## 19. Permission & Authorization Guards

**Hook:** `usePermission`
**Data:** `permissionsConfig`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 19.1 | Super admin has all permissions | Log in as super admin (isSuperAdmin=true) | `hasPermission(anyKey)` returns true for every permission key. All UI elements visible. All actions available. |
| 19.2 | Role-based permission check | Log in as staff with a role that has `view_plans: true` but `create_plan: false` | Plans page loads (hasPermission("view_plans") = true). "Create Plan" button is hidden or disabled (hasPermission("create_plan") = false). |
| 19.3 | Module access check | Staff role has no billing module access | `hasModuleAccess("billing")` returns false. Billing menu items hidden. Navigating to `/billing-payments/*` shows access denied or redirects. |
| 19.4 | No role assigned (treated as super admin) | User has no role property | `isSuperAdmin` defaults to true (per hook logic: `!user.role`). All permissions granted. |
| 19.5 | Permission on tenant pipeline | Staff with `view_pipeline: true`, `add_prospect: false` | Pipeline board loads. "Add Prospect" button hidden. Existing prospects visible but cannot create new ones. |
| 19.6 | Permission on issue management | Staff with `view_issues: true`, `create_issue: false`, `edit_issue: true` | Issue list loads. "Add Issue" button hidden. Edit button visible on existing issues. |
| 19.7 | Permission on settings | Staff with `view_roles: true`, `create_role: false` | Roles tab shows role list. "Create Role" button hidden. |
| 19.8 | Protected route for unauthenticated user | Navigate to any dashboard route without logging in | ProtectedRoute component redirects to login page (`/`). Dashboard content not rendered. |
| 19.9 | Permission matrix coverage | Verify all 70+ permission keys in `permissionsConfig` | Every permission key has a corresponding UI guard: a button, tab, action, or route that checks `hasPermission(key)` before rendering. |

---

## 20. Session, Token & Idle Timeout

### 20.0 Logout Destination and Teardown

Both logout paths -- the header's Log out button and the idle timeout -- must run the same teardown and land on the sign-in form.

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 20.0.1 | Log out button lands on the login page | Click Log out from the profile dropdown | The browser lands on `/`, showing the super-admin sign-in form. It must **not** land on the 404 page -- there is no `/auth/login` route. |
| 20.0.2 | Idle timeout lands on the login page | Leave the session idle for 30 minutes | Same as above: the user ends on `/` and the sign-in form, not the 404 page. |
| 20.0.3 | Persisted state is purged on logout | Log out, then inspect localStorage and reload | The `persist:control-root` entry no longer holds the signed-out user's auth slice, and reloading does not rehydrate them into a signed-in state. |
| 20.0.4 | Socket is closed on logout | Open DevTools' WS panel, then log out | The WebSocket closes. No further `newNotification` frames arrive and no reconnection is attempted. |
| 20.0.5 | Socket is closed on idle timeout | Establish a socket connection, then let the session idle out | The WebSocket closes as part of the timeout teardown. An idled-out session must not keep a live connection registered as `ADMIN` or go on receiving notifications. |
| 20.0.6 | Teardown order | Instrument the logout path | The socket is disconnected **first**, while the token that authorized it is still in state, then `logout()`, then `persistor.purge()`, then navigation. |
| 20.0.7 | Both paths behave identically | Compare the button path and the timeout path | Both produce the same end state: socket closed, Redux cleared, persisted state purged, sitting on `/`. |

**Hooks:** `useAuth`, `useIdleTimeout`
**Helper:** `AxiosInterceptor`, `refreshAccessToken`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 20.1 | Access token refresh | Wait for access token to expire (or force expiration) | `AxiosInterceptor` intercepts 401 response. `refreshAccessToken` called with refresh token. New access token stored via `updateAccessToken` dispatch. Original request retried with new token. |
| 20.2 | Refresh token expired | Both access and refresh tokens expired | `refreshAccessToken` returns null. User redirected to login page. Session data cleared. |
| 20.3 | Idle timeout | Leave the application idle for configured duration | `useIdleTimeout` hook detects inactivity. User is logged out and redirected to login page. Warning may be shown before logout. |
| 20.4 | Activity resets idle timer | Move mouse or type while idle timer is running | Timer resets. User remains logged in. |
| 20.5 | Auth state persistence | Refresh browser page while logged in | Redux state persists (if using persistence). User remains on the current page. If no persistence, user may be redirected to login. |
| 20.6 | Concurrent requests during token refresh | Multiple API calls fail simultaneously due to expired token | Only one refresh request is made. All pending requests wait for new token and retry. No duplicate refresh calls. |

---

## 21. Cross-Cutting Concerns

### 21.1 Error Boundary

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.1.1 | Component crash | A component throws a runtime error | ErrorBoundary catches the error. Fallback UI displayed (error message, retry button). Other parts of the app remain functional. |
| 21.1.2 | Error boundary recovery | Click "Retry" or navigate away and back | Component re-mounts and attempts to render again. |

### 21.2 Toast Notifications (ShowToast)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.2.1 | Success toast | Perform a successful action (create, update, delete) | Green toast appears with success message. Auto-dismisses after timeout. |
| 21.2.2 | Error toast | API call fails | Red toast appears with error message from API response or fallback message. |
| 21.2.3 | Multiple toasts | Trigger multiple actions quickly | Toasts stack or queue correctly. Each is dismissible independently. |

### 21.3 Axios Interceptor

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.3.1 | Attach auth headers | Make any authenticated API call | Request includes `Authorization: Bearer {accessToken}` header. |
| 21.3.2 | Handle 401 response | API returns 401 | Interceptor attempts token refresh. If successful, request retried. If not, user logged out. |
| 21.3.3 | Handle 500 response | API returns 500 | Error propagated to calling code. Error toast displayed. No infinite retry loop. |
| 21.3.4 | Handle network failure | Disconnect network, make API call | Error caught and propagated. Appropriate error message displayed. |

### 21.4 Formatters (Helper/Formatters.js)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.4.1 | Date formatting | Pass various date values | Dates formatted consistently across the UI (e.g., "Apr 9, 2026" or "2026-04-09"). |
| 21.4.2 | Currency formatting | Pass monetary values | Amounts displayed with correct currency symbol, thousands separators, and decimal places (e.g., "$1,234.56"). |
| 21.4.3 | Null/undefined handling | Pass null or undefined values | Formatters return fallback strings (e.g., "N/A", "--") instead of crashing. |

### 21.5 Lazy Loading & Code Splitting

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.5.1 | Auth pages lazy load | Navigate to any auth page | Component loads asynchronously. Suspense fallback (LoadingSpinner) shown briefly. Page renders after chunk downloads. |
| 21.5.2 | Dashboard pages eager load | Navigate between dashboard routes | No loading spinner between dashboard pages (eagerly imported). Instant navigation. |
| 21.5.3 | Chunk load failure | Network failure during lazy load | Error boundary catches chunk load error. User sees error message with retry option. |

### 21.6 Redux State Management

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.6.1 | Authentication state | Login/logout | `authentication` slice updates with user data, tokens on login. Clears on logout. |
| 21.6.2 | Pipeline state | Load pipeline, drag items | `PipelineSlice` updates stage/item data. UI reflects Redux state changes. |
| 21.6.3 | Feature management state | Load features, create/edit/delete | `featureManagementSlice` reflects current features and groups. |

### 21.7 Responsive Design

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.7.1 | Desktop layout (1920x1080) | View on standard desktop resolution | Full sidebar navigation visible. Tables show all columns. Modals centered. |
| 21.7.2 | Laptop layout (1366x768) | View on standard laptop resolution | Layout adapts. No horizontal scrolling on main content. Tables may show horizontal scroll for wide tables. |
| 21.7.3 | Tablet layout (768px width) | Resize to tablet width | Sidebar collapses to hamburger menu. Tables remain usable. Modals resize appropriately. |
| 21.7.4 | Pipeline board on smaller screens | View Kanban board on constrained width | Columns scroll horizontally. Cards remain readable. Drag-and-drop still functional. |

### 21.8 Navigation & Layout

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 21.8.1 | Sidebar navigation | Click each sidebar menu item | Correct route loads. Active menu item highlighted. |
| 21.8.2 | Breadcrumb navigation | Navigate to nested page (e.g., tenant overview) | Breadcrumbs show path: Tenants > Tenant List > Overview. Each segment is clickable and navigates to the correct route. |
| 21.8.3 | Browser back/forward | Use browser back button after navigating | Previous page loads correctly. State preserved where applicable. |
| 21.8.4 | Direct URL navigation | Paste a dashboard URL while logged in | Page loads directly without needing to navigate through UI. |
| 21.8.5 | 404 / unknown route | Navigate to `/nonexistent-page` | Application handles gracefully: shows 404 page or redirects to dashboard. |
| 21.8.6 | Layout renders for protected routes | Navigate to any protected route while authenticated | LayoutRoute renders sidebar and header. Content area shows the route's component via Outlet. |

---

## 22. Notifications

**Route:** `/notifications` (outside every `ModuleGuard` -- available to any authenticated admin)
**Component:** `Pages/Notifications/Notifications.jsx`
**APIs:** `GET /notifications/user/admin/{userId}/{userType}`, `PATCH /notifications/read/admin/{id}`
**Real-time:** `onNotification()` from `api/socketService`; the admin is registered on the socket as `"ADMIN"`.

### 22.1 Access and Loading

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 22.1.1 | Reachable without any module permission | Log in as an admin whose role grants no modules, navigate to `/notifications` | The page loads. It is not blocked by `ModuleGuard` and shows no "You don't have access to this module" toast. |
| 22.1.2 | Loading indicator | Throttle the network and load the page | `SectionLoader` is shown in the body while the list loads. |
| 22.1.3 | Empty state | Log in as an admin with no notifications | A bell icon with the text "No notifications" is shown. No pagination is rendered. |
| 22.1.4 | Correct role segment in the request | Inspect the network call on load | The request is `GET /notifications/user/admin/{userId}/ADMIN` -- namespaced `admin`, with the role as the final segment. |
| 22.1.5 | Payload shape tolerance | Return the list wrapped as `{ data: { data: [...] } }`, as `{ data: [...] }`, and as a bare array | All three render identically. Items arriving wrapped as `{ notification: {...} }` are unwrapped correctly. |

### 22.2 Display, Grouping and Pagination

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 22.2.1 | Sorted newest first | Load a mix of notifications with different `createdAt` values | The newest appears first. |
| 22.2.2 | Date group headers | Include notifications from today, yesterday, and last week | Groups are headed "Today", "Yesterday", and a "Weekday, Mon D" label respectively. |
| 22.2.3 | Missing or invalid date | Include a notification with no `createdAt` | It is grouped under "Earlier" rather than crashing the page. |
| 22.2.4 | Relative timestamps | Inspect notifications aged seconds, minutes, hours, days, and over a week | They read "just now", "N minutes ago", "N hours ago", "N days ago", and an absolute `Mon D, YYYY` date respectively. Singular and plural are handled ("1 minute ago", not "1 minutes ago"). |
| 22.2.5 | Pagination at 10 per page | Load 25 notifications | Pagination appears; each page shows at most 10, grouped by date within that page. |
| 22.2.6 | No pagination for a short list | Load fewer than 11 notifications | The pagination control is not rendered. |
| 22.2.7 | Unread styling | Compare a read and an unread notification | The unread card carries the unread modifier styling. |
| 22.2.8 | Unread count badge | Load with some unread notifications | The header shows the unread count. With none unread, neither the count badge nor "Mark all as read" is shown. |
| 22.2.9 | Body text fallbacks | Provide notifications carrying only `content`, only `description`, and only `body` | Each renders its text. A notification with no title falls back to "Notification". |

### 22.3 Icons

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 22.3.1 | Payment icon | Load a `PAYMENT_MADE_FOR_PLAN` or `PRODUCT_ACCESS` notification | The card icon is the card icon. |
| 22.3.2 | Tenant icon | Load `TENANT_CREATED` | The business icon is shown. |
| 22.3.3 | Plan icon | Load `PLAN_CREATED` | The pricetags icon is shown. |
| 22.3.4 | Subscription icon | Load `SUBSCRIPTION_PAUSED` | The refresh icon is shown. |
| 22.3.5 | Issue icon | Load `ISSUE_SUBMITTED` | The alert icon is shown. |
| 22.3.6 | Success beats issue | Load `ISSUE_RESOLVED` | The **success** (checkmark) icon is shown, not the issue icon -- the `RESOLVED` test runs before the `ISSUE` test. |
| 22.3.7 | Success on auto-renewal | Load `SUBSCRIPTION_AUTO_RENEWED` | The success icon is shown rather than the subscription icon, for the same reason. |
| 22.3.8 | Unknown type | Load a notification with an unrecognized type | The generic system bell icon is shown. |

### 22.4 Live Updates

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 22.4.1 | New notification arrives | With the page open, trigger a notification server-side | It is prepended to the list immediately, with no refresh and no refetch. |
| 22.4.2 | Duplicate id is merged, not duplicated | Push a notification whose `id` already exists in the list | The existing entry is updated in place. No duplicate row appears. |
| 22.4.3 | Header bell badge increments | With the page closed, trigger a notification | The bell badge in `ControlLayout` increments. |
| 22.4.4 | Reconnect after backgrounding | Background the tab for several minutes, then return | The socket reconnects on `visibilitychange`. No "connection lost" toast is raised at any point. |
| 22.4.5 | Presence badge reflects socket state | Disconnect the network briefly and watch the avatar badge | The `ConnectionStatus` badge switches to offline with the message "You're offline. Reconnecting now -- nothing is lost, and updates resume on their own.", then back to online. |

### 22.5 Read State

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 22.5.1 | Mark one as read | Click the action button on an unread notification | The card updates to read immediately (optimistic) and `PATCH /notifications/read/admin/{id}` is called. |
| 22.5.2 | Already-read notification | Click the action on a read notification | No mark-as-read request is made; navigation still happens. |
| 22.5.3 | Mark-as-read failure is non-blocking | Force the PATCH to fail | The UI stays marked read and no error toast is shown -- the failure is deliberately swallowed. |
| 22.5.4 | Mark all as read | Click "Mark all as read" with several unread | All cards update immediately, one PATCH fires per unread item in parallel, and the list is then refetched so it reflects the persisted state. |
| 22.5.5 | Mark all with nothing unread | Click "Mark all as read" when everything is read | The button is not rendered; no requests are made. |

### 22.6 Actions and Deep-Linking

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 22.6.1 | Payment notification | Click the action on `PAYMENT_MADE_FOR_PLAN` | Label reads "View payment"; navigates to `/billing-payments/invoice-payments`. |
| 22.6.2 | Product access notification | Click the action on `PRODUCT_ACCESS` | Label reads "View features"; navigates to `/features`. |
| 22.6.3 | Tenant notification with an id | Click the action on `TENANT_CREATED` carrying an `entityId` | Navigates to `/tenants/tenant-lists/overview/{entityId}`. |
| 22.6.4 | Tenant notification without an id | Click the action on `TENANT_DEACTIVATED` with no `entityId` | Falls back to `/tenants/tenant-list`. |
| 22.6.5 | Plan notifications | Click the action on `PLAN_CREATED`, `PLAN_DEACTIVATED`, and `PLAN_DELETED` | All navigate to `/billing-payments/plans-pricing` with the label "View plans". |
| 22.6.6 | Subscription notifications | Click the action on each of the eight `SUBSCRIPTION_*` types | All navigate to `/billing-payments/subscription-manager` with the label "View subscription". |
| 22.6.7 | Issue notifications carry focus state | Click the action on each of the eight `ISSUE_*` types | Navigates to `/issues` with `{ focusId: entityId }` in navigation state, so the destination can focus the record. |
| 22.6.8 | `entityId` read from nested payloads | Provide `entityId` at the top level, under `data`, and under `metadata` in turn | All three resolve to the same destination. |
| 22.6.9 | Entity fallback for an unknown type | Send a notification with an unrecognized `type` but `entityType: "INVOICE"` | The action falls back to "View invoice" at `/billing-payments/invoice-payments`. |
| 22.6.10 | Entity fallbacks for each supported type | Repeat 22.6.9 for `ISSUE`, `TENANT`, `PLAN`, `SUBSCRIPTION`, and `PAYMENT` | Each resolves to its documented destination. |
| 22.6.11 | Out-of-domain entity types | Send a notification with `entityType: "APPOINTMENT"` or `"CLIENT"` | No action is resolved. The card shows the default "View details" label and clicking it marks read without navigating -- the control app has no route for these. |
| 22.6.12 | No type and no entity type | Send a notification with neither | Card shows "View details"; clicking marks read only. |
| 22.6.13 | Dead fallback key guard (dev only) | Run the app in development | No `[notificationConfig] ENTITY_FALLBACK key "..." is not a NotificationEntityType` errors appear in the console. Any that do indicate a fallback that can never fire. |
| 22.6.14 | Every configured path resolves | Walk every destination in `notificationConfig.js` | Each path matches a route declared in `Components/Allroutes.jsx`; none lands on the 404 page. |

---

## Test Environment Requirements

- **Browsers:** Chrome (latest), Firefox (latest), Safari (latest), Edge (latest)
- **Test accounts:** Super Admin account, Staff account with full permissions, Staff account with partial permissions, Staff account with no permissions
- **Payment testing:** Stripe test mode API keys (a `pk_test` publishable key), including cards that decline and cards that require 3-D Secure. A PayPal sandbox account is **not** required -- PayPal is disabled behind `PAYPAL_ENABLED = false`.
- **Data requirements:** At least 5 tenants (mix of active/inactive), at least 3 plans (different types), at least 10 issues (various statuses), pipeline with 3+ stages and 5+ prospects, 2+ feature groups with 10+ features
- **Network conditions:** Test on normal network and throttled network (slow 3G) for loading states

## Risk Areas

1. **Token refresh race conditions** -- Multiple simultaneous API calls when token expires can cause duplicate refresh attempts or dropped requests
2. **Pipeline drag-and-drop** -- Complex state management during drag operations; test with rapid successive drags
3. **Bulk operations** -- Selecting and operating on many items (50+) at once; verify performance and correct API payloads
4. **Auto-billing toggle interactions** -- Multiple toggles depend on each other; verify correct state after toggling combinations
5. **Payment processing** -- Stripe PaymentIntent failures; test edge cases (declined cards, 3-D Secure challenges, any non-`succeeded` intent status, duplicate submissions). Verify that a successful payment appears in the Stripe dashboard as a real `pi_…` intent, and that a *failed* payment is never recorded from the browser -- that path belongs to the `payment_intent.payment_failed` webhook
6. **Permission-gated UI** -- Ensure all 70+ permission keys correctly hide/show UI elements; missing guards create unauthorized access
7. **Real-time notifications** -- Socket delivery, duplicate-id merging, and the deep-link map in `notificationConfig.js`; a destination that no longer matches a declared route sends the admin to a 404
8. **Administrator password for destructive actions** -- Plan deletion, feature group deletion, plan activation/deactivation all require admin password; verify this cannot be bypassed
