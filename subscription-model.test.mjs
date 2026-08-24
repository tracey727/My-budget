import test from "node:test";
import assert from "node:assert/strict";
import {
  activeAnnualSubscriptionCost,
  annualSubscriptionCost,
  monthlyEquivalentCost,
  normalizeSubscriptionDecision,
  possibleAnnualSubscriptionSaving,
  subscriptionReviewItems,
  SUBSCRIPTION_DECISIONS,
} from "./subscription-model.mjs";

test("annualises weekly fortnightly monthly and yearly subscriptions", () => {
  assert.equal(annualSubscriptionCost(10, "weekly"), 520);
  assert.equal(annualSubscriptionCost(10, "fortnightly"), 260);
  assert.equal(annualSubscriptionCost(10, "monthly"), 120);
  assert.equal(annualSubscriptionCost(120, "yearly"), 120);
});

test("monthly equivalent is derived from annual cost", () => {
  assert.equal(monthlyEquivalentCost(26, "fortnightly"), 56.33);
});

test("all required subscription decisions are locked", () => {
  assert.deepEqual(SUBSCRIPTION_DECISIONS, {
    keep: "Keep",
    cancel: "Cancel",
    maybe: "Maybe",
    another_month: "Another month",
    pause: "Pause",
    review_next_charge: "Review next charge",
  });
  for (const decision of Object.keys(SUBSCRIPTION_DECISIONS)) {
    assert.equal(normalizeSubscriptionDecision(decision), decision);
  }
  assert.equal(normalizeSubscriptionDecision("invalid"), "maybe");
});

test("active annual cost excludes unknown and cancelled records", () => {
  const subscriptions = [
    { amount: 10, cycle: "monthly", status: "active", worth: "essential", decision: "keep" },
    { amount: 5, cycle: "weekly", status: "active", worth: "worth", decision: "keep" },
    { amount: 20, cycle: "monthly", status: "unknown", worth: "unsure", decision: "maybe" },
    { amount: 50, cycle: "monthly", status: "cancelled", worth: "waste", decision: "cancel" },
  ];
  assert.equal(activeAnnualSubscriptionCost(subscriptions), 380);
});

test("review list includes unknown questionable and deferred subscription decisions", () => {
  const subscriptions = [
    { id: "a", status: "active", worth: "essential", decision: "keep" },
    { id: "b", status: "unknown", worth: "essential", decision: "keep" },
    { id: "c", status: "active", worth: "unsure", decision: "keep" },
    { id: "d", status: "active", worth: "essential", decision: "another_month" },
    { id: "e", status: "active", worth: "essential", decision: "review_next_charge" },
  ];
  assert.deepEqual(subscriptionReviewItems(subscriptions).map((item) => item.id), ["b", "c", "d", "e"]);
});

test("possible savings remain modelled and include cancel or pause decisions", () => {
  const subscriptions = [
    { amount: 10, cycle: "monthly", status: "active", worth: "unsure", decision: "keep" },
    { amount: 5, cycle: "monthly", status: "active", worth: "essential", decision: "cancel" },
    { amount: 4, cycle: "monthly", status: "active", worth: "essential", decision: "pause" },
    { amount: 20, cycle: "monthly", status: "cancelled", worth: "waste", decision: "cancel" },
  ];
  assert.equal(possibleAnnualSubscriptionSaving(subscriptions), 228);
});
