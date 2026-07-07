import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { HeartButton, useWatchlist } from "@/context/WatchlistContext";
import { INR } from "@/components/UIBits";
import { Heart, Package, Storefront, Truck, Wrench, ArrowRight, Star, MapPin } from "@phosphor-icons/react";

const TABS = [
  { id: "all", label: "All", Icon: Heart },
  { id: "product", label: "Items", Icon: Package },
  { id: "shop", label: "Shops", Icon: Storefront },
  { id: "transport", label: "Transport", Icon: Truck },
  { id: "helper", label: "Helpers", Icon: Wrench },
];

export default function Watchlist() {
  const { user } = useAuth();
  const { refresh } = useWatchlist();
  const [entries, setEntries] = useState(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!user) return;
    api.get("/marketplace/watchlist").then((r) => setEntries(r.data));
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 px-5">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 mx-auto flex items-center justify-center mb-4">
          <Heart size={26} weight="fill" className="text-orange-500" />
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">Save what you love</h1>
        <p className="text-zinc-500 mt-2">
          Log in to keep a Watchlist of shops, items, transport & helpers.
        </p>
        <Link to="/login" className="btn-orange inline-flex mt-6" data-testid="wl-login-cta">
          Log in
        </Link>
      </div>
    );
  }

  if (entries === null) {
    return <div className="p-10 text-center text-zinc-500">Loading watchlist…</div>;
  }

  const counts = TABS.reduce((acc, t) => {
    if (t.id === "all") acc[t.id] = entries.length;
    else acc[t.id] = entries.filter((e) => e.entity_type === t.id).length;
    return acc;
  }, {});

  const filtered = tab === "all" ? entries : entries.filter((e) => e.entity_type === tab);

  return (
    <div className="max-w-7xl mx-auto px-5 pt-8 pb-16">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-orange-600">
          MY WATCHLIST
        </div>
        <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight text-zinc-900 mt-1">
          Saved for later
        </h1>
        <p className="text-zinc-500 mt-1">
          All the shops, items, transport and helpers you saved — in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`wl-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border transition ${
              tab === t.id
                ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/25"
                : "border-zinc-200 text-zinc-700 hover:border-orange-300"
            }`}
          >
            <t.Icon size={14} weight={tab === t.id ? "fill" : "regular"} />
            {t.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === t.id ? "bg-white/20" : "bg-zinc-100 text-zinc-500"
            }`}>{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-zinc-300 p-12 text-center rounded-2xl">
            <Heart size={28} className="mx-auto text-zinc-400" />
            <div className="font-display font-bold text-lg mt-3">Nothing saved here yet</div>
            <div className="text-sm text-zinc-500 mt-1">
              Tap the ❤ on any card to save it for later.
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((e) => (
              <EntryCard key={`${e.entity_type}:${e.entity_id}`} entry={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryCard({ entry }) {
  const { entity_type: t, entity_id: id, entity: e } = entry;
  if (!e) {
    return (
      <div className="rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-500">
        <div className="uppercase text-[10px] tracking-widest">{t}</div>
        <div className="mt-2">This item is no longer available.</div>
      </div>
    );
  }
  if (t === "shop") return <ShopEntry shop={e} />;
  if (t === "product") return <ProductEntry product={e} />;
  if (t === "transport") return <TransportEntry p={e} />;
  if (t === "helper") return <HelperEntry h={e} />;
  return null;
}

function ShopEntry({ shop }) {
  return (
    <div className="relative bg-white rounded-2xl border border-zinc-200 hover:border-orange-400 hover:shadow-xl transition-all overflow-hidden group">
      <div className="absolute top-3 right-3 z-10">
        <HeartButton type="shop" id={shop.shop_id} testid={`heart-shop-${shop.shop_id}`} />
      </div>
      <Link to={`/shops/${shop.shop_id}`} className="block">
        <div className="relative aspect-[16/10] bg-zinc-100">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${shop.image_url})` }} />
        </div>
        <div className="p-4">
          <div className="chip mb-2 inline-flex items-center gap-1"><Storefront size={11} /> SHOP</div>
          <div className="font-display font-bold text-base text-zinc-900">{shop.name}</div>
          <div className="text-xs text-zinc-500 mt-1 capitalize">{shop.category}</div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1"><Star size={11} weight="fill" className="text-amber-400" /> {Number(shop.rating || 0).toFixed(1)}</span>
            <span className="text-zinc-500 truncate flex items-center gap-1"><MapPin size={11} /> {shop.address}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function ProductEntry({ product }) {
  return (
    <div className="relative bg-white rounded-2xl border border-zinc-200 hover:border-orange-400 transition-all overflow-hidden">
      <div className="absolute top-3 right-3 z-10">
        <HeartButton type="product" id={product.product_id} testid={`heart-prd-${product.product_id}`} />
      </div>
      <Link to={`/shops/${product.shop_id}`} className="block">
        <div className="aspect-square bg-zinc-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${product.image_url})` }} />
        <div className="p-4">
          <div className="chip mb-2 inline-flex items-center gap-1"><Package size={11} /> ITEM</div>
          <div className="font-display font-bold text-zinc-900 line-clamp-2">{product.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5">From {product.shop_name}</div>
          <div className="mt-2 font-display font-black text-lg text-orange-600">
            <INR value={product.price} />
          </div>
        </div>
      </Link>
    </div>
  );
}

function TransportEntry({ p }) {
  return (
    <div className="relative bg-white rounded-2xl border border-zinc-200 hover:border-orange-400 transition-all overflow-hidden">
      <div className="absolute top-3 right-3 z-10">
        <HeartButton type="transport" id={p.provider_id} testid={`heart-trp-${p.provider_id}`} />
      </div>
      <Link to="/transport" className="block">
        <div className="aspect-[16/10] bg-zinc-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${p.photo_url})` }} />
        <div className="p-4">
          <div className="chip mb-2 inline-flex items-center gap-1"><Truck size={11} /> TRANSPORT</div>
          <div className="font-display font-bold text-zinc-900">{p.owner_name}</div>
          <div className="text-xs text-zinc-500 mt-0.5 capitalize">
            {(p.vehicle_type || "").replace("_", " ")}
          </div>
          <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1"><MapPin size={11} /> {p.address}</div>
        </div>
      </Link>
    </div>
  );
}

function HelperEntry({ h }) {
  return (
    <div className="relative bg-white rounded-2xl border border-zinc-200 hover:border-orange-400 transition-all overflow-hidden">
      <div className="absolute top-3 right-3 z-10">
        <HeartButton type="helper" id={h.helper_id} testid={`heart-hlp-${h.helper_id}`} />
      </div>
      <Link to="/helper" className="block">
        <div className="aspect-[16/10] bg-zinc-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${h.photo_url})` }} />
        <div className="p-4">
          <div className="chip mb-2 inline-flex items-center gap-1"><Wrench size={11} /> HELPER</div>
          <div className="font-display font-bold text-zinc-900">{h.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5 capitalize">{h.profession?.replace("_", " ")}</div>
          <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1"><MapPin size={11} /> {h.address}</div>
        </div>
      </Link>
    </div>
  );
}
