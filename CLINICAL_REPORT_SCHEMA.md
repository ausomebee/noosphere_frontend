# Clinical Report — field contract

Generated from the tenant frontend source. This is what the frontend sends; every
field name below is exactly the key used in the payload.

## Top-level payload

Sent by both save-draft and submit. `status` is `DRAFT` on save and set by the
submit action on publish.

```json
{
  "tenantId": "4e24e364-2514-46f5-a5b4-22b0d4b2c48d",
  "clientTenantId": "3e88c605-82b8-4eec-adc5-e54f36e462e4",
  "creatorId": "f98b96d6-849e-4b9e-99b7-d19255af8028",
  "approverId": "d85b3848-55da-40b0-8ded-f52f71adabd1",
  "title": "Initial Assessment Report",
  "status": "DRAFT",
  "sections": [
    {
      "section": "Client Information",
      "content": {
        "clientFullName": "\u2026"
      },
      "order": 0
    },
    {
      "section": "Consent & Signatures",
      "content": {
        "clinicianName": "\u2026"
      },
      "order": 1
    }
  ]
}
```

**Consent & Signatures is mandatory.** The frontend appends it automatically as the
last section if the clinician never added it, so every report has one. Submitting
is blocked until `clinicianSignature` is filled; saving a draft is not.

## Full example payload

Complete, realistic request body. The four array sections each show **two
entries** so the repeating shape is explicit — in practice a clinician can add
any number, including none (`[]`).

