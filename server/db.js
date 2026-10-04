// Tiny JSON-file database. Good enough for a personal/small-group app and needs
// no native modules. Writes are atomic (temp file + rename) so a crash can't corrupt data.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

const empty = () => ({ users: [], groups: [], expenses: [], settlements: [] });
let db = empty();

if (fs.existsSync(DB_FILE)) {
  try {
    db = { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch (err) {
    const backup = `${DB_FILE}.corrupt-${Date.now()}`;
    fs.renameSync(DB_FILE, backup);
    console.error(`db.json was unreadable, moved to ${backup} and started fresh:`, err.message);
  }
}

export function save() {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export const getDb = () => db;
export const newId = () => crypto.randomUUID();

/** JWT secret: env var wins, otherwise a random one is generated once and kept on disk. */
export function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(DATA_DIR, ".secret");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}
