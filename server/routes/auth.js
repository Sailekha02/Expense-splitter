import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb, save, newId } from "../db.js";
import { signToken, publicUser, requireAuth } from "../auth.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "JPY"];

const clean = (s) => (typeof s === "string" ? s.trim() : "");

router.post("/register", (req, res) => {
  const name = clean(req.body.name);
  const email = clean(req.body.email).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const errors = {};
  if (name.length < 2 || name.length > 50) errors.name = "Name must be 2–50 characters";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address";
  if (password.length < 6) errors.password = "Password must be at least 6 characters";
  if (Object.keys(errors).length) return res.status(400).json({ error: "Please fix the highlighted fields", fields: errors });

  const db = getDb();
  if (db.users.some((u) => u.email === email))
    return res.status(409).json({ error: "An account with this email already exists", fields: { email: "Email already registered" } });

  const user = {
    id: newId(),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    currency: "INR",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save();
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const email = clean(req.body.email).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const user = getDb().users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: "Invalid email or password" });
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.put("/me", requireAuth, (req, res) => {
  const u = req.user;
  const errors = {};
  if (req.body.name !== undefined) {
    const name = clean(req.body.name);
    if (name.length < 2 || name.length > 50) errors.name = "Name must be 2–50 characters";
    else u.name = name;
  }
  if (req.body.currency !== undefined) {
    if (!CURRENCIES.includes(req.body.currency)) errors.currency = "Unsupported currency";
    else u.currency = req.body.currency;
  }
  if (req.body.newPassword !== undefined) {
    if (!bcrypt.compareSync(String(req.body.currentPassword || ""), u.passwordHash))
      errors.currentPassword = "Current password is incorrect";
    else if (String(req.body.newPassword).length < 6) errors.newPassword = "New password must be at least 6 characters";
    else u.passwordHash = bcrypt.hashSync(req.body.newPassword, 10);
  }
  if (Object.keys(errors).length) return res.status(400).json({ error: Object.values(errors)[0], fields: errors });

  // keep the user's own member name in sync across groups
  getDb().groups.forEach((g) =>
    g.members.forEach((m) => {
      if (m.userId === u.id) m.name = u.name;
    })
  );
  save();
  res.json({ user: publicUser(u) });
});

export default router;