```json
{
  "tenantId": "4e24e364-2514-46f5-a5b4-22b0d4b2c48d",
  "clientTenantId": "3e88c605-82b8-4eec-adc5-e54f36e462e4",
  "creatorId": "f98b96d6-849e-4b9e-99b7-d19255af8028",
  "approverId": "d85b3848-55da-40b0-8ded-f52f71adabd1",
  "title": "Initial Assessment Report",
  "status": "DRAFT",
  "sections": [
    {
      "section": "Client Information",
      "content": {
        "clientFullName": "Sample client full name 1",
        "dateOfBirth": "Sample date of birth 1",
        "gender": "Sample gender 1",
        "clientBackground": "<p>Sample client background for entry 1.</p>",
        "diagnoses": [
          {
            "clientFullName": "Sample client full name 1",
            "dateOfBirth": "Sample date of birth 1",
            "gender": "Sample gender 1",
            "clientBackground": "<p>Sample client background for entry 1.</p>",
            "diagnoses": "Sample diagnoses 1",
            "intakeDate": "2026-07-14",
            "referralSource": "Sample referral source 1",
            "serviceLocation": "Sample service location 1",
            "otherClientInformation": "Sample other client information 1"
          },
          {
            "clientFullName": "Sample client full name 2",
            "dateOfBirth": "Sample date of birth 2",
            "gender": "Sample gender 2",
            "clientBackground": "<p>Sample client background for entry 2.</p>",
            "diagnoses": "Sample diagnoses 2",
            "intakeDate": "2026-08-02",
            "referralSource": "Sample referral source 2",
            "serviceLocation": "Sample service location 2",
            "otherClientInformation": "Sample other client information 2"
          }
        ],
        "id": "Sample id 1",
        "diagnosisName": "Sample diagnosis name 1",
        "diagnosisCode": "Sample diagnosis code 1",
        "diagnosisDescription": "<p>Sample diagnosis description for entry 1.</p>",
        "diagnosisDate": "2026-07-14",
        "diagnosedBy": "Sample diagnosed by 1",
        "primaryDiagnosis": "Sample primary diagnosis 1",
        "intakeDate": "2026-07-14",
        "referralSource": "Sample referral source 1",
        "serviceLocation": "Sample service location 1",
        "otherClientInformation": "Sample other client information 1"
      },
      "order": 0
    },
    {
      "section": "Assessments",
      "content": [
        {
          "id": "Sample id 1",
          "category": "Sample category 1",
          "type": "Sample type 1",
          "customType": "Sample custom type 1",
          "methodsUsed": [
            "item-one",
            "item-two"
          ],
          "methodNotes": "<p>Sample method notes for entry 1.</p>",
          "date": "2026-07-14",
          "administeredBy": "Sample administered by 1",
          "summaryFindings": "<p>Sample summary findings for entry 1.</p>",
          "strengths": "Sample strengths 1",
          "deficits": "Sample deficits 1",
          "supportingDocuments": "Sample supporting documents 1",
          "clinicalInterpretation": "<p>Sample clinical interpretation for entry 1.</p>"
        },
        {
          "id": "Sample id 2",
          "category": "Sample category 2",
          "type": "Sample type 2",
          "customType": "Sample custom type 2",
          "methodsUsed": [
            "item-one",
            "item-two"
          ],
          "methodNotes": "<p>Sample method notes for entry 2.</p>",
          "date": "2026-08-02",
          "administeredBy": "Sample administered by 2",
          "summaryFindings": "<p>Sample summary findings for entry 2.</p>",
          "strengths": "Sample strengths 2",
          "deficits": "Sample deficits 2",
          "supportingDocuments": "Sample supporting documents 2",
          "clinicalInterpretation": "<p>Sample clinical interpretation for entry 2.</p>"
        }
      ],
      "order": 1
    },
    {
      "section": "Target Behaviours",
      "content": [
        {
          "id": "Sample id 1",
          "name": "Sample name 1",
          "category": "Sample category 1",
          "categoryOther": "Sample category other 1",
          "operationalDefinition": "Sample operational definition 1",
          "direction": "increase",
          "functionOfBehavior": "attention",
          "functionOther": "attention",
          "antecedentConsequence": "Sample antecedent consequence 1",
          "baselineDescription": "<p>Sample baseline description for entry 1.</p>",
          "measurementMethod": "Sample measurement method 1",
          "measurementMethodOther": "Sample measurement method other 1",
          "graphReference": "Sample graph reference 1",
          "settingsContext": "home",
          "settingsContextOther": "home",
          "priority": "high"
        },
        {
          "id": "Sample id 2",
          "name": "Sample name 2",
          "category": "Sample category 2",
          "categoryOther": "Sample category other 2",
          "operationalDefinition": "Sample operational definition 2",
          "direction": "decrease",
          "functionOfBehavior": "escape",
          "functionOther": "escape",
          "antecedentConsequence": "Sample antecedent consequence 2",
          "baselineDescription": "<p>Sample baseline description for entry 2.</p>",
          "measurementMethod": "Sample measurement method 2",
          "measurementMethodOther": "Sample measurement method other 2",
          "graphReference": "Sample graph reference 2",
          "settingsContext": "school",
          "settingsContextOther": "school",
          "priority": "medium"
        }
      ],
      "order": 2
    },
    {
      "section": "Behaviour Strategies",
      "content": [
        {
          "id": "Sample id 1",
          "targetBehaviors": [
            "item-one",
            "item-two"
          ],
          "strategyName": "antecedent",
          "strategyType": "antecedent",
          "customStrategyType": "antecedent",
          "functionAddressed": "attention",
          "replacementBehavior": "Sample replacement behavior 1",
          "strategyDescription": "antecedent",
          "whenToUse": "Sample when to use 1",
          "responsibleStaff": "rbt",
          "fidelityRequirements": "prompt-hierarchy",
          "customFidelityRequirement": "prompt-hierarchy",
          "dataCollected": "frequency",
          "customDataCollected": "frequency"
        },
        {
          "id": "Sample id 2",
          "targetBehaviors": [
            "item-one",
            "item-two"
          ],
          "strategyName": "teaching",
          "strategyType": "teaching",
          "customStrategyType": "teaching",
          "functionAddressed": "escape",
          "replacementBehavior": "Sample replacement behavior 2",
          "strategyDescription": "teaching",
          "whenToUse": "Sample when to use 2",
          "responsibleStaff": "bcba",
          "fidelityRequirements": "immediate-reinforcement",
          "customFidelityRequirement": "immediate-reinforcement",
          "dataCollected": "duration",
          "customDataCollected": "duration"
        }
      ],
      "order": 3
    },
    {
      "section": "Goals & Targets",
      "content": {
        "id": "Sample id 1",
        "targetBehaviors": "skill-acquisition",
        "goalStatement": "<p>Sample goal statement for entry 1.</p>",
        "goalDomain": "communication",
        "goalDomainOther": "communication",
        "baselineLevel": "Sample baseline level 1",
        "goalTimeframe": "short-term",
        "measurementMethod": "frequency",
        "measurementMethodOther": "frequency",
        "targets": "skill-acquisition",
        "targetStatement": "skill-acquisition",
        "targetType": "skill-acquisition",
        "baselineLevelReference": "Sample baseline level reference 1",
        "masteryCriteria": "Sample mastery criteria 1",
        "reviewTimeframe": "weekly",
        "targetStatus": "skill-acquisition",
        "discontinuationCriteria": "Sample discontinuation criteria 1"
      },
      "order": 4
    },
    {
      "section": "Monitoring Data",
      "content": {
        "dataCollectionOverview": "rbt",
        "behaviorsTargetsMonitored": "Sample behaviors targets monitored 1",
        "measurementMethods": "frequency",
        "measurementMethodsOther": "frequency",
        "dataCollectionFrequency": "every-session",
        "whoCollectsData": "Sample who collects data 1",
        "dataRecordingTools": "electronic-system",
        "dataRecordingToolsOther": "electronic-system",
        "dataReviewFrequency": "weekly",
        "dataStorageLocation": "practice-management",
        "dataStorageLocationOther": "practice-management",
        "progressReportingMethods": "session-notes",
        "supportingDataAttachments": "Sample supporting data attachments 1",
        "supportingDataDescription": "<p>Sample supporting data description for entry 1.</p>",
        "dataInterpretation": "<p>Sample data interpretation for entry 1.</p>",
        "dataLimitationsNotes": "<p>Sample data limitations notes for entry 1.</p>"
      },
      "order": 5
    },
    {
      "section": "Implementation Notes",
      "content": {
        "implementationOverview": "Sample implementation overview 1",
        "serviceSettings": "home",
        "sessionStructure": "Sample session structure 1",
        "staffRolesResponsibilities": "Sample staff roles responsibilities 1",
        "caregiverInvolvement": "not-involved",
        "caregiverTrainingDetails": "not-involved",
        "materialsRequired": "Sample materials required 1",
        "environmentalConsiderations": "Sample environmental considerations 1",
        "coordinationWithProviders": "none",
        "coordinationWithProvidersOther": "none",
        "implementationConstraints": "Sample implementation constraints 1",
        "fidelityMonitoringInPlace": "no",
        "fidelityMonitoringNotes": "no"
      },
      "order": 6
    },
    {
      "section": "Crisis & Safety",
      "content": [
        {
          "id": "Sample id 1",
          "crisisType": "aggression-toward-others",
          "crisisTypeOther": "aggression-toward-others",
          "descriptionOfCrisisBehavior": "<p>Sample description of crisis behavior for entry 1.</p>",
          "earlyWarningSigns": "Sample early warning signs 1",
          "knownTriggers": "Sample known triggers 1",
          "riskLevel": "low",
          "riskLevelDescription": "low",
          "crisisActivationCriteria": "aggression-toward-others",
          "immediateResponseProcedures": "<p>Sample immediate response procedures for entry 1.</p>",
          "deescalationTechniques": "verbal-redirection",
          "deescalationTechniquesOther": "verbal-redirection",
          "physicalInterventionPermitted": "no",
          "physicalInterventionDescription": "no",
          "staffAuthorizedToIntervene": "rbt",
          "staffAuthorizedOther": "rbt",
          "environmentalSafetyActions": "Sample environmental safety actions 1",
          "emergencyServicesInvolvement": "not-required",
          "emergencyContactInstructions": "not-required",
          "postCrisisProcedure": "Sample post crisis procedure 1",
          "incidentDocumentationRequired": "yes",
          "reviewSchedule": "after-each-incident",
          "additionalNotes": "<p>Sample additional notes for entry 1.</p>"
        },
        {
          "id": "Sample id 2",
          "crisisType": "self-injurious-behavior",
          "crisisTypeOther": "self-injurious-behavior",
          "descriptionOfCrisisBehavior": "<p>Sample description of crisis behavior for entry 2.</p>",
          "earlyWarningSigns": "Sample early warning signs 2",
          "knownTriggers": "Sample known triggers 2",
          "riskLevel": "moderate",
          "riskLevelDescription": "moderate",
          "crisisActivationCriteria": "self-injurious-behavior",
          "immediateResponseProcedures": "<p>Sample immediate response procedures for entry 2.</p>",
          "deescalationTechniques": "visual-supports",
          "deescalationTechniquesOther": "visual-supports",
          "physicalInterventionPermitted": "yes-non-restrictive",
          "physicalInterventionDescription": "yes-non-restrictive",
          "staffAuthorizedToIntervene": "bcba",
          "staffAuthorizedOther": "bcba",
          "environmentalSafetyActions": "Sample environmental safety actions 2",
          "emergencyServicesInvolvement": "if-imminent-danger",
          "emergencyContactInstructions": "if-imminent-danger",
          "postCrisisProcedure": "Sample post crisis procedure 2",
          "incidentDocumentationRequired": "no",
          "reviewSchedule": "monthly",
          "additionalNotes": "<p>Sample additional notes for entry 2.</p>"
        }
      ],
      "order": 7
    },
    {
      "section": "Generalization",
      "content": {
        "targetBehaviors": [
          "item-one",
          "item-two"
        ],
        "generalizationApproach": "across-settings",
        "generalizationApproachOther": "across-settings",
        "generalizationDescription": "across-settings",
        "settingsForGeneralization": "Sample settings for generalization 1",
        "settingsForGeneralizationOther": "Sample settings for generalization other 1",
        "peopleInvolvedInGeneralization": "rbt",
        "peopleInvolvedOther": "rbt",
        "materialsVariationPlan": "Sample materials variation plan 1",
        "maintenancePlan": "each-session",
        "maintenanceSchedule": "each-session",
        "fadingPlan": "Sample fading plan 1",
        "criteriaForMaintenanceSuccess": "Sample criteria for maintenance success 1",
        "generalizationMaintenanceNotes": "across-settings"
      },
      "order": 8
    },
    {
      "section": "Review",
      "content": {
        "reviewType": "routine-review",
        "reviewDate": "routine-review",
        "reviewedBy": "routine-review",
        "summaryOfProgress": "<p>Sample summary of progress for entry 1.</p>",
        "progressDetermination": "making-expected-progress",
        "decisionOutcome": "continue-services",
        "rationaleForDecision": "Sample rationale for decision 1",
        "changesRecommended": "Sample changes recommended 1",
        "nextReviewTimeline": "monthly",
        "serviceRecommendations": "Sample service recommendations 1",
        "id": "Sample id 1",
        "serviceRecommendation": "Sample service recommendation 1",
        "descriptionOfServices": "<p>Sample description of services for entry 1.</p>",
        "numberOfHoursRequested": "Sample number of hours requested 1",
        "durationOfService": "Sample duration of service 1",
        "location": "home",
        "locationOther": "home",
        "items": [
          {
            "id": "Sample id 1",
            "serviceRecommendation": "Sample service recommendation 1",
            "descriptionOfServices": "<p>Sample description of services for entry 1.</p>",
            "numberOfHoursRequested": "Sample number of hours requested 1",
            "durationOfService": "Sample duration of service 1",
            "location": "home",
            "locationOther": "home",
            "serviceRecommendations": "Sample service recommendations 1"
          },
          {
            "id": "Sample id 2",
            "serviceRecommendation": "Sample service recommendation 2",
            "descriptionOfServices": "<p>Sample description of services for entry 2.</p>",
            "numberOfHoursRequested": "Sample number of hours requested 2",
            "durationOfService": "Sample duration of service 2",
            "location": "clinic",
            "locationOther": "clinic",
            "serviceRecommendations": "Sample service recommendations 2"
          }
        ]
      },
      "order": 9
    },
    {
      "section": "Discharge",
      "content": {
        "dischargeReason": "Sample discharge reason 1",
        "dischargeDate": "2026-07-14",
        "progressCompared": "Sample progress compared 1",
        "dischargeCriteria": "Sample discharge criteria 1",
        "dischargeSummary": "<p>Sample discharge summary for entry 1.</p>",
        "postDischargeRecommendations": "Sample post discharge recommendations 1",
        "transitionSupports": "Sample transition supports 1",
        "supportingDocuments": "Sample supporting documents 1",
        "reviewNotes": "<p>Sample review notes for entry 1.</p>"
      },
      "order": 10
    },
    {
      "section": "Consent & Signatures",
      "content": {
        "consentStatement": "<p>Sample consent statement for entry 1.</p>",
        "servicesConsented": "Sample services consented 1",
        "consentLimitations": "Sample consent limitations 1",
        "clientGuardianName": "Sample client guardian name 1",
        "relationshipToClient": "self",
        "clientSignature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg\u2026",
        "clientSignatureDate": "2026-07-14",
        "clinicianName": "bcba",
        "clinicianRole": "bcba",
        "clinicianSignatureType": "bcba",
        "clinicianSignature": "bcba",
        "clinicianSignatureDate": "bcba",
        "consentNotes": "<p>Sample consent notes for entry 1.</p>"
      },
      "order": 11
    }
  ]
}
```

