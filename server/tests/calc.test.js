import test from "node:test";
import assert from "node:assert/strict";
import { computeSplits, computeBalances, suggestSettlements } from "../../shared/calc.js";

test("equal split spreads leftover paise fairly", () => {
  const { splits } = computeSplits({ type: "equal", amount: 100, memberIds: ["a", "b", "c"] });
  assert.equal(splits.reduce((s, x) => Math.round(s * 100 + x.amount * 100) / 100, 0), 100);
  assert.deepEqual(splits.map((s) => s.amount), [33.34, 33.33, 33.33]);
});

test("percentage split must total 100", () => {
  assert.match(computeSplits({ type: "percentage", amount: 200, memberIds: ["a", "b"], values: { a: 60, b: 30 } }).error, /100%/);
  const { splits } = computeSplits({ type: "percentage", amount: 200, memberIds: ["a", "b"], values: { a: 60, b: 40 } });
  assert.deepEqual(splits.map((s) => s.amount), [120, 80]);
});

test("exact split must match the total", () => {
  assert.match(computeSplits({ type: "exact", amount: 100, memberIds: ["a", "b"], values: { a: 40, b: 50 } }).error, /short/);
  assert.match(computeSplits({ type: "exact", amount: 100, memberIds: ["a", "b"], values: { a: 60, b: 50 } }).error, /exceed/);
  assert.ok(computeSplits({ type: "exact", amount: 100, memberIds: ["a", "b"], values: { a: 60, b: 40 } }).splits);
});

test("balances and settlement suggestions", () => {
  const group = { members: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  const expenses = [{ paidBy: "a", amount: 90, splits: [{ memberId: "a", amount: 30 }, { memberId: "b", amount: 30 }, { memberId: "c", amount: 30 }] }];
  const net = computeBalances(group, expenses, []);
  assert.deepEqual(net, { a: 6000, b: -3000, c: -3000 });
  const sug = suggestSettlements(net);
  assert.equal(sug.length, 2);
  const after = computeBalances(group, expenses, [{ from: "b", to: "a", amount: 30 }]);
  assert.equal(after.b, 0);
});
