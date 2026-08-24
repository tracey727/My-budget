import {
  annualSubscriptionCost,
  normalizeSubscriptionCycle,
  normalizeSubscriptionDecision,
  normalizeSubscriptionStatus,
  normalizeSubscriptionWorth,
} from "./subscription-model.mjs";
import { parseAmount } from "./transaction-model.mjs";

export function normalizeSubscriptionRecord(subscription = {}) {
  const cycle = normalizeSubscriptionCycle(subscription.cycle || subscription.frequency);
  const amount = parseAmount(subscription.amount);
  return {
    id: subscription.id || null,
    name: String(subscription.name || subscription.subscription || "").trim(),
    amount,
    cycle,
    frequency: cycle,
    status: normalizeSubscriptionStatus(subscription.status),
    worth: normalizeSubscriptionWorth(subscription),
    accountId: subscription.accountId || subscription.account || null,
    nextDate: subscription.nextDate || subscription.nextCharge || null,
    nextCharge: subscription.nextCharge || subscription.nextDate || null,
    autoRenew: subscription.autoRenew === true,
    usage: String(subscription.usage || "").trim(),
    annualCost: annualSubscriptionCost(amount, cycle),
    decision: normalizeSubscriptionDecision(subscription.decision),
    notes: String(subscription.notes || subscription.cancelNotes || "").trim(),
    createdAt: String(subscription.createdAt || ""),
  };
}

export function normalizeSubscriptions(subscriptions) {
  return Array.isArray(subscriptions) ? subscriptions.map(normalizeSubscriptionRecord) : [];
}