## Section containers

Four sections are **arrays of objects** — the clinician can add many entries. The
rest are single objects.

| sectionData key | Section title | Container |
|---|---|---|
| `assessments` | Assessments | **array of objects** |
| `behaviourStrategies` | Behaviour Strategies | **array of objects** |
| `clientInformation` | Client Information | object |
| `consentSignatures` | Consent & Signatures | object |
| `crisisSafety` | Crisis & Safety | **array of objects** |
| `discharge` | Discharge | object |
| `generalization` | Generalization | object |
| `goalsTargets` | Goals & Targets | object |
| `implementationNotes` | Implementation Notes | object |
| `monitoringData` | Monitoring Data | object |
| `review` | Review | object |
| `targetBehaviours` | Target Behaviours | **array of objects** |

## Assessments

`sectionData.assessments` — **array of objects**, one per entry

| Field | Label | Type | Required |
|---|---|---|---|
| `id` | Id | string | no |
| `category` | Category | string | **yes** |
| `type` | Type | string | **yes** |
| `customType` | Custom Type | string | **yes** |
| `methodsUsed` | Methods Used | string[] | no |
| `methodNotes` | Method Notes | string (rich text / HTML) | no |
| `date` | Date | string (ISO date) | no |
| `administeredBy` | Administered By | string | no |
| `summaryFindings` | Summary Findings | string (rich text / HTML) | no |
| `strengths` | Strengths | string | no |
| `deficits` | Deficits | string | no |
| `supportingDocuments` | Supporting Documents | string | no |
| `clinicalInterpretation` | Clinical Interpretation | string (rich text / HTML) | no |

