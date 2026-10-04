import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "../server/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "server", "data", "db.json");

if (!fs.existsSync(dbPath)) {
  throw new Error(`Database file not found: ${dbPath}`);
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

const users = db.users || [];
const groups = db.groups || [];
const expenses = db.expenses || [];
const settlements = db.settlements || [];

console.log("Existing JSON data:");
console.log(`  Users:       ${users.length}`);
console.log(`  Groups:      ${groups.length}`);
console.log(`  Expenses:    ${expenses.length}`);
console.log(`  Settlements: ${settlements.length}`);
console.log("");

async function upsert(table, rows) {
  if (!rows.length) {
    console.log(`✓ ${table}: nothing to migrate`);
    return;
  }

  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(`${table} migration failed: ${error.message}`);
  }

  console.log(`✓ ${table}: ${rows.length} row(s) migrated`);
}

// 1. Users
const userRows = users.map((u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  password_hash: u.passwordHash,
  currency: u.currency || "INR",
  created_at: u.createdAt,
}));

// 2. Groups
const groupRows = groups.map((g) => ({
  id: g.id,
  name: g.name,
  description: g.description || "",
  owner_id: g.ownerId,
  created_at: g.createdAt,
  members: g.members || [],
}));

// 3. Expenses
const expenseRows = expenses.map((e) => ({
  id: e.id,
  group_id: e.groupId,
  description: e.description,
  amount: e.amount,
  category: e.category,
  date: e.date,
  paid_by: e.paidBy,
  split_type: e.splitType,
  splits: e.splits || [],
  notes: e.notes || "",
  created_at: e.createdAt,
  updated_at: e.updatedAt || null,
}));

// 4. Settlements
const settlementRows = settlements.map((s) => ({
  id: s.id,
  group_id: s.groupId,
  from: s.from,
  to: s.to,
  amount: s.amount,
  date: s.date,
  note: s.note || "",
  created_at: s.createdAt,
}));

console.log("Starting migration...\n");

await upsert("users", userRows);
await upsert("groups", groupRows);
await upsert("expenses", expenseRows);
await upsert("settlements", settlementRows);

console.log("\nMigration completed successfully! 🎉");