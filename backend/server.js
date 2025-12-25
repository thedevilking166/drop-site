import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "./db.js";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const ALLOWED_TABLES = new Set(["new-posts"]);
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const { rows } = await query(
      `
      SELECT id, email, password_hash, role, is_active
      FROM admins
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const admin = rows[0];

    if (!admin.is_active) {
      return res.status(403).json({ message: "Account disabled" });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    query(`UPDATE admins SET last_login_at = now() WHERE id = $1`, [
      admin.id,
    ]).catch(console.error);

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/urls", async (req, res) => {
  try {
    const collection = req.query.collection || "new-posts";
    const status = req.query.status;

    if (!ALLOWED_TABLES.has(collection)) {
      return res.status(400).json({ error: "Invalid collection" });
    }

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;

    const values = [];
    let whereClause = "";

    if (status && status !== "all") {
      values.push(status);
      whereClause = `WHERE status = $${values.length}`;
    }

    values.push(limit, offset);

    const itemsQuery = `
      SELECT *
      FROM "${collection}"
      ${whereClause}
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `;

    const countQuery = `
      SELECT COUNT(*)
      FROM "${collection}"
      ${whereClause}
    `;

    const [itemsResult, totalResult] = await Promise.all([
      query(itemsQuery, values),
      query(countQuery, values.slice(0, values.length - 2)),
    ]);

    const total = Number(totalResult.rows[0].count);

    res.json({
      items: itemsResult.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch URLs" });
  }
});

app.delete("/urls/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const collection = req.query.collection || "new-posts";

    if (!ALLOWED_TABLES.has(collection)) {
      return res.status(400).json({ error: "Invalid collection" });
    }

    const result = await query(`DELETE FROM "${collection}" WHERE id = $1`, [
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

app.listen(4000, () => {
  console.log("API running on http://localhost:4000");
});
