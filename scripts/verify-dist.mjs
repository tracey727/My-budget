import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const required = [
  "index.html",
  "app.js",
  "phase2-data-runtime.js",
  "phase2-subscriptions-savings-runtime.js",
  "dashboard-health-bridge.js",
  "review-followup-bridge.js",
  "income-plan-bridge.js",
  "debt-commitments-bridge.js",
  "safe-to-spend-bridge.js",
  "forecast-bridge.js",
  "household-continuity-bridge.js",
  "accessibility-bridge.js",
  "professional-bridge.js",
  "styles.css",
  "service-worker.js",
  "manifest.webmanifest",
];

const dist = resolve(process.cwd(), "dist");
const entries = await readdir(dist, { withFileTypes: true });
console.log("dist entries:", entries.map((entry) => entry.name).sort().join(", "));

for (const file of required) {
  const target = resolve(dist, file);
  try {
    await access(target, constants.R_OK);
    console.log(`artifact present: ${file}`);
  } catch {
    throw new Error(`required subscriber artifact missing: ${file}`);
  }
}

const [index, runtime, extendedRuntime, worker] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "phase2-data-runtime.js"), "utf8"),
  readFile(resolve(dist, "phase2-subscriptions-savings-runtime.js"), "utf8"),
  readFile(resolve(dist, "service-worker.js"), "utf8"),
]);

const dataRuntime = index.indexOf("/phase2-data-runtime.js");
const subscriptionsSavingsRuntime = index.indexOf("/phase2-subscriptions-savings-runtime.js");
const appRuntime = index.indexOf("/app.js");
const healthBridgeRuntime = index.indexOf("/dashboard-health-bridge.js");
const reviewFollowupRuntime = index.indexOf("/review-followup-bridge.js");
const incomePlanRuntime = index.indexOf("/income-plan-bridge.js");
const debtCommitmentsRuntime = index.indexOf("/debt-commitments-bridge.js");
const safeToSpendRuntime = index.indexOf("/safe-to-spend-bridge.js");
const forecastRuntime = index.indexOf("/forecast-bridge.js");
const householdContinuityRuntime = index.indexOf("/household-continuity-bridge.js");
const accessibilityRuntime = index.indexOf("/accessibility-bridge.js");
const professionalRuntime = index.indexOf("/professional-bridge.js");
if (dataRuntime < 0) throw new Error("built index.html no longer references /phase2-data-runtime.js");
if (subscriptionsSavingsRuntime < 0) throw new Error("built index.html no longer references /phase2-subscriptions-savings-runtime.js");
if (appRuntime < 0) throw new Error("built index.html no longer references the supported /app.js subscriber entry");
if (healthBridgeRuntime < 0) throw new Error("built index.html no longer references /dashboard-health-bridge.js");
if (reviewFollowupRuntime < 0) throw new Error("built index.html no longer references /review-followup-bridge.js");
if (incomePlanRuntime < 0) throw new Error("built index.html no longer references /income-plan-bridge.js");
if (debtCommitmentsRuntime < 0) throw new Error("built index.html no longer references /debt-commitments-bridge.js");
if (safeToSpendRuntime < 0) throw new Error("built index.html no longer references /safe-to-spend-bridge.js");
if (forecastRuntime < 0) throw new Error("built index.html no longer references /forecast-bridge.js");
if (householdContinuityRuntime < 0) throw new Error("built index.html no longer references /household-continuity-bridge.js");
if (accessibilityRuntime < 0) throw new Error("built index.html no longer references /accessibility-bridge.js");
if (professionalRuntime < 0) throw new Error("built index.html no longer references /professional-bridge.js");
if (!(dataRuntime < subscriptionsSavingsRuntime && subscriptionsSavingsRuntime < appRuntime && appRuntime < healthBridgeRuntime && healthBridgeRuntime < reviewFollowupRuntime && reviewFollowupRuntime < incomePlanRuntime && incomePlanRuntime < debtCommitmentsRuntime && debtCommitmentsRuntime < safeToSpendRuntime && safeToSpendRuntime < forecastRuntime && forecastRuntime < householdContinuityRuntime && householdContinuityRuntime < accessibilityRuntime && accessibilityRuntime < professionalRuntime)) {
  throw new Error("Phase 2 runtime order must be data runtime -> subscriptions/savings runtime -> app.js -> dashboard-health-bridge.js -> review-followup-bridge.js -> income-plan-bridge.js -> debt-commitments-bridge.js -> safe-to-spend-bridge.js -> forecast-bridge.js -> household-continuity-bridge.js -> accessibility-bridge.js -> professional-bridge.js");
}

for (const fragment of ["transactionUserResponse", "transactionRecurringStatus", "transactionProfessionalProjectLink", "billDialog", "bnpl"]) {
  if (!runtime.includes(fragment)) throw new Error(`built Phase 2 data runtime missing contract fragment: ${fragment}`);
}
for (const fragment of [
  "subscriptionAutoRenew",
  "subscriptionUsage",
  "subscriptionDecision",
  "annualCost",
  "review_next_charge",
  "savingsGoals",
  "requiredWeeklyAmount",
  "requiredFortnightlyAmount",
  "savingsGoalDialog",
  "protected",
  "fullBackup",
  "restoreFullBackup",
]) {
  if (!extendedRuntime.includes(fragment)) throw new Error(`built subscriptions/savings runtime missing contract fragment: ${fragment}`);
}

for (const asset of ["/phase2-data-runtime.js", "/phase2-subscriptions-savings-runtime.js"]) {
  if (!worker.includes(asset)) throw new Error(`service worker no longer covers required Phase 2 runtime asset: ${asset}`);
}

console.log("Subscriber production artifact verification passed, including accounts, transactions, bills, subscriptions and savings goals runtime linkage.");