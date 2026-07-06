import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { INR, StatTile, StatusBadge, EmptyState } from "@/components/UIBits";
import { Package, Warehouse, Users, ChartLineUp } from "@phosphor-icons/react";

export function WarehouseOverview() {
  const [d, setD] = useState(null);
  const [me, setMe] = useState(null);
  useEffect(() => {
    api.get("/warehouse/dashboard").then((r) => setD(r.data));
    api.get("/warehouse/me").then((r) => setMe(r.data));
  }, []);
  if (!d || !me) return <div className="text-zinc-500">Loading…</div>;
  return (
    <div>
      <div className="mb-8">
        <div className="overline text-[#002fa7]">WAREHOUSE · {me.code}</div>
        <h1 className="font-display font-black text-4xl tracking-tight">{me.name}</h1>
        <p className="text-zinc-500 mt-1">{me.address}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="TODAY ORDERS" value={d.today_orders} testid="tile-today" />
        <StatTile label="REVENUE" value={<INR value={d.revenue} />} testid="tile-revenue" />
        <StatTile label="PACKING QUEUE" value={d.at_warehouse + d.packed} testid="tile-queue" />
        <StatTile label="OUT FOR DELIVERY" value={d.out_for_delivery} testid="tile-out" />
      </div>
      <div className="mt-8 grid lg:grid-cols-2 gap-4">
        <div className="border border-zinc-200 p-6">
          <div className="overline mb-4">STATUS BREAKDOWN</div>
          <div className="space-y-2 text-sm">
            {["placed", "accepted", "collected", "at_warehouse", "packed", "out_for_delivery", "delivered"].map((s) => (
              <div key={s} className="flex justify-between border-b border-zinc-100 py-1">
                <span className="capitalize">{s.replace(/_/g, " ")}</span>
                <span className="font-mono font-bold">{d[s]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-zinc-200 p-6">
          <div className="overline mb-4">CAPACITY</div>
          <div className="text-6xl font-display font-black text-[#002fa7]">{me.capacity}</div>
          <p className="text-zinc-500 mt-2">Configured max capacity</p>
          <div className="mt-4 text-sm">
            Service radius: <span className="font-mono font-bold">{me.service_radius_km} km</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WarehouseOrders() {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [cPartners, setCPartners] = useState([]);
  const [status, setStatus] = useState("");
  const load = () => api.get("/warehouse/orders", { params: status ? { status } : {} }).then((r) => setOrders(r.data));
  useEffect(() => {
    load();
    api.get("/warehouse/partners", { params: { role: "delivery_partner" } }).then((r) => setPartners(r.data));
    api.get("/warehouse/partners", { params: { role: "collection_partner" } }).then((r) => setCPartners(r.data));
    // eslint-disable-next-line
  }, [status]);
  const pack = async (oid) => { await api.post(`/warehouse/orders/${oid}/pack`); load(); };
  const assignD = async (oid, pid) => { if (pid) { await api.post(`/warehouse/orders/${oid}/assign-delivery`, { partner_id: pid }); load(); } };
  const assignC = async (oid, pid) => { if (pid) { await api.post(`/warehouse/orders/${oid}/assign-collection`, { partner_id: pid }); load(); } };
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="overline text-[#002fa7]">OPERATIONS</div>
          <h1 className="font-display font-black text-4xl tracking-tight">Orders</h1>
        </div>
        <select
          data-testid="wh-status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-zinc-200 px-3 py-2 text-sm rounded-md"
        >
          <option value="">All</option>
          {["placed", "accepted", "collected", "at_warehouse", "packed", "out_for_delivery", "delivered"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      {orders.length === 0 ? (
        <EmptyState title="No orders in this filter" icon={Package} />
      ) : (
        <div className="border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left px-4 py-3 overline">Order</th>
                <th className="text-left px-4 py-3 overline">Shop → Customer</th>
                <th className="text-left px-4 py-3 overline">Total</th>
                <th className="text-left px-4 py-3 overline">Status</th>
                <th className="text-left px-4 py-3 overline">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id} className="data-row border-b border-zinc-100">
                  <td className="px-4 py-3 font-mono text-xs">#{o.order_id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{o.shop_name}</div>
                    <div className="text-xs text-zinc-500">→ {o.customer_name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono"><INR value={o.total} /></td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {["accepted", "collected"].includes(o.status) && (
                        <select data-testid={`assign-c-${o.order_id}`} className="text-xs border border-zinc-200 rounded" defaultValue="" onChange={(e) => assignC(o.order_id, e.target.value)}>
                          <option value="">Assign collection…</option>
                          {cPartners.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
                        </select>
                      )}
                      {o.status === "at_warehouse" && (
                        <button data-testid={`btn-pack-${o.order_id}`} onClick={() => pack(o.order_id)} className="text-xs bg-[#ecc94b] text-black px-2 py-1 rounded font-semibold">Pack</button>
                      )}
                      {["packed"].includes(o.status) && (
                        <select data-testid={`assign-d-${o.order_id}`} className="text-xs border border-zinc-200 rounded" defaultValue="" onChange={(e) => assignD(o.order_id, e.target.value)}>
                          <option value="">Assign delivery…</option>
                          {partners.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
                        </select>
                      )}
                    </div>
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

export function WarehousePacking() {
  const [orders, setOrders] = useState([]);
  const load = () => api.get("/warehouse/orders", { params: { status: "at_warehouse" } }).then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);
  const pack = async (oid) => { await api.post(`/warehouse/orders/${oid}/pack`); load(); };
  return (
    <div>
      <div className="mb-6">
        <div className="overline text-[#002fa7]">FULFILLMENT</div>
        <h1 className="font-display font-black text-4xl tracking-tight">Packing queue</h1>
      </div>
      {orders.length === 0 ? <EmptyState title="Nothing to pack" icon={Warehouse} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => (
            <div key={o.order_id} className="border border-zinc-200 p-4" data-testid={`pack-card-${o.order_id}`}>
              <div className="font-mono text-xs text-zinc-500">#{o.order_id.slice(-8).toUpperCase()}</div>
              <div className="font-semibold mt-1">{o.shop_name} → {o.customer_name}</div>
              <div className="text-xs text-zinc-500 mt-1">{o.items.length} items</div>
              <ol className="mt-3 text-sm space-y-1 border-t border-zinc-100 pt-3">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{i.name} × {i.qty}</span>
                    <span className="font-mono text-xs text-zinc-500">₹{i.price * i.qty}</span>
                  </li>
                ))}
              </ol>
              <button onClick={() => pack(o.order_id)} className="btn-primary w-full mt-4" data-testid={`btn-pack-${o.order_id}`}>Mark packed</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WarehouseInventory() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/warehouse/inventory").then((r) => setItems(r.data)); }, []);
  return (
    <div>
      <div className="mb-6">
        <div className="overline text-[#002fa7]">STOCK</div>
        <h1 className="font-display font-black text-4xl tracking-tight">Inventory</h1>
        <p className="text-zinc-500">Products from shops routed to this warehouse.</p>
      </div>
      <div className="border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              {["Product", "Shop", "Category", "Price", "Stock"].map((c) => (
                <th key={c} className="text-left px-4 py-3 overline">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.product_id} className="data-row border-b border-zinc-100">
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3">{p.shop_name}</td>
                <td className="px-4 py-3 capitalize">{p.category}</td>
                <td className="px-4 py-3 font-mono"><INR value={p.price} /></td>
                <td className="px-4 py-3">
                  <span className={`chip ${p.stock < 20 ? "chip-red" : p.stock < 50 ? "chip-yellow" : "chip-green"}`}>
                    {p.stock}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WarehouseStaff() {
  const [staff, setStaff] = useState([]);
  useEffect(() => { api.get("/warehouse/staff").then((r) => setStaff(r.data)); }, []);
  return (
    <div>
      <div className="mb-6">
        <div className="overline text-[#002fa7]">PEOPLE</div>
        <h1 className="font-display font-black text-4xl tracking-tight">Warehouse staff</h1>
      </div>
      {staff.length === 0 ? <EmptyState title="No staff yet" icon={Users} /> : (
        <div className="border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                {["Name", "Email", "Role", "KYC"].map((c) => (
                  <th key={c} className="text-left px-4 py-3 overline">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.user_id} className="data-row border-b border-zinc-100">
                  <td className="px-4 py-3 font-semibold">{s.name}</td>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3 capitalize">{s.role?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.kyc_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
