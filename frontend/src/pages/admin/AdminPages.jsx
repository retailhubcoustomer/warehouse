import React, { useEffect, useState } from "react";
import api from "@/lib/api";

export function AdminCities() {
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ name: "", state: "West Bengal", lat: "", lng: "" });
  const [open, setOpen] = useState(false);

  const load = () => api.get("/admin/cities").then((r) => setCities(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/admin/cities", {
      ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng),
    });
    setForm({ name: "", state: "West Bengal", lat: "", lng: "" });
    setOpen(false);
    load();
  };

  return (
    <div>
      <Header title="Cities" subtitle="Enable service in a new city">
        <button className="btn-primary" onClick={() => setOpen((o) => !o)} data-testid="btn-new-city">
          {open ? "Close" : "+ New city"}
        </button>
      </Header>
      {open && (
        <form onSubmit={submit} className="border border-zinc-200 p-4 mb-6 grid md:grid-cols-4 gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="new-city-name" required />
          <Input label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <Input label="Latitude" value={form.lat} onChange={(v) => setForm({ ...form, lat: v })} testid="new-city-lat" required />
          <Input label="Longitude" value={form.lng} onChange={(v) => setForm({ ...form, lng: v })} testid="new-city-lng" required />
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary" data-testid="btn-save-city">Save city</button>
          </div>
        </form>
      )}
      <Table
        cols={["City", "State", "Coordinates", "Status", "Created"]}
        rows={cities.map((c) => [
          <span className="font-semibold" key="n">{c.name}</span>,
          c.state,
          <span className="font-mono text-xs" key="c">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span>,
          c.is_active ? <span className="chip chip-green">Active</span> : <span className="chip chip-red">Inactive</span>,
          new Date(c.created_at).toLocaleDateString(),
        ])}
      />
    </div>
  );
}

export function AdminWarehouses() {
  const [whs, setWhs] = useState([]);
  const [cities, setCities] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "", code: "", city_id: "", address: "",
    lat: "", lng: "", capacity: 1000, service_radius_km: 25,
  });
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get("/admin/warehouses").then((r) => setWhs(r.data));
    api.get("/admin/cities").then((r) => setCities(r.data));
    api.get("/admin/users", { params: { role: "warehouse_manager" } }).then((r) => setUsers(r.data));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/admin/warehouses", {
      ...form,
      lat: parseFloat(form.lat), lng: parseFloat(form.lng),
      capacity: parseInt(form.capacity), service_radius_km: parseFloat(form.service_radius_km),
    });
    setForm({ name: "", code: "", city_id: "", address: "", lat: "", lng: "", capacity: 1000, service_radius_km: 25 });
    setOpen(false);
    load();
  };

  const assign = async (wid, uid) => {
    await api.post(`/admin/warehouses/${wid}/assign-manager`, { user_id: uid });
    load();
  };

  return (
    <div>
      <Header title="Warehouses" subtitle="Fulfillment centers per city">
        <button className="btn-primary" onClick={() => setOpen((o) => !o)} data-testid="btn-new-warehouse">
          {open ? "Close" : "+ New warehouse"}
        </button>
      </Header>
      {open && (
        <form onSubmit={submit} className="border border-zinc-200 p-4 mb-6 grid md:grid-cols-4 gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="wh-name" required />
          <Input label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} testid="wh-code" required />
          <div>
            <label className="overline">City</label>
            <select
              data-testid="wh-city"
              className="mt-1 w-full border border-zinc-300 px-3 py-2 rounded-md"
              value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })} required
            >
              <option value="">Select</option>
              {cities.map((c) => <option key={c.city_id} value={c.city_id}>{c.name}</option>)}
            </select>
          </div>
          <Input label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Input label="Latitude" value={form.lat} onChange={(v) => setForm({ ...form, lat: v })} testid="wh-lat" required />
          <Input label="Longitude" value={form.lng} onChange={(v) => setForm({ ...form, lng: v })} testid="wh-lng" required />
          <Input label="Capacity" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />
          <Input label="Service radius (km)" value={form.service_radius_km} onChange={(v) => setForm({ ...form, service_radius_km: v })} />
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary" data-testid="btn-save-warehouse">Save warehouse</button>
          </div>
        </form>
      )}
      <Table
        cols={["Warehouse", "Code", "City", "Manager", "Capacity", "Radius"]}
        rows={whs.map((w) => [
          <span className="font-semibold" key="n">{w.name}</span>,
          <span className="font-mono text-xs" key="c">{w.code}</span>,
          w.city_name,
          <div key="m" className="flex items-center gap-2">
            <span className="text-xs">{w.manager?.name || <span className="text-zinc-400">Unassigned</span>}</span>
            <select
              data-testid={`assign-${w.warehouse_id}`}
              className="text-xs border border-zinc-200 rounded"
              value={w.manager_id || ""}
              onChange={(e) => e.target.value && assign(w.warehouse_id, e.target.value)}
            >
              <option value="">Assign…</option>
              {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.name} · {u.email}</option>)}
            </select>
          </div>,
          <span className="font-mono" key="c1">{w.capacity}</span>,
          <span className="font-mono" key="r">{w.service_radius_km} km</span>,
        ])}
      />
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  useEffect(() => {
    api.get("/admin/users", { params: role ? { role } : {} }).then((r) => setUsers(r.data));
  }, [role]);
  return (
    <div>
      <Header title="Users" subtitle="All accounts across roles">
        <select
          data-testid="user-role-filter"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-zinc-200 px-3 py-2 text-sm rounded-md"
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="shop_owner">Shop owners</option>
          <option value="warehouse_manager">Warehouse managers</option>
          <option value="delivery_partner">Delivery partners</option>
          <option value="collection_partner">Collection partners</option>
        </select>
      </Header>
      <Table
        cols={["Name", "Email", "Role", "City", "KYC", "Created"]}
        rows={users.map((u) => [
          <span className="font-semibold" key="n">{u.name}</span>,
          u.email,
          <span className="chip chip-blue" key="r">{u.role?.replace(/_/g, " ")}</span>,
          <span className="text-xs" key="c">{u.city_id?.slice(-6) || "-"}</span>,
          <span className={`chip ${u.kyc_status === "approved" ? "chip-green" : u.kyc_status === "rejected" ? "chip-red" : "chip-yellow"}`} key="k">
            {u.kyc_status}
          </span>,
          new Date(u.created_at).toLocaleDateString(),
        ])}
      />
    </div>
  );
}

