# Payroll Module - Backend Integration Requirements

> This document outlines all endpoints needed, calculation logic, data models, and existing endpoint corrections for the **Payroll module** to move from hardcoded/mock data to full API integration.

---

## Table of Contents

1. [Existing Endpoints (Already Integrated)](#1-existing-endpoints-already-integrated)
2. [Missing Endpoints (Need to be Created)](#2-missing-endpoints-need-to-be-created)
3. [Calculation Logic for Backend](#3-calculation-logic-for-backend)
4. [Data Models & Schemas](#4-data-models--schemas)
5. [Existing Endpoint Corrections](#5-existing-endpoint-corrections)
6. [Hardcoded Mock Data Locations](#6-hardcoded-mock-data-locations)
7. [Frontend File Reference](#7-frontend-file-reference)

---

## 1. Existing Endpoints (Already Integrated)

### 1.1 Compensation Types (Employee Payment Schedules)

These are the payment schedule types (e.g., "Hourly", "Weekly", "Monthly", "Salaried").

| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Get all by tenant | `GET` | `/compensation-types/tenant/{tenantId}` | Working |
| Toggle active/inactive | `PATCH` | `/compensation-types/{id}/{isActive}` | Working |

**Frontend file:** `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/EmployeePaymentSchedules.jsx`
**API file:** `src/api/payrollApi.js` -> `GetCompensationTypeByTenantId`, `UpdateCompensationTypeActiveness`

**Response format expected:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Weekly",
      "isActive": true
    }
  ]
}
```

---

### 1.2 Income Items

| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Create | `POST` | `/income-items` | Working |
| Update | `PUT` | `/income-items` | Working |
| Get all by tenant | `GET` | `/income-items/tenant/{tenantId}` | Working |
| Toggle active/inactive | `PATCH` | `/income-items/{id}/{isActive}` | Working |

**Frontend file:** `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/IncomeItems.jsx`
**API file:** `src/api/payrollApi.js` -> `CreateIncomeItems`, `UpdateIncomeItems`, `GetIncomeItemsByTenantId`, `UpdateIncomeItemsActiveness`

**Create/Update payload:**
```json
{
  "id": "uuid (required for update only)",
  "tenantId": "uuid",
  "name": "Overtime Pay",
  "type": "Flat Rate | Time based | Percentage based",
  "rate": {
    // For "Flat Rate":
    "rate": 150.00,

    // For "Time based":
    "unit": 25.00,
    "unitMinutes": 60,
    "duration": "hours",

    // For "Percentage based":
    "unit": 10,
    "duration": "income-item-id-reference"
  },
  "isActive": true,
  "isDeleted": false
}
```

**Response format expected:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Overtime Pay",
      "type": "Flat Rate",
      "rate": { "rate": 150.00 },
      "isActive": true
    }
  ]
}
```

**Note on "Percentage based" type:** The `rate.duration` field stores the `id` of the income item it is a percentage OF. The frontend resolves this to display: `"10% of [Referenced Item Name]"`.

---

### 1.3 Deductions

| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Create | `POST` | `/deductions` | Working |
| Update | `PUT` | `/deductions` | Working |
| Get all by tenant | `GET` | `/deductions/tenant/{tenantId}` | Working |
| Toggle active/inactive | `PATCH` | `/deductions/{id}/{isActive}` | Working |

**Frontend file:** `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/Deductions.jsx`
**API file:** `src/api/payrollApi.js` -> `CreateDeductions`, `UpdateDeductions`, `GetDeductionsByTenantId`, `UpdateDeductionsActiveness`

**Payload:** Same structure as Income Items (same `rate` object patterns by type).

---

### 1.4 Payroll Cycles

| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Create | `POST` | `/payroll-cycles` | Working |
| Update | `PUT` | `/payroll-cycles` | Working |
| Get all by tenant | `GET` | `/payroll-cycles/tenant/{tenantId}` | Working |
| Toggle active/inactive | `PATCH` | `/payroll-cycles/{id}/{isActive}` | Working |

**Frontend file:** `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/PayrollCycles.jsx`
**API file:** `src/api/payrollApi.js` -> `CreatePayrollCycles`, `UpdatePayrollCycles`, `GetPayrollCycleByTenantId`, `UpdatePayrollCycleActiveness`

**Create/Update payload:**
```json
{
  "id": "uuid (required for update only)",
  "tenantId": "uuid",
  "name": "Monthly Payroll",
  "compensationTypeId": "uuid (references a compensation type)",
  "interval": 30,
  "startDate": "2024-01-01",
  "autoRun": true,
  "isActive": true,
  "isDeleted": false
}
```

**Response format expected:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Monthly Payroll",
      "compensationTypeId": "uuid",
      "interval": 30,
      "startDate": "2024-01-01",
      "autoRun": true,
      "isActive": true
    }
  ]
}
```

---

### 1.5 Staff-Level Payroll Settings

| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Get staff payroll | `GET` | `/organization-staff/payroll/tenant-staff/{tenantStaffId}` | Working |
| Update staff payroll | `PUT` | `/organization-staff/payroll` | Working |

**Frontend file:** `src/Pages/Organisation/StaffAndTeams/StaffSingleTabs/Payroll.jsx`
**API file:** `src/api/organisationStaffApis.js` -> `GetAllStaffPayrollById`, `UpdateTenantStaffPayroll`

**GET Response format:**
```json
{
  "data": {
    "status": "ok",
    "data": [
      {
        "id": "uuid",
        "paymentSchedule": "Weekly",
        "ratePerHour": "62.5",
        "minimumHours": "40",
        "monthlyFlatFee": "N/A",
        "otherPays": [
          { "type": "weekly bonus", "rate": "25" }
        ],
        "deductions": [
          { "type": "tax", "rate": "200" }
        ]
      }
    ]
  }
}
```

**PUT payload:**
```json
{
  "id": "payroll-record-uuid",
  "paymentSchedule": "Weekly | Monthly | Hourly | Salaried",
  "ratePerHour": "62.5",
  "tenantStaffId": "uuid",
  "minimumHours": "40",
  "otherPays": [
    { "type": "weekly bonus", "rate": "25" }
  ],
  "deductions": [
    { "type": "tax", "rate": "200" }
  ]
}
```

---

### 1.6 Staff Payroll (via Staff Creation/Update)

When creating or updating a staff member, payroll settings are included as a nested object.

**Frontend file:** `src/api/organisationStaffApis.js` -> `CreateTenantStaff`, `UpdateTenantStaff`

**Payroll object nested inside staff payload:**
```json
{
  "paymentSchedule": "Weekly",
  "ratePerHour": "62.5",
  "minimumHours": "40",
  "otherPays": [{ "id": "income-item-id" }],
  "deductions": [{ "id": "deduction-id" }],
  "tenantId": "uuid"
}
```

**Note:** When creating staff, `otherPays` and `deductions` reference Income Item / Deduction IDs (from payroll settings). When updating via the payroll-specific endpoint, they use `{ type, rate }` format instead. This inconsistency needs attention (see Section 5).

---

## 2. Missing Endpoints (Need to be Created)

### 2.1 Payroll Records (CRUD) - CRITICAL

The main payroll page (`src/Pages/Payroll/Payroll/Payroll.jsx`) is entirely hardcoded with mock data. It needs full CRUD endpoints.

#### 2.1.1 Create Payroll Record

| Detail | Value |
|--------|-------|
| **Method** | `POST` |
| **Endpoint** | `/payroll-records` (suggested) |
| **Purpose** | Create a new payroll run for a date range with assigned employees |

**Request payload:**
```json
{
  "tenantId": "uuid",
  "from": "2024-12-10T00:00:00.000Z",
  "to": "2025-01-11T00:00:00.000Z",
  "employees": [
    {
      "staffId": "uuid",
      "name": "Austin Akpabio",
      "paymentSchedule": "Weekly",
      "basicPay": 2500,
      "fixedBonus": 25,
      "hourlyRate": 62.5,
      "numberOfHours": 40,
      "taxDeduction": 200,
      "pensionDeduction": 250,
      "additionalIncomes": [
        {
          "type": "overtime",
          "unitType": "flat_rate | percentage_based | hourly_rate | hourly_rate_with_overtime",
          "amount": 100
        }
      ],
      "additionalDeductions": [
        {
          "type": "health_insurance",
          "unitType": "flat_rate | percentage_based",
          "amount": 50
        }
      ]
    }
  ]
}
```

**Expected response:**
```json
{
  "data": {
    "id": "uuid",
    "date": "2025-01-15T00:00:00.000Z",
    "payPeriod": "12/10/24 - 01/11/25",
    "noOfStaff": 8,
    "totalPayrollValue": 18200,
    "status": "draft | submitted | approved | paid"
  }
}
```

#### 2.1.2 Get All Payroll Records by Tenant

| Detail | Value |
|--------|-------|
| **Method** | `GET` |
| **Endpoint** | `/payroll-records/tenant/{tenantId}` (suggested) |
| **Purpose** | List all payroll runs for the payroll main page table |

**Expected response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "12/10/2024",
      "payPeriod": "12/10/24 - 11/11/24",
      "noOfStaff": 8,
      "totalPayrollValue": 18200,
      "status": "paid"
    }
  ]
}
```

**Table columns expected by frontend:**
| Column | Key | Description |
|--------|-----|-------------|
| Payroll Date | `date` | Date the payroll was created/run |
| Pay Period | `payPeriod` | Date range string (from - to) |
| No of Staff in Payroll | `noOfStaff` | Count of employees in this payroll |
| Total Payroll Value | `totalPayrollValue` | Sum of all employee net pays |

#### 2.1.3 Get Payroll Record by ID (with Employee Breakdown)

| Detail | Value |
|--------|-------|
| **Method** | `GET` |
| **Endpoint** | `/payroll-records/{payrollId}` (suggested) |
| **Purpose** | Fetch a single payroll with full employee breakdown for ViewBreakDown page |

**Expected response:**
```json
{
  "data": {
    "id": "uuid",
    "date": "12/10/2024",
    "payPeriod": "12/10/24 - 11/11/24",
    "noOfStaff": 8,
    "totalPayrollValue": 18200,
    "employees": [
      {
        "id": "uuid",
        "staffId": "uuid",
        "name": "Austin Akpabio",
        "paymentSchedule": "Weekly",
        "grossPay": 2725,
        "netPay": 2275,
        "basicPay": 2500,
        "fixedBonus": 25,
        "hourlyRate": 62.5,
        "numberOfHours": 40,
        "taxDeduction": 200,
        "pensionDeduction": 250,
        "additionalIncomes": [
          {
            "id": "uuid",
            "type": "overtime",
            "unitType": "hourly_rate",
            "amount": 15
          }
        ],
        "additionalDeductions": [
          {
            "id": "uuid",
            "type": "health_insurance",
            "unitType": "percentage_based",
            "amount": 5
          }
        ]
      }
    ]
  }
}
```

#### 2.1.4 Update Payroll Record (Employee-Level Changes)

| Detail | Value |
|--------|-------|
| **Method** | `PUT` |
| **Endpoint** | `/payroll-records/{payrollId}` (suggested) |
| **Purpose** | Update employee details, add/remove staff, add incomes/deductions for a payroll run |

**Request payload:** Same as create, but with `id` included.

#### 2.1.5 Update Single Employee in Payroll Record

| Detail | Value |
|--------|-------|
| **Method** | `PUT` |
| **Endpoint** | `/payroll-records/{payrollId}/employees/{employeeId}` (suggested) |
| **Purpose** | Save changes for a single employee row in the breakdown view |

**Request payload:**
```json
{
  "basicPay": 2500,
  "fixedBonus": 25,
  "hourlyRate": 62.5,
  "numberOfHours": 40,
  "taxDeduction": 200,
  "pensionDeduction": 250,
  "additionalIncomes": [...],
  "additionalDeductions": [...]
}
```

#### 2.1.6 Add/Remove Staff from Payroll Record

| Detail | Value |
|--------|-------|
| **Method (Add)** | `POST` |
| **Endpoint** | `/payroll-records/{payrollId}/employees` (suggested) |
| **Method (Remove)** | `DELETE` |
| **Endpoint** | `/payroll-records/{payrollId}/employees` (suggested) |

**Add request payload:**
```json
{
  "staffIds": ["uuid1", "uuid2"]
}
```

**Remove request payload:**
```json
{
  "staffIds": ["uuid1", "uuid2"]
}
```

---

### 2.2 Staff List for Payroll Assignment

The `AddStaffModal` currently uses `mockEmployees` from `src/Data/mockData.js`. It needs a real endpoint.

| Detail | Value |
|--------|-------|
| **Method** | `GET` |
| **Endpoint** | `/organization-staff/tenant/{tenantId}/payroll-eligible` (suggested) |
| **Purpose** | Get all active staff with their payroll settings for assignment to a payroll run |

**Expected response:**
```json
{
  "data": [
    {
      "id": "uuid (staff id)",
      "name": "Austin Akpabio",
      "paymentSchedule": "Weekly",
      "basicPay": 2500,
      "fixedBonus": 25,
      "hourlyRate": 62.5,
      "numberOfHours": 40,
      "taxDeduction": 200,
      "pensionDeduction": 250,
      "additionalIncomes": [],
      "additionalDeductions": []
    }
  ]
}
```

**Note:** This should return staff who have payroll settings configured, pre-populated with their default pay rates from their individual payroll settings. The `grossPay` and `netPay` should be calculated based on the formulas in Section 3.

---

### 2.3 Staff Payroll History (Per Staff Member)

The Staff sub-tab payroll page (`src/Pages/Organisation/StaffAndTeams/StaffSingleTabs/Payroll.jsx`) shows "Payroll History" with hardcoded data.

| Detail | Value |
|--------|-------|
| **Method** | `GET` |
| **Endpoint** | `/payroll-records/staff/{tenantStaffId}` (suggested) |
| **Purpose** | Get all payroll records that include a specific staff member |

**Expected response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "payrollDate": "12/10/2024",
      "payPeriod": "1/10/24 - 11/11/24",
      "payrollValue": "$12000"
    }
  ]
}
```

**Table columns expected:**
| Column | Key |
|--------|-----|
| Payroll Date | `payrollDate` |
| Pay Period | `payPeriod` |
| Total Payroll Value | `payrollValue` |

---

### 2.4 Export Payroll Data

The ViewBreakDown page has export buttons (CSV, PDF) and a print button. These can be handled frontend-side or via backend.

| Detail | Value |
|--------|-------|
| **Method** | `GET` |
| **Endpoint** | `/payroll-records/{payrollId}/export?format=csv|pdf` (suggested, optional) |
| **Purpose** | Export payroll breakdown data |

**Note:** This is optional; the frontend can generate CSV/PDF from the data if preferred.

---

## 3. Calculation Logic for Backend

### 3.1 Gross Pay Calculation

```
Base Gross Pay:
  IF paymentSchedule === "Hourly":
    baseGross = hourlyRate * numberOfHours
  ELSE (Weekly, Monthly, Salaried):
    baseGross = basicPay

