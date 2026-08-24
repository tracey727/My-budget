import test from "node:test";
import assert from "node:assert/strict";
import {
  activeAnnualSubscriptionCost,
  annualSubscriptionCost,
  monthlyEquivalentCost,
  possibleAnnualSubscriptionSaving,
  subscriptionReviewItems,
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

test("active annual cost excludes unknown and cancelled records", () => {
  const subscriptions = [
    { amount: 10, cycle: "monthly", status: "active", worth: "essential" },
    { amount: 5, cycle: "weekly", status: "active", worth: "worth" },
    { amount: 20, cycle: "monthly", status: "unknown", worth: "unsure" },
    { amount: 50, cycle: "monthly", status: "cancelled", worth: "waste" },
  ];
  assert.equal(activeAnnualSubscriptionCost(subscriptions), 380);
});

test("review list includes unknown and questionable active subscriptions", () => {
  const subscriptions = [
    { id: "a", status: "active", worth: "essential" },
    { id: "b", status: "unknown", worth: "essential" },
    { id: "c", status: "active", worth: "unsure" },
    { id: "d", status: "active", worth: "waste" },
    { id: "e", status: "cancelled", worth: "waste" },
  ];
  assert.deepEqual(subscriptionReviewItems(subscriptions).map((item) => item.id), ["b", "c", "d"]);
});

test("possible savings remain modelled and exclude cancelled subscriptions", () => {
  const subscriptions = [
    { amount: 10, cycle: "monthly", status: "active", worth: "unsure" },
    { amount: 5, cycle: "monthly", status: "active", worth: "waste" },
    { amount: 20, cycle: "monthly", status: "cancelled", worth: "waste" },
    { amount: 30, cycle: "monthly", status: "unknown", worth: "unsure" },
  ];
  assert.equal(possibleAnnualSubscriptionSaving(subscriptions), 180);
});
