import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import MapView from "@/components/MapView";

const TYPES = [
  { id: "warehouses", label: "Warehouses", color: "#002fa7" },
  { id: "shops", label: "Shops", color: "#ecc94b" },
  { id: "orders", label: "Active orders", color: "#0ea5e9" },
  { id: "partners", label: "Partners", color: "#e53e3e" },
];

export default function LiveMap() {
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState({ warehouses: true, shops: true, orders: true, partners: true });

  useEffect(() => {
    api.get("/admin/live-map").then((r) => setData(r.data));
  }, []);

  const markers = useMemo(() => {
    if (!data) return [];
    const out = [];
    if (enabled.warehouses)
      data.warehouses.forEach((w) => out.push({
        lat: w.lat, lng: w.lng, type: "warehouse", label: w.code,
        popupHtml: `<b>${w.name}</b><br/>Capacity: ${w.capacity}`,
      }));
    if (enabled.shops)
      data.shops.forEach((s) => out.push({
        lat: s.lat, lng: s.lng, type: "shop", label: "◈",
        popupHtml: `<b>${s.name}</b><br/>${s.category}`,
      }));
    if (enabled.orders)
      data.orders.forEach((o) => out.push({
        lat: o.delivery_lat, lng: o.delivery_lng, type: "order", label: "○",
        popupHtml: `<b>Order ${o.order_id.slice(-8)}</b><br/>${o.status}`,
      }));
    if (enabled.partners)
      data.partners.forEach((p) => out.push({
        lat: p.lat, lng: p.lng, type: p.role, label: p.role === "delivery_partner" ? "D" : "C",
        popupHtml: `<b>${p.name}</b><br/>${p.role.replace("_", " ")}`,
      }));
    return out;
  }, [data, enabled]);

  return (
    <div>
      <div className="mb-6">
        <div className="overline text-[#002fa7]">GEO OPS</div>
        <h1 className="font-display font-black text-4xl tracking-tight">Live platform map</h1>
        <p className="text-zinc-500 mt-1">
          OpenStreetMap · nearest-warehouse routing runs on this same graph.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TYPES.map((t) => (
          <button
            key={t.id}
            data-testid={`toggle-${t.id}`}
            onClick={() => setEnabled((e) => ({ ...e, [t.id]: !e[t.id] }))}
            className={`chip ${enabled[t.id] ? "chip-brand" : ""}`}
            style={enabled[t.id] ? { background: t.color, borderColor: t.color, color: "#fff" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="border border-zinc-200 h-[560px]" data-testid="live-map-container">
        {data ? <MapView markers={markers} /> : <div className="p-10 text-zinc-500">Loading…</div>}
      </div>
    </div>
  );
}
