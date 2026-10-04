import jwt from "jsonwebtoken";
import { supabase } from "./supabase.js";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not configured");
}

export const signToken = (user) =>
  jwt.sign({ sub: user.id }, secret, { expiresIn: "7d" });

export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  currency: u.currency,
  createdAt: u.createdAt ?? u.created_at,
});

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Please log in to continue",
    });
  }

  try {
    const { sub } = jwt.verify(token, secret);

    const { data: row, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", sub)
      .maybeSingle();

    if (error) {
      console.error("Auth user lookup failed:", error);
      return res.status(500).json({
        error: "Unable to verify your account",
      });
    }

    if (!row) {
      return res.status(401).json({
        error: "Account no longer exists",
      });
    }

    // Convert Supabase row to the format used internally by the app.
    req.user = {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      currency: row.currency,
      createdAt: row.created_at,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    return res.status(401).json({
      error: "Session expired, please log in again",
    });
  }
}