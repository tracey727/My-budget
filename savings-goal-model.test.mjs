import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSavingsGoalRecord,
  normalizeSavingsGoals,
  requiredSavingsContribution,
  savingsProgress,
} from "./savings-goal-model.mjs";

const AS_OF = new Date("2026-08-24T00:00:00.000Z");

test("normalises every required savings-goal storage field", () => {
  assert.deepEqual(
    normalizeSavingsGoalRecord({
      goalId: "goal-1",
      name: " Emergency fund ",
      target: "2600",
      current: "600",
      deadline: "2026-10-19",
      protected: "yes",
      notes: " Do not spend ",
      createdAt: "2026-08-24T12:00:00.000Z",
    }, AS_OF),
    {
      id: "goal-1",
      goal: "Emergency fund",
      target: 2600,
      currentAmount: 600,
      deadline: "2026-10-19",
      requiredWeeklyAmount: 250,
      requiredFortnightlyAmount: 500,
      progress: 23.08,
      protected: true,
      notes: "Do not spend",
      createdAt: "2026-08-24T12:00:00.000Z",
    }
  );
});

test("progress is derived from target and current amount and capped at 100", () => {
  assert.equal(savingsProgress(1000, 250), 25);
  assert.equal(savingsProgress(1000, 1250), 100);
  assert.equal(savingsProgress(0, 50), 0);
});

test("required weekly and fortnightly amounts are derived from remaining pay periods", () => {
  assert.equal(requiredSavingsContribution(2600, 600, "2026-10-19", 7, AS_OF), 250);
  assert.equal(requiredSavingsContribution(2600, 600, "2026-10-19", 14, AS_OF), 500);
});

test("fully funded goals require no further contribution", () => {
  assert.equal(requiredSavingsContribution(1000, 1000, "2026-09-30", 7, AS_OF), 0);
  assert.equal(requiredSavingsContribution(1000, 1200, "2026-09-30", 14, AS_OF), 0);
});

test("missing deadline keeps contribution requirements at zero without corrupting the goal", () => {
  const goal = normalizeSavingsGoalRecord({ goal: "Car", target: 5000, currentAmount: 1000, protected: false }, AS_OF);
  assert.equal(goal.requiredWeeklyAmount, 0);
  assert.equal(goal.requiredFortnightlyAmount, 0);
  assert.equal(goal.progress, 20);
  assert.equal(goal.protected, false);
});

test("goal arrays are normalised without mutating source", () => {
  const source = [{ id: "a", goal: "Trip", target: 1000, currentAmount: 200, deadline: "2026-09-21" }];
  const result = normalizeSavingsGoals(source, AS_OF);
  assert.notEqual(result, source);
  assert.equal(result[0].goal, "Trip");
  assert.equal(result[0].progress, 20);
});
