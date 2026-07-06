import React, { useEffect, useState, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { INR } from "@/components/UIBits";
import { MagnifyingGlass, Star, Storefront, ArrowRight } from "@phosphor-icons/react";

const CATS = [
  { id: "all", name: "All", emoji: "◇" },
  { id: "grocery", name: "Grocery", emoji: "◈" },
  { id: "electronics", name: "Electronics", emoji: "◉" },
  { id: "fashion", name: "Fashion", emoji: "◇" },
  { id: "pharmacy", name: "Pharmacy", emoji: "◐" },
  { id: "food", name: "Food", emoji: "◑" },
];

export default function CustomerHome() {
  const { cityId, cities } = useOutletContext();
  const [shops, setShops] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    api
      .get(`/marketplace/shops`, { params: { city_id: cityId, category, q: search || undefined } })
      .then((r) => setShops(r.data))
      .finally(() => setLoading(false));
  }, [cityId, category, search]);

  const cityName = useMemo(
    () => cities?.find((c) => c.city_id === cityId)?.name || "your city",
    [cities, cityId]
  );

  return (
    <div className="max-w-7xl mx-auto px-5">
      {/* Hero */}
      <section className="pt-10 lg:pt-16 pb-8 border-b border-zinc-200">
        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <div className="overline text-[#002fa7]">EVERY CITY · EVERY SHOP · ONE ORDER</div>
            <h1 className="font-display font-black text-5xl md:text-7xl tracking-tight leading-[0.95] mt-3">
              Shop <span className="text-[#002fa7]">{cityName}</span>.
              <br />
              Delivered from the nearest warehouse.
            </h1>
            <p className="text-zinc-500 mt-4 max-w-xl">
              A unified marketplace — your favorite Zomato-style shop app synced
              in real time, with routing intelligence powered by OpenStreetMap.
            </p>
          </div>
          <div className="lg:col-span-4">
            <div className="border border-zinc-200 p-4">
              <div className="overline mb-2">SEARCH</div>
              <div className="flex items-center gap-2 border border-zinc-300 rounded-md px-3">
                <MagnifyingGlass size={16} className="text-zinc-400" />
                <input
                  data-testid="search-shops"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search shops, categories…"
                  className="flex-1 py-2.5 outline-none text-sm"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                <div><span className="font-mono text-[#002fa7] text-base">{shops.length}</span> shops live</div>
                <div><span className="font-mono text-[#002fa7] text-base">4</span> cities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 flex gap-2 overflow-x-auto no-scrollbar">
        {CATS.map((c) => (
          <button
            key={c.id}
            data-testid={`cat-${c.id}`}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 px-4 py-2 border text-sm font-semibold transition rounded-full ${
              category === c.id
                ? "bg-[#002fa7] text-white border-[#002fa7]"
                : "border-zinc-200 hover:border-zinc-500 text-zinc-700"
            }`}
          >
            <span className="mr-1">{c.emoji}</span> {c.name}
          </button>
        ))}
      </section>

      {/* Shops grid */}
      <section className="pb-16">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
              {category === "all" ? "All shops" : CATS.find((c) => c.id === category)?.name}
            </h2>
            <div className="overline mt-1">{loading ? "LOADING…" : `${shops.length} results`}</div>
          </div>
          <Link to="/my-orders" className="text-sm text-[#002fa7] font-semibold inline-flex items-center gap-1" data-testid="link-my-orders-hero">
            My orders <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((s) => (
            <ShopCard key={s.shop_id} shop={s} />
          ))}
        </div>
        {!loading && shops.length === 0 && (
          <div className="border border-dashed border-zinc-300 p-10 text-center">
            <Storefront size={28} className="mx-auto text-zinc-400" />
            <div className="mt-3 font-semibold">No shops in this filter</div>
          </div>
        )}
      </section>
    </div>
  );
}

function ShopCard({ shop }) {
  return (
    <Link
      to={`/shops/${shop.shop_id}`}
      data-testid={`shop-${shop.shop_id}`}
      className="sharp-card block"
    >
      <div
        className="aspect-[16/10] bg-zinc-100 bg-cover bg-center"
        style={{ backgroundImage: `url(${shop.image_url})` }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display font-bold text-lg tracking-tight leading-tight">
              {shop.name}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 capitalize">
              {shop.category} · {shop.business_hours}
            </div>
          </div>
          <div className="chip chip-yellow inline-flex items-center gap-1">
            <Star size={12} weight="fill" /> {Number(shop.rating || 0).toFixed(1)}
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">{shop.address}</div>
      </div>
    </Link>
  );
}