## Behaviour Strategies

`sectionData.behaviourStrategies` — **array of objects**, one per entry

| Field | Label | Type | Required |
|---|---|---|---|
| `id` | Id | string | no |
| `targetBehaviors` | Target Behaviors | string[] | **yes** |
| `strategyName` | Strategy Name | string | **yes** |
| `strategyType` | Strategy Type | string | no |
| `customStrategyType` | Custom Strategy Type | string | **yes** |
| `functionAddressed` | Function Addressed | string | **yes** |
| `replacementBehavior` | Replacement Behavior | string | no |
| `strategyDescription` | Strategy Description | string (rich text / HTML) | no |
| `whenToUse` | When To Use | string | no |
| `responsibleStaff` | Responsible Staff | string[] | no |
| `fidelityRequirements` | Fidelity Requirements | string | no |
| `customFidelityRequirement` | Custom Fidelity Requirement | string | **yes** |
| `dataCollected` | Data Collected | string[] | no |
| `customDataCollected` | Custom Data Collected | string[] | **yes** |

**Allowed values**

- *Strategy* — `antecedent`, `teaching`, `differential`, `extinction`, `response-interruption`, `prompting`, `environmental`, `visual`, `replacement`, `crisis`, `other`
- *Function* — `attention`, `escape`, `tangible`, `sensory`, `multiple`
- *Staff* — `rbt`, `bcba`, `caregiver`, `teacher`
- *Fidelity* — `prompt-hierarchy`, `immediate-reinforcement`, `neutral-affect`, `specified-materials`, `collect-data`, `safety-precautions`, `other`
- *Data  Collected* — `frequency`, `duration`, `rate`, `latency`, `percentage`, `trials`, `task-analysis`, `other`

