import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "es-test-"));
const { createApp } = await import("../app.js");

let server, base, token;
const call = async (method, url, body, auth = true) => {
  const res = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(() => {
  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

test("full flow: register, group, expense, settle", async () => {
  let r = await call("POST", "/auth/register", { name: "A", email: "bad", password: "1" }, false);
  assert.equal(r.status, 400);

  r = await call("POST", "/auth/register", { name: "Asha", email: "Asha@Example.com", password: "secret1" }, false);
  assert.equal(r.status, 201);
  token = r.body.token;

  r = await call("POST", "/auth/register", { name: "Asha", email: "asha@example.com", password: "secret1" }, false);
  assert.equal(r.status, 409);
  r = await call("POST", "/auth/login", { email: "asha@example.com", password: "wrong" }, false);
  assert.equal(r.status, 401);
  r = await call("POST", "/auth/login", { email: "asha@example.com", password: "secret1" }, false);
  assert.equal(r.status, 200);

  assert.equal((await call("GET", "/data", null, false)).status, 401);

  r = await call("POST", "/groups", { name: "Goa Trip", members: ["Ravi", "Meena", "ravi"] });
  assert.equal(r.status, 400); // duplicate
  r = await call("POST", "/groups", { name: "Goa Trip", members: ["Ravi", "Meena"] });
  assert.equal(r.status, 201);
  const g = r.body.group;
  const [me, ravi, meena] = g.members;
  assert.equal(g.members.length, 3);

  r = await call("POST", "/expenses", { groupId: g.id, description: "Hotel", amount: 3000, category: "travel", date: "2026-10-01", paidBy: me.id, splitType: "equal", memberIds: [me.id, ravi.id, meena.id] });
  assert.equal(r.status, 201);
  const exp = r.body.expense;

  r = await call("POST", "/expenses", { groupId: g.id, description: "Dinner", amount: 100, category: "food", date: "2026-10-02", paidBy: ravi.id, splitType: "percentage", memberIds: [me.id, ravi.id], values: { [me.id]: 70, [ravi.id]: 20 } });
  assert.equal(r.status, 400);
  assert.match(r.body.fields.split, /100%/);

  r = await call("PUT", `/expenses/${exp.id}`, { ...exp, amount: 3300, memberIds: [me.id, ravi.id, meena.id], splitType: "exact", values: { [me.id]: 1000, [ravi.id]: 1200, [meena.id]: 1100 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.expense.splits[1].amount, 1200);

  r = await call("DELETE", `/groups/${g.id}/members/${ravi.id}`);
  assert.equal(r.status, 400); // has expenses

  r = await call("POST", "/settlements", { groupId: g.id, from: ravi.id, to: me.id, amount: 1200 });
  assert.equal(r.status, 201);
  r = await call("POST", "/settlements", { groupId: g.id, from: ravi.id, to: me.id, amount: 99999 });
  assert.equal(r.status, 400);

  r = await call("GET", "/data");
  assert.equal(r.body.groups.length, 1);
  assert.equal(r.body.expenses.length, 1);
  assert.equal(r.body.settlements.length, 1);

  // another user can't see or touch it
  const other = await call("POST", "/auth/register", { name: "Zed", email: "zed@example.com", password: "secret1" }, false);
  const mine = token;
  token = other.body.token;
  assert.equal((await call("GET", "/data")).body.groups.length, 0);
  assert.equal((await call("DELETE", `/expenses/${exp.id}`)).status, 404);
  token = mine;

  r = await call("DELETE", `/groups/${g.id}`);
  assert.equal(r.status, 200);
  assert.equal((await call("GET", "/data")).body.expenses.length, 0);
});
