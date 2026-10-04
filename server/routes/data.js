import { Router } from "express";
import { requireAuth } from "../auth.js";
import { supabase } from "../supabase.js";
import {
  computeSplits,
  computeBalances,
  toCents,
  CATEGORIES,
} from "../../shared/calc.js";
import crypto from "node:crypto";

const router = Router();

router.use(requireAuth);

const str = (v) => (typeof v === "string" ? v.trim() : "");

const isDate = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const MAX_AMOUNT = 10_000_000;

const newId = () => crypto.randomUUID();

const bad = (res, error, fields) =>
  res.status(400).json({
    error,
    ...(fields ? { fields } : {}),
  });

const notFound = (res, what = "Group") =>
  res.status(404).json({
    error: `${what} not found`,
  });

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ---------------------------------------------------------
   Supabase mapping helpers
--------------------------------------------------------- */

function mapGroup(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    ownerId: row.owner_id,
    createdAt: row.created_at,
    members: row.members || [],
  };
}

function mapExpense(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    paidBy: row.paid_by,
    splitType: row.split_type,
    splits: row.splits || [],
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

function mapSettlement(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    from: row.from,
    to: row.to,
    amount: Number(row.amount),
    date: row.date,
    note: row.note || "",
    createdAt: row.created_at,
  };
}

async function getUserGroups(userId) {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map(mapGroup);
}

async function getGroup(userId, groupId) {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data ? mapGroup(data) : null;
}

async function getGroupExpenses(groupIds) {
  if (!groupIds.length) return [];

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .in("group_id", groupIds);

  if (error) throw error;

  return (data || []).map(mapExpense);
}

async function getGroupSettlements(groupIds) {
  if (!groupIds.length) return [];

  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .in("group_id", groupIds);

  if (error) throw error;

  return (data || []).map(mapSettlement);
}

/* ---------------------------------------------------------
   Everything for the logged-in user in one call
--------------------------------------------------------- */

router.get(
  "/data",
  asyncHandler(async (req, res) => {
    const groups = await getUserGroups(req.user.id);
    const groupIds = groups.map((g) => g.id);

    const [expenses, settlements] = await Promise.all([
      getGroupExpenses(groupIds),
      getGroupSettlements(groupIds),
    ]);

    res.json({
      groups,
      expenses,
      settlements,
    });
  })
);

/* ---------------------------------------------------------
   Groups
--------------------------------------------------------- */

function validateMemberNames(names, existing = []) {
  const seen = new Set(existing.map((n) => n.toLowerCase()));
  const out = [];

  for (const raw of names) {
    const n = str(raw);

    if (!n) continue;

    if (n.length > 40) {
      return {
        error: `"${n.slice(0, 15)}…" is too long (max 40 characters)`,
      };
    }

    if (seen.has(n.toLowerCase())) {
      return {
        error: `"${n}" is already in the group`,
      };
    }

    seen.add(n.toLowerCase());
    out.push(n);
  }

  return { names: out };
}

router.post(
  "/groups",
  asyncHandler(async (req, res) => {
    const name = str(req.body.name);
    const description = str(req.body.description);

    if (name.length < 2 || name.length > 50) {
      return bad(
        res,
        "Group name must be 2–50 characters",
        { name: "Group name must be 2–50 characters" }
      );
    }

    if (description.length > 200) {
      return bad(
        res,
        "Description is too long (max 200)",
        { description: "Max 200 characters" }
      );
    }

    const v = validateMemberNames(
      Array.isArray(req.body.members) ? req.body.members : [],
      [req.user.name]
    );

    if (v.error) {
      return bad(res, v.error, { members: v.error });
    }

    const group = {
      id: newId(),
      name,
      description,
      ownerId: req.user.id,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: newId(),
          name: req.user.name,
          userId: req.user.id,
        },
        ...v.names.map((n) => ({
          id: newId(),
          name: n,
        })),
      ],
    };

    const { error } = await supabase.from("groups").insert({
      id: group.id,
      name: group.name,
      description: group.description,
      owner_id: group.ownerId,
      created_at: group.createdAt,
      members: group.members,
    });

    if (error) throw error;

    res.status(201).json({ group });
  })
);

router.put(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const g = await getGroup(req.user.id, req.params.id);

    if (!g) return notFound(res);

    const name =
      req.body.name !== undefined ? str(req.body.name) : g.name;

    const description =
      req.body.description !== undefined
        ? str(req.body.description)
        : g.description;

    if (name.length < 2 || name.length > 50) {
      return bad(
        res,
        "Group name must be 2–50 characters",
        { name: "Group name must be 2–50 characters" }
      );
    }

    if (description.length > 200) {
      return bad(
        res,
        "Description is too long (max 200)",
        { description: "Max 200 characters" }
      );
    }

    const { data, error } = await supabase
      .from("groups")
      .update({
        name,
        description,
      })
      .eq("id", g.id)
      .eq("owner_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ group: mapGroup(data) });
  })
);

