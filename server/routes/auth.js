import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../supabase.js";
import { signToken, publicUser, requireAuth } from "../auth.js";
import crypto from "node:crypto";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "JPY"];

const clean = (s) => (typeof s === "string" ? s.trim() : "");

// Convert a Supabase user row into the internal user format
const mapUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  currency: row.currency,
  createdAt: row.created_at,
});

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────

router.post("/register", async (req, res) => {
  try {
    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    const errors = {};

    if (name.length < 2 || name.length > 50) {
      errors.name = "Name must be 2–50 characters";
    }

    if (!EMAIL_RE.test(email)) {
      errors.email = "Enter a valid email address";
    }

    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({
        error: "Please fix the highlighted fields",
        fields: errors,
      });
    }

    // Check whether email already exists
    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("Register user lookup failed:", lookupError);

      return res.status(500).json({
        error: "Unable to create your account",
      });
    }

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists",
        fields: {
          email: "Email already registered",
        },
      });
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      currency: "INR",
      createdAt: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.passwordHash,
        currency: user.currency,
        created_at: user.createdAt,
      });

    if (insertError) {
      console.error("Register insert failed:", insertError);

      // Handle duplicate email race condition
      if (insertError.code === "23505") {
        return res.status(409).json({
          error: "An account with this email already exists",
          fields: {
            email: "Email already registered",
          },
        });
      }

      return res.status(500).json({
        error: "Unable to create your account",
      });
    }

    res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      error: "Unable to create your account",
    });
  }
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const email = clean(req.body.email).toLowerCase();

    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    const { data: row, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Login lookup failed:", error);

      return res.status(500).json({
        error: "Unable to log you in",
      });
    }

    if (!row) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const validPassword = bcrypt.compareSync(
      password,
      row.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const user = mapUser(row);

    res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      error: "Unable to log you in",
    });
  }
});

// ─────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
  });
});

// ─────────────────────────────────────────────
// UPDATE CURRENT USER
// ─────────────────────────────────────────────

router.put("/me", requireAuth, async (req, res) => {
  try {
    const u = req.user;

    const errors = {};
    const updates = {};

    // Update name
    if (req.body.name !== undefined) {
      const name = clean(req.body.name);

      if (name.length < 2 || name.length > 50) {
        errors.name = "Name must be 2–50 characters";
      } else {
        updates.name = name;
      }
    }

    // Update currency
    if (req.body.currency !== undefined) {
      if (!CURRENCIES.includes(req.body.currency)) {
        errors.currency = "Unsupported currency";
      } else {
        updates.currency = req.body.currency;
      }
    }

    // Update password
    if (req.body.newPassword !== undefined) {
      const currentPassword = String(req.body.currentPassword || "");
      const newPassword = String(req.body.newPassword);

      if (!bcrypt.compareSync(currentPassword, u.passwordHash)) {
        errors.currentPassword = "Current password is incorrect";
      } else if (newPassword.length < 6) {
        errors.newPassword =
          "New password must be at least 6 characters";
      } else {
        updates.password_hash = bcrypt.hashSync(newPassword, 10);
      }
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({
        error: Object.values(errors)[0],
        fields: errors,
      });
    }

    // Nothing to update
    if (Object.keys(updates).length === 0) {
      return res.json({
        user: publicUser(u),
      });
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", u.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Profile update failed:", updateError);

      return res.status(500).json({
        error: "Unable to update your profile",
      });
    }

    // If the name changed, update the user's name
    // inside the members JSON stored in their groups.
    if (updates.name !== undefined) {
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id, members")
        .contains("members", [{ userId: u.id }]);

      if (groupsError) {
        console.error(
          "Group member update lookup failed:",
          groupsError
        );
      } else {
        await Promise.all(
          (groups || []).map(async (group) => {
            const members = Array.isArray(group.members)
              ? group.members
              : [];

            const updatedMembers = members.map((member) =>
              member.userId === u.id
                ? {
                    ...member,
                    name: updates.name,
                  }
                : member
            );

            const { error: memberUpdateError } = await supabase
              .from("groups")
              .update({
                members: updatedMembers,
              })
              .eq("id", group.id);

            if (memberUpdateError) {
              console.error(
                `Failed to update members in group ${group.id}:`,
                memberUpdateError
              );
            }
          })
        );
      }
    }

    const updatedUser = mapUser(updatedRow);

    res.json({
      user: publicUser(updatedUser),
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      error: "Unable to update your profile",
    });
  }
});

export default router;