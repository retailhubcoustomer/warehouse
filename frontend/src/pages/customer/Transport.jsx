import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { HeartButton } from "@/context/WatchlistContext";
import {
  Star, MapPin, Phone, WhatsappLogo, MagnifyingGlass, Car, Truck, Bicycle,
} from "@phosphor-icons/react";

const CATS = [
  { id: "all", name: "All", Icon: MapPin, bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  { id: "toto", name: "Toto", Icon: Bicycle, bg: "linear-gradient(135deg,#22c55e,#15803d)" },
  { id: "auto", name: "Auto", Icon: Car, bg: "linear-gradient(135deg,#fbbf24,#d97706)" },
  { id: "bike", name: "Bike", Icon: Bicycle, bg: "linear-gradient(135deg,#ef4444,#b91c1c)" },
  { id: "car", name: "Car", Icon: Car, bg: "linear-gradient(135deg,#334155,#0f172a)" },
  { id: "van", name: "Van", Icon: Truck, bg: "linear-gradient(135deg,#f97316,#c2410c)" },
  { id: "pickup", name: "Pickup", Icon: Truck, bg: "linear-gradient(135deg,#8b5cf6,#5b21b6)" },
  { id: "mini_truck", name: "Mini Truck", Icon: Truck, bg: "linear-gradient(135deg,#0ea5e9,#0369a1)" },
];

const AVAIL_STYLES = {
  available: { text: "🟢 Available", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  busy: { text: "🟡 Busy", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  offline: { text: "🔴 Offline", cls: "text-red-700 bg-red-50 border-red-200" },
};

export default function Transport() {
  const { cityId, cities } = useOutletContext();
  const [list, setList] = useState([]);
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    api
      .get("/marketplace/transport", {
        params: {
          city_id: cityId,
          vehicle_type: type === "all" ? undefined : type,
          q: search || undefined,
        },
      })
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  }, [cityId, type, search]);

  const cityName = cities?.find((c) => c.city_id === cityId)?.name;

  return (
    <div className="max-w-7xl mx-auto px-5 pt-8 pb-16">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-orange-600">
            LOCAL TRANSPORT
          </div>
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight text-zinc-900 mt-1">
            Toto · Auto · Bike · Car · Truck
          </h1>
          <p className="text-zinc-500 mt-1">
            Book a nearby vehicle owner in {cityName}. Save favourites to your Watchlist.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-zinc-200 rounded-full px-3 py-2 bg-white w-full sm:w-80">
          <MagnifyingGlass size={16} className="text-zinc-400" />
          <input
            data-testid="transport-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by owner name…"
            className="flex-1 text-sm outline-none"
          />
        </div>
      </div>

      {/* category tiles */}
      <div className="mt-6 flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {CATS.map((c) => (
          <button
            key={c.id}
            data-testid={`trp-cat-${c.id}`}
            onClick={() => setType(c.id)}
            className={`cat-tile shrink-0 ${type === c.id ? "active" : ""}`}
          >
            <div className="cat-icon" style={{ backgroundImage: c.bg }}>
              <c.Icon size={22} weight="fill" />
            </div>
            <div className="text-xs font-semibold text-zinc-800">{c.name}</div>
          </button>
        ))}
      </div>

      {/* results */}
      <div className="mt-6">
        <div className="overline mb-3">
          {loading ? "LOADING…" : `${list.length} PROVIDERS`}
        </div>
        {!loading && list.length === 0 ? (
          <div className="border border-dashed border-zinc-300 p-10 text-center rounded-2xl text-zinc-500">
            No transport providers match this filter yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {list.map((p) => (
              <ProviderCard key={p.provider_id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderCard({ p }) {
  const avail = AVAIL_STYLES[p.availability] || AVAIL_STYLES.offline;
  const vLabel = (p.vehicle_type || "").replace("_", " ");
  return (
    <div
      data-testid={`transport-${p.provider_id}`}
      className="relative bg-white rounded-2xl border border-zinc-200 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 transition-all overflow-hidden"
    >
      <div className="absolute top-3 right-3 z-10">
        <HeartButton type="transport" id={p.provider_id} testid={`heart-trp-${p.provider_id}`} />
      </div>
      <div
        className="relative h-36 bg-zinc-100 overflow-hidden"
        style={{ backgroundImage: p.gradient }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${p.photo_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 text-white capitalize font-semibold text-xs bg-black/50 rounded-full px-2 py-0.5 backdrop-blur">
          {vLabel}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-display font-black text-orange-700">
            {p.owner_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-zinc-900 truncate">{p.owner_name}</div>
            <div className="text-xs text-zinc-500 truncate">{p.address}</div>
          </div>
        </div>

        <p className="text-sm text-zinc-600 mt-3 line-clamp-2">{p.description}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 chip">
            <Star size={11} weight="fill" className="text-amber-400" /> {Number(p.rating).toFixed(1)} ({p.reviews_count})
          </span>
          <span className={`inline-flex items-center gap-1 chip ${avail.cls}`}>{avail.text}</span>
          {p.price_hint && <span className="chip chip-blue">{p.price_hint}</span>}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
          <MapPin size={12} /> {p.service_area}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={`tel:${p.phone}`}
            data-testid={`trp-call-${p.provider_id}`}
            className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-200 hover:border-orange-400 text-sm font-semibold text-zinc-800"
          >
            <Phone size={14} weight="fill" className="text-orange-500" /> Call
          </a>
          <a
            href={`https://wa.me/${p.phone?.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            data-testid={`trp-wa-${p.provider_id}`}
            className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
          >
            <WhatsappLogo size={14} weight="fill" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
