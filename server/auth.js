import jwt from "jsonwebtoken";
import { getDb, getJwtSecret } from "./db.js";

const secret = getJwtSecret();

export const signToken = (user) => jwt.sign({ sub: user.id }, secret, { expiresIn: "7d" });

export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  currency: u.currency,
  createdAt: u.createdAt,
});

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in to continue" });
  try {
    const { sub } = jwt.verify(token, secret);
    const user = getDb().users.find((u) => u.id === sub);
    if (!user) return res.status(401).json({ error: "Account no longer exists" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired, please log in again" });
  }
}