router.delete(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const g = await getGroup(req.user.id, req.params.id);

    if (!g) return notFound(res);

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", g.id)
      .eq("owner_id", req.user.id);

    if (error) throw error;

    /*
      expenses and settlements are automatically removed because
      their group_id columns use ON DELETE CASCADE.
    */

    res.json({ ok: true });
  })
);

router.post(
  "/groups/:id/members",
  asyncHandler(async (req, res) => {
    const g = await getGroup(req.user.id, req.params.id);

    if (!g) return notFound(res);

    const v = validateMemberNames(
      [req.body.name],
      g.members.map((m) => m.name)
    );

    if (v.error) {
      return bad(res, v.error, { name: v.error });
    }

    if (!v.names.length) {
      return bad(
        res,
        "Enter a member name",
        { name: "Enter a member name" }
      );
    }

    if (g.members.length >= 30) {
      return bad(res, "A group can have at most 30 members");
    }

    const updatedMembers = [
      ...g.members,
      {
        id: newId(),
        name: v.names[0],
      },
    ];

    const { data, error } = await supabase
      .from("groups")
      .update({
        members: updatedMembers,
      })
      .eq("id", g.id)
      .eq("owner_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      group: mapGroup(data),
    });
  })
);

router.delete(
  "/groups/:id/members/:memberId",
  asyncHandler(async (req, res) => {
    const g = await getGroup(req.user.id, req.params.id);

    if (!g) return notFound(res);

    const m = g.members.find(
      (x) => x.id === req.params.memberId
    );

    if (!m) return notFound(res, "Member");

    if (m.userId) {
      return bad(
        res,
        "You can't remove yourself from your own group"
      );
    }

    const [expenses, settlements] = await Promise.all([
      getGroupExpenses([g.id]),
      getGroupSettlements([g.id]),
    ]);

    const used =
      expenses.some(
        (e) =>
          e.groupId === g.id &&
          (e.paidBy === m.id ||
            e.splits.some((s) => s.memberId === m.id))
      ) ||
      settlements.some(
        (s) =>
          s.groupId === g.id &&
          (s.from === m.id || s.to === m.id)
      );

    if (used) {
      return bad(
        res,
        `${m.name} has expenses or payments in this group, so they can't be removed`
      );
    }

    const updatedMembers = g.members.filter(
      (x) => x.id !== m.id
    );

    const { data, error } = await supabase
      .from("groups")
      .update({
        members: updatedMembers,
      })
      .eq("id", g.id)
      .eq("owner_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      group: mapGroup(data),
    });
  })
);

/* ---------------------------------------------------------
   Expenses
--------------------------------------------------------- */

