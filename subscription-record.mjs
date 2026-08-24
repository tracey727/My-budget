import {
  normalizeSubscriptionCycle,
  normalizeSubscriptionStatus,
  normalizeSubscriptionWorth,
} from "./subscription-model.mjs";
import { parseAmount } from "./transaction-model.mjs";

export function normalizeSubscriptionRecord(subscription = {}) {
  return {
    id: subscription.id || null,
    name: String(subscription.name || "").trim(),
    amount: parseAmount(subscription.amount),
    cycle: normalizeSubscriptionCycle(subscription.cycle),
    status: normalizeSubscriptionStatus(subscription.status),
    worth: normalizeSubscriptionWorth(subscription),
    accountId: subscription.accountId || null,
    nextDate: subscription.nextDate || null,
    autoRenew: subscription.autoRenew === true,
    notes: String(subscription.notes || "").trim(),
  };
}

export function normalizeSubscriptions(subscriptions) {
  return Array.isArray(subscriptions) ? subscriptions.map(normalizeSubscriptionRecord) : [];
}
