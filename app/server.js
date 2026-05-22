const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017";
const DB_NAME = "shop";

let db = null;

// Seed products on first connection
async function connectAndSeed() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  const products = db.collection("products");
  const count = await products.countDocuments();
  if (count === 0) {
    await products.insertMany([
      { name: "Laptop", price: 1200 },
      { name: "Phone", price: 800 },
    ]);
    console.log("Seeded products into MongoDB");
  }
  console.log("Connected to MongoDB");
}

// Health endpoint used by the ALB target group
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Store front page
app.get("/", async (req, res) => {
  try {
    const items = await db.collection("products").find().toArray();
    const rows = items
      .map((p) => `<li>${p.name} &mdash; $${p.price}</li>`)
      .join("");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>E-Commerce Store</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 20px}
h1{color:#1c7293}li{font-size:20px;margin:8px 0}.host{color:#888;font-size:13px}</style>
</head>
<body>
<h1>E-Commerce Store</h1>
<ul>${rows}</ul>
<p class="host">Served by container host: ${process.env.HOSTNAME || "unknown"}</p>
</body>
</html>`);
  } catch (err) {
    res.status(500).send("Database not ready: " + err.message);
  }
});

// Retry MongoDB connection (containers may start out of order)
function startWithRetry(attempt = 1) {
  connectAndSeed()
    .then(() => {
      app.listen(PORT, () => console.log(`App listening on ${PORT}`));
    })
    .catch((err) => {
      console.error(`Mongo connection failed (attempt ${attempt}): ${err.message}`);
      if (attempt < 20) setTimeout(() => startWithRetry(attempt + 1), 3000);
      else process.exit(1);
    });
}

startWithRetry();