function parseExpense(req, group) {
  const b = req.body;
  const fields = {};

  const description = str(b.description);
  const amount = Number(b.amount);

  const category = CATEGORIES.some(
    (c) => c.id === b.category
  )
    ? b.category
    : null;

  const date = str(b.date);

  const memberIdsInGroup = new Set(
    group.members.map((m) => m.id)
  );

  if (description.length < 2 || description.length > 80) {
    fields.description =
      "Description must be 2–80 characters";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    fields.amount = "Amount must be greater than 0";
  } else if (amount > MAX_AMOUNT) {
    fields.amount = "Amount is too large";
  } else if (
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
  ) {
    fields.amount = "Use at most 2 decimal places";
  }

  if (!category) {
    fields.category = "Pick a category";
  }

  if (!isDate(date)) {
    fields.date = "Enter a valid date";
  }

  if (!memberIdsInGroup.has(b.paidBy)) {
    fields.paidBy = "Choose who paid";
  }

  if (str(b.notes).length > 300) {
    fields.notes = "Notes are too long (max 300)";
  }

  if (
    !Array.isArray(b.memberIds) ||
    b.memberIds.some((id) => !memberIdsInGroup.has(id))
  ) {
    fields.split =
      "Split includes someone who isn't in this group";
  }

  if (Object.keys(fields).length) {
    return { fields };
  }

  const result = computeSplits({
    type: b.splitType,
    amount,
    memberIds: b.memberIds,
    values: b.values || {},
  });

  if (result.error) {
    return {
      fields: {
        split: result.error,
      },
    };
  }

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

router.post(
  "/expenses",
  asyncHandler(async (req, res) => {
    const group = await getGroup(
      req.user.id,
      req.body.groupId
    );

    if (!group) {
      return bad(
        res,
        "Choose a group for this expense",
        { groupId: "Choose a group" }
      );
    }

    const { data, fields } = parseExpense(req, group);

    if (fields) {
      return bad(
        res,
        Object.values(fields)[0],
        fields
      );
    }

    const expense = {
      id: newId(),
      groupId: group.id,
      createdAt: new Date().toISOString(),
      ...data,
    };

    const { error } = await supabase.from("expenses").insert({
      id: expense.id,
      group_id: expense.groupId,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      paid_by: expense.paidBy,
      split_type: expense.splitType,
      splits: expense.splits,
      notes: expense.notes,
      created_at: expense.createdAt,
      updated_at: null,
    });

    if (error) throw error;

    res.status(201).json({
      expense,
    });
  })
);

router.put(
  "/expenses/:id",
  asyncHandler(async (req, res) => {
    const { data: row, error: findError } =
      await supabase
        .from("expenses")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

    if (findError) throw findError;

    const expense = row ? mapExpense(row) : null;

    const group = expense
      ? await getGroup(req.user.id, expense.groupId)
      : null;

    if (!group) {
      return notFound(res, "Expense");
    }

    const { data, fields } = parseExpense(req, group);

    if (fields) {
      return bad(
        res,
        Object.values(fields)[0],
        fields
      );
    }

    const updatedAt = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("expenses")
      .update({
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date,
        paid_by: data.paidBy,
        split_type: data.splitType,
        splits: data.splits,
        notes: data.notes,
        updated_at: updatedAt,
      })
      .eq("id", expense.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      expense: mapExpense(updated),
    });
  })
);

router.delete(
  "/expenses/:id",
  asyncHandler(async (req, res) => {
    const { data: row, error: findError } =
      await supabase
        .from("expenses")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

    if (findError) throw findError;

    if (!row) {
      return notFound(res, "Expense");
    }

    const expense = mapExpense(row);

    const group = await getGroup(
      req.user.id,
      expense.groupId
    );

    if (!group) {
      return notFound(res, "Expense");
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id);

    if (error) throw error;

    res.json({
      ok: true,
    });
  })
);

/* ---------------------------------------------------------
   Settlements
--------------------------------------------------------- */

router.post(
  "/settlements",
  asyncHandler(async (req, res) => {
    const group = await getGroup(
      req.user.id,
      req.body.groupId
    );

    if (!group) {
      return notFound(res);
    }

    const { from, to } = req.body;
    const amount = Number(req.body.amount);

    const ids = new Set(
      group.members.map((m) => m.id)
    );

    if (!ids.has(from) || !ids.has(to) || from === to) {
      return bad(
        res,
        "Choose two different members of this group"
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > MAX_AMOUNT
    ) {
      return bad(
        res,
        "Amount must be greater than 0",
        { amount: "Enter a valid amount" }
      );
    }

    if (toCents(amount) !== Math.round(amount * 100)) {
      return bad(
        res,
        "Use at most 2 decimal places",
        { amount: "Max 2 decimal places" }
      );
    }

    const [expenses, settlements] = await Promise.all([
      getGroupExpenses([group.id]),
      getGroupSettlements([group.id]),
    ]);

    const net = computeBalances(
      group,
      expenses,
      settlements
    );

    if (
      toCents(amount) > -net[from] &&
      toCents(amount) > net[to]
    ) {
      return bad(
        res,
        "That's more than is owed. Check the balances and try again",
        { amount: "More than is owed" }
      );
    }

    const date = isDate(str(req.body.date))
      ? str(req.body.date)
      : new Date().toISOString().slice(0, 10);

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

    const { error } = await supabase
      .from("settlements")
      .insert({
        id: settlement.id,
        group_id: settlement.groupId,
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount,
        date: settlement.date,
        note: settlement.note,
        created_at: settlement.createdAt,
      });

    if (error) throw error;

    res.status(201).json({
      settlement,
    });
  })
);

router.delete(
  "/settlements/:id",
  asyncHandler(async (req, res) => {
    const { data: row, error: findError } =
      await supabase
        .from("settlements")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

    if (findError) throw findError;

    if (!row) {
      return notFound(res, "Payment");
    }

    const settlement = mapSettlement(row);

    const group = await getGroup(
      req.user.id,
      settlement.groupId
    );

    if (!group) {
      return notFound(res, "Payment");
    }

    const { error } = await supabase
      .from("settlements")
      .delete()
      .eq("id", settlement.id);

    if (error) throw error;

    res.json({
      ok: true,
    });
  })
);

export default router;