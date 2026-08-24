import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSubscriptionRecord, normalizeSubscriptions } from "./subscription-record.mjs";

test("normalises required subscription storage fields", () => {
  assert.deepEqual(
    normalizeSubscriptionRecord({
      id: "sub-1",
      subscription: " Netflix ",
      amount: "25",
      frequency: "monthly",
      status: "active",
      worth: "unsure",
      account: "bank-1",
      nextCharge: "2026-09-01",
      autoRenew: true,
      usage: " 4 times this month ",
      decision: "another_month",
      notes: " family plan ",
      createdAt: "2026-08-24T12:00:00.000Z",
    }),
    {
      id: "sub-1",
      name: "Netflix",
      amount: 25,
      cycle: "monthly",
      frequency: "monthly",
      status: "active",
      worth: "unsure",
      accountId: "bank-1",
      nextDate: "2026-09-01",
      nextCharge: "2026-09-01",
      autoRenew: true,
      usage: "4 times this month",
      annualCost: 300,
      decision: "another_month",
      notes: "family plan",
      createdAt: "2026-08-24T12:00:00.000Z",
    }
  );
});

test("unknown or incomplete subscriptions default safely", () => {
  assert.deepEqual(normalizeSubscriptionRecord({ name: "Unknown charge", amount: 12.5 }), {
    id: null,
    name: "Unknown charge",
    amount: 12.5,
    cycle: "monthly",
    frequency: "monthly",
    status: "unknown",
    worth: "unsure",
    accountId: null,
    nextDate: null,
    nextCharge: null,
    autoRenew: false,
    usage: "",
    annualCost: 150,
    decision: "maybe",
    notes: "",
    createdAt: "",
  });
});

test("subscription arrays are normalised without mutating source", () => {
  const source = [{ id: "a", name: "A", amount: 10, cycle: "weekly", status: "active", worth: "essential", decision: "keep" }];
  const result = normalizeSubscriptions(source);
  assert.notEqual(result, source);
  assert.equal(result[0].cycle, "weekly");
  assert.equal(result[0].status, "active");
  assert.equal(result[0].annualCost, 520);
  assert.equal(result[0].decision, "keep");
});