export function AdminKYC() {
  const [users, setUsers] = useState([]);
  const load = () => api.get("/admin/users").then((r) => setUsers(r.data.filter((u) => u.kyc_status === "pending")));
  useEffect(() => { load(); }, []);

  const decide = async (uid, status) => {
    await api.patch(`/admin/users/${uid}/kyc`, { status });
    load();
  };

  return (
    <div>
      <Header title="KYC approvals" subtitle="Pending verifications" />
      {users.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-10 text-center text-zinc-500">All caught up ✓</div>
      ) : (
        <Table
          cols={["Name", "Email", "Role", "Phone", "Actions"]}
          rows={users.map((u) => [
            u.name, u.email, <span className="chip chip-blue" key="r">{u.role?.replace(/_/g, " ")}</span>,
            u.phone || "-",
            <div className="flex gap-2" key="a">
              <button data-testid={`kyc-approve-${u.user_id}`} onClick={() => decide(u.user_id, "approved")} className="text-xs border border-green-300 text-green-700 px-2 py-1 rounded">Approve</button>
              <button data-testid={`kyc-reject-${u.user_id}`} onClick={() => decide(u.user_id, "rejected")} className="text-xs border border-red-300 text-red-700 px-2 py-1 rounded">Reject</button>
            </div>,
          ])}
        />
      )}
    </div>
  );
}

