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

// Per metric+option, maps each criteria key in the (unchanged) backend shape to
// the UNIQUE react-hook-form field name used by that option's input. Each option
// gets its own field names so the rows are independent — typing in one option
// doesn't affect another, edits load into the correct box, and no value leaks
// across options. The saved masteryCriteria still uses the original keys:
//   value | sessions | totalSessions | sessionCount | unit  (+ metric, optionX)
export const MASTERY_FIELDS = {
  "Percentage Accuracy": {
    percentage: { value: "mcPaPctValue", sessions: "mcPaPctSessions" },
    percentageOf: { value: "mcPaPofValue", totalSessions: "mcPaPofTotal", sessionCount: "mcPaPofCount" },
    average: { value: "mcPaAvgValue", sessionCount: "mcPaAvgCount" },
  },
  "Trials Correct": {
    consecutive: { value: "mcTcConValue", sessions: "mcTcConSessions" },
    percentageOf: { value: "mcTcPofValue", totalSessions: "mcTcPofTotal", sessionCount: "mcTcPofCount" },
  },
  "Independent Responses": {
    consecutive: { sessions: "mcIrConSessions" },
    percentageOf: { totalSessions: "mcIrPofTotal", sessionCount: "mcIrPofCount" },
  },
  "Frequency Count": { greaterThan: { value: "mcFcGtValue", sessions: "mcFcGtSessions" } },
  "Rate": { greaterThan: { value: "mcRtGtValue", sessions: "mcRtGtSessions" } },
  "Duration": { duration: { value: "mcDurValue", unit: "mcDurUnit", sessions: "mcDurSessions" } },
  "Latency": { latency: { value: "mcLatValue", unit: "mcLatUnit", sessions: "mcLatSessions" } },
  "Percentage of Steps Independent": {
    percentageSteps: { value: "mcPsiValue", sessions: "mcPsiSessions" },
    allSteps: {},
  },
  "Full Task Completion": { completion: { sessions: "mcFtcSessions" } },
};
