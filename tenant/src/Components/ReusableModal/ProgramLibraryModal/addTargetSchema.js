/**
 * @fileoverview Yup validation schema and mastery option config for the Add/Edit Target form.
 */
import * as yup from "yup";

export const addTargetSchema = yup.object().shape({
  teachingProcedure: yup.string().required("Teaching Procedure is required"),
  teachingOthers: yup.string().when("teachingProcedure", {
    is: "Other (specify)",
    then: (s) => s.required("Others is required when Other is selected"),
  }),
  promptingStrategy: yup.array().of(yup.string()).optional(),
  promptOthers: yup.string().when("promptingStrategy", {
    is: (val) => val && val.includes("Other (specify)"),
    then: (s) => s.required("Others is required when Other is selected"),
  }),
  dataCollectionType: yup.string().required("Data Collection Type is required"),
  percentageCorrectTrialSession: yup
    .number()
    .typeError("Must be a valid number")
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .when("dataCollectionType", {
      is: "Percentage Correct",
      then: (s) => s.required("Number of trials is required"),
    }),
  trialOrOpportunitiesSession: yup
    .number()
    .typeError("Must be a valid number")
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .when("dataCollectionType", {
      is: "Trials/Opportunities",
      then: (s) => s.required("Number of trials is required"),
    }),
  taskSteps: yup.array().when("dataCollectionType", {
    is: "Task Analysis",
    then: (s) => s.of(yup.string().required("Task step is required")),
  }),
  baselineDataRequired: yup.boolean().optional(),
  masteryCriteria: yup.object().nullable(),
  statusAndAdmin: yup.string().required("Initial Status is required"),
  note: yup.string().optional(),
  attachment: yup.mixed(),
});

export const MASTERY_OPTION_SLOTS = {
  "Percentage Accuracy": { percentage: "optionOne", percentageOf: "optionTwo", average: "optionThree" },
  "Trials Correct": { consecutive: "optionOne", percentageOf: "optionTwo" },
  "Independent Responses": { consecutive: "optionOne", percentageOf: "optionTwo" },
  "Frequency Count": { greaterThan: "optionOne" },
  "Rate": { greaterThan: "optionOne" },
  "Duration": { duration: "optionOne" },
  "Latency": { latency: "optionOne" },
  "Percentage of Steps Independent": { percentageSteps: "optionOne", allSteps: "optionTwo" },
  "Full Task Completion": { completion: "optionOne" },
};

// Which criteria value fields belong to each metric+option. The mastery inputs
// share form field names across the radio options of a metric, so without this
// scoping a value typed for one option leaks into the saved criteria of another
// (cross-contamination). Keys map to the unchanged backend shape:
//   value          ← customRecurrenceDay
//   sessions       ← consecutiveSessions
//   totalSessions  ← totalSessions
//   sessionCount   ← sessionCount
//   unit           ← customRecurrencePosition
export const OPTION_CRITERIA_FIELDS = {
  "Percentage Accuracy": {
    percentage: ["value", "sessions"],
    percentageOf: ["value", "totalSessions", "sessionCount"],
    average: ["value", "sessionCount"],
  },
  "Trials Correct": {
    consecutive: ["value", "sessions"],
    percentageOf: ["value", "totalSessions", "sessionCount"],
  },
  "Independent Responses": {
    consecutive: ["sessions"],
    percentageOf: ["totalSessions", "sessionCount"],
  },
  "Frequency Count": { greaterThan: ["value", "sessions"] },
  "Rate": { greaterThan: ["value", "sessions"] },
  "Duration": { duration: ["value", "unit", "sessions"] },
  "Latency": { latency: ["value", "unit", "sessions"] },
  "Percentage of Steps Independent": {
    percentageSteps: ["value", "sessions"],
    allSteps: [],
  },
  "Full Task Completion": { completion: ["sessions"] },
};