## Client Information

`sectionData.clientInformation` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `clientFullName` | Client Full Name | string | no |
| `dateOfBirth` | Date Of Birth | string | no |
| `gender` | Gender | string | no |
| `clientBackground` | Client Background | string (rich text / HTML) | no |
| `diagnoses` | Diagnoses | string | no |
| `id` | Id | string | no |
| `diagnosisName` | Diagnosis Name | string | **yes** |
| `diagnosisCode` | Diagnosis Code | string | **yes** |
| `diagnosisDescription` | Diagnosis Description | string (rich text / HTML) | no |
| `diagnosisDate` | Diagnosis Date | string (ISO date) | **yes** |
| `diagnosedBy` | Diagnosed By | string | **yes** |
| `primaryDiagnosis` | Primary Diagnosis | string | **yes** |
| `intakeDate` | Intake Date | string (ISO date) | no |
| `referralSource` | Referral Source | string | no |
| `serviceLocation` | Service Location | string | no |
| `otherClientInformation` | Other Client Information | string | no |

Nested repeatable entry (each element of the array inside this section):

| Field | Label | Type | Required |
|---|---|---|---|
| `clientFullName` | Client Full Name | string | no |
| `dateOfBirth` | Date Of Birth | string | no |
| `gender` | Gender | string | no |
| `clientBackground` | Client Background | string (rich text / HTML) | no |
| `diagnoses` | Diagnoses | string | no |
| `intakeDate` | Intake Date | string (ISO date) | no |
| `referralSource` | Referral Source | string | no |
| `serviceLocation` | Service Location | string | no |
| `otherClientInformation` | Other Client Information | string | no |
| `clientFullName` | Client Full Name | string | no |
| `dateOfBirth` | Date Of Birth | string | no |
| `gender` | Gender | string | no |

## Consent & Signatures

`sectionData.consentSignatures` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `consentStatement` | Consent Statement | string (rich text / HTML) | no |
| `servicesConsented` | Services Consented | string | no |
| `consentLimitations` | Consent Limitations | string | no |
| `clientGuardianName` | Client Guardian Name | string | **yes** |
| `relationshipToClient` | Relationship To Client | string | **yes** |
| `clientSignature` | Client Signature | string (base64 data URI or plain text) | no |
| `clientSignatureDate` | Client Signature Date | string (ISO date) | no |
| `clinicianName` | Clinician Name | string | **yes** |
| `clinicianRole` | Clinician Role | string | **yes** |
| `clinicianSignatureType` | Clinician Signature Type | string | **yes** |
| `clinicianSignature` | Clinician Signature | string (base64 data URI or plain text) | no |
| `clinicianSignatureDate` | Clinician Signature Date | string (ISO date) | no |
| `consentNotes` | Consent Notes | string (rich text / HTML) | no |

**Allowed values**

- *Relationship* — `self`, `parent`, `legal-guardian`, `caregiver`, `foster-parent`, `authorized-rep`, `other`
- *Clinician  Role* — `bcba`, `assistant-bcba`, `clinical-supervisor`, `other-clinician`

## Crisis & Safety

`sectionData.crisisSafety` — **array of objects**, one per entry

