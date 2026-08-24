import test from "node:test";
import assert from "node:assert/strict";
import { billFundingGap, billIsFunded, normalizeBillRecord } from "./bill-model.mjs";

test("required bill storage fields are normalized", () => {
  const bill = normalizeBillRecord({
    billId: "bill-1",
    name: "Electricity",
    amount: "420.456",
    frequency: "quarterly",
    nextDueDate: "2026-09-30",
    account: "bills-account",
    essentialStatus: "essential",
    budgetingMethod: "smooth",
    amountReserved: "220.10",
    requiredContribution: "50.25",
    targetAmount: "420.46",
    alertStatus: "yellow",
    paidStatus: "unpaid",
    notes: "Quarterly power bill",
    createdAt: "2026-08-24T12:00:00.000Z",
  });

  assert.deepEqual(bill, {
    id: "bill-1",
    billName: "Electricity",
    amount: 420.46,
    frequency: "quarterly",
    nextDueDate: "2026-09-30",
    accountId: "bills-account",
    essentialStatus: "essential",
    budgetingMethod: "smooth",
    amountReserved: 220.1,
    requiredContribution: 50.25,
    targetAmount: 420.46,
    alertStatus: "yellow",
    paidStatus: "unpaid",
    notes: "Quarterly power bill",
    createdAt: "2026-08-24T12:00:00.000Z",
  });
});

test("legacy bill inputs receive safe defaults", () => {
  const bill = normalizeBillRecord({ name: "Rates", amount: 900 });
  assert.equal(bill.frequency, "monthly");
  assert.equal(bill.essentialStatus, "unsure");
  assert.equal(bill.budgetingMethod, "target");
  assert.equal(bill.targetAmount, 900);
  assert.equal(bill.alertStatus, "green");
  assert.equal(bill.paidStatus, "unpaid");
});

test("bill funding gap never goes below zero", () => {
  assert.equal(billFundingGap({ targetAmount: 1000, amountReserved: 350 }), 650);
  assert.equal(billFundingGap({ targetAmount: 1000, amountReserved: 1200 }), 0);
});

test("bill funded state follows target and reserved amounts", () => {
  assert.equal(billIsFunded({ targetAmount: 500, amountReserved: 500 }), true);
  assert.equal(billIsFunded({ targetAmount: 500, amountReserved: 499.99 }), false);
});
