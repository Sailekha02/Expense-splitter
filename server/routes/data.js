import { Router } from "express";
import { getDb, save, newId } from "../db.js";
import { requireAuth } from "../auth.js";
import { computeSplits, computeBalances, toCents, CATEGORIES } from "../../shared/calc.js";

const router = Router();
router.use(requireAuth);

const str = (v) => (typeof v === "string" ? v.trim() : "");
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const MAX_AMOUNT = 10_000_000;

const ownGroup = (req, id) => getDb().groups.find((g) => g.id === id && g.ownerId === req.user.id);
const bad = (res, error, fields) => res.status(400).json({ error, ...(fields ? { fields } : {}) });
const notFound = (res, what = "Group") => res.status(404).json({ error: `${what} not found` });

// ---------- everything for the logged-in user in one call ----------
router.get("/data", (req, res) => {
  const db = getDb();
  const groups = db.groups.filter((g) => g.ownerId === req.user.id);
  const ids = new Set(groups.map((g) => g.id));
  res.json({
    groups,
    expenses: db.expenses.filter((e) => ids.has(e.groupId)),
    settlements: db.settlements.filter((s) => ids.has(s.groupId)),
  });
});

// ---------- groups ----------
function validateMemberNames(names, existing = []) {
  const seen = new Set(existing.map((n) => n.toLowerCase()));
  const out = [];
  for (const raw of names) {
    const n = str(raw);
    if (!n) continue;
    if (n.length > 40) return { error: `"${n.slice(0, 15)}…" is too long (max 40 characters)` };
    if (seen.has(n.toLowerCase())) return { error: `"${n}" is already in the group` };
    seen.add(n.toLowerCase());
    out.push(n);
  }
  return { names: out };
}

router.post("/groups", (req, res) => {
  const name = str(req.body.name);
  const description = str(req.body.description);
  if (name.length < 2 || name.length > 50) return bad(res, "Group name must be 2–50 characters", { name: "Group name must be 2–50 characters" });
  if (description.length > 200) return bad(res, "Description is too long (max 200)", { description: "Max 200 characters" });
  const v = validateMemberNames(Array.isArray(req.body.members) ? req.body.members : [], [req.user.name]);
  if (v.error) return bad(res, v.error, { members: v.error });

  const group = {
    id: newId(),
    name,
    description,
    ownerId: req.user.id,
    createdAt: new Date().toISOString(),
    members: [
      { id: newId(), name: req.user.name, userId: req.user.id },
      ...v.names.map((n) => ({ id: newId(), name: n })),
    ],
  };
  getDb().groups.push(group);
  save();
  res.status(201).json({ group });
});

router.put("/groups/:id", (req, res) => {
  const g = ownGroup(req, req.params.id);
  if (!g) return notFound(res);
  const name = req.body.name !== undefined ? str(req.body.name) : g.name;
  const description = req.body.description !== undefined ? str(req.body.description) : g.description;
  if (name.length < 2 || name.length > 50) return bad(res, "Group name must be 2–50 characters", { name: "Group name must be 2–50 characters" });
  if (description.length > 200) return bad(res, "Description is too long (max 200)", { description: "Max 200 characters" });
  g.name = name;
  g.description = description;
  save();
  res.json({ group: g });
});

router.delete("/groups/:id", (req, res) => {
  const g = ownGroup(req, req.params.id);
  if (!g) return notFound(res);
  const db = getDb();
  db.groups = db.groups.filter((x) => x.id !== g.id);
  db.expenses = db.expenses.filter((e) => e.groupId !== g.id);
  db.settlements = db.settlements.filter((s) => s.groupId !== g.id);
  save();
  res.json({ ok: true });
});

router.post("/groups/:id/members", (req, res) => {
  const g = ownGroup(req, req.params.id);
  if (!g) return notFound(res);
  const v = validateMemberNames([req.body.name], g.members.map((m) => m.name));
  if (v.error) return bad(res, v.error, { name: v.error });
  if (!v.names.length) return bad(res, "Enter a member name", { name: "Enter a member name" });
  if (g.members.length >= 30) return bad(res, "A group can have at most 30 members");
  g.members.push({ id: newId(), name: v.names[0] });
  save();
  res.status(201).json({ group: g });
});

router.delete("/groups/:id/members/:memberId", (req, res) => {
  const g = ownGroup(req, req.params.id);
  if (!g) return notFound(res);
  const m = g.members.find((x) => x.id === req.params.memberId);
  if (!m) return notFound(res, "Member");
  if (m.userId) return bad(res, "You can't remove yourself from your own group");
  const db = getDb();
  const used =
    db.expenses.some((e) => e.groupId === g.id && (e.paidBy === m.id || e.splits.some((s) => s.memberId === m.id))) ||
    db.settlements.some((s) => s.groupId === g.id && (s.from === m.id || s.to === m.id));
  if (used) return bad(res, `${m.name} has expenses or payments in this group, so they can't be removed`);
  g.members = g.members.filter((x) => x.id !== m.id);
  save();
  res.json({ group: g });
});