| Field | Label | Type | Required |
|---|---|---|---|
| `id` | Id | string | no |
| `crisisType` | Crisis Type | string | no |
| `crisisTypeOther` | Crisis Type Other | string | **yes** |
| `descriptionOfCrisisBehavior` | Description Of Crisis Behavior | string (rich text / HTML) | no |
| `earlyWarningSigns` | Early Warning Signs | string | no |
| `knownTriggers` | Known Triggers | string | no |
| `riskLevel` | Risk Level | string | **yes** |
| `riskLevelDescription` | Risk Level Description | string (rich text / HTML) | no |
| `crisisActivationCriteria` | Crisis Activation Criteria | string | no |
| `immediateResponseProcedures` | Immediate Response Procedures | string (rich text / HTML) | no |
| `deescalationTechniques` | Deescalation Techniques | string[] | no |
| `deescalationTechniquesOther` | Deescalation Techniques Other | string | **yes** |
| `physicalInterventionPermitted` | Physical Intervention Permitted | string | **yes** |
| `physicalInterventionDescription` | Physical Intervention Description | string (rich text / HTML) | no |
| `staffAuthorizedToIntervene` | Staff Authorized To Intervene | string | no |
| `staffAuthorizedOther` | Staff Authorized Other | string | **yes** |
| `environmentalSafetyActions` | Environmental Safety Actions | string | no |
| `emergencyServicesInvolvement` | Emergency Services Involvement | string | **yes** |
| `emergencyContactInstructions` | Emergency Contact Instructions | string (rich text / HTML) | no |
| `postCrisisProcedure` | Post Crisis Procedure | string | no |
| `incidentDocumentationRequired` | Incident Documentation Required | string | **yes** |
| `reviewSchedule` | Review Schedule | string | **yes** |
| `additionalNotes` | Additional Notes | string (rich text / HTML) | no |

**Allowed values**

- *Crisis  Type* — `aggression-toward-others`, `self-injurious-behavior`, `property-destruction`, `elopement-wandering`, `severe-emotional-dysregulation`, `noncompliance-safety-risk`, `medical-emergency-behavior`, `other`
- *Risk  Level* — `low`, `moderate`, `high`, `severe`
- *Deescalation  Techniques* — `verbal-redirection`, `visual-supports`, `demand-reduction`, `planned-ignoring`, `environmental-modification`, `calming-strategies`, `differential-reinforcement`, `time-away`, `other`
- *Physical  Intervention* — `no`, `yes-non-restrictive`, `yes-restrictive-approved`
- *Staff  Authorized* — `rbt`, `bcba`, `clinical-supervisor`, `caregiver-parent`, `school-staff`, `other`
- *Emergency  Services* — `not-required`, `if-imminent-danger`, `if-deescalation-fails`, `clinically-indicated`
- *Review  Schedule* — `after-each-incident`, `monthly`, `quarterly`, `as-needed`
- *Incident  Documentation* — `yes`, `no`

## Discharge

`sectionData.discharge` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `dischargeReason` | Discharge Reason | string | **yes** |
| `dischargeDate` | Discharge Date | string (ISO date) | **yes** |
| `progressCompared` | Progress Compared | string | no |
| `dischargeCriteria` | Discharge Criteria | string | no |
| `dischargeSummary` | Discharge Summary | string (rich text / HTML) | no |
| `postDischargeRecommendations` | Post Discharge Recommendations | string | no |
| `transitionSupports` | Transition Supports | string | no |
| `supportingDocuments` | Supporting Documents | string | no |
| `reviewNotes` | Review Notes | string (rich text / HTML) | no |

## Generalization

`sectionData.generalization` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `targetBehaviors` | Target Behaviors | string[] | no |
| `generalizationApproach` | Generalization Approach | string | no |
| `generalizationApproachOther` | Generalization Approach Other | string | **yes** |
| `generalizationDescription` | Generalization Description | string (rich text / HTML) | no |
| `settingsForGeneralization` | Settings For Generalization | string | no |
| `settingsForGeneralizationOther` | Settings For Generalization Other | string | **yes** |
| `peopleInvolvedInGeneralization` | People Involved In Generalization | string | no |
| `peopleInvolvedOther` | People Involved Other | string | **yes** |
| `materialsVariationPlan` | Materials Variation Plan | string | no |
| `maintenancePlan` | Maintenance Plan | string | no |
| `maintenanceSchedule` | Maintenance Schedule | string | **yes** |
| `fadingPlan` | Fading Plan | string | no |
| `criteriaForMaintenanceSuccess` | Criteria For Maintenance Success | string | no |
| `generalizationMaintenanceNotes` | Generalization Maintenance Notes | string (rich text / HTML) | no |

**Allowed values**

- *Generalization  Approach* — `across-settings`, `across-people`, `across-materials`, `across-repositories`, `across-time`, `natural-environment-teaching`, `community-based-practice`, `other`
- *Generalization  Settings* — `home`, `clinic`, `school`, `community`, `vocational-setting`, `telehealth`, `other`
- *People  Involved* — `rbt`, `bcba`, `caregiver-parent`, `teacher-school-staff`, `peers`, `other`
- *Maintenance  Schedule* — `each-session`, `weekly`, `bi-weekly`, `monthly`, `quarterly`, `at-discharge`, `clinically-indicated`

## Goals & Targets

