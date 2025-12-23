import express from "express";
import cors from "cors";
import { getDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/urls", async (req, res) => {
  try {
    const { collection = "new-posts", page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const db = await getDb();
    const col = db.collection(collection);

    const [items, total] = await Promise.all([
      col.find({}).sort({ _id: -1 }).skip(skip).limit(Number(limit)).toArray(),
      col.countDocuments(),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch URLs" });
  }
});

app.post("/urls", async (req, res) => {
  try {
    const { url, collection = "new-posts" } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    const db = await getDb();
    const col = db.collection(collection);

    const result = await col.insertOne({
      post_url: url,
      stage: "pending",
      createdAt: new Date(),
    });

    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Duplicate URL" });
    }

    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});

app.delete("/urls/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { collection = "new-posts" } = req.query;

    const db = await getDb();
    const col = db.collection(collection);

    const result = await col.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
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
