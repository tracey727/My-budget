import { normalizeExpenseWorth, EXPENSE_WORTH } from "./expense-intelligence.mjs";
import { parseAmount } from "./transaction-model.mjs";

export const SUBSCRIPTION_CYCLES = Object.freeze({
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  yearly: 1,
});

export const SUBSCRIPTION_STATUSES = Object.freeze({
  active: "Active",
  unknown: "Needs checking",
  cancelled: "Cancelled",
});

export function normalizeSubscriptionCycle(value) {
  return Object.hasOwn(SUBSCRIPTION_CYCLES, value) ? value : "monthly";
}

export function normalizeSubscriptionStatus(value) {
  return Object.hasOwn(SUBSCRIPTION_STATUSES, value) ? value : "unknown";
}

export function annualSubscriptionCost(amount, cycle) {
  return Math.round(parseAmount(amount) * SUBSCRIPTION_CYCLES[normalizeSubscriptionCycle(cycle)] * 100) / 100;
}

export function monthlyEquivalentCost(amount, cycle) {
  return Math.round((annualSubscriptionCost(amount, cycle) / 12) * 100) / 100;
}

export function normalizeSubscriptionWorth(subscription) {
  const worth = normalizeExpenseWorth({ type: "expense", worth: subscription?.worth });
  return Object.hasOwn(EXPENSE_WORTH, worth) ? worth : "unsure";
}

export function activeAnnualSubscriptionCost(subscriptions = []) {
  return Math.round(
    subscriptions
      .filter((subscription) => normalizeSubscriptionStatus(subscription.status) === "active")
      .reduce((sum, subscription) => sum + annualSubscriptionCost(subscription.amount, subscription.cycle), 0) * 100
  ) / 100;
}

export function subscriptionReviewItems(subscriptions = []) {
  return subscriptions.filter((subscription) => {
    const status = normalizeSubscriptionStatus(subscription.status);
    const worth = normalizeSubscriptionWorth(subscription);
    return status === "unknown" || (status === "active" && (worth === "unsure" || worth === "waste"));
  });
}

export function possibleAnnualSubscriptionSaving(subscriptions = []) {
  return Math.round(
    subscriptions
      .filter((subscription) => {
        const status = normalizeSubscriptionStatus(subscription.status);
        const worth = normalizeSubscriptionWorth(subscription);
        return status === "active" && (worth === "unsure" || worth === "waste");
      })
      .reduce((sum, subscription) => sum + annualSubscriptionCost(subscription.amount, subscription.cycle), 0) * 100
  ) / 100;
}