Gross Pay = baseGross + fixedBonus + SUM(additionalIncomes)
```

**Additional Income Calculation (per income item):**

| unitType | Formula |
|----------|---------|
| `flat_rate` | `amount` (added directly) |
| `percentage_based` | `baseGross * (amount / 100)` |
| `hourly_rate` | `amount * numberOfHours` |
| `hourly_rate_with_overtime` | `amount * numberOfHours` |

```
additionalIncomesTotal = SUM of each income calculated per its unitType
grossPay = baseGross + fixedBonus + additionalIncomesTotal
```

### 3.2 Net Pay Calculation

```
Total Deductions = taxDeduction + pensionDeduction + SUM(additionalDeductions)
```

**Additional Deduction Calculation (per deduction item):**

| unitType | Formula |
|----------|---------|
| `flat_rate` | `amount` (deducted directly) |
| `percentage_based` | `grossPay * (amount / 100)` |

```
additionalDeductionsTotal = SUM of each deduction calculated per its unitType
totalDeductions = taxDeduction + pensionDeduction + additionalDeductionsTotal
netPay = grossPay - totalDeductions
```

### 3.3 Total Payroll Value

```
totalPayrollValue = SUM of netPay for ALL employees in the payroll record
```

### 3.4 Complete Example Calculation

```
Employee: Austin Akpabio
  paymentSchedule: "Hourly"
  hourlyRate: $62.50
  numberOfHours: 40
  basicPay: $2,500 (not used because Hourly)
  fixedBonus: $25
  taxDeduction: $200
  pensionDeduction: $250
  additionalIncomes:
    - { type: "overtime", unitType: "hourly_rate", amount: 15 }
    - { type: "bonus", unitType: "percentage_based", amount: 10 }
  additionalDeductions:
    - { type: "health_insurance", unitType: "percentage_based", amount: 5 }

