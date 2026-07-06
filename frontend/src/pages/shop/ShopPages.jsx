import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { INR, StatTile, StatusBadge, EmptyState } from "@/components/UIBits";
import { Package, Storefront } from "@phosphor-icons/react";

export function ShopOverview() {
  const [d, setD] = useState(null);
  const [me, setMe] = useState(null);
  useEffect(() => {
    api.get("/shop/dashboard").then((r) => setD(r.data));
    api.get("/shop/me").then((r) => setMe(r.data));
  }, []);
  if (!d || !me) return <div className="text-zinc-500">Loading…</div>;
  return (
    <div>
      <div className="mb-8">
        <div className="overline text-[#002fa7]">SHOP OWNER</div>
        <h1 className="font-display font-black text-4xl tracking-tight">{me.name}</h1>
        <p className="text-zinc-500 mt-1 flex items-center gap-2">
          <span className="chip chip-green">Synced with Shop App</span>
          <span className="text-xs">Any change in your Shop App shows here instantly.</span>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="PRODUCTS" value={d.products} testid="tile-products" />
        <StatTile label="ORDERS TODAY" value={d.orders_today} testid="tile-today" />
        <StatTile label="ACTIVE" value={d.active} testid="tile-active" />
        <StatTile label="REVENUE" value={<INR value={d.revenue} />} testid="tile-revenue" />
      </div>
      <div className="mt-8 border border-zinc-200 p-6">
        <div className="overline mb-4">SHOP INFO</div>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div><div className="text-zinc-500">Category</div><div className="font-semibold capitalize">{me.category}</div></div>
          <div><div className="text-zinc-500">Address</div><div className="font-semibold">{me.address}</div></div>
          <div><div className="text-zinc-500">Rating</div><div className="font-semibold">★ {Number(me.rating).toFixed(1)} · {me.reviews_count} reviews</div></div>
        </div>
      </div>
    </div>
  );
}

export function ShopProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: 0, stock: 100, category: "general", image_url: "" });
  const [open, setOpen] = useState(false);
  const load = () => api.get("/shop/products").then((r) => setProducts(r.data));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/shop/products", {
      ...form, price: parseFloat(form.price), stock: parseInt(form.stock),
    });
    setForm({ name: "", description: "", price: 0, stock: 100, category: "general", image_url: "" });
    setOpen(false); load();
  };
  const del = async (pid) => { await api.delete(`/shop/products/${pid}`); load(); };
  const updStock = async (pid, v) => { await api.patch(`/shop/products/${pid}`, { stock: parseInt(v) }); load(); };
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="overline text-[#002fa7]">CATALOG</div>
          <h1 className="font-display font-black text-4xl tracking-tight">Products</h1>
        </div>
        <button className="btn-primary" onClick={() => setOpen((o) => !o)} data-testid="btn-new-product">{open ? "Close" : "+ New product"}</button>
      </div>
      {open && (
        <form onSubmit={submit} className="border border-zinc-200 p-4 mb-6 grid md:grid-cols-3 gap-3">
          <F label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="p-name" required />
          <F label="Price" value={form.price} onChange={(v) => setForm({ ...form, price: v })} testid="p-price" required />
          <F label="Stock" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
          <F label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          <F label="Image URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
          <F label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div className="md:col-span-3"><button type="submit" className="btn-primary" data-testid="btn-save-product">Add product</button></div>
        </form>
      )}
      {products.length === 0 ? <EmptyState title="Add your first product" icon={Package} /> : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.product_id} className="sharp-card">
              <div className="aspect-square bg-zinc-100 bg-cover bg-center" style={{ backgroundImage: `url(${p.image_url})` }} />
              <div className="p-3">
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-zinc-500 capitalize">{p.category}</div>
                <div className="flex justify-between items-center mt-2">
                  <div className="font-display font-extrabold"><INR value={p.price} /></div>
                  <input
                    type="number"
                    value={p.stock}
                    onChange={(e) => updStock(p.product_id, e.target.value)}
                    className="w-16 border border-zinc-200 text-sm text-right px-2 py-1 rounded"
                    data-testid={`stock-${p.product_id}`}
                  />
                </div>
                <button onClick={() => del(p.product_id)} className="text-xs text-red-600 mt-2" data-testid={`del-${p.product_id}`}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShopOrders() {
  const [orders, setOrders] = useState([]);
  const load = () => api.get("/shop/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);
  const accept = async (oid) => { await api.post(`/shop/orders/${oid}/accept`); load(); };
  return (
    <div>
      <div className="mb-6">
        <div className="overline text-[#002fa7]">ORDERS</div>
        <h1 className="font-display font-black text-4xl tracking-tight">Incoming orders</h1>
      </div>
      {orders.length === 0 ? <EmptyState title="No orders yet" icon={Storefront} /> : (
        <div className="border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                {["Order", "Customer", "Items", "Total", "Warehouse", "Status", "Actions"].map((c) => (
                  <th key={c} className="text-left px-4 py-3 overline">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id} className="data-row border-b border-zinc-100">
                  <td className="px-4 py-3 font-mono text-xs">#{o.order_id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3">{o.items.length}</td>
                  <td className="px-4 py-3 font-mono"><INR value={o.total} /></td>
                  <td className="px-4 py-3">{o.warehouse_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    {o.status === "placed" && (
                      <button onClick={() => accept(o.order_id)} className="text-xs btn-primary py-1 px-2" data-testid={`accept-${o.order_id}`}>Accept</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function F({ label, value, onChange, testid, required }) {
  return (
    <div>
      <label className="overline">{label}</label>
      <input
        data-testid={testid}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-zinc-300 px-3 py-2 rounded-md"
      />
    </div>
  );
}
