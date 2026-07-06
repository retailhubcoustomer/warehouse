import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { INR, StatusBadge, EmptyState } from "@/components/UIBits";
import { StatusPill, LocationChip } from "@/components/PartnerLayout";
import { Package, Truck, CheckCircle, MapPin } from "@phosphor-icons/react";

export function DeliveryActive() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ active: 0, delivered: 0, earnings: 0 });
  const load = () => {
    api.get("/delivery/orders").then((r) => setOrders(r.data));
    api.get("/delivery/stats").then((r) => setStats(r.data));
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (oid, status) => {
    await api.post(`/delivery/orders/${oid}/status`, { status });
    load();
  };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <MobileStat label="Active" value={stats.active} />
        <MobileStat label="Done" value={stats.delivered} />
        <MobileStat label="Earnings" value={<INR value={stats.earnings} />} />
      </div>
      <h2 className="font-display font-black text-2xl tracking-tight mb-4">
        Your deliveries
      </h2>
      {orders.length === 0 ? <EmptyState title="No active deliveries" icon={Truck} /> : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.order_id} className="bg-white border border-zinc-200 p-4" data-testid={`del-order-${o.order_id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-xs text-zinc-500">#{o.order_id.slice(-8).toUpperCase()}</div>
                  <div className="font-semibold text-lg mt-0.5">{o.customer_name}</div>
                </div>
                <StatusPill status={o.status} />
              </div>
              <div className="mt-2"><LocationChip address={o.delivery_address} /></div>
              <div className="text-xs text-zinc-500 mt-1">From {o.warehouse_name}</div>
              <div className="mt-3 flex gap-2">
                {o.status !== "delivered" && (
                  <button
                    onClick={() => setStatus(o.order_id, "delivered")}
                    className="flex-1 bg-[#002fa7] text-white font-semibold py-2 text-sm rounded-md inline-flex items-center justify-center gap-1"
                    data-testid={`del-complete-${o.order_id}`}
                  >
                    <CheckCircle size={14} /> Mark delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeliveryHistory() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get("/delivery/history").then((r) => setOrders(r.data)); }, []);
  return (
    <div>
      <h2 className="font-display font-black text-2xl tracking-tight mb-4">History</h2>
      {orders.length === 0 ? <EmptyState title="No completed deliveries yet" icon={Package} /> : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.order_id} className="bg-white border border-zinc-200 p-3 text-sm">
              <div className="font-mono text-xs text-zinc-500">#{o.order_id.slice(-8).toUpperCase()}</div>
              <div className="font-semibold">{o.customer_name}</div>
              <div className="text-xs text-zinc-500">{o.delivery_address}</div>
              <div className="mt-1 font-mono text-xs">+₹{o.delivery_fee}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeliveryStats() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/delivery/stats").then((r) => setS(r.data)); }, []);
  if (!s) return <div className="text-zinc-500">Loading…</div>;
  return (
    <div>
      <h2 className="font-display font-black text-2xl tracking-tight mb-4">Stats</h2>
      <div className="space-y-3">
        <MobileStat label="Active deliveries" value={s.active} big />
        <MobileStat label="Total delivered" value={s.delivered} big />
        <MobileStat label="Total earnings" value={<INR value={s.earnings} />} big />
      </div>
    </div>
  );
}

// ---------------- Collection Partner ----------------
export function CollectionActive() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ active: 0, collected: 0 });
  const load = () => {
    api.get("/collection/tasks").then((r) => setTasks(r.data));
    api.get("/collection/stats").then((r) => setStats(r.data));
  };
  useEffect(() => { load(); }, []);
  const pickup = async (oid) => { await api.post(`/collection/tasks/${oid}/pickup`); load(); };
  const drop = async (oid) => { await api.post(`/collection/tasks/${oid}/drop`); load(); };
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        <MobileStat label="Active tasks" value={stats.active} />
        <MobileStat label="Collected today" value={stats.collected} />
      </div>
      <h2 className="font-display font-black text-2xl tracking-tight mb-4">Pickup tasks</h2>
      {tasks.length === 0 ? <EmptyState title="No active pickups" icon={Package} /> : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div key={t.order_id} className="bg-white border border-zinc-200 p-4" data-testid={`col-task-${t.order_id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-xs text-zinc-500">#{t.order_id.slice(-8).toUpperCase()}</div>
                  <div className="font-semibold text-lg mt-0.5">{t.shop_name}</div>
                </div>
                <StatusPill status={t.status} />
              </div>
              <div className="text-xs text-zinc-500 mt-2">→ Drop at {t.warehouse_name}</div>
              <div className="mt-3 flex gap-2">
                {t.status === "accepted" && (
                  <button
                    onClick={() => pickup(t.order_id)}
                    className="flex-1 bg-[#ecc94b] text-black font-semibold py-2 text-sm rounded-md"
                    data-testid={`col-pickup-${t.order_id}`}
                  >
                    Confirm pickup
                  </button>
                )}
                {t.status === "collected" && (
                  <button
                    onClick={() => drop(t.order_id)}
                    className="flex-1 bg-[#002fa7] text-white font-semibold py-2 text-sm rounded-md"
                    data-testid={`col-drop-${t.order_id}`}
                  >
                    Dropped at warehouse
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionHistory() {
  return (
    <div>
      <h2 className="font-display font-black text-2xl tracking-tight mb-4">History</h2>
      <EmptyState title="Coming soon" description="Delivered pickups will appear here" icon={Package} />
    </div>
  );
}

export function CollectionStats() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/collection/stats").then((r) => setS(r.data)); }, []);
  if (!s) return <div className="text-zinc-500">Loading…</div>;
  return (
    <div>
      <h2 className="font-display font-black text-2xl tracking-tight mb-4">Stats</h2>
      <MobileStat label="Active tasks" value={s.active} big />
      <div className="mt-3"><MobileStat label="Total collected" value={s.collected} big /></div>
    </div>
  );
}

function MobileStat({ label, value, big }) {
  return (
    <div className="bg-white border border-zinc-200 p-3">
      <div className="overline text-[10px]">{label}</div>
      <div className={`font-display font-black ${big ? "text-3xl" : "text-xl"} tracking-tight mt-1`}>
        {value}
      </div>
    </div>
  );
}