Step 1: Base Gross
  baseGross = 62.50 * 40 = $2,500

Step 2: Additional Incomes
  overtime (hourly_rate): 15 * 40 = $600
  bonus (percentage_based): 2500 * (10/100) = $250
  additionalIncomesTotal = $850

Step 3: Gross Pay
  grossPay = 2500 + 25 + 850 = $3,375

Step 4: Additional Deductions
  health_insurance (percentage_based): 3375 * (5/100) = $168.75
  additionalDeductionsTotal = $168.75

Step 5: Net Pay
  netPay = 3375 - (200 + 250 + 168.75) = $2,756.25
```

---

## 4. Data Models & Schemas

### 4.1 PayrollRecord

```
PayrollRecord {
  id: UUID (PK)
  tenantId: UUID (FK -> Tenant)
  createdAt: DateTime
  from: DateTime        // Pay period start
  to: DateTime          // Pay period end
  noOfStaff: Integer    // Computed from employees count
  totalPayrollValue: Decimal  // Computed from SUM of employee netPay
  status: Enum ["draft", "submitted", "approved", "paid"]
}
```

### 4.2 PayrollEmployee (junction table)

```
PayrollEmployee {
  id: UUID (PK)
  payrollRecordId: UUID (FK -> PayrollRecord)
  staffId: UUID (FK -> TenantStaff)
  name: String
  paymentSchedule: String ["Hourly", "Weekly", "Monthly", "Salaried"]
  basicPay: Decimal
  fixedBonus: Decimal
  hourlyRate: Decimal
  numberOfHours: Decimal
  taxDeduction: Decimal
  pensionDeduction: Decimal
  grossPay: Decimal     // Calculated field
  netPay: Decimal       // Calculated field
}
```

### 4.3 PayrollEmployeeIncome

```
PayrollEmployeeIncome {
  id: UUID (PK)
  payrollEmployeeId: UUID (FK -> PayrollEmployee)
  type: String           // e.g. "overtime", "commission"
  unitType: Enum ["flat_rate", "percentage_based", "hourly_rate", "hourly_rate_with_overtime"]
  amount: Decimal
}
```

### 4.4 PayrollEmployeeDeduction

```
PayrollEmployeeDeduction {
  id: UUID (PK)
  payrollEmployeeId: UUID (FK -> PayrollEmployee)
  type: String           // e.g. "health_insurance", "retirement"
  unitType: Enum ["flat_rate", "percentage_based"]
  amount: Decimal
}
```

### 4.5 CompensationType (Existing)

```
CompensationType {
  id: UUID (PK)
  tenantId: UUID (FK -> Tenant)
  name: String           // e.g. "Weekly", "Monthly", "Hourly"
  isActive: Boolean
}
```

### 4.6 IncomeItem (Existing)

```
IncomeItem {
  id: UUID (PK)
  tenantId: UUID (FK -> Tenant)
  name: String
  type: String           // "Flat Rate", "Time based", "Percentage based"
  rate: JSON             // { rate } | { unit, unitMinutes, duration } | { unit, duration }
  isActive: Boolean
  isDeleted: Boolean
}
```

### 4.7 Deduction (Existing)

```
Deduction {
  id: UUID (PK)
  tenantId: UUID (FK -> Tenant)
  name: String
  type: String           // "Flat Rate", "Time based", "Percentage based"
  rate: JSON             // Same structure as IncomeItem.rate
  isActive: Boolean
  isDeleted: Boolean
}
```

### 4.8 PayrollCycle (Existing)

```
PayrollCycle {
  id: UUID (PK)
  tenantId: UUID (FK -> Tenant)
  name: String
  compensationTypeId: UUID (FK -> CompensationType)
  interval: Integer      // Number of days in the cycle
  startDate: Date
  autoRun: Boolean
  isActive: Boolean
  isDeleted: Boolean
}
```

### 4.9 StaffPayroll (Existing - per staff settings)

```
StaffPayroll {
  id: UUID (PK)
  tenantStaffId: UUID (FK -> TenantStaff)
  paymentSchedule: String   // "Weekly", "Monthly", "Hourly", "Salaried"
  ratePerHour: String
  minimumHours: String
  monthlyFlatFee: String
  otherPays: JSON[]         // [{ type: String, rate: String }]
  deductions: JSON[]        // [{ type: String, rate: String }]
}
```

---

## 5. Existing Endpoint Corrections

### 5.1 `UpdateTenantStaffPayroll` - Duplicate `id` Field

**File:** `src/api/organisationStaffApis.js` (line ~495-498)

**Issue:** The payload has `id` defined twice:
```javascript
const payload = {
  id,            // First id (from function param)
  id: payroll?.id || undefined,  // Second id (from payroll object, overwrites first)
  ...
};
```

**Correction needed:** Remove the duplicate. The backend should accept only one `id` field. The intended behavior is to use the payroll record ID, not the staff ID.

---

### 5.2 Staff Create vs Staff Payroll Update - Inconsistent `otherPays`/`deductions` Format

**Issue:** Two different formats are used for the same conceptual data:

**On staff creation** (`CreateTenantStaff`):
```json
{
  "otherPays": [{ "id": "income-item-uuid" }],
  "deductions": [{ "id": "deduction-uuid" }]
}
```

**On payroll update** (`UpdateTenantStaffPayroll`):
```json
{
  "otherPays": [{ "type": "weekly bonus", "rate": "25" }],
  "deductions": [{ "type": "tax", "rate": "200" }]
}
```

**Recommendation:** Standardize on one format. Suggested approach:
- Staff creation: continue using `{ id }` references to link to tenant-level income items / deductions
- Payroll update: also use `{ id }` references with the actual rate values stored on the staff payroll record
- OR use `{ id, type, rate }` consistently for both

---

### 5.3 Staff Payroll GET Response - Nested Data Structure

**File:** `src/Pages/Organisation/StaffAndTeams/StaffSingleTabs/Payroll.jsx` (line ~100-110)

**Current behavior:** The response is deeply nested: `response.data.data.data[0]`

The frontend currently handles:
```javascript
res?.data?.status === "ok" && Array.isArray(res.data.data) && res.data.data.length > 0
const payroll = res.data.data[0];
```

But the actual axios response adds another `.data` layer, making it `res.data.data` where `res` is already `response.data`.

**Recommendation:** Standardize the response structure to avoid triple-nesting. Suggested:
```json
{
  "status": "ok",
  "message": "Success",
  "data": { /* payroll object */ }
}
```

---

### 5.4 `additionalIncomes` unitType Handling Gap

**File:** `src/Components/ReusableModal/PayrollModal/EmployeeRow.jsx` (line ~34)

**Issue:** The `hourly_rate` and `hourly_rate_with_overtime` unit types are treated identically in the calculation:
```javascript
} else if (inc.unitType === "hourly_rate" || inc.unitType === "hourly_rate_with_overtime") {
  return sum + (inc.amount * localEmployee.numberOfHours);
}
```

**Recommendation:** If `hourly_rate_with_overtime` should factor in overtime hours differently (e.g., 1.5x rate beyond standard hours), the backend should either:
1. Accept an `overtimeHours` field and calculate `(regularHours * rate) + (overtimeHours * rate * 1.5)`
2. Or document that both types use the same calculation (amount * totalHours)

---

### 5.5 Missing `monthlyFlatFee` in Staff Payroll Update

**File:** `src/api/organisationStaffApis.js` -> `UpdateTenantStaffPayroll`

**Issue:** The `monthlyFlatFee` field is displayed on the frontend when `paymentSchedule === "Monthly"` but is NOT included in the PUT payload.

**Recommendation:** Add `monthlyFlatFee` to the update payload schema if the backend supports it, or clarify if `basicPay` should be used instead for monthly staff.

---

### 5.6 `fixedBonus` Not Part of Staff Payroll Settings

**Issue:** The staff payroll settings (GET/PUT) don't include a `fixedBonus` field, but the payroll employee breakdown uses `fixedBonus` as a separate editable field. The PayRollModal treats it as a special `otherPays` entry with type `"weekly bonus"`.

**Recommendation:** Either:
1. Add `fixedBonus` as a dedicated field on the staff payroll record
2. OR standardize that the first `otherPays` entry of type `"weekly bonus"` or `"fixed bonus"` serves as the fixed bonus

---

## 6. Hardcoded Mock Data Locations

These are all places that currently use hardcoded/mock data and need API integration:

| File | What's Hardcoded | Required Endpoint |
|------|-------------------|-------------------|
| `src/Pages/Payroll/Payroll/Payroll.jsx` (lines 13-78) | Payroll records table (8 records) | GET `/payroll-records/tenant/{tenantId}` |
| `src/Pages/Payroll/Payroll/Payroll.jsx` (lines 99-154) | `handleSavePayroll` uses `setTimeout` simulation | POST `/payroll-records` |
| `src/Pages/Payroll/Payroll/ViewBreakDown.jsx` (lines 32-172) | Employee breakdown data (8 employees) | GET `/payroll-records/{id}` |
| `src/Pages/Payroll/Payroll/ViewBreakDown.jsx` (line 317-326) | `handleSaveAllChanges` uses `console.log` + `alert` | PUT `/payroll-records/{id}` |
| `src/Pages/Payroll/Payroll/ViewBreakDown.jsx` (line 328-342) | `handleSaveRow` uses `console.log` + `alert` | PUT `/payroll-records/{id}/employees/{empId}` |
| `src/Components/ReusableModal/PayrollModal/PreviewPayrollModal.jsx` (line 22) | Uses `mockEmployees` for initial employee list | GET `/organization-staff/tenant/{tenantId}/payroll-eligible` |
| `src/Pages/Payroll/Payroll/ViewBreakDown.jsx` (line 12, 299) | Uses `mockEmployees` for AddStaffModal | GET `/organization-staff/tenant/{tenantId}/payroll-eligible` |
| `src/Data/mockData.js` (entire file) | 8 mock employees with hardcoded pay data | Should be replaced by API data |
| `src/Pages/Organisation/StaffAndTeams/StaffSingleTabs/Payroll.jsx` (lines 10-67) | Payroll history table (8 records) | GET `/payroll-records/staff/{tenantStaffId}` |

---

## 7. Frontend File Reference

| Category | File Path | Purpose |
|----------|-----------|---------|
| **API - Payroll Settings** | `src/api/payrollApi.js` | Compensation Types, Income Items, Deductions, Payroll Cycles |
| **API - Staff Payroll** | `src/api/organisationStaffApis.js` | Staff payroll CRUD, staff creation with payroll |
| **Page - Payroll List** | `src/Pages/Payroll/Payroll/Payroll.jsx` | Main payroll records page (NEEDS API) |
| **Page - Payroll Breakdown** | `src/Pages/Payroll/Payroll/ViewBreakDown.jsx` | Employee breakdown page (NEEDS API) |
| **Page - Payroll Settings** | `src/Pages/Payroll/PayrollSetting/PayrollSettings.jsx` | Settings tabs container |
| **Page - Payment Schedules** | `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/EmployeePaymentSchedules.jsx` | Compensation types (INTEGRATED) |
| **Page - Income Items** | `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/IncomeItems.jsx` | Income items CRUD (INTEGRATED) |
| **Page - Deductions** | `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/Deductions.jsx` | Deductions CRUD (INTEGRATED) |
| **Page - Payroll Cycles** | `src/Pages/Payroll/PayrollSetting/PayrollSettingsSubs/PayrollCycles.jsx` | Payroll cycles CRUD (INTEGRATED) |
| **Page - Staff Payroll Tab** | `src/Pages/Organisation/StaffAndTeams/StaffSingleTabs/Payroll.jsx` | Staff-level payroll settings + history (PARTIALLY INTEGRATED) |
| **Modal - New Payroll** | `src/Components/ReusableModal/PayrollModal/NewPayrollModal.jsx` | Create payroll with date range |
| **Modal - Preview Payroll** | `src/Components/ReusableModal/PayrollModal/PreviewPayrollModal.jsx` | Preview/assign employees (NEEDS API) |
| **Modal - Staff Payroll Edit** | `src/Components/ReusableModal/OrganizationModal/PayRollModal.jsx` | Edit staff payroll settings (INTEGRATED) |
| **Component - Employee Row** | `src/Components/ReusableModal/PayrollModal/EmployeeRow.jsx` | Expandable row with income/deduction editing |
| **Mock Data** | `src/Data/mockData.js` | Mock employees (TO BE REMOVED) |
