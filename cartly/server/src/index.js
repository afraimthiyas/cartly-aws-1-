require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("./db");

const IS_PROD = process.env.NODE_ENV === "production";
const SECRET = process.env.JWT_SECRET || (IS_PROD ? "" : "dev-secret-change-me");
if (!SECRET) {
  console.error("JWT_SECRET is required in production");
  process.exit(1);
}
const bootstrap = require("./bootstrap");
const DIST = path.join(__dirname, "..", "..", "client", "dist"); // built React app (present in the Docker image)
const UPLOADS = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_, f, cb) => cb(null, Date.now() + "-" + f.originalname.replace(/[^\w.-]/g, "_")),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, /^image\//.test(f.mimetype)),
});

const app = express();
const origins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim()) : true;
app.use(cors({ origin: origins }));
app.use(express.json());
app.use("/uploads", express.static(UPLOADS));
app.use("/static", express.static(path.join(__dirname, "..", "public"))); // bundled product images

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(400).json({ error: e.message }));
const sign = (u) => jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: "7d" });
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const auth = (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Please log in" });
  }
};
const admin = (req, res, next) => (req.user.role === "admin" ? next() : res.status(403).json({ error: "Admins only" }));

if (!fs.existsSync(DIST)) app.get("/", (_, res) => res.json({ name: "Cartly API", products: "/api/products" }));
app.get("/api/health", (_, res) => res.json({ ok: true }));

app.post("/api/auth/register", wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) throw new Error("Name, email and a 6+ character password are required");
  const { rows } = await pool.query(
    "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING *",
    [name, email.toLowerCase(), bcrypt.hashSync(password, 10)]).catch(() => { throw new Error("Email already registered"); });
  res.status(201).json({ token: sign(rows[0]), user: pub(rows[0]) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [(req.body.email || "").toLowerCase()]);
  if (!rows[0] || !bcrypt.compareSync(req.body.password || "", rows[0].password_hash)) throw new Error("Wrong email or password");
  res.json({ token: sign(rows[0]), user: pub(rows[0]) });
}));

app.get("/api/auth/me", auth, wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
  if (!rows[0]) throw new Error("User not found");
  res.json(pub(rows[0]));
}));

app.get("/api/products", wrap(async (req, res) => {
  const { q = "", category = "" } = req.query;
  const { rows } = await pool.query(
    "SELECT * FROM products WHERE ($1='' OR name ILIKE '%'||$1||'%' OR description ILIKE '%'||$1||'%') AND ($2='' OR category=$2) ORDER BY id",
    [q, category]);
  res.json(rows);
}));

app.get("/api/categories", wrap(async (_, res) => {
  const { rows } = await pool.query("SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY 1");
  res.json(rows.map((r) => r.category));
}));

app.post("/api/products", auth, admin, upload.single("image"), wrap(async (req, res) => {
  const { name, description, category, price, stock, image_url } = req.body;
  const cents = Math.round(parseFloat(price) * 100);
  const image = req.file ? "/uploads/" + req.file.filename : image_url;
  if (!name || !(cents > 0) || !image) throw new Error("Name, price and an image are required");
  const { rows } = await pool.query(
    "INSERT INTO products (name,description,price_cents,image_url,category,stock) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [name, description || "", cents, image, category || null, parseInt(stock) || 100]);
  res.status(201).json(rows[0]);
}));

app.delete("/api/products/:id", auth, admin, wrap(async (req, res) => {
  await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]).catch(() => { throw new Error("Product has orders and cannot be deleted"); });
  res.json({ ok: true });
}));

app.post("/api/orders", auth, async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Cart is empty" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const u = (await client.query("SELECT * FROM users WHERE id=$1", [req.user.id])).rows[0];
    const { rows } = await client.query("SELECT id, price_cents FROM products WHERE id = ANY($1)", [items.map((i) => i.id)]);
    const prices = Object.fromEntries(rows.map((r) => [r.id, r.price_cents]));
    let total = 0;
    for (const i of items) {
      if (!prices[i.id] || !(i.qty > 0)) throw new Error("Invalid item");
      total += prices[i.id] * i.qty;
    }
    const o = await client.query(
      "INSERT INTO orders (customer_name,email,total_cents,user_id) VALUES ($1,$2,$3,$4) RETURNING id", [u.name, u.email, total, u.id]);
    for (const i of items)
      await client.query("INSERT INTO order_items (order_id,product_id,quantity,price_cents) VALUES ($1,$2,$3,$4)",
        [o.rows[0].id, i.id, i.qty, prices[i.id]]);
    await client.query("COMMIT");
    res.status(201).json({ orderId: o.rows[0].id, total_cents: total });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.get("/api/orders/mine", auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.id, o.total_cents, o.created_at,
            json_agg(json_build_object('name', p.name, 'qty', oi.quantity)) AS items
     FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN products p ON p.id=oi.product_id
     WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.id DESC`, [req.user.id]);
  res.json(rows);
}));

// Serve the built React app from the same address as the API (used in the Docker image).
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api\/|static\/|uploads\/).*/, (_, res) => res.sendFile(path.join(DIST, "index.html")));
}

bootstrap()
  .then(() => app.listen(process.env.PORT || 4000, () => console.log("Cartly on :" + (process.env.PORT || 4000))))
  .catch((e) => {
    console.error("Start-up failed:", e);
    process.exit(1);
  });