`sectionData.goalsTargets` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `id` | Id | string | no |
| `targetBehaviors` | Target Behaviors | string[] | no |
| `goalStatement` | Goal Statement | string (rich text / HTML) | no |
| `goalDomain` | Goal Domain | string | no |
| `goalDomainOther` | Goal Domain Other | string | no |
| `baselineLevel` | Baseline Level | string | no |
| `goalTimeframe` | Goal Timeframe | string | no |
| `measurementMethod` | Measurement Method | string | **yes** |
| `measurementMethodOther` | Measurement Method Other | string | **yes** |
| `targets` | Targets | string | no |
| `id` | Id | string | no |
| `targetStatement` | Target Statement | string (rich text / HTML) | **yes** |
| `targetType` | Target Type | string | **yes** |
| `baselineLevelReference` | Baseline Level Reference | string | no |
| `masteryCriteria` | Mastery Criteria | string | **yes** |
| `measurementMethod` | Measurement Method | string | **yes** |
| `measurementMethodOther` | Measurement Method Other | string | **yes** |
| `reviewTimeframe` | Review Timeframe | string | **yes** |
| `targetStatus` | Target Status | string | **yes** |
| `discontinuationCriteria` | Discontinuation Criteria | string | no |
| `id` | Id | string | no |
| `targetStatement` | Target Statement | string (rich text / HTML) | **yes** |
| `targetType` | Target Type | string | **yes** |
| `baselineLevelReference` | Baseline Level Reference | string | no |
| `masteryCriteria` | Mastery Criteria | string | **yes** |
| `measurementMethod` | Measurement Method | string | **yes** |
| `measurementMethodOther` | Measurement Method Other | string | **yes** |
| `reviewTimeframe` | Review Timeframe | string | **yes** |
| `targetStatus` | Target Status | string | **yes** |
| `discontinuationCriteria` | Discontinuation Criteria | string | no |

**Allowed values**

- *Goal  Domain* — `communication`, `social-skills`, `adaptive-daily-living`, `academic-learning`, `play-leisure`, `motor-skills`, `behaviour-reduction`, `self-management`, `safety-skills`, `other`
- *Goal  Timeframe* — `short-term`, `medium-term`, `long-term`, `ongoing`
- *Measurement  Method* — `frequency`, `duration`, `rate`, `latency`, `percentage-correct`, `trials-opportunities`, `task-analysis`, `other`
- *Target  Type* — `skill-acquisition`, `behaviour-reduction`, `generalization`, `maintenance`
- *Review  Timeframe* — `weekly`, `bi-weekly`, `monthly`, `quarterly`
- *Target  Status* — `not-introduced`, `in-progress`, `mastered`, `maintaining`, `discontinued`, `on-hold`

## Implementation Notes

`sectionData.implementationNotes` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `implementationOverview` | Implementation Overview | string | no |
| `serviceSettings` | Service Settings | string | no |
| `sessionStructure` | Session Structure | string | no |
| `staffRolesResponsibilities` | Staff Roles Responsibilities | string | no |
| `caregiverInvolvement` | Caregiver Involvement | string | **yes** |
| `caregiverTrainingDetails` | Caregiver Training Details | string | no |
| `materialsRequired` | Materials Required | string | no |
| `environmentalConsiderations` | Environmental Considerations | string | no |
| `coordinationWithProviders` | Coordination With Providers | string | no |
| `coordinationWithProvidersOther` | Coordination With Providers Other | string | **yes** |
| `implementationConstraints` | Implementation Constraints | string | no |
| `fidelityMonitoringInPlace` | Fidelity Monitoring In Place | string | **yes** |
| `fidelityMonitoringNotes` | Fidelity Monitoring Notes | string (rich text / HTML) | no |

**Allowed values**

- *Service  Setting* — `home`, `clinic`, `school`, `community`, `telehealth`, `multiple-settings`
- *Caregiver  Involvement* — `not-involved`, `observation-only`, `active-participation`, `primary-implementer`, `clinically-indicated`
- *Coordination* — `none`, `school-staff`, `speech-therapist`, `occupational-therapist`, `physical-therapist`, `medical-provider`, `other`
- *Fidelity  Monitoring* — `no`, `yes`

## Monitoring Data

`sectionData.monitoringData` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `dataCollectionOverview` | Data Collection Overview | string | no |
| `behaviorsTargetsMonitored` | Behaviors Targets Monitored | string | no |
| `measurementMethods` | Measurement Methods | string | no |
| `measurementMethodsOther` | Measurement Methods Other | string | **yes** |
| `dataCollectionFrequency` | Data Collection Frequency | string | **yes** |
| `whoCollectsData` | Who Collects Data | string | no |
| `dataRecordingTools` | Data Recording Tools | string | no |
| `dataRecordingToolsOther` | Data Recording Tools Other | string | **yes** |
| `dataReviewFrequency` | Data Review Frequency | string | **yes** |
| `dataStorageLocation` | Data Storage Location | string | no |
| `dataStorageLocationOther` | Data Storage Location Other | string | **yes** |
| `progressReportingMethods` | Progress Reporting Methods | string | no |
| `supportingDataAttachments` | Supporting Data Attachments | string | no |
| `supportingDataDescription` | Supporting Data Description | string (rich text / HTML) | no |
| `dataInterpretation` | Data Interpretation | string (rich text / HTML) | no |
| `dataLimitationsNotes` | Data Limitations Notes | string (rich text / HTML) | no |

