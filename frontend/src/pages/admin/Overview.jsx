import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { StatTile, INR } from "@/components/UIBits";
import {
  Users, Storefront, Warehouse, Package, CurrencyInr, Buildings, TruckTrailer, IdentificationBadge,
} from "@phosphor-icons/react";

export default function AdminOverview() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setS(r.data));
  }, []);
  if (!s) return <div className="text-zinc-500">Loading…</div>;

  const tiles = [
    { label: "TOTAL REVENUE", value: <INR value={s.revenue} />, icon: CurrencyInr, testid: "tile-revenue" },
    { label: "ACTIVE ORDERS", value: s.active_orders, icon: Package, testid: "tile-active-orders" },
    { label: "CITIES", value: s.cities, icon: Buildings, testid: "tile-cities" },
    { label: "WAREHOUSES", value: s.warehouses, icon: Warehouse, testid: "tile-warehouses" },
    { label: "SHOPS", value: s.shops, icon: Storefront, testid: "tile-shops" },
    { label: "CUSTOMERS", value: s.customers, icon: Users, testid: "tile-customers" },
    { label: "DELIVERY PARTNERS", value: s.delivery_partners, icon: TruckTrailer, testid: "tile-delivery" },
    { label: "KYC PENDING", value: s.pending_kyc, icon: IdentificationBadge, testid: "tile-kyc" },
  ];

  const maxByCity = Math.max(1, ...(s.by_city || []).map((c) => c.revenue));

  return (
    <div>
      <div className="mb-8">
        <div className="overline text-[#002fa7]">CONTROL ROOM</div>
        <h1 className="font-display font-black text-4xl tracking-tight">Platform overview</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} testid={t.testid} />
        ))}
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-4">
        <div className="border border-zinc-200 p-6">
          <div className="overline mb-4">REVENUE BY CITY</div>
          <div className="space-y-3">
            {(s.by_city || []).length === 0 ? (
              <div className="text-sm text-zinc-500">No delivered orders yet.</div>
            ) : (
              (s.by_city || []).map((c) => (
                <div key={c.city}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{c.city}</span>
                    <span className="font-mono"><INR value={c.revenue} /> · {c.orders} orders</span>
                  </div>
                  <div className="mt-1 h-2 bg-zinc-100 relative">
                    <div className="absolute top-0 left-0 h-2 bg-[#002fa7]" style={{ width: `${(c.revenue / maxByCity) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="border border-zinc-200 p-6">
          <div className="overline mb-4">SNAPSHOT</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Snap label="Products" value={s.products} />
            <Snap label="Total orders" value={s.orders} />
            <Snap label="Shop owners" value={s.shop_owners} />
            <Snap label="Collection partners" value={s.collection_partners} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Snap({ label, value }) {
  return (
    <div className="p-3 border border-zinc-200">
      <div className="overline text-[10px]">{label}</div>
      <div className="font-display font-black text-2xl mt-1">{value}</div>
    </div>
  );
}
