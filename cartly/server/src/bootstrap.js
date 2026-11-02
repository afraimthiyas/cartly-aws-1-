// Runs at every start-up. Safe to run repeatedly: creates tables, and only on an
// empty database adds the sample products and the admin account.
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./db");
const products = require("./sample-products");

module.exports = async function bootstrap() {
  const client = await pool.connect();
  try {
    // Advisory lock: if two containers start together, only one sets things up at a time.
    await client.query("SELECT pg_advisory_lock(727274)");
    await client.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

    const { rows } = await client.query("SELECT count(*)::int AS n FROM products");
    if (rows[0].n === 0) {
      for (const p of products)
        await client.query(
          "INSERT INTO products (name, description, price_cents, image_url, category) VALUES ($1,$2,$3,$4,$5)", p);
      console.log("Seeded", products.length, "sample products");
    }

    const adminPass = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin123");
    if (adminPass) {
      const r = await client.query(
        "INSERT INTO users (name,email,password_hash,role) VALUES ('Admin','admin@cartly.com',$1,'admin') ON CONFLICT (email) DO NOTHING",
        [bcrypt.hashSync(adminPass, 10)]);
      if (r.rowCount) console.log("Created admin@cartly.com");
    } else {
      console.warn("ADMIN_PASSWORD not set: admin account not created");
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(727274)").catch(() => {});
    client.release();
  }
};
