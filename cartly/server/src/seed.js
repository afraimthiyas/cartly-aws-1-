const fs = require("fs");
const path = require("path");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const products = require("./sample-products");
(async () => {
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  await pool.query("TRUNCATE products RESTART IDENTITY CASCADE");
  for (const p of products)
    await pool.query(
      "INSERT INTO products (name, description, price_cents, image_url, category) VALUES ($1,$2,$3,$4,$5)", p);
  await pool.query(
    "INSERT INTO users (name,email,password_hash,role) VALUES ('Admin','admin@cartly.com',$1,'admin') ON CONFLICT (email) DO NOTHING",
    [bcrypt.hashSync("admin123", 10)]);
  console.log("Admin login: admin@cartly.com / admin123 (change it)");
  console.log("Seeded", products.length, "products");
  await pool.end();
})();