// ---------- expenses ----------
function parseExpense(req, group) {
  const b = req.body;
  const fields = {};
  const description = str(b.description);
  const amount = Number(b.amount);
  const category = CATEGORIES.some((c) => c.id === b.category) ? b.category : null;
  const date = str(b.date);
  const memberIdsInGroup = new Set(group.members.map((m) => m.id));

  if (description.length < 2 || description.length > 80) fields.description = "Description must be 2–80 characters";
  if (!Number.isFinite(amount) || amount <= 0) fields.amount = "Amount must be greater than 0";
  else if (amount > MAX_AMOUNT) fields.amount = "Amount is too large";
  else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) fields.amount = "Use at most 2 decimal places";
  if (!category) fields.category = "Pick a category";
  if (!isDate(date)) fields.date = "Enter a valid date";
  if (!memberIdsInGroup.has(b.paidBy)) fields.paidBy = "Choose who paid";
  if (str(b.notes).length > 300) fields.notes = "Notes are too long (max 300)";
  if (!Array.isArray(b.memberIds) || b.memberIds.some((id) => !memberIdsInGroup.has(id)))
    fields.split = "Split includes someone who isn't in this group";
  if (Object.keys(fields).length) return { fields };

  const result = computeSplits({ type: b.splitType, amount, memberIds: b.memberIds, values: b.values || {} });
  if (result.error) return { fields: { split: result.error } };

  return {
    data: {
      description,
      amount,
      category,
      date,
      paidBy: b.paidBy,
      splitType: b.splitType,
      splits: result.splits,
      notes: str(b.notes),
    },
  };
}

router.post("/expenses", (req, res) => {
  const group = ownGroup(req, req.body.groupId);
  if (!group) return bad(res, "Choose a group for this expense", { groupId: "Choose a group" });
  const { data, fields } = parseExpense(req, group);
  if (fields) return bad(res, Object.values(fields)[0], fields);
  const expense = { id: newId(), groupId: group.id, createdAt: new Date().toISOString(), ...data };
  getDb().expenses.push(expense);
  save();
  res.status(201).json({ expense });
});

router.put("/expenses/:id", (req, res) => {
  const db = getDb();
  const expense = db.expenses.find((e) => e.id === req.params.id);
  const group = expense && ownGroup(req, expense.groupId);
  if (!group) return notFound(res, "Expense");
  const { data, fields } = parseExpense(req, group);
  if (fields) return bad(res, Object.values(fields)[0], fields);
  Object.assign(expense, data, { updatedAt: new Date().toISOString() });
  save();
  res.json({ expense });
});

router.delete("/expenses/:id", (req, res) => {
  const db = getDb();
  const expense = db.expenses.find((e) => e.id === req.params.id);
  if (!expense || !ownGroup(req, expense.groupId)) return notFound(res, "Expense");
  db.expenses = db.expenses.filter((e) => e.id !== expense.id);
  save();
  res.json({ ok: true });
});

// ---------- settlements ("mark as paid") ----------
router.post("/settlements", (req, res) => {
  const group = ownGroup(req, req.body.groupId);
  if (!group) return notFound(res);
  const { from, to } = req.body;
  const amount = Number(req.body.amount);
  const ids = new Set(group.members.map((m) => m.id));
  if (!ids.has(from) || !ids.has(to) || from === to) return bad(res, "Choose two different members of this group");
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return bad(res, "Amount must be greater than 0", { amount: "Enter a valid amount" });
  if (toCents(amount) !== Math.round(amount * 100)) return bad(res, "Use at most 2 decimal places", { amount: "Max 2 decimal places" });

  // don't let people over-pay: the payer can't hand over more than they currently owe the receiver's side
  const db = getDb();
  const net = computeBalances(
    group,
    db.expenses.filter((e) => e.groupId === group.id),
    db.settlements.filter((s) => s.groupId === group.id)
  );
  if (toCents(amount) > -net[from] && toCents(amount) > net[to])
    return bad(res, "That's more than is owed. Check the balances and try again", { amount: "More than is owed" });

  const date = isDate(str(req.body.date)) ? str(req.body.date) : new Date().toISOString().slice(0, 10);
  const settlement = {
    id: newId(),
    groupId: group.id,
    from,
    to,
    amount,
    date,
    note: str(req.body.note).slice(0, 120),
    createdAt: new Date().toISOString(),
  };
  db.settlements.push(settlement);
  save();
  res.status(201).json({ settlement });
});

router.delete("/settlements/:id", (req, res) => {
  const db = getDb();
  const s = db.settlements.find((x) => x.id === req.params.id);
  if (!s || !ownGroup(req, s.groupId)) return notFound(res, "Payment");
  db.settlements = db.settlements.filter((x) => x.id !== s.id);
  save();
  res.json({ ok: true });
});

export default router;