export function AdminShops() {
  const [shops, setShops] = useState([]);
  useEffect(() => { api.get("/admin/shops").then((r) => setShops(r.data)); }, []);
  return (
    <div>
      <Header title="Shops" subtitle="All shops synced from Shop App" />
      <Table
        cols={["Shop", "Category", "City", "Warehouse", "Rating", "Status"]}
        rows={shops.map((s) => [
          <span className="font-semibold" key="n">{s.name}</span>,
          <span className="capitalize" key="c">{s.category}</span>,
          <span className="text-xs font-mono" key="ci">{s.city_id?.slice(-6)}</span>,
          <span className="text-xs font-mono" key="w">{s.warehouse_id?.slice(-6) || "-"}</span>,
          <span key="r">★ {Number(s.rating).toFixed(1)} ({s.reviews_count})</span>,
          s.is_active ? <span className="chip chip-green" key="s">Active</span> : <span className="chip chip-red" key="s">Off</span>,
        ])}
      />
    </div>
  );
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [status, setStatus] = useState("");
  const load = () => api.get("/admin/orders", { params: status ? { status } : {} }).then((r) => setOrders(r.data));
  useEffect(() => { load(); api.get("/admin/warehouses").then((r) => setWarehouses(r.data)); }, [status]);
  const transfer = async (oid, wid) => {
    if (!wid) return;
    await api.post(`/admin/orders/${oid}/transfer`, { warehouse_id: wid });
    load();
  };
  return (
    <div>
      <Header title="Orders" subtitle="All platform orders (transfer between warehouses)">
        <select
          data-testid="order-status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-zinc-200 px-3 py-2 text-sm rounded-md"
        >
          <option value="">All statuses</option>
          {["placed", "accepted", "collected", "at_warehouse", "packed", "out_for_delivery", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </Header>
      <Table
        cols={["Order", "Customer", "Shop", "Warehouse", "Total", "Status", "Transfer"]}
        rows={orders.map((o) => [
          <span className="font-mono text-xs" key="o">#{o.order_id.slice(-8).toUpperCase()}</span>,
          o.customer_name,
          o.shop_name,
          o.warehouse_name,
          <span className="font-mono" key="t">₹{o.total}</span>,
          <span className="chip" key="s">{o.status?.replace(/_/g, " ")}</span>,
          <select
            key="tr"
            data-testid={`transfer-${o.order_id}`}
            className="text-xs border border-zinc-200 rounded"
            value=""
            onChange={(e) => transfer(o.order_id, e.target.value)}
            disabled={["delivered", "cancelled"].includes(o.status)}
          >
            <option value="">Move…</option>
            {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
          </select>,
        ])}
      />
    </div>
  );
}

export function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", discount_percent: 10, min_order: 200, max_discount: 200 });
  const load = () => api.get("/admin/coupons").then((r) => setCoupons(r.data));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/admin/coupons", {
      code: form.code.toUpperCase(),
      discount_percent: parseFloat(form.discount_percent),
      min_order: parseFloat(form.min_order),
      max_discount: parseFloat(form.max_discount),
    });
    setForm({ code: "", discount_percent: 10, min_order: 200, max_discount: 200 });
    load();
  };
  return (
    <div>
      <Header title="Coupons" subtitle="Promotional codes" />
      <form onSubmit={submit} className="border border-zinc-200 p-4 mb-6 grid md:grid-cols-5 gap-3">
        <Input label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} testid="coupon-code" required />
        <Input label="Discount %" value={form.discount_percent} onChange={(v) => setForm({ ...form, discount_percent: v })} />
        <Input label="Min order" value={form.min_order} onChange={(v) => setForm({ ...form, min_order: v })} />
        <Input label="Max discount" value={form.max_discount} onChange={(v) => setForm({ ...form, max_discount: v })} />
        <div className="flex items-end"><button type="submit" className="btn-primary w-full" data-testid="btn-save-coupon">Create</button></div>
      </form>
      <Table
        cols={["Code", "Discount", "Min order", "Max discount", "Status"]}
        rows={coupons.map((c) => [
          <span className="font-mono font-bold text-[#002fa7]" key="c">{c.code}</span>,
          `${c.discount_percent}%`,
          `₹${c.min_order}`,
          `₹${c.max_discount}`,
          c.is_active ? <span className="chip chip-green" key="s">Active</span> : <span className="chip chip-red" key="s">Off</span>,
        ])}
      />
    </div>
  );
}

export function AdminAds() {
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState({ title: "", image_url: "", target_url: "" });
  const load = () => api.get("/admin/ads").then((r) => setAds(r.data));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/admin/ads", form);
    setForm({ title: "", image_url: "", target_url: "" });
    load();
  };
  return (
    <div>
      <Header title="Advertisements" subtitle="Banners on marketplace" />
      <form onSubmit={submit} className="border border-zinc-200 p-4 mb-6 grid md:grid-cols-4 gap-3">
        <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
        <Input label="Image URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} required />
        <Input label="Target URL" value={form.target_url} onChange={(v) => setForm({ ...form, target_url: v })} />
        <div className="flex items-end"><button type="submit" className="btn-primary w-full" data-testid="btn-save-ad">Create</button></div>
      </form>
      <div className="grid md:grid-cols-3 gap-4">
        {ads.map((a) => (
          <div key={a.ad_id} className="sharp-card">
            <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url(${a.image_url})` }} />
            <div className="p-3">
              <div className="font-semibold">{a.title}</div>
              <div className="text-xs text-zinc-500 truncate">{a.target_url}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- helpers ----------------
function Header({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="overline text-[#002fa7]">CONTROL ROOM</div>
        <h1 className="font-display font-black text-4xl tracking-tight">{title}</h1>
        {subtitle && <div className="text-zinc-500 mt-1">{subtitle}</div>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, testid, required, type = "text" }) {
  return (
    <div>
      <label className="overline">{label}</label>
      <input
        data-testid={testid}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-zinc-300 px-3 py-2 rounded-md"
      />
    </div>
  );
}

function Table({ cols, rows }) {
  return (
    <div className="border border-zinc-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200">
            {cols.map((c) => (
              <th key={c} className="text-left px-4 py-3 overline">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className="px-4 py-6 text-center text-zinc-500" colSpan={cols.length}>No records</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="data-row border-b last:border-b-0 border-zinc-100">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
