import { parseAmount } from "./transaction-model.mjs";

function positiveMoney(value) {
  return Math.max(0, parseAmount(value));
}

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnlyFrom(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  return parseDateOnly(value);
}

export function savingsProgress(target, currentAmount) {
  const targetAmount = positiveMoney(target);
  const current = positiveMoney(currentAmount);
  if (targetAmount <= 0) return 0;
  return Math.round(Math.min(100, (current / targetAmount) * 100) * 100) / 100;
}

export function requiredSavingsContribution(target, currentAmount, deadline, periodDays, asOf = new Date()) {
  const targetAmount = positiveMoney(target);
  const current = positiveMoney(currentAmount);
  const gap = Math.max(0, targetAmount - current);
  if (gap === 0) return 0;

  const deadlineDate = parseDateOnly(deadline);
  const asOfDate = dateOnlyFrom(asOf);
  if (!deadlineDate || !asOfDate || !Number.isFinite(periodDays) || periodDays <= 0) return 0;

  const millisecondsPerDay = 86_400_000;
  const daysRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - asOfDate.getTime()) / millisecondsPerDay));
  const periodsRemaining = Math.max(1, Math.ceil(daysRemaining / periodDays));
  return Math.round((gap / periodsRemaining) * 100) / 100;
}

export function normalizeSavingsGoalRecord(goal = {}, asOf = new Date()) {
  const target = positiveMoney(goal.target);
  const currentAmount = positiveMoney(goal.currentAmount ?? goal.current);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(goal.deadline || "")) ? String(goal.deadline) : "";

  return {
    id: String(goal.id || goal.goalId || ""),
    goal: String(goal.goal || goal.name || "").trim(),
    target,
    currentAmount,
    deadline,
    requiredWeeklyAmount: requiredSavingsContribution(target, currentAmount, deadline, 7, asOf),
    requiredFortnightlyAmount: requiredSavingsContribution(target, currentAmount, deadline, 14, asOf),
    progress: savingsProgress(target, currentAmount),
    protected: goal.protected === true || goal.protected === "yes",
    notes: String(goal.notes || "").trim(),
    createdAt: String(goal.createdAt || ""),
  };
}

export function normalizeSavingsGoals(goals, asOf = new Date()) {
  return Array.isArray(goals) ? goals.map((goal) => normalizeSavingsGoalRecord(goal, asOf)) : [];
}