**Allowed values**

- *Measurement  Methods* — `frequency`, `duration`, `rate`, `latency`, `percentage-correct`, `trials-opportunities`, `task-analysis`, `other`
- *Collection  Frequency* — `every-session`, `daily`, `weekly`, `per-opportunity`, `clinically-indicated`
- *Data  Collector* — `rbt`, `bcba`, `caregiver-parent`, `teacher-school-staff`, `multiple-parties`
- *Recording  Tools* — `electronic-system`, `paper-sheets`, `session-notes`, `behavior-logs`, `tally-counters`, `other`
- *Review  Frequency* — `weekly`, `bi-weekly`, `monthly`, `quarterly`
- *Storage  Location* — `practice-management`, `cloud-storage`, `paper-file`, `school-records`, `other`
- *Progress  Reporting* — `session-notes`, `graphs-visual`, `progress-reports`, `caregiver-updates`, `team-meetings`

## Review

`sectionData.review` — object

| Field | Label | Type | Required |
|---|---|---|---|
| `reviewType` | Review Type | string | no |
| `reviewDate` | Review Date | string (ISO date) | no |
| `reviewedBy` | Reviewed By | string | no |
| `summaryOfProgress` | Summary Of Progress | string (rich text / HTML) | no |
| `progressDetermination` | Progress Determination | string | no |
| `decisionOutcome` | Decision Outcome | string | no |
| `rationaleForDecision` | Rationale For Decision | string | no |
| `changesRecommended` | Changes Recommended | string | no |
| `nextReviewTimeline` | Next Review Timeline | string | no |
| `serviceRecommendations` | Service Recommendations | string | no |
| `id` | Id | string | no |
| `serviceRecommendation` | Service Recommendation | string | **yes** |
| `descriptionOfServices` | Description Of Services | string (rich text / HTML) | no |
| `numberOfHoursRequested` | Number Of Hours Requested | string | no |
| `durationOfService` | Duration Of Service | string | no |
| `location` | Location | string | no |
| `locationOther` | Location Other | string | **yes** |

Nested repeatable entry (each element of the array inside this section):

| Field | Label | Type | Required |
|---|---|---|---|
| `id` | Id | string | no |
| `serviceRecommendation` | Service Recommendation | string | **yes** |
| `descriptionOfServices` | Description Of Services | string (rich text / HTML) | no |
| `numberOfHoursRequested` | Number Of Hours Requested | string | no |
| `durationOfService` | Duration Of Service | string | no |
| `location` | Location | string | no |
| `locationOther` | Location Other | string | **yes** |
| `serviceRecommendations` | Service Recommendations | string | no |
| `serviceRecommendations` | Service Recommendations | string | no |
| `serviceRecommendations` | Service Recommendations | string | no |

**Allowed values**

- *Review  Type* — `routine-review`, `quarterly-review`, `annual-review`, `reauthorization-review`, `discharge-review`
- *Progress  Determination* — `making-expected-progress`, `making-partial-progress`, `minimal-progress`, `no-progress`, `regression-observed`
- *Decision  Outcome* — `continue-services`, `modify-treatment-plan`, `reduce-service-intensity`, `increase-service-intensity`, `initiate-discharge-planning`, `discontinue-services`
- *Next  Review  Timeline* — `monthly`, `quarterly`, `semi-annually`, `annually`, `not-applicable`
- *Location* — `home`, `clinic`, `school`, `community`, `vocational-setting`, `telehealth`, `other`

## Target Behaviours

`sectionData.targetBehaviours` — **array of objects**, one per entry

| Field | Label | Type | Required |
|---|---|---|---|
| `id` | Id | string | no |
| `name` | Name | string | **yes** |
| `category` | Category | string | **yes** |
| `categoryOther` | Category Other | string | **yes** |
| `operationalDefinition` | Operational Definition | string | **yes** |
| `direction` | Direction | string | **yes** |
| `functionOfBehavior` | Function Of Behavior | string | **yes** |
| `functionOther` | Function Other | string | **yes** |
| `antecedentConsequence` | Antecedent Consequence | string | no |
| `baselineDescription` | Baseline Description | string (rich text / HTML) | no |
| `measurementMethod` | Measurement Method | string | **yes** |
| `measurementMethodOther` | Measurement Method Other | string | **yes** |
| `graphReference` | Graph Reference | string | no |
| `settingsContext` | Settings Context | string | no |
| `settingsContextOther` | Settings Context Other | string | **yes** |
| `priority` | Priority | string | **yes** |

**Allowed values**

- *Function* — `attention`, `escape`, `tangible`, `sensory`, `multiple`, `unknown`, `other`
- *Direction* — `increase`, `decrease`
- *Settings* — `home`, `school`, `community`, `clinic`, `transitions`, `group-activities`, `one-on-one-instruction`, `other`
- *Priority* — `high`, `medium`, `low`