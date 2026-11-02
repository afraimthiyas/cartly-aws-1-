import { useEffect, useState } from "react";

// An empty VITE_API_URL means "same address as the page" (the Docker/AWS build). Unset: localhost in dev, same address in production.
const API = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:4000");
const money = (c) => `$${(c / 100).toFixed(2)}`;
const img = (u) => (u && u.startsWith("/") ? API + u : u);

const FALLBACK = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" fill="#9ca3af" font-size="28" text-anchor="middle">No image</text></svg>');
const Img = ({ src, ...rest }) => (
  <img src={img(src)} {...rest} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK; }} />
);

export default function App() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart") || "[]"));
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("shop");
  const [drawer, setDrawer] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState("");

  const call = async (path, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    const r = await fetch(API + path, { ...opts, headers });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  };
  const fail = (e) => setMsg(e.message === "Failed to fetch" ? "Cannot reach API" : e.message);
  const loadProducts = () =>
    call(`/api/products?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`).then(setProducts).catch(fail);

  useEffect(() => { const t = setTimeout(loadProducts, 250); return () => clearTimeout(t); }, [q, cat]);
  useEffect(() => { call("/api/categories").then(setCats).catch(() => {}); }, [products.length]);
  useEffect(() => localStorage.setItem("cart", JSON.stringify(cart)), [cart]);
  useEffect(() => { if (token) call("/api/auth/me").then(setUser).catch(logout); }, [token]);
  useEffect(() => { if (view === "orders") call("/api/orders/mine").then(setOrders).catch(fail); }, [view]);

  const logout = () => { localStorage.removeItem("token"); setToken(""); setUser(null); setView("shop"); };
  const add = (p) => setCart((c) => c.find((i) => i.id === p.id)
    ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { ...p, qty: 1 }]);
  const change = (id, d) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0));
  const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);

  function submitAuth(e) {
    e.preventDefault();
    call(`/api/auth/${authMode}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
    }).then((d) => { localStorage.setItem("token", d.token); setToken(d.token); setUser(d.user); setAuthMode(null); setMsg(""); }).catch(fail);
  }
  function checkout() {
    if (!user) return setAuthMode("login");
    call("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.map((i) => ({ id: i.id, qty: i.qty })) }),
    }).then((d) => { setCart([]); setDrawer(false); setMsg(`Order #${d.orderId} placed: ${money(d.total_cents)}`); }).catch(fail);
  }
  function addProduct(e) {
    e.preventDefault();
    const form = e.target;
    call("/api/products", { method: "POST", body: new FormData(form) })
      .then(() => { form.reset(); setMsg("Product added"); loadProducts(); }).catch(fail);
  }
  const del = (id) => call(`/api/products/${id}`, { method: "DELETE" }).then(loadProducts).catch(fail);

  return (
    <>
      <header>
        <h1 onClick={() => setView("shop")} style={{ cursor: "pointer" }}>Cartly</h1>
        <nav>
          {user?.role === "admin" && <button onClick={() => setView("admin")}>Admin</button>}
          {user && <button onClick={() => setView("orders")}>My orders</button>}
          {user ? <button onClick={logout}>Log out ({user.name})</button> : <button onClick={() => setAuthMode("login")}>Log in</button>}
          <button onClick={() => setDrawer(true)}>Cart ({cart.reduce((s, i) => s + i.qty, 0)})</button>
        </nav>
      </header>
      {msg && <p className="ok" onClick={() => setMsg("")}>{msg}</p>}

      {view === "shop" && (<>
        <div className="filters">
          <input placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <main className="grid">
          {products.map((p) => (
            <article key={p.id} className="card">
              <Img src={p.image_url} alt={p.name} loading="lazy" />
              <div className="info">
                <small>{p.category}</small><h3>{p.name}</h3><p>{p.description}</p>
                <div className="row"><strong>{money(p.price_cents)}</strong><button onClick={() => add(p)}>Add</button></div>
              </div>
            </article>
          ))}
          {!products.length && <p>No products found.</p>}
        </main>
      </>)}

      {view === "orders" && (
        <main className="panel"><h2>My orders</h2>
          {!orders.length && <p>No orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className="item"><div><b>Order #{o.id}</b> · {money(o.total_cents)} · {new Date(o.created_at).toLocaleDateString()}
              <br />{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</div></div>
          ))}
        </main>
      )}

      {view === "admin" && user?.role === "admin" && (
        <main className="panel"><h2>Add product</h2>
          <form onSubmit={addProduct}>
            <input name="name" placeholder="Name" required />
            <input name="price" type="number" step="0.01" min="0.01" placeholder="Price (e.g. 19.99)" required />
            <input name="category" placeholder="Category" />
            <input name="stock" type="number" placeholder="Stock" />
            <input name="description" placeholder="Description" />
            <input name="image" type="file" accept="image/*" required />
            <button className="primary">Upload and add</button>
          </form>
          <h2>Products</h2>
          {products.map((p) => (
            <div key={p.id} className="item"><Img src={p.image_url} alt="" /><div><b>{p.name}</b><br />{money(p.price_cents)}</div>
              <button className="danger" onClick={() => del(p.id)}>Delete</button></div>
          ))}
        </main>
      )}

      {authMode && (
        <aside className="drawer">
          <div className="row"><h2>{authMode === "login" ? "Log in" : "Register"}</h2><button onClick={() => setAuthMode(null)}>✕</button></div>
          <form onSubmit={submitAuth}>
            {authMode === "register" && <input name="name" placeholder="Name" required />}
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password (6+ chars)" required />
            <button className="primary">{authMode === "login" ? "Log in" : "Create account"}</button>
          </form>
          <p><a href="#" onClick={(e) => { e.preventDefault(); setAuthMode(authMode === "login" ? "register" : "login"); }}>
            {authMode === "login" ? "New here? Register" : "Have an account? Log in"}</a></p>
        </aside>
      )}

      {drawer && !authMode && (
        <aside className="drawer">
          <div className="row"><h2>Your cart</h2><button onClick={() => setDrawer(false)}>✕</button></div>
          {!cart.length && <p>Cart is empty.</p>}
          {cart.map((i) => (
            <div key={i.id} className="item"><Img src={i.image_url} alt="" /><div><b>{i.name}</b><br />{money(i.price_cents)}</div>
              <div className="qty"><button onClick={() => change(i.id, -1)}>−</button>{i.qty}<button onClick={() => change(i.id, 1)}>+</button></div></div>
          ))}
          {cart.length > 0 && <><h3>Total: {money(total)}</h3><button className="primary" onClick={checkout}>{user ? "Place order" : "Log in to order"}</button></>}
        </aside>
      )}
    </>
  );
}
