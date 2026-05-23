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
  await products.deleteMany({});
  await products.insertMany([
    { name: "Laptop Pro", price: 1200, emoji: "💻", desc: "High-performance 15\" laptop for professionals" },
    { name: "Smartphone X", price: 800, emoji: "📱", desc: "Latest flagship with 108MP camera" },
    { name: "Wireless Headphones", price: 250, emoji: "🎧", desc: "Noise-cancelling, 40h battery life" },
    { name: "Smart Watch", price: 399, emoji: "⌚", desc: "Health tracking & GPS built-in" },
    { name: "Mechanical Keyboard", price: 150, emoji: "⌨️", desc: "RGB backlit, tactile switches" },
    { name: "4K Monitor", price: 550, emoji: "🖥️", desc: "27\" IPS panel, 144Hz refresh rate" },
  ]);
  console.log("Seeded products into MongoDB");
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
    const cards = items.map((p) => `
      <div class="card">
        <div class="card-emoji">${p.emoji || "📦"}</div>
        <div class="card-body">
          <h2 class="card-title">${p.name}</h2>
          <p class="card-desc">${p.desc || ""}</p>
          <div class="card-footer">
            <span class="price">$${p.price.toLocaleString()}</span>
            <button class="btn">Add to Cart</button>
          </div>
        </div>
      </div>`).join("");

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TechStore</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0f0f13;
    color: #e2e8f0;
    min-height: 100vh;
  }

  nav {
    background: #16161d;
    border-bottom: 1px solid #2d2d3a;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-brand {
    font-size: 1.4rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }
  .nav-links { display: flex; gap: 1.5rem; }
  .nav-links a {
    color: #94a3b8;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color .2s;
  }
  .nav-links a:hover { color: #e2e8f0; }
  .cart-btn {
    background: #6366f1;
    color: #fff;
    border: none;
    padding: 0.45rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background .2s;
  }
  .cart-btn:hover { background: #4f46e5; }

  .hero {
    text-align: center;
    padding: 4rem 2rem 3rem;
    background: radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, transparent 70%);
  }
  .hero h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    background: linear-gradient(135deg, #e2e8f0 30%, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.75rem;
  }
  .hero p { color: #64748b; font-size: 1.1rem; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem 4rem;
  }

  .card {
    background: #16161d;
    border: 1px solid #2d2d3a;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform .2s, border-color .2s;
  }
  .card:hover {
    transform: translateY(-4px);
    border-color: #6366f1;
  }
  .card-emoji {
    font-size: 4rem;
    background: #1e1b4b;
    padding: 2rem;
    text-align: center;
  }
  .card-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .card-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.4rem;
    color: #f1f5f9;
  }
  .card-desc {
    font-size: 0.85rem;
    color: #64748b;
    flex: 1;
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .price {
    font-size: 1.3rem;
    font-weight: 800;
    color: #a855f7;
  }
  .btn {
    background: linear-gradient(135deg, #6366f1, #a855f7);
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .2s;
  }
  .btn:hover { opacity: 0.85; }

  footer {
    text-align: center;
    padding: 1.5rem;
    color: #334155;
    font-size: 0.78rem;
    border-top: 1px solid #1e1e2a;
  }
</style>
</head>
<body>

<nav>
  <span class="nav-brand">⚡ TechStore</span>
  <div class="nav-links">
    <a href="#">Home</a>
    <a href="#">Deals</a>
    <a href="#">About</a>
  </div>
  <button class="cart-btn">🛒 Cart</button>
</nav>

<section class="hero">
  <h1>Premium Tech, Best Prices</h1>
  <p>Discover the latest gadgets delivered to your door</p>
</section>

<main class="grid">
  ${cards}
</main>

<footer>
  Served by container host: ${process.env.HOSTNAME || "unknown"} &nbsp;·&nbsp; Powered by Node.js + MongoDB
</footer>

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
